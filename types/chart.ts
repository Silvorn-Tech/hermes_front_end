import { ExecutionMode } from './bot';

/**
 * GET /klines — one OHLCV candlestick, Binance's public price history
 * passed through Hermes unchanged in shape (just camelCased). Used only
 * to draw the price chart on a bot's detail screen; never persisted or
 * combined with anything account-specific.
 */
export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface KlineData {
  symbol: string;
  interval: string;
  candles: Candle[];
}

/**
 * GET /bots/{id}/trades — one FILLED order (SIMULATION or LIVE alike),
 * curated down to just what the chart plots as an entry/exit marker.
 * `available: false` only ever means the bot itself couldn't be found.
 */
export interface BotTrade {
  side: 'BUY' | 'SELL';
  fillPrice: number;
  executedQuantity: number;
  terminalAt: string;
}

export type BotTrades =
  | { available: true; executionMode: ExecutionMode; trades: BotTrade[] }
  | { available: false; reason: string };
