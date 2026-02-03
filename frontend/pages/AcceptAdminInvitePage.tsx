import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth";
import * as managerApi from "../services/managerApi";
import { ApiError } from "../types/api";
import type { AcceptAdminInviteResponse } from "../types/api";

type PageState =
  | { status: "loading" }
  | { status: "success"; data: AcceptAdminInviteResponse }
  | { status: "error"; message: string };

export const AcceptAdminInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { getAccessToken } = useAuth();
  const [state, setState] = useState<PageState>({ status: "loading" });
  // Prevent double-call in React StrictMode (development)
  const hasAcceptedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "No invite token provided." });
      return;
    }

    // Guard against StrictMode double-invocation
    if (hasAcceptedRef.current) {
      return;
    }
    hasAcceptedRef.current = true;

    const accept = async () => {
      try {
        const authToken = await getAccessToken();
        if (!authToken) {
          setState({ status: "error", message: "Authentication required. Please log in and try again." });
          return;
        }
        const result = await managerApi.acceptAdminInvite(token, authToken);
        setState({ status: "success", data: result });
      } catch (err) {
        if (err instanceof ApiError) {
          setState({ status: "error", message: err.message });
        } else {
          setState({ status: "error", message: "Failed to accept invite. Please try again." });
        }
      }
    };

    accept();
  }, [token, getAccessToken]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="ui-surface p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          {state.status === "loading" && (
            <>
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">Accepting invite...</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Please wait while we add you to the pool.</p>
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
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Welcome to the team!</h1>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                You are now an admin of <span className="font-semibold">{state.data.poolName}</span>. You can manage
                shifts and casuals for this pool.
              </p>
              <Link to="/manager">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
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
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Invite Failed</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{state.message}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                This invite may have expired or already been used. Contact the pool owner for a new invite.
              </p>
              <Link to="/manager">
                <Button variant="secondary" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AcceptAdminInvitePage;
