document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.url-form');
    const input = document.querySelector('.url-input');
    const btn = document.querySelector('.cta-btn');
    const terminal = document.querySelector('.terminal');
    const storyboard = document.querySelector('.storyboard');
    
    let startTime = null;
    let terminalDotInterval = null;

    function pad(num) {
        return num.toString().padStart(2, '0');
    }

    function getElapsedTimeString() {
        if (!startTime) return "00:00:00";
        const diff = Math.floor((Date.now() - startTime) / 1000);
        const hrs = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }

    function log(message, progress = null) {
        // Remove existing dot if any
        const existingDot = terminal.querySelector('.t-dot');
        if (existingDot) existingDot.remove();
        
        const row = document.createElement('div');
        
        if (progress !== null) {
            row.className = 'terminal-row progress-row';
            row.innerHTML = `
                <span class="t-time">${getElapsedTimeString()}</span>
                <div class="progress-track"><div class="progress-fill" style="width: ${progress}%;"></div></div>
            `;
            
            const msgRow = document.createElement('div');
            msgRow.className = 'terminal-row';
            msgRow.innerHTML = `
                <span class="t-time">${getElapsedTimeString()}</span>
                <span class="t-msg">${message}</span>
                <span class="t-percent">${progress}%</span>
            `;
            terminal.appendChild(msgRow);
            terminal.appendChild(row);
        } else {
            row.className = 'terminal-row';
            row.innerHTML = `
                <span class="t-time">${getElapsedTimeString()}</span>
                <span class="t-msg">${message}</span>
                <span class="t-dot"></span>
            `;
            terminal.appendChild(row);
        }
    }

    // Global functions for download
    window.downloadImage = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
    };
    
    function downloadIcon() {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    }

    function arrowIcon() {
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    }

    window.exportScript = (blocks) => {
        let content = "ROTEIRO DO STORYBOARD\n====================\n\n";
        blocks.forEach(block => {
            content += `BLOCO: ${block.title}\n`;
            block.items.forEach(item => {
                content += `[${item.start}] ${item.text}\n`;
            });
            content += "\n";
        });
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'roteiro_completo.txt';
        link.click();
    };

    function createCard(item) {
        return `
            <article class="frame">
                <img src="${item.imageUrl}" alt="Frame at ${item.start}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxYTFhMWEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2M0YzRjNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2VtPC90ZXh0Pjwvc3ZnPg=='">
                <button class="frame-download" onclick="downloadImage('${item.imageUrl}', 'frame_${item.start}.jpg')" aria-label="Baixar frame">${downloadIcon()}</button>
                <div class="frame-meta">
                    <span class="frame-time">${item.start}</span>
                    <p class="frame-caption">${item.text}</p>
                </div>
            </article>
        `;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = input.value.trim();
        
        if (!url) return alert('Insira o link do vídeo!');

        btn.disabled = true;
        btn.innerHTML = 'Processando... <span class="arrow">⌛</span>';
        
        // Clear terminal example, ready for live logs
        terminal.innerHTML = '';
        terminal.classList.remove('has-example');
        
        // Hide storyboard until done
        storyboard.style.display = 'none';
        
        startTime = Date.now();

        try {
            const res = await fetch('http://localhost:3001/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            const jobId = data.jobId;
            
            // Listen to SSE
            const eventSource = new EventSource(`http://localhost:3001/api/stream/${jobId}`);
            
            eventSource.onmessage = (event) => {
                const parsed = JSON.parse(event.data);
                
                if (parsed.type === 'log') {
                    log(parsed.data.message);
                } 
                else if (parsed.type === 'error') {
                    log(`Erro: ${parsed.data.message}`);
                    eventSource.close();
                    resetBtn();
                }
                else if (parsed.type === 'complete') {
                    eventSource.close();
                    resetBtn();
                    
                    const existingDot = terminal.querySelector('.t-dot');
                    if (existingDot) existingDot.remove();
                    
                    // Render UI
                    const blocks = parsed.data.blocks;
                    if (blocks && blocks.length > 0) {
                        let html = `
                        <div class="storyboard-header" tabindex="-1" id="storyboard-start">
                            <h2>Storyboard <span class="muted">(Blocos de 8 segundos)</span></h2>
                            <span class="badge">${blocks.length} blocos gerados</span>
                        </div>
                        `;
                        
blocks.forEach((block, idx) => {
    const blockId = `block-${idx}`;
    const panelId = `block-panel-${idx}`;
    html += `
    <div class="block">
        <div class="block-header" role="button" tabindex="0" aria-expanded="true" aria-controls="${panelId}" onclick="this.parentElement.classList.toggle('collapsed'); this.setAttribute('aria-expanded', !this.parentElement.classList.contains('collapsed'))" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
            <div class="block-header-left">
                <span class="block-toggle-icon" aria-hidden="true">▼</span>
                <span class="block-range">${block.title}</span>
            </div>
            <span class="block-duration">8s</span>
        </div>
        <div class="frame-grid" id="${panelId}" role="region" aria-labelledby="${blockId}">
            ${block.items.map(createCard).join('')}
        </div>
    </div>`;
});
    window.exportToCSV = (blocks) => {
        let csvContent = "data:text/csv;charset=utf-8,Tempo,Legenda,Link_Imagem\n";
        blocks.forEach(block => {
            block.items.forEach(item => {
                const text = `"${item.text.replace(/"/g, '""')}"`;
                csvContent += `"${item.start}",${text},"${item.imageUrl}"\n`;
            });
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'roteiro_frames.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ... (rest of the file)

                        storyboard.innerHTML = html + `
                        <div class="storyboard-actions">
                            <button class="cta-btn" onclick="exportScript(${JSON.stringify(blocks).replace(/"/g, '"')})">Salvar Roteiro Completo (.txt) ${downloadIcon()}</button>
                        </div>
                        `;
                        storyboard.style.display = 'block';
                        setTimeout(() => {
                            const header = document.getElementById('storyboard-start');
                            if (header) header.focus();
                        }, 100);
                    } else {
                        log('Nenhum frame foi extraído.');
                    }
                }
            };
            
            eventSource.onerror = () => {
                log('Erro de conexão com o servidor.');
                eventSource.close();
                resetBtn();
            };

        } catch (e) {
            log(`Falha: ${e.message}`);
            resetBtn();
        }
    });

    function resetBtn() {
        btn.disabled = false;
        btn.innerHTML = `Gerar Storyboard ${arrowIcon()}`;
    }
});
