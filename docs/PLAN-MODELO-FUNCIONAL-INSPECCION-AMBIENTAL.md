# Plan de implementación del modelo funcional (InspeccionAmbiental-Workflow)

**Última actualización:** 2026-09-22
**Fuente del modelo objetivo:** repo `InspeccionAmbiental-Workflow` (BPMN + `90_MODELO_CRM/`), tratado como fuente de verdad del flujo/procedimiento; este documento traduce ese modelo a un plan de implementación incremental sobre el CRM ya operativo.
**Relación con otros documentos:** este es el plan a futuro. El detalle de cada cambio ya hecho vive en `docs/ajustes/` (un registro por ajuste, con archivos afectados y validación). `docs/GUIA-HANDOFF-PROYECTO.md` sigue siendo la guía general de arquitectura.

## Por qué un plan incremental

El modelo objetivo define ~35 entidades conceptuales; el CRM actual, antes de este plan, implementaba el flujo con una sola entidad `Case` cargando casi todo el estado (recepción, asignación, visita técnica y cierre en un solo campo `status`). Migrar todo de una vez es alto riesgo para un sistema en producción. Se acordó con el usuario avanzar por fases, empezando por separar responsabilidades en el núcleo antes de construir las rutas jurídicas específicas.

## Estado por fase

### Fase 0 — Higiene técnica ✅ Hecho
Unificación de hooks duplicados entre `Hooks/CaseObj/` y `Classes/RecordHooks/CaseObj/`. Ver [`docs/ajustes/2026-09-22-fase0-unificacion-hooks-duplicados.md`](ajustes/2026-09-22-fase0-unificacion-hooks-duplicados.md).

### Fase 1 — Núcleo: separar estados por entidad ✅ Hecho (validado localmente, no desplegado a producción)
- Entidades `GestionTecnica` y `DecisionRutaJuridica`.
- `Case.status` simplificado (10 → 8 valores), con la separación de estados por entidad.
- `Destino` y `RelacionCasos` (agrupación operativa de casos, sin fusionarlos).
- Acción "Relacionar con otro caso" y navegación real al Expediente desde el Case.
- Roles y usuarios alineados a `90_MODELO_CRM/matriz_roles_v1.0.md`: 4 roles operativos migrados a su nombre oficial (mismo ACL), 9 roles nuevos creados con ACL preliminar a nivel de entidad, un usuario de prueba por rol.
- Ver [`2026-09-22-fase1-gestion-tecnica-decision-ruta-juridica.md`](ajustes/2026-09-22-fase1-gestion-tecnica-decision-ruta-juridica.md), [`2026-09-22-destino-relacion-casos.md`](ajustes/2026-09-22-destino-relacion-casos.md) y [`2026-09-22-roles-nombres-bpmn.md`](ajustes/2026-09-22-roles-nombres-bpmn.md).

**Pendiente dentro de esta fase:**
- Ejecutar `scripts/migrate-case-status-gestion-tecnica.php` contra la base de producción (solo listo, no corrido).
- Configurar ACL fina por rol para `GestionTecnica`/`DecisionRutaJuridica`/`Destino`/`RelacionCasos` (hoy tienen acceso completo todos los roles operativos, vía `scripts/configure-full-access-all-roles.php`, como el resto de entidades del proyecto — no se restringió por rol todavía).
- Afinar el ACL preliminar de los 9 roles nuevos del modelo (permisos a nivel de campo, no solo de entidad; filtrar Case por tipo de asunto donde aplique).
- Decidir si se separa el rol `Inspección` en sus 3 funciones reales del modelo (Auxiliar·Inspección, Profesional, Inspector) — hoy siguen fusionadas.
- Panel embebido de `GestionTecnica`/`DecisionRutaJuridica` en el detalle del Case (hoy se navegan desde su propio menú/lista estándar; el usuario eligió esta opción para no construir un panel custom prematuramente).
- Actualizar `docs/GUIA-HANDOFF-PROYECTO.md` y `docs/MANUAL-USUARIO-CRM-AMBIENTAL.md` con las entidades y el flujo nuevos.
- Desplegar a Dokploy (todo el trabajo de Fase 0 y 1 está solo en el entorno Docker local).

### Fase 2 — Rutas jurídicas 🟡 En curso

**Recursos Naturales (competencia municipal) — primer corte hecho.** Se investigó el BPMN activo (`recursos_naturales_municipal_v1.4.bpmn`) antes de programar: la ruta es en esencia un enrutador — 2 de sus 3 desenlaces (Policiva/PVA, Ambiental Preventiva) delegan a otros procesos N2 que todavía no existen en el CRM; el tercero (Auto de Archivo) ya existe. Lo único nuevo construido: entidad `RemisionAutoridad` (remisión a otra autoridad, con seguimiento). El campo `resultado` de `DecisionRutaJuridica` (de Fase 1) ya cubría las 3 ramas de la decisión sin haberlo planeado así. Ver [`2026-09-22-fase2-recursos-naturales-remision-autoridad.md`](ajustes/2026-09-22-fase2-recursos-naturales-remision-autoridad.md).

