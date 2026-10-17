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

