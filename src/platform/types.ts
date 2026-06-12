/**
 * Платформенные API (файлы, позже Steamworks) — только через этот интерфейс,
 * чтобы dev-режим работал в браузере без Tauri.
 */
export interface Platform {
  saveFile(name: string, data: string): Promise<void>;
  /** null — сейва с таким именем нет */
  loadFile(name: string): Promise<string | null>;
  listSaves(): Promise<string[]>;
}
