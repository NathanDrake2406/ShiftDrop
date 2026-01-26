import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Must mock import.meta.env before importing the hook
vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "BNhYBdGHlNP7ZfDfNHhGq4GgjdHXhXR3jn7mF5E-kK0");
vi.stubEnv("VITE_API_URL", "http://localhost:5228");

// Import after stubbing env
const { usePushNotifications } = await import("./usePushNotifications");

// Mock subscription object
const mockSubscription = {
  endpoint: "https://fcm.googleapis.com/test",
  toJSON: () => ({
    endpoint: "https://fcm.googleapis.com/test",
    keys: { p256dh: "test-p256dh", auth: "test-auth" },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockSubscription),
};

const mockRegistration = {
  pushManager: mockPushManager,
};

describe("usePushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset PushManager availability
    Object.defineProperty(window, "PushManager", {
      value: {},
      writable: true,
      configurable: true,
    });

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve(mockRegistration),
        register: vi.fn().mockResolvedValue(mockRegistration),
      },
      writable: true,
      configurable: true,
    });

    // Mock Notification
    Object.defineProperty(global, "Notification", {
      value: {
        requestPermission: vi.fn().mockResolvedValue("granted"),
        permission: "default",
      },
      writable: true,
      configurable: true,
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "success" }),
    });

    // Reset push manager mock
    mockPushManager.getSubscription.mockResolvedValue(null);
    mockPushManager.subscribe.mockResolvedValue(mockSubscription);
    mockSubscription.unsubscribe.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("support detection", () => {
    it("returns isSupported false when serviceWorker not available", async () => {
      // Must set up BEFORE rendering hook
      Object.defineProperty(navigator, "serviceWorker", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePushNotifications("+61400000001"));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isSupported).toBe(false);
    });

    it("returns isSupported true when all requirements are met", async () => {
      const { result } = renderHook(() => usePushNotifications("+61400000001"));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe("subscription status check", () => {
    it("checks subscription status on mount and reports not subscribed", async () => {
      mockPushManager.getSubscription.mockResolvedValueOnce(null);

      const { result } = renderHook(() => usePushNotifications("+61400000001"));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isSubscribed).toBe(false);
    });

    it("checks subscription status on mount and reports subscribed when existing", async () => {
      mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);

      const { result } = renderHook(() => usePushNotifications("+61400000001"));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isSubscribed).toBe(true);
    });

    it("handles error when checking subscription status", async () => {
      mockPushManager.getSubscription.mockRejectedValueOnce(new Error("Failed"));

      const { result } = renderHook(() => usePushNotifications("+61400000001"));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe("Failed to check subscription status");
    });
  });

  describe("initial state", () => {
    it("returns subscribe and unsubscribe functions", async () => {
      const { result } = renderHook(() => usePushNotifications("+61400000001"));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(typeof result.current.subscribe).toBe("function");
      expect(typeof result.current.unsubscribe).toBe("function");
    });
  });
});
