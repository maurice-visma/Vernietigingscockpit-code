import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AuthContext } from "./authContext";
import type { AuthContextValue } from "./authContext";
import {
  authMode,
  clearAuthSession,
  getAuthSession,
  keycloakConfigComplete,
  logout as keycloakLogout,
  startLogin,
} from "./keycloakAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => getAuthSession());
  const mode = authMode();

  const refreshSession = useCallback(() => {
    const currentSession = getAuthSession();
    setSession(currentSession);
  }, []);

  const login = useCallback(async () => {
    await startLogin();
  }, []);

  const logout = useCallback(() => {
    if (mode === "keycloak") {
      keycloakLogout();
    } else {
      clearAuthSession();
      refreshSession();
    }
  }, [mode, refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      status: session ? "authenticated" : "anonymous",
      user: session?.user ?? null,
      keycloakConfigured: keycloakConfigComplete(),
      login,
      logout,
      refreshSession,
    }),
    [login, logout, mode, refreshSession, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
