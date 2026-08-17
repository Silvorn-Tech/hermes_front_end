import { apiClient, HermesApiError } from '../api';

const originalFetch = global.fetch;
const originalEnv = process.env.EXPO_PUBLIC_API_URL;

function mockJsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => headers[key] ?? null },
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://hermes.test';
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env.EXPO_PUBLIC_API_URL = originalEnv;
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

function lastCall() {
  const mock = global.fetch as jest.Mock;
  return mock.mock.calls[mock.mock.calls.length - 1];
}

describe('HermesApiClient — every call uses the session cookie, never a bearer token', () => {
  it('getPortfolio maps decimal-string wire fields to numbers and sends credentials', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        quote_asset: 'USDT',
        total_value_quote: '1234.56',
        as_of: '2026-08-16T00:00:00Z',
        balances: [{ asset: 'BTC', free: '0.5', locked: '0', value_quote: '30000.12', priced: true }],
      })
    );

    const portfolio = await apiClient.getPortfolio();

    expect(portfolio.totalValueQuote).toBe(1234.56);
    expect(portfolio.balances[0]).toEqual({ asset: 'BTC', free: 0.5, locked: 0, valueQuote: 30000.12, priced: true });
    expect(portfolio.dailyPnl).toBeNull();

    const [url, options] = lastCall();
    expect(url).toBe('https://hermes.test/portfolio');
    expect(options.credentials).toBe('include');
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('getPortfolioHistory maps the UI period to the backend period and decimal-string points to numbers', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        period: '30D',
        quote_asset: 'USDT',
        points: [
          { t: '2026-08-15T00:00:00Z', v: '1000.0000000000' },
          { t: '2026-08-16T00:00:00Z', v: '1100.0000000000' },
        ],
        return_pct: '10.0',
        max_drawdown_pct: '2.5',
      })
    );

    const curve = await apiClient.getPortfolioHistory('1M');

    expect(curve.points).toEqual([
      { t: '2026-08-15T00:00:00Z', v: 1000 },
      { t: '2026-08-16T00:00:00Z', v: 1100 },
    ]);
    expect(curve.returnPct).toBe(10.0);
    expect(curve.maxDrawdownPct).toBe(2.5);

    const [url] = lastCall();
    expect(url).toBe('https://hermes.test/portfolio/history?period=30D');
  });

  it('getPortfolioHistory maps null return/drawdown to null, not 0', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        period: '7D',
        quote_asset: 'USDT',
        points: [],
        return_pct: null,
        max_drawdown_pct: null,
      })
    );

    const curve = await apiClient.getPortfolioHistory('7D');

    expect(curve.points).toEqual([]);
    expect(curve.returnPct).toBeNull();
    expect(curve.maxDrawdownPct).toBeNull();
  });

  it('getPositions maps null (unpriced) fields to null, never to 0', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        positions: [
          {
            symbol: 'ETHUSDT',
            asset: 'ETH',
            quantity: '2',
            average_entry_price: null,
            current_price: null,
            value_quote: null,
            unrealized_pnl_quote: null,
            unrealized_pnl_pct: null,
          },
        ],
      })
    );

    const [position] = await apiClient.getPositions();
    expect(position.entryPrice).toBeNull();
    expect(position.currentPrice).toBeNull();
    expect(position.valueQuote).toBeNull();
    expect(position.id).toBe('ETHUSDT');
  });

  it('getOrders passes symbol/status as query params and maps the order list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        count: 1,
        orders: [
          {
            id: 'ord-1',
            symbol: 'BTCUSDT',
            side: 'BUY',
            order_type: 'MARKET',
            status: 'FILLED',
            requested_quantity: '0.01',
            requested_price: null,
            executed_quantity: '0.01',
            average_fill_price: '30000',
            binance_order_id: '999',
            error_message: null,
            created_at: '2026-08-16T00:00:00Z',
            submitted_at: null,
            terminal_at: null,
          },
        ],
      })
    );

    const result = await apiClient.getOrders({ symbol: 'BTCUSDT', status: 'FILLED' });
    expect(result.count).toBe(1);
    expect(result.orders[0].executedQuantity).toBe(0.01);

    const [url] = lastCall();
    expect(url).toBe('https://hermes.test/orders?symbol=BTCUSDT&status=FILLED');
  });

  it('getMarketData maps decimal-string fields and passes symbol as a query param', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        symbol: 'BTCUSDT',
        last_price: '65000.5',
        price_change_percent: '-1.25',
        high_price: '66000',
        low_price: '64000',
        volume: '12345.6',
      })
    );

    const data = await apiClient.getMarketData('BTCUSDT');
    expect(data).toEqual({
      symbol: 'BTCUSDT',
      lastPrice: 65000.5,
      priceChangePercent: -1.25,
      highPrice: 66000,
      lowPrice: 64000,
      volume: 12345.6,
    });

    const [url] = lastCall();
    expect(url).toBe('https://hermes.test/market-data?symbol=BTCUSDT');
  });

  it('createOrder sends the raw quantity/price strings unmodified and attaches Idempotency-Key', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(201, {
        order: null,
        status: 'REJECTED',
        reason: 'Trading is disabled.',
      })
    );

    const result = await apiClient.createOrder(
      { symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', quantity: '0.00012345', price: '30000.10' },
      'key-123'
    );

    expect(result).toEqual({ order: null, status: 'REJECTED', reason: 'Trading is disabled.' });

    const [url, options] = lastCall();
    expect(url).toBe('https://hermes.test/orders');
    expect(options.method).toBe('POST');
    expect(options.headers['Idempotency-Key']).toBe('key-123');
    const sentBody = JSON.parse(options.body);
    // Must be the exact string the caller passed — no Number() round-trip.
    expect(sentBody.quantity).toBe('0.00012345');
    expect(sentBody.price).toBe('30000.10');
  });

  it('cancelOrder posts to the cancel endpoint with the idempotency key', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse(200, { order: null, status: 'CANCELED', reason: null }));
    await apiClient.cancelOrder('ord-1', 'key-abc');
    const [url, options] = lastCall();
    expect(url).toBe('https://hermes.test/orders/ord-1/cancel');
    expect(options.headers['Idempotency-Key']).toBe('key-abc');
  });

  it('closePosition posts to the close endpoint for the given symbol', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse(201, { order: null, status: 'REJECTED', reason: 'Trading is disabled.' }));
    await apiClient.closePosition('BTC/USDT', 'key-xyz');
    const [url] = lastCall();
    // symbol must be URL-encoded, not injected raw into the path.
    expect(url).toBe('https://hermes.test/positions/BTC%2FUSDT/close');
  });

  it('getBots maps every bot in the list, decimal-string quantities included', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        bots: [
          {
            id: 'bot-1',
            name: 'Vortex Runner',
            risk_profile: 'VORTEX',
            asset_class: 'CRYPTO',
            execution_venue: 'BINANCE',
            execution_mode: 'SIMULATION',
            instrument: 'BTCUSDT',
            strategy_model: 'GARCH',
            strategy_config: null,
            status: 'ACTIVE',
            current_quantity: '0.0150000000',
            target_quantity: '0.0150000000',
            paused_at: null,
            created_at: '2026-08-16T00:00:00Z',
            updated_at: '2026-08-16T00:00:00Z',
          },
        ],
      })
    );

    const bots = await apiClient.getBots();
    expect(bots).toEqual([
      {
        id: 'bot-1',
        name: 'Vortex Runner',
        riskProfile: 'VORTEX',
        assetClass: 'CRYPTO',
        executionVenue: 'BINANCE',
        executionMode: 'SIMULATION',
        instrument: 'BTCUSDT',
        strategyModel: 'GARCH',
        strategyConfig: null,
        status: 'ACTIVE',
        currentQuantity: 0.015,
        targetQuantity: 0.015,
        pausedAt: null,
        createdAt: '2026-08-16T00:00:00Z',
        updatedAt: '2026-08-16T00:00:00Z',
      },
    ]);
    expect(lastCall()[0]).toBe('https://hermes.test/bots');
  });

  it('createBot sends the raw target_quantity string unmodified with the idempotency key', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(201, {
        bot: null,
        status: 'PAUSED',
        reason: null,
      })
    );

    await apiClient.createBot(
      {
        name: 'New Bot',
        riskProfile: 'SENTINEL',
        assetClass: 'CRYPTO',
        executionVenue: 'BINANCE',
        instrument: 'BTCUSDT',
        targetQuantity: '0.00012345',
      },
      'key-1'
    );

    const [url, options] = lastCall();
    expect(url).toBe('https://hermes.test/bots');
    expect(options.method).toBe('POST');
    expect(options.headers['Idempotency-Key']).toBe('key-1');
    const sentBody = JSON.parse(options.body);
    expect(sentBody.target_quantity).toBe('0.00012345');
    expect(sentBody.risk_profile).toBe('SENTINEL');
  });

  it('updateBot issues a PATCH to the bot-specific path', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse(200, { bot: null, status: 'PAUSED', reason: null }));
    await apiClient.updateBot('bot-1', { name: 'Renamed' }, 'key-2');
    const [url, options] = lastCall();
    expect(url).toBe('https://hermes.test/bots/bot-1');
    expect(options.method).toBe('PATCH');
  });

  it.each([
    ['pauseBot', 'pause'],
    ['resumeBot', 'resume'],
    ['stopBot', 'stop'],
  ] as const)('%s posts to /bots/{id}/%s with the idempotency key', async (method, path) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse(200, { bot: null, status: 'REJECTED', reason: 'Trading is disabled.' }));
    await apiClient[method]('bot-1', 'key-3');
    const [url, options] = lastCall();
    expect(url).toBe(`https://hermes.test/bots/bot-1/${path}`);
    expect(options.method).toBe('POST');
    expect(options.headers['Idempotency-Key']).toBe('key-3');
  });
});

