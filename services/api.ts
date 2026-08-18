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
  BinanceCredentialStatus,
  Bot,
  BotPerformance,
  BotPortfolio,
  BotTrades,
  Candle,
  ConnectBinanceCredentialsResult,
  EquityCurve,
  EquityPeriod,
  ExecutionMode,
  ExecutionVenue,
  KlineData,
  Order,
  OrderSide,
  OrderType,
  Portfolio,
  Position,
  RiskProfile,
  SimulationRiskLimits,
  SimulationConfig,
  TradingSwitchState,
  UserRiskLimits,
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
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  /** Status codes whose JSON body is real, structured data to return —
   * not an error to throw. Used by GET /bots/{id}/portfolio and
   * /performance, which return 409 `{"available": false, "reason": ...}`
   * for a LIVE bot: that's a normal, expected response shape the caller
   * renders, not a failure. FastAPI wraps every HTTPException's `detail`
   * under a `detail` key, so it's unwrapped here the same way the error
   * path below already reads `payload.detail`. */
  dataStatuses?: number[];
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
    if (options.dataStatuses?.includes(response.status)) {
      try {
        const payload = await response.json();
        return (payload?.detail ?? payload) as T;
      } catch {
        return undefined as T;
      }
    }

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

interface WireEquityPoint {
  t: string;
  v: string;
}

/** GET /portfolio/history's backend period values — a different set from
 * the UI's own `EquityPeriod` tab keys (`7D/1M/3M/1Y`); see
 * `BACKEND_PERIOD_BY_UI_PERIOD` for the mapping between the two. */
type BackendPortfolioHistoryPeriod = '1D' | '7D' | '30D' | '90D' | '1Y';

