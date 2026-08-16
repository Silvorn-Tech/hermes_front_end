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
