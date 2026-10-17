# 📜 REGISTRO DE CAMBIOS (CHANGELOG) - VÍBORA RETRO & SNAKE ARENA

Documento oficial de control de versiones, evolución de arquitectura, arnés de seguridad y despliegue en la nube.

---

## 📍 ESTADO ACTUAL DEL PROYECTO
- **Versión**: `v2.0.0` (Cloud Multiplayer, Live Room Scoreboard, Supabase Persistence & Linux Migration Pack)
- **Estado**: **DESPLEGADO EN PRODUCCIÓN (LIVE)**
  - **GitHub**: [https://github.com/Svayneak/snake-arena-multiplayer](https://github.com/Svayneak/snake-arena-multiplayer)
  - **Render (Juego & WebSocket)**: [https://snake-arena-multiplayer.onrender.com](https://snake-arena-multiplayer.onrender.com)
  - **Sala de Espectadores**: [https://snake-arena-multiplayer.onrender.com/spectator](https://snake-arena-multiplayer.onrender.com/spectator)
  - **Base de Datos Cloud**: **Supabase PostgreSQL** (`naacgdwtglvcumaccime` → tabla `public.high_scores` con políticas RLS activas).

---

## 🗂️ HISTORIAL DE VERSIONES

### [v2.0.0] - 2026-10-17 • Marcador Multijugador en Vivo, Persistencia en Supabase & Paquete de Migración a Linux
#### 🚀 Nuevas Características
- **Marcador Multijugador en Vivo en la Pantalla del Jugador (`components/SnakeGame.tsx` + `server/relay.js`)**:
  - El servidor `server/relay.js` ahora retransmite instantáneas `ARENA_SNAPSHOT` (~10 FPS y en eventos de sala) a todos los jugadores conectados además de a los espectadores.
  - Nueva barra **Marcador en Vivo — Sala** debajo del HUD principal que muestra en tiempo real los puntos, manzanas y estado de cada slot conectado (ej. `#1 PC` vs `#2 Celular`).
  - Botón directo **`⏱️ Ronda 3..2..1`** en la vista del jugador para lanzar partidas sincronizadas entre todos los dispositivos sin necesidad de abrir `/spectator`.
- **Cambio de Slot y Apodo en Vivo (`server/relay.js` + `components/SnakeGame.tsx`)**:
  - Corrección en `registerPlayer` para liberar el slot anterior (`freeSlotHelper`) cuando un jugador con token activo selecciona explícitamente cambiarse a otro slot libre (1 al 6).
  - Campo de **Nombre / Apodo** integrado directamente en el modal de configuración de Sala y Slot.
- **Persistencia Permanente en la Nube con Supabase (`server/relay.js` + `render.yaml`)**:
  - Provisionamiento automático de la tabla `public.high_scores` con Row Level Security (RLS) en Supabase (`https://naacgdwtglvcumaccime.supabase.co`).
  - Sincronización híbrida de cero dependencias vía módulo nativo `https` de Node.js + respaldo local en `data/high_scores.json` + difusión en tiempo real por WebSocket (`HIGH_SCORES_SYNC`) y endpoint HTTP `/scores`.
  - Auto-guardado automático al finalizar cada partida con puntaje `> 0` y actualización sin duplicados al personalizar el apodo.
- **Documentación de Arnés, Modelos y Lanzador para Linux (`HARNESS_Y_MODELOS.md` & `run-linux.sh`)**:
  - Inclusión del script `run-linux.sh` para iniciar el entorno de desarrollo o producción en Linux con un comando.
  - Empaquetado portable y sanitizado del arnés `.agents/` (`hooks.json`, `mcp.example.json`, `rules/security.md`, `scripts/validate_command.js`, `scripts/session_resume.js`, `scripts/test_harness.js`) y registro completo de modelos utilizados (`HARNESS_Y_MODELOS.md`).

---

### [v1.5.0] - 2026-10-16 • Servidor Unificado de Producción (`server/prod.js`) & Blueprint de Render.com
#### 🚀 Nuevas Características
- **Servidor Unificado en Puerto Único (`server/prod.js`)**:
  - Combina el servidor web de Next.js 14 y el servidor WebSocket RFC 6455 en el mismo servidor HTTP y puerto dinámico (`process.env.PORT`), requerido por contenedores cloud como Render.com.
  - Respuesta automática a tramas WebSocket Ping (`0x09`) con Pong (`0x8A`) para mantener conexiones activas a través de balanceadores cloud.
- **Blueprint de Despliegue (`render.yaml`)**:
  - Configuración declarativa para despliegue automático en Render.com (`npm install --include=dev && npm run build` y `npm start`).
  - Detección automática de protocolo seguro (`wss://`) en `lib/network.ts` cuando el cliente corre sobre HTTPS.

---

### [v1.4.0] - 2026-10-16 • Controles Táctiles Móviles, Aislamiento Multi-Sala y Tokens de Reconexión
#### 🚀 Nuevas Características
- **Soporte Táctil Completo para Celulares y Tablets (`lib/device.ts`, `lib/touchTracker.ts`, `components/TouchControls.tsx`)**:
  - Detección dinámica de capacidades táctiles y orientación de pantalla.
  - Seguimiento continuo del dedo sobre el canvas y soporte de gestos *swipe* + cruceta D-Pad interactiva.
- **Arquitectura Multi-Sala (`RoomManager` en `server/relay.js`)**:
  - Creación y aislamiento dinámico de múltiples salas (`ARENA-1`, códigos personalizados) con hasta 6 jugadores por sala.
  - Generación de tokens criptográficos (`tok_...`) persistidos en `localStorage`/`sessionStorage` para reconexión transparente al mismo slot.
  - Suite de pruebas unitarias de protocolo (`server/test_relay_rooms.js`).

---

### [v1.3.0] - 2026-10-11 • Snake Arena Multijugador & Sala de Espectadores
#### 🚀 Nuevas Características
- **Servidor WebSocket Relay de Cero Dependencias (`server/relay.js`)**:
  - Implementación nativa basada en RFC 6455 con los módulos de Node.js `http` y `crypto`.
  - Capacidad para 6 slots simultáneos con retransmisión a 30 FPS (~33 ms).
  - Simulación de Bots IA autónomos (`CyberViper`, `NeonCobra`, `GlitchPython`, `MatrixAdder`, `QuantumBoa`).
- **Sala de Espectadores en Vivo (`app/spectator/page.tsx`)**:
  - Grilla interactiva de 6 mini-arenas en 2x3 (`components/SpectatorGrid.tsx`, `components/SpectatorMiniArena.tsx`) con modo **Spotlight**.

---

### [v1.2.0] - 2026-10-11 • Estabilización del Motor, Cero Layout Shift & Telemetría Concurrente
#### 🐛 Correcciones Críticas
- **Throttling de la Manzana Dorada**: Reducción de actualizaciones de estado en React de 60 Hz a 1 Hz.
- **Eliminación Total de Layout Shift**: Contenedor exterior fijo de 44px (`h-11`) para el banner dorado.
- **Cola Mutex en el Logger de Telemetría (`app/api/telemetry/route.ts`)**.

---

### [v1.1.0] - 2026-10-10 • Port a Next.js 14 App Router & Telemetría en Servidor
#### 🚀 Nuevas Características
- Migración a Next.js 14 (App Router) con TypeScript, Tailwind CSS, sintetizador 8-bit (`lib/audio.ts`) y telemetría en disco.

---

### [v1.0.0] - 2026-10-09 • Creación del Motor de Cursor Continuo (Continuous Follower)
#### 🚀 Características Fundamentales
- Algoritmo de **Zero-Jump Armed Spawning**, **Tail Inception**, escudo de nacimiento de 1.5s y guardia anti-teletransporte.
