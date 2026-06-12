import type { Graphics } from 'pixi.js';
import type { BuildingDefId, BuildingId, GameState } from '../sim/state';
import { tileAt } from '../sim/state';
import { getBuildingDef } from '../sim/content/buildings';
import type { Camera } from './camera';
import { gridToScreen, screenToGrid } from './iso';
import { drawFootprint } from './buildings';

/**
 * Ввод по карте: клик размещает здание в режиме строительства,
 * drag по зданию перемещает его, drag по земле двигает камеру,
 * колесо — зум к курсору, Esc/ПКМ — отмена режима строительства.
 */

export interface InputDeps {
  canvas: HTMLCanvasElement;
  camera: Camera;
  ghost: Graphics;
  getState(): GameState;
  getBuildDefId(): BuildingDefId | null;
  cancelBuild(): void;
  place(defId: BuildingDefId, x: number, y: number): void;
  moveBuilding(buildingId: BuildingId, x: number, y: number): void;
  canPlace(defId: BuildingDefId, x: number, y: number): boolean;
  canMove(buildingId: BuildingId, x: number, y: number): boolean;
}

const CLICK_DRAG_THRESHOLD = 6;

export function attachInput(deps: InputDeps): () => void {
  const { canvas, camera, ghost } = deps;

  type Mode = 'idle' | 'pan' | 'drag';
  let mode: Mode = 'idle';
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let vx = 0;
  let vy = 0;
  let lastT = 0;
  let dragId: BuildingId | null = null;
  let dragDx = 0;
  let dragDy = 0;

  const gridUnder = (sx: number, sy: number) => {
    const w = camera.toWorld(sx, sy);
    return screenToGrid(w.x, w.y);
  };

  function hideGhost(): void {
    ghost.clear();
    ghost.visible = false;
  }

  function showGhost(originX: number, originY: number, w: number, h: number, valid: boolean): void {
    const p = gridToScreen(originX, originY);
    ghost.position.set(p.x, p.y);
    drawFootprint(ghost, w, h, valid);
    ghost.visible = true;
  }

  function refreshGhost(sx: number, sy: number): void {
    if (mode === 'drag' && dragId) {
      const building = deps.getState().buildings[dragId];
      const def = building ? getBuildingDef(building.defId) : null;
      if (!building || !def) {
        hideGhost();
        return;
      }
      const cell = gridUnder(sx, sy);
      const tx = cell.col - dragDx;
      const ty = cell.row - dragDy;
      showGhost(tx, ty, def.size.w, def.size.h, deps.canMove(dragId, tx, ty));
      return;
    }
    const defId = deps.getBuildDefId();
    if (defId) {
      const def = getBuildingDef(defId);
      if (!def) {
        hideGhost();
        return;
      }
      const cell = gridUnder(sx, sy);
      showGhost(
        cell.col,
        cell.row,
        def.size.w,
        def.size.h,
        deps.canPlace(defId, cell.col, cell.row),
      );
      return;
    }
    hideGhost();
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.button === 2) {
      deps.cancelBuild();
      refreshGhost(e.offsetX, e.offsetY);
      return;
    }
    if (e.button !== 0) {
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    lastX = e.offsetX;
    lastY = e.offsetY;
    moved = 0;
    vx = 0;
    vy = 0;
    lastT = e.timeStamp;
    camera.stopInertia();

    if (!deps.getBuildDefId()) {
      const cell = gridUnder(e.offsetX, e.offsetY);
      const buildingId = tileAt(deps.getState(), cell.col, cell.row)?.buildingId ?? null;
      if (buildingId) {
        const building = deps.getState().buildings[buildingId];
        if (building) {
          mode = 'drag';
          dragId = buildingId;
          dragDx = cell.col - building.x;
          dragDy = cell.row - building.y;
          refreshGhost(e.offsetX, e.offsetY);
          return;
        }
      }
    }
    mode = 'pan';
  }

  function onPointerMove(e: PointerEvent): void {
    const dx = e.offsetX - lastX;
    const dy = e.offsetY - lastY;
    if (mode === 'pan') {
      camera.panBy(dx, dy);
      const dt = Math.max(1, e.timeStamp - lastT);
      // скорость в px/кадр при 60 fps — для инерции
      vx = (dx / dt) * 16.7;
      vy = (dy / dt) * 16.7;
      lastT = e.timeStamp;
      moved += Math.abs(dx) + Math.abs(dy);
    } else {
      if (mode === 'drag') {
        moved += Math.abs(dx) + Math.abs(dy);
      }
      refreshGhost(e.offsetX, e.offsetY);
    }
    lastX = e.offsetX;
    lastY = e.offsetY;
  }

  function onPointerUp(e: PointerEvent): void {
    if (mode === 'pan') {
      if (moved < CLICK_DRAG_THRESHOLD) {
        const defId = deps.getBuildDefId();
        if (defId) {
          const cell = gridUnder(e.offsetX, e.offsetY);
          deps.place(defId, cell.col, cell.row);
        }
      } else {
        camera.setInertia(vx, vy);
      }
    } else if (mode === 'drag' && dragId) {
      const cell = gridUnder(e.offsetX, e.offsetY);
      const tx = cell.col - dragDx;
      const ty = cell.row - dragDy;
      if (deps.canMove(dragId, tx, ty)) {
        deps.moveBuilding(dragId, tx, ty);
      }
      dragId = null;
    }
    mode = 'idle';
    refreshGhost(e.offsetX, e.offsetY);
  }

  function onPointerLeave(): void {
    mode = 'idle';
    dragId = null;
    hideGhost();
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    camera.zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }

  function onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      deps.cancelBuild();
      hideGhost();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onKeyDown);
  };
}
