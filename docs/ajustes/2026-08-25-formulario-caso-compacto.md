# Formulario compacto para crear Casos

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Desplegado y validado técnicamente |
| Versión de despliegue | `front-formulario-caso-subsecciones-v2-2026-08-25` |

## Diseño aplicado

El formulario se organiza en subsecciones numeradas: Peticionario y contacto, Dirección, Detalle de la queja, Perjudicante y Clasificación y seguimiento. Los tres bloques de digitación inicial se abren por defecto; los demás quedan contraídos, con resumen y control accesible por teclado. El layout efectivo de creación usa `detail.json`, por lo que la división se aplicó también allí.

Los encabezados de estas subsecciones no usan franja lateral; su jerarquía se conserva con superficie suave, borde fino y tipografía.

En creación se ocultan expresamente estado, número de radicado y expediente. El área de los formularios se limita a 1180 px y se centra para evitar tarjetas excesivamente anchas en monitores grandes.

Los campos obligatorios no se marcaron aún: la metadata y el flujo actual permiten guardar todos los campos de creación como opcionales. Antes de añadir asteriscos, se debe acordar cuáles campos deben validarse como requeridos.

## Reglas preservadas

No se crean campos ni tablas. Se conservan las reglas de tipo de persona, búsqueda por documento, dirección estructurada y los flujos de Inspección, Radicación y Asignación.

## Archivos afectados

- `espocrm-custom/Resources/layouts/Case/edit.json`
- `espocrm-custom/files/client/custom/src/helpers/compact-form-sections.js`
- `espocrm-custom/files/client/custom/src/views/case/record/edit.js`
- `espocrm-custom/files/client/custom/res/css/19-form-sections.css`

## Validación

- Sintaxis JavaScript, JSON del layout, despliegue y `php bin/command app-check`: correctos.
- Pendiente: revisión visual y de digitación por los roles operativos en el navegador.
