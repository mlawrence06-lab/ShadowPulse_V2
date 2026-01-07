"use strict";

export function spLog(...args) {
  const ts = new Date().toISOString();
  console.log("[ShadowPulse V2]", ts, ...args);
}

export function spError(...args) {
  const ts = new Date().toISOString();
  console.error("[ShadowPulse V2]", ts, ...args);
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
