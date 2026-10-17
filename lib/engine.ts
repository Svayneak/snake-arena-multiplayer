/**
 * Snake Game Core Engine
 * Handles game loop, input handling, physics, rendering, particles, food spawning,
 * dynamic zero-jump cursor follow engine, and telemetry integration.
 */
import { soundManager } from './audio';
import { cursorTracker } from './tracker';

export interface SnakeGameOptions {
  width?: number;
  height?: number;
  difficulty?: 'easy' | 'normal' | 'hard' | 'insane';
  gameMode?: 'classic' | 'portal';
  controlType?: 'cursor' | 'wasd';
  gridVisible?: boolean;
  onScoreUpdate?: (score: number, apples: number, difficulty: string) => void;
  onGameOver?: (data: GameOverData) => void;
  onStateChange?: (state: string) => void;
  onBonusUpdate?: (data: { percent: number; remainingSec: number } | null) => void;
}

export interface GameOverData {
  reason: string;
  score: number;
  apples: number;
  goldenApples: number;
  difficulty: string;
  gameMode: 'classic' | 'portal';
}

export class SnakeGame {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  public width: number;
  public height: number;
  public tileSize: number = 24;
  public tileCountX: number = 22;
  public tileCountY: number = 22;

  public static readonly STATE_IDLE = 'idle';
  public static readonly STATE_PLAYING = 'playing';
  public static readonly STATE_PAUSED = 'paused';
  public static readonly STATE_GAMEOVER = 'gameover';
  public state: string = SnakeGame.STATE_IDLE;

  public difficulty: 'easy' | 'normal' | 'hard' | 'insane' = 'normal';
  public gameMode: 'classic' | 'portal' = 'classic';
  public wallCollision: boolean = true;
  public gridVisible: boolean = true;
  public controlType: 'cursor' | 'wasd' = 'cursor';

  // Continuous Cursor follower snake variables
  public cursorHead: { x: number; y: number } = { x: 270, y: 270 };
  public cursorHeading: number = 0;
  public trailHistory: Array<{ x: number; y: number }> = [];
  public continuousSegments: number = 10;
  public segmentSpacing: number = 14;
  public safeNeckSegments: number = 8; // First 8 segments (~112px) safe from self-collision
  public cursorRadius: number = 11;
  public isSpawnArmed: boolean = true;
  public spawnShieldUntil: number = 0; // 1.5s protection shield

  // Classic Grid WASD snake variables
  public snake: Array<{ x: number; y: number }> = [];
  public direction: { x: number; y: number } = { x: 1, y: 0 };
  public nextDirection: { x: number; y: number } = { x: 1, y: 0 };
  public inputQueue: Array<{ x: number; y: number }> = [];

  // Food items
  public food: { x: number; y: number; spawnTime: number } | null = null;
  public goldenApple: { x: number; y: number; bornTime: number; duration: number } | null = null;
  public goldenAppleTimer: number = 0;
  public goldenAppleDuration: number = 8000;

  // Score & stats
  public score: number = 0;
  public applesEaten: number = 0;
  public goldenApplesEaten: number = 0;

  // Speeds
  public baseSpeedMap = {
    easy: 140,
    normal: 95,
    hard: 65,
    insane: 42
  };
  public currentSpeed: number = 95;
  private lastTickTime: number = 0;
  private animFrameId: number | null = null;

