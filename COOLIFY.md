# Despliegue en Coolify

Esta guía asume que ya tienes Coolify instalado en un servidor propio (VPS o
equipo local con IP/dominio accesible) y un dominio con acceso al DNS, por
ejemplo `midominio.com`.

URLs de ejemplo usadas abajo:

- Admin: `https://admin.midominio.com`
- API: `https://api.midominio.com`
- Player: `https://tv.midominio.com`
- MinIO (opcional exponer): `https://storage.midominio.com`

Todos los dominios son configurables — nada está hardcodeado en el código;
sólo se cambian variables de entorno.

## 0. Antes de empezar

- Apunta los registros DNS (tipo `A`) de `admin`, `api`, `tv` (y `storage` si
  vas a exponer MinIO) hacia la IP del servidor donde corre Coolify.
- Sube este repositorio a un remoto Git (GitHub/GitLab/Gitea) accesible desde
  Coolify, o usa el despliegue "Docker Compose" apuntando a tu propio Git.

## 1. Crear el proyecto

1. En Coolify: **Projects → New Project** → nómbralo `digital-signage`.
2. Dentro del proyecto, crea un **Environment** (ej. `production`).

## 2. Base de datos (PostgreSQL)

1. **+ New Resource → Database → PostgreSQL**.
2. Asigna nombre `signage-postgres`, usuario/password/db a tu gusto.
3. Coolify expone un `DATABASE_URL` interno (o arma el string con el host
   interno del servicio, ej. `signage-postgres`, puerto `5432`). Guarda ese
   connection string — lo usarás como `DATABASE_URL` del backend.
4. No expongas el puerto de Postgres públicamente; dentro de la red interna
   de Coolify el backend lo alcanza por nombre de servicio.

## 3. Almacenamiento (MinIO o S3/R2)

**Opción A — MinIO auto-hospedado en Coolify:**

1. **+ New Resource → Docker Image** (`minio/minio:latest`) o usa el template
   de MinIO si Coolify lo ofrece en tu versión.
2. Comando: `server /data --console-address ":9001"`.
3. Variables: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`.
4. Monta un volumen persistente en `/data`.
5. (Opcional) expón el puerto 9000 con dominio propio
   (`storage.midominio.com`) si quieres servir el media directo desde MinIO;
   si no, sólo necesita ser alcanzable internamente por el backend.

**Opción B — Cloudflare R2 / cualquier S3 compatible:**

No despliegues nada: sólo usa las credenciales del proveedor en las variables
`S3_*` del backend (ver paso 4). El código no cambia — `StorageService` habla
el protocolo S3 estándar.

## 4. Backend API

1. **+ New Resource → Application → Docker Compose / Dockerfile**, apuntando
   al repo y a la carpeta `backend-api` (usa `backend-api/Dockerfile` como
   build pack "Dockerfile").
2. Puerto interno del contenedor: `3000`.
3. Dominio: `api.midominio.com` → Coolify emite el certificado SSL
   automáticamente (Let's Encrypt vía el proxy Traefik integrado).
4. Variables de entorno (Coolify → tu app → **Environment Variables**):

   ```
   PORT=3000
   DATABASE_URL=postgresql://<user>:<pass>@signage-postgres:5432/<db>?schema=public
   JWT_SECRET=<genera un secreto largo y aleatorio>
   JWT_EXPIRES_IN=7d
   CORS_ORIGINS=https://admin.midominio.com,https://tv.midominio.com
   S3_ENDPOINT=<host interno de minio o el de tu proveedor S3>
   S3_PORT=9000
   S3_USE_SSL=false        # true si tu endpoint S3 usa https
   S3_REGION=us-east-1
   S3_KEY=<access key>
   S3_SECRET=<secret key>
   S3_BUCKET=signage-media
   S3_PUBLIC_URL=https://storage.midominio.com   # o la URL pública de tu proveedor
   ```

5. Deploy. El contenedor corre `prisma migrate deploy` automáticamente al
   iniciar (ver `docker-entrypoint.sh`), así que las migraciones quedan
   aplicadas en cada release.
6. Corre el seed una sola vez (opcional, para datos de ejemplo) desde la
   terminal del contenedor en Coolify:

   ```bash
   npm run seed
   ```

## 5. Admin Frontend

1. **+ New Resource → Application → Dockerfile**, carpeta `admin-frontend`.
2. Puerto interno del contenedor: `8080`.
3. Dominio: `admin.midominio.com` con SSL automático.
4. Variable de entorno:

   ```
   API_URL=https://api.midominio.com/api
   ```

   (Se inyecta en runtime vía `docker-entrypoint.sh` → `config.js`, no hace
   falta reconstruir la imagen si luego cambias de dominio.)

5. Deploy.

## 6. Player App

1. **+ New Resource → Application → Dockerfile**, carpeta `player-app`.
2. Puerto interno del contenedor: `8080`.
3. Dominio: `tv.midominio.com` con SSL automático.
4. Variables de entorno:

   ```
   API_URL=https://api.midominio.com/api
   WS_URL=https://api.midominio.com
   ```

5. Deploy. En cada TV, abre un navegador en modo kiosk apuntando a
   `https://tv.midominio.com` (ej. Chromium con `--kiosk --noerrdialogs
   --disable-infobars --incognito`).

## 7. Redes y proxy inverso

- Coolify ya corre Traefik (o Nginx, según versión) como reverse proxy y
  gestiona el certificado SSL de cada dominio automáticamente al asignarlo
  en la app.
- El backend, Postgres y MinIO se comunican por la **red interna** del
  proyecto en Coolify usando sus nombres de servicio — no necesitas exponer
  esos puertos a internet salvo que quieras acceso externo a MinIO.
- El WebSocket (`/realtime`) viaja por el mismo dominio/puerto que la API
  (`api.midominio.com`), sobre `wss://` automáticamente una vez que el
  dominio tiene SSL — no requiere configuración extra en Traefik más allá
  del proxy HTTP estándar (Traefik soporta upgrade a WebSocket por defecto).

## 8. Multi-sucursal y escalado

- Cada pantalla (`device`) se vincula a una `branch` y a una `playlist`
  independiente — puedes tener distintas playlists por sucursal o por TV.
- Los 3 servicios escalan de forma independiente: en Coolify puedes subir
  réplicas del backend si tienes muchas pantallas conectadas por WebSocket
  (nota: con más de una réplica del backend necesitarás sticky sessions o un
  adaptador de Socket.io con Redis para que los eventos lleguen a todas las
  instancias — el servicio Redis ya está incluido en el stack para este caso).
- Admin y player son estáticos servidos por Nginx — escalan trivialmente
  agregando réplicas en Coolify.

## 9. Checklist post-deploy

- [ ] `https://api.midominio.com/api/health` responde `{ status: "ok" }`
- [ ] Login en `https://admin.midominio.com` con el usuario del seed
- [ ] Subir un archivo de media desde el admin y verificar que se guarda en
      el bucket S3/MinIO configurado
- [ ] Abrir `https://tv.midominio.com`, ver el código de pairing, vincularlo
      desde el admin y confirmar que la pantalla carga la playlist sin
      recargar manualmente
- [ ] Editar la playlist asignada a esa pantalla y confirmar que el cambio
      llega en tiempo real (evento `playlist_update`)
