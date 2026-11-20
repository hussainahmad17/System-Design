import { ApiError, request, type RequestOptions } from "../lib/http";

export { ApiError };

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "customer" | "admin";
}

// Access token lives in memory only (not localStorage), so injected scripts can't read it
// from storage. A page reload loses it; the httpOnly refresh cookie brings it back.
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

// Single-flight refresh: if 5 requests hit an expired token at once, they share ONE /refresh call
// instead of sending 5 (and racing each other's cookie rotation).
let refreshing: Promise<string | null> | null = null;
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= request<{ accessToken: string }>("/auth/refresh", { method: "POST" })
    .then((r) => {
      setAccessToken(r.accessToken);
      return r.accessToken;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Authenticated request: on an expired token, refresh once and retry once. */
export async function authed<T>(path: string, opts: Omit<RequestOptions, "token"> = {}): Promise<T> {
  try {
    return await request<T>(path, { ...opts, token: accessToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && (await refreshAccessToken())) {
      return request<T>(path, { ...opts, token: accessToken });
    }
    throw err;
  }
}

export const api = {
  register: (input: { username: string; email: string; password: string; firstName: string; lastName: string }) =>
    request<{ user: User; accessToken: string }>("/auth/register", { method: "POST", body: input }),
  login: (identifier: string, password: string) =>
    request<{ user: User; accessToken: string }>("/auth/login", { method: "POST", body: { identifier, password } }),
  me: () => authed<{ user: User }>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  logoutAll: () => authed<void>("/auth/logout-all", { method: "POST" }),
  availability: (field: "email" | "username", value: string) =>
    request<{ field: string; available: boolean }>(`/auth/availability?${field}=${encodeURIComponent(value)}`),
};
