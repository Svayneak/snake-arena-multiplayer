/**
 * Unified Production Server for Render.com / Cloud Containers
 * Serves Next.js Web Application AND WebSocket Multiplayer Relay on a SINGLE DYNAMIC PORT.
 * Zero-dependency WebSocket handling via native Node.js RFC 6455.
 */

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const next = require('next');
const { WebSocketServer } = require('ws');
const { 
  RoomManager, 
  roomManager, 
  decodeFrames, 
  encodeFrame,
  handleClientMessage
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

    // Shared High Scores Endpoint
    if (req.url === '/scores' || req.url === '/relay/scores') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
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

    // Next.js handles all static assets, pages and API routes
    handle(req, res);
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
