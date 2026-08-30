import { isRole, type Role } from '../auth/roles';
import { ApiError, apiClient } from './client';

/**
 * The authenticated user as returned by the backend auth endpoints
 * (`POST /api/auth/login`, `GET /api/auth/me`). Round-1 auth is a stateful
 * server session (decision D31); the browser holds only the session cookie.
 */
export interface SessionUser {
  username: string;
  role: Role;
  displayName: string | null;
}

interface RawSessionUser {
  username: string;
  role: string;
  displayName: string | null;
}

function toSessionUser(raw: RawSessionUser): SessionUser {
  if (!isRole(raw.role)) {
    throw new Error(`Backend returned an unrecognised role: ${String(raw.role)}`);
  }
  return { username: raw.username, role: raw.role, displayName: raw.displayName ?? null };
}

/** Exchanges credentials for a session cookie; resolves with the signed-in user. */
export async function login(username: string, password: string): Promise<SessionUser> {
  const raw = await apiClient.post<RawSessionUser>('/auth/login', { username, password });
  return toSessionUser(raw);
}

/**
 * Creates a citizen account (decision D32), signs in, and resolves with the new
 * user. The backend always assigns the `CITIZEN` role; the username is the email.
 * Rejects with `ApiError` 409 when the email is already registered, 400 on
 * validation failure.
 */
export async function register(
  displayName: string,
  email: string,
  password: string,
): Promise<SessionUser> {
  const raw = await apiClient.post<RawSessionUser>('/auth/register', {
    displayName,
    email,
    password,
    passwordConfirm: password,
  });
  return toSessionUser(raw);
}

/**
 * Resolves with the current user, or `null` when there is no valid session
 * (HTTP 401). Any other failure rejects.
 */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<SessionUser | null> {
  try {
    const raw = await apiClient.get<RawSessionUser>('/auth/me', { signal });
    return toSessionUser(raw);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/** Ends the server session. */
export async function logout(): Promise<void> {
  await apiClient.post<void>('/auth/logout');
}
