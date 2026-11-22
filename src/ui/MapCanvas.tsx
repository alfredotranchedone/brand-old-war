/**
 * Contenitore React del canvas. React monta il canvas e collega gli eventi;
 * il disegno è tutto imperativo in MapRenderer, che si iscrive allo store
 * e ridisegna solo quando cambia qualcosa (niente re-render React per frame).
 */
import { useEffect, useRef } from 'react';
import { isOnMap } from '../core/map';
import { pixelToHex } from '../core/hex';
import { HEX_SIZE } from '../render/camera';
import { MapRenderer } from '../render/mapRenderer';
import { useUiStore } from './store';
import styles from './MapCanvas.module.css';

/** Pixel di movimento oltre i quali una pressione diventa trascinamento (non clic). */
const DRAG_THRESHOLD = 4;
/** Somma di deltaY della rotella che fa scattare un livello di zoom (trackpad compresi). */
const WHEEL_STEP = 60;

export function MapCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const renderer = new MapRenderer(canvas);
    const store = useUiStore;
    const push = () => {
      const s = store.getState();
      renderer.update({
        map: s.game.map,
        unitTypes: s.data.unitTypes,
        units: s.game.units,
        objectives: s.game.objectives,
        hovered: s.hovered,
        selectedUnitId: s.selectedUnitId,
        showCoords: s.showCoords,
      });
    };
    push();
    const unsubscribe = store.subscribe(push);

    // --- Dimensioni e DPI -------------------------------------------------
    let fitted = false;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
      if (!fitted && rect.width > 0 && rect.height > 0) {
        renderer.fitMap();
        fitted = true;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    // Cambio di DPI (es. finestra spostata su un altro monitor).
    let dprQuery: MediaQueryList | null = null;
    const onDprChange = () => {
      resize();
      watchDpr();
    };
    const watchDpr = () => {
      dprQuery?.removeEventListener('change', onDprChange);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener('change', onDprChange);
    };
    watchDpr();
    resize();

    // --- Cursore e trascinamento -------------------------------------------
    const localPoint = (e: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const updateHover = (p: { x: number; y: number }) => {
      const world = renderer.camera.screenToWorld(p, renderer.currentViewport);
      const h = pixelToHex(world, HEX_SIZE);
      store.getState().setHovered(isOnMap(store.getState().game.map, h) ? h : null);
    };

    let drag: { id: number; last: { x: number; y: number }; start: { x: number; y: number }; active: boolean } | null =
      null;

    const onPointerDown = (e: PointerEvent) => {
      // Tasto sinistro o centrale (o tocco): possibile trascinamento.
      if (e.button !== 0 && e.button !== 1) return;
      if (e.button === 1) e.preventDefault();
      const p = localPoint(e);
      drag = { id: e.pointerId, last: p, start: p, active: e.button === 1 };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = localPoint(e);
      if (drag && drag.id === e.pointerId) {
        if (!drag.active && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > DRAG_THRESHOLD) {
          drag.active = true;
        }
        if (drag.active) {
          renderer.pan(p.x - drag.last.x, p.y - drag.last.y);
          drag.last = p;
          canvas.style.cursor = 'grabbing';
        }
      }
      updateHover(p);
    };

    const endDrag = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const wasClick = !drag.active && e.type === 'pointerup' && e.button === 0;
      drag = null;
      if (wasClick) {
        const world = renderer.camera.screenToWorld(localPoint(e), renderer.currentViewport);
        const h = pixelToHex(world, HEX_SIZE);
        if (isOnMap(store.getState().game.map, h)) store.getState().clickHex(h);
        else store.getState().deselect();
      }
      canvas.style.cursor = '';
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };

    const onPointerLeave = () => {
      if (!drag) store.getState().setHovered(null);
    };

    // --- Zoom con la rotella ----------------------------------------------
    let wheelAccum = 0;
    let wheelTimer = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      wheelAccum += delta;
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => (wheelAccum = 0), 200);
      if (Math.abs(wheelAccum) < WHEEL_STEP) return;
      const step = wheelAccum < 0 ? 1 : -1;
      wheelAccum = 0;
      const p = localPoint(e);
      renderer.zoom(step, p);
      updateHover(p);
    };

    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault(); // niente autoscroll col tasto centrale
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('auxclick', onAuxClick);

    return () => {
      unsubscribe();
      ro.disconnect();
      dprQuery?.removeEventListener('change', onDprChange);
      window.clearTimeout(wheelTimer);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('auxclick', onAuxClick);
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
