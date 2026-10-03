# Runbook de producción — Panel de secretos (Pollux + Castor) — T15 + T16

**Para Rick.** Secuencia única, numerada, que cubre los dos servicios (`pb-pollux` en
`pollux-app-507503`, `pb-castor` en `castor-app-506901`) contra la base compartida
`leto-postgres` (`durable-sky-484422-b5:us-central1:leto-postgres`). Ningún comando de este
documento se ejecutó todavía. No hay valores de secretos acá — todo lo que hay que pegar en vivo
está marcado `<ASÍ>`.

**Diseño de fondo:** `docs/specs/secrets-panel.md` (T8-T10, T13, T14). Este runbook no repite el
porqué de cada decisión — solo el cómo, en orden, con el comando exacto.

---

## 0. Hallazgo que decide el orden (T15, verificado en código antes de escribir esto)

Pregunta de Rick: si un secreto todavía no existe en Secret Manager, ¿el código cae al env var o
falla? **Las dos copias se comportan igual hoy, y eso es lo que fija el orden de los pasos:**

- **Pollux** (`secret_loader._load_latest()`): hasta T16 no tenía gate de producción — llamaba
  `seed_if_missing()` sin condición, que **auto-crea el secreto y lo siembra con el valor del env
  var actual**, en cualquier entorno, incluida producción. Esto necesitaría
  `secretmanager.secrets.create` para `pollux-run@`, permiso que el rol custom del paso 7 **no
  le da a propósito** — así que en la práctica ya fallaba (`PermissionDenied` contra la API de
  Google) en vez de sembrar silenciosamente, pero por el motivo equivocado (un permiso que falta,
  no una decisión explícita). **T16 (2026-10-03, pedido del PM tras revisar T15): corregido** —
  mismo gate que Castor, `_load_latest()` ya no siembra en producción, y `get_secret()` ahora
  lanza `SecretNotConfigured` con el nombre del secreto y el proyecto, igual que el mensaje de
  Castor. Test dedicado (`test_secret_loader_production_gate.py`, 7/7) + `test_secret_rotation.py`
  (28/28) + smoke (11/11) — todo corrido de nuevo después del fix, sin regresiones.
- **Castor** (mismo método, con el fix de la nota 140): en producción, si no hay versión, **no
  intenta sembrar nada — falla directo con `SecretNotConfigured`**, un mensaje propio que nombra
  el secreto y el proyecto. Tampoco cae al env var.

**Conclusión: ninguno de los dos cae a la env var en producción — los dos fallan duro, a propósito
ahora, si el secreto no existe todavía.** Por eso los secretos + el IAM van **antes** de desplegar
cualquiera de los dos servicios (pasos 5-10, antes de los pasos 11-12) — no entre medio como
proponía la versión vieja de `secrets-panel.md` §8.4. Esto aplica a los **dos** proyectos de
Secret Manager: `DRIVE_TOKEN_SECRET`/`DRIVE_STATE_SECRET` de Pollux en `pollux-app-507503` (pasos
5-6) y el `DRIVE_STATE_SECRET` **propio** de Castor en `castor-app-506901` (pasos 9-10, agregado en
T16 — faltaba en la versión T15 de este runbook, lo tenía solo del lado Pollux).

---

## 1. Alcance de este runbook — qué NO toca

- `SECRET_KEY` — sigue bloqueado (`ROTATION_DISABLED`), Castor no tiene doble clave todavía. No
  se crea secreto nuevo para esto acá.
- `DATABASE_URL` — fuera de alcance del panel, sin cambios.
- `GOOGLE_DRIVE_CLIENT_SECRET` — ya no vive en Secret Manager (T13), vive en `api_key_config` (DB
  compartida) — no hay nada que crear ni desplegar para este secreto en este runbook.
- La **rotación real** de `DRIVE_TOKEN_SECRET` — queda deliberadamente fuera (T14 §9 de
  `secrets-panel.md`): este runbook deja el mecanismo LISTO y VERIFICADO, pero el desbloqueo de
  `ROTATION_DISABLED["DRIVE_TOKEN_SECRET"]` es una decisión aparte, posterior, de Rick — no un
  paso de este despliegue.

