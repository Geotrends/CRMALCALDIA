# Consultas SQL — Validación de base de datos (CRM Alcaldía)

Guía de consultas SQL para validar datos y verificar el despliegue en **Dokploy**.

**Entorno:** PostgreSQL 16 en el contenedor `espocrm-db`  
**CRM:** EspoCRM custom — gestión de quejas ambientales

---

## Dónde ejecutar las consultas en Dokploy

### Opción A — Terminal del contenedor de base de datos (recomendada)

1. Entra a **Dokploy** → proyecto **CRM Alcaldía**.
2. Abre el servicio **`espocrm-db`**.
3. Haz clic en **Terminal**.
4. Conéctate a PostgreSQL:

```bash
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

5. Cuando veas el prompt `nombre_base=#`, pega las consultas SQL.
6. Para salir: `\q`

La contraseña es el valor de **`POSTGRES_PASSWORD`** (Dokploy → Environment).

### Opción B — Desde el contenedor `espocrm` (si no tienes terminal en la BD)

```bash
psql -h espocrm-db -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### Prueba de conexión rápida

```sql
SELECT current_database() AS base, current_user AS usuario, NOW() AS ahora;
```

---

## Comandos útiles dentro de `psql`

| Comando | Para qué sirve |
|---------|----------------|
| `\dt` | Listar tablas |
| `\d "case"` | Ver columnas de la tabla de casos |
| `\d acta_visita` | Ver columnas de actas de visita |
| `\x` | Vista expandida (filas con muchos campos) |
| `\timing` | Mostrar tiempo de ejecución |
| `\q` | Salir |

---

## Convenciones importantes

| Tema | Detalle |
|------|---------|
| Tabla de casos | Se llama `"case"` (palabra reservada). Siempre usar comillas dobles. |
| Borrado lógico | EspoCRM marca `deleted = true`. Filtra `deleted = false` en casi todas las consultas. |
| IDs | Formato EspoCRM de 17 caracteres (ej. `664a1b2c3d4e5f678`). |
| Campos custom | Prefijo `c_` en BD (`cNumeroRadicado` → `c_numero_radicado`). |
| Fechas | `created_at` / `modified_at` en UTC; `c_fecha_caso` según zona horaria del CRM. |

---

## 0. Verificación post-deploy en Dokploy

Ejecuta estas consultas después de un **Redeploy** para confirmar que la base de datos está sana.

### 0.1 Resumen ejecutivo del sistema

```sql
SELECT 'case' AS entidad, COUNT(*) AS total
FROM "case" WHERE deleted = false
UNION ALL
SELECT 'acta_visita', COUNT(*) FROM acta_visita WHERE deleted = false
UNION ALL
SELECT 'actuo_archivo', COUNT(*) FROM actuo_archivo WHERE deleted = false
UNION ALL
SELECT 'comunicacion_caso', COUNT(*) FROM comunicacion_caso WHERE deleted = false
UNION ALL
SELECT 'asignacion_historial', COUNT(*) FROM asignacion_historial WHERE deleted = false
UNION ALL
SELECT 'contact', COUNT(*) FROM contact WHERE deleted = false
UNION ALL
SELECT 'account', COUNT(*) FROM account WHERE deleted = false
UNION ALL
SELECT 'document', COUNT(*) FROM document WHERE deleted = false
UNION ALL
SELECT 'notification', COUNT(*) FROM notification WHERE deleted = false
UNION ALL
SELECT 'user', COUNT(*) FROM "user" WHERE deleted = false
UNION ALL
SELECT 'role', COUNT(*) FROM role WHERE deleted = false
UNION ALL
SELECT 'team', COUNT(*) FROM team WHERE deleted = false
ORDER BY entidad;
```

### 0.2 Roles operativos (deben existir los 4)

```sql
SELECT id, name, created_at
FROM role
WHERE deleted = false
  AND name IN ('Inspección', 'Radicación', 'Asignación', 'Patrullaje')
ORDER BY name;
```

Esperado: **4 filas**.

### 0.3 Usuarios activos con rol

```sql
SELECT
    u.user_name,
    u.first_name,
    u.last_name,
    u.is_active,
    r.name AS rol
