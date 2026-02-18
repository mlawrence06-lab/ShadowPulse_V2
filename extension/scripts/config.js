// Universal Config (Works in ES Module & Content Script)
const CONFIG = {
    API_BASE_URL: "https://shadowpulse.live/api",
    STATS_URL: "https://shadowpulsev2.b-cdn.net/stats.json",
    POLLING_INTERVAL: 5000,
    FLASH_COOLDOWN: 5000,
    DEBUG: true
};

// Handle Environment
if (typeof window !== 'undefined') {
    // Content Script
    window.SP = window.SP || {};
    window.SP.Config = CONFIG;
} 

// ES Module Export (for Service Worker)
export { CONFIG };
