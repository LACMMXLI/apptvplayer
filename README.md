# Digital Signage

Sistema de "digital signage" para restaurantes: pantallas (TVs) que reproducen
menús y promociones, administradas desde un panel web, con actualización en
tiempo real y soporte multi-sucursal.

## Arquitectura

El sistema está dividido en **3 servicios independientes**, cada uno en su
propio contenedor. No es un monolito: cada servicio se despliega, escala y
reinicia por separado.

```
/digital-signage
  /admin-frontend   Panel de administración (React + Vite + TS)
  /backend-api      API REST + WebSockets (NestJS + Prisma + PostgreSQL)
  /player-app       SPA ultra ligera tipo kiosk para las TVs (React + Vite)
  /docker           docker-compose.yml para desarrollo local
  .env.example      Variables de entorno para docker-compose
  COOLIFY.md        Guía de despliegue en Coolify
```

```
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  admin-frontend   │  JWT   │    backend-api    │  WS    │    player-app    │
│  (panel web)      │◄──────►│  NestJS + Prisma  │◄──────►│  (pantalla TV)   │
└──────────────────┘  REST  └───────┬────────────┘ device └──────────────────┘
                                     │   key
                          ┌──────────┴──────────┐
                          │  PostgreSQL │ MinIO  │
                          └─────────────────────┘
```

- **backend-api**: autenticación JWT para el panel, CRUD de media/slides/
  playlists/devices, vinculación de pantallas por código, y un gateway
  WebSocket (Socket.io) que empuja `playlist_update` / `force_reload` a cada
  pantalla en tiempo real.
- **admin-frontend**: dashboard, gestión de media (subida a S3/MinIO), editor
  de slides con preview en vivo, editor de playlists con drag & drop,
  vinculación y asignación de pantallas por sucursal.
- **player-app**: al iniciar, si la pantalla no está vinculada muestra un
  código; una vez vinculada desde el panel, carga su playlist, la cachea
  localmente (localStorage + Cache Storage API para el media) y sigue
  reproduciendo aunque el backend se caiga momentáneamente.

## Requisitos

- Node.js 20+
- Docker y Docker Compose (para Postgres/MinIO/Redis locales, o para
  contenerizar todo el stack)

## Desarrollo local

1. Levanta la infraestructura (Postgres, MinIO, Redis) y el backend:

   ```bash
   cp .env.example .env
   docker compose -f docker/docker-compose.yml up -d postgres minio redis backend
   ```

2. Corre las migraciones y el seed (primera vez, o tras cambiar el schema):

   ```bash
   cd backend-api
   cp .env.example .env   # ajusta si cambiaste algo en el .env raíz
   npm install
   npm run prisma:migrate
   npm run seed
   ```

   El seed crea un usuario admin (`admin@restaurant.com` / `Admin123!` por
   defecto, configurable con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`),
   2 sucursales, media/slides de ejemplo, una playlist y una pantalla ya
   vinculada con el código `DEMO01`.

3. Corre el admin y el player en modo dev (hot reload):

   ```bash
   cd admin-frontend
   cp .env.example .env
   npm install
   npm run dev        # http://localhost:5173

   cd ../player-app
   cp .env.example .env
   npm install
   npm run dev        # http://localhost:5174
   ```

4. Login en el admin con las credenciales del seed. Para vincular una nueva
   pantalla: abre el player, copia el código de 6 caracteres que muestra, y
   pégalo en "Dispositivos → Vincular" en el admin.

### Levantar todo contenerizado (sanity check antes de desplegar)

```bash
docker compose -f docker/docker-compose.yml --profile full up -d --build
```

Esto construye y corre los 3 servicios con sus Dockerfiles de producción
(admin en `:8081`, player en `:8082`, backend en `:3000`).

## Variables de entorno

### backend-api (ver `backend-api/.env.example`)

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Connection string de PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens del panel admin |
| `JWT_EXPIRES_IN` | Expiración del token (ej. `7d`) |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma |
| `S3_ENDPOINT`, `S3_PORT`, `S3_USE_SSL` | Endpoint del storage S3-compatible (MinIO local o Cloudflare R2/otro en producción) |
| `S3_KEY`, `S3_SECRET` | Credenciales del storage |
| `S3_BUCKET` | Bucket de media |
| `S3_PUBLIC_URL` | URL pública base para construir las URLs de los archivos |

### admin-frontend (ver `admin-frontend/.env.example`)

| Variable | Descripción |
| --- | --- |
| `API_URL` (runtime, vía Coolify/docker) o `VITE_API_URL` (build-time) | URL base de la API, ej. `https://api.midominio.com/api` |

### player-app (ver `player-app/.env.example`)

| Variable | Descripción |
| --- | --- |
| `API_URL` / `VITE_API_URL` | URL base de la API |
| `WS_URL` / `VITE_WS_URL` | URL base del WebSocket (mismo host que la API) |

> Los frontends leen primero `window.__RUNTIME_CONFIG__` (generado por el
> `docker-entrypoint.sh` de cada imagen a partir de las env vars del
> contenedor) y usan las variables `VITE_*` de build sólo como fallback. Esto
> permite **cambiar de dominio sin reconstruir la imagen** — clave para
> Coolify.

## Base de datos

Prisma (`backend-api/prisma/schema.prisma`) modela: `users`, `branches`,
`media_files`, `slides`, `playlists`, `playlist_items`, `devices`. Ver el
schema para el detalle de relaciones (una playlist tiene muchos
`playlist_items` ordenados, cada uno apunta a un `slide`; un `device` se
vincula a una `branch` y a una `playlist`).

## Tiempo real

El player se conecta al namespace `/realtime` de Socket.io, se identifica con
`identify { deviceId }`, y el backend lo une a la room `device:<id>`. Cuando
se edita la playlist asignada a esa pantalla (o se reasigna la playlist), el
backend emite `playlist_update` y el player refetch sin recargar. `force_reload`
se usa al vincular una pantalla por primera vez.

## Despliegue en producción (Coolify)

Ver [COOLIFY.md](COOLIFY.md) para la guía paso a paso.
