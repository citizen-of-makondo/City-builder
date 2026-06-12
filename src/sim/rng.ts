/**
 * Seeded RNG (mulberry32). Единственный допустимый источник случайности
 * внутри симуляции: состояние хранится в GameState.rngState,
 * функции чистые — возвращают значение и новое состояние.
 */

export interface RngResult {
  /** число в [0, 1) */
  value: number;
  rngState: number;
}

export function nextRandom(rngState: number): RngResult {
  const t = (rngState + 0x6d2b79f5) >>> 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return { value, rngState: t };
}

/** Целое в [min, max] включительно. */
export function nextInt(
  rngState: number,
  min: number,
  max: number,
): { value: number; rngState: number } {
  const r = nextRandom(rngState);
  return { value: min + Math.floor(r.value * (max - min + 1)), rngState: r.rngState };
}
