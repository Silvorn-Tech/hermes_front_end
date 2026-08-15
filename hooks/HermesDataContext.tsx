import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityEvent,
  Bot,
  BotId,
  Order,
  Portfolio,
  Position,
  RiskSnapshot,
  Signal,
} from '../types';
import * as mock from '../services/mockData';

export type LoadStatus = 'loading' | 'ready' | 'error';

interface HermesDataValue {
  status: LoadStatus;
  portfolio: Portfolio;
  bots: Bot[];
  positions: Position[];
  orders: Order[];
  signals: Signal[];
  activityEvents: ActivityEvent[];
  risk: RiskSnapshot;
  toggleBotStatus: (botId: BotId) => void;
  closePosition: (positionId: string) => void;
  cancelOrder: (orderId: string) => void;
}

const HermesDataContext = createContext<HermesDataValue | undefined>(undefined);

/** Simulated initial fetch latency so the loading-skeleton states are real, not decorative. */
const SIMULATED_LOAD_MS = 500;

export function HermesDataProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [bots, setBots] = useState<Bot[]>(mock.bots);
  const [positions, setPositions] = useState<Position[]>(mock.positions);
  const [orders, setOrders] = useState<Order[]>(mock.orders);

  useEffect(() => {
    const timer = setTimeout(() => setStatus('ready'), SIMULATED_LOAD_MS);
    return () => clearTimeout(timer);
  }, []);

  const toggleBotStatus = (botId: BotId) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: b.status === 'paused' ? 'active' : 'paused' } : b))
    );
  };

  const closePosition = (positionId: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
  };

  const cancelOrder = (orderId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId && o.status === 'pending' ? { ...o, status: 'cancelled' } : o)));
  };

  const value = useMemo<HermesDataValue>(
    () => ({
      status,
      portfolio: mock.portfolio,
      bots,
      positions,
      orders,
      signals: mock.signals,
      activityEvents: mock.activityEvents,
      risk: mock.riskSnapshot,
      toggleBotStatus,
      closePosition,
      cancelOrder,
    }),
    [status, bots, positions, orders]
  );

  return <HermesDataContext.Provider value={value}>{children}</HermesDataContext.Provider>;
}

export function useHermesData(): HermesDataValue {
  const ctx = useContext(HermesDataContext);
  if (!ctx) throw new Error('useHermesData must be used within HermesDataProvider');
  return ctx;
}
