import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import BotDetailScreen from '../../app/(app)/bots/[id]';
import { useHermesData } from '../../hooks/HermesDataContext';
import { Bot } from '../../types';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: { id: string } = { id: 'bot-1' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

const mockUseHermesData = useHermesData as jest.Mock;

const activeBot: Bot = {
  id: 'bot-1',
  name: 'Vortex Runner',
  riskProfile: 'VORTEX',
  assetClass: 'CRYPTO',
  executionVenue: 'BINANCE',
  instrument: 'BTCUSDT',
  strategyModel: 'GARCH',
  strategyConfig: null,
  status: 'ACTIVE',
  currentQuantity: 0.015,
  targetQuantity: 0.015,
  pausedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function contextValue(bot: Bot, overrides: Record<string, jest.Mock> = {}) {
  return {
    bots: [bot],
    pauseBot: jest.fn().mockResolvedValue({ bot: { ...bot, status: 'PAUSED' }, status: 'PAUSED', reason: null }),
    resumeBot: jest.fn().mockResolvedValue({ bot: { ...bot, status: 'ACTIVE' }, status: 'ACTIVE', reason: null }),
    stopBot: jest.fn().mockResolvedValue({ bot: { ...bot, status: 'STOPPED' }, status: 'STOPPED', reason: null }),
    ...overrides,
  };
}

async function setup(bot: Bot, overrides: Record<string, jest.Mock> = {}) {
  const value = contextValue(bot, overrides);
  mockUseHermesData.mockReturnValue(value);
  const view = await render(<BotDetailScreen />);
  return { ...value, ...view };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'bot-1' };
});

describe('Bot detail — real pause/resume/stop', () => {
  it('Pause Bot shows the exact confirmation copy and calls pauseBot on confirm', async () => {
    const { pauseBot, getByText, getAllByText } = await setup(activeBot);

    await fireEvent.press(getByText('Pause Bot'));
    expect(
      getByText(
        'Pausing this bot will close its current position. The bot will save its current target exposure and can restore it when resumed.'
      )
    ).toBeTruthy();

    const confirmButtons = getAllByText(/Pause Bot|Closing position…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(pauseBot).toHaveBeenCalledWith('bot-1', expect.any(String)));
  });

  it('Resume Bot shows the exact confirmation copy and calls resumeBot on confirm', async () => {
    const pausedBot: Bot = { ...activeBot, status: 'PAUSED', currentQuantity: 0 };
    const { resumeBot, getByText, getAllByText } = await setup(pausedBot);

    await fireEvent.press(getByText('Resume Bot'));
    expect(
      getByText(
        'Resuming this bot will open a new position using the target exposure saved when the bot was paused.'
      )
    ).toBeTruthy();

    const confirmButtons = getAllByText(/Resume Bot|Opening position…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(resumeBot).toHaveBeenCalledWith('bot-1', expect.any(String)));
  });

  it('a STOPPED bot has no Pause/Resume/Stop/Edit actions — fully terminal', async () => {
    const { queryByText } = await setup({ ...activeBot, status: 'STOPPED' });
    expect(queryByText('Pause Bot')).toBeNull();
    expect(queryByText('Resume Bot')).toBeNull();
    expect(queryByText('Detener')).toBeNull();
    expect(queryByText('Editar')).toBeNull();
  });

  it('Editar is only available while PAUSED', async () => {
    const { getByText, rerender } = await setup({ ...activeBot, status: 'PAUSED' });
    expect(getByText('Editar')).toBeTruthy();

    mockUseHermesData.mockReturnValue(contextValue(activeBot)); // ACTIVE
    await rerender(<BotDetailScreen />);
    expect(() => getByText('Editar')).toThrow();
  });

  it('a REJECTED pause result shows the reason inline, never a silent failure', async () => {
    const pauseBot = jest.fn().mockResolvedValue({
      bot: activeBot,
      status: 'REJECTED',
      reason: 'HERMES_RISK_ALLOWED_SYMBOLS is not configured',
    });
    const { getByText, getAllByText } = await setup(activeBot, { pauseBot });

    await fireEvent.press(getByText('Pause Bot'));
    const confirmButtons = getAllByText(/Pause Bot|Closing position…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(getByText('HERMES_RISK_ALLOWED_SYMBOLS is not configured')).toBeTruthy()
    );
  });

  it('an ERROR result is shown clearly as requiring manual review', async () => {
    const resumeBot = jest.fn().mockResolvedValue({
      bot: { ...activeBot, status: 'ERROR' },
      status: 'ERROR',
      reason: 'Order outcome could not be confirmed; manual review required.',
    });
    const pausedBot: Bot = { ...activeBot, status: 'PAUSED' };
    const { getByText, getAllByText } = await setup(pausedBot, { resumeBot });

    await fireEvent.press(getByText('Resume Bot'));
    const confirmButtons = getAllByText(/Resume Bot|Opening position…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(getByText(/requiere revisión manual/)).toBeTruthy());
  });

  it('Detener requires a strong confirmation and calls stopBot', async () => {
    const { stopBot, getByText, getAllByText } = await setup(activeBot);

    await fireEvent.press(getByText('Detener'));
    expect(getByText(/de forma PERMANENTE/)).toBeTruthy();

    const confirmButtons = getAllByText(/Detener|Deteniendo…/);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(stopBot).toHaveBeenCalledWith('bot-1', expect.any(String)));
  });
});
