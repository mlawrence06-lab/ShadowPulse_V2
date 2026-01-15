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
         const { msg_id, msg_ids } = request.payload;
         let url = `${CONFIG.API_BASE_URL}/get_vote_status.php`;
         
         if (msg_ids) {
             url += `?msg_ids=${msg_ids}`;
         } else if (msg_id) {
             url += `?msg_id=${msg_id}`;
         }
         
         fetch(url)
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
