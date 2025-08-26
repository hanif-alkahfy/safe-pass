import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import { authService } from "./services/authService";
import "./index.css";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const isValid = await authService.validateSession();
      setIsAuthenticated(isValid);
      if (!isValid) {
        navigate("/auth");
      }
    };

    checkAuth();
  }, [navigate]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : null;
};

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    // Test backend connection
    const checkBackend = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:3001"}/health`);
        if (response.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("error");
        }
      } catch (error) {
        console.log("Backend not yet available:", error.message);
        setBackendStatus("disconnected");
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (backendStatus) {
      case "connected":
        return "text-green-500";
      case "disconnected":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = () => {
    switch (backendStatus) {
      case "connected":
        return "✅ Backend Connected";
      case "disconnected":
        return "⚡ Connecting to Backend...";
      case "error":
        return "❌ Backend Error";
      default:
        return "🔄 Checking Backend...";
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = "/auth";
  };

  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">🔐 SafePass</h1>
          <button onClick={handleLogout} className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* Status Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700 p-8">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                <h2 className="text-xl font-semibold text-white mb-2">Welcome to SafePass</h2>

                <p className="text-gray-300 mb-6">You are now securely logged in</p>
              </div>

              {/* Backend Status */}
              <div className="border-t border-gray-600 pt-6">
                <div className="flex items-center justify-center space-x-2">
                  <div className={`font-medium ${getStatusColor()}`}>{getStatusText()}</div>
                  {backendStatus === "checking" && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
