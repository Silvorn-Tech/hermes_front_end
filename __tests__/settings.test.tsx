import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../app/(app)/settings';
import { useAuth } from '../hooks/AuthContext';
import { apiClient, HermesApiError } from '../services/api';

jest.mock('../hooks/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api', () => {
  const actual = jest.requireActual('../services/api');
  return {
    ...actual,
    apiClient: {
      getSimulationConfig: jest.fn(),
      getTradingSwitch: jest.fn(),
      setTradingSwitch: jest.fn(),
      getBinanceCredentialStatus: jest.fn(),
      connectBinanceCredentials: jest.fn(),
      disconnectBinanceCredentials: jest.fn(),
      getUserRiskLimits: jest.fn(),
      updateUserRiskLimits: jest.fn(),
      getSimulationRiskLimits: jest.fn(),
      updateSimulationRiskLimits: jest.fn(),
    },
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const DEFAULT_RISK_LIMITS = {
  maxOrderNotionalQuote: null,
  maxSymbolExposurePct: null,
  maxTotalExposurePct: null,
  maxDailyLossPct: null,
  maxOpenPositions: null,
  allowedSymbols: null,
};

const DEFAULT_SIMULATION_RISK_LIMITS = {
  maxOrderNotionalQuote: 1000,
  maxSymbolExposurePct: 50,
  maxTotalExposurePct: 100,
  maxDailyLossPct: 20,
  maxOpenPositions: 5,
  allowedSymbols: ['BTCUSDT', 'ETHUSDT'],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { name: 'Carlo', email: 'carlo@example.com' },
    signOut: jest.fn(),
  });
  mockApiClient.getSimulationConfig.mockResolvedValue({ initialCapitalQuote: 10000, quoteAsset: 'USDT' });
  mockApiClient.getTradingSwitch.mockResolvedValue({ enabled: true });
  mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
    configured: false,
    apiKeyLast4: null,
    verifiedAt: null,
    updatedAt: null,
  });
  mockApiClient.getUserRiskLimits.mockResolvedValue({ ...DEFAULT_RISK_LIMITS });
  mockApiClient.getSimulationRiskLimits.mockResolvedValue({ ...DEFAULT_SIMULATION_RISK_LIMITS });
});

describe('Settings — Trading Safety', () => {
  it('shows the read-only default mode and the real simulation initial capital once it loads', async () => {
    const { getByText } = await render(<SettingsScreen />);

    expect(getByText('TRADING SAFETY')).toBeTruthy();
    expect(getByText('🧪 Simulación')).toBeTruthy();
    await waitFor(() => expect(getByText('$10,000 USDT')).toBeTruthy());
    expect(getByText(/No es editable desde el frontend/)).toBeTruthy();
  });

  it('reflects a reconfigured HERMES_SIMULATION_INITIAL_CAPITAL_USD, never a hardcoded 10000', async () => {
    mockApiClient.getSimulationConfig.mockResolvedValue({ initialCapitalQuote: 25000, quoteAsset: 'USDT' });

    const { getByText, queryByText } = await render(<SettingsScreen />);

    await waitFor(() => expect(getByText('$25,000 USDT')).toBeTruthy());
    expect(queryByText('$10,000 USDT')).toBeNull();
  });

  it('shows a dash, never a fabricated number, when the config fetch fails', async () => {
    mockApiClient.getSimulationConfig.mockRejectedValue(new Error('network down'));

    const { getByText } = await render(<SettingsScreen />);

    await waitFor(() => expect(getByText('—')).toBeTruthy());
  });

  it('never shows an "Editar" control near the simulation default — read-only, no write path', async () => {
    const { queryByText } = await render(<SettingsScreen />);

    await waitFor(() => expect(queryByText('$10,000 USDT')).toBeTruthy());
    // "Guardar" now legitimately exists elsewhere on this screen (the
    // real, editable risk-limits section below) — "Editar" never appears
    // anywhere, which is the invariant this test actually protects.
    expect(queryByText('Editar')).toBeNull();
  });
});

