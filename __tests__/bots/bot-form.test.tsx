import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import BotFormScreen from '../../app/(app)/bots/form';
import { useHermesData } from '../../hooks/HermesDataContext';
import { Bot } from '../../types';

const mockBack = jest.fn();
let mockParams: { id?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

const mockUseHermesData = useHermesData as jest.Mock;

const existingBot: Bot = {
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

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockUseHermesData.mockReturnValue({ bots: [existingBot] });
});

describe('Bot create/edit form — backend integration pending, never fakes persistence', () => {
  it('create mode: submitting shows the pending notice and never mutates the bot list', async () => {
    const { getByText, queryByText } = await render(<BotFormScreen />);
    expect(queryByText('Integración con backend pendiente')).toBeNull();

    await fireEvent.press(getByText('Crear bot'));

    expect(getByText('Integración con backend pendiente')).toBeTruthy();
    // mockUseHermesData's bots array is never touched by the form.
    expect(mockUseHermesData().bots).toEqual([existingBot]);
  });

  it('edit mode: pre-fills from the existing bot and shows the pending notice on save', async () => {
    mockParams = { id: 'vortex' };
    const { getByText, getByDisplayValue } = await render(<BotFormScreen />);

    expect(getByDisplayValue('Vortex')).toBeTruthy();
    await fireEvent.press(getByText('Guardar cambios'));

    expect(getByText('Integración con backend pendiente')).toBeTruthy();
  });

  it('edit mode with an unknown id shows "Bot no encontrado" instead of a blank/broken form', async () => {
    mockParams = { id: 'does-not-exist' };
    const { getByText } = await render(<BotFormScreen />);
    expect(getByText('Bot no encontrado.')).toBeTruthy();
  });
});
