# Flujos y notificaciones por camino (propuesta para revisar)

**Fecha:** 2026-09-28
**Estado:** 🟡 BORRADOR PARA REVISIÓN. Nada de lo marcado 🆕 está programado todavía.
**Fuente:** repo `InspeccionAmbiental-Workflow` (mapa maestro v1.7, especificaciones N1, BPMN N2/N3 activos de `07_RUTAS_JURIDICAS/README.md`, `90_MODELO_CRM/matriz_roles_v1.0.md`), cruzado con los hooks de notificación que ya existen en `espocrm-custom/Hooks/`.

## Cómo leer este documento

Cada camino es una tabla. Cada fila es **un paso**: quién lo hace, qué queda registrado en el CRM y **a quién le avisa el CRM cuando ese paso termina**.

| Columna | Significado |
|---|---|
| **Quién hace** | Rol del modelo y usuario de prueba (ver [USUARIOS-DE-PRUEBA.md](USUARIOS-DE-PRUEBA.md)). |
| **Registro / estado** | Entidad o campo que cambia en el CRM. |
| **Notifica a** | Quién recibe el aviso *in-app* (campana) y, si se decide, correo. |
| **Hoy** | ✅ ya existe · 🟠 existe pero hay que ajustar el destinatario o el texto · 🆕 propuesta nueva · ⛔ no notificar (a propósito) |

### Reglas de notificación que propongo (para validar)

1. **Se avisa al que tiene que actuar después**, no a todo el mundo. Si hay un responsable asignado, a esa persona; si no, al rol completo.
2. **Nunca se notifica a quien hizo el paso** (ya es así hoy en los notifiers existentes).
3. **El peticionario y las autoridades externas no reciben notificación del CRM.** Lo que se les envía es una *comunicación oficial* (oficio, correo, citación) que se registra como `ComunicacionCaso` / `RemisionAutoridad` / `NotificacionActo`. El CRM solo avisa internamente que esa comunicación está pendiente o quedó enviada.
4. **Los plazos legales se controlan con `AlertaProceso`**: aviso al crear, recordatorio el día anterior y aviso de vencida (job diario 7:00 a. m.).
5. **Ninguna notificación toma decisiones.** Avisar "el informe está listo" no abre expediente, no sanciona y no cierra el caso.
6. ✅ **Decidido (2026-09-28): el Administrador recibe todas las notificaciones** de todos los pasos. Si en un mismo evento hay dos avisos, recibe solo uno (el accionable).

### Roles y usuarios de prueba

| Rol del modelo | Usuario | Nota |
|---|---|---|
| Auxiliar Administrativo · Receptor | `receptor` | |
| Auxiliar Administrativo · Radicador | `radicacion` | |
| Director Técnico | `asignacion` | Hoy hace de "Asignador". |
| Profesional Universitario | `profesional` | |
| Técnico Operativo | `tecnico` | |
| Patrullero Ambiental | `patrullaje` | |
| Inspector Ambiental / de Policía | `inspector` | |
| Rol "Inspección" (fusiona Aux. Inspección + Profesional + Inspector) | `inspeccion` | Los avisos actuales van a este rol. ❓ Ver pregunta P1. |
| Auxiliar Administrativo · Inspección | `auxinspeccion` | |
| Apoyo Jurídico | `juridica` | |
| Secretario de Despacho | `secretario` | Suplencia del Director. |
| Dirección de Bienestar Animal | `bienestaranimal` | |
| Externos sin usuario | — | Peticionario, Autoridad Ambiental, Fiscalía/GELMA, Tesorería, Policía Nacional, segunda instancia. |

---

## Mapa de caminos

