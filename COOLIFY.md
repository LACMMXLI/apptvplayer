# Despliegue en Coolify

Esta guía asume que ya tienes Coolify instalado en un servidor propio (VPS o
equipo local con IP/dominio accesible) y un dominio con acceso al DNS, por
ejemplo `midominio.com`.

URLs de ejemplo usadas abajo:

- Admin: `https://signage.fatboymexicali.com`
- API: `https://api-signage.fatboymexicali.com`
- Player: `https://tv.fatboymexicali.com`
- RustFS S3: `https://storage-signage.fatboymexicali.com`

Todos los dominios son configurables — nada está hardcodeado en el código;
sólo se cambian variables de entorno.

## 0. Antes de empezar

- Apunta los registros DNS (tipo `A`, o un wildcard `*`) de `signage`, `api-signage`,
  `tv` y `storage-signage` hacia la IP del servidor donde
  corre Coolify.
- Sube este repositorio a un remoto Git (GitHub/GitLab/Gitea) accesible desde
  Coolify.

## 1. Usa el proyecto existente

Usa el proyecto `apptv` y su entorno `production` existentes en Coolify.

## 2. Desplegar como cinco recursos independientes

El proyecto `apptv` usa un recurso Coolify por servicio: PostgreSQL, RustFS
(S3), backend, admin-frontend y player-app. Las definiciones de Compose de un
servicio están en [`docker/coolify/`](docker/coolify/). Cada recurso se puede
desplegar o reiniciar por separado; las cinco definiciones se conectan a la
red compartida `coolify` y no publican puertos de base de datos ni de API S3
directamente en el host.

En el entorno `production`, crea cinco recursos desde **+ New Resource**:

| Recurso | Tipo / archivo Compose | Puerto interno | Dominio |
| --- | --- | ---: | --- |
| `apptv-postgres` | Docker Compose · `docker/coolify/postgres.yml` | 5432 | Ninguno |
| `apptv-rustfs` | Docker Compose · `docker/coolify/rustfs.yml` | 9000 | `storage-signage.fatboymexicali.com` |
| `apptv-backend` | Docker Compose · `docker/coolify/backend.yml` | 3000 | `api-signage.fatboymexicali.com` |
| `apptv-admin` | Docker Compose · `docker/coolify/admin-frontend.yml` | 8080 | `signage.fatboymexicali.com` |
| `apptv-player` | Docker Compose · `docker/coolify/player-app.yml` | 8080 | `tv.fatboymexicali.com` |

Para cada recurso de Compose, conecta el repositorio `LACMMXLI/apptvplayer`,
rama `main`, y escribe la ruta mostrada en la tabla. Mantén todos los recursos
en el mismo servidor de Coolify. No asignes un dominio ni publiques un puerto
de host para PostgreSQL; el backend lo alcanza como `apptv-postgres:5432`.
El backend alcanza RustFS como `apptv-rustfs:9000` por la red compartida.

Coolify requiere que cada recurso de Compose pueda unirse a la red compartida
`coolify`; revisa **Connect to predefined network** si la pantalla de
configuración lo ofrece. No uses `localhost`, el dominio público ni puertos
publicados para las conexiones entre recursos. Si el servidor usa otro nombre
para su red compartida, ajusta `name:` en los cinco archivos para que coincida.

Define las variables de [`docker/.env.coolify.example`](docker/.env.coolify.example)
en el recurso indicado. Genera una contraseña PostgreSQL hexadecimal para que
la URL de conexión no requiera escape; usa claves nuevas para RustFS y el JWT.
No configures credenciales de administrador en Coolify. Tras desplegar el
backend, abre su terminal en Coolify y ejecuta `npm run admin:create`. El
comando pide nombre, correo y contraseña de forma interactiva; la contraseña
no se muestra y se guarda como hash. La base de datos y el almacenamiento de RustFS usan volúmenes
nuevos; el recurso anterior y sus volúmenes MinIO/Postgres se conservan durante
la comprobación y se pueden borrar después manualmente.

Asigna los dominios HTTPS a los recursos nuevos después de desplegarlos. La
ruta pública `storage-signage.fatboymexicali.com` debe ir al puerto 9000 de
RustFS; deja el puerto 9001 de la consola sin dominio. El backend corre
`prisma db push` al inicio, de forma idempotente. El seed no crea cuentas de
usuario.

En cada TV, abre un navegador en modo kiosk apuntando a
`https://tv.fatboymexicali.com` (por ejemplo Chromium con `--kiosk
--noerrdialogs --disable-infobars --incognito`).

## 7. Redes y proxy inverso

- Coolify ya corre Traefik (o Nginx, según versión) como reverse proxy y
  gestiona el certificado SSL de cada dominio automáticamente al asignarlo
  en la app.
- Los cinco recursos comparten la red interna `coolify`. Postgres y el puerto
  de consola RustFS no llevan dominio; sólo la API S3 de RustFS usa el dominio
  de almacenamiento.
- El WebSocket (`/realtime`) viaja por el mismo dominio/puerto que la API
  (`api-signage.fatboymexicali.com`), sobre `wss://` automáticamente una vez que el
  dominio tiene SSL — no requiere configuración extra en Traefik más allá
  del proxy HTTP estándar (Traefik soporta upgrade a WebSocket por defecto).

## 8. Multi-sucursal y escalado

- Cada pantalla (`device`) se vincula a una `branch` y a una `playlist`
  independiente — puedes tener distintas playlists por sucursal o por TV.
- Los servicios de aplicación escalan de forma independiente. Para varias
  réplicas del backend necesitarás sticky sessions y configurar un adaptador
  Socket.io con Redis; Redis sólo está incluido en el Compose local.
- Admin y player son estáticos servidos por Nginx — escalan trivialmente
  agregando réplicas en Coolify.

## 9. Checklist post-deploy

- [ ] `https://api-signage.fatboymexicali.com/api/health` responde `{ status: "ok" }`
- [ ] Crear el primer administrador desde la terminal del backend y verificar
      el acceso en `https://signage.fatboymexicali.com`
- [ ] Subir un archivo de media desde el admin y verificar que se guarda en
      el bucket S3 de RustFS
- [ ] Abrir `https://tv.fatboymexicali.com`, ver el código de pairing, vincularlo
      desde el admin y confirmar que la pantalla carga la playlist sin
      recargar manualmente
- [ ] Editar la playlist asignada a esa pantalla y confirmar que el cambio
      llega en tiempo real (evento `playlist_update`)
