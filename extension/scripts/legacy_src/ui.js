import { createEl, spLog } from "./utils.js";
import { CONFIG } from "./config.js";

// --- Logo States (Pixel Perfect Strings) ---
const SP_LOGO_SVG = `
<svg viewBox="0 0 100 100" class="sp-std-logo">
    <defs>
        <linearGradient id="sp_logo_grad_float" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
        </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#sp_logo_grad_float)" />
    <text x="50" y="66" font-family="Arial, sans-serif" font-weight="800" font-size="42" text-anchor="middle" fill="white" style="pointer-events:none;">SP</text>
</svg>`;

const BTC_LOGO_SVG = `
<svg viewBox="0 0 100 100" class="sp-std-logo">
    <defs>
        <linearGradient id="sp_logo_grad_btc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
        </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#sp_logo_grad_btc)" />
    <text x="50" y="70" font-family="sans-serif" font-weight="bold" font-size="56" text-anchor="middle" fill="#f7931a" style="pointer-events:none;">₿</text>
</svg>`;

let currentLogoState = 'SP';

export function setLogoState(isBtc) {
    const container = document.getElementById('sp-logo-container');
    const newState = isBtc ? 'BTC' : 'SP';
    
    if (container && currentLogoState !== newState) {
        currentLogoState = newState;
        container.innerHTML = isBtc ? BTC_LOGO_SVG : SP_LOGO_SVG;
        
        // Update Title/Cursor behavior
        const zone = document.getElementById('sp-logo-zone');
        if (zone) {
            zone.title = isBtc ? "Click to CLAIM BTC!" : "Open Settings";
            zone.style.cursor = "pointer";
            if (isBtc) {
                zone.classList.add('sp-flash');
            } else {
                zone.classList.remove('sp-flash');
                container.innerHTML = SP_LOGO_SVG; // Ensure reset
            }
        }
    } else if (container && !isBtc && currentLogoState === 'BTC') {
        // Fallback: If logic says NOT BTC but state thinks it is, force reset
        currentLogoState = 'SP';
        container.innerHTML = SP_LOGO_SVG;
    }
}

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
                    <svg width="48" height="48" viewBox="0 0 100 100" class="sp-logo-pulse">
                        <defs>
                            <linearGradient id="sp_logo_grad_set" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="48" fill="url(#sp_logo_grad_set)" />
                        <text x="50" y="66" font-family="Arial, sans-serif" font-weight="800" font-size="42" text-anchor="middle" fill="white" style="pointer-events:none;">SP</text>
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
                    <div style="display:flex; align-items:center; gap:6px;">
                        <a href="#" id="sp-theme-customize-link" class="sp-link" style="font-size:11px; color:var(--sp-accent);">Customize</a>
                        <select id="sp-theme-select" style="width:80px;">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </div>

                <!-- Show Graph -->
                <div class="sp-settings-row">
                    <label>Show Graph</label>
                    <select id="sp-show-graph-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Bitcoin Source -->
                <div class="sp-settings-row" id="sp-btc-row">
                    <label>Bitcoin Source</label>
                    <select id="sp-btc-select">
                        <option value="binance">Binance</option>
                    </select>
                </div>

                <!-- Show +Pulse -->
                <div class="sp-settings-row">
                    <label>Show +Pulse</label>
                    <select id="sp-show-pulse-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Flash Logo -->
                <div class="sp-settings-row">
                    <label>Flash Logo</label>
                    <select id="sp-flash-logo-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Display Name -->
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
                     <span>Pulse Power:</span>
                     <div style="display:flex; align-items:center; gap:8px;">
                        <a href="#" id="sp-upgrade-link" class="sp-link" target="_blank" style="font-size:11px; color:#22c55e; font-weight:bold; display:none; animation: sp-pulse 2s infinite;">UPGRADE</a>
                        <span class="sp-stat-value" id="sp-stat-power">—</span>
                     </div>
                </div>
                <div class="sp-settings-row">
                     <span>Topic Views:</span>
                     <span class="sp-stat-value" id="sp-stat-views">—</span>
                </div>
                <div class="sp-settings-row">
                     <span>Vote Pulses:</span>
                     <span class="sp-stat-value" id="sp-stat-votes">—</span>
                </div>

                <div class="sp-settings-row" style="justify-content:center; margin-top:8px;">
                     <a href="https://shadowpulse.live/reports/" target="_blank" class="sp-link">Report Center</a>
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
                            <input type="text" id="sp-restore-input" placeholder="Paste code" style="flex:1; width:0;" /> 
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

    const getClientCoords = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const onDragStart = (e) => {
        if(e.target.closest('.sp-settings-close')) return;
        isDragging = true;
        const coords = getClientCoords(e);
        startX = coords.x;
        startY = coords.y;
        if(e.type === 'touchstart') e.preventDefault();

        const rect = modal.getBoundingClientRect();
        modal.style.position = 'absolute';
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
        modal.style.transform = 'none'; 
        
        initialLeft = rect.left;
        initialTop = rect.top;
        handle.style.cursor = 'grabbing';
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        e.preventDefault(); 
        const coords = getClientCoords(e);
        const dx = coords.x - startX;
        const dy = coords.y - startY;
        modal.style.left = (initialLeft + dx) + 'px';
        modal.style.top = (initialTop + dy) + 'px';
    };

    const onDragEnd = () => {
        isDragging = false;
        handle.style.cursor = 'move';
    };

    handle.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    handle.addEventListener('touchstart', onDragStart, {passive: false});
    window.addEventListener('touchmove', onDragMove, {passive: false});
    window.addEventListener('touchend', onDragEnd);

    implementSettingsLogic(backdrop);
    
    // --- Stats Refresh Logic ---
    const refreshStats = () => {
        chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
            const pid = res.sp_public_id;
            const uuid = res.sp_uuid;
            
            if(!pid) return;

            chrome.runtime.sendMessage({ 
                type: "GET_USER_STATS", 
                payload: { voter_id: pid } 
            }, response => {
                if (response && response.success && response.data && response.data.data) {
                    const d = response.data.data;
                    
                    // Update Views & Votes (Existing)
                    const viewEl = backdrop.querySelector('#sp-stat-views');
                    const voteEl = backdrop.querySelector('#sp-stat-votes');
                    if(viewEl) viewEl.textContent = d.view_rank !== '—' ? `${d.topic_views} (#${d.view_rank})` : d.topic_views;
                    if(voteEl) voteEl.textContent = d.rank !== '—' ? `${d.vote_pulses} (#${d.rank})` : d.vote_pulses;

                    // Update Pulse Power (New)
                    const powEl = backdrop.querySelector('#sp-stat-power');
                    const upLink = backdrop.querySelector('#sp-upgrade-link');
                    
                    if(powEl && d.pulse_power) {
                        powEl.textContent = parseFloat(d.pulse_power).toFixed(2);
                    }
                    
                    if(upLink && d.available_upgrades > 0 && uuid) {
                        upLink.style.display = 'flex';
                        upLink.href = `https://shadowpulse.live/reports/upgrade.php?id=${uuid}`;
                    } else if (upLink) {
                        upLink.style.display = 'none';
                    }
                }
            });
        });
    };

    refreshStats();
}

