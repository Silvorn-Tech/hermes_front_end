import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import BotDetailScreen from '../../app/(app)/bots/[id]';
import { useHermesData } from '../../hooks/HermesDataContext';
import { apiClient } from '../../services/api';
import { Bot } from '../../types';
import { formatPrice } from '../../utils/format';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: { id: string } = { id: 'bot-1' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiClient: {
      getBotPortfolio: jest.fn(),
      getBotPerformance: jest.fn(),
      getBotTrades: jest.fn(),
      getKlines: jest.fn(),
      getBinanceCredentialStatus: jest.fn(),
    },
  };
});

const mockUseHermesData = useHermesData as jest.Mock;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const simulationPortfolio = {
  available: true as const,
  executionMode: 'SIMULATION' as const,
  quoteAsset: 'USDT',
  initialCapitalQuote: 10000,
  cashBalanceQuote: 9250,
  currentQuantity: 0.015,
  positionValueQuote: 750,
  totalValueQuote: 10000,
  exposurePct: 7.5,
  returnPct: 0,
};

const simulationPerformance = {
  available: true as const,
  executionMode: 'SIMULATION' as const,
  totalValueQuote: 10000,
  returnPct: 0,
  maxDrawdownPct: null,
  realizedPnlTodayQuote: 0,
  tradeCount: 0,
  winRatePct: null,
  exposurePct: 7.5,
};

const botTrades = {
  available: true as const,
  executionMode: 'SIMULATION' as const,
  trades: [],
};

const klineData = {
  symbol: 'BTCUSDT',
  interval: '15m',
  candles: [
    { openTime: 1700000000000, open: 49000, high: 49500, low: 48800, close: 49200, volume: 12.5, closeTime: 1700000899999 },
    { openTime: 1700000900000, open: 49200, high: 50100, low: 49100, close: 50000, volume: 15.1, closeTime: 1700001799999 },
  ],
};

const activeBot: Bot = {
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const liveBotPortfolio = {
  available: true as const,
  executionMode: 'LIVE' as const,
  quoteAsset: 'USDT',
  currentQuantity: 0.015,
  positionValueQuote: 750,
  totalValueQuote: 750,
  returnPct: null,
};

const liveBotPerformance = {
  available: true as const,
  executionMode: 'LIVE' as const,
  totalValueQuote: 750,
  returnPct: null,
  maxDrawdownPct: null,
  realizedPnlTodayQuote: 0,
  tradeCount: 0,
  winRatePct: null,
};

function contextValue(bot: Bot, overrides: Record<string, jest.Mock> = {}) {
  return {
    bots: [bot],
    pauseBot: jest.fn().mockResolvedValue({ bot: { ...bot, status: 'PAUSED' }, status: 'PAUSED', reason: null }),
    resumeBot: jest.fn().mockResolvedValue({ bot: { ...bot, status: 'ACTIVE' }, status: 'ACTIVE', reason: null }),
    stopBot: jest.fn().mockResolvedValue({ bot: { ...bot, status: 'STOPPED' }, status: 'STOPPED', reason: null }),
    activateBotLive: jest
      .fn()
      .mockResolvedValue({ bot: { ...bot, executionMode: 'LIVE' }, status: 'PAUSED', reason: null }),
    ...overrides,
  };
}

async function setup(bot: Bot, overrides: Record<string, jest.Mock> = {}) {
  const value = contextValue(bot, overrides);
  mockUseHermesData.mockReturnValue(value);
  const view = await render(<BotDetailScreen />);
  return { ...value, ...view };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'bot-1' };
  mockApiClient.getBotPortfolio.mockResolvedValue(simulationPortfolio);
  mockApiClient.getBotPerformance.mockResolvedValue(simulationPerformance);
  mockApiClient.getBotTrades.mockResolvedValue(botTrades);
  mockApiClient.getKlines.mockResolvedValue(klineData);
  mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
    configured: false,
    apiKeyLast4: null,
    verifiedAt: null,
    updatedAt: null,
  });
});