**Ambiental Preventiva / Remisión a Autoridad Ambiental — hecho.** Es la otra rama directa de Recursos Naturales. Su compuerta de "¿procede medida preventiva municipal?" converge, con o sin medida, en el mismo registro de `RemisionAutoridad` — por eso se extendió esa entidad con campos opcionales de medida preventiva en vez de crear una entidad nueva (ni el BPMN ni `domain.json` definen una entidad propia para eso). Ver [`2026-09-22-fase2-ambiental-preventiva-medida-preventiva.md`](ajustes/2026-09-22-fase2-ambiental-preventiva-medida-preventiva.md).

**Proceso Verbal Abreviado · Convivencia — N2 completo.** Se investigaron los 7 BPMN activos de esta ruta (N2 principal + los 6 N3: Audiencia, Determinación de Medidas Correctivas, Gestión y Ejecución de Medidas Correctivas, Orden de Policía, Notificación y Ejecutoria, Recursos y Segunda Instancia) antes de programar. Entidades construidas: `Audiencia`, `SuspensionAudiencia`, `GrabacionAudiencia`, `OrdenPolicia`, `MedidaCorrectiva`, `EjecucionMedidaCorrectiva`, `NotificacionActo`, `Recurso`, `MovimientoExpediente` (esta última, hallazgo no anticipado: el BPMN de Recursos y Segunda Instancia exige explícitamente crear/cerrar un `MovimientoExpediente` al remitir/devolver el expediente físico en segunda instancia). Se omitió `ActuacionJuridica` como entidad intermedia (simplificación deliberada). Ver [`2026-09-22-fase2-pva-audiencia.md`](ajustes/2026-09-22-fase2-pva-audiencia.md) y [`2026-09-22-fase2-pva-orden-medidas-notificacion-recurso.md`](ajustes/2026-09-22-fase2-pva-orden-medidas-notificacion-recurso.md).

Con esto, las 3 ramas de Recursos Naturales tienen construcción real (Auto de Archivo ya existía; Remisión a Autoridad y Ambiental Preventiva completas; PVA con su N2 completo).

**Maltrato / Convivencia Animal + Registro Canino de Manejo Especial — hecho.** Se investigaron los 4 BPMN activos (Conductas de Convivencia, Registro/Permiso Canino, Proceso Verbal de Maltrato Animal, y su N3 de audiencia). Convivencia Animal resultó ser puramente un clasificador que enruta al PVA ya construido (sin entidad propia). Registro/Permiso Canino ya tenía modelo de datos completo en `domain.json`. Maltrato Animal no tenía entidad en el modelo fuente — se diseñó `ActuacionMaltratoAnimal`, reutilizando `RemisionAutoridad` (para Fiscalía/GELMA) y `Audiencia` (nuevo valor de `tipoProceso`) en vez de duplicar entidades. Ver [`2026-09-22-fase2-maltrato-convivencia-canino.md`](ajustes/2026-09-22-fase2-maltrato-convivencia-canino.md).

**Con esto, la Fase 2 completa las 3 rutas jurídicas acordadas al inicio** (Recursos Naturales, Maltrato/Convivencia Animal + Canino, Proceso Verbal Abreviado) más Ambiental Preventiva (dependencia no anticipada de Recursos Naturales).

### Fase 2b — Inventario completo de los 28 BPMN de `config.json` ✅ Completo (28/28)

El usuario pidió terminar **todos** los BPMN activos del repo, no solo las 3 rutas jurídicas originales. Checklist completo (✅ construido/cubierto, 🔲 pendiente):