```text
INGRESO
 ├─ Ordinario ──► A. Recepción y Radicación
 │                 └► B. Competencia y Clasificación
 │                     ├─ Sin competencia ─────────────► C1. Remisión total
 │                     ├─ Parcial ─────────────────────► C2. Remisión parcial + continúa
 │                     └─ Total
 │                         └► D. Relación de Casos
 │                             └► E. Gestión Técnica (visita, medición, informe, recomendaciones, verificación)
 │                                 └► F. Evaluación de Resultado
 │                                     ├─ Resuelto ──────────────────► C3. Cierre sin expediente
 │                                     ├─ Falta información / nueva gestión ► vuelve a E
 │                                     ├─ Remisión directa ──────────► C4. Remisión a otra autoridad
 │                                     └─ Valoración jurídica (Inspector)
 │                                         ├─ No mérito ─────────────► C3. Cierre sin expediente
 │                                         ├─ PVI ───────────────────► C5. Proceso Verbal Inmediato
 │                                         ├─ Permiso canino ────────► C6. Registro/Permiso Canino
 │                                         └─ Ruta formal ─► G. Apertura de Expediente
 │                                                           ├─ C7. PVA · Convivencia
 │                                                           ├─ C8. Recursos Naturales (→ PVA / Preventiva / autoridad)
 │                                                           ├─ C9. Ambiental Preventiva / Remisión
 │                                                           ├─ C10. Conductas de convivencia con animales (→ PVA)
 │                                                           └─ C11. Maltrato Animal
 │                                                                 └─ N3 transversales (H) → Auto de Archivo (I)
 └─ RNMC / Policía ─► C12. Recepción y Clasificación RNMC
                       ├─ Requiere expediente/PVA → G
                       ├─ Apelación de PVI → H4. Recursos
                       ├─ Multa firme → H7. Tesorería
                       └─ Cumplimiento / no objeción / remisión → actualizar RNMC y cerrar
```

---

## Tramo común: del ingreso a la evaluación

### A. Recepción y Radicación

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| A1 | Recibe la solicitud (correo, oficio, web, IV-F-007) y crea el Case preliminar con el soporte original | Receptor · `receptor` (o **cualquier usuario con permiso de crear casos**) | `Case` → Pendiente de radicación | **Radicador** (rol) + **Admin** · "Nueva solicitud de queja" | ✅ `NotifyRadicacionOnCaseCreated`, corregido el 2026-09-28 ([ajuste](ajustes/2026-09-28-notificacion-radicador-al-crear-caso.md)) |
| A2 | Radica en DÉBORA y registra número y fecha oficial | Radicador · `radicacion` (o quien tenga permiso de radicar) | `cNumeroRadicado`, `Case` → Radicado | **Director Técnico** + **Admin** · "Caso radicado: requiere asignación" (accionable) · **Inspección** + **Receptor** + **quien creó el caso** · "Caso radicado" (informativo) | ✅ `NotifyInspeccionOnRadicado` (envía los dos avisos), ajustado el 2026-09-28 ([ajuste](ajustes/2026-09-28-notificacion-al-radicar.md)) |
| A3 | Se abre el plazo de respuesta del Case | Sistema | `fechaVencimiento` | Responsable asignado + Director · recordatorio/vencimiento | ✅ `NotifyOnFechaVencimientoChange` + job diario de Case |

### B. Competencia y Clasificación

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| B1 | Revisa la competencia (total, parcial o ninguna). **Obligatoria antes de asignar; viene por defecto en Total** | Director Técnico · `asignacion` o Admin | `cCompetencia` + `cCompetenciaConfirmada` | Parcial o Ninguna: **Aux. Inspección + Inspección + Admin** · "Remisión por competencia pendiente de oficio" | ✅ 2026-09-28 ([ajuste](ajustes/2026-09-28-revision-competencia-antes-de-asignar.md)) |
| B2 | Clasifica modalidad (Clase de escrito) y temática ambiental (Recurso/tema + Asunto). **Obligatorios, en el mismo paso que B1** | Director Técnico · `asignacion` o Admin | `cClaseIngreso`, `cRecursoTema`, `cAsunto` | — (decisión interna) | ✅ 2026-09-28 ([ajuste](ajustes/2026-09-28-revision-competencia-antes-de-asignar.md)) |
| B3 | Asigna o reasigna el responsable técnico (tras B1+B2) | Director Técnico · `asignacion` o Admin | `assignedUser` + `AsignacionHistorial` | **Nuevo responsable** · "te asignó / te reasignó el caso" · **Responsable anterior** (en reasignación) · "ya no está a tu cargo" · **Inspección + Admin** · "asignó / reasignó el caso de A a B" (con motivo) | ✅ 2026-09-28 ([avisos](ajustes/2026-09-28-avisos-asignacion-reasignacion.md), [panel e histórico](ajustes/2026-09-28-asignacion-responsable-e-historico.md)) |

