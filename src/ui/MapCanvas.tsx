/**
 * Contenitore React del canvas. React monta il canvas e collega gli eventi;
 * il disegno è tutto imperativo in MapRenderer, che si iscrive allo store
 * e ridisegna solo quando cambia qualcosa (niente re-render React per frame).
 */
import { Minus, Plus } from 'lucide-react';
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
  const rendererRef = useRef<MapRenderer | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const renderer = new MapRenderer(canvas);
    rendererRef.current = renderer;
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
      rendererRef.current = null;
    };
  }, []);

  const zoom = (step: number) => {
    const r = rendererRef.current;
    if (!r) return;
    const vp = r.currentViewport;
    r.zoom(step, { x: vp.width / 2, y: vp.height / 2 });
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.zoom}>
        <button type="button" className={styles.zoomButton} onClick={() => zoom(1)} aria-label="Ingrandisci" title="Ingrandisci">
          <Plus size={18} />
        </button>
        <button type="button" className={styles.zoomButton} onClick={() => zoom(-1)} aria-label="Riduci" title="Riduci">
          <Minus size={18} />
        </button>
      </div>
    </div>
  );
}
