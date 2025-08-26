import crypto from "crypto-js";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:3001";
const SALT_SECRET = import.meta.env.VITE_SALT_SECRET;

export const authService = {
  async getChallengeToken() {
    try {
      const response = await fetch(`${API_BASE}/api/challenge`);
      const data = await response.json();

      if (!data.success) {
        throw new Error("Failed to get challenge token");
      }

      return data;
    } catch (error) {
      throw new Error("Failed to get challenge token: " + error.message);
    }
  },

  generateHMAC(challengeToken, timestamp, pin) {
    // Request body
    const requestBodyObj = { pin };
    const bodyString = JSON.stringify(requestBodyObj);

    // HMAC message format: data|challengeToken|timestamp
    const message = `${bodyString}|${challengeToken}|${timestamp}`;

    // Generate HMAC
    const hmacSignature = crypto.HmacSHA256(message, SALT_SECRET).toString();

    return {
      requestBody: requestBodyObj,
      hmacSignature,
    };
  },

  async login(pin) {
    try {
      // Step 1: Get challenge token
      const challengeResponse = await this.getChallengeToken();
      const { token: challengeToken, csrf } = challengeResponse;

      // Step 2: Prepare HMAC
      const timestamp = Date.now();
      const { requestBody, hmacSignature } = this.generateHMAC(challengeToken, timestamp, pin);

      // Step 3: Login request
      const response = await fetch(`${API_BASE}/api/auth/verify-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-HMAC-Signature": hmacSignature,
          "X-Timestamp": timestamp.toString(),
          "X-Challenge-Token": challengeToken,
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.success) {
        localStorage.setItem("sessionId", data.data.sessionId);
        return data.data;
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (error) {
      throw error;
    }
  },

  async validateSession() {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) return false;

    try {
      const response = await fetch(`${API_BASE}/api/auth/session-status`, {
        headers: {
          "X-Session-Id": sessionId,
        },
      });

      const data = await response.json();
      return data.data.authenticated;
    } catch {
      return false;
    }
  },

  async logout() {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) return false;

    try {
      // Get challenge token for logout
      const challengeResponse = await this.getChallengeToken();
      const { token: challengeToken, csrf } = challengeResponse;

      const timestamp = Date.now();
      const requestBody = { sessionId };
      const bodyString = JSON.stringify(requestBody);
      const message = `${bodyString}|${challengeToken}|${timestamp}`;

      const hmacSignature = crypto.HmacSHA256(message, SALT_SECRET).toString();

      const response = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-HMAC-Signature": hmacSignature,
          "X-Timestamp": timestamp.toString(),
          "X-Challenge-Token": challengeToken,
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.removeItem("sessionId");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};
