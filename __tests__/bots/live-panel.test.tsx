import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { LivePanel } from '../../components/bots/LivePanel';
import { apiClient } from '../../services/api';

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiClient: {
      getBotPortfolio: jest.fn(),
      getBotPerformance: jest.fn(),
    },
  };
});

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const livePortfolio = {
  available: true as const,
  executionMode: 'LIVE' as const,
  quoteAsset: 'USDT',
  currentQuantity: 0.015,
  positionValueQuote: 750,
  totalValueQuote: 750,
  returnPct: null,
};

const livePerformance = {
  available: true as const,
  executionMode: 'LIVE' as const,
  totalValueQuote: 750,
  returnPct: null,
  maxDrawdownPct: null,
  realizedPnlTodayQuote: 10,
  tradeCount: 1,
  winRatePct: 100,
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders the real position/value/trade stats once both fetches resolve', async () => {
  mockApiClient.getBotPortfolio.mockResolvedValue(livePortfolio);
  mockApiClient.getBotPerformance.mockResolvedValue(livePerformance);

  const { getByText } = await render(<LivePanel botId="bot-1" />);

  await waitFor(() => expect(getByText('Valor de posición (real)')).toBeTruthy());
  expect(getByText('Operaciones cerradas')).toBeTruthy();
  expect(getByText('1')).toBeTruthy();
});

it('never fabricates return/drawdown -- both always render as a dash', async () => {
  mockApiClient.getBotPortfolio.mockResolvedValue(livePortfolio);
  mockApiClient.getBotPerformance.mockResolvedValue(livePerformance);

  const { getAllByText } = await render(<LivePanel botId="bot-1" />);

  await waitFor(() => expect(getAllByText('—').length).toBeGreaterThanOrEqual(2));
});

it('never renders the SIMULATION-only cash/exposure rows', async () => {
  mockApiClient.getBotPortfolio.mockResolvedValue(livePortfolio);
  mockApiClient.getBotPerformance.mockResolvedValue(livePerformance);

  const { queryByText } = await render(<LivePanel botId="bot-1" />);

  await waitFor(() => expect(queryByText('Valor de posición (real)')).toBeTruthy());
  expect(queryByText(/Efectivo virtual/)).toBeNull();
  expect(queryByText('Exposición')).toBeNull();
});

it('shows a retry state, never a crash, when the fetch fails', async () => {
  mockApiClient.getBotPortfolio.mockRejectedValue(new Error('network down'));
  mockApiClient.getBotPerformance.mockResolvedValue(livePerformance);

  const { getByText } = await render(<LivePanel botId="bot-1" />);

  await waitFor(() => expect(getByText('No se pudo cargar el portfolio en vivo.')).toBeTruthy());
  expect(getByText('Reintentar')).toBeTruthy();
});

it('shows the reason, not a crash, when the backend reports unavailable', async () => {
  mockApiClient.getBotPortfolio.mockResolvedValue({ available: false, reason: 'Bot not found.' });
  mockApiClient.getBotPerformance.mockResolvedValue({ available: false, reason: 'Bot not found.' });

  const { getByText } = await render(<LivePanel botId="bot-1" />);

  await waitFor(() => expect(getByText('Bot not found.')).toBeTruthy());
});
