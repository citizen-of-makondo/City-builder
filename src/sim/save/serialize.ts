import type { GameState } from '../state';
import { migrate } from './migrations';

export interface SaveFile {
  state: GameState;
  /** unix-время сохранения (мс); пишется снаружи sim, для оффлайн-прогресса */
  savedAtMs: number;
}

export function serialize(state: GameState, savedAtMs: number): string {
  const file: SaveFile = { state, savedAtMs };
  return JSON.stringify(file);
}

export function deserialize(json: string): SaveFile {
  const parsed = JSON.parse(json) as { state: Record<string, unknown>; savedAtMs: number };
  return {
    state: migrate(parsed.state),
    savedAtMs: typeof parsed.savedAtMs === 'number' ? parsed.savedAtMs : 0,
  };
}
