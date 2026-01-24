import { Auth0Provider as BaseAuth0Provider, type AppState } from "@auth0/auth0-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

interface Auth0ProviderProps {
  children: ReactNode;
}

export function Auth0Provider({ children }: Auth0ProviderProps) {
  const navigate = useNavigate();
  const onRedirectCallback = (appState?: AppState) => {
    console.log("[Auth0] onRedirectCallback fired");
    console.log("[Auth0] appState:", appState);
    console.log("[Auth0] window.location.pathname:", window.location.pathname);
    const target = appState?.returnTo ?? window.location.pathname;
    console.log("[Auth0] Navigating to:", target);
    navigate(target, { replace: true });
  };

  if (!domain || !clientId) {
    // In development without Auth0 config, render children without auth
    // This allows the app to run with mock data
    console.warn("Auth0 not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID.");
    return <>{children}</>;
  }

  return (
    <BaseAuth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
      }}
      cacheLocation="localstorage"
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </BaseAuth0Provider>
  );
}
