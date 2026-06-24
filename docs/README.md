# Documentación — CRM Alcaldía

## Operaciones

| Archivo | Para quién | Qué cubre |
|---------|------------|-----------|
| [GUIA-DESPLIEGUE.md](GUIA-DESPLIEGUE.md) | DevOps / soporte | Docker local, Dokploy, restore, `deploy-custom.sh` |
| [BASE-DE-DATOS-Y-CREDENCIALES.md](BASE-DE-DATOS-Y-CREDENCIALES.md) | Admin técnico | BD, usuarios, `.env` |
| [PROGRESO-MIGRACION-BD.md](PROGRESO-MIGRACION-BD.md) | Equipo técnico | Historial de migración de columnas/campos |

## Arquitectura y cumplimiento

| Archivo | Para quién | Qué cubre |
|---------|------------|-----------|
| [ARQUITECTURA-PHP-JS-PYTHON-SH.md](ARQUITECTURA-PHP-JS-PYTHON-SH.md) | Desarrolladores | Capas PHP, JS, Python, scripts |
| [ESTADO-CUMPLIMIENTO-OBJETIVOS.md](ESTADO-CUMPLIMIENTO-OBJETIVOS.md) | Producto / QA | Checklist funcional por objetivo |

## Convenciones

- **Despliegue:** siempre `./scripts/deploy-custom.sh` (local) o `deploy-custom-dokploy.sh` (servidor).
- **Plantillas Word:** fuente en `formatos/`; el deploy las copia al contenedor.
- **Excel maestro:** `exports/excelAlcaldia.xlsx` o `excelAlcaldia.xlsx` en la raíz.
- **Código custom:** todo en `espocrm-custom/` — ver [espocrm-custom/README.md](../espocrm-custom/README.md).

## Después de cada deploy

1. Rebuild / clear cache (lo hace el script de deploy).
2. Cerrar sesión y volver a entrar si cambiaron roles.
3. Hard refresh en el navegador (`Cmd+Shift+R`).