FROM "user" u
JOIN role_user ru ON ru.user_id = u.id AND ru.deleted = false
JOIN role r ON r.id = ru.role_id AND r.deleted = false
WHERE u.deleted = false
  AND u.type = 'regular'
ORDER BY u.user_name, r.name;
```

### 0.4 Usuarios sin rol (alerta)

```sql
SELECT u.id, u.user_name, u.first_name, u.last_name, u.is_active
FROM "user" u
LEFT JOIN role_user ru ON ru.user_id = u.id AND ru.deleted = false
WHERE u.deleted = false
  AND u.type = 'regular'
  AND ru.id IS NULL;
```

### 0.5 Equipos institucionales

```sql
SELECT
    t.name AS equipo,
    COUNT(tu.user_id) AS usuarios
FROM team t
LEFT JOIN team_user tu ON tu.team_id = t.id AND tu.deleted = false
WHERE t.deleted = false
GROUP BY t.id, t.name
ORDER BY t.name;
```

### 0.6 Job programado de alertas de vencimiento

```sql
SELECT
    id,
    name,
    job,
    status,
    scheduling,
    last_run
FROM scheduled_job
WHERE deleted = false
  AND job = 'CheckCaseVencimientoAlerts';
```

Esperado: `status = Active`, `scheduling = 0 7 * * *`.

### 0.7 Últimas ejecuciones del job de vencimientos

```sql
SELECT
    sjlr.status,
    sjlr.execution_time,
    sjlr.created_at,
    sj.name AS job
FROM scheduled_job_log_record sjlr
JOIN scheduled_job sj ON sj.id = sjlr.scheduled_job_id AND sj.deleted = false
WHERE sjlr.deleted = false
  AND sj.job = 'CheckCaseVencimientoAlerts'
ORDER BY sjlr.created_at DESC
LIMIT 10;
```

### 0.8 Tablas custom del CRM (sanidad estructural)

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'case', 'acta_visita', 'actuo_archivo',
    'comunicacion_caso', 'asignacion_historial'
  )
ORDER BY table_name;
```

Esperado: **5 filas**.

### 0.9 Columnas de seguimiento / Excel en tabla `"case"` (post-deploy)

Tras el deploy `feat-case-campos-excel-en-bd-2026-07-07a` (o posterior), el **Rebuild** automático debe crear estas columnas en `"case"`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'case'
  AND column_name IN (
    'c_correo_perjudicante',
    'c_predio',
    'c_fecha_actuacion_inicial',
    'c_dias_atencion',
    'c_fecha_ultima_actuacion',
    'c_resp_ultima_actuacion_id',
    'c_periodo_atencion',
    'c_inspector_responsable_id',
    'c_resp_proxima_actuacion_id',
    'c_pqrs_cobro',
    'c_alerta_pqrs_cobro',
    'c_observaciones'
  )
ORDER BY column_name;
```

Esperado: **12 filas**. Si faltan columnas, revisa logs del auto-deploy (`Rebuild final...`) o fuerza un **Redeploy con rebuild** en Dokploy.

| Campo CRM | Columna BD | Tipo | Cómo se llena |
|-----------|------------|------|----------------|
| `cCorreoPerjudicante` | `c_correo_perjudicante` | varchar | Manual / lookup del perjudicante |
| `cPredio` | `c_predio` | varchar | Manual |
| `cFechaActuacionInicial` | `c_fecha_actuacion_inicial` | date | Auto al radicar |
| `cDiasAtencion` | `c_dias_atencion` | int | Auto (días desde creación) |
| `cFechaUltimaActuacion` | `c_fecha_ultima_actuacion` | date | Auto al crear o cambiar estado |
| `cRespUltimaActuacion` | `c_resp_ultima_actuacion_id` | FK → `user` | Auto (usuario que actúa) |
| `cPeriodoAtencion` | `c_periodo_atencion` | varchar | Manual |
| `cInspectorResponsable` | `c_inspector_responsable_id` | FK → `user` | Auto (quien registra el caso) |
| `cRespProximaActuacion` | `c_resp_proxima_actuacion_id` | FK → `user` | Auto (usuario asignado) |
| `cPqrsCobro` | `c_pqrs_cobro` | varchar | Manual |
| `cAlertaPqrsCobro` | `c_alerta_pqrs_cobro` | varchar | Manual |
| `cObservaciones` | `c_observaciones` | text | Manual (no se exporta al Excel) |

---

## 1. Casos — listado y estados

### Tabla completa de casos (todos los campos)

Para ver **todas las columnas** de la tabla `"case"`:

```sql
-- Todos los casos activos (sin borrado lógico)
SELECT *
FROM "case"
WHERE deleted = false
ORDER BY created_at DESC;
```

```sql
-- Últimos 20 casos (tabla completa)
SELECT *
FROM "case"
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 20;
```

```sql
-- Un caso por radicado (tabla completa) — cambia el valor
SELECT *
FROM "case"
WHERE deleted = false
  AND c_numero_radicado = 'ENV-AIR-001-2026';
