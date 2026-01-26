import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";
import { useDemo } from "../contexts/DemoContext";
import { useAuth0Available } from "./Auth0Provider";

/**
 * Custom auth hook that wraps Auth0 and provides a simplified API.
 * Falls back gracefully when Auth0 is unavailable (non-secure origin).
 */
export function useAuth() {
  const auth0Available = useAuth0Available();
  const auth0 = useAuth0();
  const { demoMode, demoManagerSignedIn, setDemoManagerSignedIn } = useDemo();

  // When Auth0 is unavailable, provide safe defaults
  const isAuthenticated = auth0Available ? auth0.isAuthenticated : false;
  const isLoading = auth0Available ? auth0.isLoading : false;
  const user = auth0Available ? auth0.user : undefined;
  const loginWithRedirect = auth0Available ? auth0.loginWithRedirect : async () => {};
  const auth0Logout = auth0Available ? auth0.logout : () => {};
  const getAccessTokenSilently = auth0Available ? auth0.getAccessTokenSilently : async () => "";

  const logout = useCallback(() => {
    if (demoMode) {
      setDemoManagerSignedIn(false);
      return;
    }
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout, demoMode, setDemoManagerSignedIn]);

  const getAccessToken = useCallback(async () => {
    if (demoMode) {
      return "demo-token";
    }
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error("Failed to get access token:", error);
      // If token fetch fails, trigger re-login
      await loginWithRedirect();
      return null;
    }
  }, [demoMode, getAccessTokenSilently, loginWithRedirect]);

  return {
    isAuthenticated: demoMode ? demoManagerSignedIn : isAuthenticated,
    isLoading: demoMode ? false : isLoading,
    user,
    login: loginWithRedirect,
    logout,
    getAccessToken,
  };
}
