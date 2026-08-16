export type EquityPeriod = '7D' | '1M' | '3M' | '1Y';

export interface EquityPoint {
  t: string;
  v: number;
}

export interface EquityCurve {
  period: EquityPeriod;
  points: EquityPoint[];
  returnPct: number;
  winRatePct: number;
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
 * are real. `dailyPnl`/`dailyPnlPct`/`equityCurves` are nullable rather
 * than removed: Hermes has no historical portfolio snapshots yet (see
 * hermes_v2's PortfolioService docstring — deliberately not fabricated),
 * so these stay `null` until that exists, and the UI renders an
 * "unavailable" state for them instead of a mock number.
 */
export interface Portfolio {
  totalValueQuote: number;
  quoteAsset: string;
  asOf: string;
  balances: Balance[];
  dailyPnl: number | null;
  dailyPnlPct: number | null;
  equityCurves: Record<EquityPeriod, EquityCurve> | null;
}
