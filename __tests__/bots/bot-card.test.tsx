import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BotCard } from '../../components/bots/BotCard';
import { Bot } from '../../types';

const baseBot: Bot = {
  id: 'bot-1',
  name: 'Vortex Runner',
  riskProfile: 'VORTEX',
  assetClass: 'CRYPTO',
  executionVenue: 'BINANCE',
  executionMode: 'SIMULATION',
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

describe('BotCard — execution mode badge', () => {
  it('shows a text-and-emoji SIMULATION badge, never color-only', async () => {
    const { getByText } = await render(<BotCard bot={baseBot} />);
    expect(getByText('🧪 SIMULACIÓN')).toBeTruthy();
  });

  it('shows a text-and-emoji LIVE badge for a LIVE bot', async () => {
    const { getByText } = await render(<BotCard bot={{ ...baseBot, executionMode: 'LIVE' }} />);
    expect(getByText('🔴 LIVE')).toBeTruthy();
  });

  it('shows the badge in the compact variant too', async () => {
    const { getByText } = await render(<BotCard bot={baseBot} variant="compact" />);
    expect(getByText('🧪 SIMULACIÓN')).toBeTruthy();
  });
});

describe('BotCard — delete button', () => {
  it('is not shown for an ACTIVE bot, even when onDelete is provided', async () => {
    const onDelete = jest.fn();
    const { queryByText } = await render(<BotCard bot={baseBot} onDelete={onDelete} />);
    expect(queryByText('Eliminar')).toBeNull();
  });

  it('is not shown at all when onDelete is not provided, even for a PAUSED bot', async () => {
    const { queryByText } = await render(<BotCard bot={{ ...baseBot, status: 'PAUSED' }} />);
    expect(queryByText('Eliminar')).toBeNull();
  });

  it('shows for a PAUSED bot and calls onDelete without triggering onPress', async () => {
    const onDelete = jest.fn();
    const onPress = jest.fn();
    const { getByText } = await render(
      <BotCard bot={{ ...baseBot, status: 'PAUSED' }} onPress={onPress} onDelete={onDelete} />
    );

    await fireEvent.press(getByText('Eliminar'));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows for a STOPPED bot', async () => {
    const onDelete = jest.fn();
    const { getByText } = await render(<BotCard bot={{ ...baseBot, status: 'STOPPED' }} onDelete={onDelete} />);
    expect(getByText('Eliminar')).toBeTruthy();
  });

  it('is not shown for a PAUSING/RESUMING/ERROR bot', async () => {
    const onDelete = jest.fn();
    for (const status of ['PAUSING', 'RESUMING', 'ERROR'] as const) {
      const { queryByText, unmount } = await render(<BotCard bot={{ ...baseBot, status }} onDelete={onDelete} />);
      expect(queryByText('Eliminar')).toBeNull();
      unmount();
    }
  });
});
