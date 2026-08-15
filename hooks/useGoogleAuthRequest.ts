import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required once at module scope so the browser-based flow can resolve back
// into the app on web (and in a standalone/dev-client build) after Google
// redirects back with the result.
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  idToken: string;
}

export type GoogleAuthOutcome =
  | { type: 'success'; result: GoogleAuthResult }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

/**
 * Wraps expo-auth-session's Google provider (`useIdTokenAuthRequest`) —
 * Expo's purpose-built hook for getting a Google-signed ID token rather than
 * API access. This is the standard "Sign in with Google" identity flow (as
 * opposed to the Authorization Code flow apps use when they need ongoing
 * access to Google APIs), and it picks the correct grant per platform on its
 * own: an implicit id_token request on web, and an Authorization Code +
 * PKCE exchange on iOS/Android (Google's installed-app client type doesn't
 * support the implicit grant) — both without a client secret, so nothing
 * sensitive ever lives in this app. See docs/authentication.md for the
 * Google Cloud Console setup this requires.
 */
export function useGoogleAuthRequest() {
  const hasClientId = !!(webClientId || iosClientId || androidClientId);

  // expo-auth-session throws synchronously during render if the resolved
  // clientId for the current platform is `undefined` — which is exactly the
  // state this repo is in until Google Cloud Console credentials are set.
  // Falling back to '' avoids crashing app boot entirely; `signIn()` below
  // still reports the missing configuration clearly before ever prompting.
  const [request, response, promptAsync] = useIdTokenAuthRequest(
    {
      webClientId: webClientId ?? '',
      iosClientId: iosClientId ?? '',
      androidClientId: androidClientId ?? '',
      selectAccount: true, // ensures the account picker always appears, so "try another account" actually works
    },
    { scheme: 'hermes' }
  );

  async function signIn(): Promise<GoogleAuthOutcome> {
    if (!hasClientId) {
      return {
        type: 'error',
        message:
          'Missing Google OAuth client ID for this platform. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / _IOS_CLIENT_ID / _ANDROID_CLIENT_ID — see .env.example.',
      };
    }
    if (!request) {
      return { type: 'error', message: 'Google auth request is not ready yet.' };
    }

    const result = await promptAsync();

    if (result.type === 'dismiss' || result.type === 'cancel') {
      return { type: 'cancelled' };
    }
    if (result.type !== 'success') {
      return { type: 'error', message: `Google auth returned unexpected result type: ${result.type}` };
    }
    const idToken = result.params.id_token;
    if (!idToken) {
      return { type: 'error', message: 'Google did not return an id_token.' };
    }
    return { type: 'success', result: { idToken } };
  }

  return { signIn, isReady: !!request, response };
}
