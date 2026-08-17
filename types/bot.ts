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

/** Matches the backend's `BotExecutionMode` exactly. Every bot created by
 * this app is `SIMULATION` — there is no request field or UI path that can
 * set `LIVE` yet; the backend enforces this independently (`POST /bots`'s
 * schema has no `execution_mode` field at all), so this type exists only
 * to render the distinction, never to select it. */
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
 * GET /bots/{id}/portfolio — a SIMULATION bot's own virtual ledger.
 * Never summed with the real account's `Portfolio` — a different bot,
 * a different (virtual) balance sheet entirely. `available` is `false`
 * (with no other field populated) for a `LIVE` bot: there is no
 * per-bot LIVE portfolio view yet, so the UI must show "not available",
 * never a fabricated value.
 */
export type BotPortfolio =
  | {
      available: true;
      executionMode: ExecutionMode;
      quoteAsset: string;
      initialCapitalQuote: number;
      cashBalanceQuote: number;
      currentQuantity: number;
      positionValueQuote: number;
      totalValueQuote: number;
      exposurePct: number;
      returnPct: number | null;
    }
  | { available: false; reason: string };

/**
 * GET /bots/{id}/performance — return %, drawdown, today's realized P&L,
 * trade count, and win rate for a SIMULATION bot's virtual ledger.
 * `maxDrawdownPct`/`winRatePct` are null (never a fabricated 0) when
 * there isn't yet enough history to compute them — same rule the
 * account-wide `EquityCurve` already follows.
 */
export type BotPerformance =
  | {
      available: true;
      executionMode: ExecutionMode;
      totalValueQuote: number;
      returnPct: number | null;
      maxDrawdownPct: number | null;
      realizedPnlTodayQuote: number;
      tradeCount: number;
      winRatePct: number | null;
      exposurePct: number;
    }
  | { available: false; reason: string };
