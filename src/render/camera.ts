import type { Application, Container, Ticker } from 'pixi.js';
import type { PixelBounds } from './iso';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;

/** Камера: pan/zoom мирового контейнера с инерцией и границами карты. */
export class Camera {
  zoom = 1;
  private vx = 0;
  private vy = 0;

  constructor(
    private readonly app: Application,
    readonly world: Container,
    private readonly bounds: PixelBounds,
  ) {
    app.ticker.add(this.update, this);
  }

  destroy(): void {
    this.app.ticker.remove(this.update, this);
  }

  panBy(dx: number, dy: number): void {
    this.world.x += dx;
    this.world.y += dy;
    this.clamp();
  }

  /** Зум к точке экрана: точка мира под курсором остаётся на месте. */
  zoomAt(sx: number, sy: number, factor: number): void {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor));
    if (next === this.zoom) {
      return;
    }
    const wx = (sx - this.world.x) / this.zoom;
    const wy = (sy - this.world.y) / this.zoom;
    this.zoom = next;
    this.world.scale.set(next);
    this.world.x = sx - wx * next;
    this.world.y = sy - wy * next;
    this.clamp();
  }

  /** Скорость инерции в px/кадр (60 fps), затухает в update. */
  setInertia(vx: number, vy: number): void {
    this.vx = vx;
    this.vy = vy;
  }

  stopInertia(): void {
    this.vx = 0;
    this.vy = 0;
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.world.x) / this.zoom,
      y: (sy - this.world.y) / this.zoom,
    };
  }

  centerOn(wx: number, wy: number): void {
    this.world.x = this.app.screen.width / 2 - wx * this.zoom;
    this.world.y = this.app.screen.height / 2 - wy * this.zoom;
    this.clamp();
  }

  private update(ticker: Ticker): void {
    if (this.vx === 0 && this.vy === 0) {
      return;
    }
    const dt = ticker.deltaTime;
    this.panBy(this.vx * dt, this.vy * dt);
    const decay = Math.pow(0.92, dt);
    this.vx *= decay;
    this.vy *= decay;
    if (Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.05) {
      this.stopInertia();
    }
  }

  /** Центр экрана не выходит за пиксельные границы карты. */
  private clamp(): void {
    const halfW = this.app.screen.width / 2;
    const halfH = this.app.screen.height / 2;
    const cx = (halfW - this.world.x) / this.zoom;
    const cy = (halfH - this.world.y) / this.zoom;
    const clampedX = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, cx));
    const clampedY = Math.min(this.bounds.maxY, Math.max(this.bounds.minY, cy));
    this.world.x = halfW - clampedX * this.zoom;
    this.world.y = halfH - clampedY * this.zoom;
  }
}
