# Ajuste: Visita complementaria — motivo obligatorio, avisos y plazo de seguimiento

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-28 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Responsable asignado, Director Técnico, Admin, Inspección |
| Versión de despliegue | local (Docker, no desplegado a Dokploy) |

## Objetivo

Decidir qué pasa al solicitar una visita complementaria (E9 / F2a de [`FLUJOS-Y-NOTIFICACIONES-POR-CAMINO.md`](../FLUJOS-Y-NOTIFICACIONES-POR-CAMINO.md)). El usuario aprobó la propuesta completa y el recordatorio de plazo.

## Qué había

- Solo se avisaba al responsable ("Nueva visita requerida"): **sin fecha** (`skipAll`) y **sin el motivo**.
- El camino "agregar visita con motivo" enviaba además "pendiente de asignar al patrullero" a Director y Jurídica, pero buscaba los roles con los nombres viejos.
- No había ningún control de plazo.

## Comportamiento nuevo

Los dos caminos (botón "Solicitar visita complementaria" de la revisión técnico-jurídica y "agregar visita" con motivo) terminan en `Case/action/prepararNuevaVisita`, que ahora:

1. **Exige motivo.** Toma el de la solicitud registrada para esa visita o, si no hay, la motivación de la definición de trámite "Visita complementaria". Sin motivo responde 400 con una indicación clara.
2. **Avisa** (nunca a quien la solicita):

| Destinatario | Texto |
|---|---|
| Responsable asignado | "X solicitó que realices la visita complementaria N° 2 del caso …. Motivo: … Plazo: AAAA-MM-DD." |
| Director Técnico, Admin, Inspección | "X solicitó la visita complementaria N° 2 del caso …, a cargo de Y. Motivo: … Plazo: …" |

3. **Crea una `AlertaProceso`** "Visita complementaria N° N · radicado" (tipo "Seguimiento operativo", prioridad Media, responsable = asignado), con vencimiento a **5 días hábiles**. Es un SLA interno, no un término legal. Solo descuenta fines de semana, no festivos, igual que el cálculo del plazo del caso. No se envía el aviso genérico de creación de la alerta: el responsable ya recibe el plazo en el aviso de la solicitud.
4. **Recordatorio y vencimiento:** el job diario (7:00) avisa al responsable. Si vence sin atender, un seguimiento operativo **se escala al Director Técnico y al Admin** ("… venció … sin atender (responsable: …)").
5. **Al diligenciar el acta** de la visita, la alerta pasa sola a "Atendida".

Si hace falta otra persona para la visita (p. ej. una medición), el Director reasigna desde el panel de Asignación, y eso ya avisa por su cuenta.

## Cambio

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `espocrm-custom/Tools/CaseObj/VisitaComplementariaService.php` | Motivo, avisos, alerta y días hábiles. |
| Modificado | `espocrm-custom/Controllers/CaseObj.php` | `prepararNuevaVisita` usa el servicio. Se quita el aviso duplicado de `registrarSolicitudNuevaVisita` y el método `notifyNuevaVisitaAlPatrullero`. |
| Modificado | `espocrm-custom/Tools/AlertaProceso/AlertaProcesoNotifier.php` | Opción `sinAvisoCreacion`. Escalamiento de los "Seguimiento operativo" vencidos al Director Técnico y al Admin. |
| Creado | `espocrm-custom/Hooks/ActaVisita/AtenderAlertaVisitaComplementaria.php` | Acta diligenciada → alerta "Atendida". |
| Modificado | `espocrm-custom/files/client/custom/src/helpers/alcaldia-notification-message.js` | Textos de la visita complementaria. **Corrección general:** los avisos de `AlertaProceso` (todas las alertas de plazo) se mostraban como "Usuario · Caso". Ahora muestran su texto, "Ver alerta" y color de advertencia (rojo si venció). |

## Validación

Caso de prueba: radicado → competencia Total → asignado a `patrullaje` → acta 1 diligenciada.

| Escenario | Resultado |
|---|---|
| `prepararNuevaVisita` sin motivo | 400 "Registre la motivación de la visita complementaria…" |
| Solicitud con motivo "Medir el ruido en horario nocturno…" → preparar | 200, visita N° 2 |
| Avisos | `patrullaje` (instrucción, motivo, plazo 2026-10-05); `admin` e `inspeccion` (copia "a cargo de Patrullero Ambiental"); `asignacion` (solicitante) ninguno; `juridica` ninguno |
| Alerta | "Visita complementaria N° 2 · PRUEBA-VC-1", Pendiente, vence 2026-10-05, responsable Patrullero Ambiental |
| Acta 2 diligenciada | Alerta → "Atendida" |
| Alerta forzada a vencida + `run-job CheckAlertaProcesoVencimientos` | Estado "Vencida sin atender". Aviso al patrullero y aviso escalado a `asignacion` y `admin` |
| Campanita | Textos correctos; la alerta vencida se ve "La alerta … venció … sin atender · Ver alerta" |

Datos de prueba eliminados (caso, 2 actas, alerta, historial de visitas y de asignación, gestión técnica y avisos).

## Despliegue y reversión

Local: `docker cp`, `clear-cache` y `update-app-timestamp`. Reversión: revertir el commit.
