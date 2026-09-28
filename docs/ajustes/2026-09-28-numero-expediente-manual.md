# Ajuste: El número del expediente se asigna manualmente

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Admin, Director Técnico, Apoyo Jurídico, Inspector Ambiental, Aux. Administrativo · Inspección |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

El CRM asignaba solo un consecutivo por año (2026-1, 2026-2…) al crear el expediente.

El BPMN (`06_APERTURA_EXPEDIENTE`, reglas de negocio n.º 29) pide lo contrario:

- mantener un identificador interno y un número oficial **que asigna la entidad**;
- no inventar el consecutivo mientras la nomenclatura esté "POR VALIDAR".

## Decisiones del usuario

1. El número se pone manualmente y **lo pueden poner todos los involucrados**.
2. **No hay regla definida** para su forma: texto libre.

## Cambio

**Creación del expediente:**
- Al decidir la apertura, el expediente se crea **sin número**: solo con el identificador interno.
- Se muestra como "sin número" / "Expediente sin número".

**Asignación del número:**
- El bloque "Apertura de expediente" tiene el campo **"N.º de expediente"**, con los botones "Guardar" y "Cambiar".
- Lo pueden usar Admin, Director Técnico, Apoyo Jurídico, Inspector Ambiental, el rol histórico Inspección y Aux. Administrativo · Inspección. El Radicador y los demás roles solo lo ven.

**Validaciones:**
- El número es obligatorio para **enviar el Auto de Inicio a firma**, porque se imprime en el IV-F-364 (casilla "Radicado y consecutivo") y da nombre al Word.
- El botón "Enviar a firma" queda deshabilitado hasta que se registre.
- No puede repetirse entre expedientes. La comparación ignora mayúsculas y espacios de más.

**Trazabilidad y datos existentes:**
- Cada asignación o cambio queda en la historia del caso ("Asignó…" / "Cambió de X a Y").
- El número se copia al Auto de Inicio.
- Los expedientes existentes conservan su número actual.

### Archivos

- `espocrm-custom/Classes/RecordHooks/Expediente/EarlyBeforeCreate.php` (ya no genera el consecutivo)
- `espocrm-custom/Tools/CaseObj/CaseAperturaService.php`: `numerar()`, `numeroTexto()`, validación al enviar a firma y `puede.numerar`
- `espocrm-custom/Controllers/CaseObj.php` (acción `numerar` en `aperturaAccion`)
- `espocrm-custom/Tools/CaseObj/CaseTimelineService.php` y `CaseCronogramaService.php` ("sin número" mientras no exista)
- `espocrm-custom/files/client/custom/src/helpers/case-detail-side-panels.js`
- `espocrm-custom/files/client/custom/res/css/33-case-asignacion.css`

## Validación (local)

- **Creación:** al decidir la apertura, el expediente queda sin número y el bloque muestra "Expediente sin número en preparación".
- **Envío a firma:** sin número responde 400 con el motivo.
- **Permisos y duplicados:** el Radicador recibe 403 al numerar; un número repetido ("2026-3") responde 400.
- **Asignación y cambio:** Aux. Inspección asigna "IA-2026-015"; el Director Técnico lo cambia a "IA-2026-016". Quedan las dos notas en la historia.
- **Envío con número:** 200. El Word se llama `AutoInicio-IA-2026-016.docx` y contiene el número. El caso muestra el expediente "IA-2026-016" y la línea de tiempo lo cita.
- **Navegador (`inspector`):** campo vacío con ayuda → guardar "IA-2026-020" → se muestra con "Cambiar".
- **Datos de prueba:** eliminados.

## Pendiente

Cuando la entidad defina la nomenclatura oficial, se puede validar el formato o sugerir el siguiente número.

## Despliegue y reversión

- **Local:** `docker cp`, `clear-cache` y `update-app-timestamp`.
- **Reversión:** revertir el commit. Los expedientes que se creen sin número después de revertir volverían a tomar el consecutivo automático.
