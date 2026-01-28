import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { VerifyInvitePage } from "./VerifyInvitePage";
import * as casualApi from "../services/casualApi";
import type { VerifyInviteResponse } from "../types/api";

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

// Mock the casualApi
vi.mock("../services/casualApi", () => ({
  verifyInvite: vi.fn(),
}));

// Mock usePushNotifications hook
const mockSubscribe = vi.fn();
const mockUsePushNotifications = vi.fn((_phoneNumber: string | null) => ({
  isSupported: true,
  isSubscribed: false,
  isLoading: false,
  error: null as string | null,
  subscribe: mockSubscribe,
  unsubscribe: vi.fn(),
}));

vi.mock("../hooks/usePushNotifications", () => ({
  usePushNotifications: (phoneNumber: string | null) => mockUsePushNotifications(phoneNumber),
}));

// Helper to create a valid mock response
const createMockResponse = (overrides: Partial<VerifyInviteResponse> = {}): VerifyInviteResponse => ({
  casualId: "test-casual-id",
  casualName: "John",
  poolName: "Cafe Staff",
  phoneNumber: "+61400000001",
  message: "Phone verified successfully!",
  ...overrides,
});

const renderWithRouter = (token: string) => {
  return render(
    <MemoryRouter initialEntries={[`/casual/verify/${token}`]}>
      <Routes>
        <Route path="/casual/verify/:token" element={<VerifyInvitePage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("VerifyInvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePushNotifications.mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      isLoading: false,
      error: null,
      subscribe: mockSubscribe,
      unsubscribe: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("verification states", () => {
    it("shows loading state initially", () => {
      vi.mocked(casualApi.verifyInvite).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      renderWithRouter("test-token");

      expect(screen.getByText(/verifying your invite/i)).toBeInTheDocument();
    });

    it("shows success state after successful verification", async () => {
      vi.mocked(casualApi.verifyInvite).mockResolvedValueOnce(createMockResponse());

      renderWithRouter("valid-token");

      await waitFor(() => {
        expect(screen.getByText(/you're verified/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/john/i)).toBeInTheDocument();
      expect(screen.getByText(/cafe staff/i)).toBeInTheDocument();
    });

    it("shows error state when verification fails", async () => {
      vi.mocked(casualApi.verifyInvite).mockRejectedValue(new Error("Token expired"));

      renderWithRouter("expired-token");

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /verification failed/i })).toBeInTheDocument();
      });
    });
  });

  describe("push notification prompt", () => {
    it("shows notification prompt when push is supported and verification succeeds", async () => {
      vi.mocked(casualApi.verifyInvite).mockResolvedValueOnce(createMockResponse());

      renderWithRouter("valid-token");

      await waitFor(() => {
        expect(screen.getByText(/you're verified/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/enable.*notifications/i)).toBeInTheDocument();
    });

    it("hides notification prompt when push is not supported", async () => {
      mockUsePushNotifications.mockReturnValue({
        isSupported: false,
        isSubscribed: false,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
      });

      vi.mocked(casualApi.verifyInvite).mockResolvedValueOnce(createMockResponse());

      renderWithRouter("valid-token");

      await waitFor(() => {
        expect(screen.getByText(/you're verified/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/enable.*notifications/i)).not.toBeInTheDocument();
    });

    it("hides notification prompt when already subscribed", async () => {
      mockUsePushNotifications.mockReturnValue({
        isSupported: true,
        isSubscribed: true,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
      });

      vi.mocked(casualApi.verifyInvite).mockResolvedValueOnce(createMockResponse());

      renderWithRouter("valid-token");

      await waitFor(() => {
        expect(screen.getByText(/you're verified/i)).toBeInTheDocument();
      });

      // Should show "notifications enabled" instead of the enable button
      expect(screen.queryByRole("button", { name: /enable/i })).not.toBeInTheDocument();
      expect(screen.getByText(/notifications enabled/i)).toBeInTheDocument();
    });

    it("calls subscribe when enable notifications button is clicked", async () => {
      vi.mocked(casualApi.verifyInvite).mockResolvedValueOnce(createMockResponse());

      renderWithRouter("valid-token");

      await waitFor(() => {
        expect(screen.getByText(/you're verified/i)).toBeInTheDocument();
      });

      const enableButton = screen.getByRole("button", { name: /enable/i });
      fireEvent.click(enableButton);

      expect(mockSubscribe).toHaveBeenCalledTimes(1);
    });

    it("shows loading state while subscribing", async () => {
      mockUsePushNotifications.mockReturnValue({
        isSupported: true,
        isSubscribed: false,
        isLoading: true,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
      });

      vi.mocked(casualApi.verifyInvite).mockResolvedValueOnce(createMockResponse());

      renderWithRouter("valid-token");

      await waitFor(() => {
        expect(screen.getByText(/you're verified/i)).toBeInTheDocument();
      });

      // Button should be disabled or show loading
      const enableButton = screen.getByRole("button", { name: /enabling/i });
      expect(enableButton).toBeDisabled();
    });

    it("shows error message when subscription fails", async () => {
      mockUsePushNotifications.mockReturnValue({
        isSupported: true,
        isSubscribed: false,
        isLoading: false,
        error: "Permission denied",
        subscribe: mockSubscribe,
        unsubscribe: vi.fn(),
      });

      vi.mocked(casualApi.verifyInvite).mockResolvedValueOnce(createMockResponse());

      renderWithRouter("valid-token");

      await waitFor(() => {
        expect(screen.getByText(/you're verified/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });

    it("passes phoneNumber to usePushNotifications hook", async () => {
      vi.mocked(casualApi.verifyInvite).mockResolvedValueOnce(createMockResponse());

      renderWithRouter("valid-token");

      await waitFor(() => {
        expect(screen.getByText(/you're verified/i)).toBeInTheDocument();
      });

      // The hook should have been called with the phone number from the response
      expect(mockUsePushNotifications).toHaveBeenCalledWith("+61400000001");
    });
  });

  describe("no notification prompt on error", () => {
    it("does not show notification prompt when verification fails", async () => {
      vi.mocked(casualApi.verifyInvite).mockRejectedValue(new Error("Invalid token"));

      renderWithRouter("invalid-token");

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /verification failed/i })).toBeInTheDocument();
      });

      expect(screen.queryByText(/enable.*notifications/i)).not.toBeInTheDocument();
    });
  });
});
