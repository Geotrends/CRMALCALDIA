# Acceso a la base de datos y al Excel oficial (sin consola)

Guía para ver la base de datos con interfaz gráfica y descargar `excelAlcaldia.xlsx` desde el CRM.

---

## 1. Ver y descargar el Excel oficial

El archivo `excelAlcaldia.xlsx` se actualiza automáticamente al radicar casos o guardar actas. **No hace falta entrar al servidor.**

### Desde el CRM (recomendado)

1. Entra al CRM con tu usuario.
2. Menú lateral → **Documentos**.
3. Busca **Registro oficial Excel Alcaldía** (categoría **Excel oficial**).
   - Filtro rápido: en la lista de documentos elige **Excel oficial**.
4. Abre el registro y descarga el archivo **excelAlcaldia.xlsx** (botón de descarga del documento).

El archivo se **actualiza solo** cada vez que se radica un caso o se guarda un acta. La fecha en la descripción del documento indica la última actualización.

Si no aparece el documento: radica al menos un caso y haz **redeploy** en Dokploy (o espera al siguiente guardado que actualice el Excel).

---

## 2. Ver la base de datos (interfaz gráfica)

Tienes dos caminos, ambos **sin usar la terminal**.

### Opción A — DBeaver (escritorio, como pgAdmin pero instalado en tu PC)

**En tu PC (desarrollo local):**

1. Instala [DBeaver Community](https://dbeaver.io/download/) si no lo tienes.
2. Abre DBeaver → **Nueva conexión** → **PostgreSQL**.
3. Datos (los tienes en tu `.env` local):

| Campo | Valor |
|-------|--------|
| Host | `localhost` |
| Puerto | `5433` (variable `POSTGRES_PORT` en `.env`) |
| Base de datos | `espocrm` |
| Usuario | `espocrm` |
| Contraseña | valor de `POSTGRES_PASSWORD` en `.env` |

4. **Probar conexión** → **Finalizar**. Ya puedes explorar tablas, consultas y datos.

**En producción (Dokploy):**

1. Entra a **Dokploy** en el navegador.
2. Abre el proyecto del CRM → servicio **`espocrm-db`**.
3. En **Ports** (o **Dominios**), publica el puerto **5432** hacia fuera (solo si TI lo autoriza; mejor con IP restringida o VPN).
4. Anota el **host** (IP o dominio que asigne Dokploy) y el **puerto** publicado.
5. En DBeaver, crea una conexión PostgreSQL con:
   - Host / puerto del paso anterior
   - Base: valor de `POSTGRES_DB` en las variables de entorno de Dokploy
   - Usuario / contraseña: `POSTGRES_USER` y `POSTGRES_PASSWORD` (pestaña **Environment** del proyecto en Dokploy; copiar y pegar, no hace falta consola)

> Seguridad: no dejes el puerto 5432 abierto a internet sin firewall. Preferible VPN o IP de oficina.

### Opción B — pgAdmin en el navegador (sin instalar DBeaver)

Incluido en el repo como servicio opcional.

**Local:**

1. En `.env`, define (o usa los valores por defecto):

```env
PGADMIN_DEFAULT_EMAIL=admin@local.test
PGADMIN_DEFAULT_PASSWORD=tu_clave_pgadmin
PGADMIN_PORT=5050
```

2. Levanta los contenedores con el archivo de herramientas (desde Docker Desktop también puedes añadir el compose `docker-compose.tools.yml` al stack si no usas terminal).

3. Abre en el navegador: **http://localhost:5050**
4. Inicia sesión con el email y contraseña de pgAdmin.
5. **Add New Server**:
   - **Name:** `CRM Alcaldía`
   - Pestaña **Connection:**
     - Host: `espocrm-db`
     - Port: `5432`
     - Database: `espocrm`
     - Username / Password: los de `POSTGRES_USER` y `POSTGRES_PASSWORD` en `.env`

**Producción (Dokploy):**

1. En el proyecto, añade el compose **`docker-compose.tools.yml`** además del principal (misma forma que el `docker-compose.yml` base).
2. Redeploy.
3. En Dokploy, asigna un dominio al servicio **`pgadmin`** (ej. `pgadmin.tudominio.com`) y protege con contraseña fuerte.
4. Entra por el navegador, inicia sesión en pgAdmin y registra el servidor con host **`espocrm-db`**, puerto **5432**, y las credenciales de las variables de entorno del stack.

---

## Resumen rápido

| Necesidad | Dónde | Quién |
|-----------|--------|--------|
| Descargar Excel oficial | CRM → **Documentos** → Registro oficial Excel Alcaldía | Todos con acceso a Documentos |
| Explorar BD en PC | DBeaver → `localhost:5433` | Quien tenga el `.env` local |
| Explorar BD en servidor | DBeaver (puerto publicado) o pgAdmin (navegador) | TI / usuarios autorizados |

Más detalle de credenciales: [BASE-DE-DATOS-Y-CREDENCIALES.md](BASE-DE-DATOS-Y-CREDENCIALES.md).
