import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastContext";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => <ToastProvider>{children}</ToastProvider>;

describe("ToastContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow("useToast must be used within a ToastProvider");

    consoleSpy.mockRestore();
  });

  it("starts with empty toasts array", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    expect(result.current.toasts).toEqual([]);
  });

  it("adds toast with showToast", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Test message", "success");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: "Test message",
      type: "success",
    });
    expect(result.current.toasts[0]?.id).toBeDefined();
  });

  it("defaults toast type to info", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Info message");
    });

    expect(result.current.toasts[0]?.type).toBe("info");
  });

  it("removes toast with dismissToast", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Test message");
    });

    const toastId = result.current.toasts[0]?.id;
    expect(toastId).toBeDefined();

    act(() => {
      result.current.dismissToast(toastId!);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("auto-dismisses toast after 4 seconds", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Auto-dismiss test");
    });

    expect(result.current.toasts).toHaveLength(1);

    // Advance time by 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("can show multiple toasts", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Toast 1", "success");
      result.current.showToast("Toast 2", "error");
      result.current.showToast("Toast 3", "info");
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0]?.type).toBe("success");
    expect(result.current.toasts[1]?.type).toBe("error");
    expect(result.current.toasts[2]?.type).toBe("info");
  });

  it("generates unique IDs for each toast", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showToast("Toast 1");
      result.current.showToast("Toast 2");
    });

    const id1 = result.current.toasts[0]?.id;
    const id2 = result.current.toasts[1]?.id;

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});
