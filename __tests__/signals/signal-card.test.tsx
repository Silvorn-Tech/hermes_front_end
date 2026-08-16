import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SignalCard } from '../../components/signals/SignalCard';
import { Signal } from '../../types';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function actionRequiredSignal(overrides: Partial<Signal>): Signal {
  return {
    id: 'sig-test',
    level: 'action_required',
    source: 'risk',
    headline: 'Test signal',
    body: 'Body text',
    timestamp: new Date().toISOString(),
    relatedEventIds: [],
    actionLabel: 'Revisar',
    ...overrides,
  };
}

describe('SignalCard action button — real navigation, never a dead affordance', () => {
  it('navigates to /risk for a risk-sourced action_required signal', async () => {
    const signal = actionRequiredSignal({ source: 'risk' });
    const { getByText } = await render(<SignalCard signal={signal} relatedEvents={[]} />);

    await fireEvent.press(getByText('Revisar'));
    expect(mockPush).toHaveBeenCalledWith('/risk');
  });

  it('navigates to /bots/{botId} for a bot-tagged action_required signal', async () => {
    const signal = actionRequiredSignal({ source: 'vortex', botId: 'vortex' });
    const { getByText } = await render(<SignalCard signal={signal} relatedEvents={[]} />);

    await fireEvent.press(getByText('Revisar'));
    expect(mockPush).toHaveBeenCalledWith('/bots/vortex');
  });

  it('renders no action button when there is no sensible navigation target', async () => {
    const signal = actionRequiredSignal({ source: 'system', botId: undefined });
    const { queryByText } = await render(<SignalCard signal={signal} relatedEvents={[]} />);

    expect(queryByText('Revisar')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders no action button for a signal below action_required, even with an actionLabel', async () => {
    const signal = actionRequiredSignal({ level: 'alert', source: 'risk' });
    const { queryByText } = await render(<SignalCard signal={signal} relatedEvents={[]} />);

    expect(queryByText('Revisar')).toBeNull();
  });
});
