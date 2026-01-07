import { createEl, spLog } from "./utils.js";
import { CONFIG } from "./config.js";

export function openSettingsModal() {
    let backdrop = document.getElementById('sp-settings-root');
    if (backdrop) {
        backdrop.classList.toggle('sp-settings-open');
        // If we just OPENED it, refresh stats
        if (backdrop.classList.contains('sp-settings-open') && typeof window.spUpdateStats === 'function') {
            window.spUpdateStats();
        }
        return;
    }

    backdrop = createEl('div', ['sp-settings-backdrop']);
    backdrop.id = 'sp-settings-root';
    const version = chrome.runtime.getManifest().version;

    // Construct Modal HTML
    backdrop.innerHTML = `
        <div class="sp-settings-modal" id="sp-settings-window">
            <div class="sp-settings-header" id="sp-settings-drag-handle" style="cursor:move;">
                <div class="sp-settings-header-logo" style="margin-right:12px;">
                    <!-- Inline SP Logo -->
                    <svg width="48" height="48" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="sp_logo_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#1e3a8a;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="48" fill="url(#sp_logo_grad)" />
                        <text x="50" y="65" font-family="Arial, sans-serif" font-weight="bold" font-size="40" text-anchor="middle" fill="white">SP</text>
                    </svg>
                </div>
                <div>
                   <div class="sp-settings-title">ShadowPulse</div>
                   <div style="font-size:12px; color:var(--sp-text-soft);">Version ${version}</div>
                </div>
                <div class="sp-settings-close" style="margin-left:auto; padding:0 8px;">×</div>
            </div>
            
            <div class="sp-settings-body">
                
                <!-- Theme -->
                <div class="sp-settings-row">
                    <label>Theme</label>
                    <select id="sp-theme-select">
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>

                <!-- Show Graph (New) -->
                <div class="sp-settings-row">
                    <label>Show Graph</label>
                    <select id="sp-show-graph-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Bitcoin Source (Wrapped for toggling) -->
                <div class="sp-settings-row" id="sp-btc-row">
                    <label>Bitcoin Source</label>
                    <select id="sp-btc-select">
                        <option value="binance">Binance</option>
                    </select>
                </div>

                <!-- Show +Pulse (New) -->
                <div class="sp-settings-row">
                    <label>Show +Pulse</label>
                    <select id="sp-show-pulse-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Flash Logo (New) -->
                <div class="sp-settings-row">
                    <label>Flash Logo</label>
                    <select id="sp-flash-logo-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Display Name (V1 Style) -->
                <div class="sp-settings-row">
                    <label>Display Name</label>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <input type="text" id="sp-name-input" placeholder="User ID" style="width:180px; text-align:right;" />
                        <button id="sp-name-submit" style="width:24px; height:24px; padding:0; cursor:pointer;" disabled>✓</button>
                    </div>
                </div>

                <!-- Statistics Area -->
                <div class="sp-section-title">Statistics</div>
                <div class="sp-settings-row">
                     <span>Topic Views:</span>
                     <span class="sp-stat-value" id="sp-stat-views">—</span>
                </div>
                <div class="sp-settings-row">
                     <span>Vote Pulses:</span>
                     <span class="sp-stat-value" id="sp-stat-votes">—</span>
                </div>

                <div class="sp-settings-row" style="justify-content:center; margin-top:8px;">
                     <a href="http://192.168.1.12:8081/reports/" target="_blank" class="sp-link">Report Center</a>
                </div>

                <hr class="sp-sep" />
                
                <!-- Account Security -->
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="sp-section-title" style="border:none; margin:0;">Account Security</div>
                    <button id="sp-security-toggle" style="font-size:10px; cursor:pointer; background:none; border:1px solid var(--sp-border); color:var(--sp-text-soft); padding:0 4px;">SHOW</button>
                </div>
                <div id="sp-security-block" style="display:none; flex-direction:column; gap:4px; margin-top:8px;">
                    
                    <!-- Restore Code Display -->
                    <div style="margin-top:2px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <div class="sp-settings-label-block" style="margin:0;">Private Restore Code:</div>
                            
                            <!-- Copy Icon Button -->
                            <button id="sp-copy-btn" title="Copy to Clipboard" style="background:none; border:none; cursor:pointer; color:var(--sp-text-soft); padding:4px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="sp-settings-input-group" style="margin-bottom:0;">
                             <!-- Removed Bold -->
                             <div class="sp-settings-restore-code" id="sp-code-display" style="background:var(--sp-bg); border-color:var(--sp-accent); color:var(--sp-accent);">...</div>
                        </div>
                    </div>

                    <!-- Restore Code Saved Dropdown -->
                    <div class="sp-settings-row">
                        <span>Code Saved?</span>
                        <select id="sp-ack-select" style="width:80px;">
                            <option value="false">Not Yet</option>
                            <option value="true">Saved!</option>
                        </select>
                    </div>
                    
                    <div class="sp-settings-warning" id="sp-restore-warning" style="display:none; color:#ef4444; font-size:11px; text-align:center; margin-top:4px;">
                        ⚠️ This will overwrite all your Settings and Statistics!
                    </div>
                    
                    <!-- Inline Restore Area (Flush Right GO) -->
                    <div class="sp-settings-row" style="margin-top:4px; display:flex;">
                        <span style="margin-right:4px;">Restore:</span>
                        <div class="sp-settings-input-group" style="margin:0; flex:1; display:flex;">
                            <input type="text" id="sp-restore-input" placeholder="Paste code" style="flex:1; width:0;" /> <!-- width:0 force flex shrink -->
                            <button id="sp-restore-btn" class="sp-text-btn">GO</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.classList.add('sp-settings-open'), 10);

    // --- Modal Drag Logic ---
    const modal = backdrop.querySelector('#sp-settings-window');
    const handle = backdrop.querySelector('#sp-settings-drag-handle');
    
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    handle.addEventListener('mousedown', (e) => {
        // Ignore close button clicks
        if(e.target.closest('.sp-settings-close')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // Disable centering transform when starting drag (if any)
        // We need to switch to absolute positioning relative to viewport if it isn't already
        // But the backdrop centers it flexbox-style. 
        // Strategy: Switch modal to absolute positioning on first drag.
        
        const rect = modal.getBoundingClientRect();
        modal.style.position = 'absolute';
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
        modal.style.transform = 'none'; // Remove any flex centering effects if present
        
        initialLeft = rect.left;
        initialTop = rect.top;
        
        handle.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        modal.style.left = (initialLeft + dx) + 'px';
        modal.style.top = (initialTop + dy) + 'px';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        handle.style.cursor = 'move';
    });

    // --- Logic Implementation ---
    implementSettingsLogic(backdrop);
    
    // Explicitly Trigger Stats Update on Open
    if (typeof window.spUpdateStats === 'function') {
        window.spUpdateStats();
    }
}

function implementSettingsLogic(backdrop) {
    // ... Close handlers ...
    const closeBtn = backdrop.querySelector('.sp-settings-close');
    const close = () => backdrop.classList.remove('sp-settings-open');
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
    
    // Style Close Button (Dynamic)
    closeBtn.style.fontSize = "20px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.lineHeight = "1";
    closeBtn.style.cursor = "pointer";
    closeBtn.title = "Close";

    // ... Controls ...
    const themeSel = backdrop.querySelector('#sp-theme-select');
    const graphSel = backdrop.querySelector('#sp-show-graph-select');
    const btcRow = backdrop.querySelector('#sp-btc-row');
    const btcSel = backdrop.querySelector('#sp-btc-select');
    const pulseSel = backdrop.querySelector('#sp-show-pulse-select');
    const flashSel = backdrop.querySelector('#sp-flash-logo-select');

    chrome.storage.local.get(['sp_theme', 'sp_btc_source', 'sp_show_graph', 'sp_show_pulse', 'sp_flash_logo'], res => {
        const theme = res.sp_theme || 'light';
        themeSel.value = theme;
        
        // Graph Defaults to YES (true) unless explicitly false
        const showGraph = res.sp_show_graph !== false; 
        graphSel.value = showGraph ? "true" : "false";
        btcRow.style.display = showGraph ? 'flex' : 'none'; // Toggle visibility on load

        btcSel.value = res.sp_btc_source || 'binance';
        
        pulseSel.value = (res.sp_show_pulse !== false) ? "true" : "false";
        flashSel.value = (res.sp_flash_logo !== false) ? "true" : "false";

        // FORCE APPLY THEME on Open
        document.body.setAttribute('data-sp-theme', theme);
    });

    themeSel.addEventListener('change', (e) => {
        const val = e.target.value;
        chrome.storage.local.set({ sp_theme: val });
        document.body.setAttribute('data-sp-theme', val);
    });
    
    // Show Graph Logic
    graphSel.addEventListener('change', (e) => {
        const isShow = e.target.value === 'true';
        chrome.storage.local.set({ sp_show_graph: isShow });
        
        // Immediate UI Update
        btcRow.style.display = isShow ? 'flex' : 'none';
        
        // Find Floating Bar Graph Zone specifically
        const graphZone = document.getElementById('sp-stats-zone');
        if (graphZone) graphZone.style.display = isShow ? 'flex' : 'none';
    });

    btcSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_btc_source: e.target.value });
    });

    pulseSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_show_pulse: e.target.value === 'true' });
        // NOTE: "Main.js" loop needs to observe this or reload page. 
        // For V2 Pilot, a reload is fine, or the loop checks naturally.
        // We will make injectPulseButtons check this in main.js
    });

    flashSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_flash_logo: e.target.value === 'true' });
    });

    
    // ... Display Name Validation ...
    const nameInp = backdrop.querySelector('#sp-name-input');
    const nameBtn = backdrop.querySelector('#sp-name-submit');
    
    // Get Init Name
    chrome.storage.local.get(['custom_name', 'sp_public_id'], res => {
        nameInp.value = res.custom_name || res.sp_public_id || "";
    });

    // ... Account Security : Restore Code Population ...
    const codeDisp = backdrop.querySelector('#sp-code-display');
    chrome.storage.local.get(['sp_uuid'], res => {
        if (res.sp_uuid) {
            codeDisp.textContent = res.sp_uuid;
        } else {
            // Should exist, but if not, user needs to init extension
            codeDisp.textContent = "N/A - Restart Extension";
        }
    });

    // Copy Button (Icon Flash)
    const copyBtn = backdrop.querySelector('#sp-copy-btn');
    copyBtn.addEventListener('click', () => {
        const txt = codeDisp.textContent;
        if(txt && txt !== '...') {
            navigator.clipboard.writeText(txt).then(() => {
                const svg = copyBtn.innerHTML;
                copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`; // Checkmark
                setTimeout(() => copyBtn.innerHTML = svg, 1500);
            });
        }
    });
    
    // Restore Input Warning
    const resInp = backdrop.querySelector('#sp-restore-input');
    const resWarn = backdrop.querySelector('#sp-restore-warning');
    resInp.addEventListener('input', () => {
        resWarn.style.display = resInp.value.trim().length > 0 ? 'block' : 'none';
    });
    
    // Restore Action
    const restoreBtn = backdrop.querySelector('#sp-restore-btn');
    restoreBtn.addEventListener('click', async () => {
        const code = resInp.value.trim();
        if(code) {
            restoreBtn.textContent = 'Syncing...';
            restoreBtn.disabled = true;
            try {
                // Fetch Identity from Backend
                const response = await fetch(`${CONFIG.API_BASE_URL}/recover_identity.php?uuid=${encodeURIComponent(code)}`);
                const json = await response.json();
                
                if (json.status === 'success') {
                    // Recovered!
                    chrome.storage.local.set({ 
                        sp_uuid: code,
                        sp_public_id: json.data.public_id 
                    }, () => {
                        restoreBtn.textContent = 'Success!';
                        setTimeout(() => window.location.reload(), 500);
                    });
                } else {
                    alert("Sync Failed: " + (json.message || "Unknown Error"));
                    restoreBtn.textContent = 'GO';
                    restoreBtn.disabled = false;
                }
            } catch (e) {
                console.error("Sync Error", e);
                alert("Network Error during Sync.");
                restoreBtn.textContent = 'GO';
                restoreBtn.disabled = false;
            }
        }
    });

    nameInp.addEventListener('input', () => {
        const val = nameInp.value.trim();
        const isValid = /^[a-zA-Z0-9 _-]*$/.test(val);
        if(!isValid) {
            nameInp.style.borderColor = 'red';
            nameInp.title = "Only alphanumeric, spaces, dashes, underscores.";
            nameBtn.disabled = true;
        } else {
            nameInp.style.borderColor = '';
            nameInp.title = '';
            nameBtn.disabled = false;
        }
    });

    nameBtn.addEventListener('click', () => {
        // ... Save Logic (Mock for now or use V1 API URL if CORS permits) ...
        const val = nameInp.value.trim();
        // Optimistic Save
        chrome.storage.local.set({ custom_name: val, sp_public_id: val });
        nameInp.style.borderColor = '#28a745';
        setTimeout(() => nameInp.style.borderColor = '', 2000);
    });

    // ... Security Toggle ...
    const secBlock = backdrop.querySelector('#sp-security-block');
    const secToggle = backdrop.querySelector('#sp-security-toggle');
    
    // ... Ack Dropdown ...
    const ackSel = backdrop.querySelector('#sp-ack-select');
    
    // Check Ack State
    chrome.storage.local.get(['memberRestoreAck'], res => {
        const isAck = !!res.memberRestoreAck;
        if(!isAck) {
             // Add Pulse Animation if not Ack
             secToggle.classList.add('sp-flash-10s');
        } else {
             secToggle.classList.remove('sp-flash-10s');
        }
        ackSel.value = isAck ? "true" : "false";
    });

    secToggle.addEventListener('click', () => {
        const isHidden = secBlock.style.display === 'none';
        secBlock.style.display = isHidden ? 'flex' : 'none';
        secToggle.textContent = isHidden ? 'HIDE' : 'SHOW';
    });
    
    ackSel.addEventListener('change', (e) => {
        const isAck = e.target.value === 'true';
        chrome.storage.local.set({ memberRestoreAck: isAck });
        if(isAck) {
            secToggle.classList.remove('sp-flash-10s'); // Stop pulsing
        } else {
            secToggle.classList.add('sp-flash-10s'); // Start pulsing
        }
    });

    // FETCH STATS (One-Time Fetch, Exposed Globally)
    window.spUpdateStats = () => {
        chrome.storage.local.get(['sp_public_id'], res => {
            if (res.sp_public_id) {
                chrome.runtime.sendMessage({
                    type: "GET_USER_STATS",
                    payload: { voter_id: res.sp_public_id }
                }, response => {
                    if (response && response.success) {
                        const d = response.data.data;
                        if (d) {
                             const viewsEl = backdrop.querySelector('#sp-stat-views');
                             if(viewsEl) viewsEl.textContent = d.topic_views + " (Rank: " + d.view_rank + ")";
                             
                             const votesEl = backdrop.querySelector('#sp-stat-votes');
                             if(votesEl) votesEl.textContent = d.vote_pulses + " (Rank: " + d.rank + ")";
                        }
                    }
                });
            }
        });
    };

    // Initial Fetch on Creation
    window.spUpdateStats();

}

