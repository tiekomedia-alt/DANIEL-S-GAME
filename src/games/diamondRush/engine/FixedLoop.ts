/**
 * Fixed-timestep game loop for Diamond Rush.
 *
 * Physics runs at exactly PHYSICS_HZ (60) per second — guaranteed regardless
 * of the display framerate. This prevents two mobile-specific bugs:
 *
 *   1. Boulder tunneling: a boulder ticking at 6 Hz will always see the player
 *      at integer tile positions (no sub-tile gaps to tunnel through).
 *   2. Spiral-of-death: MAX_FRAME_TIME clamps accumulated lag so a single
 *      heavy frame cannot cause an unbounded burst of catch-up ticks.
 *
 * Render runs at the display rate with an interpolation alpha ∈ [0, 1]:
 *   renderX = prevX + (currX - prevX) * alpha
 * Using alpha produces sub-tick-smooth motion even at physics rates far
 * below the display framerate.
 */

export const PHYSICS_HZ  = 60;
export const PHYSICS_DT  = 1000 / PHYSICS_HZ; // 16.667 ms

// Terminal-velocity guard at the loop level: if a frame took > 200ms
// (e.g., tab was hidden), skip the extra catch-up ticks rather than
// processing them all at once and freezing the browser.
const MAX_FRAME_TIME = 200; // ms

export class FixedLoop {
  private acc  = 0;
  private last = 0;
  private _tick = 0;
  private raf: number | null = null;

  constructor(
    /** Called exactly PHYSICS_HZ times per second with the integer tick counter. */
    private readonly onTick:   (tick: number) => void,
    /** Called every animation frame. Use alpha to lerp render positions. */
    private readonly onRender: (alpha: number, tick: number) => void,
  ) {}

  start(): void {
    this.last = performance.now();
    this.raf  = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
  }

  /** How many physics ticks have elapsed since start(). */
  get currentTick(): number { return this._tick; }

  private readonly frame = (now: number): void => {
    const dt = Math.min(now - this.last, MAX_FRAME_TIME);
    this.last = now;
    this.acc += dt;

    // Drain accumulated time in fixed steps
    while (this.acc >= PHYSICS_DT) {
      this.onTick(this._tick++);
      this.acc -= PHYSICS_DT;
    }

    // Interpolation factor: fraction of a tick elapsed since last physics update
    this.onRender(this.acc / PHYSICS_DT, this._tick);
    this.raf = requestAnimationFrame(this.frame);
  };
}
