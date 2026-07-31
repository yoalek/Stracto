# 🎬 Stracto - AI Storyboarder

O **Stracto** é uma ferramenta offline poderosa para modelagem de vídeos (engenharia reversa). Ele permite que você cole o link de um vídeo (como um Facebook Reel ou TikTok) e receba como saída um Storyboard completo, picotado em **Janelas de 8 Segundos**. 

O sistema baixa o vídeo, extrai o áudio, usa Inteligência Artificial local (Whisper) para transcrever a fala exata de cada milissegundo, e extrai o frame visual perfeitamente alinhado com a legenda. É a ferramenta perfeita para alimentar geradores de vídeo por IA (como Luma, Kling, Gen-3, Hedra) respeitando o limite padrão de geração de 8 segundos.

---

## ✨ Como Funciona (Pipeline 100% Local)
Nenhuma API paga é utilizada. A segurança e a privacidade dos dados ocorrem 100% na máquina.
1. **yt-dlp**: Faz o download forçado e robusto da mídia original em alta qualidade.
2. **ffmpeg (Áudio)**: Isola o áudio para `.wav` (PCM 16kHz Mono).
3. **Transformers.js (Whisper)**: A IA escuta o arquivo localmente, e devolve um JSON com os cortes exatos de cada frase dita (`start` e `end`).
4. **ffmpeg (Imagem)**: Tira uma "fotografia" do vídeo no milissegundo exato de cada frase.
5. **Node.js Engine**: Agrupa matematicamente o texto e as imagens em blocos de 8 segundos e manda para o Frontend (Glassmorphism).

---

## 🚀 Requisitos de Sistema

Certifique-se de ter instalado no seu Mac/Linux/Windows:
- [Node.js](https://nodejs.org/en/) (v18 ou superior)
- [FFmpeg](https://ffmpeg.org/download.html) (Acessível nas variáveis de ambiente / PATH)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (Atualizado para a versão mais recente)

---

## 🛠️ Como Instalar e Rodar

1. **Clone ou acesse a pasta do repositório:**
   ```bash
   cd Stracto
   ```

2. **Instale as dependências do Node:**
   ```bash
   npm install
   ```

3. **Inicie o Servidor:**
   ```bash
   npm start
   # ou
   node server.js
   ```

4. **Acesse a Aplicação:**
   Abra seu navegador e acesse: [http://localhost:3001](http://localhost:3001)

---

## ⚠️ Observações de Primeira Execução
Ao realizar a transcrição do primeiro vídeo, o Node.js fará o download do modelo **Whisper Tiny** (`~150MB`) diretamente da HuggingFace. Isso ocorre apenas uma vez. Após baixado, ele fica armazenado no cache da sua máquina e as transcrições seguintes serão quase instantâneas.

---
*Desenvolvido para operações de geração de vídeo H.P.S.C.*
