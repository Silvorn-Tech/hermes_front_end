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
