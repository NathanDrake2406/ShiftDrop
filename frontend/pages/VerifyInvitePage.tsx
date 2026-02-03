import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/ui/Layout";
import { usePushNotifications } from "../hooks/usePushNotifications";
import * as casualApi from "../services/casualApi";
import { ApiError } from "../types/api";
import type { VerifyInviteResponse } from "../types/api";

type PageState =
  | { status: "loading" }
  | { status: "success"; data: VerifyInviteResponse }
  | { status: "error"; message: string };

export const VerifyInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  // Prevent double-call in React StrictMode (development)
  const hasVerifiedRef = useRef(false);

  // Get phone number from successful verification for push notifications
  const phoneNumber = state.status === "success" ? state.data.phoneNumber : null;
  const push = usePushNotifications(phoneNumber);

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "No verification token provided." });
      return;
    }

    // Guard against StrictMode double-invocation
    if (hasVerifiedRef.current) {
      return;
    }
    hasVerifiedRef.current = true;

    const verify = async () => {
      try {
        const result = await casualApi.verifyInvite(token);
        setState({ status: "success", data: result });
      } catch (err) {
        if (err instanceof ApiError) {
          setState({ status: "error", message: err.message });
        } else {
          setState({ status: "error", message: "Verification failed. Please try again." });
        }
      }
    };

    verify();
  }, [token]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="ui-surface p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          {state.status === "loading" && (
            <>
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Verifying your invite...</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Please wait while we confirm your phone number.</p>
            </>
          )}

          {state.status === "success" && (
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
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">You're verified!</h1>
              <p className="text-slate-600 dark:text-slate-300 mb-1">
                Welcome, <span className="font-semibold">{state.data.casualName}</span>!
              </p>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                You've joined <span className="font-semibold">{state.data.poolName}</span>. You'll receive SMS
                notifications when new shifts are available.
              </p>

              {/* Push Notification Prompt */}
              {push.isSupported && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  {push.isSubscribed ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Notifications enabled</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        Get instant notifications when shifts are posted
                      </p>
                      <button
                        onClick={push.subscribe}
                        disabled={push.isLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                      >
                        {push.isLoading ? "Enabling..." : "Enable Notifications"}
                      </button>
                      {push.error && <p className="mt-2 text-sm text-red-500 dark:text-red-400">{push.error}</p>}
                    </>
                  )}
                </div>
              )}

              <p className="text-sm text-slate-400 dark:text-slate-500 mt-6">You can close this page now.</p>
            </>
          )}

          {state.status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Verification Failed</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{state.message}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                This link may have expired. Please contact your manager for a new invite.
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VerifyInvitePage;
