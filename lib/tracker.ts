/**
 * Cursor State Tracker & Telemetry Flight Recorder
 * Records real-time cursor states (coordinates, timestamps, deltas, speeds, anomalies),
 * prevents teleports, renders diagnostic HUD, and streams telemetry batches to the Next.js API.
 */

export interface TelemetrySample {
  id: number;
  t: number;      // milliseconds from match start
  dt: number;     // frame delta ms
  cx: number;     // clientX
  cy: number;     // clientY
  gx: number;     // canvasX
  gy: number;     // canvasY
  hx: number;     // snake head X
  hy: number;     // snake head Y
  dx: number;
  dy: number;
  dist: number;
  spd: number;    // px / sec
  anom: number;   // 1 if anomaly
}

export interface TelemetryEvent {
  t: number;
  event: string;
  data: Record<string, unknown>;
}

export interface TelemetryAnomaly {
  t: number;
  dist: number;
  dt: number;
  speed: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  reason: string;
}

export interface TelemetryStats {
  totalSamples: number;
  maxSpeedPxSec: number;
  avgSpeedPxSec: number;
  totalDistance: number;
  anomaliesCount: number;
  maxJumpPx: number;
  matchMetadata?: Record<string, unknown>;
}

export class CursorStateTracker {
  public samples: TelemetrySample[] = [];
  public events: TelemetryEvent[] = [];
  public anomalies: TelemetryAnomaly[] = [];
  public isActive: boolean = false;
  public showHud: boolean = false;
  public startTime: number = 0;
  public lastSampleTime: number = 0;
  public lastClientX: number | null = null;
  public lastClientY: number | null = null;
  public lastCanvasX: number | null = null;
  public lastCanvasY: number | null = null;

  public stats: TelemetryStats = {
    totalSamples: 0,
    maxSpeedPxSec: 0,
    avgSpeedPxSec: 0,
    totalDistance: 0,
    anomaliesCount: 0,
    maxJumpPx: 0
  };

  public readonly JUMP_THRESHOLD_PX = 60; // > 60px in < 45ms is considered suspicious leap

