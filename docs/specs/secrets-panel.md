# Panel de secretos en el admin de Pollux — T8 (diseño) + T9 (local) + T10 (Secret Manager real) + T13/T14 (coordinación con Castor)

**Estado:** T8 (diseño) y T9 (implementación local, dev-only) aceptados y hechos — ver
`docs/handover/notas-pendientes-2026-09-28.md`. T10 agrega el backend REAL de Secret Manager a
`secret_loader.py`, probado contra un secreto desechable en `pollux-app-507503` (creado y
destruido en la misma corrida). T13 saca `GOOGLE_DRIVE_CLIENT_SECRET` de este panel (se mueve a
`api_key_config`, contrato de Castor). T14 corrige §8.1/§8.2 (nombres literales de secreto, no
alias `leto-*`, aviso de Castor nota 140), actualiza §7 contra el código real de Castor
(`1528c45`) y agrega el análisis de desbloqueo de `DRIVE_TOKEN_SECRET` en §9. El **§8** de este
documento sigue siendo el plan exacto para pasar a producción — todavía sin ejecutar, pendiente
de que Dandy y el PM de Castor lo revisen. No hay valores de secretos en este documento, solo
nombres.

**Alcance:** `pb-pollux` (`pollux-app-507503`) y `pb-castor` (`castor-app-506901`), que comparten
la base `leto-postgres` y, según se confirma abajo, ya comparten infraestructura de Secret
Manager parcialmente sin que el código la use todavía.

---

## 1. Inventario de secretos

### 1.1 Tabla — nombre, dónde vive hoy, quién lo consume, qué se rompe si cambia

| Secreto | ¿Compartido? | Dónde vive HOY (verificado) | Quién lo consume | Qué se rompe si cambia sin preparación |
|---|---|---|---|---|
| `SECRET_KEY` | **Sí** | `pb-pollux`: env var plana en Cloud Run. `pb-castor`: **ya apunta a un secreto de Secret Manager** (ver §1.2). Existe un secreto `leto-secret-key` en Secret Manager de `pollux-app-507503`, creado pero no usado por el env var real de `pb-pollux` hoy. | Firma/verifica JWT: `backend/app/core/security.py` (Pollux y Castor, cada uno con su propia copia del backend) + `interfaces/castor/authMiddleware.js` (Express, solo verifica, nunca firma) | **Todas las sesiones activas (access tokens, hasta 480 min, y refresh tokens, hasta 7 días) dejan de validar de un momento a otro** — logout forzado masivo en los dos productos a la vez, porque el Node de Castor y los dos backends Python comparten el mismo secreto para el mismo token |
| `DATABASE_URL` | **Sí** (misma `leto-postgres`, incluye la contraseña de Postgres embebida) | `pb-pollux`: env var plana. `pb-castor`: **ya apunta a un secreto de Secret Manager** (`leto-database-url` existe en `pollux-app-507503`, mismo patrón que arriba). | Todo endpoint que toca la DB, en los dos backends | Si cambia la contraseña del lado de Postgres sin actualizar la variable en los dos servicios a la vez, el que no se actualiza **no puede conectar — caída total de ese backend**, no solo de un login |
| `DRIVE_TOKEN_SECRET` | **Sí** (mencionado explícitamente por Rick) | Env var plana en los dos proyectos. Sin Secret Manager todavía en ninguno de los dos. | `backend/app/services/token_crypto.py` — deriva una clave Fernet (SHA-256 del secreto) usada para cifrar/descifrar: (a) `drive_tokens.encrypted_rt` (refresh tokens de Drive, uno por admin que conectó su cuenta) y (b) `api_key_config.encrypted_value` (las API keys de OCR que ya son configurables desde Settings, nota 48 — ver §1.3) | **Todo lo cifrado con la clave vieja queda indescifrable** apenas se cambia el env var — ningún admin puede volver a usar su conexión de Drive (tiene que reconectar desde cero) y las API keys guardadas en Settings quedan rotas hasta que alguien las vuelva a tipear. No hay ventana de gracia hoy: el módulo deriva **una sola** clave Fernet a partir del secreto actual, nada de doble clave |
| `DRIVE_STATE_SECRET` | **Sí** (mencionado explícitamente por Rick) | Env var plana en los dos proyectos. | `backend/app/routers/drive.py` — firma HMAC de un parámetro `state` de OAuth, vida útil de **segundos/minutos** (dura lo que tarda el flujo de autorización de Google) | Nada persistente se rompe. Solo falla el flujo de conexión de Drive que esté *en curso* en el instante exacto de la rotación (el usuario simplemente reintenta). **El de menor riesgo de los cinco — candidato natural para la primera prueba en prod (§6)** |
| `GOOGLE_DRIVE_CLIENT_SECRET` (+ `GOOGLE_DRIVE_CLIENT_ID`, este último no es secreto) | Probablemente sí — mismo código en los dos, mismo nombre de variable, sin confirmar si es el mismo cliente OAuth de Google o dos distintos (pregunta abierta para Castor, §7) | Env var plana en los dos. | `backend/app/services/google_drive.py` (intercambio de código OAuth / refresh de access token de Drive) | Si rota sin coordinar con la consola de Google Cloud (donde vive el client secret real), **todo intercambio de código/refresh de Drive empieza a fallar con `invalid_client`** hasta corregir — no es algo que esta app pueda regenerar por sí sola, el valor nuevo tiene que salir de la consola de Google primero |
| `GOOGLE_VISION_API_KEY` | No (cada proyecto puede tener la suya) | Env var plana, **y además admin-configurable desde Settings** vía `api_key_config` (cifrada con `DRIVE_TOKEN_SECRET`, ver arriba) — dos fuentes posibles, la de DB gana si existe (`ocr_provider.py`) | `backend/app/services/ocr_provider.py` | Reconocimiento OCR con Google Vision deja de andar hasta poner una key válida — no es destructivo, es un fallback a mock/degradado |
| `ANTHROPIC_API_KEY` | No | **Solo admin-configurable desde Settings** (`api_key_config`, cifrada con `DRIVE_TOKEN_SECRET`) — no hay variable de entorno de respaldo real en producción (hay un chequeo que exige que esté configurada de una forma u otra) | `backend/app/services/ocr_provider.py` (verificación de documentos con Claude Vision) | Sin esta key, la verificación de documentos deja de escalar a Claude — cae a un modo degradado documentado en el propio código |
| `GOOGLE_OAUTH_CLIENT_ID` | No — **solo Castor** (Pollux no tiene esta función) | Env var plana, solo en Castor | `backend/app/routers/auth.py` (login "Sign in with Google" de marinos) | No es secreto en sentido estricto (un client ID de "Sign in" se expone igual al navegador) — si cambia sin avisar, ese botón de login deja de funcionar hasta corregir |
| Variable con nombre hexadecimal de 65 caracteres (ya escalada a Rick, **no la investigo de nuevo acá**) | Desconocido | `pb-pollux`, apunta a `leto-secret-key` en Secret Manager pero con un NOMBRE de variable que no es legible | Desconocido — por eso se escaló sin tocar | Fuera de alcance de este documento a propósito |

