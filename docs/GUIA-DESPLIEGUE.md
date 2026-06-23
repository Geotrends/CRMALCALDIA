# Desplegar el CRM Alcaldía

Repo: https://github.com/isabelasring/CRMALCALDIA.git

**Requisitos:** Docker Desktop, Git. En Windows usar Git Bash.

---

## Qué es cada cosa

| Qué | Para qué |
|-----|----------|
| **Repositorio (GitHub)** | Código del CRM, personalizaciones, plantillas y scripts |
| **`.env`** | Contraseñas y configuración (BD, admin, correo). No está en GitHub |
| **`backups/despliegue-inicial/`** | Plantilla de `.env` para despliegue desde cero (sin datos) |
| **`backups/migration-FECHA/`** | Respaldo con datos. No sube a GitHub |
| **`sql/esquema.sql`** | Estructura de la BD sin datos. Ya viene en el repo |
| **`deploy-custom.sh`** | Crea roles, aplica personalizaciones, permisos y configuración |

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
docker compose up -d --build
```

**4. Restaurar datos**

Carga casos, usuarios y archivos del respaldo.

```bash
bash scripts/restore-from-migration.sh backups/migration-20260623-1458
```

**5. Acceder**

http://localhost:8080 — usuarios del respaldo.

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
docker compose up -d --build
```

**4. Cargar estructura de BD**

Crea las tablas vacías.

```bash
docker exec -i espocrm-db psql -U espocrm -d espocrm < sql/esquema.sql
```

**5. Aplicar configuración**

Crea roles base, menús, permisos y campos custom.

```bash
bash scripts/deploy-custom.sh
```

**6. Acceder**

http://localhost:8080 — usuario y contraseña del `.env` (`ESPOCRM_ADMIN_USERNAME` / `ESPOCRM_ADMIN_PASSWORD`).

**7. Crear usuarios y asignar roles**

En **Administración → Usuarios**: crea cada persona y asígnale el rol (Inspección, Radicación, Patrullero o Asignador). El deploy sincroniza el equipo homónimo automáticamente (el navegador usa equipos para saber el perfil). Tras asignar rol, el usuario debe **cerrar sesión y volver a entrar**.

| Rol | Qué ve | Qué hace |
|-----|--------|----------|
| **Inspección** | Todos los casos, panel Excel completo | Crea solicitudes, llena registro Excel |
| **Radicación** | Pendientes de radicación, tablero filtrado | Asigna número de radicado y expediente |
| **Asignador** | Casos ya radicados | Asigna patrullero al caso |
| **Patrullero** | Solo sus casos asignados | Diligencia acta de visita |

Si aparece **API 403** en el tablero, el usuario no tiene rol asignado o no cerró sesión tras asignarlo.

En Dokploy, `espocrm-init` ejecuta `deploy-custom-dokploy.sh` solo al levantar el stack.

---

## Actualizar código

```bash
git pull
bash scripts/deploy-custom.sh
```
