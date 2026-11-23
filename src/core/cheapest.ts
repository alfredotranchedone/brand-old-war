import { type Axial, type HexKey, hexKey } from './hex';

const EPS = 1e-9;

interface Node {
  readonly pos: Axial;
  readonly cost: number;
}

/** Coda con priorità minima (heap binario) sul costo. */
class MinQueue {
  private readonly items: Node[] = [];

  get size(): number {
    return this.items.length;
  }

  push(n: Node): void {
    const a = this.items;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]!.cost <= n.cost) break;
      a[i] = a[p]!;
      i = p;
    }
    a[i] = n;
  }

  pop(): Node {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length === 0) return top;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= a.length) break;
      const c = l + 1 < a.length && a[l + 1]!.cost < a[l]!.cost ? l + 1 : l;
      if (a[c]!.cost >= last.cost) break;
      a[i] = a[c]!;
      i = c;
    }
    a[i] = last;
    return top;
  }
}

/** Passi possibili da un esagono, con il costo di ciascuno. */
export type Steps = (from: Axial) => Iterable<readonly [Axial, number]>;

/** Costo minimo da più partenze (costo 0) entro `maxCost`. */
export function cheapestCosts(starts: Iterable<Axial>, maxCost: number, steps: Steps): Map<HexKey, number> {
  const cost = new Map<HexKey, number>();
  const queue = new MinQueue();
  for (const pos of starts) {
    cost.set(hexKey(pos), 0);
    queue.push({ pos, cost: 0 });
  }
  while (queue.size > 0) {
    const node = queue.pop();
    if (node.cost > (cost.get(hexKey(node.pos)) ?? Infinity) + EPS) continue;
    for (const [next, step] of steps(node.pos)) {
      const c = node.cost + step;
      const key = hexKey(next);
      if (c > maxCost + EPS || c >= (cost.get(key) ?? Infinity) - EPS) continue;
      cost.set(key, c);
      queue.push({ pos: next, cost: c });
    }
  }
  return cost;
}
