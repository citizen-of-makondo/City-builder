import { useEffect, useRef } from 'react';
import { createScene } from '../render/scene';
import { startGameLoop } from '../app/loop';
import { Hud } from './hud/Hud';

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let destroyed = false;
    let destroyScene: (() => void) | null = null;

    void createScene(host).then((scene) => {
      if (destroyed) {
        scene.destroy();
        return;
      }
      destroyScene = () => scene.destroy();
    });
    const stopLoop = startGameLoop();

    return () => {
      destroyed = true;
      stopLoop();
      destroyScene?.();
    };
  }, []);

  return (
    <div className="game-root">
      <div ref={hostRef} className="canvas-host" />
      <Hud />
    </div>
  );
}