---

## 2. Secuencia completa

| # | Paso | Comando | Quién | Cómo verificar | Cómo volver atrás |
|---|------|---------|-------|-----------------|---------------------|
| 1 | Backup fresco de `leto-postgres` | `gcloud sql backups create --instance=leto-postgres --project=durable-sky-484422-b5 --description="Pre-migracion 0013 - secrets panel T15 - $(date -u +%Y-%m-%d)"` | Rick | `gcloud sql backups list --instance=leto-postgres --project=durable-sky-484422-b5` → estado `SUCCESSFUL`, anotar el ID | No aplica — es de solo lectura sobre el estado actual, nada que revertir |
| 2 | Confirmar la revisión actual de Alembic en prod (antes de tocar nada) | Túnel de solo lectura (ver §3 abajo) + `alembic current` | Dev Pollux (con GO de Rick) | La salida debe ser una revisión real de la cadena (`0009_api_key_config` o más nueva) — si sale vacía o distinta a lo esperado, **parar y avisar a Rick antes de seguir** | No aplica — solo lectura |
| 3 | Correr la migración `0013_secret_rotation_log` — **una sola vez**, no una por servicio (archivo idéntico en los dos repos, confirmado T14) | Mismo túnel, `alembic upgrade head` contra la imagen de Pollux (`pbsds-pollux-backend:latest`) — ver comando completo en §3 | Dev Pollux (con GO de Rick) | `alembic current` → `0013_secret_rotation_log (head)`; `\d secret_rotation_log` → tabla con `id, secret_name, action, secret_version, result, detail, performed_by, performed_at` + índice `(secret_name, performed_at DESC)` | La migración solo crea una tabla nueva. El archivo ya trae `downgrade()` (`DROP TABLE secret_rotation_log`) si hiciera falta — bajo riesgo, no toca ninguna tabla existente |
| 4 | Cerrar el túnel del paso 2-3 | `docker stop <contenedor del proxy>` (o `Ctrl+C` si corrió en foreground) | Dev Pollux | `docker ps` no debe listar el proxy | No aplica |
| 5 | Leer el valor ACTUAL de `DRIVE_TOKEN_SECRET` en `pb-pollux` y sembrarlo en Secret Manager, **sin imprimirlo ni tocar disco** | Ver comando exacto en §4 (pipe directo `gcloud run services describe` → `jq` → `gcloud secrets create ... --data-file=-`) | Dev Pollux (con ADC ya autenticada — no requiere login interactivo) | `gcloud secrets versions list DRIVE_TOKEN_SECRET --project=pollux-app-507503` → una versión, `ENABLED`. **Nunca** hacer `gcloud secrets versions access` para "revisar que quedó bien" — confirmar por longitud/hash si hace falta, no por el valor | El secreto es nuevo — si el valor sembrado está mal, se corrige con `gcloud secrets versions add DRIVE_TOKEN_SECRET --data-file=-` (mismo patrón de pipe), antes de que nada lo lea en producción |
| 6 | Mismo procedimiento para `DRIVE_STATE_SECRET` | Igual que el paso 5, cambiando el nombre | Dev Pollux | Igual que el paso 5 | Igual que el paso 5 |
| 7 | Crear el rol custom `polluxSecretRotator` (si no existe ya) | Ver comando en `docs/specs/secrets-panel.md` §8.2 (sin `destroy`, solo `versions.add/access/get/list/enable/disable`) | Rick (o Dev Pollux con ADC, es solo lectura+creación de rol, no de datos) | `gcloud iam roles describe polluxSecretRotator --project=pollux-app-507503` → existe, con exactamente esos 6 permisos | `gcloud iam roles delete polluxSecretRotator --project=pollux-app-507503` (recuperable con `undelete` dentro de la ventana de gracia de GCP) |
| 8 | Conceder IAM por secreto: `pollux-run@` con `polluxSecretRotator` sobre `DRIVE_TOKEN_SECRET` y `DRIVE_STATE_SECRET`; `castor-run@` con `secretAccessor` solo sobre `DRIVE_TOKEN_SECRET` | 3 comandos `gcloud secrets add-iam-policy-binding`, ver `docs/specs/secrets-panel.md` §8.2 (ya con nombres literales, corregido T14) | Rick (o Dev Pollux con ADC) | `gcloud secrets get-iam-policy DRIVE_TOKEN_SECRET --project=pollux-app-507503` → 2 bindings (`pollux-run@` rotator, `castor-run@` accessor); `DRIVE_STATE_SECRET` → 1 binding (`pollux-run@` rotator, sin `castor-run@`) | `gcloud secrets remove-iam-policy-binding` con los mismos parámetros, uno por uno |
| 9 | **(T16, nuevo)** Leer el valor ACTUAL de `DRIVE_STATE_SECRET` en `pb-castor` y sembrarlo en el Secret Manager **propio** de Castor (`castor-app-506901`, no el de Pollux — es un secreto independiente, confirmado en código: `SECRET_MANAGER_PROJECT_ID` por defecto de Castor, nombre literal `DRIVE_STATE_SECRET`, sin entrada en `SECRET_PROJECT_OVERRIDES`), **sin imprimirlo ni tocar disco** | Mismo patrón de pipe que el paso 5, cambiando servicio/proyecto — ver §6 abajo | PM Castor (con ADC propia, proyecto `castor-app-506901`) | `gcloud secrets versions list DRIVE_STATE_SECRET --project=castor-app-506901` → una versión, `ENABLED` | El secreto es nuevo — corregir con `gcloud secrets versions add` (mismo pipe), antes de que nada lo lea |
| 10 | **(T16, nuevo)** IAM para `castor-run@` sobre su propio `DRIVE_STATE_SECRET` — a diferencia de `DRIVE_TOKEN_SECRET` (donde Castor solo lee), acá Castor **rota y hace rollback de verdad** (es su propio secreto, no compartido) — necesita lectura **y escritura** de versiones, no solo `secretAccessor`. No existe hoy un rol custom equivalente a `polluxSecretRotator` en `castor-app-506901` — crear uno análogo (mismos 6 permisos, sin `destroy`) y el binding, en su propio proyecto | `gcloud iam roles create castorSecretRotator --project=castor-app-506901 ...` (mismos permisos que `polluxSecretRotator`, §8.2 del spec) + `gcloud secrets add-iam-policy-binding DRIVE_STATE_SECRET --project=castor-app-506901 --member="serviceAccount:castor-run@castor-app-506901.iam.gserviceaccount.com" --role="projects/castor-app-506901/roles/castorSecretRotator"` | PM Castor (o Rick) | `gcloud secrets get-iam-policy DRIVE_STATE_SECRET --project=castor-app-506901` → 1 binding, `castor-run@` con el rol nuevo | `remove-iam-policy-binding` + `gcloud iam roles delete castorSecretRotator --project=castor-app-506901` |
| 11 | **Desplegar `pb-castor`** con el código de las notas 138-140 de su Handover (`main` `1528c45` o más nuevo) — recién ahora puede leer `DRIVE_TOKEN_SECRET` (pasos 5+8) y su propio `DRIVE_STATE_SECRET` (pasos 9-10) sin fallar | Build + deploy propio de Castor — coordinarlo con su PM, test service primero si su convención lo pide | Dev Castor (con GO de Rick) | Logs de arranque sin `SecretNotConfigured`; un flujo real que dispare `decrypt_token()` (reconectar Drive, o leer una API key ya guardada) responde 200, no 500; un flujo que use `DRIVE_STATE_SECRET` (iniciar el OAuth de Drive) también responde 200 | Split de tráfico de vuelta a la revisión anterior de `pb-castor` — el código viejo sigue leyendo los env vars planos, que todavía no se sacaron (paso 15) |
| 12 | Verificar `pb-castor` end-to-end antes de tocar Pollux | Smoke manual: login admin, Settings → ver que las claves de terceros compartidas (vía `api_key_config`) siguen cargando igual que antes; iniciar (sin completar) una conexión de Drive | Dev Castor + Rick | Sin errores nuevos en los logs de Cloud Run de las últimas 2-3 interacciones reales | Igual que el paso 11 |
| 13 | **Desplegar `pb-pollux`** con el código T9/T10/T13/T16 — `pb-pollux-v2` primero (regla de siempre de este repo), verificar, después `pb-pollux` | Build + push + `gcloud run deploy pb-pollux-v2 --image ... --region us-central1 --project pollux-app-507503`, verificar, luego repetir con `pb-pollux` | Dev Pollux (con GO de Rick en localhost primero) | `pb-pollux-v2` responde 200 en `/`, login admin funciona, `GET /admin/secrets` devuelve los 3 secretos (`SECRET_KEY`/`DRIVE_TOKEN_SECRET` con `rotation_disabled:true`, `DRIVE_STATE_SECRET` con `false`) con `hint` no vacío para los que ya tienen valor sembrado | Split de tráfico de vuelta a la revisión anterior de `pb-pollux` (la que corre hoy, código viejo con env var plano) |
| 14 | Borrar `pb-pollux-v2` una vez promovido `pb-pollux` | `gcloud run services delete pb-pollux-v2 --region us-central1 --project pollux-app-507503` | Dev Pollux | `gcloud run services list --project pollux-app-507503` ya no lo lista | No aplica — es el servicio de prueba, no el real |
| 15 | **Prueba de Rick, primero una clave de terceros** — confirma que el tab Security del admin funciona en prod de punta a punta, sin tocar Secret Manager todavía | Admin → Settings → Security → "Probar" sobre `ANTHROPIC_API_KEY` o `GOOGLE_VISION_API_KEY` (la que ya esté configurada) | Rick, en el navegador, contra `pb-pollux` real | Respuesta `ok: true` con el detail esperado — confirma auth, rate limit, y el endpoint `POST /admin/config/api-keys/{key_name}/test` funcionando en prod | No hay nada que revertir — `Probar` nunca escribe |
| 16 | **Prueba de Rick, primera rotación real en Secret Manager** — `DRIVE_STATE_SECRET` de Pollux, el de menor riesgo (§6 del spec) | Admin → Settings → Security → Secret Manager → `Rotar` sobre `DRIVE_STATE_SECRET`, con reautenticación | Rick | Reconectar una cuenta de Drive (flujo OAuth completo) funciona después de rotar — confirma que la ventana de doble clave y el HMAC del `state` andan con la clave nueva. `Ver historial` muestra la fila de auditoría nueva | `Rollback` desde el mismo panel — ya probado en local (T13, 28/28 checks) |

