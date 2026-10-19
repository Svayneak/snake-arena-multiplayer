/**
 * Unified Production Server for Render.com / Cloud Containers
 * Serves Next.js Web Application AND WebSocket Multiplayer Relay on a SINGLE DYNAMIC PORT.
 * Zero-dependency WebSocket handling via native Node.js RFC 6455.
 */

const http = require('http');
const path = require('path');
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
    // Intercept WebSocket upgrade requests that reach the HTTP request listener
    // to prevent Next.js from rendering an HTML response and closing the socket!
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
      roomManager.logDebug({
        event: 'http_request_with_upgrade_intercepted',
        url: req.url,
        headers: {
          host: req.headers.host,
          upgrade: req.headers.upgrade,
          connection: req.headers.connection
        }
      });
      return;
    }

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

    // If a request hits /ws directly without upgrade headers, return 426 Upgrade Required
    if (req.url === '/ws' || req.url === '/relay') {
      res.writeHead(426, { 'Upgrade': 'WebSocket', 'Content-Type': 'text/plain' });
      res.end('Upgrade Required');
      return;
    }

    // Next.js handles all static assets, pages and API routes
    handle(req, res);
  });

  // Use noServer: true to cleanly decouple WebSocket upgrades from the HTTP server
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    // Intercept and instrument socket.end and socket.destroy to track stream lifecycle
    const origEnd = socket.end;
    socket.end = function(...args) {
      roomManager.logDebug({
        event: 'socket_end_called',
        writableEnded: this.writableEnded,
        destroyed: this.destroyed,
        stack: (new Error().stack || '').split('\n').slice(1, 5).map(s => s.trim()).join(' -> ')
      });
      return origEnd.apply(this, args);
    };

    const origDestroy = socket.destroy;
    socket.destroy = function(...args) {
      roomManager.logDebug({
        event: 'socket_destroy_called',
        stack: (new Error().stack || '').split('\n').slice(1, 5).map(s => s.trim()).join(' -> ')
      });
      return origDestroy.apply(this, args);
    };

    socket.on('end', () => {
      roomManager.logDebug({ event: 'socket_emitted_end' });
    });

    // Handle WebSocket upgrade
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (socket, req) => {
    const rawSocket = socket._socket;
    roomManager.logDebug({ 
      event: 'wss_connection', 
      url: req ? req.url : null,
      rawSocketState: rawSocket ? {
        writable: rawSocket.writable,
        writableEnded: rawSocket.writableEnded,
        destroyed: rawSocket.destroyed,
        readyState: socket.readyState
      } : null,
      headers: req ? { 
        host: req.headers.host, 
        upgrade: req.headers.upgrade, 
        connection: req.headers.connection 
      } : null 
    });

    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        roomManager.logDebug({ event: 'ws_message', type: data.type, roomId: data.roomId, slotId: data.slotId });
        handleClientMessage(socket, data);
      } catch (err) {
        roomManager.logDebug({ event: 'ws_json_error', error: err.message });
      }
    });

    socket.on('close', (code, reason) => {
      roomManager.logDebug({ event: 'ws_close', code, reason: reason ? reason.toString() : '' });
      roomManager.handleDisconnect(socket);
    });

    socket.on('error', (err) => {
      roomManager.logDebug({ event: 'ws_error', error: err ? (err.message || String(err)) : 'unknown' });
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
