# Consultas SQL — Validación esencial (CRM Alcaldía)

Solo las consultas **necesarias** para comprobar que el flujo del CRM (casos, radicado, asignación, visitas, aprobación, terceros) queda bien guardado en PostgreSQL.

**Dónde está la BD y los archivos (contenedor / volumen):**  
[`ALMACENAMIENTO-BD-Y-ARCHIVOS.md`](ALMACENAMIENTO-BD-Y-ARCHIVOS.md) — sección 0.

**Dónde ejecutar SQL:** Dokploy → servicio **`espocrm-db`** → Terminal  

```bash
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Salir: `\q`

Aquí solo validas **filas** en PostgreSQL. Detalle de PDFs/fotos en disco: el mismo doc de almacenamiento.

---

## Cómo conectarte y tip básico

| Comando | Uso |
|---------|-----|
| `\d "case"` | Columnas de casos |
| `\d acta_visita` | Columnas de actas |
| `\x` | Ver filas “una debajo de otra” (más legible) |
| `\q` | Salir |

**Importante**

- La tabla de casos se llama `"case"` (siempre con comillas).
- Filtra siempre `deleted = false` (EspoCRM no borra filas; las marca).
- Campos custom en BD: `cNumeroRadicado` → `c_numero_radicado`.

---

## 1. Tablas que usa este CRM (qué guarda cada una)

Estas son las tablas **de negocio** del flujo que estás usando. El resto son del núcleo EspoCRM (no hace falta consultarlas a diario).

| Tabla | Qué guarda | Relación con el flujo |
|-------|------------|------------------------|
| **`"case"`** | La **queja ambiental** (caso): estado, radicado, expediente, asignación, fechas, datos del Excel Alcaldía, peticionario/perjudicante embebidos | Centro de todo el trámite |
| **`acta_visita`** | Cada **visita de campo**: número de visita (1, 2, 3…), estado del acta (`Pendiente` / `Diligenciada` / `Aprobada`), textos del acta, PDF generado, vínculo al caso | Panel Acta de visita |
| **`asignacion_historial`** | Historial de **asignaciones / reasignaciones** de patrullero (quién, a quién, motivo) | Panel Asignación |
| **`comunicacion_caso`** | **Comunicaciones** del caso (citaciones, oficios, llamadas, etc.) | Panel Comunicaciones |
| **`actuo_archivo`** | **Auto de archivo** del cierre | Cierre / archivo |
| **`contact`** | **Personas naturales** (peticionario / perjudicante cuando aplica) | Terceros |
| **`account`** | **Personas jurídicas / empresas** (NIT, razón social) | Terceros |
| **`document`** | Documentos del CRM (plantillas oficiales + documentos ligados) | Documentos |
| **`attachment`** | Archivos físicos (PDF, imágenes, Excel) en disco/storage | Adjuntos de actas, formatos, Excel |
| **`notification`** | Avisos de la **campana** (asignación, vencimientos, etc.) | Notificaciones |
| **`"user"`** | Usuarios del sistema (inspeccion, radicacion, patrullaje…) | Quién opera |
| **`role`** | Roles (Inspección, Radicación, Asignación, Patrullaje) | Permisos |
| **`next_number`** | Consecutivos de radicado/expediente | Al radicar |

### Columnas clave (las que más vas a mirar)

**`"case"`**

| Columna | Significado |
|---------|-------------|
| `status` | Estado del caso (`Pendiente de radicacion`, `Radicado`, `Asignado`, `Visita realizada`, `Visita aprobada`, `Finalizado`, `Proceso cerrado`, `En proceso de otra visita`…) |
| `c_numero_radicado` | Número de radicado |
| `c_expediente` | Expediente |
| `assigned_user_id` | Patrullero asignado |
| `c_fecha_vencimiento` | Fecha de vencimiento (semáforo) |
| `deleted` | `false` = activo |

**`acta_visita`**

| Columna | Significado |
|---------|-------------|
| `case_id` | Caso al que pertenece |
| `numero_visita` | Orden de la visita (1, 2, 3…) |
| `estado` | Estado del **acta** (`Pendiente`, `Diligenciada`, `Aprobada`) |
| `objeto_visita`, `situacion_encontrada`, `conclusion`, etc. | Contenido diligenciado |
| `c_formato_acta_visita_pdf_id` | PDF generado (id en `attachment`) |
| `numero_radicado` / `expediente` | Copia informativa desde el caso |

---

## 2. Conteos rápidos — ¿hay datos?

```sql
SELECT 'casos' AS entidad, COUNT(*) AS total
FROM "case" WHERE deleted = false
UNION ALL
SELECT 'actas_visita', COUNT(*) FROM acta_visita WHERE deleted = false
UNION ALL
SELECT 'asignaciones', COUNT(*) FROM asignacion_historial WHERE deleted = false
UNION ALL
SELECT 'comunicaciones', COUNT(*) FROM comunicacion_caso WHERE deleted = false
UNION ALL
SELECT 'autos_archivo', COUNT(*) FROM actuo_archivo WHERE deleted = false
UNION ALL
SELECT 'contactos', COUNT(*) FROM contact WHERE deleted = false
UNION ALL
SELECT 'empresas', COUNT(*) FROM account WHERE deleted = false
UNION ALL
SELECT 'usuarios', COUNT(*) FROM "user" WHERE deleted = false AND type <> 'system';
```

---

## 3. Casos — estado, radicado y asignación

```sql
SELECT
    c.id,
    c.status AS estado_caso,
    c.c_numero_radicado AS radicado,
    c.c_expediente AS expediente,
    u.user_name AS asignado_a,
    c.created_at
