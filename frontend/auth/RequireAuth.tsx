import { useAuth0 } from "@auth0/auth0-react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  console.log("[RequireAuth] isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "path:", location.pathname);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Trigger Auth0 login, preserving the intended destination
    loginWithRedirect({
      appState: { returnTo: location.pathname },
    });
    return null;
  }

  return <>{children}</>;
}
