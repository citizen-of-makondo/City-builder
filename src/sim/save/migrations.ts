import type { GameState } from '../state';
import { SCHEMA_VERSION } from '../state';

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Миграции сейвов: ключ — версия, С которой мигрируем (v -> v+1).
 * При изменении схемы: поднять SCHEMA_VERSION и добавить миграцию.
 */
const migrations: Record<number, Migration> = {};

export function migrate(raw: Record<string, unknown>): GameState {
  let current = raw;
  let version = typeof current.schemaVersion === 'number' ? current.schemaVersion : 0;
  while (version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) {
      throw new Error(`No migration from save schema v${version}`);
    }
    current = step(current);
    version += 1;
    current.schemaVersion = version;
  }
  return current as unknown as GameState;
}
