# Embarques — modelo de verificación · decisiones de Rick, 2026-09-15

> 📌 **DOCUMENTO DEL PM — SOLO LECTURA PARA EL DEV.** Es la especificación que ejecutan los hitos
> E-1 a E-4 del plan de la nota (63) del `Handover.md`. Para responder o registrar avances:
> `Handover.md`.

**Estado:** decisiones tomadas, **nada construido todavía**. No existe modelo ni tabla de embarques
en ninguno de los dos productos (`app/models/` solo tiene `company.py`, `document.py`,
`seafarer.py`, `user.py`).

**Lo que ya estaba decidido y no se reabre:** el embarque es la unidad de dato y nace **no
verificado**; la verificación la hace un admin contactando a la naviera y produciendo un respaldo,
no es automática; la verificación es **bajo demanda**, se dispara cuando una naviera muestra
interés en ese perfil o cuando el marino la pide.

**El principio que atraviesa todo:** *«verificado» es una afirmación que hace Castor*, no un dato
que el marino declara. Una naviera va a contratar apoyándose en esa palabra. Cada estado tiene que
aguantar la pregunta «¿en qué te basaste para decir eso?».

---

## 1 · Las decisiones

| # | Pregunta | Decisión de Rick |
|---|---|---|
| 1 | ¿Los tipos de evidencia pesan distinto? | Hacia afuera, **un solo** «verificado». Adentro, en vez de una etiqueta de tipo de evidencia: **un pipeline en el panel de admin donde se registra cada interacción con la naviera** (§3). |
| 2 | ¿Qué pasa cuando la naviera no contesta? | Estado propio **`no_verificable`**, visible con su razón, reabrible. **30 días calendario, mínimo 5 intentos registrados, máximo 10.** |
| 3 | ¿Contradicción parcial / información falsa? | Se verifica con el dato de la naviera y **se conserva lo declarado al lado**. Para la información encontrada falsa: **no hay rechazo terminal** — es una **remarca a subsanar**, apelable, fuera del reloj de 30 días (§4). |
| 4 | ¿Se puede retractar una verificación? | **Sí**, y nunca borrando: queda el período en que estuvo verificada, con qué evidencia y por qué se revirtió. La naviera recibe aviso **con acuse**. |
| 5 | ¿Quién se entera de qué? | **Cada inicio y cada conclusión de un trámite se notifica en la campanita de las partes interesadas: marino, admin y usuario de Pollux** (§5). |

---

## 2 · Máquina de estados

| Estado | Cómo se llega | Qué ve la naviera |
|---|---|---|
| `declarado` | lo crea el marino | el dato, marcado como declarado por el marino |
| `en_verificacion` | un admin abre el caso → arranca el reloj y el contador | que hay una verificación en curso |
| `verificado` | evidencia recibida y aceptada | el sello, sin el detalle del pipeline |
| `no_verificable` | **30 días cumplidos Y ≥5 intentos registrados** · o reversión sin contradicción | el estado **con su razón** en lenguaje claro |
| `observado` | se verificó como falsa alguna información | **«en revisión»**, con el badge de revisión — **sin el detalle de la remarca** |

**Reversión:** `verificado` → `no_verificable` u `observado` según la causa. Siempre escribe
historial y siempre dispara la notificación con acuse a la naviera.

**Reapertura:** `no_verificable` → `en_verificacion` cuando el marino aporta algo nuevo. El
contador de intentos **no se reinicia**; se acumula contra el techo de 10.

**Redacción obligatoria:** la razón de `no_verificable` dice lo que pasó, no una insinuación —
«la naviera no respondió en 30 días, 6 intentos registrados», nunca «no se pudo confirmar». Un
embarque que se intentó verificar y no se pudo vale más que uno que nadie intentó.

### La regla de los 30 días es sobre el silencio de la naviera, no sobre la diligencia del admin

`no_verificable` exige **las dos condiciones**: `now >= verification_deadline_at` **Y**
`verification_attempts >= 5`. Si pasaron los 30 días con 3 intentos, el caso **no se cierra** — el
admin tiene que seguir intentando. Sin esta conjunción, un solo correo sin respuesta produciría un
`no_verificable` que dice más de nosotros que de la naviera, que es exactamente lo que el mínimo de
5 intentos existe para evitar.

---

## 3 · El pipeline de verificación en el panel de admin

Es la pieza central de la decisión 1, y reemplaza la idea de una columna `evidence_type`. El admin
registra **cada interacción**, y el conjunto del log es la evidencia.

### `embarkation_contact_log` — una fila por intento

