/**
 * QueueLess - Main Common Script
 * File: js/script.js
 * Scope: Global utilities, modals, navigation, and synchronized campus clock
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    // ==========================================
    // 1. REAL-TIME CAMPUS SYNCHRONIZED CLOCK
    // ==========================================
    function updateCampusClock() {
      var now = new Date();
      var hours = now.getHours();
      var minutes = now.getMinutes();
      var ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      var minutesFormatted = minutes < 10 ? "0" + minutes : minutes;
      var timeString = hours + ":" + minutesFormatted + " " + ampm;

      // Update elements with class or id for topbar clock
      var clockElements = document.querySelectorAll(".topbar-system-indicator span:last-child, #topbar-clock, .campus-clock-display");
      clockElements.forEach(function (el) {
        if (el.textContent.includes("Campus Synchronized")) {
          el.textContent = timeString + " · Campus Synchronized";
        } else if (el.textContent.includes("Predictive Engine Active") || el.textContent.includes("Engine Active")) {
          el.textContent = timeString + " · Predictive Engine Active";
        }
      });
    }

    updateCampusClock();
    setInterval(updateCampusClock, 30000);

    // ==========================================
    // 2. MODAL DIALOG CONTROLLER (SIGN-IN & POPUPS)
    // ==========================================
    var modalTriggers = document.querySelectorAll("[data-modal-open]");
    modalTriggers.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var targetId = btn.getAttribute("data-modal-open");
        var modal = document.getElementById(targetId);
        if (modal) {
          modal.style.opacity = "1";
          modal.style.visibility = "visible";
          modal.style.pointerEvents = "auto";
          var box = modal.querySelector(".modal-box");
          if (box) {
            box.style.transform = "scale(1) translateY(0)";
          }
        }
      });
    });

    var modalCloses = document.querySelectorAll(".modal-close-btn, .modal-overlay-backdrop-link, [data-modal-close]");
    modalCloses.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var modal = btn.closest(".modal-overlay") || document.querySelector(".modal-overlay");
        if (modal) {
          modal.style.opacity = "0";
          modal.style.visibility = "hidden";
          modal.style.pointerEvents = "none";
          var box = modal.querySelector(".modal-box");
          if (box) {
            box.style.transform = "scale(0.96) translateY(10px)";
          }
        }
      });
    });

    // Close on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var openModals = document.querySelectorAll('.modal-overlay[style*="opacity: 1"], .modal-dialog-overlay:target');
        openModals.forEach(function (modal) {
          modal.style.opacity = "0";
          modal.style.visibility = "hidden";
          modal.style.pointerEvents = "none";
        });
        if (window.location.hash.includes("modal")) {
          history.pushState("", document.title, window.location.pathname + window.location.search);
        }
      }
    });

    // Login Modal Form Submission
    var loginForm = document.querySelector("#login-modal form");
    if (loginForm) {
      loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var emailInput = loginForm.querySelector('input[type="text"], input[type="email"]');
        var passInput = loginForm.querySelector('input[type="password"]');
        var roleRadio = document.querySelector('input[name="login-role"]:checked');
        var role = roleRadio ? (roleRadio.id === "role-provider" ? "provider" : "student") : "student";

        var email = emailInput ? emailInput.value.trim() : "";
        var password = passInput ? passInput.value.trim() : "";
        
        var submitBtn = loginForm.querySelector('button[type="submit"]');
        var originalText = submitBtn ? submitBtn.textContent : "Sign In";
        if (submitBtn) {
          submitBtn.textContent = "Authenticating with PHP & MySQL...";
          submitBtn.disabled = true;
        }

        try {
          if (window.QueueLessAPI && email && password) {
            var res = await window.QueueLessAPI.login(email, password, role);
            if (res && res.success && res.user) {
              if (window.showQueueNotification) {
                window.showQueueNotification("Welcome back, " + res.user.full_name + "! (" + res.user.role + ")", "success");
              }
              setTimeout(function () {
                if (res.user.role === "admin") {
                  window.location.href = "./admin.html";
                } else if (res.user.role === "operator") {
                  window.location.href = "./operator.html";
                } else if (res.user.role === "provider") {
                  window.location.href = "./provider.html";
                } else {
                  window.location.href = "./student.html";
                }
              }, 400);
              return;
            } else if (res && res.error && !res.isStaticEnvironment) {
              if (window.showQueueNotification) {
                window.showQueueNotification(res.error, "warning");
              }
              if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
              }
              return;
            }
          }
        } catch (err) {
          console.warn("[QueueLess Auth] Backend login catch:", err);
        }

        // Demo redirect fallback if running without live PHP database
        setTimeout(function () {
          if (role === "provider") {
            window.location.href = "./provider.html";
          } else {
            window.location.href = "./student.html";
          }
        }, 400);
      });
    }

    // ==========================================
    // 3. SMOOTH SCROLLING FOR ON-PAGE ANCHORS
    // ==========================================
    var anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"]):not([href^="#tab-"]):not([href^="#create-queue"]):not([href^="#cancel-token"])');
    anchorLinks.forEach(function (link) {
      link.addEventListener("click", function (e) {
        var targetId = link.getAttribute("href").substring(1);
        var targetElement = document.getElementById(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // ==========================================
    // 4. TOAST NOTIFICATION UTILITY
    // ==========================================
    window.showQueueNotification = function (message, type) {
      var toast = document.createElement("div");
      toast.className = "queue-toast toast-" + (type || "info");
      toast.style.cssText = [
        "position: fixed;",
        "bottom: 24px;",
        "right: 24px;",
        "background: var(--color-surface, #ffffff);",
        "border: 1px solid var(--color-border, #E7AE75);",
        "border-left: 4px solid " + (type === "success" ? "#27AE60" : type === "warning" ? "#E67E22" : "#F28AA1") + ";",
        "padding: 14px 20px;",
        "border-radius: 8px;",
        "box-shadow: 0 10px 30px rgba(0,0,0,0.12);",
        "font-family: var(--font-body, sans-serif);",
        "font-size: 0.88rem;",
        "font-weight: 600;",
        "color: var(--color-bole-dark, #26160F);",
        "z-index: 9999;",
        "display: flex;",
        "align-items: center;",
        "gap: 10px;",
        "transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);",
        "transform: translateY(20px);",
        "opacity: 0;"
      ].join(" ");

      toast.innerHTML = '<span>' + (type === "success" ? "✓" : "●") + '</span><span>' + message + '</span>';
      document.body.appendChild(toast);

      requestAnimationFrame(function () {
        toast.style.transform = "translateY(0)";
        toast.style.opacity = "1";
      });

      setTimeout(function () {
        toast.style.transform = "translateY(20px)";
        toast.style.opacity = "0";
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      }, 3500);
    };
  });
})();
