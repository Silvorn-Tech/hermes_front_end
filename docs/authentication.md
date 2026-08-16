# Hermes authentication

The Hermes v2 frontend does not own Google OAuth. The backend is the source of truth for authentication and authorization, and the frontend only initiates the server-side flow and checks the current user.

## Real architecture

The app uses a browser redirect flow that begins at the Hermes backend:

```
Login screen (public)
   │
   ├─ User taps "Continuar con Google"
   │
   ├─ Frontend opens: GET /auth/google/login?return_to=<frontend-url>
   │
   ├─ Backend redirects to Google consent screen
   │
   ├─ Google redirects back to backend callback
   │
   ├─ Backend validates Google identity, resolves Hermes user, sets `hermes_session` cookie
   │
   └─ Backend redirects back to the frontend with ?auth=success|cancelled|denied|error

Frontend then calls:
   GET /auth/me

This request includes the browser cookie automatically and returns the authenticated user.
```

## Contract

### `GET /auth/google/login?return_to=<frontend-url>`

Starts the server-side OAuth flow. The `return_to` value must be an exact URL allowed by the backend configuration.

### `GET /auth/google/callback`

This endpoint is handled entirely by the backend. The browser receives a redirect to the frontend with a status flag in the query string:

- `?auth=success` — backend created the session cookie and the user is authenticated.
- `?auth=cancelled` — the user cancelled consent.
- `?auth=denied` — the Google identity exists but Hermes rejected access.
- `?auth=error` — a backend or Google error occurred.

### `GET /auth/me`

This is the true session bootstrap for the app. The request includes credentials and cookie state automatically. If the cookie is valid, the backend returns:

```json
{
  "authenticated": true,
  "user": {
    "id": "123",
    "email": "user@example.com",
    "display_name": "Jane Doe",
    "roles": ["member"]
  }
}
```

If no valid session exists, the backend responds with `401`.

### `POST /auth/logout`

Revokes the current session and clears the `hermes_session` cookie from the browser.

## Frontend responsibilities

| File | Responsibility |
|---|---|
| `services/auth.ts` | Starts the backend OAuth redirect, calls `/auth/me`, and calls `/auth/logout` |
| `hooks/AuthContext.tsx` | Checks the backend session on boot and gates routing using `isAuthorized` |
| `app/login.tsx` | Starts the backend login flow and shows the current UI state |
| `app/_layout.tsx` | Routes to the protected app or the login screen based on the backend result |
| `types/auth.ts` | Auth state and user model for the app |

Nothing outside these files contains auth logic. Business screens remain unchanged and only become reachable after the backend confirms the user is authorized.

## Important constraints

- The frontend never stores bearer tokens.
- The frontend never stores `hermes_session` in local storage or secure storage.
- The frontend does not implement Google OAuth directly in Expo.
- The backend is always the source of truth for identity, authorization, and session validity.

## Environment variables

The frontend only needs the backend URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

No Google client IDs are required in the frontend bundle because the backend performs the OAuth exchange and owns the secret material.

## Local development

1. Start Hermes v2 with the backend environment configured.
2. Set `EXPO_PUBLIC_API_URL` to the backend origin.
3. Run the Expo app.
4. Tap "Continuar con Google".
5. The browser opens the backend's Google login flow and returns to the app via the configured redirect URL.
6. The frontend immediately re-checks `/auth/me` using the backend-issued cookie.

## Why this matters

This matches the real Hermes v2 contract and avoids storing secrets or tokens on the client. It keeps authentication consistent across web and native builds and ensures that access control is enforced by the backend, not by client-side state.