```
embarkation_id
attempt_no                -- 1..10, secuencial
contacted_at
channel                   -- telefono | email
phone_number_called       -- el número que se marcó
respondent_name           -- quién respondió
respondent_position       -- su cargo
email_contacted           -- la dirección contactada
attachment_ref            -- PDF del correo, la carta o el documento probatorio (nullable)
comments                  -- texto libre del admin
actor_user_id
```

La UI es el dropzone más los campos de arriba, más la sección de comentarios.
`embarkations.verification_attempts` se **deriva** de esta tabla; no se escribe a mano.

### 🔴 El dropzone NO puede copiar el patrón de subida que ya existe en el admin

La única ruta de subida del panel hoy es `POST /admin/ocr-references/{doc_key}`
(`admin.py:1799`), y escribe a `_OCR_REF_DIR = pathlib.Path("/app/ocr_references")`
(`admin.py:1774`) — **el disco del contenedor**. En Cloud Run ese disco es efímero: lo que se
escriba ahí desaparece en el siguiente despliegue o reinicio de instancia. Es el mismo motivo por
el que los documentos del marino persisten vía Firestore + GCS y no en disco (comentario C3 en
`Dockerfile.prod`).

**Estos archivos son el respaldo de una afirmación que Castor le hace a una naviera.** Perderlos es
lo peor que se puede perder de todo el modelo. El `attachment_ref` tiene que apuntar a
almacenamiento durable (GCS), nunca al patrón de `ocr_references`.

### Una consecuencia honesta de esta decisión

Rick eligió **documentar el proceso** en vez de **definir una regla dura de evidencia mínima**. La
pregunta que quedó sin contestar era si una llamada telefónica sin nada escrito alcanza por sí
sola; con este diseño, la respuesta es que **alcanza si el admin lo juzga así y lo deja
registrado**.

Es defendible, porque el log es auditable y la decisión queda con nombre, cargo y fecha de quien
respondió. **El límite:** «verificado» descansa en el criterio del admin, no en un umbral. Con un
solo admin es consistente por construcción. El día que haya un segundo, dos admins pueden verificar
con estándares distintos y nada en el sistema lo detecta. Cuando eso pase, el arreglo es una regla
mínima escrita, no más campos.

---

## 4 · Información falsa: remarca a subsanar, no rechazo

Rick descartó el estado terminal de rechazo. El modelo es de remediación, y **aplica a cualquier
información encontrada falsa, sea cual sea** — no solo a embarques: también a documentos y a datos
del CV.

- Se convierte en una **remarca a subsanar** por el usuario.
- El usuario puede **apelar redactando el motivo**, para lectura del admin.
- La apelación **mantiene la revisión abierta**.
- **No corre contra el reloj de 30 días**: se maneja **como prioridad**.
- **Si el marino no apela, el estado del documento queda como está y la decisión queda firme con
  la remarca.** No hay plazo que la endurezca ni resolución de oficio: la falta de apelación *es*
  la conformidad.

### `embarkation_remarks`

```
subject_type, subject_id  -- embarkation | document (el mecanismo es general)
field                     -- qué información se encontró falsa
finding                   -- qué dice la naviera
created_by, created_at
appeal_text               -- lo que redactó el marino (nullable)
appealed_at
resolution                -- subsanado | sostenido | firme_sin_apelacion (nullable mientras abierta)
resolved_by, resolved_at
```

Que el marino escriba su motivo y eso mantenga el caso abierto es lo que separa un error honesto
de un CV inflado **sin que el sistema tenga que adivinar la diferencia**: la explicación queda en
el expediente y la decide una persona.

### ⚠️ Dependencia de diseño: el badge de revisión no está en el repo

La naviera ve «en revisión» con el `.svg` de revisión. Los SVG rastreados bajo
`interfaces/*/assets/` son **solo banderas de países y fondos** — no hay ningún badge de estado.
El asset depende del trabajo de badges que Rick tiene aparte. Un dev no puede cablear un badge que
no existe: va un **placeholder marcado como placeholder**, y se anota en el `Handover.md` qué
tamaño y qué nombre de archivo se espera. **No diseñar el badge final.**

---

## 5 · Notificaciones — la campanita, tres audiencias

Decisión de Rick: **cada inicio y cada conclusión de un trámite se notifica a las partes
interesadas en su campanita** — marino, admin y usuario de Pollux.

Es una sola tabla con destinatario, no tres buzones separados: la tabla `users` es compartida entre
los dos productos y el backend es el mismo, así que una tabla sirve a las tres audiencias y cada
frontend renderiza la campanita de la suya.

### `notifications`

```
recipient_user_id         -- marino, admin o usuario de empresa (users es compartida)
recipient_scope           -- seafarer | admin | company   (para filtrar por producto)
company_id                -- nullable, para las de empresa
kind                      -- el evento
subject_type, subject_id  -- embarkation | document | remark
title, body
created_at, read_at
requires_ack              -- bool
acknowledged_at, acknowledged_by
```

