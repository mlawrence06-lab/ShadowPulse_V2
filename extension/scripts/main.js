(function() {
    "use strict";

    // Main Entry Point
    // Orchestrates loading
    
    // Wait for Body
    const waitForBody = setInterval(() => {
        if (document.body) {
            clearInterval(waitForBody);
            init();
        }
    }, 50);

    // AUDIT: Bootstraps the visual UI, logic hooks, and underlying identity/heartbeat loops on page load.
    function init() {
         window.SP.Log.info("ShadowPulse v" + chrome.runtime.getManifest().version + " Initializing...");
         
         // 1. Inject UI
         window.SP.UI.injectFloatingBar();
         window.SP.UI.injectSearchTable();
         setTimeout(window.SP.UI.stripTrustScoreStyles, 500); // Delay slightly for page load
         setTimeout(window.SP.UI.fixTrustPageColors, 500);

         // 2. Init Pulse (Buttons on Page)
         window.SP.Pulse.init();

         // 2b. Ensure Identity (Fix for Fresh Installs/Android)
         ensureIdentity().then(() => {
             // 3. Start Heartbeat
             startHeartbeat();
         });
    }

    // AUDIT: Generates or retrieves unique identifiers for the user to securely interact with the backend APIs.
    async function ensureIdentity() {
        const Utils = window.SP.Utils;
        const pid = await Utils.getState('sp_public_id');
        const uuid = await Utils.getState('sp_uuid');
        
        const updates = {};
        if (!uuid) updates.sp_uuid = Utils.generateUUID();
        if (!pid) updates.sp_public_id = Utils.generateRandomId(); 
        
        if (Object.keys(updates).length > 0) {
            await Utils.setLocalState(updates);
            window.SP.Log.info("Identity Generated:", updates);
        }
    }

    // AUDIT: Initiates a recurring loop to pull user-specific statistics, pulses, and faucet status.
    async function startHeartbeat() {
        const Config = window.SP.Config;
        let lastPulseTs = 0;
        
        // AUDIT: Fires a safe background message to query the state API without triggering CORS faults.
        async function beat() {
            // Get User ID
            const pid = await window.SP.Utils.getState('sp_public_id');
            
            try {
                const res = await chrome.runtime.sendMessage({ 
                    type: "GET_LATEST_PULSE",
                    voter_id: pid 
                });

                if (res && res.data) {
                    const data = res.data;

                    // A. Dispatch Stats (Isolated)
                    try {
                        if (data.price_stats) {
                            document.dispatchEvent(new CustomEvent('sp-heartbeat', { detail: data.price_stats }));
                        }
                    } catch (err) { }


                    // B+C shared context: read pulse identity once so both sections can exclude the sender
                    const newPulseTs = parseFloat(data.last_pulse) || 0;
                    const lastPulseBy = data.last_pulse_by;

                    // B. Check Faucet (FAUCET_GOLD) (Isolated)
                    try {
                        // Defensive Type Check for 'btc_active'
                        const val = data.btc_active;
                        const isBtc = val === 1 || val === "1" || val === true;
                        
                        if (isBtc) {
                            // Only trigger faucet for OTHER users — suppress for the sender to prevent cheating
                            if (!window.SP.Faucet.isActive() && lastPulseBy !== pid) {
                                 window.SP.Faucet.checkEligibility();
                            }
                        } else {
                            window.SP.Faucet.reset();
                        }
                    } catch (err) { }

                    // C. Check Pulse (PULSE_BLUE) (Isolated)
                    try {
                        if (lastPulseTs !== 0 && newPulseTs > lastPulseTs) {
                             // New Pulse Detected!
                             if (lastPulseBy !== pid) {
                                 window.SP.UI.updateLogo(window.SP.LogoState.PULSE_BLUE);
                             }
                        }
                        
                        // Update State: use timestamp so same-post and older-post pulses are always detected
                        if (newPulseTs > 0) lastPulseTs = newPulseTs;
                    } catch (err) { }
                }
            } catch (e) {
                // Ignore BG errors
            }
        }

        setInterval(beat, Config.POLLING_INTERVAL);
        beat();
    }

})();
