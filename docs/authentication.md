# Hermes authentication

Google Sign-In gates the whole app. Authentication (Google confirms who you
are) and authorization (Hermes' backend confirms you're allowed to use it)
are tracked as two separate facts throughout this implementation — see
`types/auth.ts`'s `AuthStatus`.

```
Login (public)
   │
   ├─ Sign in with Google  →  Google returns an ID token
   │                                   │
   │                                   ▼
   │                     POST /auth/google { idToken }
   │                                   │
   │                     ┌─────────────┴─────────────┐
   │                 authorized: true          authorized: false
   │                     │                             │
   │                     ▼                             ▼
   │                 Dashboard                 stay on Login,
   │              (session stored)          show "not authorized"
   └───────────────────────────────────────────────────┘
```

## Architecture

| File | Responsibility |
|---|---|
| `types/auth.ts` | `AuthStatus`, `AuthUser`, `HermesSession` |
| `services/auth.ts` | `HermesAuthClient` contract + the real `fetch`-based implementation |
| `services/secureStorage.ts` | Cross-platform session persistence |
| `hooks/useGoogleAuthRequest.ts` | Wraps `expo-auth-session`'s Google provider |
| `hooks/AuthContext.tsx` | The state machine — `useAuth()` is the only thing the rest of the app touches |
| `app/login.tsx` | The only screen that knows about Google/OAuth UI |
| `app/_layout.tsx` | `Stack.Protected` — routes to `login` or `(app)` based on `isAuthorized` |

Nothing outside these files contains auth logic. `Dashboard`/`Bots`/`Trading`/`Risk`/`Signals` are unaware auth exists; they're simply unreachable until `useAuth().isAuthorized` is true.

## Why `expo-auth-session` instead of `@react-native-google-signin/google-signin`

Expo's own docs now point most apps at `@react-native-google-signin/google-signin` (or the newer `react-native-nitro-google-signin`) for the polished native account picker. Both require a custom dev client / prebuild and have **no web implementation** — you'd need a second, separate Google integration for the web build.

Hermes needs one codebase across Web, iOS and Android, and needs to keep running in Expo Go (no custom native code, no prebuild). `expo-auth-session`'s Google provider (`expo-auth-session/providers/google`) is the only option that satisfies both: pure JS, works in Expo Go, and its `useIdTokenAuthRequest` hook automatically picks the correct OAuth grant per platform —

- **Web**: implicit `id_token` request (no code exchange, nothing to store server-side just to log in).
- **iOS / Android**: Authorization Code + PKCE, auto-exchanged for an `id_token` — Google's installed-app client type doesn't support the implicit grant, and PKCE means this happens **without a client secret**.

If Hermes later moves to a custom dev client and wants the native account-picker UX, `@react-native-google-signin/google-signin` is the natural upgrade — swap `hooks/useGoogleAuthRequest.ts` only, everything downstream (`AuthContext`, the backend contract, every screen) is unaffected.

No client secret, API key, or service-account credential exists anywhere in this repo. Only public OAuth **client IDs** are configured, via env vars.

## Configuring Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create (or reuse) a project and configure the **OAuth consent screen** (internal or external, per your Google Workspace setup).
2. Create three **OAuth client IDs** under "Credentials":
   - **Web application** — add Authorized JavaScript origins for every URL the web build runs on: `http://localhost:8081` (Expo dev server default), `http://localhost:8090` (if you run on an alternate port), and your deployed domain. Add the same URLs as Authorized redirect URIs.
   - **iOS** — bundle identifier must match `app.json`'s `expo.ios.bundleIdentifier` (not set yet — set it before building for iOS).
   - **Android** — package name must match `app.json`'s `expo.android.package` (not set yet — set it before building for Android), plus the SHA-1 of your signing certificate.
3. Native redirect URIs use the `hermes://` scheme already configured in `app.json`. To see the exact URI `expo-auth-session` computes for your environment, run the app and check the console log, or read the "redirect_uri_mismatch" value Google's own error page shows on a failed attempt — register that exact value.
4. Fill in the three client IDs as env vars (see below). Only the platforms you're actually testing need a value — `useGoogleAuthRequest` reports a clear (non-technical to the user, logged for you) error if the current platform's client ID is missing.

