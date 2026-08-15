import { BotId, RiskLevel } from './common';

export type Direction = 'long' | 'short';

export interface Position {
  id: string;
  symbol: string;
  direction: Direction;
  botId: BotId;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  openedAt: string;
  stopLoss?: number;
  takeProfit?: number;
  relatedSignalId?: string;
  riskLevel: RiskLevel;
}
