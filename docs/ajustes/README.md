# Registro de ajustes futuros

Esta carpeta es el registro de trabajo para los cambios realizados **a partir de ahora**. Su propósito es conservar decisiones, alcance, archivos afectados, validación y despliegue de cada ajuste sin reescribir la documentación histórica del proyecto.

## Alcance y relación con la documentación existente

- `README.md` y `docs/GUIA-HANDOFF-PROYECTO.md` siguen siendo las guías generales del proyecto.
- `docs/handoff/` conserva los inventarios técnicos de referencia.
- Los documentos de `docs/` fuera de esta carpeta se actualizan únicamente cuando el ajuste cambie de forma permanente la información que describen (por ejemplo, una regla de negocio, un flujo operativo o un procedimiento de despliegue).
- Esta carpeta no sustituye a esas fuentes: registra qué cambió, por qué y qué documento de referencia debe revisarse o fue corregido.

## Estructura para cada ajuste

Crear un archivo por ajuste con el nombre:

```text
AAAA-MM-DD-descripcion-corta.md
```

Copiar la estructura de [`PLANTILLA-AJUSTE.md`](PLANTILLA-AJUSTE.md). Si varios cambios forman una sola funcionalidad, documentarlos en el mismo archivo mientras se desplieguen y validen juntos.

## Criterios de documentación

Cada registro debe indicar como mínimo:

1. Objetivo y motivo del cambio.
2. Alcance funcional y roles impactados.
3. Archivos modificados, creados o eliminados.
4. Dependencias y riesgos (metadata, hooks, cache, formatos, datos o permisos).
5. Pruebas realizadas y resultado.
6. Pasos de despliegue, incluido el valor nuevo de `.deploy-version` cuando corresponda.
7. Referencias documentales que requieren corrección o actualización.

## Convenciones técnicas que deben preservarse

- Mantener el desarrollo dentro de `espocrm-custom/`; no editar el core de EspoCRM.
- Usar `Resources/metadata/` y `Resources/layouts/` para esquema, permisos y pantallas; PHP para reglas y servicios; `files/client/custom/` para la interfaz.
- Considerar el orden de los hooks de guardado cuando más de uno intervenga sobre una misma entidad.
- Tras cambios de PHP, metadata o frontend, ejecutar el flujo de despliegue que hace `rebuild` y `clear-cache`.
- Actualizar `.deploy-version` en cambios relevantes que requieran que el contenedor reaplique el custom.
- No tratar `sql/esquema.sql` como migración activa: la fuente de verdad de la aplicación es la metadata de EspoCRM y la base de datos en ejecución.

## Índice de ajustes