### 1.2 Hallazgo importante: ya existe infraestructura de Secret Manager a medio conectar

Verificado hoy, solo lectura (`gcloud secrets list` / `get-iam-policy` / `run services describe`,
ningún valor leído):

- **`pollux-app-507503` tiene 2 secretos ya creados**: `leto-secret-key` y `leto-database-url`
  (creados 2026-09-13/14). Los dos ya tienen `roles/secretmanager.secretAccessor` concedido a
  **`pollux-run@pollux-app-507503...`, `castor-run@castor-app-506901...` y la cuenta de cómputo
  por defecto de `castor-app-506901`** — es decir, el permiso cross-proyecto que este documento
  tendría que pedir **ya está, al menos para estos dos**.
- **Pero `pb-pollux` no los usa**: su `DATABASE_URL` y `SECRET_KEY` de hoy son variables planas de
  Cloud Run, no referencias a esos secretos. El único secreto que sí referencia
  (`leto-secret-key`) quedó pegado a un nombre de variable ilegible (la fila de la tabla de
  arriba) — parece un intento anterior de conectar esto que no se completó bien.
- **`pb-castor` sí referencia secretos para `SECRET_KEY`/`DATABASE_URL`** — pero el identificador
  exacto que muestra `gcloud run services describe` (con sufijo tipo GUID) no coincide
  literalmente con `leto-secret-key`/`leto-database-url` tal como aparecen en el listado de
  `pollux-app-507503`. Puede ser una particularidad de cómo Cloud Run fija la referencia interna
  al momento del deploy (versiones/renombres intermedios) — **no profundicé más porque no es
  necesario para este diseño y no quería arriesgarme a tocar nada**. Dejo esto como punto a
  confirmar (no a resolver yo) antes de construir sobre esta base — ver §7.
- **`castor-app-506901` no tiene secretos propios** (`gcloud secrets list` ahí devuelve 0) — todo
  lo de Secret Manager para estos dos servicios vive hoy en `pollux-app-507503`.

Esto cambia la pregunta de "¿dónde deberían vivir los secretos compartidos?" por "¿terminamos de
conectar correctamente lo que ya existe, en vez de crear algo nuevo?" — ver recomendación en §2.3.

### 1.3 El precedente que ya existe: `api_key_config`

Migración `0009_api_key_config` (ya en el repo, Rick la autorizó el 2026-09-14) es,
funcionalmente, una versión chica de este panel: una tabla con `encrypted_value` (Fernet, misma
clave que Drive), `hint` (últimos 4 caracteres en claro), `updated_at`/`updated_by` (auditoría), y
un endpoint de **solo escritura** — nunca se devuelve el valor real al navegador. Esto es
exactamente el patrón que pide el punto 4 de esta tarea. En vez de diseñar ese patrón desde cero,
esta propuesta lo **extiende** a los secretos de infraestructura (`SECRET_KEY`,
`DRIVE_TOKEN_SECRET`, etc.), que hoy viven en env vars/Secret Manager, no en esta tabla.

---

## 2. Arquitectura propuesta

### 2.1 Las dos opciones, evaluadas

**Opción A — la app lee Secret Manager en runtime (cache + recarga).**
- El backend, al arrancar, carga la versión `latest` de cada secreto desde Secret Manager (no
  desde env vars) y la guarda en memoria con un TTL corto (p. ej. 5 minutos) o un trigger de
  recarga explícito.
- El panel, al rotar, escribe una nueva versión del secreto en Secret Manager y llama un endpoint
  interno (`POST /admin/secrets/reload`, admin-only) que invalida el caché en memoria — sin
  reiniciar el proceso.
- **Pro:** el panel nunca necesita permiso sobre Cloud Run (ni `run.services.update`, ni
  `iam.serviceAccounts.actAs`) — su única superficie de IAM es `secretmanager.versions.add` +
  `secretmanager.versions.access` sobre secretos puntuales. Blast radius mínimo: si el panel se
  compromete, lo peor que puede hacer es escribir/leer esos secretos, no tocar el servicio en sí.
- **Contra:** hay que escribir la plomería de caché/recarga, que hoy **no existe en absoluto** —
  `config.py` usa `@lru_cache()` sobre un `Settings()` que se arma una sola vez al importar el
  módulo, y `token_crypto.py`/`drive.py` leen `os.environ.get(...)` **una sola vez, a nivel de
  módulo, al arrancar el proceso** (confirmado leyendo el código, no es una suposición). Ninguno
  de los dos soporta hoy "cambiar en caliente" — hay que agregar esa capa.

**Opción B — el panel redeploya/reinicia Cloud Run.**
- El panel escribe la nueva versión en Secret Manager y después dispara una actualización de
  servicio (`gcloud run services update --no-traffic` + split, o simplemente forzar una revisión
  nueva) para que el contenedor arranque de cero y relea el valor.
- **Pro:** cero plomería de caché nueva — el patrón de "leer una vez al arrancar" ya funciona tal
  cual hoy, solo cambia de dónde lee (Secret Manager en vez de env var plana).
