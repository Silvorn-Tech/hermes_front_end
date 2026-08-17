import { BotId } from './common';

/** Matches Hermes's OrderType exactly — the backend has no `stop` order type. */
export type OrderType = 'MARKET' | 'LIMIT';

export type OrderSide = 'BUY' | 'SELL';

/**
 * Matches Hermes's OrderStatus exactly (see hermes_v2's
 * trading/models/order.py) — Binance's real lifecycle plus PENDING/FAILED
 * for the window before Binance has acknowledged the order at all. Never
 * collapsed into a smaller set: PARTIALLY_FILLED and FILLED are different
 * facts, and Hermes never returns a status the UI hasn't seen before.
 */
export type OrderStatus =
  | 'PENDING'
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'PENDING_CANCEL'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FAILED';

/** Statuses Hermes will still accept a cancel request for — mirrors the
 * backend's own `is_cancelable_status()`. */
export const CANCELABLE_ORDER_STATUSES: readonly OrderStatus[] = ['NEW', 'PARTIALLY_FILLED'];

/**
 * One order as reported by Hermes (GET /orders, GET /orders/{id}, and the
 * `order` field of a create/cancel/close response). `botId` is real:
 * non-null only when a Bot's pause/resume placed this order (see
 * hermes_v2's Order.bot_id) — null for every manually-placed order.
 * `price` is absent for MARKET orders. `executedQuantity`/
 * `averageFillPrice` are only meaningful once Binance has reported a
 * fill — null until then, never assumed to equal the requested amount.
 */
export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  botId: BotId | null;
  size: number;
  price?: number | null;
  executedQuantity?: number;
  averageFillPrice?: number | null;
  errorMessage?: string | null;
  binanceOrderId?: string | null;
  timestamp: string;
}