## Environment variables (frontend)

Add to your local `.env` (never commit it — `.env.example` documents the shape):

```
EXPO_PUBLIC_API_URL=http://localhost:8000

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

These are all **public** identifiers — safe to ship in a client bundle, which is why Google issues them as such. Nothing secret is ever read from the environment on the frontend.

## What the backend needs to implement

The Hermes backend does not have an authentication endpoint yet (confirmed by inspecting this repo — `services/api.ts` had no auth methods before this change). The contract below is this frontend's proposal, isolated entirely behind `services/auth.ts`'s `HermesAuthClient` interface — if the real backend ends up shaped differently, only that one file needs to change.

### `POST /auth/google` (required)

Request:
```json
{ "idToken": "<Google-issued OpenID Connect ID token>" }
```

The backend must verify the token's signature, audience (matches one of your OAuth client IDs) and issuer against Google's public keys — the frontend only forwards what Google issued, it never asserts identity on its own.

Response, authorized:
```json
{
  "authorized": true,
  "accessToken": "<Hermes session token>",
  "user": { "id": "...", "email": "...", "name": "...", "avatarUrl": "..." }
}
```

Response, authenticated but not authorized:
```json
{ "authorized": false, "reason": "not_invited" }
```
`reason` is optional and machine-readable — the frontend never shows it raw, it always shows the fixed copy "Tu cuenta de Google fue autenticada, pero no está autorizada para acceder a Hermes."

### `GET /auth/session` (optional, recommended)

Called with `Authorization: Bearer <accessToken>` on app boot to revalidate a persisted session (expiry, revocation, access changes since last login). **Not implemented yet** — until it exists, the app trusts a persisted session optimistically after its first successful login. This is the one gap worth closing before production: right now a revoked user stays "logged in" on a device until they explicitly sign out or the token expires client-side (it doesn't).

### `POST /auth/signout` (optional)

Best-effort server-side revocation. Local sign-out (clearing the stored session) always happens regardless of whether this call succeeds.

## Session storage

`services/secureStorage.ts` uses `expo-secure-store` (OS keychain/Keystore) on iOS/Android, and `localStorage` on web — browsers have no equivalent to OS-level secure storage for a page to use. This matches Expo Router's own authentication guide. The stronger long-term option for web is having the backend set the session as an **httpOnly cookie** instead of returning a bearer token the frontend stores at all; worth considering if/when the backend is built.

## Running locally

1. Copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_API_URL` plus whichever Google client ID(s) you're testing.
2. `npx expo start --web` (or `--ios` / `--android`).
3. Without a running Hermes backend at `EXPO_PUBLIC_API_URL`, Google sign-in will succeed but the `POST /auth/google` call will fail — you'll land on the "no pudimos verificar tu acceso" state. **This is correct, expected behavior**, not a bug: there is intentionally no fake/mock login path in this app.

## Platform notes

- **Web**: works today in any browser once the Web client ID + origins are configured.
- **iOS / Android via Expo Go**: works once the corresponding client ID is set — Expo Go can run the PKCE flow without a custom build.
- **iOS / Android standalone/dev-client builds**: additionally need `expo.ios.bundleIdentifier` / `expo.android.package` set in `app.json` (not yet set — decide these before your first native build) so the native redirect resolves correctly, and that same identifier registered in the corresponding Google OAuth client.

## Testing this flow without real credentials

Cases that don't require a live Google/backend round trip can be verified by code review + the app's compiled output (this is what was done during implementation — see the PR description for exactly what was and wasn't exercised live). Cases 3, 4, 8 and 9 (real Google + real backend responses) require actual credentials and a running backend, and should be manually verified once both exist.

## Known gaps before production

- Backend `/auth/google`, and ideally `/auth/session` and `/auth/signout`, need to be built.
- `app.json` needs `ios.bundleIdentifier` / `android.package` set before native OAuth clients can be finalized.
- No token refresh: `accessToken` is treated as long-lived. If the backend issues short-lived tokens, add a refresh step to `services/auth.ts` and `AuthContext`'s bootstrap/periodic check.
- Consider httpOnly-cookie session storage for web instead of `localStorage`, once the backend exists to set it.
