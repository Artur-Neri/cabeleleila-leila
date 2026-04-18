/* Provider + hook no mesmo ficheiro é um padrão comum de React Context */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { apiFetch, setToken } from "../api/client";
import type { AuthUser } from "./authTypes";

type AuthState =
  | { status: "anonymous" }
  | { status: "authenticated"; token: string; user: AuthUser };

type AuthContextValue = {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem("cabeleleila_token");
    const raw = localStorage.getItem("cabeleleila_user");
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as AuthUser;
        return { status: "authenticated", token, user };
      } catch {
        return { status: "anonymous" };
      }
    }
    return { status: "anonymous" };
  });

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setToken(res.token);
    localStorage.setItem("cabeleleila_user", JSON.stringify(res.user));
    setAuth({ status: "authenticated", token: res.token, user: res.user });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("cabeleleila_user");
    setAuth({ status: "anonymous" });
  }, []);

  const value = useMemo(() => ({ auth, login, logout }), [auth, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
