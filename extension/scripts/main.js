(function () {
  "use strict";

  // Main Entry Point
  // Orchestrates loading

  // Global Error Handlers
  window.addEventListener("error", (event) => {
    if (window.SP.Config.DEBUG) console.error("[ShadowPulse Fatal Error]", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (window.SP.Config.DEBUG) console.error("[ShadowPulse Unhandled Promise Rejection]", event.reason);
  });

  // Wait for Body
  
  let bodyCheckAttempts = 0;
  const MAX_BODY_CHECK_ATTEMPTS = 200; // 10 seconds max (200 * 50ms)
  const waitForBody = setInterval(() => {
    bodyCheckAttempts++;
    if (document.body) {
      clearInterval(waitForBody);
      init();
    } else if (bodyCheckAttempts >= MAX_BODY_CHECK_ATTEMPTS) {
      clearInterval(waitForBody);
      if (window.SP.Config.DEBUG) console.error("[ShadowPulse] Failed to initialize: document.body not found after 10 seconds");
    }
  }, 50);

  
  function init() {
    // Clean up any stale extension UI from previous loads or older versions
    document.getElementById('sp-search-table')?.remove();
    document.getElementById('sp-floating-bar-root')?.remove();
    document.getElementById('sp-settings-root')?.remove();

    window.SP.Log.info(
      "ShadowPulse v" +
        chrome.runtime.getManifest().version +
        " Initializing...",
    );

    // 1. Inject UI
    window.SP.UI.injectFloatingBar();
    window.SP.UI.injectSearchTable();
    setTimeout(() => {
        if (window.SP.UI.stripTrustScoreStyles) window.SP.UI.stripTrustScoreStyles();
        if (window.SP.UI.fixTrustPageColors) window.SP.UI.fixTrustPageColors();
    }, 500);

    // 2. Init Pulse (Buttons on Page)
    window.SP.Pulse.init();

    // 2b. Ensure Identity (Fix for Fresh Installs/Android)
    ensureIdentity().then(() => {
      // 3. Start Heartbeat
      startHeartbeat();
    });
  }

  
  async function ensureIdentity() {
    try {
      const Utils = window.SP.Utils;
      const pid = await Utils.getState("sp_public_id");
      const uuid = await Utils.getState("sp_uuid");

      const updates = {};
      if (!uuid) updates.sp_uuid = Utils.generateUUID();
      if (!pid) updates.sp_public_id = Utils.generateRandomId();

      if (Object.keys(updates).length > 0) {
        await Utils.setLocalState(updates);
        if (window.SP.Config.DEBUG) window.SP.Log.info("Identity Generated:", updates);
      }
    } catch (e) {
      if (window.SP.Config.DEBUG) window.SP.Log.error("ensureIdentity failed:", e);
    }
  }

  
  async function startHeartbeat() {
    const Config = window.SP.Config;
    let lastPulseTs = 0;

    async function beat() {
      // Pause heartbeat if the tab is backgrounded to prevent resource exhaustion and mobile crash
      if (document.visibilityState === "hidden") return;

      // Get User ID
      const pid = await window.SP.Utils.getState("sp_public_id");

      try {
        const res = await chrome.runtime.sendMessage({
          type: "GET_LATEST_PULSE",
          voter_id: pid,
        });

        if (res && res.data) {
          const data = res.data;

          // A. Dispatch Stats (Isolated)
          try {
            if (data.price_stats) {
              document.dispatchEvent(
                new CustomEvent("sp-heartbeat", { detail: data.price_stats }),
              );
            }
          } catch (err) {
            if (Config.DEBUG) console.error("[ShadowPulse Heartbeat Error - Stats]", err);
          }

          // B+C shared context: read pulse identity once so both sections can exclude the sender
          const newPulseTs = parseFloat(data.last_pulse) || 0;
          const lastPulseBy = data.last_pulse_by;

          // B. Check Faucet (FAUCET_GOLD) (Isolated)
          try {
            // Defensive Type Check for 'btc_active'
            const val = data.btc_active;
            const isBtc = val === 1 || val === "1" || val === true;

            if (isBtc) {
              // Faucet is time-based; all eligible users see it
              if (!window.SP.Faucet.isActive()) {
                window.SP.Faucet.checkEligibility();
              }
            } else {
              window.SP.Faucet.reset();
            }
          } catch (err) {
            if (Config.DEBUG) console.error("[ShadowPulse Heartbeat Error - Faucet]", err);
          }

          // C. Check Pulse (PULSE_BLUE) (Isolated)
          try {
            if (lastPulseTs !== 0 && newPulseTs > lastPulseTs) {
              // New Pulse Detected!
              // Server is the source of truth: skip if we were the last pinger
              if (String(lastPulseBy) !== String(pid)) {
                window.SP.UI.updateLogo(window.SP.LogoState.PULSE_BLUE);
                window.SP.Pulse.flashPulseButton(data.msg_id);
              }
            }

            // Update State: use timestamp so same-post and older-post pulses are always detected
            if (newPulseTs > 0) lastPulseTs = newPulseTs;
          } catch (err) {
            if (Config.DEBUG) console.error("[ShadowPulse Heartbeat Error - Pulse]", err);
          }
        }
      } catch (e) {
        // Ignore BG errors
        if (Config.DEBUG) {
          console.warn("[ShadowPulse Heartbeat Warning - BG Fetch]", e);
        }
      }
    }

    let heartbeatInterval = null;

    function startHeartbeatLoop() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(beat, Config.POLLING_INTERVAL);
        beat();
    }

    function stopHeartbeatLoop() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    startHeartbeatLoop();
    
    // Pause or Resume polling immediately when the user leaves or returns to the tab
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            startHeartbeatLoop();
        } else {
            stopHeartbeatLoop();
        }
    });
  }
})();