interface WireEquityCurve {
  period: BackendPortfolioHistoryPeriod;
  quote_asset: string;
  points: WireEquityPoint[];
  return_pct: string | null;
  max_drawdown_pct: string | null;
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

interface WireSimulationConfig {
  initial_capital_quote: string;
  quote_asset: string;
}

interface WireBotPortfolioAvailable {
  available: true;
  execution_mode: ExecutionMode;
  quote_asset: string;
  initial_capital_quote: string;
  cash_balance_quote: string;
  current_quantity: string;
  position_value_quote: string;
  total_value_quote: string;
  exposure_pct: string;
  return_pct: string | null;
}

interface WireNotAvailable {
  available: false;
  reason: string;
}

type WireBotPortfolio = WireBotPortfolioAvailable | WireNotAvailable;

interface WireBotPerformanceAvailable {
  available: true;
  execution_mode: ExecutionMode;
  total_value_quote: string;
  return_pct: string | null;
  max_drawdown_pct: string | null;
  realized_pnl_today_quote: string;
  trade_count: number;
  win_rate_pct: string | null;
  exposure_pct: string;
}

type WireBotPerformance = WireBotPerformanceAvailable | WireNotAvailable;

interface WireCandle {
  open_time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  close_time: number;
}

interface WireKlineData {
  symbol: string;
  interval: string;
  candles: WireCandle[];
}

interface WireBotTrade {
  side: 'BUY' | 'SELL';
  fill_price: string | null;
  executed_quantity: string;
  terminal_at: string | null;
}

interface WireBotTradesAvailable {
  available: true;
  execution_mode: ExecutionMode;
  trades: WireBotTrade[];
}

type WireBotTrades = WireBotTradesAvailable | WireNotAvailable;

interface WireBot {
  id: string;
  name: string;
  risk_profile: RiskProfile;
  asset_class: AssetClass;
  execution_venue: ExecutionVenue;
  execution_mode: ExecutionMode;
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

/** Quantity/price precision rules for one symbol -- lets a caller round a
 * quantity to a valid step (e.g. the bot-form budget calculator) before
 * submitting an order, rather than only finding out from a rejected one. */
export interface ExchangeInfo {
  symbol: string;
  status: string;
  stepSize: number;
  minQty: number;
  maxQty: number;
  minNotional: number;
}

interface WireExchangeInfo {
  symbol: string;
  status: string;
  filters: {
    step_size: string;
    min_qty: string;
    max_qty: string;
    min_notional: string;
  };
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

interface WireBinanceCredentialStatus {
  configured: boolean;
  api_key_last4: string | null;
  verified_at: string | null;
  updated_at: string | null;
}

type WireConnectBinanceCredentialsResult =
  | { connected: true; api_key_last4: string; verified_at: string | null }
  | { connected: false; reason: string };

interface WireUserRiskLimits {
  max_order_notional_quote: string | null;
  max_symbol_exposure_pct: string | null;
  max_total_exposure_pct: string | null;
  max_daily_loss_pct: string | null;
  max_open_positions: number | null;
  allowed_symbols: string[] | null;
}

interface WireSimulationRiskLimits {
  max_order_notional_quote: string;
  max_symbol_exposure_pct: string;
  max_total_exposure_pct: string;
  max_daily_loss_pct: string;
  max_open_positions: number;
  allowed_symbols: string[];
}

interface WireTradingSwitchState {
  enabled: boolean;
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
  };
}

/** The Dashboard's existing 4 period tabs, unchanged (no design change),
 * mapped to the 5 periods `GET /portfolio/history` actually supports. */
const BACKEND_PERIOD_BY_UI_PERIOD: Record<EquityPeriod, BackendPortfolioHistoryPeriod> = {
  '7D': '7D',
  '1M': '30D',
  '3M': '90D',
  '1Y': '1Y',
};

function mapEquityCurve(wire: WireEquityCurve): EquityCurve {
  return {
    points: wire.points.map((p) => ({ t: p.t, v: toNumber(p.v) })),
    returnPct: toNullableNumber(wire.return_pct),
    maxDrawdownPct: toNullableNumber(wire.max_drawdown_pct),
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

function mapExchangeInfo(wire: WireExchangeInfo): ExchangeInfo {
  return {
    symbol: wire.symbol,
    status: wire.status,
    stepSize: toNumber(wire.filters.step_size),
    minQty: toNumber(wire.filters.min_qty),
    maxQty: toNumber(wire.filters.max_qty),
    minNotional: toNumber(wire.filters.min_notional),
  };
}

function mapOrderActionResult(wire: WireOrderActionResult): OrderActionResult {
  return {
    order: wire.order ? mapOrder(wire.order) : null,
    status: wire.status,
    reason: wire.reason,
  };
}

function mapSimulationConfig(wire: WireSimulationConfig): SimulationConfig {
  return {
    initialCapitalQuote: toNumber(wire.initial_capital_quote),
    quoteAsset: wire.quote_asset,
  };
}

function mapBotPortfolio(wire: WireBotPortfolio): BotPortfolio {
  if (!wire.available) {
    return { available: false, reason: wire.reason };
  }
  return {
    available: true,
    executionMode: wire.execution_mode,
    quoteAsset: wire.quote_asset,
    initialCapitalQuote: toNumber(wire.initial_capital_quote),
    cashBalanceQuote: toNumber(wire.cash_balance_quote),
    currentQuantity: toNumber(wire.current_quantity),
    positionValueQuote: toNumber(wire.position_value_quote),
    totalValueQuote: toNumber(wire.total_value_quote),
    exposurePct: toNumber(wire.exposure_pct),
    returnPct: toNullableNumber(wire.return_pct),
  };
}

function mapBotPerformance(wire: WireBotPerformance): BotPerformance {
  if (!wire.available) {
    return { available: false, reason: wire.reason };
  }
  return {
    available: true,
    executionMode: wire.execution_mode,
    totalValueQuote: toNumber(wire.total_value_quote),
    returnPct: toNullableNumber(wire.return_pct),
    maxDrawdownPct: toNullableNumber(wire.max_drawdown_pct),
    realizedPnlTodayQuote: toNumber(wire.realized_pnl_today_quote),
    tradeCount: wire.trade_count,
    winRatePct: toNullableNumber(wire.win_rate_pct),
    exposurePct: toNumber(wire.exposure_pct),
  };
}

function mapKlineData(wire: WireKlineData): KlineData {
  return {
    symbol: wire.symbol,
    interval: wire.interval,
    candles: wire.candles.map(
      (candle): Candle => ({
        openTime: candle.open_time,
        open: toNumber(candle.open),
        high: toNumber(candle.high),
        low: toNumber(candle.low),
        close: toNumber(candle.close),
        volume: toNumber(candle.volume),
        closeTime: candle.close_time,
      })
    ),
  };
}

function mapBotTrades(wire: WireBotTrades): BotTrades {
  if (!wire.available) {
    return { available: false, reason: wire.reason };
  }
  return {
    available: true,
    executionMode: wire.execution_mode,
    // A FILLED order always has a fill price -- this filter is a
    // defensive no-op against the wire type's own nullability, not an
    // expected runtime case.
    trades: wire.trades
      .filter((trade) => trade.fill_price !== null && trade.terminal_at !== null)
      .map((trade) => ({
        side: trade.side,
        fillPrice: toNumber(trade.fill_price as string),
        executedQuantity: toNumber(trade.executed_quantity),
        terminalAt: trade.terminal_at as string,
      })),
  };
}

function mapBot(wire: WireBot): Bot {
  return {
    id: wire.id,
    name: wire.name,
    riskProfile: wire.risk_profile,
    assetClass: wire.asset_class,
    executionVenue: wire.execution_venue,
    executionMode: wire.execution_mode,
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

function mapBinanceCredentialStatus(wire: WireBinanceCredentialStatus): BinanceCredentialStatus {
  return {
    configured: wire.configured,
    apiKeyLast4: wire.api_key_last4,
    verifiedAt: wire.verified_at,
    updatedAt: wire.updated_at,
  };
}

function mapConnectBinanceCredentialsResult(
  wire: WireConnectBinanceCredentialsResult
): ConnectBinanceCredentialsResult {
  if (!wire.connected) {
    return { connected: false, reason: wire.reason };
  }
  return { connected: true, apiKeyLast4: wire.api_key_last4, verifiedAt: wire.verified_at };
}

function mapSimulationRiskLimits(wire: WireSimulationRiskLimits): SimulationRiskLimits {
  return {
    maxOrderNotionalQuote: toNumber(wire.max_order_notional_quote),
    maxSymbolExposurePct: toNumber(wire.max_symbol_exposure_pct),
    maxTotalExposurePct: toNumber(wire.max_total_exposure_pct),
    maxDailyLossPct: toNumber(wire.max_daily_loss_pct),
    maxOpenPositions: wire.max_open_positions,
    allowedSymbols: wire.allowed_symbols,
  };
}

function mapUserRiskLimits(wire: WireUserRiskLimits): UserRiskLimits {
  return {
    maxOrderNotionalQuote: toNullableNumber(wire.max_order_notional_quote),
    maxSymbolExposurePct: toNullableNumber(wire.max_symbol_exposure_pct),
    maxTotalExposurePct: toNullableNumber(wire.max_total_exposure_pct),
    maxDailyLossPct: toNullableNumber(wire.max_daily_loss_pct),
    maxOpenPositions: wire.max_open_positions,
    allowedSymbols: wire.allowed_symbols,
  };
}

function mapTradingSwitchState(wire: WireTradingSwitchState): TradingSwitchState {
  return { enabled: wire.enabled };
}

export interface ConnectBinanceCredentialsRequest {
  apiKey: string;
  apiSecret: string;
}

// --- public client ---

export interface HermesApiClient {
  getPortfolio(): Promise<Portfolio>;
  getPortfolioHistory(period: EquityPeriod): Promise<EquityCurve>;
  getBalances(): Promise<Balance[]>;
  getMarketData(symbol: string): Promise<MarketData>;
  getExchangeInfo(symbol: string): Promise<ExchangeInfo>;
  getPositions(): Promise<Position[]>;
  getOrders(params?: { symbol?: string; status?: string }): Promise<{ orders: Order[]; count: number }>;
  getOrder(id: string): Promise<Order>;
  createOrder(body: CreateOrderRequest, idempotencyKey: string): Promise<OrderActionResult>;
  cancelOrder(orderId: string, idempotencyKey: string): Promise<OrderActionResult>;
  closePosition(symbol: string, idempotencyKey: string): Promise<OrderActionResult>;
  getSimulationConfig(): Promise<SimulationConfig>;
  getBots(): Promise<Bot[]>;
  getBot(id: string): Promise<Bot>;
  getBotPortfolio(id: string): Promise<BotPortfolio>;
  getBotPerformance(id: string): Promise<BotPerformance>;
  getBotTrades(id: string): Promise<BotTrades>;
  getKlines(symbol: string, interval: string, limit?: number): Promise<KlineData>;
  createBot(body: CreateBotRequest, idempotencyKey: string): Promise<BotActionResult>;
  updateBot(id: string, body: UpdateBotRequest, idempotencyKey: string): Promise<BotActionResult>;
  pauseBot(id: string, idempotencyKey: string): Promise<BotActionResult>;
  resumeBot(id: string, idempotencyKey: string): Promise<BotActionResult>;
  stopBot(id: string, idempotencyKey: string): Promise<BotActionResult>;
  deleteBot(id: string, idempotencyKey: string): Promise<BotActionResult>;
  getBinanceCredentialStatus(): Promise<BinanceCredentialStatus>;
  connectBinanceCredentials(
    body: ConnectBinanceCredentialsRequest,
    idempotencyKey: string
  ): Promise<ConnectBinanceCredentialsResult>;
  disconnectBinanceCredentials(idempotencyKey: string): Promise<void>;
  getUserRiskLimits(): Promise<UserRiskLimits>;
  updateUserRiskLimits(body: UserRiskLimits, idempotencyKey: string): Promise<UserRiskLimits>;
  getSimulationRiskLimits(): Promise<SimulationRiskLimits>;
  updateSimulationRiskLimits(
    body: SimulationRiskLimits,
    idempotencyKey: string
  ): Promise<SimulationRiskLimits>;
  getTradingSwitch(): Promise<TradingSwitchState>;
  setTradingSwitch(enabled: boolean, idempotencyKey: string): Promise<TradingSwitchState>;
}

class HermesApiClientImpl implements HermesApiClient {
  async getPortfolio(): Promise<Portfolio> {
    const wire = await request<WirePortfolio>('/portfolio');
    return mapPortfolio(wire);
  }

  async getPortfolioHistory(period: EquityPeriod): Promise<EquityCurve> {
    const wire = await request<WireEquityCurve>('/portfolio/history', {
      query: { period: BACKEND_PERIOD_BY_UI_PERIOD[period] },
    });
    return mapEquityCurve(wire);
  }

  async getBalances(): Promise<Balance[]> {
    const wire = await request<{ balances: WireBalance[] }>('/balances');
    return wire.balances.map(mapBalance);
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    const wire = await request<WireMarketData>('/market-data', { query: { symbol } });
    return mapMarketData(wire);
  }

  async getExchangeInfo(symbol: string): Promise<ExchangeInfo> {
    const wire = await request<WireExchangeInfo>('/exchange-info', { query: { symbol } });
    return mapExchangeInfo(wire);
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

  async getSimulationConfig(): Promise<SimulationConfig> {
    const wire = await request<WireSimulationConfig>('/config/simulation');
    return mapSimulationConfig(wire);
  }

  async getBots(): Promise<Bot[]> {
    const wire = await request<{ bots: WireBot[] }>('/bots');
    return wire.bots.map(mapBot);
  }

  async getBot(id: string): Promise<Bot> {
    const wire = await request<WireBot>(`/bots/${encodeURIComponent(id)}`);
    return mapBot(wire);
  }

  async getBotPortfolio(id: string): Promise<BotPortfolio> {
    const wire = await request<WireBotPortfolio>(`/bots/${encodeURIComponent(id)}/portfolio`, {
      dataStatuses: [409],
    });
    return mapBotPortfolio(wire);
  }

  async getBotPerformance(id: string): Promise<BotPerformance> {
    const wire = await request<WireBotPerformance>(`/bots/${encodeURIComponent(id)}/performance`, {
      dataStatuses: [409],
    });
    return mapBotPerformance(wire);
  }

  async getBotTrades(id: string): Promise<BotTrades> {
    const wire = await request<WireBotTrades>(`/bots/${encodeURIComponent(id)}/trades`, {
      dataStatuses: [409],
    });
    return mapBotTrades(wire);
  }

  async getKlines(symbol: string, interval: string, limit?: number): Promise<KlineData> {
    const wire = await request<WireKlineData>('/klines', {
      query: { symbol, interval, limit: limit !== undefined ? String(limit) : undefined },
    });
    return mapKlineData(wire);
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

  async deleteBot(id: string, idempotencyKey: string): Promise<BotActionResult> {
    const wire = await request<WireBotActionResult>(`/bots/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      idempotencyKey,
    });
    return mapBotActionResult(wire);
  }

  async getBinanceCredentialStatus(): Promise<BinanceCredentialStatus> {
    const wire = await request<WireBinanceCredentialStatus>('/settings/binance-credentials');
    return mapBinanceCredentialStatus(wire);
  }

  async connectBinanceCredentials(
    body: ConnectBinanceCredentialsRequest,
    idempotencyKey: string
  ): Promise<ConnectBinanceCredentialsResult> {
    // A 409 here is a normal, expected outcome (verification failed, or
    // the key has withdrawals enabled) — real structured data to render,
    // not an error to throw, same convention as getBotPortfolio's 409.
    const wire = await request<WireConnectBinanceCredentialsResult>('/settings/binance-credentials', {
      method: 'PUT',
      idempotencyKey,
      dataStatuses: [409],
      body: { api_key: body.apiKey, api_secret: body.apiSecret },
    });
    return mapConnectBinanceCredentialsResult(wire);
  }

  async disconnectBinanceCredentials(idempotencyKey: string): Promise<void> {
    await request<{ connected: false }>('/settings/binance-credentials', {
      method: 'DELETE',
      idempotencyKey,
    });
  }

  async getUserRiskLimits(): Promise<UserRiskLimits> {
    const wire = await request<WireUserRiskLimits>('/settings/risk-limits');
    return mapUserRiskLimits(wire);
  }

  async updateUserRiskLimits(body: UserRiskLimits, idempotencyKey: string): Promise<UserRiskLimits> {
    const wire = await request<WireUserRiskLimits>('/settings/risk-limits', {
      method: 'PUT',
      idempotencyKey,
      body: {
        max_order_notional_quote: body.maxOrderNotionalQuote,
        max_symbol_exposure_pct: body.maxSymbolExposurePct,
        max_total_exposure_pct: body.maxTotalExposurePct,
        max_daily_loss_pct: body.maxDailyLossPct,
        max_open_positions: body.maxOpenPositions,
        allowed_symbols: body.allowedSymbols,
      },
    });
    return mapUserRiskLimits(wire);
  }

  async getSimulationRiskLimits(): Promise<SimulationRiskLimits> {
    const wire = await request<WireSimulationRiskLimits>('/settings/simulation-risk-limits');
    return mapSimulationRiskLimits(wire);
  }

  async updateSimulationRiskLimits(
    body: SimulationRiskLimits,
    idempotencyKey: string
  ): Promise<SimulationRiskLimits> {
    const wire = await request<WireSimulationRiskLimits>('/settings/simulation-risk-limits', {
      method: 'PUT',
      idempotencyKey,
      body: {
        max_order_notional_quote: body.maxOrderNotionalQuote,
        max_symbol_exposure_pct: body.maxSymbolExposurePct,
        max_total_exposure_pct: body.maxTotalExposurePct,
        max_daily_loss_pct: body.maxDailyLossPct,
        max_open_positions: body.maxOpenPositions,
        allowed_symbols: body.allowedSymbols,
      },
    });
    return mapSimulationRiskLimits(wire);
  }

  async getTradingSwitch(): Promise<TradingSwitchState> {
    const wire = await request<WireTradingSwitchState>('/settings/trading-switch');
    return mapTradingSwitchState(wire);
  }

  async setTradingSwitch(enabled: boolean, idempotencyKey: string): Promise<TradingSwitchState> {
    const wire = await request<WireTradingSwitchState>('/settings/trading-switch', {
      method: 'PUT',
      idempotencyKey,
      body: { enabled },
    });
    return mapTradingSwitchState(wire);
  }
}

export const apiClient: HermesApiClient = new HermesApiClientImpl();