FROM "case" c
LEFT JOIN "user" u
    ON u.id = c.assigned_user_id AND u.deleted = false
WHERE c.deleted = false
ORDER BY c.created_at DESC
LIMIT 30;
```

### Embudo por estado del caso

```sql
SELECT status AS estado_caso, COUNT(*) AS total
FROM "case"
WHERE deleted = false
GROUP BY status
ORDER BY total DESC;
```

---

## 4. Actas de visita — número y estado (lo más importante del panel)

Sí: el **estado del acta** se guarda en BD (`acta_visita.estado`).

```sql
SELECT
    av.id,
    av.case_id,
    av.numero_visita,
    av.estado AS estado_acta,
    av.numero_radicado,
    LEFT(COALESCE(av.objeto_visita, ''), 50) AS objeto,
    (av.c_formato_acta_visita_pdf_id IS NOT NULL) AS tiene_pdf,
    av.created_at
FROM acta_visita av
WHERE av.deleted = false
ORDER BY av.case_id, av.numero_visita NULLS LAST, av.created_at;
```

### Conteo por estado de acta

```sql
SELECT estado AS estado_acta, COUNT(*) AS total
FROM acta_visita
WHERE deleted = false
GROUP BY estado
ORDER BY total DESC;
```

### ¿El contenido del acta quedó guardado?

```sql
SELECT
    id,
    numero_visita,
    estado,
    (objeto_visita IS NOT NULL AND TRIM(objeto_visita) <> '') AS tiene_objeto,
    (situacion_encontrada IS NOT NULL AND TRIM(situacion_encontrada) <> '') AS tiene_situacion,
    (analisis_situacion IS NOT NULL AND TRIM(analisis_situacion) <> '') AS tiene_analisis,
    (conclusion IS NOT NULL AND TRIM(conclusion) <> '') AS tiene_conclusion,
    (c_formato_acta_visita_pdf_id IS NOT NULL) AS tiene_pdf
FROM acta_visita
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 30;
```

---

## 5. Caso + sus visitas juntas (validar 1, 2, 3… y aprobación)

```sql
SELECT
    c.c_numero_radicado AS radicado,
    c.status AS estado_caso,
    u.user_name AS patrullero,
    av.numero_visita,
    av.estado AS estado_acta,
    av.created_at AS acta_creada
FROM "case" c
LEFT JOIN "user" u
    ON u.id = c.assigned_user_id AND u.deleted = false
LEFT JOIN acta_visita av
    ON av.case_id = c.id AND av.deleted = false
WHERE c.deleted = false
ORDER BY c.created_at DESC, av.numero_visita NULLS LAST;
```

### Solo actas aprobadas

```sql
SELECT id, case_id, numero_visita, estado, created_at, modified_at
FROM acta_visita
WHERE deleted = false
  AND estado = 'Aprobada'
