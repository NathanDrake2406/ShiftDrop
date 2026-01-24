import { Button } from "./ui/Button";
import { Clock, Users, Calendar, X } from "lucide-react";
import { formatDateDMY } from "../utils/date";
import type { ShiftResponse, ShiftDetailResponse, ClaimStatusValue } from "../types/api";

interface ShiftCardProps {
  /** Accepts ShiftResponse (casual view) or ShiftDetailResponse (manager view with claims) */
  shift: ShiftResponse | ShiftDetailResponse;
  onClaim?: (shiftId: string) => void;
  onCancel?: (shiftId: string) => void;
  onBail?: (shiftId: string) => void;
  /** Release a casual from the shift by casualId */
  onReleaseCasual?: (shiftId: string, casualId: string) => void;
  userType: "manager" | "casual";
  isLoading?: boolean;
  userClaimStatus?: ClaimStatusValue;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({
  shift,
  onClaim,
  onCancel,
  onBail,
  onReleaseCasual,
  userType,
  isLoading,
  userClaimStatus,
}) => {
  const start = new Date(shift.startsAt);
  const end = new Date(shift.endsAt);
  const durationHrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  const isFilled = shift.status === "Filled";
  const isCancelled = shift.status === "Cancelled";
  const isClaimedByUser = userClaimStatus === "Claimed";

  return (
    <div className={`ui-surface rounded-2xl p-5 shadow-sm transition-all ${isCancelled ? "opacity-60" : ""}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
          <Calendar className="w-4 h-4" />
          <span>{formatDateDMY(start)}</span>
        </div>
        <div
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
          ${
            isCancelled
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : isFilled
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          }`}
        >
          {shift.status}
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </h3>
        <span className="text-slate-400 text-sm">to</span>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </h3>
      </div>

      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mb-4">
        <Clock className="w-4 h-4" />
        <span>{durationHrs.toFixed(1)} hrs</span>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Users className="w-4 h-4" />
          <span className="font-semibold">{shift.spotsRemaining}</span>
          <span className="text-slate-400">/ {shift.spotsNeeded} spots left</span>
        </div>

        <div className="flex gap-2">
          {userType === "casual" && !isCancelled && !isFilled && !isClaimedByUser && (
            <Button
              size="sm"
              onClick={() => onClaim?.(shift.id)}
              isLoading={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600"
            >
              Claim Spot
            </Button>
          )}

          {userType === "casual" && isClaimedByUser && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Confirmed
              </span>
              <Button size="sm" variant="danger" onClick={() => onBail?.(shift.id)} isLoading={isLoading}>
                Bail
              </Button>
            </div>
          )}

          {userType === "manager" && !isCancelled && (
            <Button size="sm" variant="danger" onClick={() => onCancel?.(shift.id)} isLoading={isLoading}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Manager View Claims - only shown when claims data is available */}
      {userType === "manager" && "claims" in shift && shift.claims.length > 0 && (
        <div className="mt-3 ui-surface-muted rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">Who's working</p>
          <div className="space-y-2">
            {shift.claims
              .filter((c) => c.status === "Claimed")
              .map((claim) => (
                <div
                  key={claim.casualId}
                  className="text-sm flex justify-between items-center bg-white dark:bg-slate-700 p-2 rounded border border-slate-100 dark:border-slate-600"
                >
                  <span className="text-slate-800 dark:text-slate-200">{claim.casualName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {new Date(claim.claimedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => onReleaseCasual?.(shift.id, claim.casualId)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove worker"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
