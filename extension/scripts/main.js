"use strict";

import { spLog, createEl } from "./utils.js";
import {
  injectFloatingBar,
  injectSearchTable,
  openSettingsModal,
  setLogoState,
} from "./ui.js";
import { generateRandomId } from "./words.js";
import { CONFIG } from "./config.js";

// State
let lastPulseTimestamp = 0;
let lastFlashTime = 0;
let lastSelfPulseTime = 0;
let lastGlobalPulseTime = 0;
let userPublicId = null;
let userUuid = null;

// Settings Cache
const SETTINGS = {
  sp_show_pulse: true,
  sp_flash_logo: true,
};

function stripTrustScoreStyles() {
  const scores = document.querySelectorAll(".trustscore");
  scores.forEach((el) => el.removeAttribute("style"));
}

function init() {
  spLog("Initializing ShadowPulse...");

  chrome.storage.local.get(
    [
      "sp_show_pulse",
      "sp_flash_logo",
      "sp_theme",
      "sp_custom_light",
      "sp_custom_dark",
      "sp_custom_theme",
    ],
    (res) => {
      if (res.sp_show_pulse !== undefined)
        SETTINGS.sp_show_pulse = res.sp_show_pulse;
      if (res.sp_flash_logo !== undefined)
        SETTINGS.sp_flash_logo = res.sp_flash_logo;

      let theme = res.sp_theme || "light";
      if (theme === "custom") {
        theme = "dark";
        if (!res.sp_custom_dark && res.sp_custom_theme) {
          res.sp_custom_dark = res.sp_custom_theme;
        }
      }

      const profileVars =
        theme === "light" ? res.sp_custom_light : res.sp_custom_dark;
      document.body.removeAttribute("style");
      document.documentElement.setAttribute("data-sp-theme", theme);
      localStorage.setItem("sp_theme_sync", theme);

      if (profileVars) {
        Object.keys(profileVars).forEach((key) => {
          const varName = key.startsWith("--")
            ? key
            : `--sp-forum-${key.replace("_", "-")}`;
          document.body.style.setProperty(varName, profileVars[key]);
        });
        document.documentElement.setAttribute("data-sp-theme", "custom");
      }

      initUserId().then(() => {
        stripTrustScoreStyles();
        injectPulseButtons();
        injectFloatingBar();
        injectSearchTable();

        // Track View
        const topicMatch = window.location.href.match(/topic=(\d+)/);
        const boardMatch = window.location.href.match(/board=(\d+)/);

        if (topicMatch) {
          if (window.location.href.includes("action=")) return;
          const tId = topicMatch[1];
          const meta = getPageData();

          chrome.runtime.sendMessage({
            type: "TRACK_VIEW",
            payload: {
              topic_id: tId,
              voter_id: userPublicId,
              uuid: userUuid,
              board_id: meta.boardId,
              topic_title: meta.topicTitle,
            },
          });
        } else if (boardMatch) {
          const bId = boardMatch[1];
          let bTitle = document.title.replace(" - Bitcoin Forum", "").trim();

          chrome.runtime.sendMessage({
            type: "TRACK_VIEW",
            payload: {
              board_id: bId,
              voter_id: userPublicId,
              uuid: userUuid,
              is_board_view: true,
              board_title: bTitle,
            },
          });
        }

        // Start Polling
        startPulsePolling();
      });
    }
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.sp_show_pulse)
        SETTINGS.sp_show_pulse = changes.sp_show_pulse.newValue;
      if (changes.sp_flash_logo)
        SETTINGS.sp_flash_logo = changes.sp_flash_logo.newValue;
    }
  });
}

async function initUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sp_public_id", "sp_uuid"], (res) => {
      if (!res.sp_public_id) {
        const newId = generateRandomId();
        const uuid = crypto.randomUUID();
        spLog("Generated new ID:", newId);
        chrome.storage.local.set(
          {
            sp_public_id: newId,
            sp_uuid: uuid,
          },
          () => {
            userPublicId = newId;
            userUuid = uuid;
            resolve();
          }
        );
      } else {
        userPublicId = res.sp_public_id;
        spLog("Loaded ID:", userPublicId);
        if (res.sp_uuid) {
          userUuid = res.sp_uuid;
        }
        resolve();
      }
    });
  });
}

