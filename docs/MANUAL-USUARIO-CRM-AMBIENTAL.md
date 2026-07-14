# CRM Ambiental — Alcaldía de Envigado

**Versión:** 1.0  
**Usuarios:** funcionarios internos de la Secretaría de Medio Ambiente  
**Acceso:** usuario y contraseña institucional  

---

## 1. ¿Para qué sirve?

Centraliza el trámite de una **queja ambiental**:

1. Registro de la queja  
2. Radicación oficial  
3. Asignación a patrullero  
4. Visita(s) de campo y actas  
5. Aprobación de la visita  
6. Comunicaciones  
7. Documentos PDF  
8. Cierre y archivo  

Todo queda trazado **por caso** y **por tercero** (persona natural o empresa).

---

## 2. Flujo completo: desde dónde empieza y cómo termina

### Dónde empieza

Un ciudadano presenta una queja. **Inspección** la registra en el CRM.  
El caso nace en estado **Pendiente de radicación**, aún sin número oficial.

### Pasos del trámite

#### Paso 1 — Pendiente de radicación (Inspección)

Inspección crea el caso con:

- Peticionario (natural o jurídica)  
- Perjudicante / posible infractor  
- Descripción, recurso/tema, dirección  
- Datos del registro Excel Alcaldía  

**En este paso no se radica.** Tampoco se puede aprobar una visita: el caso aún no está radicado ni asignado.

#### Paso 2 — Radicado (Radicación)

1. Usuario **Radicación** abre el caso pendiente.  
2. Entra al asistente / panel de **Radicación**.  
3. Asigna **radicado** y **expediente**.  
4. Guarda.  

El estado pasa a **Radicado**.

#### Paso 3 — Asignado (Asignación)

1. Usuario **Asignación** abre el caso radicado.  
2. Edita y elige el **patrullero** responsable.  
3. Si es **reasignación**, debe indicar el motivo.  
4. Guarda.  

El estado pasa a **Asignado**.

#### Paso 4 — Visita realizada (Patrullaje e Inspección)

Quién puede operar el panel **Acta de visita**:

- El **patrullero asignado** al caso  
- **Inspección** (puede apoyar o registrar visitas)

**Cómo diligenciar la primera visita**

1. Abrir el caso.  
2. En el panel **Acta de visita**, marcar **«Voy a realizar la visita»** (habilita los botones).  
3. Pulsar **Llenar acta digital** (o imprimir para diligenciar a mano).  
4. Completar y **guardar** el acta.  

Al guardar con contenido:

- Se genera el **PDF** del acta.  
- El estado del caso pasa a **Visita realizada**.  
- En el panel aparece la tarjeta **Visita 1**.

**Varias visitas en el mismo caso**

Si hace falta otra visita en campo:

1. Con el caso en **Visita realizada** o **Visita aprobada**, usar **«Agregar visita»** (Inspección o Patrullaje).  
2. Escribir el **motivo** de la nueva visita (queda en el historial).  
3. El caso pasa a **En proceso de otra visita**.  
4. Marcar de nuevo **«Voy a realizar la visita»** y diligenciar el acta.  
5. Al guardar, el caso vuelve a **Visita realizada** y aparece **Visita 2**, **Visita 3**, etc.

Todas las visitas quedan visibles en el panel, en orden **1, 2, 3…** (sin saltos).  
La visita anterior **no se borra** al agregar una nueva.

#### Paso 5 — Visita aprobada (solo Inspección)

Inspección revisa el acta y aprueba la visita con el botón **«Aprobar visita»** en la tarjeta correspondiente.

**Condiciones obligatorias para poder aprobar**

| Condición | ¿Por qué? |
|-----------|-----------|
| Caso **radicado** (radicado o expediente) | La visita oficial solo aplica sobre trámite ya numerado |
| Caso **asignado** (tiene patrullero) | Hay responsable de campo |
| Estado **Visita realizada** | El acta ya está diligenciada |
| Rol **Inspección** (o admin) | Patrullaje no aprueba |

Si el caso aún está pendiente de radicación o sin asignar, **no** aparece (ni funciona) la aprobación.

Tras aprobar:

- El acta queda en estado **Aprobada**.  
- El caso pasa a **Visita aprobada**.

