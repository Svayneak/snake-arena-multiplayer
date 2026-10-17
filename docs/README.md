# Documentación del Proyecto — Snake Arena Multiplayer (`snake-next`)

Bienvenido a la documentación oficial de **Snake Arena Multiplayer**, mantenida y actualizada automáticamente mediante la skill [`/wrap-session`](file:///C:/Users/thehe/documents/Augus-agy/.agents/skills/wrap-session/SKILL.md).

---

## 🌐 Enlaces en Producción (Live)

| Recurso | URL | Estado |
|---|---|---|
| **Repositorio GitHub** | `https://github.com/Svayneak/snake-arena-multiplayer` | Activo (`main`) |
| **Juego en Vivo (Render.com)** | `https://snake-arena-multiplayer.onrender.com` | Online |
| **Sala de Espectadores (`/spectator`)** | `https://snake-arena-multiplayer.onrender.com/spectator` | Online |
| **Monitor de Servidor (`/status`)** | `https://snake-arena-multiplayer.onrender.com/status` | Online |
| **Tabla de Récords (`/scores`)** | `https://snake-arena-multiplayer.onrender.com/scores` | Online |
| **Base de Datos Cloud (Supabase)** | `https://naacgdwtglvcumaccime.supabase.co` (`public.high_scores`) | Activo (RLS) |

---

## 📚 Índice de Documentación (`docs/`)

1. [**Arquitectura del Sistema (`ARQUITECTURA.md`)**](./ARQUITECTURA.md)
   - Motor de física continua de 360° (`requestAnimationFrame` + delta-time).
   - Servidor WebSocket RFC 6455 nativo con soporte multi-sala, *tick-rate* de 30Hz y reconexión.
   - Persistencia híbrida en 3 capas (**Supabase PostgreSQL** + **JSON Server Store** + **`localStorage`**).
2. [**Despliegue y Entorno Linux/Windows (`DESPLIEGUE_Y_ENTORNO.md`)**](./DESPLIEGUE_Y_ENTORNO.md)
   - Guía paso a paso para continuar el desarrollo en **Linux** (`./run-linux.sh`) o **Windows** (`run-lan.bat`).
   - Variables de entorno, configuración de Render.com (`render.yaml`) y migración SQL de Supabase.
3. [**Arnés Agéntico, Modelos y Sesiones (`ARNES_Y_SESIONES.md`)**](./ARNES_Y_SESIONES.md)
   - Detalle del arnés de seguridad `.agents/` (`hooks.json`, `validate_command.js`, `security.md`, `mcp.json.example`).
   - Documentación de la skill `/wrap-session` y el sistema de auditoría `performance and systems/`.
   - Registro histórico de sesiones y modelos de IA utilizados (`Gemini 4 Argon (Medium)`).
4. [**Bitácora de Decisiones (`decisionlog.md`)**](./decisionlog.md)
   - Registro de todas las decisiones tomadas cuando el agente consultó cómo proseguir y presentó opciones al usuario.
5. [**Registro de Cambios (`changelog.md`)**](./changelog.md)
   - Historial detallado de cambios realizados a **comportamientos**, **tecnologías** y **código plano** en el proyecto.
