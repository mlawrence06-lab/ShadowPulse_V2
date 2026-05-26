(function() {
    "use strict";

    window.SP = window.SP || {};

    const FAUCET_WINDOW_MS = 60000;
    const CHECK_TIMEOUT_MS = 10000;

    window.SP.Faucet = {
        _checkTimer: null,
        _windowTimer: null,
        _safetyTimer: null,
        _retryCount: 0,
        MAX_RETRIES: 3,

        checkEligibility: function() {
            const State = window.SP.State;
            const Logger = window.SP.Logger;

            if (State.getFaucetState() === State.Faucet.CHECKING) {
                return;
            }

            State.setFaucetState(State.Faucet.CHECKING);

            this._clearSafetyTimer();
            this._safetyTimer = setTimeout(() => {
                if (State.getFaucetState() === State.Faucet.CHECKING) {
                    Logger.error('[Faucet] Eligibility check timed out after', CHECK_TIMEOUT_MS, 'ms');
                    this._retryCount++;
                    if (this._retryCount >= this.MAX_RETRIES) {
                        Logger.error('[Faucet] Max retries exceeded, giving up');
                        State.setFaucetState(State.Faucet.ERROR, { reason: 'max_retries' });
                        this._retryCount = 0;
                    } else {
                        State.setFaucetState(State.Faucet.ERROR, { reason: 'timeout', retry: this._retryCount });
                    }
                }
            }, CHECK_TIMEOUT_MS);

            chrome.storage.local.get(['sp_public_id', 'sp_uuid', 'sp_flash_logo'], res => {
                this._clearSafetyTimer();

                if (chrome.runtime.lastError) {
                    Logger.error('[Faucet] Storage error:', chrome.runtime.lastError.message);
                    State.setFaucetState(State.Faucet.ERROR, { reason: 'storage_error' });
                    return;
                }

                try {
                    if (!res) {
                        Logger.error('[Faucet] Storage returned null');
                        State.setFaucetState(State.Faucet.IDLE);
                        return;
                    }

                    if (res.sp_flash_logo === false) {
                        Logger.warn('[Faucet] Flash disabled by user');
                        State.setFaucetState(State.Faucet.IDLE);
                        return;
                    }

                    if (!res.sp_uuid) {
                        Logger.warn('[Faucet] Missing UUID');
                        State.setFaucetState(State.Faucet.IDLE);
                        return;
                    }

                    chrome.runtime.sendMessage({
                        type: 'GET_FAUCET_STATUS',
                        payload: { public_id: res.sp_public_id || '', uuid: res.sp_uuid }
                    }, result => {
                        this._handleStatusResponse(result);
                    });
                } catch (e) {
                    Logger.error('[Faucet] Exception during check:', e);
                    State.setFaucetState(State.Faucet.ERROR, { reason: 'exception', error: e.message });
                }
            });
        },

        _handleStatusResponse: function(result) {
            const State = window.SP.State;
            const Logger = window.SP.Logger;

            if (chrome.runtime.lastError) {
                Logger.error('[Faucet] Background error:', chrome.runtime.lastError.message);
                State.setFaucetState(State.Faucet.ERROR, { reason: 'bg_error' });
                return;
            }

            if (!result || !result.success || !result.data) {
                Logger.warn('[Faucet] Invalid BG response:', result);
                State.setFaucetState(State.Faucet.IDLE);
                return;
            }

            const status = result.data;

            // Reset retry count on successful response
            this._retryCount = 0;

            if (status.can_claim === true || status.can_claim === 1 || status.can_claim === '1') {
                State.setFaucetState(State.Faucet.ACTIVE, status);
                this._startWindowTimer();
            } else if (status.reason === 'already_claimed') {
                State.setFaucetState(State.Faucet.CLAIMED, status);
            } else if (status.reason === 'window_closed') {
                State.setFaucetState(State.Faucet.CLOSED, status);
            } else if (status.reason === 'not_triggered') {
                State.setFaucetState(State.Faucet.IDLE, status);
            } else if (status.error) {
                Logger.error('[Faucet] Server error:', status.error);
                State.setFaucetState(State.Faucet.ERROR, status);
            } else {
                Logger.warn('[Faucet] Unexpected status:', status);
                State.setFaucetState(State.Faucet.IDLE, status);
            }
        },

        _startWindowTimer: function() {
            this._clearWindowTimer();
            this._windowTimer = setTimeout(() => {
                window.SP.State.setFaucetState(window.SP.State.Faucet.CLOSED, { reason: 'timer_expired' });
            }, FAUCET_WINDOW_MS);
        },

        _clearSafetyTimer: function() {
            if (this._safetyTimer) { clearTimeout(this._safetyTimer); this._safetyTimer = null; }
        },
        _clearWindowTimer: function() {
            if (this._windowTimer) { clearTimeout(this._windowTimer); this._windowTimer = null; }
        },
        _clearCheckTimer: function() {
            if (this._checkTimer) { clearTimeout(this._checkTimer); this._checkTimer = null; }
        },

        reset: function() {
            this._clearSafetyTimer();
            this._clearWindowTimer();
            this._clearCheckTimer();
            this._retryCount = 0;
            window.SP.State.reset();
        },

        claim: function() {
            const State = window.SP.State;
            const Logger = window.SP.Logger;
            const current = State.getFaucetState();

            if (current !== State.Faucet.ACTIVE) {
                Logger.warn('[Faucet] Claim called but state is:', current);
                return;
            }

            chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
                if (chrome.runtime.lastError || !res || !res.sp_uuid) {
                    Logger.error('[Faucet] Cannot claim: missing identity');
                    return;
                }


                chrome.runtime.sendMessage({
                    type: 'CREATE_CLAIM_TOKEN',
                    payload: { voter_id: res.sp_public_id || '', uuid: res.sp_uuid }
                }, resp => {
                    if (chrome.runtime.lastError) {
                        Logger.error('[Faucet] Token creation error:', chrome.runtime.lastError.message);
                        return;
                    }
                    if (resp && resp.success && resp.data && resp.data.status === 'success' && resp.data.token) {
                        const baseUrl = window.SP.Config.API_BASE_URL.replace('/api', '');
                        const claimUrl = `${baseUrl}/claim.php?token=${encodeURIComponent(resp.data.token)}`;
                        chrome.runtime.sendMessage({ type: 'OPEN_TAB', payload: { url: claimUrl } });
                        this.reset();
                    } else {
                        Logger.error('[Faucet] Failed to create claim token:', resp);
                    }
                });
            });
        }
    };

})();
