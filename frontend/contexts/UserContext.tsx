import { createContext, useContext, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface CasualUser {
  id: string;
  name: string;
  phoneNumber: string;
}

interface UserContextValue {
  casualUser: CasualUser | null;
  setCasualUser: (user: CasualUser | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [casualUser, setCasualUser] = useLocalStorage<CasualUser | null>("casualUser", null);

  const logout = () => setCasualUser(null);

  return <UserContext.Provider value={{ casualUser, setCasualUser, logout }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

/**
 * Type guard to check if a user is a casual user
 */
export function isCasualUser(user: unknown): user is CasualUser {
  return typeof user === "object" && user !== null && "id" in user && "name" in user && "phoneNumber" in user;
}
