import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, refreshAccessToken, setAccessToken, type User } from "./api";

type Status = "loading" | "guest" | "authed";

interface AuthValue {
  status: Status;
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: Parameters<typeof api.register>[0]) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  // Restore the session on page load: the httpOnly cookie gets us a new access token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (!token) return !cancelled && setStatus("guest");
      try {
        const { user } = await api.me();
        if (!cancelled) {
          setUser(user);
          setStatus("authed");
        }
      } catch {
        if (!cancelled) setStatus("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback((u: User, token: string) => {
    setAccessToken(token);
    setUser(u);
    setStatus("authed");
  }, []);

  const end = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("guest");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      login: async (identifier, password) => {
        const r = await api.login(identifier, password);
        start(r.user, r.accessToken);
      },
      register: async (input) => {
        const r = await api.register(input);
        start(r.user, r.accessToken);
      },
      logout: async () => {
        await api.logout().catch(() => {}); // sign out locally even if the network call fails
        end();
      },
      logoutAll: async () => {
        await api.logoutAll();
        end();
      },
    }),
    [status, user, start, end],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
