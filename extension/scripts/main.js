"use strict";

import { spLog, spDebug, createEl } from "./utils.js";
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

export function init() {
  spLog("Initializing ShadowPulse (v1.9.70)...");
  if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeExtension);
  } else {
      initializeExtension();
  }
}

function initializeExtension() {
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
      // 1. Settings & Theme (Runs Everywhere)
      if (res.sp_show_pulse !== undefined) SETTINGS.sp_show_pulse = res.sp_show_pulse;
      if (res.sp_flash_logo !== undefined) SETTINGS.sp_flash_logo = res.sp_flash_logo;

      applyTheme(res);

      // 2. Initialize Identity & Start Router
      initUserId().then(() => {
        setupGlobalFeatures();
        routePageLogic();
      });
    }
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.sp_show_pulse) SETTINGS.sp_show_pulse = changes.sp_show_pulse.newValue;
      if (changes.sp_flash_logo) SETTINGS.sp_flash_logo = changes.sp_flash_logo.newValue;
    }
  });
}

function applyTheme(res) {
    let theme = res.sp_theme || "light";
    if (theme === "custom") {
      theme = "dark";
      if (!res.sp_custom_dark && res.sp_custom_theme) res.sp_custom_dark = res.sp_custom_theme;
    }

    const profileVars = theme === "light" ? res.sp_custom_light : res.sp_custom_dark;
    document.body.removeAttribute("style");
    document.documentElement.setAttribute("data-sp-theme", theme);
    localStorage.setItem("sp_theme_sync", theme);

    if (profileVars) {
      Object.keys(profileVars).forEach((key) => {
        const varName = key.startsWith("--") ? key : `--sp-forum-${key.replace("_", "-")}`;
        document.body.style.setProperty(varName, profileVars[key]);
      });
      document.documentElement.setAttribute("data-sp-theme", "custom");
    }
    stripTrustScoreStyles();
}

// --- A. Global Logic (Runs Everywhere) ---
function setupGlobalFeatures() {
    injectFloatingBar();
    injectSearchTable(); 
    startPulsePolling(); // Async Heartbeat (Does not block main thread)
}

// --- B. The Router (Gatekeeper) ---
function routePageLogic() {
    const href = window.location.href;

    // SAFETY CHECK 1: Do NOT run logic on functional pages (Login, Post, Raffle, etc)
    if (href.includes("action=")) {
        spLog("Action Page detected. ShadowPulse dormant.");
        return;
    }

    // Route: Topic Page
    if (href.includes("topic=")) {
        handleTopicPage();
        return;
    }

    // Route: Board Page
    if (href.includes("board=")) {
        handleBoardPage();
        return;
    }
}

// --- C. Topic Handler ---
function handleTopicPage() {
    // 1. Extract Metadata
    const meta = getPageData(); // Safe to run here
    
    // 2. Track View
    chrome.runtime.sendMessage({
        type: "TRACK_VIEW",
        payload: {
          topic_id: meta.topicId,
          voter_id: userPublicId,
          uuid: userUuid,
          board_id: meta.boardId,
          topic_title: meta.topicTitle,
        },
    });

    // 3. Inject Buttons (With Robust Author Logic)
    injectPulseButtons(meta);
}

// --- D. Board Handler ---
function handleBoardPage() {
    const bMatch = window.location.href.match(/board=(\d+)/);
    if (!bMatch) return;
    
    const bId = bMatch[1];
    const bTitle = document.title.replace(" - Bitcoin Forum", "").trim();

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

// --- Helpers ---

function initUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sp_public_id", "sp_uuid"], (res) => {
      if (!res.sp_public_id) {
        const newId = generateRandomId();
        const uuid = crypto.randomUUID();
        spLog("Generated new ID:", newId);
        chrome.storage.local.set(
          { sp_public_id: newId, sp_uuid: uuid },
          () => {
            userPublicId = newId;
            userUuid = uuid;
            resolve();
          }
        );
      } else {
        userPublicId = res.sp_public_id;
        if (res.sp_uuid) userUuid = res.sp_uuid;
        resolve();
      }
    });
  });
}

function getPageData() {
  const meta = {
    type: "topic", // We only run this on topic pages now
    boardId: "0",
    boardTitle: "",
    topicId: "0",
    topicTitle: "",
  };

  // 1. Try Standard SMF Breadcrumbs
  let navLinks = document.querySelectorAll(".navigate_section a");

  // 2. Fallback: Custom Theme
  if (navLinks.length === 0) {
    const navDiv = document.querySelector("div.nav");
    if (navDiv) navLinks = navDiv.querySelectorAll("a");
  }

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
    }
  }

  // 3. Fallbacks
  if (meta.topicId === "0") {
    const tMatch = window.location.href.match(/topic=(\d+)/);
    if (tMatch) meta.topicId = tMatch[1];
  }
  
  if (!meta.topicTitle) {
      const docTitle = document.title;
      if (docTitle) meta.topicTitle = docTitle.replace(" - Bitcoin Forum", "").trim();
  }

  return meta;
}