⚠️ **`admin_alerts` NO es esta tabla.** Ya existe una `admin_alerts` (`admin.py:1342-1364`, más
`GET /admin/alerts`) y es un **log de ops**, alimentado como fallback del frontend. No reutilizarla.

### Matriz de notificaciones

| Evento | Marino | Admin | Naviera con relación activa | Acuse |
|---|---|---|---|---|
| Se abre la verificación de un embarque | ✔ | ✔ | ✔ si ella la disparó | — |
| Concluye → `verificado` | ✔ | ✔ | ✔ | — |
| Concluye → `no_verificable` | ✔ | ✔ | ✔ | — |
| Concluye → `observado` | ✔ | ✔ | ✔ (solo «en revisión») | — |
| El marino apela | — | ✔ | — | — |
| Se resuelve la apelación | ✔ | ✔ | ✔ | — |
| La remarca queda firme sin apelación | ✔ | ✔ | ✔ | — |
| **Reversión de un `verificado`** | ✔ | ✔ | ✔ | **✔ obligatorio** |

### 🔴 El mismo evento produce textos distintos según la audiencia

Es la trampa de implementación de esta sección. La naviera ve «en revisión» **sin el detalle de la
remarca** (decisión 3), pero el marino y el admin **sí** necesitan saber qué información se
encontró falsa. La implementación ingenua —un solo `title`/`body` replicado a todos los
destinatarios— **filtra el hallazgo a la naviera** y contradice la decisión 3 sin que nadie lo
note.

El texto se renderiza **por `kind` + `recipient_scope`**, no una vez por evento.

---

## 6 · Las otras tablas

### `embarkation_verification_events` — append-only, nunca se borra

```
embarkation_id, from_status, to_status, reason, actor_user_id, created_at
```

Es lo que permite responder «¿qué afirmó Castor, desde cuándo y hasta cuándo». Sin esta tabla, la
decisión 4 no se puede cumplir.

### `embarkations`

```
declared_vessel_name, declared_vessel_imo, declared_company_name,
declared_rank, declared_date_from, declared_date_to        -- nunca se sobreescriben

verified_vessel_name, verified_vessel_imo, verified_company_name,
verified_rank, verified_date_from, verified_date_to        -- NULL hasta que haya verificación

verification_status, status_reason, has_correction
verification_opened_at, verification_deadline_at           -- opened + 30 días calendario
verification_attempts                                      -- derivado del contact_log, techo 10
verified_by, verified_at, reverted_by, reverted_at
```

El consentimiento por embarque ya estaba decidido: **va en columnas, no solo en la UI**.

---

## 7 · El alcance de «cada trámite» — decidido

La decisión 5 dice «cada inicio y conclusión de un trámite». Tomado literalmente incluye trámites
que ya existen y hoy no notifican nada: la verificación de documentos por OCR, la aprobación de una
empresa, la verificación de correo.

**Decisión del PM:** la tabla `notifications` se construye **general desde el día 1** —con `kind`,
`subject_type` y `recipient_scope`— así no hay que rehacerla. Pero en el **hito E-1 se cablean solo
los eventos de embarque y remarca** de la matriz de §5. Los demás trámites se enganchan cuando se
toque cada uno, que es una línea por evento una vez que la tabla y la campanita existen. **No
ampliar el alcance por cuenta propia**; si falta un evento, se anota en el `Handover.md`.

---

## 8 · Alcance real

Cinco tablas nuevas y cuatro superficies de UI que hoy no existen:

| Pieza | Dónde |
|---|---|
| El pipeline de verificación (campos + dropzone + comentarios) | panel de admin, Pollux |
| La remarca a subsanar y la apelación | lado del marino, Castor |
| La campanita del marino | Castor |
| La campanita de la empresa y del admin, con acuse | Pollux |

Más el almacenamiento durable para los adjuntos del pipeline (§3), que es donde está el riesgo
técnico real, y el badge de revisión, que es una dependencia de diseño (§4).

---

## 9 · Lo que esto habilita comercialmente

**Ninguna plataforma que solo muestra lo declarado puede notificar una reversión**, porque nunca
afirmó nada. El costo de la decisión 4 —el historial append-only y el acuse— es exactamente lo que
convierte el sello de «verificado» en algo que una naviera puede citar en su propio proceso de
contratación. Y el pipeline de la §3 es lo que permite contestar *cómo* se verificó, con nombre y
cargo de quien lo confirmó, que es la pregunta que una naviera seria va a hacer tarde o temprano.
