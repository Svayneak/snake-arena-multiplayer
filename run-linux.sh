#!/usr/bin/env bash
# ==============================================================================
# Lanzador Unificado para Linux - Snake Arena Multiplayer (Next.js + Relay)
# Uso:
#   chmod +x run-linux.sh
#   ./run-linux.sh          # Modo desarrollo (Next.js en :3000 + Relay en :3500)
#   ./run-linux.sh --prod   # Modo producción unificado (Todo en :3000)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js no está instalado. Instala Node.js 18+ (recomendado v20 LTS)."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependencias con npm install..."
  npm install
fi

if [ "${1:-}" = "--prod" ]; then
  echo "🏗️  Compilando proyecto Next.js para producción..."
  npm run build
  echo "🚀 Iniciando servidor unificado (Next.js + WebSocket Relay) en puerto ${PORT:-3000}..."
  NODE_ENV=production npm start
else
  echo "🧹 Liberando puertos previos (3000 y 3500) si existen..."
  fuser -k 3000/tcp >/dev/null 2>&1 || true
  fuser -k 3500/tcp >/dev/null 2>&1 || true

  echo "📡 Iniciando WebSocket Relay Server en segundo plano (puerto 3500)..."
  node server/relay.js &
  RELAY_PID=$!

  trap "echo '🛑 Deteniendo Relay Server ($RELAY_PID)...'; kill $RELAY_PID >/dev/null 2>&1 || true" EXIT INT TERM

  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
  echo "================================================================"
  echo "🐍 SNAKE ARENA MULTIPLAYER (MODO DESARROLLO LINUX)"
  echo "   🎮 Juego Local:       http://localhost:3000"
  echo "   📱 Juego en Red LAN:  http://${LOCAL_IP}:3000"
  echo "   📺 Sala Espectador:   http://${LOCAL_IP}:3000/spectator"
  echo "   🔌 WebSocket Relay:   ws://${LOCAL_IP}:3500"
  echo "================================================================"

  npm run dev
fi
