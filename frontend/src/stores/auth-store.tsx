"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api-client";
import { getAccessToken, refreshAccessToken, setAccessToken } from "@/lib/auth";
import type { User } from "@/types/auth";

interface AuthState {
  user: User | null;
  /** true tant que la restauration de session initiale n'est pas terminée. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Au chargement, tente de restaurer la session depuis le cookie refresh.
  useEffect(() => {
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          setUser(await api<User>("/auth/me/"));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail ?? "Identifiants invalides.");
    }
    setAccessToken(data.access);
    const me = await api<User>("/auth/me/");
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    const token = getAccessToken();
    await fetch("/api/session/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setAccessToken(null);
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé sous <AuthProvider>.");
  return context;
}