function applyThemeLogic(themeMode) {
    document.body.removeAttribute('style'); 
    document.documentElement.setAttribute('data-sp-theme', themeMode);
    localStorage.setItem('sp_theme_sync', themeMode);

    const storageKey = `sp_custom_${themeMode}`;
    
    chrome.storage.local.get([storageKey], (res) => {
        const customObj = res[storageKey];
        if (customObj) {
            Object.keys(customObj).forEach(key => {
                 const varName = key.startsWith('--') ? key : `--sp-forum-${key.replace('_','-')}`;
                 document.body.style.setProperty(varName, customObj[key]);
            });
            document.documentElement.setAttribute('data-sp-theme', 'custom');
        }
    });
}

function implementSettingsLogic(backdrop) {
    const closeBtn = backdrop.querySelector('.sp-settings-close');
    const close = () => backdrop.classList.remove('sp-settings-open');
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
    
    closeBtn.style.fontSize = "20px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.lineHeight = "1";
    closeBtn.style.cursor = "pointer";
    closeBtn.title = "Close";

    const themeSel = backdrop.querySelector('#sp-theme-select');
    const custLink = backdrop.querySelector('#sp-theme-customize-link');
    
    if (custLink) {
        custLink.addEventListener('click', (e) => {
             e.preventDefault();
             e.stopPropagation();
             openThemeEditor();
        });
    }

    const graphSel = backdrop.querySelector('#sp-show-graph-select');
    const btcRow = backdrop.querySelector('#sp-btc-row');
    const btcSel = backdrop.querySelector('#sp-btc-select');
    const pulseSel = backdrop.querySelector('#sp-show-pulse-select');
    const flashSel = backdrop.querySelector('#sp-flash-logo-select');

    chrome.storage.local.get(['sp_theme', 'sp_btc_source', 'sp_show_graph', 'sp_show_pulse', 'sp_flash_logo'], res => {
        let theme = res.sp_theme || 'light';
        if (theme === 'custom') theme = 'dark'; 
        themeSel.value = theme;
        
        const showGraph = res.sp_show_graph !== false; 
        graphSel.value = showGraph ? "true" : "false";
        btcRow.style.display = showGraph ? 'flex' : 'none';

        btcSel.value = res.sp_btc_source || 'binance';
        pulseSel.value = (res.sp_show_pulse !== false) ? "true" : "false";
        flashSel.value = (res.sp_flash_logo !== false) ? "true" : "false";
    });

    themeSel.addEventListener('change', (e) => {
        const val = e.target.value;
        chrome.storage.local.set({ sp_theme: val });
        applyThemeLogic(val);
    });
    
    graphSel.addEventListener('change', (e) => {
        const isShow = e.target.value === 'true';
        chrome.storage.local.set({ sp_show_graph: isShow });
        btcRow.style.display = isShow ? 'flex' : 'none';
        const graphZone = document.getElementById('sp-stats-zone');
        if (graphZone) graphZone.style.display = isShow ? 'flex' : 'none';
    });

    btcSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_btc_source: e.target.value });
    });

    pulseSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_show_pulse: e.target.value === 'true' });
    });

    flashSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_flash_logo: e.target.value === 'true' });
    });

    const nameInp = backdrop.querySelector('#sp-name-input');
    const nameBtn = backdrop.querySelector('#sp-name-submit');
    
    chrome.storage.local.get(['custom_name', 'sp_public_id'], res => {
        nameInp.value = res.custom_name || res.sp_public_id || "";
    });

    const codeDisp = backdrop.querySelector('#sp-code-display');
    chrome.storage.local.get(['sp_uuid'], res => {
        if (res.sp_uuid) {
            codeDisp.textContent = res.sp_uuid;
        } else {
            codeDisp.textContent = "N/A - Restart Extension";
        }
    });

    const copyBtn = backdrop.querySelector('#sp-copy-btn');
    copyBtn.addEventListener('click', () => {
        const txt = codeDisp.textContent;
        if(txt && txt !== '...') {
            navigator.clipboard.writeText(txt).then(() => {
                const svg = copyBtn.innerHTML;
                copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => copyBtn.innerHTML = svg, 1500);
            });
        }
    });
    
    const resInp = backdrop.querySelector('#sp-restore-input');
    const resWarn = backdrop.querySelector('#sp-restore-warning');
    resInp.addEventListener('input', () => {
        resWarn.style.display = resInp.value.trim().length > 0 ? 'block' : 'none';
    });
    
    const restoreBtn = backdrop.querySelector('#sp-restore-btn');
    restoreBtn.addEventListener('click', async () => {
        const code = resInp.value.trim();
        if(code) {
            restoreBtn.textContent = 'Syncing...';
            restoreBtn.disabled = true;
            
            chrome.runtime.sendMessage({ 
                type: "RECOVER_IDENTITY", 
                uuid: code 
            }, response => {
                if (response && response.success && response.data.status === 'success') {
                    chrome.storage.local.set({ 
                        sp_uuid: code,
                        sp_public_id: response.data.data.public_id 
                    }, () => {
                        restoreBtn.textContent = 'Success!';
                        setTimeout(() => window.location.reload(), 500);
                    });
                } else {
                    const errMsg = (response && response.data && response.data.message) 
                        ? response.data.message 
                        : (response && response.error) ? response.error : "Unknown Error";
                    alert("Sync Failed: " + errMsg);
                    restoreBtn.textContent = 'GO';
                    restoreBtn.disabled = false;
                }
            });
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
        const val = nameInp.value.trim();
        if (!val) return;
        
        const originalText = nameBtn.textContent;
        nameBtn.textContent = "...";
        nameBtn.disabled = true;

        chrome.storage.local.get(['sp_uuid'], res => {
            const uuid = res.sp_uuid;
            
            // Call API
            const params = new URLSearchParams();
            params.append('public_id', val);
            params.append('uuid', uuid);

            fetch(`${CONFIG.API_BASE_URL}/register_identity.php`, {
                method: 'POST',
                body: params
            })
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    // Success!
                    chrome.storage.local.set({ custom_name: val, sp_public_id: val });
                    nameInp.style.borderColor = '#28a745';
                    nameBtn.textContent = "OK";
                    setTimeout(() => {
                        nameBtn.textContent = originalText;
                        nameInp.style.borderColor = '';
                        nameBtn.disabled = false;
                    }, 2000);
                } else {
                    // Fail - Shake Effect
                    nameInp.classList.add('sp-flash-error');
                    nameInp.style.borderColor = 'red';
                    // User Request: No "TAKEN", just Red X.
                    nameBtn.innerHTML = '<span style="color:#ef4444; font-weight:bold; font-size:16px;">✕</span>';
                    
                    // Remove shake class after animation
                    setTimeout(() => {
                        nameInp.classList.remove('sp-flash-error');
                        nameBtn.textContent = originalText;
                        nameBtn.disabled = false;
                    }, 1500);
                }
            })
            .catch(err => {
                nameInp.classList.add('sp-flash-error');
                nameBtn.innerHTML = '<span style="color:#ef4444; font-weight:bold; font-size:16px;">✕</span>';
                 setTimeout(() => {
                    nameInp.classList.remove('sp-flash-error');
                    nameBtn.textContent = originalText;
                    nameBtn.disabled = false;
                }, 1500);
            });
        });
    });

    const secBlock = backdrop.querySelector('#sp-security-block');
    const secToggle = backdrop.querySelector('#sp-security-toggle');
    const ackSel = backdrop.querySelector('#sp-ack-select');
    
    chrome.storage.local.get(['memberRestoreAck'], res => {
        const isAck = !!res.memberRestoreAck;
        if(!isAck) {
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
            secToggle.classList.remove('sp-flash-10s');
        } else {
            secToggle.classList.add('sp-flash-10s');
        }
    });

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

    window.spUpdateStats();
}

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
    chrome.storage.local.get(['sp_theme'], res => {
        document.body.setAttribute('data-sp-theme', res.sp_theme || 'light');
    });

    if (document.getElementById('sp-floating-bar-root')) return;

    const bar = createEl('div', ['sp-floating-bar']);
    bar.id = 'sp-floating-bar-root';
    
    bar.innerHTML = `
        <div class="sp-bar-content">
            <div class="sp-zone-logo" id="sp-logo-zone" title="Open Settings">
                <div class="sp-logo-circle" id="sp-logo-container">
                    ${SP_LOGO_SVG}
                </div>
            </div>
            
            <div class="sp-zone-stats" id="sp-stats-zone">
                 <div class="sp-stats-price">&nbsp;</div>
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

    chrome.storage.local.get(['sp_bar_pos'], res => {
        if (res.sp_bar_pos) {
            bar.style.left = res.sp_bar_pos.left;
            bar.style.top = res.sp_bar_pos.top;
            bar.style.bottom = 'auto'; 
            bar.style.right = 'auto'; 
            
            const rect = bar.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            
            if (rect.right > winW) bar.style.left = (winW - rect.width - 20) + 'px';
            if (rect.bottom > winH) bar.style.top = (winH - rect.height - 20) + 'px';
            if (parseFloat(bar.style.left) < 0) bar.style.left = '20px';
            if (parseFloat(bar.style.top) < 0) bar.style.top = '20px';
            
        } else {
             const initRect = bar.getBoundingClientRect();
             bar.style.bottom = 'auto'; 
             bar.style.right = 'auto'; 
             bar.style.left = initRect.left + 'px';
             bar.style.top = initRect.top + 'px';
        }
    });

    const getClientCoords = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const onDragStart = (e) => {
        if(e.target.closest('.sp-settings-close')) return;
        isDragging = true;
        hasMoved = false;
        
        const coords = getClientCoords(e);
        startX = coords.x;
        startY = coords.y;
        
        if(e.type === 'mousedown') e.preventDefault(); 
        
        const rect = bar.getBoundingClientRect();
        dragOffsetX = coords.x - rect.left;
        dragOffsetY = coords.y - rect.top;
        
        bar.classList.add('dragging');
        document.body.classList.add('sp-dragging');
        
        // Dynamically add listeners ONLY during drag
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchmove', onDragMove, {passive: false});
        window.addEventListener('touchend', onDragEnd);
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        
        if(e.type === 'touchmove') e.preventDefault(); 
        if(e.type === 'mousemove') e.preventDefault();

        const coords = getClientCoords(e);
        const dx = Math.abs(coords.x - startX);
        const dy = Math.abs(coords.y - startY);
        if (dx > 3 || dy > 3) {
            hasMoved = true;
        }

        let newX = coords.x - dragOffsetX;
        let newY = coords.y - dragOffsetY;

        const maxW = window.innerWidth - bar.offsetWidth;
        const maxH = window.innerHeight - bar.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxW));
        newY = Math.max(0, Math.min(newY, maxH));

        bar.style.left = newX + 'px';
        bar.style.top = newY + 'px';
    };

    const onDragEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        bar.classList.remove('dragging');
        document.body.classList.remove('sp-dragging');
        
        // Cleanup listeners
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('touchmove', onDragMove);
        window.removeEventListener('touchend', onDragEnd);
        
        if (hasMoved) {
            chrome.storage.local.set({ 
                sp_bar_pos: { left: bar.style.left, top: bar.style.top } 
            });
        }
        
        // Handle "Click" on Logo here (Ghost Click Prevention)
        if (!hasMoved && e.target.closest('#sp-logo-zone')) {
             if (e.type === 'touchend') e.preventDefault();
             
             // LOGO HANDLER: Check if BTC or Settings
             const logoZone = document.getElementById('sp-logo-zone');
             // We can check title, or currentLogoState if we import it, 
             // but title is set by setLogoState effectively.
             if (logoZone && logoZone.title && logoZone.title.includes("CLAIM")) {
                 chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
                     const claimUrl = `https://shadowpulse.live/claim.php?voter_id=${res.sp_public_id}&uuid=${res.sp_uuid}`;
                     window.open(claimUrl, '_blank');
                     setLogoState(false);
                 });
             } else {
                 openSettingsModal();
             }
        }
    };

    const onResize = () => {
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

    bar.addEventListener('mousedown', onDragStart);
    // Removed global mousemove/up listeners here (now in onDragStart)
    bar.addEventListener('touchstart', onDragStart, {passive: false});
    // Removed global touchmove/end listeners here
    window.addEventListener('resize', onResize);

    // Initial Visibility check
    chrome.storage.local.get(['sp_show_graph'], res => {
         const showGraph = res.sp_show_graph !== false;
         if(!showGraph) {
             const stats = bar.querySelector('#sp-stats-zone');
             if(stats) stats.style.display = 'none';
         }
    });

    startStatsLoop(bar);
}

