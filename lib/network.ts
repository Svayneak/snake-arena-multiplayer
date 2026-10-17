/**
 * Arena Network Client
 * Connects the player game client to the WebSocket relay server on port 3500.
 * Supports:
 * - Multi-Room isolation (roomId)
 * - Persistent cryptographic user tokens for reconnection
 * - Real-time 30 FPS telemetry stream & synchronized countdown events
 */

export interface TelemetryFramePayload {
  alive: boolean;
  score: number;
  apples: number;
  goldenApples: number;
  goldenAppleTimer: number;
  speed: number;
  head: { x: number; y: number };
  trail: Array<{ x: number; y: number }>;
  food: { x: number; y: number } | null;
  goldenApple: { x: number; y: number; timer?: number } | null;
}

export interface PlayerRegisteredEvent {
  roomId: string;
  slotId: number;
  token: string;
  name: string;
  isReconnect: boolean;
  botsEnabled: boolean;
}

export interface ArenaSlotSummary {
  slotId: number;
  connected: boolean;
  isBot: boolean;
  name: string;
  status: 'empty' | 'waiting' | 'ready' | 'playing' | 'eliminated';
  score: number;
  apples: number;
  goldenApples: number;
  alive: boolean;
}

export interface ArenaSnapshotEvent {
  type: 'ARENA_SNAPSHOT';
  roomId: string;
  timestamp: number;
  slots: ArenaSlotSummary[];
  botsEnabled: boolean;
  activeCountdown: number | null;
}

export type NetworkEventCallback = (payload: unknown) => void;

export class ArenaNetworkClient {
  private ws: WebSocket | null = null;
  private url: string;
  private roomId: string = 'ARENA-1';
  private slotId: number = 1;
  private playerName: string = 'Piloto #1';
  private token: string | null = null;
  public isConnected: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<string, Set<NetworkEventCallback>> = new Map();
  private lastFrameSendTime: number = 0;
  private readonly MIN_FRAME_INTERVAL_MS = 33; // ~30 FPS throttle

  constructor(serverUrl?: string) {
    if (typeof window !== 'undefined') {
      if (serverUrl) {
        this.url = serverUrl;
      } else {
        const isSecure = window.location.protocol === 'https:';
        const protocol = isSecure ? 'wss:' : 'ws:';
        // En Render / producción / dominios Cloudflare (HTTPS):
        if (isSecure || !window.location.port || window.location.port === '80' || window.location.port === '443') {
          this.url = `${protocol}//${window.location.host}`;
        } else {
          // En desarrollo local (soporta relay en 3500)
          const host = window.location.hostname || 'localhost';
          this.url = `${protocol}//${host}:3500`;
        }
      }
    } else {
      this.url = serverUrl || 'ws://localhost:3500';
    }
  }

  private getStorageKey(roomId: string): string {
    return `snake_token_${roomId.trim().toUpperCase()}`;
  }

  public getSavedToken(roomId: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(this.getStorageKey(roomId)) || sessionStorage.getItem(this.getStorageKey(roomId));
    } catch {
      return null;
    }
  }

  public saveToken(roomId: string, token: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getStorageKey(roomId), token);
      sessionStorage.setItem(this.getStorageKey(roomId), token);
    } catch {}
  }

  public clearToken(roomId?: string): void {
    if (typeof window === 'undefined') return;
    const targetRoom = roomId || this.roomId;
    try {
      localStorage.removeItem(this.getStorageKey(targetRoom));
      sessionStorage.removeItem(this.getStorageKey(targetRoom));
      if (targetRoom === this.roomId) {
        this.token = null;
      }
    } catch {}
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public getSlotId(): number {
    return this.slotId;
  }

  public getToken(): string | null {
    return this.token;
  }

  public connect(slotId: number = 1, playerName: string = 'Piloto #1', roomId: string = 'ARENA-1'): void {
    if (typeof window === 'undefined') return;
    this.slotId = slotId;
    this.playerName = playerName;
    this.roomId = roomId.trim().toUpperCase() || 'ARENA-1';

    // Recuperar token persistido si existe
    this.token = this.getSavedToken(this.roomId);

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      // Si ya está conectado pero cambió de sala o slot, enviar nuevo registro
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendRegistration();
      }
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('connection_change', true);
        console.log(`[ArenaNet] Conectado a Relay en ${this.url} para Sala: ${this.roomId}`);
        this.sendRegistration();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.emit('connection_change', false);
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private sendRegistration(): void {
    this.send({
      type: 'REGISTER_PLAYER',
      roomId: this.roomId,
      slotId: this.slotId,
      name: this.playerName,
      token: this.token
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.slotId, this.playerName, this.roomId);
    }, 2000);
  }

  private handleIncomingMessage(data: { type: string; [key: string]: unknown }): void {
    switch (data.type) {
      case 'PLAYER_REGISTERED': {
        const reg = data as unknown as PlayerRegisteredEvent;
        this.slotId = reg.slotId;
        this.token = reg.token;
        this.saveToken(this.roomId, reg.token);
        console.log(`[ArenaNet] Registrado en ${reg.roomId} Slot ${reg.slotId}. Reconnect: ${reg.isReconnect}`);
        this.emit('player_registered', reg);
        break;
      }

      case 'ARENA_SNAPSHOT':
        this.emit('arena_snapshot', data);
        break;

      case 'ROOM_STATUS':
        this.emit('room_status', data);
        break;

      case 'HIGH_SCORES_SYNC':
        this.emit('high_scores_sync', data.scores);
        break;

      case 'COUNTDOWN_TICK':
        this.emit('countdown_tick', data.count);
        break;

      case 'COUNTDOWN_START':
        this.emit('countdown_start', data);
        break;

      case 'ROUND_RESET':
        this.emit('round_reset', data);
        break;

      case 'ERROR':
        console.warn('[ArenaNet] Error recibido del servidor:', data.message);
        this.emit('net_error', data);
        break;

      default:
        this.emit(data.type, data);
        break;
    }
  }

  public setPlayerName(name: string): void {
    if (name && name.trim()) {
      this.playerName = name.trim().slice(0, 16);
    }
  }

  public submitHighScore(entry: Record<string, unknown>): void {
    this.send({
      type: 'SUBMIT_HIGH_SCORE',
      roomId: this.roomId,
      entry
    });
  }

  public clearHighScores(): void {
    this.send({
      type: 'CLEAR_HIGH_SCORES',
      roomId: this.roomId
    });
  }

  public requestHighScores(): void {
    this.send({
      type: 'REQUEST_HIGH_SCORES',
      roomId: this.roomId
    });
  }

  public startCountdown(countdownSec: number = 3): void {
    this.send({
      type: 'START_COUNTDOWN',
      roomId: this.roomId,
      countdownSec
    });
  }

  public toggleBots(enabled?: boolean): void {
    this.send({
      type: 'TOGGLE_BOTS',
      roomId: this.roomId,
      ...(enabled !== undefined ? { enabled } : {})
    });
  }

  public sendFrame(frame: TelemetryFramePayload): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastFrameSendTime < this.MIN_FRAME_INTERVAL_MS) {
      return; // throttle a ~30 FPS
    }
    this.lastFrameSendTime = now;

    this.send({
      type: 'TELEMETRY_FRAME',
      roomId: this.roomId,
      slotId: this.slotId,
      token: this.token,
      name: this.playerName,
      ...frame
    });
  }

  public send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch {}
    }
  }

  public on(event: string, callback: NetworkEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: NetworkEventCallback): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  private emit(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(payload);
        } catch {}
      });
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const arenaNet = new ArenaNetworkClient();
