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

- Apunta los registros DNS (tipo `A`, o un wildcard `*`) de `admin`, `api`,
  `tv` (y `storage` si vas a exponer MinIO) hacia la IP del servidor donde
  corre Coolify.
- Sube este repositorio a un remoto Git (GitHub/GitLab/Gitea) accesible desde
  Coolify.

## 1. Crear el proyecto

1. En Coolify: **Projects → New Project** → nómbralo `digital-signage`.
2. Dentro del proyecto, crea un **Environment** (ej. `production`).

## 2. Desplegar el stack con Docker Compose

Los 4 servicios (Postgres, MinIO, backend, admin-frontend, player-app) están
definidos en [`docker/docker-compose.coolify.yml`](docker/docker-compose.coolify.yml)
— cada uno sigue siendo un contenedor independiente (escalable/reiniciable
por separado), pero se despliegan juntos como un solo recurso versionado en
Git, en vez de crearse uno por uno a mano en la UI.

1. **+ New Resource → Public Repository** (o Private Repository si el repo no
   es público) → pega la URL del repo, rama `main`.
2. En "Build Pack" selecciona **Docker Compose**.
3. En "Docker Compose Location" pon `docker/docker-compose.coolify.yml`.
4. Coolify detecta los 5 servicios del archivo y crea un recurso con una
   sub-tarjeta de configuración por servicio.
5. Ve a **Environment Variables** del recurso y define (ver
   [`docker/.env.coolify.example`](docker/.env.coolify.example) como
   referencia):

   ```
   POSTGRES_USER=signage
   POSTGRES_PASSWORD=<genera un valor aleatorio fuerte>
   POSTGRES_DB=signage

   S3_KEY=<access key para MinIO>
   S3_SECRET=<genera un valor aleatorio fuerte>
   S3_REGION=us-east-1
   S3_BUCKET=signage-media
   S3_PUBLIC_URL=https://storage-signage.midominio.com

   JWT_SECRET=<genera un secreto largo y aleatorio>
   JWT_EXPIRES_IN=7d
   CORS_ORIGINS=https://admin.midominio.com,https://tv.midominio.com

   API_URL=https://api.midominio.com/api
   WS_URL=https://api.midominio.com
   ```

   > Si vas a usar Cloudflare R2 u otro S3 externo en vez de MinIO, quita el
   > servicio `minio` del compose (o simplemente no lo uses) y en su lugar
   > apunta `S3_*` a las credenciales de tu proveedor — `StorageService` habla
   > el protocolo S3 estándar sin cambios de código.

6. **Deploy**. Coolify construye las 5 imágenes (usa los `Dockerfile` de cada
   carpeta) y las levanta en la misma red interna del proyecto — se
   descubren entre sí por el nombre del servicio (`postgres`, `minio`,
   `backend`). El backend sincroniza el schema con `prisma db push`
   automáticamente al iniciar (no hay todavía un historial de migraciones
   committeado — genera uno localmente con `npm run prisma:migrate` contra
   una base real cuando quieras pasar a `prisma migrate deploy`).
7. Asigna un **Domain** a cada servicio que necesita ser público, desde la
   tarjeta de ese servicio dentro del recurso (Configuration → Domains):

   | Servicio | Dominio | Puerto interno |
   | --- | --- | --- |
   | `backend` | `api.midominio.com` | `3000` |
   | `admin-frontend` | `admin.midominio.com` | `8080` |
   | `player-app` | `tv.midominio.com` | `8080` |
   | `minio` | `storage.midominio.com` (opcional) | `9000` |

   Coolify emite el certificado SSL automáticamente (Let's Encrypt vía el
   proxy Traefik integrado) para cada dominio asignado. Postgres no necesita
   dominio — sólo lo alcanza el backend por red interna.
8. (Opcional) corre el seed de datos de ejemplo desde la terminal del
   contenedor `backend` en Coolify:

   ```bash
   npm run seed
   ```

En cada TV, abre un navegador en modo kiosk apuntando a
`https://tv.midominio.com` (ej. Chromium con `--kiosk --noerrdialogs
--disable-infobars --incognito`).

> **Alternativa:** si prefieres crear cada servicio como un recurso separado
> en la UI de Coolify (una Database de PostgreSQL nativa de Coolify + 3
> Applications con Dockerfile) en vez de un solo stack Docker Compose, el
> resultado final es equivalente — usa los mismos `Dockerfile` de cada
> carpeta y las mismas variables de entorno listadas arriba.

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