describe('Bot detail — real pause/resume/stop', () => {
  it('Pause Bot shows the exact confirmation copy and calls pauseBot on confirm', async () => {
    const { pauseBot, getByText, getAllByText } = await setup(activeBot);

    await fireEvent.press(getByText('Pause Bot'));
    expect(
      getByText(
        'Pausing this bot will close its current position. The bot will save its current target exposure and can restore it when resumed.'
      )
    ).toBeTruthy();

    const confirmButtons = getAllByText(/Pause Bot|Closing position…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(pauseBot).toHaveBeenCalledWith('bot-1', expect.any(String)));
  });

  it('Resume Bot shows the exact confirmation copy and calls resumeBot on confirm', async () => {
    const pausedBot: Bot = { ...activeBot, status: 'PAUSED', currentQuantity: 0 };
    const { resumeBot, getByText, getAllByText } = await setup(pausedBot);

    await fireEvent.press(getByText('Resume Bot'));
    expect(
      getByText(
        'Resuming this bot will open a new position using the target exposure saved when the bot was paused.'
      )
    ).toBeTruthy();

    const confirmButtons = getAllByText(/Resume Bot|Opening position…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(resumeBot).toHaveBeenCalledWith('bot-1', expect.any(String)));
  });

  it('a STOPPED bot has no Pause/Resume/Stop/Edit actions — fully terminal', async () => {
    const { queryByText } = await setup({ ...activeBot, status: 'STOPPED' });
    expect(queryByText('Pause Bot')).toBeNull();
    expect(queryByText('Resume Bot')).toBeNull();
    expect(queryByText('Detener')).toBeNull();
    expect(queryByText('Editar')).toBeNull();
  });

  it('Editar is only available while PAUSED', async () => {
    const { getByText, rerender } = await setup({ ...activeBot, status: 'PAUSED' });
    expect(getByText('Editar')).toBeTruthy();

    mockUseHermesData.mockReturnValue(contextValue(activeBot)); // ACTIVE
    await rerender(<BotDetailScreen />);
    expect(() => getByText('Editar')).toThrow();
  });

  it('a REJECTED pause result shows the reason inline, never a silent failure', async () => {
    const pauseBot = jest.fn().mockResolvedValue({
      bot: activeBot,
      status: 'REJECTED',
      reason: 'HERMES_RISK_ALLOWED_SYMBOLS is not configured',
    });
    const { getByText, getAllByText } = await setup(activeBot, { pauseBot });

    await fireEvent.press(getByText('Pause Bot'));
    const confirmButtons = getAllByText(/Pause Bot|Closing position…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(getByText('HERMES_RISK_ALLOWED_SYMBOLS is not configured')).toBeTruthy()
    );
  });

  it('an ERROR result is shown clearly as requiring manual review', async () => {
    const resumeBot = jest.fn().mockResolvedValue({
      bot: { ...activeBot, status: 'ERROR' },
      status: 'ERROR',
      reason: 'Order outcome could not be confirmed; manual review required.',
    });
    const pausedBot: Bot = { ...activeBot, status: 'PAUSED' };
    const { getByText, getAllByText } = await setup(pausedBot, { resumeBot });

    await fireEvent.press(getByText('Resume Bot'));
    const confirmButtons = getAllByText(/Resume Bot|Opening position…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(getByText(/requiere revisión manual/)).toBeTruthy());
  });

  it('Detener requires a strong confirmation and calls stopBot', async () => {
    const { stopBot, getByText, getAllByText } = await setup(activeBot);

    await fireEvent.press(getByText('Detener'));
    expect(getByText(/de forma PERMANENTE/)).toBeTruthy();

    const confirmButtons = getAllByText(/Detener|Deteniendo…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(stopBot).toHaveBeenCalledWith('bot-1', expect.any(String)));
  });

  it('shows the SIMULATION badge and the virtual portfolio once it loads', async () => {
    const { getByText } = await setup(activeBot);

    expect(getByText('🧪 Simulación')).toBeTruthy();
    await waitFor(() => expect(mockApiClient.getBotPortfolio).toHaveBeenCalledWith('bot-1'));
    await waitFor(() => expect(getByText(/Efectivo virtual/)).toBeTruthy());
  });

  it('re-fetches the simulated portfolio when currentQuantity changes -- e.g. after a Resume fill', async () => {
    // Regression test: SimulationPanel used to key its fetch effect only
    // on botId, which never changes across pause/resume, so the card
    // kept showing pre-fill numbers (full virtual cash, no position)
    // even after the backend had already updated everything.
    const pausedBot: Bot = { ...activeBot, status: 'PAUSED', currentQuantity: 0 };
    mockUseHermesData.mockReturnValue(contextValue(pausedBot));
    const { rerender } = await render(<BotDetailScreen />);

    await waitFor(() => expect(mockApiClient.getBotPortfolio).toHaveBeenCalledTimes(1));

    const activatedBot: Bot = { ...activeBot, status: 'ACTIVE', currentQuantity: 0.015 };
    mockUseHermesData.mockReturnValue(contextValue(activatedBot));
    await rerender(<BotDetailScreen />);

    await waitFor(() => expect(mockApiClient.getBotPortfolio).toHaveBeenCalledTimes(2));
  });

  it('Activar LIVE prompts to connect Binance first when no account is connected', async () => {
    mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
      configured: false,
      apiKeyLast4: null,
      verifiedAt: null,
      updatedAt: null,
    });
    const pausedBot: Bot = { ...activeBot, status: 'PAUSED', currentQuantity: 0 };
    const { getByText, activateBotLive } = await setup(pausedBot);

    await waitFor(() =>
      expect(getByText('Conectá tu cuenta de Binance en Settings antes de activar LIVE.')).toBeTruthy()
    );
    expect(activateBotLive).not.toHaveBeenCalled();
  });

  it('Activar LIVE is disabled with a reason while the bot is not PAUSED', async () => {
    mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
      configured: true,
      apiKeyLast4: '1234',
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const { getByText } = await setup(activeBot); // status: 'ACTIVE'

    await waitFor(() =>
      expect(getByText('Solo se puede activar LIVE mientras el bot está Pausado.')).toBeTruthy()
    );
  });

  it('activating LIVE shows the irreversible warning and calls activateBotLive on confirm', async () => {
    mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
      configured: true,
      apiKeyLast4: '1234',
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const pausedBot: Bot = { ...activeBot, status: 'PAUSED', currentQuantity: 0 };
    const { activateBotLive, getByText, getAllByText } = await setup(pausedBot);

    await waitFor(() => expect(getByText('Activar LIVE')).toBeTruthy());
    await fireEvent.press(getByText('Activar LIVE'));

    expect(getByText(/NO se puede deshacer/)).toBeTruthy();

    const confirmButtons = getAllByText(/Activar LIVE|Activando…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(activateBotLive).toHaveBeenCalledWith('bot-1', expect.any(String)));
  });

  it('shows the real portfolio (LivePanel), never SimulationPanel, for a LIVE bot', async () => {
    mockApiClient.getBotPortfolio.mockResolvedValue(liveBotPortfolio);
    mockApiClient.getBotPerformance.mockResolvedValue(liveBotPerformance);
    const liveBot: Bot = { ...activeBot, executionMode: 'LIVE' };
    const { getByText, queryByText } = await setup(liveBot);

    expect(getByText('🔴 Live')).toBeTruthy();
    await waitFor(() => expect(getByText('Valor de posición (real)')).toBeTruthy());
    expect(queryByText(/Efectivo virtual/)).toBeNull();
    expect(queryByText('Activar LIVE')).toBeNull(); // no promotion control once already LIVE
  });

  it('a simulated portfolio fetch error shows a retry state, never a crash', async () => {
    mockApiClient.getBotPortfolio.mockRejectedValue(new Error('network down'));
    const { getByText } = await setup(activeBot);

    await waitFor(() => expect(getByText('No se pudo cargar el portfolio simulado.')).toBeTruthy());
    expect(getByText('Reintentar')).toBeTruthy();
  });
});

