# Frontend ↔ Backend Integration Matrix

Built by direct inspection of `hermes_v2` on `feature/binance-trading-integration-v1`
(`src/hermes_v2/api/app.py`, the single `trading_routes.py` router, every
Alembic migration/model, and the full RBAC permission catalog in
`src/hermes_v2/auth/seed.py`) — not from assumptions about what "should"
exist. Re-verify against the backend's current branch before trusting this
if significant time has passed.

## Legend

- **REAL** — frontend calls a real backend endpoint, no mock data involved.
- **PARTIAL** — some sub-capability is real, the rest is backend-pending.
- **BACKEND PENDING** — frontend UI exists (per the "no dead buttons, no
  fake success" principle), but there is no backend endpoint to call. Shown
  as preview/mock data (clearly labeled) or a blocked-action notice.

| Feature | Frontend | Backend | Status | Notes |
|---|---|---|---|---|
| Google login → session cookie | ✅ | ✅ `GET /auth/google/login`, `GET /auth/google/callback` | REAL | Server-side redirect flow, no client-side OAuth. |
| Current user (`/auth/me`) | ✅ | ✅ `GET /auth/me` | REAL | |
| Logout | ✅ | ✅ `POST /auth/logout` | REAL | Not `require_permission`-gated by design (self-service). |
| 401/403/network-failure handling | ✅ | ✅ | REAL | 401 on any real fetch (including mutations, this phase) forces sign-out; 403 surfaces as "no tienes permiso". |
| Dashboard — Portfolio/Balance | ✅ | ✅ `GET /portfolio`, `GET /balances` | REAL | |
| Dashboard — Positions summary | ✅ | ✅ `GET /positions` | REAL | |
| Dashboard — Performance / equity history | ✅ (explicit empty state, no fabricated data) | ❌ | BACKEND PENDING | `Portfolio.dailyPnl/dailyPnlPct/equityCurves` are nullable by design — no portfolio-snapshot table or endpoint exists. |
| Dashboard — fetch error visibility | ✅ | — | REAL | Fixed this phase: was silently swallowed on both desktop and mobile. |
| Trading — Positions (read) | ✅ | ✅ `GET /positions` | REAL | |
| Trading — Orders (read) | ✅ | ✅ `GET /orders`, `GET /orders/{id}` | REAL | Reconciles non-terminal orders against Binance on read. |
| Trading — Market data (read) | ✅ | ✅ `GET /market-data` | REAL | Wired into Create Order this phase — previously implemented with zero callers. |
| Trading — Create order | ✅ | ✅ `POST /orders` | REAL | RBAC (`orders.create`) + CSRF origin check + Idempotency-Key + rate limit. |
| Trading — Cancel order | ✅ | ✅ `POST /orders/{id}/cancel` | REAL | Same guards, `orders.cancel`. |
| Trading — Close position | ✅ | ✅ `POST /positions/{symbol}/close` | REAL | Same guards, `positions.close`. |
| Risk — Exposure (total/by-symbol) | ✅ | ✅ (derived) | REAL | Pure arithmetic over real portfolio+positions, not a RiskEngine reimplementation. |
| Risk — Drawdown, daily limits, risk-by-bot, concentration, history, circuit breaker | ✅ (preview, labeled) | ❌ | BACKEND PENDING | `risk.read`/`risk.manage` permissions are pre-provisioned in the catalog but no route enforces or exposes them; RiskEngine is an internal order-time gate only, not a readable resource. |
| Bots — List/Detail (Asset Class, Execution Venue, Strategy/Model, lifecycle) | ✅ (preview, labeled) | ❌ | BACKEND PENDING | No `Bot` table/route/model anywhere in the backend. |
| Bots — Pause/Resume/Stop | ✅ (local-only, unpersisted, labeled preview) | ❌ | BACKEND PENDING | |
| Bots — Create/Edit | ✅ (form built, submit shows pending notice, never persists) | ❌ | BACKEND PENDING | |
| Bots — Close positions (per bot) | ✅ (confirm dialog → pending notice) | ❌ | BACKEND PENDING | Even conceptually blocked beyond "no Bot API": real `Position` has no bot association today. |
| Signals — List/Detail/Filters | ✅ (preview, labeled) | ❌ | BACKEND PENDING | No `Signal` table/route/model. |
| Signals — Action button navigation | ✅ | — | REAL (as navigation) | Fixed this phase: previously declared but never wired to anything. |
| Activity — List/Filters/Related signal | ✅ (preview, labeled) | ⚠️ partial data exists | BACKEND PENDING | `order_events` and `audit_log` tables exist and could back a real Activity feed, but no `/activity` or `/audit` read endpoint exists yet. |
| Settings — Profile (name/email) | ✅ | ✅ (via `/auth/me`) | REAL | |
| Settings — Session/Logout | ✅ | ✅ | REAL | |
| Settings — Trading state (kill switch) | ✅ (read-only informational, pending) | ❌ | BACKEND PENDING | `TRADING_ENABLED` is env-config only; no read endpoint, and per the spec this must never become an editable frontend control even once one exists, without explicit backend authorization. |
| Settings — Preferences | ✅ (pending notice) | ❌ | BACKEND PENDING | No user-preferences table/route. |
| RBAC enforcement | ✅ (frontend surfaces 403 distinctly) | ✅ | REAL | Only 6 of 22 catalog permissions are wired to a route today (`portfolio.read`, `positions.read`, `positions.close`, `orders.read`, `orders.create`, `orders.cancel`); the rest (`users.*`, `roles.*`, `strategies.*`, `risk.*`, `secrets.*`, `deployments.*`, `audit.read`, `dashboard.read`, `system.status`, `trades.read`, `permissions.read`) are pre-provisioned strings with no enforcing route. |

## What would need to change on the backend to close each BACKEND PENDING row

- **Performance/equity history**: a portfolio-snapshot table + a read
  endpoint (e.g. `GET /portfolio/history?period=`).
- **Risk (beyond exposure)**: a `GET /risk` (or similar) endpoint reading
  from the existing `risk.read` permission, backed by either a computed
  view over orders/positions or a new risk-state table; a way to read the
  `TRADING_ENABLED` kill switch state (currently env-only, not queryable).
- **Bots**: a full `Bot` domain — table, CRUD routes, lifecycle-transition
  routes, and critically a `Position.bot_id` (or equivalent) association so
  "close positions for this bot" is answerable at all.
- **Signals**: a `Signal` domain — table + read routes. Could plausibly be
  derived from the same event stream Activity would use, interpreted
  server-side.
- **Activity**: expose the already-existing `order_events`/`audit_log`
  tables via a read endpoint (`GET /activity` or `GET /audit`) — this is
  the smallest gap of the group, since the data already exists.
- **Settings/Preferences**: a user-preferences table + read/write endpoints.
