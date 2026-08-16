import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HermesDataProvider, useHermesData } from '../../hooks/HermesDataContext';
import { useAuth } from '../../hooks/AuthContext';
import { apiClient, HermesApiError } from '../../services/api';

jest.mock('../../hooks/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiClient: {
      getPortfolio: jest.fn(),
      getPositions: jest.fn(),
      getOrders: jest.fn(),
      closePosition: jest.fn(),
      cancelOrder: jest.fn(),
      createOrder: jest.fn(),
    },
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

function Harness() {
  const { closePosition, cancelOrder, createOrder } = useHermesData();
  return (
    <>
      <Pressable onPress={() => void closePosition('BTCUSDT', 'key-1').catch(() => {})}>
        <Text>close</Text>
      </Pressable>
      <Pressable onPress={() => void cancelOrder('order-1', 'key-2').catch(() => {})}>
        <Text>cancel</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          void createOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: '1' }, 'key-3').catch(() => {})
        }
      >
        <Text>create</Text>
      </Pressable>
    </>
  );
}

async function setup() {
  const signOut = jest.fn();
  mockUseAuth.mockReturnValue({ isAuthorized: true, signOut });
  mockApiClient.getPortfolio.mockResolvedValue({
    totalValueQuote: 0,
    quoteAsset: 'USDT',
    asOf: new Date().toISOString(),
    balances: [],
    dailyPnl: null,
    dailyPnlPct: null,
    equityCurves: null,
  });
  mockApiClient.getPositions.mockResolvedValue([]);
  mockApiClient.getOrders.mockResolvedValue({ orders: [], count: 0 });

  const view = await render(
    <HermesDataProvider>
      <Harness />
    </HermesDataProvider>
  );
  return { signOut, ...view };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HermesDataContext mutations — a dead session forces sign-out, matching background refresh', () => {
  it('closePosition signs out on a 401', async () => {
    mockApiClient.closePosition.mockRejectedValue(new HermesApiError(401, 'session expired'));
    const { signOut, getByText } = await setup();

    await fireEvent.press(getByText('close'));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('cancelOrder signs out on a 401', async () => {
    mockApiClient.cancelOrder.mockRejectedValue(new HermesApiError(401, 'session expired'));
    const { signOut, getByText } = await setup();

    await fireEvent.press(getByText('cancel'));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('createOrder signs out on a 401', async () => {
    mockApiClient.createOrder.mockRejectedValue(new HermesApiError(401, 'session expired'));
    const { signOut, getByText } = await setup();

    await fireEvent.press(getByText('create'));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('does not sign out on a non-401 mutation error (e.g. 409 idempotency conflict)', async () => {
    mockApiClient.closePosition.mockRejectedValue(new HermesApiError(409, 'already in progress'));
    const { signOut, getByText } = await setup();

    await fireEvent.press(getByText('close'));
    await waitFor(() => expect(mockApiClient.closePosition).toHaveBeenCalledTimes(1));
    expect(signOut).not.toHaveBeenCalled();
  });
});
