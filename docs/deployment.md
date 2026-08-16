# Frontend deployment to ROMEO

This mirrors `hermes_v2`'s exact deployment mechanism: a pull-based GitOps
flow. GitHub Actions never connects to ROMEO — it only publishes a Docker
image. ROMEO polls for that image on its own.

## How it works end to end

```
feature branch → Pull Request (ci.yml + docker-ci.yml run: typecheck,
                  expo install --check, docker build validation)
       │
       ▼
     merge to main
       │
       ▼
docker.yml (GitHub Actions):
  qa job            → npm ci, typecheck, expo install --check
  build-and-publish  → npx expo export --platform web (inside the Docker
                        build), publish ghcr.io/silvorn-tech/hermes_front_end
                        :latest and :sha-<short>
       │
       │        (no SSH — GitHub stops here)
       ▼
ROMEO: hermes-front-end-deploy.timer (systemd, every 5 min, +3 min after
       boot) → hermes-front-end-deploy.service → /opt/hermes-front-end/deploy.sh
  runs as the existing `hermes-deploy` system user (docker group), same as
  hermes_v2's deploy:
    flock (skip if a deploy is already running)
    → docker compose pull
    → compare image digest to the running container's
    → if unchanged: log decision=no-change, exit
    → if changed: run ./can-deploy (pre-deploy hook, currently a no-op
      extension point, identical in spirit to hermes-v2's)
    → docker compose up -d (recreates the container)
    → verify the deployed digest matches, log decision=deployed
       │
       ▼
Tailscale Serve: https://romeo-dev-zone.tailed9c54.ts.net:8443
  (tailnet-only, automatic TLS) → http://127.0.0.1:8081 → container's :8080
```

If any QA step fails, `build-and-publish` never runs (`needs: qa`), so no
image is published and ROMEO's timer has nothing new to deploy.

## Where it lives

| Concern | Location |
|---|---|
| Backend (reference) | `/opt/hermes-v2/{compose.yaml,deploy.sh,can-deploy,.env}` on ROMEO |
| Frontend | `/opt/hermes-front-end/{compose.yaml,deploy.sh,can-deploy}` on ROMEO (installed by [`deploy/romeo-setup.sh`](../deploy/romeo-setup.sh), run once manually) |
| Frontend image | `ghcr.io/silvorn-tech/hermes_front_end:latest` |
| Frontend container | Listens on container port `8080` (nginx), published only to ROMEO's loopback at `127.0.0.1:8081` — not exposed on the LAN, unlike the backend's current `0.0.0.0:8000` |
| Public access | Tailscale Serve, `https://romeo-dev-zone.tailed9c54.ts.net:8443` (tailnet members only — same private network the backend already uses, no separate domain or reverse proxy software) |

## Build

The Docker build (`Dockerfile`) does everything section 4 of the deployment
requirements asks for, in this order:

1. `npm ci` (installs exactly what `package-lock.json` pins)
2. `npx expo export --platform web`, with `EXPO_PUBLIC_API_URL` passed in as
   a build arg — this bakes the backend URL into the static JS bundle at
   build time, since Expo Web has no runtime env var support once exported
3. The exported `dist/` (confirmed to be a single-page app — one
   `index.html`, one hashed JS bundle, static assets — not per-route static
   HTML) is copied into an `nginx:1.27-alpine` stage

`npm run typecheck` and `npx expo install --check` run separately, in CI,
before the Docker build even starts (see `ci.yml` and the `qa` job in
`docker.yml`) — they gate the build rather than running inside it. There are
no lint or test scripts in `package.json` today, so none run; add them to
`ci.yml` if that changes.

## Serving

`nginx:1.27-alpine` serves the static export from `deploy/nginx.conf`:
- `/_expo/static/**` (content-hashed filenames) is cached for a year
- everything else falls back to `index.html` so Expo Router's client-side
  routing handles direct loads of `/login`, `/dashboard`, etc.
- `/healthz` returns a plain `200 ok` for the container `HEALTHCHECK` and
  for external verification

## Authentication in production

No frontend code changes were needed — the existing server-side contract
(`GET /auth/google/login`, `GET /auth/me`, `POST /auth/logout`, the
`hermes_session` cookie) works unchanged once `EXPO_PUBLIC_API_URL` points
at the real backend. What matters for this deployment:

- `EXPO_PUBLIC_API_URL` (production) = `https://romeo-dev-zone.tailed9c54.ts.net`
  — HTTPS, so `credentials: 'include'` cookies work correctly with the
  backend's `HERMES_COOKIE_SECURE=true`.
- **The backend's production `.env` (`/opt/hermes-v2/.env`) is currently
  missing `HERMES_ALLOWED_RETURN_URIS`.** This is independent of the
  frontend deployment, but it means Google login is broken in production
  right now regardless of this work — `/auth/google/login` will reject any
  `return_to` (or fail outright with no value configured). It must be set
  to include the frontend's production URL, e.g.:

  ```
  HERMES_ALLOWED_RETURN_URIS=https://romeo-dev-zone.tailed9c54.ts.net:8443/login
  ```

  then `docker compose -f /opt/hermes-v2/compose.yaml restart hermes-v2` to
  pick it up (env vars are baked in at container start).
- `GOOGLE_REDIRECT_URI` already correctly points at the backend's own
  callback and needs no change — the frontend URL is never registered with
  Google, only with the backend's own open-redirect allowlist above.
- No Google client ID/secret, database URL, or session secret is ever
  present in the frontend build or image — only the public
  `EXPO_PUBLIC_API_URL`.

## Manual deployment

Trigger `Publish Docker image` via `workflow_dispatch` from the Actions tab
(or `gh workflow run docker.yml --repo Silvorn-Tech/hermes_front_end`) to
publish on demand instead of waiting for a push to `main`.

## Verifying production

```
curl -s -o /dev/null -w "%{http_code}\n" https://romeo-dev-zone.tailed9c54.ts.net:8443/healthz
curl -s -o /dev/null -w "%{http_code}\n" https://romeo-dev-zone.tailed9c54.ts.net:8443/login
```

Both should return `200`. Full Google OAuth can't be automated from CI (it
needs a human in the consent screen) — verify it by hand: open
`https://romeo-dev-zone.tailed9c54.ts.net:8443/login` from a device on the
tailnet, sign in with the `HERMES_ADMIN_EMAIL` Google account, and confirm
it lands past the "Acceso no autorizado" screen once
`HERMES_ALLOWED_RETURN_URIS` above is set.

## Rollback

`hermes_v2` has no rollback tooling today beyond re-running its deploy with
an older tag manually — this frontend follows the same minimal approach,
since GHCR already retains every previous `sha-<short>` tag:

```bash
# On ROMEO, as root:
cd /opt/hermes-front-end
docker pull ghcr.io/silvorn-tech/hermes_front_end:sha-<previous-short-sha>
docker tag ghcr.io/silvorn-tech/hermes_front_end:sha-<previous-short-sha> \
           ghcr.io/silvorn-tech/hermes_front_end:latest
docker compose up -d hermes-front-end
```

The next timer tick will re-pull `:latest` from GHCR and overwrite this, so
either fix `main` and publish a real new image promptly, or temporarily stop
the timer (`systemctl stop hermes-front-end-deploy.timer`) while rolled
back.

## One-time ROMEO setup

Run once, after the first image has been published to GHCR (merge this
branch or run the workflow manually first — `deploy.sh`'s first
`docker compose pull` needs something to pull):

```bash
sudo bash deploy/romeo-setup.sh
```

It is idempotent — safe to re-run after editing it.
