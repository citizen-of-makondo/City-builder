import type { Platform } from './types';
import { createBrowserPlatform } from './browser';
import { createTauriPlatform } from './tauri';

export type { Platform } from './types';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let instance: Platform | null = null;

export function getPlatform(): Platform {
  if (!instance) {
    instance = isTauri() ? createTauriPlatform() : createBrowserPlatform();
  }
  return instance;
}
