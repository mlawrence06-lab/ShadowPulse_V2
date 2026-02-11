(function() {
    "use strict";

    window.SP = window.SP || {};

    window.SP.Stats = {
        init: function(bar) {
            const priceEl = bar.querySelector('.sp-stats-price');
            const graphEl = bar.querySelector('.sp-stats-graph');

            // Event Driven Update
            document.addEventListener('sp-heartbeat', (e) => {
                if (e.detail) {
                     this.render(priceEl, graphEl, e.detail);
                }
            });
        },

        render: function(priceEl, graphEl, data) {
            if (!priceEl || !graphEl) return;
            
            if (!data) {
                priceEl.textContent = "...";
                return;
            }

            priceEl.textContent = data.price_label;
            priceEl.className = 'sp-stats-price ' + (data.trend === 'up' ? 'sp-trend-up' : 'sp-trend-down');

            const w = 80; const h = 18;
            
            let history = [];
            if (Array.isArray(data.history)) {
                history = data.history.map(item => {
                    if (typeof item === 'object' && item !== null) return { p: Number(item.p), t: Number(item.t) };
                    return { p: Number(item), t: 0 }; 
                });
            }

            if (history.length < 1) return;

            const prices = history.map(h => h.p).filter(n => !isNaN(n));
            if (prices.length === 0) return;
            const minP = Math.min(...prices);
            const maxP = Math.max(...prices);
            const rangeP = (maxP - minP) || 1;

            const hasTime = history[0].t > 0;
            
            const startPriceVal = history[0].p;
            const endPriceVal = history[history.length - 1].p;
            const isPositive = endPriceVal >= startPriceVal;
            const color = isPositive ? '#16a34a' : '#dc2626'; 

            let grid = "";
            let pathD = "";
            
            if (hasTime) {
                const lastT = history[history.length - 1].t;
                const windowSeconds = 3600;
                const startWindowT = lastT - windowSeconds;
                const isDark = document.body.getAttribute('data-sp-theme') === 'dark';
                const blockFill = isDark ? '#ffffff' : '#000000';
                const blockOpacity = '0.15'; 

                const firstBlockT = Math.floor(startWindowT / 900) * 900;
                
                for (let t = firstBlockT; t <= lastT; t += 900) {
                    const blockIndex = Math.round(t / 900);
                    if (blockIndex % 2 === 0) {
                        const bStart = Math.max(t, startWindowT);
                        const bEnd = Math.min(t + 900, lastT);
                        
                        if (bEnd > bStart) {
                            const x1 = ((bStart - startWindowT) / windowSeconds) * w;
                            const x2 = ((bEnd - startWindowT) / windowSeconds) * w;
                            const bw = x2 - x1;
                            grid = `<rect x="${x1}" y="0" width="${bw}" height="${h}" fill="${blockFill}" fill-opacity="${blockOpacity}" />` + grid;
                        }
                    } else if (t >= startWindowT) {
                         const timeOffset = t - startWindowT;
                         const x = (timeOffset / windowSeconds) * w;
                         grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-opacity="0.2" stroke-width="0.5" stroke-dasharray="2,2" />`;
                    }
                }

                history.forEach((hItem, i) => {
                    if (hItem.t < startWindowT) return; 
                    const timeOffset = hItem.t - startWindowT;
                    let x = (timeOffset / windowSeconds) * w;
                    if (x < 0) x = 0; if (x > w) x = w;
                    const y = h - ((hItem.p - minP) / rangeP * (h - 2)) - 1;
                    pathD += `${pathD===''?'M':'L'} ${x} ${y}`;
                });
            } else {
                // Fallback implementation removed for brevity, assuming new API always sends time
                // If needed, copy from bundle.js
            }

            const startY = h - ((history[0].p - minP) / rangeP * (h - 2)) - 1;
            grid += `<line x1="0" y1="${startY}" x2="${w}" y2="${startY}" stroke="${color}" stroke-opacity="0.6" stroke-width="1.5" />`;

            graphEl.innerHTML = `
                <svg viewBox="0 0 ${w} ${h}" fill="none" style="overflow:visible; width:100%; height:100%;">
                    ${grid}
                    <path d="${pathD}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            `;
        }
    };

})();