→ Si la competencia es **ninguna**, sigue C1. Si es **parcial**, sigue C2 y el componente propio continúa en D.

### D. Relación de Casos

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| D1 | El CRM sugiere Cases con el mismo Destino, dirección o temática | Sistema | sugerencias | Responsable del Case · "Hay N casos posiblemente relacionados" | 🆕 |
| D2 | Confirma o descarta la relación | Profesional / Director | `RelacionCasos` | Responsables de los **otros** Cases vinculados · "Tu caso quedó relacionado con X" | 🆕 |

### E. Gestión Técnica

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| E1 | Define la intervención (visita, medición, etc.) y el responsable | Director Técnico · `asignacion` | `IntervencionTecnica` | Responsable de la intervención · "Nueva intervención técnica asignada" | 🆕 |
| E2 | Programa la visita | Profesional / Patrullero | `ProgramacionVisita` (fecha) | Responsable · recordatorio el día anterior a la visita (`AlertaProceso`, VIS03 del BPMN) | 🆕 |
| E3 | Hace la visita en campo (Survey123) y diligencia el acta | Patrullero / Técnico / Profesional | `ActaVisita` → diligenciada | Director Técnico + Jurídica + Inspección · "Acta lista para revisar" | ✅ `NotifyInspeccionOnActaDiligenciada` + `NotifyAsignadorYJuridicaOnDiligenciada` 🟠 ❓ P3 (¿Jurídica tan temprano?) |
| E4 | Medición / muestreo (si aplica) | Técnico · `tecnico` | `IntervencionTecnica` (medición) | Profesional que elabora el informe | 🆕 |
| E5 | Elabora el informe técnico (IV-F-005) con recomendaciones | Profesional · `profesional` | Informe → "Para revisión" | Director Técnico · "Informe listo para revisión y firma" | 🆕 |
| E6 | Revisa el informe: lo aprueba o lo devuelve | Director Técnico (o Secretario si hay suplencia) | Informe → Aprobado / Devuelto | Si lo aprueba: el autor. Si lo devuelve: el autor, con el motivo | 🆕 |
| E7 | Registra recomendaciones técnicas o compromisos con plazo | Profesional | `RecomendacionTecnica` / `Compromiso` (`fechaLimite`) | Responsable de verificar · alerta al vencer el plazo (`AlertaProceso`) | 🆕 |
| E8 | Verifica el cumplimiento | Profesional / Patrullero | `VerificacionCumplimiento` (Cumplida / Parcial / No cumplida / No verificable) | Director Técnico · "Verificación registrada: resultado X" | 🆕 |
| E9 | Solicita una nueva visita (vuelve a E2) | Director / Inspección | nueva visita | Patrullero asignado · "Nueva visita #N" | ✅ `notifyNuevaVisitaPatrullero` / `notifySolicitudNuevaVisita` |

