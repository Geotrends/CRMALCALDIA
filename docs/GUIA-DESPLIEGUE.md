# Desplegar el CRM Alcaldía

Repo: https://github.com/isabelasring/CRMALCALDIA.git

**Requisitos:** Docker Desktop, Git. En Windows usar Git Bash.

> **Estructura del repo:** ver [README.md](../README.md) y [docs/README.md](README.md).  
> El directorio de trabajo es la carpeta que contiene `docker-compose.yml`.

---

## Qué es cada cosa

| Qué | Para qué |
|-----|----------|
| **Repositorio (GitHub)** | Código del CRM, personalizaciones, plantillas y scripts |
| **`.env`** | Contraseñas y configuración (BD, admin, correo). No está en GitHub |
| **`backups/despliegue-inicial/`** | Plantilla de `.env` para despliegue desde cero (sin datos) |
| **`backups/migration-FECHA/`** | Respaldo con datos. No sube a GitHub |
| **`sql/esquema.sql`** | Estructura de la BD sin datos. Ya viene en el repo |
| **`deploy-custom.sh`** | Despliegue manual opcional (el auto-deploy al arrancar `espocrm` ya aplica todo) |

---

## Opción A — Con mis datos (réplica de mi entorno)

**Le paso:** `.env` + carpeta `backups/migration-FECHA/`

**1. Entrar al proyecto**

```bash
cd CRMALCALDIA
```

**2. Copiar `.env` y respaldo**

`.env` en la raíz. Carpeta de respaldo en `backups/`.

**3. Levantar contenedores**

Arranca el CRM y PostgreSQL. La BD queda vacía hasta el paso 4.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

**4. Restaurar datos**

Carga casos, usuarios y archivos del respaldo.

```bash
bash scripts/restore-from-migration.sh backups/migration-20260623-1458
```

**5. Acceder**

http://localhost:8080 — usuarios del respaldo. El reinicio tras la restauración aplica el custom automáticamente.

---

## Opción B — Desde cero (configurado, sin datos)

**En el repo:** `backups/despliegue-inicial/` (plantilla de `.env` + instrucciones)

Sin casos, sin usuarios previos, sin adjuntos. El admin sale del `.env`.

**1. Entrar al proyecto**

```bash
cd CRMALCALDIA
```

**2. Copiar `.env`**

```bash
cp backups/despliegue-inicial/env.txt .env
```

**3. Levantar contenedores**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

**4. Cargar estructura de BD**

Crea las tablas vacías.

```bash
docker exec -i espocrm-db psql -U espocrm -d espocrm < sql/esquema.sql
```

**5. Acceder**

http://localhost:8080 — usuario y contraseña del `.env` (`ESPOCRM_ADMIN_USERNAME` / `ESPOCRM_ADMIN_PASSWORD`).

El servicio `espocrm-init` espera la instalación y aplica roles, permisos, locale (Bogotá, 24 h) y el resto del custom sin comandos adicionales.

**6. Crear usuarios y asignar roles**

En **Administración → Usuarios**: crea cada persona y asígnale el rol (Inspección, Radicación, Patrullero o Asignador). El deploy sincroniza el equipo homónimo automáticamente. Tras asignar rol, el usuario debe **cerrar sesión y volver a entrar**.

| Rol | Qué ve | Qué hace |
|-----|--------|----------|
| **Inspección** | Todos los casos, panel Excel completo | Crea solicitudes, llena registro Excel |
| **Radicación** | Pendientes de radicación, tablero filtrado | Asigna número de radicado y expediente |
| **Asignador** | Casos ya radicados | Asigna patrullero al caso |
| **Patrullero** | Solo sus casos asignados | Diligencia acta de visita |

Si aparece **API 403** en el tablero, el usuario no tiene rol asignado o no cerró sesión tras asignarlo.

**Excel oficial y base de datos sin consola:** [ACCESO-BD-Y-EXCEL.md](ACCESO-BD-Y-EXCEL.md).

## Dokploy — dominio y 404

Si ves **`404 page not found`** en texto plano (sin pantalla de EspoCRM), el proxy no llega al contenedor o Apache no arrancó.

**1. Variables en Dokploy → Environment**

| Variable | Valor ejemplo |
|----------|----------------|
| `ESPOCRM_SITE_URL` | `https://crm.deploy.geotrends.co` |
| `POSTGRES_*` | Igual que en tu `.env` |

**2. Dominio en Dokploy**

- Servicio del compose: **`espocrm`** (no `espocrm-db`, no `espocrm-websocket`).
- Puerto interno: **`80`** (no 8080; 8080 es solo mapeo local).

**3. Tras redeploy, revisar logs**

- `espocrm`: debe aparecer Apache en marcha; sin errores fatales en `entrypoint-with-deploy.sh`.
- `espocrm-init`: `Dokploy custom deployment completed.`

**4. Comprobar contenedores**

En la terminal de Dokploy o SSH:

```bash
docker compose ps
docker compose logs espocrm --tail 80
```

Si `espocrm` está **Restarting** o **Exited**, copia el log.

En Dokploy usa **solo** `docker-compose.yml` (sin `docker-compose.dev.yml`). Tras cada **rebuild + redeploy**:

1. La imagen incluye `espocrm-custom/`, `scripts/` y `formatos/` (ver `docker/espocrm/Dockerfile`).
2. **`espocrm-init`** ejecuta `deploy-custom-dokploy.sh` cuando EspoCRM ya está instalado.
3. **`espocrm`** arranca con `entrypoint-with-deploy.sh` y `ESPO_RUN_AUTO_DEPLOY=1`; si el código cambió respecto al volumen, aplica el custom de nuevo (huella en `data/.custom-deploy-stamp`).

No hace falta `bash scripts/deploy-custom.sh` en el servidor.

---

## Actualizar código

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Si el contenedor ya estaba en marcha y solo cambiaste archivos locales:

```bash
docker compose restart espocrm
```

Opcional (sin reiniciar): `bash scripts/deploy-custom.sh`
