# 🛡️ Arnés de Seguridad del Entorno (`.agents/`) y Registro de Modelos / Sesiones

Este documento detalla la arquitectura completa del **Arnés de Seguridad Desacoplado (`.agents/`)** utilizado durante la construcción del proyecto en **Antigravity (`agy` CLI)**, las instrucciones para restaurarlo al migrar a **Linux**, y el registro cronológico de las sesiones y modelos de IA empleados.

---

## 1. 🤖 Modelos de IA y Registro de Sesiones de Construcción

### Plataforma de Desarrollo Agéntico
- **Entorno**: Google DeepMind **Antigravity (`agy` CLI)** sobre Windows (migrando a Linux).
- **ID de Conversación de Despliegue Final**: `a56c9828-ae0b-4397-971b-f46c8438b53f`

### Modelos Registrados en las Sesiones
Durante la construcción y despliegue del proyecto quedaron registrados los siguientes ajustes de modelo en los metadatos de sesión (`<USER_SETTINGS_CHANGE>`):

| Etapa / Sesión | Fecha Registrada | Configuración de Modelo | Rol Principal en la Construcción |
| :--- | :--- | :--- | :--- |
| **Sesiones Iniciales (Fases 1 a 5)** | `2026-10-09` al `2026-10-16` | Configuración por defecto de Antigravity (`Model Selection: None` / Default Agent Model) | Construcción del motor continuo (*Zero-Jump*, *Tail Inception*), port a Next.js 14 App Router, audio 8-bit, servidor WebSocket RFC 6455 (`server/relay.js`), Sala de Espectadores 2x3, soporte móvil táctil, servidor unificado (`server/prod.js`) y creación del arnés de seguridad `.agents/`. |
| **Sesión de Publicación Cloud & Persistencia (Fase 6)** | `2026-10-17T00:41:42-03:00` | **Gemini (Medium)** *(cambio explícito de sesión: `None` → `Gemini 4 Argon (Medium)`)* | Publicación automatizada a GitHub vía Git Data API (`Svayneak/snake-arena-multiplayer`), despliegue en vivo en **Render.com**, sincronización en tiempo real del **Marcador de Sala en Vivo** entre PC y móvil, configuración del MCP de **Supabase** y provisionamiento automático de PostgreSQL (`public.high_scores` con políticas RLS). |

### Cronología Detallada de Construcción por Fases

1. **Fase 1 (`2026-10-09` — Motor Físico Continuo `v1.0.0`)**:
   - Diseño de `lib/engine.ts` con seguimiento continuo de puntero, *Zero-Jump Armed Spawning*, *Tail Inception*, escudo de nacimiento de 1.5s y guardia anti-teletransporte (>65px/frame).
2. **Fase 2 (`2026-10-10` — Port a Next.js 14 & Telemetría `v1.1.0`)**:
   - Migración a Next.js 14 App Router, TypeScript y Tailwind CSS.
   - Creación de `lib/audio.ts` (Web Audio API 8-bit), `lib/tracker.ts` y endpoint `app/api/telemetry/route.ts` con persistencia en disco.
3. **Fase 3 (`2026-10-11` — Estabilización 60 FPS & Relay Multijugador `v1.2.0` / `v1.3.0`)**:
   - Throttling de estado React de la Manzana Dorada de 60Hz a 1Hz y contenedor externo fijo (`h-11`) con **Cero Layout Shift**.
   - Implementación desde cero del servidor WebSocket RFC 6455 sin dependencias externas (`server/relay.js`), simulación de 5 Bots IA y Sala de Espectadores (`app/spectator/page.tsx`, `components/SpectatorGrid.tsx`, `components/SpectatorMiniArena.tsx`).
4. **Fase 4 (`2026-10-15` — Arnés de Seguridad `.agents/`)**:
   - Creación del arnés de seguridad desacoplado con interceptación `PreToolUse` y `SessionStart` (`hooks.json`, `rules/security.md`, `scripts/validate_command.js`, `scripts/session_resume.js` y batería de 30 pruebas automatizadas en `scripts/test_harness.js`).
