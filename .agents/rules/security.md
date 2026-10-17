# Reglas de Seguridad y Aislamiento del Entorno

Este proyecto opera bajo un arnés de ejecución seguro y desacoplado. Todo agente o subagente debe seguir estrictamente estas directivas:

## 1. Delimitación del Espacio de Trabajo
- Las tareas de desarrollo deben circunscribirse a sus subcarpetas de proyecto específicas (por ejemplo `snake-game`, `snake-next` o subdirectorios de proyectos creados para la tarea).
- **Prohibición de acceso a carpetas personales**: Queda estrictamente prohibido leer, listar, modificar o eliminar contenido de carpetas personales del host (como `Fotos Familia`, `videos grandes de mi celu`).
- Queda prohibido escribir o modificar archivos en el directorio del sistema de Windows (`C:\Windows`), llaves SSH (`~/.ssh`), configuraciones de cloud (`~/.aws`) o configuraciones globales del programa Antigravity (`~/.gemini/antigravity-cli/settings.json`).

## 2. Entornos y Dependencias Herméticas
- **Python**: Siempre utilizar entornos virtuales locales aislados (`.venv`) creados dentro de la subcarpeta del proyecto. Nunca instalar dependencias globales con `pip`.
- **Node.js**: Las dependencias deben instalarse con `package-lock.json` o `pnpm-lock.yaml` dentro del subproyecto. Nunca usar instalaciones globales `-g`.
- **Compilación y Tests**: Toda ejecución de tests o builds debe ejecutarse con el directorio de trabajo (`Cwd`) fijado en el subproyecto correspondiente.

## 3. Metadatos e Índices Locales
- Los índices de símbolos, bases de datos vectoriales de código o cachés de sesión del arnés deben habitar exclusivamente en `.agents/index/` y mantenerse fuera del control de versiones.
