import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

/**
 * Custom auth hook that wraps Auth0 and provides a simplified API.
 */
export function useAuth() {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const logout = useCallback(() => {
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

  const getAccessToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error("Failed to get access token:", error);
      // If token fetch fails, trigger re-login
      await loginWithRedirect();
      return null;
    }
  }, [getAccessTokenSilently, loginWithRedirect]);

  return {
    isAuthenticated,
    isLoading,
    user,
    login: loginWithRedirect,
    logout,
    getAccessToken,
  };
}
