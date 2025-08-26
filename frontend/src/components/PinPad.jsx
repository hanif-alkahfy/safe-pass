import React, { useState, useEffect, useCallback } from "react";

const PinPad = ({ onPinSubmit, error }) => {
  const [pin, setPin] = useState("");

  const handleSubmit = useCallback(() => {
    if (pin.length === 6) {
      onPinSubmit(pin);
    }
  }, [pin, onPinSubmit]);

  const handleNumberClick = (number) => {
    if (pin.length < 6) {
      const newPin = pin + number;
      setPin(newPin);
      if (newPin.length === 6) {
        onPinSubmit(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleNumberClick(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleDelete();
      } else if (e.key === "Enter") {
        handleSubmit();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [pin, handleSubmit]);

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "⌫"];

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="mb-6">
        <div className="flex justify-center space-x-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={`w-4 h-4 rounded-full ${index < pin.length ? "bg-blue-600" : "bg-white/10 border border-gray-600"}`} />
          ))}
        </div>
        {error && <div className="text-red-400 text-center mt-3 text-sm">{error}</div>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {numbers.map((num, index) => (
          <button
            key={index}
            onClick={() => {
              if (num === "C") handleClear();
              else if (num === "⌫") handleDelete();
              else handleNumberClick(num);
            }}
            className={`p-4 text-xl rounded-lg backdrop-blur-sm border transition-all duration-200 ${
              typeof num === "number"
                ? "bg-white/5 border-gray-600 hover:bg-white/10 active:bg-white/20 text-white"
                : num === "⌫"
                ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 active:bg-red-500/30 text-red-400"
                : "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 active:bg-yellow-500/30 text-yellow-400"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PinPad;
