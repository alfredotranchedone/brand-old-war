import { describe, expect, it } from 'vitest';
import { Camera, ZOOM_LEVELS } from '../src/render/camera';

const vp = { width: 800, height: 600 };

describe('camera', () => {
  it('schermo <-> mondo in andata e ritorno a ogni zoom', () => {
    const cam = new Camera();
    cam.center = { x: 120, y: -40 };
    for (let i = 0; i < ZOOM_LEVELS.length; i++) {
      cam.zoomIndex = i;
      const s = { x: 137, y: 421 };
      const back = cam.worldToScreen(cam.screenToWorld(s, vp), vp);
      expect(back.x).toBeCloseTo(s.x);
      expect(back.y).toBeCloseTo(s.y);
    }
  });

  it('lo zoom tiene fermo il punto sotto il cursore', () => {
    const cam = new Camera();
    const anchor = { x: 650, y: 120 };
    const before = cam.screenToWorld(anchor, vp);
    expect(cam.zoomStep(1, anchor, vp)).toBe(true);
    const after = cam.screenToWorld(anchor, vp);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('lo zoom si ferma ai livelli estremi', () => {
    const cam = new Camera();
    cam.zoomIndex = ZOOM_LEVELS.length - 1;
    expect(cam.zoomStep(1, { x: 0, y: 0 }, vp)).toBe(false);
    cam.zoomIndex = 0;
    expect(cam.zoomStep(-1, { x: 0, y: 0 }, vp)).toBe(false);
  });

  it('fit sceglie lo zoom più grande che contiene la mappa', () => {
    const cam = new Camera();
    cam.fit({ minX: 0, minY: 0, maxX: 900, maxY: 500 }, vp);
    expect(cam.scale).toBe(0.6);
    expect(cam.center).toEqual({ x: 450, y: 250 });
  });
});
