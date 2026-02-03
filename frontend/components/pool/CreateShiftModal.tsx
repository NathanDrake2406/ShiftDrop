import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { TimeInput } from "../ui/TimeInput";
import type { CreateShiftRequest } from "../../types/api";

export interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  postShift: (data: CreateShiftRequest) => Promise<void>;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date/time utilities
// ─────────────────────────────────────────────────────────────────────────────

function toDateInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeInput(dateValue: string, timeValue: string): Date | null {
  const dateParts = dateValue.split("-").map(Number);
  const timeParts = timeValue.split(":").map(Number);

  const yearValue = dateParts[0];
  const monthValue = dateParts[1];
  const dayValue = dateParts[2];
  const hoursValue = timeParts[0];
  const minutesValue = timeParts[1];

  if (
    yearValue === undefined ||
    monthValue === undefined ||
    dayValue === undefined ||
    hoursValue === undefined ||
    minutesValue === undefined
  ) {
    return null;
  }

  if (
    Number.isNaN(yearValue) ||
    Number.isNaN(monthValue) ||
    Number.isNaN(dayValue) ||
    Number.isNaN(hoursValue) ||
    Number.isNaN(minutesValue)
  ) {
    return null;
  }

  if (monthValue < 1 || monthValue > 12 || dayValue < 1 || dayValue > 31) {
    return null;
  }

  if (hoursValue < 0 || hoursValue > 23 || minutesValue < 0 || minutesValue > 59) {
    return null;
  }

  const parsed = new Date(yearValue, monthValue - 1, dayValue, hoursValue, minutesValue, 0, 0);
  if (
    parsed.getFullYear() !== yearValue ||
    parsed.getMonth() !== monthValue - 1 ||
    parsed.getDate() !== dayValue ||
    parsed.getHours() !== hoursValue ||
    parsed.getMinutes() !== minutesValue
  ) {
    return null;
  }

  return parsed;
}

function buildDefaultShiftForm() {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(start.getHours() + 4);

  return {
    startDate: toDateInput(start),
    startTime: toTimeInput(start),
    endDate: toDateInput(end),
    endTime: toTimeInput(end),
    spotsNeeded: 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CreateShiftModal({ isOpen, onClose, onSuccess, postShift, isLoading }: CreateShiftModalProps) {
  const [shiftForm, setShiftForm] = useState(buildDefaultShiftForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setShiftForm(buildDefaultShiftForm());
      setValidationError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setValidationError(null);

    // Validate required fields
    if (!shiftForm.startDate || !shiftForm.startTime || !shiftForm.endDate || !shiftForm.endTime) {
      setValidationError("Please select start and end dates and times.");
      return;
    }

    // Parse dates
    const startDate = parseDateTimeInput(shiftForm.startDate, shiftForm.startTime);
    const endDate = parseDateTimeInput(shiftForm.endDate, shiftForm.endTime);

    if (!startDate || !endDate) {
      setValidationError("Invalid dates. Please choose valid start and end times.");
      return;
    }

    // Validate duration
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (durationHours <= 0) {
      setValidationError("End time must be after the start time.");
      return;
    }

    if (durationHours > 15) {
      setValidationError("Shift duration cannot exceed 15 hours.");
      return;
    }

    // Validate spots
    if (
      !Number.isFinite(shiftForm.spotsNeeded) ||
      !Number.isInteger(shiftForm.spotsNeeded) ||
      shiftForm.spotsNeeded < 1
    ) {
      setValidationError("Spots needed must be at least 1.");
      return;
    }

    try {
      await postShift({
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        spotsNeeded: shiftForm.spotsNeeded,
      });
      onSuccess();
      onClose();
    } catch {
      // Error handling is done by parent (shows toast)
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Shift" noAutoFocus>
      <div className="space-y-4">
        {validationError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {validationError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="start-date"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Date
              </label>
              <div className="ui-input-shell">
                <input
                  id="start-date"
                  type="date"
                  className="ui-input-field"
                  value={shiftForm.startDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setShiftForm({ ...shiftForm, startDate: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Time</label>
              <TimeInput
                value={shiftForm.startTime}
                onChange={(value) => setShiftForm({ ...shiftForm, startTime: value })}
                data-testid="start-time-input"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="end-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Date
              </label>
              <div className="ui-input-shell">
                <input
                  id="end-date"
                  type="date"
                  className="ui-input-field"
                  value={shiftForm.endDate}
                  min={shiftForm.startDate || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setShiftForm({ ...shiftForm, endDate: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Time</label>
              <TimeInput
                value={shiftForm.endTime}
                onChange={(value) => setShiftForm({ ...shiftForm, endTime: value })}
                data-testid="end-time-input"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="spots-needed" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Spots Needed
          </label>
          <div className="ui-input-shell">
            <input
              id="spots-needed"
              type="number"
              min="1"
              step="1"
              className="ui-input-field"
              value={Number.isFinite(shiftForm.spotsNeeded) ? shiftForm.spotsNeeded : ""}
              onChange={(e) => {
                const rawValue = e.target.value;
                const parsed = rawValue === "" ? Number.NaN : Number(rawValue);
                setShiftForm({ ...shiftForm, spotsNeeded: parsed });
              }}
              disabled={isLoading}
            />
          </div>
        </div>

        <Button className="w-full mt-2" onClick={handleSubmit} isLoading={isLoading}>
          Post Shift
        </Button>
      </div>
    </Modal>
  );
}
