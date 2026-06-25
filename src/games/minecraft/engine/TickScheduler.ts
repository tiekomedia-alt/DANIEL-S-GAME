export const RANDOM_TICKS_PER_CHUNK = 3;   // analogous to Minecraft's randomTickSpeed default
export const MAX_SCHEDULED_TICKS    = 64;  // hard cap per chunk — mobile CPU budget guard

export interface ScheduledTick {
  x: number;
  y: number;
  blockId: number;
  fireTick: number;   // absolute tick number when this fires
  priority: number;   // lower = higher priority when same fireTick
}

export type ScheduledHandler = (t: ScheduledTick) => void;
export type RandomHandler    = (x: number, y: number, blockId: number, tick: number) => void;

export class TickScheduler {
  private queue: ScheduledTick[] = [];
  private dirty = false;

  /**
   * Schedule a future block update.
   * Deduplicates: the same (x, y, blockId) combination is never queued twice.
   */
  schedule(
    x: number, y: number, blockId: number,
    delayTicks: number, priority: number,
    currentTick: number,
  ): void {
    if (this.queue.length >= MAX_SCHEDULED_TICKS) return;
    if (this.queue.some(t => t.x === x && t.y === y && t.blockId === blockId)) return;
    this.queue.push({ x, y, blockId, fireTick: currentTick + delayTicks, priority });
    this.dirty = true;
  }

  /** Fire all ticks whose fireTick ≤ currentTick, in (fireTick, priority) order. */
  processTick(currentTick: number, handler: ScheduledHandler): void {
    if (!this.queue.length) return;

    if (this.dirty) {
      this.queue.sort((a, b) =>
        a.fireTick !== b.fireTick ? a.fireTick - b.fireTick : a.priority - b.priority,
      );
      this.dirty = false;
    }

    let i = 0;
    while (i < this.queue.length && this.queue[i].fireTick <= currentTick) i++;
    if (i) { this.queue.splice(0, i).forEach(handler); }
  }

  /**
   * Uniformly sample `count` random positions from the world array and invoke
   * handler only on random-tick-eligible blocks (caller decides eligibility).
   * O(count) per call — safe within 50 ms budget.
   */
  static processRandomTicks(
    world: Uint8Array,
    ww: number, wh: number,
    eligibleSet: ReadonlySet<number>,
    handler: RandomHandler,
    currentTick: number,
    count = RANDOM_TICKS_PER_CHUNK,
  ): void {
    const total = ww * wh;
    for (let i = 0; i < count; i++) {
      const idx = (Math.random() * total) | 0;
      const b   = world[idx];
      if (!eligibleSet.has(b)) continue;
      const x = idx % ww;
      const y = (idx / ww) | 0;
      handler(x, y, b, currentTick);
    }
  }
}
