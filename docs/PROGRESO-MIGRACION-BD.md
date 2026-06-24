# Migración a base de datos nueva

## Paso 0 — Restaurar CRM

**Estado: listo**

- `config-internal.php` apuntaba a `host.docker.internal:5434` → error 500
- Restaurado a: `espocrm-db:5432` / BD `espocrm`
- CRM: http://localhost:8080
- BD original: 12 casos

## Paso 1 — Crear conexión y BD nueva (DBeaver)

**Estado: listo**

- Conexión: `bd_externa` → `localhost:5432`
- BD creada: `externa` (144 tablas, 0 datos)

## Paso 2 — Cargar estructura

**Estado: listo**

1. `sql/esquema.sql` ejecutado en `externa`
2. 1050 queries, sin errores finales
3. Tablas visibles en DBeaver (`account`, `case`, `contact`, `acta_visita`, etc.)

## Paso 3 — Verificar estructura

**Estado: listo**

- Tablas cargadas en `externa` (144 tablas, 0 casos)

## Paso 4 — Apuntar CRM a la BD nueva

**Estado: revertido a original**

Actualmente apunta otra vez a:
- Host: `espocrm-db`
- BD: `espocrm`

---

## `config-internal.php` — qué es y cómo editarlo desde el proyecto

### Qué es

Archivo donde EspoCRM guarda la **conexión a la base de datos** (host, puerto, nombre, usuario, contraseña) y claves internas del sistema.

Es el archivo que hay que cambiar para **apuntar el CRM a otra BD**.

### Por qué no aparece en la carpeta del proyecto

EspoCRM lo crea **dentro del contenedor Docker**, en el volumen `espocrm`:

```
Contenedor espocrm → /var/www/html/data/config-internal.php
```

Por eso al buscar en `CRMALCALDIA/` no lo encuentras: no vive en `espocrm-custom/` ni en `scripts/`.

### Cómo meterlo en el proyecto

La forma práctica es **copiarlo al repo** y **enlazarlo** con Docker para que el contenedor lea el archivo del proyecto.

```
Tu Mac (proyecto)                    Contenedor espocrm
─────────────────                    ──────────────────
config/config-internal.php  ──────►  /var/www/html/data/config-internal.php
     (editas aquí)                        (el CRM lee esto)
```

Eso se hace con un **bind mount** en `docker-compose.yml`: una línea que dice “usa este archivo local dentro del contenedor”.

### Configuración inicial (una sola vez)

**1. Crear carpeta y copiar el archivo desde Docker:**
```bash
cd ~/Desktop/CRMALCALDIA/CRMALCALDIA
mkdir -p config
docker cp espocrm:/var/www/html/data/config-internal.php config/config-internal.php
```

**2. Agregar a `.gitignore`** (contiene contraseñas y claves; no subir a Git):
```
config/config-internal.php
```

**3. Editar `docker-compose.yml`** — en los 3 servicios (`espocrm`, `espocrm-daemon`, `espocrm-websocket`), dentro de `volumes:`, agregar:
```yaml
      - ./config/config-internal.php:/var/www/html/data/config-internal.php
```

Ejemplo completo en `espocrm`:
```yaml
    volumes:
      - espocrm:/var/www/html
      - ./exports:/var/www/html/data/exports
      - ./config/config-internal.php:/var/www/html/data/config-internal.php
```

**4. Aplicar cambios:**
```bash
docker compose up -d
```

### Cómo editarlo (día a día)

1. Abrir en Cursor: `CRMALCALDIA/config/config-internal.php`
2. Buscar el bloque `'database'` y cambiar host / puerto / dbname / user / password
3. Guardar (Cmd+S)
4. Reiniciar:
```bash
docker compose restart espocrm espocrm-daemon espocrm-websocket
```

No hace falta `docker cp`: el bind mount sincroniza solo.

### Valores del bloque `database`

```php
'database' => 
array (
  'host' => '...',
  'port' => '5432',
  'charset' => NULL,
  'dbname' => '...',
  'user' => '...',
  'password' => '...',
  'platform' => 'Postgresql',
),
```

| Campo | BD externa (`externa`) | BD original Docker (`espocrm`) |
|-------|------------------------|--------------------------------|
| `host` | `host.docker.internal` | `espocrm-db` |
| `port` | `5432` | `5432` |
| `dbname` | `externa` | `espocrm` |
| `user` | `geotrends` | `espocrm` |
| `password` | `''` (vacío) | contraseña de `.env` |

**No editar:** `cryptKey`, `hashSecretKey`, `isInstalled` ni otras secciones.

### Alternativa sin bind mount

