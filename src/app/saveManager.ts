import { getPlatform } from '../platform';
import type { GameState } from '../sim/state';
import { deserialize, serialize } from '../sim/save/serialize';

export const AUTOSAVE_SLOT = 'autosave';

export async function saveGame(slot: string, state: GameState): Promise<void> {
  await getPlatform().saveFile(slot, serialize(state, Date.now()));
}

export async function loadGame(
  slot: string,
): Promise<{ state: GameState; savedAtMs: number } | null> {
  const raw = await getPlatform().loadFile(slot);
  if (raw === null) {
    return null;
  }
  return deserialize(raw);
}

export async function listSaves(): Promise<string[]> {
  return getPlatform().listSaves();
}
