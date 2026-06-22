import type { User } from "./types";

const TOKEN_KEY = "cmp_token";
const USER_KEY = "cmp_user";

/** Fired on the window whenever the stored token/user changes. */
export const AUTH_EVENT = "cmp-auth-change";

function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    emitAuthChange();
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    emitAuthChange();
  } catch {
    /* ignore */
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    emitAuthChange();
  } catch {
    /* ignore */
  }
}

export function persistSession(token: string, user: User): void {
  setToken(token);
  setStoredUser(user);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
