import { clearAuth, getToken } from "./auth";

/**
 * Base URL for the backend API.
 *
 * IMPORTANT: this value ALREADY includes the `/api` prefix
 *   - dev:  http://localhost:8080/api
 *   - prod: /api   (same-origin behind Caddy)
 *
 * So call paths must NOT re-add it, e.g. `api.post("/auth/login", ...)`.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api"
).replace(/\/+$/, "");

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: QueryParams;
  /** Attach the bearer token (default true). */
  auth?: boolean;
}

function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function buildUrl(path: string, params?: QueryParams): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}${buildQuery(params)}`;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const { pathname } = window.location;
  if (pathname === "/login" || pathname === "/signup") return;
  window.location.assign("/login");
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, auth = true, headers, ...init } = options;
  const token = auth ? getToken() : null;
  const hasBody = body !== undefined && body !== null;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: hasBody ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
      0,
      err,
    );
  }

  if (response.status === 401) {
    clearAuth();
    redirectToLogin();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let details: unknown;
    try {
      const data = await response.json();
      details = data;
      if (data && typeof data === "object") {
        message =
          (data as Record<string, string>).message ||
          (data as Record<string, string>).error ||
          message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  get: <T>(path: string, params?: QueryParams, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, params, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, body, method: "POST" }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, body, method: "PUT" }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, body, method: "PATCH" }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
