import { RiskLevel } from './common';
import { RiskProfile } from './bot';

export interface RiskLimitItem {
  label: string;
  currentPct: number;
  limitPct: number;
}

export interface ConcentrationItem {
  symbol: string;
  pct: number;
}

export interface RiskHistoryPoint {
  date: string;
  level: RiskLevel;
}

export interface PendingRiskAction {
  label: string;
  description: string;
}

/** Maps to the backend's global kill switch (`TRADING_ENABLED`) once it's
 * exposed for reading — mock/preview data until then, never inferred from
 * anything else. */
export interface CircuitBreakerState {
  active: boolean;
  reason: string | null;
}

export interface RiskSnapshot {
  level: RiskLevel;
  headline: string;
  description: string;
  exposureTotalPct: number;
  /** Keyed by risk profile, not by a specific bot's id — real bots are
   * arbitrary entities now, so this preview illustrates "roughly how much
   * exposure a bot with this profile tends to carry," applied to every
   * real bot sharing that profile. Still entirely mock/preview data. */
  exposureByRiskProfile: Record<RiskProfile, number>;
  drawdownCurrentPct: number;
  drawdownMaxPct: number;
  dailyLimits: RiskLimitItem[];
  riskByRiskProfile: Record<RiskProfile, RiskLevel>;
  concentration: ConcentrationItem[];
  history: RiskHistoryPoint[];
  circuitBreaker: CircuitBreakerState;
  pendingAction?: PendingRiskAction;
}

export type { RiskLevel };
