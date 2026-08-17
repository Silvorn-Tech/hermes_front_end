import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PerformanceCard } from '../../components/dashboard/PerformanceCard';
import { apiClient, HermesApiError } from '../../services/api';

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiClient: { getPortfolioHistory: jest.fn() },
  };
});

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PerformanceCard — self-fetching states', () => {
  it('shows an empty state when the history has fewer than 2 points, never a chart or a fabricated return', async () => {
    mockApiClient.getPortfolioHistory.mockResolvedValue({ points: [], returnPct: null, maxDrawdownPct: null });

    const { getByText } = await render(<PerformanceCard />);

    await waitFor(() => expect(getByText('Histórico de rendimiento aún no disponible.')).toBeTruthy());
  });

  it('renders the equity chart and real return/drawdown on success', async () => {
    mockApiClient.getPortfolioHistory.mockResolvedValue({
      points: [
        { t: '2026-08-15T00:00:00Z', v: 1000 },
        { t: '2026-08-16T00:00:00Z', v: 1100 },
      ],
      returnPct: 10,
      maxDrawdownPct: 2.5,
    });

    const { getByText, queryByText } = await render(<PerformanceCard />);

    await waitFor(() => expect(getByText('+10.0%')).toBeTruthy());
    expect(getByText('2.5%')).toBeTruthy();
    expect(queryByText('Histórico de rendimiento aún no disponible.')).toBeNull();
  });

  it('shows an ErrorState with a retry action when the fetch fails', async () => {
    mockApiClient.getPortfolioHistory.mockRejectedValue(new HermesApiError(500, 'boom'));

    const { getByText } = await render(<PerformanceCard />);

    await waitFor(() => expect(getByText('No se pudo cargar el histórico.')).toBeTruthy());
  });

  it('retries the fetch when Reintentar is pressed', async () => {
    mockApiClient.getPortfolioHistory.mockRejectedValueOnce(new HermesApiError(500, 'boom'));
    mockApiClient.getPortfolioHistory.mockResolvedValueOnce({
      points: [
        { t: '2026-08-15T00:00:00Z', v: 1000 },
        { t: '2026-08-16T00:00:00Z', v: 1050 },
      ],
      returnPct: 5,
      maxDrawdownPct: 0,
    });

    const { getByText, queryByText } = await render(<PerformanceCard />);
    await waitFor(() => expect(getByText('No se pudo cargar el histórico.')).toBeTruthy());

    await fireEvent.press(getByText('Reintentar'));

    await waitFor(() => expect(queryByText('No se pudo cargar el histórico.')).toBeNull());
    expect(mockApiClient.getPortfolioHistory).toHaveBeenCalledTimes(2);
  });

  it('refetches with the mapped backend period when the tab changes', async () => {
    mockApiClient.getPortfolioHistory.mockResolvedValue({ points: [], returnPct: null, maxDrawdownPct: null });

    const { getByText } = await render(<PerformanceCard />);
    await waitFor(() => expect(mockApiClient.getPortfolioHistory).toHaveBeenCalledWith('1M'));

    await fireEvent.press(getByText('7D'));

    await waitFor(() => expect(mockApiClient.getPortfolioHistory).toHaveBeenCalledWith('7D'));
  });

  it('treats a malformed response (points missing entirely) as an error, not a crash', async () => {
    mockApiClient.getPortfolioHistory.mockResolvedValue(undefined as never);

    const { getByText } = await render(<PerformanceCard />);

    await waitFor(() => expect(getByText('No se pudo cargar el histórico.')).toBeTruthy());
  });
});
