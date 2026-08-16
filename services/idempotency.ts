/**
 * Idempotency-Key generation for Hermes's three mutating trading endpoints
 * (POST /orders, POST /orders/{id}/cancel, POST /positions/{symbol}/close).
 *
 * Strategy (matches hermes_v2's docs/architecture/trading.md): the backend
 * dedupes on `(user, endpoint, key)` and returns the original result for a
 * repeated key instead of re-executing — so a **retry of the same logical
 * action must reuse the same key**, and a **new logical action must get a
 * new key**. This module only generates keys; the reuse-vs-regenerate
 * decision belongs to the caller, since only the caller knows whether it's
 * retrying or starting over. The pattern used throughout this app:
 *
 * ```tsx
 * const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());
 * // ...on submit, pass idempotencyKey to the API call. If it fails and the
 * // user retries the *same* action (e.g. taps "Cerrar posición" again in
 * // the same confirm dialog), idempotencyKey is untouched, so the retry
 * // reuses it. Only call setIdempotencyKey(generateIdempotencyKey()) when
 * // a genuinely new action starts (the dialog is dismissed and reopened
 * // for a different order/position, or after this action already
 * // succeeded and the user starts another one).
 * ```
 */

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  const globalCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (globalCrypto?.getRandomValues) {
    globalCrypto.getRandomValues(bytes);
  } else {
    // No secure RNG available (older RN/Hermes engine without the crypto
    // polyfill). This key only needs to be unique per logical action, not
    // cryptographically unguessable — Math.random is an acceptable
    // fallback here, unlike anything security-sensitive.
    for (let i = 0; i < byteLength; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateIdempotencyKey(): string {
  const globalCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof globalCrypto?.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  // Manual UUID v4 shape for environments without crypto.randomUUID —
  // cosmetic (the backend treats the key as an opaque string), but keeps
  // keys visually consistent across platforms.
  const hex = randomHex(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