```

```sql
-- Un caso por ID (tabla completa) — cambia el ID
SELECT *
FROM "case"
WHERE deleted = false
  AND id = 'CASE_ID_AQUI';
```

> **Tip en `psql`:** con muchas columnas activa la vista expandida antes de consultar:
>
> ```
> \x
> ```
>
> Cada fila se muestra en bloque vertical (más legible). Para volver al modo tabla: `\x` otra vez.

### Listar nombres de todas las columnas de `"case"`

```sql
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'case'
ORDER BY ordinal_position;
```

### Últimos 20 casos creados (resumen rápido)

Si solo necesitas un vistazo rápido sin todas las columnas:

```sql
SELECT
    c.id,
    c.c_numero_radicado,
    c.c_expediente,
    c.status,
    c.c_fecha_caso,
    c.c_nombre_peticionario,
    c.c_apellido_peticionario,
    c.c_recurso_tema,
    u.user_name AS asignado_a,
    cb.user_name AS creado_por,
    c.created_at
FROM "case" c
LEFT JOIN "user" u ON u.id = c.assigned_user_id AND u.deleted = false
LEFT JOIN "user" cb ON cb.id = c.created_by_id AND cb.deleted = false
WHERE c.deleted = false
ORDER BY c.created_at DESC
LIMIT 20;
```

### Casos por estado (embudo)

```sql
SELECT
    status,
    COUNT(*) AS cantidad
FROM "case"
WHERE deleted = false
GROUP BY status
ORDER BY cantidad DESC;
```

Estados esperados del flujo:

- `Pendiente de radicacion`
- `Radicado`
- `Asignado`
- `En proceso`
- `Visita realizada`
- `Visita aprobada`
- `Finalizado`
- `Proceso cerrado`

### Un caso por número de radicado

```sql
-- Tabla completa — cambia el valor del radicado
SELECT *
FROM "case"
WHERE deleted = false
  AND c_numero_radicado = 'ENV-AIR-001-2026';
```

---

## 2. Validación de campos del caso

### Casos con datos mínimos incompletos

```sql
SELECT
    id,
    c_numero_radicado,
    status,
    c_fecha_caso,
    c_tipo_persona_peticionario,
    c_documento_peticionario,
    c_nombre_peticionario,
    (description IS NULL OR TRIM(description) = '') AS sin_descripcion,
    created_at
FROM "case"
WHERE deleted = false
  AND (
        c_fecha_caso IS NULL
     OR c_documento_peticionario IS NULL OR TRIM(c_documento_peticionario) = ''
     OR c_nombre_peticionario IS NULL OR TRIM(c_nombre_peticionario) = ''
     OR description IS NULL OR TRIM(description) = ''
  )
ORDER BY created_at DESC;
```

### Radicación y expediente

```sql
SELECT
    id,
    c_numero_radicado,
    c_expediente,
    c_radicado_modo,
    c_radicado_siglas,
    c_radicado_anio,
    status,
    created_at
FROM "case"
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 30;
```

### Radicados duplicados (no debería haber)

```sql
SELECT c_numero_radicado, COUNT(*) AS veces
FROM "case"
WHERE deleted = false
  AND c_numero_radicado IS NOT NULL
  AND TRIM(c_numero_radicado) <> ''
