# hooks/

- `AuthContext.tsx` — auth state machine wrapping `services/auth.ts`'s
  cookie-session flow (Google login → session → `/auth/me` → logout).
  `useAuth()`.
- `HermesDataContext.tsx` — the main data provider: real
  portfolio/positions/orders from the backend, plus mock bots/signals/
  activity/risk until those domains exist server-side. `useHermesData()`.
- `useResponsive.ts` — desktop/tablet/mobile breakpoint helper.
- `useAppFonts.ts` — loads the Inter font weights.

All re-exported from `hooks/index.ts`.
