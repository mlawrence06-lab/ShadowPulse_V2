(function() {
    "use strict";
    window.SP = window.SP || {};

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
                         payload.page_count = meta.pageCount || 1;
                     } else {
                         payload.board_id = meta.boardId;
                         payload.is_board_view = true;
                         payload.board_title = meta.boardTitle;
                     }

                     chrome.runtime.sendMessage({
                        type: "TRACK_VIEW",
                        payload: payload
                    });
                 }).catch(err => {
                     window.SP.Logger.error('[Pulse] trackView: failed to read uuid:', err);
                 });
            }).catch(err => {
                window.SP.Logger.error('[Pulse] trackView: failed to read public_id:', err);
            });
        },

        
        getPageData: function() {
            const meta = {
                topicId: "0",
                boardId: "0",
                topicTitle: "",
                boardTitle: "",
                pageCount: 1
            };
            
            // Extract from URL / Breadcrumbs
            // 1. Topic ID
            const tMatch = window.location.href.match(/topic=(\d+)/);
            if (tMatch) meta.topicId = tMatch[1];

            // 2. Page Count from SMF navPages
            const navPages = document.querySelectorAll('a.navPages');
            let maxPage = 1;
            navPages.forEach(link => {
                const txt = link.textContent.trim();
                const num = parseInt(txt, 10);
                if (!isNaN(num) && num > maxPage) {
                    maxPage = num;
                }
            });
            meta.pageCount = maxPage;

            // 3. Title from Header
            const allHeaders = document.querySelectorAll("td.catbg, div.catbg, .header, td"); 
            for (const el of allHeaders) {
                 const text = el.textContent; 
                 if (text && text.trim().startsWith("Topic: ") && text.includes("(Read")) {
                     const start = text.indexOf("Topic: ") + 7;
                     const end = text.lastIndexOf("(Read");
                     if (end > start) {
                         meta.topicTitle = text.substring(start, end).trim();
                         break; 
                     }
                 }
            }
            
            // 4. Fallback Title
            if (!meta.topicTitle) {
                meta.topicTitle = document.title.replace(" - Bitcoin Forum", "").trim();
            }

            // 5. Board ID (Try Nav)
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

                // STRATEGY A: Desktop / Standard (High Precision)
                const subjectDivs = document.querySelectorAll("#quickModForm div[id^='subject_']");
                
                subjectDivs.forEach((subjectDiv) => {
                    const idParts = subjectDiv.id.split('_');
                    if (idParts.length < 2) return;
                    const msgId = idParts[1];
                    if (!msgId || msgId === "0") return;

                    if (document.querySelector(`.sp-pulse-btn[data-msg-id="${msgId}"]`)) return;

                    const messageLink = Array.from(document.querySelectorAll(`a[href*="msg${msgId}"]`)).find(a => 
                        a.textContent.trim().startsWith("#") || a.name === `msg${msgId}`
                    );
                    if (!messageLink) return;

                    const actionContainer = messageLink.closest("div") || messageLink.parentElement;
                    
                    const containerTd = subjectDiv.closest("td");

                    // Desktop Metadata Extraction
                    let postAuthor = "Unknown";
                    let postAuthorUid = 0;
                    let parentRow = subjectDiv.closest("tr");
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
                                const bTag = posterInfo.querySelector("b");
                                if(bTag) postAuthor = bTag.textContent.trim();
                            }
                        }
                    }

                    let postTitle = subjectDiv.textContent.trim();
                    const sLink = subjectDiv.querySelector("a");
                    if(sLink) postTitle = sLink.textContent.trim();

                    this.injectSinglePulseButton(meta, msgId, postTitle, postAuthor, postAuthorUid, actionContainer, containerTd);
                });

                // STRATEGY B: Mobile / Fallback (Broad Selector)
                // Target "Quote" links for themes that lack #quickModForm structure
                const quoteLinks = document.querySelectorAll("a[href*='action=quote']");
                
                quoteLinks.forEach((quoteBtn) => {
                    const actionContainer = quoteBtn.parentElement || quoteBtn.closest("div");
                    if (!actionContainer) return;

                    const qMatch = quoteBtn.href.match(/msg=(\d+)/);
                    if (!qMatch) return;
                    const msgId = qMatch[1];
                    
                    if (document.querySelector(`.sp-pulse-btn[data-msg-id="${msgId}"]`)) return;

                    // Metadata extraction on mobile is harder, default to Unknown if not found
                    let postTitle = "Mobile Post";
                    let postAuthor = "Unknown";
                    let postAuthorUid = 0;
                    
                    // Try to find subject div even if not in quickModForm
                    const subjectDiv = document.getElementById(`subject_${msgId}`);
                    if(subjectDiv) {
                        postTitle = subjectDiv.textContent.trim();
                        // Try to find author nearby
                    }

                    // Mobile often doesn't have the same containerTd structure for stats
                    // so we pass null or try to find a suitable parent
                    let containerTd = actionContainer;
                    if(subjectDiv) {
                        containerTd = subjectDiv.closest("td") || subjectDiv.parentElement;
                    } 

                    this.injectSinglePulseButton(meta, msgId, postTitle, postAuthor, postAuthorUid, actionContainer, containerTd);
                });

                this.collectAndFetchStats();
            });
        },

        
        injectSinglePulseButton: function(meta, msgId, postTitle, postAuthor, postAuthorUid, actionContainer, containerTd) {
            // STRATEGY: DOM SEPARATION (The "Right Table" Fix)
            // 1. Buttons stay in `actionContainer` (The Button Div/Table)
            // 2. Stats move to `containerTd` (The Main Post Footer Cell) matches "Wrong Table" user feedback.
            
            // --- Part 1: Button Table (Inside actionContainer) ---
            // We wrapper the buttons to keep strict alignment between Merit and Pulse
            const btnTable = window.SP.Utils.createEl("table", ["sp-btn-table-strict"]);
            btnTable.setAttribute("cellpadding", "0");
            btnTable.setAttribute("cellspacing", "0");
            btnTable.setAttribute("border", "0");
            btnTable.style.borderCollapse = "collapse";
            btnTable.style.margin = "0";
            btnTable.style.display = "inline-table"; // Inline with other buttons
            
            // Pulse Button
            const btn = this.createPulseButton(meta.topicId, msgId, {
                boardId: meta.boardId,
                topicTitle: meta.topicTitle,
                postTitle: postTitle,
                postAuthor: postAuthor,
                postAuthorUid: postAuthorUid,
            });
            btn.style.fontFamily = "inherit";
            btn.style.fontSize = "inherit"; 
            btn.style.marginLeft = "0";
            btn.style.paddingLeft = "0";
            
            const allLinks = Array.from(actionContainer.querySelectorAll("a"));
            const meritLink = allLinks.find((a) => a.href.includes("action=merit"));
            const quoteLink = allLinks.find((a) => a.href.includes("action=quote"));

            if (meritLink) {
                // Hijack Merit
                meritLink.parentNode.insertBefore(btnTable, meritLink);
                
                // Row 1: Merit
                const rMerit = btnTable.insertRow();
                const cMerit = rMerit.insertCell();
                cMerit.style.padding = "0"; 
                cMerit.style.textAlign = "left";
                cMerit.style.whiteSpace = "nowrap";
                
                meritLink.style.margin = "0";
                meritLink.style.padding = "0";
                meritLink.style.verticalAlign = "baseline";
                
                cMerit.appendChild(meritLink);

                // Row 2: Pulse
                const rPulse = btnTable.insertRow();
                const cPulse = rPulse.insertCell();
                cPulse.style.padding = "0"; 
                cPulse.style.textAlign = "left";
                cPulse.style.whiteSpace = "nowrap";
                cPulse.appendChild(btn);

            } else if (quoteLink) {
                quoteLink.parentNode.insertBefore(btnTable, quoteLink.nextSibling); 
                
                const rPulse = btnTable.insertRow();
                const cPulse = rPulse.insertCell();
                cPulse.style.padding = "0";
                cPulse.style.textAlign = "left";
                cPulse.style.whiteSpace = "nowrap";
                cPulse.appendChild(btn);
            } else {
                actionContainer.appendChild(btnTable);
                
                const rPulse = btnTable.insertRow();
                const cPulse = rPulse.insertCell();
                cPulse.style.padding = "0";
                cPulse.style.textAlign = "left";
                cPulse.style.whiteSpace = "nowrap";
                cPulse.appendChild(btn);
            }

            // --- Part 2: Stats Table (Inside containerTd / Parent Cell) ---
            // STRATEGY: FLUSH LEFT (Under Merited By)
            
            const statsTable = window.SP.Utils.createEl("table", ["sp-stats-table"]);
            statsTable.setAttribute("cellpadding", "0");
            statsTable.setAttribute("cellspacing", "0");
            statsTable.setAttribute("border", "0");
            statsTable.style.borderCollapse = "collapse";
            statsTable.style.width = "auto";
            statsTable.style.clear = "both";   
            statsTable.style.marginTop = "2px";
            
            const rowStats = statsTable.insertRow();
            const cellStats = rowStats.insertCell();
            cellStats.style.padding = "0";
            cellStats.style.textAlign = "left"; 
            
            const statsRow = window.SP.Utils.createEl("div", ["sp-pulse-info-row", "smalltext"]);
            statsRow.dataset.msgId = msgId;
            statsRow.style.whiteSpace = "nowrap";
            // Start empty - text will be set when pulse data loads or user pulses
            
            cellStats.appendChild(statsRow);

            // INJECTION LOGIC:
            if (containerTd && containerTd.nodeName === "TD") {
                 containerTd.appendChild(statsTable);
            } else {
                 actionContainer.appendChild(statsTable);
            }
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
                 // Guard against rapid double-clicks
                 if (btnPulse.classList.contains("sp-pulse-clicked")) return;
                 btnPulse.classList.add("sp-pulse-clicked");
                 setTimeout(() => btnPulse.classList.remove("sp-pulse-clicked"), 1000);
                 
                 let pid, uuid;
                 try {
                     pid = await window.SP.Utils.getState('sp_public_id');
                     uuid = await window.SP.Utils.getState('sp_uuid');
                 } catch (err) {
                     window.SP.Logger.error('[Pulse] Failed to read identity:', err);
                     btnPulse.classList.remove("sp-pulse-clicked");
                     btnPulse.classList.add("sp-flash-error");
                     setTimeout(() => btnPulse.classList.remove("sp-flash-error"), 1000);
                     return;
                 }
                 
                 window.SP.Logger.info(`Pulsing Topic:${topicId} Msg:${msgId}...`);

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
                      if (chrome.runtime.lastError) {
                          btnPulse.classList.remove("sp-pulse-clicked");
                          void btnPulse.offsetWidth;
                          btnPulse.classList.add("sp-flash-error");
                          setTimeout(() => btnPulse.classList.remove("sp-flash-error"), 1000);
                          return;
                      }
                      if (response && response.success) {
                          // Sync identity if server used a different public_id
                          if (response.data && response.data.voter_id && String(response.data.voter_id) !== String(pid)) {
                              window.SP.Logger.warn('Identity sync: updating sp_public_id to match server');
                              window.SP.Utils.setState('sp_public_id', response.data.voter_id);
                              pid = response.data.voter_id;
                          }
                          
                          const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
                          if(statsRow) {
                               let text = statsRow.textContent;
                               let match = text.match(/(\d+)/);
                               let count = match ? parseInt(match[1]) : 0;
                               let newCount = count + 1;
                               statsRow.textContent = '';
                               const italic = document.createElement('i');
                               const greenSpan = document.createElement('span');
                               greenSpan.style.color = 'green';
                               greenSpan.textContent = 'Pulsed';
                               italic.appendChild(greenSpan);
                               italic.appendChild(document.createTextNode(` by ${newCount} user${newCount == 1 ? "" : "s"}`));
                               statsRow.appendChild(italic);
                               statsRow.classList.add("smalltext");
                          }
                      } else {
                          btnPulse.classList.remove("sp-pulse-clicked");
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
                // Directly call API via BG to benefit from new retry logic
                chrome.runtime.sendMessage({
                    type: "GET_VOTE_STATUS",
                    payload: { msg_ids: uniqueIds.join(",") }
                }, response => {
                    if (chrome.runtime.lastError) return;
                    if (response && response.success && response.data && response.data.data) {
                        const dataMap = response.data.data;
                        Object.keys(dataMap).forEach((msgId) => {
                            const stats = dataMap[msgId];
                            if (stats.user_count > 0) {
                                const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
                                if (statsRow) {
                                    statsRow.textContent = '';
                                    const italic = document.createElement('i');
                                    const greenSpan = document.createElement('span');
                                    greenSpan.style.color = 'green';
                                    greenSpan.textContent = 'Pulsed';
                                    italic.appendChild(greenSpan);
                                    italic.appendChild(document.createTextNode(` by ${stats.user_count} user${stats.user_count == 1 ? "" : "s"}`));
                                    statsRow.appendChild(italic);
                                    statsRow.classList.add("smalltext");
                                }
                            }
                        });
                     } else {
                         if(response && response.error) {
                             window.SP.Logger.error("Batch Pulse Fetch Error (BG)", response.error);
                         }
                     }
                });
            }
        },
        
        // Called by Main.js on Heartbeat to flash a button
        
        flashPulseButton: function(msgId) {
             const btn = document.querySelector(`.sp-pulse-btn[data-msg-id="${msgId}"]`);
             if (!btn) return;
             btn.classList.add("sp-flash");
             setTimeout(() => btn.classList.remove("sp-flash"), 1000);
        }
    };

})();
