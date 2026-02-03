import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// Mock window.matchMedia for Layout component
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Auth0 hooks and context
const mockUseAuth = vi.fn();
vi.mock("./auth", () => ({
  useAuth: () => mockUseAuth(),
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock DemoContext
vi.mock("./contexts/DemoContext", () => ({
  useDemo: () => ({ demoMode: false, setDemoMode: vi.fn() }),
}));

// Mock ToastContext
vi.mock("./contexts/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn(), toasts: [] }),
}));

// Mock page components - the key is they return a default export for lazy()
vi.mock("./pages/ManagerDashboard", () => ({
  ManagerDashboard: () => <div data-testid="manager-dashboard">Manager Dashboard</div>,
  default: () => <div data-testid="manager-dashboard">Manager Dashboard</div>,
}));

vi.mock("./pages/PoolDetails", () => ({
  PoolDetails: () => <div data-testid="pool-details">Pool Details</div>,
  default: () => <div data-testid="pool-details">Pool Details</div>,
}));

vi.mock("./pages/Login", () => ({
  Login: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock("./pages/LandingPage", () => ({
  LandingPage: () => <div data-testid="landing-page">Landing Page</div>,
}));

vi.mock("./pages/AcceptAdminInvitePage", () => ({
  AcceptAdminInvitePage: () => <div data-testid="accept-admin-invite">Accept Admin Invite</div>,
  default: () => <div data-testid="accept-admin-invite">Accept Admin Invite</div>,
}));

vi.mock("./pages/VerifyInvitePage", () => ({
  VerifyInvitePage: () => <div data-testid="verify-invite">Verify Invite</div>,
  default: () => <div data-testid="verify-invite">Verify Invite</div>,
}));

vi.mock("./pages/OptOutPage", () => ({
  OptOutPage: () => <div data-testid="opt-out">Opt Out</div>,
  default: () => <div data-testid="opt-out">Opt Out</div>,
}));

vi.mock("./pages/ClaimByTokenPage", () => ({
  ClaimByTokenPage: () => <div data-testid="claim-by-token">Claim By Token</div>,
  default: () => <div data-testid="claim-by-token">Claim By Token</div>,
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: not authenticated, not loading
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("lazy loading with Suspense", () => {
    it("renders lazy-loaded ManagerDashboard when navigating to /manager route", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/manager"]}>
          <App />
        </MemoryRouter>,
      );

      // Should eventually show the component (after Suspense resolves)
      await waitFor(() => {
        expect(screen.getByTestId("manager-dashboard")).toBeInTheDocument();
      });
    });

    it("renders lazy-loaded PoolDetails when navigating to /manager/pool/:id route", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/manager/pool/test-id"]}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("pool-details")).toBeInTheDocument();
      });
    });

    it("renders lazy-loaded VerifyInvitePage for anonymous route", async () => {
      render(
        <MemoryRouter initialEntries={["/casual/verify/test-token"]}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("verify-invite")).toBeInTheDocument();
      });
    });

    it("renders lazy-loaded OptOutPage for anonymous route", async () => {
      render(
        <MemoryRouter initialEntries={["/casual/opt-out/test-token"]}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("opt-out")).toBeInTheDocument();
      });
    });

    it("renders lazy-loaded ClaimByTokenPage for anonymous route", async () => {
      render(
        <MemoryRouter initialEntries={["/casual/claim/test-token"]}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("claim-by-token")).toBeInTheDocument();
      });
    });
  });

  describe("critical path components (synchronous)", () => {
    it("renders Login page synchronously for unauthenticated users", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      // Login should render immediately (not lazy loaded)
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });

    it("renders Landing page synchronously", () => {
      render(
        <MemoryRouter initialEntries={["/landing"]}>
          <App />
        </MemoryRouter>,
      );

      // Landing should render immediately (not lazy loaded)
      expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    });
  });

  describe("authentication redirects", () => {
    it("redirects authenticated users from / to /manager", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("manager-dashboard")).toBeInTheDocument();
      });
    });

    it("shows loading state while Auth0 is initializing", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        logout: vi.fn(),
        getAccessToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
});
