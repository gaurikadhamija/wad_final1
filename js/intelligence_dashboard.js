/*
 * QueueLess - Queue Intelligence Dashboard
 * File: intelligence_dashboard.js
 * Scope: intelligence.html only
 */

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {

        // ==========================================
        // 1. QUEUE DATA
        // ==========================================

        // Sample data for demonstration.
        // Later this can be replaced with PHP/MySQL API data.

        var queueData = [
            {
                name: "College Administration Office",
                active: 4,
                physicalWait: 45,
                virtualWait: 14
            },
            {
                name: "Library Help Desk",
                active: 2,
                physicalWait: 18,
                virtualWait: 5
            },
            {
                name: "Campus Cafeteria Express",
                active: 9,
                physicalWait: 35,
                virtualWait: 12
            },
            {
                name: "Medical Centre & Clinic",
                active: 3,
                physicalWait: 28,
                virtualWait: 8
            },
            {
                name: "IT Helpdesk & Wi-Fi Desk",
                active: 1,
                physicalWait: 15,
                virtualWait: 4
            },
            {
                name: "Accounts & Fee Counter",
                active: 7,
                physicalWait: 55,
                virtualWait: 18
            }
        ];

        // ==========================================
        // 2. PEAK HOUR DATA
        // ==========================================

        var peakHours = [
            {
                time: "09:00 AM – 10:00 AM",
                label: "Morning Initialization",
                load: 25,
                wait: 6
            },
            {
                time: "10:00 AM – 12:00 PM",
                label: "Morning Rush & Admissions",
                load: 92,
                wait: 22
            },
            {
                time: "12:00 PM – 02:00 PM",
                label: "Lunch Hour Shift",
                load: 58,
                wait: 14
            },
            {
                time: "02:00 PM – 04:00 PM",
                label: "Afternoon Consultations",
                load: 38,
                wait: 8
            }
        ];

        // ==========================================
        // 3. CALCULATION FUNCTIONS
        // ==========================================

        function getTotalTokens() {

            var total = 0;

            for (var i = 0; i < queueData.length; i++) {
                total += queueData[i].active;
            }

            return total;
        }

        function getAverageWait() {

            var total = 0;

            for (var i = 0; i < queueData.length; i++) {
                total += queueData[i].virtualWait;
            }

            return Math.round(total / queueData.length);
        }

        function getTimeSaved(service) {

            return service.physicalWait -
                   service.virtualWait;
        }

        function getEfficiency(service) {

            return Math.round(
                (getTimeSaved(service) /
                service.physicalWait) * 100
            );
        }

        function getCongestionIndex() {

            var index = Math.round(
                (getTotalTokens() / 80) * 100
            );

            return Math.min(index, 100);
        }

        function getCurrentTime() {

            return new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        // ==========================================
        // 4. DOM HELPER FUNCTION
        // ==========================================

        function updateText(element, value) {

            if (element) {
                element.textContent = value;
            }
        }
                // ==========================================
        // 5. UPDATE OVERVIEW DASHBOARD
        // ==========================================

        function updateOverview() {

            var cards = document.querySelectorAll(
                "#tab-intel-overview .stat-card"
            );

            var congestion = getCongestionIndex();

            var averageEfficiency = 0;

            for (var i = 0; i < queueData.length; i++) {
                averageEfficiency += getEfficiency(queueData[i]);
            }

            averageEfficiency = Math.round(
                averageEfficiency / queueData.length
            );

            // Card 1: Congestion Index

            if (cards[0]) {

                updateText(
                    cards[0].querySelector(".stat-number"),
                    congestion + "%"
                );

                updateText(
                    cards[0].querySelector(".stat-subtext"),
                    congestion < 40
                        ? "Operating in Optimal Zone"
                        : congestion < 70
                            ? "Moderate Campus Load"
                            : "High Congestion"
                );
            }

            // Card 2: Forecasting Accuracy
            // Demonstration value, not an actual model evaluation.

            if (cards[1]) {

                updateText(
                    cards[1].querySelector(".stat-number"),
                    "94.2%"
                );

                updateText(
                    cards[1].querySelector(".stat-subtext"),
                    "Demo forecasting confidence"
                );
            }

            // Card 3: Peak Hour

            if (cards[2]) {

                updateText(
                    cards[2].querySelector(".stat-number"),
                    "10 AM – 12 PM"
                );

                updateText(
                    cards[2].querySelector(".stat-subtext"),
                    "Highest expected traffic"
                );
            }

            // Card 4: Efficiency Gain

            if (cards[3]) {

                updateText(
                    cards[3].querySelector(".stat-number"),
                    "+" + averageEfficiency + "%"
                );

                updateText(
                    cards[3].querySelector(".stat-subtext"),
                    "Average waiting time reduction"
                );
            }
        }

        // ==========================================
        // 6. WAITING TIME INSIGHTS
        // ==========================================

        function updateWaitingInsights() {

            var tableBody = document.querySelector(
                "#tab-intel-insights table tbody"
            );

            if (!tableBody) return;

            tableBody.innerHTML = "";

            for (var i = 0; i < queueData.length; i++) {

                var service = queueData[i];

                var row = document.createElement("tr");

                var values = [
                    service.name,
                    service.active + " students",
                    service.physicalWait + " mins standing",
                    "~" + service.virtualWait + " mins remote",
                    getTimeSaved(service) + " mins saved"
                ];

                for (var j = 0; j < values.length; j++) {

                    var cell = document.createElement("td");

                    cell.textContent = values[j];

                    if (j > 0) {
                        cell.className = "tabular-nums";
                    }

                    if (j === 2) {
                        cell.style.color = "#E74C3C";
                        cell.style.fontWeight = "700";
                    }

                    if (j === 3) {
                        cell.style.color = "#27AE60";
                        cell.style.fontWeight = "700";
                    }

                    row.appendChild(cell);
                }

                // Efficiency column

                var efficiencyCell =
                    document.createElement("td");

                var badge = document.createElement("span");

                badge.className = "badge badge-success";

                badge.textContent =
                    "+" + getEfficiency(service) + "% Faster";

                efficiencyCell.appendChild(badge);

                row.appendChild(efficiencyCell);

                tableBody.appendChild(row);
            }
        }

        // ==========================================
        // 7. PEAK HOUR ANALYSIS
        // ==========================================

        function updatePeakHours() {

            var section = document.querySelector(
                "#tab-intel-peak .card"
            );

            if (!section) return;

            // Remove old generated rows only.

           // Remove existing peak-hour rows but preserve the card header.
           Array.from(section.children).forEach(function (child) {
            if (!child.classList.contains("card-header")) {
                child.remove();
            }
        });

            for (var i = 0; i < peakHours.length; i++) {

                var slot = peakHours[i];

                var row = document.createElement("div");

                row.setAttribute(
                    "data-generated-peak",
                    "true"
                );

                row.style.cssText =
                    "padding:16px;" +
                    "display:flex;" +
                    "align-items:center;" +
                    "justify-content:space-between;" +
                    "gap:16px;" +
                    "flex-wrap:wrap;" +
                    "border-bottom:1px solid var(--color-border);";

                // Time information

                var details = document.createElement("div");

                details.style.minWidth = "180px";

                var time = document.createElement("strong");

                time.textContent = slot.time;

                var label = document.createElement("div");

                label.textContent = slot.label;

                label.style.cssText =
                    "font-size:.75rem;" +
                    "color:var(--color-text-muted);";

                details.appendChild(time);
                details.appendChild(label);

                // Progress bar

                var track = document.createElement("div");

                track.className = "progress-track";

                track.style.cssText =
                    "flex:1;min-width:150px;margin:0;";

                var fill = document.createElement("div");

                fill.className = "progress-fill";

                fill.style.width = slot.load + "%";

                if (slot.load >= 75) {
                    fill.style.background = "#E74C3C";
                } else if (slot.load >= 45) {
                    fill.style.background = "#E67E22";
                } else {
                    fill.style.background = "#27AE60";
                }

                track.appendChild(fill);

                // Traffic status

                var badge = document.createElement("span");

                if (slot.load >= 75) {

                    badge.className = "badge badge-danger";

                    badge.textContent =
                        "High Traffic (~" + slot.wait + "m wait)";

                } else if (slot.load >= 45) {

                    badge.className = "badge badge-warning";

                    badge.textContent =
                        "Moderate Traffic (~" + slot.wait + "m wait)";

                } else {

                    badge.className = "badge badge-success";

                    badge.textContent =
                        "Low Traffic (~" + slot.wait + "m wait)";
                }

                row.appendChild(details);
                row.appendChild(track);
                row.appendChild(badge);

                section.appendChild(row);
            }
        }
                // ==========================================
        // 8. SMART RECOMMENDATIONS
        // ==========================================

        function updateRecommendations() {

            var container = document.querySelector(
                "#tab-intel-recs .grid"
            );

            if (!container) return;

            container.innerHTML = "";

            // Find the busiest service.

            var busiest = queueData[0];

            for (var i = 1; i < queueData.length; i++) {

                if (queueData[i].active > busiest.active) {
                    busiest = queueData[i];
                }
            }

            // Find the service with the shortest virtual wait.

            var fastest = queueData[0];

            for (var j = 1; j < queueData.length; j++) {

                if (queueData[j].virtualWait < fastest.virtualWait) {
                    fastest = queueData[j];
                }
            }

            var recommendations = [

                {
                    title: "Optimize " + busiest.name,

                    subtitle: "Queue Load Balancing",

                    badge: "High Priority",

                    reason:
                        busiest.active +
                        " active students are currently waiting. " +
                        "Estimated virtual wait is " +
                        busiest.virtualWait + " minutes.",

                    impact:
                        "Consider opening an additional counter or " +
                        "assigning available staff to this service."
                },

                {
                    title: "Promote Faster Service Options",

                    subtitle: "Student Experience Optimization",

                    badge: "Optimization",

                    reason:
                        fastest.name +
                        " currently has the shortest estimated " +
                        "virtual waiting time of " +
                        fastest.virtualWait + " minutes.",

                    impact:
                        "Direct students towards lower-wait services " +
                        "where appropriate and encourage off-peak visits."
                }
            ];

            for (var k = 0; k < recommendations.length; k++) {

                var item = recommendations[k];

                var card = document.createElement("div");

                card.className = "card";

                card.style.borderLeft =
                    k === 0
                        ? "4px solid #27AE60"
                        : "4px solid #E8A0A8";

                var header = document.createElement("div");

                header.className = "card-header";

                var titleArea = document.createElement("div");

                var heading = document.createElement("h3");

                heading.textContent = item.title;

                heading.style.cssText =
                    "font-size:1.05rem;" +
                    "color:var(--color-bole-dark);";

                var subtitle = document.createElement("span");

                subtitle.className = "card-subtitle";

                subtitle.textContent = item.subtitle;

                titleArea.appendChild(heading);

                titleArea.appendChild(subtitle);

                var badge = document.createElement("span");

                badge.className =
                    k === 0
                        ? "badge badge-success"
                        : "badge badge-pink";

                badge.textContent = item.badge;

                header.appendChild(titleArea);

                header.appendChild(badge);

                var body = document.createElement("div");

                body.style.cssText =
                    "font-size:.885rem;" +
                    "color:var(--color-text-main);" +
                    "margin:12px 0;";

                var reason = document.createElement("p");

                reason.textContent = item.reason;

                var impact = document.createElement("p");

                impact.style.marginTop = "10px";

                impact.textContent =
                    "Suggested Action: " + item.impact;

                body.appendChild(reason);

                body.appendChild(impact);

                card.appendChild(header);

                card.appendChild(body);

                container.appendChild(card);
            }
        }

        // ==========================================
        // 9. NOTIFICATION CENTER
        // ==========================================

        var notificationData = [

            {
                type: "Turn Approaching",
                title: "Token QL-104 Alert",
                message:
                    "Only 2 students are ahead in the " +
                    "College Administration queue.",
                time: "10:28 AM",
                badge: "badge-pink"
            },

            {
                type: "Queue Status Updated",
                title: "Counter 02 Processing Speed Increased",
                message:
                    "Estimated waiting time has reduced by " +
                    "5 minutes in this demonstration.",
                time: "10:22 AM",
                badge: "badge-warning"
            },

            {
                type: "Counter Information",
                title: "Counter 03 Opened",
                message:
                    "An additional counter has been activated " +
                    "for Scholarship and Accounts.",
                time: "10:05 AM",
                badge: "badge-success"
            }
        ];

        function updateNotifications() {

            var card = document.querySelector(
                "#tab-intel-alerts .card"
            );

            if (!card) return;

            var list = card.querySelector(".card-header");

            if (!list) return;

            list = list.nextElementSibling;

            if (!list) return;

            list.innerHTML = "";

            for (var i = 0; i < notificationData.length; i++) {

                var item = notificationData[i];

                var row = document.createElement("div");

                row.style.cssText =
                    "padding:18px;" +
                    "border:1px solid var(--color-border);" +
                    "border-radius:var(--radius-md);" +
                    "display:flex;" +
                    "justify-content:space-between;" +
                    "align-items:flex-start;" +
                    "gap:16px;";

                var content = document.createElement("div");

                var header = document.createElement("div");

                header.style.cssText =
                    "display:flex;" +
                    "align-items:center;" +
                    "gap:8px;" +
                    "flex-wrap:wrap;";

                var badge = document.createElement("span");

                badge.className = "badge " + item.badge;

                badge.textContent = item.type;

                var title = document.createElement("strong");

                title.textContent = item.title;

                header.appendChild(badge);

                header.appendChild(title);

                var message = document.createElement("p");

                message.textContent = item.message;

                message.style.marginTop = "6px";

                content.appendChild(header);

                content.appendChild(message);

                var time = document.createElement("span");

                time.textContent = item.time;

                time.style.cssText =
                    "font-size:.775rem;" +
                    "color:var(--color-text-muted);" +
                    "white-space:nowrap;";

                row.appendChild(content);

                row.appendChild(time);

                list.appendChild(row);
            }
        }
                // ==========================================
        // 10. REFRESH DASHBOARD
        // ==========================================

        function refreshDashboard() {

            updateOverview();

            updateWaitingInsights();

            updatePeakHours();

            updateRecommendations();

            updateNotifications();

            showMessage(
                "Queue Intelligence Dashboard refreshed successfully!"
            );
        }

        // ==========================================
        // 11. SHOW NOTIFICATION MESSAGE
        // ==========================================

        function showMessage(message) {

            var notice = document.getElementById(
                "intel-js-message"
            );

            if (!notice) {

                notice = document.createElement("div");

                notice.id = "intel-js-message";

                notice.style.cssText =
                    "position:fixed;" +
                    "bottom:20px;" +
                    "right:20px;" +
                    "background:#26352F;" +
                    "color:white;" +
                    "padding:14px 20px;" +
                    "border-radius:10px;" +
                    "z-index:9999;" +
                    "font-size:14px;" +
                    "box-shadow:0 4px 15px rgba(0,0,0,.2);";

                document.body.appendChild(notice);
            }

            notice.textContent = message;

            notice.style.display = "block";

            clearTimeout(notice.timer);

            notice.timer = setTimeout(function () {

                notice.style.display = "none";

            }, 3000);
        }

        // ==========================================
        // 12. EXPORT QUEUE REPORT AS CSV
        // ==========================================

        function exportCSV() {

            var rows = [];

            rows.push([
                "Service Name",
                "Active Tokens",
                "Physical Wait",
                "Virtual Wait",
                "Time Saved",
                "Efficiency"
            ]);

            for (var i = 0; i < queueData.length; i++) {

                var service = queueData[i];

                rows.push([
                    service.name,
                    service.active,
                    service.physicalWait + " minutes",
                    service.virtualWait + " minutes",
                    getTimeSaved(service) + " minutes",
                    getEfficiency(service) + "%"
                ]);
            }

            var csv = rows.map(function (row) {

                return row.map(function (value) {

                    return '"' +
                        String(value).replace(/"/g, '""') +
                        '"';

                }).join(",");

            }).join("\n");

            var blob = new Blob(
                [csv],
                { type: "text/csv;charset=utf-8;" }
            );

            var url = URL.createObjectURL(blob);

            var link = document.createElement("a");

            link.href = url;

            link.download = "QueueLess_Intelligence_Report.csv";

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            showMessage("CSV Report downloaded successfully!");
        }

        // ==========================================
        // 13. ADD DASHBOARD BUTTONS
        // ==========================================

        function addDashboardButtons() {

            var topbar = document.querySelector(
                ".dashboard-topbar .topbar-right"
            );

            if (!topbar) return;

            var controls = document.createElement("div");

            controls.style.cssText =
                "display:flex;" +
                "gap:8px;" +
                "align-items:center;" +
                "flex-wrap:wrap;" +
                "margin-right:12px;";

            // Refresh button

            var refreshButton = document.createElement("button");

            refreshButton.type = "button";

            refreshButton.className = "btn btn-outline btn-sm";

            refreshButton.textContent = "Refresh Insights";

            refreshButton.addEventListener(
                "click",
                refreshDashboard
            );

            // Export button

            var exportButton = document.createElement("button");

            exportButton.type = "button";

            exportButton.className = "btn btn-secondary btn-sm";

            exportButton.textContent = "Export CSV";

            exportButton.addEventListener(
                "click",
                exportCSV
            );

            controls.appendChild(refreshButton);

            controls.appendChild(exportButton);

            topbar.insertBefore(
                controls,
                topbar.firstChild
            );
        }

        // ==========================================
        // 14. INITIALIZE DASHBOARD
        // ==========================================

        function initializeDashboard() {

            updateOverview();

            updateWaitingInsights();

            updatePeakHours();

            updateRecommendations();

            updateNotifications();

            addDashboardButtons();

            console.log(
                "QueueLess Intelligence Dashboard initialized."
            );

            console.log(
                "Total active queue tokens:",
                getTotalTokens()
            );

            console.log(
                "Average virtual waiting time:",
                getAverageWait(),
                "minutes"
            );

            console.log(
                "Congestion index:",
                getCongestionIndex() + "%"
            );
        }

        // Run dashboard initialization

        initializeDashboard();

    });

})();