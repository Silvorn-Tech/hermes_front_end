import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityEvent,
  Bot,
  Order,
  Portfolio,
  Position,
  RiskSnapshot,
  Signal,
} from '../types';
import * as mock from '../services/mockData';
import {
  apiClient,
  BotActionResult,
  CreateBotRequest,
  CreateOrderRequest,
  HermesApiError,
  OrderActionResult,
  UpdateBotRequest,
} from '../services/api';
import { useAuth } from './AuthContext';

export type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * Real exposure derived from real positions + real portfolio value — pure
 * arithmetic (position value / portfolio value), never a risk *decision*.
 * RiskEngine itself lives only in hermes_v2; this is display math, not a
 * frontend reimplementation of it. `null` when the portfolio value isn't
 * available yet, never a fabricated 0%.
 */
export interface RealExposure {
  totalPct: number | null;
  bySymbol: { symbol: string; pct: number }[];
}

interface HermesDataValue {
  status: LoadStatus;
  portfolio: Portfolio | null;
  portfolioError: string | null;
  /** True when /portfolio (or /positions) 409'd specifically because this
   * user has never connected a Binance account — distinct from a generic
   * load failure (`portfolioError`/`positionsError`), so the UI can show
   * a "connect your account" prompt instead of an error state. See
   * hermes_v2's docs/architecture/multi-tenant-trading.md. */
  binanceNotConnected: boolean;
  positions: Position[];
  positionsError: string | null;
  orders: Order[];
  ordersError: string | null;
  bots: Bot[];
  botsError: string | null;
  signals: Signal[];
  activityEvents: ActivityEvent[];
  risk: RiskSnapshot;
  realExposure: RealExposure;
  refresh: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  refreshBots: () => Promise<void>;
  closePosition: (symbol: string, idempotencyKey: string) => Promise<OrderActionResult>;
  cancelOrder: (orderId: string, idempotencyKey: string) => Promise<OrderActionResult>;
  createOrder: (body: CreateOrderRequest, idempotencyKey: string) => Promise<OrderActionResult>;
  createBot: (body: CreateBotRequest, idempotencyKey: string) => Promise<BotActionResult>;
  updateBot: (botId: string, body: UpdateBotRequest, idempotencyKey: string) => Promise<BotActionResult>;
  pauseBot: (botId: string, idempotencyKey: string) => Promise<BotActionResult>;
  resumeBot: (botId: string, idempotencyKey: string) => Promise<BotActionResult>;
  stopBot: (botId: string, idempotencyKey: string) => Promise<BotActionResult>;
  deleteBot: (botId: string, idempotencyKey: string) => Promise<BotActionResult>;
  activateBotLive: (botId: string, idempotencyKey: string) => Promise<BotActionResult>;
}

const HermesDataContext = createContext<HermesDataValue | undefined>(undefined);

function describeError(error: unknown, fallback: string): string {
  return error instanceof HermesApiError ? error.detail : fallback;
}

