# Ajuste: base visual posterior al inicio de sesión

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado técnicamente — revisión visual pendiente |
| Alcance | Interfaz posterior al inicio de sesión |
| Referencia | Imagen de dashboard compartida por el equipo |
| Versión de despliegue | `front-post-login-shell-v1-2026-08-25` |

## Objetivo

Acercar la interfaz posterior al inicio de sesión a una experiencia administrativa más cálida y clara: navegación lateral profunda, paneles claros redondeados y acento dorado. La pantalla de inicio de sesión queda fuera de alcance.

## Fase 1: carcasa global

- Fondo verde grisáceo claro para el área de trabajo.
- Barra lateral verde oscuro con enlaces claros y sección activa en superficie blanca.
- Controles superiores y buscador de bordes redondeados.
- Botón principal dorado para jerarquizar la acción de creación.
- Tarjetas, listas y encabezados con bordes suaves y menor contraste.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `espocrm-custom/files/client/custom/res/css/27-post-login-reference.css` | Estilos encapsulados para la experiencia posterior al login. |
| Modificado | `espocrm-custom/files/client/custom/res/css/main.css` | Carga del nuevo módulo visual. |
| Modificado | `espocrm-custom/files/client/custom/src/loader/theme-navbar.js` | Activa la capa visual tras el login y conserva el logo visible. |
| Modificado | `.deploy-version` | Fuerza la actualización del frontend en el siguiente despliegue. |

## Exclusiones de esta fase

- Pantalla de inicio de sesión.
- Contenido, campos y reglas de negocio de las entidades.
- Rediseño específico del tablero, formularios, tablas, calendario y vistas móviles.

## Pendientes de las siguientes fases

1. Rediseñar el tablero de control con jerarquía y panel lateral informativo, sin copiar el contenido de la referencia.
2. Ajustar tablas, filtros y formularios para mantener la misma jerarquía visual.
3. Revisar el resultado en escritorio y móvil con sesión iniciada; afinar contraste, logo y estados activos.
4. Definir iconografía y métricas propias del CRM para los paneles del tablero.
5. Corregir `scripts/deploy-custom.sh`: todavía presupone un contenedor llamado `espocrm`; con Compose actual el servicio se resuelve como `crmalcaldia-espocrm-1`.

## Validación

| Escenario | Resultado | Observación |
|---|---|---|
| Carga del CSS | Correcto | Custom desplegado, caché reconstruida y verificación técnica aprobada. |
| Integridad del CRM | Correcto | `bin/command app-check` y `verify-custom-deploy.sh` finalizaron correctamente. |
| Login sin cambios | Pendiente de revisión visual | Los selectores excluyen `.login-page`. |
| Sidebar, buscador, listas y botones | Pendiente de revisión visual | Abrir sesión, hacer recarga forzada y validar en escritorio y móvil. |

## Ajuste posterior a la primera revisión

La primera captura mostró que la regla dependiente de `data-navbar` no estaba ganando frente a estilos dinámicos del navbar. Se reemplazó por la clase `crm-reference-shell`, agregada únicamente tras autenticar, y el loader fuerza el fondo lateral y la visibilidad del logo. Pendiente: confirmar el resultado con una recarga forzada.
