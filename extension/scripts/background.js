// background.js - Service Worker
// Handles fetching to bypass CORS on Content Scripts

import { CONFIG } from './config.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "FETCH_STATS") {
        // Simple GET request with query param cache-busting.
        // Avoid adding custom headers to prevent triggering CORS Preflight (OPTIONS)
        fetch(CONFIG.STATS_URL + '?t=' + Date.now())
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

        fetch(`${CONFIG.API_BASE_URL}/vote_pulse.php`, {
            method: 'POST',
            body: params
        })
        .then(response => response.text()) // Read as text first to handle non-JSON
        .then(text => {
            try {
                const data = JSON.parse(text);
                
                // CASE 1: Standard JSON Success Object (PHP uses 'status': 'success')
                if (data && typeof data === 'object') {
                    if (data.status === 'success' || data.success === true) {
                        sendResponse({ success: true, data: data });
                        return;
                    }
                }

                // CASE 2: Explicit Failure
                if (data && typeof data === 'object') {
                    if (data.status === 'error' || data.success === false || data.error) {
                        sendResponse({ success: false, error: data.message || data.error || "Backend rejected" });
                        return;
                    }
                }

                // CASE 3: Numeric Response (Legacy "New Count" return)
                if (typeof data === 'number') {
                     sendResponse({ success: true, data: data });
                     return;
                }

                // CASE 4: String Response (Legacy "OK") treated as JSON string
                if (typeof data === 'string') {
                    const lower = data.toLowerCase();
                    if (lower.includes('error') || lower.includes('duplicate') || lower.includes('fail')) {
                         sendResponse({ success: false, error: data });
                    } else {
                         sendResponse({ success: true, data: data });
                    }
                    return;
                }

                // Fallback: If it's an object but has no 'success' key, assume it's data payload
                if (data && typeof data === 'object') {
                    sendResponse({ success: true, data: data });
                } else {
                    // Unknown JSON structure -> Fail safe? Or assume success?
                    // Let's safe-fail only on explicit error signals.
                    sendResponse({ success: true, data: data }); 
                }
            } catch (e) {
                // Not JSON - Legacy Text Response?
                // If text seems like a PHP Error or "Duplicate", treat as fail.
                const lower = text.toLowerCase();
                if (lower.includes('error') || lower.includes('duplicate') || lower.includes('fail')) {
                    sendResponse({ success: false, error: text });
                } else {
                    // Assume success if it's just "1", "OK", or empty (legacy)
                    sendResponse({ success: true, data: text });
                }
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

        fetch(`${CONFIG.API_BASE_URL}/track_view.php`, {
            method: 'POST',
            body: params
        })
        .then(response => response.json())
        .then(data => sendResponse({ success: true, data: data }))
        .catch(error => sendResponse({ success: false, error: error.message }));

        return true;
    }

    if (request.type === "GET_VOTE_STATUS") {
         const { msg_id } = request.payload;
         fetch(`${CONFIG.API_BASE_URL}/get_vote_status.php?msg_id=${msg_id}`)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
         
         return true;
    }

    if (request.type === "GET_USER_STATS") {
         const { voter_id } = request.payload;
         fetch(`${CONFIG.API_BASE_URL}/get_user_stats.php?voter_id=${voter_id}&t=${Date.now()}`)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
         
         return true;
    }

    if (request.type === "GET_LATEST_PULSE") {
        fetch(`${CONFIG.API_BASE_URL}/get_latest_pulse.php?t=${Date.now()}`)
           .then(res => res.json())
           .then(data => sendResponse({ success: true, data: data }))
           .catch(err => sendResponse({ success: false, error: err.message }));
        
        return true;
   }
});
