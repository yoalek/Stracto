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

    function createCard(item) {
        return `
            <article class="frame">
                <img src="${item.imageUrl}" alt="Frame at ${item.start}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxYTFhMWEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2M0YzRjNCIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2VtPC90ZXh0Pjwvc3ZnPg=='">
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
        
        // Clear terminal but keep it visible
        terminal.innerHTML = '';
        
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
                        <div class="storyboard-header">
                            <h2>Storyboard <span class="muted">(Blocos de 8 segundos)</span></h2>
                            <span class="badge">${blocks.length} blocos gerados</span>
                        </div>
                        `;
                        
                        blocks.forEach(block => {
                            html += `
                            <div class="block">
                                <div class="block-header" onclick="this.parentElement.classList.toggle('collapsed')">
                                    <div class="block-header-left">
                                        <span class="block-toggle-icon">▼</span>
                                        <span class="block-range">${block.title}</span>
                                    </div>
                                    <span class="block-duration">8s</span>
                                </div>
                                <div class="frame-grid">
                                    ${block.items.map(createCard).join('')}
                                </div>
                            </div>`;
                        });
                        storyboard.innerHTML = html;
                        storyboard.style.display = 'block';
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
        btn.innerHTML = 'Gerar Storyboard <span class="arrow">→</span>';
    }
});