| Fecha | Ajuste | Estado | Registro |
|---|---|---|---|
| 2026-08-25 | Migración de contenedores a EspoCRM 10.0.6 | Validado localmente | [Registro](2026-08-25-migracion-espocrm-10.0.6.md) |
| 2026-08-25 | Base visual posterior al inicio de sesión | Validado técnicamente | [Registro](2026-08-25-front-post-login-referencia.md) |
| 2026-08-25 | Portada de inicio para inspección y vigilancia | Validado técnicamente | [Registro](2026-08-25-inicio-plataforma-inspeccion-vigilancia.md) |
| 2026-08-25 | Mapa MapLibre agregado por barrio en Dashboard | Validado técnicamente | [Registro](2026-08-25-dashboard-mapa-maplibre.md) |
| 2026-08-25 | Filtros anidados del Dashboard | Validado técnicamente | [Registro](2026-08-25-dashboard-filtros-anidados.md) |
| 2026-08-25 | Datos ficticios para validar Dashboard | Validado localmente | [Registro](2026-08-25-datos-dummy-dashboard.md) |
| 2026-08-25 | Etiquetas numéricas en gráficas del Dashboard | Validado técnicamente | [Registro](2026-08-25-dashboard-etiquetas-numericas.md) |
| 2026-08-25 | Formulario compacto para crear Casos | Validado técnicamente | [Registro](2026-08-25-formulario-caso-compacto.md) |
| 2026-08-25 | Conteo de casos sin radicado en asignación | Validado técnicamente | [Registro](2026-08-25-dashboard-conteo-sin-radicado.md) |
| 2026-08-25 | Entidad Expediente + Auto de Inicio + rol Jurídica | En desarrollo (Fase 1/9) | [Registro](2026-08-25-expediente-autoinicio-rol-juridica.md) |
| 2026-08-25 | Fix controladores custom rotos tras migración a EspoCRM 10.0.6 | Validado localmente | [Registro](2026-08-25-fix-controladores-custom-espocrm10.md) |
| 2026-08-25 | Aprobación de visita por Asignador + notificaciones del flujo de decisión | Validado localmente (Fases 2-3/9) | [Registro](2026-08-25-flujo-decision-asignador-juridica.md) |
| 2026-08-25 | Panel de decisión, bandeja, línea de tiempo dinámica y plazos legales | Validado localmente (Fases 4-7/9) | [Registro](2026-08-25-panel-decision-bandeja-timeline-plazos.md) |
| 2026-08-25 | Expediente con pasos del proceso policivo, cronograma y métrica en dashboard | Validado localmente | [Registro](2026-08-25-plan-expediente-policivo-timeline-dashboard.md) |
| 2026-09-22 | Fase 0 — Unificación de hooks duplicados en Case/ActaVisita | Validado localmente | [Registro](2026-09-22-fase0-unificacion-hooks-duplicados.md) |
| 2026-09-22 | Fase 1 — Entidades GestionTecnica/DecisionRutaJuridica y separación de estados de Case | Validado localmente | [Registro](2026-09-22-fase1-gestion-tecnica-decision-ruta-juridica.md) |
| 2026-09-22 | Destino, Relación de casos, menú y acción "Relacionar con otro caso" | Validado localmente | [Registro](2026-09-22-destino-relacion-casos.md) |
| 2026-09-22 | Roles y usuarios alineados a matriz_roles_v1.0.md (BPMN) | Validado localmente | [Registro](2026-09-22-roles-nombres-bpmn.md) |
| 2026-09-22 | Fase 2 (Recursos Naturales) — entidad RemisionAutoridad | Validado localmente | [Registro](2026-09-22-fase2-recursos-naturales-remision-autoridad.md) |
| 2026-09-22 | Fase 2 (Ambiental Preventiva) — campos de medida preventiva en RemisionAutoridad | Validado localmente | [Registro](2026-09-22-fase2-ambiental-preventiva-medida-preventiva.md) |
| 2026-09-22 | Fase 2 (Proceso Verbal Abreviado) — Audiencia, SuspensionAudiencia, GrabacionAudiencia | Validado localmente | [Registro](2026-09-22-fase2-pva-audiencia.md) |
| 2026-09-22 | Fase 2 (PVA) — OrdenPolicia, MedidaCorrectiva, EjecucionMedidaCorrectiva, NotificacionActo, Recurso, MovimientoExpediente | Validado localmente | [Registro](2026-09-22-fase2-pva-orden-medidas-notificacion-recurso.md) |
| 2026-09-22 | Fase 2 — Convivencia Animal, Registro/Permiso Canino, Maltrato Animal | Validado localmente | [Registro](2026-09-22-fase2-maltrato-convivencia-canino.md) |
| 2026-09-22 | Competencia y Clasificación (ya cubierto) + entidad EvaluacionResultado | Validado localmente | [Registro](2026-09-22-competencia-clasificacion-evaluacion-resultado.md) |
| 2026-09-22 | Gestión Técnica — IntervencionTecnica, ProgramacionVisita, RecomendacionTecnica, Compromiso, VerificacionCumplimiento | Validado localmente | [Registro](2026-09-22-gestion-tecnica-intervencion-recomendacion-verificacion.md) |
| 2026-09-22 | Proceso Verbal Inmediato de Policía — OrdenComparendo, ActuacionPoliciaInmediata | Validado localmente | [Registro](2026-09-22-proceso-verbal-inmediato-policia.md) |
| 2026-09-22 | Ejecución Pecuniaria / Tesorería — entidad ObligacionPecuniaria | Validado localmente | [Registro](2026-09-22-ejecucion-pecuniaria-tesoreria.md) |
| 2026-09-22 | Recepción y Clasificación de Actuaciones RNMC — entidad ActuacionRNMC (28/28) | Validado localmente | [Registro](2026-09-22-recepcion-clasificacion-actuaciones-rnmc.md) |

Cuando se cree un registro, reemplazar la fila de ejemplo o agregar una fila nueva en orden descendente por fecha.
