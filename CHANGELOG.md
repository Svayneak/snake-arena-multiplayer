# 📜 REGISTRO DE CAMBIOS (CHANGELOG) - VÍBORA RETRO & SNAKE ARENA

Documento oficial de control de versiones, evolución de arquitectura y estado del proyecto.

---

## 📍 ESTADO ACTUAL DEL PROYECTO
- **Versión**: `v1.3.0` (Multiplayer Arena & Spectator Room)
- **Estado**: **PROBADO Y APROBADO** en entorno local y red móvil (Wi-Fi).
- **Próximo Hito / Siguiente Etapa**: **SALA DE ESPERA MULTIJUGADOR (LOBBY / MATCHMAKING)**
  - Asignación de salas/slots para hasta 6 jugadores humanos.
  - Sistema de "Listo / Ready" por jugador.
  - Sincronización de reglas (Dificultad, Modo Portal/Paredes, Velocidad).
  - Cuenta regresiva automática cuando todos los jugadores marcan "Listo".
  - Transición fluida desde el Lobby a la partida simultánea y transmisión a la Sala de Espectadores.

---

## 🗂️ HISTORIAL DE VERSIONES

### [v1.3.0] - 2026-10-11 • Snake Arena Multijugador & Sala de Espectadores
#### 🚀 Nuevas Características
- **Servidor WebSocket Relay de Cero Dependencias (`server/relay.js`)**:
  - Implementación nativa basada en RFC 6455 con los módulos de Node.js `http` y `crypto` en el puerto `3500`.
  - Capacidad para 6 slots simultáneos con sincronización de estado global.
  - Retransmisión de instantáneas de telemetría a 30 FPS (~33 ms).
  - Simulación de Bots IA autónomos con navegación inteligente y evasión de bordes (`CyberViper`, `NeonCobra`, `GlitchPython`, `MatrixAdder`, `QuantumBoa`) para slots vacíos.
  - Protocolo de eventos: `REGISTER_PLAYER`, `REGISTER_SPECTATOR`, `TELEMETRY_FRAME`, `START_COUNTDOWN`, `ROUND_RESET`, `TOGGLE_BOTS`.
- **Sala de Espectadores en Vivo (`app/spectator/page.tsx`)**:
  - Grilla interactiva de 6 mini-arenas en 2x3 con renderizadores canvas individuales en tiempo real (`components/SpectatorGrid.tsx`, `components/SpectatorMiniArena.tsx`).
  - Paletas de color neón únicas por slot (Esmeralda, Cian, Púrpura, Ámbar, Rosa, Lima).
  - Modo **Spotlight**: Posibilidad de fijar cualquier slot en vista principal ampliada con los demás en barra lateral.
  - Panel de control con botones para Iniciar Ronda Sincronizada (3..2..1..¡YA!), Activar/Desactivar Bots y Reiniciar.
  - Clasificación en vivo en tiempo real ordenada por puntuación.
- **Cliente de Juego Conectado a la Red (`components/SnakeGame.tsx` & `lib/network.ts`)**:
  - Conexión y reintento automático a `ws://<host>:3500`.
  - Parámetro de slot vía URL (`?slot=1` a `6`).
  - Insignia de estado `🟢 En Vivo (Slot #X)` con acceso directo a la sala de espectador.
  - Overlay de cuenta regresiva sincronizada que bloquea y dispara el inicio de todos los jugadores al unísono.
- **Soporte Móvil Multi-Dispositivo en LAN**:
  - Next.js configurado con binding `0.0.0.0` para admitir conexiones desde celulares y tablets conectados a la misma red Wi-Fi (`http://192.168.100.97:3000/spectator`).
  - Detección dinámica del host WebSocket (`window.location.hostname`).
- **Lanzador Unificado de Un Clic (`run-arena.bat`)**:
  - Cierra automáticamente sesiones previas en puertos 3000 y 3500.
  - Levanta el relay en segundo plano, abre navegador en juego y espectador, e inicia Next.js.
  - Informa en consola la IP local para conexión desde el celular.

---

### [v1.2.0] - 2026-10-11 • Estabilización del Motor, Cero Layout Shift & Telemetría Concurrente
#### 🐛 Correcciones Críticas
- **Throttling de la Manzana Dorada**:
  - Se redujo la frecuencia de actualización del temporizador en React de 60 Hz a 1 Hz (`lastReportedBonusSec`), eliminando un 98.3% de re-renders innecesarios y garantizando 60 FPS estables en el juego.
- **Eliminación Total de Layout Shift**:
  - Fijación estricta de altura de 44px (`h-11`) en el contenedor exterior del banner de la manzana dorada, manteniéndolo estrictamente fuera del canvas. El canvas permanece 100% inmóvil.
- **Blindaje de Modales con Estilos en Línea de Respaldo**:
  - Se añadieron estilos rígidos en línea (`position: fixed`, `inset: 0`, `z-index: 9999`) a Game Over, Pausa Rápida y Leaderboard, garantizando centrado perfecto aún en demoras de carga de CSS.
- **Cola Mutex en el Logger de Telemetría (`app/api/telemetry/route.ts`)**:
  - Implementación de bloqueo secuencial para prevenir colisiones de escritura en Windows (`EBUSY` / `EPERM`) al persistir en `data/telemetry_latest.json` y `data/telemetry_flight_log.json`.
- **Limpieza de Puertos y Traza en `run.bat`**:
  - Cierre automático de procesos residuales en el puerto 3000 y borrado de bloqueos en `.next\trace`.
- **Parche de Compatibilidad de TypeScript en Sandbox Windows**:
  - Corrección en `has-necessary-dependencies.js` para capturar excepciones `realpath` y restricciones de exportación en `@types/react`.

---

### [v1.1.0] - 2026-10-10 • Port a Next.js 14 App Router & Telemetría en Servidor
#### 🚀 Nuevas Características
- Migración de la arquitectura a Next.js 14 (App Router) con TypeScript y Tailwind CSS.
- Creación de la ruta de API `app/api/telemetry/route.ts` con almacenamiento local en disco.
- Módulo `lib/tracker.ts` para muestreo de coordenadas de cursor, velocidad, aceleración y eventos de juego.
- Modal de Pausa Rápida mediante click derecho con opciones completas de personalización.
- Modo Widescreen Arena con redimensionamiento dinámico del canvas.
- Leaderboard persistente con categorías de dificultad y exportación a JSON/CSV.
- Sintetizador 8-Bit mediante Web Audio API pura (sin assets de audio externos).

---

### [v1.0.0] - 2026-10-09 • Creación del Motor de Cursor Continuo (Continuous Follower)
#### 🚀 Características Fundamentales
- Algoritmo de **Zero-Jump Armed Spawning**: nacimiento seguro bajo el cursor sin teletransportación.
- **Tail Inception**: nacimiento de cola colapsada para evitar colisión de cuello al arrancar.
- Escudo de inmunidad al renacer (1.5 segundos).
- Guardia anti-teletransporte para movimientos superiores a 65px/fotograma.
- Detección de auto-colisión filtrada a partir del segmento 8.
- Modos de colisión: Pared Mortal Clásica vs. Portal Luminoso Continuo.
- Soporte dual: Modo Cursor Continuo vs. Modo WASD Grilla Tradicional.