// --- Helper functions for State ---
async function getState(key, def) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (res) => {
            resolve(res[key] !== undefined ? res[key] : def);
        });
    });
}
async function setState(key, val) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: val }, resolve);
    });
}

// --- Floating Bar ---
export function injectFloatingBar() {
    // Ensure Theme is applied on load
    chrome.storage.local.get(['sp_theme'], res => {
        document.body.setAttribute('data-sp-theme', res.sp_theme || 'light');
    });

    if (document.getElementById('sp-floating-bar-root')) return;

    const bar = createEl('div', ['sp-floating-bar']);
    bar.id = 'sp-floating-bar-root';
    
    // Initial Layout: Logo + Stats Zone
    bar.innerHTML = `
        <div class="sp-bar-content">
            <div class="sp-zone-logo" id="sp-logo-zone" title="Open Settings">
                <div class="sp-logo-circle" data-vote-color="blue">
                    <div class="sp-logo-text">SP</div>
                </div>
            </div>
            
            <div class="sp-zone-stats" id="sp-stats-zone">
                 <div class="sp-stats-price">Loading...</div>
                 <div class="sp-stats-graph"></div>
            </div>
        </div>
    `;

    document.body.appendChild(bar);

    // --- Robust Drag Logic ---
    let isDragging = false;
    let hasMoved = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let startX = 0;
    let startY = 0;

    // Force initial position to computed style OR stored position
    chrome.storage.local.get(['sp_bar_pos'], res => {
        if (res.sp_bar_pos) {
            bar.style.left = res.sp_bar_pos.left;
            bar.style.top = res.sp_bar_pos.top;
            bar.style.bottom = 'auto'; // Prevent stretching against CSS default
            bar.style.right = 'auto';  // Prevent stretching against CSS default
            
            // Validate bounds
            const rect = bar.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            
            if (rect.right > winW) bar.style.left = (winW - rect.width - 20) + 'px';
            if (rect.bottom > winH) bar.style.top = (winH - rect.height - 20) + 'px';
            if (parseFloat(bar.style.left) < 0) bar.style.left = '20px';
            if (parseFloat(bar.style.top) < 0) bar.style.top = '20px';
            
        } else {
             // Default (Lower Left)
             const initRect = bar.getBoundingClientRect();
             bar.style.bottom = 'auto'; // Clear bottom from CSS
             bar.style.right = 'auto'; // Clear right
             bar.style.left = initRect.left + 'px';
             bar.style.top = initRect.top + 'px';
        }
    });

    const onMouseDown = (e) => {
        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        
        e.preventDefault(); 
        
        const rect = bar.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        bar.classList.add('dragging');
        document.body.classList.add('sp-dragging');
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        // Threshold for "movement"
        if (dx > 3 || dy > 3) {
            hasMoved = true;
        }

        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;

        // Clamp to screen
        const maxW = window.innerWidth - bar.offsetWidth;
        const maxH = window.innerHeight - bar.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxW));
        newY = Math.max(0, Math.min(newY, maxH));

        bar.style.left = newX + 'px';
        bar.style.top = newY + 'px';
    };

    const onMouseUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        bar.classList.remove('dragging');
        document.body.classList.remove('sp-dragging');
        
        // Save Position if moved
        if (hasMoved) {
            chrome.storage.local.set({ 
                sp_bar_pos: { left: bar.style.left, top: bar.style.top } 
            });
        }
        
        // Handle "Click" on Logo here if it wasn't a move
        if (!hasMoved && e.target.closest('#sp-logo-zone')) {
             openSettingsModal();
        }
    };

    const onResize = () => {
        // Ensure bar stays on screen
        const rect = bar.getBoundingClientRect();
        let changed = false;
        if (rect.right > window.innerWidth) {
            bar.style.left = (window.innerWidth - rect.width - 20) + 'px';
            changed = true;
        }
        if (rect.bottom > window.innerHeight) {
            bar.style.top = (window.innerHeight - rect.height - 20) + 'px';
            changed = true;
        }
        if (changed) {
             chrome.storage.local.set({ 
                sp_bar_pos: { left: bar.style.left, top: bar.style.top } 
            });
        }
    };

    // Attach Listeners
    bar.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);

    // --- Start Stats Loop ---
    // But check visibility first
    chrome.storage.local.get(['sp_show_graph'], res => {
         const showGraph = res.sp_show_graph !== false;
         if(!showGraph) {
             const stats = bar.querySelector('#sp-stats-zone');
             if(stats) stats.style.display = 'none';
         }
    });

    startStatsLoop(bar);
}