function getPageData() {
  const meta = {
    type: null,
    boardId: "0",
    boardTitle: "",
    topicId: "0",
    topicTitle: "",
  };

  const navLinks = document.querySelectorAll(".navigate_section a");
  for (const link of navLinks) {
    const href = link.href;
    const text = link.textContent.trim();

    const bMatch = href.match(/board=(\d+)/);
    if (bMatch) {
      meta.boardId = bMatch[1];
      meta.boardTitle = text;
    }

    const tMatch = href.match(/topic=(\d+)/);
    if (tMatch) {
      meta.topicId = tMatch[1];
      meta.topicTitle = text;
      meta.type = "topic";
    }
  }

  if (meta.topicId !== "0") {
    meta.type = "topic";
  } else if (meta.boardId !== "0") {
    meta.type = "board";
  }

  return meta;
}

function flashPulseButton(msgId) {
  if (SETTINGS.sp_flash_logo === false) return;

  // 1. Flash Specific Button
  const btn = document.querySelector(`.sp-pulse-btn[data-msg-id="${msgId}"]`);
  if (btn) {
    btn.classList.remove("sp-flash");
    void btn.offsetWidth;
    btn.classList.add("sp-flash");
    setTimeout(() => btn.classList.remove("sp-flash"), 1000);
  }

  // 2. Flash Logo
  flashLogoStub();
}

function flashLogoStub() {
  const logoZone = document.getElementById("sp-logo-zone");
  if (logoZone) {
    logoZone.classList.remove("sp-flash");
    void logoZone.offsetWidth;
    logoZone.classList.add("sp-flash");
    setTimeout(() => logoZone.classList.remove("sp-flash"), 1000);
  }
}

function injectPulseButtons() {
  if (SETTINGS.sp_show_pulse === false) return;

  const posts = document.querySelectorAll("td.td_headerandpost");
  spLog(`Injecting Pulse Buttons. Posts found: ${posts.length}`);
  const pageMeta = getPageData();
  const pageTopicId = pageMeta.topicId;

  posts.forEach((td) => {
    if (td.dataset.spInjected) return;

    const links = Array.from(td.querySelectorAll("a"));
    const postNumLink = links.find(
      (a) =>
        a.textContent.trim().startsWith("#") &&
        /^\#\d+$/.test(a.textContent.trim())
    );

    if (!postNumLink) return;

    const container = postNumLink.closest("div");
    if (!container) return;

    let topicId = pageTopicId;
    let msgId = "0";

    const href = postNumLink.href;
    const topicMatch = href.match(/topic=(\d+)/);
    if (topicMatch) topicId = topicMatch[1];

    const msgMatch = href.match(/msg(\d+)/) || href.match(/#msg(\d+)/);
    if (msgMatch) msgId = msgMatch[1];

    let postTitle = "";
    let postAuthor = "Unknown";
    let postAuthorUid = 0;

    const tr = td.parentElement;
    const posterTd = tr.querySelector("td.poster_info");
    if (posterTd) {
      const nameLink = posterTd.querySelector("a");
      if (nameLink) {
        postAuthor = nameLink.textContent.trim();
        const uMatch = nameLink.href.match(/u=(\d+)/);
        if (uMatch) postAuthorUid = uMatch[1];
      }
    }

    const subjectDiv = td.querySelector('div[id^="subject_"]');
    if (subjectDiv) {
      const subjectLink = subjectDiv.querySelector("a");
      if (subjectLink) postTitle = subjectLink.textContent.trim();
    }

    const meritLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.href.includes("action=merit")
    );

    const wrapper = createEl("div", ["sp-pulse-wrapper"]);
    wrapper.style.display = "inline-flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "flex-end";
    wrapper.style.verticalAlign = "top";
    wrapper.style.marginLeft = "4px";

    if (meritLink) {
      meritLink.parentNode.insertBefore(wrapper, meritLink);
      wrapper.appendChild(meritLink);
    } else {
      container.appendChild(wrapper);
    }

    const btn = createPulseButton(topicId, msgId, {
      boardId: pageMeta.boardId,
      topicTitle: pageMeta.topicTitle,
      postTitle: postTitle,
      postAuthor: postAuthor,
      postAuthorUid: postAuthorUid,
    });
    wrapper.appendChild(btn);

    let headerDiv = td.querySelector(".keyinfo");
    if (!headerDiv) {
      const smallTexts = td.querySelectorAll(".smalltext");
      if (smallTexts.length > 0) {
        headerDiv = smallTexts[0];
      }
    }

    const statsRow = createEl("div", ["sp-pulse-info-row"]);
    statsRow.dataset.msgId = msgId;
    statsRow.style.fontSize = "11px";
    statsRow.style.marginTop = "2px";
    statsRow.style.color = "#1e90ff";
    statsRow.style.fontWeight = "bold";
    statsRow.textContent = "";

    if (headerDiv) {
      if (headerDiv.nextSibling) {
        headerDiv.parentNode.insertBefore(statsRow, headerDiv.nextSibling);
      } else {
        headerDiv.parentNode.appendChild(statsRow);
      }
    } else {
      td.insertBefore(statsRow, td.firstChild);
    }

    td.dataset.spInjected = "true";
  });

  const allBtns = document.querySelectorAll(".sp-pulse-btn");
  const msgIds = Array.from(allBtns)
    .map((b) => b.dataset.msgId)
    .filter((id) => id && id !== "0");

  if (msgIds.length > 0) {
    const uniqueIds = [...new Set(msgIds)];
    fetchPagePulseStatus(uniqueIds);
  }
}

