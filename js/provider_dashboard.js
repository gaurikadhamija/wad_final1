/**
 * QueueLess - Service Provider Dashboard JavaScript
 * File: js/provider_dashboard.js
 * Scope: provider-dashboard.html only.
 * Implements counter operations, token advancement, status toggling,
 * queue creation, and local state management using Vanilla JS.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var STORAGE_KEY = "queueless_provider_dashboard_v1";

    // Initial state
    var state = {
      counters: [
        { id: 1, name: "Counter 01", service: "Admissions & Transfers", officer: "Officer Mark Ramos", tokenPrefix: "ADM", currentToken: 88, waiting: 3, status: "Serving" },
        { id: 2, name: "Counter 02", service: "College Administration (Dean Office)", officer: "Dr. Sarah Vance", tokenPrefix: "QL", currentToken: 102, waiting: 4, status: "Serving" },
        { id: 3, name: "Counter 03", service: "Scholarships & Financial Aid", officer: "Assistant Priya Nair", tokenPrefix: "SCH", currentToken: 0, waiting: 2, status: "Idle" }
      ],
      tokensCompletedToday: 142,
      avgWaitTime: 14
    };

    // Load from localStorage if present
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.counters) state = parsed;
      }
    } catch (e) {
      console.warn("Could not read localStorage", e);
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn("Could not save to localStorage", e);
      }
    }

    // Toast helper
    function toast(msg, type) {
      if (window.showQueueNotification) {
        window.showQueueNotification(msg, type);
      } else {
        alert(msg);
      }
    }

    // ==========================================
    // 1. UPDATE DASHBOARD DISPLAY
    // ==========================================
    function updateCounterDisplay() {
      // Update Overview table rows
      var overviewTbody = document.querySelector(".panel-prov-overview table tbody");
      if (overviewTbody) {
        var rows = overviewTbody.querySelectorAll("tr");
        state.counters.forEach(function (ctr, index) {
          if (rows[index]) {
            var tokenTd = rows[index].querySelector("td:nth-child(4)");
            var waitTd = rows[index].querySelector("td:nth-child(5)");
            var statusTd = rows[index].querySelector("td:nth-child(6)");
            var actionBtn = rows[index].querySelector("button");

            if (tokenTd) {
              if (ctr.currentToken > 0) {
                tokenTd.innerHTML = '<strong style="color: var(--color-salmon-pink); font-size: 1.1rem;">' + ctr.tokenPrefix + '-' + (ctr.currentToken < 100 ? '0' + ctr.currentToken : ctr.currentToken) + '</strong>';
              } else {
                tokenTd.innerHTML = '<span style="color: var(--color-text-muted);">—</span>';
              }
            }

            if (waitTd) {
              waitTd.textContent = ctr.waiting + " students";
            }

            if (statusTd) {
              if (ctr.status === "Serving") {
                statusTd.innerHTML = '<span class="badge badge-success"><span class="badge-dot"></span>Serving</span>';
              } else {
                statusTd.innerHTML = '<span class="badge badge-neutral"><span class="badge-dot"></span>Available / Idle</span>';
              }
            }

            if (actionBtn) {
              if (ctr.status === "Serving") {
                actionBtn.textContent = "Call Next";
                actionBtn.className = "btn btn-outline btn-sm";
              } else {
                actionBtn.textContent = "Open First Token";
                actionBtn.className = "btn btn-primary btn-sm";
              }
            }
          }
        });
      }

      // Update Counters tab cards
      var counterCards = document.querySelectorAll("#tab-prov-counters .counter-card, .panel-prov-counters .counter-card");
      counterCards.forEach(function (card, index) {
        var ctr = state.counters[index];
        if (ctr) {
          var tokenDisplay = card.querySelector(".counter-token-number");
          var waitingDisplay = card.querySelector(".counter-queue-count");
          var statusBadge = card.querySelector(".counter-status-badge");
          var callNextBtn = card.querySelector(".btn-primary");
          var completeBtn = card.querySelector(".btn-outline");

          if (tokenDisplay) {
            tokenDisplay.textContent = ctr.currentToken > 0 
              ? ctr.tokenPrefix + '-' + (ctr.currentToken < 100 ? '0' + ctr.currentToken : ctr.currentToken)
              : "—";
          }
          if (waitingDisplay) {
            waitingDisplay.textContent = ctr.waiting + " waiting";
          }
          if (statusBadge) {
            if (ctr.status === "Serving") {
              statusBadge.className = "counter-status-badge badge badge-success";
              statusBadge.textContent = "● Serving Active";
            } else {
              statusBadge.className = "counter-status-badge badge badge-neutral";
              statusBadge.textContent = "● Idle / Open";
            }
          }
          if (callNextBtn) {
            callNextBtn.textContent = ctr.status === "Serving" ? "Call Next" : "Call First Token";
          }
        }
      });

      // Update stat cards
      var completedStat = document.querySelector(".stat-card:first-child .stat-number");
      if (completedStat) {
        completedStat.textContent = String(state.tokensCompletedToday);
      }
    }

    // ==========================================
    // 2. COUNTER ACTION HANDLERS
    // ==========================================
    function callNextToken(counterIndex) {
      var ctr = state.counters[counterIndex];
      if (!ctr) return;

      var counterDatabaseId = ctr.id || (counterIndex + 1);

      // Invoke PHP + MySQL PDO endpoint
      if (window.QueueLessAPI && typeof window.QueueLessAPI.callNext === "function") {
        window.QueueLessAPI.callNext(counterDatabaseId).then(function (res) {
          if (res && res.success && res.token) {
            console.log("[QueueLess Backend] Token called successfully:", res.token);
          }
        }).catch(function(err){
          console.warn("[QueueLess] Could not call backend next token", err);
        });
      }

      if (ctr.status !== "Serving" || ctr.currentToken === 0) {
        ctr.status = "Serving";
        ctr.currentToken = ctr.tokenPrefix === "SCH" ? 41 : (ctr.currentToken || 101);
      } else {
        ctr.currentToken += 1;
        state.tokensCompletedToday += 1;
        if (ctr.waiting > 0) ctr.waiting -= 1;
      }

      var formattedToken = ctr.tokenPrefix + '-' + (ctr.currentToken < 100 ? '0' + ctr.currentToken : ctr.currentToken);
      toast("Now serving " + formattedToken + " at " + ctr.name + " (" + ctr.service + ")", "success");
      saveState();
      updateCounterDisplay();
    }

    function completeToken(counterIndex) {
      var ctr = state.counters[counterIndex];
      if (!ctr) return;

      var counterDatabaseId = ctr.id || (counterIndex + 1);

      // Invoke PHP + MySQL PDO endpoint
      if (window.QueueLessAPI && typeof window.QueueLessAPI.completeToken === "function") {
        window.QueueLessAPI.completeToken(counterDatabaseId, ctr.currentToken).then(function (res) {
          if (res && res.success) {
            console.log("[QueueLess Backend] Token completed:", res);
          }
        }).catch(function(err){
          console.warn("[QueueLess] Could not complete backend token", err);
        });
      }

      if (ctr.currentToken > 0) {
        var completedToken = ctr.tokenPrefix + '-' + (ctr.currentToken < 100 ? '0' + ctr.currentToken : ctr.currentToken);
        state.tokensCompletedToday += 1;
        toast("Completed token " + completedToken + " at " + ctr.name, "info");
        
        if (ctr.waiting > 0) {
          ctr.currentToken += 1;
          ctr.waiting -= 1;
        } else {
          ctr.currentToken = 0;
          ctr.status = "Idle";
        }
        saveState();
        updateCounterDisplay();
      }
    }

    // Attach to table buttons
    var overviewButtons = document.querySelectorAll(".panel-prov-overview table tbody button");
    overviewButtons.forEach(function (btn, index) {
      btn.addEventListener("click", function () {
        callNextToken(index);
      });
    });

    // Attach to Counter cards
    var counterCards = document.querySelectorAll("#tab-prov-counters .counter-card, .panel-prov-counters .counter-card");
    counterCards.forEach(function (card, index) {
      var callBtn = card.querySelector("button:first-of-type, .btn-primary");
      var completeBtn = card.querySelector("button:last-of-type, .btn-outline");

      if (callBtn) {
        callBtn.addEventListener("click", function () {
          callNextToken(index);
        });
      }
      if (completeBtn) {
        completeBtn.addEventListener("click", function () {
          completeToken(index);
        });
      }
    });

    // Attach to Token Management actions (Mark Complete, Call Now, Skip, Recall)
    var tokenActionBtns = document.querySelectorAll("#tab-prov-tokens table button, .panel-prov-tokens table button");
    tokenActionBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var actionText = btn.textContent.trim();
        var tr = btn.closest("tr");
        var tokenCell = tr ? tr.querySelector("strong, td:first-child") : null;
        var tokenName = tokenCell ? tokenCell.textContent.trim() : "Token";

        if (actionText === "Mark Complete") {
          state.tokensCompletedToday += 1;
          toast("Marked " + tokenName + " as completed", "success");
          if (tr) tr.style.opacity = "0.4";
          btn.disabled = true;
          btn.textContent = "Completed";
        } else if (actionText === "Call Now") {
          toast("Calling " + tokenName + " to service window", "info");
        } else if (actionText === "Skip") {
          toast(tokenName + " moved to postponed / stand-by list", "warning");
        } else if (actionText === "Recall") {
          toast("Audio and SMS recall broadcast sent for " + tokenName, "info");
        }
        saveState();
        updateCounterDisplay();
      });
    });

    // ==========================================
    // 3. CREATE NEW QUEUE MODAL
    // ==========================================
    var createQueueForm = document.querySelector("#create-queue-modal form");
    if (createQueueForm) {
      createQueueForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var nameInput = document.getElementById("new-queue-name");
        var deptInput = document.getElementById("new-queue-dept");
        var countersInput = document.getElementById("new-queue-counters");

        var qName = nameInput ? nameInput.value.trim() : "";
        var qDept = deptInput ? deptInput.value : "Administration";
        var qCounters = countersInput ? countersInput.value : "1";

        if (!qName) {
          toast("Please enter a service queue name", "warning");
          return;
        }

        // Add row to queue table
        var queueTable = document.querySelector("#tab-prov-queues table tbody, .panel-prov-queues table tbody");
        if (queueTable) {
          var newRow = document.createElement("tr");
          newRow.innerHTML = [
            '<td><strong>' + qName + '</strong></td>',
            '<td><span class="badge badge-pink">' + qDept + '</span></td>',
            '<td class="tabular-nums">' + qCounters + ' counter</td>',
            '<td class="tabular-nums">0 active</td>',
            '<td class="tabular-nums">~8m</td>',
            '<td><span class="badge badge-success"><span class="badge-dot"></span>Open</span></td>',
            '<td><button type="button" class="btn btn-outline btn-sm">Manage</button></td>'
          ].join("");
          queueTable.appendChild(newRow);
        }

        // Close modal
        window.location.hash = "";
        createQueueForm.reset();
        toast("New queue '" + qName + "' created and opened successfully!", "success");
      });
    }

    // ==========================================
    // 4. SETTINGS FORM
    // ==========================================
    var settingsForm = document.querySelector("#tab-prov-settings form, .panel-prov-settings form");
    if (settingsForm) {
      settingsForm.addEventListener("submit", function (e) {
        e.preventDefault();
        toast("Desk operator settings updated successfully", "success");
      });
    }

    // Initial render
    updateCounterDisplay();
  });
})();
