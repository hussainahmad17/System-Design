// Shared HTTP client for /api/v1: timeouts, JSON errors, one error type for the whole app.

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string>;
  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TIMEOUT_MS = 10_000;

export interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal; // lets a page cancel a request it no longer needs
}

export async function request<T>(path: string, { method = "GET", body, token, signal }: RequestOptions = {}): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        ...(body !== undefined && { "content-type": "application/json" }),
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    if (signal?.aborted) throw err; // cancelled on purpose (page changed); callers ignore it
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    throw new ApiError(
      0,
      timedOut ? "TIMEOUT" : "NETWORK",
      timedOut ? "The server took too long to respond. Try again." : "Can't reach the server. Check your connection and try again.",
    );
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    // 502/503/504 without our JSON error = a proxy (Vite now, Nginx later) couldn't reach the API
    if (!e && res.status >= 502 && res.status <= 504) {
      throw new ApiError(res.status, "SERVER_UNAVAILABLE", "Our server isn't responding right now. Please try again in a moment.");
    }
    throw new ApiError(res.status, e?.code ?? "UNKNOWN", e?.message ?? `Request failed (${res.status})`, e?.details);
  }
  return data as T;
}