---

## 3. Túnel + migración (pasos 2-4), comando completo

Mismo patrón ya usado para `0007`-`0012` (Handover de Pollux, 2026-09-13/14) — Cloud SQL Auth
Proxy autenticado con la credencial IAM ya presente en la máquina (`gcloud auth
application-default login` corrido antes, por Rick, desde VS Code — no desde acá), sin tocar
redes autorizadas ni el firewall de la instancia:

```bash
# Proxy, en un contenedor aparte, puerto local 5433
docker run -d --name cloudsql-proxy-migracion \
  -v ~/.config/gcloud:/config:ro \
  -e GOOGLE_APPLICATION_CREDENTIALS=/config/application_default_credentials.json \
  -p 127.0.0.1:5433:5432 \
  gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest \
  durable-sky-484422-b5:us-central1:leto-postgres

# alembic current — paso 2
docker run --rm --network host \
  -e DATABASE_URL="<DATABASE_URL>" \
  pbsds-pollux-backend:latest \
  alembic current

# alembic upgrade head — paso 3 (una sola vez)
docker run --rm --network host \
  -e DATABASE_URL="<DATABASE_URL>" \
  pbsds-pollux-backend:latest \
  alembic upgrade head

# cerrar el túnel — paso 4
docker stop cloudsql-proxy-migracion && docker rm cloudsql-proxy-migracion
```

