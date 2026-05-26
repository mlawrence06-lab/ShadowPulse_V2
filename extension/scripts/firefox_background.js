// background.js - Background Script for Firefox
// Handles fetching to bypass CORS on Content Scripts

// Firefox-compatible CONFIG (embedded instead of imported)
const CONFIG = {
    API_BASE_URL: "https://shadowpulse.live/api",
    BASE_URL: "https://shadowpulse.live",
    STATS_URL: "https://shadowpulsev2.b-cdn.net/stats.json",
    POLLING_INTERVAL: 5000,
    FLASH_COOLDOWN: 5000,
    DEBUG: false
};

// Global Error Handlers (Background Script)
self.addEventListener('error', (event) => {
    if (CONFIG.DEBUG) console.error('[ShadowPulse Background Script Fatal Error]', event.error || event.message);
});
self.addEventListener('unhandledrejection', (event) => {
    if (CONFIG.DEBUG) console.error('[ShadowPulse Background Script Unhandled Promise Rejection]', event.reason);
});

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
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


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
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

        if (request.type === "GET_FAUCET_STATUS") {
            const { public_id, uuid } = request.payload || {};
            fetchWithRetry(`${CONFIG.API_BASE_URL}/get_faucet_status.php?public_id=${encodeURIComponent(public_id)}&uuid=${encodeURIComponent(uuid)}&t=${Date.now()}`, {}, 1)
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

        if (request.type === "SAVE_USER_SETTINGS") {
            const payload = request.payload || {};
            const params = new URLSearchParams();
            Object.keys(payload).forEach(key => {
                if (payload[key] !== undefined && payload[key] !== null) {
                    params.append(key, typeof payload[key] === 'object' ? JSON.stringify(payload[key]) : payload[key]);
                }
            });
            fetchWithRetry(`${CONFIG.API_BASE_URL}/save_user_settings.php`, {
                method: 'POST', body: params
            })
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (request.type === "REGISTER_IDENTITY") {
            const { public_id, uuid, btc_address } = request.payload || {};
            const params = new URLSearchParams();
            params.append('public_id', public_id || '');
            params.append('uuid', uuid || '');
            params.append('btc_address', btc_address || '');

            fetchWithRetry(`${CONFIG.API_BASE_URL}/register_identity.php`, {
                method: 'POST', body: params
            })
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.type === "CREATE_CLAIM_TOKEN") {
            const { voter_id, uuid } = request.payload || {};
            const params = new URLSearchParams();
            params.append('voter_id', voter_id || '');
            params.append('uuid', uuid || '');

            fetchWithRetry(`${CONFIG.API_BASE_URL}/create_claim_token.php`, {
                method: 'POST', body: params
            })
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.type === "CREATE_ACTIVITY_TOKEN") {
            const { uuid } = request.payload || {};
            const params = new URLSearchParams();
            params.append('uuid', uuid || '');

            fetchWithRetry(`${CONFIG.API_BASE_URL}/create_activity_token.php`, {
                method: 'POST', body: params
            })
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        if (request.type === "OPEN_TAB") {
            const { url } = request.payload || {};
            if (url) {
                chrome.tabs.create({ url: url }, () => {
                    if (chrome.runtime.lastError) {
                        // ignore tab creation errors
                    }
                });
            }
            sendResponse({ success: true });
            return false;
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
        if (CONFIG.DEBUG) console.error("CRITICAL BACKGROUND ERROR", criticalError);
        sendResponse({ success: false, error: "Critical Extension Error: " + (criticalError.message || criticalError) });
    }
});
