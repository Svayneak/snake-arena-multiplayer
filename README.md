# 🐍 Snake Arena Multiplayer — Víbora Retro Next.js 14 + WebSocket Relay + Supabase

Una versión moderna, multijugador en tiempo real y de alto rendimiento del clásico *Snake*, construida con **Next.js 14 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS**, un servidor **WebSocket RFC 6455 de cero dependencias** y persistencia permanente en la nube con **Supabase PostgreSQL**.

---

## 🌐 Enlaces en Producción (Live)

- 🎮 **Jugar Ahora (PC y Móvil Táctil)**: [https://snake-arena-multiplayer.onrender.com](https://snake-arena-multiplayer.onrender.com)
- 📺 **Sala de Espectadores (Grilla 2x3 en Vivo)**: [https://snake-arena-multiplayer.onrender.com/spectator](https://snake-arena-multiplayer.onrender.com/spectator)
- 📡 **Estado del Servidor / Salas Activas (JSON)**: [https://snake-arena-multiplayer.onrender.com/status](https://snake-arena-multiplayer.onrender.com/status)
- 🏆 **API de Récords Globales (JSON)**: [https://snake-arena-multiplayer.onrender.com/scores](https://snake-arena-multiplayer.onrender.com/scores)
- 🔗 **Repositorio GitHub**: [https://github.com/Svayneak/snake-arena-multiplayer](https://github.com/Svayneak/snake-arena-multiplayer)

---

## 🚀 Características Principales

### 1. 🌐 Multijugador en Tiempo Real, Multi-Sala y Marcador en Vivo
- **Marcador de Sala en Vivo en Pantalla (`components/SnakeGame.tsx`)**: Debajo del HUD personal se muestra en tiempo real el puntaje, manzanas y estado de todos los jugadores conectados a la misma sala (por ejemplo Slot #1 en PC y Slot #2 en Celular).
- **Aislamiento Dinámico Multi-Sala (`server/relay.js`)**: Soporte para múltiples salas independientes (`ARENA-1`, códigos personalizados o generados al azar) con hasta **6 jugadores simultáneos por sala**.
- **Tokens Criptográficos de Sesión (`tok_...`)**: Reconexión automática al mismo slot ante cortes de red o recargas de página, y selector interactivo de Slot (`#1` a `#6`) y Apodo en tiempo real.
- **Cuenta Regresiva Sincronizada (`⏱️ Ronda 3..2..1`)**: Cualquier jugador o espectador puede disparar el inicio simultáneo de la partida en todos los dispositivos conectados a la sala.
- **Sala de Espectadores / TV (`app/spectator/page.tsx`)**: Vista de 6 mini-arenas simultáneas a 30 FPS con modo *Spotlight*, control de Bots IA autónomos y tabla de posiciones en vivo.

### 2. 🗄️ Persistencia Permanente en la Nube con Supabase + Tiempo Real
- **Sincronización Instantánea (`HIGH_SCORES_SYNC`)**: Al finalizar una partida, el puntaje se guarda automáticamente y se transmite por WebSocket a todos los dispositivos conectados (PC y móviles).
- **Base de Datos PostgreSQL en Supabase (`public.high_scores`)**: Respaldo permanente en la nube con **Row Level Security (RLS)** activo, garantizando que el historial de récords nunca se pierda aunque el contenedor gratuito de Render entre en reposo.
- **Exportación Completa**: Descarga de la tabla de líderes en formatos **JSON** y **CSV / Excel**.

### 3. 📱 Soporte Móvil Táctil Nativo y Detección Automática de Dispositivo
- **Detección Inteligente (`lib/device.ts`)**: Identifica automáticamente si el jugador ingresa desde **PC** o **Móvil Táctil**.
- **Seguimiento Táctil Continuo y Gestos Swipe (`lib/touchTracker.ts`)**: En modo Cursor/Táctil la serpiente sigue suavemente el dedo sobre el canvas; en modo D-Pad/WASD responde a gestos *swipe* y a la cruceta táctil en pantalla (`components/TouchControls.tsx`).

### 4. 🖱️ Motor Físico de Seguimiento Continuo (*Continuous Follower*)
- **Zero-Jump Armed Spawning**: La serpiente se arma en reposo y nace suavemente bajo el cursor/dedo sin saltos bruscos.
- **Incepción de Cola (*Tail Inception*)**: La cola se despliega progresivamente al avanzar, evitando colisiones inmediatas de cuello al nacer.
- **Escudo de Nacimiento (1.5s)** y **Guardia Anti-Teletransporte (>65px/frame)**.
- **Modos de Pared**: **🧱 Clásico (Paredes Mortales)** y **🌀 Atraviesa Paredes (Portal)**.
- **Banner de Manzana Dorada con Cero Layout Shift**: Ubicado fuera del canvas en un contenedor fijo (`h-11`) para garantizar **0px de desplazamiento visual**.

### 5. 🛡️ Arnés de Seguridad Desacoplado (`.agents/`)
- Incluye el arnés completo de seguridad para desarrollo asistido por IA con **Antigravity (`agy` CLI)**:
  - Reglas de aislamiento ([`.agents/rules/security.md`](.agents/rules/security.md)).
  - Hooks de ciclo de vida `SessionStart` y `PreToolUse` ([`.agents/hooks.json`](.agents/hooks.json)).
  - Firewall de comandos y protección de rutas personales/sistema ([`.agents/scripts/validate_command.js`](.agents/scripts/validate_command.js)).
  - Batería de 30 pruebas automatizadas ([`.agents/scripts/test_harness.js`](.agents/scripts/test_harness.js)).
- 📄 **Documentación completa del Arnés y Modelos utilizados**: Consulta [**`HARNESS_Y_MODELOS.md`**](HARNESS_Y_MODELOS.md).

---

## 📁 Estructura del Proyecto

```text
snake-next/
├── .agents/                      # Arnés de seguridad desacoplado (Hooks, Reglas, Validador y Tests)
│   ├── hooks.json                # Configuración de interceptores SessionStart y PreToolUse
│   ├── mcp.example.json          # Plantilla de servidores MCP (GitHub + Supabase)
│   ├── rules/security.md         # Políticas de aislamiento del espacio de trabajo
│   └── scripts/
│       ├── session_resume.js     # Inyección de contexto al iniciar sesión
│       ├── validate_command.js   # Firewall Fail-Closed para run_command y view_file
│       └── test_harness.js       # Suite de 30 pruebas de seguridad automatizadas
├── app/
│   ├── api/telemetry/route.ts    # Endpoint POST & GET para caja negra de telemetría
│   ├── spectator/page.tsx        # Sala de Espectadores en vivo (6 arenas a 30 FPS)
│   ├── globals.css               # Estilos globales y Tailwind CSS
│   ├── layout.tsx                # Layout principal Next.js 14
│   └── page.tsx                  # Página principal del juego
├── components/
│   ├── SnakeGame.tsx             # Controlador principal, Marcador en Vivo y selector de Sala/Slot
│   ├── SpectatorGrid.tsx         # Grilla 2x3 + modo Spotlight de la Sala de Espectadores
│   ├── SpectatorMiniArena.tsx    # Renderizador Canvas de cada slot en vivo
│   ├── TouchControls.tsx         # Cruceta D-Pad y controles táctiles para móviles
│   ├── QuickPauseMenu.tsx        # Modal de pausa rápida por click derecho
│   └── Leaderboard.tsx           # Tabla de récords sincronizada con el servidor y Supabase
├── lib/
│   ├── audio.ts                  # Sintetizador Web Audio API 8-bit
│   ├── device.ts                 # Detector de capacidades táctiles y viewport móvil/PC
│   ├── engine.ts                 # Motor físico continuo y colisiones
│   ├── network.ts                # Cliente WebSocket multi-sala con reconexión por token
│   ├── storage.ts                # Gestor de récords y sincronización remota
│   ├── touchTracker.ts           # Seguidor táctil continuo y detector de swipes
│   └── tracker.ts                # Flight recorder de telemetría
├── server/
│   ├── prod.js                   # Servidor unificado de producción (Next.js + WebSocket en 1 puerto)
│   ├── relay.js                  # Servidor WebSocket RFC 6455 Multi-Sala + Bots IA + Supabase Sync
│   └── test_relay_rooms.js       # Tests unitarios de protocolo multi-sala y tokens
├── render.yaml                   # Especificación Blueprint para despliegue en Render.com
├── run-linux.sh                  # Lanzador automático para Linux (modo dev y modo prod)
├── run-arena.bat                 # Lanzador automático para Windows (Next.js + Relay)
├── run-prod.bat                  # Lanzador de producción local en Windows
├── AGENTS.md                     # Normas del workspace y estado del proyecto
├── HARNESS_Y_MODELOS.md          # Detalle del arnés de seguridad y modelos de IA de las sesiones
└── CHANGELOG.md                  # Historial detallado de versiones (v1.0.0 a v2.0.0)
```

---

## 🐧 Cómo Retomar y Ejecutar en Linux

### 1. Clonar e instalar dependencias
```bash
git clone https://github.com/Svayneak/snake-arena-multiplayer.git
cd snake-arena-multiplayer
npm install
```

### 2. Ejecutar en modo Desarrollo (Next.js en `:3000` + Relay en `:3500`)
```bash
chmod +x run-linux.sh
./run-linux.sh
```

### 3. Ejecutar en modo Producción Unificado (Todo en `:3000`, igual que en Render)
```bash
./run-linux.sh --prod
```

### 4. Ejecutar las Pruebas Automatizadas (Protocolo + Arnés de Seguridad)
```bash
# Verificar protocolo multi-sala y tokens WebSocket (11/11 tests)
node server/test_relay_rooms.js

# Verificar el arnés de seguridad .agents (30/30 tests)
node .agents/scripts/test_harness.js
```

---

## 💻 Cómo Ejecutar en Windows

- **Modo Arena Multijugador (Desarrollo)**: Doble clic en `run-arena.bat`.
- **Modo Producción Unificado**: Doble clic en `run-prod.bat`.
