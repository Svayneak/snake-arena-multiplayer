---
name: wrap-session
description: Cierra y documenta la sesión de trabajo actual generando logs de prompts con timestamps, resultados alcanzados, auditoría de errores del agente y errores humanos en la carpeta 'performance and systems' del workspace, y creando o actualizando la carpeta 'docs/' dentro del proyecto activo. Úsala cuando el usuario invoque /wrap-session o diga frases como 'cerramos la sesion', 'termina la sesion', 'acabamos por hoy', 'wrap session', o 'done for the day'.
---

# Skill: `/wrap-session` (Cierre y Auditoría de Sesión)

Esta skill estandariza el cierre de cualquier sesión de ingeniería en el workspace **`Augus-agy`**, registrando métricas de rendimiento, trazabilidad de prompts, resultados técnicos, fallos del agente, errores humanos de operación y documentación viva del proyecto.

---

## 🎯 Disparadores de Activación (Triggers)

Debes activar y ejecutar esta skill inmediatamente cuando el usuario escriba cualquiera de las siguientes expresiones:
- `/wrap-session`
- `"cerramos la sesion"` / `"cerramos la sesión"`
- `"termina la sesion"` / `"termina la sesión"`
- `"acabamos por hoy"`
- `"wrap session"`
- `"done for the day"`

---

## 📂 Destinos de Almacenamiento Obligatorios

### 1. Carpeta Global de Rendimiento y Sistemas (`Augus-agy/performance and systems/`)
Ubicada en la raíz del workspace (`C:\Users\thehe\documents\Augus-agy\performance and systems` en Windows o `~/Augus-agy/performance and systems` en Linux).

En cada invocación se determina la fecha actual `[dia]` (formato `YYYY-MM-DD`, ej. `2026-10-17`) y el número secuencial de sesión del día `[n]` (`1`, `2`, `3`..., incrementando si ya existen archivos de ese mismo día).

Se deben generar **tres archivos** (además de consolidar el resumen):

1. **`prompt-log[dia][n].md`** *(ej. `prompt-log[2026-10-17][1].md`)*
   - Lista cronológica completa de todos los prompts enviados por el usuario durante la sesión.
   - Incluye el **timestamp exacto** (`HH:MM:SS` / ISO-8601), el texto íntegro del prompt, el objetivo técnico interpretado y el modelo de IA activo en ese momento.

2. **`day-results[dia][n].md`** *(ej. `day-results[2026-10-17][1].md`)*
   - Resultados tangibles alcanzados por cada prompt del log (mapeo 1:1 contra `prompt-log[dia][n].md`).
   - Archivos creados o modificados, commits realizados, despliegues en producción, bases de datos aprovisionadas y pruebas ejecutadas.
   - Incluye también las secciones completas de **Log de Errores del Agente** y **Log de Errores Humanos** para tener una vista integral de la sesión.

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

---

### 2. Documentación del Proyecto Activo (`<proyecto>/docs/`)
Junto con el cierre de la sesión, se debe verificar si existe la carpeta **`docs/`** dentro del subdirectorio del proyecto trabajado (por ejemplo `snake-next/docs/`):
- **Si no existe**: Crear la carpeta `<proyecto>/docs/` y generar la documentación estructurada del proyecto.
- **Si ya existe**: Actualizar los documentos dentro de `<proyecto>/docs/` reflejando todos los cambios, nuevas funciones, arquitectura, despliegue y estado al cierre de la sesión.

 Estructura mínima requerida dentro de `<proyecto>/docs/`:
- `docs/README.md`: Índice general, estado actual y enlaces de producción.
- `docs/ARQUITECTURA.md`: Diseño técnico de componentes, servidor, red y base de datos.
- `docs/DESPLIEGUE_Y_ENTORNO.md`: Guía de despliegue cloud, variables de entorno y ejecución en Windows/Linux.
- `docs/ARNES_Y_SESIONES.md`: Inventario del arnés `.agents/`, modelos de IA empleados e historial de sesiones.

---

## ⚙️ Procedimiento Paso a Paso al Ejecutar `/wrap-session`

1. **Calcular `[dia]` y `[n]`**:
   - Puedes ejecutar `node .agents/skills/wrap-session/scripts/wrap_helper.js` o listar `performance and systems/` para identificar el siguiente índice `[n]` disponible del día actual.
2. **Redactar `prompt-log[dia][n].md`**:
   - Recopilar todos los `<USER_REQUEST>` y sus `<ADDITIONAL_METADATA>` (timestamps y cambios de modelo) de la conversación actual.
3. **Redactar `day-results[dia][n].md` y `error-log[dia][n].md`**:
   - Documentar con honestidad técnica los logros por cada prompt, los errores cometidos por el agente y los errores humanos ocurridos en la sesión.
4. **Crear o Actualizar `<proyecto>/docs/`**:
   - Sincronizar la documentación técnica en la carpeta `docs/` del subproyecto activo.
5. **Actualizar `AGENTS.md` y `.agents/scripts/session_resume.js`**:
   - Dejar el contexto de continuación listo para la siguiente sesión.
6. **Confirmar al Usuario**:
   - Entregar un resumen ejecutivo con enlaces clicables a todos los archivos generados en `performance and systems/` y `<proyecto>/docs/`.
