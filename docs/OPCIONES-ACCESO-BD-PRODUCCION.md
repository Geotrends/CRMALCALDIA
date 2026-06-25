# Cómo ver la base de datos del CRM (producción en Dokploy)

La información del CRM (casos, usuarios, radicados, etc.) se guarda en una base de datos en el servidor. Estas son las formas de **verla por dentro**, con sus riesgos.

---

## Resumen

| Opción | Cómo se usa | ¿Necesita SSH? | Riesgo |
|--------|-------------|----------------|--------|
| **1. pgAdmin (navegador)** | Entrar a una página web e iniciar sesión | No | Medio |
| **2. DBeaver directo** | Programa en el PC conectado al servidor | No | **Alto** |
| **3. DBeaver con SSH** | Programa en el PC, pero primero entra al servidor de forma segura | Sí | Bajo–medio |
| **4. Consola** | Pantalla de comandos en el servidor | Sí* | Bajo–medio |

\* Puede ser por SSH o por la terminal que ofrece Dokploy.

---

## Opción 1 — pgAdmin en el navegador

**En pocas palabras:** Es como una página web para ver la base de datos. No hace falta instalar nada en el computador.

**A favor**
- Fácil de usar.
- La base no queda “abierta” directamente en internet; solo la página de acceso.

**En contra**
- Si la contraseña es débil, alguien podría intentar entrar.
- Quien entre puede ver y cambiar información sensible.

**Riesgo:** **Medio** — aceptable si hay buena contraseña y solo entran personas autorizadas.

---

## Opción 2 — DBeaver directo

**En pocas palabras:** Se abre un puerto del servidor para que el programa DBeaver se conecte desde afuera.

**A favor**
- Rápido de configurar.
- No usa SSH.

**En contra**
- Deja la base de datos **muy expuesta** en internet.
- Hay muchos intentos automáticos de entrar.
- Si alguien logra la contraseña, puede ver, copiar o borrar todo.

**Riesgo:** **Alto** — **no recomendado** si el puerto queda abierto para todo internet.

---

## Opción 3 — DBeaver con SSH

**En pocas palabras:** DBeaver entra primero al servidor de forma segura (SSH) y desde ahí mira la base. La base no queda publicada en internet.

**A favor**
- Es la forma más usada en empresas.
- Más segura que la opción 2.

**En contra**
- Hay que tener acceso al servidor (SSH).
- Solo deberían usarlo personas de confianza (por ejemplo, sistemas).

**Riesgo:** **Bajo–medio** — buena opción si la maneja el área de TI.

---

## Opción 4 — Consola (terminal)

**En pocas palabras:** Entrar al servidor y usar comandos de texto para consultar la base (sin programa gráfico).

**A favor**
- No expone la base a internet.
- Sirve para mantenimiento y revisión técnica.

**En contra**
- Un comando mal hecho puede dañar o borrar datos.
- Requiere saber usar la consola.
- Solo para personal técnico.

**Riesgo:** **Bajo–medio** — el riesgo principal es el error humano, no tanto que entren desde afuera.
