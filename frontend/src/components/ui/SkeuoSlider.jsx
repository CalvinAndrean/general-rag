import React from "react";

export function SkeuoSlider({
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className = "",
}) {
  const numVal = Number(value) || 0;
  const numMin = Number(min) || 0;
  const numMax = Number(max) || 100;

  const pct =
    numMax > numMin
      ? Math.max(0, Math.min(100, ((numVal - numMin) / (numMax - numMin)) * 100))
      : 0;

  const trackStyle = {
    background: disabled
      ? "#cbd5e1"
      : `linear-gradient(to right, #2563eb 0%, #3b82f6 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
  };

  return (
    <div className={`relative flex items-center w-full py-1 ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onChange={onChange}
        style={trackStyle}
        className={`w-full h-2.5 rounded-full appearance-none transition-all shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.15)] ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer accent-[#2563eb] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-white [&::-webkit-slider-thumb]:to-slate-100 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-300 [&::-webkit-slider-thumb]:shadow-[0_2px_5px_rgba(0,0,0,0.2)] [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-slate-300 [&::-moz-range-thumb]:shadow-md"
        }`}
      />
    </div>
  );
}
