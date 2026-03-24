(function() {
    "use strict";

    window.SP = window.SP || {};
    
    let isFaucetActiveLocal = false;
    let faucetCheckTimer = null;

    window.SP.Faucet = {
        
        // AUDIT: Queries the server to check if the user is eligible for a BTC faucet claim, triggering the gold logo state.
        checkEligibility: function() {
            chrome.storage.local.get(['sp_public_id', 'sp_uuid', 'sp_flash_logo'], res => {
                if (res.sp_flash_logo === false) return; 
                if (!res.sp_public_id || !res.sp_uuid) return;

                const Config = window.SP.Config;
                
                fetch(`${Config.API_BASE_URL}/get_faucet_status.php?public_id=${res.sp_public_id}&uuid=${res.sp_uuid}&t=${Date.now()}`)
                .then(r => {
                    if (!r.ok) throw new Error("Server Error");
                    return r.json();
                })
                .then(status => {
                    if (!status) return;

                    // Defensive Checks
                    if (status.can_claim === true) {
                        // TRIGGER GOLD
                        isFaucetActiveLocal = true;
                        window.SP.UI.updateLogo(window.SP.LogoState.FAUCET_GOLD);
                    } else if (status.reason === 'wait_delay' && status.delay_remaining > 0) {
                        // Cheat System Delay
                        isFaucetActiveLocal = true; 
                        // Only log if pertinent to debugging
                        // window.SP.Log.info(`Faucet waiting ${status.delay_remaining}s (Cheat System)`);
                        
                        if(faucetCheckTimer) clearTimeout(faucetCheckTimer);
                        // FIX: Cap maximum delay to prevent memory issues with very long timers
                        const MAX_DELAY_SECONDS = 300; // 5 minutes max
                        const cappedDelay = Math.min(status.delay_remaining, MAX_DELAY_SECONDS);
                        faucetCheckTimer = setTimeout(() => {
                            faucetCheckTimer = null;
                            // Guard: if reset() was called while we were waiting, abort
                            if (!isFaucetActiveLocal) return;
                            window.SP.UI.updateLogo(window.SP.LogoState.FAUCET_GOLD);
                        }, cappedDelay * 1000);
                    } else {
                        isFaucetActiveLocal = false;
                        window.SP.UI.updateLogo(window.SP.LogoState.NORMAL);
                    }
                })
                .catch(e => {
                    // Silent Fail - do not disturb user
                    isFaucetActiveLocal = false;
                });
            });
        },

        // AUDIT: Resets the local faucet active state and clears any pending visual triggers.
        reset: function() {
            isFaucetActiveLocal = false;
            if(faucetCheckTimer) clearTimeout(faucetCheckTimer);
            window.SP.UI.updateLogo(window.SP.LogoState.NORMAL);
        },

        // AUDIT: Returns true if the faucet UI trigger is currently active for the user.
        isActive: function() {
            return isFaucetActiveLocal;
        },

        // AUDIT: Opens the external claim page for the user using their local storage identity parameters.
        claim: function() {
            chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
                // FIX: Validate identity before opening claim URL
                if (!res.sp_public_id || !res.sp_uuid) {
                    window.SP.Log.error("Cannot claim: missing identity");
                    alert("Error: Identity not found. Please refresh the page.");
                    return;
                }
                const claimUrl = `https://shadowpulse.live/claim.php?voter_id=${encodeURIComponent(res.sp_public_id)}&uuid=${encodeURIComponent(res.sp_uuid)}`;
                window.open(claimUrl, '_blank');
                this.reset();
            });
        }
    };

})();