export function HermesDataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthorized, signOut } = useAuth();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [binanceNotConnected, setBinanceNotConnected] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [botsError, setBotsError] = useState<string | null>(null);

  // Signals/Activity have no backend domain yet — still fully mock, per
  // the task's explicit scope (see docs on the Risk/Signals screens).

  const handlePotential401 = useCallback(
    (error: unknown) => {
      if (error instanceof HermesApiError && error.status === 401) {
        void signOut();
      }
    },
    [signOut]
  );

  const fetchPortfolio = useCallback(async () => {
    try {
      const result = await apiClient.getPortfolio();
      setPortfolio(result);
      setPortfolioError(null);
      setBinanceNotConnected(false);
    } catch (error) {
      if (error instanceof HermesApiError && error.status === 409) {
        setBinanceNotConnected(true);
        setPortfolioError(null);
      } else {
        setPortfolioError(describeError(error, 'No se pudo cargar el portfolio.'));
      }
      handlePotential401(error);
    }
  }, [handlePotential401]);

  const refreshPositions = useCallback(async () => {
    try {
      const result = await apiClient.getPositions();
      setPositions(result);
      setPositionsError(null);
      setBinanceNotConnected(false);
    } catch (error) {
      if (error instanceof HermesApiError && error.status === 409) {
        setBinanceNotConnected(true);
        setPositionsError(null);
      } else {
        setPositionsError(describeError(error, 'No se pudieron cargar las posiciones.'));
      }
      handlePotential401(error);
    }
  }, [handlePotential401]);

  const refreshOrders = useCallback(async () => {
    try {
      const result = await apiClient.getOrders();
      setOrders(result.orders);
      setOrdersError(null);
    } catch (error) {
      setOrdersError(describeError(error, 'No se pudieron cargar las órdenes.'));
      handlePotential401(error);
    }
  }, [handlePotential401]);

  const refreshBots = useCallback(async () => {
    try {
      const result = await apiClient.getBots();
      setBots(result);
      setBotsError(null);
    } catch (error) {
      setBotsError(describeError(error, 'No se pudieron cargar los bots.'));
      handlePotential401(error);
    }
  }, [handlePotential401]);

  const refresh = useCallback(async () => {
    await Promise.allSettled([fetchPortfolio(), refreshPositions(), refreshOrders(), refreshBots()]);
  }, [fetchPortfolio, refreshPositions, refreshOrders, refreshBots]);

  useEffect(() => {
    // HermesDataProvider is mounted before the root navigator's auth gate
    // (see app/_layout.tsx), so this effect runs even on the login screen —
    // never fetch real data until the backend session is actually
    // authorized, and clear anything real from a previous session on
    // sign-out rather than leaving stale data visible.
    if (!isAuthorized) {
      setStatus('loading');
      setPortfolio(null);
      setBinanceNotConnected(false);
      setPositions([]);
      setOrders([]);
      setBots([]);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    refresh().then(() => {
      if (!cancelled) setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
    // refresh is stable per render via useCallback, but including it would
    // re-run this effect on every dependency change of the fetchers below —
    // isAuthorized is the only thing that should restart the initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const closePosition = useCallback(
    async (symbol: string, idempotencyKey: string) => {
      try {
        const result = await apiClient.closePosition(symbol, idempotencyKey);
        await Promise.allSettled([refreshPositions(), refreshOrders()]);
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshPositions, refreshOrders, handlePotential401]
  );

  const cancelOrder = useCallback(
    async (orderId: string, idempotencyKey: string) => {
      try {
        const result = await apiClient.cancelOrder(orderId, idempotencyKey);
        await refreshOrders();
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshOrders, handlePotential401]
  );

  const createOrder = useCallback(
    async (body: CreateOrderRequest, idempotencyKey: string) => {
      try {
        const result = await apiClient.createOrder(body, idempotencyKey);
        await Promise.allSettled([refreshOrders(), refreshPositions()]);
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshOrders, refreshPositions, handlePotential401]
  );

  const createBot = useCallback(
    async (body: CreateBotRequest, idempotencyKey: string) => {
      try {
        const result = await apiClient.createBot(body, idempotencyKey);
        await refreshBots();
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshBots, handlePotential401]
  );

  const updateBot = useCallback(
    async (botId: string, body: UpdateBotRequest, idempotencyKey: string) => {
      try {
        const result = await apiClient.updateBot(botId, body, idempotencyKey);
        await refreshBots();
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshBots, handlePotential401]
  );

  const pauseBot = useCallback(
    async (botId: string, idempotencyKey: string) => {
      try {
        const result = await apiClient.pauseBot(botId, idempotencyKey);
        await Promise.allSettled([refreshBots(), refreshOrders()]);
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshBots, refreshOrders, handlePotential401]
  );

  const resumeBot = useCallback(
    async (botId: string, idempotencyKey: string) => {
      try {
        const result = await apiClient.resumeBot(botId, idempotencyKey);
        await Promise.allSettled([refreshBots(), refreshOrders()]);
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshBots, refreshOrders, handlePotential401]
  );

  const stopBot = useCallback(
    async (botId: string, idempotencyKey: string) => {
      try {
        const result = await apiClient.stopBot(botId, idempotencyKey);
        await refreshBots();
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshBots, handlePotential401]
  );

  const deleteBot = useCallback(
    async (botId: string, idempotencyKey: string) => {
      try {
        const result = await apiClient.deleteBot(botId, idempotencyKey);
        await refreshBots();
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshBots, handlePotential401]
  );

  const activateBotLive = useCallback(
    async (botId: string, idempotencyKey: string) => {
      try {
        const result = await apiClient.activateBotLive(botId, idempotencyKey);
        await refreshBots();
        return result;
      } catch (error) {
        handlePotential401(error);
        throw error;
      }
    },
    [refreshBots, handlePotential401]
  );

  const realExposure = useMemo<RealExposure>(() => {
    if (!portfolio || portfolio.totalValueQuote <= 0) {
      return { totalPct: null, bySymbol: [] };
    }
    const priced = positions.filter((p): p is Position & { valueQuote: number } => p.valueQuote !== null);
    if (priced.length === 0) {
      return { totalPct: null, bySymbol: [] };
    }
    const totalValue = priced.reduce((sum, p) => sum + p.valueQuote, 0);
    return {
      totalPct: (totalValue / portfolio.totalValueQuote) * 100,
      bySymbol: priced.map((p) => ({
        symbol: p.symbol,
        pct: (p.valueQuote / portfolio.totalValueQuote) * 100,
      })),
    };
  }, [portfolio, positions]);

  const value = useMemo<HermesDataValue>(
    () => ({
      status,
      portfolio,
      portfolioError,
      binanceNotConnected,
      positions,
      positionsError,
      orders,
      ordersError,
      bots,
      botsError,
      signals: mock.signals,
      activityEvents: mock.activityEvents,
      risk: mock.riskSnapshot,
      realExposure,
      refresh,
      refreshOrders,
      refreshPositions,
      refreshBots,
      closePosition,
      cancelOrder,
      createOrder,
      createBot,
      updateBot,
      pauseBot,
      resumeBot,
      stopBot,
      deleteBot,
      activateBotLive,
    }),
    [
      status,
      portfolio,
      portfolioError,
      binanceNotConnected,
      positions,
      positionsError,
      orders,
      ordersError,
      bots,
      botsError,
      realExposure,
      refresh,
      refreshOrders,
      refreshPositions,
      refreshBots,
      closePosition,
      cancelOrder,
      createOrder,
      createBot,
      updateBot,
      pauseBot,
      resumeBot,
      stopBot,
      deleteBot,
      activateBotLive,
    ]
  );

  return <HermesDataContext.Provider value={value}>{children}</HermesDataContext.Provider>;
}

export function useHermesData(): HermesDataValue {
  const ctx = useContext(HermesDataContext);
  if (!ctx) throw new Error('useHermesData must be used within HermesDataProvider');
  return ctx;
}
