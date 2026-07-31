const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const jobDir = path.join(__dirname, 'output', crypto.randomUUID());
fs.mkdirSync(jobDir, { recursive: true });

const url = "https://www.facebook.com/share/r/1EvjdHRaJu/";
const cmd = `yt-dlp --trim-filenames 50 --merge-output-format mp4 -o "${jobDir}/video.%(ext)s" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" "${url}"`;

console.log('Running cmd:', cmd);

exec(cmd, (error, stdout, stderr) => {
    console.log('Error:', error);
    console.log('Exit code:', error ? error.code : 0);
    console.log('STDOUT:', stdout);
    console.log('STDERR:', stderr);
    const files = fs.readdirSync(jobDir);
    console.log('Files created:', files);
});
