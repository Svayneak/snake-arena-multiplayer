/**
 * Touchscreen State Tracker & Touch Telemetry Engine
 * Translates mobile touch gestures (continuous drag follower, tap-to-spawn, directional swipes)
 * into high-precision game canvas coordinates with zero input latency.
 */

export interface TouchPoint {
  clientX: number;
  clientY: number;
  canvasX: number;
  canvasY: number;
  time: number;
}

export interface SwipeEvent {
  direction: { x: number; y: number };
  name: 'up' | 'down' | 'left' | 'right';
  distance: number;
  velocity: number;
}

export class TouchscreenTracker {
  public isTouching: boolean = false;
  public startTouch: TouchPoint | null = null;
  public currentTouch: TouchPoint | null = null;
  public lastTouch: TouchPoint | null = null;
  private readonly SWIPE_MIN_DIST = 20; // Minimum px for swipe trigger
  private readonly SWIPE_MAX_TIME_MS = 350;

  constructor() {}

  /**
   * Transforms raw touch screen coordinates into the virtual canvas coordinate space.
   */
  public getCanvasCoords(
    touch: Touch | React.Touch,
    canvas: HTMLCanvasElement,
    virtualWidth: number,
    virtualHeight: number
  ): { cx: number; cy: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = virtualWidth / (rect.width || 1);
    const scaleY = virtualHeight / (rect.height || 1);

    const rawX = (touch.clientX - rect.left) * scaleX;
    const rawY = (touch.clientY - rect.top) * scaleY;

    // Clamp inside arena bounds
    const cx = Math.max(4, Math.min(virtualWidth - 4, rawX));
    const cy = Math.max(4, Math.min(virtualHeight - 4, rawY));

    return { cx, cy };
  }

  public handleTouchStart(
    touch: Touch | React.Touch,
    canvas: HTMLCanvasElement,
    virtualWidth: number,
    virtualHeight: number
  ): TouchPoint {
    const { cx, cy } = this.getCanvasCoords(touch, canvas, virtualWidth, virtualHeight);
    const point: TouchPoint = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      canvasX: cx,
      canvasY: cy,
      time: typeof performance !== 'undefined' ? performance.now() : Date.now()
    };

    this.isTouching = true;
    this.startTouch = point;
    this.currentTouch = point;
    this.lastTouch = point;

    return point;
  }

  public handleTouchMove(
    touch: Touch | React.Touch,
    canvas: HTMLCanvasElement,
    virtualWidth: number,
    virtualHeight: number
  ): { point: TouchPoint; swipe: SwipeEvent | null } {
    const { cx, cy } = this.getCanvasCoords(touch, canvas, virtualWidth, virtualHeight);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const point: TouchPoint = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      canvasX: cx,
      canvasY: cy,
      time: now
    };

    let swipe: SwipeEvent | null = null;

    if (this.startTouch) {
      const dx = point.clientX - this.startTouch.clientX;
      const dy = point.clientY - this.startTouch.clientY;
      const dt = point.time - this.startTouch.time;
      const dist = Math.hypot(dx, dy);

      if (dist >= this.SWIPE_MIN_DIST && dt <= this.SWIPE_MAX_TIME_MS) {
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          swipe = {
            direction: { x: dx > 0 ? 1 : -1, y: 0 },
            name: dx > 0 ? 'right' : 'left',
            distance: dist,
            velocity: dist / (dt || 1)
          };
        } else {
          // Vertical swipe
          swipe = {
            direction: { x: 0, y: dy > 0 ? 1 : -1 },
            name: dy > 0 ? 'down' : 'up',
            distance: dist,
            velocity: dist / (dt || 1)
          };
        }
      }
    }

    this.lastTouch = this.currentTouch;
    this.currentTouch = point;

    return { point, swipe };
  }

  public handleTouchEnd(): void {
    this.isTouching = false;
    this.startTouch = null;
    this.currentTouch = null;
  }
}

export const touchTracker = new TouchscreenTracker();
