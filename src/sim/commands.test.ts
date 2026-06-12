import { describe, expect, it } from 'vitest';
import { applyCommand, validatePlaceBuilding } from './commands';
import { createInitialState, tileAt } from './state';
import { safeZoneOrigin } from './mapgen';
import { getBuildingDef } from './content/buildings';

function freshState() {
  const state = createInitialState(42);
  const safe = safeZoneOrigin(state.mapSize.width, state.mapSize.height);
  return { state, safe };
}

describe('PlaceBuilding', () => {
  it('ставит здание, занимает тайлы и списывает стоимость', () => {
    const { state, safe } = freshState();
    const goldBefore = state.resources.gold;
    const result = applyCommand(state, {
      type: 'PlaceBuilding',
      defId: 'hut',
      x: safe.x,
      y: safe.y,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.state;
    const building = Object.values(next.buildings)[0];
    expect(building?.defId).toBe('hut');
    expect(next.resources.gold).toBe(goldBefore - (getBuildingDef('hut')?.cost.gold ?? 0));
    // все 2×2 тайла заняты
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        expect(tileAt(next, safe.x + dx, safe.y + dy)?.buildingId).toBe(building?.id);
      }
    }
    // исходное состояние не тронуто
    expect(tileAt(state, safe.x, safe.y)?.buildingId).toBeNull();
  });

  it('отклоняет пересечение с другим зданием', () => {
    const { state, safe } = freshState();
    const r1 = applyCommand(state, {
      type: 'PlaceBuilding',
      defId: 'gatherer',
      x: safe.x,
      y: safe.y,
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = applyCommand(r1.state, {
      type: 'PlaceBuilding',
      defId: 'hut',
      x: safe.x + 2,
      y: safe.y + 2,
    });
    expect(r2).toEqual({ ok: false, error: 'tile_occupied' });
  });

  it('отклоняет выход за границы карты', () => {
    const { state } = freshState();
    const r = applyCommand(state, { type: 'PlaceBuilding', defId: 'hut', x: 31, y: 31 });
    expect(r).toEqual({ ok: false, error: 'out_of_bounds' });
  });

  it('отклоняет непригодный рельеф (вода)', () => {
    const { state } = freshState();
    const water = state.tiles.find((t) => t.terrain === 'water');
    expect(water).toBeDefined();
    if (!water) return;
    expect(validatePlaceBuilding(state, 'totem', water.x, water.y)).toBe('terrain_blocked');
  });

  it('отклоняет нехватку ресурсов', () => {
    const { state, safe } = freshState();
    const broke = { ...state, resources: { ...state.resources, gold: 0 } };
    expect(validatePlaceBuilding(broke, 'hut', safe.x, safe.y)).toBe('not_enough_resources');
  });

  it('отклоняет неизвестный тип здания', () => {
    const { state, safe } = freshState();
    expect(validatePlaceBuilding(state, 'no_such_def', safe.x, safe.y)).toBe('unknown_def');
  });
});

describe('MoveBuilding', () => {
  it('перемещает здание, освобождая старые тайлы', () => {
    const { state, safe } = freshState();
    const placed = applyCommand(state, {
      type: 'PlaceBuilding',
      defId: 'hut',
      x: safe.x,
      y: safe.y,
    });
    if (!placed.ok) throw new Error('place failed');
    const id = Object.keys(placed.state.buildings)[0] as string;
    const moved = applyCommand(placed.state, {
      type: 'MoveBuilding',
      buildingId: id,
      x: safe.x + 4,
      y: safe.y + 4,
    });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(tileAt(moved.state, safe.x, safe.y)?.buildingId).toBeNull();
    expect(tileAt(moved.state, safe.x + 4, safe.y + 4)?.buildingId).toBe(id);
    expect(moved.state.buildings[id]?.x).toBe(safe.x + 4);
  });

  it('разрешает сдвиг с пересечением собственной площадки', () => {
    const { state, safe } = freshState();
    const placed = applyCommand(state, {
      type: 'PlaceBuilding',
      defId: 'hut',
      x: safe.x,
      y: safe.y,
    });
    if (!placed.ok) throw new Error('place failed');
    const id = Object.keys(placed.state.buildings)[0] as string;
    const moved = applyCommand(placed.state, {
      type: 'MoveBuilding',
      buildingId: id,
      x: safe.x + 1,
      y: safe.y,
    });
    expect(moved.ok).toBe(true);
  });

  it('отклоняет перемещение на чужое здание', () => {
    const { state, safe } = freshState();
    const a = applyCommand(state, { type: 'PlaceBuilding', defId: 'hut', x: safe.x, y: safe.y });
    if (!a.ok) throw new Error('place failed');
    const b = applyCommand(a.state, {
      type: 'PlaceBuilding',
      defId: 'totem',
      x: safe.x + 4,
      y: safe.y,
    });
    if (!b.ok) throw new Error('place failed');
    const hutId = Object.values(a.state.buildings)[0]?.id as string;
    const moved = applyCommand(b.state, {
      type: 'MoveBuilding',
      buildingId: hutId,
      x: safe.x + 3,
      y: safe.y,
    });
    expect(moved).toEqual({ ok: false, error: 'tile_occupied' });
  });
});

describe('RemoveBuilding', () => {
  it('удаляет здание и освобождает тайлы', () => {
    const { state, safe } = freshState();
    const placed = applyCommand(state, {
      type: 'PlaceBuilding',
      defId: 'hut',
      x: safe.x,
      y: safe.y,
    });
    if (!placed.ok) throw new Error('place failed');
    const id = Object.keys(placed.state.buildings)[0] as string;
    const removed = applyCommand(placed.state, { type: 'RemoveBuilding', buildingId: id });
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.state.buildings[id]).toBeUndefined();
    expect(tileAt(removed.state, safe.x, safe.y)?.buildingId).toBeNull();
  });
});