### F. Evaluación de Resultado

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| F1 | Consolida el resultado técnico del Case | Director Técnico / Profesional | `EvaluacionResultado` | — | — |
| F2a | **Falta información** → nueva gestión | Director Técnico | vuelve a E | Responsable técnico · "Se requiere nueva gestión: motivo" | 🟠 hoy solo existe para "nueva visita" |
| F2b | **Resuelto** → cierre sin expediente | Director Técnico | → C3 | ver C3 | ✅ `notifyCierreSinProceso` |
| F2c | **Remisión directa** a otra autoridad | Director Técnico | → C4 | ver C4 | ✅ `notifyRemisionPorCompetencia` |
| F2d | **Requiere valoración jurídica** | Director Técnico (recomienda) | `EvaluacionResultado.recomiendaEscalamiento` | **Inspector** · "Caso X listo para decisión de ruta jurídica" | 🆕 |
| F3 | Decide la ruta jurídica | Inspector · `inspector` | `DecisionRutaJuridica` (resultado) | Según la ruta: Jurídica (si hay expediente), Director (si no hay mérito), Aux. Inspección (si hay remisión) | 🟠 hoy la decisión la toma el Asignador (`notifyRoleGroupDecision`); el modelo dice que la toma el Inspector ❓ P4 |

---

## Caminos que terminan sin expediente

### C1. Sin competencia: remisión total

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C1.1 | Identifica la autoridad competente | Director Técnico | `RemisionAutoridad.autoridadDestino` | — | — |
| C1.2 | Proyecta el oficio de remisión con la solicitud y anexos (la `RemisionAutoridad` se crea sola al confirmar Parcial o Ninguna) | **Cualquier rol excepto el Radicador** | `RemisionAutoridad` → Proyectada | Director Técnico · "Oficio de remisión para firma" | 🆕 |
| C1.3 | Envía el oficio y carga la constancia de envío o recibido | Aux. Inspección | → Enviada | Director (informativo) | 🟠 hoy `notifyRemisionPorCompetencia` avisa en la decisión, no en el envío |
| C1.4 | Informa al peticionario | Aux. Inspección | `ComunicacionCaso` (externa) | ⛔ interno; se registra la comunicación | — |
| C1.5 | El Case queda conservado, sin cerrar la trazabilidad | Sistema | `Case` → Remitido | Radicador (para registrar la salida en DÉBORA) | 🆕 ❓ P5 |

### C2. Competencia parcial

Igual que C1 para el componente ajeno, **sin cerrar el Case**: el componente propio sigue en D. Se notifica lo mismo que en C1.2 y C1.3, y además al responsable técnico: "El caso sigue con el componente municipal".

### C3. Resuelto o sin mérito jurídico: cierre sin expediente

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C3.1 | Decide el cierre (resuelto en lo técnico o sin mérito jurídico) | Director Técnico (resuelto) / Inspector (sin mérito) | `EvaluacionResultado` / `DecisionRutaJuridica` | Aux. Inspección / Radicador · "Proyectar respuesta final" | ✅ `notifyCierreSinProceso` 🟠 revisar destinatarios |
| C3.2 | Proyecta y envía la respuesta final al peticionario | Aux. Inspección / Radicador | `ComunicacionCaso.esRespuestaFinal = true` | Director + Inspección · "Respuesta final registrada" | ✅ `NotifyOnRespuestaFinal` |
| C3.3 | Cierra el Case | Director Técnico | `Case` → Finalizado | Responsable + Radicación + Director + Inspección | ✅ `NotifyOnCaseFinalizado` |

### C4. Remisión directa a otra autoridad (después de la gestión técnica)

Igual que C1, pero con el informe técnico como anexo. Mismas notificaciones.

