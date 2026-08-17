import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../app/(app)/settings';
import { useAuth } from '../hooks/AuthContext';
import { apiClient } from '../services/api';

jest.mock('../hooks/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api', () => {
  const actual = jest.requireActual('../services/api');
  return {
    ...actual,
    apiClient: { getSimulationConfig: jest.fn() },
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { name: 'Carlo', email: 'carlo@example.com' },
    signOut: jest.fn(),
  });
});

describe('Settings — Trading Safety', () => {
  it('shows the read-only default mode and the real simulation initial capital once it loads', async () => {
    mockApiClient.getSimulationConfig.mockResolvedValue({ initialCapitalQuote: 10000, quoteAsset: 'USDT' });

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

  it('never shows a "Save"/"Edit" control near the simulation default — read-only, no write path', async () => {
    mockApiClient.getSimulationConfig.mockResolvedValue({ initialCapitalQuote: 10000, quoteAsset: 'USDT' });
    const { queryByText } = await render(<SettingsScreen />);

    await waitFor(() => expect(queryByText('$10,000 USDT')).toBeTruthy());
    expect(queryByText('Guardar')).toBeNull();
    expect(queryByText('Editar')).toBeNull();
  });
});
