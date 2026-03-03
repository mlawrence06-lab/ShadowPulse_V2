// background.js - Service Worker
// Handles fetching to bypass CORS on Content Scripts

import { CONFIG } from './config.js';

// Global Error Handlers (Service Worker)
self.addEventListener('error', (event) => {
    console.error('[ShadowPulse Service Worker Fatal Error]', event.error || event.message);
});
self.addEventListener('unhandledrejection', (event) => {
    console.error('[ShadowPulse Service Worker Unhandled Promise Rejection]', event.reason);
});

// --- CONFIGURATION ---
const RETRY_OPTS = {
    retries: 2,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 5000
};

// --- HELPERS ---
// AUDIT: Pauses execution for a given number of milliseconds, used to delay retry attempts.
async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// AUDIT: Wraps the native fetch API with exponential backoff logic for resilience against temporary network/server failures.
async function fetchWithRetry(url, options = {}, retries = RETRY_OPTS.retries) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
             // For 5xx errors, we retry. For 4xx, we likely shouldn't (client error).
             if (response.status >= 500) {
                 throw new Error(`Server Error: ${response.status}`);
             }
             // Return immediately for 4xx to avoid useless retries
             return response;
        }
        return response;
    } catch (err) {
        if (retries > 0) {
            const delay = Math.min(
                RETRY_OPTS.maxTimeout, 
                RETRY_OPTS.minTimeout * Math.pow(RETRY_OPTS.factor, RETRY_OPTS.retries - retries)
            );
            if (CONFIG.DEBUG) console.warn(`[ShadowPulse] Fetch failed, retrying in ${delay}ms...`, err);
            await wait(delay);
            return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
    }
}

// AUDIT: Primary message router that listens for commands from content scripts and executes network requests to bypass CORS restrictions.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.type === "FETCH_STATS") {
            fetchWithRetry(CONFIG.STATS_URL + '?t=' + Date.now())
                .then(response => {
                    if (!response.ok) throw new Error("Network response was not ok");
                    return response.json();
                })
                .then(data => sendResponse({ success: true, data: data }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.type === "SEND_PULSE") {
            const params = new URLSearchParams();
            const payload = request.payload || {};
            for (const key in payload) {
                params.append(key, payload[key]);
            }

            fetchWithRetry(`${CONFIG.API_BASE_URL}/vote_pulse.php`, {
                method: 'POST', body: params
            })
            .then(response => response.json())
            .then(data => {
                if (data && (data.status === 'success' || data.success === true)) {
                    sendResponse({ success: true, data: data });
                } else {
                    sendResponse({ success: false, error: data.message || data.error || "Unknown Error" });
                }
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.type === "TRACK_VIEW") {
            const params = new URLSearchParams();
            const payload = request.payload || {};
            for (const key in payload) {
                 if (payload[key] !== undefined && payload[key] !== null) {
                     params.append(key, payload[key]);
                 }
            }

            fetchWithRetry(`${CONFIG.API_BASE_URL}/track_view.php`, {
                method: 'POST', body: params
            })
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.type === "GET_VOTE_STATUS") {
             const { msg_id, msg_ids } = request.payload || {};
             let url = `${CONFIG.API_BASE_URL}/get_vote_status.php`;
             
             if (msg_ids) {
                 url += `?msg_ids=${msg_ids}`;
             } else if (msg_id) {
                 url += `?msg_id=${msg_id}`;
             }
             
             fetchWithRetry(url)
                .then(res => res.json())
                .then(data => sendResponse({ success: true, data: data }))
                .catch(err => sendResponse({ success: false, error: err.message }));
             return true;
        }

        if (request.type === "GET_USER_STATS") {
             const { voter_id } = request.payload || {};
             fetchWithRetry(`${CONFIG.API_BASE_URL}/get_user_stats.php?voter_id=${voter_id}&t=${Date.now()}`)
                .then(res => res.json())
                .then(data => sendResponse({ success: true, data: data }))
                .catch(err => sendResponse({ success: false, error: err.message }));
             return true;
        }

        if (request.type === "GET_LATEST_PULSE") {
            const voterId = request.voter_id || '';
            fetchWithRetry(`${CONFIG.API_BASE_URL}/get_latest_pulse.php?t=${Date.now()}&voter_id=${encodeURIComponent(voterId)}`, {}, 1)
               .then(res => res.json())
               .then(data => sendResponse({ success: true, data: data }))
               .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (request.type === "RECOVER_IDENTITY") {
            const uuid = request.uuid || (request.payload && request.payload.uuid) || '';
            fetchWithRetry(`${CONFIG.API_BASE_URL}/recover_identity.php?uuid=${encodeURIComponent(uuid)}`)
               .then(res => res.json())
               .then(data => sendResponse({ success: true, data: data }))
               .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (request.type === "SEND_DEBUG_LOG") {
            const { message, system_info } = request.payload || {};
            
            const params = new URLSearchParams();
            params.append('message', message || '');
            params.append('system_info', system_info || '');
            params.append('version', chrome.runtime.getManifest().version);
            
            fetchWithRetry(`${CONFIG.API_BASE_URL}/log_debug.php`, {
                method: 'POST', body: params
            }, 1).catch(err => { if (CONFIG.DEBUG) console.error("Failed to send debug log", err); });
            return false;
        }

    } catch (criticalError) {
        console.error("CRITICAL BACKGROUND ERROR", criticalError);
        sendResponse({ success: false, error: "Critical Extension Error: " + (criticalError.message || criticalError) });
    }
});
