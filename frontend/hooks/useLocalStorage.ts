import { useState, useCallback } from "react";

/**
 * A hook that persists state to localStorage.
 * Returns [value, setValue] similar to useState.
 *
 * Writes to localStorage synchronously to avoid race conditions
 * where external code reads localStorage before React's effect cycle.
 *
 * @param key - The localStorage key
 * @param initialValue - Initial value if nothing in storage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use provided initial
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      // localStorage not available (private mode, security restrictions, etc.)
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        // Write to localStorage synchronously to avoid race conditions
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, JSON.stringify(newValue));
          } catch {
            // Ignore write errors (e.g., quota exceeded, private mode)
          }
        }
        return newValue;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
