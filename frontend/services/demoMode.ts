const DEMO_MODE_STORAGE_KEY = "shiftdrop:demo-mode";
const DEMO_MANAGER_SESSION_STORAGE_KEY = "shiftdrop:demo-manager-session";

const readBool = (key: string): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "true";
};

const writeBool = (key: string, value: boolean) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "true" : "false");
};

export const getDemoMode = () => readBool(DEMO_MODE_STORAGE_KEY);
export const getDemoManagerSession = () => readBool(DEMO_MANAGER_SESSION_STORAGE_KEY);
export const setDemoManagerSession = (value: boolean) => writeBool(DEMO_MANAGER_SESSION_STORAGE_KEY, value);

export { DEMO_MODE_STORAGE_KEY, DEMO_MANAGER_SESSION_STORAGE_KEY };
