# Base de datos y credenciales

## Dónde está la base de datos

- **Motor:** PostgreSQL 16
- **Ubicación:** contenedor Docker `espocrm-db` en la máquina de desarrollo
- **Datos físicos:** volumen Docker `espocrm-db` (no es un archivo suelto en el proyecto)

El CRM (contenedor `espocrm`) se conecta a PostgreSQL por la red interna de Docker.

## Dónde está la configuración

| Archivo | Qué define |
|---------|------------|
| `.env` | Usuario, contraseña, nombre de BD, puerto |
| `docker-compose.yml` | Cómo se conectan CRM y PostgreSQL |
| `.env.example` | Plantilla (sin contraseñas reales) |

## Conexión

| Desde | Host | Puerto | Base | Usuario |
|-------|------|--------|------|---------|
| CRM (Docker) | `espocrm-db` | `5432` | `espocrm` | `espocrm` |
| PC (DBeaver, etc.) | `localhost` | `5433` | `espocrm` | `espocrm` |

La contraseña está en `.env` → `POSTGRES_PASSWORD`.

## ¿De dónde salen las contraseñas?

**No las trae EspoCRM ni PostgreSQL.** Se definen al montar el entorno:

1. Se copia `.env.example` → `.env`
2. Se reemplazan los placeholders (`cambiar_db_seguro`, etc.) por contraseñas reales
3. `docker compose up` crea la BD con esas credenciales

Es la práctica normal en desarrollo local. En **producción** el servidor tendrá otras credenciales, definidas por el área de sistemas.

## Desarrollo vs producción

| | Desarrollo (local) | Producción (servidor) |
|--|-------------------|----------------------|
| Dónde corre | Docker en tu PC | Servidor de la Alcaldía |
| Credenciales | `.env` local | Las define TI / sistemas |
| Acceso | Solo quien tenga la máquina | Red interna, acceso restringido |

## Esquema SQL

Para instalar solo la estructura (sin datos):

```bash
psql -U espocrm -d espocrm -f sql/esquema.sql
bash scripts/deploy-custom.sh
```

Para copiar datos y archivos: `scripts/backup-for-migration.sh`.
