(function() {
    "use strict";

    window.SP = window.SP || {};

    // --- CONSTANTS ---
    const SP_LOGO_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="sp-std-logo">
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="sp-std-logo">
        <defs>
            <linearGradient id="sp_logo_grad_btc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#sp_logo_grad_btc)" />
        <text x="50" y="70" font-family="sans-serif" font-weight="bold" font-size="56" text-anchor="middle" fill="#78350f" style="pointer-events:none;">₿</text>
    </svg>`;

    // Helper: safely inject static SVG string without innerHTML
    // Uses importNode to preserve SVG namespace when moving between documents
    function injectSvg(element, svgString) {
        element.textContent = '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            window.SP.Logger.error('[UI] SVG parse error:', parserError.textContent);
            return;
        }
        const svg = doc.querySelector('svg');
        if (svg) {
            const imported = document.importNode(svg, true);
            element.appendChild(imported);
        }
    }

    let currentLogoState = window.SP.LogoState.NORMAL;
    let lastLogoState = window.SP.LogoState.NORMAL;
    let barHasMoved = false; // Track if bar was just dragged

    // Helper Functions within Module Scope
    
    // Invalid addresses are rejected and cleared.
    function validateBtcAddress(addr, btcInp, btcBtn) {
        if(!btcInp || !btcBtn) return false;
        
        addr = addr.trim();
        
        // Empty = not set (valid state, but button disabled)
        if (addr === "") {
            btcInp.style.borderColor = '';
            btcBtn.disabled = true;
            return false;
        }
        
        // Minimal validation: starts with 1, 3, or bc1 and reasonable length
        const isValid = /^(1|3|bc1[qp])/.test(addr) && addr.length >= 26 && addr.length <= 90;
        
        if (isValid) {
            btcInp.style.borderColor = '';
            btcBtn.disabled = false;
            return true;
        } else {
            // Invalid address - show error and clear
            btcInp.style.borderColor = '#ef4444';
            btcBtn.disabled = true;
            return false;
        }
    }

    
    function toggleBtcAddressRow(show, backdrop) {
        const btcAddrRow = backdrop.querySelector('#sp-btc-addr-row');
        const btcInp = backdrop.querySelector('#sp-btc-input');
        const btcBtn = backdrop.querySelector('#sp-btc-submit');
        
        if(!btcAddrRow) return;

        btcAddrRow.style.display = show ? 'flex' : 'none';
        if(show) {
             chrome.storage.local.get(['sp_btc_address'], res => {
                 btcInp.value = res.sp_btc_address || "";
                 validateBtcAddress(btcInp.value, btcInp, btcBtn);
             });
        }
    }

    // Theme Editor Logic
    
    function openThemeEditor() {
        if(document.getElementById('sp-theme-editor-backdrop')) return;
        
        const Utils = window.SP.Utils;
        let editorRoot;
        let startColors = {};
        
        // Retrieve current mode vars from storage (not from data-sp-theme attribute,
        // which could be 'custom' when a custom theme is active)
        chrome.storage.local.get(['sp_theme'], (themeRes) => {
            const currentMode = themeRes.sp_theme === 'dark' ? 'dark' : 'light';
            const storageKey = `sp_custom_${currentMode}`;
            
            const defaults = {
                light: { bg: '#ffffff', text: '#000000', link: '#1e90ff', cat_bg: '#6699cc', cat_text: '#ffffff', title_bg: '#dce4e9', window_bg: '#f0f0f0', pulse_click: '#dc2626' },
                dark: { bg: '#0f172a', text: '#f1f5f9', link: '#38bdf8', cat_bg: '#1e293b', cat_text: '#f8fafc', title_bg: '#334155', window_bg: '#1e293b', pulse_click: '#f87171' }
            };

            chrome.storage.local.get([storageKey, 'sp_custom_theme'], async (res) => {
                 startColors = res[storageKey] || defaults[currentMode];
                 // Fallback for migration
                 if(currentMode === 'dark' && !res[storageKey] && res.sp_custom_theme) {
                     startColors = res.sp_custom_theme;
                 }
                 if(!startColors.bg) startColors = defaults[currentMode];

                 renderEditor(startColors, currentMode, storageKey);
            });
        });

        
        function renderEditor(startColors, currentMode, storageKey) {
            const backdropCtx = Utils.createEl('div', null, {
                id: 'sp-theme-editor-backdrop',
                style: 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 21000000; display: flex; align-items: flex-start; justify-content: flex-start;'
            });

            editorRoot = Utils.createEl('div', null, {
                id: 'sp-theme-editor-root',
                style: `
                    position: absolute; top: 100px; left: 100px; width: 320px;
                    background: var(--sp-bg-elevated, #ffffff); color: var(--sp-text, #000000);
                    border: 1px solid var(--sp-border, #cccccc); border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    font-family: 'Segoe UI', sans-serif;
                    backdrop-filter: blur(10px); display: flex; flex-direction: column;
                    overflow: hidden; animation: sp-fade-in 0.2s ease-out;
                `
            });

            let cleanupDrag = () => {};
            const closeEditor = () => {
                cleanupDrag();
                backdropCtx.remove();
                // Restore original theme (revert unsaved preview changes)
                window.SP.UI.applyThemeLogic(currentMode);
            };

            const header = Utils.createEl('div', null, {
                id: 'sp-theme-drag-handle',
                style: 'padding: 15px; background: var(--sp-bg, #f0f0f0); border-bottom: 1px solid var(--sp-border, #cccccc); display: flex; justify-content: space-between; align-items: center; cursor: grab;'
            });
            const headerTitle = document.createElement('span');
            headerTitle.style.fontWeight = '600';
            headerTitle.style.fontSize = '14px';
            headerTitle.textContent = `Editor: ${currentMode.toUpperCase()}`;
            header.appendChild(headerTitle);
            const closeBtn = Utils.createEl('button', 'sp-settings-close', {
                style: 'background: none; border: none; color: var(--sp-text-soft, #888); font-size: 16px; cursor: pointer;'
            });
            closeBtn.innerText = '\u2715';
            closeBtn.onclick = closeEditor;
            header.appendChild(closeBtn);
            editorRoot.appendChild(header);

            const body = Utils.createEl('div', null, { style: 'padding: 15px; display: flex; flex-direction: column; gap: 12px;' });
            
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
                { label: "Window BG", key: "window_bg", val: startColors.window_bg },
                { label: "+Pulse Color", key: "pulse_click", val: startColors.pulse_click }
            ];

            mappings.forEach(m => {
                const row = Utils.createEl('div', null, { style: 'display: flex; align-items: center; justify-content: space-between;' });
                const label = Utils.createEl('span', null, { style: 'font-size: 13px; color: var(--sp-text-soft, #888);' });
                label.innerText = m.label;
                const inputContainer = Utils.createEl('div', null, { style: 'display: flex; align-items: center; gap: 8px;' });
                const textDisplay = Utils.createEl('span', null, { 
                    id: `txt_${m.key}`,
                    style: 'font-family: monospace; font-size: 12px; color: var(--sp-text, #000);' 
                });
                textDisplay.innerText = m.val;

                const picker = Utils.createEl('input', null, { 
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

            // Footer / Save
            const footer = Utils.createEl('div', null, { style: 'padding: 15px; border-top: 1px solid var(--sp-border, #ccc); display: flex; gap: 10px; justify-content: flex-end;' });
            
            const saveBtn = Utils.createEl('button', null, {
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
                     window.SP.UI.applyThemeLogic(currentMode);
                     const oldText = saveBtn.innerText;
                     saveBtn.innerText = "SAVED!";
                     setTimeout(() => saveBtn.innerText = oldText, 800);
                });
            });

            const resetBtn = Utils.createEl('button', null, {
                id: 'sp-theme-reset',
                style: 'padding: 8px 12px; background: transparent; color: var(--sp-text-soft, #888); border: 1px solid var(--sp-border, #ccc); border-radius: 6px; cursor: pointer; font-size: 12px;'
            });
            resetBtn.innerText = 'RESET';
            
            let resetConfirm = false;
            resetBtn.onclick = () => {
                if(!resetConfirm) {
                    resetConfirm = true;
                    resetBtn.innerText = 'CLICK AGAIN';
                    resetBtn.style.color = '#ef4444';
                    setTimeout(() => {
                        resetConfirm = false;
                        resetBtn.innerText = 'RESET';
                        resetBtn.style.color = '';
                    }, 3000);
                    return;
                }
                resetConfirm = false;
                chrome.storage.local.remove([storageKey], () => {
                    window.SP.UI.applyThemeLogic(currentMode);
                    closeEditor();
                });
            };
            
            footer.append(saveBtn, resetBtn);
            editorRoot.appendChild(footer);
            backdropCtx.appendChild(editorRoot);

            document.body.appendChild(backdropCtx);

            // Drag Logic for Editor
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
                isDragging = false;
                header.style.cursor = 'grab';
            };

            cleanupDrag = () => {
                header.removeEventListener('mousedown', onDragStart);
                header.removeEventListener('touchstart', onDragStart);
                window.removeEventListener('mousemove', onDragMove);
                window.removeEventListener('mouseup', onDragEnd);
                window.removeEventListener('touchmove', onDragMove);
                window.removeEventListener('touchend', onDragEnd);
            };

            header.addEventListener('mousedown', onDragStart);
            window.addEventListener('mousemove', onDragMove);
            window.addEventListener('mouseup', onDragEnd);
            header.addEventListener('touchstart', onDragStart, {passive: false});
            window.addEventListener('touchmove', onDragMove, {passive: false});
            window.addEventListener('touchend', onDragEnd);
        }
    }


    window.SP.UI = {
        
        
        applyThemeLogic: function(themeMode) {
            // Clear emergency background set by theme_boot.js to prevent FOUC
            document.documentElement.style.backgroundColor = '';
            document.documentElement.style.color = '';
            
            // Only remove our specific custom properties, not all body styles
            const propertiesToClear = ['bg', 'text', 'link', 'cat_bg', 'cat_text', 'title_bg', 'window_bg', 'pulse_click'];
            propertiesToClear.forEach(key => {
                const varName = `--sp-forum-${key.replace('_','-')}`;
                document.body.style.removeProperty(varName);
            });
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
                    localStorage.setItem('sp_theme_sync', 'custom');
                } else {
                    // No custom theme in storage - ensure we clear any lingering custom properties
                    // that might have been set by the theme editor preview
                    const propertiesToClear = ['bg', 'text', 'link', 'cat_bg', 'cat_text', 'title_bg', 'window_bg', 'pulse_click'];
                    propertiesToClear.forEach(key => {
                        const varName = key.startsWith('--') ? key : `--sp-forum-${key.replace('_','-')}`;
                        document.body.style.removeProperty(varName);
                    });
                }
            });
        },

        // --- LOGO STATE MANAGEMENT ---
        
        updateLogo: function(targetState) {
            // State: NORMAL (SP), PULSE_BLUE (Blue Flash), FAUCET_GOLD (Gold/BTC)
            const container = document.getElementById('sp-logo-container');
            const zone = document.getElementById('sp-logo-zone');
            
            if (!container || !zone) return;

            // FAUCET_GOLD (Faucet Active) takes precedence in appearance (BTC Logo)
            const isGold = targetState === window.SP.LogoState.FAUCET_GOLD;
            
            // Check if we need to swap SVG
            const wasGold = currentLogoState === window.SP.LogoState.FAUCET_GOLD;
            
            if (isGold !== wasGold || container.children.length === 0) {
                injectSvg(container, isGold ? BTC_LOGO_SVG : SP_LOGO_SVG);
            }

            // Save non-pulse state so PULSE_BLUE can revert correctly
            if (targetState !== window.SP.LogoState.PULSE_BLUE) {
                lastLogoState = targetState;
            }

            // Update Logic
            currentLogoState = targetState;

            // Handle Interactions & Animations
            if (targetState === window.SP.LogoState.FAUCET_GOLD) {
                zone.title = "Click to CLAIM BTC!";
                zone.style.cursor = "pointer";
                zone.classList.remove('sp-flash-blue', 'sp-faucet-active');
                void zone.offsetWidth;
                zone.classList.add('sp-flash-gold');
                // After entry flash, switch to continuous pulse
                setTimeout(() => {
                    zone.classList.remove('sp-flash-gold');
                    if (currentLogoState === window.SP.LogoState.FAUCET_GOLD) {
                        zone.classList.add('sp-faucet-active');
                    }
                }, 600);
                // Shake the container for attention
                container.classList.remove('sp-shake');
                void container.offsetWidth;
                container.classList.add('sp-shake');
                setTimeout(() => container.classList.remove('sp-shake'), 500);
            } else if (targetState === window.SP.LogoState.PULSE_BLUE) {
                zone.title = "Open Settings";
                zone.style.cursor = "pointer";
                zone.classList.remove('sp-flash-gold', 'sp-faucet-active');
                void zone.offsetWidth;
                zone.classList.add('sp-flash-blue');
                
                // Auto-revert PULSE_BLUE to previous state after animation
                setTimeout(() => {
                    zone.classList.remove('sp-flash-blue');
                    if (currentLogoState === window.SP.LogoState.PULSE_BLUE) {
                        window.SP.UI.updateLogo(lastLogoState);
                    }
                }, 600);
            } else {
                // NORMAL
                zone.title = "Open Settings";
                zone.style.cursor = "pointer";
                zone.classList.remove('sp-flash-blue', 'sp-flash-gold', 'sp-faucet-active');
            }
        },

        
        injectFloatingBar: function() {
            const Utils = window.SP.Utils;
            
            chrome.storage.local.get(['sp_theme'], res => {
                const fallback = localStorage.getItem('sp_theme_sync') || 'light';
                this.applyThemeLogic(res.sp_theme || fallback);
            });

            if (document.getElementById('sp-floating-bar-root')) return;

            const bar = Utils.createEl('div', ['sp-floating-bar']);
            bar.id = 'sp-floating-bar-root';
            
            // Build bar content safely using DOM methods
            const barContent = Utils.createEl('div', ['sp-bar-content']);
            
            const logoZone = Utils.createEl('div', ['sp-zone-logo']);
            logoZone.id = 'sp-logo-zone';
            logoZone.title = 'Open Settings';
            
            const logoCircle = Utils.createEl('div', ['sp-logo-circle']);
            logoCircle.id = 'sp-logo-container';
            injectSvg(logoCircle, SP_LOGO_SVG);
            
            logoZone.appendChild(logoCircle);
            barContent.appendChild(logoZone);
            
            const statsZone = Utils.createEl('div', ['sp-zone-stats']);
            statsZone.id = 'sp-stats-zone';
            const statsPrice = Utils.createEl('div', ['sp-stats-price']);
            statsPrice.textContent = '\u00A0';
            const statsGraph = Utils.createEl('div', ['sp-stats-graph']);
            statsZone.appendChild(statsPrice);
            statsZone.appendChild(statsGraph);
            barContent.appendChild(statsZone);
            
            bar.appendChild(barContent);
            document.body.appendChild(bar);
            
            // Initialize Position
            // CRITICAL: We must explicitly set bottom/right to 'auto' to override CSS defaults
            chrome.storage.local.get(['sp_bar_pos'], res => {
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const rect = bar.getBoundingClientRect();
                const barWidth = rect.width || 64;
                const barHeight = rect.height || 50;
                
                if (res.sp_bar_pos) {
                    let left = parseInt(res.sp_bar_pos.left) || 0;
                    let top = parseInt(res.sp_bar_pos.top) || 0;
                    
                    // SAFETY: Check if position is within visible viewport
                    // At least minVisible pixels must be inside viewport on ALL edges
                    const minVisible = 20;
                    
                    if (left > vw - minVisible || left + barWidth < minVisible || 
                        top > vh - minVisible || top + barHeight < minVisible) {
                        // Reset to default position - button was lost off-screen
                        window.SP.Logger.warn('Button position was off-screen, resetting to default');
                        const initRect = bar.getBoundingClientRect();
                        bar.style.left = initRect.left + 'px';
                        bar.style.top = initRect.top + 'px';
                        // Clear the bad position
                        chrome.storage.local.remove('sp_bar_pos');
                    } else {
                        bar.style.left = res.sp_bar_pos.left;
                        bar.style.top = res.sp_bar_pos.top;
                    }
                    bar.style.bottom = 'auto'; 
                    bar.style.right = 'auto';
                } else {
                     const initRect = bar.getBoundingClientRect();
                     bar.style.left = initRect.left + 'px';
                     bar.style.top = initRect.top + 'px';
                     bar.style.bottom = 'auto';
                     bar.style.right = 'auto';
                }
            });

            // Drag Logic
            this.initDrag(bar);
            
            // Safety: Clear any stuck drag state from previous session
            document.body.classList.remove('sp-dragging');
            barHasMoved = false;
            
            // Click Logic
             const logoZoneEl = document.getElementById("sp-logo-zone");
             if(logoZoneEl) {
                 logoZoneEl.onclick = (e) =>{
                     // Check if we just finished dragging - if so, don't open settings
                     if (document.body.classList.contains("sp-dragging") || barHasMoved) {
                         barHasMoved = false; // Reset flag
                         document.body.classList.remove('sp-dragging'); // Clear stuck state
                         return;
                     }
                     e.preventDefault(); e.stopPropagation();
                     
                     if (currentLogoState === window.SP.LogoState.FAUCET_GOLD) {
                         // Claim BTC
                         window.SP.Faucet.claim();
                     } else {
                         this.openSettingsModal();
                     }
                 };
             }

            // Stats Visibility
            chrome.storage.local.get(['sp_show_graph'], res => {
                 if(res.sp_show_graph === false) {
                     const stats = bar.querySelector('#sp-stats-zone');
                     if(stats) stats.style.display = 'none';
                 }
            });

            // Hand off to Stats Module
            if (window.SP.Stats) {
                window.SP.Stats.init(bar);
            }
        },

        
        stripTrustScoreStyles: function() {
            const scores = document.querySelectorAll(".trustscore");
            scores.forEach((el) => el.removeAttribute("style"));
        },

        
        fixTrustPageColors: function() {
            if (!window.location.href.includes('action=trust')) return;
            
            const tds = document.querySelectorAll('td[style*="color:"]');
            tds.forEach(td => {
                const styleAttr = td.getAttribute('style');
                if (styleAttr) {
                    const colorMatch = styleAttr.match(/color:\s*([^;]+)/i);
                    if (colorMatch && !colorMatch[0].includes('!important')) {
                        td.style.setProperty('color', colorMatch[1].trim(), 'important');
                    }
                }
            });
        },

        
        injectSearchTable: function() {
            // STRICT CHECK: Only run on Search Form page, not search results
            const url = window.location.href;
            if (!url.includes('action=search')) return;
            if (url.includes('action=search2')) return;
            const Utils = window.SP.Utils;

            // 1. Find the Google Search form (primary anchor for top placement)
            let googleForm = document.querySelector('form[action*="google"]');
            if (!googleForm) {
                const btns = document.querySelectorAll('input[type="submit"], input[type="button"], button');
                for (let b of btns) {
                    if ((b.value && b.value.toLowerCase().includes('google')) ||
                        (b.textContent && b.textContent.toLowerCase().includes('google'))) {
                        googleForm = b.closest('form');
                        if (googleForm) break;
                    }
                }
            }

            // 2. Fallback: main forum search form
            let searchFormFallback = null;
            if (!googleForm) {
                let searchForm = document.getElementById('searchform');
                if (!searchForm) {
                    const forms = document.querySelectorAll('form[action*="action=search2"]');
                    for (let f of forms) {
                        if (f.id !== 'search_form' && !f.closest('#header')) {
                            searchForm = f; break;
                        }
                    }
                }
                if (searchForm) searchFormFallback = searchForm;
            }

            if (!googleForm && !searchFormFallback) return;

            // 3. Build table
            const table = Utils.createEl('table', ['sp-search-table']);
            table.id = 'sp-search-table';
            const tableHtml = `<tr>
                    <td class="sp-search-col">
                        <div class="sp-search-header">BPIP</div>
                        <div class="sp-search-row">
                            <input type="text" id="sp-s-input" placeholder="Search name or userID" autocomplete="off" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" />
                            <button id="sp-s-btn">Go</button>
                        </div>
                    </td>
                    <td class="sp-search-col">
                        <div class="sp-search-header">Google</div>
                        <div class="sp-search-row">
                            <input type="text" id="sp-g-input" placeholder="Site Search..." autocomplete="off" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" />
                            <button id="sp-g-btn">Go</button>
                        </div>
                    </td>
                    <td class="sp-search-col">
                        <div class="sp-search-header">BitList</div>
                        <div class="sp-search-row">
                            <input type="text" id="sp-n-input" placeholder="Advanced..." autocomplete="off" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" />
                            <button id="sp-n-btn">Go</button>
                        </div>
                    </td>
                </tr>`;
            const tblParser = new DOMParser();
            const tblDoc = tblParser.parseFromString(`<table>${tableHtml}</table>`, 'text/html');
            const parsedTbl = tblDoc.querySelector('table');
            while (parsedTbl.firstChild) {
                table.appendChild(parsedTbl.firstChild);
            }

            // 4. Insert where Google form was (top) or prepend to search form fallback
            if (googleForm) {
                let node = googleForm.previousSibling;
                while (node) {
                    let prevNode = node.previousSibling;
                    const nn = node.nodeName.toUpperCase();
                    if (node.nodeType === Node.TEXT_NODE || nn === 'BR') {
                        node.remove();
                    } else if (nn === 'B' || nn === 'STRONG') {
                        if (node.textContent.toLowerCase().includes('google')) {
                            node.remove();
                            break;
                        }
                        node.remove();
                    } else {
                        break;
                    }
                    node = prevNode;
                }
                googleForm.parentNode.insertBefore(table, googleForm);
                googleForm.remove();
            } else if (searchFormFallback) {
                searchFormFallback.parentElement.prepend(table);
            }

            // 6. Bind Logic
            const bind = (id, urlFn) => {
                const btn = table.querySelector('#' + id + '-btn');
                const inp = table.querySelector('#' + id + '-input');
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

            bind('sp-s', q => `https://bpip.org/search.aspx?q=${encodeURIComponent(q)}`);
            bind('sp-g', q => `https://www.google.com/search?q=site:bitcointalk.org ${encodeURIComponent(q)}`);
            bind('sp-n', q => `${window.SP.Config.BASE_URL}/search?e=BitList&q=${encodeURIComponent(q)}`);
        },

        
        initDrag: function(bar) {
            let isDragging = false;
            let hasMoved = false;
            let dragOffsetX = 0;
            let dragOffsetY = 0;
            let startX = 0;
            let startY = 0;
            const DRAG_THRESHOLD = 5; // pixels - must move more than this to count as drag
            
            const onMove = (e) => {
                if(!isDragging) return;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                
                // Calculate distance from start
                const dist = Math.sqrt(Math.pow(clientX - startX, 2) + Math.pow(clientY - startY, 2));
                
                // Only count as drag if moved more than threshold
                if (dist > DRAG_THRESHOLD) {
                    hasMoved = true;
                    e.preventDefault();
                    e.stopPropagation();
                    bar.style.left = (clientX - dragOffsetX) + 'px';
                    bar.style.top = (clientY - dragOffsetY) + 'px';
                }
            };
            
            const onEnd = () => {
                isDragging = false;
                bar.classList.remove('dragging');
                document.body.classList.remove('sp-dragging');
                window.removeEventListener('mousemove', onMove, true);
                window.removeEventListener('mouseup', onEnd, true);
                window.removeEventListener('touchmove', onMove, {passive: false});
                window.removeEventListener('touchend', onEnd);
                window.removeEventListener('mouseleave', onEnd);
                
                if(hasMoved) {
                    chrome.storage.local.set({ sp_bar_pos: { left: bar.style.left, top: bar.style.top } });
                    barHasMoved = true; // Set module flag
                    // Reset after a short delay to allow click handler to check it
                    setTimeout(() => { barHasMoved = false; }, 350);
                }
            };
            
            // Safety: clear drag state if mouse leaves window
            window.addEventListener('mouseleave', onEnd);
            
            // Remove any existing listeners first to prevent duplicates
            window.removeEventListener('mousemove', onMove, true);
            window.removeEventListener('mouseup', onEnd, true);
            window.removeEventListener('touchmove', onMove, {passive:false});
            window.removeEventListener('touchend', onEnd);
            
            const onStart = (e) => {
                // Only start drag if clicking on the bar itself (not buttons/inputs)
                if(e.target.closest('.sp-settings-close')) return;
                if(e.target.closest('button')) return;
                if(e.target.closest('input')) return;
                if(e.target.closest('a')) return;
                if(!e.target.closest('#sp-floating-bar-root')) return;
                
                isDragging = true; hasMoved = false;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                
                // Record start position for drag threshold calculation
                startX = clientX;
                startY = clientY;
                
                const rect = bar.getBoundingClientRect();
                dragOffsetX = clientX - rect.left;
                dragOffsetY = clientY - rect.top;
                
                bar.classList.add('dragging');
                document.body.classList.add('sp-dragging');
                
                // NOTE: e.preventDefault() removed here — CSS touch-action: none already
                // prevents browser scroll. Calling preventDefault() on touchstart blocks
                // the synthetic click event on mobile, breaking logo taps.
                
                // Use capture phase to ensure we get events first
                window.addEventListener('mousemove', onMove, true);
                window.addEventListener('mouseup', onEnd, true);
                window.addEventListener('touchmove', onMove, {passive:false});
                window.addEventListener('touchend', onEnd);
            };
            
            bar.addEventListener('mousedown', onStart);
            bar.addEventListener('touchstart', onStart, {passive:false});
        },

        
        openSettingsModal: function() {
             let backdrop = document.getElementById('sp-settings-root');
             if (backdrop) {
                backdrop.classList.toggle('sp-settings-open');
                return;
             }
             this.createSettingsModal();
        },

        
        createSettingsModal: function() {
              const Utils = window.SP.Utils;
              const backdrop = Utils.createEl('div', ['sp-settings-backdrop']);
              backdrop.id = 'sp-settings-root';
              
              // Full HTML Structure (no innerHTML)
              const modalHtml = `<div class="sp-settings-modal" id="sp-settings-window">
                    <div class="sp-settings-header" id="sp-settings-drag-handle" style="cursor: move;">
                        <div class="sp-settings-title">
                            ShadowPulse Settings
                            <div id="sp-version-display" style="font-size:10px; font-weight:normal; opacity:0.7;">v...</div>
                        </div>
                        <div class="sp-settings-close">×</div>
                    </div>
                    <div class="sp-settings-body">
                        
                        <!-- General Settings -->
                        <div class="sp-settings-row">
                            <label>Appearance</label>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <a href="#" id="sp-theme-customize-link" class="sp-link" style="margin-right:4px;">Customize</a>
                                <select id="sp-theme-select">
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </select>
                            </div>
                        </div>

                        <div class="sp-settings-row">
                            <label>Show Graph</label>
                            <select id="sp-show-graph-select">
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                        </div>

                        <div class="sp-settings-row" id="sp-btc-row">
                            <label>Price Source</label>
                            <select id="sp-btc-select">
                                <option value="binance">Binance</option>
                            </select>
                        </div>

                        <div class="sp-settings-row">
                            <label>Show Pulse Buttons</label>
                            <select id="sp-show-pulse-select">
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                        </div>
                        
                        <div class="sp-settings-row">
                            <label>Flash Faucet Logo</label>
                            <select id="sp-flash-logo-select">
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                        </div>
                        
                        <!-- Bitcoin Address (Conditional) -->
                        <div class="sp-settings-row" id="sp-btc-addr-row" style="display:none; align-items:center;">
                            <label>BTC Address</label>
                            <div style="display:flex; gap:4px; align-items:center;">
                                <input type="text" id="sp-btc-input" placeholder="Not set" style="width:180px; text-align:right; font-size:11px;" autocomplete="off" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" />
                                <button id="sp-btc-submit" style="width:24px; height:24px; padding:0; cursor:pointer;" disabled>✓</button>
                            </div>
                        </div>

                        <!-- Display Name -->
                        <div class="sp-settings-row">
                            <label>Display Name</label>
                            <div style="display:flex; gap:4px; align-items:center;">
                                <input type="text" id="sp-name-input" placeholder="User ID" style="width:180px; text-align:right;" autocomplete="off" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" />
                                <button id="sp-name-submit" style="width:24px; height:24px; padding:0; cursor:pointer;" disabled>✓</button>
                            </div>
                        </div>

                        <!-- Statistics Area -->
                        <div class="sp-section-title">Statistics</div>
                        <div class="sp-settings-row">
                             <span>Pulse Power:</span>
                             <div style="display:flex; align-items:center; gap:8px;">
                                <a href="#" id="sp-upgrade-link" class="sp-link" target="_blank" style="font-size:11px; color:#22c55e; font-weight:bold; display:none; animation: sp-pulse 2s infinite;">UPGRADE</a>
                                <span class="sp-stat-value" id="sp-stat-power">0</span>
                             </div>
                        </div>
                        <div class="sp-settings-row">
                             <span>Topic Views:</span>
                             <span class="sp-stat-value" id="sp-stat-views">0</span>
                        </div>
                        <div class="sp-settings-row">
                             <span>Vote Pulses:</span>
                             <span class="sp-stat-value" id="sp-stat-votes">0</span>
                        </div>

                        <div class="sp-settings-row" style="justify-content:center; gap:14px; margin-top:8px;">
                             <a href="${window.SP.Config.BASE_URL}/reports/" target="_blank" class="sp-link">Report Center</a>
                             <a href="#" id="sp-faucet-activity-link" class="sp-link">Faucet Activity</a>
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
                                \u26A0  This will overwrite all your Settings and Statistics!
                            </div>
                            
                            <!-- Inline Restore Area -->
                            <div class="sp-settings-row" style="margin-top:4px; display:flex;">
                                <span style="margin-right:4px;">Restore:</span>
                                <div class="sp-settings-input-group" style="margin:0; flex:1; display:flex;">
                                    <input type="text" id="sp-restore-input" placeholder="Paste code" style="flex:1; width:0;" autocomplete="off" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" /> 
                                    <button id="sp-restore-btn" class="sp-text-btn">GO</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
              const mParser = new DOMParser();
              const mDoc = mParser.parseFromString(modalHtml, 'text/html');
              while (mDoc.body.firstChild) {
                  backdrop.appendChild(mDoc.body.firstChild);
              }
              
              document.body.appendChild(backdrop);
              setTimeout(() => backdrop.classList.add('sp-settings-open'), 10);
              
              // === IMPL LOGIC ===
              this.implementSettingsLogic(backdrop);

              // Modal Drag
              const modal = backdrop.querySelector('#sp-settings-window');
              const handle = backdrop.querySelector('#sp-settings-drag-handle');
              // ... Drag Logic simplified for UI module ...
              // Reuse initDrag logic but applied to modal? 
              // For brevity I'll assume standard drag logic or copy it if needed.
              // Logic for modal drag:
                let isDragging = false;
                let startX, startY, initialLeft, initialTop;
                const onDragStart = (e) => {
                    if(e.target.closest('.sp-settings-close')) return;
                    isDragging = true;
                    const c = e.touches ? e.touches[0] : e;
                    startX = c.clientX; startY = c.clientY;
                    const r = modal.getBoundingClientRect();
                    // Lock position
                    modal.style.position = 'absolute';
                    modal.style.left = r.left + 'px';
                    modal.style.top = r.top + 'px';
                    initialLeft = r.left; initialTop = r.top;
                };
                const onDragMove = (e) => {
                    if(!isDragging) return;
                    e.preventDefault();
                    const c = e.touches ? e.touches[0] : e;
                    const dx = c.clientX - startX;
                    const dy = c.clientY - startY;
                    modal.style.left = (initialLeft + dx) + 'px';
                    modal.style.top = (initialTop + dy) + 'px';
                };
                const onDragEnd = () => { isDragging = false; };

                // closeModal removes the window-level drag listeners before hiding the modal.
                // This prevents listener accumulation: without cleanup, each page-load would
                // permanently attach mousemove/mouseup handlers holding closures over modal DOM nodes.
                const closeModal = () => {
                    handle.removeEventListener('mousedown', onDragStart);
                    handle.removeEventListener('touchstart', onDragStart);
                    window.removeEventListener('mousemove', onDragMove);
                    window.removeEventListener('mouseup', onDragEnd);
                    window.removeEventListener('touchmove', onDragMove);
                    window.removeEventListener('touchend', onDragEnd);
                    backdrop.classList.remove('sp-settings-open');
                    setTimeout(() => backdrop.remove(), 300);
                };
                backdrop.querySelector('.sp-settings-close').onclick = closeModal;
                
                // Close on backdrop click
                backdrop.addEventListener('click', (e) => {
                    if (e.target === backdrop) closeModal();
                });

                handle.addEventListener('mousedown', onDragStart);
                window.addEventListener('mousemove', onDragMove);
                window.addEventListener('mouseup', onDragEnd);
                handle.addEventListener('touchstart', onDragStart, {passive: false});
                window.addEventListener('touchmove', onDragMove, {passive: false});
                window.addEventListener('touchend', onDragEnd);
        },

        
        implementSettingsLogic: function(backdrop) {
             const Utils = window.SP.Utils;
             const Config = window.SP.Config;

             const themeSel = backdrop.querySelector('#sp-theme-select');
             
             // Set Version
             const verDisp = backdrop.querySelector('#sp-version-display');
             if(verDisp) verDisp.textContent = "v" + chrome.runtime.getManifest().version;

             const custLink = backdrop.querySelector('#sp-theme-customize-link');
             if(custLink) {
                 custLink.addEventListener('click', (e) => {
                     e.preventDefault(); openThemeEditor();
                 });
             }
             
             const graphSel = backdrop.querySelector('#sp-show-graph-select');
             const btcSel = backdrop.querySelector('#sp-btc-select');
             const pulseSel = backdrop.querySelector('#sp-show-pulse-select');
             const flashSel = backdrop.querySelector('#sp-flash-logo-select');
             const btcRow = backdrop.querySelector('#sp-btc-row');

             chrome.storage.local.get(['sp_theme', 'sp_btc_source', 'sp_show_graph', 'sp_show_pulse', 'sp_flash_logo', 'sp_btc_address'], res => {
                themeSel.value = res.sp_theme || localStorage.getItem('sp_theme_sync') || 'light';
                graphSel.value = (res.sp_show_graph !== false) ? "true" : "false";
                btcRow.style.display = (res.sp_show_graph !== false) ? 'flex' : 'none';
                btcSel.value = res.sp_btc_source || 'binance';
                pulseSel.value = (res.sp_show_pulse !== false) ? "true" : "false";
                flashSel.value = (res.sp_flash_logo !== false) ? "true" : "false";
                
                // Set BTC Address and Init State
                if(res.sp_btc_address) {
                    const btcInp = backdrop.querySelector('#sp-btc-input');
                    const btcBtn = backdrop.querySelector('#sp-btc-submit');
                    if(btcInp && btcBtn) {
                        btcInp.value = res.sp_btc_address;
                        validateBtcAddress(res.sp_btc_address, btcInp, btcBtn);
                    }
                }

                toggleBtcAddressRow(res.sp_flash_logo !== false, backdrop);
             });

             themeSel.addEventListener('change', (e) => {
                 chrome.storage.local.set({ sp_theme: e.target.value });
                 this.applyThemeLogic(e.target.value);
             });
             
             graphSel.addEventListener('change', (e) => {
                 const show = e.target.value === 'true';
                 chrome.storage.local.set({ sp_show_graph: show });
                 btcRow.style.display = show ? 'flex' : 'none';
                 const gz = document.getElementById('sp-stats-zone');
                 if(gz) gz.style.display = show ? 'flex' : 'none';
             });

             pulseSel.addEventListener('change', (e) => {
                 chrome.storage.local.set({ sp_show_pulse: e.target.value === 'true' });
             });

             flashSel.addEventListener('change', (e) => {
                 const show = e.target.value === 'true';
                 chrome.storage.local.set({ sp_flash_logo: show });
                 toggleBtcAddressRow(show, backdrop);
             });

             // BTC Address Validation & Save
             const btcInp = backdrop.querySelector('#sp-btc-input');
             const btcBtn = backdrop.querySelector('#sp-btc-submit');
             
             btcInp.addEventListener('input', () => validateBtcAddress(btcInp.value, btcInp, btcBtn));


             btcBtn.addEventListener('click', () => {
                 const addr = btcInp.value.trim();
                 
                 // If empty, clear the address (user wants to unset it)
                 if (addr === '') {
                     btcBtn.textContent = '...';
                     chrome.storage.local.get(['sp_uuid', 'sp_public_id'], res => {
                         chrome.runtime.sendMessage({
                             type: "REGISTER_IDENTITY",
                            payload: {
                                public_id: res.sp_public_id || '',
                                uuid: res.sp_uuid,
                                btc_address: ''
                            }
                         }, resp => {
                             if (chrome.runtime.lastError) {
                                btcBtn.textContent = '✗';
                                return;
                            }
                            if (resp && resp.success && resp.data && resp.data.status === 'success') {
                                chrome.storage.local.remove(['sp_btc_address']);
                                btcBtn.textContent = '✓';
                                btcInp.value = '';
                                btcInp.placeholder = 'Not set';
                            } else {
                                btcBtn.textContent = '✗';
                            }
                         });
                     });
                     return;
                 }
                 
                 // Validate address
                 if(!validateBtcAddress(addr, btcInp, btcBtn)) {
                     // Invalid address - clear it after error animation
                     btcInp.classList.add('sp-flash-error');
                     setTimeout(() => {
                         btcInp.classList.remove('sp-flash-error');
                         btcInp.value = '';  // Clear invalid input
                         btcInp.placeholder = 'Not set';
                         validateBtcAddress('', btcInp, btcBtn);
                     }, 800);
                     return;
                 }
                 
                 btcBtn.textContent = '...';
                 chrome.storage.local.get(['sp_uuid', 'sp_public_id'], res => {
                     chrome.runtime.sendMessage({
                         type: "REGISTER_IDENTITY",
                         payload: {
                             public_id: res.sp_public_id,
                             uuid: res.sp_uuid,
                             btc_address: addr
                         }
                     }, resp => {
                         if (chrome.runtime.lastError) {
                             btcBtn.textContent = '✗';
                             btcInp.classList.add('sp-flash-error');
                             setTimeout(() => btcInp.classList.remove('sp-flash-error'), 1000);
                             return;
                         }
                         if (resp && resp.success && resp.data && resp.data.status === 'success') {
                             chrome.storage.local.set({ sp_btc_address: addr });
                             btcBtn.textContent = '✓';
                         } else {
                             btcBtn.textContent = '✗';
                             btcInp.classList.add('sp-flash-error');
                             setTimeout(() => btcInp.classList.remove('sp-flash-error'), 1000);
                         }
                     });
                 });
             });
             
             // Name Input Logic
             const nameInp = backdrop.querySelector('#sp-name-input');
             const nameBtn = backdrop.querySelector('#sp-name-submit');
             
             nameInp.addEventListener('input', () => {
                 const val = nameInp.value.trim();
                 const valid = val.length >= 3 && val.length <= 50;
                 nameBtn.disabled = !valid;
                 if (val.length > 0 && !valid) {
                     nameInp.style.borderColor = '#ef4444';
                 } else {
                     nameInp.style.borderColor = '';
                 }
             });

             chrome.storage.local.get(['custom_name', 'sp_public_id'], res => {
                 const val = res.custom_name || res.sp_public_id || "";
                 nameInp.value = val;
                 nameBtn.disabled = !val;
             });
             
             let _savingName = false;
             nameBtn.addEventListener('click', () => {
                 const val = nameInp.value.trim();
                 if(!val || val.length < 3 || val.length > 50) return;
                 if(_savingName) return;
                 _savingName = true;
                 nameBtn.textContent = '...';
                 
                 chrome.storage.local.get(['sp_uuid'], res => {
                     chrome.runtime.sendMessage({
                         type: "REGISTER_IDENTITY",
                         payload: {
                             public_id: val,
                             uuid: res.sp_uuid,
                             btc_address: ''
                         }
                     }, resp => {
                         _savingName = false;
                         if (chrome.runtime.lastError) {
                             nameBtn.textContent = '✗';
                             return;
                         }
                         if (resp && resp.success && resp.data && resp.data.status === 'success') {
                             chrome.storage.local.set({ custom_name: val, sp_public_id: val });
                             nameBtn.textContent = '✓';
                             nameInp.style.borderColor = '';
                         } else {
                             nameBtn.textContent = '✗';
                             const errMsg = (resp && resp.data && resp.data.message) ? resp.data.message : 'Unknown error';
                             if (window.SP.Config.DEBUG) window.SP.Logger.error('Name change failed:', errMsg);
                             console.error('ShadowPulse: Failed to change name:', errMsg);
                         }
                     });
                 });
             });

             // Wire Faucet Activity link — reads UUID fresh on each click
             const faLink = backdrop.querySelector('#sp-faucet-activity-link');
             if (faLink) {
                 faLink.addEventListener('click', (e) => {
                     e.preventDefault();
                     chrome.storage.local.get(['sp_uuid'], res => {
                         if (!res.sp_uuid) {
                             window.SP.Logger.warn('[Faucet Link] No UUID available yet');
                             return;
                         }
                         chrome.runtime.sendMessage({
                             type: "CREATE_ACTIVITY_TOKEN",
                             payload: { uuid: res.sp_uuid }
                         }, resp => {
                             if (chrome.runtime.lastError) {
                                 window.SP.Logger.error('[Faucet Link] BG error:', chrome.runtime.lastError.message);
                                 return;
                             }
                             if (resp && resp.success && resp.data && resp.data.status === 'success' && resp.data.token) {
                                 const url = `${window.SP.Config.BASE_URL}/reports/faucet_activity.php?token=${encodeURIComponent(resp.data.token)}`;
                                 window.SP.Logger.info('[Faucet Link] Opening activity page');
                                 chrome.runtime.sendMessage({ type: "OPEN_TAB", payload: { url: url } });
                             } else {
                                 window.SP.Logger.error('[Faucet Link] Failed to create activity token. Response:', resp);
                             }
                         });
                     });
                 });
             }

             // Stats Update
             const updateStats = () => {
                 chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
                     if(res.sp_public_id) {
                         chrome.runtime.sendMessage({
                             type: "GET_USER_STATS", payload: { voter_id: res.sp_public_id }
                         }, resp => {
                             if (chrome.runtime.lastError) return;
                             if(resp && resp.success && resp.data.data) {
                                 const d = resp.data.data;
                                 const viewEl = backdrop.querySelector('#sp-stat-views');
                                 const voteEl = backdrop.querySelector('#sp-stat-votes');
                                 if(viewEl) viewEl.textContent = d.view_rank !== '—' ? `${d.topic_views} (${d.view_rank})` : d.topic_views;
                                 if(voteEl) voteEl.textContent = d.rank !== '—' ? `${d.vote_pulses} (${d.rank})` : d.vote_pulses;
                                 
                                 const powEl = backdrop.querySelector('#sp-stat-power');
                                 const upLink = backdrop.querySelector('#sp-upgrade-link');

                                 if(powEl && d.pulse_power !== undefined && d.pulse_power !== null) {
                                     const val = parseFloat(d.pulse_power);
                                     powEl.textContent = isNaN(val) ? '0.00' : val.toFixed(2);
                                 }
                                 
                                 if(upLink && d.available_upgrades > 0 && res.sp_uuid) {
                                     upLink.style.display = 'flex';
                                     upLink.href = `${window.SP.Config.BASE_URL}/reports/upgrade.php?id=${encodeURIComponent(res.sp_uuid)}`;
                                 } else if (upLink) {
                                     upLink.style.display = 'none';
                                 }
                             }
                         });
                     }
                 });
             };
             updateStats();
             
             // Security Toggle & Logic
             const secToggle = backdrop.querySelector('#sp-security-toggle');
             const secBlock = backdrop.querySelector('#sp-security-block');
             const ackSel = backdrop.querySelector('#sp-ack-select');
             
             // Check if already acknowledged
             chrome.storage.local.get(['sp_restore_acked'], res => {
                 if(!res.sp_restore_acked) {
                     secToggle.style.borderColor = '#ef4444';
                     secToggle.style.color = '#ef4444';
                     secToggle.setAttribute('title', 'Backup Required!');
                     secToggle.classList.add('sp-show-flash');
                     ackSel.value = "false";
                 } else {
                     ackSel.value = "true";
                     secToggle.classList.remove('sp-show-flash');
                 }
             });

             secToggle.onclick = () => {
                 const isHidden = secBlock.style.display === 'none';
                 secBlock.style.display = isHidden ? 'flex' : 'none';
                 secToggle.textContent = isHidden ? 'HIDE' : 'SHOW';
             };
             
             // Ack Change Listener
             ackSel.addEventListener('change', (e) => {
                 const isSaved = e.target.value === 'true';
                 chrome.storage.local.set({ sp_restore_acked: isSaved });
                 
                 if(isSaved) {
                     secToggle.style.borderColor = '';
                     secToggle.style.color = '';
                     secToggle.removeAttribute('title');
                     secToggle.classList.remove('sp-show-flash');
                 } else {
                     secToggle.style.borderColor = '#ef4444';
                     secToggle.style.color = '#ef4444';
                     secToggle.setAttribute('title', 'Backup Required!');
                     secToggle.classList.add('sp-show-flash');
                 }
             });

             // Copy Code
             const copyBtn = backdrop.querySelector('#sp-copy-btn');
             const codeDisp = backdrop.querySelector('#sp-code-display');
             if(copyBtn && codeDisp) {
                 copyBtn.onclick = () => {
                     const code = codeDisp.textContent;
                     if(code && code !== '...') {
                         navigator.clipboard.writeText(code).then(() => {
                             const svgClone = copyBtn.querySelector('svg') ? copyBtn.querySelector('svg').cloneNode(true) : null;
                             copyBtn.textContent = "COPIED";
                             copyBtn.style.color = "#22c55e";
                             copyBtn.style.fontSize = "10px";
                             setTimeout(() => {
                                 copyBtn.textContent = '';
                                 if (svgClone) {
                                     copyBtn.appendChild(svgClone.cloneNode(true));
                                 }
                                 copyBtn.style.color = "";
                                 copyBtn.style.fontSize = "";
                             }, 2000);
                         });
                     }
                 };
             }
             
             // Restore Logic
             const resBtn = backdrop.querySelector('#sp-restore-btn');
             const resInp = backdrop.querySelector('#sp-restore-input');
             const resWarn = backdrop.querySelector('#sp-restore-warning');
             
             resInp.addEventListener('input', () => {
                 if(resInp.value.trim().length > 0) {
                     resWarn.style.display = 'block';
                 } else {
                     resWarn.style.display = 'none';
                 }
             });

             // sp-code-display used for reading current, not restore target
             
             chrome.storage.local.get(['sp_uuid'], res => {
                 codeDisp.textContent = res.sp_uuid || "N/A";
             });
             
             let _restoring = false;
             resBtn.onclick = () => {
                 const code = resInp.value.trim();
                 if(!code) return;
                 if(_restoring) return;
                 _restoring = true;
                 resBtn.textContent = '...';
                 
                 // Get current local BTC Address to preserve it if server returns null
                 chrome.storage.local.get(['sp_btc_address', 'sp_theme'], localRes => {
                     chrome.runtime.sendMessage({ type: "RECOVER_IDENTITY", uuid: code }, resp => {
                         _restoring = false;
                         if (chrome.runtime.lastError) {
                             resBtn.textContent = 'Fail';
                             console.error("ShadowPulse: Restore Failed");
                             return;
                         }
                         if(resp && resp.success && resp.data.status === 'success') {
                             chrome.storage.local.set({
                                 sp_uuid: code,
                                 sp_public_id: resp.data.data.public_id,
                                 // Prefer server, fallback to local, then empty
                                 sp_btc_address: resp.data.data.btc_address || localRes.sp_btc_address || "",
                                 sp_theme: localRes.sp_theme || 'light'
                             }, () => {
                                 resBtn.textContent = 'Success';
                                 setTimeout(() => window.location.reload(), 500);
                             });
                         } else {
                             resBtn.textContent = 'Fail';
                             console.error("ShadowPulse: Restore Failed");
                         }
                     });
                 });
             };
        }

    };

    // --- STATE SUBSCRIPTIONS ---
    // Subscribe to logo state changes so UI updates automatically
    (function() {
        const State = window.SP.State;
        if (!State) return;
        State.on('logo:changed', (evt) => {
            if (window.SP.UI && window.SP.UI.updateLogo) {
                window.SP.UI.updateLogo(evt.to);
            }
        });
    })();

})();
