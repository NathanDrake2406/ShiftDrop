import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDemo } from "../contexts/DemoContext";
import { useAuth } from "./useAuth";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { demoMode, demoManagerSignedIn } = useDemo();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (demoMode) {
    if (!demoManagerSignedIn) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    // Trigger Auth0 login, preserving the intended destination
    login({
      appState: { returnTo: location.pathname },
    });
    return null;
  }

  return <>{children}</>;
}
