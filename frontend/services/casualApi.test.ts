import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { bailShift, claimShift, getAvailableShifts, getMyShifts } from "./casualApi";

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

    expect(apiRequestMock).toHaveBeenCalledWith(`/casual/available-shifts?${query}`);
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

    expect(apiRequestMock).toHaveBeenCalledWith("/casual/shifts/shift-1/bail", {
      method: "POST",
      body: { phoneNumber: "555-0101" },
    });
  });
});
