import React from "react";

interface TimeInputProps {
  value: string; // "HH:MM" format
  onChange: (value: string) => void;
  size?: "default" | "compact";
  className?: string;
}

/**
 * Time input using native browser time picker.
 * Falls back gracefully on all platforms with consistent styling.
 */
export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, size = "default", className = "" }) => {
  const isCompact = size === "compact";

  const inputClass = isCompact
    ? "h-8 px-2 border dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white text-center appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
    : "h-11 px-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-base text-slate-900 dark:text-white text-center appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent";

  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} ${className}`}
      style={{ minWidth: isCompact ? "5rem" : "6rem" }}
    />
  );
};
