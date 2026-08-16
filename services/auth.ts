import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { AuthUser } from '../types/auth';

/**
 * Hermes v2 authenticates through a server-side Google OAuth flow. The frontend
 * never negotiates Google tokens or stores Hermes bearer/session tokens locally.
 * The backend owns the redirect flow and sets the `hermes_session` cookie.
 */
export type LoginFlowResult =
  | { type: 'pending' }
  | { type: 'success' }
  | { type: 'cancelled' }
  | { type: 'denied' }
  | { type: 'error'; message: string };

export interface HermesAuthClient {
  beginGoogleLogin(): Promise<LoginFlowResult>;
  getCurrentUser(): Promise<AuthUser | null>;
  logout(): Promise<void>;
}

class HermesApiAuthClient implements HermesAuthClient {
  private get baseUrl(): string {
    const url = process.env.EXPO_PUBLIC_API_URL;
    if (!url) {
      throw new Error('EXPO_PUBLIC_API_URL is not set. See .env.example.');
    }
    return url.replace(/\/+$/, '');
  }

  private get returnToUrl(): string {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/login`;
      }
      return 'http://localhost:8081/login';
    }

    return 'hermes://login';
  }

  private toAuthUser(payload: any): AuthUser {
    const user = payload ?? {};
    return {
      id: String(user.id ?? user.email ?? 'unknown'),
      email: String(user.email ?? ''),
      name: String(user.display_name ?? user.name ?? user.email ?? 'Hermes user'),
      avatarUrl: user.avatar_url ?? user.avatarUrl,
    };
  }

  async beginGoogleLogin(): Promise<LoginFlowResult> {
    const returnTo = this.returnToUrl;
    const loginUrl = `${this.baseUrl}/auth/google/login?return_to=${encodeURIComponent(returnTo)}`;

    if (Platform.OS === 'web') {
      window.location.assign(loginUrl);
      return { type: 'pending' };
    }

    const result = await WebBrowser.openAuthSessionAsync(loginUrl, returnTo, {
      showInRecents: true,
    });

    if (result.type === 'cancel') {
      return { type: 'cancelled' };
    }

    if (result.type !== 'success') {
      return { type: 'error', message: 'La redirección de autenticación falló.' };
    }

    const destination = new URL(result.url || 'https://localhost');
    const authStatus = destination.searchParams.get('auth');

    if (authStatus === 'success') {
      return { type: 'success' };
    }
    if (authStatus === 'denied') {
      return { type: 'denied' };
    }
    if (authStatus === 'cancelled') {
      return { type: 'cancelled' };
    }

    return { type: 'error', message: 'La autenticación con Google no pudo completarse.' };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Hermes backend returned ${response.status} for /auth/me`);
    }

    const payload = await response.json();
    return this.toAuthUser(payload.user);
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort: the cookie is always cleared client-side in the app state.
    }
  }
}

export const authClient: HermesAuthClient = new HermesApiAuthClient();