describe('HermesApiClient — Simulation Mode', () => {
  it('getSimulationConfig maps the decimal-string capital to a number, sends no idempotency/auth extras', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, { initial_capital_quote: '10000', quote_asset: 'USDT' })
    );

    const config = await apiClient.getSimulationConfig();

    expect(config).toEqual({ initialCapitalQuote: 10000, quoteAsset: 'USDT' });
    const [url] = lastCall();
    expect(url).toBe('https://hermes.test/config/simulation');
  });

  it('getBotPortfolio maps a 200 available response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        available: true,
        execution_mode: 'SIMULATION',
        quote_asset: 'USDT',
        initial_capital_quote: '10000',
        cash_balance_quote: '9000',
        current_quantity: '0.0200000000',
        position_value_quote: '1000',
        total_value_quote: '10000',
        exposure_pct: '10.000',
        return_pct: '0.00',
      })
    );

    const portfolio = await apiClient.getBotPortfolio('bot-1');

    expect(portfolio).toEqual({
      available: true,
      executionMode: 'SIMULATION',
      quoteAsset: 'USDT',
      initialCapitalQuote: 10000,
      cashBalanceQuote: 9000,
      currentQuantity: 0.02,
      positionValueQuote: 1000,
      totalValueQuote: 10000,
      exposurePct: 10,
      returnPct: 0,
    });
    const [url] = lastCall();
    expect(url).toBe('https://hermes.test/bots/bot-1/portfolio');
  });

  it('getBotPortfolio returns {available: false, reason} for a LIVE bot\'s 409, never throwing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(409, {
        detail: { available: false, reason: 'This view is only available for SIMULATION bots.' },
      })
    );

    const portfolio = await apiClient.getBotPortfolio('bot-1');

    expect(portfolio).toEqual({
      available: false,
      reason: 'This view is only available for SIMULATION bots.',
    });
  });

  it('getBotPerformance maps a 200 available response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(200, {
        available: true,
        execution_mode: 'SIMULATION',
        total_value_quote: '10200',
        return_pct: '2.00',
        max_drawdown_pct: '1.50',
        realized_pnl_today_quote: '20',
        trade_count: 3,
        win_rate_pct: '66.67',
        exposure_pct: '5.000',
      })
    );

    const performance = await apiClient.getBotPerformance('bot-1');

    expect(performance).toEqual({
      available: true,
      executionMode: 'SIMULATION',
      totalValueQuote: 10200,
      returnPct: 2,
      maxDrawdownPct: 1.5,
      realizedPnlTodayQuote: 20,
      tradeCount: 3,
      winRatePct: 66.67,
      exposurePct: 5,
    });
  });

  it('getBotPerformance returns {available: false, reason} for a LIVE bot\'s 409, never throwing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(409, {
        detail: { available: false, reason: 'This view is only available for SIMULATION bots.' },
      })
    );

    const performance = await apiClient.getBotPerformance('bot-1');
    expect(performance.available).toBe(false);
  });

  it('a non-409 error status on the bot portfolio route still throws, never silently returned as data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse(500, { detail: 'boom' }));
    await expect(apiClient.getBotPortfolio('bot-1')).rejects.toMatchObject({ status: 500 });
  });
});

