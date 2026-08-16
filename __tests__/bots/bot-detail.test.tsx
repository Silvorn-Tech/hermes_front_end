import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import BotDetailScreen from '../../app/(app)/bots/[id]';
import { useHermesData } from '../../hooks/HermesDataContext';
import { Bot } from '../../types';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: { id: string } = { id: 'vortex' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

const mockUseHermesData = useHermesData as jest.Mock;

const liveBot: Bot = {
  id: 'vortex',
  name: 'Vortex',
  profile: 'Aggressive',
  status: 'ACTIVE',
  assetClass: 'CRYPTO',
  executionVenue: 'BINANCE',
  strategyModel: 'GARCH',
  returnPct: 7.6,
  exposure: { pct: 68, limitPct: 60 },
  lastSignalSummary: 'summary',
  lastSignalAt: new Date().toISOString(),
  strategyDescription: 'description',
};

async function setup(bot: Bot, setBotLifecycleStatus = jest.fn()) {
  mockUseHermesData.mockReturnValue({
    bots: [bot],
    activityEvents: [],
    signals: [],
    risk: { riskByBot: { vortex: 'normal', sentinel: 'normal', equilibrium: 'normal' } },
    setBotLifecycleStatus,
  });
  const view = await render(<BotDetailScreen />);
  return { setBotLifecycleStatus, ...view };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'vortex' };
});

describe('Bot detail — lifecycle actions distinguish Pause/Stop/Close Positions', () => {
  it('Pausar calls setBotLifecycleStatus with PAUSED for an ACTIVE bot', async () => {
    const { setBotLifecycleStatus, getByText } = await setup(liveBot);
    await fireEvent.press(getByText('Pausar'));
    expect(setBotLifecycleStatus).toHaveBeenCalledWith('vortex', 'PAUSED');
  });

  it('Detener requires confirmation, then calls setBotLifecycleStatus with STOPPED', async () => {
    const { setBotLifecycleStatus, getByText, getAllByText } = await setup(liveBot);
    await fireEvent.press(getByText('Detener'));
    expect(getByText('Vas a detener Vortex. Un bot detenido no puede reanudarse desde aquí.')).toBeTruthy();

    // The trigger button and the dialog's confirm button share the label
    // "Detener" — the confirm button is the one rendered by ConfirmDialog,
    // last in the tree.
    const detenerButtons = getAllByText('Detener');
    await fireEvent.press(detenerButtons[detenerButtons.length - 1]);
    await waitFor(() => expect(setBotLifecycleStatus).toHaveBeenCalledWith('vortex', 'STOPPED'));
  });

  it('a STOPPED bot has no Pausar/Detener buttons — no further local transitions', async () => {
    const { queryByText } = await setup({ ...liveBot, status: 'STOPPED' });
    expect(queryByText('Pausar')).toBeNull();
    expect(queryByText('Reanudar')).toBeNull();
    expect(queryByText('Detener')).toBeNull();
  });

  it('Cerrar posiciones shows a backend-pending notice on confirm, never a fake success', async () => {
    const { getByText, getAllByText, queryByText } = await setup(liveBot);
    expect(queryByText('Integración con backend pendiente')).toBeNull();

    await fireEvent.press(getByText('Cerrar posiciones'));
    const confirmButtons = getAllByText('Cerrar posiciones');
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(getByText('Integración con backend pendiente')).toBeTruthy());
  });
});
