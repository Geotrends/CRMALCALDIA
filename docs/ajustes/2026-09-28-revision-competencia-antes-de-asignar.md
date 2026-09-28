# Ajuste: Revisión de competencia obligatoria antes de asignar

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Director Técnico y Admin (deciden), Inspección (consulta), todos menos Radicador (oficio de remisión) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Implementar el N1 · Competencia y Clasificación (`02_COMPETENCIA_CLASIFICACION/especificacion.md`): tras radicar, antes de cualquier asignación o visita, se decide si la Alcaldía es competente (Total / Parcial / Ninguna).

Decisiones del usuario:
1. La revisión es **obligatoria**, pero viene por defecto en "Total (competente)".
2. El oficio de remisión lo puede hacer **cualquier rol excepto el Radicador**.

Antes, el CRM no tenía el concepto de competencia, y "Remitir por competencia" solo se podía hacer después de la visita, en la revisión de hallazgos.

## Comportamiento

| Competencia | Qué pasa |
|---|---|
| **Total** | Se confirma y se habilita "Asignar responsable". |
| **Parcial** | Se exige la autoridad destino. Se crea una `RemisionAutoridad` (componente ajeno, estado "Preparación"). El caso sigue y se habilita la asignación. Se avisa a quien prepara el oficio. |
| **Ninguna** | Se exige la autoridad destino. Se crea la `RemisionAutoridad` (totalidad). El caso pasa a "Remitido por competencia" y **no se puede asignar**. Se avisa a quien prepara el oficio. |

- Quién decide: Director Técnico o Admin (`Case/action/revisarCompetencia`; los demás reciben 403). La competencia se confirma una sola vez.
- Inspección ve el resultado en modo lectura ("Pendiente de revisión" o el resumen).
- Regla en el servidor: la **primera** asignación de un caso radicado exige la competencia confirmada. Un caso con competencia "Ninguna" no se asigna. Los casos ya asignados antes de este ajuste conservan la reasignación.
- Aviso "Remisión por competencia pendiente de oficio" (Parcial y Ninguna): Aux. Administrativo · Inspección, Inspección y Admin.
- El aviso al Director al radicar ahora dice: "fue radicado: revise la competencia y asigne el responsable".

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Resources/metadata/entityDefs/Case.json`, `Resources/i18n/es_ES/Case.json` | Campos `cCompetencia` (Total/Parcial/Ninguna, por defecto Total), `cCompetenciaConfirmada`, `cCompetenciaFecha`, `cCompetenciaRevisadaPor` (enlace a User) y `cCompetenciaObservacion`. |
| Creado | `espocrm-custom/Tools/CaseObj/CaseCompetenciaService.php` | Valida, guarda la decisión, crea la `RemisionAutoridad`, cambia el estado cuando es "Ninguna" y notifica. |
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | `POST Case/action/revisarCompetencia`. |
| Creado | `espocrm-custom/Hooks/CaseObj/RequireCompetenciaBeforeAssignment.php` | Regla de asignación (servidor). |
| Modificado | `espocrm-custom/Hooks/CaseObj/ValidatePersonaTipoOnSave.php` | Opción `skipPartyValidation` para acciones de flujo que no tocan a las partes. |
| Creado | `scripts/configure-remision-autoridad-permissions.php` y paso en `scripts/includes/deploy-steps.sh` | `RemisionAutoridad`: crear / consultar / editar para todos los roles; sin acceso para el Radicador; nadie borra. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js` | Bloque "1 · Revisión de competencia" dentro del panel Asignación: formulario (radios, autoridad, observación, "Confirmar competencia") o resumen de color (verde Total, amarillo Parcial, rojo Ninguna). Sin confirmar no aparece el botón de asignar. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/compact-form-sections.js` | Encabezado del panel: responsable, "Pendiente: revisar competencia", "Pendiente de asignar" o "Remitido por competencia". |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/alcaldia-notification-message.js` | Texto del aviso de remisión y del aviso de asignación. |
| Modificado | `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css` | Estilos del bloque. |

## Validación

**API**

| Escenario | Resultado |
|---|---|
| Caso recién radicado | `cCompetencia = Total`, `cCompetenciaConfirmada = false` |
| Asignar sin revisar | 400 "Primero confirme la revisión de competencia del caso." |
| Revisar Total → asignar | 200 / 200 |
| Revisar dos veces | 400 "ya fue confirmada" |
| Parcial sin autoridad | 400 |
| Parcial (Corantioquia) → asignar | Remisión "componente ajeno" en Preparación; asignación 200 |
| Ninguna (Admin, Área Metropolitana) | Estado "Remitido por competencia"; `cEntidadRemision` guardada; revisada por Administrador |
| Asignar tras Ninguna | 400 "remitido por falta de competencia" |
| Inspección intenta revisar | 403 |
| Avisos de remisión | `auxinspeccion`, `inspeccion`, `admin` los reciben; `radicacion` no |
| Radicador lista remisiones / Aux. Inspección crea una | 403 / 200 |