describe('HermesApiClient — error mapping', () => {
  it.each([401, 403, 404, 409, 422, 429, 500, 502, 503])(
    'throws a HermesApiError carrying status %i and the backend detail',
    async (status) => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse(status, { detail: `error ${status}` }));

      await expect(apiClient.getPortfolio()).rejects.toMatchObject({
        name: 'HermesApiError',
        status,
        detail: `error ${status}`,
      });
    }
  );

  it('parses Retry-After into retryAfterSeconds on a 429', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse(429, { detail: 'slow down' }, { 'Retry-After': '30' })
    );
    await expect(apiClient.getPortfolio()).rejects.toMatchObject({ status: 429, retryAfterSeconds: 30 });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: () => null },
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    await expect(apiClient.getPortfolio()).rejects.toMatchObject({ status: 500, detail: 'Hermes respondió 500.' });
  });

  it('wraps a network-level failure (fetch throws) as a HermesApiError with status 0', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));
    let caught: unknown;
    try {
      await apiClient.getPortfolio();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(HermesApiError);
    expect(caught).toMatchObject({ status: 0 });
  });

  it('throws if EXPO_PUBLIC_API_URL is not configured, rather than silently hitting a wrong host', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    await expect(apiClient.getPortfolio()).rejects.toThrow(/EXPO_PUBLIC_API_URL/);
  });
});
