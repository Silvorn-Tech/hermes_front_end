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

export interface Portfolio {
  balance: number;
  dailyPnl: number;
  dailyPnlPct: number;
  equityCurves: Record<EquityPeriod, EquityCurve>;
}