### C5. Proceso Verbal Inmediato (Ley 1801, art. 222)

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C5.1 | Identifica al infractor, escucha descargos e intenta mediación | Policía uniformada (externo) | `ActuacionPoliciaInmediata` (la carga el Patrullero o el Aux.) | Inspector (informativo) · "Actuación PVI registrada" | 🆕 |
| C5.2a | La mediación resuelve → se registra la solución | Policía / Patrullero | → Resuelta | — | — |
| C5.2b | Se impone Orden de Policía o medida | Policía | `OrdenPolicia` | → H3 | — |
| C5.3 | **Apelación** → remitir al Inspector en 24 h | Patrullero / Aux. | `apelacion` vinculada | Inspector + responsable · alerta de 24 h | ✅ `CreateAlertaOnApelacion` 🟠 hoy le llega al Patrullero; propongo que le llegue también al Inspector |
| C5.4 | Resuelve la apelación en 3 días hábiles | Inspector | `Recurso` | Inspector · alerta de 3 días | ✅ `CreateAlertaResolucionApelacionPVI` |
| C5.5 | Incumplimiento o reincidencia → traslado a PVA | Inspector | nuevo `DecisionRutaJuridica` | Jurídica · "Preparar apertura PVA" | 🆕 |

### C6. Registro y Permiso de Canino de Manejo Especial

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C6.1 | Radica la solicitud y crea el Case de trámite | Radicador | `Case` + `PermisoCaninoManejoEspecial` | Aux. Inspección · "Verificar requisitos" | 🆕 |
| C6.2 | Verifica los requisitos | Aux. Inspección | incompletos / completos | Si están incompletos: comunicación al solicitante ⛔ interno. Si están completos: Inspector · "Permiso listo para decidir" | 🆕 |
| C6.3 | Valida la clasificación y decide | Inspector | Expedido / No procede | Aux. Inspección · "Informar al solicitante" | 🆕 |
| C6.4 | Programa la renovación | Sistema | `AlertaProceso` a la fecha de renovación | Aux. Inspección · recordatorio antes del vencimiento del permiso | 🆕 ❓ P6 (cuántos días antes) |

---

## G. Preparación y Apertura de Expediente (común a C7–C11)

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| G1 | Autoriza la actuación formal | Inspector | `DecisionRutaJuridica.requiereExpediente = true` | **Jurídica** · "Preparar expediente y Auto de Inicio" | 🆕 |
| G2 | Revisa si ya hay un expediente abierto para el mismo objeto | Jurídica | sugerencia | Inspector · "Existe el expediente X: ¿incorporar?" | 🆕 |
| G3 | Crea el Expediente y proyecta el Auto de Inicio (IV-F-364) | Jurídica · `juridica` | `Expediente` → PREPARACION, `AutoInicio` → Proyecto | Inspector · "Auto de Inicio para revisión y firma" | 🟠 `NotifyOnAutoInicioCreated` existe; revisar destinatario |
| G4 | Revisa, firma y carga el acto final | Inspector | `AutoInicio` → Firmado, `fechaAperturaFormal` | Jurídica + Aux. Inspección · "Expediente abierto: citar/notificar" | 🆕 |
| G5 | Vincula el Case o los Cases | Jurídica | `ExpedienteCase` | Responsable técnico de cada Case · "Tu caso pasó al expediente X" | 🆕 |
| G6 | Continúa a la ruta N2 que corresponda | Inspector | ruta | — | — |

### C7. Proceso Verbal Abreviado · Convivencia (art. 223)

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C7.1 | Verifica competencia, partes, conducta y antecedentes | Inspector | Expediente | — | — |
| C7.2 | Cita a audiencia | Aux. Inspección | `Audiencia` (fecha) + citación | Inspector · recordatorio 1 día antes de la audiencia | 🆕 |
| C7.3 | Audiencia | Inspector | → H1 | ver H1 | — |
| C7.4 | Requiere prueba técnica fuera de la audiencia | Inspector | nueva `IntervencionTecnica` con origen jurídico | Director Técnico + responsable · "Prueba ordenada por el Inspector, plazo X" | 🆕 |
| C7.5 | Carga la prueba y el caso queda listo para reanudar | Profesional / Patrullero | soporte cargado | Inspector · "Prueba lista, reprogramar audiencia" | 🆕 |
| C7.6 | Determina medidas / Orden de Policía | Inspector | → H2 / H3 | — | — |
| C7.7 | Adopta, firma y carga el fallo | Inspector | decisión | Aux. Inspección · "Fallo firmado: notificar" | 🆕 |
| C7.8 | Notificación, recursos, ejecución y cierre | — | → H5, H4, H6, I | — | — |

