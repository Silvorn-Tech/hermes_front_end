import { BotId } from './common';

export type ActivityCategory = 'trade' | 'risk' | 'system' | 'rebalance';

/** A raw fact — what actually happened. Signals are the interpretation built on top of these. */
export interface ActivityEvent {
  id: string;
  botId?: BotId;
  category: ActivityCategory;
  description: string;
  timestamp: string;
}
