# Ajuste: Página de Inicio actualizada con los flujos y roles vigentes

| Campo | Detalle |
|---|---|
| Fecha | 2026-09-29 |
| Estado | Validado localmente |
| Responsable | Claude Code (sesión con Jonathan Ochoa) |
| Áreas o roles impactados | Todos los perfiles |
| Versión de despliegue | push a `main` (Dokploy) |

## Objetivo

Pedido del usuario: "con todo lo que sabes, lo que hemos hecho y lo que hoy aplica, ¿puedes mejorar y actualizar el contenido de Inicio, para que un usuario pueda entender?".

**Antes:** Inicio mostraba un flujo genérico de 5 pasos, que terminaba en "Seguimiento", y 4 roles con nombres antiguos. No decía nada del proceso de Policía ni de cómo trabajar.

## Cambio (`files/client/custom/src/views/home.js`, `res/css/05-home.css`)

| Sección | Contenido |
|---|---|
| Bienvenida | Qué se atiende en la plataforma, de principio a fin. Botones "Mis casos" y "Ver dashboard" |
| **Su rol en la plataforma** | Tareas concretas según el rol de quien entra: Receptor, Radicador, Director Técnico, Patrullero/Técnico/Profesional, Inspección, Aux. Inspección, Apoyo Jurídico, Inspector Ambiental o Administrador. Los roles se toman del perfil del servidor (`alcaldiaProfile`) |
| 1 · Atención del caso | 6 pasos con **quién los hace**: registro, radicación, competencia y asignación, visita técnica, definición del trámite, respuesta y cierre |
| 2 · Proceso de Policía | 7 pasos del expediente, del A al G: apertura, citación, audiencia, decisión, notificación y recursos, cumplimiento y Auto de Archivo, con quién los hace. Aclara que se llevan desde el bloque "Proceso del expediente" |
| Roles y responsabilidades | 7 tarjetas con los nombres del modelo BPMN |
| Cómo trabajar en la plataforma | Avisos, línea de tiempo y cronograma, formatos (Word → firma → PDF), documentos del expediente, retornos y plazos en días hábiles |
| Reglas clave | Respuesta final obligatoria; la autoridad decide y el CRM sugiere; las medidas de otra autoridad se remiten; el incumplimiento se valora; los actos firmados se cargan en PDF |

- **Pestaña Inicio:** `HOME_DEFAULT_TAB_VERSION` pasa a `inicio-plataforma-v2`, para que todas las sesiones vean el nuevo Inicio una vez.

## Validación

- **Guía por rol:** `juridica` → "Apoyo Jurídico"; `auxinspeccion` → "Aux. Administrativo · Inspección"; `patrullaje` → "Patrullero · Técnico · Profesional".
- **Diseño:** las secciones se revisaron en el navegador. Las cuadrículas se apilan en pantallas angostas.
