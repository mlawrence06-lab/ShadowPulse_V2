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

    function init() {
         window.SP.Log.info("ShadowPulse v" + chrome.runtime.getManifest().version + " Initializing...");
         
         // 1. Inject UI
         window.SP.UI.injectFloatingBar();
         window.SP.UI.injectSearchTable();
         setTimeout(window.SP.UI.stripTrustScoreStyles, 500); // Delay slightly for page load

         // 2. Init Pulse (Buttons on Page)
         window.SP.Pulse.init();

         // 3. Start Heartbeat
         startHeartbeat();
    }

    async function startHeartbeat() {
        const Config = window.SP.Config;
        
        async function beat() {
            // Get User ID
            const pid = await window.SP.Utils.getState('sp_public_id');
            
            try {
                const res = await chrome.runtime.sendMessage({ 
                    type: "GET_LATEST_PULSE",
                    voter_id: pid 
                });

                if (res && res.data) {
                    // A. Dispatch Stats
                    if (res.data.price_stats) {
                        document.dispatchEvent(new CustomEvent('sp-heartbeat', { detail: res.data.price_stats }));
                    }

                    // B. Check Faucet (FAUCET_GOLD)
                    const val = res.data.btc_active;
                    const isBtc = val === 1 || val === "1" || val === true;
                    
                    if (isBtc) {
                        // Check Eligibility (Gold Logic)
                        if (!window.SP.Faucet.isActive()) {
                             window.SP.Faucet.checkEligibility();
                        }
                    } else {
                        window.SP.Faucet.reset();
                    }

                    // C. Check Pulse (PULSE_BLUE)
                    // ... (Logic for Ripple Effect)
                    // If new pulse ID > lastPulseId -> window.SP.UI.updateLogo(window.SP.LogoState.PULSE_BLUE);
                }
            } catch (e) {
                // Ignore BG errors
            }
        }

        setInterval(beat, Config.POLLING_INTERVAL);
        beat();
    }

})();
