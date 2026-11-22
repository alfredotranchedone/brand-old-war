import type { GameEvent } from '../core/events';
import { type Axial, type Point, hexToPixel } from '../core/hex';
import { HEX_SIZE } from './camera';
import { MAP_THEME } from './theme';

const LOSS_MS = 900;
const TRACER_MS = 500;

interface MoveAnim {
  readonly unitId: string;
  readonly points: readonly Point[];
  readonly start: number;
  readonly duration: number;
}

interface TracerAnim {
  readonly from: Point;
  readonly to: Point;
  readonly color: string;
  readonly start: number;
}

interface LossAnim {
  readonly at: Point;
  readonly text: string;
  readonly start: number;
}

/** Animazioni brevi sopra la mappa: movimento lungo il percorso e perdite sulle pedine. */
export class Animations {
  private moves: MoveAnim[] = [];
  private losses: LossAnim[] = [];
  private tracers: TracerAnim[] = [];

  add(events: readonly GameEvent[], unitPos: (id: string) => Axial | undefined, moveMs: number, now: number): void {
    for (const e of events) {
      if (e.kind === 'move') {
        this.moves = this.moves.filter((m) => m.unitId !== e.unitId);
        this.moves.push({ unitId: e.unitId, points: e.path.map((h) => hexToPixel(h, HEX_SIZE)), start: now, duration: moveMs });
      } else if (e.kind === 'combat') {
        const flash = (id: string, n: number, at?: Axial) => {
          const pos = at ?? unitPos(id);
          if (pos && n > 0) this.losses.push({ at: hexToPixel(pos, HEX_SIZE), text: `−${n}`, start: now });
        };
        const tracer = (ids: readonly string[], to: Axial | undefined, color: string) => {
          for (const id of ids) {
            const from = unitPos(id);
            if (from && to) this.tracers.push({ from: hexToPixel(from, HEX_SIZE), to: hexToPixel(to, HEX_SIZE), color, start: now });
          }
        };
        const s = e.support;
        tracer([...s.offensive, ...s.artilleryCover], e.targetPos, MAP_THEME.supportFriendly);
        tracer(s.defensive, e.targetPos, MAP_THEME.supportEnemy);
        tracer(s.barrage, unitPos(e.attackerId), MAP_THEME.supportEnemy);
        flash(e.attackerId, e.attackerLosses);
        flash(e.targetId, e.defenderLosses, e.retreatTo ?? undefined);
      } else if (e.kind === 'aaFire') {
        const from = unitPos(e.aaId);
        const to = unitPos(e.targetId);
        if (from && to) this.tracers.push({ from: hexToPixel(from, HEX_SIZE), to: hexToPixel(to, HEX_SIZE), color: MAP_THEME.bubble.aa, start: now });
        if (to && e.losses > 0) this.losses.push({ at: hexToPixel(to, HEX_SIZE), text: `−${e.losses}`, start: now });
      }
    }
  }

  isActive(now: number): boolean {
    this.moves = this.moves.filter((m) => now - m.start < m.duration);
    this.losses = this.losses.filter((l) => now - l.start < LOSS_MS);
    this.tracers = this.tracers.filter((t) => now - t.start < TRACER_MS);
    return this.moves.length > 0 || this.losses.length > 0 || this.tracers.length > 0;
  }

  clear(): void {
    this.moves = [];
    this.losses = [];
    this.tracers = [];
  }

  /** Traccianti dei supporti: un impulso che corre dall'unità di supporto all'esagono. */
  drawTracers(ctx: CanvasRenderingContext2D, now: number): void {
    for (const tr of this.tracers) {
      const t = Math.min(1, (now - tr.start) / TRACER_MS);
      const x = tr.from.x + (tr.to.x - tr.from.x) * t;
      const y = tr.from.y + (tr.to.y - tr.from.y) * t;
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.6;
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(tr.from.x, tr.from.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = tr.color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Posizione animata della pedina, se sta muovendo. */
  unitPoint(unitId: string, now: number): Point | null {
    const m = this.moves.find((a) => a.unitId === unitId);
    if (!m || m.points.length < 2) return null;
    const t = Math.min(1, (now - m.start) / m.duration) * (m.points.length - 1);
    const i = Math.min(Math.floor(t), m.points.length - 2);
    const a = m.points[i]!;
    const b = m.points[i + 1]!;
    const f = t - i;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  drawLosses(ctx: CanvasRenderingContext2D, now: number): void {
    for (const l of this.losses) {
      const t = (now - l.start) / LOSS_MS;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = MAP_THEME.targetFill;
      ctx.beginPath();
      ctx.arc(l.at.x, l.at.y, HEX_SIZE * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 15px ${MAP_THEME.font}`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = MAP_THEME.targetStroke;
      const y = l.at.y - HEX_SIZE * 0.6 - t * 12;
      ctx.strokeText(l.text, l.at.x, y);
      ctx.fillText(l.text, l.at.x, y);
      ctx.restore();
    }
  }
}