describe('Settings — personal trading switch', () => {
  it('loads and shows the current per-user switch state', async () => {
    mockApiClient.getTradingSwitch.mockResolvedValue({ enabled: true });

    const { getByText, getByRole } = await render(<SettingsScreen />);

    expect(getByText('Mi trading')).toBeTruthy();
    await waitFor(() => expect(getByRole('switch').props.value).toBe(true));
  });

  it('toggling off calls the API and reflects the new state', async () => {
    mockApiClient.getTradingSwitch.mockResolvedValue({ enabled: true });
    mockApiClient.setTradingSwitch.mockResolvedValue({ enabled: false });

    const { getByRole } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByRole('switch').props.value).toBe(true));

    await fireEvent(getByRole('switch'), 'valueChange', false);

    await waitFor(() => expect(mockApiClient.setTradingSwitch).toHaveBeenCalledWith(false, expect.any(String)));
    await waitFor(() => expect(getByRole('switch').props.value).toBe(false));
  });

  it('reverts to the previous value if the toggle request fails', async () => {
    mockApiClient.getTradingSwitch.mockResolvedValue({ enabled: true });
    mockApiClient.setTradingSwitch.mockRejectedValue(new HermesApiError(500, 'boom'));

    const { getByRole, getByText } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByRole('switch').props.value).toBe(true));

    await fireEvent(getByRole('switch'), 'valueChange', false);

    await waitFor(() => expect(getByRole('switch').props.value).toBe(true));
    expect(getByText(/Ocurrió un error interno/)).toBeTruthy();
  });
});

describe('Settings — Binance account', () => {
  it('shows the connect form when no account is connected', async () => {
    mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
      configured: false,
      apiKeyLast4: null,
      verifiedAt: null,
      updatedAt: null,
    });

    const { getByText, getByPlaceholderText } = await render(<SettingsScreen />);

    await waitFor(() => expect(getByText('Conectar')).toBeTruthy());
    expect(getByPlaceholderText('Binance API Key')).toBeTruthy();
    expect(getByPlaceholderText('Binance API Secret')).toBeTruthy();
  });

  it('shows the masked key and verified time when an account is already connected', async () => {
    mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
      configured: true,
      apiKeyLast4: '1234',
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { getByText } = await render(<SettingsScreen />);

    await waitFor(() => expect(getByText('Cuenta conectada')).toBeTruthy());
    expect(getByText('Desconectar')).toBeTruthy();
  });

  it('submits the typed key/secret and shows the connected state on success', async () => {
    mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
      configured: false,
      apiKeyLast4: null,
      verifiedAt: null,
      updatedAt: null,
    });
    mockApiClient.connectBinanceCredentials.mockResolvedValue({
      connected: true,
      apiKeyLast4: '5678',
      verifiedAt: new Date().toISOString(),
    });

    const { getByText, getByPlaceholderText } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByText('Conectar')).toBeTruthy());

    await fireEvent.changeText(getByPlaceholderText('Binance API Key'), 'my-real-key-5678');
    await fireEvent.changeText(getByPlaceholderText('Binance API Secret'), 'my-real-secret');
    await fireEvent.press(getByText('Conectar'));

    await waitFor(() =>
      expect(mockApiClient.connectBinanceCredentials).toHaveBeenCalledWith(
        { apiKey: 'my-real-key-5678', apiSecret: 'my-real-secret' },
        expect.any(String)
      )
    );
    await waitFor(() => expect(getByText('Cuenta conectada')).toBeTruthy());
  });

  it('shows the backend rejection reason inline on a verification failure, never a thrown error page', async () => {
    mockApiClient.getBinanceCredentialStatus.mockResolvedValue({
      configured: false,
      apiKeyLast4: null,
      verifiedAt: null,
      updatedAt: null,
    });
    mockApiClient.connectBinanceCredentials.mockResolvedValue({
      connected: false,
      reason: 'This API key has withdrawals enabled.',
    });

    const { getByText, getByPlaceholderText } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByText('Conectar')).toBeTruthy());

    await fireEvent.changeText(getByPlaceholderText('Binance API Key'), 'unsafe-key-0000');
    await fireEvent.changeText(getByPlaceholderText('Binance API Secret'), 'unsafe-secret');
    await fireEvent.press(getByText('Conectar'));

    await waitFor(() => expect(getByText('This API key has withdrawals enabled.')).toBeTruthy());
    // Still not connected — the form stays visible, not a fabricated success.
    expect(getByText('Conectar')).toBeTruthy();
  });
});