### C8. Recursos Naturales · competencia municipal

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C8.1 | Consolida visita, Formato 022, evidencias e informe | Profesional / Patrullero | soportes | Inspector · "Resultado técnico listo para valoración" | 🆕 |
| C8.2 | Valora competencia municipal y concurrencia ambiental | Inspector | `DecisionRutaJuridica.resultado` | según la rama | — |
| C8.3a | → PVA | | → C7 | Jurídica | 🆕 |
| C8.3b | → Ambiental Preventiva | | → C9 | Profesional + Aux. Inspección | 🆕 |
| C8.3c | → Remitir a la autoridad competente | Aux. Inspección | `RemisionAutoridad` | como C1 | 🆕 |
| C8.4 | Si hay expediente local → Auto de Archivo | | → I | | |

### C9. Ambiental Preventiva / Remisión a Autoridad Ambiental

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C9.1 | Verifica el IV-F-005 y las evidencias | Profesional / Patrullero | | Inspector · "Evaluar medida preventiva" | 🆕 |
| C9.2a | Impone la medida preventiva y carga el acto | Inspector | `RemisionAutoridad` (campos de medida) | Aux. Inspección · "Notificar medida y trasladar a la autoridad ambiental" | 🆕 |
| C9.2b | Sin medida: remite los antecedentes | Inspector | `RemisionAutoridad` | Aux. Inspección · "Proyectar remisión" | 🆕 |
| C9.3 | Envía, registra el recibido y el número de expediente externo | Aux. Inspección | → Enviada / Recibida | Inspector (informativo) + alerta de seguimiento a la respuesta externa | 🆕 ❓ P7 (plazo de seguimiento) |
| C9.4 | Cierre formal del expediente local | | → I | | |

### C10. Conductas de convivencia relacionadas con animales

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C10.1 | Clasifica la conducta y excluye permiso y maltrato | Inspector | `DecisionRutaJuridica` | Si no corresponde: redirige a C6 o C11 | 🆕 |
| C10.2 | Identifica artículo, autoridad e instancia, y vincula antecedentes | Inspector | | Jurídica · "Preparar PVA" | 🆕 |
| C10.3 | → PVA | | → C7 | | |

### C11. Proceso Verbal de Maltrato Animal (Ley 2455/2025)

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C11.1 | Atiende, verifica urgencia y consolida evidencia | Bienestar Animal · `bienestaranimal` | `ActuacionMaltratoAnimal` | Inspector · "Caso de maltrato con evidencia" (prioridad Alta si hay urgencia) | 🆕 |
| C11.2 | Aprehensión material preventiva (si aplica) | Bienestar Animal / Policía | `aprehension` | Inspector · inmediato | 🆕 |
| C11.3 | Clasifica: maltrato leve / posible delito / concurrencia | Inspector | clasificación | | — |
| C11.4 | Posible delito → remite a Fiscalía/GELMA | Aux. Inspección | `RemisionAutoridad` | Inspector (informativo) | 🆕 |
| C11.5 | Maltrato leve → audiencia oral | Inspector | `Audiencia` (tipo maltrato) | como C7.2 | 🆕 |
| C11.6 | Decisión de fondo → Orden, notificación y recursos | Inspector | → H3, H5, H4 | Aux. Inspección · "Notificar decisión" | 🆕 |
| C11.7 | Pendientes (custodia, pagos, remisiones) → Auto de Archivo | | → I | | |

