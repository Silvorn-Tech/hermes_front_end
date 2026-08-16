import { colors } from '../constants';
import { OrderStatus, OrderType } from '../types';

/** Shared label/tone maps for Hermes's real order status and type
 * vocabulary — used by both the Trading list (OrderRow/OrderCard) and the
 * order detail screen, so the two never drift apart. */
export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Enviando',
  NEW: 'Abierta',
  PARTIALLY_FILLED: 'Parcialmente ejecutada',
  FILLED: 'Ejecutada',
  CANCELED: 'Cancelada',
  PENDING_CANCEL: 'Cancelando',
  REJECTED: 'Rechazada',
  EXPIRED: 'Expirada',
  FAILED: 'Fallida',
};

export const orderStatusTone: Record<OrderStatus, string> = {
  PENDING: colors.aiAccent,
  NEW: colors.aiAccent,
  PARTIALLY_FILLED: colors.warning,
  FILLED: colors.success,
  CANCELED: colors.textMuted,
  PENDING_CANCEL: colors.textMuted,
  REJECTED: colors.danger,
  EXPIRED: colors.textMuted,
  FAILED: colors.danger,
};

export const orderTypeLabel: Record<OrderType, string> = {
  MARKET: 'Market',
  LIMIT: 'Limit',
};