function injectPulseButtons(pageMeta) {
  if (SETTINGS.sp_show_pulse === false) return;

  const subjectDivs = document.querySelectorAll("#quickModForm div[id^='subject_']");
  spLog(`Injecting Pulse Buttons. Subjects found: ${subjectDivs.length}`);
  
  const pageTopicId = pageMeta.topicId;

  subjectDivs.forEach((subjectDiv) => {
    const idParts = subjectDiv.id.split('_');
    if (idParts.length < 2) return;
    const msgId = idParts[1];

    if (!msgId || msgId === "0") return;

    // Find Action Container (Buttons)
    const messageLink = Array.from(document.querySelectorAll(`a[href*="msg${msgId}"]`)).find(a => 
        a.textContent.trim().startsWith("#") || a.name === `msg${msgId}`
    );
    if (!messageLink) return;

    const actionContainer = messageLink.closest("div") || messageLink.parentElement;
    const containerTd = subjectDiv.closest("td");
    
    let postAuthor = "Unknown";
    let postAuthorUid = 0;

    // 1. Recursive Search: Find the true Post Row
    // Sometimes the subject div is nested; we walk up until we find the row with .poster_info
    let parentRow = subjectDiv.closest("tr");
    let attempts = 0;
    while (parentRow && attempts < 5) {
        if (parentRow.querySelector(".poster_info")) {
            break; 
        }
        if (parentRow.parentElement) {
             const nextTr = parentRow.parentElement.closest("tr");
             if (nextTr) {
                 parentRow = nextTr;
                 attempts++;
             } else {
                 break;
             }
        } else {
            break;
        }
    }

    if (parentRow) {
        // 2. Extract Author Info
        const posterInfoTd = parentRow.querySelector(".poster_info");

        if (posterInfoTd) {
            // A. Profile Link (Standard User)
            const profileLink = posterInfoTd.querySelector("a[href*='action=profile']");
            
            if (profileLink) {
                 const pText = profileLink.textContent.trim();
                 if (pText) postAuthor = pText;
                 
                 const uMatch = profileLink.href.match(/u=(\d+)/);
                 if (uMatch) postAuthorUid = uMatch[1];
            } else {
                 // B. Guest / No-Link (Bold Name)
                 const bTag = posterInfoTd.querySelector("b");
                 if (bTag) {
                     const bText = bTag.textContent.trim();
                     if (bText) postAuthor = bText;
                 } else {
                     // C. Fallback: Any Link
                     const anyLink = posterInfoTd.querySelector("a");
                     if (anyLink) {
                         const lText = anyLink.textContent.trim();
                         if (lText) postAuthor = lText;
                     }
                 }
            }
        } else {
             // D. Fallback for Themes without .poster_info class
             if (parentRow.cells.length > 0) {
                 const firstCell = parentRow.cells[0];
                 const bTag = firstCell.querySelector("b");
                 if (bTag) postAuthor = bTag.textContent.trim();
             }
        }
    }
    
    // Title
    let postTitle = subjectDiv.textContent.trim();
    const subjectLink = subjectDiv.querySelector("a");
    if (subjectLink) postTitle = subjectLink.textContent.trim();
    if (!postTitle && pageMeta.topicTitle) postTitle = "Re: " + pageMeta.topicTitle; 

    // Create & Inject Wrapper
    const allLinks = Array.from(actionContainer.querySelectorAll("a"));
    const meritLink = allLinks.find((a) => a.href.includes("action=merit"));
    const quoteLink = allLinks.find((a) => a.href.includes("action=quote"));
    
    const wrapper = createEl("div", ["sp-pulse-wrapper"]);
    wrapper.style.display = "inline-flex";
    wrapper.style.flexDirection = "column"; 
    wrapper.style.alignItems = "flex-end"; 
    wrapper.style.verticalAlign = "top";
    wrapper.style.marginLeft = "4px";

    const btn = createPulseButton(pageTopicId, msgId, {
      boardId: pageMeta.boardId,
      topicTitle: pageMeta.topicTitle,
      postTitle: postTitle,
      postAuthor: postAuthor,
      postAuthorUid: postAuthorUid,
    });

    if (meritLink) {
      meritLink.parentNode.insertBefore(wrapper, meritLink);
      wrapper.appendChild(meritLink);
      wrapper.appendChild(btn);
    } else if (quoteLink) {
      quoteLink.parentNode.insertBefore(wrapper, quoteLink.nextSibling); 
      wrapper.appendChild(btn);
    } else {
      actionContainer.appendChild(wrapper);
      wrapper.appendChild(btn);
    }

    // Inject Stats Row
    let headerDiv = containerTd.querySelector(".keyinfo") || containerTd.querySelector(".smalltext");
    const statsRow = createEl("div", ["sp-pulse-info-row"]);
    statsRow.dataset.msgId = msgId;
    statsRow.style.fontSize = "11px";
    statsRow.style.marginTop = "2px";
    statsRow.style.color = "#1e90ff";
    statsRow.style.fontWeight = "bold";

    if (headerDiv) {
      if (headerDiv.nextSibling) {
        headerDiv.parentNode.insertBefore(statsRow, headerDiv.nextSibling);
      } else {
        headerDiv.parentNode.appendChild(statsRow);
      }
    } else {
      containerTd.insertBefore(statsRow, containerTd.firstChild);
    }
  });

  // Batch Pulse Check
  const allBtns = document.querySelectorAll(".sp-pulse-btn");
  const msgIds = Array.from(allBtns).map((b) => b.dataset.msgId).filter((id) => id && id !== "0");
  if (msgIds.length > 0) {
    const uniqueIds = [...new Set(msgIds)];
    fetchPagePulseStatus(uniqueIds);
  }
}

