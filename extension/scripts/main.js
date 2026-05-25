(function () {
  "use strict";

  const Logger = window.SP.Logger;

  // Global Error Handlers
  window.addEventListener("error", (event) => {
    Logger.error('Fatal Error:', event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    Logger.error('Unhandled Promise Rejection:', event.reason);
  });

  // Wait for Body
  let bodyCheckAttempts = 0;
  const MAX_BODY_CHECK_ATTEMPTS = 200;
  const waitForBody = setInterval(() => {
    bodyCheckAttempts++;
    if (document.body) {
      clearInterval(waitForBody);
      init();
    } else if (bodyCheckAttempts >= MAX_BODY_CHECK_ATTEMPTS) {
      clearInterval(waitForBody);
      Logger.error('Failed to initialize: document.body not found after 10 seconds');
    }
  }, 50);

  function init() {
    // Clean up any stale extension UI from previous loads or older versions
    document.getElementById('sp-search-table')?.remove();
    document.getElementById('sp-floating-bar-root')?.remove();
    document.getElementById('sp-settings-root')?.remove();

    Logger.info('ShadowPulse v' + chrome.runtime.getManifest().version + ' Initializing...');

    // Set up state subscriptions before anything else runs
    setupStateSubscriptions();

    // 1. Inject UI
    window.SP.UI.injectFloatingBar();
    window.SP.UI.injectSearchTable();
    setTimeout(() => {
        if (window.SP.UI.stripTrustScoreStyles) window.SP.UI.stripTrustScoreStyles();
        if (window.SP.UI.fixTrustPageColors) window.SP.UI.fixTrustPageColors();
    }, 500);

    // 2. Init Pulse (Buttons on Page)
    window.SP.Pulse.init();

    // 3. Ensure Identity, then start Heartbeat
    ensureIdentity().then(() => {
      startHeartbeat();
    });
  }

  function setupStateSubscriptions() {
    const State = window.SP.State;

    // Bridge faucet state to logo state so the gold logo appears when faucet is active
    State.on('faucet:changed', (evt) => {
      const metaStr = evt.meta && Object.keys(evt.meta).length ? '| meta=' + JSON.stringify(evt.meta) : '';
      Logger.info('[State] Faucet:', evt.from, '→', evt.to, metaStr);

      if (evt.to === State.Faucet.ACTIVE) {
        State.setLogoState(State.Logo.FAUCET_GOLD);
      } else if (evt.from === State.Faucet.ACTIVE &&
                 (evt.to === State.Faucet.IDLE ||
                  evt.to === State.Faucet.CLOSED ||
                  evt.to === State.Faucet.CLAIMED)) {
        State.setLogoState(State.Logo.NORMAL);
      }
    });

    State.on('logo:changed', (evt) => {
      Logger.info('[State] Logo:', evt.from, '→', evt.to);
    });
  }

  async function ensureIdentity() {
    const Utils = window.SP.Utils;
    let pid, uuid;
    try {
      pid = await Utils.getState("sp_public_id");
    } catch (e) {
      Logger.error('ensureIdentity: failed to read public_id:', e);
    }
    try {
      uuid = await Utils.getState("sp_uuid");
    } catch (e) {
      Logger.error('ensureIdentity: failed to read uuid:', e);
    }
    const updates = {};
    if (!uuid) updates.sp_uuid = Utils.generateUUID();
    if (!pid) updates.sp_public_id = Utils.generateRandomId();
    if (Object.keys(updates).length > 0) {
      try {
        await Utils.setLocalState(updates);
        Logger.info('Identity generated:', Object.keys(updates));
      } catch (e) {
        Logger.error('ensureIdentity: failed to save identity:', e);
      }
    }
  }

  function startHeartbeat() {
    const Config = window.SP.Config;
    let lastPulseTs = -1;
    let isBeating = false;
    let nextTimer = null;
    let beatScheduled = false;
    let active = false;

    async function doBeat() {
      if (document.visibilityState === 'hidden') return;
      if (isBeating) {
        Logger.warn('[Heartbeat] Skipping: previous beat still running');
        return;
      }

      isBeating = true;
      try {
        const pid = await window.SP.Utils.getState('sp_public_id');

        const res = await Promise.race([
          chrome.runtime.sendMessage({
            type: 'GET_LATEST_PULSE',
            voter_id: pid,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Background message timeout')), 15000)
          )
        ]);

        if (!res || !res.data) {
          Logger.warn('[Heartbeat] Background returned no data');
          return;
        }

        const data = res.data;

        // Stats
        if (data.price_stats) {
          try {
            document.dispatchEvent(
              new CustomEvent('sp-heartbeat', { detail: data.price_stats })
            );
          } catch (err) {
            Logger.error('[Heartbeat] Stats dispatch error:', err);
          }
        }

        const newPulseTs = parseFloat(data.last_pulse) || 0;
        const lastPulseBy = data.last_pulse_by;

        // Faucet
        try {
          const isBtc = data.btc_active === 1 || data.btc_active === '1' || data.btc_active === true;
          const faucetState = window.SP.State.getFaucetState();

          if (isBtc) {
            Logger.info('[Heartbeat] btc_active=true');
            if (faucetState === window.SP.State.Faucet.IDLE ||
                faucetState === window.SP.State.Faucet.CLOSED ||
                faucetState === window.SP.State.Faucet.CLAIMED ||
                faucetState === window.SP.State.Faucet.ERROR) {
              window.SP.Faucet.checkEligibility();
            }
          } else if (faucetState !== window.SP.State.Faucet.IDLE) {
            Logger.info('[Heartbeat] btc_active=false, resetting faucet');
            window.SP.Faucet.reset();
          }
        } catch (err) {
          Logger.error('[Heartbeat] Faucet check error:', err);
        }

        // Pulse flash
        try {
          if (lastPulseTs >= 0 && newPulseTs > lastPulseTs) {
            if (String(lastPulseBy) !== String(pid)) {
              Logger.info('[Heartbeat] New pulse from', lastPulseBy, 'msg_id=', data.msg_id);
              window.SP.State.setLogoState(window.SP.State.Logo.PULSE_BLUE);
              window.SP.Pulse.flashPulseButton(data.msg_id);
            } else {
              Logger.info('[Heartbeat] Pulse from self ignored');
            }
          }
          lastPulseTs = newPulseTs;
          Logger.info('[Heartbeat] Pulse baseline updated:', lastPulseTs);
        } catch (err) {
          Logger.error('[Heartbeat] Pulse check error:', err);
        }
      } catch (e) {
        Logger.error('[Heartbeat] Failed:', e.message || e);
      } finally {
        isBeating = false;
      }
    }

    function scheduleNext() {
      if (!active || beatScheduled) return;
      beatScheduled = true;
      nextTimer = setTimeout(() => {
        beatScheduled = false;
        doBeat().finally(() => {
          if (active) scheduleNext();
        });
      }, Config.POLLING_INTERVAL);
    }

    function start() {
      if (active) return;
      active = true;
      doBeat().finally(() => {
        if (active) scheduleNext();
      });
    }

    function stop() {
      active = false;
      beatScheduled = false;
      if (nextTimer) {
        clearTimeout(nextTimer);
        nextTimer = null;
      }
    }

    start();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    });
  }
})();
