export const TICK_RATE    = 20;               // logic ticks per second
export const MS_PER_TICK  = 1000 / TICK_RATE; // 50 ms
const        MAX_DELTA    = 200;              // clamp: prevents spiral-of-death after tab hide

/**
 * Fixed-timestep game loop.
 *   - onTick  fires exactly TICK_RATE times/sec (game logic, physics, AI)
 *   - onRender fires every animation frame with an interpolation alpha [0,1]
 *     representing how far we are between the last tick and the next.
 *     Use alpha to lerp render positions for sub-tick smooth motion.
 */
export class GameLoop {
  private acc   = 0;
  private last  = 0;
  private _tick = 0;
  private raf: number | null = null;

  constructor(
    private readonly onTick:   (tick: number) => void,
    private readonly onRender: (alpha: number, tick: number) => void,
  ) {}

  start(): void {
    this.last = performance.now();
    this.raf  = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
  }

  get currentTick(): number { return this._tick; }

  private frame = (now: number): void => {
    const delta = Math.min(now - this.last, MAX_DELTA);
    this.last   = now;
    this.acc   += delta;

    while (this.acc >= MS_PER_TICK) {
      this.onTick(this._tick);
      this._tick++;
      this.acc -= MS_PER_TICK;
    }

    this.onRender(this.acc / MS_PER_TICK, this._tick);
    this.raf = requestAnimationFrame(this.frame);
  };
}