5. **Fase 5 (`2026-10-16` — Controles Táctiles Móviles, Multi-Sala con Tokens y Producción Unificada `v1.4.0` / `v1.5.0`)**:
   - Detección automática de pantallas táctiles (`lib/device.ts`, `lib/touchTracker.ts`, `components/TouchControls.tsx`).
   - Aislamiento dinámico multi-sala (`RoomManager`) y tokens criptográficos por jugador (`tok_...`) para reconexión.
   - Creación de `server/prod.js` y `render.yaml` para servir Next.js + WebSocket en un único puerto dinámico con respuesta automática Ping/Pong (`0x8A`).
6. **Fase 6 (`2026-10-17` — GitHub + Render Live + Marcador Multijugador en Vivo + Supabase `v2.0.0`)**:
   - Subida del repositorio a [https://github.com/Svayneak/snake-arena-multiplayer](https://github.com/Svayneak/snake-arena-multiplayer) y despliegue activo en [https://snake-arena-multiplayer.onrender.com](https://snake-arena-multiplayer.onrender.com).
   - Retransmisión de `ARENA_SNAPSHOT` a todos los jugadores conectados y nuevo **Marcador en Vivo de la Sala** en `components/SnakeGame.tsx`.
   - Provisionamiento de la tabla `public.high_scores` con RLS en **Supabase** (`https://naacgdwtglvcumaccime.supabase.co`) y sincronización híbrida (Supabase Cloud + Disco + WebSocket `HIGH_SCORES_SYNC`).

---

## 2. 🛡️ Inventario Completo del Arnés del Entorno (`.agents/`)

El arnés de seguridad y continuidad de sesión está compuesto por los siguientes archivos (incluidos de forma portable y sanitizada dentro de `.agents/` en este repositorio):

```text
.agents/
├── hooks.json                  # Interceptores de ciclo de vida (SessionStart y PreToolUse)
├── mcp.example.json            # Plantilla de servidores MCP (GitHub y Supabase, sin tokens secretos)
├── index/
│   └── .gitkeep                # Directorio reservado para índices locales fuera de Git
├── rules/
│   └── security.md             # Reglas de aislamiento de carpetas, entornos virtuales y límites
└── scripts/
    ├── session_resume.js       # Hook SessionStart: inyecta contexto y estado actual al iniciar sesión
    ├── validate_command.js     # Hook PreToolUse: firewall de comandos y protector de rutas en view_file
    └── test_harness.js         # Suite de 30 tests automatizados que verifican el validador
```

### Detalle de Cada Componente del Arnés

#### A. `AGENTS.md` (Raíz del Workspace)
Define las normas globales que el agente carga automáticamente en su prompt de sistema:
- Referencia obligatoria a `.agents/rules/security.md`.
- Aviso de interceptación activa mediante `.agents/hooks.json`.
- Estado vivo de la tarea en curso y URLs de producción (GitHub, Render, Supabase).

#### B. `.agents/hooks.json`
Configura el hook **`project-security-guard`** en dos eventos del ciclo de vida de Antigravity:
1. **`SessionStart`** (`matcher: ".*"`): Ejecuta `node .agents/scripts/session_resume.js` (timeout 5s) para inyectar automáticamente el estado del proyecto (`additionalContext`) al abrir o reanudar una sesión.
2. **`PreToolUse`** (`matcher: "run_command|view_file"`): Ejecuta `node .agents/scripts/validate_command.js` (timeout 10s) antes de cualquier comando de terminal o lectura de archivo.

#### C. `.agents/scripts/validate_command.js` (Firewall Fail-Closed)
Lee el payload JSON de la herramienta por `stdin` y emite `{ decision: "allow" | "deny" | "ask", reason: "..." }` por `stdout`:
1. **Protección de Carpetas Personales (`PERSONAL_FOLDER_PATTERNS`)**:
   - Bloquea (`deny`) cualquier acceso, listado o lectura a `Fotos Familia` y `videos grandes de mi celu`, incluyendo nombres cortos DOS 8.3 (`FOTOSF~1`, `VIDEOG~1`) y comodines (`*Familia*`, `*celu*`).
2. **Protección de Rutas Sensibles del Sistema y Credenciales (`SENSITIVE_SYSTEM_PATHS`)**:
   - Bloquea (`deny`) el acceso a directorios críticos del sistema (`C:\Windows`, `/etc/shadow`, `/root`) y almacenes de credenciales (`~/.ssh`, `~/.aws`, `~/.gemini`).
3. **Neutralización de Comandos Destructivos (`FORBIDDEN_COMMANDS`)**:
   - Bloquea (`deny`) `format`, `diskpart`, `bcdedit`, `takeown`, `icacls`, `reg add/delete`, `rmdir /s`, `del /s /f`, `rm -rf /`, `nc -e`, `Set-ExecutionPolicy Unrestricted`.
4. **Neutralización de Técnicas de Evasión (`EVASION_PATTERNS`)**:
   - Bloquea (`deny`) comandos codificados en Base64 (`powershell -enc` / `-EncodedCommand`) y ejecución arbitraria inline (`node -e`, `python -c`, `perl -e`, `ruby -e`).
5. **División de Comandos Encadenados (`splitCommand`)**:
   - Divide cadenas con `;`, `&&`, `||`, `|`, `&` y saltos de línea, evaluando **cada segmento individualmente** bajo política *Fail-Closed*.
6. **Lista Blanca de Desarrollo (`SAFE_DEV_PATTERNS` — Principio de Menor Privilegio)**:
   - Permite automáticamente (`allow`) comandos seguros de desarrollo (`npm`, `pnpm`, `yarn`, `node script.js`, `npx`, `python script.py`, `pytest`, `cargo`, `git`, `ls`, `dir`, `grep`, etc.).
   - Cualquier comando no reconocido o de red (`curl`, `wget`, `Invoke-WebRequest`) pasa a confirmación manual del usuario (`decision: "ask"`).

#### D. `.agents/scripts/test_harness.js`
Suite de verificación automatizada que ejecuta 30 vectores de prueba sobre `validate_command.js` cubriendo las categorías `a)` a `h)` (comandos legítimos, destructivos, encadenamiento, Base64, manipulación de `Cwd`, lectura de archivos protegidos con `view_file` y comandos de red).
- Se ejecuta con:
  ```bash
  node .agents/scripts/test_harness.js
  ```

#### E. `.agents/mcp.example.json` → `.agents/mcp.json`
Configura los servidores MCP reutilizables para todos los proyectos de la carpeta:
- **`github`**: `@modelcontextprotocol/server-github` con `GITHUB_PERSONAL_ACCESS_TOKEN`.
- **`supabase`**: `@supabase/mcp-server-supabase@latest` apuntando al proyecto `naacgdwtglvcumaccime` (`https://naacgdwtglvcumaccime.supabase.co`) con `SUPABASE_ACCESS_TOKEN` y `SUPABASE_ANON_KEY`.

---

## 3. 🐧 Guía Paso a Paso para Retomar en Linux

Cuando clones el repositorio en tu entorno Linux, sigue estos pasos para restaurar tanto el proyecto como el arnés completo:

### Paso 1: Clonar el repositorio
```bash
mkdir -p ~/Augus-agy
cd ~/Augus-agy
git clone https://github.com/Svayneak/snake-arena-multiplayer.git snake-next
cd snake-next
```

### Paso 2: Restaurar el Arnés `.agents/` en la raíz del Workspace (Opcional si usas carpeta contenedora)
El repositorio ya incluye la carpeta `.agents/` y `AGENTS.md` listos para funcionar. Si deseas que el arnés proteja toda la carpeta superior `~/Augus-agy`:
```bash
cp -r .agents ~/Augus-agy/.agents
cp AGENTS.md ~/Augus-agy/AGENTS.md
cp .agents/mcp.example.json ~/Augus-agy/.agents/mcp.json
```
Luego edita `~/Augus-agy/.agents/mcp.json` y coloca tus tokens privados (`GITHUB_PERSONAL_ACCESS_TOKEN` y `SUPABASE_ACCESS_TOKEN`).

### Paso 3: Verificar el Arnés de Seguridad en Linux
```bash
node .agents/scripts/test_harness.js
```
Verás los **30/30 tests aprobados (`TODO APROBADO 100% OK`)**.

### Paso 4: Ejecutar `snake-next` en Linux
```bash
chmod +x run-linux.sh
./run-linux.sh          # Levanta Relay (:3500) + Next.js Dev (:3000)
# o para probar el servidor unificado idéntico a Render:
./run-linux.sh --prod   # Compila y levanta Next.js + WebSocket en :3000
```