`<DATABASE_URL>` es `postgresql://leto_user:<password>@127.0.0.1:5433/leto_db` con la contraseña
real del usuario de la app (ya existe, no es parte de este runbook crearla) — se arma en el
momento, nunca se escribe en un archivo del repo ni queda en el historial de la shell (exportarla
como variable de entorno en la sesión interactiva, no pasarla literal en el comando).

---

## 4. Sembrar un secreto desde el env var actual, sin imprimirlo (pasos 5-6)

Patrón para los dos (`DRIVE_TOKEN_SECRET` y `DRIVE_STATE_SECRET`) — reemplazar `<NOMBRE>`:

```bash
gcloud run services describe pb-pollux \
  --project=pollux-app-507503 --region=us-central1 --format=json \
  | jq -r '.spec.template.spec.containers[0].env[] | select(.name=="<NOMBRE>") | .value' \
  | gcloud secrets create <NOMBRE> \
      --project=pollux-app-507503 \
      --replication-policy=automatic \
      --data-file=-
```

Todo en una sola tubería — el valor nunca toca el disco ni aparece en la salida de la terminal
(`jq -r` lo extrae, `gcloud secrets create --data-file=-` lo consume directo de stdin). Si
`gcloud run services describe` no devuelve ese env var con ese nombre exacto (por ejemplo, si en
producción quedó con otro nombre histórico), **parar y confirmar el nombre real antes de seguir**
— no asumir.

