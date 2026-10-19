/**
 * Snake Arena Multiplayer & Spectator Relay Server
 * Zero-dependency WebSocket & HTTP Server for Real-Time Gameplay Telemetry
 * Supports:
 * - Dynamic Room Isolation (Multi-Room Architecture)
 * - Cryptographic User Tokens with Persistent Reconnects per Slot
 * - Up to 6 Players per Room with Autonomous AI Bot Fillers
 * - Synchronized Spectator Telemetry & Host Room Administration
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3500;
const MAX_SLOTS = 6;
const DEFAULT_ROOM_ID = 'ARENA-1';
const HIGH_SCORES_FILE = path.resolve(__dirname, '..', 'data', 'high_scores.json');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://naacgdwtglvcumaccime.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWNnZHd0Z2x2Y3VtYWNjaW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5Nzc2NDUsImV4cCI6MjEwMzU1MzY0NX0.QzVkPr7-aKYLTxVc6RzB_maVBykHBUvtvIIZm-522JE';

// ==================== RFC 6455 PROTOCOL HELPERS ====================
function encodeFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];
    const opcode = firstByte & 0x0f;
    const isMasked = (secondByte & 0x80) !== 0;
    let payloadLen = secondByte & 0x7f;
    let currentOffset = offset + 2;

    if (payloadLen === 126) {
      if (currentOffset + 2 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(currentOffset);
      currentOffset += 2;
    } else if (payloadLen === 127) {
      if (currentOffset + 8 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(currentOffset));
      currentOffset += 8;
    }

    let maskKey = null;
    if (isMasked) {
      if (currentOffset + 4 > buffer.length) break;
      maskKey = buffer.slice(currentOffset, currentOffset + 4);
      currentOffset += 4;
    }

    if (currentOffset + payloadLen > buffer.length) break;

    const rawPayload = buffer.slice(currentOffset, currentOffset + payloadLen);
    const unmasked = Buffer.alloc(payloadLen);

    if (isMasked && maskKey) {
      for (let i = 0; i < payloadLen; i++) {
        unmasked[i] = rawPayload[i] ^ maskKey[i % 4];
      }
    } else {
      rawPayload.copy(unmasked);
    }

    if (opcode === 0x01) {
      messages.push({ type: 'text', text: unmasked.toString('utf8') });
    } else if (opcode === 0x08) {
      messages.push({ type: 'close' });
    } else if (opcode === 0x09) {
      messages.push({ type: 'ping' });
    }

    offset = currentOffset + payloadLen;
  }

  return { messages, remaining: buffer.slice(offset) };
}

// ==================== ROOM & ARENA STATE ====================
const BOT_NAMES = [
  'CyberViper #2',
  'NeonCobra #3',
  'GlitchPython #4',
  'MatrixAdder #5',
  'QuantumBoa #6'
];

function createDefaultSlot(slotId) {
  return {
    slotId,
    connected: false,
    isBot: false,
    name: `Slot ${slotId}`,
    status: 'empty', // 'empty' | 'waiting' | 'ready' | 'playing' | 'eliminated'
    score: 0,
    apples: 0,
    goldenApples: 0,
    goldenAppleTimer: 0,
    speed: 95,
    alive: false,
    head: { x: 270, y: 270 },
    heading: 0,
    trail: [{ x: 270, y: 270 }],
    food: { x: Math.floor(Math.random() * 20) + 2, y: Math.floor(Math.random() * 20) + 2 },
    goldenApple: null,
    lastSeen: 0,
    token: null
  };
}

class ArenaRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    this.slots = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      this.slots.push(createDefaultSlot(i));
    }

    // token -> { slotId, name, lastSeen }
    this.tokens = new Map();
    // socket -> { slotId, name, token }
    this.players = new Map();
    // Set of sockets
    this.spectators = new Set();

    this.botsEnabled = true;
    this.countdown = null; // { count, timerId }
    this.snapshotTick = 0;
    this.initBots();
  }

  initBots() {
    for (let i = 2; i <= MAX_SLOTS; i++) {
      const slot = this.slots[i - 1];
      if (!slot.connected) {
        slot.isBot = this.botsEnabled;
        slot.name = BOT_NAMES[i - 2] || `Bot ${i}`;
        slot.status = this.botsEnabled ? 'ready' : 'empty';
        slot.score = 0;
        slot.apples = 0;
        slot.alive = true;
        slot.head = { x: 100 + (i * 50), y: 150 + (i * 30) };
        slot.heading = Math.random() * Math.PI * 2;
        slot.trail = [{ ...slot.head }];
        slot.food = { x: Math.floor(Math.random() * 22) + 2, y: Math.floor(Math.random() * 22) + 2 };
      }
    }
  }

  toggleBots(enabled) {
    this.botsEnabled = enabled;
    this.lastActivity = Date.now();
    for (let i = 2; i <= MAX_SLOTS; i++) {
      const slot = this.slots[i - 1];
      if (!slot.connected) {
        slot.isBot = enabled;
        slot.status = enabled ? (this.countdown ? 'playing' : 'ready') : 'empty';
        slot.alive = enabled;
      }
    }
    this.broadcastAll({
      type: 'ROOM_STATUS',
      roomId: this.roomId,
      botsEnabled: this.botsEnabled,
      slots: this.slots
    });
    this.broadcastArenaSnapshot(true);
  }

  freeSlotHelper(oldSlotId) {
    const oldSlot = this.slots[oldSlotId - 1];
    if (!oldSlot) return;
    oldSlot.connected = false;
    oldSlot.token = null;
    if (this.botsEnabled && oldSlotId > 1) {
      oldSlot.isBot = true;
      oldSlot.name = BOT_NAMES[oldSlotId - 2] || `Bot ${oldSlotId}`;
      oldSlot.status = 'ready';
      oldSlot.alive = true;
      oldSlot.score = 0;
      oldSlot.apples = 0;
    } else {
      oldSlot.isBot = false;
      oldSlot.name = `Slot ${oldSlotId}`;
      oldSlot.status = 'empty';
      oldSlot.alive = false;
      oldSlot.score = 0;
      oldSlot.apples = 0;
    }
  }

  registerPlayer(socket, requestedSlot, name, providedToken) {
    this.lastActivity = Date.now();
    let parsedSlot = requestedSlot ? parseInt(requestedSlot, 10) : 1;
    if (isNaN(parsedSlot) || parsedSlot < 1 || parsedSlot > MAX_SLOTS) {
      parsedSlot = 1;
    }
    let slotId = parsedSlot;

    let token = providedToken;
    let isReconnect = false;

    // 1. RECONEXIÓN CON TOKEN EXISTENTE
    if (token && this.tokens.has(token)) {
      const tokenData = this.tokens.get(token);
      isReconnect = true;

      // Si el jugador eligió explícitamente cambiarse a otro slot libre, permitir el cambio
      if (parsedSlot !== tokenData.slotId && !this.slots[parsedSlot - 1].connected) {
        this.freeSlotHelper(tokenData.slotId);
        slotId = parsedSlot;
        console.log(`[${this.roomId}] Jugador cambió de Slot ${tokenData.slotId} a Slot ${slotId}`);
      } else {
        slotId = tokenData.slotId;
        console.log(`[${this.roomId}] Jugador reconectado con token válido en Slot ${slotId}: ${tokenData.name}`);
      }

      // Desconectar socket anterior si existía
      for (const [existingSocket, pInfo] of this.players.entries()) {
        if (pInfo.token === token && existingSocket !== socket) {
          try {
            if (typeof existingSocket.close === 'function') {
              existingSocket.close();
            } else if (typeof existingSocket.end === 'function') {
              existingSocket.end();
            }
          } catch {}
          this.players.delete(existingSocket);
        }
      }
    } else {
      // 2. NUEVO INGRESO
      // Si el mismo socket ya ocupaba otro slot, liberarlo primero
      if (this.players.has(socket)) {
        const prev = this.players.get(socket);
        if (prev.slotId !== slotId) {
          this.freeSlotHelper(prev.slotId);
        }
      }

      const targetSlot = this.slots[slotId - 1];
      // Si el slot solicitado ya está ocupado por otro jugador humano activo
      if (targetSlot.connected) {
        // Buscar el primer slot disponible
        let freeSlot = -1;
        for (let i = 0; i < MAX_SLOTS; i++) {
          if (!this.slots[i].connected) {
            freeSlot = i + 1;
            break;
          }
        }
        if (freeSlot === -1) {
          this.send(socket, {
            type: 'ERROR',
            code: 'ROOM_FULL',
            message: `La sala ${this.roomId} está llena (6 jugadores activos).`
          });
          return;
        }
        slotId = freeSlot;
      }

      // Generar token criptográfico único para este jugador
      token = 'tok_' + crypto.randomBytes(8).toString('hex');
    }

    const slot = this.slots[slotId - 1];
    slot.connected = true;
    slot.isBot = false;
    slot.name = (name && name.trim()) ? name.trim().slice(0, 16) : (slot.name && !slot.name.startsWith('Bot ') && !slot.name.startsWith('Slot ') ? slot.name : `Piloto #${slotId}`);
    slot.status = 'ready';
    slot.alive = true;
    slot.score = slot.score || 0;
    slot.apples = slot.apples || 0;
    slot.lastSeen = Date.now();
    slot.token = token;

    // Registrar en mapa de tokens y mapa de jugadores
    this.tokens.set(token, {
      slotId,
      name: slot.name,
      lastSeen: Date.now()
    });

    this.players.set(socket, {
      slotId,
      name: slot.name,
      token
    });

    this.send(socket, {
      type: 'PLAYER_REGISTERED',
      roomId: this.roomId,
      slotId,
      token,
      name: slot.name,
      isReconnect,
      botsEnabled: this.botsEnabled
    });

    this.broadcastArenaSnapshot(true);
    console.log(`[${this.roomId}] Jugador ${slot.name} asignado al Slot ${slotId} (Token: ${token.substring(0, 10)}...)`);
  }

  removePlayer(socket) {
    this.lastActivity = Date.now();
    const player = this.players.get(socket);
    if (player) {
      const slot = this.slots[player.slotId - 1];
      slot.connected = false;

      // Si los bots están activos y es un slot > 1, el bot puede retomar si se desea
      if (this.botsEnabled && player.slotId > 1) {
        slot.isBot = true;
        slot.name = BOT_NAMES[player.slotId - 2] || `Bot ${player.slotId}`;
        slot.status = 'ready';
      } else {
        slot.status = 'waiting'; // Deja status waiting para permitir reconexión con token
        slot.alive = false;
      }

      this.players.delete(socket);
      console.log(`[${this.roomId}] Jugador desconectado de Slot ${player.slotId} (Token conservado para reconexión)`);
      this.broadcastArenaSnapshot(true);
    }
    this.spectators.delete(socket);
  }

  updatePlayerFrame(socket, frame) {
    this.lastActivity = Date.now();
    const player = this.players.get(socket);
    if (!player) return;

    const slot = this.slots[player.slotId - 1];
    slot.lastSeen = Date.now();
    if (frame.name && typeof frame.name === 'string' && frame.name.trim()) {
      slot.name = frame.name.trim().slice(0, 16);
      player.name = slot.name;
    }
    slot.status = frame.alive ? 'playing' : 'eliminated';
    slot.alive = !!frame.alive;
    slot.score = frame.score !== undefined ? frame.score : slot.score;
    slot.apples = frame.apples !== undefined ? frame.apples : slot.apples;
    slot.goldenApples = frame.goldenApples || 0;
    slot.goldenAppleTimer = frame.goldenAppleTimer || 0;
    slot.speed = frame.speed || slot.speed;

    if (frame.head) slot.head = frame.head;
    if (frame.trail) slot.trail = frame.trail;
    if (frame.food) slot.food = frame.food;
    if (frame.goldenApple !== undefined) slot.goldenApple = frame.goldenApple;
  }

  startCountdown(countdownSec = 3) {
    this.lastActivity = Date.now();
    if (this.countdown && this.countdown.timerId) {
      clearInterval(this.countdown.timerId);
    }

    let remaining = countdownSec;
    this.countdown = { count: remaining };

    this.broadcastAll({
      type: 'COUNTDOWN_TICK',
      roomId: this.roomId,
      count: remaining
    });

    const timerId = setInterval(() => {
      remaining--;
      this.countdown.count = remaining;

      if (remaining > 0) {
        this.broadcastAll({
          type: 'COUNTDOWN_TICK',
          roomId: this.roomId,
          count: remaining
        });
      } else {
        clearInterval(timerId);
        this.countdown = null;

        // Iniciar todos los jugadores y bots activos
        for (const slot of this.slots) {
          if (slot.connected || (slot.isBot && this.botsEnabled)) {
            slot.status = 'playing';
            slot.alive = true;
            slot.score = 0;
            slot.apples = 0;
          }
        }

        this.broadcastAll({
          type: 'COUNTDOWN_START',
          roomId: this.roomId,
          timestamp: Date.now()
        });
      }
    }, 1000);

    this.countdown.timerId = timerId;
  }

  resetRound() {
    this.lastActivity = Date.now();
    if (this.countdown && this.countdown.timerId) {
      clearInterval(this.countdown.timerId);
      this.countdown = null;
    }

    for (let i = 0; i < MAX_SLOTS; i++) {
      const slot = this.slots[i];
      slot.score = 0;
      slot.apples = 0;
      slot.goldenApples = 0;
      slot.goldenAppleTimer = 0;
      slot.alive = slot.connected || (slot.isBot && this.botsEnabled);
      slot.status = slot.alive ? 'ready' : 'empty';
      slot.head = { x: 120 + (i * 60), y: 150 + (i * 30) };
      slot.trail = [{ ...slot.head }];
      slot.food = { x: Math.floor(Math.random() * 22) + 2, y: Math.floor(Math.random() * 22) + 2 };
    }

    this.broadcastAll({
      type: 'ROUND_RESET',
      roomId: this.roomId,
      slots: this.slots
    });
  }

  updateBots() {
    if (!this.botsEnabled) return;

    const tileSize = 20;
    const arenaWidth = 540;
    const arenaHeight = 540;

    for (let i = 2; i <= MAX_SLOTS; i++) {
      const slot = this.slots[i - 1];
      if (!slot.isBot || !slot.alive) continue;

      const targetX = (slot.food.x + 0.5) * tileSize;
      const targetY = (slot.food.y + 0.5) * tileSize;

      const dx = targetX - slot.head.x;
      const dy = targetY - slot.head.y;
      const targetHeading = Math.atan2(dy, dx);

      let angleDiff = targetHeading - slot.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const maxTurn = 0.22;
      slot.heading += Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

      const margin = 45;
      if (slot.head.x < margin && Math.cos(slot.heading) < 0) {
        slot.heading = 0 + (Math.random() - 0.5);
      } else if (slot.head.x > arenaWidth - margin && Math.cos(slot.heading) > 0) {
        slot.heading = Math.PI + (Math.random() - 0.5);
      }
      if (slot.head.y < margin && Math.sin(slot.heading) < 0) {
        slot.heading = Math.PI / 2 + (Math.random() - 0.5);
      } else if (slot.head.y > arenaHeight - margin && Math.sin(slot.heading) > 0) {
        slot.heading = -Math.PI / 2 + (Math.random() - 0.5);
      }

      const speed = 4.2;
      slot.head.x += Math.cos(slot.heading) * speed;
      slot.head.y += Math.sin(slot.heading) * speed;

      slot.head.x = Math.max(15, Math.min(arenaWidth - 15, slot.head.x));
      slot.head.y = Math.max(15, Math.min(arenaHeight - 15, slot.head.y));

      slot.trail.unshift({ x: slot.head.x, y: slot.head.y });
      const maxTrailLen = (12 + (slot.apples * 3)) * 4;
      if (slot.trail.length > maxTrailLen) {
        slot.trail.length = maxTrailLen;
      }

      const distFood = Math.hypot(slot.head.x - targetX, slot.head.y - targetY);
      if (distFood < 22) {
        slot.apples++;
        slot.score += 10;
        slot.food = {
          x: Math.floor(Math.random() * 22) + 2,
          y: Math.floor(Math.random() * 22) + 2
        };

        if (slot.apples % 5 === 0 && !slot.goldenApple) {
          slot.goldenApple = {
            x: Math.floor(Math.random() * 22) + 2,
            y: Math.floor(Math.random() * 22) + 2,
            timer: 8000
          };
          slot.goldenAppleTimer = 8000;
        }
      }

      if (slot.goldenApple) {
        slot.goldenAppleTimer = Math.max(0, slot.goldenAppleTimer - 33);
        if (slot.goldenAppleTimer <= 0) {
          slot.goldenApple = null;
        }
      }
    }
  }

  broadcastArenaSnapshot(forcePlayers = false) {
    if (this.spectators.size === 0 && this.players.size === 0) return;
    this.snapshotTick = (this.snapshotTick + 1) % 3;

    const payload = {
      type: 'ARENA_SNAPSHOT',
      roomId: this.roomId,
      timestamp: Date.now(),
      slots: this.slots.map(s => ({
        slotId: s.slotId,
        connected: s.connected,
        isBot: s.isBot,
        name: s.name,
        status: s.status,
        score: s.score,
        apples: s.apples,
        goldenApples: s.goldenApples,
        goldenAppleTimer: s.goldenAppleTimer,
        speed: s.speed,
        alive: s.alive,
        head: s.head,
        trail: s.trail ? s.trail.slice(0, 120) : [],
        food: s.food,
        goldenApple: s.goldenApple
      })),
      botsEnabled: this.botsEnabled,
      activeCountdown: this.countdown ? this.countdown.count : null
    };

    const jsonStr = JSON.stringify(payload);
    let encodedBuf = null;

    for (const socket of this.spectators) {
      try {
        if (typeof socket.send === 'function') {
          const raw = socket._socket;
          if (socket.readyState === 1 && (!raw || (!raw.writableEnded && !raw.destroyed))) {
            socket.send(jsonStr);
          }
        } else {
          if (!encodedBuf) encodedBuf = encodeFrame(jsonStr);
          socket.write(encodedBuf);
        }
      } catch {}
    }

    // Enviar también a los jugadores conectados (~10 FPS o inmediato en eventos de sala)
    if (forcePlayers || this.snapshotTick === 0) {
      for (const [socket] of this.players) {
        try {
          if (typeof socket.send === 'function') {
            const raw = socket._socket;
            if (socket.readyState === 1 && (!raw || (!raw.writableEnded && !raw.destroyed))) {
              socket.send(jsonStr);
            }
          } else {
            if (!encodedBuf) encodedBuf = encodeFrame(jsonStr);
            socket.write(encodedBuf);
          }
        } catch {}
      }
    }
  }

  broadcastAll(payload) {
    const jsonStr = JSON.stringify(payload);
    let encodedBuf = null;
    for (const socket of this.spectators) {
      try {
        if (typeof socket.send === 'function') {
          const raw = socket._socket;
          if (socket.readyState === 1 && (!raw || (!raw.writableEnded && !raw.destroyed))) {
            socket.send(jsonStr);
          }
        } else {
          if (!encodedBuf) encodedBuf = encodeFrame(jsonStr);
          socket.write(encodedBuf);
        }
      } catch {}
    }
    for (const [socket] of this.players) {
      try {
        if (typeof socket.send === 'function') {
          const raw = socket._socket;
          if (socket.readyState === 1 && (!raw || (!raw.writableEnded && !raw.destroyed))) {
            socket.send(jsonStr);
          }
        } else {
          if (!encodedBuf) encodedBuf = encodeFrame(jsonStr);
          socket.write(encodedBuf);
        }
      } catch {}
    }
  }

  broadcastToSpectators(payload) {
    const jsonStr = JSON.stringify(payload);
    let encodedBuf = null;
    for (const socket of this.spectators) {
      try {
        if (typeof socket.send === 'function') {
          const raw = socket._socket;
          if (socket.readyState === 1 && (!raw || (!raw.writableEnded && !raw.destroyed))) {
            socket.send(jsonStr);
          }
        } else {
          if (!encodedBuf) encodedBuf = encodeFrame(jsonStr);
          socket.write(encodedBuf);
        }
      } catch {}
    }
  }

  send(socket, payload) {
    try {
      if (typeof socket.send === 'function') {
        const rawSocket = socket._socket;
        if (socket.readyState === 1) {
          if (rawSocket && (rawSocket.writableEnded || rawSocket.destroyed)) {
            roomManager.logDebug({
              event: 'send_skipped_writable_ended',
              writableEnded: rawSocket.writableEnded,
              destroyed: rawSocket.destroyed
            });
            return;
          }
          socket.send(JSON.stringify(payload), (err) => {
            if (err) {
              roomManager.logDebug({
                event: 'send_callback_error',
                error: err.message,
                writableEnded: rawSocket ? rawSocket.writableEnded : null,
                destroyed: rawSocket ? rawSocket.destroyed : null
              });
            }
          });
        } else {
          roomManager.logDebug({ event: 'send_not_open', readyState: socket.readyState });
        }
      } else {
        socket.write(encodeFrame(JSON.stringify(payload)));
      }
    } catch (err) {
      roomManager.logDebug({ event: 'send_exception', error: err.message });
    }
  }
}

// ==================== MULTI-ROOM & SHARED LEADERBOARD MANAGER ====================
class RoomManager {
  constructor() {
    this.rooms = new Map();
    // Socket -> { roomId, isSpectator, isPlayer }
    this.socketMap = new Map();
    this.highScores = this.loadHighScores();
    this.debugLog = [];
    // Crear sala por defecto
    this.getOrCreateRoom(DEFAULT_ROOM_ID);
    // Si hay llave de Supabase configurada, sincronizar con la nube al iniciar
    if (SUPABASE_KEY) {
      this.fetchHighScoresFromSupabase();
    }
  }

  logDebug(event) {
    if (!this.debugLog) this.debugLog = [];
    this.debugLog.push({ ...event, time: new Date().toISOString() });
    if (this.debugLog.length > 30) this.debugLog.shift();
  }

  supabaseRequest(method, pathSuffix, body = null, extraHeaders = {}) {
    return new Promise((resolve) => {
      if (!SUPABASE_KEY || !SUPABASE_URL) return resolve(null);
      try {
        const parsedUrl = new URL(SUPABASE_URL);
        const payload = body ? JSON.stringify(body) : null;
        const req = https.request({
          hostname: parsedUrl.hostname,
          path: `/rest/v1/${pathSuffix}`,
          method,
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            ...extraHeaders,
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(data ? JSON.parse(data) : []);
              } catch {
                resolve([]);
              }
            } else {
              console.warn(`[Supabase] ${method} ${pathSuffix} -> ${res.statusCode}: ${data}`);
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        if (payload) req.write(payload);
        req.end();
      } catch {
        resolve(null);
      }
    });
  }

  async fetchHighScoresFromSupabase() {
    const rows = await this.supabaseRequest('GET', 'high_scores?select=*&order=score.desc&limit=50');
    if (Array.isArray(rows) && rows.length > 0) {
      this.highScores = rows.map(r => ({
        id: r.id,
        name: r.name,
        score: r.score,
        difficulty: r.difficulty || 'normal',
        gameMode: r.game_mode || r.gameMode || 'classic',
        apples: r.apples || 0,
        goldenApples: r.golden_apples || r.goldenApples || 0,
        date: r.date || 'Reciente'
      })).sort((a, b) => b.score - a.score).slice(0, 50);
      this.saveHighScoresToDisk();
      this.broadcastGlobal({
        type: 'HIGH_SCORES_SYNC',
        scores: this.highScores
      });
      console.log(`[Supabase] ${this.highScores.length} récords cargados desde Supabase.`);
    }
  }

  loadHighScores() {
    try {
      if (fs.existsSync(HIGH_SCORES_FILE)) {
        const raw = fs.readFileSync(HIGH_SCORES_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 50);
        }
      }
    } catch (err) {
      console.error('[RoomManager] Error leyendo high_scores.json:', err.message);
    }
    return [
      { id: 'seed-1', name: 'Master Cobra', score: 240, difficulty: 'normal', gameMode: 'classic', apples: 22, date: 'Reciente' },
      { id: 'seed-2', name: 'Ghost Viper', score: 210, difficulty: 'normal', gameMode: 'portal', apples: 19, date: 'Reciente' },
      { id: 'seed-3', name: 'RetroGamer', score: 180, difficulty: 'normal', gameMode: 'classic', apples: 16, date: 'Reciente' }
    ];
  }

  saveHighScoresToDisk() {
    try {
      const dir = path.dirname(HIGH_SCORES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(HIGH_SCORES_FILE, JSON.stringify(this.highScores, null, 2), 'utf8');
    } catch (err) {
      console.error('[RoomManager] Error guardando high_scores.json:', err.message);
    }
  }

  getHighScores() {
    return this.highScores;
  }

  addHighScore(entry) {
    if (!entry || typeof entry.score !== 'number') return this.highScores;
    const cleanEntry = {
      id: entry.id || ('sc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      name: (entry.name && String(entry.name).trim()) ? String(entry.name).trim().slice(0, 16) : 'PilotoSnake',
      score: Math.max(0, Math.floor(entry.score)),
      difficulty: entry.difficulty || 'normal',
      gameMode: entry.gameMode === 'portal' ? 'portal' : 'classic',
      apples: Math.max(0, Math.floor(entry.apples || 0)),
      goldenApples: Math.max(0, Math.floor(entry.goldenApples || 0)),
      date: entry.date || new Date().toLocaleString('es-AR', { hour12: false })
    };

    // Evitar duplicados por id
    const filtered = this.highScores.filter(item => item.id !== cleanEntry.id);
    filtered.push(cleanEntry);
    filtered.sort((a, b) => b.score - a.score);
    this.highScores = filtered.slice(0, 50);
    this.saveHighScoresToDisk();

    if (SUPABASE_KEY) {
      this.supabaseRequest('POST', 'high_scores', {
        id: cleanEntry.id,
        name: cleanEntry.name,
        score: cleanEntry.score,
        difficulty: cleanEntry.difficulty,
        game_mode: cleanEntry.gameMode,
        apples: cleanEntry.apples,
        golden_apples: cleanEntry.goldenApples,
        date: cleanEntry.date
      }, { 'Prefer': 'resolution=merge-duplicates' });
    }

    this.broadcastGlobal({
      type: 'HIGH_SCORES_SYNC',
      scores: this.highScores
    });

    return this.highScores;
  }

  clearHighScores() {
    this.highScores = [];
    this.saveHighScoresToDisk();
    if (SUPABASE_KEY) {
      this.supabaseRequest('DELETE', 'high_scores?id=neq.__none__');
    }
    this.broadcastGlobal({
      type: 'HIGH_SCORES_SYNC',
      scores: this.highScores
    });
    return this.highScores;
  }

  broadcastGlobal(payload) {
    const jsonStr = JSON.stringify(payload);
    let encodedBuf = null;
    for (const room of this.rooms.values()) {
      for (const socket of room.spectators) {
        try {
          if (typeof socket.send === 'function') {
            if (socket.readyState === 1) socket.send(jsonStr);
          } else {
            if (!encodedBuf) encodedBuf = encodeFrame(jsonStr);
            socket.write(encodedBuf);
          }
        } catch {}
      }
      for (const [socket] of room.players) {
        try {
          if (typeof socket.send === 'function') {
            if (socket.readyState === 1) socket.send(jsonStr);
          } else {
            if (!encodedBuf) encodedBuf = encodeFrame(jsonStr);
            socket.write(encodedBuf);
          }
        } catch {}
      }
    }
  }

  sanitizeRoomId(rawId) {
    if (!rawId || typeof rawId !== 'string') return DEFAULT_ROOM_ID;
    const clean = rawId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16);
    return clean || DEFAULT_ROOM_ID;
  }

  getOrCreateRoom(rawId) {
    const roomId = this.sanitizeRoomId(rawId);
    if (!this.rooms.has(roomId)) {
      console.log(`[RoomManager] Nueva sala creada: ${roomId}`);
      this.rooms.set(roomId, new ArenaRoom(roomId));
    }
    return this.rooms.get(roomId);
  }

  getRoom(rawId) {
    const roomId = this.sanitizeRoomId(rawId);
    return this.rooms.get(roomId) || null;
  }

  handleDisconnect(socket) {
    const binding = this.socketMap.get(socket);
    if (binding) {
      const room = this.rooms.get(binding.roomId);
      if (room) {
        room.removePlayer(socket);
      }
      this.socketMap.delete(socket);
    }
  }

  bindSocket(socket, roomId, isSpectator = false) {
    this.socketMap.set(socket, {
      roomId,
      isSpectator,
      isPlayer: !isSpectator
    });
  }

  updateAll() {
    for (const room of this.rooms.values()) {
      room.updateBots();
      room.broadcastArenaSnapshot(false);
    }
  }

  getStatus() {
    const roomsData = [];
    for (const room of this.rooms.values()) {
      roomsData.push({
        roomId: room.roomId,
        playersCount: room.players.size,
        spectatorsCount: room.spectators.size,
        botsEnabled: room.botsEnabled,
        slots: room.slots.map(s => ({
          slotId: s.slotId,
          name: s.name,
          isBot: s.isBot,
          connected: s.connected,
          status: s.status,
          score: s.score
        }))
      });
    }
    return {
      status: 'online',
      version: '2.1.3-fix',
      service: 'Snake Arena Multi-Room WebSocket Relay',
      port: PORT,
      totalRooms: this.rooms.size,
      rooms: roomsData,
      highScoresCount: this.highScores.length,
      debugLog: this.debugLog || []
    };
  }
}

const roomManager = new RoomManager();

function handleClientMessage(socket, data) {
  const targetRoomId = roomManager.sanitizeRoomId(data.roomId);
  const room = roomManager.getOrCreateRoom(targetRoomId);

  switch (data.type) {
    case 'REGISTER_PLAYER':
      roomManager.bindSocket(socket, room.roomId, false);
      room.registerPlayer(socket, data.slotId, data.name, data.token);
      room.send(socket, {
        type: 'HIGH_SCORES_SYNC',
        scores: roomManager.getHighScores()
      });
      break;

    case 'TELEMETRY_FRAME':
      room.updatePlayerFrame(socket, data);
      break;

    case 'REGISTER_SPECTATOR':
      roomManager.bindSocket(socket, room.roomId, true);
      room.spectators.add(socket);
      room.send(socket, {
        type: 'SPECTATOR_JOINED',
        roomId: room.roomId,
        slots: room.slots,
        botsEnabled: room.botsEnabled
      });
      room.send(socket, {
        type: 'HIGH_SCORES_SYNC',
        scores: roomManager.getHighScores()
      });
      break;

    case 'SUBMIT_HIGH_SCORE':
      if (data.entry) {
        roomManager.addHighScore(data.entry);
      }
      break;

    case 'CLEAR_HIGH_SCORES':
      roomManager.clearHighScores();
      break;

    case 'REQUEST_HIGH_SCORES':
      room.send(socket, {
        type: 'HIGH_SCORES_SYNC',
        scores: roomManager.getHighScores()
      });
      break;

    case 'TOGGLE_BOTS':
      room.toggleBots(data.enabled !== undefined ? !!data.enabled : !room.botsEnabled);
      break;

    case 'START_COUNTDOWN':
      room.startCountdown(data.countdownSec || 3);
      break;

    case 'RESET_ROUND':
      room.resetRound();
      break;

    default:
      break;
  }
}

// ==================== HTTP & WEBSOCKET SERVER (STANDALONE RELAY) ====================
let server = null;

if (require.main === module) {
  server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/health' || req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(roomManager.getStatus()));
      return;
    }

    if (req.url === '/scores' || req.url === '/relay/scores') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ scores: roomManager.getHighScores() }));
        return;
      }
      if (req.method === 'DELETE') {
        const updated = roomManager.clearHighScores();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ scores: updated }));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const updated = roomManager.addHighScore(parsed);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ scores: updated }));
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Snake Arena Multi-Room WebSocket Relay Server activo en puerto ${PORT}.\nSalas activas: ${roomManager.rooms.size}`);
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleClientMessage(socket, data);
      } catch (err) {
        console.error('[!] Invalid JSON received:', err.message);
      }
    });

    socket.on('close', () => {
      roomManager.handleDisconnect(socket);
    });

    socket.on('error', () => {
      roomManager.handleDisconnect(socket);
    });
  });

  const pingInterval = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        roomManager.handleDisconnect(client);
        try { client.terminate(); } catch {}
        continue;
      }
      client.isAlive = false;
      try { client.ping(); } catch {}
    }
  }, 25000);

  wss.on('close', () => clearInterval(pingInterval));

  // 30 FPS Multi-Room Loop (Bots update & Spectator Broadcast por sala)
  setInterval(() => {
    roomManager.updateAll();
  }, 33);

  server.listen(PORT, () => {
    console.log('================================================================');
    console.log(`📡 MULTI-ROOM SNAKE ARENA RELAY SERVER EN PUERTO ${PORT}`);
    console.log('================================================================');
    console.log(`[*] Endpoint HTTP de Estado: http://localhost:${PORT}/status`);
    console.log(`[*] Endpoint WebSocket:     ws://localhost:${PORT}`);
    console.log(`[*] Soporte de Tokens de Jugador y Aislamiento de Salas Activo.`);
  });
}

module.exports = { ArenaRoom, RoomManager, roomManager, decodeFrames, encodeFrame, handleClientMessage, server };

