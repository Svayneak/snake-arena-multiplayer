---
name: wrap-session
description: Cierra y documenta la sesión de trabajo actual generando logs de prompts con timestamps, resultados alcanzados, auditoría de errores (del agente y humanos) y registro de decisiones (decisionlog.md) en la carpeta 'performance and systems' del workspace, además de crear o actualizar la carpeta 'docs/', 'decisionlog.md' y 'changelog.md' (cambios a comportamientos, tecnologías y código plano) dentro del proyecto activo. Úsala cuando el usuario invoque /wrap-session o diga frases como 'cerramos la sesion', 'termina la sesion', 'acabamos por hoy', 'wrap session', o 'done for the day'.
---

# Skill: `/wrap-session` (Cierre, Decisiones, Changelog y Auditoría de Sesión)

Esta skill estandariza el cierre de cualquier sesión de ingeniería en el workspace **`Augus-agy`**, registrando métricas de rendimiento, trazabilidad de prompts, resultados técnicos, decisiones tomadas entre opciones propuestas por el agente (`decisionlog.md`), cambios a comportamientos/tecnologías/código plano por proyecto (`changelog.md`), fallos del agente, errores humanos de operación y documentación viva del proyecto (`docs/`).

---

## 🎯 Disparadores de Activación (Triggers)

Debes activar y ejecutar esta skill inmediatamente cuando el usuario escriba cualquiera de las siguientes expresiones:
- `/wrap-session`
- `"cerramos la sesion"` / `"cerramos la sesión"`
- `"termina la sesion"` / `"termina la sesión"`
- `"acabamos por hoy"`
- `"wrap session"`
- `"done for the day"`

*(Nota: Además del cierre de sesión, cada vez que durante un proceso el agente pregunte al usuario cómo proseguir dándole opciones, la decisión tomada debe registrarse en `decisionlog.md`, y todo cambio de comportamiento, tecnología o código plano en `changelog.md`).*

---

## 📂 Destinos de Almacenamiento Obligatorios

### 1. Carpeta Global de Rendimiento y Sistemas (`Augus-agy/performance and systems/`)
Ubicada en la raíz del workspace (`C:\Users\thehe\documents\Augus-agy\performance and systems` en Windows o `~/Augus-agy/performance and systems` en Linux).

En cada invocación se determina la fecha actual `[dia]` (formato `YYYY-MM-DD`, ej. `2026-10-17`) y el número secuencial de sesión del día `[n]` (`1`, `2`, `3`..., incrementando si ya existen archivos de ese mismo día).

Se deben generar o actualizar los siguientes archivos:

1. **`prompt-log[dia][n].md`** *(ej. `prompt-log[2026-10-17][1].md`)*
   - Lista cronológica completa de todos los prompts enviados por el usuario durante la sesión.
   - Incluye el **timestamp exacto** (`HH:MM:SS` / ISO-8601), el texto íntegro del prompt, el objetivo técnico interpretado y el modelo de IA activo en ese momento.

2. **`day-results[dia][n].md`** *(ej. `day-results[2026-10-17][1].md`)*
   - Resultados tangibles alcanzados por cada prompt del log (mapeo 1:1 contra `prompt-log[dia][n].md`).
   - Archivos creados o modificados, commits realizados, despliegues en producción, bases de datos aprovisionadas y pruebas ejecutadas.

3. **`error-log[dia][n].md`** *(ej. `error-log[2026-10-17][1].md`)*
   - Auditoría imparcial, técnica y detallada dividida en dos categorías:
     - **A. Errores del Agente (Agent Errors)**:
       - Asunciones falsas sobre el entorno (ej. binarios no instalados, rutas equivocadas).
       - Comandos bloqueados por el arnés de seguridad (`validate_command.js`) o fallos de sandbox.
       - Malas prácticas sugeridas (ej. pedir secretos por chat o sugerir menús GUI cuando se opera por CLI).
       - Causa raíz y corrección aplicada.
     - **B. Errores Humanos (Human Errors)**:
       - Pedir instrucciones y equivocarse al seguir los pasos (ej. introducir errores de sintaxis JSON al pegar tokens o configuraciones manualmente).
       - Copiar/pegar bloques incompletos, con numeración de líneas o de un entorno incompatible (GUI vs CLI).
       - Ignorar recomendaciones críticas sin fundamento o saltar pasos de configuración introduciendo fallos en los sistemas creados.
       - Impacto en el sistema y cómo fue mitigado o reparado.

