/**
 * Deterministic PRNG (mulberry32) used only for generating mock data.
 * Keeps generated series (e.g. the equity curve) stable across renders and
 * app restarts, so screenshots/QA don't drift between runs.
 */
export function createSeededRandom(seed: number): () => number {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