// --- Stats Logic ---
function startStatsLoop(bar) {
    const priceEl = bar.querySelector('.sp-stats-price');
    const graphEl = bar.querySelector('.sp-stats-graph');
    let lastValidTime = 0;

    const update = async () => {
        // Check DOM visibility of the PARENT zone
        const statsZone = bar.querySelector('#sp-stats-zone');
        if (statsZone && statsZone.style.display === 'none') {
             return; // Skip fetch if hidden
        }

        try {
            // PROXY through Background Script to bypass CORS
            const response = await chrome.runtime.sendMessage({ type: "FETCH_STATS" });

            if (response && response.success) {
                const data = response.data;
                // Protection Removed to ensure data flows.
                // We accept whatever the server sends to prevent 'locking'.
                renderStats(priceEl, graphEl, data);
            } else {
                console.error("Stats fail (BG):", response ? response.error : "No Response");
            }
        } catch (e) { console.error("Stats Msg Error", e); }
    };

    update();
    setInterval(update, CONFIG.POLLING_INTERVAL); // Use Config Interval
}

export function renderStats(priceEl, graphEl, data) {
    if (!priceEl || !graphEl || !data) return;

    priceEl.textContent = data.price_label;
    priceEl.className = 'sp-stats-price ' + (data.trend === 'up' ? 'sp-trend-up' : 'sp-trend-down');

    // SVG Graph
    const w = 80; const h = 18;
    
    // Parse History: Handle both [numbers] (Legacy) and [{p,t}] (New)
    let history = [];
    if (Array.isArray(data.history)) {
        history = data.history.map(item => {
            if (typeof item === 'object' && item !== null) return { p: Number(item.p), t: Number(item.t) };
            return { p: Number(item), t: 0 }; // Legacy fallback
        });
    }

    if (history.length < 1) return;

    // Determine Y-Axis Range
    const prices = history.map(h => h.p).filter(n => !isNaN(n));
    if (prices.length === 0) return;
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = (maxP - minP) || 1;

    // Determine X-Axis (Time)
    const hasTime = history[0].t > 0;
    
    // Color: Green if Current > Start (Base), Red otherwise
    const startPriceVal = history[0].p;
    const endPriceVal = history[history.length - 1].p;
    const isPositive = endPriceVal >= startPriceVal;
    const color = isPositive ? '#16a34a' : '#dc2626'; 

    let grid = "";
    let pathD = "";
    
    if (hasTime) {
        // Dynamic Grid (Time Based)
        const lastT = history[history.length - 1].t;
        const windowSeconds = 3600;
        const startWindowT = lastT - windowSeconds;

        const firstGridT = Math.ceil(startWindowT / 900) * 900;
        
        for (let t = firstGridT; t <= lastT; t += 900) {
            const timeOffset = t - startWindowT;
            const x = (timeOffset / windowSeconds) * w;
            // Vertical Ticks: Dynamic Color, Bold Opacity (0.35)
            grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2,2" />`;
        }

        // Build Path
        history.forEach((hItem, i) => {
            if (hItem.t < startWindowT) return; 
            const timeOffset = hItem.t - startWindowT;
            const x = (timeOffset / windowSeconds) * w;
            const y = h - ((hItem.p - minP) / rangeP * (h - 2)) - 1;
            pathD += `${pathD===''?'M':'L'} ${x} ${y}`;
        });

    } else {
        // Fallback Logic
        const maxPoints = 60;
        const stepX = w / (maxPoints - 1);
        const offset = maxPoints - history.length;

        // Static Grid: Dynamic Color, Bold Opacity (0.35)
        for(let i=15; i<60; i+=15) {
            const x = i * stepX;
            grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2,2" />`;
        }
        
        // Path
        if (history.length === 1) {
             const x = offset * stepX; 
             const safeY = h - ((history[0].p - minP) / rangeP * (h - 2)) - 1; 
             pathD = `M ${x-5} ${safeY} L ${x} ${safeY}`;
        } else {
            history.forEach((hItem, i) => {
                const x = (i + offset) * stepX;
                const y = h - ((hItem.p - minP) / rangeP * (h - 2)) - 1; 
                pathD += `${i===0?'M':'L'} ${x} ${y}`;
            });
        }
    }

    // Starting Price Baseline (Dynamic Color, Stronger Opacity 0.6)
    const startY = h - ((history[0].p - minP) / rangeP * (h - 2)) - 1;
    grid += `<line x1="0" y1="${startY}" x2="${w}" y2="${startY}" stroke="${color}" stroke-opacity="0.6" stroke-width="1.5" />`;

    graphEl.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" fill="none" style="overflow:visible;">
            ${grid}
            <path d="${pathD}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    `;
}