---

## 5. (T16, nuevo) Lo mismo, del lado Castor, para su propio `DRIVE_STATE_SECRET` (paso 9)

Mismo patrón que §4, pero contra `pb-castor`/`castor-app-506901` — **no** es el mismo secreto que
`DRIVE_TOKEN_SECRET` de Pollux, es independiente, confirmado leyendo `secret_loader.py` de Castor:
nombre literal `DRIVE_STATE_SECRET`, proyecto por defecto (no está en `SECRET_PROJECT_OVERRIDES`,
así que resuelve contra `SECRET_MANAGER_PROJECT_ID` = `castor-app-506901`, no contra el de Pollux):

```bash
gcloud run services describe pb-castor \
  --project=castor-app-506901 --region=us-central1 --format=json \
  | jq -r '.spec.template.spec.containers[0].env[] | select(.name=="DRIVE_STATE_SECRET") | .value' \
  | gcloud secrets create DRIVE_STATE_SECRET \
      --project=castor-app-506901 \
      --replication-policy=automatic \
      --data-file=-
```

Mismo cuidado que en §4: si el nombre del env var real en `pb-castor` no es exactamente
`DRIVE_STATE_SECRET`, parar y confirmar antes de seguir — no asumir.

---

## 6. Qué queda pendiente después de este runbook

- Las env vars planas viejas (`DRIVE_TOKEN_SECRET`/`DRIVE_STATE_SECRET` en la config de Cloud Run
  de `pb-pollux`, y `DRIVE_STATE_SECRET` en la de `pb-castor`) **no se sacan en este runbook** —
  pueden convivir unos días, el código nuevo ya no las lee en producción (`secrets-panel.md`
  §8.3). Sacarlas es un paso aparte, cuando Rick confirme que ya no hace falta el plan B de
  "revertir el deploy y seguir leyendo el env var".
- El desbloqueo de `ROTATION_DISABLED["DRIVE_TOKEN_SECRET"]` queda fuera de este runbook — ver
  `docs/specs/secrets-panel.md` §9 (T14): depende de que los pasos 11-13 de arriba ya estén
  confirmados funcionando, y es una decisión aparte de Rick.
- `SECRET_KEY` no tiene secreto nuevo en este runbook — sigue bloqueado hasta que Castor tenga
  doble clave (`secrets-panel.md` §7, punto 1, todavía no empezado).
