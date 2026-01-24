import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/ui/Layout";
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
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
              <p className="text-sm text-slate-400 dark:text-slate-500">You can close this page now.</p>
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
