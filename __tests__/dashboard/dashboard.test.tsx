import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../../app/(app)/dashboard';
import { useHermesData } from '../../hooks/HermesDataContext';
import { apiClient } from '../../services/api';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isDesktop: false }),
}));

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiClient: { getPortfolioHistory: jest.fn() },
  };
});

const mockUseHermesData = useHermesData as jest.Mock;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const baseValue = {
  status: 'ready',
  positions: [],
  positionsError: null,
  bots: [],
  signals: [],
  refresh: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  // PerformanceCard fetches on mount; a resolved-but-empty curve keeps it
  // out of these tests' concern (no bearing on bots/positions errors).
  mockApiClient.getPortfolioHistory.mockResolvedValue({ points: [], returnPct: null, maxDrawdownPct: null });
});

describe('Dashboard — fetch failures must be visible, never silently swallowed', () => {
  it('shows nothing wrong when both fetches succeeded (baseline)', async () => {
    mockUseHermesData.mockReturnValue(baseValue);
    const { queryByText } = await render(<DashboardScreen />);
    await waitFor(() => expect(mockApiClient.getPortfolioHistory).toHaveBeenCalled());
    expect(queryByText('No se pudieron cargar las posiciones.')).toBeNull();
  });

  it('renders ErrorState with the message when positionsError is set', async () => {
    mockUseHermesData.mockReturnValue({ ...baseValue, positionsError: 'network down' });
    const { getByText } = await render(<DashboardScreen />);
    expect(getByText('No se pudieron cargar las posiciones.')).toBeTruthy();
    expect(getByText('network down')).toBeTruthy();
  });
});