### C12. Recepción y Clasificación de Actuaciones RNMC / Policía

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| C12.1 | Radica la actuación y carga el comparendo, el informe y los anexos | Radicador | `ActuacionRNMC` | Inspector · "Actuación RNMC para clasificar" | 🆕 |
| C12.2 | Objeción de comparendo → validar en 3 días hábiles | Inspector | alerta | Inspector | ✅ `CreateAlertaObjecion` |
| C12.3 | Clasifica conducta, competencia, término y ruta | Inspector | `DecisionRutaJuridica` | según la rama | — |
| C12.4a | Requiere expediente / PVA | | → G | Jurídica | 🆕 |
| C12.4b | Apelación de PVI | | → H4 | Inspector | 🆕 |
| C12.4c | Multa firme | | → H7 | Jurídica / Aux. Inspección | 🆕 |
| C12.4d | Cumplimiento, no objeción o remisión → actualiza RNMC y cierra | Aux. Inspección | `ReporteRNMC` | Inspector (informativo) | 🆕 |

---

## H. Subprocesos transversales (N3)

### H1. Audiencia (PVA y maltrato)

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| H1.1 | Verifica citación, comparecientes y grabación | Aux. Inspección | `Audiencia` | — | — |
| H1.2 | Primera inasistencia → 3 días para justificar | Inspector | `SuspensionAudiencia.esPrimeraInasistencia` | Inspector + Aux. · alerta de 3 días | ✅ `CreateAlertaJustificacionInasistencia` |
| H1.3 | Suspende para practicar pruebas | Inspector | `SuspensionAudiencia` + fecha de reanudación | Aux. Inspección · "Reprogramar para fecha X" | 🆕 |
| H1.4 | Acta firmada y audio cargado | Inspector / Aux. | `GrabacionAudiencia` | Si falta el audio o el acta: Aux. Inspección · "Soporte faltante" | 🆕 |

### H2. Determinación de medidas correctivas

Lo hace solo el Inspector. **Sin notificación propia**: termina en el fallo (C7.7).

### H3. Orden de Policía

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| H3.1 | Registra la orden | Inspector | `OrdenPolicia` | Aux. Inspección · "Comunicar la orden" | 🆕 |
| H3.2 | Define el responsable del seguimiento y la fecha límite | Inspector | `fechaLimite`, responsable | Responsable del seguimiento + alerta al vencer | 🆕 |
| H3.3 | Verifica el cumplimiento | Profesional / Patrullero | cumplida / incumplida | Si se incumple: Inspector · "Orden incumplida: valorar" | 🆕 |

### H4. Recursos y segunda instancia

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| H4.1 | Registra el recurso | Aux. Inspección | `Recurso` | Inspector · "Recurso recibido" | 🆕 |
| H4.2 | Resuelve la reposición | Inspector | decisión | Aux. Inspección · "Notificar reposición" | 🆕 |
| H4.3 | Apelación → remite el expediente físico | Aux. Inspección | `MovimientoExpediente` (salida) | Inspector (informativo) + alerta de seguimiento a la devolución | 🆕 |
| H4.4 | Registra la devolución y la decisión de segunda instancia | Aux. Inspección | `MovimientoExpediente` (entrada) | Inspector · "Segunda instancia resolvió: definir siguiente paso" | 🆕 |

### H5. Notificación y ejecutoria

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| H5.1 | Notifica: personal (IV-F-362), por aviso (IV-F-365) o en estrados | Aux. Inspección | `NotificacionActo.fechaEfectiva` | Inspector + Jurídica · término de recursos | ✅ `CreateAlertaOnFechaEfectiva` (informativa, sin fecha de vencimiento) ❓ P8 |
| H5.2 | Sin recurso → firmeza / ejecutoria | Aux. Inspección | → En firme | Inspector · "Acto en firme: ejecutar" | 🆕 |

