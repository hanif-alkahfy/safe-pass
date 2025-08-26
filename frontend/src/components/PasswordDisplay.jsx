import React, { useState } from "react";

const PasswordDisplay = ({ password }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex-1 bg-white/5 backdrop-blur-sm border border-gray-600 rounded-lg px-4 py-3 font-mono text-xl tracking-wider">{"•".repeat(password.length)}</div>
      <button
        onClick={copyToClipboard}
        className={`p-3 rounded-lg transition-all duration-200 ${copied ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-blue-500/20 border-blue-500/30 text-blue-400"} border backdrop-blur-sm hover:bg-white/10`}
      >
        {copied ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

export default PasswordDisplay;
