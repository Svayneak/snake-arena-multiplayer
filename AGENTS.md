# Normas del Workspace (Augus-agy)

Este espacio de trabajo cuenta con un arnés de seguridad desacoplado gestionado a través de `.agents/`.

- **Reglas de Seguridad y Límites**: Consulta y sigue [.agents/rules/security.md](file:///.agents/rules/security.md).
- **Hooks de Seguridad Activos**: Todas las llamadas a `run_command` son interceptadas por [.agents/hooks.json](file:///.agents/hooks.json) para prevenir la corrupción de datos y aislar la ejecución.
- **Carpetas de Desarrollo**: Trabaja siempre dentro del subdirectorio correspondiente a cada proyecto específico.
- **Carpetas Personales Protegidas**: No interactuar con `Fotos Familia` ni `videos grandes de mi celu`.

## Tarea en Curso (Continuación de Sesión)
- **Objetivo Completado**: `snake-next` publicado en GitHub, desplegado en **Render.com** para multijugador en vivo y conectado con **Supabase** para persistencia permanente de récords.
- **Estado actual**:
  - **GitHub**: `https://github.com/Svayneak/snake-arena-multiplayer` (rama `main`)
  - **Render (Live)**: `https://snake-arena-multiplayer.onrender.com`
  - **Sala de Espectadores**: `https://snake-arena-multiplayer.onrender.com/spectator`
  - **Estado del Servidor**: `https://snake-arena-multiplayer.onrender.com/status`
- **Base de Datos (Supabase)**: Proyecto `naacgdwtglvcumaccime` (`public.high_scores` con RLS activo) configurado en [`.agents/mcp.json`](file:///.agents/mcp.json) para reutilización en el workspace.

## Skill de Cierre y Auditoría de Sesión (`/wrap-session`)
- **Definición**: [`.agents/skills/wrap-session/SKILL.md`](file:///.agents/skills/wrap-session/SKILL.md)
- **Disparadores**: `/wrap-session`, `"cerramos la sesion"`, `"termina la sesion"`, `"acabamos por hoy"`, `"wrap session"`, `"done for the day"`.
- **Acciones Obligatorias**:
  1. Generar en `Augus-agy/performance and systems/` los archivos `prompt-log[dia][n].md`, `day-results[dia][n].md`, `error-log[dia][n].md` y `decisionlog.md` / `decisionlog[dia][n].md` (documentando prompts con timestamps, resultados por prompt, errores del agente, errores humanos y decisiones tomadas cuando el agente ofrece opciones).
  2. Registrar en `decisionlog.md` (tanto en `performance and systems/` como en el proyecto) cada decisión tomada cuando el agente pregunta cómo proseguir y ofrece opciones.
  3. Registrar en `changelog.md` (dentro del proyecto y en `docs/changelog.md`) todos los cambios realizados a **comportamientos**, **tecnologías** o **código plano** por proyecto.
  4. Crear o actualizar la carpeta `docs/` dentro del subdirectorio del proyecto activo con la documentación técnica completa.