describe('Bot detail — price chart', () => {
  it('is visible on the detail screen itself, not gated behind pressing Resume', async () => {
    // Explicitly what the user asked for: the chart lives on the screen
    // that has the Resume Bot button, not inside the confirmation dialog.
    const pausedBot: Bot = { ...activeBot, status: 'PAUSED' };
    const { getByText, queryByText } = await setup(pausedBot);

    expect(getByText('GRÁFICO')).toBeTruthy();
    expect(queryByText('Resuming this bot will open a new position using the target exposure saved when the bot was paused.')).toBeNull();
    await waitFor(() => expect(mockApiClient.getKlines).toHaveBeenCalledWith('BTCUSDT', '15m', 80));
  });

  it('loads candles for the bot\'s own instrument and shows the current price', async () => {
    const { getByText } = await setup(activeBot);

    await waitFor(() => expect(mockApiClient.getKlines).toHaveBeenCalledWith('BTCUSDT', '15m', 80));
    await waitFor(() => expect(getByText(formatPrice(50000))).toBeTruthy());
  });

  it('shows the entry/exit marker legend', async () => {
    const { getByText } = await setup(activeBot);

    await waitFor(() => expect(getByText('Entrada (compra)')).toBeTruthy());
    expect(getByText('Salida (venta)')).toBeTruthy();
  });

  it('switching the interval chip re-fetches klines at the new interval', async () => {
    const { getByText } = await setup(activeBot);
    await waitFor(() => expect(mockApiClient.getKlines).toHaveBeenCalledWith('BTCUSDT', '15m', 80));

    await fireEvent.press(getByText('1h'));

    await waitFor(() => expect(mockApiClient.getKlines).toHaveBeenCalledWith('BTCUSDT', '1h', 80));
  });

  it('fetches the bot\'s trade markers, independent of the portfolio/performance fetches', async () => {
    await setup(activeBot);
    await waitFor(() => expect(mockApiClient.getBotTrades).toHaveBeenCalledWith('bot-1'));
  });

  it('stays visible for a LIVE bot too -- the chart never changes between modes', async () => {
    mockApiClient.getBotPortfolio.mockResolvedValue(liveBotPortfolio);
    mockApiClient.getBotPerformance.mockResolvedValue(liveBotPerformance);
    const liveBot: Bot = { ...activeBot, executionMode: 'LIVE' };
    const { getByText } = await setup(liveBot);

    expect(getByText('GRÁFICO')).toBeTruthy();
    await waitFor(() => expect(mockApiClient.getKlines).toHaveBeenCalledWith('BTCUSDT', '15m', 80));
    await waitFor(() => expect(mockApiClient.getBotTrades).toHaveBeenCalledWith('bot-1'));
  });

  it('a chart fetch error shows a retry state, never crashing the rest of the screen', async () => {
    mockApiClient.getKlines.mockRejectedValue(new Error('network down'));
    const { getByText } = await setup(activeBot);

    await waitFor(() => expect(getByText('No se pudo cargar el gráfico.')).toBeTruthy());
    // The rest of the screen (portfolio card) is unaffected by the chart's own failure.
    await waitFor(() => expect(getByText(/Efectivo virtual/)).toBeTruthy());
  });
});
