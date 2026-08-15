/**
 * Authentication vs. authorization are tracked as two separate facts:
 * Google can successfully authenticate a person while Hermes' backend still
 * refuses to authorize them. `AuthStatus` distinguishes every state on that
 * path so the UI can react precisely instead of collapsing everything into
 * "logged in" / "logged out".
 */
export type AuthStatus =
  /** Reading a persisted session on app boot. Nothing renders until this resolves. */
  | 'initializing'
  /** No session. Idle at the login screen. */
  | 'signed_out'
  /** The Google OAuth prompt is open. */
  | 'google_in_progress'
  /** Google succeeded; waiting on the Hermes backend to authorize the identity. */
  | 'authorizing'
  /** Backend confirmed the identity is authorized. A session is active. */
  | 'authorized'
  /** Backend confirmed the identity is NOT authorized to use Hermes. */
  | 'unauthorized'
  /** The Google sign-in step itself failed or was cancelled. */
  | 'google_error'
  /** The Hermes backend could not be reached or returned an unexpected response. */
  | 'backend_error';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/** The active Hermes session once a user is authorized. */
export interface HermesSession {
  accessToken: string;
  user: AuthUser;
}
