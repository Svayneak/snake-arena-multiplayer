# Guía de Despliegue y Entorno (Linux / Windows / Cloud)

## 1. Continuación del Desarrollo en Linux

El repositorio incluye el script ejecutable [`run-linux.sh`](../run-linux.sh) que detecta la IP LAN local, instala dependencias si faltan y levanta los servidores necesarios.

### Pasos en Linux:
```bash
# 1. Clonar el repositorio
git clone https://github.com/Svayneak/snake-arena-multiplayer.git
cd snake-arena-multiplayer

# 2. Dar permisos de ejecución al lanzador
chmod +x run-linux.sh

# 3. Iniciar en modo desarrollo (Next.js en :3000 + Relay WS en :3001)
./run-linux.sh

# O iniciar en modo producción unificado (un solo puerto :3000 para HTTP + WS)
./run-linux.sh --prod
```

---

## 2. Ejecución en Windows

En Windows puedes usar el lanzador por lotes [`run-lan.bat`](../run-lan.bat) o los scripts de `npm`:

```powershell
# Desarrollo (Next.js en :3000 y Relay WS en :3001 en terminales separadas)
npm run relay
npm run dev

# Producción unificada (Build + Servidor en :3000)
npm run build
npm run start:prod
```

---

## 3. Variables de Entorno

El servidor (`server/prod.js` y `server/relay.js`) incluye los valores públicos del proyecto Supabase (`SUPABASE_URL` y `SUPABASE_ANON_KEY` con RLS habilitado) como valores por defecto para que el proyecto funcione *out-of-the-box* al clonarlo en Linux o desplegarlo en Render. Puedes sobrescribirlos mediante variables de entorno:

| Variable | Descripción | Valor por Defecto |
|---|---|---|
| `PORT` | Puerto del servidor unificado (`server/prod.js`) | `3000` |
| `RELAY_PORT` | Puerto del servidor relay independiente (`server/relay.js`) | `3001` |
| `SUPABASE_URL` | Endpoint REST del proyecto Supabase | `https://naacgdwtglvcumaccime.supabase.co` |
| `SUPABASE_ANON_KEY` | Clave pública anónima (`anon public`) sujeta a RLS | Configurada por defecto |
| `NEXT_PUBLIC_WS_HOST` | Host/URL opcional para forzar un servidor WebSocket externo | Auto-detectado (`wss://` en HTTPS) |

---

## 4. Despliegue en Render.com (`render.yaml`)

El archivo [`render.yaml`](../render.yaml) configura el despliegue continuo desde la rama `main` de GitHub:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod` (ejecuta `node server/prod.js`)
- **Health Check Path**: `/api/status`

---

## 5. Esquema SQL en Supabase (`supabase/schema.sql`)

La tabla `public.high_scores` fue aprovisionada mediante el API de administración de Supabase y su esquema completo se encuentra en [`supabase/schema.sql`](../supabase/schema.sql):

```sql
CREATE TABLE IF NOT EXISTS public.high_scores (
  id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL CHECK (char_length(player_name) <= 30),
  score INTEGER NOT NULL CHECK (score >= 0),
  length INTEGER NOT NULL DEFAULT 1,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'single',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
