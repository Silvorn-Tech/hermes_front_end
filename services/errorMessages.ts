/**
 * Maps a HermesApiError's HTTP status to user-facing Spanish copy. Never
 * renders `error.detail` for a status where the backend's raw message
 * could describe something internal — only for statuses where the backend
 * deliberately writes the detail *for* the end user (422 validation
 * shape, and order-rejection reasons from OrderValidator/RiskEngine,
 * which are already safe, specific, and meant to be read — see
 * hermes_v2's OrderValidator/RiskEngine, whose messages never include
 * anything beyond the order's own fields and configured limits).
 */
import { HermesApiError } from './api';

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof HermesApiError)) {
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }

  switch (error.status) {
    case 0:
      return 'No se pudo contactar al backend de Hermes. Verifica tu conexión.';
    case 401:
      return 'Tu sesión expiró. Inicia sesión de nuevo.';
    case 403:
      return 'No tienes permiso para realizar esta acción.';
    case 404:
      return 'No se encontró el recurso solicitado.';
    case 409:
      return 'Esta operación ya se procesó o está en curso.';
    case 422:
      return error.detail || 'Los datos enviados no son válidos.';
    case 429: {
      const wait = error.retryAfterSeconds ? ` Intenta de nuevo en ${error.retryAfterSeconds}s.` : '';
      return `Demasiadas solicitudes.${wait}`;
    }
    case 502:
    case 503:
      return 'Binance no está disponible en este momento. Intenta más tarde.';
    default:
      return 'Ocurrió un error interno. Intenta de nuevo.';
  }
}

/** Order/position rejection reasons (RiskEngine, OrderValidator, kill
 * switch) come back as `OrderActionResult.reason` on a normal 2xx/201
 * response, not as an error — the backend deliberately writes these to be
 * shown to the user as-is. */
export function getRejectionMessage(reason: string | null): string {
  return reason ?? 'La operación fue rechazada.';
}
