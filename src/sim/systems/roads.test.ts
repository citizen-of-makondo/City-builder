import { describe, expect, it } from 'vitest';
import { applyCommand } from '../commands';
import { createNewGame } from '../newGame';
import { getRoadMask, connectedBuildingIds } from './roads';
import type { GameState } from '../state';

// ————— Вспомогательные функции —————

/** Создаёт свежую игру с ратушей в центре 32×32. */
function newGame(): GameState {
  return createNewGame(42);
}

/** Добавляет дороги в список координат. */
function withRoads(state: GameState, coords: Array<[number, number]>): GameState {
  let s = state;
  for (const [x, y] of coords) {
    const r = applyCommand(s, { type: 'PlaceRoad', x, y });
    if (r.ok) s = r.state;
  }
  return s;
}

/** Размещает здание; бросает при ошибке. */
function withBuilding(state: GameState, defId: string, x: number, y: number): GameState {
  const r = applyCommand(state, { type: 'PlaceBuilding', defId, x, y });
  if (!r.ok) throw new Error(`place ${defId}@(${x},${y}) failed: ${r.error}`);
  return r.state;
}

// ————— getRoadMask —————

describe('getRoadMask', () => {
  it('нет соседей → 0', () => {
    // Ставим одну изолированную дорогу
    const s = withRoads(newGame(), [[0, 0]]);
    expect(getRoadMask(s, 0, 0)).toBe(0);
  });

  it('N-сосед → бит 1', () => {
    const s = withRoads(newGame(), [
      [5, 5],
      [5, 4],
    ]);
    expect(getRoadMask(s, 5, 5)).toBe(1);
  });

  it('E-сосед → бит 2', () => {
    const s = withRoads(newGame(), [
      [5, 5],
      [6, 5],
    ]);
    expect(getRoadMask(s, 5, 5)).toBe(2);
  });

  it('S-сосед → бит 4', () => {
    const s = withRoads(newGame(), [
      [5, 5],
      [5, 6],
    ]);
    expect(getRoadMask(s, 5, 5)).toBe(4);
  });

  it('W-сосед → бит 8', () => {
    const s = withRoads(newGame(), [
      [5, 5],
      [4, 5],
    ]);
    expect(getRoadMask(s, 5, 5)).toBe(8);
  });

  it('все четыре соседа → 15', () => {
    const s = withRoads(newGame(), [
      [5, 5],
      [5, 4],
      [6, 5],
      [5, 6],
      [4, 5],
    ]);
    expect(getRoadMask(s, 5, 5)).toBe(15);
  });

  it('NS (прямая вертикаль) → 5', () => {
    const s = withRoads(newGame(), [
      [5, 4],
      [5, 5],
      [5, 6],
    ]);
    expect(getRoadMask(s, 5, 5)).toBe(5); // N=1 + S=4
  });

  it('EW (прямая горизонталь) → 10', () => {
    const s = withRoads(newGame(), [
      [4, 5],
      [5, 5],
      [6, 5],
    ]);
    expect(getRoadMask(s, 5, 5)).toBe(10); // E=2 + W=8
  });

  it('тайл вне карты не даёт бит', () => {
    const s = withRoads(newGame(), [[0, 0]]);
    // слева и сверху — вне карты → маска 0
    expect(getRoadMask(s, 0, 0)).toBe(0);
  });
});

// ————— BFS-связность —————

// Ратуша 4×4 стоит в (14,14)–(17,17) на карте 32×32.
// Её правый край — столбец 17; тайл (18,16) примыкает к ратуше.