Inspección puede **quitar la aprobación** (mientras el caso esté en Visita aprobada) si debe corregirse algo.

#### Paso 6 — Finalizado y Proceso cerrado (Inspección)

Inspección:

1. Registra **comunicaciones** (citaciones, oficios, llamadas, etc.).  
2. Diligencia el **Auto de archivo**.  
3. Cierra el caso (**Finalizado** → **Proceso cerrado**).

### Dónde termina

El flujo termina en **Proceso cerrado**: queja registrada, visitada (una o más veces), comunicada y archivada.  
El historial completo queda en:

- Línea de tiempo  
- Cronograma  
- Documentos PDF  
- Historial de visitas  
- Expediente único del tercero  

### Diagrama del flujo

```
Ciudadano presenta queja
        ↓
Inspección crea caso → Pendiente de radicación
        ↓
Radicación radica → Radicado
        ↓
Asignación asigna patrullero → Asignado
        ↓
Patrullaje / Inspección diligencia acta → Visita realizada
        ↓   (opcional: Agregar visita → En proceso de otra visita → otra acta → Visita realizada)
Inspección aprueba → Visita aprobada
        ↓
Inspección comunica y cierra → Finalizado → Proceso cerrado
```

### Notas sobre estados especiales

| Estado | Qué significa |
|--------|----------------|
| **En proceso** | Ya no se usa en el flujo nuevo. Solo puede verse en casos antiguos. |
| **En proceso de otra visita** | Se pidió y preparó una visita adicional; el patrullero/Inspección debe marcar el check y diligenciar la nueva acta. |

---

## 3. Usuarios de prueba (4 roles principales)

Entrar con **un rol a la vez** (cerrar sesión y entrar con el siguiente).

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Inspección | inspeccion | inspeccion2026 |
| Radicación | radicacion | radicacion2026 |
| Asignación | asignacion | asignacion2026 |
| Patrullaje | patrullaje | patrullaje2026 |

**Orden sugerido de prueba:**  
Inspección crea → Radicación radica → Asignación asigna → Patrullaje diligencia acta → Inspección aprueba → Inspección cierra.

Opcional: probar **Agregar visita** (segunda visita) antes de aprobar, o después de aprobar.

---

## 4. Roles: qué ve y qué hace

### Inspección

- Ve todos los casos, terceros y tablero.  
- Crea y edita casos; completa Excel Alcaldía.  
- Registra comunicaciones y diligencia Auto de archivo.  
- Puede **diligenciar actas** y **agregar visitas**.  
- **Aprueba visitas** solo si el caso está radicado, asignado y en Visita realizada.  
- **No** radica ni asigna patrulleros.

### Radicación

- Ve todos los casos.  
- Solo radica (radicado + expediente) en pendientes.  
- No crea casos, no asigna patrulleros, no aprueba visitas.

### Asignación

- Ve casos radicados.  
- Asigna y reasigna patrullero (con motivo en reasignación).  
- No crea casos, no radica, no diligencia actas.

### Patrullaje

- Ve solo sus casos asignados.  
- Marca «Voy a realizar la visita», diligencia o imprime el acta.  
- Puede **agregar visita** (con motivo) en casos que lo permitan.  
- **No** aprueba visitas.  
- No edita el resto del caso.

---

## 5. Colores por estado

Cada estado tiene un color propio (lista, kanban y embudo del Inicio).

| Estado | Color |
|--------|--------|
| Pendiente de radicación | Naranja claro |
| Radicado | Azul celeste |
| Asignado | Rosa / cian claro |
| Visita realizada | Amarillo / verde lima claro |
| Visita aprobada | Verde claro |
| Finalizado | Beige / turquesa suave |
| Proceso cerrado | Gris |

En listas y kanban, el radicado y el expediente se destacan (ejemplo: `RAD · Exp. 2026`).

La **línea de tiempo** del caso muestra los pasos del flujo actual (**sin** “En proceso”).  
El **kanban** tampoco muestra la columna “En proceso”.

---

## 6. Semáforización y control de tiempos

### Fecha de vencimiento

Cada caso puede tener **Fecha de vencimiento**. Es la referencia para saber si el trámite va al día, por vencer o vencido.  
Quien tenga permiso (habitualmente Inspección) la define al crear o editar el caso.

### Semáforo

