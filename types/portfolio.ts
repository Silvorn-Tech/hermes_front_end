export type EquityPeriod = '7D' | '1M' | '3M' | '1Y';

export interface EquityPoint {
  t: string;
  v: number;
}

/**
 * GET /portfolio/history. `returnPct`/`maxDrawdownPct` are null when the
 * backend can't compute them (fewer than 2 snapshots) — never defaulted to
 * 0, since that would misrepresent "no data" as "no change." There is no
 * `winRatePct`: Hermes has no win/loss-classified trade ledger behind it,
 * and fabricating one isn't done here.
 */
export interface EquityCurve {
  points: EquityPoint[];
  returnPct: number | null;
  maxDrawdownPct: number | null;
}

/** One asset balance as reported by Hermes's GET /portfolio or GET /balances.
 * `valueQuote` is null when Hermes couldn't price the asset (no direct
 * market pair) — `priced` says explicitly whether it counted toward
 * `Portfolio.totalValueQuote`, so the UI never has to guess. */
export interface Balance {
  asset: string;
  free: number;
  locked: number;
  valueQuote: number | null;
  priced: boolean;
}

/**
 * GET /portfolio. `totalValueQuote`, `quoteAsset`, `asOf`, and `balances`
 * are real. `dailyPnl`/`dailyPnlPct` stay nullable rather than removed:
 * Hermes doesn't compute a daily P&L figure (see hermes_v2's
 * PortfolioService docstring — deliberately not fabricated), so these stay
 * `null` until that exists, and the UI renders an "unavailable" state for
 * them instead of a mock number. Historical equity now lives behind its
 * own endpoint (`apiClient.getPortfolioHistory`), not embedded here.
 */
export interface Portfolio {
  totalValueQuote: number;
  quoteAsset: string;
  asOf: string;
  balances: Balance[];
  dailyPnl: number | null;
  dailyPnlPct: number | null;
}
