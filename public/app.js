const startBtn = document.getElementById('startBtn');
const logsContainer = document.getElementById('logsContainer');
const logList = document.getElementById('logList');
const resultsPanel = document.getElementById('resultsPanel');
const storyboardGrid = document.getElementById('storyboardGrid');

function log(message) {
    const li = document.createElement('li');
    li.textContent = message;
    logList.appendChild(li);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function createCard(item) {
    return `
        <div class="card">
            <img src="${item.imageUrl}" alt="Frame at ${item.start}" class="card-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMyMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iI2ZmZiIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2VtIHBlcmRpZGE8L3RleHQ+PC9zdmc+'">
            <div class="card-content">
                <div class="card-time"><i data-lucide="clock" style="width:12px; height:12px; display:inline-block;"></i> ${item.start}</div>
                <div class="card-text">"${item.text}"</div>
            </div>
        </div>
    `;
}

startBtn.addEventListener('click', async () => {
    const url = document.getElementById('url').value.trim();
    
    if (!url) return alert('Insira o link do vídeo!');

    startBtn.disabled = true;
    startBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Processando Mídia...';
    lucide.createIcons();
    
    logList.innerHTML = '';
    logsContainer.style.display = 'block';
    resultsPanel.style.display = 'none';
    storyboardGrid.innerHTML = '';

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
                log(`❌ Erro: ${parsed.data.message}`);
                eventSource.close();
                resetBtn();
            }
            else if (parsed.type === 'complete') {
                eventSource.close();
                resetBtn();
                
                // Render UI
                const blocks = parsed.data.blocks;
                if (blocks && blocks.length > 0) {
                    let html = '';
                    blocks.forEach(block => {
                        html += `<div class="block-section">
                            <h3 class="block-title"><i data-lucide="layout-template"></i> ${block.title}</h3>
                            <div class="storyboard-grid">
                                ${block.items.map(createCard).join('')}
                            </div>
                        </div>`;
                    });
                    storyboardGrid.innerHTML = html;
                    resultsPanel.style.display = 'block';
                    lucide.createIcons();
                } else {
                    log('⚠️ Nenhum frame foi extraído.');
                }
            }
        };
        
        eventSource.onerror = () => {
            log('❌ Erro de conexão com o servidor.');
            eventSource.close();
            resetBtn();
        };

    } catch (e) {
        log(`❌ Falha: ${e.message}`);
        resetBtn();
    }
});

function resetBtn() {
    startBtn.disabled = false;
    startBtn.innerHTML = '<i data-lucide="zap"></i> Gerar Storyboard';
    lucide.createIcons();
}
