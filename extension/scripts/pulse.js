(function() {
    "use strict";
    window.SP = window.SP || {};

    let lastSelfPulseTime = 0;

    window.SP.Pulse = {
        init: function() {
              // Wait for DOM
              if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", () => this.scanPage());
              } else {
                  this.scanPage();
              }
        },

        scanPage: function() {
            const href = window.location.href;
            if (href.includes("action=") && !href.includes("action=profile")) return; // Skip most actions

            // Topic Handler
            if (href.includes("topic=")) {
                this.handleTopicPage();
            }
            // Board Handler
            else if (href.includes("board=")) {
                this.handleBoardPage();
            }
        },

        handleTopicPage: function() {
             const meta = this.getPageData();
             // inject buttons
             this.injectPulseButtons(meta);
             
             // Track View
             this.trackView('topic', meta);
        },

        handleBoardPage: function() {
            const bMatch = window.location.href.match(/board=(\d+)/);
            if (!bMatch) return;
            const bId = bMatch[1];
            const bTitle = document.title.replace(" - Bitcoin Forum", "").trim();
            
            this.trackView('board', { boardId: bId, boardTitle: bTitle });
        },

        trackView: function(type, meta) {
            window.SP.Utils.getState('sp_public_id').then(pid => {
                 window.SP.Utils.getState('sp_uuid').then(uuid => {
                     const payload = {
                         voter_id: pid,
                         uuid: uuid
                     };
                     if (type === 'topic') {
                         payload.topic_id = meta.topicId;
                         payload.board_id = meta.boardId;
                         payload.topic_title = meta.topicTitle;
                     } else {
                         payload.board_id = meta.boardId;
                         payload.is_board_view = true;
                         payload.board_title = meta.boardTitle;
                     }

                     chrome.runtime.sendMessage({
                        type: "TRACK_VIEW",
                        payload: payload
                    });
                 });
            });
        },

        getPageData: function() {
            const meta = {
                topicId: "0",
                boardId: "0",
                topicTitle: "",
                boardTitle: ""
            };
            
            // Extract from URL / Breadcrumbs
            // 1. Topic ID
            const tMatch = window.location.href.match(/topic=(\d+)/);
            if (tMatch) meta.topicId = tMatch[1];

            // 2. Title from Header
            const allHeaders = document.querySelectorAll("td.catbg, div.catbg, .header, td"); 
            for (const el of allHeaders) {
                 const text = el.innerText || el.textContent; 
                 if (text && text.trim().startsWith("Topic: ") && text.includes("(Read")) {
                     const start = text.indexOf("Topic: ") + 7;
                     const end = text.lastIndexOf("(Read");
                     if (end > start) {
                         meta.topicTitle = text.substring(start, end).trim();
                         break; 
                     }
                 }
            }
            
            // 3. Fallback Title
            if (!meta.topicTitle) {
                meta.topicTitle = document.title.replace(" - Bitcoin Forum", "").trim();
            }

            // 4. Board ID (Try Nav)
            const navLinks = document.querySelectorAll(".navigate_section a, div.nav a");
            for (const link of navLinks) {
                const bMatch = link.href.match(/board=(\d+)/);
                if (bMatch) {
                   meta.boardId = bMatch[1];
                   meta.boardTitle = link.textContent.trim();
                }
            }

            return meta;
        },

        injectPulseButtons: function(meta) {
            window.SP.Utils.getState('sp_show_pulse', true).then(show => {
                if(!show) return;

                const subjectDivs = document.querySelectorAll("#quickModForm div[id^='subject_']");
                const pageTopicId = meta.topicId;

                subjectDivs.forEach((subjectDiv) => {
                    const idParts = subjectDiv.id.split('_');
                    if (idParts.length < 2) return;
                    const msgId = idParts[1];
                    if (!msgId || msgId === "0") return;

                    // Locate Container
                    const messageLink = Array.from(document.querySelectorAll(`a[href*="msg${msgId}"]`)).find(a => 
                        a.textContent.trim().startsWith("#") || a.name === `msg${msgId}`
                    );
                    if (!messageLink) return;

                    const actionContainer = messageLink.closest("div") || messageLink.parentElement;
                    const containerTd = subjectDiv.closest("td");

                    // Post Info extraction (Author, Title)
                    // ... Simplified extraction for clarity, ideally reuse robust logic from bundle.js
                    let postAuthor = "Unknown";
                    let postAuthorUid = 0;
                    
                    // Basic parent lookup
                    let parentRow = subjectDiv.closest("tr");
                    // Walk up to find poster_info
                    for(let i=0; i<5 && parentRow; i++) {
                        if(parentRow.querySelector(".poster_info")) break;
                        parentRow = parentRow.parentElement ? parentRow.parentElement.closest("tr") : null;
                    }

                    if(parentRow) {
                        const posterInfo = parentRow.querySelector(".poster_info");
                        if(posterInfo) {
                             const pLink = posterInfo.querySelector("a[href*='action=profile']");
                             if(pLink) {
                                 postAuthor = pLink.textContent.trim();
                                 const uMatch = pLink.href.match(/u=(\d+)/);
                                 if(uMatch) postAuthorUid = uMatch[1];
                             } else {
                                 // Guest
                                 const bTag = posterInfo.querySelector("b");
                                 if(bTag) postAuthor = bTag.textContent.trim();
                             }
                        }
                    }

                    let postTitle = subjectDiv.textContent.trim();
                    const sLink = subjectDiv.querySelector("a");
                    if(sLink) postTitle = sLink.textContent.trim();

                    // Create Wrapper
                    const wrapper = window.SP.Utils.createEl("div", ["sp-pulse-wrapper"]);
                    wrapper.style.display = "inline-flex";
                    wrapper.style.flexDirection = "column"; 
                    wrapper.style.alignItems = "flex-end"; 
                    wrapper.style.verticalAlign = "top";
                    wrapper.style.marginLeft = "4px";

                    const btn = this.createPulseButton(pageTopicId, msgId, {
                      boardId: meta.boardId,
                      topicTitle: meta.topicTitle,
                      postTitle: postTitle,
                      postAuthor: postAuthor,
                      postAuthorUid: postAuthorUid,
                    });

                    // Inject
                    const allLinks = Array.from(actionContainer.querySelectorAll("a"));
                    const meritLink = allLinks.find((a) => a.href.includes("action=merit"));
                    const quoteLink = allLinks.find((a) => a.href.includes("action=quote"));

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
                    const statsRow = window.SP.Utils.createEl("div", ["sp-pulse-info-row"]);
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

                // Batch Fetch
                this.collectAndFetchStats();
            });
        },

        createPulseButton: function(topicId, msgId, meta) {
             const btnPulse = window.SP.Utils.createEl("a", ["sp-pulse-btn"]);
             btnPulse.href = "#";
             btnPulse.textContent = "+Pulse";
             
             window.SP.Utils.getState('sp_public_id').then(pid => {
                 btnPulse.title = `Give Pulse as ${pid}`;
             });

             btnPulse.dataset.topicId = topicId;
             btnPulse.dataset.msgId = msgId;

             btnPulse.addEventListener("click", async (e) => {
                 e.preventDefault(); e.stopPropagation();
                 
                 btnPulse.classList.add("sp-flash");
                 setTimeout(() => btnPulse.classList.remove("sp-flash"), 1000);
                 lastSelfPulseTime = Date.now();

                 const pid = await window.SP.Utils.getState('sp_public_id');
                 const uuid = await window.SP.Utils.getState('sp_uuid');
                 
                 window.SP.Log.info(`Pulsing Topic:${topicId} Msg:${msgId}...`);

                 const payload = {
                    voter_id: pid,
                    uuid: uuid,
                    msg_id: msgId,
                    topic_id: topicId,
                    type: "pulse",
                    board_id: meta.boardId,
                    topic_title: meta.topicTitle,
                    post_title: meta.postTitle,
                    post_author: meta.postAuthor,
                    post_author_uid: meta.postAuthorUid,
                 };

                  chrome.runtime.sendMessage({
                    type: "SEND_PULSE",
                    payload: payload,
                  }, response => {
                      if (response && response.success) {
                          const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
                          if(statsRow) {
                               let text = statsRow.textContent;
                               let match = text.match(/(\d+)/);
                               let count = match ? parseInt(match[1]) : 0;
                               let newCount = count + 1;
                               statsRow.textContent = `Pulsed by ${newCount} user${newCount === 1 ? "" : "s"}`;
                          }
                      } else {
                          // Error Flash
                          btnPulse.classList.remove("sp-flash");
                          void btnPulse.offsetWidth;
                          btnPulse.classList.add("sp-flash-error");
                          setTimeout(() => btnPulse.classList.remove("sp-flash-error"), 1000);
                      }
                  });
             });
             return btnPulse;
        },

        collectAndFetchStats: function() {
            const allBtns = document.querySelectorAll(".sp-pulse-btn");
            const msgIds = Array.from(allBtns).map((b) => b.dataset.msgId).filter((id) => id && id !== "0");
            if (msgIds.length > 0) {
                const uniqueIds = [...new Set(msgIds)];
                // Directly call API via BG or fetch here? 
                // Bundle used direct fetch
                fetch(`https://shadowpulse.live/api/get_vote_status.php?msg_ids=${uniqueIds.join(",")}`)
                .then(r => r.json())
                .then(json => {
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
                }).catch(e => window.SP.Log.error("Batch Pulse Fetch Error", e));
            }
        },
        
        // Called by Main.js on Heartbeat to flash a button
        flashPulseButton: function(msgId) {
             const btn = document.querySelector(`.sp-pulse-btn[data-msg-id="${msgId}"]`);
             if (btn) {
                btn.classList.remove("sp-flash");
                void btn.offsetWidth;
                btn.classList.add("sp-flash");
                setTimeout(() => btn.classList.remove("sp-flash"), 1000);
             }
        }
    };

})();