GROUP BY c_numero_radicado
HAVING COUNT(*) > 1;
```

### Peticionario e infractor

```sql
SELECT
    id,
    c_numero_radicado,
    c_tipo_persona_peticionario,
    c_documento_peticionario,
    c_nombre_peticionario,
    c_apellido_peticionario,
    c_telefono_peticionario,
    c_direccion_peticionario,
    c_barrio_peticionario,
    c_tipo_persona_perjudicante,
    c_documento_perjudicante,
    c_nombre_perjudicante,
    c_apellido_perjudicante,
    c_correo_perjudicante,
    contact_id AS contacto_peticionario_vinculado,
    c_perjudicante_contact_id,
    c_perjudicante_cuenta_id
FROM "case"
WHERE deleted = false
ORDER BY modified_at DESC
LIMIT 20;
```

### Asignación y reasignación

```sql
SELECT
    c.c_numero_radicado,
    c.status,
    u.user_name AS patrullero_asignado,
    c.c_motivo_reasignacion,
    c.modified_at
FROM "case" c
LEFT JOIN "user" u ON u.id = c.assigned_user_id AND u.deleted = false
WHERE c.deleted = false
  AND c.assigned_user_id IS NOT NULL
ORDER BY c.modified_at DESC;
```

### Semáforo de vencimientos

```sql
SELECT
    c_numero_radicado,
    status,
    c_fecha_vencimiento,
    CASE
        WHEN c_fecha_vencimiento < CURRENT_DATE THEN 'Vencido'
        WHEN c_fecha_vencimiento <= CURRENT_DATE + INTERVAL '3 days' THEN 'Próximo a vencer'
        ELSE 'Al día'
    END AS semaforo
FROM "case"
WHERE deleted = false
  AND c_fecha_vencimiento IS NOT NULL
  AND status NOT IN ('Finalizado', 'Proceso cerrado')
ORDER BY c_fecha_vencimiento;
```

### Casos vencidos (para alertas)

```sql
SELECT
    c_numero_radicado,
    status,
    c_fecha_vencimiento,
    u.user_name AS responsable
FROM "case" c
LEFT JOIN "user" u ON u.id = c.assigned_user_id AND u.deleted = false
WHERE c.deleted = false
  AND c_fecha_vencimiento < CURRENT_DATE
  AND status NOT IN ('Finalizado', 'Proceso cerrado')
ORDER BY c_fecha_vencimiento;
```

### Seguimiento y columnas del Excel (campos persistidos en BD)

Vista alineada con las columnas que exporta `excelAlcaldia.xlsx`:

```sql
SELECT
    c.c_numero_radicado,
    c.c_expediente,
    c.status,
    c.c_fecha_caso AS fecha_ingreso,
    c.c_predio,
    c.c_fecha_actuacion_inicial,
    c.c_dias_atencion,
    c.c_fecha_ultima_actuacion,
    c.c_ultima_actuacion,
    ru.user_name AS resp_ultima_actuacion,
    c.c_periodo_atencion,
    ir.user_name AS inspector_responsable,
    c.c_proxima_actuacion,
    rp.user_name AS resp_proxima_actuacion,
    c.c_pqrs_cobro,
    c.c_alerta_pqrs_cobro,
    c.c_observaciones,
    c.c_correo_perjudicante,
    c.modified_at
FROM "case" c
LEFT JOIN "user" ru ON ru.id = c.c_resp_ultima_actuacion_id AND ru.deleted = false
LEFT JOIN "user" ir ON ir.id = c.c_inspector_responsable_id AND ir.deleted = false
LEFT JOIN "user" rp ON rp.id = c.c_resp_proxima_actuacion_id AND rp.deleted = false
WHERE c.deleted = false
ORDER BY c.modified_at DESC
LIMIT 20;
```

### Casos radicados sin fecha de actuación inicial (deberían tenerla)

```sql
SELECT
    id,
    c_numero_radicado,
    status,
    c_fecha_actuacion_inicial,
    c_fecha_caso,
    created_at
