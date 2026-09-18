import { createContext, useContext } from "react";

import type { AuthMode, AuthUser } from "./keycloakAuth";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthContextValue = {
  mode: AuthMode;
  status: AuthStatus;
  user: AuthUser | null;
  keycloakConfigured: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshSession: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
