# Ajuste: Roles y usuarios alineados a matriz_roles_v1.0.md (BPMN)

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-22 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos los roles operativos |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Acercar los nombres de rol/usuario del CRM a los definidos en `90_MODELO_CRM/matriz_roles_v1.0.md` (repo `InspeccionAmbiental-Workflow`), y crear los roles del modelo que todavía no existían, con un primer borrador de ACL.

## Alcance funcional

- 4 roles operativos existentes migrados a su nombre oficial del modelo, con el mismo ACL de antes (Radicación → Auxiliar Administrativo · Radicador; Patrullaje → Patrullero Ambiental; Jurídica → Apoyo Jurídico; Asignación → Director Técnico, sin equivalente 1:1 real).
- `Inspección` se deja sin cambiar: en el modelo son 3 roles distintos (Auxiliar·Inspección, Profesional, Inspector) fusionados hoy en uno — separarlos es un rediseño de permisos, no un rename.
- 9 roles nuevos creados con ACL preliminar a nivel de entidad (Superadministrador CRM, Administrador funcional CRM, Auxiliar Administrativo·Receptor, Auxiliar Administrativo·Inspección, Profesional Universitario, Técnico Operativo, Inspector Ambiental, Secretario de Despacho, Dirección de Bienestar Animal), cada uno con su usuario de prueba.
- Excluidos a propósito (el modelo dice que no requieren usuario CRM completo): Autoridad Ambiental competente, Policía Nacional, Secretaría de Hacienda/Tesorería.

## Diseño y decisión técnica

- `AlcaldiaUserProfile.php` no compara contra un único nombre de rol, compara contra listas de alias por función (`NAMES_RADICACION`, `NAMES_PATRULLAJE`, etc.) — se agregó el nombre oficial nuevo a cada lista, de forma aditiva, sin quitar los nombres viejos (compatibilidad hacia atrás).
- Los scripts `roles/configure-role-{radicacion,patrullaje,juridica,asignacion}.php` buscan el rol por una lista de nombres candidatos y configuran el primero que encuentran; se puso el nombre oficial nuevo primero en la lista, así que una vez existe (vía `seed-modelo-roles-bpmn.php`) el ACL se aplica sobre el rol nuevo. El rol viejo queda huérfano (sin usuarios) pero no se borra.
- **Hallazgo corregido en el camino**: `configure-full-access-all-roles.php` y otros 3 scripts (`configure-{comunicacion-caso,task,meeting}-permissions.php`) iteran sobre **todos** los roles existentes en la base y les dan acceso amplio. Sin excluir los 9 roles nuevos, habrían quedado con acceso total a todo el CRM apenas se desplegara — lo opuesto a la intención de "rol vacío, sin ACL todavía". Se agregó una lista de exclusión (`$bareModelRoles`) en los 4 scripts.
- El ACL preliminar de los 9 roles nuevos vive en un script nuevo y consolidado (`scripts/roles/configure-roles-modelo-preliminar.php`), a nivel de entidad únicamente (sin restricciones de campo como sí tiene Radicación) — explícitamente documentado como primer borrador a afinar.
- 9 usuarios de prueba nuevos (`superadmin`, `adminfuncional`, `receptor`, `auxinspeccion`, `profesional`, `tecnico`, `inspector`, `secretario`, `bienestaranimal`), mismo patrón de contraseña `<usuario>2026` que los existentes, agregados a `fix-operational-login.php`.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Nuevo | `scripts/seed-modelo-roles-bpmn.php` | Crea los 13 roles del modelo que no existían |
| Nuevo | `scripts/roles/configure-roles-modelo-preliminar.php` | ACL preliminar de los 9 roles sin equivalente 1:1 |
| Modificado | `scripts/includes/deploy-steps.sh` | Inserta los 2 scripts nuevos en el pipeline de deploy |
| Modificado | `scripts/roles/configure-role-{radicacion,patrullaje,juridica,asignacion}.php` | Reconocen también el nombre oficial nuevo del rol |
| Modificado | `scripts/configure-full-access-all-roles.php`, `configure-comunicacion-caso-permissions.php`, `configure-task-permissions.php`, `configure-meeting-permissions.php` | Excluyen los 9 roles nuevos del acceso amplio automático |
| Modificado | `scripts/fix-operational-login.php` | Nombre visible y rol actualizado para los 4 usuarios migrados; 9 usuarios de prueba nuevos |
| Modificado | `scripts/seed-gestion-routing-users.php` | Sincroniza el nombre visible de `radicacion` con el nuevo rol |
| Modificado | `espocrm-custom/Tools/User/AlcaldiaUserProfile.php` | Alias de los nombres oficiales nuevos en las listas de perfil |
| Modificado | `espocrm-custom/Tools/CaseObj/CaseAlertNotifier.php` | Alertas de vencimiento reconocen también los nombres nuevos |
| Nuevo | `docs/USUARIOS-DE-PRUEBA.md` | Listado completo de usuarios/roles/contraseñas de prueba |

## Riesgos y dependencias

- El ACL preliminar de los 9 roles nuevos es un primer borrador (a nivel de entidad, sin restricciones de campo ni filtrado por tipo de caso) — no debe asumirse como diseño final de seguridad.
- Los roles viejos (`Radicación`, `Patrullaje`, `Jurídica`, `Asignación`) quedan en la base sin usuarios asignados pero con su ACL antiguo todavía presente — no se limpiaron, es deuda técnica menor y de bajo riesgo (nadie los usa).
- Se detectó y corrigió en el momento un problema donde los 9 roles nuevos habían quedado con acceso total (por los 4 scripts de "acceso amplio" corriendo antes de la exclusión) — se limpiaron manualmente en el entorno local vía SQL; en Dokploy no debería ocurrir porque los roles se crean por primera vez ya con la exclusión en su lugar.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Deploy local con los 2 scripts nuevos en el pipeline | Correcto | Logs sin `ERROR`, 9 roles con "ACL preliminar aplicado" |
| Los 9 roles nuevos quedan sin acceso hasta que se les configura ACL | Correcto (tras fix) | Verificado por `psql`, `data: {}` antes de aplicar el ACL preliminar |
| Login de los 4 usuarios migrados (radicacion, patrullaje, juridica, asignacion) | Correcto | Mismo ACL de `Case` que antes de la migración (verificado vía API) |
| Login de los 9 usuarios de prueba nuevos | Correcto | Los 9 responden `200` en `GET /api/v1/App/user` |

## Despliegue y reversión

Desplegado en Docker local. Pendiente desplegar a Dokploy. Reversión: revertir los commits de este ajuste; los roles viejos y sus usuarios siguen intactos en la base como red de seguridad.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| `docs/USUARIOS-DE-PRUEBA.md` | Creado en este ajuste | Hecho |
| `docs/PLAN-MODELO-FUNCIONAL-INSPECCION-AMBIENTAL.md` | Actualizar estado de la Fase 1 (roles) | Pendiente |
