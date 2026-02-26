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
        DEBUG: false,
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
            const adjectives = ["Crypto", "Digital", "Silent", "Neon", "Cyber", "Quantum", "Shadow", "Lunar", "Solar", "Cosmic", "Hyper", "Alpha", "Beta", "Omega", "Galactic", "Stellar", "Astral", "Atomic", "Sonic", "Mystic", "Satoshi", "Based", "Anon"];
            const nouns = ["Pulse", "Ninja", "Wizard", "Rider", "Ghost", "Dragon", "Phoenix", "Wolf", "Tiger", "Bear", "Eagle", "Falcon", "Hawk", "Shark", "Panther", "Lion", "Viper", "Cobra", "Fox", "Raven", "Whale", "Ape", "Punk"];
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const num = Math.floor(Math.random() * 10000);
            return `${adj}-${noun}-${num}`;
        },

        generateUUID: function() {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            // Fallback for extremely old environments, just in case
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },

        setLocalState: function(updates) {
             return new Promise((resolve) => {
                 chrome.storage.local.set(updates, resolve);
             });
        }
    };

})();
