"use strict";

import { spLog, createEl } from "./utils.js";
import { injectFloatingBar, injectSearchTable } from "./ui.js";
import { generateRandomId } from "./words.js";
import { CONFIG } from "./config.js";

// State
let lastPulseTimestamp = 0;
let lastFlashTime = 0;
let lastSelfPulseTime = 0;
let lastGlobalPulseTime = 0;
let userPublicId = null;
let userUuid = null;

// Settings Cache (for sync access)
const SETTINGS = {
    sp_show_pulse: true,
    sp_flash_logo: true
};

// --- Trust Score Fixer (Removes inline color:black) ---
function stripTrustScoreStyles() {
    // Select all trust score spans
    const scores = document.querySelectorAll('.trustscore');
    scores.forEach(el => {
        // Option 1: Nuke all styles (Safest for this case)
        el.removeAttribute('style');
        // Option 2 (Targeted): el.style.removeProperty('color');
    });
}


function init() {
    spLog("Initializing ShadowPulse...");

    // 0. Load Settings Cache
    chrome.storage.local.get([
        'sp_show_pulse', 'sp_flash_logo', 
        'sp_theme', 
        'sp_custom_light', 'sp_custom_dark',
        'sp_custom_theme' // Legacy
    ], (res) => {
        if (res.sp_show_pulse !== undefined) SETTINGS.sp_show_pulse = res.sp_show_pulse;
        if (res.sp_flash_logo !== undefined) SETTINGS.sp_flash_logo = res.sp_flash_logo;
        
        // Theme Loader (Dual Profile)
        let theme = res.sp_theme || 'light';
        
        // MIGRATION: If legacy 'custom', move to 'dark' profile (assumption)
        if (theme === 'custom') {
            theme = 'dark';
            if (!res.sp_custom_dark && res.sp_custom_theme) {
                res.sp_custom_dark = res.sp_custom_theme;
            }
        }

        // Apply Logic
        const profileVars = (theme === 'light') ? res.sp_custom_light : res.sp_custom_dark;
        
        // 1. Flush (Safety)
        document.body.removeAttribute('style');

        // 2. Set Base
        document.documentElement.setAttribute('data-sp-theme', theme);
        localStorage.setItem('sp_theme_sync', theme); // Sync for boot

        // 3. Apply Custom if exists
        if (profileVars) {
            Object.keys(profileVars).forEach(key => {
                 const varName = key.startsWith('--') ? key : `--sp-forum-${key.replace('_','-')}`;
                 document.body.style.setProperty(varName, profileVars[key]);
            });
            document.documentElement.setAttribute('data-sp-theme', 'custom');
        }
        
            // 1. Initialize User ID
        initUserId().then(() => {
            // 1b. Run Theme Patches (JS Force)
            stripTrustScoreStyles(); 

            // 2. Inject UI
            injectPulseButtons();
            injectFloatingBar();
            injectSearchTable();
            
            // 2b. Track View
            const topicMatch = window.location.href.match(/topic=(\d+)/);
            const boardMatch = window.location.href.match(/board=(\d+)/);

            if (topicMatch) {
                // Ignore "Edit", "Post", "Print" pages
                if (window.location.href.includes('action=')) return;

                const tId = topicMatch[1];
                const meta = getPageData(); 
                
                chrome.runtime.sendMessage({
                    type: "TRACK_VIEW",
                    payload: { 
                        topic_id: tId,
                        voter_id: userPublicId,
                        uuid: userUuid,
                        board_id: meta.boardId, // Data Point: Board ID from Breadcrumbs
                        topic_title: meta.topicTitle // Data Point: Topic Title from Breadcrumbs
                    }
                });
            } else if (boardMatch) {
               // Track Board Index View
               const bId = boardMatch[1];
               // Data Point: Board Title
               let bTitle = document.title.replace(" - Bitcoin Forum", "").trim();

               chrome.runtime.sendMessage({
                   type: "TRACK_VIEW",
                   payload: {
                       board_id: bId,
                       voter_id: userPublicId,
                       uuid: userUuid,
                       is_board_view: true,
                       board_title: bTitle // Data Point: Board Title from innerText
                   }
               });
            }

            // 3. Start Polling
            startPulsePolling();
        });
    });
    
    // Listen for changes
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.sp_show_pulse) SETTINGS.sp_show_pulse = changes.sp_show_pulse.newValue;
            if (changes.sp_flash_logo) SETTINGS.sp_flash_logo = changes.sp_flash_logo.newValue;
        }
    });
}

async function initUserId() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['sp_public_id', 'sp_uuid'], (res) => {
            if (!res.sp_public_id) {
                // Generate
                const newId = generateRandomId();
                const uuid = crypto.randomUUID();
                spLog("Generated new ID:", newId);
                chrome.storage.local.set({
                    sp_public_id: newId,
                    sp_uuid: uuid
                }, () => {
                    userPublicId = newId;
                    userUuid = uuid;
                    resolve();
                });
            } else {
                userPublicId = res.sp_public_id;
                spLog("Loaded ID:", userPublicId);
                // Also load UUID if present
                if (res.sp_uuid) {
                    userUuid = res.sp_uuid;
                }
                resolve();
            }
        });
    });
}

