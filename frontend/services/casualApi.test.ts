import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import {
  bailShift,
  claimByToken,
  claimShift,
  getAvailableShifts,
  getMyShifts,
  optOut,
  verifyInvite,
} from "./casualApi";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

describe("casualApi", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("requests available shifts with phone number query", async () => {
    apiRequestMock.mockResolvedValueOnce({});
    const phoneNumber = "555-0101";
    const query = new URLSearchParams({ phoneNumber }).toString();

    await getAvailableShifts(phoneNumber);

    expect(apiRequestMock).toHaveBeenCalledWith(`/casual/shifts?${query}`);
  });

  it("requests my shifts with phone number query", async () => {
    apiRequestMock.mockResolvedValueOnce({});
    const phoneNumber = "555-0101";
    const query = new URLSearchParams({ phoneNumber }).toString();

    await getMyShifts(phoneNumber);

    expect(apiRequestMock).toHaveBeenCalledWith(`/casual/my-shifts?${query}`);
  });

  it("posts claimShift with phone number body", async () => {
    apiRequestMock.mockResolvedValueOnce({});

    await claimShift("shift-1", "555-0101");

    expect(apiRequestMock).toHaveBeenCalledWith("/casual/shifts/shift-1/claim", {
      method: "POST",
      body: { phoneNumber: "555-0101" },
    });
  });

  it("posts bailShift with phone number body", async () => {
    apiRequestMock.mockResolvedValueOnce({});

    await bailShift("shift-1", "555-0101");

    expect(apiRequestMock).toHaveBeenCalledWith("/casual/shifts/shift-1/release", {
      method: "POST",
      body: { phoneNumber: "555-0101" },
    });
  });

  describe("token-based endpoints", () => {
    it("posts verifyInvite with token body", async () => {
      apiRequestMock.mockResolvedValueOnce({});

      await verifyInvite("invite-token-123");

      expect(apiRequestMock).toHaveBeenCalledWith("/casual/verify", {
        method: "POST",
        body: { token: "invite-token-123" },
      });
    });

    it("posts optOut with token body", async () => {
      apiRequestMock.mockResolvedValueOnce({});

      await optOut("optout-token-456");

      expect(apiRequestMock).toHaveBeenCalledWith("/casual/opt-out", {
        method: "POST",
        body: { token: "optout-token-456" },
      });
    });

    it("posts claimByToken with token in URL", async () => {
      apiRequestMock.mockResolvedValueOnce({});

      await claimByToken("claim-token-789");

      expect(apiRequestMock).toHaveBeenCalledWith("/casual/claim/claim-token-789", {
        method: "POST",
      });
    });
  });
});
