(function() {
    "use strict";

    window.SP = window.SP || {};

    // --- TERMINOLOGY ---
    // Normal: SP Logo
    // Pulse: Flash Blue
    // Faucet: Flash Gold (Animated BTC)
    window.SP.LogoState = {
        NORMAL: 'normal',
        PULSE_BLUE: 'pulse_blue',
        FAUCET_GOLD: 'faucet_gold'
    };

    window.SP.Config = {
        API_BASE_URL: "https://shadowpulse.live/api",
        STATS_URL: "https://shadowpulsev2.b-cdn.net/stats.json",
        POLLING_INTERVAL: 5000,
        FLASH_COOLDOWN: 5000,
        DEBUG: true,
        WEBSITE_ID: 1
    };

    // --- LOGGING ---
    window.SP.Log = {
        info: function(...args) {
            const ts = new Date().toISOString();
            console.log("[ShadowPulse]", ts, ...args);
        },
        error: function(...args) {
            const ts = new Date().toISOString();
            console.error("[ShadowPulse]", ts, ...args);
        },
        debug: function(isDebug, ...args) {
            if (!isDebug) return;
            const ts = new Date().toISOString();
            const sysInfo = `[${navigator.platform} | ${navigator.userAgent} | ${window.location.href}]`;
            console.log("[ShadowPulse DEBUG]", ts, sysInfo, ...args);
            // Optional: Send to BG
            try {
                const message = args.map(a => (typeof a === 'object') ? JSON.stringify(a) : String(a)).join(" ");
                chrome.runtime.sendMessage({
                    type: "SEND_DEBUG_LOG",
                    payload: { message: message, system_info: sysInfo }
                }).catch(() => {});
            } catch (e) {}
        }
    };

    // --- HELPERS ---
    window.SP.Utils = {
        createEl: function(tag, classes = [], attrs = {}) {
            const el = document.createElement(tag);
            if (typeof classes === "string") {
                if (classes) el.className = classes;
            } else if (Array.isArray(classes) && classes.length) {
                el.className = classes.join(" ");
            }
            for (const [k, v] of Object.entries(attrs)) {
                el.setAttribute(k, v);
            }
            return el;
        },
        
        getState: async function(key, def) {
            return new Promise((resolve) => {
                chrome.storage.local.get([key], (res) => {
                    resolve(res[key] !== undefined ? res[key] : def);
                });
            });
        },

        setState: async function(key, val) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: val }, resolve);
            });
        },

        generateRandomId: function() {
            // Placeholder: Needs WORDS array or simplified logic.
            // Moving WORDS to a separate file or keeping basic here?
            // For simplicity, let's keep the WORDS array minimal or rely on server if possible.
            // Actually, WORDS were in bundle.js. I'll include a shortened list or the full list here.
            // For brevity in this turn, I'll use a simple generator or put the huge list in Main or a separate data file.
            // Let's assume we copy the WORDS array in a moment.
            return "User-" + Math.floor(Math.random() * 10000); 
        }
    };

})();
