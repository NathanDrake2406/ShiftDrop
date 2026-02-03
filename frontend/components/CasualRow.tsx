import { memo } from "react";
import { Trash2, RefreshCw, Calendar } from "lucide-react";
import type { CasualResponse } from "../types/api";

export interface CasualRowProps {
  casual: CasualResponse;
  onRemove: () => void;
  onResendInvite: () => void;
  onEditAvailability: () => void;
}

function CasualRowComponent({ casual, onRemove, onResendInvite, onEditAvailability }: CasualRowProps) {
  const statusBadge = casual.isOptedOut ? (
    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Opted Out
    </span>
  ) : casual.isActive ? (
    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Active
    </span>
  ) : (
    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
      Pending
    </span>
  );

  const canResend = !casual.isOptedOut && casual.inviteStatus === "Pending";

  return (
    <div className="ui-surface p-4 rounded-xl flex justify-between items-center mb-2">
      <div>
        <div className="font-medium text-slate-900 dark:text-slate-100">{casual.name}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{casual.phoneNumber}</div>
      </div>
      <div className="flex items-center gap-2">
        {statusBadge}
        <button
          onClick={onEditAvailability}
          className="p-2 text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
          title="Edit availability"
        >
          <Calendar className="w-4 h-4" />
        </button>
        {canResend && (
          <button
            onClick={onResendInvite}
            className="p-2 text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
            title="Resend invite"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when props haven't changed
export const CasualRow = memo(CasualRowComponent);

// Export a flag for testing that the component is memoized
// memo() returns a new object with $$typeof of Symbol.for('react.memo')
export const isCasualRowMemoized = (CasualRow as { $$typeof?: symbol }).$$typeof === Symbol.for("react.memo");
