import React from 'react';
import { render } from '@testing-library/react-native';
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