- **Contra:** el panel necesita permisos de Cloud Run (`run.services.update` como mínimo, y
  `iam.serviceAccounts.actAs` sobre la SA de ejecución si el flujo pasa por ahí) — un permiso
  mucho más amplio que "leer/escribir un secreto puntual". Si el panel se compromete o tiene un
  bug, puede tumbar o modificar el servicio completo, no solo un secreto. Además, un
  redeploy/reinicio real tiene downtime (aunque sea de segundos) y rompe cualquier request en
  vuelo — más invasivo que lo que hace falta para rotar un secreto.

### 2.2 Recomendación

**Opción A**, coincide con tu preferencia. La razón de peso no es la plomería (que hay que
construir en los dos casos, de una forma u otra) sino el **radio de alcance del permiso que le
das al panel**: `secretmanager.versions.add` sobre un puñado de secretos puntuales es un permiso
mucho más chico y más fácil de auditar que cualquier cosa que incluya `run.services.update`. Un
panel de admin que puede redeployar Cloud Run es, de hecho, un panel que puede desplegar código
arbitrario si alguien compromete esa ruta — no es proporcional al problema que se quiere resolver
(rotar un valor).

La plomería de caché+recarga no es grande dado el tamaño real del problema (5 secretos, no 50):
un módulo nuevo (`secret_loader.py`, al estilo de `token_crypto.py`) con una función
`get_secret(name) -> str` que cachea en memoria con TTL y expone `invalidate(name)`, y los 3
puntos que hoy leen `os.environ`/`Settings()` pasan a llamar a esa función en vez de leer la
variable de entorno directo. Config.py seguiría teniendo las env vars como **fallback** para todo
lo que no se migre (desarrollo local sin acceso a Secret Manager sigue andando igual que hoy).

### 2.3 Secretos compartidos con Castor: un secreto, un proyecto, el otro lee

**Recomendación: seguir el patrón que YA existe para `SECRET_KEY`/`DATABASE_URL`** (§1.2) — un
secreto vive en `pollux-app-507503`, y `castor-run@` tiene `secretmanager.secretAccessor` sobre
ese secreto puntual (no sobre todo Secret Manager del proyecto). Extender esto a
`DRIVE_TOKEN_SECRET` (el otro compartido que falta) de la misma forma, en vez de mantener dos
copias sincronizadas a mano.

Por qué no "dos secretos sincronizados": significa que cada rotación necesita escribir en DOS
proyectos de forma atómica (o casi) — si el panel falla a mitad de camino, los dos lados quedan
con valores distintos y las sesiones/datos cifrados con uno no validan contra el otro. Un secreto
único con lectura cross-proyecto elimina esa ventana de inconsistencia por diseño: **solo hay un
valor posible en cualquier momento dado**, no dos que puedan desincronizarse.

El costo de esto es que el panel de Pollux pasa a ser el único punto de escritura para los
secretos compartidos — Castor nunca escribe `SECRET_KEY`/`DRIVE_TOKEN_SECRET`/`DATABASE_URL`,
solo los lee. Esto coincide con que el panel vive en el admin de **Pollux**, no en el de Castor
(decisión ya tomada por Rick al pedir el panel ahí) — es consistente, no un compromiso nuevo.

---

## 3. Rotación segura por tipo

### 3.1 `SECRET_KEY` — ventana de doble clave

Hoy `decode_token()` (`security.py`, los dos backends) prueba **un solo** `settings.SECRET_KEY`.
Propuesta: la función de verificación prueba primero la clave **actual**, y si falla, la clave
**anterior** (ambas leídas de Secret Manager, dos versiones: `latest` y la que `latest` reemplazó).
`create_access_token`/`create_refresh_token` **siempre** firman con la clave actual — nunca con la
anterior. La ventana de la clave anterior se mantiene activa como mínimo **7 días** (la vida del
refresh token más largo) desde que se rota, para que ningún usuario con sesión activa sea
deslogueado a la fuerza. Pasado ese plazo, la versión vieja del secreto puede desactivarse (no
hace falta borrarla de Secret Manager, solo dejar de aceptarla en el código).

Esto necesita el mismo cambio en **Castor-Node** (`authMiddleware.js`) — hoy ese archivo solo
verifica con un único `SECRET_KEY` también. Ver lista para el dev de Castor (§7).

### 3.2 `DRIVE_TOKEN_SECRET` — re-cifrado, no doble clave

Acá doble clave no alcanza, porque el problema no es verificar una firma sino **descifrar datos ya
guardados** (`drive_tokens.encrypted_rt`, `api_key_config.encrypted_value`). Plan:

1. Antes de escribir la nueva versión del secreto como `latest`, un paso de migración lee **todas**
   las filas de las dos tablas con la clave vieja, las vuelve a cifrar con la clave nueva, y
   recién ahí la nueva versión pasa a ser la que usan los backends.
2. Esto es un paso de datos, no solo de configuración — tiene que correr contra la DB compartida
   una sola vez (mismo espíritu que las migraciones de Alembic: una vez, no una por producto), y
   necesita acceso de lectura/escritura a esas dos tablas además de a Secret Manager.
3. Mientras ese paso corre, hay una ventana corta donde "cuál es la clave vigente" tiene que
   definirse con cuidado — más simple: **el panel bloquea la escritura de nuevas filas en esas dos
   tablas durante la ventana de re-cifrado** (una bandera de mantenimiento corta, segundos a bajo
   volumen hoy — 32 marinos demo y un puñado de API keys reales, no miles de filas).
4. Si el re-cifrado falla a mitad de camino, **no promover la nueva versión** — queda la vieja
   como `latest` y se reintenta. Nunca dejar la app en un estado donde la clave activa no coincide
   con la clave que cifró los datos existentes.

### 3.3 `DATABASE_URL` (contraseña de Postgres) — decisión: **queda FUERA de este panel**

