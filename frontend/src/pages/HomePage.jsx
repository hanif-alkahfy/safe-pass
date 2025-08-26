import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HmacSHA256 } from "crypto-js";
import { authService } from "../services/authService";
import PlatformSelector from "../components/PlatformSelector";
import PasswordDisplay from "../components/PasswordDisplay";

// Should match the secret in authService
const SECRET = import.meta.env.VITE_SECRET;

const HomePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);

  const handleLogout = async () => {
    await authService.logout();
    navigate("/auth");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!masterPassword || !selectedPlatform) return;

    try {
      setLoading(true);
      setError("");

      if (!selectedPlatform || !selectedPlatform.id) {
        throw new Error("Invalid platform selected");
      }

      // Get challenge token first
      const challengeResponse = await authService.getChallengeToken();
      const { token: challengeToken, csrf } = challengeResponse;

      // Prepare HMAC
      const timestamp = Date.now();
      const requestBody = {
        masterPassword,
        platform: selectedPlatform.id,
      };

      // Validate required parameters
      if (!requestBody.masterPassword || !requestBody.platform) {
        throw new Error("Missing required parameters");
      }

      // Generate HMAC signature
      const bodyString = JSON.stringify(requestBody);
      const message = `${bodyString}|${challengeToken}|${timestamp}`;
      const hmacSignature = HmacSHA256(message, SECRET).toString();

      // Production-ready HMAC generation without debug logs

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/password/generate-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": localStorage.getItem("sessionId"),
          "X-HMAC-Signature": hmacSignature,
          "X-Timestamp": timestamp.toString(),
          "X-Challenge-Token": challengeToken,
          "X-CSRF-Token": csrf,
        },
        body: bodyString,
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedPassword(data.password);
        setMasterPassword("");
      } else {
        setError(data.error || "Failed to generate password");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGeneratedPassword(null);
    setSelectedPlatform(null);
    setMasterPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">🔐 SafePass</h1>
          <button onClick={handleLogout} className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 hover:scale-105" title="Exit">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700 p-8">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                <h2 className="text-xl font-semibold text-white mb-2">{generatedPassword ? "Generated Password" : "Generate Password"}</h2>

                {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

                {generatedPassword ? (
                  <div className="space-y-4">
                    <PasswordDisplay password={generatedPassword} />
                    <button onClick={handleReset} className="w-full p-3 rounded-lg bg-white/5 border border-gray-600 text-white hover:bg-white/10 transition-colors">
                      Generate Another Password
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="password"
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        placeholder="Enter Master Password"
                        className="w-full p-3 rounded-lg bg-white/5 border border-gray-600 text-white placeholder-gray-400"
                        required
                      />
                    </div>

                    <div>
                      {selectedPlatform ? (
                        <button
                          type="button"
                          onClick={() => setShowPlatformSelector(true)}
                          className="w-full p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-white hover:bg-blue-500/30 transition-colors flex items-center justify-center space-x-2"
                        >
                          <span className="text-xl">{selectedPlatform.icon}</span>
                          <span>{selectedPlatform.name}</span>
                        </button>
                      ) : (
                        <button type="button" onClick={() => setShowPlatformSelector(true)} className="w-full p-3 rounded-lg bg-white/5 border border-gray-600 text-white hover:bg-white/10 transition-colors">
                          Select Platform
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !masterPassword || !selectedPlatform}
                      className={`w-full p-3 rounded-lg text-white transition-colors ${loading || !masterPassword || !selectedPlatform ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        </div>
                      ) : (
                        "Generate Password"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PlatformSelector isOpen={showPlatformSelector} onClose={() => setShowPlatformSelector(false)} onSelect={setSelectedPlatform} selectedPlatform={selectedPlatform} />
    </div>
  );
};

export default HomePage;
