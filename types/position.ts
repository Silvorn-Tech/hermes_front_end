import { BotId, RiskLevel } from './common';

export type Direction = 'long' | 'short';

/**
 * A held balance as reported by Hermes's GET /positions. Binance Spot has no
 * position endpoint — Hermes derives this from the current balance plus a
 * weighted-average cost basis computed from trade history (see
 * hermes_v2's docs/architecture/trading.md). Position identity is the
 * symbol itself; `id` is set to `symbol` for real data.
 *
 * Every price/P&L field is nullable: Hermes returns `null` rather than a
 * fabricated number when it can't price the asset or has no trade history
 * for it — the UI must render an "unavailable" state, never a mock number,
 * when these are null. `botId`, `stopLoss`, `takeProfit`, `relatedSignalId`,
 * `riskLevel`, and `openedAt` have no backend equivalent (no bot
 * attribution, no stop/take-profit orders, no risk classification, no
 * position-open timestamp exist in the real data) and are optional —
 * present only for bot-strategy or mock-sourced positions if those are
 * ever reintroduced, never invented for real ones.
 */
export interface Position {
  id: string;
  symbol: string;
  direction: Direction;
  botId?: BotId;
  size: number;
  entryPrice: number | null;
  currentPrice: number | null;
  /** Current market value of this holding in the quote asset — Hermes's own
   * `value_quote`, not recomputed client-side, so it can't drift from what
   * the backend actually used for exposure/risk math. */
  valueQuote: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  openedAt?: string;
  stopLoss?: number;
  takeProfit?: number;
  relatedSignalId?: string;
  riskLevel?: RiskLevel;
}
