import { BotId, RiskLevel } from './common';

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
  exposureByBot: Record<BotId, number>;
  drawdownCurrentPct: number;
  drawdownMaxPct: number;
  dailyLimits: RiskLimitItem[];
  riskByBot: Record<BotId, RiskLevel>;
  concentration: ConcentrationItem[];
  history: RiskHistoryPoint[];
  circuitBreaker: CircuitBreakerState;
  pendingAction?: PendingRiskAction;
}

export type { RiskLevel };
