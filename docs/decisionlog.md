# Bitácora de Decisiones del Proyecto (`decisionlog.md`) — `snake-next`

> Registro oficial de todas las decisiones de arquitectura, producto, seguridad y despliegue tomadas por el usuario cuando el agente presentó opciones durante la construcción de **Snake Arena Multiplayer (`snake-next`)**.

---

## Resumen de Decisiones

| ID | Fecha / Hora | Disyuntiva / Consulta del Agente | Opciones Presentadas | Decisión del Usuario | Resultado / Impacto |
|---|---|---|---|---|---|
| **DEC-001** | `2026-10-17 03:11` | Elección de stack para el juego Snake | **A)** HTML5 Canvas Vanilla<br>**B)** Next.js 14 + TypeScript + Tailwind + Canvas 60fps | **Opción B (Next.js 14 + TS)** | Creación de `snake-next/` con arquitectura modular y rutas API integradas. |
| **DEC-002** | `2026-10-17 03:42` | Modelo de movimiento y multijugador | **A)** Cuadrícula ortogonal clásica (1P)<br>**B)** Física vectorial continua 360° + Bots IA + Local 2P + LAN/Internet WS + Espectadores | **Opción B (360° + Multijugador completo)** | Motor `lib/engine.ts` vectorial y servidor `server/relay.js` RFC 6455 a 30Hz. |
| **DEC-003** | `2026-10-17 04:42` | Publicación en GitHub sin binario `git` en Windows | **1)** Instalar Git manualmente<br>**2)** Configurar MCP GitHub + script Node.js contra GitHub Git Data REST API | **Opción 2 (API REST + MCP)** | Creación de `scratch/push_github.js` y publicación directa en `Svayneak/snake-arena-multiplayer`. |
| **DEC-004** | `2026-10-17 05:10` | Hosting Cloud con soporte WebSocket (`wss://`) | **1)** Render.com con servidor unificado (`server/prod.js` + `render.yaml`)<br>**2)** Frontend y Backend separados | **Opción 1 (Render.com unificado)** | Despliegue en vivo en `https://snake-arena-multiplayer.onrender.com`. |
| **DEC-005** | `2026-10-17 05:34` | Persistencia permanente de récords en la nube | **1)** Conectar Supabase PostgreSQL (`public.high_scores`)<br>**2)** Mantener solo JSON efímero en Render + `localStorage` | **Opción 1 (Supabase PostgreSQL)** | Aprovisionamiento de `public.high_scores` con RLS en el proyecto `naacgdwtglvcumaccime`. |
| **DEC-006** | `2026-10-17 05:56` | Configuración segura del token MCP de Supabase en CLI | **A)** Flujo GUI OAuth (`serverUrl`)<br>**B)** Servidor MCP por `stdio` en `.agents/mcp.json` editando el token localmente sin pegarlo en el chat | **Opción B (Edición local en `.agents/mcp.json`)** | Protección del token privado `sbp_...` y generación de `.agents/mcp.example.json` sanitizado. |

---

## Detalle de cada Decisión

### DEC-001 — Elección de Stack y Arquitectura para el Juego Snake
- **Opciones evaluadas**:
  - *Opción A*: HTML5 Canvas + JS Vanilla sin servidor.
  - *Opción B*: Next.js 14 (App Router) + TypeScript + Tailwind CSS.
- **Elección**: **Opción B** (`"ok hagamoslo en nextjs, crea una carpeta para el proyecto y documenta el progreso"`).
- **Impacto**: Permitió integrar posteriormente páginas dedicadas (`/spectator`, `/status`, `/scores`) y un servidor híbrido Node.js + Next.js.

### DEC-002 — Motor Continuo de 360° y Multijugador Multi-Sala
- **Opciones evaluadas**:
  - *Opción A*: Movimiento por celdas clásico de 4 direcciones.
  - *Opción B*: Física vectorial continua de 360°, bots IA, multijugador local y servidor WebSocket RFC 6455 multi-sala con espectadores.
- **Elección**: **Opción B**.
- **Impacto**: Se implementó `lib/engine.ts`, `lib/network.ts` y `server/relay.js`.

### DEC-003 — Publicación en GitHub mediante Git Data REST API
- **Opciones evaluadas**:
  - *Opción 1*: Instalar Git for Windows manualmente.
  - *Opción 2*: Usar un script Node.js (`scratch/push_github.js`) contra la API REST de GitHub junto con el servidor MCP de GitHub.
- **Elección**: **Opción 2**.
- **Impacto**: Subida directa de commits y árboles Git a `https://github.com/Svayneak/snake-arena-multiplayer` sin depender de herramientas externas en el `PATH`.

### DEC-004 — Despliegue en Vivo en Render.com (Servidor HTTP + WS Unificado)
- **Opciones evaluadas**:
  - *Opción 1*: Servidor Node.js unificado (`server/prod.js`) desplegado en Render.com mediante `render.yaml`.
  - *Opción 2*: Despliegue separado de frontend y servidor de sockets.
- **Elección**: **Opción 1**.
- **Impacto**: Soportó WebSockets seguros (`wss://`) sobre el mismo puerto `PORT` expuesto por Render.

### DEC-005 — Persistencia Permanente con Supabase PostgreSQL
- **Opciones evaluadas**:
  - *Opción 1*: Conectar **Supabase PostgreSQL** para que los récords sean permanentes aunque Render reinicie el contenedor.
  - *Opción 2*: Conservar únicamente el almacenamiento JSON local del contenedor + `localStorage`.
- **Elección**: **Opción 1** (`"vamos con la primera, si para que los puntajes sean permanentes hace falta supabase vamos con esa"`).
- **Impacto**: Se creó la tabla `public.high_scores` con políticas RLS y se actualizó `/api/scores` para usar Supabase como fuente primaria de verdad.

### DEC-006 — Gestión Segura de Credenciales en `.agents/mcp.json`
- **Opciones evaluadas**:
  - *Opción A*: Pegar el token en el chat.
  - *Opción B*: Editar directamente `.agents/mcp.json` localmente siguiendo una guía de líneas sin exponer el token en la conversación.
- **Elección**: **Opción B** (`"es una practica pobre pegar el token aqui dime como lo pego en el archi mcp"`).
- **Impacto**: Se preservó la privacidad del token `sbp_...` y se añadió validación sin impresión de secretos.
