import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthStatus, AuthUser, HermesSession } from '../types/auth';
import { authClient } from '../services/auth';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  session: HermesSession | null;
  /** True only while the backend session is being checked on boot. */
  isLoading: boolean;
  /** The app has a valid current-user result from the backend. */
  isAuthenticated: boolean;
  /** Backend confirmed the identity may use Hermes. The only state that unlocks the app. */
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

function readAuthStatusFromUrl(): 'success' | 'cancelled' | 'denied' | 'error' | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const authStatus = params.get('auth');
  if (!authStatus) {
    return null;
  }

  const cleanedUrl = new URL(window.location.href);
  cleanedUrl.searchParams.delete('auth');
  window.history.replaceState({}, '', cleanedUrl.toString());

  if (authStatus === 'success') return 'success';
  if (authStatus === 'cancelled') return 'cancelled';
  if (authStatus === 'denied') return 'denied';
  return 'error';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [session, setSession] = useState<HermesSession | null>(null);

  const syncWithBackend = useCallback(async () => {
    try {
      const user = await authClient.getCurrentUser();
      if (!user) {
        setSession(null);
        setStatus('signed_out');
        return;
      }

      setSession({ user });
      setStatus('authorized');
    } catch (error) {
      console.warn('[auth] /auth/me failed:', error);
      setSession(null);
      setStatus('backend_error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const authStatusFromUrl = readAuthStatusFromUrl();

      if (authStatusFromUrl === 'cancelled') {
        if (!cancelled) setStatus('signed_out');
        return;
      }

      if (authStatusFromUrl === 'denied') {
        if (!cancelled) setStatus('unauthorized');
        return;
      }

      if (authStatusFromUrl === 'error') {
        if (!cancelled) setStatus('google_error');
        return;
      }

      if (authStatusFromUrl === 'success') {
        if (!cancelled) setStatus('authorizing');
        await syncWithBackend();
        return;
      }

      await syncWithBackend();
    })();

    return () => {
      cancelled = true;
    };
  }, [syncWithBackend]);

  const signInWithGoogle = useCallback(async () => {
    setStatus('google_in_progress');

    const outcome = await authClient.beginGoogleLogin();

    if (outcome.type === 'pending') {
      return;
    }

    if (outcome.type === 'cancelled') {
      setStatus('signed_out');
      return;
    }

    if (outcome.type === 'denied') {
      setStatus('unauthorized');
      return;
    }

    if (outcome.type === 'error') {
      console.warn('[auth] Google login failed:', outcome.message);
      setStatus('google_error');
      return;
    }

    setStatus('authorizing');
    await syncWithBackend();
  }, [syncWithBackend]);

  const signOut = useCallback(async () => {
    setSession(null);
    setStatus('signed_out');

    try {
      await authClient.logout();
    } catch (error) {
      console.warn('[auth] backend logout failed:', error);
    }
  }, []);

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
      isGoogleReady: true,
      signInWithGoogle,
      signOut,
    };
  }, [status, session, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