Si no quieres tocar `docker-compose.yml`, copia manualmente después de cada edición:
```bash
docker cp config/config-internal.php espocrm:/var/www/html/data/config-internal.php
docker compose restart espocrm espocrm-daemon espocrm-websocket
```

### Ver el archivo sin copiarlo

```bash
docker exec espocrm cat /var/www/html/data/config-internal.php
```

---
## Paso 5 — Deploy custom

**Estado: pendiente**

```bash
bash scripts/deploy-custom.sh
```

## Paso 6 — Probar

**Estado: pendiente**

1. Abrir http://localhost:8080
2. Confirmar 0 casos en `"case"` (BD nueva vacía)

## Paso 7 — Rollback (si falla)

**Estado: pendiente**

1. Revertir `config-internal.php` → `espocrm-db:5432` / BD `espocrm`
2. Reiniciar contenedores

---

## Migración de datos

Ya tenemos la **estructura** en `externa` (pasos 1–3). Para que el CRM funcione ahí faltan **datos** (usuarios, casos, config, roles) y **archivos** (PDFs, adjuntos).

### Métodos posibles

| Método | Qué migra | Cuándo usarlo | Herramienta |
|--------|-----------|---------------|-------------|
| **A. Respaldo completo** | BD entera + archivos `data/` | Clonar todo el entorno a otra máquina o BD | `scripts/backup-for-migration.sh` + `restore-from-migration.sh` |
| **B. Estructura + datos por separado** | Primero tablas (`esquema.sql`), luego solo filas | Lo que hicimos: BD nueva vacía y luego volcar datos | `sql/esquema.sql` + `pg_dump --data-only` |
| **C. Clon directo con pg_dump** | Estructura + datos en un solo paso | BD destino vacía (sin tablas previas) | `pg_dump` → `psql` (terminal o DBeaver) |
| **D. Solo datos a BD con estructura** | Filas sobre tablas ya creadas | BD `externa` ya tiene las 144 tablas | `pg_dump --data-only` desde `espocrm` hacia `externa` |
| **E. Migración parcial** | Solo casos, contactos, etc. | Importar legacy o subset | CSV/Excel + scripts custom, o `pg_dump -t tabla` |
| **F. DBeaver** | Datos o BD completa | Preferir interfaz gráfica | Export Data / Import Data, o restaurar un `.sql` |

### Recomendado para nuestro caso (`espocrm` → `externa`)

**Método D** — la estructura ya está en `externa`. Falta copiar solo los datos:

```bash
# 1. Volcar solo datos desde la BD original (Docker)
docker exec espocrm-db pg_dump -U espocrm -d espocrm --data-only --no-owner --no-acl > /tmp/espocrm-datos.sql

# 2. Cargar en externa (PostgreSQL Mac, puerto 5432)
psql -h localhost -p 5432 -U geotrends -d externa -f /tmp/espocrm-datos.sql
```

También hace falta copiar **archivos** (PDFs generados, adjuntos):

```bash
bash scripts/backup-for-migration.sh
# Usar espocrm-data.tar.gz del respaldo, o extraer solo data/ al contenedor
```

### Método A — respaldo completo (ya en el proyecto)

```bash
# Crear respaldo
bash scripts/backup-for-migration.sh
# Genera: backups/migration-FECHA/espocrm.sql + espocrm-data.tar.gz

# Restaurar en otro entorno (o misma máquina)
bash scripts/restore-from-migration.sh backups/migration-FECHA
```

Incluye BD + archivos + al final corre `deploy-custom.sh`.

### Importante al migrar datos

1. **Mantener `cryptKey` y `hashSecretKey`** en `config-internal.php` — si cambian, contraseñas y datos cifrados dejan de funcionar.
2. **Migrar BD y archivos juntos** — los PDFs/adjuntos viven en `/var/www/html/data/`, no solo en PostgreSQL.
3. **Orden sugerido:**
   - Estructura (`esquema.sql`) ✓ ya hecho
   - Datos (`pg_dump --data-only` o respaldo completo)
   - Archivos (`espocrm-data.tar.gz`)
   - Apuntar `config-internal.php` a la BD nueva
   - `bash scripts/deploy-custom.sh`
4. **Probar** login y un caso con PDF antes de dar por cerrada la migración.

### Migración desde fuentes externas (futuro)

| Fuente | Enfoque |
|--------|---------|
| Excel legacy Alcaldía | Scripts `upsert-excel-alcaldia.py` / exportadores existentes |
| Otra BD vieja | Plantilla CSV + script de carga (pendiente en proyecto) |
| Solo casos de prueba | Crear manualmente en CRM tras migrar usuarios/roles |

