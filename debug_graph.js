const data = {
    "price":  71323,
    "price_label":  "$71,323",
    "trend":  "up",
    "history":  [
        { "p": 70912, "t": 1770273721 },
        { "p": 71323, "t": 1770277201 }
    ]
};

function renderStats(data) {
    if (!data) return;

    console.log("Price:", data.price_label);

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

    console.log("Min:", minP, "Max:", maxP, "Range:", rangeP);

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
        
        console.log("Time Window:", startWindowT, "to", lastT);

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
                    grid = `<rect x="${x1}" y="0" width="${bw}" height="${h}" />` + grid;
                }
            }
        }

        history.forEach((hItem, i) => {
            if (hItem.t < startWindowT) return; 
            const timeOffset = hItem.t - startWindowT;
            const x = (timeOffset / windowSeconds) * w;
            const y = h - ((hItem.p - minP) / rangeP * (h - 2)) - 1;
            pathD += `${pathD===''?'M':'L'} ${x} ${y}`;
        });

    }

    console.log("PathD:", pathD);
}

renderStats(data);
