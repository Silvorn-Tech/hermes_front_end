import { generateIdempotencyKey } from '../idempotency';

describe('generateIdempotencyKey', () => {
  it('returns a UUID-v4-shaped string', () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates a fresh key on every call (no accidental reuse)', () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateIdempotencyKey()));
    expect(keys.size).toBe(50);
  });

  it('falls back to a manual UUID when crypto.randomUUID is unavailable', () => {
    const originalCrypto = (globalThis as any).crypto;
    (globalThis as any).crypto = { getRandomValues: originalCrypto?.getRandomValues?.bind(originalCrypto) };
    try {
      const key = generateIdempotencyKey();
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } finally {
      (globalThis as any).crypto = originalCrypto;
    }
  });

  it('falls back to Math.random when no crypto object exists at all', () => {
    const originalCrypto = (globalThis as any).crypto;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).crypto;
    try {
      const key = generateIdempotencyKey();
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } finally {
      (globalThis as any).crypto = originalCrypto;
    }
  });
});
