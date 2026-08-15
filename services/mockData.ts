import {
  ActivityEvent,
  Bot,
  BotId,
  EquityCurve,
  EquityPeriod,
  Order,
  Portfolio,
  Position,
  RiskSnapshot,
  Signal,
} from '../types';
import { createSeededRandom } from '../utils/random';

/**
 * Single source of truth for all mock data in Hermes v1.
 * Dashboard, Bots, Trading, Risk and Signals all read from this module —
 * screens must never define their own inline mock values.
 */

const NOW = new Date();
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();
const hoursAgo = (n: number) => minutesAgo(n * 60);
const daysAgo = (n: number) => hoursAgo(n * 24);

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

function generateEquityCurve(period: EquityPeriod, numPoints: number, returnPct: number, seed: number): EquityCurve {
  const rand = createSeededRandom(seed);
  const start = 100;
  const end = start * (1 + returnPct / 100);
  const points: EquityCurve['points'] = [];
  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    const trend = start + (end - start) * progress;
    const noise = (rand() - 0.5) * Math.abs(returnPct) * 0.35;
    const damp = Math.sin(progress * Math.PI); // less noise at the endpoints
    points.push({ t: `p${i}`, v: Number((trend + noise * damp).toFixed(2)) });
  }
  points[points.length - 1].v = Number(end.toFixed(2));
  const winRatePct = 54 + Math.round(rand() * 10);
  return { period, points, returnPct, winRatePct };
}

export const portfolio: Portfolio = {
  balance: 128450.32,
  dailyPnl: 3082,
  dailyPnlPct: 2.4,
  equityCurves: {
    '7D': generateEquityCurve('7D', 24, 3.8, 1),
    '1M': generateEquityCurve('1M', 30, 8.4, 2),
    '3M': generateEquityCurve('3M', 36, 14.2, 3),
    '1Y': generateEquityCurve('1Y', 48, 26.5, 4),
  },
};

// ---------------------------------------------------------------------------
// Bots
// ---------------------------------------------------------------------------

export const bots: Bot[] = [
  {
    id: 'sentinel',
    name: 'Sentinel',
    profile: 'Conservative',
    status: 'active',
    returnPct: 2.1,
    exposure: { pct: 22 },
    lastSignalSummary: 'Mantiene posiciones estables pese a la volatilidad reciente.',
    lastSignalAt: hoursAgo(2),
    strategyDescription:
      'Prioriza preservación de capital. Opera con tamaños de posición reducidos, stops ajustados y evita entrar durante picos de volatilidad no confirmados.',
  },
  {
    id: 'equilibrium',
    name: 'Equilibrium',
    profile: 'Balanced',
    status: 'active',
    returnPct: 4.2,
    exposure: { pct: 45 },
    lastSignalSummary: 'Rebalanceó cartera tras cambio de tendencia en ETH.',
    lastSignalAt: hoursAgo(1),
    strategyDescription:
      'Balancea entre preservación y crecimiento. Rebalancea exposición cuando detecta cambios sostenidos de tendencia, manteniendo un perfil de riesgo moderado.',
  },
  {
    id: 'vortex',
    name: 'Vortex',
    profile: 'Aggressive',
    status: 'alert',
    returnPct: 7.6,
    exposure: { pct: 68, limitPct: 60 },
    lastSignalSummary: 'Redujo exposición tras un pico de volatilidad.',
    lastSignalAt: minutesAgo(18),
    strategyDescription:
      'Busca capturar movimientos de corto plazo con mayor tamaño de posición. Opera con mayor frecuencia y tolera drawdowns más profundos a cambio de mayor retorno esperado.',
  },
];

export function getBot(id: BotId): Bot | undefined {
  return bots.find((b) => b.id === id);
}

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

