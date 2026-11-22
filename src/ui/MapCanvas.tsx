/**
 * Contenitore React del canvas. React monta il canvas e collega gli eventi;
 * il disegno è tutto imperativo in MapRenderer, che si iscrive allo store
 * e ridisegna solo quando cambia qualcosa (niente re-render React per frame).
 */
import { useEffect, useRef } from 'react';
import { isOnMap } from '../core/map';
import { attachMapInput } from '../render/mapInput';
import { MapRenderer } from '../render/mapRenderer';
import { buildRenderInput } from './renderInput';
import { useUiStore } from './store';
import styles from './MapCanvas.module.css';

export function MapCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const renderer = new MapRenderer(canvas);
    const store = useUiStore;
    let lastLog = store.getState().game.log;
    const push = () => {
      const s = store.getState();
      renderer.update(buildRenderInput(s));
      const log = s.game.log;
      if (log === lastLog) return;
      // Animo solo eventi nuovi in coda; annulla o nuova partita fermano tutto.
      const grew = log.length > lastLog.length && log[lastLog.length - 1] === lastLog[lastLog.length - 1];
      if (grew && s.showAnimations) renderer.animate(log.slice(lastLog.length), s.data.rules.ai.animationMs);
      else if (!grew) renderer.stopAnimations();
      lastLog = log;
    };
    push();
    const unsubscribe = store.subscribe(push);

    const detach = attachMapInput(wrap, canvas, renderer, {
      isOnMap: (h) => isOnMap(store.getState().game.map, h),
      onHover: (h) => store.getState().setHovered(h),
      onClick: (h) => (h ? store.getState().clickHex(h) : store.getState().deselect()),
    });

    return () => {
      unsubscribe();
      detach();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
