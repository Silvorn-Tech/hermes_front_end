/**
 * Authentication vs. authorization are tracked as two separate facts.
 * Google confirms identity; Hermes confirms authorization. In the real v2
 * backend contract, the frontend is session-less and relies entirely on the
 * server-set cookie and a GET /auth/me boot check.
 */
export type AuthStatus =
  /** Reading the current backend session on app boot. Nothing renders until this resolves. */
  | 'initializing'
  /** No valid session. Idle at the login screen. */
  | 'signed_out'
  /** The backend OAuth flow is active and the browser is redirecting to Google. */
  | 'google_in_progress'
  /** The login redirect just returned; the app is re-validating the backend session. */
  | 'authorizing'
  /** The backend confirmed the user is authenticated and authorized. */
  | 'authorized'
  /** The user is authenticated with Google but not allowed to use Hermes. */
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

/** The current authenticated Hermes user, as reported by the backend cookie-based session. */
export interface HermesSession {
  user: AuthUser;
}
