# Registro de Cambios por Proyecto (`changelog.md`) — `snake-next`

> Bitácora estructurada de todos los cambios realizados en el proyecto **Snake Arena Multiplayer (`snake-next`)**, clasificados en tres dimensiones: **Comportamientos**, **Tecnologías** y **Código Plano**.

---

## [v2.1.0] — 2026-10-17 — Sistema de Auditoría `/wrap-session`, `decisionlog.md` y Documentación `docs/`

### 1. Cambios de Comportamientos
- **Cierre automatizado de sesión (`/wrap-session`)**: El agente ahora responde a `/wrap-session` y frases naturales (`"cerramos la sesion"`, `"termina la sesion"`, `"acabamos por hoy"`, `"wrap session"`, `"done for the day"`) generando auditorías completas de prompts, resultados, errores (del agente y humanos), decisiones y changelogs.
- **Trazabilidad de Decisiones (`decisionlog.md`)**: Cada vez que el agente consulta al usuario cómo proseguir y presenta opciones, la alternativa elegida y su impacto quedan registrados en `decisionlog.md`.
- **Sincronización automática de `docs/`**: La documentación del proyecto dentro de `snake-next/docs/` se crea o actualiza automáticamente al cerrar cada sesión.

### 2. Cambios de Tecnologías
- **Antigravity Skills System (`.agents/skills/wrap-session/`)**: Incorporación de una skill reutilizable en el workspace con script auxiliar Node.js (`wrap_helper.js`).

### 3. Cambios de Código Plano
- Creado [`.agents/skills/wrap-session/SKILL.md`](./.agents/skills/wrap-session/SKILL.md) y [`.agents/skills/wrap-session/scripts/wrap_helper.js`](./.agents/skills/wrap-session/scripts/wrap_helper.js).
- Creada la carpeta [`docs/`](./docs/) con [`docs/README.md`](./docs/README.md), [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md), [`docs/DESPLIEGUE_Y_ENTORNO.md`](./docs/DESPLIEGUE_Y_ENTORNO.md), [`docs/ARNES_Y_SESIONES.md`](./docs/ARNES_Y_SESIONES.md), [`docs/decisionlog.md`](./docs/decisionlog.md) y [`docs/changelog.md`](./docs/changelog.md).
- Actualizado [`scratch/sync_harness_files.js`](./scratch/sync_harness_files.js) para empaquetar también la skill `/wrap-session` dentro del repositorio.

---

## [v2.0.0] — 2026-10-17 — Persistencia Permanente en Supabase, Marcador de Sala en Vivo y Soporte Linux

### 1. Cambios de Comportamientos
- **Persistencia permanente en la nube**: Los récords globales ya no se pierden cuando Render reinicia o suspende el contenedor gratuito; se almacenan permanentemente en PostgreSQL (Supabase) con fallback automático a JSON local y `localStorage`.
- **Marcador de Sala en Vivo (`Marcador de Sala (En Vivo)`)**: Al jugar en modo multijugador LAN/Online, el panel lateral muestra en tiempo real los puntajes, estado (vivo/muerto/espectador) y longitud de todos los jugadores conectados a la sala actual.
- **Cambio dinámico de Slot (`switch_slot`)**: Los jugadores y espectadores en una sala pueden cambiar libremente entre los slots `P1..P4` o pasar a modo espectador desde el lobby sin recargar la página; si el Host (`P1`) cambia de slot o se desconecta, el servidor reasigna el rol de Host automáticamente.
- **Soporte nativo de ejecución en Linux**: Detección automática de IP LAN en Linux y arranque en modo desarrollo o producción con `./run-linux.sh`.

### 2. Cambios de Tecnologías
- **Supabase PostgreSQL + Row Level Security (RLS)**: Proyecto `naacgdwtglvcumaccime` (`https://naacgdwtglvcumaccime.supabase.co`), tabla `public.high_scores` con políticas RLS para `anon`.
- **Supabase MCP Server**: Configurado en `.agents/mcp.json` mediante `@supabase/mcp-server-supabase@latest` para reutilización en todo el workspace `Augus-agy`.
- **Bash Scripting para Linux**: Nuevo lanzador multiplataforma `run-linux.sh`.

### 3. Cambios de Código Plano
- [`server/prod.js`](./server/prod.js) y [`server/relay.js`](./server/relay.js):
  - Añadidos helpers `supabaseFetchScores()`, `supabaseInsertScore()` y `supabaseClearScores()`.
  - Añadido manejo del mensaje WebSocket `switch_slot` y actualización de `score` en vivo dentro de `player_input` y `update_name`.
