import { BotId } from './common';

/**
 * Matches the lifecycle vocabulary Hermes's eventual Bot API is expected to
 * use (uppercase, mirroring the real `OrderStatus` contract convention).
 * `STOPPED` has no further local transitions — a bot that's been stopped
 * can't be paused/resumed again without backend intervention. `ERROR` is
 * system-set, never something the UI transitions a bot into directly.
 */
export type BotLifecycleStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';

export type BotProfile = 'Conservative' | 'Balanced' | 'Aggressive';

/** No backend Bot API exists yet — these are the categories the eventual
 * contract needs to support, not values a live venue/model list returns. */
export type AssetClass = 'CRYPTO' | 'EQUITY' | 'TOKENIZED_EQUITY';
export type ExecutionVenue = 'BINANCE';
export type StrategyModel = 'SIGNAL_BASED' | 'REGIME_BASED' | 'GARCH' | 'MONTE_CARLO';

export interface BotExposure {
  pct: number;
  limitPct?: number;
}

export interface Bot {
  id: BotId;
  name: string;
  profile: BotProfile;
  status: BotLifecycleStatus;
  assetClass: AssetClass;
  executionVenue: ExecutionVenue;
  strategyModel: StrategyModel;
  returnPct: number;
  exposure: BotExposure;
  lastSignalSummary: string;
  lastSignalAt: string;
  strategyDescription: string;
}