| BPMN | Nivel | Estado |
|---|---|---|
| Recepción y Radicación | N1 | ✅ (núcleo preexistente) |
| Recepción y Clasificación RNMC | N1 | ✅ (`ActuacionRNMC`, Bloque 5 — diseño propio sin ficha en `domain.json`; reutiliza `OrdenComparendo`/`Recurso`/`DecisionRutaJuridica`) |
| Competencia y Clasificación | N1 | ✅ (ya cubierto por `Case.cClaseIngreso`/`cRecursoTema` + `RemisionAutoridad`, sin cambios) |
| Relación de Casos | N1 | ✅ (`RelacionCasos`, Fase 1) |
| Gestión Técnica | N1 | ✅ (`GestionTecnica`, Fase 1) |
| Visita de Inspección | N2 | ✅ (`ActaVisita`, núcleo preexistente) |
| Medición / Muestreo | N2 | ✅ (`IntervencionTecnica` tipo=Medición, Bloque 2) |
| Informe / Concepto Técnico | N2 | ✅ (`IntervencionTecnica` tipo=Informe, Bloque 2 — sin entidad propia, cubierto por el modelo genérico) |
| Recomendaciones Técnicas / Compromisos | N2 | ✅ (`RecomendacionTecnica`, `Compromiso`, Bloque 2) |
| Verificación de Cumplimiento | N2 | ✅ (`VerificacionCumplimiento`, Bloque 2) |
| Evaluación de Resultado y Definición de Ruta | N1 | ✅ (`EvaluacionResultado`) |
| Preparación y Apertura de Expediente | N1 | ✅ (`AutoInicio`/`Expediente`, núcleo preexistente) |
| Proceso Verbal Inmediato de Policía | N2 | ✅ (`OrdenComparendo`, `ActuacionPoliciaInmediata`, Bloque 3 — reutiliza `OrdenPolicia`/`MedidaCorrectiva`/`Recurso` ya existentes) |
| Proceso Verbal Abreviado · Convivencia | N2 | ✅ (Fase 2) |
| Recursos Naturales · Competencia Municipal | N2 | ✅ (Fase 2) |
| Conductas de Convivencia con Animales | N2 | ✅ (Fase 2, sin entidad propia) |
| Registro y Permiso de Canino de Manejo Especial | N2 | ✅ (Fase 2) |
| Proceso Verbal de Maltrato Animal | N2 | ✅ (Fase 2) |
| Ambiental Preventiva / Remisión | N2 | ✅ (Fase 2) |
| Audiencia del Proceso Verbal Abreviado | N3 | ✅ (Fase 2) |
| Audiencia de Maltrato Animal | N3 | ✅ (Fase 2, reutiliza `Audiencia`) |
| Orden de Policía · Registro/Cumplimiento | N3 | ✅ (Fase 2) |
| Determinación de Medidas Correctivas | N3 | ✅ (Fase 2, informó el diseño de `MedidaCorrectiva`) |
| Notificación y Ejecutoria de Actos | N3 | ✅ (Fase 2) |
| Recursos y Segunda Instancia | N3 | ✅ (Fase 2) |
| Gestión y Ejecución de Medidas Correctivas | N3 | ✅ (Fase 2) |
| Ejecución Pecuniaria / Tesorería | N3 | ✅ (`ObligacionPecuniaria`, Bloque 4 — diseño propio, sin entidad en `domain.json`; reutiliza `RemisionAutoridad`) |
| Auto de Archivo y Cierre Documental | N2 | ✅ (`ActuoArchivo`, versión simple — el checklist completo de `CierreExpediente` sigue pendiente) |

**Bloque 2 (Medición, Informe/Concepto, Recomendaciones Técnicas/Compromisos, Verificación de Cumplimiento) — hecho.** El modelo fuente no trata Visita/Medición/Informe como entidades separadas: define `IntervencionTecnica` como entidad genérica única (hija de `GestionTecnica`, con `tipo` distinguiendo Visita/Medición/Revisión/Consulta/Informe/Recomendación/Compromiso/Verificación), más `ProgramacionVisita`, `RecomendacionTecnica`, `Compromiso` y `VerificacionCumplimiento`. Decisión de arquitectura clave: no se retrofiteó la ya madura `ActaVisita` (numeración, PDF, hooks en producción) para colgarla de `IntervencionTecnica`; en su lugar se construyó `IntervencionTecnica` como capa nueva para los otros 4 procesos y se le agregó a `ActaVisita` un link opcional (sin tocar su comportamiento existente). Ver [`2026-09-22-gestion-tecnica-intervencion-recomendacion-verificacion.md`](ajustes/2026-09-22-gestion-tecnica-intervencion-recomendacion-verificacion.md).

**Bloque 3 (Proceso Verbal Inmediato de Policía, art. 222) — hecho.** El modelo fuente confirma reutilización explícita: `OrdenPolicia` y `MedidaCorrectiva` (ya construidas para el PVA) ya traían en `domain.json` el origen alternativo `actuacionPoliciaInmediataId`, así que no se duplicaron — solo se les agregó el link opcional. La apelación reutiliza `Recurso` (ya construido), siguiendo la nota del propio modelo ("la apelación del PVI entra a Segunda Instancia, no a un PVA nuevo"). Como el PVI no siempre abre `Expediente`, se relajó `expediente` de obligatorio a opcional en `MedidaCorrectiva` y `Recurso` (retrocompatible). Solo `OrdenComparendo` y `ActuacionPoliciaInmediata` son entidades 100% nuevas. Ver [`2026-09-22-proceso-verbal-inmediato-policia.md`](ajustes/2026-09-22-proceso-verbal-inmediato-policia.md).

