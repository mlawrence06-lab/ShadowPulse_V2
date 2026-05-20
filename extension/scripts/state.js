(function() {
    "use strict";

    window.SP = window.SP || {};

    // --- EVENT EMITTER ---
    const listeners = {};

    function on(event, handler) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
    }

    function off(event, handler) {
        if (!listeners[event]) return;
        const idx = listeners[event].indexOf(handler);
        if (idx !== -1) listeners[event].splice(idx, 1);
    }

    function emit(event, data) {
        if (!listeners[event]) return;
        listeners[event].forEach(h => {
            try { h(data); } 
            catch(e) { console.error('[ShadowPulse State] Handler error for', event, ':', e); }
        });
    }

    // --- STATE CONSTANTS ---
    const FaucetState = {
        IDLE: 'idle',
        CHECKING: 'checking',
        ACTIVE: 'active',
        DELAYED: 'delayed',
        CLAIMED: 'claimed',
        CLOSED: 'closed',
        ERROR: 'error'
    };

    const LogoState = {
        NORMAL: 'normal',
        PULSE_BLUE: 'pulse_blue',
        FAUCET_GOLD: 'faucet_gold'
    };

    // --- INTERNAL STATE ---
    let currentFaucet = FaucetState.IDLE;
    let currentLogo = LogoState.NORMAL;
    let faucetMeta = {};

    window.SP.State = {
        Faucet: FaucetState,
        Logo: LogoState,

        on: on,
        off: off,

        getFaucetState: function() { return currentFaucet; },
        getLogoState: function() { return currentLogo; },
        getFaucetMeta: function() { return Object.assign({}, faucetMeta); },

        setFaucetState: function(state, meta) {
            if (currentFaucet === state && !meta) return;
            const oldState = currentFaucet;
            currentFaucet = state;
            faucetMeta = meta || {};
            emit('faucet:changed', { from: oldState, to: state, meta: faucetMeta });
        },

        setLogoState: function(state) {
            if (currentLogo === state) return;
            const oldState = currentLogo;
            currentLogo = state;
            emit('logo:changed', { from: oldState, to: state });
        },

        reset: function() {
            const oldState = currentFaucet;
            currentFaucet = FaucetState.IDLE;
            faucetMeta = {};
            emit('faucet:changed', { from: oldState, to: FaucetState.IDLE, meta: {} });
        },

        isFaucetActive: function() {
            return currentFaucet === FaucetState.ACTIVE || 
                   currentFaucet === FaucetState.DELAYED;
        }
    };
})();
