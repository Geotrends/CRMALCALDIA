# Datos ficticios para validar Dashboard

| Campo | Detalle |
|---|---|
| Fecha | 2026-08-25 |
| Estado | Validado localmente |
| Áreas o roles impactados | Desarrollo y validación |
| Versión de despliegue | No aplica; inserción local controlada |

## Objetivo

Crear 50 casos ficticios y variados para probar los indicadores, filtros anidados y el mapa agregado por barrio, sin utilizar datos personales reales.

## Alcance funcional

- 50 registros con estados, recursos, canales, fechas de caso y vencimiento variados.
- Peticionarios repetidos (personas naturales y jurídicas) para probar casos relacionados de una misma fuente.
- Personas naturales y jurídicas afectadas repetidas para probar historial y concentración de casos.
- Barrios de Envigado reutilizados para validar los colores y totales del mapa.
- Los registros se identifican con el prefijo `[PRUEBA DASHBOARD]`.

### Ajuste de distribución

- Se agregan 5 casos, para un total de 55.
- Se dejan 50 radicados (90,9 %, equivalente entero más cercano a 90 %) y 5 sin radicar.
- La distribución territorial queda intencionalmente desigual: Mesa 14, El Dorado 10, La Magnolia 8, Las Flores 6, Alcalá 5, La Mina 4, El Salado 3, Los Naranjos 2, La Pradera 2 y Bucarest 1.

## Reglas preservadas

El script usa el ORM de EspoCRM y deja activos los hooks de validación, normalización y sincronización de Contactos/Cuentas. Solo omite la generación de PDF y la exportación Excel para no crear archivos ficticios ajenos a la prueba del Dashboard.

## Archivos afectados

| Acción | Ruta | Propósito |
|---|---|---|
| Creado | `scripts/seed-dashboard-dummy-cases.php` | Generador confirmado de datos ficticios. |
| Creado | `scripts/reshape-dashboard-dummy-cases.php` | Amplía el conjunto a 55 y ajusta radicados/barrios. |

## Ejecución

Dentro del contenedor de la aplicación:

```bash
ESPO_CONFIRM_SEED_DASHBOARD=1 php /opt/bootstrap/repo/scripts/seed-dashboard-dummy-cases.php
```

El script se detiene si ya encuentra casos con el prefijo de prueba, evitando duplicados.

## Validación

| Escenario probado | Resultado | Evidencia u observación |
|---|---|---|
| Creación de 50 casos | Correcto | Generador ejecutado en local: 50 casos creados. |
| Reutilización de terceros y datos para Dashboard | Correcto | El generador confirmó 5 peticionarios y 4 afectados reutilizados; los hooks de terceros permanecieron activos. |
| Protección contra duplicados | Correcto | Una segunda ejecución se detiene al encontrar los 50 casos con el prefijo de prueba. |
| Ampliación, radicados y distribución desigual | Correcto | Ejecución local: 55 casos, 50 radicados (90,9 %) y distribución territorial definida. |

## Limpieza

Los casos se identifican por su nombre. La eliminación debe realizarse con un script específico de limpieza selectiva; no se debe usar el borrado masivo de casos mientras haya información real en el entorno.
