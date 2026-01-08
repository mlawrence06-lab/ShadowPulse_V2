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

function init() {
    spLog("Initializing V2...");

    // 0. Load Settings Cache
    chrome.storage.local.get(['sp_show_pulse', 'sp_flash_logo'], (res) => {
        if (res.sp_show_pulse !== undefined) SETTINGS.sp_show_pulse = res.sp_show_pulse;
        if (res.sp_flash_logo !== undefined) SETTINGS.sp_flash_logo = res.sp_flash_logo;
        
        // 1. Initialize User ID
        initUserId().then(() => {
            // 2. Inject UI
            injectPulseButtons();
            injectFloatingBar();
            injectSearchTable();

            // 2b. Track View
            // 2b. Track View
            const topicMatch = window.location.href.match(/topic=(\d+)/);
            const boardMatch = window.location.href.match(/board=(\d+)/);

            if (topicMatch) {
                const tId = topicMatch[1];
                const meta = getTopicMetadata(); // Scrape Board/Topic info
                
                chrome.runtime.sendMessage({
                    type: "TRACK_VIEW",
                    payload: { 
                        topic_id: tId,
                        voter_id: userPublicId,
                        uuid: userUuid,
                        board_id: meta.boardId,
                        topic_title: meta.topicTitle
                    }
                });
            } else if (boardMatch) {
               // Track Board Index View
               const bId = boardMatch[1];
               // Scrape Title (Board Name)
               // Title usually: "Board Name - Bitcoin Forum"
               let bTitle = document.title.replace(" - Bitcoin Forum", "").trim();

               chrome.runtime.sendMessage({
                   type: "TRACK_VIEW",
                   payload: {
                       board_id: bId,
                       voter_id: userPublicId,
                       uuid: userUuid,
                       is_board_view: true,
                       board_title: bTitle
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

// --- Metadata Helper ---
function getTopicMetadata() {
    let boardId = '0';
    let topicTitle = document.title; // Fallback

    // Strategy 1: <link rel="index"> (Most Reliable on Topics)
    const indexLink = document.querySelector('link[rel="index"]');
    if (indexLink && indexLink.href) {
        const match = indexLink.href.match(/board=(\d+)/);
        if (match) boardId = match[1];
    }

    // Strategy 2: Breadcrumbs (Fallback)
    if (boardId === '0') {
        const navLinks = document.querySelectorAll('.navigate_section a');
        for (const link of navLinks) {
            const match = link.href.match(/board=(\d+)/);
            if (match) {
                boardId = match[1];
                // Keep iterating to get the most specific (last) board
            }
        }
    }

    // Strategy 3: Mirror Link (Last Resort)
    if (boardId === '0') {
         const mirrors = document.querySelectorAll('.mirrors a');
         for (const link of mirrors) {
             const match = link.href.match(/board=(\d+)/);
             if (match) {
                 boardId = match[1];
                 break;
             }
         }
    }

    // Refine Topic Title
    topicTitle = topicTitle.replace(/ - Page \d+/, "").replace(/ - Bitcoin Forum$/, "").trim();

    return { boardId, topicTitle };
}


function startPulsePolling() {
    setInterval(async () => {
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
    const pageTopicMatch = window.location.href.match(/topic=(\d+)\./);
    const pageTopicId = pageTopicMatch ? pageTopicMatch[1] : '0';
    const pageMeta = getTopicMetadata(); // Get Page-Level Topic/Board

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

        const msgMatch = href.match(/msg(\d+)/) || href.match(/#msg(\d+)/);
        if (msgMatch) msgId = msgMatch[1];
        
        // --- Scrape Post Metadata ---
        let postTitle = "";
        let postAuthor = "Unknown";
        let postAuthorUid = 0;

        // Author: Look at previous TD (td.poster_info)
        const tr = td.parentElement;
        const posterTd = tr.querySelector('td.poster_info');
        if (posterTd) {
            // Usually the first <b><a>Name</a></b> or similar
            const nameLink = posterTd.querySelector('a'); 
            if (nameLink) {
                postAuthor = nameLink.textContent.trim();
                const uMatch = nameLink.href.match(/u=(\d+)/);
                if (uMatch) postAuthorUid = uMatch[1];
            }
        }

        // Title: Look for div[id^="subject_"] inside this TD
        const subjectDiv = td.querySelector('div[id^="subject_"]');
        if (subjectDiv) {
            const subjectLink = subjectDiv.querySelector('a');
            if (subjectLink) postTitle = subjectLink.textContent.trim();
        } else {
             // Fallback: Check if it's the first post? Sometimes different structure.
             // Or rely on page title if empty? No, cleaner to fail to ""
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
    const btnPulse = createEl("button", ["sp-pulse-btn"]);
    btnPulse.textContent = "+Pulse";
    btnPulse.title = `Give Pulse as ${userPublicId}`;
    
    // Hidden Values
    btnPulse.dataset.topicId = topicId;
    btnPulse.dataset.msgId = msgId;
    
    btnPulse.style.display = "inline-block";
    btnPulse.style.lineHeight = "1.2"; 
    
    // Logic
    btnPulse.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 1. Visual Immediate Feedback (Sync)
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
                uuid: userUuid, // Added for verification
                msg_id: msgId,  // Changed from target_id to msg_id
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
                console.error("Pulse BG Fail:", response?.error);
            }
        } catch (err) {
            console.error("Pulse Message Error:", err);
        }
    });

    return btnPulse;
}

init();
