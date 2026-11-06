/*
 * QueueLess - User Dashboard JavaScript
 * Scope: user-dashboard.html only.
 * Uses core WAD-level JavaScript: variables, arrays/objects, functions,
 * conditions, loops, DOM selection/manipulation, events, form validation,
 * Date methods, JSON and localStorage.
 * Demo only: no server/database or real-time provider synchronization.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var STORAGE_KEY = "queueless_user_dashboard_v1";
    var serviceCards = document.querySelectorAll("#tab-explore-services .service-card, #tab-user-explore ~ .service-card");
    // The HTML's explore panel is identified by its panel class; use it as the source of cards.
    var explorePanel = document.querySelector(".panel-user-explore");
    if (explorePanel) serviceCards = explorePanel.querySelectorAll(".service-card");

    var searchInput = document.querySelector(".search-input-group input");
    var categorySelect = document.querySelector(".category-select-group select");
    var resetButton = document.querySelector(".search-filter-bar button");
    var settingsForm = document.querySelector("#tab-settings form");
    var historyBody = document.querySelector("#tab-queue-history tbody");

    var services = [
      { name: "College Administration Office", category: "Admin", prefix: "QL", people: 3, wait: 14, counter: "Counter 02", room: "Room 104, West Wing" },
      { name: "Library Help Desk", category: "Library", prefix: "LIB", people: 2, wait: 5, counter: "Counter L1", room: "Library 1F" },
      { name: "Campus Cafeteria Express", category: "Dining", prefix: "CAF", people: 9, wait: 12, counter: "Counter C2", room: "Cafeteria" },
      { name: "Medical Centre & Clinic", category: "Health", prefix: "MED", people: 3, wait: 8, counter: "Counter M1", room: "Health Wing" },
      { name: "IT Helpdesk & Wi-Fi Desk", category: "Admin", prefix: "IT", people: 1, wait: 4, counter: "Counter I1", room: "Lab 3" },
      { name: "Accounts & Fee Counter", category: "Financial", prefix: "ACC", people: 7, wait: 18, counter: "Counter A1", room: "Admin Building" }
    ];

    var state = {
      activeQueue: {
        token: "QL-104", service: services[0].name, peopleAhead: 3,
        wait: 14, counter: "Counter 02", room: "Room 104, West Wing",
        joinedAt: new Date().toISOString(), status: "Active"
      },
      history: [],
      preferences: { name: "Alex Morgan", phone: "+1 (555) 234-5678", notice: "Alert me when 2 people are ahead (Recommended)" },
      nextNumber: 105
    };

    function loadState() {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          var data = JSON.parse(saved);
          if (data && typeof data === "object") {
            if (data.activeQueue !== undefined) state.activeQueue = data.activeQueue;
            if (Array.isArray(data.history)) state.history = data.history;
            if (data.preferences) state.preferences = data.preferences;
            if (data.nextNumber) state.nextNumber = data.nextNumber;
          }
        }
      } catch (error) { console.warn("QueueLess: could not read saved dashboard data.", error); }
    }

    function saveState() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
      catch (error) { console.warn("QueueLess: browser storage is unavailable.", error); }
    }

    function findService(name) {
      for (var i = 0; i < services.length; i++) if (services[i].name === name) return services[i];
      return null;
    }

    function notify(message, isError) {
      var box = document.getElementById("queueless-user-notice");
      if (!box) {
        box = document.createElement("div");
        box.id = "queueless-user-notice";
        box.setAttribute("role", "status");
        box.setAttribute("aria-live", "polite");
        box.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:9999;max-width:360px;padding:13px 17px;border-radius:10px;background:#26352f;color:white;box-shadow:0 6px 24px rgba(0,0,0,.18);font:600 14px/1.45 Arial,sans-serif";
        document.body.appendChild(box);
      }
      box.textContent = message;
      box.style.background = isError ? "#9f3f3f" : "#26352f";
      box.style.display = "block";
      window.clearTimeout(box.timer);
      box.timer = window.setTimeout(function () { box.style.display = "none"; }, 3000);
    }

    function setText(selector, value) {
      var elements = document.querySelectorAll(selector);
      for (var i = 0; i < elements.length; i++) elements[i].textContent = value;
    }

    function formatDate(value) {
      var date = new Date(value);
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }

    function formatTime(value) {
      return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function activeQueueExists() {
      return state.activeQueue && state.activeQueue.status === "Active";
    }

    function renderQueue() {
      var queue = activeQueueExists() ? state.activeQueue : null;
      var token = queue ? queue.token : "—";
      var serviceName = queue ? queue.service : "No active queue";
      var ahead = queue ? queue.peopleAhead : 0;
      var wait = queue ? queue.wait : 0;

      var overview = document.querySelector("#tab-overview .stats-grid");
      if (overview) {
        var stats = overview.querySelectorAll(".stat-card");
        if (stats[0]) { stats[0].querySelector(".stat-number").textContent = token; stats[0].querySelector(".stat-subtext").textContent = queue ? "Service: " + serviceName : "Join a service to receive a token"; }
        if (stats[1]) { stats[1].querySelector(".stat-number").textContent = queue ? "#" + (ahead + 1) + " in line" : "—"; stats[1].querySelector(".stat-subtext").textContent = ahead + " people ahead"; }
        if (stats[2]) { stats[2].querySelector(".stat-number").textContent = queue ? "~" + wait + " mins" : "—"; }
        if (stats[3]) { stats[3].querySelector(".stat-number").textContent = queue ? queue.counter : "—"; stats[3].querySelector(".stat-subtext").textContent = queue ? queue.room : "No desk assigned"; }
      }

      setText("#tab-overview .card-title", "Token " + token + " — " + serviceName);
      setText("#tab-token-tracking .token-hero-id", token);
      setText("#tab-token-tracking .token-hero-service", serviceName);
      setText("#tab-token-tracking .radial-pct", queue ? Math.max(0, 100 - ahead * 15) + "%" : "0%");
      setText("#tab-token-tracking .radial-sub", queue ? "Progress" : "No active token");

      var tracking = document.querySelector("#tab-token-tracking .radial-gauge-container");
      if (tracking) {
        var gaugeValues = tracking.querySelectorAll(".tabular-nums");
        if (gaugeValues[0]) gaugeValues[0].textContent = String(ahead);
        if (gaugeValues[1]) gaugeValues[1].textContent = queue ? "~" + wait + "m" : "—";
      }
      var circle = document.querySelector("#tab-token-tracking .radial-circle-val");
      if (circle) {
        var percent = queue ? Math.max(0, 100 - ahead * 15) : 0;
        circle.style.strokeDashoffset = String(377 - (377 * percent / 100));
      }

      var activePanel = document.querySelector("#tab-active-queue");
      if (activePanel) {
        var cells = activePanel.querySelectorAll(".custom-table tbody tr");
        var values = [token, serviceName, String(ahead) + " people ahead of you", "~" + wait + " mins", queue ? "Now serving" : "—", queue ? queue.counter + " (" + queue.room + ")" : "—"];
        for (var j = 0; j < cells.length; j++) if (cells[j].cells[1]) cells[j].cells[1].textContent = values[j];
        var badge = activePanel.querySelector(".card-header .badge");
        if (badge) badge.textContent = queue ? "● Waiting" : "No Active Queue";
      }

      var intro = document.querySelector("#tab-overview > div:first-child p");
      if (intro) intro.textContent = queue ? "You have 1 active virtual queue token for " + serviceName + "." : "You do not have an active virtual queue token. Explore services to join a queue.";

      var cancelLink = document.querySelector('#tab-active-queue a[href="#cancel-token-modal"]');
      if (cancelLink) { cancelLink.style.pointerEvents = queue ? "auto" : "none"; cancelLink.style.opacity = queue ? "1" : ".45"; }

      for (var k = 0; k < serviceCards.length; k++) {
        var cardTitle = serviceCards[k].querySelector("h3");
        var button = serviceCards[k].querySelector("button");
        if (button && cardTitle) {
          var current = queue && cardTitle.textContent.trim() === serviceName;
          button.disabled = !!queue;
          button.textContent = current ? "Your Active Queue" : (queue ? "One Active Token at a Time" : "Join Virtual Queue");
          button.style.opacity = queue ? ".65" : "1";
        }
      }
    }

    function renderHistory() {
      if (!historyBody) return;
      var generatedRows = historyBody.querySelectorAll("tr[data-queueless-record='yes']");
      for (var i = 0; i < generatedRows.length; i++) generatedRows[i].remove();
      for (var j = 0; j < state.history.length; j++) {
        var record = state.history[j];
        var row = document.createElement("tr");
        row.setAttribute("data-queueless-record", "yes");
        var values = [record.token, record.service, record.date, record.time, record.wait, record.counter, record.status];
        for (var k = 0; k < values.length; k++) {
          var cell = document.createElement("td");
          cell.textContent = values[k];
          if (k === 0) cell.className = "tabular-nums";
          row.appendChild(cell);
        }
        historyBody.insertBefore(row, historyBody.firstChild);
      }
      var badge = document.querySelector("#tab-queue-history .card-header .badge");
      if (badge) badge.textContent = (9 + state.history.length) + " Total Consultations";
    }

    function joinQueue(service) {
      if (activeQueueExists()) { notify("You already have an active token. Leave that queue before joining another.", true); return; }

      // Try genuine PHP + MySQL backend first
      if (window.QueueLessAPI && typeof window.QueueLessAPI.joinQueue === "function") {
        window.QueueLessAPI.joinQueue(service.id || 1).then(function (res) {
          if (res && res.success && res.token) {
            state.activeQueue = {
              id: res.token.id,
              token: res.token.token_display,
              service: res.token.service_name,
              peopleAhead: res.token.position_ahead,
              wait: res.token.estimated_wait_minutes,
              counter: service.counter || "Counter 02",
              room: service.room || "Room 104, West Wing",
              joinedAt: res.token.created_at || new Date().toISOString(),
              status: "Active"
            };
            saveState(); renderQueue();
            notify("You joined via PHP & MySQL. Your token is " + res.token.token_display + ".");
          }
        }).catch(function(err) {
          console.warn("[QueueLess] Backend fetch failed", err);
        });
      }

      var now = new Date();
      var token = service.prefix + "-" + String(state.nextNumber).padStart(3, "0");
      state.nextNumber++;
      state.activeQueue = { token: token, service: service.name, peopleAhead: service.people, wait: service.wait, counter: service.counter, room: service.room, joinedAt: now.toISOString(), status: "Active" };
      saveState(); renderQueue();
      var activeTab = document.getElementById("tab-user-active");
      if (activeTab) activeTab.checked = true;
      var drawer = document.getElementById("mobile-sidebar-toggle");
      if (drawer) drawer.checked = false;
      notify("You joined the queue. Your token is " + token + ".");
    }

    function cancelQueue() {
      if (!activeQueueExists()) { notify("There is no active queue to leave.", true); return; }
      var queue = state.activeQueue;

      if (window.QueueLessAPI && queue.id) {
        window.QueueLessAPI.cancelToken(queue.id, "Student cancelled").catch(function(){});
      }

      var started = new Date(queue.joinedAt);
      var elapsed = Math.max(0, Math.round((new Date() - started) / 60000));
      state.history.unshift({ token: queue.token, service: queue.service, date: formatDate(new Date()), time: formatTime(started), wait: elapsed + " mins", counter: queue.counter, status: "Cancelled" });
      state.activeQueue = null;
      saveState(); renderQueue(); renderHistory();
      window.location.hash = "";
      notify("Your queue has been cancelled.");
    }

    // Real-time polling via PHP endpoint for student's active token position
    function pollServerToken() {
      if (window.QueueLessAPI && activeQueueExists()) {
        window.QueueLessAPI.getMyToken().then(function (res) {
          if (res && res.success && res.has_token && res.active_token) {
            var tok = res.active_token;
            if (state.activeQueue) {
              state.activeQueue.peopleAhead = tok.people_ahead;
              state.activeQueue.wait = tok.estimated_wait_minutes;
              state.activeQueue.counter = tok.counter_number + " (" + tok.counter_name + ")";
              if (tok.status === "serving" && state.activeQueue.status !== "Serving") {
                state.activeQueue.status = "Serving";
                notify("📢 YOUR TURN! Please proceed to " + tok.counter_number);
              }
              renderQueue();
            }
          }
        }).catch(function(){});
      }
    }
    window.setInterval(pollServerToken, 5000);

    function filterServices() {
      var query = searchInput ? searchInput.value.toLowerCase().trim() : "";
      var category = categorySelect ? categorySelect.value : "all";
      for (var i = 0; i < serviceCards.length; i++) {
        var card = serviceCards[i];
        var heading = card.querySelector("h3");
        var service = heading ? findService(heading.textContent.trim()) : null;
        var text = card.textContent.toLowerCase();
        var matchesQuery = text.indexOf(query) !== -1;
        var matchesCategory = category === "all" || (service && service.category === category);
        card.style.display = matchesQuery && matchesCategory ? "" : "none";
      }
    }

    function loadPreferences() {
      if (!settingsForm) return;
      var fields = settingsForm.querySelectorAll("input, select");
      if (fields[0]) fields[0].value = state.preferences.name || "";
      if (fields[2]) fields[2].value = state.preferences.phone || "";
      if (fields[3] && state.preferences.notice) fields[3].value = state.preferences.notice;
      setText(".user-name", state.preferences.name || "Alex Morgan");
    }

    function savePreferences(event) {
      event.preventDefault();
      var fields = settingsForm.querySelectorAll("input, select");
      var name = fields[0] ? fields[0].value.trim() : "";
      var phone = fields[2] ? fields[2].value.trim() : "";
      if (name.length < 2) { notify("Please enter a valid name.", true); if (fields[0]) fields[0].focus(); return; }
      if (phone && !/^[+0-9() .-]{7,20}$/.test(phone)) { notify("Please enter a valid phone number.", true); if (fields[2]) fields[2].focus(); return; }
      state.preferences = { name: name, phone: phone, notice: fields[3] ? fields[3].value : "" };
      saveState(); setText(".user-name", name); notify("Your preferences have been saved on this browser.");
    }

    function bindEvents() {
      if (searchInput) searchInput.addEventListener("input", filterServices);
      if (categorySelect) categorySelect.addEventListener("change", filterServices);
      if (resetButton) resetButton.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";
        if (categorySelect) categorySelect.value = "all";
        filterServices();
      });
      for (var i = 0; i < serviceCards.length; i++) {
        (function (card) {
          var button = card.querySelector("button");
          if (!button) return;
          button.addEventListener("click", function () {
            var heading = card.querySelector("h3");
            var service = heading ? findService(heading.textContent.trim()) : null;
            if (service) joinQueue(service);
          });
        }(serviceCards[i]));
      }
      var confirmButton = document.querySelector("#cancel-token-modal .btn-primary");
      if (confirmButton) confirmButton.addEventListener("click", function (event) { event.preventDefault(); cancelQueue(); });
      var stayButton = document.querySelector("#cancel-token-modal .btn-outline");
      if (stayButton) stayButton.addEventListener("click", function () { window.location.hash = ""; });
      if (settingsForm) settingsForm.addEventListener("submit", savePreferences);
      var tabInputs = document.querySelectorAll('input[name="user-tab"]');
      for (var j = 0; j < tabInputs.length; j++) tabInputs[j].addEventListener("change", function () {
        var drawer = document.getElementById("mobile-sidebar-toggle");
        if (drawer) drawer.checked = false;
      });
    }

    loadState();
    bindEvents();
    loadPreferences();
    renderQueue();
    renderHistory();

    var clock = document.querySelector(".topbar-system-indicator span:last-child");
    function updateClock() {
      if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · Campus Synchronized";
    }
    updateClock();
    window.setInterval(updateClock, 60000);
  });
}());
