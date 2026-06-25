# Validar datos en la base (consola Dokploy)

Guía para comprobar que lo que ingresan en el CRM **sí quedó guardado** en la base de datos de producción.

> **Solo consultas de lectura.** No ejecutes `DELETE`, `UPDATE` ni `DROP` si no sabe exactamente qué hace el comando.

---

## 1. Entrar a PostgreSQL desde Dokploy

### Paso A — Abrir la consola

1. Entra al panel de **Dokploy** en el navegador.
2. Abre el **proyecto del CRM**.
3. Entra al servicio **`espocrm-db`** (la base de datos).
4. Busca la pestaña **Terminal**, **Console** o **Exec** (el nombre puede variar).
5. Se abre una pantalla negra con un cursor (consola).

### Paso B — Conectar a la base

Escribe esto y presiona **Enter**:

```bash
psql -U espocrm -d espocrm
```

Te pedirá la **contraseña**. Está en Dokploy → mismo proyecto → **Environment** → variable `POSTGRES_PASSWORD` (cópiala y pégala; al escribir no se ve, es normal).

Si conectó bien, verás algo como:

```text
espocrm=#
```

Eso significa que ya estás **dentro** de PostgreSQL.

### Comandos útiles de la consola SQL

| Comando | Para qué sirve |
|---------|----------------|
| `\dt` | Ver lista de tablas |
| `\q` | Salir de PostgreSQL |
| `Ctrl + C` | Cancelar una consulta que se quedó colgada |

---

## 2. Consultas para validar que se guardó la información

Copia y pega cada bloque en la consola (después de `espocrm=#`) y presiona **Enter**.

### ¿Cuántos casos hay en total?

```sql
SELECT COUNT(*) AS total_casos
FROM "case"
WHERE deleted = false;
```

### Últimos 10 casos creados (los más recientes)

```sql
SELECT
    number AS numero,
    status AS estado,
    c_numero_radicado AS radicado,
    c_expediente AS expediente,
    c_nombre_peticionario AS nombre,
    c_apellido_peticionario AS apellido,
    created_at AS creado
FROM "case"
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 10;
```

### Casos por estado (resumen)

```sql
SELECT status AS estado, COUNT(*) AS cantidad
FROM "case"
WHERE deleted = false
GROUP BY status
ORDER BY cantidad DESC;
```

### Casos ya radicados (con número de radicado)

```sql
SELECT
    c_numero_radicado AS radicado,
    c_expediente AS expediente,
    status AS estado,
    c_recurso_tema AS tema,
    modified_at AS ultima_modificacion
FROM "case"
WHERE deleted = false
  AND c_numero_radicado IS NOT NULL
  AND TRIM(c_numero_radicado) <> ''
ORDER BY modified_at DESC
LIMIT 20;
```

### Buscar un caso por radicado (cambia el número)

```sql
SELECT
    number,
    status,
    c_numero_radicado,
    c_expediente,
    c_nombre_peticionario,
    c_apellido_peticionario,
    c_documento_peticionario,
    created_at,
    modified_at
FROM "case"
WHERE deleted = false
  AND c_numero_radicado = 'PON_AQUI_EL_RADICADO';
```

### ¿Qué se guardó hoy?

```sql
SELECT
    number,
    status,
    c_numero_radicado,
    c_expediente,
    created_at,
    modified_at
FROM "case"
WHERE deleted = false
  AND (
    created_at::date = CURRENT_DATE
    OR modified_at::date = CURRENT_DATE
  )
ORDER BY modified_at DESC;
```

### Usuarios activos del CRM

```sql
SELECT
    user_name AS usuario,
    TRIM(CONCAT(first_name, ' ', last_name)) AS nombre,
    is_active AS activo,
    created_at AS creado
FROM "user"
WHERE deleted = false
ORDER BY user_name;
```

### Roles de cada usuario

```sql
SELECT
    u.user_name AS usuario,
    TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS nombre,
    r.name AS rol
FROM "user" u
JOIN role_user ru ON ru.user_id = u.id AND ru.deleted = false
JOIN role r ON r.id = ru.role_id AND r.deleted = false
WHERE u.deleted = false
  AND u.is_active = true
ORDER BY u.user_name, r.name;
```

### Actas de visita guardadas

```sql
SELECT
    name AS titulo,
    numero_radicado AS radicado,
    expediente,
    estado,
    case_id AS id_caso,
    created_at AS creado,
    modified_at AS modificado
FROM acta_visita
WHERE deleted = false
ORDER BY modified_at DESC
LIMIT 15;
```

### Documento del Excel oficial (en módulo Documentos)

```sql
SELECT
    name AS nombre,
    c_categoria AS categoria,
    status AS estado,
    modified_at AS ultima_actualizacion,
    description AS descripcion
FROM document
WHERE deleted = false
  AND c_categoria = 'Excel oficial'
ORDER BY modified_at DESC;
```

### Personas — Contactos registrados (persona natural)

En el menú del CRM aparece como **Contactos** (dentro de Personas).

```sql
SELECT
    c_numero_de_documento AS documento,
    first_name AS nombre,
    last_name AS apellido,
    c_municipio AS municipio,
    created_at AS creado
FROM contact
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 15;
```

### Personas — Cuentas registradas (persona jurídica / empresa)

En el menú del CRM aparece como **Cuentas** (dentro de Personas).

```sql
SELECT
    c_nit AS nit,
    name AS razon_social,
    c_sector_economico AS sector,
    created_at AS creado
FROM account
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 15;
```

### Personas — Contactos y Cuentas juntos (resumen)

```sql
SELECT 'Contacto' AS tipo, c_numero_de_documento AS documento,
       TRIM(CONCAT(first_name, ' ', last_name)) AS nombre, created_at AS creado
FROM contact
WHERE deleted = false

UNION ALL

SELECT 'Cuenta' AS tipo, c_nit AS documento, name AS nombre, created_at AS creado
FROM account
WHERE deleted = false

ORDER BY creado DESC
LIMIT 20;
```

### ¿Cuántas personas hay registradas?

```sql
SELECT
    (SELECT COUNT(*) FROM contact WHERE deleted = false) AS total_contactos,
    (SELECT COUNT(*) FROM account WHERE deleted = false) AS total_cuentas;
```

---

## 3. Cómo interpretar el resultado

| Lo que hiciste en el CRM | Qué deberías ver en la consulta |
|--------------------------|----------------------------------|
| Creaste un caso nuevo | Aparece en **Últimos 10 casos** y sube el **total_casos** |
| Radicaste un caso | Aparece en **Casos ya radicados** con `c_numero_radicado` y `c_expediente` |
| Guardaste un acta | Aparece en **Actas de visita** |
| Se actualizó el Excel | El documento **Excel oficial** tiene `modified_at` reciente |
| Creaste un usuario | Aparece en **Usuarios activos** y en **Roles** |
| Registraste una persona natural | Aparece en **Contactos** |
| Registraste una empresa / jurídica | Aparece en **Cuentas** |

Si creaste algo en el CRM hace unos minutos y **no** sale en estas consultas, avisa a quien administra Dokploy.

---

## 4. Salir

```sql
\q
```

---

*Base de producción: contenedor `espocrm-db`, base `espocrm`, usuario `espocrm`.*
