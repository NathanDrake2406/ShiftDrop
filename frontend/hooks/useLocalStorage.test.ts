import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "./useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns initial value when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("initial");
  });

  it("returns stored value from localStorage", () => {
    localStorage.setItem("test-key", JSON.stringify("stored-value"));

    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    expect(result.current[0]).toBe("stored-value");
  });

  it("updates value and persists to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(localStorage.getItem("test-key")).toBe(JSON.stringify("new-value"));
  });

  it("accepts a function updater", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it("handles complex objects", () => {
    const initialValue = { name: "test", items: [1, 2, 3] };
    const { result } = renderHook(() => useLocalStorage("complex", initialValue));

    expect(result.current[0]).toEqual(initialValue);

    act(() => {
      result.current[1]({ name: "updated", items: [4, 5] });
    });

    expect(result.current[0]).toEqual({ name: "updated", items: [4, 5] });
  });

  it("handles null values", () => {
    const { result } = renderHook(() => useLocalStorage<string | null>("nullable", null));

    expect(result.current[0]).toBeNull();

    act(() => {
      result.current[1]("value");
    });

    expect(result.current[0]).toBe("value");

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
  });

  it("falls back to initial value on JSON parse error", () => {
    localStorage.setItem("bad-json", "not valid json");

    const { result } = renderHook(() => useLocalStorage("bad-json", "fallback"));

    expect(result.current[0]).toBe("fallback");
  });
});
