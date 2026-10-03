# Referencias OCR en GCS compartido — propuesta (T7, solo diseño)

**Estado: propuesta, sin ejecutar.** No se creó ningún recurso de GCP, no se tocó IAM, no se
escribió código. Pendiente de aprobación de Rick antes de cualquier paso siguiente.

**Origen:** el PM de Castor propone que Pollux escriba las referencias OCR que se suben desde el
panel admin a un bucket GCS compartido en `castor-app-506901`, y que Castor las lea desde ahí —
hoy cada backend las guarda en el disco de su propio contenedor y en producción nunca se cruzan.

---

## 1. Cómo funciona hoy (leído, no modificado)

### 1.1 Pollux — quién escribe

- **Endpoint:** `POST /admin/ocr-references/{doc_key}` (`backend/app/routers/admin.py`,
  admin-only vía `require_admin`). También `GET /admin/ocr-references` (listado),
  `DELETE /admin/ocr-references/{doc_key}?filename=` (borrado) y
  `GET /admin/ocr-reference-file?doc_key=&filename=` (servir un archivo).
- **UI:** `interfaces/admin/src/pages/admin/AdminOcrManager.tsx`.
- **Disco:** `/app/ocr_references/<doc_key_saneado>/<filename_original>` — bind mount
  `./ocr-references:/app/ocr_references` en `docker-compose.yml`. **En Cloud Run ese disco es
  efímero**: lo subido desaparece en el próximo deploy o reinicio de instancia (mismo problema
  que ya resolvió `embarkation_storage.py` para los adjuntos de embarque — ver §5).