4. **`decisionlog.md` y `decisionlog[dia][n].md`**
   - Registro estructurado de todas las ocasiones durante los procesos en que el **agente pregunta al usuario cómo proseguir y le presenta opciones**:
     - **ID y Timestamp de la decisión**.
     - **Contexto / Disyuntiva Técnica**: Qué problema o bifurcación motivó la consulta.
     - **Opciones Presentadas por el Agente**: Detalle de cada alternativa ofrecida (Opción 1, Opción 2, Opción 3...) con sus ventajas y compromisos.
     - **Decisión del Usuario**: Qué opción eligió el usuario (y cita del prompt).
     - **Impacto y Resultado**: Qué arquitectura, flujo o código se implementó como consecuencia.

---

### 2. Documentación, Decisiones y Changelog por Proyecto (`<proyecto>/` y `<proyecto>/docs/`)
En el subdirectorio del proyecto activo (por ejemplo `snake-next/`):

1. **`<proyecto>/decisionlog.md` y `<proyecto>/docs/decisionlog.md`**:
   - Copia viva del registro de decisiones técnicas y de producto tomadas para ese proyecto cuando el agente presentó opciones al usuario.

2. **`<proyecto>/changelog.md` y `<proyecto>/docs/changelog.md`**:
   - Registro cronológico y versionado por proyecto que documenta exhaustivamente todos los cambios realizados en tres dimensiones:
     - **A. Cambios de Comportamiento (`Comportamientos`)**: Reglas de negocio/juego, mecánicas de usuario, flujos de red/salas, experiencia visual, políticas del arnés de seguridad.
     - **B. Cambios de Tecnologías (`Tecnologías`)**: Frameworks, protocolos de red, plataformas cloud, bases de datos, servidores MCP, scripts de automatización multiplataforma.
     - **C. Cambios de Código Plano (`Código Plano`)**: Detalle archivo por archivo de módulos creados, refactorizados o corregidos (funciones, estructuras de datos, endpoints y scripts).

3. **Carpeta `<proyecto>/docs/`**:
   - **Si no existe**: Crear `<proyecto>/docs/` con la documentación completa del proyecto.
   - **Si ya existe**: Actualizar todos sus documentos reflejando el estado al cierre de la sesión:
     - `docs/README.md`: Índice general, estado actual y enlaces de producción.
     - `docs/ARQUITECTURA.md`: Diseño técnico de componentes, servidor, red y base de datos.
     - `docs/DESPLIEGUE_Y_ENTORNO.md`: Guía de despliegue cloud, variables de entorno y ejecución en Windows/Linux.
     - `docs/ARNES_Y_SESIONES.md`: Inventario del arnés `.agents/`, modelos de IA empleados e historial de sesiones.
     - `docs/decisionlog.md`: Bitácora de decisiones tomadas ante opciones del agente.
     - `docs/changelog.md`: Bitácora de cambios a comportamientos, tecnologías y código plano.

---

## ⚙️ Procedimiento Paso a Paso al Ejecutar `/wrap-session`

1. **Calcular `[dia]` y `[n]`**:
   - Ejecutar `node .agents/skills/wrap-session/scripts/wrap_helper.js` para obtener las rutas exactas en `performance and systems/`.
2. **Redactar `prompt-log[dia][n].md`, `day-results[dia][n].md` y `error-log[dia][n].md`**:
   - Documentar todos los prompts con timestamps, logros por prompt, errores del agente y errores humanos.
3. **Crear o Actualizar `decisionlog.md` (`performance and systems/` y `<proyecto>/docs/`)**:
   - Registrar cada punto de decisión donde el agente ofreció opciones al usuario y la alternativa elegida.
4. **Crear o Actualizar `changelog.md` (`<proyecto>/changelog.md` y `<proyecto>/docs/changelog.md`)**:
   - Documentar los cambios clasificados explícitamente en **Comportamientos**, **Tecnologías** y **Código Plano**.
5. **Crear o Actualizar `<proyecto>/docs/` y `AGENTS.md`**:
   - Mantener la documentación y el estado del workspace sincronizados.
6. **Confirmar al Usuario**:
   - Entregar un resumen ejecutivo con enlaces clicables a todos los archivos generados.
