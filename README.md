# CRM Alcaldía (EspoCRM)

Sistema de gestión de quejas ambientales para la Alcaldía, basado en EspoCRM + PostgreSQL.

## Inicio rápido

```bash
cd CRMALCALDIA          # directorio raíz del repo (este README)
cp backups/despliegue-inicial/env.txt .env   # ajustar valores
docker compose up -d --build
```

El contenedor `espocrm` (local) fusiona `docker-compose.override.yml`: auto-deploy y código montado en vivo.

Abrir: http://localhost:8080 (recarga forzada: Cmd+Shift+R)

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/GUIA-DESPLIEGUE.md](docs/GUIA-DESPLIEGUE.md) | Despliegue local, Dokploy, restore de datos |
| [docs/README.md](docs/README.md) | Índice de toda la documentación |
| [scripts/README.md](scripts/README.md) | Catálogo de scripts operativos |
| [espocrm-custom/README.md](espocrm-custom/README.md) | Estructura del código custom (PHP + JS) |

## Estructura del repositorio

```
CRMALCALDIA/
├── espocrm-custom/     # Código custom EspoCRM (backend + frontend)
├── scripts/            # Despliegue, configuración y migraciones
├── formatos/           # Plantillas Word/Excel oficiales (fuente)
├── exports/            # Excel maestro opcional (excelAlcaldia.xlsx)
├── sql/                # Esquema de BD sin datos
├── docs/               # Documentación
├── docker/             # Dockerfile e init
├── backups/            # Plantillas de respaldo (no datos en git)
└── docker-compose.yml
```

## Despliegue

- **Local (Docker):** `docker compose up -d --build` — usa `docker-compose.override.yml` (auto-deploy)
- **Dokploy:** push + redeploy; solo `docker-compose.yml` (entrypoint estándar + `espocrm-init`)
- **Manual (opcional):** `./scripts/deploy-custom.sh` si necesitas forzar sin reiniciar

Ambos flujos automáticos comparten el manifiesto en `scripts/includes/deploy-steps.sh`.

## Roles operativos

Inspección · Radicación · Patrullero · Asignador

Tras asignar rol en Administración → Usuarios, el usuario debe cerrar sesión y volver a entrar.
