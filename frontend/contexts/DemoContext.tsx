import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { resetMockData } from "../services/mockApi";
import { DEMO_MODE_STORAGE_KEY, DEMO_MANAGER_SESSION_STORAGE_KEY } from "../services/demoMode";

type DemoContextValue = {
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
  demoManagerSignedIn: boolean;
  setDemoManagerSignedIn: (value: boolean) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [demoMode, setDemoMode] = useLocalStorage<boolean>(DEMO_MODE_STORAGE_KEY, false);
  const [demoManagerSignedIn, setDemoManagerSignedIn] = useLocalStorage<boolean>(
    DEMO_MANAGER_SESSION_STORAGE_KEY,
    false,
  );

  // Track previous value to only reset when transitioning INTO demo mode
  const previousDemoMode = useRef(demoMode);

  useEffect(() => {
    // Only reset mock data when transitioning from false -> true
    if (demoMode && !previousDemoMode.current) {
      resetMockData();
    }
    previousDemoMode.current = demoMode;
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode && demoManagerSignedIn) {
      setDemoManagerSignedIn(false);
    }
  }, [demoMode, demoManagerSignedIn, setDemoManagerSignedIn]);

  return (
    <DemoContext.Provider value={{ demoMode, setDemoMode, demoManagerSignedIn, setDemoManagerSignedIn }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = (): DemoContextValue => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
};
