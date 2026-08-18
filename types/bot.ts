import { BotId } from './common';

/**
 * Matches the backend's real lifecycle exactly (`hermes_v2`'s `BotStatus`).
 * `ACTIVE`/`PAUSED`/`STOPPED`/`ERROR` are the stable states; `PAUSING`/
 * `RESUMING` are transient but persisted — a pause/resume in flight
 * survives a backend restart, so a reload mid-operation must render
 * something sensible for them, not crash on an unrecognized value.
 * `ERROR`'s only exit is `ERROR -> STOPPED` — there is no `Resume`/`Pause`
 * button for an ERRORed bot, only `Stop`.
 */
export type BotLifecycleStatus = 'ACTIVE' | 'PAUSING' | 'PAUSED' | 'RESUMING' | 'STOPPED' | 'ERROR';

/** Hermes has exactly these three risk profiles — never extended ad hoc. */
export type RiskProfile = 'SENTINEL' | 'EQUILIBRIUM' | 'VORTEX';

export type AssetClass = 'CRYPTO' | 'EQUITY';
export type ExecutionVenue = 'BINANCE';

/** Matches the backend's `BotExecutionMode` exactly. Every bot is created
 * `SIMULATION` — `POST /bots`'s schema has no `execution_mode` field at
 * all. `LIVE` is reached only by promoting an already-created, already-
 * paused SIMULATION bot via `POST /bots/{id}/activate-live` — a one-way
 * action with no reversal. */
export type ExecutionMode = 'SIMULATION' | 'LIVE';

/** The backend stores this as a free string (not an enum) — a strategy/
 * model isn't tied to a specific asset class, and the set is meant to
 * grow without a migration. This curated list is only for the Create/Edit
 * form's picker; any string the backend accepts is valid. */
export type StrategyModel = 'SIGNAL_BASED' | 'REGIME_BASED' | 'GARCH' | 'MONTE_CARLO';

/**
 * One bot as reported by Hermes (`GET /bots`, `GET /bots/{id}`, and the
 * `bot` field of a create/update/pause/resume/stop response). `instrument`/
 * `assetClass`/`executionVenue` are immutable after creation. `currentQuantity`
 * is 0 while paused/stopped; `targetQuantity` is what Resume will try to
 * re-acquire. Nothing here is derived from Binance's account-wide balance —
 * it's Hermes's own tracked exposure for this specific bot (see
 * hermes_v2's BotPosition docstring for why that distinction matters).
 */
export interface Bot {
  id: BotId;
  name: string;
  riskProfile: RiskProfile;
  assetClass: AssetClass;
  executionVenue: ExecutionVenue;
  executionMode: ExecutionMode;
  instrument: string;
  strategyModel: string | null;
  strategyConfig: Record<string, unknown> | null;
  status: BotLifecycleStatus;
  currentQuantity: number;
  targetQuantity: number;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /config/simulation — a documented, unauthenticated operator
 * default (not a secret or account data), used to size the Bot Creation
 * Form's budget slider off whatever capital new simulation bots actually
 * start with, instead of hardcoding the number on the frontend.
 */
export interface SimulationConfig {
  initialCapitalQuote: number;
  quoteAsset: string;
}

/**
 * GET /bots/{id}/portfolio — discriminated on `executionMode` as well as
 * `available`, because a LIVE bot's shape is genuinely smaller, not just
 * a SIMULATION shape with fields zeroed out: `initialCapitalQuote`/
 * `cashBalanceQuote`/`exposurePct` describe a per-bot virtual-bankroll
 * concept that has no LIVE equivalent at all — a LIVE bot trades
 * directly against the user's one shared real Binance balance, so there
 * is no ring-fenced capital to compute cash/exposure against. Making
 * that a type error (reading a field that doesn't exist on the LIVE
 * branch) beats nulling those fields forever, which would give `null` a
 * confusing double meaning ("not yet computed" vs. "doesn't exist").
 * `available: false` still means what it always did: this bot's mode has
 * no view at all (not currently reachable, kept for forward
 * compatibility with the backend's own shape).
 */
export type BotPortfolio =
  | {
      available: true;
      executionMode: 'SIMULATION';
      quoteAsset: string;
      initialCapitalQuote: number;
      cashBalanceQuote: number;
      currentQuantity: number;
      positionValueQuote: number;
      totalValueQuote: number;
      exposurePct: number;
      returnPct: number | null;
    }
  | {
      available: true;
      executionMode: 'LIVE';
      quoteAsset: string;
      currentQuantity: number;
      positionValueQuote: number;
      totalValueQuote: number;
      returnPct: null;
    }
  | { available: false; reason: string };

/**
 * GET /bots/{id}/performance — return %, drawdown, today's realized P&L,
 * trade count, and win rate. Same discriminated-union reasoning as
 * `BotPortfolio` above: LIVE has no `exposurePct` (no ring-fenced
 * capital), and `returnPct`/`maxDrawdownPct` are always `null` for LIVE
 * in this phase — no per-bot capital baseline or time-series snapshot
 * table exists yet to compute them against (a real, separate, larger
 * follow-up, not a temporary gap). `winRatePct` is `null` (never a
 * fabricated 0) when there aren't yet any closed round-trips to judge,
 * for both modes.
 */
export type BotPerformance =
  | {
      available: true;
      executionMode: 'SIMULATION';
      totalValueQuote: number;
      returnPct: number | null;
      maxDrawdownPct: number | null;
      realizedPnlTodayQuote: number;
      tradeCount: number;
      winRatePct: number | null;
      exposurePct: number;
    }
  | {
      available: true;
      executionMode: 'LIVE';
      totalValueQuote: number;
      returnPct: null;
      maxDrawdownPct: null;
      realizedPnlTodayQuote: number;
      tradeCount: number;
      winRatePct: number | null;
    }
  | { available: false; reason: string };
