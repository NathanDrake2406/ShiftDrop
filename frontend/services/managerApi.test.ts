import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import {
  addCasual,
  cancelShift,
  createPool,
  getPool,
  getPoolShifts,
  getPools,
  postShift,
  releaseCasual,
  removeCasual,
  resendInvite,
} from "./managerApi";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

describe("managerApi", () => {
  const token = "token-123";

  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it.each([
    {
      label: "getPools",
      call: () => getPools(token),
      path: "/pools",
      options: { token },
    },
    {
      label: "getPool",
      call: () => getPool("pool-1", token),
      path: "/pools/pool-1",
      options: { token },
    },
    {
      label: "getPoolShifts",
      call: () => getPoolShifts("pool-1", token),
      path: "/pools/pool-1/shifts",
      options: { token },
    },
  ])("$label calls apiRequest", async ({ call, path, options }) => {
    apiRequestMock.mockResolvedValueOnce([]);

    await call();

    expect(apiRequestMock).toHaveBeenCalledWith(path, options);
  });

  it.each([
    {
      label: "createPool",
      call: () => createPool("Night Shift", token),
      path: "/pools",
      options: { method: "POST", body: { name: "Night Shift" }, token },
    },
    {
      label: "addCasual",
      call: () => addCasual("pool-1", "Sam", "555-0101", token),
      path: "/pools/pool-1/casuals",
      options: { method: "POST", body: { name: "Sam", phoneNumber: "555-0101" }, token },
    },
    {
      label: "postShift",
      call: () =>
        postShift(
          "pool-1",
          { startsAt: "2025-01-01T10:00:00Z", endsAt: "2025-01-01T14:00:00Z", spotsNeeded: 2 },
          token,
        ),
      path: "/pools/pool-1/shifts",
      options: {
        method: "POST",
        body: { startsAt: "2025-01-01T10:00:00Z", endsAt: "2025-01-01T14:00:00Z", spotsNeeded: 2 },
        token,
      },
    },
  ])("$label posts with body", async ({ call, path, options }) => {
    apiRequestMock.mockResolvedValueOnce({});

    await call();

    expect(apiRequestMock).toHaveBeenCalledWith(path, options);
  });

  it.each([
    {
      label: "removeCasual",
      call: () => removeCasual("pool-1", "cas-1", token),
      path: "/pools/pool-1/casuals/cas-1",
      options: { method: "DELETE", token },
    },
    {
      label: "cancelShift",
      call: () => cancelShift("pool-1", "shift-1", token),
      path: "/pools/pool-1/shifts/shift-1/cancel",
      options: { method: "POST", token },
    },
    {
      label: "releaseCasual",
      call: () => releaseCasual("pool-1", "shift-1", "casual-1", token),
      path: "/pools/pool-1/shifts/shift-1/release/casual-1",
      options: { method: "POST", token },
    },
    {
      label: "resendInvite",
      call: () => resendInvite("pool-1", "casual-1", token),
      path: "/pools/pool-1/casuals/casual-1/resend-invite",
      options: { method: "POST", token },
    },
  ])("$label posts without body", async ({ call, path, options }) => {
    apiRequestMock.mockResolvedValueOnce(undefined);

    await call();

    expect(apiRequestMock).toHaveBeenCalledWith(path, options);
  });
});
