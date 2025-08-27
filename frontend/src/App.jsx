import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
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
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:3001"}/health`,{
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (response.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("error");
        }
      } catch (error) {
        // Silent fail in production
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
        return "Backend Connected";
      case "disconnected":
        return "Connecting to Backend...";
      case "error":
        return "Backend Error";
      default:
        return "Checking Backend...";
    }
  };

  const StatusIndicator = () => (
    <div
      className={`fixed bottom-4 right-4 font-medium ${getStatusColor()} 
      bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700
      flex items-center space-x-2`}
    >
      <span>{getStatusText()}</span>
      {backendStatus === "checking" && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
    </div>
  );

  return (
    <>
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
      <StatusIndicator />
    </>
  );
}

export default App;