export const positions: Position[] = [
  {
    id: 'pos-1',
    symbol: 'BTCUSDT',
    direction: 'long',
    botId: 'vortex',
    size: 0.42,
    entryPrice: 61250.3,
    currentPrice: 62480.1,
    unrealizedPnl: 516.52,
    unrealizedPnlPct: 2.01,
    openedAt: hoursAgo(6),
    stopLoss: 59800,
    takeProfit: 65500,
    relatedSignalId: 'sig-vortex-behavior',
    riskLevel: 'normal',
  },
  {
    id: 'pos-2',
    symbol: 'ETHUSDT',
    direction: 'long',
    botId: 'equilibrium',
    size: 3.8,
    entryPrice: 2510.4,
    currentPrice: 2589.75,
    unrealizedPnl: 301.53,
    unrealizedPnlPct: 3.16,
    openedAt: hoursAgo(9),
    stopLoss: 2400,
    takeProfit: 2750,
    relatedSignalId: 'sig-equilibrium-rebalance',
    riskLevel: 'normal',
  },
  {
    id: 'pos-3',
    symbol: 'SOLUSDT',
    direction: 'short',
    botId: 'vortex',
    size: 120,
    entryPrice: 148.2,
    currentPrice: 142.1,
    unrealizedPnl: 732.0,
    unrealizedPnlPct: 4.12,
    openedAt: minutesAgo(45),
    stopLoss: 152.5,
    takeProfit: 132.0,
    relatedSignalId: 'sig-vortex-reduced-exposure',
    riskLevel: 'elevated',
  },
  {
    id: 'pos-4',
    symbol: 'AVAXUSDT',
    direction: 'long',
    botId: 'sentinel',
    size: 210,
    entryPrice: 28.4,
    currentPrice: 28.95,
    unrealizedPnl: 115.5,
    unrealizedPnlPct: 1.94,
    openedAt: daysAgo(1),
    stopLoss: 27.1,
    takeProfit: 31.5,
    riskLevel: 'normal',
  },
];