function initLogoClick() {
  const logoZone = document.getElementById("sp-logo-zone");
  if (logoZone) {
    logoZone.style.cursor = "pointer";
    logoZone.onclick = (e) => {
      if (document.body.classList.contains("sp-dragging")) return;

      e.preventDefault();
      e.stopPropagation();

      // Check state via title or imported state?
      // UI logic handles drag-clicks via setLogoState updates
      // But valid click here is backup.

      if (logoZone.title.includes("CLAIM")) {
        const claimUrl = `https://shadowpulse.live/claim.php?voter_id=${userPublicId}&uuid=${userUuid}`;
        window.open(claimUrl, "_blank");
      } else {
        openSettingsModal();
      }
    };
  }
}

async function fetchPagePulseStatus(msgIds) {
  try {
    const response = await fetch(
      `https://shadowpulse.live/api/get_vote_status.php?msg_ids=${msgIds.join(
        ","
      )}`
    );
    const json = await response.json();

    if (json && json.success && json.data) {
      Object.keys(json.data).forEach((msgId) => {
        const stats = json.data[msgId];
        if (stats.user_count > 0) {
          const statsRow = document.querySelector(
            `.sp-pulse-info-row[data-msg-id="${msgId}"]`
          );
          if (statsRow) {
            statsRow.textContent = `Pulsed by ${stats.user_count} user${
              stats.user_count === 1 ? "" : "s"
            }`;
            statsRow.style.fontStyle = "italic";
            statsRow.style.fontSize = "11px";
          }
        }
      });
    }
  } catch (e) {
    console.error("Batch Pulse Fetch Error (Direct):", e);
  }
}

