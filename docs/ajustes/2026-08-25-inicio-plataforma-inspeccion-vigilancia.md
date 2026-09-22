# Portada de inicio para inspección y vigilancia

| Campo | Valor |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado técnicamente en local |
| Versión de despliegue | `front-inicio-plataforma-v1-2026-08-25` |

## Objetivo

Agregar una portada al inicio de la plataforma sin sustituir el Dashboard existente. La pantalla explica el propósito del CRM, el flujo general de atención, los roles operativos y el aporte a la inspección y vigilancia ambiental.

## Alcance funcional

- Se añadió la pestaña **Inicio** como primera pestaña de la vista principal. En el primer acceso posterior al despliegue se abre esta portada; después se conserva la última pestaña seleccionada por cada usuario.
- La portada saluda a la persona autenticada por su nombre antes de presentar el objetivo de la plataforma.
- El Dashboard, Gestión de casos, Agenda e historiales permanecen disponibles y sin cambios en su comportamiento.
- La portada contiene accesos directos al Dashboard y a Gestión de casos.
- Se incluyeron espacios de referencia para guías, videos y manuales, marcados como “Próximamente”; todavía no enlazan a contenido externo ni cargan archivos.

## Contenido presentado

1. Descripción de la plataforma y su propósito.
2. Flujo: registro, radicación, asignación, visita y seguimiento.
3. Responsabilidades de Inspección, Radicación, Asignación y Patrullaje.
4. Beneficios para la inspección y vigilancia: trazabilidad, evidencia y respuesta oportuna.
5. Bloques preparados para el futuro centro de aprendizaje.

## Archivos afectados

| Acción | Archivo | Motivo |
|---|---|---|
| Modificado | `espocrm-custom/files/client/custom/src/views/home.js` | Nueva pestaña, contenido de portada y navegación interna. |
| Modificado | `espocrm-custom/files/client/custom/res/css/05-home.css` | Distribución visual adaptable de la portada. |
| Modificado | `.deploy-version` | Solicita reaplicar el frontend personalizado. |
| Modificado | `docs/ajustes/README.md` | Índice del ajuste. |

## Pendientes para siguientes iteraciones

- Validar y ajustar la redacción con las áreas de Inspección y Vigilancia.
- Definir los enlaces, responsables y formato de las guías, videos y manuales.
- Incorporar contenidos reales al centro de aprendizaje cuando estén aprobados.
- Recoger retroalimentación visual de los usuarios para ajustar jerarquía, colores o bloques de la portada.

## Despliegue y validación

Se ejecutó el flujo `deploy-custom-dokploy.sh`, que copió el custom, reconstruyó los recursos y limpió la caché. También se ejecutó `php bin/command app-check` con resultado correcto. La validación visual con usuarios queda disponible para la siguiente sesión: confirmar el saludo, los accesos al Dashboard y Gestión de casos, y el ajuste de textos si el equipo operativo lo requiere.

## Documentación relacionada

No requiere modificar la guía general del proyecto: este cambio solo agrega contenido de interfaz posterior al inicio de sesión. Este registro será la referencia para las ampliaciones del centro de aprendizaje.
