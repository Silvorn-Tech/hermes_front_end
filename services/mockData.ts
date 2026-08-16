import { ActivityEvent, Bot, RiskSnapshot, Signal } from '../types';

/**
 * Single source of truth for the mock data still in use. Portfolio,
 * positions, and orders used to live here too, but hooks/HermesDataContext.tsx
 * now fetches those from the real Hermes v2 backend (see services/api.ts) —
 * their mock versions were removed rather than kept around unused, since
 * nothing reads them anymore and their old shape no longer matches the real
 * Portfolio/Position/Order types. Bots, Signals, and Activity stay mocked
 * here because no backend domain exists for them yet.
 */

const NOW = new Date();
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();
const hoursAgo = (n: number) => minutesAgo(n * 60);

// ---------------------------------------------------------------------------
// Bots
// ---------------------------------------------------------------------------

export const bots: Bot[] = [
  {
    id: 'sentinel',
    name: 'Sentinel',
    profile: 'Conservative',
    status: 'ACTIVE',
    assetClass: 'CRYPTO',
    executionVenue: 'BINANCE',
    strategyModel: 'SIGNAL_BASED',
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
    status: 'ACTIVE',
    assetClass: 'CRYPTO',
    executionVenue: 'BINANCE',
    strategyModel: 'REGIME_BASED',
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
    status: 'ERROR',
    assetClass: 'CRYPTO',
    executionVenue: 'BINANCE',
    strategyModel: 'GARCH',
    returnPct: 7.6,
    exposure: { pct: 68, limitPct: 60 },
    lastSignalSummary: 'Redujo exposición tras un pico de volatilidad.',
    lastSignalAt: minutesAgo(18),
    strategyDescription:
      'Busca capturar movimientos de corto plazo con mayor tamaño de posición. Opera con mayor frecuencia y tolera drawdowns más profundos a cambio de mayor retorno esperado.',
  },
];

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
  circuitBreaker: { active: false, reason: null },
  pendingAction: {
    label: 'Revisar exposición',
    description: 'El límite diario de exposure fue excedido. Revisá tu exposición antes de continuar.',
  },
};
