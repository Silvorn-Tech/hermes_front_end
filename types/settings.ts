/**
 * GET/PUT/DELETE /settings/binance-credentials, GET/PUT /settings/risk-limits,
 * GET/PUT /settings/trading-switch — each user's own connected Binance
 * account, risk limits, and personal trading switch (hermes_v2's
 * multi-tenant trading phase; see hermes_v2's
 * docs/architecture/multi-tenant-trading.md).
 *
 * The frontend never sees a Binance credential beyond `apiKeyLast4` (a
 * credit-card-style masked hint) — the plaintext key/secret are sent once,
 * on connect, over HTTPS, and never returned by any read.
 */

export interface BinanceCredentialStatus {
  configured: boolean;
  apiKeyLast4: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
}

/** Response to PUT /settings/binance-credentials. A `connected: false`
 * result is a normal, expected outcome (verification failed, or the key
 * has withdrawals enabled) — not a thrown error, the same
 * `dataStatuses`-on-409 convention `BotPortfolio`/`BotPerformance` already
 * use for their own "expected non-2xx" shape. */
export type ConnectBinanceCredentialsResult =
  | { connected: true; apiKeyLast4: string; verifiedAt: string | null }
  | { connected: false; reason: string };

/** Mirrors hermes_v2's RiskLimits exactly: six fields, each `null` meaning
 * "not configured" — fail-closed on that dimension, the same semantics an
 * unset env var has for the platform-wide limits. `allowedSymbols` empty
 * or `null` means "no symbol restriction," not "no symbols allowed." */
export interface UserRiskLimits {
  maxOrderNotionalQuote: number | null;
  maxSymbolExposurePct: number | null;
  maxTotalExposurePct: number | null;
  maxDailyLossPct: number | null;
  maxOpenPositions: number | null;
  allowedSymbols: string[] | null;
}

export interface TradingSwitchState {
  enabled: boolean;
}