FROM "case"
WHERE deleted = false
  AND c_numero_radicado IS NOT NULL
  AND TRIM(c_numero_radicado) <> ''
  AND status <> 'Pendiente de radicacion'
  AND c_fecha_actuacion_inicial IS NULL
ORDER BY created_at DESC;
```

### Casos sin inspector responsable (deberían tenerlo tras crear)

```sql
SELECT
    id,
    c_numero_radicado,
    status,
    c_inspector_responsable_id,
    created_by_id,
    created_at
FROM "case"
WHERE deleted = false
  AND c_inspector_responsable_id IS NULL
ORDER BY created_at DESC;
```

### Comparar responsables persistidos vs usuarios del sistema

```sql
SELECT
    c.c_numero_radicado,
    c.status,
    cb.user_name AS creado_por,
    ir.user_name AS inspector_bd,
    ru.user_name AS resp_ultima_bd,
    asg.user_name AS asignado_actual,
    rp.user_name AS resp_proxima_bd,
    c.c_dias_atencion
FROM "case" c
LEFT JOIN "user" cb ON cb.id = c.created_by_id AND cb.deleted = false
LEFT JOIN "user" ir ON ir.id = c.c_inspector_responsable_id AND ir.deleted = false
LEFT JOIN "user" ru ON ru.id = c.c_resp_ultima_actuacion_id AND ru.deleted = false
LEFT JOIN "user" asg ON asg.id = c.assigned_user_id AND asg.deleted = false
LEFT JOIN "user" rp ON rp.id = c.c_resp_proxima_actuacion_id AND rp.deleted = false
WHERE c.deleted = false
ORDER BY c.modified_at DESC
LIMIT 20;
```

---

## 3. Actas de visita

```sql
SELECT
    av.id,
    av.numero_radicado,
    av.expediente,
    av.estado,
    av.modo_diligenciamiento,
    av.fecha_visita,
    av.case_id,
    c.status AS estado_caso,
    av.c_formato_acta_visita_pdf_id,
    av.created_at
FROM acta_visita av
LEFT JOIN "case" c ON c.id = av.case_id AND c.deleted = false
WHERE av.deleted = false
ORDER BY av.created_at DESC
LIMIT 20;
```

### Casos con cantidad de actas

```sql
SELECT
    c.c_numero_radicado,
    COUNT(av.id) AS actas
FROM "case" c
JOIN acta_visita av ON av.case_id = c.id AND av.deleted = false
WHERE c.deleted = false
GROUP BY c.c_numero_radicado
ORDER BY actas DESC;
```

### Actas sin PDF generado

```sql
SELECT id, numero_radicado, case_id, estado, created_at
FROM acta_visita
WHERE deleted = false
  AND c_formato_acta_visita_pdf_id IS NULL;
```

---

## 4. Autos de archivo (ActuoArchivo)

```sql
SELECT
    aa.id,
    aa.numero_radicado,
    aa.fecha_auto,
    aa.estado,
    aa.motivo_archivo,
    aa.case_id,
    aa.c_formato_actuo_archivo_pdf_id,
    aa.created_at
FROM actuo_archivo aa
WHERE aa.deleted = false
ORDER BY aa.created_at DESC
LIMIT 20;
```

### Casos finalizados sin acto de archivo

```sql
SELECT
    c.id,
    c.c_numero_radicado,
    c.status
FROM "case" c
LEFT JOIN actuo_archivo aa ON aa.case_id = c.id AND aa.deleted = false
WHERE c.deleted = false
  AND c.status IN ('Finalizado', 'Proceso cerrado')
  AND aa.id IS NULL;
```

---

## 5. Comunicaciones del caso

```sql
SELECT
    cc.id,
    cc.numero_radicado,
    cc.tipo,
    cc.fecha,
    cc.destinatario,
    cc.asunto,
    cc.es_respuesta_final,
    cc.case_id,
    u.user_name AS registrado_por,
    cc.created_at
FROM comunicacion_caso cc
LEFT JOIN "user" u ON u.id = cc.created_by_id AND u.deleted = false
WHERE cc.deleted = false
ORDER BY cc.created_at DESC
LIMIT 30;
```

### Comunicaciones por tipo

```sql
SELECT tipo, COUNT(*) AS cantidad
FROM comunicacion_caso
WHERE deleted = false
GROUP BY tipo
ORDER BY cantidad DESC;
```

### Comunicaciones huérfanas (sin caso)

```sql
SELECT id, numero_radicado, asunto, case_id
FROM comunicacion_caso
WHERE deleted = false
  AND (case_id IS NULL OR case_id = '');