export function getPosition(id: string): Position | undefined {
  return positions.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const orders: Order[] = [
  { id: 'ord-1', symbol: 'BTCUSDT', type: 'market', status: 'filled', botId: 'vortex', size: 0.42, price: 61250.3, timestamp: hoursAgo(6) },
  { id: 'ord-2', symbol: 'ETHUSDT', type: 'limit', status: 'filled', botId: 'equilibrium', size: 3.8, price: 2510.4, timestamp: hoursAgo(9) },
  { id: 'ord-3', symbol: 'SOLUSDT', type: 'market', status: 'filled', botId: 'vortex', size: 120, price: 148.2, timestamp: minutesAgo(45) },
  { id: 'ord-4', symbol: 'AVAXUSDT', type: 'limit', status: 'filled', botId: 'sentinel', size: 210, price: 28.4, timestamp: daysAgo(1) },
  { id: 'ord-5', symbol: 'BTCUSDT', type: 'stop', status: 'pending', botId: 'vortex', size: 0.42, price: 59800, timestamp: hoursAgo(6) },
  { id: 'ord-6', symbol: 'ETHUSDT', type: 'limit', status: 'cancelled', botId: 'equilibrium', size: 2.1, price: 2470.0, timestamp: hoursAgo(12) },
  { id: 'ord-7', symbol: 'SOLUSDT', type: 'limit', status: 'pending', botId: 'vortex', size: 60, price: 138.5, timestamp: minutesAgo(30) },
];

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

// ---------------------------------------------------------------------------
// Activity (facts)
// ---------------------------------------------------------------------------

export const activityEvents: ActivityEvent[] = [
  { id: 'evt-1', botId: 'vortex', category: 'trade', description: 'Vortex cerró posición BTCUSDT.', timestamp: minutesAgo(52) },
  { id: 'evt-2', botId: 'vortex', category: 'trade', description: 'Vortex cerró posición ETHUSDT.', timestamp: minutesAgo(42) },
  { id: 'evt-3', botId: 'vortex', category: 'trade', description: 'Vortex abrió posición corta en SOLUSDT.', timestamp: minutesAgo(45) },
  { id: 'evt-4', botId: 'vortex', category: 'risk', description: 'Volatilidad de mercado superó el umbral configurado para Vortex.', timestamp: minutesAgo(55) },
  { id: 'evt-5', botId: 'equilibrium', category: 'rebalance', description: 'Equilibrium redujo exposición en ETHUSDT.', timestamp: hoursAgo(1) },
  { id: 'evt-6', botId: 'equilibrium', category: 'rebalance', description: 'Equilibrium aumentó exposición en SOLUSDT.', timestamp: hoursAgo(1) },
  { id: 'evt-7', botId: 'equilibrium', category: 'system', description: 'Se detectó cambio de tendencia en ETHUSDT (4h).', timestamp: hoursAgo(1.2) },
  { id: 'evt-8', botId: 'sentinel', category: 'trade', description: 'Sentinel ajustó stop loss en AVAXUSDT.', timestamp: hoursAgo(2) },
  { id: 'evt-9', botId: 'sentinel', category: 'system', description: 'Sentinel evitó apertura de posición en BTCUSDT por volatilidad no confirmada.', timestamp: hoursAgo(3) },
  { id: 'evt-10', category: 'risk', description: 'El límite diario de exposure fue excedido por Vortex (68% / 60%).', timestamp: minutesAgo(18) },
  { id: 'evt-11', botId: 'vortex', category: 'risk', description: 'Vortex redujo tamaño de nuevas posiciones tras exceder el límite de exposure.', timestamp: minutesAgo(15) },
];

// ---------------------------------------------------------------------------
// Signals (interpretation)
// ---------------------------------------------------------------------------

export const signals: Signal[] = [
  {
    id: 'sig-critical-exposure',
    level: 'action_required',
    source: 'risk',
    headline: 'Límite diario de exposure excedido',
    body: 'El límite diario de exposure fue excedido. Revisá tu exposición antes de continuar.',
    timestamp: minutesAgo(18),
    relatedEventIds: ['evt-10', 'evt-11'],
    actionLabel: 'Revisar exposición',
  },
  {
    id: 'sig-vortex-behavior',
    level: 'alert',
    source: 'vortex',
    botId: 'vortex',
    headline: 'Vortex cerró posiciones tras spike de volatilidad',
    body: 'Vortex cerró dos posiciones en 10 minutos tras un spike de volatilidad, comportamiento consistente con su perfil agresivo.',
    timestamp: minutesAgo(42),
    relatedEventIds: ['evt-1', 'evt-2', 'evt-4'],
  },
  {
    id: 'sig-vortex-reduced-exposure',
    level: 'signal',
    source: 'vortex',
    botId: 'vortex',
    headline: 'Vortex redujo exposición',
    body: 'Redujo exposición tras un pico de volatilidad.',
    timestamp: minutesAgo(18),
    relatedEventIds: ['evt-4', 'evt-11'],
  },
  {
    id: 'sig-equilibrium-rebalance',
    level: 'signal',
    source: 'equilibrium',
    botId: 'equilibrium',
    headline: 'Equilibrium rebalanceó la cartera',
    body: 'Rebalanceó cartera tras cambio de tendencia en ETH.',
    timestamp: hoursAgo(1),
    relatedEventIds: ['evt-5', 'evt-6', 'evt-7'],
  },
  {
    id: 'sig-sentinel-stable',
    level: 'insight',
    source: 'sentinel',
    botId: 'sentinel',
    headline: 'Sentinel se mantiene estable',
    body: 'Mantiene posiciones estables pese a la volatilidad reciente.',
    timestamp: hoursAgo(2),
    relatedEventIds: ['evt-8', 'evt-9'],
  },
  {
    id: 'sig-sentinel-caution',
    level: 'ambient',
    source: 'sentinel',
    botId: 'sentinel',
    headline: 'Sentinel evitó una entrada no confirmada',
    body: 'Evitó abrir una nueva posición en BTCUSDT al no confirmarse la dirección del movimiento, en línea con su perfil conservador.',
    timestamp: hoursAgo(3),
    relatedEventIds: ['evt-9'],
  },
];

export function getSignal(id: string): Signal | undefined {
  return signals.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

export const riskSnapshot: RiskSnapshot = {
  level: 'critical',
  headline: 'Riesgo crítico: exposición diaria excedida',
  description: 'El límite diario de exposure fue excedido. Revisá tu exposición antes de continuar.',
  exposureTotalPct: 58.3,
  exposureByBot: { sentinel: 22, equilibrium: 45, vortex: 68 },
  drawdownCurrentPct: 4.2,
  drawdownMaxPct: 12,
  dailyLimits: [
    { label: 'Exposure total diario', currentPct: 68, limitPct: 60 },
    { label: 'Pérdida diaria máxima', currentPct: 1.8, limitPct: 5 },
    { label: 'Concentración por símbolo', currentPct: 34, limitPct: 40 },
  ],
  riskByBot: { sentinel: 'normal', equilibrium: 'elevated', vortex: 'critical' },
  concentration: [
    { symbol: 'BTCUSDT', pct: 34 },
    { symbol: 'ETHUSDT', pct: 26 },
    { symbol: 'SOLUSDT', pct: 22 },
    { symbol: 'AVAXUSDT', pct: 18 },
  ],
  history: [
    { date: 'Lun', level: 'normal' },
    { date: 'Mar', level: 'normal' },
    { date: 'Mié', level: 'normal' },
    { date: 'Jue', level: 'elevated' },
    { date: 'Vie', level: 'elevated' },
    { date: 'Sáb', level: 'alert' },
    { date: 'Hoy', level: 'critical' },
  ],
  pendingAction: {
    label: 'Revisar exposición',
    description: 'El límite diario de exposure fue excedido. Revisá tu exposición antes de continuar.',
  },
};
