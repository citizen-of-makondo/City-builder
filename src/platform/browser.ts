import type { Platform } from './types';

const PREFIX = 'citybuilder.save.';

/** Dev-режим в браузере: сейвы в localStorage. */
export function createBrowserPlatform(): Platform {
  return {
    async saveFile(name, data) {
      localStorage.setItem(PREFIX + name, data);
    },
    async loadFile(name) {
      return localStorage.getItem(PREFIX + name);
    },
    async listSaves() {
      const names: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREFIX)) {
          names.push(key.slice(PREFIX.length));
        }
      }
      return names;
    },
  };
}
