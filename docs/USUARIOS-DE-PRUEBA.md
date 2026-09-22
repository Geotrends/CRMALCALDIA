# Usuarios de prueba

**Última actualización:** 2026-09-22
**Fuente:** `scripts/fix-operational-login.php` (se aplica en cada deploy, local y Dokploy — es la fuente de verdad, no este documento).
**Roles:** `scripts/roles/configure-role-*.php` (los 4 con equivalente 1:1) y `scripts/roles/configure-roles-modelo-preliminar.php` (los 9 sin ACL definitivo todavía).
**Contexto:** los nombres de rol y usuario siguen `90_MODELO_CRM/matriz_roles_v1.0.md` del repo `InspeccionAmbiental-Workflow` — ver [`PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md`](PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md).

Patrón de contraseña: `<usuario>2026` (ej. `radicacion` → `radicacion2026`). Cada una es sobreescribible con una variable de entorno `ESPOCRM_USER_<NOMBRE>_PASSWORD` en Dokploy.

## Administrador

| Usuario | Contraseña | Rol | Notas |
|---|---|---|---|
| `admin` | valor de `ESPOCRM_ADMIN_PASSWORD` en `.env`/Dokploy | Administrador (tipo admin nativo de EspoCRM) | Acceso total, bypass de ACL. |

## Roles con ACL completo y probado (mapean 1:1 al modelo)

| Usuario | Contraseña | Rol | Función según el modelo |
|---|---|---|---|
| `radicacion` | `radicacion2026` | Auxiliar Administrativo · Radicador | Radica en DÉBORA, registra número/fecha oficial, cambia el Case a Radicado. |
| `patrullaje` | `patrullaje2026` | Patrullero Ambiental | Inspección territorial, evidencia, actas de visita. |
| `juridica` | `juridica2026` | Apoyo Jurídico | Prepara Auto de Inicio, organiza el Expediente. No decide de fondo. |
| `asignacion` | `asignacion2026` | Director Técnico | **Aproximación**: en el modelo no hay rol "Asignación"; esa función funcional (asignar/coordinar) la hace el Director Técnico. |
| `inspeccion` | `inspeccion2026` | Inspección *(nombre sin cambiar)* | Hoy fusiona 3 roles del modelo (Auxiliar Administrativo·Inspección + Profesional + Inspector Ambiental). Separarlos es una tarea de rediseño de permisos aparte, no un rename. |

## Roles nuevos del modelo — ACL preliminar (revisar antes de producción)

Estos 9 roles existían solo como nombre hasta este ajuste; ahora tienen un primer borrador de permisos a nivel de entidad (sin las restricciones de campo que sí tiene, por ejemplo, Radicación). Ver el detalle exacto en `scripts/roles/configure-roles-modelo-preliminar.php`.

| Usuario | Contraseña | Rol | Función según el modelo |
|---|---|---|---|
| `superadmin` | `superadmin2026` | Superadministrador CRM | Soporte técnico transversal, consulta todo. No autor de informes ni firma actos. |
| `adminfuncional` | `adminfuncional2026` | Administrador funcional CRM | Mantenimiento de catálogos y plantillas. No decide de fondo. |
| `receptor` | `receptor2026` | Auxiliar Administrativo · Receptor | Recibe la solicitud, crea el Case preliminar, transfiere al Radicador. |
| `auxinspeccion` | `auxinspeccion2026` | Auxiliar Administrativo · Inspección | Citaciones, notificaciones, remisiones, apoya el Auto de Archivo. |
| `profesional` | `profesional2026` | Profesional Universitario | Visita, medición, informe, recomendaciones técnicas, verificación. |
| `tecnico` | `tecnico2026` | Técnico Operativo | Ejecución técnica de campo (visitas, mediciones, formatos). |
| `inspector` | `inspector2026` | Inspector Ambiental | Decide la ruta jurídica, abre expediente, conduce audiencia, falla, resuelve recursos. |
| `secretario` | `secretario2026` | Secretario de Despacho | Supervisión y suplencia registrada del Director Técnico. |
| `bienestaranimal` | `bienestaranimal2026` | Dirección de Bienestar Animal | Concepto técnico especializado en casos de fauna. |

## Roles excluidos a propósito (sin usuario CRM)

Según el modelo, estos actores no requieren usuario interno completo — se gestionan por fuera del CRM o mediante registro/integración, no por login:

- Secretaría de Hacienda / Tesorería / Cobro Coactivo
- Autoridad Ambiental competente
- Policía Nacional

## Pendiente

- Afinar el ACL preliminar de los 9 roles nuevos (permisos a nivel de campo, no solo de entidad; filtrar Case por tipo de asunto para Dirección de Bienestar Animal).
- Decidir si separar el rol `Inspección` en sus 3 funciones reales del modelo.
- Correr esto en Dokploy (por ahora solo está probado en Docker local).
