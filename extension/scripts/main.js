"use strict";

import { spLog, spDebug, createEl } from "./utils.js";
// ... (Keep existing imports)

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
        spDebug(CONFIG.DEBUG, "Breadcrumbs Missing: Neither .navigate_section nor div.nav found.");
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
    spDebug(CONFIG.DEBUG, "Topic ID Missing from Breadcrumbs. Trying URL regex.");
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

  // 1. Selector Strategy: Support Standard Table AND Mobile Divs
  // "td.td_headerandpost" is standard SMF.
  // "div.post_wrapper" or similar might be used in responsive themes.
  // We'll stick to td.td_headerandpost for now as it's the core BCT structure,
  // but we'll be more flexible finding children.
  const posts = document.querySelectorAll("td.td_headerandpost, .post_wrapper");

  spLog(`Injecting Pulse Buttons. Posts found: ${posts.length}`);
  const pageMeta = getPageData();
  const pageTopicId = pageMeta.topicId;

  posts.forEach((containerProp) => {
    if (containerProp.dataset.spInjected) return;

    // Use 'containerProp' as the base. In standard table, it's the TD.
    // We need to find the "Link to Post" which contains the msgID.
    // It's usually a link starting with '#' or containing 'msg12345'
    const links = Array.from(containerProp.querySelectorAll("a"));
    const postNumLink = links.find(
      (a) =>
        (a.textContent.trim().startsWith("#") && /^\#\d+$/.test(a.textContent.trim())) ||
        (a.href && (a.href.includes("#msg") || a.href.includes(";msg=")))
    );

    if (!postNumLink) return;

    // The "Action Container" is where we append the button.
    // In standard theme, it's a div near the top right or bottom right.
    // We look for the "Merit" button usually.
    const actionContainer = postNumLink.closest("div") || containerProp;

    let topicId = pageTopicId;
    let msgId = "0";

    const href = postNumLink.href;
    const topicMatch = href.match(/topic=(\d+)/);
    if (topicMatch) topicId = topicMatch[1];

    const msgMatch = href.match(/msg(\d+)/) || href.match(/#msg(\d+)/);
    if (msgMatch) msgId = msgMatch[1];
    
    // Safety: If msgId is still 0, try to parse from the link text (e.g. #123) won't give msgId.
    // We must have msgId.
    if (msgId === "0") return;

    // Data Extraction: Author & Subject
    let postTitle = "";
    let postAuthor = "Unknown";
    let postAuthorUid = 0;

    // A. Find Author: Look for profile link nearby
    // Strategy: Go up to the Row/Container and search for profile link
    // DOM Order Safety: In 99% of layouts, Author Plugin/Cell comes BEFORE the post body.
    // Exclusion Safety: Ensure we don't pick up a profile link INSIDE the message body (e.g. a quote).
    const parentRow = containerProp.closest("tr") || containerProp.closest(".post_wrapper") || containerProp.parentElement;
    if (parentRow) {
        const allLinks = Array.from(parentRow.querySelectorAll("a"));
        const profileLink = allLinks.find(a => {
            const isProfile = a.href && a.href.includes("action=profile;u=");
            const isInPostBody = a.closest(".post"); // Standard SMF body class
            return isProfile && !isInPostBody; 
        });

        if (profileLink) {
             postAuthor = profileLink.textContent.trim();
             const uMatch = profileLink.href.match(/u=(\d+)/);
             if (uMatch) postAuthorUid = uMatch[1];
        }
    }

    // B. Find Subject
    // Standard: div id="subject_123"
    const subjectDiv = containerProp.querySelector(`div[id^="subject_${msgId}"]`) || containerProp.querySelector(`div[id^="subject_"]`);
    if (subjectDiv) {
        const subjectLink = subjectDiv.querySelector("a");
        if (subjectLink) postTitle = subjectLink.textContent.trim();
        else postTitle = subjectDiv.textContent.trim(); // Text only subject
    }
    
    // Fallback Subject: Use Page Title if individual post subject is missing
    if (!postTitle && pageMeta.topicTitle) {
        postTitle = "Re: " + pageMeta.topicTitle; 
    }

    // Injection Location
    const meritLink = Array.from(actionContainer.querySelectorAll("a")).find((a) =>
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
      // Fallback: Just append to the container if Merit button missing (e.g. own post or guest)
      actionContainer.appendChild(wrapper);
    }

    const btn = createPulseButton(topicId, msgId, {
      boardId: pageMeta.boardId,
      topicTitle: pageMeta.topicTitle,
      postTitle: postTitle,
      postAuthor: postAuthor,
      postAuthorUid: postAuthorUid,
    });
    wrapper.appendChild(btn);

    // Stats Row Injection
    // Try to find "keyinfo" or "smalltext"
    let headerDiv = containerProp.querySelector(".keyinfo");
    if (!headerDiv) {
      const smallTexts = containerProp.querySelectorAll(".smalltext");
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
      // Last resort: Prepend to the container
      containerProp.insertBefore(statsRow, containerProp.firstChild);
    }

    containerProp.dataset.spInjected = "true";
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
// --- Polling Logic (Heartbeat) ---
async function heartbeat() {
  // if (document.hidden) return; // Allow background polling for Giveaway Alerts

  // A. Global Pulse Check (Logo & BTC & Stats)
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_LATEST_PULSE" });
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
