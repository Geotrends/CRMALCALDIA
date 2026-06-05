# CRM Alcaldía — EspoCRM

Stack local/producción con Docker (Windows y Mac). Base de datos: **PostgreSQL 16**.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Inicio rápido

```bash
cp .env.example .env
# Edita .env y cambia las contraseñas

docker compose up -d
```

Abre **http://localhost:8080** e inicia sesión con `ESPOCRM_ADMIN_USERNAME` / `ESPOCRM_ADMIN_PASSWORD` del `.env`.

### Mac — continuar desde Windows (backup + `.env`)

1. Copia `backups/espocrm.dump` y tu `.env` al repo clonado.
2. Ejecuta:

```bash
chmod +x scripts/setup-mac.sh
./scripts/setup-mac.sh
```

3. Abre **http://localhost:8080** (usuarios y casos vienen del backup).

## Comandos útiles

| Acción | Comando |
|--------|---------|
| Ver estado | `docker compose ps` |
| Ver logs | `docker compose logs -f espocrm` |
| Parar (conserva datos) | `docker compose down` |
| Actualizar imágenes | `docker compose pull && docker compose up -d` |

**No uses** `docker compose down --volumes` si quieres conservar la base de datos.

## Producción

Cambia en `.env` la variable `ESPOCRM_SITE_URL` por tu dominio HTTPS y usa contraseñas fuertes.
