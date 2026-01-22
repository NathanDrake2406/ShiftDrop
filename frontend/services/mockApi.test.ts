import { describe, it, expect, beforeEach, vi } from "vitest";
import { api, resetMockData } from "./mockApi";
import { ClaimStatus, ShiftStatus } from "../types";

const runWithFakeTimers = async <T>(fn: () => Promise<T>) => {
  vi.useFakeTimers();
  try {
    const pending = fn();
    await vi.runAllTimersAsync();
    return await pending;
  } finally {
    vi.useRealTimers();
  }
};

describe("mockApi", () => {
  beforeEach(() => {
    resetMockData();
    vi.useRealTimers();
  });

  describe("casual.login", () => {
    it("returns a casual for known phone numbers", async () => {
      const casual = await runWithFakeTimers(() => api.casual.login("555-0101"));
      expect(casual?.name).toBe("Sarah Jenkins");
    });

    it("returns undefined for unknown phone numbers", async () => {
      const casual = await runWithFakeTimers(() => api.casual.login("000-0000"));
      expect(casual).toBeUndefined();
    });
  });

  describe("casual.getAvailableShifts", () => {
    it("only returns shifts for pools the user belongs to", async () => {
      const sarahShifts = await runWithFakeTimers(() => api.casual.getAvailableShifts("555-0101"));
      const outsiderShifts = await runWithFakeTimers(() => api.casual.getAvailableShifts("999-9999"));

      expect(sarahShifts.length).toBeGreaterThan(0);
      expect(outsiderShifts).toHaveLength(0);
    });
  });

  describe("casual.claimShift", () => {
    it("decrements remaining spots and fills the shift when it reaches zero", async () => {
      const casual = await runWithFakeTimers(() => api.casual.login("555-0102"));
      expect(casual).toBeTruthy();

      const updated = await runWithFakeTimers(() => api.casual.claimShift("shift-1", casual!));
      expect(updated.spotsRemaining).toBe(0);
      expect(updated.status).toBe(ShiftStatus.Filled);
    });

    it("prevents the same casual from claiming twice", async () => {
      const casual = await runWithFakeTimers(() => api.casual.login("555-0101"));
      expect(casual).toBeTruthy();

      await runWithFakeTimers(() => api.casual.claimShift("shift-2", casual!));
      await runWithFakeTimers(async () => {
        let error: unknown;
        try {
          await api.casual.claimShift("shift-2", casual!);
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/Already claimed/);
      });
    });
  });

  describe("casual.bailShift", () => {
    it("marks the claim bailed and reopens spots", async () => {
      const casual = await runWithFakeTimers(() => api.casual.login("555-0101"));
      expect(casual).toBeTruthy();

      await runWithFakeTimers(() => api.casual.bailShift("shift-1", casual!));
      const shifts = await runWithFakeTimers(() => api.casual.getAvailableShifts("555-0101"));

      const bailedShift = shifts.find((s) => s.id === "shift-1");
      expect(bailedShift?.claims.find((c) => c.casualId === casual!.id)?.status).toBe(ClaimStatus.Bailed);
      expect(bailedShift?.spotsRemaining).toBe(2);
      expect(bailedShift?.status).toBe(ShiftStatus.Open);
    });
  });

  describe("manager flows", () => {
    it("returns deep copies of pools so callers cannot mutate shared state", async () => {
      const pools = await runWithFakeTimers(() => api.manager.getPools());
      expect(pools[0]).toBeDefined();
      pools[0]!.name = "Mutated";

      const next = await runWithFakeTimers(() => api.manager.getPools());
      expect(next[0]).toBeDefined();
      expect(next[0]!.name).not.toBe("Mutated");
    });

    it("creates new pools and lists them", async () => {
      const initial = await runWithFakeTimers(() => api.manager.getPools());
      expect(initial).toHaveLength(1);

      await runWithFakeTimers(() => api.manager.createPool("Night Shift Team"));
      const after = await runWithFakeTimers(() => api.manager.getPools());
      expect(after).toHaveLength(2);
      expect(after.some((p) => p.name === "Night Shift Team")).toBe(true);
    });

    it("can cancel and release claims on shifts", async () => {
      await runWithFakeTimers(() => api.manager.cancelShift("pool-1", "shift-1"));
      const afterCancel = await runWithFakeTimers(() => api.manager.getPoolDetails("pool-1"));
      expect(afterCancel?.shifts.find((s) => s.id === "shift-1")?.status).toBe(ShiftStatus.Cancelled);

      // Reset and try release claim path
      resetMockData();
      await runWithFakeTimers(() => api.manager.releaseClaim("pool-1", "shift-1", "claim-1"));
      const afterRelease = await runWithFakeTimers(() => api.manager.getPoolDetails("pool-1"));
      const releasedShift = afterRelease?.shifts.find((s) => s.id === "shift-1");
      const releasedClaim = releasedShift?.claims.find((c) => c.id === "claim-1");

      expect(releasedClaim?.status).toBe(ClaimStatus.ReleasedByManager);
      expect(releasedShift?.spotsRemaining).toBe(2);
      expect(releasedShift?.status).toBe(ShiftStatus.Open);
    });

    it("rejects invalid shift times", async () => {
      const start = new Date("2024-01-01T10:00:00Z").toISOString();
      const endBefore = new Date("2024-01-01T09:00:00Z").toISOString();
      const farEnd = new Date("2024-01-03T10:00:00Z").toISOString(); // 48h
      const tooLong = new Date("2024-01-02T02:00:00Z").toISOString(); // 16h from start

      await runWithFakeTimers(async () => {
        let error: unknown;
        try {
          await api.manager.postShift("pool-1", { startsAt: start, endsAt: endBefore, spotsNeeded: 1 });
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
      });

      await runWithFakeTimers(async () => {
        let error: unknown;
        try {
          await api.manager.postShift("pool-1", { startsAt: start, endsAt: farEnd, spotsNeeded: 1 });
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
      });

      await runWithFakeTimers(async () => {
        let error: unknown;
        try {
          await api.manager.postShift("pool-1", { startsAt: start, endsAt: tooLong, spotsNeeded: 1 });
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
      });
    });

    it("rejects non-positive spots", async () => {
      const start = new Date("2024-01-01T10:00:00Z").toISOString();
      const end = new Date("2024-01-01T14:00:00Z").toISOString();

      await runWithFakeTimers(async () => {
        let error: unknown;
        try {
          await api.manager.postShift("pool-1", { startsAt: start, endsAt: end, spotsNeeded: 0 });
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
      });
    });

    it("accepts up to 15 hour duration but not beyond", async () => {
      const start = new Date("2024-01-01T00:00:00Z");
      const endAtLimit = new Date(start);
      endAtLimit.setHours(start.getHours() + 15);

      const shift = await runWithFakeTimers(() =>
        api.manager.postShift("pool-1", {
          startsAt: start.toISOString(),
          endsAt: endAtLimit.toISOString(),
          spotsNeeded: 1,
        }),
      );
      expect(shift.spotsNeeded).toBe(1);
    });

    it("prevents claims once a shift is full", async () => {
      const start = new Date("2024-01-02T10:00:00Z").toISOString();
      const end = new Date("2024-01-02T14:00:00Z").toISOString();
      const newShift = await runWithFakeTimers(() =>
        api.manager.postShift("pool-1", { startsAt: start, endsAt: end, spotsNeeded: 1 }),
      );

      const claimer = await runWithFakeTimers(() => api.casual.login("555-0102"));
      const secondClaimer = await runWithFakeTimers(() => api.casual.login("555-0101"));
      expect(claimer && secondClaimer).toBeTruthy();

      await runWithFakeTimers(() => api.casual.claimShift(newShift.id, claimer!));
      await runWithFakeTimers(async () => {
        let error: unknown;
        try {
          await api.casual.claimShift(newShift.id, secondClaimer!);
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});
