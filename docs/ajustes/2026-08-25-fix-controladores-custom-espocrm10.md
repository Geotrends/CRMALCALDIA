# Ajuste: controladores custom rotos tras migración a EspoCRM 10.0.6

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado localmente |
| Responsable | Sesión asistida (Claude Code) |
| Áreas o roles impactados | Todos los usuarios — Casos, Cuentas, Personas naturales, Comunicaciones de caso, Documentos (visor Excel), Usuarios (historial) |
| Versión de despliegue | (incluida en el mismo deploy de `entidades-expediente-autoinicio-rol-juridica-2026-08-25`) |

## Objetivo

Corregir un error 500 (`Call to a member function getEntityById() on null` / `Call to undefined method ...::getUser()`) detectado al probar manualmente el flujo de decisión de Asignador/Jurídica, que resultó ser un problema **no relacionado** con esa funcionalidad: una regresión silenciosa de la migración a EspoCRM 10.0.6 (ver [`2026-08-25-migracion-espocrm-10.0.6.md`](2026-08-25-migracion-espocrm-10.0.6.md)), sin detectar hasta ahora porque nadie había ejercitado esas acciones específicas del API por HTTP desde el cambio de versión.

## Alcance funcional

En EspoCRM 10, los controladores dejaron de recibir propiedades como `$this->entityManager` por inyección automática "mágica" (patrón de versiones anteriores); ahora solo se inyecta lo que el constructor declara explícitamente. Los controladores custom de este proyecto fueron escritos asumiendo el patrón antiguo, así que **cualquier acción custom que usara `$this->entityManager` o `$this->getUser()` fallaba con 500**, para cualquier usuario (incluido admin) — confirmado que no era un problema de permisos ni de mi funcionalidad nueva.

Afectaba a 6 controladores:

| Controlador | Qué necesitaba | Acciones afectadas |
|---|---|---|
| `CaseObj.php` | `entityManager` + `getUser()` | `timeline`, `cronograma`, `panelesDetalle`, `confirmarVisitaRealizada`, `confirmarVisitaAprobada`, `prepararNuevaVisita`, `revertirVisitaAprobada`, `registrarSolicitudNuevaVisita` |
| `Account.php` | `entityManager` | `casosAsociados`, expediente por tercero |
| `Contact.php` | `entityManager` | `casosAsociados`, expediente por tercero |
| `ComunicacionCaso.php` | `entityManager` | listado/lectura de comunicaciones del caso |
| `User.php` | `entityManager` | `historialActuaciones` |
| `Document.php` | `getUser()` | `excelAlcaldiaPreview` (visor de Excel institucional) |

## Diseño y decisión técnica

Patrón aplicado en los 6 archivos: declarar un `__construct()` explícito que recibe las 11 dependencias que ya exige `Espo\Core\Controllers\RecordBase` (framework) más `EntityManager` como dependencia adicional promovida (`private EntityManager $entityManager`), reenviando las 11 originales a `parent::__construct(...)` sin modificarlas. Donde solo hacía falta `getUser()` (Document.php), se restituyó el método (`return $this->user;`) sin tocar el constructor, ya que `user` sí llega correctamente vía la clase base.

No se tocó ningún otro comportamiento — es un cambio mecánico y acotado a declarar dependencias que antes llegaban implícitamente.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | Constructor + `entityManager` + `getUser()` |
| Modificado | `espocrm-custom/Controllers/Account.php` | Constructor + `entityManager` |
| Modificado | `espocrm-custom/Controllers/Contact.php` | Constructor + `entityManager` |
| Modificado | `espocrm-custom/Controllers/ComunicacionCaso.php` | Constructor + `entityManager` |
| Modificado | `espocrm-custom/Controllers/User.php` | Constructor + `entityManager` |
| Modificado | `espocrm-custom/Controllers/Document.php` | Restituye `getUser()` |

## Riesgos y dependencias

- Si en el futuro se agrega un controlador custom nuevo que use `$this->entityManager`/`$this->getUser()`/cualquier propiedad no declarada por `RecordBase`, volverá a fallar igual — dejar este patrón como referencia para el próximo controlador que lo necesite.
- `RecordBase` (EspoCRM 10) sí provee sin declarar nada extra: `config`, `user`, `acl`, `injectableFactory` (via constructor promovido de la clase base) — solo `entityManager` y `getUser()` faltaban.
- No se revisaron controladores de otros módulos EspoCRM no personalizados (core/CRM stock) — el problema es específico de clases bajo `espocrm-custom/Controllers/`.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| `GET Case/action/timeline` (admin) | Correcto | JSON completo del timeline, antes fallaba con 500 |
| `POST Case/action/confirmarVisitaAprobada` (usuario `asignacion`) | Correcto | `{"success":true,"status":"Visita aprobada",...}`, caso actualizado en BD |
| `GET Document/action/excelAlcaldiaPreview` (admin) | Correcto | HTML de la hoja Excel devuelto |
| `GET User/action/historialActuaciones` (admin) | Correcto | JSON con resumen y casos |
| `GET ComunicacionCaso` listado | Correcto | `{"total":0,"list":[]}`, sin error |
| `GET Contact/action/casosAsociados` | Correcto | Lista de casos del contacto devuelta |

## Despliegue y reversión

Incluido en el mismo deploy manual dentro del contenedor de desarrollo (`docker exec crmalcaldia-espocrm-1 bash /opt/bootstrap/repo/scripts/deploy-custom-dokploy.sh`). Reversión: revertir estos 6 archivos deja el sistema en el mismo estado roto que tenía antes de este ajuste — no se recomienda revertir sin razón, ya que corrige un bloqueo real y no introduce comportamiento nuevo.

## Documentación relacionada

| Documento | Acción requerida | Estado |
|---|---|---|
| [`2026-08-25-migracion-espocrm-10.0.6.md`](2026-08-25-migracion-espocrm-10.0.6.md) | Nota: su sección de "Validación" no cubrió acciones custom por HTTP — vale la pena ampliarla a futuro | Sin cambios (fuera de alcance de este ajuste) |