Recomiendo no incluir la rotación de la contraseña de Postgres en el alcance de este panel, por lo
que puede salir mal: es compartida con Castor, y un error de coordinación dejaría a **los dos
productos sin poder conectar a la base** — el peor escenario posible, peor que sesiones vencidas o
Drive desconectado. Rotarla hoy ya es posible con el procedimiento manual que se usa para las
migraciones de Alembic (túnel + verificación + corte coordinado) — eso está probado y tiene
ventanas de rollback claras. Meterlo en un botón de "un click" en el panel, antes de que el
mecanismo de cache+recarga esté probado con secretos de menor riesgo, es más riesgo del que vale
la pena asumir en esta primera versión. Si más adelante se quiere agregar, que sea una fase
aparte, después de validar el patrón con los otros cuatro.

---

## 4. Seguridad del panel

- **Solo admin** (`require_admin`, mismo guard que ya usan todos los endpoints de
  `/admin/ocr-references` y `api_key_config` — no hay que inventar un rol nuevo).
- **Re-autenticación antes de rotar**: pedir la contraseña de nuevo (no alcanza con tener una
  sesión admin activa) antes de cualquier operación de escritura sobre un secreto — mismo patrón
  que un cambio de contraseña sensible en cualquier producto. Esto es más importante acá que en
  cualquier otro endpoint admin porque el radio de daño de una rotación accidental/maliciosa es
  mucho mayor que, por ejemplo, borrar una referencia OCR.
- **Nunca mostrar ni loguear valores reales**: cada secreto se representa en el panel por su
  `hint` (últimos 4 caracteres, mismo campo que ya usa `api_key_config`) + metadata (cuándo se
  rotó, quién, qué versión de Secret Manager). El valor completo nunca viaja de vuelta al
  navegador en ningún endpoint, ni se imprime en logs de aplicación — mismo criterio que ya aplica
  `api_key_config` hoy.
- **Auditoría**: una tabla nueva (`secret_rotation_log` o similar, mismo espíritu que
  `api_key_config.updated_by/updated_at` pero con historial completo en vez de una sola fila por
  clave) con: `secret_name`, `action` (rotate/rollback/test), `performed_by`, `performed_at`,
  `secret_manager_version` (el número de versión de Secret Manager, no el valor), `result`
  (ok/error + mensaje corto). Nunca el valor.
- **Rollback a la versión anterior**: dado que Secret Manager versiona automáticamente, "rollback"
  es simplemente volver a apuntar `latest`'s consumidor lógico a la versión N-1 (sin borrar
  versiones) — para `SECRET_KEY` esto ya es parte natural del esquema de doble clave (§3.1); para
  `DRIVE_TOKEN_SECRET` un rollback después de que el re-cifrado ya corrió implica re-cifrar de
  nuevo hacia atrás, así que el botón de rollback para ese secreto específico debería dejar de
  estar disponible una vez que la ventana de re-cifrado se cierra con éxito (documentarlo así en
  la UI, no es un rollback real en ese caso, es "deshacer antes de confirmar").
- **Botón "Probar"**: antes de promover una rotación a `latest`, un endpoint que verifica la
  versión nueva de forma no destructiva:
  - `SECRET_KEY`: firma un JWT de prueba con la versión nueva y lo verifica con la función de
    verificación actualizada (debe aceptar ambas versiones durante la ventana) — sin tocar
    sesiones reales.
  - `DRIVE_TOKEN_SECRET`: cifra y descifra un valor de prueba (no una fila real) con la clave
    nueva — confirma que la clave deriva correctamente antes de tocar `drive_tokens`/
    `api_key_config` de verdad.
  - `DRIVE_STATE_SECRET`: firma y verifica un HMAC de prueba.
  - `GOOGLE_DRIVE_CLIENT_SECRET`/API keys: un smoke test real contra el proveedor (p. ej. una
    llamada mínima a la API correspondiente) antes de promover.

---

## 5. IAM mínimo exacto y costo aproximado

### 5.1 IAM por SA

