// background.js - Service Worker
// Handles fetching to bypass CORS on Content Scripts

import { CONFIG } from './config.js';

// --- CONFIGURATION ---
const RETRY_OPTS = {
    retries: 2,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 5000
};

// --- HELPERS ---
async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
            console.warn(`[ShadowPulse] Fetch failed, retrying in ${delay}ms...`, err);
            await wait(delay);
            return fetchWithRetry(url, options, retries - 1);
        }
        throw err;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "FETCH_STATS") {
        // Simple GET request with query param cache-busting.
        // Avoid adding custom headers to prevent triggering CORS Preflight (OPTIONS)
        fetchWithRetry(CONFIG.STATS_URL + '?t=' + Date.now())
            .then(response => {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json();
            })
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        
        return true; // Keep channel open for async response
    }

    if (request.type === "SEND_PULSE") {
        // Handle Pulse POST logic
        // Convert payload object to URLSearchParams for standard POST
        const params = new URLSearchParams();
        for (const key in request.payload) {
            params.append(key, request.payload[key]);
        }

        fetchWithRetry(`${CONFIG.API_BASE_URL}/vote_pulse.php`, {
            method: 'POST',
            body: params
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
        // Dynamically append all payload keys (fixes missing board_title/is_board_view)
        for (const key in request.payload) {
             if (request.payload[key] !== undefined && request.payload[key] !== null) {
                 params.append(key, request.payload[key]);
             }
        }

        // View Tracking is less critical, maybe 1 retry or 0? 
        // We'll use default retries (2) for robustness.
        fetchWithRetry(`${CONFIG.API_BASE_URL}/track_view.php`, {
            method: 'POST',
            body: params
        })
        .then(response => response.json())
        .then(data => sendResponse({ success: true, data: data }))
        .catch(error => sendResponse({ success: false, error: error.message }));

        return true;
    }

    if (request.type === "GET_VOTE_STATUS") {
         const { msg_id, msg_ids } = request.payload;
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
         const { voter_id } = request.payload;
         fetchWithRetry(`${CONFIG.API_BASE_URL}/get_user_stats.php?voter_id=${voter_id}&t=${Date.now()}`)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
         
         return true;
    }

    if (request.type === "GET_LATEST_PULSE") {
        const voterId = request.voter_id || '';
        // Heartbeat - we can probably skip retries here to avoid pile-up if server is down,
        // or just use 1 retry.
        fetchWithRetry(`${CONFIG.API_BASE_URL}/get_latest_pulse.php?t=${Date.now()}&voter_id=${encodeURIComponent(voterId)}`, {}, 1)
           .then(res => res.json())
           .then(data => sendResponse({ success: true, data: data }))
           .catch(err => sendResponse({ success: false, error: err.message }));
        
        return true;
    }

    if (request.type === "RECOVER_IDENTITY") {
        try {
            const uuid = request.uuid || request.payload.uuid; // Support both
            fetchWithRetry(`${CONFIG.API_BASE_URL}/recover_identity.php?uuid=${encodeURIComponent(uuid)}`)
               .then(res => res.json())
               .then(data => sendResponse({ success: true, data: data }))
               .catch(err => sendResponse({ success: false, error: err.message }));
        } catch (e) {
            sendResponse({ success: false, error: e.message });
        }
        return true;
    }

    if (request.type === "SEND_DEBUG_LOG") {
        const { message, system_info } = request.payload;
        
        const params = new URLSearchParams();
        params.append('message', message);
        params.append('system_info', system_info);
        params.append('version', chrome.runtime.getManifest().version);
        
        // Fire and forget, no retry needed strictly, but helpful.
        fetchWithRetry(`${CONFIG.API_BASE_URL}/log_debug.php`, {
            method: 'POST',
            body: params
        }, 1).catch(err => console.error("Failed to send debug log", err));
        
        return false; // No response needed
    }
});
