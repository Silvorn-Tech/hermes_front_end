import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import NewOrderScreen from '../../app/(app)/trading/new-order';
import { useHermesData } from '../../hooks/HermesDataContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

jest.mock('../../hooks/HermesDataContext', () => ({
  useHermesData: jest.fn(),
}));

jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isDesktop: false }),
}));

const mockBack = jest.fn();
const mockUseHermesData = useHermesData as jest.Mock;

async function setup(createOrderImpl?: jest.Mock) {
  const createOrder = createOrderImpl ?? jest.fn().mockResolvedValue({ order: null, status: 'REJECTED', reason: 'Trading is disabled.' });
  mockUseHermesData.mockReturnValue({ createOrder });
  const view = await render(<NewOrderScreen />);
  return { createOrder, ...view };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NewOrderScreen — UX-only validation, backend is final authority', () => {
  it('does not call createOrder when the symbol/quantity are blank', async () => {
    const { createOrder, getByText } = await setup();
    await fireEvent.press(getByText('Crear orden'));
    expect(createOrder).not.toHaveBeenCalled();
    expect(getByText(/Ingresá un símbolo/)).toBeTruthy();
  });

  it('rejects a non-decimal quantity (UX check only, never invents a lot-size rule)', async () => {
    const { createOrder, getByText, getByPlaceholderText, getAllByPlaceholderText } = await setup();
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await fireEvent.changeText(getAllByPlaceholderText('0.00')[0], 'not-a-number');
    await fireEvent.press(getByText('Crear orden'));
    expect(createOrder).not.toHaveBeenCalled();
    expect(getByText(/cantidad debe ser un número decimal/)).toBeTruthy();
  });

  it('requires a price for LIMIT orders but not for MARKET orders', async () => {
    const { createOrder, getByText, getByPlaceholderText, getAllByPlaceholderText } = await setup();
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await fireEvent.changeText(getAllByPlaceholderText('0.00')[0], '0.01');
    await fireEvent.press(getByText('Limit'));
    await fireEvent.press(getByText('Crear orden'));
    expect(createOrder).not.toHaveBeenCalled();
    expect(getByText(/precio debe ser un número decimal/)).toBeTruthy();
  });

  it('submits the exact raw quantity string (never a rounded JS number) once the form is valid', async () => {
    const { createOrder, getByText, getByPlaceholderText, getAllByPlaceholderText } = await setup();
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'btcusdt');
    await fireEvent.changeText(getAllByPlaceholderText('0.00')[0], '0.00012345');
    await fireEvent.press(getByText('Crear orden'));

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
    const [body] = createOrder.mock.calls[0];
    expect(body).toEqual({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: '0.00012345', price: undefined });
  });

  it('shows the backend rejection reason verbatim instead of treating it as an error (e.g. kill switch)', async () => {
    const createOrder = jest.fn().mockResolvedValue({ order: null, status: 'REJECTED', reason: 'Trading is disabled.' });
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = await setup(createOrder);
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await fireEvent.changeText(getAllByPlaceholderText('0.00')[0], '0.01');
    await fireEvent.press(getByText('Crear orden'));

    await waitFor(() => expect(getByText('Trading is disabled.')).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('navigates back on a genuine success result', async () => {
    const createOrder = jest.fn().mockResolvedValue({ order: null, status: 'NEW', reason: null });
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = await setup(createOrder);
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await fireEvent.changeText(getAllByPlaceholderText('0.00')[0], '0.01');
    await fireEvent.press(getByText('Crear orden'));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('disables the submit button while a request is in flight (double-submit protection)', async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    const createOrder = jest.fn().mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    const { getByText, getByPlaceholderText, getAllByPlaceholderText } = await setup(createOrder);
    await fireEvent.changeText(getByPlaceholderText('BTCUSDT'), 'BTCUSDT');
    await fireEvent.changeText(getAllByPlaceholderText('0.00')[0], '0.01');

    await fireEvent.press(getByText('Crear orden'));
    await fireEvent.press(getByText('Enviando…'));
    await fireEvent.press(getByText('Enviando…'));

    resolveCreate({ order: null, status: 'NEW', reason: null });
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(createOrder).toHaveBeenCalledTimes(1);
  });
});
