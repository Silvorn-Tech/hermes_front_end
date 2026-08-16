/**
 * Real Hermes v2 backend client.
 *
 * Every function here calls exactly one of the endpoints Hermes v2
 * actually implements (see hermes_v2's docs/architecture/trading.md and
 * its Bot domain docs) — nothing is assumed or invented. There is no
 * Signals/Activity/Risk-snapshot client here because no such endpoint
 * exists yet; those stay mock-sourced in hooks/HermesDataContext.tsx.
 * Bots are real as of the Bot domain phase.
 *
 * Auth is cookie-based, exactly like services/auth.ts: every request sends
 * `credentials: 'include'` and the `hermes_session` httpOnly cookie does
 * the rest. This file never reads, stores, or sends a bearer token — the
 * backend has none, and introducing one here would diverge from the
 * server-side-session architecture the rest of the app already uses.
 *
 * The frontend never talks to Binance directly, never sees a Binance
 * credential, and never signs a request — every one of these calls goes to
 * `EXPO_PUBLIC_API_URL` (Hermes), which is the only network boundary this
 * file knows about.
 */

import {
  AssetClass,
  Balance,
  Bot,
  ExecutionVenue,
  Order,
  OrderSide,
  OrderType,
  Portfolio,
  Position,
  RiskProfile,
} from '../types';

export class HermesApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly retryAfterSeconds: number | null;

  constructor(status: number, detail: string, retryAfterSeconds: number | null = null) {
    super(detail);
    this.name = 'HermesApiError';
    this.status = status;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function baseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. See .env.example.');
  }
  return url.replace(/\/+$/, '');
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  query?: Record<string, string | undefined>;
  body?: unknown;
  idempotencyKey?: string;
}

/**
 * The one place every fetch call goes through: builds the URL, attaches
 * the session cookie, and on a non-2xx response throws a HermesApiError
 * built only from the backend's own `detail` field — never the raw body,
 * headers, or a stack trace.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new HermesApiError(0, 'No se pudo contactar al backend de Hermes.');
  }

  if (!response.ok) {
    let detail = `Hermes respondió ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload && typeof payload.detail === 'string') {
        detail = payload.detail;
      }
    } catch {
      // Non-JSON error body — keep the generic message, never surface raw text.
    }
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;
    throw new HermesApiError(
      response.status,
      detail,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// --- wire shapes (snake_case, decimal-string fields, exactly what Hermes sends) ---

interface WireBalance {
  asset: string;
  free: string;
  locked: string;
  value_quote: string | null;
  priced: boolean;
}

interface WirePortfolio {
  quote_asset: string;
  total_value_quote: string;
  as_of: string;
  balances: WireBalance[];
}

interface WirePosition {
  symbol: string;
  asset: string;
  quantity: string;
  average_entry_price: string | null;
  current_price: string | null;
  value_quote: string | null;
  unrealized_pnl_quote: string | null;
  unrealized_pnl_pct: string | null;
}

interface WireOrder {
  id: string;
  bot_id: string | null;
  symbol: string;
  side: OrderSide;
  order_type: OrderType;
  status: string;
  requested_quantity: string;
  requested_price: string | null;
  executed_quantity: string;
  average_fill_price: string | null;
  binance_order_id: string | null;
  error_message: string | null;
  created_at: string | null;
  submitted_at: string | null;
  terminal_at: string | null;
}

interface WireBot {
  id: string;
  name: string;
  risk_profile: RiskProfile;
  asset_class: AssetClass;
  execution_venue: ExecutionVenue;
  instrument: string;
  strategy_model: string | null;
  strategy_config: Record<string, unknown> | null;
  status: string;
  current_quantity: string;
  target_quantity: string;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketData {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

interface WireMarketData {
  symbol: string;
  last_price: string;
  price_change_percent: string;
  high_price: string;
  low_price: string;
  volume: string;
}

export interface OrderActionResult {
  order: Order | null;
  status: string;
  reason: string | null;
}

interface WireOrderActionResult {
  order: WireOrder | null;
  status: string;
  reason: string | null;
}

export interface BotActionResult {
  bot: Bot | null;
  status: string;
  reason: string | null;
}

interface WireBotActionResult {
  bot: WireBot | null;
  status: string;
  reason: string | null;
}

export interface CreateBotRequest {
  name: string;
  riskProfile: RiskProfile;
  assetClass: AssetClass;
  executionVenue: ExecutionVenue;
  instrument: string;
  /** Kept as the raw string the user typed — same reasoning as
   * CreateOrderRequest.quantity: never round-tripped through a JS number. */
  targetQuantity: string;
  strategyModel?: string;
  strategyConfig?: Record<string, unknown>;
}

