import { useEffect, useRef } from 'react';
import { setupGame } from '../app/renderSync';
import { Hud } from './hud/Hud';
import { BuildPanel } from './panels';

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void setupGame(host).then((c) => {
      if (cancelled) {
        c();
      } else {
        cleanup = c;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className="game-root">
      <div ref={hostRef} className="canvas-host" />
      <Hud />
      <BuildPanel />
    </div>
  );
}