// --- Heartbeat Listener (No separate polling) ---
function startStatsLoop(bar) {
    const priceEl = bar.querySelector('.sp-stats-price');
    const graphEl = bar.querySelector('.sp-stats-graph');
    const statsZone = bar.querySelector('#sp-stats-zone');

    // Init listener for Main.js heartbeat
    document.addEventListener('sp-heartbeat', (e) => {
        if (e.detail) {
             renderStats(priceEl, graphEl, e.detail);
        }
    });

    // Initial check (optional, or just wait for first beat)
    // If we want immediate data, main.js should fire it on load.
}

export function renderStats(priceEl, graphEl, data) {
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
        const theme = document.body.getAttribute('data-sp-theme') || 'light';
        const isDark = theme === 'dark';
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
            }

            if (t >= startWindowT) {
                 const timeOffset = t - startWindowT;
                 const x = (timeOffset / windowSeconds) * w;
                 grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-opacity="0.2" stroke-width="0.5" stroke-dasharray="2,2" />`;
            }
        }

        history.forEach((hItem, i) => {
            if (hItem.t < startWindowT) return; 
            const timeOffset = hItem.t - startWindowT;
            const x = (timeOffset / windowSeconds) * w;
            const y = h - ((hItem.p - minP) / rangeP * (h - 2)) - 1;
            pathD += `${pathD===''?'M':'L'} ${x} ${y}`;
        });

    } else {
        const maxPoints = 60;
        const stepX = w / (maxPoints - 1);
        const offset = maxPoints - history.length;

        for(let i=15; i<60; i+=15) {
            const x = i * stepX;
            grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2,2" />`;
        }
        
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

    const startY = h - ((history[0].p - minP) / rangeP * (h - 2)) - 1;
    grid += `<line x1="0" y1="${startY}" x2="${w}" y2="${startY}" stroke="${color}" stroke-opacity="0.6" stroke-width="1.5" />`;

    graphEl.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" fill="none" style="overflow:visible;">
            ${grid}
            <path d="${pathD}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    `;
}

