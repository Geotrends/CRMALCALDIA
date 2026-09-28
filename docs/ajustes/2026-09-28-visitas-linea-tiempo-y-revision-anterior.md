# Ajuste: Línea de tiempo con visita complementaria y revisión anterior visible y editable

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos (línea de tiempo); quienes revisan hallazgos (tarjetas de visita) |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## 1. Línea de tiempo: la visita complementaria vuelve a "En gestión técnica"

**Problema:** al solicitar otra visita, la línea de tiempo seguía en "Revisión de hallazgos". Dos razones:
- `inferIndexFromCaseData` adelantaba el paso a "Revisión de hallazgos" apenas existía un acta diligenciada.
- Con el estado "En gestión técnica" apuntaba a la siguiente acción ("Revisión de hallazgos"), como cuando ese estado significaba "visita realizada".

**Cambio (`espocrm-custom/Tools/CaseObj/CaseTimelineService.php`):** si hay una visita en curso (`CaseActaVisitaHelper::isCaseEnProcesoOtraVisita`: gestión técnica reabierta y sin acta diligenciada), el paso actual es "En gestión técnica", con la nota "Visita complementaria N.º N en curso". "Revisión de hallazgos" y "Finalizado" quedan pendientes y sin las fechas de la ronda anterior.

**Validación (API `Case/action/timeline`):** con el acta 1 diligenciada, el paso actual es "Revisión de hallazgos". Tras "Visita complementaria" + `prepararNuevaVisita`, el paso actual es "En gestión técnica · Visita complementaria N.º 2 en curso" y "Revisión de hallazgos" queda pendiente y sin fecha.

## 2. Quien revisa hallazgos ve y puede editar la decisión anterior

**Pedido:** "quienes definen los hallazgos deben ver la decisión anterior y también pueden editarla".

**Problemas:**
- A quien decide se le ocultaba el resumen de la revisión en todas las tarjetas.
- El formulario de la visita en curso se precargaba con la última decisión **del caso**, que era la de la visita anterior.

**Comportamiento nuevo:**
- Cada tarjeta muestra su revisión (decisión, quién, fecha, entidad, motivación) a todos. En la visita en curso, quien decide ve el formulario en su lugar.
- En las visitas anteriores, quien decide tiene **"Editar revisión"**: corrige la motivación y, si fue remisión, la entidad. **El tipo de decisión no se cambia**, porque ya se ejecutó (p. ej. ya se pidió la visita 2); el nuevo rumbo se define en la visita en curso. Queda una entrada en la historia del caso.
- El formulario de la visita en curso se precarga solo con la revisión de esa acta. Si no la tiene, empieza vacío.

**Cambio:**

| Acción | Ruta | Propósito |
|---|---|---|
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | `POST Case/action/editarRevisionActa` (mismos permisos que definir el trámite): valida, actualiza el acta (y el caso, si es la revisión vigente) y deja una nota en la historia. |
| Modificado | `espocrm-custom/files/client/custom/res/templates/case/fields/acta-visita-action.tpl` | Botón "Editar revisión" y formulario en la tarjeta. |
| Modificado | `espocrm-custom/files/client/custom/src/views/case/fields/acta-visita-action.js` | `hasRevision` / `canEditRevision` / `esRemision`; guardado con `actionGuardarRevisionActa`. |
| Modificado | `espocrm-custom/files/client/custom/src/views/case/fields/decision-juridica.js` | Precarga desde el acta en curso, no desde el caso. |
| Modificado | `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css` | Estilos. |

**Validación (Playwright, `asignacion`):**
- Visita 1: "Revisión técnico-jurídica · Editar revisión · Decisión: Visita complementaria · Registrada por: Director Técnico · Fecha · Motivación".
- Visita 2 (en curso): formulario vacío.
- Editar la motivación y guardar: la tarjeta se actualiza, y la historia registra "Director Técnico → Editó la revisión de hallazgos de … Nueva motivación: …".

Casos de prueba eliminados.

## Corrección (mismo día): la última visita no mostraba su revisión

**Reporte:** en `RAD-P-002`, la Visita 3 (revisada: "Remisión por competencia", por el Director; caso "Remitido por competencia") no mostraba ni la revisión ni la decisión.

**Causa:** en la visita actual se ocultaba el resumen a quien decide porque "ahí está el formulario". Pero ejecutada la decisión el formulario ya no se muestra, así que no aparecía ninguno de los dos. Además, la ayuda seguía diciendo "Revise los hallazgos… y defina el trámite".

**Cambio (`acta-visita-action.js`):** el resumen de la visita actual solo se oculta mientras el formulario de decisión está visible (caso en "En gestión técnica", "Revisión de hallazgos" o "Visita aprobada"). En cualquier otro estado se muestra con "Editar revisión", y la ayuda pasa a "El acta ya fue diligenciada. Puede revisarla o modificarla."

**Validación (Playwright, `admin`, `RAD-P-002`):** "Visita 3 · El acta ya fue diligenciada… · Revisión técnico-jurídica · Editar revisión · Decisión: Remisión por competencia · Registrada por: Director Técnico · Fecha · Entidad competente: Área Metropolitana del Valle de Aburrá · Motivación: …".

## Despliegue y reversión

Local: `docker cp`, `clear-cache` y `update-app-timestamp`. Reversión: revertir el commit.