### H6. Gestión y ejecución de medidas correctivas

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| H6.1 | Crea un registro por cada medida | Inspector / Aux. | `MedidaCorrectiva` | Aux. Inspección · "Informar a Policía Nacional (art. 172)" | 🆕 |
| H6.2 | Ejecuta la medida (pedagógica, material, pecuniaria) | Profesional / Patrullero / Aux. | `EjecucionMedidaCorrectiva` | Responsable de la ejecución + alerta de plazo | 🆕 |
| H6.3 | Incumplimiento | Responsable | | Inspector · "Medida incumplida" | 🆕 |

### H7. Ejecución pecuniaria / Tesorería

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| H7.1 | Valida ejecutoria, valor y obligado, y remite a Tesorería | Jurídica / Aux. Inspección | `ObligacionPecuniaria` + `RemisionAutoridad` | Inspector (informativo) | 🆕 |
| H7.2 | Alerta de control a 30 días (TES04A) | Sistema | `AlertaProceso` | Jurídica · "Consultar estado en Tesorería" (**no inicia cobro coactivo**) | 🆕 |
| H7.3 | Registra la respuesta de Tesorería | Jurídica | estado | Inspector | 🆕 |

## I. Auto de Archivo y cierre documental

| # | Paso | Quién hace | Registro / estado | Notifica a | Hoy |
|---|---|---|---|---|---|
| I1 | Revisa pendientes (recursos, órdenes, medidas, pagos, remisiones) | Inspector | checklist | Si hay pendientes: el responsable de cada pendiente | 🆕 |
| I2 | Proyecta el Auto de Archivo (IV-F-361) | Aux. Inspección / Jurídica | `ActuoArchivo` → Proyecto | Inspector · "Auto de Archivo para firma" | 🆕 |
| I3 | Firma y carga | Inspector | → Firmado | Aux. Inspección · "Notificar y cerrar documentalmente" | 🆕 |
| I4 | Cierra el Expediente y cada Case vinculado | Aux. Inspección | `Expediente` → ARCHIVADO, `Case` → Finalizado | como C3.3 | ✅ para el Case / 🆕 para el Expediente |

---

## Preguntas para decidir juntos

| # | Pregunta | Mi propuesta |
|---|---|---|
| P1 | Hoy los avisos van al rol **Inspección** (que fusiona 3 roles). ¿Los redirigimos al rol del modelo que actúa (Director para reparto, Inspector para decisión, Aux. Inspección para notificar)? | Sí. Mantener Inspección como copia solo mientras se usa ese usuario. |
| P2 | Al asignar el patrullero, ¿Inspección debe recibir copia? | ✅ **Decidido: sí**, junto con el Admin; y en reasignación también se avisa al responsable anterior. |
| P3 | ¿Jurídica debe enterarse cuando se diligencia el acta de visita? | No en esa etapa; que se entere en G1, cuando el Inspector decide la apertura. |
| P4 | ¿Quién decide la ruta jurídica en el CRM: el Director (como hoy) o el Inspector (como dice el modelo)? | El Inspector decide; el Director recomienda desde la Evaluación. |
| P5 | Cuando se remite por competencia, ¿el Radicador registra la salida en DÉBORA? | Confirmar con la Alcaldía. |
| P6 | ¿Con cuánta anticipación se avisa la renovación del permiso canino? | 30 días. |
| P7 | ¿Qué plazo de seguimiento damos a las remisiones a autoridades externas? | 15 días hábiles, como seguimiento operativo (no legal). |
| P8 | ¿Calculamos el vencimiento del término de recursos (p. ej., 3 días en PVA) o lo dejamos informativo? | Calcularlo por tipo de acto, marcado como aproximación mientras no haya calendario de festivos. |
| P9 | ¿Enviamos también correo o solo la campana in-app? | Correo solo en los avisos con plazo legal y en las asignaciones. |

## Siguiente paso

1. Revisas y ajustas las tablas: cambias destinatarios, quitas lo que sobra y respondes P1–P9.
2. Probamos cada camino en local con los usuarios de prueba, en el orden A → B → … → I.
3. Programamos por bloques y cada ajuste queda registrado en `docs/ajustes/`.
