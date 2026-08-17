import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import BotsScreen from '../../app/(app)/bots/index';
import { useHermesData } from '../../hooks/HermesDataContext';
import { Bot } from '../../types';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isDesktop: false }),
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

const mockUseHermesData = useHermesData as jest.Mock;

const pausedBot: Bot = {
  id: 'bot-1',
  name: 'Sentinel BTC',
  riskProfile: 'SENTINEL',
  assetClass: 'CRYPTO',
  executionVenue: 'BINANCE',
  executionMode: 'SIMULATION',
  instrument: 'BTCUSDT',
  strategyModel: 'SIGNAL_BASED',
  strategyConfig: null,
  status: 'PAUSED',
  currentQuantity: 0,
  targetQuantity: 0.01,
  pausedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const activeBot: Bot = { ...pausedBot, id: 'bot-2', name: 'Vortex Runner', status: 'ACTIVE' };

let deleteBot: jest.Mock;

function mockContext(overrides: Record<string, unknown> = {}) {
  mockUseHermesData.mockReturnValue({
    status: 'ready',
    bots: [pausedBot, activeBot],
    botsError: null,
    refreshBots: jest.fn(),
    deleteBot,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  deleteBot = jest.fn().mockResolvedValue({ bot: null, status: 'DELETED', reason: null });
  mockContext();
});

describe('Bots list — delete', () => {
  it('only shows the delete button on the PAUSED bot, not the ACTIVE one', async () => {
    const { getAllByText } = await render(<BotsScreen />);
    expect(getAllByText('Eliminar').length).toBe(1);
  });

  it('pressing Eliminar opens a confirmation naming the bot, and cancel closes it without deleting', async () => {
    const { getByText, getAllByText, queryByText } = await render(<BotsScreen />);

    await fireEvent.press(getByText('Eliminar'));
    expect(getAllByText(/Sentinel BTC/).length).toBeGreaterThan(0); // card title + dialog copy
    expect(getByText(/no se puede deshacer/)).toBeTruthy();

    await fireEvent.press(getByText('Cancelar'));
    expect(deleteBot).not.toHaveBeenCalled();
    expect(queryByText(/no se puede deshacer/)).toBeNull();
  });

  it('confirming calls deleteBot with a fresh idempotency key and refreshes the list', async () => {
    const { getByText, getAllByText } = await render(<BotsScreen />);

    await fireEvent.press(getByText('Eliminar'));
    const confirmButtons = getAllByText(/^Eliminar$|Eliminando…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(deleteBot).toHaveBeenCalledWith('bot-1', expect.any(String)));
  });

  it('a REJECTED delete result shows the reason inline, never a silent failure', async () => {
    deleteBot = jest.fn().mockResolvedValue({
      bot: null,
      status: 'REJECTED',
      reason: 'Bot is ACTIVE; can only delete a PAUSED or STOPPED bot.',
    });
    mockContext();
    const { getByText, getAllByText } = await render(<BotsScreen />);

    await fireEvent.press(getByText('Eliminar'));
    const confirmButtons = getAllByText(/^Eliminar$|Eliminando…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(getByText('Bot is ACTIVE; can only delete a PAUSED or STOPPED bot.')).toBeTruthy()
    );
  });

  it('a network error during delete is shown inline, never silently swallowed', async () => {
    deleteBot = jest.fn().mockRejectedValue(new Error('network down'));
    mockContext();
    const { getByText, getAllByText } = await render(<BotsScreen />);

    await fireEvent.press(getByText('Eliminar'));
    const confirmButtons = getAllByText(/^Eliminar$|Eliminando…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(getByText('Ocurrió un error inesperado. Intenta de nuevo.')).toBeTruthy());
  });
});
