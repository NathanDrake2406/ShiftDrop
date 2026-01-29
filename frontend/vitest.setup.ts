import "@testing-library/jest-dom/vitest";

const createStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
};

const ensureStorage = (key: "localStorage" | "sessionStorage") => {
  if (typeof window === "undefined") return;

  const storageWindow = window as unknown as Record<string, unknown>;
  const existing = storageWindow[key];
  const hasApi =
    existing &&
    typeof (existing as Storage).getItem === "function" &&
    typeof (existing as Storage).setItem === "function" &&
    typeof (existing as Storage).removeItem === "function" &&
    typeof (existing as Storage).clear === "function";

  if (!hasApi) {
    Object.defineProperty(window, key, {
      value: createStorage(),
      writable: true,
      configurable: true,
    });
  }
};

ensureStorage("localStorage");
ensureStorage("sessionStorage");

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
