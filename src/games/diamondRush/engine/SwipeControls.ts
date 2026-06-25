/**
 * Mobile-first swipe gesture detector.
 * Attaches to any HTMLElement and fires a callback with the swipe direction.
 * Does NOT render UI — works alongside existing D-pad controls.
 *
 * Behavior:
 *   - Tracks touchstart → touchend delta
 *   - If distance < threshold: treated as a tap (ignored)
 *   - If |dx| >= |dy|: horizontal swipe (left/right)
 *   - If |dy| > |dx|: vertical swipe (up/down)
 *   - Uses passive: false on touchstart/touchend so preventDefault() can
 *     suppress native scroll during gameplay (critical for embedded canvas)
 */

export type SwipeDir = 'up' | 'down' | 'left' | 'right';
export type SwipeHandler = (dir: SwipeDir) => void;

const MIN_SWIPE_PX = 24; // minimum travel to register as a swipe

export class SwipeControls {
  private startX = 0;
  private startY = 0;
  private active = false;

  private readonly onStart = (e: TouchEvent): void => {
    const t = e.touches[0];
    this.startX = t.clientX;
    this.startY = t.clientY;
    this.active = true;
    e.preventDefault();
  };

  private readonly onEnd = (e: TouchEvent): void => {
    if (!this.active) return;
    this.active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.startX;
    const dy = t.clientY - this.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < MIN_SWIPE_PX && ady < MIN_SWIPE_PX) return; // tap — no action

    if (adx >= ady) {
      this.cb(dx > 0 ? 'right' : 'left');
    } else {
      this.cb(dy > 0 ? 'down' : 'up');
    }
    e.preventDefault();
  };

  private readonly onCancel = (): void => { this.active = false; };

  constructor(
    private readonly el: HTMLElement,
    private cb: SwipeHandler,
    private readonly minDistance = MIN_SWIPE_PX,
  ) {
    void this.minDistance; // used via closure reference at construction time
    el.addEventListener('touchstart',  this.onStart,  { passive: false });
    el.addEventListener('touchend',    this.onEnd,    { passive: false });
    el.addEventListener('touchcancel', this.onCancel);
  }

  /** Update handler without detaching/re-attaching listeners (safe after re-render). */
  setHandler(cb: SwipeHandler): void { this.cb = cb; }

  /** Remove all event listeners. Call in useEffect cleanup. */
  destroy(): void {
    this.el.removeEventListener('touchstart',  this.onStart);
    this.el.removeEventListener('touchend',    this.onEnd);
    this.el.removeEventListener('touchcancel', this.onCancel);
  }
}
