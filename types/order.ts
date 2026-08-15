import { BotId } from './common';

export type OrderType = 'market' | 'limit' | 'stop';
export type OrderStatus = 'filled' | 'pending' | 'cancelled' | 'rejected';

export interface Order {
  id: string;
  symbol: string;
  type: OrderType;
  status: OrderStatus;
  botId: BotId;
  size: number;
  price: number;
  timestamp: string;
}