Clasifica los casos **activos** (no finalizados ni cerrados):

| Situación | Significado |
|-----------|-------------|
| **Al día** (verde) | Faltan más de 3 días para vencer |
| **Por vencer** (amarillo) | Faltan 3 días o menos, incluido hoy |
| **Vencido** (rojo) | La fecha de vencimiento ya pasó |
| **Sin fecha** (gris) | El caso no tiene fecha de vencimiento |

Los casos **Finalizado** o **Proceso cerrado** no entran en el semáforo.

### Dónde se ve

- **Tablero de Inicio:** gráfica del semáforo.  
- **Kanban:** la fecha se resalta en amarillo o rojo según corresponda.  
- **Cronograma del caso:** días restantes o vencidos.  
- **Reporte gerencial** (PDF/Excel): totales por semáforo.

### Alertas en la campana

El icono de campana (arriba a la derecha) muestra avisos automáticos.

**Por vencimiento**

- Caso vencido o por vencer (≤ 3 días).  
- Al guardar un caso con fecha en zona de alerta.  
- Revisión automática diaria.  

Destinatarios habituales: Inspección, Radicación, Asignación, patrullero asignado y administradores.  
Cada alerta indica el radicado (si existe) y enlace al caso.

**Por eventos del flujo**

| Evento | Quién recibe aviso |
|--------|---------------------|
| Caso nuevo creado | Radicación, Inspección |
| Caso radicado | Asignación, Inspección |
| Patrullero asignado | Patrullero asignado |
| Acta diligenciada | Inspección (revisión) |
| Visita aprobada | Patrullero (informativo) |
| Caso por vencer / vencido | Inspección, Radicación, Asignación, patrullero |
| Caso finalizado | Según configuración |

Al hacer clic en una notificación, se abre el caso.

### Tablero de control (Inicio)

- Embudo de etapas del flujo (con colores).  
- Semáforo de vencimiento.  
- Casos por recurso/tema, barrio y canal de reporte.  
- Ingreso diario y radicados por día.  
- Asignación (con patrullero vs. sin asignar).  
- Historial de visitas (cuando aplique).  
- Reporte gerencial en PDF/Excel.  

En cada caso, los paneles **Línea de tiempo** y **Cronograma** muestran el avance paso a paso.

### Pendiente

- Escalamiento automático por inactividad (“sin movimiento en X días”).  
- Envío de alertas por correo electrónico externo (requiere SMTP institucional).

---

## 7. Objetivos cumplidos y dónde están en el CRM

### Completamente operativos

| Objetivo | Dónde está |
|----------|------------|
| Asignar responsables | Panel Asignación, campo Asignado a, historial, notificación |
| Centralizar por tercero | Contactos / Empresas → Expediente único |
| Tableros de control | Inicio: embudo, semáforo, gráficas, reporte |
| Calidad mínima de datos | Validaciones al guardar (obligatorios, cédula/NIT) |
| Varias visitas por caso | Panel Acta de visita + Agregar visita + historial |

### Operativos en lo principal

| Objetivo | Estado |
|----------|--------|
| Registro de casos | Casos + Excel Alcaldía. Falta catálogo formal de Dependencia |
| Trazabilidad | Línea de tiempo, Cronograma, Flujo |
| Control de tiempos | Vencimiento, semáforo, alertas, job diario |
| Notificaciones | Campana operativa. Falta correo SMTP |
| Gestión documental | PDFs de solicitud, acta y auto. Falta anexos libres cómodos |
| Comunicaciones | Panel de citaciones, oficios, llamadas, etc. |
| Clasificación ambiental | Filtros y gráficas por recurso, zona, barrio, canal, estado |
| Permisos internos | Cada rol ve y edita solo lo suyo |
| Informes PDF | Por etapa y gerencial. Falta informe único consolidado |
| Ubicación territorial | Dirección, barrio, zona. Falta mapa geográfico |

### Pendientes

Integración con otros sistemas, migración masiva de históricos, UAT formal, capacitación documentada, escalamiento por inactividad, anexos estandarizados.

---

## 8. Mapa rápido de pantallas