function createPulseButton(topicId, msgId, meta) {
  const btnPulse = createEl("a", ["sp-pulse-btn"]);
  btnPulse.href = "#";
  btnPulse.textContent = "+Pulse";
  btnPulse.title = `Give Pulse as ${userPublicId}`;

  btnPulse.dataset.topicId = topicId;
  btnPulse.dataset.msgId = msgId;

  btnPulse.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    btnPulse.classList.add("sp-flash");
    setTimeout(() => btnPulse.classList.remove("sp-flash"), 1000);
    lastSelfPulseTime = Date.now();
    spLog(`Pulsing Topic:${topicId} Msg:${msgId} as ${userPublicId}...`);

    try {
      const payload = {
        voter_id: userPublicId,
        uuid: userUuid,
        msg_id: msgId,
        topic_id: topicId,
        type: "pulse",
        board_id: meta.boardId,
        topic_title: meta.topicTitle,
        post_title: meta.postTitle,
        post_author: meta.postAuthor,
        post_author_uid: meta.postAuthorUid,
      };

      const response = await chrome.runtime.sendMessage({
        type: "SEND_PULSE",
        payload: payload,
      });

      if (response && response.success) {
        spLog("Pulse Sent (BG Success)");
        const statsRow = document.querySelector(
          `.sp-pulse-info-row[data-msg-id="${msgId}"]`
        );
        if (statsRow) {
          let text = statsRow.textContent;
          let match = text.match(/(\d+)/);
          let count = match ? parseInt(match[1]) : 0;
          let newCount = count + 1;
          statsRow.textContent = `Pulsed by ${newCount} user${
            newCount === 1 ? "" : "s"
          }`;
        }
      } else {
        btnPulse.classList.remove("sp-flash");
        void btnPulse.offsetWidth;
        btnPulse.classList.add("sp-flash-error");
        setTimeout(() => btnPulse.classList.remove("sp-flash-error"), 1000);
      }
    } catch (err) {
      console.error("Pulse Message Error:", err);
      btnPulse.classList.remove("sp-flash");
      void btnPulse.offsetWidth;
      btnPulse.classList.add("sp-flash-error");
      setTimeout(() => btnPulse.classList.remove("sp-flash-error"), 1000);
    }
  });

  return btnPulse;
}

// --- Polling Logic ---
async function checkPulseStatus() {
  // if (document.hidden) return; // Allow background polling for Giveaway Alerts

  // A. Global Pulse Check (Logo & BTC)
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_LATEST_PULSE" });
    if (res && res.data) {
      // Logic: Update Logo State
      // Fix: Handle string "1"/"0" from PHP/Redis
      const val = res.data.btc_active;
      const isBtc = val === 1 || val === "1" || val === true;
      if (isBtc) spLog("BTC Active Triggered via Polling!");

      setLogoState(isBtc);

      // Flash ONLY if SP mode and recent pulse
      if (!isBtc && SETTINGS.sp_flash_logo) {
        const globalTime = parseFloat(res.data.last_pulse);
        if (lastGlobalPulseTime === 0) {
          lastGlobalPulseTime = globalTime;
        } else if (globalTime > lastGlobalPulseTime) {
          lastGlobalPulseTime = globalTime;
          if (Date.now() - lastSelfPulseTime > 3000) {
            flashLogoStub();
          }
        }
      }
    }
  } catch (e) {}

  // B. Local Pulse Check & User Counts
  const visibleBtns = Array.from(document.querySelectorAll(".sp-pulse-btn"));

  // Pick 3 random buttons to check for live updates?
  // Or check all? 60s / 3 per poll seems slow.
  // If polling is back to 2s, we can check 1 random button per poll comfortably.

  for (let i = 0; i < 1; i++) {
    if (visibleBtns.length === 0) break;
    const btn = visibleBtns[Math.floor(Math.random() * visibleBtns.length)];
    const msgId = btn.dataset.msgId;
    if (!msgId || msgId === "0") continue;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_VOTE_STATUS",
        payload: { msg_id: msgId },
      });

      if (response && response.data) {
        const { last_pulse, user_count } = response.data;

        if (user_count > 0) {
          const statsRow = document.querySelector(
            `.sp-pulse-info-row[data-msg-id="${msgId}"]`
          );
          if (statsRow) {
            statsRow.textContent = `Pulsed by ${user_count} user${
              user_count === 1 ? "" : "s"
            }`;
          }
        }

        // Flash Logic for Post
        const pulseTime = parseFloat(last_pulse);
        if (pulseTime > lastPulseTimestamp) {
          lastPulseTimestamp = pulseTime; // Global tracker, implies we handle latest across all posts?
          // Wait, lastPulseTimestamp is global. This logic tracks "any post flashed".
          // If we check random posts, we might miss flashes.
          // But users requested "Real Time".
          // Batch fetch in init takes care of initial state.
          // This creates "liveness" feeling.

          const now = Date.now();
          if (
            now - lastFlashTime > CONFIG.FLASH_COOLDOWN &&
            now - lastSelfPulseTime > 3000
          ) {
            flashPulseButton(msgId);
            lastFlashTime = now;
          }
        }
      }
    } catch (e) {}
  }
}

function startPulsePolling() {
  checkPulseStatus();
  setInterval(checkPulseStatus, CONFIG.POLLING_INTERVAL);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
