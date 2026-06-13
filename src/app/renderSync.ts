import { Graphics } from 'pixi.js';
import { createScene } from '../render/scene';
import { Camera } from '../render/camera';
import { buildTilemap } from '../render/tilemap';
import { BuildingRenderer } from '../render/buildings';
import { RoadRenderer } from '../render/roads';
import { OverlayRenderer } from '../render/overlay';
import { attachInput } from '../render/input';
import { gridToScreen, mapPixelBounds } from '../render/iso';
import { validateMoveBuilding, validatePlaceBuilding } from '../sim/commands';
import { useGameStore, useUiStore } from './store';
import { startGameLoop } from './loop';
import { buildStressState } from './debug';

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
  const roads = new RoadRenderer(scene.app.renderer, scene.layers.roads);
  const overlay = new OverlayRenderer(scene.app.renderer, scene.layers.overlay);

  buildings.sync(initial);
  roads.sync(initial);
  overlay.sync(initial);

  const unsubscribe = useGameStore.subscribe((s) => {
    buildings.sync(s.state);
    roads.sync(s.state);
    overlay.sync(s.state);
  });

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
    getRoadMode: () => useUiStore.getState().roadMode,
    cancelBuild: () => {
      useUiStore.getState().setBuildDefId(null);
      useUiStore.getState().setRoadMode(null);
    },
    place: (defId, x, y) =>
      useGameStore.getState().dispatch({ type: 'PlaceBuilding', defId, x, y }),
    moveBuilding: (buildingId, x, y) =>
      useGameStore.getState().dispatch({ type: 'MoveBuilding', buildingId, x, y }),
    canPlace: (defId, x, y) => validatePlaceBuilding(getState(), defId, x, y) === null,
    canMove: (buildingId, x, y) => validateMoveBuilding(getState(), buildingId, x, y) === null,
    placeRoad: (x, y) => useGameStore.getState().dispatch({ type: 'PlaceRoad', x, y }),
    removeRoad: (x, y) => useGameStore.getState().dispatch({ type: 'RemoveRoad', x, y }),
  });

  // Камера центрируется на ратуше (центр карты)
  const center = gridToScreen((width - 1) / 2, (height - 1) / 2);
  camera.centerOn(center.x, center.y);

  const stopLoop = startGameLoop();

  return () => {
    stopLoop();
    detachInput();
    unsubscribe();
    buildings.destroy();
    roads.destroy();
    overlay.destroy();
    camera.destroy();
    scene.destroy();
  };
}