function flashPulseButton(msgId) {
  if (SETTINGS.sp_flash_logo === false) return;
  const btn = document.querySelector(`.sp-pulse-btn[data-msg-id="${msgId}"]`);
  if (btn) {
    btn.classList.remove("sp-flash");
    void btn.offsetWidth;
    btn.classList.add("sp-flash");
    setTimeout(() => btn.classList.remove("sp-flash"), 1000);
  }
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

function initLogoClick() {
  const logoZone = document.getElementById("sp-logo-zone");
  if (logoZone) {
    logoZone.style.cursor = "pointer";
    logoZone.onclick = (e) => {
      if (document.body.classList.contains("sp-dragging")) return;
      e.preventDefault();
      e.stopPropagation();

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
      `https://shadowpulse.live/api/get_vote_status.php?msg_ids=${msgIds.join(",")}`
    );
    const json = await response.json();

    if (json && json.success && json.data) {
      Object.keys(json.data).forEach((msgId) => {
        const stats = json.data[msgId];
        if (stats.user_count > 0) {
          const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
          if (statsRow) {
            statsRow.textContent = `Pulsed by ${stats.user_count} user${stats.user_count === 1 ? "" : "s"}`;
            statsRow.style.fontStyle = "italic";
            statsRow.style.fontSize = "11px";
          }
        }
      });
    }
  } catch (e) {
    console.error("Batch Pulse Fetch Error:", e);
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
        const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
        if (statsRow) {
          let text = statsRow.textContent;
          let match = text.match(/(\d+)/);
          let count = match ? parseInt(match[1]) : 0;
          let newCount = count + 1;
          statsRow.textContent = `Pulsed by ${newCount} user${newCount === 1 ? "" : "s"}`;
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
async function heartbeat() {
  // A. Global Pulse Check (Logo & BTC & Stats)
  try {
    const res = await chrome.runtime.sendMessage({ 
        type: "GET_LATEST_PULSE",
        voter_id: userPublicId 
    });
    if (res && res.data) {
      if (res.data.price_stats) {
          document.dispatchEvent(new CustomEvent('sp-heartbeat', { detail: res.data.price_stats }));
      } else {
          // Fallback Fetch
          chrome.runtime.sendMessage({ type: "FETCH_STATS" })
            .then(res => {
                if (res && res.success && res.data) {
                    document.dispatchEvent(new CustomEvent('sp-heartbeat', { detail: res.data }));
                }
            })
            .catch(() => {});
      }

      const val = res.data.btc_active;
      const isBtc = val === 1 || val === "1" || val === true;
      if (isBtc) spLog("BTC Active Triggered via Polling!");

      setLogoState(isBtc);

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

  // B. Local Pulse Check (One Random Button)
  // Only runs if buttons exist (Topic Pages)
  const visibleBtns = Array.from(document.querySelectorAll(".sp-pulse-btn"));
  if (visibleBtns.length > 0) {
      for (let i = 0; i < 1; i++) {
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
              const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
              if (statsRow) statsRow.textContent = `Pulsed by ${user_count} user${user_count === 1 ? "" : "s"}`;
            }

            const pulseTime = parseFloat(last_pulse);
            if (pulseTime > lastPulseTimestamp) {
              lastPulseTimestamp = pulseTime; 
              const now = Date.now();
              if (now - lastFlashTime > CONFIG.FLASH_COOLDOWN && now - lastSelfPulseTime > 3000) {
                flashPulseButton(msgId);
                lastFlashTime = now;
              }
            }
          }
        } catch (e) {}
      }
  }

  setTimeout(heartbeat, CONFIG.POLLING_INTERVAL);
}

function startPulsePolling() {
  heartbeat();
}