**Bloque 4 (Ejecución Pecuniaria / Tesorería) — hecho.** Única brecha estructural real detectada en el modelo fuente: `domain.json` no define ninguna entidad para este subproceso (a diferencia de los demás bloques ya cerrados). `ObligacionPecuniaria` es diseño propio basado en la narrativa del BPMN (TES01–TES07), no un modelo confirmado. Reutiliza `RemisionAutoridad` para el paso de remisión a Tesorería (su `autoridadDestino` ya es texto libre). Tesorería/Secretaría de Hacienda es un actor externo sin rol ni usuario CRM (ya documentado desde `seed-modelo-roles-bpmn.php`); el seguimiento lo hacen Inspector Ambiental/Apoyo Jurídico. No se automatizó la alerta de 30 días ni ninguna transición de estado, siguiendo la advertencia explícita del BPMN contra automatizar cobro coactivo o mora. Ver [`2026-09-22-ejecucion-pecuniaria-tesoreria.md`](ajustes/2026-09-22-ejecucion-pecuniaria-tesoreria.md).

**`ReporteRNMC` (reporte saliente hacia el RNMC) — hecho.** Cierra el dominio RNMC en ambas direcciones: `ActuacionRNMC` (entrante, Bloque 5) + `ReporteRNMC` (saliente, este ajuste). `ReporteRNMC` sí tenía ficha completa en `domain.json` (a diferencia de `ActuacionRNMC`); usa los 5 estados oficiales de `estados.md` sección 17 y reutiliza `MedidaCorrectiva`/`OrdenComparendo` como orígenes opcionales. Ver [`2026-09-22-reporte-rnmc.md`](ajustes/2026-09-22-reporte-rnmc.md).

**Bloque 5 (Recepción y Clasificación de Actuaciones RNMC) — hecho. Inventario de los 28 BPMN completo (28/28).** Se confirmó y corrigió una premisa inicial: este proceso NO es el mismo que `ReporteRNMC` (que documenta el reporte SALIENTE del municipio hacia el RNMC); son direcciones opuestas del mismo dominio. `ActuacionRNMC` (la entrante) es diseño propio basado en `rnmc.json` (módulo lateral del repo fuente, sin ficha en `domain.json` central), reutilizando `OrdenComparendo`, `Recurso` y `DecisionRutaJuridica` como referencias cruzadas opcionales en vez de duplicar campos. El diagrama tenía una anomalía (`status: "ACTIVO"` pero `active: false` en `config.json`, único caso así) que se decidió no investigar más y construir de todas formas. `ReporteRNMC` (la entidad de salida) queda fuera de este bloque por decisión explícita del usuario — sigue pendiente como ajuste aparte. Ver [`2026-09-22-recepcion-clasificacion-actuaciones-rnmc.md`](ajustes/2026-09-22-recepcion-clasificacion-actuaciones-rnmc.md).

Vacíos reales detectados en el modelo fuente hasta ahora (no inventar, confirmar antes de dar por definitivo): `estados.md` no define catálogo oficial de estados para `OrdenPolicia` ni tenía uno para `SuspensionAudiencia` (ambos con estados propuestos, a validar); `ActuacionMaltratoAnimal` es diseño propio, sin respaldo en `domain.json`; FILMA sigue sin significado institucional confirmado en ningún archivo del repo fuente; ninguno de varios BPMN N3 usa `callActivity` de forma consistente (algunos solo referencian el subproceso siguiente en texto); `formatos.json` no tiene ningún formato IV-F confirmado para Determinación ni para Gestión y Ejecución de Medidas Correctivas.

### Fase 3 — Medidas correctivas, cierre formal y RNMC 🔲 No iniciada
- `MedidaCorrectiva` + `EjecucionMedidaCorrectiva` + `VerificacionCumplimiento`.
- `CierreExpediente` con checklist de pendientes (hoy `ActuoArchivo` cierra sin verificar medidas/recursos/notificaciones pendientes).
- `ActuacionRNMC` — solo si la Alcaldía confirma el mecanismo de integración; el modelo marca esto explícitamente como "por validar", no debe automatizarse sin confirmación institucional.

## Lo que el modelo dice que NO se debe automatizar

El repo fuente es explícito: varias transiciones requieren decisión humana explícita, nunca automática (agrupar casos → abrir expediente; resultado técnico desfavorable → apertura de expediente; auto de archivo → cierre de caso). Y hay puntos marcados "POR VALIDAR" institucionalmente (Formato 022, integración DÉBORA, integración RNMC, FILMA, ALIB/ALIBC) que deben implementarse como campos/catálogos configurables, no como reglas de negocio duras, hasta confirmación de la Alcaldía.

## Convención de seguimiento

Cada cambio que avance este plan debe registrarse en `docs/ajustes/` siguiendo `PLANTILLA-AJUSTE.md`, y este documento debe actualizarse para mover la fase correspondiente de 🔲 a ✅ (o a "en curso") y enlazar el registro nuevo.
