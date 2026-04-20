/* Provider e hook no mesmo arquivo — padrão comum de React Context */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { apiFetch, setToken } from "../api/client";
import type { AuthUser } from "./authTypes";

type AuthState =
  | { status: "anonymous" }
  | { status: "authenticated"; token: string; user: AuthUser };

export type RegisterInput = {
  name: string;
  phone: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem("cabeleleila_token");
    const raw = localStorage.getItem("cabeleleila_user");
    if (token && raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<AuthUser>;
        if (!parsed.id || !parsed.email || !parsed.name || !parsed.role) {
          return { status: "anonymous" };
        }
        const user: AuthUser = {
          id: parsed.id,
          email: parsed.email,
          name: parsed.name,
          phone: typeof parsed.phone === "string" ? parsed.phone : "",
          role: parsed.role,
        };
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

  const register = useCallback(async (input: RegisterInput) => {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      json: input,
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

  const value = useMemo(() => ({ auth, login, register, logout }), [auth, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