// --- Search Table (Replaces Google Search Area) ---
// --- Search Table (Replaces Google Search Area) ---
export function injectSearchTable() {
    if (!window.location.href.includes('action=search')) return;
    
    // Check if already injected
    if (document.getElementById('sp-search-table')) return;

    // Use a specific strategy for SMF Default Theme
    // Header is usually: <td class="catbg" ...>Set Search Parameters</td>
    const headers = Array.from(document.querySelectorAll('.catbg, .titlebg'));
    const paramHeader = headers.find(el => el.textContent.includes('Set Search Parameters'));
    
    let targetContainer = null;

    if (paramHeader) {
        // SMF Structure:
        // <tr><td class="catbg">Header</td></tr>
        // <tr><td class="windowbg">CONTENT</td></tr>
        
        // 1. Get the TR of the Header
        const headerTr = paramHeader.closest('tr');
        if (headerTr) {
            // 2. Get the Next TR
            const contentTr = headerTr.nextElementSibling;
            if (contentTr) {
                // 3. Get the TD inside valid content TR (class 'windowbg' usually)
                const contentTd = contentTr.querySelector('td.windowbg, td.windowbg2');
                if (contentTd) {
                    targetContainer = contentTd;
                }
            }
        }
    }
    
    // Fallback: Look for the Google Search form directly if header logic fails
    if (!targetContainer) {
        const googleForm = document.querySelector('form[action*="google"]');
        if (googleForm) {
            targetContainer = googleForm.parentElement; // The TD holding the form
        }
    }

    if (targetContainer) {
        // We want to Replace "Google Search" but KEEP "Forum Search".
        // Strategy: Find the Forum Search Form (action=search2)
        const forumForm = targetContainer.querySelector('form[action*="action=search2"]');
        
        const table = createEl('table', ['sp-search-table']);
        table.id = 'sp-search-table';
        table.innerHTML = `
            <tr>
                <td class="sp-search-col">
                    <div class="sp-search-header">ShadowPulse</div>
                    <input type="text" id="sp-s-input" placeholder="Search Forum..." />
                    <button id="sp-s-btn">Go</button>
                </td>
                <td class="sp-search-col">
                    <div class="sp-search-header">Google</div>
                    <input type="text" id="sp-g-input" placeholder="Site Search..." />
                    <button id="sp-g-btn">Go</button>
                </td>
                <td class="sp-search-col">
                    <div class="sp-search-header">Ninjastic</div>
                    <input type="text" id="sp-n-input" placeholder="Advanced..." />
                    <button id="sp-n-btn">Go</button>
                </td>
            </tr>
        `;

        if (forumForm) {
            // If we found the Forum Form, we want to remove everything BEFORE it (Legacy Google stuff)
            // And insert our table at the top.
            
            // 1. Move Forum Form (and its previous sibling if it's the header) to a safe fragment? 
            // Or just iterate backwards from forumForm and delete?
            
            // Use a range to delete previous siblings?
            // Safer: Just Loop.
            while (targetContainer.firstChild && targetContainer.firstChild !== forumForm) {
                // Keep the "Forum Search" header if it exists immediately before?
                // Visual check: "Forum Search" is usually a <b> or <strong> tag just before.
                // But simplified: Let's clean top, Insert Table, Insert spacer.
                // The User wants "Starting at Forum Search".
                
                // Let's check if the node is the "Forum Search" label
                const node = targetContainer.firstChild;
                if (node.textContent && node.textContent.includes('Forum Search') && node.nodeName !== 'A') {
                     // We reached the Forum Search Header. Stop deleting.
                     break; 
                }
                targetContainer.removeChild(node);
            }
            
            // Insert Table at the top
            targetContainer.insertBefore(table, targetContainer.firstChild);

        } else {
            // Fallback: Clear all if we can't find the specific form (Safety)
            targetContainer.innerHTML = '';
            targetContainer.appendChild(table);
        }

        targetContainer.style.padding = '10px';
        
        const bind = (id, urlFn) => {
            const btn = document.getElementById(id + '-btn');
            const inp = document.getElementById(id + '-input');
            if(btn && inp) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    if(inp.value.trim()) window.open(urlFn(inp.value.trim()), '_blank');
                };
                inp.onkeydown = (e) => {
                    if(e.key === 'Enter') {
                        e.preventDefault();
                        btn.click();
                    }
                };
            }
        };
        
        // Auto-Focus ShadowPulse Input
        setTimeout(() => document.getElementById('sp-s-input')?.focus(), 100);
        
        bind('sp-s', q => `https://shadowpulse.live/reports/index.php?q=${encodeURIComponent(q)}`);
        bind('sp-g', q => `https://www.google.com/search?q=site:bitcointalk.org ${encodeURIComponent(q)}`);
        bind('sp-n', q => `https://ninjastic.space/search?q=${encodeURIComponent(q)}`);
    }
}
