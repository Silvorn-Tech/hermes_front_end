/**
 * Placeholder for the real Hermes backend client.
 *
 * None of these are called yet — every hook in `hooks/` currently reads
 * straight from `services/mockData.ts`. This file exists so the future
 * integration has an obvious landing spot: swap the hook implementations to
 * call these functions (wired to fetch/axios + auth) instead of the mock
 * getters, without having to touch any screen or component.
 */

import {
  ActivityEvent,
  Bot,
  Order,
  Portfolio,
  Position,
  RiskSnapshot,
  Signal,
} from '../types';

export interface HermesApiClient {
  getPortfolio(): Promise<Portfolio>;
  getBots(): Promise<Bot[]>;
  getPositions(): Promise<Position[]>;
  getOrders(): Promise<Order[]>;
  getSignals(): Promise<Signal[]>;
  getActivityEvents(): Promise<ActivityEvent[]>;
  getRiskSnapshot(): Promise<RiskSnapshot>;
  pauseBot(botId: string): Promise<void>;
  resumeBot(botId: string): Promise<void>;
  closePosition(positionId: string): Promise<void>;
  cancelOrder(orderId: string): Promise<void>;
}

export const NOT_IMPLEMENTED_MESSAGE =
  'Hermes API client is not implemented yet. This app currently runs entirely on mock data (see services/mockData.ts).';
