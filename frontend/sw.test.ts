import { describe, it, expect } from "vitest";

/**
 * Tests for service worker push notification handling logic.
 * The actual service worker runs in a different context, so we test the
 * core logic functions that would be used in sw.js.
 */

// Simulate the push event data parsing logic
function parsePushData(dataText: string): { title: string; body: string; url?: string } | null {
  try {
    const data = JSON.parse(dataText);
    return {
      title: data.title || "ShiftDrop",
      body: data.body || "You have a new notification",
      url: data.url,
    };
  } catch {
    return null;
  }
}

// Simulate notification options builder
function buildNotificationOptions(data: { title: string; body: string; url?: string }) {
  return {
    body: data.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [100, 50, 100],
    data: { url: data.url },
    actions: data.url ? [{ action: "open", title: "View" }] : [],
  };
}

describe("Service Worker Push Logic", () => {
  describe("parsePushData", () => {
    it("parses valid JSON push data", () => {
      const data = JSON.stringify({
        title: "New Shift Available!",
        body: "A new shift is available. Tap to claim.",
        url: "/casual/claim/abc123",
      });

      const result = parsePushData(data);

      expect(result).toEqual({
        title: "New Shift Available!",
        body: "A new shift is available. Tap to claim.",
        url: "/casual/claim/abc123",
      });
    });

    it("provides defaults for missing title", () => {
      const data = JSON.stringify({
        body: "Some message",
      });

      const result = parsePushData(data);

      expect(result?.title).toBe("ShiftDrop");
    });

    it("provides defaults for missing body", () => {
      const data = JSON.stringify({
        title: "Alert",
      });

      const result = parsePushData(data);

      expect(result?.body).toBe("You have a new notification");
    });

    it("handles missing url gracefully", () => {
      const data = JSON.stringify({
        title: "Test",
        body: "Test body",
      });

      const result = parsePushData(data);

      expect(result?.url).toBeUndefined();
    });

    it("returns null for invalid JSON", () => {
      const result = parsePushData("not valid json");

      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = parsePushData("");

      expect(result).toBeNull();
    });
  });

  describe("buildNotificationOptions", () => {
    it("includes body and icon", () => {
      const data = { title: "Test", body: "Test body" };

      const options = buildNotificationOptions(data);

      expect(options.body).toBe("Test body");
      expect(options.icon).toBe("/icon.svg");
      expect(options.badge).toBe("/icon.svg");
    });

    it("includes vibration pattern", () => {
      const data = { title: "Test", body: "Test body" };

      const options = buildNotificationOptions(data);

      expect(options.vibrate).toEqual([100, 50, 100]);
    });

    it("includes URL in data when provided", () => {
      const data = { title: "Test", body: "Test body", url: "/some/path" };

      const options = buildNotificationOptions(data);

      expect(options.data.url).toBe("/some/path");
    });

    it("includes action button when URL is provided", () => {
      const data = { title: "Test", body: "Test body", url: "/some/path" };

      const options = buildNotificationOptions(data);

      expect(options.actions).toHaveLength(1);
      expect(options.actions[0]).toEqual({ action: "open", title: "View" });
    });

    it("has no action button when URL is not provided", () => {
      const data = { title: "Test", body: "Test body" };

      const options = buildNotificationOptions(data);

      expect(options.actions).toHaveLength(0);
    });
  });
});

describe("Service Worker Notification Click Logic", () => {
  // Simulate the logic for handling notification clicks
  function getUrlToOpen(notificationData: { url?: string }, origin: string): string {
    if (notificationData.url) {
      // If it's a relative URL, prepend origin
      if (notificationData.url.startsWith("/")) {
        return origin + notificationData.url;
      }
      return notificationData.url;
    }
    return origin;
  }

  it("opens relative URL with origin", () => {
    const data = { url: "/casual/claim/abc123" };
    const origin = "https://shiftdrop.app";

    const url = getUrlToOpen(data, origin);

    expect(url).toBe("https://shiftdrop.app/casual/claim/abc123");
  });

  it("opens absolute URL as-is", () => {
    const data = { url: "https://external.com/path" };
    const origin = "https://shiftdrop.app";

    const url = getUrlToOpen(data, origin);

    expect(url).toBe("https://external.com/path");
  });

  it("opens origin when no URL provided", () => {
    const data = {};
    const origin = "https://shiftdrop.app";

    const url = getUrlToOpen(data, origin);

    expect(url).toBe("https://shiftdrop.app");
  });
});
