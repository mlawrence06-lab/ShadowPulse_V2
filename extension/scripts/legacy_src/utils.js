"use strict";

// Basic Logger
export function spLog(...args) {
  const ts = new Date().toISOString();
  console.log("[ShadowPulse]", ts, ...args);
}

// Debug Logger (Only shows if explicitly enabled in caller)
export function spDebug(isDebug, ...args) {
  if (!isDebug) return;
  const ts = new Date().toISOString();
  
  // Append OS/Browser/URL info for context
  const sysInfo = `[${navigator.platform} | ${navigator.userAgent} | ${window.location.href}]`;
  
  console.log("[ShadowPulse DEBUG]", ts, sysInfo, ...args);

  // Send to Backend (Fire and Forget)
  try {
      // Convert args to string
      const message = args.map(a => (typeof a === 'object') ? JSON.stringify(a) : String(a)).join(" ");
      
      chrome.runtime.sendMessage({
          type: "SEND_DEBUG_LOG",
          payload: {
              message: message,
              system_info: sysInfo
          }
      });
  } catch (e) {
      // Ignore errors in debug sender to prevent loops
  }
}

export function spError(...args) {
  const ts = new Date().toISOString();
  console.error("[ShadowPulse]", ts, ...args);
}

export function createEl(tag, classes = [], attrs = {}) {
  const el = document.createElement(tag);
  if (typeof classes === "string") {
    if (classes) el.className = classes;
  } else if (Array.isArray(classes) && classes.length) {
    el.className = classes.join(" ");
  }
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}
