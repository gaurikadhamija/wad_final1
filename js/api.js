/**
 * QueueLess - Centralized Vanilla JavaScript API Service
 * File: js/api.js
 * Bridges User Actions -> JavaScript -> PHP -> MySQL -> Updated Interface
 */
(function (root) {
  "use strict";

  var API_BASE = "php";

  var QueueLessAPI = {
    /**
     * Generic HTTP request handler
     */
    request: async function (endpoint, options) {
      options = options || {};
      options.headers = options.headers || {};
      options.credentials = "same-origin";

      var url = API_BASE + "/" + endpoint.replace(/^\//, "");

      try {
        var response = await fetch(url, options);
        var text = await response.text();

        // Detect if server returned JSON
        var json;
        try {
          json = JSON.parse(text);
          return json;
        } catch (parseErr) {
          // If server returned raw PHP source (e.g., in a non-PHP static node dev server)
          console.warn("[QueueLess API] Response was not JSON from " + url + ". Raw response:", text.substring(0, 100));
          return {
            success: false,
            isStaticEnvironment: true,
            rawText: text,
            error: "Backend PHP endpoint responded with non-JSON. When running in XAMPP/Apache with MySQL, PDO handles this genuinely."
          };
        }
      } catch (networkErr) {
        console.error("[QueueLess API] Network error for " + url, networkErr);
        return {
          success: false,
          networkError: true,
          error: networkErr.message
        };
      }
    },

    get: function (endpoint) {
      return this.request(endpoint, {
        method: "GET"
      });
    },

    post: function (endpoint, data) {
      return this.request(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data || {})
      });
    },

    // ==========================================
    // AUTHENTICATION APIS
    // ==========================================
    checkSession: function () {
      return this.get("auth/check_session.php");
    },

    login: function (email, password, role) {
      return this.post("auth/login.php", { email: email, password: password, role: role });
    },

    register: function (formData) {
      return this.post("auth/register.php", formData);
    },

    logout: function () {
      return this.post("auth/logout.php");
    },

    // ==========================================
    // STUDENT & QUEUE APIS
    // ==========================================
    getServices: function () {
      return this.get("students/get_services.php");
    },

    joinQueue: function (serviceId) {
      return this.post("students/join_queue.php", { service_id: serviceId });
    },

    getMyToken: function () {
      return this.get("students/get_my_token.php");
    },

    cancelToken: function (tokenId, reason) {
      return this.post("students/cancel_token.php", { token_id: tokenId, reason: reason });
    },

    getHistory: function () {
      return this.get("students/get_history.php");
    },

    submitFeedback: function (tokenId, rating, comments) {
      return this.post("students/submit_feedback.php", { token_id: tokenId, rating: rating, comments: comments });
    },

    // ==========================================
    // OPERATOR APIS
    // ==========================================
    getCounters: function () {
      return this.get("operators/get_counters.php");
    },

    callNext: function (counterId) {
      return this.post("operators/call_next.php", { counter_id: counterId });
    },

    completeToken: function (counterId, tokenId) {
      return this.post("operators/complete_token.php", { counter_id: counterId, token_id: tokenId });
    },

    markNoShow: function (counterId, tokenId) {
      return this.post("operators/mark_no_show.php", { counter_id: counterId, token_id: tokenId });
    },

    recallToken: function (tokenId) {
      return this.post("operators/recall_token.php", { token_id: tokenId });
    },

    // ==========================================
    // PROVIDER & ANALYTICS APIS
    // ==========================================
    createService: function (serviceData) {
      return this.post("providers/manage_services.php", serviceData);
    },

    createCounter: function (counterData) {
      return this.post("providers/manage_counters.php", counterData);
    },

    getAnalytics: function () {
      return this.get("providers/get_analytics.php");
    },

    // ==========================================
    // ADMIN APIS
    // ==========================================
    getProviders: function () {
      return this.get("admin/get_providers.php");
    },

    approveProvider: function (providerId, status) {
      return this.post("admin/approve_provider.php", { provider_id: providerId, status: status });
    },

    getUsers: function () {
      return this.get("admin/get_users.php");
    },

    updateUserStatus: function (userId, status) {
      return this.post("admin/update_user_status.php", { user_id: userId, status: status });
    },

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    getNotifications: function () {
      return this.get("notifications/get_notifications.php");
    },

    markNotificationsRead: function (notifId) {
      return this.post("notifications/mark_read.php", { notification_id: notifId });
    }
  };

  root.QueueLessAPI = QueueLessAPI;
})(typeof window !== "undefined" ? window : this);
