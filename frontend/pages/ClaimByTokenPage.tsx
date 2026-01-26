import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { PushToggle } from "../components/PushToggle";
import { Layout } from "../components/ui/Layout";
import * as casualApi from "../services/casualApi";
import { ApiError } from "../types/api";
import type { ClaimByTokenResponse } from "../types/api";

type PageState =
  | { status: "loading" }
  | { status: "success"; data: ClaimByTokenResponse }
  | { status: "error"; message: string; isConflict?: boolean };

export const ClaimByTokenPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  // Prevent double-call in React StrictMode (development)
  const hasClaimedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "No claim token provided." });
      return;
    }

    // Guard against StrictMode double-invocation
    if (hasClaimedRef.current) {
      return;
    }
    hasClaimedRef.current = true;

    const claim = async () => {
      try {
        const result = await casualApi.claimByToken(token);
        setState({ status: "success", data: result });
      } catch (err) {
        if (err instanceof ApiError) {
          setState({
            status: "error",
            message: err.message,
            isConflict: err.isConflict,
          });
        } else {
          setState({ status: "error", message: "Failed to claim shift. Please try again." });
        }
      }
    };

    claim();
  }, [token]);

  // Format shift time for display
  const formatShiftTime = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const dateStr = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return { dateStr, timeStr: `${startTime} - ${endTime}` };
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="ui-surface p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          {state.status === "loading" && (
            <>
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Claiming your shift...</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Please wait.</p>
            </>
          )}

          {state.status === "success" &&
            (() => {
              const { dateStr, timeStr } = formatShiftTime(state.data.shift.startsAt, state.data.shift.endsAt);
              return (
                <>
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Shift Claimed!</h1>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    You're on the roster, <span className="font-semibold">{state.data.casualName}</span>!
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{dateStr}</p>
                    <p className="text-slate-600 dark:text-slate-300">{timeStr}</p>
                  </div>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                    You can close this page now. We'll send a reminder before your shift.
                  </p>
                  <PushToggle phoneNumber={state.data.phoneNumber} />
                </>
              );
            })()}

          {state.status === "error" && (
            <>
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                {state.isConflict ? (
                  <svg
                    className="w-8 h-8 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                {state.isConflict ? "Shift Already Filled" : "Claim Failed"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{state.message}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {state.isConflict
                  ? "Someone else got there first! Check your SMS for other available shifts."
                  : "This link may have expired or already been used."}
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