| Pantalla | Para qué sirve |
|----------|----------------|
| **Casos** (lista) | Ver y filtrar quejas, con colores por estado |
| **Kanban** | Tablero visual por estado (sin “En proceso”) |
| **Solicitud de queja** | Peticionario, infractor y descripción |
| **Excel Alcaldía** | Campos para el registro institucional |
| **Radicación** | Radicado y expediente |
| **Asignación** | Patrullero y motivo de reasignación |
| **Acta de visita** | Check de visita, diligenciar, imprimir, agregar visita, aprobar |
| **Formato solicitud / Acta / Auto** | Documentos PDF |
| **Comunicaciones** | Citaciones, oficios, llamadas, etc. |
| **Línea de tiempo / Cronograma** | Seguimiento del avance |
| **Expediente único** (Contactos/Empresas) | Historial del tercero |
| **Inicio** | Embudo, semáforo, gráficas, reportes |
| **Campana** | Alertas y avisos pendientes |

---

## 9. Documentos que genera el sistema

| Documento | Cuándo |
|-----------|--------|
| **Formato de solicitud** (PDF) | Tras radicación / datos completos |
| **Acta de visita** (PDF) | Al guardar el acta (Patrullaje o Inspección) |
| **Auto de archivo** (PDF) | Al cerrar (Inspección) |
| **Reporte gerencial** (PDF/Excel) | Desde el tablero, bajo demanda |

---

## 10. Panel Acta de visita — resumen práctico

| Acción | Quién | Requisitos |
|--------|-------|------------|
| Marcar «Voy a realizar la visita» | Patrullaje asignado / Inspección | Caso listo para acta |
| Llenar / editar acta | Patrullaje asignado / Inspección | Check marcado (si aplica) |
| Imprimir acta a mano | Patrullaje asignado / Inspección | Check marcado (si aplica) |
| Agregar visita | Patrullaje / Inspección | Ya hay al menos un acta diligenciada; motivo obligatorio |
| Aprobar visita | **Solo Inspección** | Radicado + asignado + Visita realizada |
| Quitar aprobación | Solo Inspección | Caso en Visita aprobada |

Las tarjetas del panel muestran **Visita 1, Visita 2…** en orden de creación.  
Si una visita ya está aprobada, se ve el check de solo lectura «Visita aprobada».

---

## 11. Guía para el administrador: crear entidades y campos desde el CRM

Esta sección es para el usuario **admin**. Explica cómo ampliar el CRM **desde la interfaz**, sin tocar código (salvo cuando haga falta un despliegue técnico).

### 11.1 Antes de crear algo nuevo

1. Entrar como **administrador**.  
2. Ir a **Administración** (menú de engranaje / Administration).  
3. Preferir cambios en un entorno de prueba antes de producción.  
4. Tras cambios importantes: **Reconstruir** y limpiar caché (Administración → Rebuild / Clear Cache), o pedir al equipo de despliegue que ejecute rebuild en el servidor.

### 11.2 Crear una entidad nueva (módulo nuevo)

Ejemplo: una entidad “Inspección especial”, “Sanción”, etc.

1. **Administración → Entity Manager** (Administrador de entidades).  
2. Pulsar **+** / **Create Entity**.  
3. Completar:  
   - **Name** (nombre técnico en inglés, sin espacios; ej. `Sancion`).  
   - **Label** (nombre en pantalla; ej. `Sanción`).  
   - Tipo (habitualmente **Base** o **Base Plus**).  
4. Guardar.  
5. En el Entity Manager, abrir la entidad y configurar:  
   - Campos  
   - Relaciones (links) con Case, Contact, User, etc.  
   - Layouts (detail, edit, list)  
   - Menú / pestañas (si debe aparecer en el menú lateral)  
6. **Administración → Roles**: dar permiso de create/read/edit a los roles que deban usarla.  
7. Rebuild + clear cache.  
8. Probar con un usuario del rol correspondiente (no solo con admin).

**Importante:** en este proyecto muchas reglas de negocio (hooks, estados del caso, PDFs) viven en código (`espocrm-custom`). Una entidad nueva “sola” sirve para guardar datos, pero **no** hereda automáticamente el flujo de la queja ambiental. Si necesita engancharse al flujo, coordinar con desarrollo.

### 11.3 Agregar un campo a una entidad existente

Ejemplo: un campo nuevo en **Caso** (Case).