describe('Settings — risk limits', () => {
  it('loads the current limits, showing empty fields when nothing is configured', async () => {
    mockApiClient.getUserRiskLimits.mockResolvedValue({ ...DEFAULT_RISK_LIMITS });

    const { getAllByText, getByPlaceholderText } = await render(<SettingsScreen />);

    // Two "Guardar" buttons now exist (real-order limits + Simulation
    // limits, each its own section) -- this section is real-order limits,
    // identified by its own placeholder ("Ej. 5000" is unique to it).
    await waitFor(() => expect(getAllByText('Guardar').length).toBe(2));
    expect(getByPlaceholderText('Ej. 5000').props.value).toBe('');
  });

  it('saves the typed limits and reflects the persisted values', async () => {
    mockApiClient.getUserRiskLimits.mockResolvedValue({ ...DEFAULT_RISK_LIMITS });
    mockApiClient.updateUserRiskLimits.mockResolvedValue({
      ...DEFAULT_RISK_LIMITS,
      maxOrderNotionalQuote: 5000,
      allowedSymbols: ['BTCUSDT', 'ETHUSDT'],
    });

    const { getAllByText, getByPlaceholderText, getByDisplayValue } = await render(<SettingsScreen />);
    await waitFor(() => expect(getAllByText('Guardar').length).toBe(2));

    await fireEvent.changeText(getByPlaceholderText('Ej. 5000'), '5000');
    await fireEvent.press(getAllByText('Guardar')[0]);

    await waitFor(() => expect(mockApiClient.updateUserRiskLimits).toHaveBeenCalled());
    await waitFor(() => expect(getAllByText('Guardado.').length).toBeGreaterThan(0));
    expect(getByDisplayValue('5000')).toBeTruthy();
  });

  it('shows an inline error, never a thrown crash, when saving fails', async () => {
    mockApiClient.getUserRiskLimits.mockResolvedValue({ ...DEFAULT_RISK_LIMITS });
    mockApiClient.updateUserRiskLimits.mockRejectedValue(new HermesApiError(422, 'must be greater than 0'));

    const { getAllByText, getByText } = await render(<SettingsScreen />);
    await waitFor(() => expect(getAllByText('Guardar').length).toBe(2));

    await fireEvent.press(getAllByText('Guardar')[0]);

    await waitFor(() => expect(getByText('must be greater than 0')).toBeTruthy());
  });
});

describe('Settings — Simulation risk limits', () => {
  it('loads pre-filled with sensible defaults, never blank', async () => {
    const { getByPlaceholderText } = await render(<SettingsScreen />);

    await waitFor(() => expect(getByPlaceholderText('Ej. 1000').props.value).toBe('1000'));
    expect(getByPlaceholderText('Ej. 50').props.value).toBe('50');
    expect(getByPlaceholderText('Ej. BTCUSDT, ETHUSDT').props.value).toBe('BTCUSDT, ETHUSDT');
  });

  it('saves the edited limits and reflects the persisted values', async () => {
    mockApiClient.updateSimulationRiskLimits.mockResolvedValue({
      ...DEFAULT_SIMULATION_RISK_LIMITS,
      maxOrderNotionalQuote: 2000,
    });

    const { getAllByText, getByPlaceholderText, getByDisplayValue } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByPlaceholderText('Ej. 1000').props.value).toBe('1000'));

    await fireEvent.changeText(getByPlaceholderText('Ej. 1000'), '2000');
    await fireEvent.press(getAllByText('Guardar')[1]);

    await waitFor(() => expect(mockApiClient.updateSimulationRiskLimits).toHaveBeenCalled());
    expect(getByDisplayValue('2000')).toBeTruthy();
  });

  it('pressing Guardar with a required field cleared never calls the API -- unlike real limits, empty is never valid here', async () => {
    const { getAllByText, getByPlaceholderText } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByPlaceholderText('Ej. BTCUSDT, ETHUSDT').props.value).toBe('BTCUSDT, ETHUSDT'));

    await fireEvent.changeText(getByPlaceholderText('Ej. BTCUSDT, ETHUSDT'), '');
    await fireEvent.press(getAllByText('Guardar')[1]);

    expect(mockApiClient.updateSimulationRiskLimits).not.toHaveBeenCalled();
  });

  it('shows an inline error, never a thrown crash, when saving fails', async () => {
    mockApiClient.updateSimulationRiskLimits.mockRejectedValue(
      new HermesApiError(422, 'must be greater than 0')
    );

    const { getAllByText, getByText, getByPlaceholderText } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByPlaceholderText('Ej. 1000').props.value).toBe('1000'));

    await fireEvent.press(getAllByText('Guardar')[1]);

    await waitFor(() => expect(getByText('must be greater than 0')).toBeTruthy());
  });
});