ORDER BY modified_at DESC;
```

### Casos en Visita realizada listos para que Inspección apruebe

(radicado + asignado + estado Visita realizada)

```sql
SELECT
    c.id,
    c.c_numero_radicado,
    c.status,
    u.user_name AS asignado,
    COUNT(av.id) AS num_actas
FROM "case" c
LEFT JOIN "user" u
    ON u.id = c.assigned_user_id AND u.deleted = false
LEFT JOIN acta_visita av
    ON av.case_id = c.id AND av.deleted = false
WHERE c.deleted = false
  AND c.status = 'Visita realizada'
  AND (
        TRIM(COALESCE(c.c_numero_radicado, '')) <> ''
     OR TRIM(COALESCE(c.c_expediente, '')) <> ''
  )
  AND c.assigned_user_id IS NOT NULL
GROUP BY c.id, c.c_numero_radicado, c.status, u.user_name
ORDER BY c.created_at DESC;
```

---

## 6. Un caso concreto (cambia el radicado)

```sql
SELECT id, status, c_numero_radicado, c_expediente, assigned_user_id, created_at
FROM "case"
WHERE deleted = false
  AND c_numero_radicado = 'PON_AQUI_EL_RADICADO';
```

```sql
SELECT numero_visita, estado, objeto_visita IS NOT NULL AS con_contenido, created_at
FROM acta_visita
WHERE deleted = false
  AND case_id = (
      SELECT id FROM "case"
      WHERE deleted = false
        AND c_numero_radicado = 'PON_AQUI_EL_RADICADO'
      LIMIT 1
  )
ORDER BY numero_visita NULLS LAST, created_at;
```

---

## 7. Asignaciones

```sql
SELECT *
FROM asignacion_historial
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 20;
```

Si ves muchas columnas, activa `\x` antes.

---

## 8. Comunicaciones y auto de archivo

```sql
SELECT id, case_id, name, created_at
FROM comunicacion_caso
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 20;
```

```sql
SELECT id, case_id, name, estado, created_at
FROM actuo_archivo
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 20;
```

*(Si `estado` no existe en `actuo_archivo` en tu instancia, usa `\d actuo_archivo` y quita esa columna.)*

---

## 9. Terceros (personas y empresas)

```sql
SELECT id, name, created_at
FROM contact
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 20;
```

```sql
SELECT id, name, created_at
FROM account
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 20;
```

Para ver columnas exactas de documento/NIT:

```text
\d contact
\d account
```

---

## 10. Usuarios y roles (¿los 4 roles siguen ahí?)

```sql
SELECT id, name
FROM role
WHERE deleted = false
  AND name IN ('Inspección', 'Radicación', 'Asignación', 'Patrullaje')
ORDER BY name;
```

```sql
SELECT user_name, first_name, last_name, is_active, type
FROM "user"
WHERE deleted = false
  AND type <> 'system'
ORDER BY user_name;
```

---

## 11. Checklist rápido de validación del flujo

Después de probar en el CRM, verifica en SQL:

| Lo que hiciste en el CRM | Qué mirar en BD |
|--------------------------|-----------------|
| Creaste un caso | Fila nueva en `"case"` con `status` pendiente / equivalente |
| Radicaste | `"case".c_numero_radicado` y `c_expediente` llenos; `status = 'Radicado'` |
| Asignaste patrullero | `"case".assigned_user_id` lleno; fila en `asignacion_historial` |
| Diligenciaste acta | Fila en `acta_visita` con `estado = 'Diligenciada'`, `numero_visita` y textos |
| Agregaste otra visita | Segunda fila en `acta_visita` del mismo `case_id` con `numero_visita = 2` |
| Aprobaste visita | `acta_visita.estado = 'Aprobada'` y `"case".status = 'Visita aprobada'` |
| Generó PDF | `acta_visita.c_formato_acta_visita_pdf_id` no nulo |

---

## 12. Qué NO necesitas consultar a diario

Tablas internas de Espo (`email_*`, `job`, `preferences`, `portal_*`, etc.) no validan el flujo de quejas.  
Si algo del trámite falla, empieza siempre por: **`"case"` → `acta_visita` → `"user"`**.
