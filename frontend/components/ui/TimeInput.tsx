import React from "react";

interface TimeInputProps {
  value: string; // "HH:MM" format
  onChange: (value: string) => void;
  size?: "default" | "compact";
  className?: string;
}

/**
 * Custom time input with dropdowns for consistent UX across all browsers.
 * Uses 24-hour format. Overlays select on centered display text for iOS compatibility.
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
    ? "relative h-8 w-14 border dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700"
    : "relative h-11 w-16 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700";

  const displayClass = isCompact
    ? "absolute inset-0 flex items-center justify-center text-sm text-slate-900 dark:text-white pointer-events-none"
    : "absolute inset-0 flex items-center justify-center text-base text-slate-900 dark:text-white pointer-events-none";

  const selectClass = "absolute inset-0 w-full h-full opacity-0 cursor-pointer";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Hour (0-23) */}
      <div className={shellClass}>
        <span className={displayClass}>{String(hours).padStart(2, "0")}</span>
        <select
          value={hours}
          onChange={(e) => handleHourChange(Number(e.target.value))}
          className={selectClass}
          aria-label="Hour"
        >
          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>

      <span className={`text-slate-400 font-bold ${isCompact ? "text-sm" : "text-lg"}`}>:</span>

      {/* Minute (5-min increments) */}
      <div className={shellClass}>
        <span className={displayClass}>{String(minutes).padStart(2, "0")}</span>
        <select
          value={minutes}
          onChange={(e) => handleMinuteChange(Number(e.target.value))}
          className={selectClass}
          aria-label="Minute"
        >
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