```

---

## 6. Historial de asignaciones

```sql
SELECT
    ah.fecha,
    ah.numero_radicado,
    c.status AS estado_caso_actual,
    ap.user_name AS quien_asigno,
    ra.user_name AS responsable_anterior,
    rn.user_name AS responsable_nuevo,
    ah.motivo
FROM asignacion_historial ah
LEFT JOIN "case" c ON c.id = ah.case_id AND c.deleted = false
LEFT JOIN "user" ap ON ap.id = ah.asignado_por_id AND ap.deleted = false
LEFT JOIN "user" ra ON ra.id = ah.responsable_anterior_id AND ra.deleted = false
LEFT JOIN "user" rn ON rn.id = ah.responsable_nuevo_id AND rn.deleted = false
WHERE ah.deleted = false
ORDER BY ah.fecha DESC
LIMIT 30;
```

---

## 7. Documentos y formatos PDF

### Documentos por categoría

```sql
SELECT
    c_categoria,
    COUNT(*) AS cantidad
FROM document
WHERE deleted = false
GROUP BY c_categoria
ORDER BY cantidad DESC;
```

### Casos con PDF de solicitud

```sql
SELECT
    c.c_numero_radicado,
    c.status,
    d.name AS documento,
    d.c_categoria,
    d.created_at
FROM "case" c
JOIN document d ON d.id = c.c_formato_solicitud_pdf_id AND d.deleted = false
WHERE c.deleted = false
ORDER BY d.created_at DESC
LIMIT 20;
```

### Casos radicados sin PDF de solicitud

```sql
SELECT id, c_numero_radicado, status, c_formato_solicitud_pdf_id
FROM "case"
WHERE deleted = false
  AND c_numero_radicado IS NOT NULL
  AND TRIM(c_numero_radicado) <> ''
  AND status <> 'Pendiente de radicacion'
  AND c_formato_solicitud_pdf_id IS NULL;
```

---

## 8. Terceros (Contact / Account)

### Contactos — personas naturales

```sql
SELECT
    id,
    first_name,
    last_name,
    c_tipo_de_documento,
    c_numero_de_documento,
    c_barrio_residencia,
    c_municipio,
    created_at
FROM contact
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 20;
```

### Documentos duplicados en contactos

```sql
SELECT c_numero_de_documento, COUNT(*) AS veces
FROM contact
WHERE deleted = false
  AND c_numero_de_documento IS NOT NULL
  AND TRIM(c_numero_de_documento) <> ''
GROUP BY c_numero_de_documento
HAVING COUNT(*) > 1;
```

### Cuentas — personas jurídicas (NIT)

```sql
SELECT
    id,
    name,
    c_nit,
    c_sector_economico,
    created_at
FROM account
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 20;
```

### NIT duplicados

```sql
SELECT c_nit, COUNT(*) AS veces
FROM account
WHERE deleted = false
  AND c_nit IS NOT NULL
  AND TRIM(c_nit) <> ''
GROUP BY c_nit
HAVING COUNT(*) > 1;
```

### Terceros vinculados a casos

```sql
SELECT
    c.c_numero_radicado,
    c.c_documento_peticionario,
    ct.first_name || ' ' || ct.last_name AS contacto_vinculado,
    ct.c_numero_de_documento AS doc_contacto
FROM "case" c
LEFT JOIN contact ct ON ct.id = c.contact_id AND ct.deleted = false
WHERE c.deleted = false
  AND c.contact_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 20;
```

---

## 9. Notificaciones

### Últimas notificaciones generadas

```sql
SELECT
    n.created_at,
    u.user_name AS destinatario,
    n.type,
    n.read AS leida,
    LEFT(n.message, 120) AS mensaje_corto,
    n.related_type,
    n.related_id
