import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCasualCallbacks } from "./useCasualCallbacks";
import type { CasualResponse } from "../types/api";

// Factory for creating test casuals
const createCasual = (id: string): CasualResponse => ({
  id,
  name: `Casual ${id}`,
  phoneNumber: `+6140000000${id}`,
  inviteStatus: "Accepted",
  isActive: true,
  isOptedOut: false,
});

describe("useCasualCallbacks", () => {
  describe("callback stability", () => {
    it("returns stable callback references across renders for the same casualId", () => {
      const onRemove = vi.fn();
      const onResendInvite = vi.fn();
      const onEditAvailability = vi.fn();

      const { result, rerender } = renderHook(() =>
        useCasualCallbacks({ onRemove, onResendInvite, onEditAvailability }),
      );

      const casual = createCasual("1");

      // Get callbacks for casual 1
      const firstCallbacks = result.current.getCallbacks(casual);

      // Rerender the hook (simulating parent re-render)
      rerender();

      // Get callbacks again for the same casual
      const secondCallbacks = result.current.getCallbacks(casual);

      // Callbacks should be the SAME references (stable)
      expect(secondCallbacks.onRemove).toBe(firstCallbacks.onRemove);
      expect(secondCallbacks.onResendInvite).toBe(firstCallbacks.onResendInvite);
      expect(secondCallbacks.onEditAvailability).toBe(firstCallbacks.onEditAvailability);
    });

    it("returns different callbacks for different casualIds", () => {
      const onRemove = vi.fn();
      const onResendInvite = vi.fn();
      const onEditAvailability = vi.fn();

      const { result } = renderHook(() =>
        useCasualCallbacks({ onRemove, onResendInvite, onEditAvailability }),
      );

      const casual1 = createCasual("1");
      const casual2 = createCasual("2");

      const callbacks1 = result.current.getCallbacks(casual1);
      const callbacks2 = result.current.getCallbacks(casual2);

      // Different casuals should have different callback functions
      expect(callbacks2.onRemove).not.toBe(callbacks1.onRemove);
    });
  });

  describe("callback invocation", () => {
    it("invokes onRemove with correct casualId", () => {
      const onRemove = vi.fn();
      const onResendInvite = vi.fn();
      const onEditAvailability = vi.fn();

      const { result } = renderHook(() =>
        useCasualCallbacks({ onRemove, onResendInvite, onEditAvailability }),
      );

      const casual = createCasual("test-id-123");
      const callbacks = result.current.getCallbacks(casual);

      act(() => {
        callbacks.onRemove();
      });

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith("test-id-123");
    });

    it("invokes onResendInvite with correct casual object", () => {
      const onRemove = vi.fn();
      const onResendInvite = vi.fn();
      const onEditAvailability = vi.fn();

      const { result } = renderHook(() =>
        useCasualCallbacks({ onRemove, onResendInvite, onEditAvailability }),
      );

      const casual = createCasual("resend-id");
      const callbacks = result.current.getCallbacks(casual);

      act(() => {
        callbacks.onResendInvite();
      });

      expect(onResendInvite).toHaveBeenCalledTimes(1);
      expect(onResendInvite).toHaveBeenCalledWith(casual);
    });

    it("invokes onEditAvailability with correct casual object", () => {
      const onRemove = vi.fn();
      const onResendInvite = vi.fn();
      const onEditAvailability = vi.fn();

      const { result } = renderHook(() =>
        useCasualCallbacks({ onRemove, onResendInvite, onEditAvailability }),
      );

      const casual = createCasual("availability-id");
      const callbacks = result.current.getCallbacks(casual);

      act(() => {
        callbacks.onEditAvailability();
      });

      expect(onEditAvailability).toHaveBeenCalledTimes(1);
      expect(onEditAvailability).toHaveBeenCalledWith(casual);
    });
  });

  describe("handler updates", () => {
    it("uses the latest handler when handler references change", () => {
      const firstHandler = vi.fn();
      const secondHandler = vi.fn();

      const { result, rerender } = renderHook(
        ({ handler }) => useCasualCallbacks({ onRemove: handler, onResendInvite: vi.fn(), onEditAvailability: vi.fn() }),
        { initialProps: { handler: firstHandler } },
      );

      const casual = createCasual("1");
      const callbacks = result.current.getCallbacks(casual);

      // Update the handler
      rerender({ handler: secondHandler });

      // The cached callback should still be the same reference...
      const callbacks2 = result.current.getCallbacks(casual);
      expect(callbacks2.onRemove).toBe(callbacks.onRemove);

      // ...but when invoked, it should call the NEW handler
      act(() => {
        callbacks2.onRemove();
      });

      expect(firstHandler).not.toHaveBeenCalled();
      expect(secondHandler).toHaveBeenCalledWith("1");
    });
  });
});
