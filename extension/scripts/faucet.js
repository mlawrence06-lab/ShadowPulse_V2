(function() {
    "use strict";

    window.SP = window.SP || {};
    
    let isFaucetActiveLocal = false;
    let faucetCheckTimer = null;
    let faucetTimeoutTimer = null;
    const FAUCET_WINDOW_MS = 15000; // 15 seconds claim window

    window.SP.Faucet = {
        
        
        checkEligibility: function() {
            // Prevent multiple concurrent eligibility checks
            if (this._checkingEligibility) return;
            this._checkingEligibility = true;

            const done = () => { this._checkingEligibility = false; };
            
            chrome.storage.local.get(['sp_public_id', 'sp_uuid', 'sp_flash_logo'], res => {
                if (res.sp_flash_logo === false) { done(); return; }
                if (!res.sp_public_id || !res.sp_uuid) { done(); return; }

                chrome.runtime.sendMessage({
                    type: 'GET_FAUCET_STATUS',
                    payload: { public_id: res.sp_public_id, uuid: res.sp_uuid }
                }, result => {
                    if (!result || !result.success || !result.data) {
                        isFaucetActiveLocal = false;
                        done();
                        return;
                    }

                    const status = result.data;

                    // Defensive Checks
                    if (status.can_claim === true) {
                        // TRIGGER GOLD
                        isFaucetActiveLocal = true;
                        window.SP.UI.updateLogo(window.SP.LogoState.FAUCET_GOLD);

                        // Start claim window timer
                        if (faucetTimeoutTimer) clearTimeout(faucetTimeoutTimer);
                        faucetTimeoutTimer = setTimeout(() => {
                            faucetTimeoutTimer = null;
                            if (isFaucetActiveLocal) {
                                window.SP.Faucet.reset();
                            }
                        }, FAUCET_WINDOW_MS);
                    } else if (status.reason === 'wait_delay' && status.delay_remaining > 0) {
                        // Anti-Cheat System Delay
                        isFaucetActiveLocal = true;
                        // Clear any stale claim timeout when entering wait_delay
                        if (faucetTimeoutTimer) clearTimeout(faucetTimeoutTimer);
                        faucetTimeoutTimer = null;

                        if(faucetCheckTimer) clearTimeout(faucetCheckTimer);

                        const MAX_DELAY_SECONDS = 300; // 5 minutes max
                        const cappedDelay = Math.min(status.delay_remaining, MAX_DELAY_SECONDS);
                        faucetCheckTimer = setTimeout(() => {
                            faucetCheckTimer = null;
                            // Guard: if reset() was called while we were waiting, abort
                            if (!isFaucetActiveLocal) return;
                            // Re-validate with server before showing gold
                            window.SP.Faucet.checkEligibility();
                        }, cappedDelay * 1000);
                    } else {
                        isFaucetActiveLocal = false;
                        window.SP.UI.updateLogo(window.SP.LogoState.NORMAL);
                    }
                    done();
                });
            });
        },

        
        reset: function() {
            isFaucetActiveLocal = false;
            if(faucetCheckTimer) clearTimeout(faucetCheckTimer);
            if(faucetTimeoutTimer) clearTimeout(faucetTimeoutTimer);
            faucetCheckTimer = null;
            faucetTimeoutTimer = null;
            window.SP.UI.updateLogo(window.SP.LogoState.NORMAL);
        },

        
        isActive: function() {
            return isFaucetActiveLocal;
        },

        
        claim: function() {
            if (!isFaucetActiveLocal) {
                window.SP.Log.warn("Claim called while faucet is not active");
                return;
            }
            chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
                
                if (!res.sp_public_id || !res.sp_uuid) {
                    window.SP.Log.error("Cannot claim: missing identity");
                    alert("Error: Identity not found. Please refresh the page.");
                    return;
                }
                const baseUrl = window.SP.Config.API_BASE_URL.replace('/api', '');
                const claimUrl = `${baseUrl}/claim.php?voter_id=${encodeURIComponent(res.sp_public_id)}&uuid=${encodeURIComponent(res.sp_uuid)}`;
                window.open(claimUrl, '_blank');
                this.reset();
            });
        }
    };

})();
