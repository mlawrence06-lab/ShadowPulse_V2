(function() {
    "use strict";

    window.SP = window.SP || {};

    // --- TERMINOLOGY ---
    window.SP.LogoState = {
        NORMAL: 'normal',
        PULSE_BLUE: 'pulse_blue',
        FAUCET_GOLD: 'faucet_gold'
    };

    window.SP.Config = {
        API_BASE_URL: "https://shadowpulse.live/api",
        BASE_URL: "https://shadowpulse.live",
        STATS_URL: "https://shadowpulsev2.b-cdn.net/stats.json",
        POLLING_INTERVAL: 5000,
        FLASH_COOLDOWN: 5000,
        DEBUG: false,
        WEBSITE_ID: 1
    };

    // --- ALWAYS-ON LOGGING (Production Grade) ---
    // ERROR, WARN, and INFO are always visible in the console.
    // DEBUG only appears when window.SP.Config.DEBUG is true.
    window.SP.Logger = {
        _prefix: function(level) {
            const ts = new Date().toISOString().split('T')[1].split('.')[0];
            return `[${ts} ShadowPulse ${level}]`;
        },

        error: function(...args) {
            console.error(this._prefix('ERROR'), ...args);
        },

        warn: function(...args) {
            console.warn(this._prefix('WARN'), ...args);
        },

        info: function(...args) {
            console.log(this._prefix('INFO'), ...args);
        },

        debug: function(...args) {
            if (!window.SP.Config.DEBUG) return;
            console.log(this._prefix('DEBUG'), ...args);
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
            return new Promise((resolve, reject) => {
                try {
                    chrome.storage.local.get([key], (res) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        resolve(res && res[key] !== undefined ? res[key] : def);
                    });
                } catch (e) {
                    reject(e);
                }
            });
        },

        
        setState: async function(key, val) {
            return new Promise((resolve, reject) => {
                try {
                    chrome.storage.local.set({ [key]: val }, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        resolve();
                    });
                } catch (e) {
                    reject(e);
                }
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
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },

        
        setLocalState: function(updates) {
             return new Promise((resolve, reject) => {
                 try {
                     chrome.storage.local.set(updates, () => {
                         if (chrome.runtime.lastError) {
                             reject(new Error(chrome.runtime.lastError.message));
                             return;
                         }
                         resolve();
                     });
                 } catch (e) {
                     reject(e);
                 }
             });
        }
    };

})();
