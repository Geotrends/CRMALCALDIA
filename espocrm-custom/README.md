# espocrm-custom — Código personalizado

Extensión de EspoCRM para el CRM Alcaldía. Se despliega a `custom/Espo/Custom/` en el contenedor.

## Backend (PHP)

```
Hooks/              # Eventos al guardar/crear entidades
  CaseObj/          # Casos: radicado, actas, notificaciones, partes
  ActaVisita/       # Generación de formatos y Excel de acta
  User/             # Sincronización equipos ↔ roles
Tools/              # Lógica de negocio reutilizable
  CaseObj/          # Radicado, cronograma, alertas, formatos, Excel
  Party/            # Personas naturales/jurídicas y expediente
  User/             # Perfiles por rol (AlcaldiaUserProfile)
Controllers/        # Endpoints API extra (Case/action/...)
Classes/            # Filtros, record hooks
Entities/           # Entidades custom (ActaVisita, ComunicacionCaso, ...)
Jobs/               # Tareas programadas (alertas vencimiento)
Resources/
  metadata/         # entityDefs, clientDefs, app config
  layouts/          # Formularios y vistas por entidad
  i18n/             # Traducciones (es_ES, es_MX, en_US)
```

**Nota:** en PHP la entidad Caso se llama `CaseObj` (palabra reservada). En metadata JSON aparece como `Case`.

## Frontend (JS)

```
files/client/custom/
  src/
    views/          # Vistas extendidas (case, acta-visita, home, ...)
    helpers/        # Lógica compartida por rol (radicación, actas, ...)
    loader/         # Parches de carga (i18n, listas)
  res/
    templates/      # Plantillas Handlebars
    css/            # Estilos custom
  dashboard.js      # Tablero gerencial (Home)
```

Los módulos AMD usan el prefijo `custom:` — **no renombrar archivos** sin actualizar todas las dependencias `define(...)`.

## Python (runtime)

```
files/scripts/      # Invocados por PHP al generar PDF/Excel
  fill-formato-solicitud.py
  fill-formato-acta-visita.py
  upsert-crm-excel.py
  ...
```

Herramientas de desarrollo Python van en `scripts/` (raíz del repo), no aquí.

## Plantillas

| Ubicación | Rol |
|-----------|-----|
| `formatos/` (repo raíz) | **Fuente versionada** — Word/Excel oficiales |
| `files/templates/` | Copia en runtime + PDFs generados (no editar manualmente) |

## Hooks de CaseObj (orden aproximado)

Los hooks en `Hooks/CaseObj/` controlan radicado, permisos, notificaciones, vínculos con terceros y exportación Excel. Cada uno tiene `public static int $order` para la secuencia de ejecución.

No mover ni renombrar sin probar: flujo de radicación, actas, asignación de patrullero y alertas de vencimiento.