- [`lib/network.ts`](./lib/network.ts):
  - Añadido método `switchSlot(targetSlot)` y envío de `score` en `sendInput()` y `updateName()`.
- [`lib/storage.ts`](./lib/storage.ts):
  - Actualizado `fetchServerScores()` para devolver `{ scores, source }` indicando si los datos provienen de `'supabase'`, `'local-file'` o `'local-storage'`.
- [`components/SnakeGame.tsx`](./components/SnakeGame.tsx) y [`components/Leaderboard.tsx`](./components/Leaderboard.tsx):
  - Añadidos controles de cambio de slot en el lobby, tabla de posiciones de la sala en vivo y badge de estado `☁️ Supabase Cloud`.
- [`supabase/schema.sql`](./supabase/schema.sql) y [`scratch/setup_supabase.js`](./scratch/setup_supabase.js):
  - Script de aprovisionamiento DDL y políticas RLS para `public.high_scores`.
- [`run-linux.sh`](./run-linux.sh) y [`HARNESS_Y_MODELOS.md`](./HARNESS_Y_MODELOS.md):
  - Lanzador para sistemas Linux y documentación del arnés `.agents/`.

---

## [v1.5.0] — 2026-10-17 — Despliegue Cloud en Render.com y Publicación en GitHub

### 1. Cambios de Comportamientos
- **Multijugador a través de Internet**: El juego pasó de funcionar únicamente en red local (LAN) a ser accesible públicamente por Internet mediante `https://snake-arena-multiplayer.onrender.com`.
- **Detección automática de `wss://`**: El cliente detecta si la página corre bajo `https://` y conecta automáticamente por WebSocket seguro (`wss://<host>/ws`) en el mismo puerto del servidor.
- **Heartbeat anti-desconexión**: El servidor envía tramas `ping` RFC 6455 cada 15 segundos para mantener vivas las conexiones en Render.com.

### 2. Cambios de Tecnologías
- **Render.com Infrastructure-as-Code (`render.yaml`)**: Despliegue continuo conectado al repositorio `Svayneak/snake-arena-multiplayer`.
- **Servidor Unificado HTTP + WebSocket (`server/prod.js`)**: Combina el handler de Next.js con el servidor WebSocket RFC 6455 sobre un único puerto (`process.env.PORT`).
- **GitHub Git Data REST API (`scratch/push_github.js`)**: Publicación directa de blobs, trees y commits desde Node.js sin requerir el binario `git` en Windows.

### 3. Cambios de Código Plano
- Creado [`server/prod.js`](./server/prod.js) y [`render.yaml`](./render.yaml).
- Creado [`scratch/push_github.js`](./scratch/push_github.js).
- Modificado [`lib/network.ts`](./lib/network.ts) para soportar rutas `/ws` sobre `ws://` y `wss://`.
- Añadidas páginas [`app/spectator/page.tsx`](./app/spectator/page.tsx), [`app/status/page.tsx`](./app/status/page.tsx) y [`app/scores/page.tsx`](./app/scores/page.tsx).

---

## [v1.0.0] — 2026-10-17 — Lanzamiento Inicial: Motor Vectorial 360°, Bots IA y Relay LAN

### 1. Cambios de Comportamientos
- **Física continua de 360°**: Movimiento libre por ángulo en radianes con boost de velocidad (consumiendo longitud), partículas de colisión, power-ups y comidas especiales.
- **Tres modos de juego**: Individual (con Bots IA configurables), Multijugador Local (2 jugadores en teclado/mouse) y Multijugador en Red (hasta 4 jugadores por sala + espectadores).

### 2. Cambios de Tecnologías
- **Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS**.
- **HTML5 Canvas API (`requestAnimationFrame` con delta-time)**.
- **Servidor WebSocket RFC 6455 nativo en Node.js (`crypto` + `http.Server` upgrade)**.

### 3. Cambios de Código Plano
- Creados [`lib/types.ts`](./lib/types.ts), [`lib/engine.ts`](./lib/engine.ts), [`lib/sound.ts`](./lib/sound.ts), [`lib/storage.ts`](./lib/storage.ts) y [`lib/network.ts`](./lib/network.ts).
- Creados [`components/SnakeGame.tsx`](./components/SnakeGame.tsx), [`components/SpectatorView.tsx`](./components/SpectatorView.tsx) y [`components/Leaderboard.tsx`](./components/Leaderboard.tsx).
- Creado [`server/relay.js`](./server/relay.js) y [`run-lan.bat`](./run-lan.bat).