  private pendingSyncBuffer: TelemetrySample[] = [];
  private pendingEventsBuffer: TelemetryEvent[] = [];
  private lastSyncTimestamp: number = 0;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startSyncLoop();
    }
  }

  private startSyncLoop() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (this.isActive && (this.pendingSyncBuffer.length > 0 || this.pendingEventsBuffer.length > 0)) {
        this.flushTelemetryToServer();
      }
    }, 1500);
  }

  public startMatch(metadata: Record<string, unknown> = {}): void {
    this.samples = [];
    this.events = [];
    this.anomalies = [];
    this.pendingSyncBuffer = [];
    this.pendingEventsBuffer = [];
    this.isActive = true;
    this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastSampleTime = this.startTime;
    this.lastClientX = null;
    this.lastClientY = null;
    this.lastCanvasX = null;
    this.lastCanvasY = null;

    this.stats = {
      totalSamples: 0,
      maxSpeedPxSec: 0,
      avgSpeedPxSec: 0,
      totalDistance: 0,
      anomaliesCount: 0,
      maxJumpPx: 0,
      matchMetadata: metadata
    };

    this.recordEvent('MATCH_START', metadata);
    this.flushTelemetryToServer();
  }

  public recordEvent(eventName: string, payload: Record<string, unknown> = {}): void {
    const timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const relTime = Math.round(timestamp - (this.startTime || timestamp));
    const evt: TelemetryEvent = {
      t: relTime,
      event: eventName,
      data: payload
    };
    this.events.push(evt);
    this.pendingEventsBuffer.push(evt);

    if (['MATCH_START', 'GAME_OVER', 'APPLE_EATEN', 'GOLDEN_APPLE_EATEN', 'WALL_DEATH', 'TAIL_COLLISION'].includes(eventName)) {
      this.flushTelemetryToServer();
    }
  }

  public recordCursorMove({
    clientX,
    clientY,
    canvasX,
    canvasY,
    headX,
    headY,
    gameMode
  }: {
    clientX: number;
    clientY: number;
    canvasX: number;
    canvasY: number;
    headX: number;
    headY: number;
    gameMode?: string;
  }): { isAnomaly: boolean; anomalyReason: string | null; dist: number; speed: number } | null {
    if (!this.isActive) return null;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const relTime = Math.round(now - this.startTime);
    const dt = Math.max(1, Math.round(now - this.lastSampleTime));

    let dx = 0;
    let dy = 0;
    let dist = 0;
    let speed = 0;
    let isAnomaly = false;
    let anomalyReason: string | null = null;

    if (this.lastCanvasX !== null && this.lastCanvasY !== null) {
      dx = Math.round((canvasX - this.lastCanvasX) * 10) / 10;
      dy = Math.round((canvasY - this.lastCanvasY) * 10) / 10;
      dist = Math.round(Math.hypot(dx, dy) * 10) / 10;
      speed = Math.round((dist / (dt / 1000)));

      if (dist > this.JUMP_THRESHOLD_PX && dt < 45) {
        isAnomaly = true;
        anomalyReason = `Salto de ${dist}px en ${dt}ms (${speed} px/s)`;
        this.anomalies.push({
          t: relTime,
          dist,
          dt,
          speed,
          from: { x: this.lastCanvasX, y: this.lastCanvasY },
          to: { x: canvasX, y: canvasY },
          reason: anomalyReason
        });
        this.stats.anomaliesCount++;
        if (dist > this.stats.maxJumpPx) {
          this.stats.maxJumpPx = dist;
        }
      }

      this.stats.totalDistance += dist;
      if (speed > this.stats.maxSpeedPxSec) {
        this.stats.maxSpeedPxSec = speed;
      }
    }

    const sample: TelemetrySample = {
      id: this.samples.length + 1,
      t: relTime,
      dt,
      cx: Math.round(clientX),
      cy: Math.round(clientY),
      gx: Math.round(canvasX * 10) / 10,
      gy: Math.round(canvasY * 10) / 10,
      hx: Math.round(headX * 10) / 10,
      hy: Math.round(headY * 10) / 10,
      dx,
      dy,
      dist,
      spd: speed,
      anom: isAnomaly ? 1 : 0
    };

    if (this.samples.length < 5000) {
      this.samples.push(sample);
    }
    this.pendingSyncBuffer.push(sample);

    this.stats.totalSamples++;
    this.lastSampleTime = now;
    this.lastClientX = clientX;
    this.lastClientY = clientY;
    this.lastCanvasX = canvasX;
    this.lastCanvasY = canvasY;

    return { isAnomaly, anomalyReason, dist, speed };
  }

  public stopMatch(reason: string = 'FIN_DE_PARTIDA'): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.recordEvent('GAME_OVER', { reason, stats: this.stats });
  }

  public toggleHud(): boolean {
    this.showHud = !this.showHud;
    return this.showHud;
  }

  public flushTelemetryToServer(): void {
    if (typeof window === 'undefined') return;

    const samplesToSend = [...this.pendingSyncBuffer];
    const eventsToSend = [...this.pendingEventsBuffer];
    this.pendingSyncBuffer = [];
    this.pendingEventsBuffer = [];

    const payload = {
      matchActive: this.isActive,
      matchStartTime: this.startTime,
      stats: this.stats,
      latestSample: this.samples[this.samples.length - 1] || null,
      samplesBatch: samplesToSend,
      eventsBatch: eventsToSend,
      anomaliesBatch: this.anomalies.slice(-10),
      timestamp: new Date().toISOString()
    };

    // Mirror to localStorage as resilient fallback
    try {
      localStorage.setItem('snake_telemetry_latest', JSON.stringify({
        timestamp: payload.timestamp,
        stats: this.stats,
        anomalies: this.anomalies,
        events: this.events.slice(-50),
        sampleCount: this.samples.length
      }));
    } catch {}

    try {
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(res => {
        if (!res.ok && this.pendingSyncBuffer.length < 500) {
          this.pendingSyncBuffer.unshift(...samplesToSend.slice(-100));
        }
      }).catch(() => {
        if (this.pendingSyncBuffer.length < 500) {
          this.pendingSyncBuffer.unshift(...samplesToSend.slice(-100));
        }
      });
    } catch {}
  }

  public drawHud(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.showHud) return;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;

    const hudW = 220;
    const hudH = 130;
    const hudX = 12;
    const hudY = 12;

    ctx.fillRect(hudX, hudY, hudW, hudH);
    ctx.strokeRect(hudX, hudY, hudW, hudH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const last = this.samples[this.samples.length - 1];
    const speed = last ? last.spd : 0;
    const dist = last ? last.dist : 0;

    ctx.fillText('📡 FLIGHT RECORDER (HUD)', hudX + 8, hudY + 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Muestras: ${this.stats.totalSamples}`, hudX + 8, hudY + 24);
    ctx.fillText(`Velocidad: ${speed} px/s`, hudX + 8, hudY + 40);
    ctx.fillText(`Dist/frame: ${dist} px`, hudX + 8, hudY + 56);
    ctx.fillText(`Max Vel: ${this.stats.maxSpeedPxSec} px/s`, hudX + 8, hudY + 72);
    ctx.fillText(`Max Salto: ${this.stats.maxJumpPx} px`, hudX + 8, hudY + 88);

    if (this.stats.anomaliesCount > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`⚠️ Anomalías: ${this.stats.anomaliesCount}`, hudX + 8, hudY + 104);
    } else {
      ctx.fillStyle = '#10b981';
      ctx.fillText(`✓ Señal Nominal (0 saltos)`, hudX + 8, hudY + 104);
    }

    ctx.restore();
  }

  public exportJSON(): string {
    return JSON.stringify({
      trackerVersion: '2.0.0',
      exportDate: new Date().toISOString(),
      stats: this.stats,
      anomalies: this.anomalies,
      events: this.events,
      samples: this.samples
    }, null, 2);
  }

  public exportCSV(): string {
    const headers = ['id', 't_ms', 'dt_ms', 'clientX', 'clientY', 'canvasX', 'canvasY', 'headX', 'headY', 'dx', 'dy', 'dist_px', 'speed_px_sec', 'is_anomaly'];
    const rows = this.samples.map(s => [
      s.id, s.t, s.dt, s.cx, s.cy, s.gx, s.gy, s.hx, s.hy, s.dx, s.dy, s.dist, s.spd, s.anom
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const cursorTracker = new CursorStateTracker();
