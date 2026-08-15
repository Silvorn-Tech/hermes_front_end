import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthStatus, AuthUser, HermesSession } from '../types/auth';
import { authClient, NotImplementedOnBackend } from '../services/auth';
import { sessionStorage } from '../services/secureStorage';
import { useGoogleAuthRequest } from './useGoogleAuthRequest';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  session: HermesSession | null;
  /** True only while the persisted session is being read on boot — gates the whole app's first render. */
  isLoading: boolean;
  /** Google confirmed this identity (may still be pending/rejected by the Hermes backend). */
  isAuthenticated: boolean;
  /** Backend confirmed this identity may use Hermes. The only state that unlocks the app. */
  isAuthorized: boolean;
  /** User-facing copy for the current state, if any — never a raw technical error. */
  errorMessage: string | null;
  isGoogleReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ERROR_COPY: Partial<Record<AuthStatus, string>> = {
  google_error: 'No pudimos completar el inicio de sesión con Google. Intenta nuevamente.',
  unauthorized: 'Tu cuenta de Google fue autenticada, pero no está autorizada para acceder a Hermes.',
  backend_error: 'No pudimos verificar tu acceso a Hermes. Intenta nuevamente.',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [session, setSession] = useState<HermesSession | null>(null);
  const { signIn: requestGoogleSignIn, isReady: isGoogleReady } = useGoogleAuthRequest();

  // Bootstrap: resolve any persisted session before the app decides what to render.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await sessionStorage.read();
      if (cancelled) return;

      if (!stored) {
        setStatus('signed_out');
        return;
      }

      let parsed: HermesSession;
      try {
        parsed = JSON.parse(stored);
      } catch {
        await sessionStorage.clear();
        if (!cancelled) setStatus('signed_out');
        return;
      }

      // Best-effort revalidation. Falls back to trusting the cached session
      // if the backend doesn't implement GET /auth/session yet.
      try {
        const validation = await authClient.validateSession?.(parsed.accessToken);
        if (validation && !validation.valid) {
          await sessionStorage.clear();
          if (!cancelled) setStatus('signed_out');
          return;
        }
      } catch (err) {
        if (!(err instanceof NotImplementedOnBackend)) {
          console.warn('[auth] session validation failed, trusting cached session:', err);
        }
      }

      if (cancelled) return;
      setSession(parsed);
      setStatus('authorized');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setStatus('google_in_progress');
    const outcome = await requestGoogleSignIn();

    if (outcome.type === 'cancelled') {
      setStatus('signed_out');
      return;
    }
    if (outcome.type === 'error') {
      console.warn('[auth] Google sign-in failed:', outcome.message);
      setStatus('google_error');
      return;
    }

    setStatus('authorizing');
    try {
      const response = await authClient.authorizeWithGoogle({ idToken: outcome.result.idToken });

      if (!response.authorized || !response.accessToken || !response.user) {
        if (response.reason) console.warn('[auth] identity not authorized:', response.reason);
        setStatus('unauthorized');
        return;
      }

      const newSession: HermesSession = { accessToken: response.accessToken, user: response.user };
      await sessionStorage.write(JSON.stringify(newSession));
      setSession(newSession);
      setStatus('authorized');
    } catch (err) {
      console.warn('[auth] backend authorization request failed:', err);
      setStatus('backend_error');
    }
  }, [requestGoogleSignIn]);

  const signOut = useCallback(async () => {
    const token = session?.accessToken;
    setSession(null);
    setStatus('signed_out');
    await sessionStorage.clear();
    if (token) {
      // Best-effort server-side revocation — local sign-out already happened above regardless of the outcome.
      authClient.signOut?.(token).catch((err) => console.warn('[auth] backend sign-out failed:', err));
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = status === 'authorizing' || status === 'authorized' || status === 'unauthorized';
    return {
      status,
      user: session?.user ?? null,
      session,
      isLoading: status === 'initializing',
      isAuthenticated,
      isAuthorized: status === 'authorized',
      errorMessage: ERROR_COPY[status] ?? null,
      isGoogleReady,
      signInWithGoogle,
      signOut,
    };
  }, [status, session, isGoogleReady, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
