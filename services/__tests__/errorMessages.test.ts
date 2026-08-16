import { HermesApiError } from '../api';
import { getErrorMessage, getRejectionMessage } from '../errorMessages';

describe('getErrorMessage', () => {
  it('returns a generic message for a non-HermesApiError', () => {
    expect(getErrorMessage(new Error('boom'))).toMatch(/error inesperado/i);
  });

  it.each([
    [401, /sesión expiró/i],
    [403, /no tienes permiso/i],
    [404, /no se encontró/i],
    [409, /ya se procesó o está en curso/i],
    [429, /demasiadas solicitudes/i],
    [502, /no está disponible/i],
    [503, /no está disponible/i],
    [500, /error interno/i],
  ])('maps status %i to user-facing copy', (status, pattern) => {
    const error = new HermesApiError(status, 'raw backend detail that should not leak verbatim');
    expect(getErrorMessage(error)).toMatch(pattern);
  });

  it('surfaces the 429 Retry-After hint when present', () => {
    const error = new HermesApiError(429, 'rate limited', 12);
    expect(getErrorMessage(error)).toMatch(/12s/);
  });

  it('shows the backend detail for 422 (validation copy is meant for the user)', () => {
    const error = new HermesApiError(422, 'quantity must be a positive decimal');
    expect(getErrorMessage(error)).toBe('quantity must be a positive decimal');
  });

  it('never leaks raw backend detail for non-user-facing statuses like 500', () => {
    const error = new HermesApiError(500, 'Traceback (most recent call last): secret internals');
    expect(getErrorMessage(error)).not.toMatch(/Traceback|secret/);
  });
});

describe('getRejectionMessage', () => {
  it('passes through a real rejection reason from the backend', () => {
    expect(getRejectionMessage('Trading is disabled.')).toBe('Trading is disabled.');
  });

  it('falls back to a generic message when no reason is given', () => {
    expect(getRejectionMessage(null)).toMatch(/rechazada/i);
  });
});
