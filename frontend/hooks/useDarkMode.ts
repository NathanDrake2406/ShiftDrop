import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * A hook for managing dark mode state.
 * Persists preference to localStorage and syncs with document class.
 *
 * @returns { isDark, toggle, setDark }
 */
export function useDarkMode() {
  // Default to system preference (evaluated only on initial load)
  const prefersDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;

  const [isDark, setIsDark] = useLocalStorage<boolean>("darkMode", prefersDark);

  // Sync with document class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);
  const setDark = (value: boolean) => setIsDark(value);

  return { isDark, toggle, setDark };
}
