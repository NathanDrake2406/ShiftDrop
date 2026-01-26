import { Auth0Provider as BaseAuth0Provider, type AppState } from "@auth0/auth0-react";
import { type ReactNode, Component, type ErrorInfo, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

// Context to track if Auth0 is available (secure origin + configured)
const Auth0AvailableContext = createContext<boolean>(false);
export const useAuth0Available = () => useContext(Auth0AvailableContext);

// Error boundary to catch Auth0 initialization failures
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class Auth0ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Auth0] Initialization error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render children anyway - demo mode will still work
      console.warn("[Auth0] Failed to initialize, falling back to demo-only mode");
      return this.props.children;
    }
    return this.props.children;
  }
}

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

  // Auth0 requires secure origin (HTTPS) or localhost
  const isSecureOrigin =
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!domain || !clientId) {
    // In development without Auth0 config, render children without auth
    console.warn("Auth0 not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID.");
    return <Auth0AvailableContext.Provider value={false}>{children}</Auth0AvailableContext.Provider>;
  }

  if (!isSecureOrigin) {
    // Auth0 SPA JS requires secure origin - skip Auth0 on LAN/HTTP
    console.warn(
      `Auth0 disabled: requires HTTPS or localhost, but running on ${window.location.origin}. Use demo mode.`,
    );
    return <Auth0AvailableContext.Provider value={false}>{children}</Auth0AvailableContext.Provider>;
  }

  const canUseLocalStorage = () => {
    if (typeof window === "undefined") return false;
    try {
      const key = "__auth0_storage_test__";
      window.localStorage.setItem(key, "1");
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Auth0AvailableContext.Provider value={true}>
      <Auth0ErrorBoundary>
        <BaseAuth0Provider
          domain={domain}
          clientId={clientId}
          authorizationParams={{
            redirect_uri: window.location.origin,
            audience,
          }}
          cacheLocation={canUseLocalStorage() ? "localstorage" : "memory"}
          onRedirectCallback={onRedirectCallback}
        >
          {children}
        </BaseAuth0Provider>
      </Auth0ErrorBoundary>
    </Auth0AvailableContext.Provider>
  );
}
