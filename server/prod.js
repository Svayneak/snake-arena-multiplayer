/**
 * Unified Production Server for Render.com / Cloud Containers
 * Serves Next.js Web Application AND WebSocket Multiplayer Relay on a SINGLE DYNAMIC PORT.
 * Zero-dependency WebSocket handling via native Node.js RFC 6455.
 */

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const next = require('next');
const { 
  RoomManager, 
  roomManager, 
  decodeFrames, 
  encodeFrame 
} = require('./relay.js');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const dev = process.env.NODE_ENV !== 'production';

// Initialize Next.js app in production mode
const app = next({ dev, dir: path.resolve(__dirname, '..') });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    // Custom Relay Health & Status Endpoints
    if (req.url === '/relay/status' || req.url === '/status') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(roomManager.getStatus()));
      return;
    }

    // Next.js handles all static assets, pages and API routes
    handle(req, res);
  });

  // Handle RFC 6455 WebSocket Upgrade on the same HTTP server
  server.on('upgrade', (req, socket, head) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
    );

    let incomingBuffer = Buffer.alloc(0);

    socket.on('data', chunk => {
      incomingBuffer = Buffer.concat([incomingBuffer, chunk]);
      const { messages, remaining } = decodeFrames(incomingBuffer);
      incomingBuffer = remaining;

      for (const msg of messages) {
        if (msg.type === 'text') {
          try {
            const data = JSON.parse(msg.text);
            handleClientMessage(socket, data);
          } catch (err) {
            console.error('[!] Invalid JSON received:', err.message);
          }
        } else if (msg.type === 'ping') {
          try { socket.write(Buffer.from([0x8a, 0x00])); } catch {}
        } else if (msg.type === 'close') {
          roomManager.handleDisconnect(socket);
          socket.end();
        }
      }
    });

    socket.on('close', () => {
      roomManager.handleDisconnect(socket);
    });

    socket.on('error', () => {
      roomManager.handleDisconnect(socket);
    });
  });

  function handleClientMessage(socket, data) {
    const targetRoomId = roomManager.sanitizeRoomId(data.roomId);
    const room = roomManager.getOrCreateRoom(targetRoomId);

    switch (data.type) {
      case 'REGISTER_PLAYER':
        roomManager.bindSocket(socket, room.roomId, false);
        room.registerPlayer(socket, data.slotId, data.name, data.token);
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

  // 30 FPS Multi-Room Telemetry & AI Bot Loop
  setInterval(() => {
    roomManager.updateAll();
  }, 33);

  server.listen(PORT, '0.0.0.0', () => {
    console.log('================================================================');
    console.log(`🌐 UNIFIED NEXT.JS + WEBSOCKET RELAY RUNNING ON PORT ${PORT}`);
    console.log('================================================================');
    console.log(`[*] Web Application:      http://0.0.0.0:${PORT}`);
    console.log(`[*] Spectator Room:       http://0.0.0.0:${PORT}/spectator`);
    console.log(`[*] Multi-Room WebSocket: ws://0.0.0.0:${PORT} (or wss:// with SSL)`);
    console.log(`[*] Service Status:       http://0.0.0.0:${PORT}/status`);
  });
}).catch(err => {
  console.error('Failed to start unified server:', err);
  process.exit(1);
});
