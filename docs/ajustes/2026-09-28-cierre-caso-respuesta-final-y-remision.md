# Ajuste: Cierre del caso con respuesta final y remisión, y botón "Finalizar caso"

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Inspección (proyecta la respuesta), todos menos Radicador (responden, envían el oficio y finalizan), Director Técnico, Admin |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Problema

| | Cierre de atención (antes) | Remisión por competencia (antes) |
|---|---|---|
| Estado | "Proceso cerrado" en el acto | "Remitido por competencia" |
| Plazo legal | Se apagaban las alertas **antes** de responder al peticionario | Seguía, pero el caso no tenía forma de terminar |
| Línea de tiempo | Finalizado | Finalizado (contradicción: el caso seguía abierto) |
| Respuesta al peticionario | Nadie la pedía | Nadie la pedía |
| Avisos de la decisión | Buscaban Director y Jurídica con los nombres viejos (no llegaban) | Igual |

## Decisiones del usuario

1. La respuesta **la proyecta Inspección**, pero la puede registrar, enviar y finalizar **cualquier rol excepto el Radicador**.
2. El caso se finaliza con un **botón**, no automáticamente.

## Comportamiento nuevo

**Cierre de atención (C3):** el caso pasa a **"Pendiente de respuesta final"** (estado nuevo) y el plazo de 15 días hábiles sigue vigilado. Aviso "Cierre de atención: respuesta final pendiente":
- a **Inspección**: "… Proyecte la respuesta final al peticionario (Comunicaciones, marcada como respuesta final) y finalice el caso";
- al **Director Técnico** y al **Admin**: copia informativa.

**Remisión por competencia (C1/C4):** el caso queda en "Remitido por competencia". Al registrarse la remisión (por competencia Parcial/Ninguna o tras la revisión de hallazgos) se crea la alerta **"Enviar oficio de remisión a …"**: Ley 1755, art. 21, 5 días hábiles, prioridad Alta, responsable un usuario de Aux. Administrativo · Inspección (o de Inspección). La alerta pasa sola a "Atendida" cuando la remisión cambia a "Enviada" o a un estado posterior.

**Bloque "Cierre del caso"** (arriba de la columna derecha del caso, visible para todos):

| Tipo | Requisitos |
|---|---|
| Cierre de atención | Respuesta final al peticionario registrada en Comunicaciones (`esRespuestaFinal`) |
| Remisión | Oficio enviado (remisión en "Enviada" o posterior) + comunicación al peticionario informando la remisión (`esRespuestaFinal`) |

Incluye una indicación de cómo cumplirlos, un enlace "Actualizar" y el botón **"Finalizar caso"**. El botón se habilita con todos los requisitos cumplidos y no aparece para el Radicador. Al confirmar, el caso pasa a "Finalizado" y se envía el aviso de cierre habitual. El servidor vuelve a validar (400 "Falta: …"; 403 para el Radicador).

**Línea de tiempo:** nuevo paso **"Respuesta final al peticionario"** (o **"Remisión"**) antes de "Finalizado". Estando en "Revisión de hallazgos", el paso actual es "Definición de trámite pendiente". En el paso nuevo: "Pendiente: registrar la respuesta y finalizar el caso".

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Resources/metadata/entityDefs/Case.json`, `i18n/es_ES/Case.json` | Estado "Pendiente de respuesta final". "Remitido por competencia" deja de usar el estilo de caso cerrado. |
| Creado | `espocrm-custom/Tools/CaseObj/CaseCierreService.php` | Requisitos, finalización y aviso de respuesta pendiente. |
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | `cerrarSinProceso` → "Pendiente de respuesta final". Nuevos `GET Case/action/cierreEstado` y `POST Case/action/finalizarCaso`. |
| Modificado | `espocrm-custom/Tools/CaseObj/CaseCompetenciaService.php` | `registrarRemision` crea la alerta de envío del oficio. |
| Creado | `espocrm-custom/Hooks/RemisionAutoridad/AtenderAlertaEnvioRemision.php` | Remisión enviada → alerta "Atendida". |
| Modificado | `espocrm-custom/Tools/CaseObj/CaseTimelineService.php` | Paso `Respuesta final` y alias de estados. |
| Modificado | `espocrm-custom/Tools/CaseObj/CaseVisitaAprobadaNotifier.php` | Director y Jurídica se buscan por todos sus nombres. Corrige los avisos de cierre, remisión y respuesta final registrada. |
| Modificado | `espocrm-custom/Tools/User/AlcaldiaUserProfile.php` | `findActiveJuridicaUserIds()`, `isRadicadorRole()`. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js` | Bloque "Cierre del caso". |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/case-status-timeline.js` | Paso nuevo, etiquetas y alias. |
| Modificado | `espocrm-custom/files/client/custom/src/views/case/fields/decision-juridica.js` | "Guardar y cerrar la atención" y textos de confirmación. |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/alcaldia-notification-message.js` | Texto del aviso de respuesta pendiente. |
| Modificado | `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css` | Estilos del bloque. |

## Validación

API, dos casos de prueba con acta firmada:

| Paso | Cierre de atención | Remisión |
|---|---|---|
| Ejecutar la definición | "Pendiente de respuesta final"; línea: "Respuesta final (current)"; avisos a `inspeccion` y `admin` | "Remitido por competencia"; línea: "Remisión por competencia (current)"; alerta "Enviar oficio de remisión a Corantioquia", vence 2026-10-05, responsable Aux. Inspección |
| Lista de verificación inicial | respuestaFinal ✗ | remisionEnviada ✗, respuestaFinal ✗ |
| Finalizar sin requisitos | 400 "Falta: Respuesta final…" | 400 "Falta: …" |
| Radicador | `canFinalizar=false`; finalizar → 403 | — |
| Remisión → "Enviada" (Aux. Inspección) | — | alerta "Atendida"; remisionEnviada ✓ |
| Comunicación con respuesta final | respuestaFinal ✓ | respuestaFinal ✓ |
| Finalizar (Inspección / Aux. Inspección) | 200 → "Finalizado"; línea: "Finalizado" | 200 → "Finalizado" |
| Avisos de cierre | Director, Radicación, responsable, etc. (aviso de caso finalizado habitual) | igual |

Interfaz (Playwright, `inspeccion`, caso remitido): bloque "Cierre del caso · Remisión por competencia · Actualizar" con los 2 requisitos pendientes, la indicación y "Finalizar caso" deshabilitado ("Complete los requisitos para finalizar"). La línea de tiempo muestra el paso "Remisión" actual ("Pendiente: registrar la respuesta y finalizar el caso") antes de "Finalizado".

Datos de prueba eliminados.

## Notas y pendientes

- Los casos que ya estaban en "Proceso cerrado" siguen igual: se consideran terminados (estado histórico).
- El Radicador todavía puede crear registros de Comunicación por su ACL general. La exclusión aplica a finalizar el caso y a las remisiones. Si también debe excluirse de las comunicaciones de respuesta final, se ajusta el ACL de `ComunicacionCaso`.
- Los 5 días hábiles de la remisión se aproximan sin festivos, igual que los demás plazos del CRM.

## Despliegue y reversión

Local: `docker cp`, `rebuild`, `clear-cache` y `update-app-timestamp`. Reversión: revertir el commit.
