import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "../components/ui/Layout";
import * as casualApi from "../services/casualApi";
import { ApiError } from "../types/api";

type PageState = { status: "loading" } | { status: "success"; message: string } | { status: "error"; message: string };

export const OptOutPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  // Prevent double-call in React StrictMode (development)
  const hasOptedOutRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "No opt-out token provided." });
      return;
    }

    // Guard against StrictMode double-invocation
    if (hasOptedOutRef.current) {
      return;
    }
    hasOptedOutRef.current = true;

    const optOut = async () => {
      try {
        const result = await casualApi.optOut(token);
        setState({ status: "success", message: result.message });
      } catch (err) {
        if (err instanceof ApiError) {
          setState({ status: "error", message: err.message });
        } else {
          setState({ status: "error", message: "Opt-out failed. Please try again." });
        }
      }
    };

    optOut();
  }, [token]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="ui-surface p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          {state.status === "loading" && (
            <>
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Processing your request...</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Please wait.</p>
            </>
          )}

          {state.status === "success" && (
            <>
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-600 dark:text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">You've been unsubscribed</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                You will no longer receive SMS notifications about available shifts.
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Changed your mind? Contact your manager to be re-added to the pool.
              </p>
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
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Something went wrong</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{state.message}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                This link may have already been used or expired.
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
