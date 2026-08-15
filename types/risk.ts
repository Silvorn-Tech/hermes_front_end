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
  pendingAction?: PendingRiskAction;
}

export type { RiskLevel };
