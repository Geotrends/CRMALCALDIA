# CRM Alcaldía (EspoCRM)

Sistema de gestión de quejas ambientales para la Alcaldía, basado en EspoCRM + PostgreSQL.

## Inicio rápido

```bash
cd CRMALCALDIA          # directorio raíz del repo (este README)
cp backups/despliegue-inicial/env.txt .env   # ajustar valores
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

El archivo `docker-compose.dev.yml` activa auto-deploy y monta el código en vivo (solo Mac/local).

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

- **Local (Docker):** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build` — monta el código en vivo desde tu disco.
- **Dokploy:** push + redeploy con **solo** `docker-compose.yml`; el custom se copia en el build y se aplica al arrancar (`espocrm-init` + auto-deploy en `espocrm`).
- **Manual (opcional):** `./scripts/deploy-custom.sh` si necesitas forzar sin reconstruir la imagen

Ambos flujos automáticos comparten el manifiesto en `scripts/includes/deploy-steps.sh`.

## Modo actual

El flujo por roles (Inspección, Radicación, Patrullero, Asignador) fue **eliminado** del código. El CRM opera en modo admin con permisos amplios hasta que se implemente el nuevo flujo desde cero.

Tras desplegar, use el usuario administrador. El script `configure-alcaldia-no-roles-mode.php` aplica permisos amplios a todos los roles existentes.

### Dokploy — checklist rápido

1. **Environment:** copiar variables de `backups/despliegue-inicial/env.txt` (sobre todo `ESPOCRM_ADMIN_*` y `POSTGRES_*`).
2. **Redeploy** con rebuild de la imagen (solo `docker-compose.yml`).
3. Revisar logs de `espocrm-init`: debe decir `Dokploy custom deployment completed.`
4. Login: usuario y contraseña de `ESPOCRM_ADMIN_USERNAME` / `ESPOCRM_ADMIN_PASSWORD`.
