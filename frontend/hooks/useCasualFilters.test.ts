import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCasualFilters } from "./useCasualFilters";
import type { CasualResponse } from "../types/api";

// Factory for creating test casuals
const createCasual = (id: string, isActive: boolean): CasualResponse => ({
  id,
  name: `Casual ${id}`,
  phoneNumber: `+6140000000${id}`,
  inviteStatus: isActive ? "Accepted" : "Pending",
  isActive,
  isOptedOut: false,
});

describe("useCasualFilters", () => {
  describe("filtering", () => {
    it("separates active and pending casuals", () => {
      const casuals = [
        createCasual("1", true),
        createCasual("2", false),
        createCasual("3", true),
        createCasual("4", false),
      ];

      const { result } = renderHook(() => useCasualFilters(casuals));

      expect(result.current.activeCasuals).toHaveLength(2);
      expect(result.current.pendingCasuals).toHaveLength(2);

      expect(result.current.activeCasuals.map((c) => c.id)).toEqual(["1", "3"]);
      expect(result.current.pendingCasuals.map((c) => c.id)).toEqual(["2", "4"]);
    });

    it("returns empty arrays when casuals is empty", () => {
      const { result } = renderHook(() => useCasualFilters([]));

      expect(result.current.activeCasuals).toEqual([]);
      expect(result.current.pendingCasuals).toEqual([]);
    });

    it("handles all active casuals", () => {
      const casuals = [createCasual("1", true), createCasual("2", true)];

      const { result } = renderHook(() => useCasualFilters(casuals));

      expect(result.current.activeCasuals).toHaveLength(2);
      expect(result.current.pendingCasuals).toHaveLength(0);
    });

    it("handles all pending casuals", () => {
      const casuals = [createCasual("1", false), createCasual("2", false)];

      const { result } = renderHook(() => useCasualFilters(casuals));

      expect(result.current.activeCasuals).toHaveLength(0);
      expect(result.current.pendingCasuals).toHaveLength(2);
    });
  });

  describe("referential equality (memoization)", () => {
    it("maintains referential equality when input unchanged", () => {
      const casuals = [createCasual("1", true), createCasual("2", false)];

      const { result, rerender } = renderHook(({ data }) => useCasualFilters(data), {
        initialProps: { data: casuals },
      });

      const firstActiveRef = result.current.activeCasuals;
      const firstPendingRef = result.current.pendingCasuals;

      // Rerender with the SAME array reference
      rerender({ data: casuals });

      // Should be the exact same object references (memoized)
      expect(result.current.activeCasuals).toBe(firstActiveRef);
      expect(result.current.pendingCasuals).toBe(firstPendingRef);
    });

    it("recomputes when casuals array changes", () => {
      const initialCasuals = [createCasual("1", true)];

      const { result, rerender } = renderHook(({ data }) => useCasualFilters(data), {
        initialProps: { data: initialCasuals },
      });

      const firstActiveRef = result.current.activeCasuals;

      // Rerender with a NEW array (different reference)
      const newCasuals = [createCasual("1", true), createCasual("2", true)];
      rerender({ data: newCasuals });

      // Should be different references (recomputed)
      expect(result.current.activeCasuals).not.toBe(firstActiveRef);
      expect(result.current.activeCasuals).toHaveLength(2);
    });
  });
});