FROM notification n
LEFT JOIN "user" u ON u.id = n.user_id AND u.deleted = false
WHERE n.deleted = false
ORDER BY n.created_at DESC
LIMIT 30;
```

### Notificaciones no leídas por usuario

```sql
SELECT
    u.user_name,
    COUNT(*) AS sin_leer
FROM notification n
JOIN "user" u ON u.id = n.user_id AND u.deleted = false
WHERE n.deleted = false
  AND n.read = false
GROUP BY u.user_name
ORDER BY sin_leer DESC;
```

---

## 10. Integridad entre entidades

### Registros huérfanos (sin caso válido)

```sql
SELECT 'acta_visita' AS origen, av.id, av.case_id
FROM acta_visita av
LEFT JOIN "case" c ON c.id = av.case_id AND c.deleted = false
WHERE av.deleted = false AND c.id IS NULL

UNION ALL

SELECT 'actuo_archivo', aa.id, aa.case_id
FROM actuo_archivo aa
LEFT JOIN "case" c ON c.id = aa.case_id AND c.deleted = false
WHERE aa.deleted = false AND c.id IS NULL

UNION ALL

SELECT 'comunicacion_caso', cc.id, cc.case_id
FROM comunicacion_caso cc
LEFT JOIN "case" c ON c.id = cc.case_id AND c.deleted = false
WHERE cc.deleted = false AND c.id IS NULL

UNION ALL

SELECT 'asignacion_historial', ah.id, ah.case_id
FROM asignacion_historial ah
LEFT JOIN "case" c ON c.id = ah.case_id AND c.deleted = false
WHERE ah.deleted = false AND c.id IS NULL;
```

### Radicado en caso vs radicado en acta (deben coincidir)

```sql
SELECT
    c.id,
    c.c_numero_radicado AS radicado_caso,
    av.numero_radicado AS radicado_acta,
    av.id AS acta_id
FROM "case" c
JOIN acta_visita av ON av.case_id = c.id AND av.deleted = false
WHERE c.deleted = false
  AND COALESCE(c.c_numero_radicado, '') <> COALESCE(av.numero_radicado, '');
```

---

## 11. Actividad reciente (auditoría)

```sql
SELECT
    ahr.created_at,
    u.user_name,
    ahr.action,
    ahr.target_id AS case_id,
    c.c_numero_radicado
FROM action_history_record ahr
LEFT JOIN "user" u ON u.id = ahr.user_id AND u.deleted = false
LEFT JOIN "case" c ON c.id = ahr.target_id AND c.deleted = false
WHERE ahr.deleted = false
  AND ahr.target_type = 'Case'
ORDER BY ahr.created_at DESC
LIMIT 30;
```

---

## 12. Consultas por ID de caso

El ID aparece en la URL del CRM: `#Case/view/XXXXXXXXXXXXXXX`

Sustituye `'CASE_ID_AQUI'` por el ID real:

```sql
SELECT * FROM "case" WHERE id = 'CASE_ID_AQUI' AND deleted = false;

SELECT * FROM acta_visita WHERE case_id = 'CASE_ID_AQUI' AND deleted = false;
SELECT * FROM actuo_archivo WHERE case_id = 'CASE_ID_AQUI' AND deleted = false;
SELECT * FROM comunicacion_caso WHERE case_id = 'CASE_ID_AQUI' AND deleted = false;
SELECT * FROM asignacion_historial WHERE case_id = 'CASE_ID_AQUI' AND deleted = false;
```

### Vista consolidada de un caso

