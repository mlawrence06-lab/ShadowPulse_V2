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

// Module-Level State

export function init() {
  spLog("Initializing ShadowPulse...");
  // Standard Init Logic
  if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runInitSequence);
  } else {
      runInitSequence();
  }
}

function runInitSequence() {
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

      // Theme Logic
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

function initUserId() {
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

  // 1. Try Standard SMF Breadcrumbs (navigate_section)
  let navLinks = document.querySelectorAll(".navigate_section a");

  // 2. Fallback: Bitcointalk Custom Theme Breadcrumbs (div.nav)
  if (navLinks.length === 0) {
    const navDiv = document.querySelector("div.nav");
    if (navDiv) {
      navLinks = navDiv.querySelectorAll("a");
    } else {
        spDebug(CONFIG.DEBUG, "CRITICAL: Breadcrumbs Missing: Neither .navigate_section nor div.nav found.");
    }
  }

  // Process Breadcrumbs
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

  // 3. Fallback: Window Title & URL Regex
  if (meta.topicId === "0") {
    // Only warn if the URL suggests we SHOULD have a topic ID
    if (window.location.href.includes("topic=")) {
         spDebug(CONFIG.DEBUG, "Topic ID Missing from Breadcrumbs. Trying URL regex.");
    }
    const tMatch = window.location.href.match(/topic=(\d+)/);
    if (tMatch) {
      meta.topicId = tMatch[1];
      meta.type = "topic";
    }
  }

  if (meta.boardId === "0") {
     const bMatch = window.location.href.match(/board=(\d+)/);
     if (bMatch) {
       meta.boardId = bMatch[1];
       meta.type = "board"; // Partial info
     }
  }

  // Title Fallbacks
  if (meta.type === "topic" && !meta.topicTitle) {
    spDebug(CONFIG.DEBUG, "Topic Title Missing from Breadcrumbs. Trying document.title.");
    const docTitle = document.title;
    if (docTitle) {
      meta.topicTitle = docTitle.replace(" - Bitcoin Forum", "").trim();
    } else {
      spDebug(CONFIG.DEBUG, "CRITICAL: document.title is empty!");
    }
  }

  if (meta.type === "board" && !meta.boardTitle) {
    spDebug(CONFIG.DEBUG, "Board Title Missing. Trying document.title.");
    const docTitle = document.title;
    if (docTitle) {
      meta.boardTitle = docTitle.replace(" - Bitcoin Forum", "").trim();
    }
  }

  if (meta.topicId === "0" && meta.boardId !== "0") {
    meta.type = "board";
  } else if (meta.topicId !== "0") {
    meta.type = "topic";
  }
  
  // Final Debug Check
  if (meta.type === "topic" && (!meta.topicTitle || meta.topicTitle === "")) {
      spDebug(CONFIG.DEBUG, "FAILURE: Topic Title still empty after all fallbacks.", meta);
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

  // Selector Strategy: Unique Subject IDs
  // Rely on the fact that every post has a unique <div id="subject_123">
  // This avoids finding nested/ambiguous TDs.
  const subjectDivs = document.querySelectorAll("#quickModForm div[id^='subject_']");
  
  spLog(`Injecting Pulse Buttons. Subjects found: ${subjectDivs.length}`);
  
  const pageMeta = getPageData();
  const pageTopicId = pageMeta.topicId;

  subjectDivs.forEach((subjectDiv) => {
    // 1. Extract MsgID from ID (Reliable)
    // ID format: "subject_12345"
    const idParts = subjectDiv.id.split('_');
    if (idParts.length < 2) return;
    const msgId = idParts[1];

    if (!msgId || msgId === "0") return;

    // 2. Find Action Container via Message Link (Universal Anchor)
    // The "Link to Post" (#1, #2) is present for BOTH Guests and Members.
    // Use this to find the correct button container (ignmsgbttnsX), 
    // which might be in a different TD/Row than the subject.
    // ID-based lookup is safest if we can match the href msgID.
    const messageLink = Array.from(document.querySelectorAll(`a[href*="msg${msgId}"]`)).find(a => 
        a.textContent.trim().startsWith("#") || a.name === `msg${msgId}`
    );

    if (!messageLink) {
        // Fallback: If no link found, skip or default to subject's container? 
        // Better to skip to avoid misplaced buttons.
        return; 
    }

    // The container (e.g. div#ignmsgbttns1)
    const actionContainer = messageLink.closest("div") || messageLink.parentElement;
    
    // 3. Find Context for Data Extraction (Author/Title)
    // Use the Subject Div's container (TD) for traversing to author/title
    const containerProp = subjectDiv.closest("td");
    
    // 5. Data Extraction (Author & Title)
    let postTitle = subjectDiv.textContent.trim();
    // If it's a link inside subject div?
    const subjectLink = subjectDiv.querySelector("a");
    if (subjectLink) postTitle = subjectLink.textContent.trim();

    let postAuthor = "Unknown";
    let postAuthorUid = 0;

    // Find Author (Same logic as before, relative to container)
    // Usually in the previous TD or same row
    const parentRow = containerProp.closest("tr") || containerProp.closest(".post_wrapper") || containerProp.parentElement;
    if (parentRow) {
        const allLinks = Array.from(parentRow.querySelectorAll("a"));
        const profileLink = allLinks.find(a => {
            const isProfile = a.href && a.href.includes("action=profile;u=");
            // Ensure strictly distinct from post body links
            const isInPostBody = a.closest(".post"); 
            return isProfile && !isInPostBody; 
        });

        if (profileLink) {
             postAuthor = profileLink.textContent.trim();
             const uMatch = profileLink.href.match(/u=(\d+)/);
             if (uMatch) postAuthorUid = uMatch[1];
        }
    }
    
    // Fallback Subject
    if (!postTitle && pageMeta.topicTitle) {
        postTitle = "Re: " + pageMeta.topicTitle; 
    }

    // 6. Injection Location Strategy
    // Goal: Place "under" +Merit button if it exists.
    // If not (e.g. Guest), place near the other buttons (Quote, etc).
    
    // Find Anchors
    const allLinks = Array.from(actionContainer.querySelectorAll("a"));
    const meritLink = allLinks.find((a) => a.href.includes("action=merit"));
    const quoteLink = allLinks.find((a) => a.href.includes("action=quote"));
    
    // Create Wrapper (Flex Column for Stacking)
    const wrapper = createEl("div", ["sp-pulse-wrapper"]);
    wrapper.style.display = "inline-flex";
    wrapper.style.flexDirection = "column"; 
    wrapper.style.alignItems = "flex-end"; // Right align logic
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
      // Primary: Wrap Merit and stack Pulse under it
      meritLink.parentNode.insertBefore(wrapper, meritLink);
      wrapper.appendChild(meritLink);
      wrapper.appendChild(btn);
    } else if (quoteLink) {
      // Secondary: Guest Mode (No Merit). Place NEXT to Quote button.
      // We don't wrap Quote, we just insert our wrapper AFTER Quote.
      quoteLink.parentNode.insertBefore(wrapper, quoteLink.nextSibling); 
      wrapper.appendChild(btn);
    } else {
      // Fallback: Guest with no buttons (just #1 link).
      // Place it next to the message link (or at end of container).
      actionContainer.appendChild(wrapper);
      wrapper.appendChild(btn);
    }

    // 7. Inject Stats Row
    // Try to find "keyinfo" (Top left of post header usually)
    // Or "smalltext"
    let headerDiv = containerProp.querySelector(".keyinfo");
    if (!headerDiv) {
      // Sometimes it's just a smalltext div
      const smallTexts = containerProp.querySelectorAll(".smalltext");
      // Find the one that contains the date/subject?
      // Usually the first one in the header TD is the date/subject line container
      if (smallTexts.length > 0) headerDiv = smallTexts[0];
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
      containerProp.insertBefore(statsRow, containerProp.firstChild);
    }
    
    // Check for "sp-injected-flag" ? No, user said remove "bad code".
    // We rely on unique subject IDs.
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
  // Clean Button Text
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
async function heartbeat() {
  // if (document.hidden) return; // Allow background polling for Giveaway Alerts

  // A. Global Pulse Check (Logo & BTC & Stats)
  try {
    const res = await chrome.runtime.sendMessage({ 
        type: "GET_LATEST_PULSE",
        voter_id: userPublicId 
    });
    if (res && res.data) {
      
      // 1. Broadcast Stats to UI.js (if present)
      if (res.data.price_stats) {
          document.dispatchEvent(new CustomEvent('sp-heartbeat', { detail: res.data.price_stats }));
      } else {
          // Fallback: If backend cache is cold/empty, fetch legacy stats from CDN (via BG to bypass CORS)
          // This ensures graph doesn't disappear if backend cron hasn't run yet.
          chrome.runtime.sendMessage({ type: "FETCH_STATS" })
            .then(res => {
                if (res && res.success && res.data) {
                    document.dispatchEvent(new CustomEvent('sp-heartbeat', { detail: res.data }));
                }
            })
            .catch(() => {});
      }

      // 2. Logic: Update Logo State
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

  // Check 1 random button per heartbeat
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
          lastPulseTimestamp = pulseTime; 
          
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

  // Schedule next beat strictly AFTER this one finishes
  setTimeout(heartbeat, CONFIG.POLLING_INTERVAL);
}

function startPulsePolling() {
  heartbeat();
}