export interface UpdateBotRequest {
  name?: string;
  targetQuantity?: string;
  strategyModel?: string;
  strategyConfig?: Record<string, unknown>;
}

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  /** Kept as the raw string the user typed — never round-tripped through a
   * JS `number`, so the exact decimal the backend validates is exactly
   * what was sent, with no floating-point rounding in between. */
  quantity: string;
  price?: string;
}

// --- decimal-string -> display-number mapping (display only, never sent back) ---

function toNumber(value: string): number {
  return Number(value);
}

function toNullableNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapBalance(wire: WireBalance): Balance {
  return {
    asset: wire.asset,
    free: toNumber(wire.free),
    locked: toNumber(wire.locked),
    valueQuote: toNullableNumber(wire.value_quote),
    priced: wire.priced,
  };
}

function mapPortfolio(wire: WirePortfolio): Portfolio {
  return {
    totalValueQuote: toNumber(wire.total_value_quote),
    quoteAsset: wire.quote_asset,
    asOf: wire.as_of,
    balances: wire.balances.map(mapBalance),
    dailyPnl: null,
    dailyPnlPct: null,
    equityCurves: null,
  };
}

function mapPosition(wire: WirePosition): Position {
  return {
    id: wire.symbol,
    symbol: wire.symbol,
    direction: 'long',
    size: toNumber(wire.quantity),
    entryPrice: toNullableNumber(wire.average_entry_price),
    currentPrice: toNullableNumber(wire.current_price),
    valueQuote: toNullableNumber(wire.value_quote),
    unrealizedPnl: toNullableNumber(wire.unrealized_pnl_quote),
    unrealizedPnlPct: toNullableNumber(wire.unrealized_pnl_pct),
  };
}

function mapOrder(wire: WireOrder): Order {
  return {
    id: wire.id,
    botId: wire.bot_id,
    symbol: wire.symbol,
    side: wire.side,
    type: wire.order_type,
    status: wire.status as Order['status'],
    size: toNumber(wire.requested_quantity),
    price: toNullableNumber(wire.requested_price),
    executedQuantity: toNumber(wire.executed_quantity),
    averageFillPrice: toNullableNumber(wire.average_fill_price),
    errorMessage: wire.error_message,
    binanceOrderId: wire.binance_order_id,
    timestamp: wire.created_at ?? wire.submitted_at ?? new Date().toISOString(),
  };
}

function mapMarketData(wire: WireMarketData): MarketData {
  return {
    symbol: wire.symbol,
    lastPrice: toNumber(wire.last_price),
    priceChangePercent: toNumber(wire.price_change_percent),
    highPrice: toNumber(wire.high_price),
    lowPrice: toNumber(wire.low_price),
    volume: toNumber(wire.volume),
  };
}

function mapOrderActionResult(wire: WireOrderActionResult): OrderActionResult {
  return {
    order: wire.order ? mapOrder(wire.order) : null,
    status: wire.status,
    reason: wire.reason,
  };
}

function mapBot(wire: WireBot): Bot {
  return {
    id: wire.id,
    name: wire.name,
    riskProfile: wire.risk_profile,
    assetClass: wire.asset_class,
    executionVenue: wire.execution_venue,
    instrument: wire.instrument,
    strategyModel: wire.strategy_model,
    strategyConfig: wire.strategy_config,
    status: wire.status as Bot['status'],
    currentQuantity: toNumber(wire.current_quantity),
    targetQuantity: toNumber(wire.target_quantity),
    pausedAt: wire.paused_at,
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
  };
}

function mapBotActionResult(wire: WireBotActionResult): BotActionResult {
  return {
    bot: wire.bot ? mapBot(wire.bot) : null,
    status: wire.status,
    reason: wire.reason,
  };
}

// --- public client ---

export interface HermesApiClient {
  getPortfolio(): Promise<Portfolio>;
  getBalances(): Promise<Balance[]>;
  getMarketData(symbol: string): Promise<MarketData>;
  getPositions(): Promise<Position[]>;
  getOrders(params?: { symbol?: string; status?: string }): Promise<{ orders: Order[]; count: number }>;
  getOrder(id: string): Promise<Order>;
  createOrder(body: CreateOrderRequest, idempotencyKey: string): Promise<OrderActionResult>;
  cancelOrder(orderId: string, idempotencyKey: string): Promise<OrderActionResult>;
  closePosition(symbol: string, idempotencyKey: string): Promise<OrderActionResult>;
  getBots(): Promise<Bot[]>;
  getBot(id: string): Promise<Bot>;
  createBot(body: CreateBotRequest, idempotencyKey: string): Promise<BotActionResult>;
  updateBot(id: string, body: UpdateBotRequest, idempotencyKey: string): Promise<BotActionResult>;
  pauseBot(id: string, idempotencyKey: string): Promise<BotActionResult>;
  resumeBot(id: string, idempotencyKey: string): Promise<BotActionResult>;
  stopBot(id: string, idempotencyKey: string): Promise<BotActionResult>;
}

