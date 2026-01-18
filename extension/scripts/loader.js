"use strict";
(async () => {
  try {
    const mainUrl = chrome.runtime.getURL("scripts/main.js");
    // Dynamically import the module
    const MainModule = await import(mainUrl);
    // Explicitly call init found in the module
    if (MainModule && MainModule.init) {
      MainModule.init();
    } else {
      console.error("[ShadowPulse] main.js loaded but 'init' is missing.");
    }
  } catch (err) {
    console.error("[ShadowPulse] FAILED TO LOAD main.js", err);
  }
})();
