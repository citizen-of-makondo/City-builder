import { useGameStore } from './store';

const TICK_MS = 1000;

/** Запускает игровой цикл: 1 тик симуляции в секунду. Возвращает stop. */
export function startGameLoop(): () => void {
  const id = window.setInterval(() => {
    useGameStore.getState().advanceTick();
  }, TICK_MS);
  return () => window.clearInterval(id);
}