describe('BFS-связность (updateConnectivity / connectedBuildingIds)', () => {
  it('ратуша всегда соединена', () => {
    const s = newGame();
    const th = Object.values(s.buildings).find((b) => b.defId === 'town_hall');
    expect(th).toBeDefined();
    expect(th!.connected).toBe(true);
  });

  it('здание без дороги — не соединено', () => {
    // Хижина в (20, 14) — нет дороги до ратуши
    const s = withBuilding(newGame(), 'hut', 20, 14);
    const hut = Object.values(s.buildings).find((b) => b.defId === 'hut');
    expect(hut?.connected).toBe(false);
  });

  it('здание через дорогу у ратуши — соединено', () => {
    // Дорога от правого края ратуши (18,14)→(18,15)→(18,16)
    // Хижина в (19,14) примыкает к дороге (18,14)
    let s = newGame();
    s = withRoads(s, [
      [18, 14],
      [18, 15],
      [18, 16],
    ]);
    s = withBuilding(s, 'hut', 19, 14);
    const hut = Object.values(s.buildings).find((b) => b.defId === 'hut');
    expect(hut?.connected).toBe(true);
  });

  it('здание через разрыв в дороге — не соединено', () => {
    // Дорога (18,14) и (20,14), но между ними пропуск (19,14)
    let s = newGame();
    s = withRoads(s, [
      [18, 14],
      [20, 14],
    ]);
    s = withBuilding(s, 'totem', 21, 14);
    const totem = Object.values(s.buildings).find((b) => b.defId === 'totem');
    expect(totem?.connected).toBe(false);
  });

  it('прокладка дороги в разрыв соединяет здание', () => {
    let s = newGame();
    s = withRoads(s, [
      [18, 14],
      [20, 14],
    ]);
    s = withBuilding(s, 'totem', 21, 14);
    // Сначала не соединено
    expect(Object.values(s.buildings).find((b) => b.defId === 'totem')?.connected).toBe(false);
    // Прокладываем пропущенный тайл
    s = withRoads(s, [[19, 14]]);
    expect(Object.values(s.buildings).find((b) => b.defId === 'totem')?.connected).toBe(true);
  });

  it('удаление дороги разрывает связность', () => {
    let s = newGame();
    s = withRoads(s, [
      [18, 14],
      [19, 14],
      [20, 14],
    ]);
    s = withBuilding(s, 'totem', 21, 14);
    expect(Object.values(s.buildings).find((b) => b.defId === 'totem')?.connected).toBe(true);

    // Убираем промежуточную дорогу
    const r = applyCommand(s, { type: 'RemoveRoad', x: 19, y: 14 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.values(r.state.buildings).find((b) => b.defId === 'totem')?.connected).toBe(
      false,
    );
  });

  it('connectedBuildingIds возвращает корректный набор', () => {
    let s = newGame();
    // Хижина через дорогу — должна быть в наборе
    s = withRoads(s, [
      [18, 14],
      [19, 14],
    ]);
    s = withBuilding(s, 'hut', 20, 14);
    // Тотем без дороги — не должен быть
    s = withBuilding(s, 'totem', 5, 5);

    const ids = connectedBuildingIds(s);
    const hut = Object.values(s.buildings).find((b) => b.defId === 'hut');
    const totem = Object.values(s.buildings).find((b) => b.defId === 'totem');
    const th = Object.values(s.buildings).find((b) => b.defId === 'town_hall');

    expect(ids.has(th!.id)).toBe(true);
    expect(ids.has(hut!.id)).toBe(true);
    expect(ids.has(totem!.id)).toBe(false);
  });

  it('перемещение здания пересчитывает связность', () => {
    let s = newGame();
    // Дорога у ратуши
    s = withRoads(s, [[18, 14]]);
    // Хижина рядом с дорогой → соединена
    s = withBuilding(s, 'hut', 19, 14);
    expect(Object.values(s.buildings).find((b) => b.defId === 'hut')?.connected).toBe(true);

    // Перемещаем хижину далеко (5,5) — без дорог
    const hutId = Object.values(s.buildings).find((b) => b.defId === 'hut')!.id;
    const r = applyCommand(s, { type: 'MoveBuilding', buildingId: hutId, x: 5, y: 5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.buildings[hutId]?.connected).toBe(false);
  });
});