1. **Administración → Entity Manager**.  
2. Abrir la entidad (ej. **Case** / Caso).  
3. Pestaña **Fields** → **+** / Add Field.  
4. Elegir el **tipo** de campo:  
   - Texto corto → *Varchar*  
   - Texto largo → *Text*  
   - Sí/No → *Bool*  
   - Lista fija → *Enum*  
   - Fecha → *Date*  
   - Número → *Int* / *Float*  
   - Relación a otro registro → *Link* / *Link Multiple*  
5. Definir:  
   - Nombre técnico (recomendado prefijo `c` en campos custom, ej. `cMiCampo`).  
   - Etiqueta en español.  
   - Obligatorio o no.  
   - Opciones (si es Enum).  
6. Guardar.  
7. Ir a **Layouts** de esa entidad:  
   - **Detail** (vista)  
   - **Edit** (formulario)  
   - **List** (si debe verse en la lista)  
8. Arrastrar el campo al panel correcto y guardar.  
9. **Roles → Field Level Security** (si algún rol no debe ver/editar ese campo).  
10. Rebuild / clear cache.  
11. Probar con el rol que usará el campo.

### 11.4 Traducciones (etiquetas en español)

1. **Administración → Label Manager** (o equivalencia en su versión).  
2. Elegir entidad e idioma **es_ES**.  
3. Ajustar la etiqueta del campo o del menú.  
4. Guardar y limpiar caché.

### 11.5 Layouts: dónde se ve el campo

Sin meter el campo en el layout, **existe pero no se muestra**.

| Layout | Efecto |
|--------|--------|
| **edit** | Aparece al crear/editar |
| **detail** | Aparece al consultar |
| **list** | Columna en la lista |
| **filters** | Disponible para filtrar |

### 11.6 Permisos por rol

1. **Administración → Roles**.  
2. Abrir el rol (Inspección, Radicación, etc.).  
3. En la matriz de la entidad: create / read / edit / delete.  
4. Si el campo es sensible: Field Level → read/edit yes/no.  
5. Guardar.  
6. El usuario debe **cerrar sesión y volver a entrar** para refrescar permisos.

### 11.7 Menú / pestañas

1. **Administración → User Interface → Tab List** (o Menús).  
2. Agregar la entidad nueva al menú de los equipos o usuarios que la necesiten.  
3. Guardar y recargar.

### 11.8 Buenas prácticas en este CRM

| Hacer | Evitar |
|-------|--------|
| Campos nuevos con prefijo `c` | Renombrar o borrar campos del flujo (status, radicado, assignedUser, actas) sin revisar impacto |
| Probar con cada rol | Dar “todo sí” a un rol operativo “porque sí” |
| Documentar el cambio (para qué sirve el campo) | Crear entidades duplicadas de Case/ActaVisita |
| Rebuild + clear cache después de Entity Manager | Esperar que un campo nuevo dispare estados o PDFs sin desarrollo |

### 11.9 Cuándo sí hace falta desarrollo (no solo admin)

Pedir apoyo técnico si necesita:

- Cambiar el **flujo de estados** del caso.  
- Generar o alterar **PDF** / Excel Alcaldía.  
- Nuevas **notificaciones** o reglas automáticas (hooks).  
- Permisos especiales de API (acciones custom).  
- Pantallas muy personalizadas (como el panel Acta de visita).  

En esos casos el cambio se hace en el código del proyecto (`espocrm-custom`) y se publica con despliegue (Dokploy), no solo desde Entity Manager.

### 11.10 Checklist rápido del admin

```
[ ] Entrar como admin
[ ] Entity Manager → crear entidad o campo
[ ] Layouts → colocar el campo en edit/detail/list
[ ] Roles → permisos de entidad (y de campo si aplica)
[ ] Traducciones en español
[ ] Menú / pestañas (si es entidad nueva)
[ ] Rebuild + Clear Cache
[ ] Probar con usuario inspeccion / radicacion / etc.
[ ] Anotar el cambio en la documentación interna
```

---

## 12. Resumen en una frase

**Inspección registra → Radicación numera → Asignación reparte → Campo visita → Inspección aprueba (solo si ya está radicado y asignado) → Inspección comunica y cierra.**  
Varias visitas pueden coexistir en el mismo caso; todas quedan numeradas y visibles en el panel.