// --- Metadata Helper (Unified One-Pass) ---
function getPageData() {
    const meta = {
        type: null,
        boardId: '0',
        boardTitle: "",
        topicId: '0',
        topicTitle: "" 
    };

    // Strategy: Walk Breadcrumbs (Navigation Tree)
    // We iterate through all links. 
    // - If it has board=ID, we capture ID and Title (overwriting previous parents).
    // - If it has topic=ID, we capture ID and Title and mark as 'topic'.
    const navLinks = document.querySelectorAll('.navigate_section a');
    
    for (const link of navLinks) {
        const href = link.href;
        const text = link.textContent.trim();

        // Data Point: Board ID and Name
        const bMatch = href.match(/board=(\d+)/);
        if (bMatch) {
            meta.boardId = bMatch[1];
            meta.boardTitle = text;
        }

        // Data Point: Topic ID and Name
        const tMatch = href.match(/topic=(\d+)/);
        if (tMatch) {
            meta.topicId = tMatch[1];
            meta.topicTitle = text;
            meta.type = 'topic';
        }
    }

    // Deduce Type if topic found
    if (meta.topicId !== '0') {
        meta.type = 'topic';
    } else if (meta.boardId !== '0') {
        meta.type = 'board';
    }

    return meta;
}


function startPulsePolling() {
    setInterval(async () => {
        // Optimization: Pause when tab is hidden
        if (document.hidden) return;

        // A. Global Pulse Check (Logo Flash)
        if (SETTINGS.sp_flash_logo) {
             try {
                 const res = await chrome.runtime.sendMessage({ type: "GET_LATEST_PULSE" });
                 if (res && res.success && res.data) {
                     const globalTime = parseFloat(res.data.last_pulse);
                     
                     // First run: just sync, don't flash
                     if (lastGlobalPulseTime === 0) {
                         lastGlobalPulseTime = globalTime;
                     } 
                     // Subsequent runs: Check for new pulse
                     else if (globalTime > lastGlobalPulseTime) {
                         lastGlobalPulseTime = globalTime;
                         // Flash only if not self-pulse (dedupe)
                         if (Date.now() - lastSelfPulseTime > 3000) {
                             flashLogoStub();
                         }
                     }
                 }
             } catch(e) {}
        }

        // B. Local Pulse Check (Button Flash)
        const visibleBtns = Array.from(document.querySelectorAll('.sp-pulse-btn'));
        // Let's pick 3 random ones to check to avoid network storms.
        for (let i = 0; i < 3; i++) {
             const btn = visibleBtns[Math.floor(Math.random() * visibleBtns.length)];
             if (!btn) continue;
             
             const msgId = btn.dataset.msgId;
             if (!msgId || msgId === '0') continue;

             try {
                const response = await chrome.runtime.sendMessage({
                    type: "GET_VOTE_STATUS",
                    payload: { msg_id: msgId }
                });
                
                if (response && response.success && response.data) {
                    const { last_pulse } = response.data;
                    // If new pulse detected
                    const pulseTime = parseFloat(last_pulse);
                    if (pulseTime > lastPulseTimestamp) {
                         lastPulseTimestamp = pulseTime;
                         // Trigger Flash if cooldown passed AND not just pulsed by self
                         const now = Date.now();
                         if (now - lastFlashTime > CONFIG.FLASH_COOLDOWN && now - lastSelfPulseTime > 3000) {
                             flashPulseButton(msgId);
                             lastFlashTime = now;
                         }
                    }
                }
             } catch(e) {}
        }
    }, CONFIG.POLLING_INTERVAL);
}


function flashPulseButton(msgId) {
    if (SETTINGS.sp_flash_logo === false) return; 

    // 1. Flash Specific Button
    const btn = document.querySelector(`.sp-pulse-btn[data-msg-id="${msgId}"]`);
    if (btn) {
        // Reset animation hack
        btn.classList.remove('sp-flash');
        void btn.offsetWidth; 
        btn.classList.add('sp-flash');
        setTimeout(() => btn.classList.remove('sp-flash'), 1000);
    }

    // 2. Flash Logo (Global effect remains)
    flashLogoStub();
}

function flashLogoStub() {
    const logoZone = document.getElementById('sp-logo-zone');
    if (logoZone) {
        logoZone.classList.remove('sp-flash');
        void logoZone.offsetWidth; 
        logoZone.classList.add('sp-flash');
        setTimeout(() => logoZone.classList.remove('sp-flash'), 1000);
    }
}


