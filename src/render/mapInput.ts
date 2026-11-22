/**
 * Collega un canvas al MapRenderer: dimensioni e DPI, trascinamento, zoom con la rotella,
 * cursore e clic sugli esagoni. Usato dal gioco e dall'editor.
 */
import { type Axial, pixelToHex } from '../core/hex';
import { HEX_SIZE } from './camera';
import type { MapRenderer } from './mapRenderer';

/** Pixel di movimento oltre i quali una pressione diventa trascinamento (non clic). */
const DRAG_THRESHOLD = 4;
/** Somma di deltaY della rotella che fa scattare un livello di zoom (trackpad compresi). */
const WHEEL_STEP = 60;

export interface MapInputHandlers {
  /** L'esagono è sulla mappa. */
  isOnMap(h: Axial): boolean;
  onHover(h: Axial | null): void;
  /** Clic sinistro senza trascinamento; null fuori mappa. */
  onClick(h: Axial | null): void;
  /** Se presente, il tasto sinistro dipinge (pressione e trascinamento) invece di spostare la mappa; Maiusc o tasto centrale spostano. */
  onPaint?(h: Axial, first: boolean): void;
}

/** Restituisce la funzione che stacca tutti gli ascoltatori. */
export function attachMapInput(wrap: HTMLElement, canvas: HTMLCanvasElement, renderer: MapRenderer, handlers: MapInputHandlers): () => void {
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
  const hexAt = (p: { x: number; y: number }) => {
    const h = pixelToHex(renderer.camera.screenToWorld(p, renderer.currentViewport), HEX_SIZE);
    return handlers.isOnMap(h) ? h : null;
  };

  let drag: { id: number; last: { x: number; y: number }; start: { x: number; y: number }; active: boolean } | null = null;
  let painting: { id: number; last: { x: number; y: number } } | null = null;
  const paintAt = (p: { x: number; y: number }, first = false) => {
    const h = hexAt(p);
    if (h) handlers.onPaint?.(h, first);
  };
  /** Dipinge lungo il segmento, così un trascinamento veloce non salta esagoni. */
  const paintTo = (p: { x: number; y: number }) => {
    if (!painting) return;
    const { last } = painting;
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / 4));
    for (let i = 1; i <= steps; i++) paintAt({ x: last.x + ((p.x - last.x) * i) / steps, y: last.y + ((p.y - last.y) * i) / steps });
    painting.last = p;
  };

  const onPointerDown = (e: PointerEvent) => {
    // Tasto sinistro o centrale (o tocco): possibile trascinamento.
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) e.preventDefault();
    const p = localPoint(e);
    if (handlers.onPaint && e.button === 0 && !e.shiftKey) {
      painting = { id: e.pointerId, last: p };
      canvas.setPointerCapture(e.pointerId);
      paintAt(p, true);
      return;
    }
    drag = { id: e.pointerId, last: p, start: p, active: e.button === 1 };
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    const p = localPoint(e);
    if (painting?.id === e.pointerId) paintTo(p);
    if (drag && drag.id === e.pointerId) {
      if (!drag.active && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > DRAG_THRESHOLD) drag.active = true;
      if (drag.active) {
        renderer.pan(p.x - drag.last.x, p.y - drag.last.y);
        drag.last = p;
        canvas.style.cursor = 'grabbing';
      }
    }
    handlers.onHover(hexAt(p));
  };

  const endDrag = (e: PointerEvent) => {
    if (painting?.id === e.pointerId) {
      painting = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const wasClick = !drag.active && e.type === 'pointerup' && e.button === 0;
    drag = null;
    if (wasClick) handlers.onClick(hexAt(localPoint(e)));
    canvas.style.cursor = '';
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };

  const onPointerLeave = () => {
    if (!drag && painting === null) handlers.onHover(null);
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
    handlers.onHover(hexAt(p));
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
  };
}
