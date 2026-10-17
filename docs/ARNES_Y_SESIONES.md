# Arnés del Entorno Agéntico, Skill `/wrap-session` y Modelos Utilizados

Este documento detalla la infraestructura de seguridad, automatización y telemetría de sesiones diseñada en el workspace `Augus-agy` y distribuida junto al repositorio en la carpeta [`.agents/`](../.agents/).

---

## 1. Componentes del Arnés (`.agents/`)

| Archivo | Propósito |
|---|---|
| [`.agents/AGENTS.md`](../.agents/AGENTS.md) | Instrucciones maestras del espacio de trabajo, estado del proyecto y disparadores de skills. |
| [`.agents/hooks.json`](../.agents/hooks.json) | Interceptores `PreToolUse` (`run_command`, `view_file`) y `PostToolUse` (`run_command`). |
| [`.agents/rules/security.md`](../.agents/rules/security.md) | Política Zero-Trust: aislamiento por subdirectorios, carpetas personales prohibidas y protección contra borrado destructivo. |
| [`.agents/scripts/validate_command.js`](../.agents/scripts/validate_command.js) | Validador Node.js que inspecciona cada comando y lectura de archivo antes de su ejecución, devolviendo `allow`, `ask` o `deny`. |
| [`.agents/scripts/audit_logger.js`](../.agents/scripts/audit_logger.js) | Logger post-ejecución que registra cada comando ejecutado en `.agents/audit.log` con timestamp ISO-8601. |
| [`.agents/mcp.json.example`](../.agents/mcp.json.example) | Plantilla sanitizada para conectar los servidores MCP de **GitHub** (`api.githubcopilot.com`) y **Supabase** (`mcp.supabase.com`, proyecto `naacgdwtglvcumaccime`). |
| [`.agents/skills/wrap-session/SKILL.md`](../.agents/skills/wrap-session/SKILL.md) | Skill de cierre de sesión (`/wrap-session`) que genera logs de prompts, resultados, errores (del agente y humanos) y actualiza la carpeta `docs/`. |
| [`.agents/skills/wrap-session/scripts/wrap_helper.js`](../.agents/skills/wrap-session/scripts/wrap_helper.js) | Script CLI que calcula el índice incremental `[dia][n]` y verifica los archivos en `performance and systems/`. |

---

## 2. Skill `/wrap-session` y Auditoría `performance and systems`

### Disparadores Soportados
La skill se activa invocando `/wrap-session` o mediante cualquiera de las siguientes frases:
- `"cerramos la sesion"` / `"cerramos la sesión"`
- `"termina la sesion"` / `"termina la sesión"`
- `"acabamos por hoy"`
- `"wrap session"`
- `"done for the day"`

### Archivos Generados en `Augus-agy/performance and systems/`
En cada cierre de sesión se crean 3 reportes con nomenclatura `[YYYY-MM-DD][n]`:
1. **`prompt-log[dia][n].md`**: Listado cronológico de todos los prompts del usuario con su timestamp exacto (`ISO-8601` y hora local).
2. **`day-results[dia][n].md`**: Resultados técnicos tangibles alcanzados por cada prompt (archivos creados/modificados, despliegues, commits y verificaciones).
3. **`error-log[dia][n].md`**: Auditoría dividida en dos categorías:
   - **Errores del Agente**: Comandos bloqueados por el arnés o sandbox, errores de sintaxis en edición, asunciones sobre herramientas instaladas (`git` CLI ausente en Windows), o intentos de lectura sobre archivos de configuración con secretos.
   - **Errores Humanos**: Pedir instrucciones y equivocarse al seguir los pasos (p. ej. pegar un token o clave en el lugar o formato incorrecto en archivos JSON) o ignorar recomendaciones críticas sin fundamento introduciendo errores en los sistemas creados.

---

## 3. Modelos de IA y Registro de Sesiones

| Sesión ID | Fecha | Modelo Activo | Hitos Principales |
|---|---|---|---|
| `a56c9828-ae0b-4397-971b-f46c8438b53f` | 2026-10-17 | **Gemini (Medium)** (`Gemini 4 Argon (Medium)`) | Creación de `snake-next`, motor 360°, servidor WebSocket RFC 6455 multi-sala, publicación en GitHub, despliegue en Render.com, integración permanente con Supabase PostgreSQL (RLS + MCP), soporte Linux (`run-linux.sh`) y creación de la skill `/wrap-session` + `docs/`. |
| `42fb46fa-1b4d-4de8-a67b-46b94c7143e8` | Previa | **Gemini (Medium)** (`Gemini 4 Argon (Medium)`) | Configuración inicial del arnés de seguridad desacoplado `.agents/` en el workspace `Augus-agy`. |
| `0408dfeb-c192-4849-8585-d413b0852ab4` | Previa | **Gemini (Medium)** (`Gemini 4 Argon (Medium)`) | Exploración inicial y pruebas del entorno Antigravity. |
