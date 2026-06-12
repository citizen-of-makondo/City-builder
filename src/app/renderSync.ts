import { Graphics } from 'pixi.js';
import { createScene } from '../render/scene';
import { Camera } from '../render/camera';
import { buildTilemap } from '../render/tilemap';
import { BuildingRenderer } from '../render/buildings';
import { attachInput } from '../render/input';
import { gridToScreen, mapPixelBounds } from '../render/iso';
import { validateMoveBuilding, validatePlaceBuilding } from '../sim/commands';
import { useGameStore, useUiStore } from './store';
import { startGameLoop } from './loop';
import { buildStressState } from './debug';

/**
 * Склейка рендера с симуляцией: сцена, камера, тайлмап,
 * синхронизация спрайтов зданий со стором, ввод, игровой цикл.
 */
export async function setupGame(host: HTMLElement): Promise<() => void> {
  if (new URLSearchParams(window.location.search).has('stress')) {
    useGameStore.getState().replaceState(buildStressState());
  }

  const scene = await createScene(host);
  const initial = useGameStore.getState().state;
  const { width, height } = initial.mapSize;

  const camera = new Camera(scene.app, scene.world, mapPixelBounds(width, height));
  buildTilemap(scene.layers.ground, initial);

  const buildings = new BuildingRenderer(scene.app.renderer, scene.layers.buildings);
  buildings.sync(initial);
  const unsubscribe = useGameStore.subscribe((s) => buildings.sync(s.state));

  const ghost = new Graphics();
  ghost.visible = false;
  scene.layers.overlay.addChild(ghost);

  const getState = () => useGameStore.getState().state;
  const detachInput = attachInput({
    canvas: scene.app.canvas,
    camera,
    ghost,
    getState,
    getBuildDefId: () => useUiStore.getState().buildDefId,
    cancelBuild: () => useUiStore.getState().setBuildDefId(null),
    place: (defId, x, y) =>
      useGameStore.getState().dispatch({ type: 'PlaceBuilding', defId, x, y }),
    moveBuilding: (buildingId, x, y) =>
      useGameStore.getState().dispatch({ type: 'MoveBuilding', buildingId, x, y }),
    canPlace: (defId, x, y) => validatePlaceBuilding(getState(), defId, x, y) === null,
    canMove: (buildingId, x, y) => validateMoveBuilding(getState(), buildingId, x, y) === null,
  });

  const center = gridToScreen((width - 1) / 2, (height - 1) / 2);
  camera.centerOn(center.x, center.y);

  const stopLoop = startGameLoop();

  return () => {
    stopLoop();
    detachInput();
    unsubscribe();
    buildings.destroy();
    camera.destroy();
    scene.destroy();
  };
}
