import React from "react";

interface TimeInputProps {
  value: string; // "HH:MM" format
  onChange: (value: string) => void;
  size?: "default" | "compact";
  className?: string;
}

/**
 * Custom time input with dropdowns for consistent UX across all browsers.
 * Uses 24-hour format.
 */
export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, size = "default", className = "" }) => {
  const parts = value ? value.split(":").map(Number) : [9, 0];
  const hours = parts[0] ?? 9;
  const minutes = parts[1] ?? 0;

  const handleHourChange = (newHour: number) => {
    onChange(`${String(newHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  };

  const handleMinuteChange = (newMinute: number) => {
    onChange(`${String(hours).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`);
  };

  const isCompact = size === "compact";
  const shellClass = isCompact
    ? "h-8 w-12 border dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 px-0 flex items-center justify-center"
    : "ui-input-shell w-16 px-0 justify-center";
  const selectClass = isCompact
    ? "w-full h-full bg-transparent text-slate-900 dark:text-white outline-none text-sm text-center appearance-none cursor-pointer"
    : "ui-input-field text-center appearance-none cursor-pointer";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Hour (0-23) */}
      <div className={shellClass}>
        <select value={hours} onChange={(e) => handleHourChange(Number(e.target.value))} className={selectClass}>
          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>

      <span className={`text-slate-400 font-medium ${isCompact ? "text-sm" : ""}`}>:</span>

      {/* Minute (5-min increments) */}
      <div className={shellClass}>
        <select value={minutes} onChange={(e) => handleMinuteChange(Number(e.target.value))} className={selectClass}>
          {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
