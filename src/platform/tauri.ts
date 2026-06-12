import type { Platform } from './types';

const SAVE_DIR = 'saves';
const EXT = '.json';

/**
 * Нативная сборка: JSON-файлы в каталоге данных приложения через Tauri fs
 * (его же синхронизирует Steam Auto-Cloud). Плагин импортируется динамически,
 * чтобы браузерный dev-бандл не тянул tauri-зависимости.
 */
export function createTauriPlatform(): Platform {
  const fs = () => import('@tauri-apps/plugin-fs');

  async function ensureDir(): Promise<void> {
    const { exists, mkdir, BaseDirectory } = await fs();
    if (!(await exists(SAVE_DIR, { baseDir: BaseDirectory.AppData }))) {
      await mkdir(SAVE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
    }
  }

  return {
    async saveFile(name, data) {
      const { writeTextFile, BaseDirectory } = await fs();
      await ensureDir();
      await writeTextFile(`${SAVE_DIR}/${name}${EXT}`, data, {
        baseDir: BaseDirectory.AppData,
      });
    },
    async loadFile(name) {
      const { exists, readTextFile, BaseDirectory } = await fs();
      const path = `${SAVE_DIR}/${name}${EXT}`;
      if (!(await exists(path, { baseDir: BaseDirectory.AppData }))) {
        return null;
      }
      return readTextFile(path, { baseDir: BaseDirectory.AppData });
    },
    async listSaves() {
      const { exists, readDir, BaseDirectory } = await fs();
      if (!(await exists(SAVE_DIR, { baseDir: BaseDirectory.AppData }))) {
        return [];
      }
      const entries = await readDir(SAVE_DIR, { baseDir: BaseDirectory.AppData });
      return entries
        .filter((e) => e.isFile && e.name.endsWith(EXT))
        .map((e) => e.name.slice(0, -EXT.length));
    },
  };
}
