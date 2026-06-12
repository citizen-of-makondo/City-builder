import type { BuildingDef, BuildingDefId } from '../state';

/**
 * Контент — данные; код их интерпретирует. Полный набор зданий
 * каменного века — фаза 3. Пока минимум для каркаса.
 */
export const buildingDefs: Record<BuildingDefId, BuildingDef> = {
  town_hall: {
    id: 'town_hall',
    nameKey: 'building.town_hall',
    category: 'civic',
    size: { w: 4, h: 4 },
    cost: {},
    eraId: 'stone_age',
  },
  hut: {
    id: 'hut',
    nameKey: 'building.hut',
    category: 'residential',
    size: { w: 2, h: 2 },
    cost: { gold: 50 },
    eraId: 'stone_age',
  },
  gatherer: {
    id: 'gatherer',
    nameKey: 'building.gatherer',
    category: 'production',
    size: { w: 3, h: 3 },
    cost: { gold: 80 },
    eraId: 'stone_age',
  },
  totem: {
    id: 'totem',
    nameKey: 'building.totem',
    category: 'decoration',
    size: { w: 1, h: 1 },
    cost: { gold: 20 },
    eraId: 'stone_age',
  },
};

export function getBuildingDef(id: BuildingDefId): BuildingDef | null {
  return buildingDefs[id] ?? null;
}
