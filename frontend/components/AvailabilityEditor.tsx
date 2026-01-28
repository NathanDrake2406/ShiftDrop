import { useState } from "react";
import { Button } from "./ui/Button";
import { TimeInput } from "./ui/TimeInput";
import type { AvailabilitySlot } from "../types/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LAST_TIMES_KEY = "shiftdrop:lastAvailabilityTimes";

function getLastUsedTimes(): { from: string; to: string } {
  try {
    const stored = localStorage.getItem(LAST_TIMES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.from && parsed.to) return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return { from: "06:00", to: "14:00" }; // Fallback default
}

function saveLastUsedTimes(times: { from: string; to: string }) {
  try {
    localStorage.setItem(LAST_TIMES_KEY, JSON.stringify(times));
  } catch {
    // Ignore storage errors (private browsing, quota exceeded)
  }
}

interface AvailabilityEditorProps {
  availability: AvailabilitySlot[];
  onSave: (availability: AvailabilitySlot[]) => Promise<void>;
  isLoading?: boolean;
}

export function AvailabilityEditor({ availability, onSave, isLoading }: AvailabilityEditorProps) {
  const [slots, setSlots] = useState<Map<number, { from: string; to: string } | null>>(() => {
    const map = new Map<number, { from: string; to: string } | null>();
    for (let i = 0; i < 7; i++) {
      const existing = availability.find((a) => a.dayOfWeek === i);
      map.set(i, existing ? { from: existing.fromTime, to: existing.toTime } : null);
    }
    return map;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: number) => {
    setSlots((prev) => {
      const next = new Map(prev);
      if (next.get(day)) {
        next.set(day, null);
      } else {
        next.set(day, getLastUsedTimes());
      }
      return next;
    });
  };

  const updateTime = (day: number, field: "from" | "to", value: string) => {
    setSlots((prev) => {
      const next = new Map(prev);
      const current = next.get(day);
      if (current) {
        const updated = { ...current, [field]: value };
        next.set(day, updated);
        // Remember these times for next time they toggle a day on
        saveLastUsedTimes(updated);
      }
      return next;
    });
  };

  const applyToAll = (sourceDay: number) => {
    const sourceTimes = slots.get(sourceDay);
    if (!sourceTimes) return;

    setSlots((prev) => {
      const next = new Map(prev);
      prev.forEach((slot, day) => {
        if (slot && day !== sourceDay) {
          next.set(day, { ...sourceTimes });
        }
      });
      return next;
    });
    saveLastUsedTimes(sourceTimes);
  };

  // Count checked days for conditional "apply to all" visibility
  const checkedCount = Array.from(slots.values()).filter(Boolean).length;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const newAvailability: AvailabilitySlot[] = [];
      slots.forEach((slot, day) => {
        if (slot) {
          newAvailability.push({
            dayOfWeek: day,
            fromTime: slot.from,
            toTime: slot.to,
          });
        }
      });
      await onSave(newAvailability);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save availability");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {DAYS.map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-10 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Available Days & Times</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
        Set which days and times this casual can work. They will only receive SMS notifications for shifts that fit
        within their availability. Leave all days unchecked to receive all shifts.
      </p>

      {DAYS.map((dayName, dayIndex) => {
        const slot = slots.get(dayIndex);
        return (
          <div key={dayIndex} className="flex items-center gap-3">
            <label className="flex items-center gap-2 w-16">
              <input
                type="checkbox"
                checked={!!slot}
                onChange={() => toggleDay(dayIndex)}
                className="rounded border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-orange-400"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{dayName}</span>
            </label>
            {slot ? (
              <div className="flex items-center gap-2">
                <TimeInput value={slot.from} onChange={(value) => updateTime(dayIndex, "from", value)} size="compact" />
                <span className="text-slate-400 text-sm">to</span>
                <TimeInput value={slot.to} onChange={(value) => updateTime(dayIndex, "to", value)} size="compact" />
                {checkedCount > 1 && (
                  <button
                    type="button"
                    onClick={() => applyToAll(dayIndex)}
                    className="text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    → all
                  </button>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500">Not available</span>
            )}
          </div>
        );
      })}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <Button onClick={handleSave} disabled={isSaving} className="w-full mt-4">
        {isSaving ? "Saving..." : "Save Availability"}
      </Button>
    </div>
  );
}
