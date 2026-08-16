import React from 'react';
import { render } from '@testing-library/react-native';
import DashboardScreen from '../../app/(app)/dashboard';
import { useHermesData } from '../../hooks/HermesDataContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isDesktop: false }),
}));

const mockUseHermesData = useHermesData as jest.Mock;

const baseValue = {
  status: 'ready',
  portfolio: null,
  portfolioError: null,
  positions: [],
  positionsError: null,
  bots: [],
  signals: [],
  refresh: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Dashboard — fetch failures must be visible, never silently swallowed', () => {
  it('shows nothing wrong when both fetches succeeded (baseline)', async () => {
    mockUseHermesData.mockReturnValue(baseValue);
    const { queryByText } = await render(<DashboardScreen />);
    expect(queryByText('No se pudo cargar el portfolio.')).toBeNull();
    expect(queryByText('No se pudieron cargar las posiciones.')).toBeNull();
  });

  it('renders ErrorState with the message when portfolioError is set', async () => {
    mockUseHermesData.mockReturnValue({ ...baseValue, portfolioError: 'boom' });
    const { getByText } = await render(<DashboardScreen />);
    expect(getByText('No se pudo cargar el portfolio.')).toBeTruthy();
    expect(getByText('boom')).toBeTruthy();
  });

  it('renders ErrorState with the message when positionsError is set', async () => {
    mockUseHermesData.mockReturnValue({ ...baseValue, positionsError: 'network down' });
    const { getByText } = await render(<DashboardScreen />);
    expect(getByText('No se pudieron cargar las posiciones.')).toBeTruthy();
    expect(getByText('network down')).toBeTruthy();
  });
});
