import { SESSION_COOKIE_NAME } from '../constants';

const COOKIE_NAME = SESSION_COOKIE_NAME;

export function getSession(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function setSession(value: string): void {
  // Session cookie (no expires/max-age) — cleared when browser fully closes
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

export function removeSession(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