| SA | Rol | Sobre qué recurso | Para qué |
|---|---|---|---|
| `pollux-run@pollux-app-507503...` | `roles/secretmanager.secretAccessor` | Cada secreto puntual que lee (`SECRET_KEY`, `DATABASE_URL`, `DRIVE_TOKEN_SECRET`, `DRIVE_STATE_SECRET`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_VISION_API_KEY` si se migra) — **no** `roles/secretmanager.secretAccessor` a nivel de proyecto | Leer en runtime (Opción A) |
| `pollux-run@...` (o una SA nueva más acotada, p. ej. `pollux-secrets-admin@`, si Rick prefiere separar "leer para correr" de "escribir para rotar") | `roles/secretmanager.secretVersionManager` (o el más granular `secretmanager.versions.add` + `secretmanager.versions.access` vía rol custom) | Los secretos que el panel puede rotar | Escribir nuevas versiones desde el panel |
| `castor-run@castor-app-506901...` | `roles/secretmanager.secretAccessor` | `SECRET_KEY` y `DATABASE_URL` (**ya concedido hoy**, confirmado en §1.2) + `DRIVE_TOKEN_SECRET` (nuevo, si se centraliza ahí) | Leer los compartidos sin necesitar su propia copia |

**Nota de diseño:** separar la SA que *lee* (necesaria para que el servicio arranque) de la que
*escribe* (necesaria solo cuando un admin rota algo desde el panel) reduce el radio de alcance de
un compromiso del proceso principal — si `pollux-run@` nunca tiene permiso de escritura sobre
Secret Manager, un bug de aplicación no puede rotar secretos aunque quisiera. Esto es una
decisión de Rick (cuánta fricción operativa vs. cuánto aislamiento), lo dejo como opción, no como
requisito.

### 5.2 Costo aproximado de Secret Manager

Precios públicos de Google Cloud (no dependen de esta cuenta, son los de catálogo): **las primeras
6 versiones activas de secreto son gratis**; después, ~US$0.06 por versión activa por mes, más
~US$0.03 por cada 10.000 operaciones de acceso. Con 5-6 secretos (los de la tabla del §1.1) y
2 versiones activas por secreto durante una ventana de rotación (actual + anterior), el total
**entra casi completo en el tier gratuito** — el costo real esperado es de centavos de dólar al
mes, no una variable relevante para la decisión. El volumen de accesos (cada arranque de
contenedor, más cada ciclo de recarga del caché si se usa TTL corto) tampoco se acerca a un costo
significativo con el tráfico actual de estos dos servicios.

---

## 6. Plan de prueba

1. **Local primero:** con el flujo de `docker-compose.cloud.yml` que ya usa Castor para probar GCS
   real (ADC montada, sin secreto nuevo) — extenderlo para que el backend local también pueda
   leer de Secret Manager real en vez de `.env`, de forma opcional (`SECRETS_BACKEND=local|gcs`,
   mismo espíritu que `DATA_BACKEND` de Castor-Node). Probar el ciclo completo (rotar, doble
   clave, test, rollback) contra un secreto de prueba dedicado (no uno de los reales) antes de
   tocar nada en prod.
2. **Prod, en orden de riesgo creciente:**
   - **`DRIVE_STATE_SECRET` primero** — vida útil de segundos, sin dato persistente que dependa
     de él (§1.1). Si algo sale mal, el peor caso es que alguien tenga que reintentar conectar su
     Drive una vez.
   - **`GOOGLE_DRIVE_CLIENT_SECRET`** después, coordinando que el valor nuevo ya exista en la
     consola de Google antes de rotar acá (no es algo que este panel pueda generar).
   - **`DRIVE_TOKEN_SECRET`** con el flujo completo de re-cifrado (§3.2), en una ventana de bajo
     tráfico, avisando antes.
   - **`SECRET_KEY` al final**, con la ventana de doble clave ya probada en los tres anteriores —
     es el que más usuarios reales toca si algo sale mal (sesiones de **ambos** productos).
3. **`DATABASE_URL` no entra en este plan de prueba** (§3.3) — queda con el procedimiento manual
   actual.

---

## 7. Qué necesita implementar Castor de su lado (lista para su PM)

**Estado T14 (2026-10-03)**, contra `PBS-Panama/Castor-app` `main` en `1528c45` (notas 136-140
de su Handover, verificado leyendo su código, no solo su reporte):

1. ⏳ **PENDIENTE** — `authMiddleware.js` (Express) — soportar doble clave en la verificación de
   `SECRET_KEY`: hoy prueba un solo valor; tiene que aceptar el actual y el anterior durante la
   ventana de rotación, mismo criterio que el `decode_token()` de Python (§3.1). Es el último del
   orden que Castor viene siguiendo (`DRIVE_STATE_SECRET` → `GOOGLE_DRIVE_CLIENT_SECRET` →
   `DRIVE_TOKEN_SECRET` → `SECRET_KEY`) — todavía no empezado. `SECRET_KEY` sigue y debe seguir
   bloqueado en el panel de Pollux hasta que esto exista.
2. ❓ **SIGUE SIN CONFIRMAR** — a qué secreto apunta realmente `pb-castor` hoy para
   `SECRET_KEY`/`DATABASE_URL` (el identificador que muestra `gcloud run services describe` no
   coincide en forma con `leto-secret-key`/`leto-database-url`, §1.2). No apareció resuelto en
   ninguna de las notas 136-140 — sigue siendo una pregunta abierta para cuando se encare
   `SECRET_KEY` (punto 1).
3. ✅ **HECHO** (nota 140) — lectura desde Secret Manager para `DRIVE_TOKEN_SECRET`, cross-proyecto
   contra `pollux-app-507503`, con reintento ante `InvalidToken` para la ventana de caché de 5 min
   entre que Pollux re-cifra y esta instancia refresca su copia cacheada.
4. ✅ **RESUELTO, pero distinto de lo que pedía el punto original** (nota 140) — Castor NO
   participa en el re-cifrado: por diseño (§2.3, "un secreto, un proyecto, un escritor"), el
   `_reencrypt_drive_secret_rows()` de Pollux es el único que toca `drive_tokens`/`api_key_config`
   compartidas, en una sola transacción atómica — Castor solo necesita poder volver a leer bien
   después (punto 3). No hace falta coordinación de "no escribas por N minutos": no hay fase
   intermedia, es todo-o-nada por transacción de Postgres.
5. ✅ **MOOT** — ya no aplica: `GOOGLE_DRIVE_CLIENT_SECRET` se movió a `api_key_config` (T13), una
   sola fila en la DB compartida — no hay "dos clientes distintos" posibles, es el mismo valor por
   construcción.
6. ✅ **HECHO** (notas 138/140) — Castor tiene su propio endpoint `POST /api/admin/secrets/{name}/
   test` (igual contrato que el de Pollux) para `DRIVE_STATE_SECRET` (prueba real) y
   `DRIVE_TOKEN_SECRET` (`_test_drive_token_secret`, cifra+descifra un valor de prueba sin tocar
   filas reales) — puede confirmar por su cuenta que lo que está leyendo ahora mismo funciona, sin
   depender de Pollux.
7. ✅ **CONFIRMADO, sin tabla propia** — Castor usa la MISMA `secret_rotation_log` en
   `leto-postgres` (vía `GET/POST /api/admin/secrets/...`, mismos paths que Pollux) para las
   rotaciones que sí hace (`DRIVE_STATE_SECRET`, el suyo propio) — no necesitó ni construyó una
   tabla Node-side separada.
8. ✅ **HECHO, verificado T14** — migración `0013_secret_rotation_log.py` copiada; diff byte a
   byte contra la de Pollux (T14): **0 líneas de diferencia**, mismo `revision`/`down_revision`.
   Sin correr todavía en ninguno de los dos lados (gate de siempre, autorización explícita antes
   de `alembic upgrade head` contra `leto-postgres`).

**Punto nuevo que no estaba en la lista original, aviso de Castor (nota 140):** los nombres de
los secretos NUEVOS que cree Pollux en Secret Manager tienen que ser el nombre **literal** de la
constante (`DRIVE_TOKEN_SECRET`, `DRIVE_STATE_SECRET`), no un alias con prefijo `leto-` — ver
§8.1, corregido en T14. El código de los dos repos (`_secret_path()`) no soporta ningún mapeo.

---

## 8. Plan de producción (T10) — pendiente de revisión con Dandy y el PM de Castor

**T10 ya verificó, contra Secret Manager real** (secreto desechable `pollux-secrets-panel-test`
en `pollux-app-507503`, creado y destruido en la misma corrida, sin tocar `leto-secret-key`,
`leto-database-url`, IAM real ni `pb-pollux`): `get`/`add`/`rollback` funcionan contra la API
real, el caché TTL evita una llamada de más dentro de la ventana, y se confirmó por lectura de
IAM (sin conceder nada) que `pollux-run@` **hoy no tiene** permiso de escritura sobre ningún
secreto. Lo que sigue es el plan para que sí lo tenga, de forma acotada, cuando se apruebe.

### 8.1 Secretos — crear o reutilizar

**Corrección (T14, 2026-10-03, decisión de Rick vía Dandy, aviso de Castor nota 140):** la
versión anterior de esta tabla proponía nombres con prefijo `leto-` (`leto-drive-token-secret`,
`leto-drive-state-secret`, `leto-google-drive-client-secret`) para los secretos NUEVOS. Es
**incorrecto contra el código real**: `GcpSecretManagerStore._secret_path()` (en los dos
repos, Pollux y Castor, confirmado línea por línea) arma el ID del secreto en Secret Manager
como `f"projects/{project}/secrets/{name}"` usando el **nombre literal de la constante**
(`DRIVE_TOKEN_SECRET`, `DRIVE_STATE_SECRET`) — no hay alias ni mapeo en ningún lado del código.
Si alguien hubiera creado `leto-drive-token-secret` siguiendo la tabla vieja, **ningún backend lo
habría encontrado nunca** (Castor lo detectó primero porque implementó el lado lectura antes de
que esto se corrigiera acá). Decisión: los secretos nuevos se crean con el nombre **literal** de
la constante, sin excepción.

| Secreto | Acción | Nota |
|---|---|---|
| `SECRET_KEY` | **No se toca todavía** — sigue bloqueado en el panel (`ROTATION_DISABLED`, Castor no tiene doble clave para este). El secreto `leto-secret-key` que ya existe en `pollux-app-507503` **no se renombra ni se reutiliza** — es infraestructura previa a este panel (§1.2), con un nombre que no coincide con lo que el código buscaría si se lo activara (`SECRET_KEY` literal). **Dejar anotado para cuando se desbloquee:** en ese momento hace falta crear un secreto nuevo llamado literalmente `SECRET_KEY` (mismo criterio que los dos de abajo) — `leto-secret-key` queda como está, sin usarse por este código, salvo que alguien decida limpiarlo aparte. | Alto riesgo — compartido, bloqueado |
| `DATABASE_URL` | **No se toca** — fuera de alcance del panel (§3.3), esta tarea no la rota ni la lee vía `secret_loader`. `leto-database-url` queda como está, sin relación con este panel. | — |
| `DRIVE_TOKEN_SECRET` | **Crear nuevo con este nombre literal**, en `pollux-app-507503`, sembrado con el valor actual del env var de `pb-pollux` (copiarlo tal cual, no generar uno nuevo en la creación). Castor ya lee de acá (Handover nota 140) con el mismo nombre literal — confirmado. | Alto riesgo — compartido |
| `DRIVE_STATE_SECRET` | **Crear nuevo con este nombre literal**, en `pollux-app-507503`, mismo criterio. **No compartido** — confirmado por los dos lados independientemente (Pollux: nota 41, solo `SECRET_KEY`/`DRIVE_TOKEN_SECRET` se igualaron; Castor: nota 137/138, mismo hallazgo) — Castor mantiene el suyo propio en `castor-app-506901`, también con nombre literal. | Bajo riesgo |

**`GOOGLE_DRIVE_CLIENT_SECRET` ya no va en esta tabla** — se movió fuera de este panel en T13
(2026-10-03): vive en `api_key_config` (DB compartida), no en Secret Manager, confirmado también
del lado de Castor (Handover nota 139, "ya estaba en api_key_config, confirmado"). No hace falta
crear ningún secreto nuevo para esto.

**Por qué crear los 2 nuevos ANTES de deployar el código nuevo, con el valor actual copiado tal
cual (no uno generado):** si no existen todavía cuando el código nuevo arranca,
`GcpSecretManagerStore.seed_if_missing()` los crearía automáticamente al vuelo — lo cual
necesitaría darle a `pollux-run@` permiso de `secrets.create`, un permiso más amplio del que hace
falta. Creándolos a mano de antemano, `pollux-run@` nunca necesita ese permiso — solo lee y rota
los que ya existen.

### 8.2 Comandos IAM exactos, por secreto

**Antes de correr nada de esto:** confirmar con Dandy. Ninguno de estos comandos se ejecutó —
son los que haría falta correr, uno por uno, nunca a nivel de proyecto.

**Decisión de Rick (2026-10-03):** nada de `secretVersionManager` — incluye `destroy`
(irreversible: una app comprometida podría borrar versiones de verdad, no solo deshabilitarlas).
Rol **custom** en `pollux-app-507503`, con exactamente lo que el código llama y nada de
`destroy`:

```bash
gcloud iam roles create polluxSecretRotator \
  --project=pollux-app-507503 \
  --title="Pollux Secret Rotator" \
  --description="Leer, rotar y hacer rollback de los secretos del panel — sin destroy" \
  --permissions=secretmanager.versions.add,secretmanager.versions.access,secretmanager.versions.get,secretmanager.versions.list,secretmanager.versions.enable,secretmanager.versions.disable \
  --stage=GA
```

Concedido **por secreto**, nunca a nivel de proyecto — para los 2 nuevos (nombres literales,
corregido en T14; `SECRET_KEY`/`leto-secret-key` queda fuera de esta lista mientras siga
bloqueado, ver §8.1):

```bash
for s in DRIVE_TOKEN_SECRET DRIVE_STATE_SECRET; do
  gcloud secrets add-iam-policy-binding "$s" \
    --project=pollux-app-507503 \
    --member="serviceAccount:pollux-run@pollux-app-507503.iam.gserviceaccount.com" \
    --role="projects/pollux-app-507503/roles/polluxSecretRotator"
done
```

Esto reemplaza los dos roles predefinidos que había propuesto antes (`secretAccessor` +
`secretVersionAdder`) — el rol custom ya incluye `versions.access` (lectura de payload), así que
no hace falta `secretAccessor` aparte para `pollux-run@`.

`castor-run@` — necesita lectura en `DRIVE_TOKEN_SECRET` (el que de verdad usa hoy, nota 140 de
Castor ya está leyendo de acá con este nombre):

```bash
gcloud secrets add-iam-policy-binding DRIVE_TOKEN_SECRET \
  --project=pollux-app-507503 \
  --member="serviceAccount:castor-run@castor-app-506901.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

`castor-run@` **no** necesita nada en `DRIVE_STATE_SECRET` de Pollux — Castor tiene el suyo
propio, independiente, en `castor-app-506901` (§8.1). `GOOGLE_DRIVE_CLIENT_SECRET` no aplica acá
en absoluto, está fuera de Secret Manager desde T13.

### 8.3 Env vars nuevas de `pb-pollux`

Ninguna variable de entorno nueva hace falta para que el código funcione — `secret_loader.py` ya
usa `pollux-app-507503` por defecto (`SECRET_MANAGER_PROJECT_ID`), que es donde viven estos
secretos. Lo que cambia es que, una vez desplegado el código nuevo y migrados los 2 secretos
nuevos (§8.1), **las env vars actuales (`DRIVE_TOKEN_SECRET`, `DRIVE_STATE_SECRET`) se pueden
sacar de la configuración de Cloud Run** — dejan de leerse en producción (`_is_production()`
fuerza el backend de Secret Manager, nunca cae al env var). No hace falta sacarlas en el mismo
deploy que el código nuevo — pueden convivir unos días por las dudas, el código en producción
simplemente las ignora. `SECRET_KEY` sigue como env var plana mientras siga bloqueado (§8.1).
`GOOGLE_DRIVE_CLIENT_SECRET` ya no aplica a este punto — no está en Secret Manager (T13).

### 8.4 Orden de deploy — Pollux y Castor

**Actualizado T14 (2026-10-03):** el código del lado de Castor para los puntos 1 y parte del 3 ya
está hecho y confirmado por lectura contra `origin/main` de `PBS-Panama/Castor-app`
(`1528c45`, notas 138-140 de su Handover) — **todavía no desplegado a `pb-castor`** (son commits
en el repo, no una revisión nueva de Cloud Run corriendo). Lo que sigue describe el orden
completo igual, marcando qué parte ya está lista para desplegar y qué falta.

El orden importa porque `DRIVE_TOKEN_SECRET` es compartido: si Pollux rota en producción antes de
que el deploy de Castor con lectura desde Secret Manager esté corriendo, Castor empieza a fallar
al descifrar — una caída real, no teórica. (`SECRET_KEY` no entra en este orden todavía: sigue
bloqueado, Castor no tiene doble clave para él — ver §7 actualizado.)

1. **Desplegar el código de Castor ya hecho** (o al mismo tiempo que el paso 5, nunca después):
   doble clave en `DRIVE_STATE_SECRET` vía `secret_loader` (nota 138) + lectura de
   `DRIVE_TOKEN_SECRET` desde Secret Manager cross-proyecto, con reintento ante `InvalidToken`
   (nota 140) + migración `0013` copiada (idéntica, verificado T14 — sin correrla todavía si
   Pollux no la corrió). Con esto desplegado, Castor sigue funcionando exactamente igual que hoy
   para todo lo demás — el cambio es que YA PUEDE tolerar que Pollux rote `DRIVE_TOKEN_SECRET`,
   sin que Castor todavía haga nada distinto por su cuenta (nunca escribe ese secreto — bloqueado
   también de su lado, por diseño, no por falta de soporte).
2. **Correr la migración `0013`** contra `leto-postgres` (procedimiento ya establecido: backup,
   túnel, `alembic upgrade head`, verificación con salida real — igual que `0007`→`0012`). Una
   sola vez, no una por producto. Confirmado T14: el archivo es idéntico byte a byte en los dos
   repos — no hay nada que reconciliar antes de correrla.
3. **Crear y sembrar los 2 secretos nuevos** (§8.1, nombres literales) con los valores actuales —
   todavía sin tocar IAM ni deployar código que los lea.
4. **Conceder el IAM** (§8.2) — en este punto `pollux-run@`/`castor-run@` ya pueden leer/rotar,
   pero el código viejo de `pb-pollux` (sin este cambio) ni siquiera lo intenta — sin efecto
   todavía.
5. **Deployar Pollux** (el código de T9+T10, `pb-pollux-v2` primero, verificar, después
   `pb-pollux`, regla de siempre de este repo). A partir de acá el panel funciona de verdad en
   producción, pero **nadie rota nada todavía** — el deploy en sí no dispara ninguna rotación.
6. **Probar el panel en prod** empezando por el secreto de menor riesgo (`DRIVE_STATE_SECRET`,
   como ya definió el plan de prueba de T8 §6), después `DRIVE_TOKEN_SECRET` — **solo si para
   entonces se desbloqueó su `ROTATION_DISABLED`, ver §7 actualizado, decisión pendiente de
   Rick**. `SECRET_KEY` al final, cuando exista doble clave del lado de Castor (todavía no
   empezado). `GOOGLE_DRIVE_CLIENT_SECRET` sale de esta secuencia — no vive en este panel desde
   T13, se prueba/rota desde `api_key_config` (Settings → Security, ya en producción local).

### 8.5 Cómo volver atrás, en cada paso

| Paso | Si algo sale mal | Cómo revertir |
|---|---|---|
| 1 (Castor deploya) | El deploy de Castor falla o se comporta raro | Revertir al deploy anterior de Castor — no afecta a Pollux, que sigue sin cambios |
| 2 (migración 0013) | `alembic upgrade head` falla | La migración solo crea una tabla nueva (`CREATE TABLE IF NOT EXISTS`) — sin `downgrade` destructivo necesario salvo que se quiera, `DROP TABLE secret_rotation_log` ya está en el archivo |
| 3 (crear secretos) | Un valor sembrado mal | Los secretos son nuevos — si el valor sembrado está mal, se agrega una versión nueva corregida (`gcloud secrets versions add`) antes de que nada los lea en producción; no hay impacto porque el código viejo todavía no los lee |
| 4 (IAM) | — | `gcloud secrets remove-iam-policy-binding` con los mismos parámetros revierte cualquier binding de este paso, uno por uno |
| 5 (deploy Pollux) | El servicio no arranca o se comporta mal | Split de tráfico de vuelta a la revisión anterior (`pb-pollux-00009-gkk` o la que esté corriendo antes de este deploy) — mismo patrón que cualquier otro rollback de Cloud Run de este proyecto |
| 6 (primera rotación real) | Una rotación en prod sale mal | El panel mismo tiene Rollback — primera línea de defensa. Si el panel no es usable (el propio deploy está roto), falta un plan B explícito: revertir el deploy de Pollux (paso 5) vuelve al código viejo, que sigue leyendo el env var plano — **siempre que no se hayan borrado los env vars viejos todavía (§8.3 dice dejarlos un tiempo, exactamente por esto)** |

### 8.6 Lo que NO cambia con T10

`DATABASE_URL` sigue exactamente igual (§3.3, fuera de alcance). El backend de archivo de
desarrollo (T9) sigue siendo lo que usa el stack local — nada de esto afecta el flujo de
`docker compose up` de nadie.

---

## 9. T14 — Análisis: ¿se puede desbloquear ya la rotación de `DRIVE_TOKEN_SECRET`?

**No se tocó `ROTATION_DISABLED` en el código** — esto es análisis y propuesta únicamente, a la
espera del OK explícito de Rick, como pidió.

### El mecanismo ya es seguro, en el papel

Con el código que Castor ya tiene (sin desplegar todavía, nota 140):
- Lectura cross-proyecto confirmada contra el mismo secreto (`DRIVE_TOKEN_SECRET` literal, mismo
  proyecto `pollux-app-507503`, §3 de este documento).
- `decrypt_token()` del lado Castor reintenta ante `InvalidToken` invalidando su caché y
  releyendo — cubre exactamente la ventana de hasta 5 minutos entre que Pollux re-cifra/activa la
  versión nueva y el caché de otra instancia (la de Castor, o cualquier otra réplica de Pollux que
  no haya sido la que rotó) se actualiza solo.
- Pollux sigue siendo el único escritor (`_reencrypt_drive_secret_rows()`), una sola transacción
  atómica — Castor nunca escribe, ni re-cifra, ni crea una segunda pasada que pueda competir con
  la de Pollux (`_check_castor_owns()` lo bloquea también a nivel de código, no solo HTTP).

Ningún hallazgo de Castor (nota 140, incluida la actualización con los 3 fixes que pidió su PM)
quedó sin resolver sobre este punto específico — el `seed_if_missing()` que podía escribir sin
querer en el proyecto de Pollux ya se cerró (punto 2 de esa nota), y es justamente el tipo de
problema que este desbloqueo necesitaba tener resuelto antes de considerarse.

### Pero el desbloqueo no es solo un flag — depende de qué esté REALMENTE corriendo en prod

Hoy, en producción, ni `pb-pollux` ni `pb-castor` leen `DRIVE_TOKEN_SECRET` de Secret Manager
todavía — los dos siguen con el env var plano de Cloud Run (el código de T9/T10 de Pollux nunca
se desplegó más allá de local/pruebas puntuales con un secreto desechable, §8 arriba sigue
"pendiente de ejecutar"; el de Castor está commiteado y pusheado pero no desplegado, nota 140). Si
se saca `DRIVE_TOKEN_SECRET` de `ROTATION_DISABLED` HOY, en el código fuente, no pasa nada por sí
solo — pero es una bandera que queda lista para que la primera rotación real en producción, el día
que se despliegue, ya no esté bloqueada. El riesgo real no es el flag, es el **orden de deploy**:
si alguien rota `DRIVE_TOKEN_SECRET` en prod mientras `pb-castor` sigue en la revisión VIEJA (env
var plano, sin `secret_loader`, sin el reintento ante `InvalidToken`), esa instancia vieja no
tiene ningún mecanismo para enterarse — el env var de Cloud Run no cambia solo porque Secret
Manager tenga una versión nueva. Mismo resultado que describe hoy el texto de
`ROTATION_DISABLED`: filas cifradas ilegibles para Castor, sin forma de recuperarse sola.

### Propuesta

**No desbloquear el código todavía.** Condicionar el desbloqueo de `DRIVE_TOKEN_SECRET` en
`ROTATION_DISABLED` a que se cumplan, en este orden, los tres pasos de §8.4 que todavía no
pasaron:

1. Migración `0013` corrida contra `leto-postgres` (paso 2 de §8.4) — sin esto, ni rotar ni
   hacer rollback puede escribir auditoría, revienta antes de llegar a la pregunta de si Castor
   está listo o no.
2. **`pb-castor` desplegado con el código de las notas 138-140** (paso 1 de §8.4) — confirmado por
   el PM de Castor con la revisión real corriendo, no solo "está commiteado". Esto es lo único que
   de verdad habilita el desbloqueo: sin esto, el mecanismo entero (lectura + reintento) no existe
   en producción, por más seguro que esté en el repo.
3. `pb-pollux` desplegado con el código T9/T10 (paso 5 de §8.4) y el secreto `DRIVE_TOKEN_SECRET`
   ya creado/sembrado con el valor actual (paso 3) — para que la primera rotación real tenga algo
   coherente de donde partir.

Recién con los tres confirmados, sacar `DRIVE_TOKEN_SECRET` de `ROTATION_DISABLED` en
`secret_loader.py` pasa a ser un cambio de una línea, de bajo riesgo — el mismo commit que se haga
en ese momento puede ser el que lo saque, no hace falta anticiparlo ahora. Mientras tanto queda
bloqueado y visible en el panel, con el motivo actual.

**`SECRET_KEY` sigue bloqueado, sin cambios** — Castor no tiene doble clave para este (confirmado,
§7 punto 1, todavía no empezado del lado de Castor). No aplica nada de este análisis a `SECRET_KEY`
todavía.