export function injectSearchTable() {
    if (!window.location.href.includes('action=search')) return;
    if (document.getElementById('sp-search-table')) return;

    const headers = Array.from(document.querySelectorAll('.catbg, .titlebg'));
    const paramHeader = headers.find(el => el.textContent.includes('Set Search Parameters'));
    let targetContainer = null;

    if (paramHeader) {
        const headerTr = paramHeader.closest('tr');
        if (headerTr) {
            const contentTr = headerTr.nextElementSibling;
            if (contentTr) {
                const contentTd = contentTr.querySelector('td.windowbg, td.windowbg2');
                if (contentTd) targetContainer = contentTd;
            }
        }
    }
    
    if (!targetContainer) {
        const googleForm = document.querySelector('form[action*="google"]');
        if (googleForm) targetContainer = googleForm.parentElement; 
    }

    if (targetContainer) {
        const forumForm = targetContainer.querySelector('form[action*="action=search2"]');
        const table = createEl('table', ['sp-search-table']);
        table.id = 'sp-search-table';
        table.innerHTML = `
            <tr>
                <td class="sp-search-col">
                    <div class="sp-search-header">ShadowPulse</div>
                    <input type="text" id="sp-s-input" placeholder="Search Forum..." disabled style="opacity:0.5; cursor:not-allowed;" autocomplete="off" />
                    <button id="sp-s-btn" disabled style="opacity:0.5; cursor:not-allowed;">Go</button>
                </td>
                <td class="sp-search-col">
                    <div class="sp-search-header">Google</div>
                    <input type="text" id="sp-g-input" placeholder="Site Search..." autocomplete="off" />
                    <button id="sp-g-btn">Go</button>
                </td>
                <td class="sp-search-col">
                    <div class="sp-search-header">BitList</div>
                    <input type="text" id="sp-n-input" placeholder="Advanced..." disabled style="opacity:0.5; cursor:not-allowed;" autocomplete="off" />
                    <button id="sp-n-btn" disabled style="opacity:0.5; cursor:not-allowed;">Go</button>
                </td>
            </tr>
        `;

        if (forumForm) {
            while (targetContainer.firstChild && targetContainer.firstChild !== forumForm) {
                const node = targetContainer.firstChild;
                if (node.textContent && node.textContent.includes('Forum Search') && node.nodeName !== 'A') break; 
                targetContainer.removeChild(node);
            }
            targetContainer.insertBefore(table, targetContainer.firstChild);

        } else {
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
        
        // setTimeout(() => document.getElementById('sp-g-input')?.focus(), 100);
        
        bind('sp-s', q => `https://shadowpulse.live/reports/index.php?q=${encodeURIComponent(q)}`);
        bind('sp-g', q => `https://www.google.com/search?q=site:bitcointalk.org ${encodeURIComponent(q)}`);
        bind('sp-n', q => `https://ninjastic.space/search?q=${encodeURIComponent(q)}`);
    }
}

export async function openThemeEditor() {
    let editorRoot = document.getElementById('sp-theme-editor-root');
    if (editorRoot) {
        editorRoot.style.display = 'flex';
        return;
    }

    const themeSel = document.getElementById('sp-theme-select');
    const currentMode = (themeSel ? themeSel.value : 'light'); 
    const storageKey = `sp_custom_${currentMode}`;
    let startColors = {};
    const defaults = {
        light: {
            'bg': '#ffffff', 'text': '#000000', 'link': '#0000ff',
            'cat_bg': '#6699cc', 'cat_text': '#ffffff',
            'title_bg': '#dce4e9', 'window_bg': '#f0f0f0'
        },
        dark: {
            'bg': '#0f172a', 'text': '#cbd5e1', 'link': '#60a5fa',
            'cat_bg': '#1e293b', 'cat_text': '#f8fafc',
            'title_bg': '#334155', 'window_bg': '#1e293b'
        }
    };

    try {
        const stored = await chrome.storage.local.get(storageKey);
        startColors = stored[storageKey] || defaults[currentMode];
        if (currentMode === 'dark' && !stored[storageKey]) {
             const legacy = await chrome.storage.local.get('sp_custom_theme');
             if(legacy.sp_custom_theme) startColors = legacy.sp_custom_theme;
        }
    } catch (e) {
        startColors = defaults[currentMode];
    }
    if(!startColors.bg) startColors = defaults[currentMode];

    const backdropCtx = createEl('div', null, {
        id: 'sp-theme-editor-backdrop',
        style: 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 21000000; display: flex; align-items: flex-start; justify-content: flex-start;'
    });

    editorRoot = createEl('div', null, {
        id: 'sp-theme-editor-root',
        style: `
            position: absolute; top: 100px; left: 100px; width: 320px;
            background: rgba(15, 23, 42, 0.95); color: #fff;
            border: 1px solid #334155; border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            font-family: 'Segoe UI', sans-serif;
            backdrop-filter: blur(10px); display: flex; flex-direction: column;
            overflow: hidden; animation: sp-fade-in 0.2s ease-out;
        `
    });

    const closeEditor = () => backdropCtx.remove();

    const header = createEl('div', null, {
        id: 'sp-theme-drag-handle',
        style: 'padding: 15px; background: rgba(30, 41, 59, 0.8); border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; cursor: grab;'
    });
    header.innerHTML = `<span style="font-weight: 600; font-size: 14px;">Editor: ${currentMode.toUpperCase()}</span>`;
    const closeBtn = createEl('button', 'sp-settings-close', {
        style: 'background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;'
    });
    closeBtn.innerText = '✕';
    closeBtn.onclick = closeEditor;
    header.appendChild(closeBtn);
    editorRoot.appendChild(header);

    const body = createEl('div', null, { style: 'padding: 15px; display: flex; flex-direction: column; gap: 12px;' });
    
    const applyPreview = (key, hex) => {
        document.body.style.setProperty(`--sp-forum-${key.replace('_','-')}`, hex);
        document.documentElement.setAttribute('data-sp-theme', 'custom'); 
    };

    const mappings = [
        { label: "Background", key: "bg", val: startColors.bg },
        { label: "Text Color", key: "text", val: startColors.text },
        { label: "Link Color", key: "link", val: startColors.link },
        { label: "Category BG", key: "cat_bg", val: startColors.cat_bg },
        { label: "Category Text", key: "cat_text", val: startColors.cat_text },
        { label: "Title BG", key: "title_bg", val: startColors.title_bg },
        { label: "Window BG", key: "window_bg", val: startColors.window_bg }
    ];

    mappings.forEach(m => {
        const row = createEl('div', null, { style: 'display: flex; align-items: center; justify-content: space-between;' });
        const label = createEl('span', null, { style: 'font-size: 13px; color: #cbd5e1;' });
        label.innerText = m.label;
        const inputContainer = createEl('div', null, { style: 'display: flex; align-items: center; gap: 8px;' });
        const textDisplay = createEl('span', null, { 
            id: `txt_${m.key}`,
            style: 'font-family: monospace; font-size: 12px; color: #64748b;' 
        });
        textDisplay.innerText = m.val;

        const picker = createEl('input', null, { 
            id: `col_${m.key}`,
            type: 'color', 
            value: m.val,
            style: 'width: 32px; height: 32px; border: none; padding: 0; background: none; cursor: pointer;' 
        });

        picker.addEventListener('input', (e) => {
            const hex = e.target.value;
            textDisplay.innerText = hex;
            applyPreview(m.key, hex);
        });

        inputContainer.append(textDisplay, picker);
        row.append(label, inputContainer);
        body.appendChild(row);
    });
    editorRoot.appendChild(body);

    const footer = createEl('div', null, { style: 'padding: 15px; border-top: 1px solid #334155; display: flex; gap: 10px; justify-content: flex-end;' });
    
    const saveBtn = createEl('button', null, {
        id: 'sp-theme-save',
        style: 'padding: 8px 12px; background: transparent; color: var(--sp-accent); border: 1px solid var(--sp-accent); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;'
    });
    saveBtn.innerText = 'SAVE';
    
    saveBtn.addEventListener('click', () => {
        const newTheme = {};
        mappings.forEach(m => {
            const picker = editorRoot.querySelector(`#col_${m.key}`);
            newTheme[m.key] = picker ? picker.value : m.val;
        });
        
        chrome.storage.local.set({ 
            [storageKey]: newTheme,
        }, () => {
             applyThemeLogic(currentMode);
             const oldText = saveBtn.innerText;
             saveBtn.innerText = "SAVED!";
             setTimeout(() => saveBtn.innerText = oldText, 800);
        });
    });

    const resetBtn = createEl('button', null, {
        id: 'sp-theme-reset',
        style: 'padding: 8px 12px; background: transparent; color: #94a3b8; border: 1px solid #475569; border-radius: 6px; cursor: pointer; font-size: 12px;'
    });
    resetBtn.innerText = 'RESET';
    
    resetBtn.onclick = () => {
        if(confirm(`Reset ${currentMode.toUpperCase()} theme to defaults?`)) {
            chrome.storage.local.remove([storageKey], () => {
                applyThemeLogic(currentMode);
                closeEditor();
            });
        }
    };
    
    footer.append(saveBtn, resetBtn);
    editorRoot.appendChild(footer);
    backdropCtx.appendChild(editorRoot);

    document.body.appendChild(backdropCtx);

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    const getClientCoords = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const onDragStart = (e) => {
        if(e.target.closest('.sp-settings-close')) return;
        isDragging = true;
        const coords = getClientCoords(e);
        startX = coords.x;
        startY = coords.y;
        if(e.type === 'touchstart') e.preventDefault();

        const rect = editorRoot.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        header.style.cursor = 'grabbing';
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const coords = getClientCoords(e);
        const dx = coords.x - startX;
        const dy = coords.y - startY;
        editorRoot.style.left = (initialLeft + dx) + 'px';
        editorRoot.style.top = (initialTop + dy) + 'px';
    };

    const onDragEnd = () => {
        if(isDragging) {
            isDragging = false;
            header.style.cursor = 'grab';
        }
    };

    header.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    header.addEventListener('touchstart', onDragStart, {passive: false});
    window.addEventListener('touchmove', onDragMove, {passive: false});
    window.addEventListener('touchend', onDragEnd);
}
