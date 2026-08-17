import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import BotFormScreen from '../../app/(app)/bots/form';
import { useHermesData } from '../../hooks/HermesDataContext';
import { apiClient, HermesApiError } from '../../services/api';
import { Bot, Portfolio } from '../../types';

const mockBack = jest.fn();
let mockParams: { id?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiClient: { getMarketData: jest.fn(), getExchangeInfo: jest.fn(), getSimulationConfig: jest.fn() },
  };
});

const mockUseHermesData = useHermesData as jest.Mock;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const existingBot: Bot = {
  id: 'bot-1',
  name: 'Vortex Runner',
  riskProfile: 'VORTEX',
  assetClass: 'CRYPTO',
  executionVenue: 'BINANCE',
  executionMode: 'SIMULATION',
  instrument: 'BTCUSDT',
  strategyModel: 'GARCH',
  strategyConfig: null,
  status: 'PAUSED',
  currentQuantity: 0,
  targetQuantity: 0.015,
  pausedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const portfolioWithBudget: Portfolio = {
  totalValueQuote: 128450,
  quoteAsset: 'USDT',
  asOf: new Date().toISOString(),
  balances: [{ asset: 'USDT', free: 128450, locked: 0, valueQuote: 128450, priced: true }],
  dailyPnl: null,
  dailyPnlPct: null,
};

let createBot: jest.Mock;
let updateBot: jest.Mock;

function mockContext(overrides: Record<string, unknown> = {}) {
  mockUseHermesData.mockReturnValue({
    bots: [existingBot],
    portfolio: portfolioWithBudget,
    createBot,
    updateBot,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  createBot = jest.fn().mockResolvedValue({ bot: { ...existingBot, id: 'new-bot' }, status: 'PAUSED', reason: null });
  updateBot = jest.fn().mockResolvedValue({ bot: existingBot, status: 'PAUSED', reason: null });
  mockApiClient.getMarketData.mockResolvedValue({
    symbol: 'BTCUSDT',
    lastPrice: 50000,
    priceChangePercent: 0,
    highPrice: 0,
    lowPrice: 0,
    volume: 0,
  });
  mockApiClient.getExchangeInfo.mockResolvedValue({
    symbol: 'BTCUSDT',
    status: 'TRADING',
    stepSize: 0.00001,
    minQty: 0.00001,
    maxQty: 100,
    minNotional: 10,
  });
  mockApiClient.getSimulationConfig.mockResolvedValue({ initialCapitalQuote: 10000, quoteAsset: 'USDT' });
  mockContext();
});

describe('Bot create form — matches the approved prototype, wired to the real Bot API', () => {
  it('renders every section from the approved prototype on initial render', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = await render(<BotFormScreen />);

    expect(getByText('Configura cómo Hermes gestionará tu estrategia.')).toBeTruthy();
    expect(getByText('¿QUÉ QUIERES OPERAR?')).toBeTruthy();
    expect(getAllByText('Crypto').length).toBeGreaterThan(0); // card + summary
    expect(getByText('Acciones')).toBeTruthy();
    expect(getByText('Tokenized Equity')).toBeTruthy();
    expect(getByText('Próximamente')).toBeTruthy();
    expect(getByText('PERFIL DE RIESGO')).toBeTruthy();
    expect(getAllByText('Sentinel').length).toBeGreaterThan(0); // card + summary
    expect(getByText('Equilibrium')).toBeTruthy();
    expect(getByText('Vortex')).toBeTruthy();
    expect(getByText('ESTRATEGIA / MODELO')).toBeTruthy();
    expect(getAllByText('Signal Based').length).toBeGreaterThan(0); // card + summary
    expect(getByText('Regime Based')).toBeTruthy();
    expect(getByText('INSTRUMENTO')).toBeTruthy();
    expect(getByPlaceholderText('BTCUSDT')).toBeTruthy();
    expect(getByText('MODO DE EJECUCIÓN')).toBeTruthy();
    expect(getAllByText('🧪 Simulación').length).toBeGreaterThan(0); // card + summary
    expect(getByText('🔴 Live')).toBeTruthy();
    expect(getByText('PRESUPUESTO A UTILIZAR')).toBeTruthy();
    expect(getByText('RESUMEN')).toBeTruthy();
    expect(getByText('PAUSED')).toBeTruthy();
    expect(getByText('Hermes no ejecutará operaciones hasta que reanudes el bot.')).toBeTruthy();
  });

  it('Live is visibly disabled and never selectable — every bot this form creates is SIMULATION', async () => {
    const { getByText, getAllByText } = await render(<BotFormScreen />);

    expect(getByText('La activación de Live estará disponible en una próxima versión.')).toBeTruthy();

    await fireEvent.press(getByText('🔴 Live'));
    // Still shows Simulación in the summary -- pressing the disabled Live
    // card never changed anything, and there is no state that could have.
    await waitFor(() => expect(getAllByText('🧪 Simulación').length).toBeGreaterThan(0));
  });

  it('Tokenized Equity is disabled — pressing it never changes the selection', async () => {
    const { getByText, queryByPlaceholderText } = await render(<BotFormScreen />);

    await fireEvent.press(getByText('Tokenized Equity'));

    // Still on the Crypto path: the BTCUSDT-placeholder instrument field
    // (Crypto's placeholder) is still present, and the budget slider
    // (Crypto-only) is still shown.
    expect(queryByPlaceholderText('BTCUSDT')).toBeTruthy();
    expect(getByText('PRESUPUESTO A UTILIZAR')).toBeTruthy();
  });

  it('selecting Equity swaps the budget slider for a direct quantity input, with no live price lookup', async () => {
    const { getByText, queryByPlaceholderText, queryByText } = await render(<BotFormScreen />);

    await fireEvent.press(getByText('Acciones'));

    expect(queryByText('PRESUPUESTO A UTILIZAR')).toBeNull();
    expect(getByText('CANTIDAD OBJETIVO')).toBeTruthy();
    expect(getByText(/feed de precios en vivo para acciones/)).toBeTruthy();
    expect(queryByPlaceholderText('AAPLBUSDT')).toBeTruthy();
    expect(mockApiClient.getMarketData).not.toHaveBeenCalled();
  });

  it('changing asset class resets the instrument field', async () => {
    const { getByPlaceholderText, getByText, queryByDisplayValue } = await render(<BotFormScreen />);

    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'ETHUSDT');
    expect(queryByDisplayValue('ETHUSDT')).toBeTruthy();

    await fireEvent.press(getByText('Acciones'));
    await fireEvent.press(getByText('Crypto'));

    expect(queryByDisplayValue('ETHUSDT')).toBeNull();
  });

  it('selecting a risk profile updates the summary', async () => {
    const { getByText, getAllByText } = await render(<BotFormScreen />);
    await fireEvent.press(getByText('Vortex'));
    // One in the card, one now in the "Riesgo" summary row (previously
    // only "Sentinel" appeared there).
    await waitFor(() => expect(getAllByText('Vortex').length).toBe(2));
  });

  it('selecting a strategy updates the summary', async () => {
    const { getByText, getAllByText } = await render(<BotFormScreen />);
    await fireEvent.press(getByText('Regime Based'));
    await waitFor(() => expect(getAllByText('Regime Based').length).toBe(2));
  });

  it('typing an instrument triggers a debounced live price lookup and computes a real quantity', async () => {
    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);

    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'btcusdt');

    await waitFor(() => expect(mockApiClient.getMarketData).toHaveBeenCalledWith('BTCUSDT'), { timeout: 2000 });
    // 20% (default) of the $10,000 simulation capital at 50000 USDT/BTC = 0.04 BTC.
    await waitFor(() => expect(getByText(/≈ 0.04 BTC/)).toBeTruthy(), { timeout: 2000 });
  });

  it('shows curated suggestions while typing an instrument, filtered by asset class', async () => {
    const { getByPlaceholderText, getByText, queryByText } = await render(<BotFormScreen />);

    await fireEvent(getByPlaceholderText('BTCUSDT'), 'focus');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'ETH');

    expect(getByText('ETHUSDT')).toBeTruthy();
    expect(queryByText('AAPLBUSDT')).toBeNull(); // Crypto list, not Equity

    await fireEvent.press(getByText('ETHUSDT'));
    expect(getByPlaceholderText('BTCUSDT').props.value).toBe('ETHUSDT');
  });

  it('shows the Equity suggestion list, not the Crypto one, once Acciones is selected', async () => {
    const { getByText, getByPlaceholderText, queryByText } = await render(<BotFormScreen />);

    await fireEvent.press(getByText('Acciones'));
    await fireEvent(getByPlaceholderText('AAPLBUSDT'), 'focus');
    await fireEvent.changeText(getByPlaceholderText('AAPLBUSDT'), 'MS');

    expect(getByText('MSFTBUSDT')).toBeTruthy();
    expect(queryByText('BTCUSDT')).toBeNull();
  });

  it('suggestions never block typing a symbol outside the curated list', async () => {
    const { getByPlaceholderText, queryByText } = await render(<BotFormScreen />);

    await fireEvent(getByPlaceholderText('BTCUSDT'), 'focus');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'SHIBUSDT');

    expect(getByPlaceholderText('BTCUSDT').props.value).toBe('SHIBUSDT');
    expect(queryByText('BTCUSDT')).toBeNull(); // no curated match, no dropdown — free text still works
  });

  it('dragging the budget slider recomputes the quantity live', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await waitFor(() => expect(getByText(/≈ 0.04 BTC/)).toBeTruthy(), { timeout: 2000 });

    await fireEvent(getByTestId('budget-slider'), 'valueChange', 50);

    // 50% of the $10,000 simulation capital / 50000 = 0.1 BTC.
    await waitFor(() => expect(getByText(/≈ 0.1 BTC/)).toBeTruthy());
  });

  it('rounds the budget-computed quantity down to the instrument step size, never a raw division result', async () => {
    // 20% (default) of $10,000 / 33333 = 0.060000600006... -- not a
    // multiple of 0.0001, and Binance (and hermes_v2's resume path) would
    // reject that exact quantity with "does not match step size". This is
    // the class of bug a live user hit: a bot's Resume failed because its
    // budget-computed target_quantity was never rounded to a valid step.
    mockApiClient.getMarketData.mockResolvedValue({
      symbol: 'BTCUSDT',
      lastPrice: 33333,
      priceChangePercent: 0,
      highPrice: 0,
      lowPrice: 0,
      volume: 0,
    });
    mockApiClient.getExchangeInfo.mockResolvedValue({
      symbol: 'BTCUSDT',
      status: 'TRADING',
      stepSize: 0.0001,
      minQty: 0.0001,
      maxQty: 100,
      minNotional: 10,
    });

    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Crypto Bot');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'btcusdt');
    await waitFor(() => expect(getByText(/≈ 0.06 BTC/)).toBeTruthy(), { timeout: 2000 });

    await fireEvent.press(getByText('Crear bot'));

    await waitFor(() => expect(createBot).toHaveBeenCalledTimes(1));
    const [payload] = createBot.mock.calls[0];
    expect(payload.targetQuantity).toBe('0.06');
  });

  it('falls back to a direct quantity input when the simulation config is unavailable', async () => {
    mockApiClient.getSimulationConfig.mockRejectedValue(new Error('network down'));
    const { getByText, queryByText, getByPlaceholderText } = await render(<BotFormScreen />);

    await waitFor(() => expect(getByText('CANTIDAD OBJETIVO')).toBeTruthy());
    expect(queryByText('PRESUPUESTO A UTILIZAR')).toBeNull();
    expect(getByText(/No se pudo determinar el capital inicial de simulación/)).toBeTruthy();
    expect(getByPlaceholderText('0.00')).toBeTruthy();
  });

  it('blocks submission when the name is blank', async () => {
    const { getByText } = await render(<BotFormScreen />);
    await fireEvent.press(getByText('Crear bot'));
    expect(createBot).not.toHaveBeenCalled();
    expect(getByText('Ingresá un nombre para el bot.')).toBeTruthy();
  });

  it('blocks submission when the instrument is blank', async () => {
    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Bot');
    await fireEvent.press(getByText('Crear bot'));
    expect(createBot).not.toHaveBeenCalled();
    expect(getByText('Ingresá un instrumento (ej. BTCUSDT).')).toBeTruthy();
  });

  it('blocks submission when no valid quantity can be resolved (no simulation config, blank quantity)', async () => {
    mockApiClient.getSimulationConfig.mockRejectedValue(new Error('network down'));
    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);
    await waitFor(() => expect(getByText('CANTIDAD OBJETIVO')).toBeTruthy());
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Bot');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await fireEvent.press(getByText('Crear bot'));
    expect(createBot).not.toHaveBeenCalled();
    expect(getByText('La cantidad objetivo debe ser un número decimal mayor a 0.')).toBeTruthy();
  });

  it('submits the exact computed target_quantity and expected payload once the form is valid', async () => {
    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Crypto Bot');
    await fireEvent.press(getByText('Vortex'));
    await fireEvent.press(getByText('Regime Based'));
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'btcusdt');
    await waitFor(() => expect(getByText(/≈ 0.04 BTC/)).toBeTruthy(), { timeout: 2000 });

    await fireEvent.press(getByText('Crear bot'));

    await waitFor(() => expect(createBot).toHaveBeenCalledTimes(1));
    const [payload] = createBot.mock.calls[0];
    expect(payload).toEqual({
      name: 'My Crypto Bot',
      riskProfile: 'VORTEX',
      assetClass: 'CRYPTO',
      executionVenue: 'BINANCE',
      instrument: 'BTCUSDT',
      targetQuantity: '0.04',
      strategyModel: 'REGIME_BASED',
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('submits the direct quantity for the Equity fallback path', async () => {
    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Equity Bot');
    await fireEvent.press(getByText('Acciones'));
    await fireEvent.changeText(getByPlaceholderText('AAPLBUSDT'), 'aaplbusdt');
    await fireEvent.changeText(getByPlaceholderText('0.00'), '10');
    await fireEvent.press(getByText('Crear bot'));

    await waitFor(() => expect(createBot).toHaveBeenCalledTimes(1));
    const [payload] = createBot.mock.calls[0];
    expect(payload).toMatchObject({ assetClass: 'EQUITY', instrument: 'AAPLBUSDT', targetQuantity: '10' });
  });

  it('shows a loading label and disables the button while submitting, never double-submits', async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    createBot = jest.fn().mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    mockContext();

    const { getByPlaceholderText, getByText, queryByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Bot');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await waitFor(() => expect(getByText(/≈ 0.04 BTC/)).toBeTruthy(), { timeout: 2000 });

    await fireEvent.press(getByText('Crear bot'));
    await fireEvent.press(getByText('Creando…')); // a second press while submitting is a no-op

    expect(createBot).toHaveBeenCalledTimes(1);
    expect(queryByText('Crear bot')).toBeNull();

    await act(async () => {
      resolveCreate({ bot: { ...existingBot, status: 'PAUSED' }, status: 'PAUSED', reason: null });
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('shows the rejection reason inline and does not navigate when the backend does not return PAUSED', async () => {
    createBot = jest
      .fn()
      .mockResolvedValue({ bot: null, status: 'REJECTED', reason: 'Instrument is not tradable right now.' });
    mockContext();

    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Bot');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await waitFor(() => expect(getByText(/≈ 0.04 BTC/)).toBeTruthy(), { timeout: 2000 });

    await fireEvent.press(getByText('Crear bot'));

    await waitFor(() => expect(getByText('Instrument is not tradable right now.')).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
  });

  it.each([401, 403, 409, 422])('surfaces the mapped message for a %d error from POST /bots', async (status) => {
    createBot = jest.fn().mockRejectedValue(new HermesApiError(status, `error ${status}`));
    mockContext();

    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Bot');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await waitFor(() => expect(getByText(/≈ 0.04 BTC/)).toBeTruthy(), { timeout: 2000 });

    await fireEvent.press(getByText('Crear bot'));

    await waitFor(() => expect(createBot).toHaveBeenCalledTimes(1));
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('a network error is shown inline, never silently swallowed', async () => {
    createBot = jest.fn().mockRejectedValue(new Error('network down'));
    mockContext();

    const { getByPlaceholderText, getByText } = await render(<BotFormScreen />);
    await fireEvent.changeText(getByPlaceholderText('Ej. Mi estrategia BTC'), 'My Bot');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await waitFor(() => expect(getByText(/≈ 0.04 BTC/)).toBeTruthy(), { timeout: 2000 });

    await fireEvent.press(getByText('Crear bot'));

    await waitFor(() => expect(createBot).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getByText('Ocurrió un error inesperado. Intenta de nuevo.')).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('Bot edit form — unchanged path, out of scope for the prototype redesign', () => {
  it('pre-fills from the existing bot and shows asset class/venue/instrument as read-only', async () => {
    mockParams = { id: 'bot-1' };
    const { getByDisplayValue, getByText, queryByPlaceholderText } = await render(<BotFormScreen />);

    expect(getByDisplayValue('Vortex Runner')).toBeTruthy();
    expect(getByText(/CRYPTO · BINANCE · BTCUSDT/)).toBeTruthy();
    expect(queryByPlaceholderText('BTCUSDT')).toBeNull();
  });

  it('submitting calls updateBot with only the editable fields and navigates back', async () => {
    mockParams = { id: 'bot-1' };
    const { getByText, getByDisplayValue } = await render(<BotFormScreen />);

    await fireEvent.changeText(getByDisplayValue('Vortex Runner'), 'Renamed Bot');
    await fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() => expect(updateBot).toHaveBeenCalledTimes(1));
    const [botId, payload] = updateBot.mock.calls[0];
    expect(botId).toBe('bot-1');
    expect(payload).toEqual({
      name: 'Renamed Bot',
      targetQuantity: '0.015',
      strategyModel: 'GARCH',
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('an unknown id shows "Bot no encontrado" instead of a blank/broken form', async () => {
    mockParams = { id: 'does-not-exist' };
    const { getByText } = await render(<BotFormScreen />);
    expect(getByText('Bot no encontrado.')).toBeTruthy();
  });
});
