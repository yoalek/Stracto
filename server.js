const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const crypto = require('crypto');
const { pipeline, env } = require('@xenova/transformers');
const { WaveFile } = require('wavefile');
env.allowLocalModels = false;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(__dirname, 'output')));

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const jobs = new Map();

function broadcast(jobId, type, data) {
    const job = jobs.get(jobId);
    if (!job || !job.clients) return;
    const msg = `data: ${JSON.stringify({ type, data })}\n\n`;
    job.clients.forEach(res => res.write(msg));
}

const execPromise = (cmd) => new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Exec Error: ${error.message}`);
            reject(error);
        } else {
            resolve(stdout);
        }
    });
});

let transcriber = null;
let isDownloading = false;

async function getTranscriber(jobId) {
    if (!transcriber) {
        if (!isDownloading) {
            isDownloading = true;
            if (jobId) broadcast(jobId, 'log', { message: '⏳ Baixando modelo Whisper (IA Local). Leva ~1 min na 1ª vez...' });
            try {
                transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
                if (jobId) broadcast(jobId, 'log', { message: '✅ Modelo Whisper carregado na memória.' });
            } catch (e) {
                if (jobId) broadcast(jobId, 'log', { message: `❌ Erro ao baixar modelo Whisper: ${e.message}` });
            }
            isDownloading = false;
        } else {
            while (isDownloading) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
    return transcriber;
}

app.post('/api/process', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });
    
    const jobId = crypto.randomUUID();
    jobs.set(jobId, { params: { url }, clients: [] });
    
    processJob(jobId).catch(err => {
        console.error('Job error:', err);
        broadcast(jobId, 'error', { message: err.message });
    });
    
    res.json({ jobId });
});

app.get('/api/stream/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);
    
    if (!job) return res.status(404).end();
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    job.clients.push(res);
    req.on('close', () => {
        job.clients = job.clients.filter(c => c !== res);
    });
});

async function processJob(jobId) {
    const job = jobs.get(jobId);
    const { url } = job.params;
    const jobDir = path.join(outputDir, jobId);
    fs.mkdirSync(jobDir, { recursive: true });
    
    const audioPath = path.join(jobDir, 'audio.wav');
    let videoPath = '';
    
    try {
        let downloadedFile = null;
        broadcast(jobId, 'log', { message: '🎬 1/4 - Baixando vídeo com yt-dlp...' });
        
        const cmd = `yt-dlp --merge-output-format mp4 -o "${jobDir}/video.%(ext)s" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" "${url}"`;
        await execPromise(cmd);
        
        const files = fs.readdirSync(jobDir);
        const found = files.find(f => f.startsWith('video.') && !f.endsWith('.part'));
        if (!found) throw new Error("Arquivo de vídeo não foi criado.");
        
        downloadedFile = path.join(jobDir, found);
        videoPath = downloadedFile;
        
        broadcast(jobId, 'log', { message: '🎵 2/4 - Extraindo áudio (ffmpeg)...' });
        // Extract 16kHz mono WAV for Whisper
        await execPromise(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`);
        
        broadcast(jobId, 'log', { message: '🧠 3/4 - Preparando áudio e conectando IA (Whisper Local)...' });
        
        const audioDataBuf = fs.readFileSync(audioPath);
        const wav = new WaveFile(audioDataBuf);
        wav.toBitDepth('32f');
        wav.toSampleRate(16000);
        let audioData = wav.getSamples();
        if (Array.isArray(audioData)) {
            if (audioData.length > 1) {
                const SCALING_FACTOR = Math.sqrt(2);
                for (let i = 0; i < audioData[0].length; ++i) {
                    audioData[0][i] = SCALING_FACTOR * (audioData[0][i] / 2 + audioData[1][i] / 2);
                }
            }
            audioData = audioData[0];
        }
        
        const aiModel = await getTranscriber(jobId);
        broadcast(jobId, 'log', { message: '📝 Transcrevendo (Isso pode levar alguns segundos)...' });
        
        const result = await aiModel(audioData, { return_timestamps: true });
        
        const transcription = result.chunks.map(c => ({
            start: c.timestamp[0], 
            end: c.timestamp[1],
            text: c.text.trim()
        }));
        
        broadcast(jobId, 'log', { message: `✅ Transcrição concluída! ${transcription.length} cenas detectadas.` });
        
        const storyboard = [];
        
        broadcast(jobId, 'log', { message: '📸 4/4 - Extraindo frames fotográficos...' });
        for (let i = 0; i < transcription.length; i++) {
            const item = transcription[i];
            const frameFilename = `frame_${i}.jpg`;
            const framePath = path.join(jobDir, frameFilename);
            
            // Extract a single frame at the exact start time
            try {
                await execPromise(`ffmpeg -ss ${item.start} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y`);
                storyboard.push({
                    text: item.text,
                    start: item.start,
                    imageUrl: `/output/${jobId}/${frameFilename}`
                });
            } catch (err) {
                console.error(`Erro ao extrair frame ${i}:`, err);
                // Continue even if one frame fails
            }
        }
        
        const blocks = [];
        storyboard.forEach(item => {
            const blockIndex = Math.floor(item.start / 8);
            if (!blocks[blockIndex]) {
                blocks[blockIndex] = {
                    title: `Janela de 8s (${blockIndex * 8}s - ${(blockIndex + 1) * 8}s)`,
                    items: []
                };
            }
            blocks[blockIndex].items.push(item);
        });
        
        const filteredBlocks = blocks.filter(Boolean);
        
        broadcast(jobId, 'log', { message: '🎉 Storyboard gerado com sucesso!' });
        broadcast(jobId, 'complete', { blocks: filteredBlocks });
        
        // Cleanup heavy media (Optional, but good for space. We keep the images.)
        // fs.unlinkSync(videoPath);
        // fs.unlinkSync(audioPath);
        
    } catch (e) {
        broadcast(jobId, 'error', { message: e.message || 'Falha ao processar o vídeo.' });
    }
}

const PORT = 3001; 
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
