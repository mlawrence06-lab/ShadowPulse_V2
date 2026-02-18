(function() {
    "use strict";

    window.SP = window.SP || {};
    
    let isFaucetActiveLocal = false;
    let faucetCheckTimer = null;

    window.SP.Faucet = {
        
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
                        faucetCheckTimer = setTimeout(() => {
                            window.SP.UI.updateLogo(window.SP.LogoState.FAUCET_GOLD);
                        }, status.delay_remaining * 1000);
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

        reset: function() {
            isFaucetActiveLocal = false;
            if(faucetCheckTimer) clearTimeout(faucetCheckTimer);
            window.SP.UI.updateLogo(window.SP.LogoState.NORMAL);
        },

        isActive: function() {
            return isFaucetActiveLocal;
        },

        claim: function() {
            chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
                const claimUrl = `https://shadowpulse.live/claim.php?voter_id=${res.sp_public_id}&uuid=${res.sp_uuid}`;
                window.open(claimUrl, '_blank');
                this.reset();
            });
        }
    };

})();