class HermesApiClientImpl implements HermesApiClient {
  async getPortfolio(): Promise<Portfolio> {
    const wire = await request<WirePortfolio>('/portfolio');
    return mapPortfolio(wire);
  }

  async getBalances(): Promise<Balance[]> {
    const wire = await request<{ balances: WireBalance[] }>('/balances');
    return wire.balances.map(mapBalance);
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    const wire = await request<WireMarketData>('/market-data', { query: { symbol } });
    return mapMarketData(wire);
  }

  async getPositions(): Promise<Position[]> {
    const wire = await request<{ positions: WirePosition[] }>('/positions');
    return wire.positions.map(mapPosition);
  }

  async getOrders(params?: { symbol?: string; status?: string }): Promise<{ orders: Order[]; count: number }> {
    const wire = await request<{ orders: WireOrder[]; count: number }>('/orders', {
      query: { symbol: params?.symbol, status: params?.status },
    });
    return { orders: wire.orders.map(mapOrder), count: wire.count };
  }

  async getOrder(id: string): Promise<Order> {
    const wire = await request<WireOrder>(`/orders/${encodeURIComponent(id)}`);
    return mapOrder(wire);
  }

  async createOrder(body: CreateOrderRequest, idempotencyKey: string): Promise<OrderActionResult> {
    const wire = await request<WireOrderActionResult>('/orders', {
      method: 'POST',
      idempotencyKey,
      body: {
        symbol: body.symbol,
        side: body.side,
        type: body.type,
        quantity: body.quantity,
        price: body.price,
      },
    });
    return mapOrderActionResult(wire);
  }

  async cancelOrder(orderId: string, idempotencyKey: string): Promise<OrderActionResult> {
    const wire = await request<WireOrderActionResult>(
      `/orders/${encodeURIComponent(orderId)}/cancel`,
      { method: 'POST', idempotencyKey }
    );
    return mapOrderActionResult(wire);
  }

  async closePosition(symbol: string, idempotencyKey: string): Promise<OrderActionResult> {
    const wire = await request<WireOrderActionResult>(
      `/positions/${encodeURIComponent(symbol)}/close`,
      { method: 'POST', idempotencyKey }
    );
    return mapOrderActionResult(wire);
  }

  async getBots(): Promise<Bot[]> {
    const wire = await request<{ bots: WireBot[] }>('/bots');
    return wire.bots.map(mapBot);
  }

  async getBot(id: string): Promise<Bot> {
    const wire = await request<WireBot>(`/bots/${encodeURIComponent(id)}`);
    return mapBot(wire);
  }

  async createBot(body: CreateBotRequest, idempotencyKey: string): Promise<BotActionResult> {
    const wire = await request<WireBotActionResult>('/bots', {
      method: 'POST',
      idempotencyKey,
      body: {
        name: body.name,
        risk_profile: body.riskProfile,
        asset_class: body.assetClass,
        execution_venue: body.executionVenue,
        instrument: body.instrument,
        target_quantity: body.targetQuantity,
        strategy_model: body.strategyModel,
        strategy_config: body.strategyConfig,
      },
    });
    return mapBotActionResult(wire);
  }

  async updateBot(
    id: string,
    body: UpdateBotRequest,
    idempotencyKey: string
  ): Promise<BotActionResult> {
    const wire = await request<WireBotActionResult>(`/bots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      idempotencyKey,
      body: {
        name: body.name,
        target_quantity: body.targetQuantity,
        strategy_model: body.strategyModel,
        strategy_config: body.strategyConfig,
      },
    });
    return mapBotActionResult(wire);
  }

  async pauseBot(id: string, idempotencyKey: string): Promise<BotActionResult> {
    const wire = await request<WireBotActionResult>(`/bots/${encodeURIComponent(id)}/pause`, {
      method: 'POST',
      idempotencyKey,
    });
    return mapBotActionResult(wire);
  }

  async resumeBot(id: string, idempotencyKey: string): Promise<BotActionResult> {
    const wire = await request<WireBotActionResult>(`/bots/${encodeURIComponent(id)}/resume`, {
      method: 'POST',
      idempotencyKey,
    });
    return mapBotActionResult(wire);
  }

  async stopBot(id: string, idempotencyKey: string): Promise<BotActionResult> {
    const wire = await request<WireBotActionResult>(`/bots/${encodeURIComponent(id)}/stop`, {
      method: 'POST',
      idempotencyKey,
    });
    return mapBotActionResult(wire);
  }
}

export const apiClient: HermesApiClient = new HermesApiClientImpl();
