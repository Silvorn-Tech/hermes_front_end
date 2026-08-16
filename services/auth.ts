import { AuthUser } from '../types/auth';

/**
 * Contract between the Hermes frontend and the Hermes backend for
 * authentication/authorization. The backend does not exist yet (see repo
 * inspection notes in docs/authentication.md), so this is the frontend's
 * proposal for that contract, not a confirmed spec — adjust
 * `HermesApiAuthClient` below if the real backend ends up shaped
 * differently, nothing else in the app needs to change since every caller
 * goes through the `HermesAuthClient` interface.
 *
 * POST {EXPO_PUBLIC_API_URL}/auth/google
 *
 * Request:
 *   { "idToken": "<Google-issued OpenID Connect ID token>" }
 *
 * Response (200):
 *   {
 *     "authorized": true,
 *     "accessToken": "<Hermes session token>",
 *     "user": { "id": "...", "email": "...", "name": "...", "avatarUrl": "..." }
 *   }
 *   or
 *   {
 *     "authorized": false,
 *     "reason": "not_invited"   // optional, machine-readable — never shown raw to the user
 *   }
 *
 * The backend is expected to verify the ID token's signature, audience and
 * issuer against Google's public keys — the frontend never asserts identity
 * on its own, it only forwards what Google issued.
 */

export interface GoogleAuthPayload {
  idToken: string;
}

export interface HermesAuthorizeResponse {
  authorized: boolean;
  accessToken?: string;
  user?: AuthUser;
  reason?: string;
}

export interface HermesAuthClient {
  /** Exchanges a Google ID token for a Hermes session, if the identity is authorized. */
  authorizeWithGoogle(payload: GoogleAuthPayload): Promise<HermesAuthorizeResponse>;
  /**
   * Optional: re-validates a persisted session on app boot (token expiry,
   * revocation, membership changes since last login). If the backend
   * doesn't expose this yet, the client trusts the persisted session
   * optimistically — see AuthContext's bootstrap step.
   */
  validateSession?(accessToken: string): Promise<{ valid: boolean; user?: AuthUser }>;
  /** Optional: tells the backend to revoke the session server-side. Best-effort — sign-out always clears the local session regardless. */
  signOut?(accessToken: string): Promise<void>;
}

class HermesApiAuthClient implements HermesAuthClient {
  private get baseUrl(): string {
    const url = process.env.EXPO_PUBLIC_API_URL;
    if (!url) {
      throw new Error('EXPO_PUBLIC_API_URL is not set. See .env.example.');
    }
    return url.replace(/\/+$/, '');
  }

  async authorizeWithGoogle(payload: GoogleAuthPayload): Promise<HermesAuthorizeResponse> {
    const response = await fetch(`${this.baseUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Hermes backend returned ${response.status} for /auth/google`);
    }

    return response.json();
  }

  async validateSession(accessToken: string): Promise<{ valid: boolean; user?: AuthUser }> {
    const response = await fetch(`${this.baseUrl}/auth/session`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 404) {
      // Backend hasn't implemented session validation yet — caller falls back to trusting the token.
      throw new NotImplementedOnBackend('GET /auth/session');
    }
    if (!response.ok) {
      return { valid: false };
    }
    const data = await response.json();
    return { valid: true, user: data.user };
  }

  async signOut(accessToken: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/signout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // Best-effort: local sign-out already happens regardless of this call's outcome.
    }
  }
}

export class NotImplementedOnBackend extends Error {
  constructor(endpoint: string) {
    super(`${endpoint} is not implemented on the Hermes backend yet.`);
    this.name = 'NotImplementedOnBackend';
  }
}

export const authClient: HermesAuthClient = new HermesApiAuthClient();