  // Particles
  public particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    decay: number;
  }> = [];

  private tickCounter: number = 0;
  private lastReportedBonusSec: number = -1;

  // Callbacks
  public onScoreUpdate: (score: number, apples: number, difficulty: string) => void;
  public onGameOver: (data: GameOverData) => void;
  public onStateChange: (state: string) => void;
  public onBonusUpdate: (data: { percent: number; remainingSec: number } | null) => void;

  constructor(canvas: HTMLCanvasElement, options: SnakeGameOptions = {}) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2d context');
    this.ctx = context;

    this.width = options.width || 540;
    this.height = options.height || 540;
    this.difficulty = options.difficulty || 'normal';
    this.gameMode = options.gameMode || 'classic';
    this.wallCollision = this.gameMode === 'classic';
    this.gridVisible = options.gridVisible !== undefined ? options.gridVisible : true;
    this.controlType = options.controlType || 'cursor';

    this.onScoreUpdate = options.onScoreUpdate || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.onBonusUpdate = options.onBonusUpdate || (() => {});

    this.setupCanvasDPI();
    this.resetGame();
    this.draw();
  }

  public setupCanvasDPI(): void {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.tileCountX = Math.max(12, Math.floor(this.width / this.tileSize));
    this.tileCountY = Math.max(12, Math.floor(this.height / this.tileSize));
  }

  public resizeArena(newWidth: number, newHeight: number): void {
    if (!newWidth || !newHeight) return;
    this.width = Math.max(320, Math.round(newWidth));
    this.height = Math.max(320, Math.round(newHeight));
    this.setupCanvasDPI();

    if (this.food) {
      this.food.x = Math.min(this.tileCountX - 1, Math.max(0, this.food.x));
      this.food.y = Math.min(this.tileCountY - 1, Math.max(0, this.food.y));
    }
    if (this.goldenApple) {
      this.goldenApple.x = Math.min(this.tileCountX - 1, Math.max(0, this.goldenApple.x));
      this.goldenApple.y = Math.min(this.tileCountY - 1, Math.max(0, this.goldenApple.y));
    }

    this.draw();
  }

  public resetGame(spawnPos: { x: number; y: number } | null = null): void {
    const midTileX = Math.floor(this.tileCountX / 2);
    const midTileY = Math.floor(this.tileCountY / 2);

    // Reset grid snake
    this.snake = [
      { x: midTileX, y: midTileY },
      { x: midTileX - 1, y: midTileY },
      { x: midTileX - 2, y: midTileY }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.inputQueue = [];

    // Reset continuous cursor snake with Tail Inception
    this.continuousSegments = 10;
    let startX = this.width / 2;
    let startY = this.height / 2;

    if (spawnPos && typeof spawnPos.x === 'number' && typeof spawnPos.y === 'number') {
      const margin = 45;
      startX = Math.max(margin, Math.min(this.width - margin, spawnPos.x));
      startY = Math.max(margin, Math.min(this.height - margin, spawnPos.y));
      this.isSpawnArmed = false;
    } else {
      this.isSpawnArmed = true; // Zero-jump armed: snake will safely spawn under cursor
    }

    this.cursorHead = { x: startX, y: startY };
    this.cursorHeading = 0;
    // Tail Inception: collapsed trail avoids immediate self-collision
    this.trailHistory = [{ x: startX, y: startY }];
    this.spawnShieldUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 1500;

    this.score = 0;
    this.applesEaten = 0;
    this.goldenApplesEaten = 0;
    this.currentSpeed = this.baseSpeedMap[this.difficulty] || 95;

    this.food = null;
    this.goldenApple = null;
    this.goldenAppleTimer = 0;
    this.lastReportedBonusSec = -1;
    this.particles = [];

    this.spawnFood();
    this.onScoreUpdate(this.score, this.applesEaten, this.difficulty);
    this.onBonusUpdate(null);
    this.draw();

    cursorTracker.recordEvent('GAME_RESET', { startX, startY, armed: this.isSpawnArmed });
  }

  public setControlType(type: 'cursor' | 'wasd'): void {
    this.controlType = type;
    if (this.state === SnakeGame.STATE_IDLE) {
      this.resetGame();
      this.draw();
    }
  }

  public start(spawnPos: { x: number; y: number } | null = null): void {
    if (this.state === SnakeGame.STATE_PLAYING) return;
    if (this.state === SnakeGame.STATE_GAMEOVER || this.state === SnakeGame.STATE_IDLE) {
      this.resetGame(spawnPos);
    } else if (spawnPos) {
      this.synchronizeCursorHead(spawnPos.x, spawnPos.y);
    }

    this.setState(SnakeGame.STATE_PLAYING);
    this.lastTickTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    cursorTracker.startMatch({
      gameMode: this.gameMode,
      difficulty: this.difficulty,
      controlType: this.controlType,
      arenaWidth: this.width,
      arenaHeight: this.height
    });

    if (!this.animFrameId) {
      this.loop(performance.now());
    }
  }

  public pause(): void {
    if (this.state === SnakeGame.STATE_PLAYING) {
      this.setState(SnakeGame.STATE_PAUSED);
      cursorTracker.recordEvent('PAUSED');
    } else if (this.state === SnakeGame.STATE_PAUSED) {
      this.setState(SnakeGame.STATE_PLAYING);
      this.lastTickTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.spawnShieldUntil = this.lastTickTime + 1000;
      cursorTracker.recordEvent('RESUMED');
    }
  }

  public synchronizeCursorHead(cx: number, cy: number): void {
    if (this.controlType !== 'cursor') return;
    const margin = 35;
    const safeX = Math.max(margin, Math.min(this.width - margin, cx));
    const safeY = Math.max(margin, Math.min(this.height - margin, cy));

    this.cursorHead = { x: safeX, y: safeY };
    this.trailHistory = [{ x: safeX, y: safeY }];
    this.spawnShieldUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 1200;
    this.isSpawnArmed = false;

    cursorTracker.recordEvent('CURSOR_SYNC_HEAD', { safeX, safeY });
  }

  public setState(newState: string): void {
    this.state = newState;
    this.onStateChange(this.state);
  }

  public setDifficulty(diff: 'easy' | 'normal' | 'hard' | 'insane'): void {
    if (this.baseSpeedMap[diff]) {
      this.difficulty = diff;
      this.currentSpeed = this.baseSpeedMap[diff];
    }
  }

  public setGameMode(mode: 'classic' | 'portal'): void {
    this.gameMode = mode;
    this.wallCollision = (mode === 'classic');
    if (this.state === SnakeGame.STATE_IDLE) this.draw();
  }

  public setGridVisible(visible: boolean): void {
    this.gridVisible = !!visible;
    this.draw();
  }

  public queueDirection(dir: { x: number; y: number }): void {
    const lastPending = this.inputQueue.length > 0
      ? this.inputQueue[this.inputQueue.length - 1]
      : this.direction;

    const isOpposite = (dir.x !== 0 && dir.x === -lastPending.x) ||
                      (dir.y !== 0 && dir.y === -lastPending.y);
    const isSame = dir.x === lastPending.x && dir.y === lastPending.y;

    if (!isOpposite && !isSame && this.inputQueue.length < 3) {
      this.inputQueue.push(dir);
      soundManager.playMove();
    }
  }

  public spawnFood(): void {
    let attempts = 0;
    let newX = 0;
    let newY = 0;
    let valid = false;

    while (!valid && attempts < 250) {
      newX = Math.floor(Math.random() * this.tileCountX);
      newY = Math.floor(Math.random() * this.tileCountY);
      valid = !this.isCellOccupied(newX, newY);
      attempts++;
    }

    this.food = {
      x: newX,
      y: newY,
      spawnTime: typeof performance !== 'undefined' ? performance.now() : Date.now()
    };
  }

  public spawnGoldenApple(): void {
    let attempts = 0;
    let newX = 0;
    let newY = 0;
    let valid = false;

    while (!valid && attempts < 250) {
      newX = Math.floor(Math.random() * this.tileCountX);
      newY = Math.floor(Math.random() * this.tileCountY);
      valid = !this.isCellOccupied(newX, newY) && !(this.food && this.food.x === newX && this.food.y === newY);
      attempts++;
    }

    if (valid) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.goldenApple = {
        x: newX,
        y: newY,
        bornTime: now,
        duration: this.goldenAppleDuration
      };
      this.goldenAppleTimer = this.goldenAppleDuration;
    }
  }

  public isCellOccupied(x: number, y: number): boolean {
    return this.snake.some(segment => segment.x === x && segment.y === y);
  }

  public createSparks(x: number, y: number, color: string = '#10b981', count: number = 12): void {
    const px = (x + 0.5) * this.tileSize;
    const py = (y + 0.5) * this.tileSize;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  public updateCursorTrail(cx: number, cy: number, clientX: number, clientY: number): void {
    if (this.state !== SnakeGame.STATE_PLAYING || this.controlType !== 'cursor') return;

    // Zero-Jump Armed Spawning: snake materializes under cursor on first motion
    if (this.isSpawnArmed) {
      const margin = 40;
      const safeX = Math.max(margin, Math.min(this.width - margin, cx));
      const safeY = Math.max(margin, Math.min(this.height - margin, cy));
      this.cursorHead = { x: safeX, y: safeY };
      this.trailHistory = [{ x: safeX, y: safeY }];
      this.spawnShieldUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 1500;
      this.isSpawnArmed = false;

      cursorTracker.recordEvent('ARMED_SPAWN_MATERIALIZED', { x: safeX, y: safeY });
      return;
    }

    const wallMargin = 4;
    const isClassic = this.wallCollision || this.gameMode === 'classic';
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const isShieldActive = now < this.spawnShieldUntil;

    // Wall collision checking
    if (isClassic) {
      if (cx <= wallMargin || cx >= this.width - wallMargin || cy <= wallMargin || cy >= this.height - wallMargin) {
        if (isShieldActive) {
          cx = Math.max(wallMargin + 4, Math.min(this.width - wallMargin - 4, cx));
          cy = Math.max(wallMargin + 4, Math.min(this.height - wallMargin - 4, cy));
        } else {
          cursorTracker.recordEvent('WALL_DEATH', { cx, cy });
          this.triggerGameOver('¡Chocaste contra la pared!');
          return;
        }
      }
    } else {
      // Portal containment
      cx = Math.max(8, Math.min(this.width - 8, cx));
      cy = Math.max(8, Math.min(this.height - 8, cy));
    }

    const last = this.trailHistory[0] || this.cursorHead || { x: cx, y: cy };
    const dx = cx - last.x;
    const dy = cy - last.y;
    const dist = Math.hypot(dx, dy);

    // Anti-teleport guard for sudden mouse leaps (>65px)
    if (dist > 65) {
      cursorTracker.recordEvent('TELEPORT_GUARD_TRIGGERED', {
        dist,
        from: { x: last.x, y: last.y },
        to: { x: cx, y: cy }
      });
      const angle = Math.atan2(dy, dx);
      const clampedStep = 32;
      cx = last.x + Math.cos(angle) * clampedStep;
      cy = last.y + Math.sin(angle) * clampedStep;
    }

    if (dist >= 2.5) {
      this.cursorHeading = Math.atan2(cy - last.y, cx - last.x);
      this.trailHistory.unshift({ x: cx, y: cy });
      this.cursorHead = { x: cx, y: cy };

      const maxPoints = Math.ceil((this.continuousSegments + 8) * this.segmentSpacing / 2);
      if (this.trailHistory.length > maxPoints) {
        this.trailHistory.length = maxPoints;
      }

      this.checkCursorCollisions();
    }

    cursorTracker.recordCursorMove({
      clientX,
      clientY,
      canvasX: cx,
      canvasY: cy,
      headX: this.cursorHead.x,
      headY: this.cursorHead.y,
      gameMode: this.gameMode
    });
  }

  public getPointAtTrailDistance(targetDist: number): { x: number; y: number } {
    if (this.trailHistory.length === 0) return this.cursorHead;
    let accumulated = 0;
    for (let i = 0; i < this.trailHistory.length - 1; i++) {
      const p1 = this.trailHistory[i];
      const p2 = this.trailHistory[i + 1];
      const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (accumulated + segDist >= targetDist) {
        const ratio = (targetDist - accumulated) / (segDist || 1);
        return {
          x: p1.x + (p2.x - p1.x) * ratio,
          y: p1.y + (p2.y - p1.y) * ratio
        };
      }
      accumulated += segDist;
    }
    return this.trailHistory[this.trailHistory.length - 1] || this.cursorHead;
  }

  public checkCursorCollisions(): void {
    if (this.state !== SnakeGame.STATE_PLAYING || this.controlType !== 'cursor') return;

    // 1. Regular Apple
    if (this.food) {
      const fx = (this.food.x + 0.5) * this.tileSize;
      const fy = (this.food.y + 0.5) * this.tileSize;
      const distFood = Math.hypot(this.cursorHead.x - fx, this.cursorHead.y - fy);
      const eatRadius = this.cursorRadius + (this.tileSize * 0.45);

      if (distFood < eatRadius) {
        this.applesEaten++;
        this.continuousSegments += 3;
        const diffMultiplier = this.difficulty === 'insane' ? 3 : (this.difficulty === 'hard' ? 2 : 1);
        this.score += 10 * diffMultiplier;

        this.createSparks(this.food.x, this.food.y, '#ef4444', 14);
        soundManager.playEat();
        this.spawnFood();

        if (this.applesEaten % 5 === 0 && !this.goldenApple) {
          this.spawnGoldenApple();
        }

        cursorTracker.recordEvent('APPLE_EATEN', { score: this.score, apples: this.applesEaten });
        this.onScoreUpdate(this.score, this.applesEaten, this.difficulty);
      }
    }

    // 2. Golden Apple
    if (this.goldenApple) {
      const gfx = (this.goldenApple.x + 0.5) * this.tileSize;
      const gfy = (this.goldenApple.y + 0.5) * this.tileSize;
      const distGold = Math.hypot(this.cursorHead.x - gfx, this.cursorHead.y - gfy);
      const eatRadius = this.cursorRadius + (this.tileSize * 0.45);

      if (distGold < eatRadius) {
        this.goldenApplesEaten++;
        this.continuousSegments += 6;
        const diffMultiplier = this.difficulty === 'insane' ? 3 : (this.difficulty === 'hard' ? 2 : 1);
        this.score += 50 * diffMultiplier;

        this.createSparks(this.goldenApple.x, this.goldenApple.y, '#fbbf24', 20);
        soundManager.playGoldenEat();
        this.goldenApple = null;
        this.lastReportedBonusSec = -1;
        this.onBonusUpdate(null);

        cursorTracker.recordEvent('GOLDEN_APPLE_EATEN', { score: this.score });
        this.onScoreUpdate(this.score, this.applesEaten, this.difficulty);
      }
    }

    // 3. Hover self-collision with safe neck segments (seg >= safeNeckSegments)
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const isShieldActive = now < this.spawnShieldUntil;

    if (!isShieldActive && this.trailHistory.length > 20) {
      for (let i = this.safeNeckSegments; i <= this.continuousSegments; i++) {
        const pt = this.getPointAtTrailDistance(i * this.segmentSpacing);
        if (pt) {
          const distTail = Math.hypot(this.cursorHead.x - pt.x, this.cursorHead.y - pt.y);
          if (distTail < this.cursorRadius * 1.35) {
            cursorTracker.recordEvent('TAIL_COLLISION', { seg: i, dist: distTail });
            this.triggerGameOver('¡Tocaste tu propia cola!');
            return;
          }
        }
      }
    }
  }

  public tick(): void {
    if (this.inputQueue.length > 0) {
      this.direction = this.inputQueue.shift()!;
    }

    const head = this.snake[0];
    const nextHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y
    };

    // Wall collision / wrap-around
    if (this.wallCollision) {
      if (nextHead.x < 0 || nextHead.x >= this.tileCountX || nextHead.y < 0 || nextHead.y >= this.tileCountY) {
        this.triggerGameOver('¡Chocaste contra la pared!');
        return;
      }
    } else {
      if (nextHead.x < 0) nextHead.x = this.tileCountX - 1;
      else if (nextHead.x >= this.tileCountX) nextHead.x = 0;
      if (nextHead.y < 0) nextHead.y = this.tileCountY - 1;
      else if (nextHead.y >= this.tileCountY) nextHead.y = 0;
    }

    // Self-collision in grid mode
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === nextHead.x && this.snake[i].y === nextHead.y) {
        this.triggerGameOver('¡Te mordiste tu propia cola!');
        return;
      }
    }

    this.snake.unshift(nextHead);

    let ateFood = false;
    if (this.food && nextHead.x === this.food.x && nextHead.y === this.food.y) {
      ateFood = true;
      this.applesEaten++;
      const diffMultiplier = this.difficulty === 'insane' ? 3 : (this.difficulty === 'hard' ? 2 : 1);
      this.score += 10 * diffMultiplier;

      this.createSparks(this.food.x, this.food.y, '#ef4444', 12);
      soundManager.playEat();
      this.spawnFood();

      if (this.applesEaten % 5 === 0 && !this.goldenApple) {
        this.spawnGoldenApple();
      }

      const minSpeed = this.difficulty === 'insane' ? 30 : 50;
      this.currentSpeed = Math.max(minSpeed, this.currentSpeed - 0.7);
      this.onScoreUpdate(this.score, this.applesEaten, this.difficulty);
    }

    if (this.goldenApple && nextHead.x === this.goldenApple.x && nextHead.y === this.goldenApple.y) {
      this.goldenApplesEaten++;
      const goldenBonus = 50 * (this.difficulty === 'insane' ? 3 : (this.difficulty === 'hard' ? 2 : 1));
      this.score += goldenBonus;

      this.createSparks(this.goldenApple.x, this.goldenApple.y, '#fbbf24', 20);
      soundManager.playGoldenEat();
      this.goldenApple = null;
      this.lastReportedBonusSec = -1;
      this.onBonusUpdate(null);
      this.onScoreUpdate(this.score, this.applesEaten, this.difficulty);
    }

    if (!ateFood) {
      this.snake.pop();
    }

    this.tickCounter++;
  }

  public update(currentTime: number): void {
    if (this.state !== SnakeGame.STATE_PLAYING) return;

    if (this.goldenApple) {
      const elapsed = currentTime - this.goldenApple.bornTime;
      const remaining = Math.max(0, this.goldenApple.duration - elapsed);
      this.goldenAppleTimer = remaining;
      const remainingSec = Math.ceil(remaining / 1000);

      if (remainingSec !== this.lastReportedBonusSec) {
        this.lastReportedBonusSec = remainingSec;
        this.onBonusUpdate({
          percent: (remaining / this.goldenApple.duration) * 100,
          remainingSec: remainingSec
        });
      }

      if (remaining <= 0) {
        this.goldenApple = null;
        this.lastReportedBonusSec = -1;
        this.onBonusUpdate(null);
      }
    } else if (this.lastReportedBonusSec !== -1) {
      this.lastReportedBonusSec = -1;
      this.onBonusUpdate(null);
    }

    if (this.controlType === 'wasd') {
      const delta = currentTime - this.lastTickTime;
      if (delta >= this.currentSpeed) {
        this.tick();
        this.lastTickTime = currentTime;
      }
    } else if (this.controlType === 'cursor') {
      this.checkCursorCollisions();
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public triggerGameOver(reason: string = 'Fin de la partida'): void {
    this.setState(SnakeGame.STATE_GAMEOVER);
    cursorTracker.stopMatch(reason);
    soundManager.playGameOver();
    this.onGameOver({
      reason,
      score: this.score,
      apples: this.applesEaten,
      goldenApples: this.goldenApplesEaten,
      difficulty: this.difficulty,
      gameMode: this.gameMode
    });
  }

  public draw(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const ts = this.tileSize;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid
    if (this.gridVisible) {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= this.tileCountX; x++) {
        ctx.beginPath();
        ctx.moveTo(x * ts, 0);
        ctx.lineTo(x * ts, h);
        ctx.stroke();
      }
      for (let y = 0; y <= this.tileCountY; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * ts);
        ctx.lineTo(w, y * ts);
        ctx.stroke();
      }
    }

    // Outer boundary border
    const isPortal = this.gameMode === 'portal' || !this.wallCollision;
    if (isPortal) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      ctx.restore();
    }

    // Food
    if (this.food) {
      this.drawFood(this.food.x, this.food.y, '#ef4444', '#f87171');
    }

    // Golden Apple
    if (this.goldenApple) {
      this.drawGoldenFood(this.goldenApple.x, this.goldenApple.y);
    }

    // Snake
    if (this.controlType === 'cursor') {
      this.drawCursorSnake();
    } else {
      this.drawSnake();
    }

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Overlays
    if (this.state === SnakeGame.STATE_PAUSED) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JUEGO EN PAUSA', w / 2, h / 2 - 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Click derecho para abrir Menú • Click para continuar', w / 2, h / 2 + 20);
    } else if (this.state === SnakeGame.STATE_IDLE) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¡VÍBORA RETRO NEXT!', w / 2, h / 2 - 35);

      ctx.fillStyle = isPortal ? '#38bdf8' : '#f87171';
      ctx.font = 'bold 15px system-ui, sans-serif';
      const modeText = isPortal
        ? '🌀 Modo Atraviesa Paredes (Infinito)'
        : '🧱 Modo Clásico (Paredes mortales)';
      ctx.fillText(modeText, w / 2, h / 2 + 5);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      const hintText = this.controlType === 'cursor'
        ? 'Haz click para jugar • Guía con el ratón • Click derecho: Menú'
        : 'Haz click para jugar • Guía con WASD o flechas';
      ctx.fillText(hintText, w / 2, h / 2 + 35);
    }

    // Telemetry HUD
    cursorTracker.drawHud(ctx, w, h);
  }

  private drawFood(gx: number, gy: number, colorMain: string, colorLight: string): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const cx = (gx + 0.5) * ts;
    const cy = (gy + 0.5) * ts;
    const r = (ts / 2) * 0.75;

    ctx.save();
    ctx.shadowColor = colorMain;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colorMain;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colorLight;
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy - r, 3, 5, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawGoldenFood(gx: number, gy: number): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const cx = (gx + 0.5) * ts;
    const cy = (gy + 0.5) * ts;
    const r = (ts / 2) * 0.85;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pulse = Math.sin(now / 150) * 4 + 14;

    ctx.save();
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = pulse;

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    if (this.goldenAppleTimer > 0) {
      const frac = this.goldenAppleTimer / this.goldenAppleDuration;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * frac));
      ctx.stroke();
    }
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private drawSnake(): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    if (this.snake.length === 0) return;

    for (let i = this.snake.length - 1; i > 0; i--) {
      const curr = this.snake[i];
      const px = curr.x * ts;
      const py = curr.y * ts;
      const pad = 1.5;

      const factor = i / this.snake.length;
      const r = Math.round(16 + factor * 20);
      const g = Math.round(185 - factor * 35);
      const b = Math.round(129 + factor * 80);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      this.roundRect(ctx, px + pad, py + pad, ts - pad * 2, ts - pad * 2, 6);
      ctx.fill();
    }

    const head = this.snake[0];
    const hx = head.x * ts;
    const hy = head.y * ts;
    const pad = 1;

    ctx.save();
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#10b981';
    this.roundRect(ctx, hx + pad, hy + pad, ts - pad * 2, ts - pad * 2, 8);
    ctx.fill();
    ctx.restore();

    this.drawEyes(head, this.direction);
  }

  private drawEyes(head: { x: number; y: number }, dir: { x: number; y: number }): void {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const cx = head.x * ts + ts / 2;
    const cy = head.y * ts + ts / 2;

    let eye1X, eye1Y, eye2X, eye2Y;
    const eyeOffset = ts * 0.28;
    const forwardOffset = ts * 0.22;

    if (dir.x === 1) {
      eye1X = cx + forwardOffset; eye1Y = cy - eyeOffset;
      eye2X = cx + forwardOffset; eye2Y = cy + eyeOffset;
    } else if (dir.x === -1) {
      eye1X = cx - forwardOffset; eye1Y = cy - eyeOffset;
      eye2X = cx - forwardOffset; eye2Y = cy + eyeOffset;
    } else if (dir.y === 1) {
      eye1X = cx - eyeOffset; eye1Y = cy + forwardOffset;
      eye2X = cx + eyeOffset; eye2Y = cy + forwardOffset;
    } else {
      eye1X = cx - eyeOffset; eye1Y = cy - forwardOffset;
      eye2X = cx + eyeOffset; eye2Y = cy - forwardOffset;
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eye1X, eye1Y, ts * 0.16, 0, Math.PI * 2);
    ctx.arc(eye2X, eye2Y, ts * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    const pupilDx = dir.x * (ts * 0.05);
    const pupilDy = dir.y * (ts * 0.05);
    ctx.beginPath();
    ctx.arc(eye1X + pupilDx, eye1Y + pupilDy, ts * 0.08, 0, Math.PI * 2);
    ctx.arc(eye2X + pupilDx, eye2Y + pupilDy, ts * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCursorSnake(): void {
    const ctx = this.ctx;
    const numSegs = this.continuousSegments;

    // Body segments
    for (let i = numSegs; i >= 1; i--) {
      const pt = this.getPointAtTrailDistance(i * this.segmentSpacing);
      const radius = Math.max(5, this.cursorRadius * (1 - (i / (numSegs * 1.5))));
      const factor = i / numSegs;
      const r = Math.round(16 + factor * 20);
      const g = Math.round(185 - factor * 35);
      const b = Math.round(129 + factor * 80);

      ctx.save();
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Head
    const head = this.cursorHead;
    const headRadius = this.cursorRadius;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const isShieldActive = now < this.spawnShieldUntil;

    ctx.save();
    if (isShieldActive) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(head.x, head.y, headRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eyes
    const eyeDist = headRadius * 0.55;
    const perpHeading = this.cursorHeading + Math.PI / 2;
    const eyeForward = headRadius * 0.35;

    const e1x = head.x + Math.cos(this.cursorHeading) * eyeForward + Math.cos(perpHeading) * eyeDist;
    const e1y = head.y + Math.sin(this.cursorHeading) * eyeForward + Math.sin(perpHeading) * eyeDist;
    const e2x = head.x + Math.cos(this.cursorHeading) * eyeForward - Math.cos(perpHeading) * eyeDist;
    const e2y = head.y + Math.sin(this.cursorHeading) * eyeForward - Math.sin(perpHeading) * eyeDist;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e1x, e1y, 3.5, 0, Math.PI * 2);
    ctx.arc(e2x, e2y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const pupilForward = 1.2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(e1x + Math.cos(this.cursorHeading) * pupilForward, e1y + Math.sin(this.cursorHeading) * pupilForward, 1.8, 0, Math.PI * 2);
    ctx.arc(e2x + Math.cos(this.cursorHeading) * pupilForward, e2y + Math.sin(this.cursorHeading) * pupilForward, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  public loop(currentTime: number): void {
    this.update(currentTime);
    this.draw();
    if (this.state === SnakeGame.STATE_PLAYING || this.state === SnakeGame.STATE_PAUSED) {
      this.animFrameId = requestAnimationFrame((t) => this.loop(t));
    } else {
      this.animFrameId = null;
    }
  }

  public getFrameSnapshot() {
    return {
      alive: this.state === SnakeGame.STATE_PLAYING,
      score: this.score,
      apples: this.applesEaten,
      goldenApples: this.goldenApplesEaten,
      goldenAppleTimer: this.goldenAppleTimer,
      speed: this.currentSpeed,
      head: this.controlType === 'cursor'
        ? { x: Math.round(this.cursorHead.x * 10) / 10, y: Math.round(this.cursorHead.y * 10) / 10 }
        : { x: (this.snake[0] ? this.snake[0].x + 0.5 : 10) * this.tileSize, y: (this.snake[0] ? this.snake[0].y + 0.5 : 10) * this.tileSize },
      trail: this.controlType === 'cursor'
        ? this.trailHistory.slice(0, 100).map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }))
        : this.snake.map(s => ({ x: (s.x + 0.5) * this.tileSize, y: (s.y + 0.5) * this.tileSize })),
      food: this.food ? { x: this.food.x, y: this.food.y } : null,
      goldenApple: this.goldenApple ? { x: this.goldenApple.x, y: this.goldenApple.y, timer: this.goldenAppleTimer } : null
    };
  }

  public destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
