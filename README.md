# 🐍 Víbora Retro Next.js 14 (App Router)

Una versión moderna, completa y de alto rendimiento del juego de la víbora (*Snake Game*) portada a **Next.js 14**, **React 18**, **TypeScript** y **Tailwind CSS**, con soporte para **seguimiento continuo por cursor**, **Zero-Jump Armed Spawning**, **telemetría en servidor** y persistencia en disco.

---

## 🚀 Características Principales

### 1. 🖱️ Modo Seguidor Continuo del Cursor (*Cursor Follower*)
- **Zero-Jump Armed Spawning**: La serpiente se arma en reposo y se materializa suavemente bajo la posición real del cursor al iniciar o reanudar el juego, sin saltos bruscos ni teletransportes hacia las paredes.
- **Incepción de Cola (*Tail Inception*)**: La cola nace colapsada en el punto de spawn y se despliega progresivamente a medida que el puntero se desplaza, erradicando muertes inmediatas por colisión de cuello.
- **Escudo de Nacimiento**: 1.5 segundos de protección invulnerable tras reaparecer.
- **Guardia Anti-Teletransporte**: Detecta desplazamientos anómalos del ratón (>65px en un solo fotograma) y suaviza la trayectoria instantáneamente.
- **Detección de Auto-Colisión por Hover**: Evalúa colisiones únicamente a partir del segmento 8 (`safeNeckSegments = 8`), permitiendo giros cerrados naturales sin falsos positivos en el cuello.

### 2. ⌨️ Modo Clásico Cuadrícula WASD
- Movimiento tradicional paso a paso en grilla tile-by-tile.
- Control mediante flechas direccionales o teclas `W`, `A`, `S`, `D`.
- Prevención de giros accidentales de 180° sobre el cuerpo.

### 3. 🌀 Modos de Pared
- **🧱 Clásico**: Muro perimetral mortal. Tocar el borde termina la partida.
- **🌀 Atraviesa Paredes (Portal)**: Borde luminoso portal. En modo WASD se teletransporta al extremo opuesto; en modo Cursor mantiene contención suave sin muerte.

### 4. 🍎 Manzanas y Banner Dorado con Cero Layout Shift
- **Manzanas regulares**: +10 puntos y chispas de partículas luminosas.
- **Manzanas doradas**: +50 puntos con temporizador circular y cuenta regresiva.
- **Ubicación Externa del Banner**: El indicador de la Manzana Dorada está colocado estrictamente **fuera del canvas**, dentro de un contenedor de altura fija (`h-11`) para garantizar **CERO desplazamiento visual o layout shift** de la arena.

### 5. 🖱️ Menú Rápido por Click Derecho
- Hacer click derecho sobre el tablero pausa la partida de inmediato y despliega el modal interactivo con opciones de:
  - Reanudar sincronizando la cabeza directamente bajo el cursor.
  - Nueva partida.
  - Cambio en vivo entre Atraviesa Paredes y Clásico.
  - Selección de control (Cursor vs WASD) y dificultad (Fácil, Normal, Difícil, Insano).
  - Alternar Arena Widescreen y HUD de Telemetría.
  - Acceso directo a la tabla de récords y exportación de datos.

### 6. 📡 Server Telemetry Logger (`/api/telemetry`)
- La aplicación cliente transmite periódicamente y ante eventos críticos (spawn, comer manzana, colisión, pausa, fin de juego) muestras de telemetría a la ruta API `app/api/telemetry/route.ts`.
- La ruta del servidor escribe de manera asíncrona directamente en el disco mediante `fs.promises.writeFile`:
  - `data/telemetry_latest.json`: Instantánea con el último estado, estadísticas de velocidad y anomalías.
  - `data/telemetry_flight_log.json`: Caja negra histórica de vuelos y eventos de la partida.
- Permite que el asistente de IA o sistemas de monitoreo lean las coordenadas y rendimiento exacto del jugador directamente desde el disco.

### 7. 🏆 Tabla de Récords y Estadísticas Globales
- Modal de Game Over con captura de nombre del jugador.
- Persistencia automática de los mejores 50 puntajes en `localStorage` con respaldo en memoria.
- Filtros por Modo (*Portal*, *Clásico*) y Dificultades (*Fácil*, *Normal*, *Difícil*, *Insano*).
- Celebración con lluvia de confeti y fanfarria musical al alcanzar un récord.
- Exportación completa en formatos **JSON** y **CSV / Excel**.

### 8. 🔊 Sintetizador Retro 8-Bit
- Efectos de audio sintetizados puramente mediante la Web Audio API (sin archivos de audio externos).
- Tonos para comer manzana regular, arpegios para manzana dorada, movimiento, fin de partida y fanfarria de récord.
- Botón de silenciar/activar con memoria.

---

## 📁 Estructura del Proyecto

```
snake-next/
├── app/
│   ├── api/
│   │   └── telemetry/
│   │       └── route.ts          # Endpoint POST & GET para registro en disco
│   ├── globals.css               # Estilos globales y Tailwind CSS
│   ├── layout.tsx                # Layout principal Next.js 14
│   └── page.tsx                  # Página principal del juego
├── components/
│   ├── SnakeGame.tsx             # Componente interactivo y controlador del Canvas
│   ├── QuickPauseMenu.tsx        # Modal de pausa por click derecho
│   └── Leaderboard.tsx           # Tabla de líderes, estadísticas y exportación
├── data/
│   ├── telemetry_latest.json     # Último snapshot de telemetría en disco
│   └── telemetry_flight_log.json # Historial acumulado de eventos de vuelo
├── lib/
│   ├── audio.ts                  # Sintetizador Web Audio API 8-bit
│   ├── engine.ts                 # Motor principal del juego y física continua
│   ├── storage.ts                # Gestor de puntuaciones, récords y configuración
│   └── tracker.ts                # Flight recorder y recolector de telemetría
├── package.json                  # Dependencias y scripts
├── tsconfig.json                 # Configuración de TypeScript
├── next.config.js                # Configuración de Next.js
├── tailwind.config.js            # Configuración de Tailwind CSS
├── postcss.config.js             # Configuración de PostCSS
├── run.bat                       # Script de lanzamiento automático en Windows
└── README.md                     # Documentación completa del proyecto
```

---

## 💻 Cómo Ejecutar el Proyecto

### Requisitos
- [Node.js](https://nodejs.org/) (versión 18.17.0 o superior, recomendada versión 20 LTS).

### Opción 1: Mediante el archivo ejecutable `run.bat`
1. Haz doble clic en el archivo `run.bat` ubicado en esta carpeta (`snake-next\run.bat`).
2. El script verificará la presencia de Node.js, instalará las dependencias si no existen y levantará el servidor en `http://localhost:3000`.

### Opción 2: Desde la terminal
1. Abre una terminal en esta carpeta:
   ```bash
   cd C:\Users\thehe\documents\Augus-agy\snake-next
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre tu navegador web en [http://localhost:3000](http://localhost:3000).