- **Sanitización de `doc_key`:** función `_safe_key()` — saca `..`, `/`, `\`, bytes nulos.
  Duplicada carácter por carácter en Castor (`ocr_references.safe_key()`).
- **Nombre de archivo:** se conserva el original (solo `pathlib.Path(...).name`, sin UUID). Subir
  dos veces el mismo nombre **sobreescribe en silencio** — no hay versionado.
- **Metadatos:** no se persisten. Al subir, se corre OCR una vez (`ocr_provider.get_ocr_provider`)
  y se devuelven `ocrText`/`ocrConfidence`/`suggestedKeywords` en la respuesta HTTP — nada de eso
  se guarda en disco ni en DB. El listado (`GET /admin/ocr-references`) solo expone
  `{name, size}` leídos directo del filesystem.
- **Quién lee hoy:** nadie, más allá del propio alta (el OCR de arriba es "léelo una vez para
  sugerir keywords"). No hay tabla de DB para estos archivos.

### 1.2 Castor — quién escribe y quién lee

Castor (repo separado `PBS-Panama/Castor-app`, carpeta `backend/` propia — duplicado del backend
de Pollux, mismo origen, ya divergente) tiene:

- **El mismo endpoint admin**, pero refactorizado: `admin.py` importa `REF_DIR`/`safe_key` desde
  un módulo nuevo, `backend/app/services/ocr_references.py` (no existe en la copia de Pollux
  todavía). Mismo disco (`/app/ocr_references`), mismo problema de efímero en Cloud Run —
  documentado explícitamente en el docstring de ese archivo.
- **Lector real, agregado el 2026-10-02:** `ocr_references.load_references(doc_key, limit=2,
  max_bytes=4MB)` — devuelve hasta 2 archivos (los más chicos primero) como
  `(nombre, bytes, mime)`, con fallback a una carpeta genérica `_IMO_COURSE_GENERIC` para
  `doc_key` que empiezan con `"IMO "`. Mime por extensión (`.pdf/.png/.jpg/.jpeg/.webp/.gif`), no
  por metadato guardado.
- **Consumidor:** `doc_analyzer._escalate_to_claude()` llama a `load_references()` y pasa esos
  bytes como ejemplos visuales al juez de Claude Vision — esto es lo que hace que "subir más
  ejemplos en el panel admin" mejore de verdad el reconocimiento. Antes del 2026-10-02 las
  referencias se OCR'eaban una vez al subir y nunca se volvían a leer (igual que en Pollux hoy).

**Asimetría real hoy:** Pollux tiene el alta (UI + endpoint) pero nada lee las referencias para
verificación; Castor tiene su propia alta duplicada (mismo código, mismo disco, nunca sincronizado
con el de Pollux) y además el único lector real del pipeline. La propuesta del PM de Castor
alinea esto: un solo lugar de verdad para subir (Pollux, donde trabajan los admins), un solo lugar
que lee para verificar (Castor, donde corre `doc_analyzer`).

---

## 2. Propuesta

### 2.1 Bucket

Reusar **`castor-app-506901-uploads`** (ya existe, ya lo usan Castor-Node para archivos de
marinos y Pollux's `embarkation_storage.py` para adjuntos de embarque — mismo patrón de "un
bucket, varios prefijos que no se cruzan" ya establecido en este stack). No crear un bucket nuevo
salvo que Rick prefiera aislar esto — lo dejo como pregunta abierta (§6).

### 2.2 Esquema de paths

```
ocr-references/<doc_key_saneado>/<filename_original>
ocr-references/<doc_key_saneado>/manifest.json
```

- `<doc_key_saneado>`: misma función `safe_key()` que ya existe en los dos backends (sin cambios
  de comportamiento, solo de destino).
- `<filename_original>`: igual que hoy — nombre tal cual lo subió el admin. **Cambio propuesto
  respecto a hoy:** si el nombre choca, no sobreescribir en silencio — anteponer un sufijo corto
  (`-2`, `-3`...) o un UUID corto, y que el `manifest.json` sea la fuente de verdad de qué archivo
  es cuál (ver abajo). Esto es una mejora sobre el comportamiento actual, no un requisito — si
  Rick prefiere mantener "último que sube gana", se puede dejar igual.
- `manifest.json` por carpeta (un archivo, no un objeto por archivo) con esta forma:
  ```json
  {
    "doc_key": "STCW_BASIC_SAFETY",
    "files": [
      {
        "name": "ejemplo_1.pdf",
        "size": 184320,
        "mime": "application/pdf",
        "uploaded_by": "admin@pollux...",
        "uploaded_at": "2026-10-02T14:00:00Z",
        "ocr_text_excerpt": "...",
        "ocr_confidence": 0.92,
        "suggested_keywords": ["safety", "stcw"]
      }
    ]
  }
  ```
  Esto es nuevo respecto a hoy (hoy esos datos se devuelven una vez por HTTP y se descartan) —
  persistirlos resuelve que el admin pueda ver después qué keywords se sugirieron sin tener que
  volver a subir el archivo, y le da a Castor un atajo (leer el manifest) en vez de tener que
  OCR'ear de nuevo para saber qué hay en la carpeta.

### 2.3 Quién escribe, quién lee

| | Pollux | Castor |
|---|---|---|
| Sube (`PUT`/`POST` del blob + reescribe `manifest.json`) | ✅ único escritor | ❌ |
| Lista (`GET /admin/ocr-references`) | ✅ (lee del bucket) | — (no tiene panel admin de esto) |
| Borra | ✅ único que borra | ❌ |
| Lee para verificación (`load_references()`) | ❌ no lo necesita hoy | ✅ único lector real |

Un solo escritor simplifica el modelo de permisos (ver §2.4) y evita el problema de hoy (dos
copias de disco que nunca coinciden). Si más adelante Castor necesita subir también (por ejemplo,
que el propio juez de Claude guarde un ejemplo nuevo que confirmó), eso es un cambio de alcance
que debería discutirse aparte — no lo asumo acá.

### 2.4 Autenticación y permisos mínimos

Mismo patrón que `embarkation_storage.py` (ya en producción, mismo bucket):

- **Pollux** (`pollux-run@pollux-app-507503.iam.gserviceaccount.com`): `google-cloud-storage`
  directo desde Python, Application Default Credentials (sin secreto nuevo). Permiso necesario:
  **escritura en el bucket completo o, mejor, acotado al prefijo `ocr-references/`** si GCS
  permite condicionar por prefijo en el proyecto (si no, `roles/storage.objectAdmin` sobre el
  bucket igual que tiene `castor-run@` hoy — ver nota de riesgo en §6).
- **Castor** (`castor-run@castor-app-506901.iam.gserviceaccount.com`): ya tiene
  `roles/storage.objectAdmin` sobre este mismo bucket (por los uploads de marinos) — alcanza para
  leer `ocr-references/`, no hace falta un grant nuevo. Si se quiere mínimo privilegio real,
  cambiar a `roles/storage.objectViewer` solo para este prefijo (separado del resto del bucket) —
  pregunta abierta, ver §6.
- **Nada de esto se ejecuta en esta tarea** — es solo lo que haría falta pedir, y a quién.

### 2.5 Versionado / borrado

- Sin versionado de objetos de GCS (no hace falta: el `manifest.json` es append-only hasta que un
  admin borra explícitamente; no se espera que haga falta recuperar una versión vieja de un PDF de
  referencia).
- Borrado: `DELETE` del blob + quitar la entrada correspondiente del `manifest.json` de esa
  carpeta (leer-modificar-reescribir, no hay transacciones en GCS — ventana de carrera aceptable
  dado que es un panel admin de uso esporádico, un solo admin a la vez en la práctica).

### 2.6 Migración de lo que hay hoy en disco

- **Pollux:** lo que haya en `./ocr-references` local (dev) o en el disco efímero de producción
  (si sobrevivió al último deploy) se sube una sola vez al bucket, preservando la estructura
  `<doc_key>/<filename>`, y generando el `manifest.json` inicial con los campos que se puedan
  reconstruir (`name`/`size`/`mime` seguro; `ocr_text_excerpt`/`ocr_confidence`/
  `suggested_keywords` solo si se vuelve a correr OCR sobre cada archivo, ya que no se guardó la
  primera vez).
- **Castor:** mismo ejercicio sobre su propia copia en disco — **probablemente hay duplicados
  entre las dos** (mismo `doc_key`, archivos subidos independientemente en algún momento). Hace
  falta decidir qué pasa si ambos lados tienen un archivo para el mismo `doc_key` con distinto
  contenido — no lo resuelvo acá, es la primera pregunta abierta (§6).
- Dato a favor: en producción, si el disco ya es efímero y se reinició desde el último deploy,
  puede que **no haya nada que migrar de verdad** en Cloud Run — la migración real sería solo de
  lo que exista en los discos de desarrollo local de cada dev. Confirmar esto antes de armar un
  script de migración (otra pregunta abierta).

### 2.7 Modo local / fallback

Mismo patrón que `embarkation_storage.py`/Castor-Node ya usan para este mismo bucket
(`docker-compose.cloud.yml`, no existe todavía una copia de ese archivo en Pollux):

- **Por defecto:** disco local (`./ocr-references`), comportamiento actual sin cambios — no se
  obliga a nadie a tener credenciales de GCP para levantar el stack local.
- **Opt-in a GCS real:** `gcloud auth application-default login --project castor-app-506901`
  (una vez, desde terminal interactiva) + un `docker-compose.cloud.yml` nuevo en Pollux (análogo
  al de Castor) que monta el ADC de solo lectura y setea `GOOGLE_CLOUD_PROJECT=castor-app-506901`
  + una variable nueva (p. ej. `OCR_REFERENCES_BACKEND=gcs|local`, mismo espíritu que
  `DATA_BACKEND` de Castor-Node) para que el código sepa a cuál de los dos ir sin tener que
  adivinar por la presencia de credenciales.
- Sin esto, un dev sin acceso a `castor-app-506901` sigue pudiendo trabajar contra disco local
  exactamente como hoy.

---

## 3. Qué cambia en el código (no implementado, solo alcance)

Si esto se aprueba, el cambio de código esperado es chico y acotado (mismo espíritu que dejó
`ocr_references.py` de Castor: "solo este módulo tiene que cambiar"):

- Pollux necesitaría su propio `ocr_references.py` (hoy no existe — `admin.py` tiene la lógica de
  disco inline) con las funciones de escritura (`store_reference`, `list_references`,
  `delete_reference`) apuntando a GCS en vez de `pathlib`.
- Castor's `load_references()` cambia su implementación interna (leer del bucket en vez del
  disco) **sin cambiar su firma** — `doc_analyzer.py` no se toca.
- `admin.py` de Pollux pasa a importar de ese módulo nuevo, igual que ya hace el de Castor con el
  suyo (evita la duplicación inline actual).

---

## 4. Riesgos conocidos, heredados del precedente (`embarkation_storage.py`)

- El propio código de `embarkation_storage.py` (ya en producción) deja anotado que la necesidad de
  IAM cross-proyecto para `pollux-run@` sobre el bucket de `castor-app-506901` **nunca se verificó
  en producción** — solo se probó desde `castor-run@` (su propio proyecto). Si ese grant no está
  hecho, ni los adjuntos de embarque ni esta propuesta nueva van a poder escribir desde Pollux en
  producción. Vale la pena que Rick confirme el estado real de ese IAM antes de aprobar esto —
  es el mismo bloqueo, no uno nuevo.

---

## 5. Lo que ya existe y sirve de modelo

`backend/app/services/embarkation_storage.py` (Pollux) ya resuelve el mismo problema (disco
efímero → GCS) contra el mismo bucket, con el mismo patrón de autenticación (ADC, sin secreto
nuevo) y el mismo estilo de ref opaca (path del blob, nunca URL firmada/pública). Esta propuesta
reutiliza esas mismas decisiones en vez de inventar un esquema nuevo.

---

## 6. Preguntas abiertas para el dev de Castor

1. **IAM cross-proyecto de `pollux-run@`**: ¿se confirmó en algún momento que
   `pollux-run@pollux-app-507503...` tiene permiso de escritura sobre
   `castor-app-506901-uploads`? El código de `embarkation_storage.py` dice que no se verificó.
   Si no está, es un bloqueante compartido con esta propuesta — mejor resolverlo una sola vez.
2. **Duplicados existentes**: si ambos backends tienen hoy un archivo subido independientemente
   para el mismo `doc_key`, ¿cuál gana en la migración? ¿Hay alguna forma de saber cuál es más
   reciente/mejor sin abrir cada PDF a mano?
3. **¿De verdad hay algo que migrar en producción?** Si el disco de Cloud Run es efímero y ya
   reinició desde el último deploy de cada servicio, puede que la migración real sea solo de los
   discos de desarrollo local. ¿Alguien tiene certeza de esto antes de armar un script?
4. **Permisos de Castor — objectAdmin vs objectViewer**: ¿tiene sentido para el dev de Castor
   acotar su SA a solo lectura sobre el prefijo `ocr-references/`, separado de su permiso de
   escritura sobre `uploads/` (archivos de marinos)? GCS no tiene permisos nativos por prefijo
   dentro de un bucket — implicaría mover esto a un bucket aparte, o aceptar que
   `objectAdmin` ya alcanza y no vale la pena la fricción.
5. **¿Un solo escritor es suficiente?** Esta propuesta asume que solo Pollux sube y solo Castor
   lee (§2.3). ¿Hay algún flujo donde Castor necesite escribir una referencia (por ejemplo, que el
   juez de Claude guarde automáticamente un ejemplo nuevo que confirmó con alta confianza)? Si sí,
   cambia el modelo de permisos.
6. **Nombre de archivo duplicado**: ¿conservar el comportamiento actual (último que sube
   sobreescribe) o pasar a un esquema de sufijo/UUID con `manifest.json` como fuente de verdad
   (§2.2)? Es una decisión de producto, no técnica.
7. **¿Bucket compartido o uno nuevo?** Esta propuesta reutiliza `castor-app-506901-uploads` por
   simplicidad (ya existe, ya tiene permisos de Castor). Si el dev de Castor prefiere aislar las
   referencias OCR en su propio bucket (por costo, por ciclo de vida, por auditoría separada), es
   un cambio menor al esquema de paths (§2.2), no a la arquitectura general.
8. **`OCR_REFERENCES_BACKEND` como nombre de variable**: ¿seguir la convención `DATA_BACKEND` que
   ya usa Castor-Node (`local`/`cloud`), o usar un nombre distinto para evitar confusión con esa
   otra variable que ya existe y hace algo parecido mas no idéntico?
