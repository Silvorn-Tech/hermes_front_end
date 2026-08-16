import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
  id: 'bot-1',
  name: 'Vortex Runner',
  riskProfile: 'VORTEX',
  assetClass: 'CRYPTO',
  executionVenue: 'BINANCE',
  instrument: 'BTCUSDT',
  strategyModel: 'GARCH',
  strategyConfig: null,
  status: 'PAUSED',
  currentQuantity: 0,
  targetQuantity: 0.015,
  pausedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let createBot: jest.Mock;
let updateBot: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  createBot = jest.fn().mockResolvedValue({ bot: existingBot, status: 'PAUSED', reason: null });
  updateBot = jest.fn().mockResolvedValue({ bot: existingBot, status: 'PAUSED', reason: null });
  mockUseHermesData.mockReturnValue({ bots: [existingBot], createBot, updateBot });
});

describe('Bot create/edit form — real backend calls', () => {
  it('create mode: submitting a valid form calls createBot with the right payload and navigates back', async () => {
    const { getByText, getByPlaceholderText } = await render(<BotFormScreen />);

    await fireEvent.changeText(getByPlaceholderText('Nombre del bot'), 'New Bot');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'ethusdt');
    await fireEvent.changeText(getByPlaceholderText('0.00'), '0.5');
    await fireEvent.press(getByText('Crear bot'));

    await waitFor(() => expect(createBot).toHaveBeenCalledTimes(1));
    const [payload] = createBot.mock.calls[0];
    expect(payload).toEqual({
      name: 'New Bot',
      riskProfile: 'SENTINEL',
      assetClass: 'CRYPTO',
      executionVenue: 'BINANCE',
      instrument: 'ETHUSDT',
      targetQuantity: '0.5',
      strategyModel: 'SIGNAL_BASED',
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('create mode: blank required fields block submission', async () => {
    const { getByText } = await render(<BotFormScreen />);
    await fireEvent.press(getByText('Crear bot'));
    expect(createBot).not.toHaveBeenCalled();
    expect(getByText('Ingresá un nombre para el bot.')).toBeTruthy();
  });

  it('edit mode: pre-fills from the existing bot and shows asset class/venue/instrument as read-only', async () => {
    mockParams = { id: 'bot-1' };
    const { getByDisplayValue, getByText, queryByPlaceholderText } = await render(<BotFormScreen />);

    expect(getByDisplayValue('Vortex Runner')).toBeTruthy();
    expect(getByText(/CRYPTO · BINANCE · BTCUSDT/)).toBeTruthy();
    expect(queryByPlaceholderText('BTCUSDT')).toBeNull(); // no editable instrument field
  });

  it('edit mode: submitting calls updateBot with only the editable fields and navigates back', async () => {
    mockParams = { id: 'bot-1' };
    const { getByText, getByDisplayValue } = await render(<BotFormScreen />);

    await fireEvent.changeText(getByDisplayValue('Vortex Runner'), 'Renamed Bot');
    await fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() => expect(updateBot).toHaveBeenCalledTimes(1));
    const [botId, payload] = updateBot.mock.calls[0];
    expect(botId).toBe('bot-1');
    expect(payload).toEqual({
      name: 'Renamed Bot',
      targetQuantity: '0.015',
      strategyModel: 'GARCH',
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('edit mode with an unknown id shows "Bot no encontrado" instead of a blank/broken form', async () => {
    mockParams = { id: 'does-not-exist' };
    const { getByText } = await render(<BotFormScreen />);
    expect(getByText('Bot no encontrado.')).toBeTruthy();
  });

  it('a thrown error is shown inline, never silently swallowed', async () => {
    createBot.mockRejectedValue(new Error('network down'));
    const { getByText, getByPlaceholderText } = await render(<BotFormScreen />);

    await fireEvent.changeText(getByPlaceholderText('Nombre del bot'), 'New Bot');
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'ETHUSDT');
    await fireEvent.changeText(getByPlaceholderText('0.00'), '0.5');
    await fireEvent.press(getByText('Crear bot'));

    await waitFor(() => expect(createBot).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getByText('Ocurrió un error inesperado. Intenta de nuevo.')).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
  });
});