**Interfaz (Playwright)**

| Escenario | Resultado |
|---|---|
| Director: caso radicado | Formulario con "Total" marcado, sin botón de asignar |
| Director: Parcial + Corantioquia + observación → Confirmar | Resumen amarillo con fecha, "por Director Técnico" y la parte remitida; aparece "Asignar responsable" |
| Director: Ninguna | Aparece el campo de autoridad. Tras confirmar: resumen rojo "Caso remitido… No se asigna responsable", sin responsable ni botón |
| Encabezado del panel (Inspección, Admin, Director) | "Pendiente: revisar competencia" |
| Inspección | Sin formulario ni botón (solo lectura) |

Casos y remisiones de prueba eliminados.

## Pendiente / por decidir

- La comunicación al peticionario (Parcial o Ninguna) no se automatiza. Se registra como `ComunicacionCaso` al enviar el oficio (camino C1.4 del MD de flujos).
- La competencia confirmada no se puede corregir desde el panel. Si hace falta, se corrige con "Editar" como Admin.
- Casos radicados antes de este ajuste y aún sin asignar: tendrán que pasar por la revisión antes de asignarse.
- Casos **ya asignados** antes de este ajuste (p. ej. `RAD-P-002`): el panel también muestra el formulario, con la nota "Este caso se asignó antes de que la revisión fuera obligatoria". Mientras tanto conservan "Reasignar responsable". (Corrección del mismo día: al principio el bloque no se mostraba en esos casos.)
- "Remitir por competencia" después de la visita (en la revisión de hallazgos) sigue existiendo para los casos que se descubren ajenos en campo.

## Ampliación (mismo día): B2 · Clasificación obligatoria en el mismo paso

**Decisión del usuario:** la clasificación se confirma junto con la competencia y los **tres** campos son obligatorios (Clase de escrito, Recurso/tema y Asunto), "porque esta acción puede diferenciar entre crear o no un expediente".

Correspondencia con el modelo: modalidad jurídica / pretensión = `cClaseIngreso`; temática ambiental = `cRecursoTema` + `cAsunto`.

**Cambio:**

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Tools/CaseObj/CaseCompetenciaService.php` | Recibe y valida `cClaseIngreso`, `cRecursoTema` y `cAsunto`: obligatorios, sin el marcador "Seleccione una opción" y dentro del catálogo de la metadata. Los guarda con la competencia. |
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | `revisarCompetencia` recibe los tres campos. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js` | El paso pasa a llamarse "1 · Competencia y clasificación". Tres selectores obligatorios, precargados con lo registrado (opciones leídas de la metadata, sin el marcador). Validación en el cliente. El resumen muestra la clasificación. Botón "Confirmar competencia y clasificación". |
| Modificado | `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css` | Estilos de la sección Clasificación. |

**Validación:**

| Escenario | Resultado |
|---|---|
| API sin clasificación / sin asunto / con valor fuera de catálogo | 400 "Seleccione la clase de escrito." / "Seleccione el asunto." / "Valor no válido para la clase de escrito." |
| API completa | 200. Guarda "Queja, reclamo o sugerencia (PQRSD) · AIRE · Afectaciones por ruido" |
| Interfaz: caso con Recurso/tema y Asunto registrados por el Receptor | Selectores precargados ("FAUNA DOMÉSTICA", "Presunto maltrato animal") |
| Interfaz: Clase de escrito en "Seleccione…" → Confirmar | Aviso "Seleccione: Clase de escrito." y no guarda |
| Interfaz: completa → Confirmar | Resumen verde "Denuncia o puesta en conocimiento · FAUNA DOMÉSTICA · Presunto maltrato animal"; encabezado "Pendiente de asignar"; aparece "Asignar responsable" |

Nota: `cClaseIngreso` tiene "Derecho de petición" como valor por defecto en la metadata. Un caso creado por API sin ese campo lo trae precargado. Los casos creados desde la interfaz quedan con el marcador (p. ej. `RAD-P-002`) y el selector aparece vacío.

## Despliegue y reversión

Local: `docker cp`, `rebuild` (columnas nuevas), `clear-cache`, `update-app-timestamp` y el script de permisos. En Dokploy lo hace `deploy-custom-dokploy.sh`. Reversión: revertir el commit (las columnas nuevas quedan en BD sin uso).