function injectPulseButtons() {
    if (SETTINGS.sp_show_pulse === false) return; 

    const posts = document.querySelectorAll('td.td_headerandpost');
    // We already scraped this in init check, but for safety inside this standalone function:
    const pageMeta = getPageData(); 
    const pageTopicId = pageMeta.topicId;

    posts.forEach(td => {
        if (td.dataset.spInjected) return;
        
        // Find #Num link
        const links = Array.from(td.querySelectorAll('a'));
        const postNumLink = links.find(a => a.textContent.trim().startsWith('#') && /^\#\d+$/.test(a.textContent.trim()));
        
        if (!postNumLink) return; 
        
        const container = postNumLink.closest('div'); 
        if (!container) return;

        // Extract IDs NOW (Hidden Values)
        let topicId = pageTopicId;
        let msgId = '0';

        // Try to refine from link: index.php?topic=548.msg123#msg123
        const href = postNumLink.href;
        const topicMatch = href.match(/topic=(\d+)/);
        if (topicMatch) topicId = topicMatch[1];

        // Data Point: Message ID
        const msgMatch = href.match(/msg(\d+)/) || href.match(/#msg(\d+)/);
        if (msgMatch) msgId = msgMatch[1];
        
        let postTitle = "";
        let postAuthor = "Unknown";
        let postAuthorUid = 0;

        // Data Point: Post Author
        const tr = td.parentElement;
        const posterTd = tr.querySelector('td.poster_info');
        if (posterTd) {
            const nameLink = posterTd.querySelector('a'); 
            if (nameLink) {
                postAuthor = nameLink.textContent.trim();
                const uMatch = nameLink.href.match(/u=(\d+)/);
                if (uMatch) postAuthorUid = uMatch[1];
            }
        }

        // Data Point: Post Subject
        const subjectDiv = td.querySelector('div[id^="subject_"]');
        if (subjectDiv) {
            const subjectLink = subjectDiv.querySelector('a');
            if (subjectLink) postTitle = subjectLink.textContent.trim();
        }

        // Find Merit
        const meritLink = Array.from(container.querySelectorAll('a')).find(a => a.href.includes('action=merit'));
        
        // Create Wrapper
        const wrapper = createEl('div', ['sp-pulse-wrapper']);
        wrapper.style.display = 'inline-flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'flex-end'; 
        wrapper.style.verticalAlign = 'top'; 
        wrapper.style.marginLeft = '4px'; 
        
        if (meritLink) {
             meritLink.parentNode.insertBefore(wrapper, meritLink);
             wrapper.appendChild(meritLink);
        } else {
             container.appendChild(wrapper);
        }

        // Create Button with Hidden Values & Metadata
        const btn = createPulseButton(topicId, msgId, {
            boardId: pageMeta.boardId,
            topicTitle: pageMeta.topicTitle,
            postTitle: postTitle,
            postAuthor: postAuthor,
            postAuthorUid: postAuthorUid
        });
        wrapper.appendChild(btn);
        
        td.dataset.spInjected = "true";
    });
}

function createPulseButton(topicId, msgId, meta) {
    const btnPulse = createEl("a", ["sp-pulse-btn"]); 
    btnPulse.href = "#"; 
    btnPulse.textContent = "+Pulse";
    btnPulse.title = `Give Pulse as ${userPublicId}`;
    
    // Hidden Values
    btnPulse.dataset.topicId = topicId;
    btnPulse.dataset.msgId = msgId;
    
    // Styles handled by CSS class now (inherits from a)
    // END: Convert -> Anchor 
    
    // Logic
    btnPulse.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 1. Visual Immediate Feedback (Sync)
        // Flash ONLY this button, not global logo
        btnPulse.classList.add('sp-flash');
        setTimeout(() => btnPulse.classList.remove('sp-flash'), 1000); 
        lastSelfPulseTime = Date.now(); // Suppress poll echo
        spLog(`Pulsing Topic:${topicId} Msg:${msgId} as ${userPublicId}...`);
        
        // 2. Send to Backend via Background Process
        try {
            const payload = {
                voter_id: userPublicId,
                uuid: userUuid, 
                msg_id: msgId,  
                topic_id: topicId,
                type: 'pulse',
                // Metadata
                board_id: meta.boardId,
                topic_title: meta.topicTitle,
                post_title: meta.postTitle,
                post_author: meta.postAuthor,
                post_author_uid: meta.postAuthorUid
            };

            const response = await chrome.runtime.sendMessage({ 
                type: "SEND_PULSE", 
                payload: payload 
            });

            if (response && response.success) {
                spLog("Pulse Sent (BG Success)");
            } else {
                // Error Feedback
                btnPulse.classList.remove('sp-flash');
                void btnPulse.offsetWidth; 
                btnPulse.classList.add('sp-flash-error');
                setTimeout(() => btnPulse.classList.remove('sp-flash-error'), 1000);
            }
        } catch (err) {
            console.error("Pulse Message Error:", err);
            btnPulse.classList.remove('sp-flash');
            void btnPulse.offsetWidth;
            btnPulse.classList.add('sp-flash-error');
            setTimeout(() => btnPulse.classList.remove('sp-flash-error'), 1000);
        }
    });

    return btnPulse;
}

init();
