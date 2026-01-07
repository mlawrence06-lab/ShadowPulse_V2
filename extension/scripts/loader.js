"use strict";
(async () => {
  try {
    const mainUrl = chrome.runtime.getURL("scripts/main.js");
    await import(mainUrl);
  } catch (err) {
    console.error("[ShadowPulse V2] FAILED TO LOAD main.js", err);
  }
})();
