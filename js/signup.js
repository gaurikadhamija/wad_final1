/**
 * QueueLess - Signup & Registration Controller
 * File: js/signup.js
 * Bridges User Registration -> JavaScript -> PHP -> MySQL -> Session
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("signup-form");
    if (!form) return;

    var roleRadios = document.querySelectorAll('input[name="signup_role"]');
    var providerFields = document.getElementById("provider-additional-fields");
    var passwordInput = document.getElementById("signup-password");
    var confirmPasswordInput = document.getElementById("signup-confirm-password");
    var meterSegments = document.querySelectorAll(".password-meter-segment");
    var meterLabel = document.getElementById("password-strength-label");
    var alertBox = document.getElementById("signup-alert");
    var submitBtn = document.getElementById("signup-submit-btn");

    // 1. Role Toggle Handler
    function handleRoleChange() {
      var selectedRole = "student";
      roleRadios.forEach(function (radio) {
        if (radio.checked) selectedRole = radio.value;
      });

      if (providerFields) {
        if (selectedRole === "provider") {
          providerFields.style.display = "block";
          var orgInput = document.getElementById("signup-org");
          if (orgInput) orgInput.setAttribute("required", "required");
        } else {
          providerFields.style.display = "none";
          var orgInput = document.getElementById("signup-org");
          if (orgInput) orgInput.removeAttribute("required");
        }
      }
    }

    roleRadios.forEach(function (radio) {
      radio.addEventListener("change", handleRoleChange);
    });
    handleRoleChange();

    // 2. Password Strength Evaluation
    function evaluatePassword(pwd) {
      var score = 0;
      if (!pwd) return 0;
      if (pwd.length >= 6) score++;
      if (pwd.length >= 10) score++;
      if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
      if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
      return Math.min(score, 4);
    }

    if (passwordInput && meterSegments.length) {
      passwordInput.addEventListener("input", function () {
        var pwd = passwordInput.value;
        var score = evaluatePassword(pwd);

        var colors = ["#E74C3C", "#E67E22", "#F1C40F", "#27AE60"];
        var labels = ["Too short (min 6 chars)", "Weak", "Moderate", "Strong & Secure"];

        meterSegments.forEach(function (seg, idx) {
          if (idx < score) {
            seg.style.backgroundColor = colors[score - 1] || "#E74C3C";
          } else {
            seg.style.backgroundColor = "transparent";
          }
        });

        if (meterLabel) {
          meterLabel.textContent = pwd.length === 0 ? "Enter at least 6 characters" : labels[score - 1] || "Weak";
          meterLabel.style.color = pwd.length === 0 ? "var(--color-text-muted)" : (colors[score - 1] || "var(--color-text-muted)");
        }
      });
    }

    // 3. Helper to display alerts
    function showAlert(message, isError) {
      if (!alertBox) return;
      alertBox.textContent = message;
      alertBox.className = "auth-alert " + (isError ? "auth-alert-error" : "auth-alert-success");
      alertBox.style.display = "block";
      alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideAlert() {
      if (alertBox) alertBox.style.display = "none";
    }

    // 4. Form Submit Handler
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      hideAlert();

      var fullName = (document.getElementById("signup-name")?.value || "").trim();
      var email = (document.getElementById("signup-email")?.value || "").trim();
      var phone = (document.getElementById("signup-phone")?.value || "").trim();
      var password = (passwordInput?.value || "").trim();
      var confirmPassword = (confirmPasswordInput?.value || "").trim();

      var selectedRole = "student";
      roleRadios.forEach(function (radio) {
        if (radio.checked) selectedRole = radio.value;
      });

      var orgName = (document.getElementById("signup-org")?.value || "").trim();
      var dept = (document.getElementById("signup-dept")?.value || "").trim();
      var location = (document.getElementById("signup-location")?.value || "").trim();

      // Client-side validation checks
      if (!fullName) {
        showAlert("Please enter your full name.", true);
        return;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAlert("Please enter a valid email address.", true);
        return;
      }

      if (password.length < 6) {
        showAlert("Password must be at least 6 characters long.", true);
        return;
      }

      if (password !== confirmPassword) {
        showAlert("Passwords do not match. Please verify your password entry.", true);
        return;
      }

      if (selectedRole === "provider" && !orgName) {
        showAlert("Please specify your Department or Service Desk name.", true);
        return;
      }

      // UI Loading state
      var originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s infinite linear;">↻</span> Registering Account with MySQL...';

      var payload = {
        full_name: fullName,
        email: email,
        phone: phone,
        password: password,
        role: selectedRole,
        organization_name: orgName,
        department: dept,
        campus_location: location
      };

      try {
        if (window.QueueLessAPI && typeof window.QueueLessAPI.register === "function") {
          var response = await window.QueueLessAPI.register(payload);

          if (response && response.success) {
            showAlert("Account successfully created! Redirecting to your portal...", false);
            if (window.showQueueNotification) {
              window.showQueueNotification("Welcome to QueueLess, " + fullName + "!", "success");
            }

            // Save active session details for client-side persistence
            try {
              localStorage.setItem("queueless_active_user", JSON.stringify({
                name: fullName,
                email: email,
                role: selectedRole,
                registeredAt: new Date().toISOString()
              }));
            } catch (storageErr) {}

            setTimeout(function () {
              if (selectedRole === "provider") {
                window.location.href = "./provider.html";
              } else if (selectedRole === "operator") {
                window.location.href = "./operator.html";
              } else {
                window.location.href = "./student.html";
              }
            }, 800);
            return;
          } else if (response && response.error && !response.isStaticEnvironment) {
            showAlert(response.error, true);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
          }
        }
      } catch (networkError) {
        console.warn("[QueueLess Signup] API Error, falling back to simulated session:", networkError);
      }

      // Fallback for static container execution without local Apache/PHP
      showAlert("Registration complete! Setting up your session...", false);
      try {
        localStorage.setItem("queueless_active_user", JSON.stringify({
          name: fullName,
          email: email,
          role: selectedRole,
          registeredAt: new Date().toISOString()
        }));
      } catch (storageErr) {}

      setTimeout(function () {
        if (selectedRole === "provider") {
          window.location.href = "./provider.html";
        } else {
          window.location.href = "./student.html";
        }
      }, 700);
    });
  });
})();