```sql
SELECT
    c.id,
    c.c_numero_radicado,
    c.c_expediente,
    c.status,
    c.c_fecha_caso,
    c.c_fecha_vencimiento,
    c.c_recurso_tema,
    c.c_predio,
    c.c_fecha_actuacion_inicial,
    c.c_dias_atencion,
    c.c_fecha_ultima_actuacion,
    ir.user_name AS inspector_responsable,
    ru.user_name AS resp_ultima_actuacion,
    rp.user_name AS resp_proxima_actuacion,
    u.user_name AS asignado,
    (SELECT COUNT(*) FROM acta_visita av WHERE av.case_id = c.id AND av.deleted = false) AS actas,
    (SELECT COUNT(*) FROM actuo_archivo aa WHERE aa.case_id = c.id AND aa.deleted = false) AS actuos,
    (SELECT COUNT(*) FROM comunicacion_caso cc WHERE cc.case_id = c.id AND cc.deleted = false) AS comunicaciones,
    (SELECT COUNT(*) FROM asignacion_historial ah WHERE ah.case_id = c.id AND ah.deleted = false) AS reasignaciones
FROM "case" c
LEFT JOIN "user" u ON u.id = c.assigned_user_id AND u.deleted = false
LEFT JOIN "user" ir ON ir.id = c.c_inspector_responsable_id AND ir.deleted = false
LEFT JOIN "user" ru ON ru.id = c.c_resp_ultima_actuacion_id AND ru.deleted = false
LEFT JOIN "user" rp ON rp.id = c.c_resp_proxima_actuacion_id AND rp.deleted = false
WHERE c.id = 'CASE_ID_AQUI'
  AND c.deleted = false;
```

---

## 13. Checklist rápido — acción en UI vs validación en BD

| Acción en el CRM | Qué validar en BD |
|------------------|-------------------|
| Crear caso | Nueva fila en `"case"`, `c_fecha_caso`, peticionario, `status = Pendiente de radicacion`, `c_inspector_responsable_id` = quien crea, `c_dias_atencion` calculado |
| Radicar | `c_numero_radicado`, `c_expediente`, cambio de `status`, `c_formato_solicitud_pdf_id`, `c_fecha_actuacion_inicial` |
| Cambiar estado | `c_fecha_ultima_actuacion`, `c_resp_ultima_actuacion_id`, `c_dias_atencion` actualizado |
| Asignar patrullero | `assigned_user_id`, `c_resp_proxima_actuacion_id`, fila en `asignacion_historial` si hubo reasignación |
| Acta de visita | Fila en `acta_visita` con `case_id`, `c_formato_acta_visita_pdf_id` |
| Auto de archivo | Fila en `actuo_archivo` con `case_id` |
| Comunicación | Fila en `comunicacion_caso` con `case_id` |
| Notificación | Fila en `notification` con `related_type` y `user_id` |
| Crear usuario con rol | Fila en `role_user` enlazando `user` y `role` |

---

## 14. Checklist post-deploy en Dokploy

Después de **Redeploy**, ejecuta en orden:

1. **Conexión:** `SELECT current_database(), current_user, NOW();`
2. **Resumen:** consulta **0.1** (conteos por entidad)
3. **Roles:** consulta **0.2** (4 roles operativos)
4. **Usuarios:** consulta **0.3** (usuarios con rol asignado)
5. **Job vencimientos:** consulta **0.6** (job activo)
6. **Columnas Excel en BD:** consulta **0.9** (12 columnas nuevas en `"case"`)
7. **Integridad:** consulta **10** (registros huérfanos = 0 filas)
8. **Radicados duplicados:** consulta de la sección **2** (= 0 filas)
9. **Seguimiento Excel:** consulta **2** — *Seguimiento y columnas del Excel* (responsables y fechas poblados)

En logs del contenedor `espocrm` debe aparecer:

```
==> Auto-deploy completado.
```

Verificación manual desde el contenedor `espocrm`:

```bash
bash /opt/bootstrap/repo/scripts/verify-custom-deploy.sh
```

---

## Notas finales

- Ejecuta las consultas en la terminal de **`espocrm-db`** en Dokploy (o vía `psql` desde `espocrm`).
- La contraseña está en Dokploy → **Environment** → `POSTGRES_PASSWORD`.
- Si ves 0 filas pero hay datos en el CRM, confirma que estás en el proyecto y base correctos.
- Tras un wipe de datos operativos, quedarán roles, configuración y usuario admin; los conteos de casos/actas serán 0.
- Para exportar resultados a CSV desde `psql`:

```sql
\copy (SELECT c_numero_radicado, status, c_fecha_caso FROM "case" WHERE deleted = false) TO '/tmp/casos.csv' CSV HEADER;
```

> En Dokploy la ruta `/tmp` es temporal dentro del contenedor; descarga el archivo antes de reiniciar el servicio.
