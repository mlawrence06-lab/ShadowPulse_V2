"use strict";
(async () => {
  try {
    const mainUrl = chrome.runtime.getURL("scripts/main.js");
    await import(mainUrl);
  } catch (err) {
    console.error("[ShadowPulse] FAILED TO LOAD main.js", err);
  }
})();
