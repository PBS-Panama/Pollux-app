# Pollux — Project Manager

**Producto:** Pollux — app Company-facing (B2B, crew managers)
**Carpeta:** `products/portal/pbsds-pollux-app/`
**Marca:** "Leto" hasta el 2026-09-03 · **"Leto" queda reservado para el producto de IA futuro**
**Última actualización:** 2026-09-04 (tarde)
**PM:** Claude (Cowork mode) · **Owner:** Rick

> 📌 **DOCUMENTO DEL PM — SOLO LECTURA PARA EL DEV.** Lo mantiene el PM. El developer lo **lee** al iniciar cada sesión pero **no lo edita**. Para responder, registrar avances o pedir algo: `Handover.md` (compartido).
> 📁 El PM anterior (unificado Leto+Cástor, congelado el 2026-06-11) está archivado en `docs/handover/Project_Manager_pre-split_2026-06-11.md`.

---

## 1. Qué es esta carpeta

Tras el **split físico del 2026-09-03**, esta carpeta es **solo Pollux**. Es una carpeta **nueva y untracked** — git todavía no conoce ni uno solo de sus 655 archivos.

| Contiene | No contiene |
|---|---|
| `interfaces/leto/` — SPA de la empresa (nombre de carpeta histórico; **la marca es Pollux**) | `interfaces/castor/` → se quedó con Castor |
| `interfaces/admin/` — panel interno | `interfaces/user/` + `User database/` → Castor |
| `backend/` — FastAPI (**copia**, ver §4) | `Reference/Stremio/` (Demeter) → Castor |
| `landing/` — entrada + auth | `docker-compose.cloud.yml` · `.override.yml` → Castor |
| `Project_Leto.md` · `Handover.md` · `docs/` — historia completa pre-split | |

**Local:** puerto **4001**, proyecto compose `pbsds-pollux`. El volumen postgres es **nuevo y arranca vacío**; los datos locales históricos quedaron en el proyecto compose `pbsds-leto` de la carpeta de Castor.
**Producción:** `pb-pollux` en GCP `pollux-app-507503` — **ya LIVE**, desplegado desde el worktree del dev, **no desde esta carpeta todavía**.

---

## 2. 🔴 Reglas duras — no negociables

**R1 · La URL `/company/` y la carpeta `interfaces/leto` conservan su nombre a propósito.** Son nombres históricos. Renombrarlos rompe rutas y build sin ganar nada. La marca cambia en el contenido, no en los identificadores.

**R2 · No refactorizar los roles a `castor`/`leto`.** En código y API el role sigue siendo `seafarer` / `company` (la persona, no la marca). Cambiarlo rompe JWT y DB.

**R3 · Todo identificador que hoy diga `leto` pertenece a Pollux, no a la IA.** `pb-leto`, `leto-postgres`, `leto_db`, `leto-user`, repo `Leto-Demo` son infraestructura histórica de Pollux. El rename fue de marca, no de infraestructura. Cuando se construya Leto-IA, **no usar identificadores `leto-*`** — chocan con los de Pollux. Ver el registro de nombres en `CLAUDE.md` de la raíz.

**R4 · `leto-app.com` está ocupado por un tercero** (verificado 2026-08-28, alojado en Vercel). Pollux usa su propio dominio — `pollux-app.com`, pendiente de registrar.

**R5 · Un origen por producto.** Nunca mapear Pollux bajo subdominios `app.` / `api.`. Solo path routing. Ver `PBS-DOMAIN-ARCHITECTURE.md` §3.

**R6 · Gate de localhost antes de cada deploy a producción** (directiva de Rick). Dev termina → `docker compose up -d` → **Rick prueba en `http://localhost:4001` y da OK explícito** → recién entonces build + push + deploy.

---

## 3. 🔴 Situación de git — leer antes de tocar nada

### 3.1 Esta carpeta no está en git

655 archivos, **0 trackeados**. Hasta que se commitee, todo lo que hay aquí vive únicamente en el disco de Rick. Sin backup, sin historia, sin poder revertir.

### 3.2 Ruido de CRLF en el árbol de Castor

El split convirtió LF → CRLF. En `pbsds-leto-app` git marca **841 archivos modificados** que en realidad no cambiaron (`git diff --ignore-cr-at-eol` sale vacío). Antes de commitear cualquier cosa, en la raíz de `pb-website`:

```bash
printf '* text=auto eol=lf\n' > .gitattributes
git add .gitattributes
git add --renormalize .
```

### 3.3 Decisión sobre las ramas (Rick, 2026-09-04): **abandonar y rehacer desde main**

`rename/leto-to-pollux` y `pollux/domain-seo-login` apuntan al **mismo commit** (`f60e46d7`). Divergencia con `main`: 8 commits de main / 7 de la rama. Auditoría de esos 7 commits:

| Qué traen | Cantidad | Veredicto |
|---|---|---|
| Renames `pbsds-leto-app/*` → `pbsds-pollux-app/*` | **1530 archivos** | ❌ Descartar — arrastra Castor dentro de Pollux; choca de frente con el split |
| `.md` de la raíz modificados (CLAUDE, PBS-DOMAIN-ARCHITECTURE, GCLOUD-DEPLOY, SERVICE-STATUS, LOCAL-DOCKER, PBS-ECOSYSTEM, PBS-PROJECT-MAP, Handover, Project_Manager, docker-compose.yml) | 10 archivos | ✅ **Rescatar** — es el valor real de la rama |
| `Reference/AdminPanel/` | 79 archivos | ✅ Rescatar |
| `ocr-references/` | 20 archivos | ✅ **Rescatar — solo existen en ese commit**, en el working tree las carpetas están vacías |
| `User database/` de runtime | 7 archivos | ❌ Descartar — basura de sesión |
| **Diff de código fuente** | **cero** | `landing/` cambia 35 archivos con **0 inserciones y 0 borrados** — puro rename |

**Conclusión:** el trabajo de dominio / SEO / login del dev vive en GCP y en la documentación, **no en el código del repo**. No se pierde nada de código al abandonar la rama.

**Procedimiento:**
1. Rescatar de `f60e46d7` los 10 `.md` de raíz, `Reference/AdminPanel/` y `ocr-references/` (cherry-pick por ruta, `git checkout f60e46d7 -- <ruta>`, ajustando la ruta destino de `pbsds-pollux-app/` a donde corresponda).
2. Commitear el split en `main`.
3. El dev arranca una rama nueva desde `main` post-split.
4. **No borrar las ramas viejas** — quedan como archivo por si aparece algo.

### 3.4 ⚠️ El worktree del dev fue movido y está roto

Registrado en `.git/worktrees/pb-website-pollux` apuntando a `00 Dominius/pb-website-pollux`, **carpeta que ya no existe**. El worktree físico está en `products/portal/_DELETE-ME_pollux-runtime-spill/pb-website-pollux`.

Verificado el 2026-09-04: **no tiene trabajo sin commitear** — todo lo que marca como modificado es ruido de CRLF. Es descartable.

**🔴 Pero la carpeta se llama `_DELETE-ME_` y NO es solo basura de runtime como decía el `SPLIT-2026-09-03.md`. Contiene el worktree del dev.** Antes de borrarla:
```bash
git worktree prune          # limpia el registro roto
```
…y confirmar con el dev que no tiene nada suyo ahí. El resto del contenido de esa carpeta (`interfaces/`, `ocr-references/`, `User database/`) son **directorios vacíos** — 0 archivos; lo que valía ya fue rescatado.

---

## 4. ⚠️ Código duplicado — regla de sincronización

El split dejó **seis árboles byte-idénticos** en las dos carpetas (verificado por md5 el 2026-09-04). El `SPLIT-2026-09-03.md` solo advertía del backend; la lista real es más larga:

| Árbol | Riesgo si divergen |
|---|---|
| `backend/` (52 archivos) | 🔴 **Crítico** — ambas copias apuntan a la MISMA DB de prod (`leto-postgres`) |
| `landing/` | 🔴 Crítico — mismo canonical SEO en dos productos (ver §5.1) |
| `shared/` | 🟠 Alto |
| `onboarding/` | 🟡 Medio |
| `docs/` (árbol completo) | 🟡 Medio |
| `Reference/` | 🟢 Bajo |
| `CREWING-MODULE.md` · `Regulation.md` · `.env` | 🟡 Medio |

**Única diferencia real hoy:** `infra/nginx/nginx.conf` y `nginx-cloudrun.conf` (correcto — cada producto rutea lo suyo).

**Regla mientras dure la duplicación:**
1. Todo cambio en `backend/` se replica **en las dos carpetas** en el mismo commit.
2. Las **migraciones Alembic contra la DB compartida se corren UNA sola vez**.
3. Verificar antes de cerrar sesión:
   ```bash
   diff -rq "products/portal/pbsds-pollux-app/backend" "products/portal/pbsds-castor-app/backend"
   ```
4. **Deuda a cerrar:** decidir si `backend/` y `shared/` pasan a un repo/paquete común.

---

## 5. 💬 Comentarios del PM (PM → Dev)

### 2026-09-04 — Estado post-split y cola de trabajo

**🔴 1 — El `landing/` de Pollux es el landing de Leto, y es el mismo archivo que el de Castor.**
Byte-idéntico entre las dos carpetas y todavía branded Leto:

| Qué | Valor actual | Debería ser |
|---|---|---|
| `<title>` | `Leto — Gestión STCW y Documentación Marítima \| PBS` | Pollux |
| `<link rel="canonical">` | `https://leto.pbtradingsolutions.com/` | dominio de Pollux |
| `og:site_name` / `og:title` / `og:url` | Leto | Pollux |
| `package.json` name | `leto-frontend` | `pollux-frontend` |

Dos productos sirviendo el mismo canonical es colisión SEO directa — y va exactamente en contra del trabajo de dominio/SEO que ya se hizo en producción. Esto es lo primero que hay que cerrar.

**🔴 2 — El `.env` de esta carpeta todavía tiene el header `# pbsds-leto-app`** y los mismos valores que el de Castor. Revisar qué de ahí aplica a Pollux y qué no, especialmente `STORAGE_BUCKET=leto-documents` (¿compartido a propósito o hay que separarlo?).

**🟠 3 — El `Handover.md` de esta carpeta es contenido de Castor.**
Son 143 KB de historia pre-split, y el grueso son runbooks de `castor-app.com`: DNS, DMARC, identidad pública de Castor, decisiones de Cloud SQL para Cástor. Casi nada de eso es de Pollux. Conservarlo como archivo histórico está bien, pero **a partir de aquí lo que se escribe en él es solo de Pollux**, y hay que leer lo viejo con esa advertencia.

**🟠 4 — Producción y repo están desalineados.**
`pb-pollux` está LIVE en `pollux-app-507503` pero fue desplegado desde el worktree, no desde esta carpeta. Hasta que se commitee el split y se verifique que `Dockerfile.prod` de aquí reproduce lo que está en producción, **no se puede redesplegar Pollux con confianza**. Mismo problema histórico que tiene `pb-leto` (rev 00023, construida desde un layout retirado, marcada como "no reproducible" en `SERVICE-STATUS.md`).

**🟠 5 — `pollux-app.com` sin registrar.** `leto-app.com` está ocupado por un tercero. Registrarlo junto a `castor-app.com`.

---

---

### 2026-09-04 (tarde) — Revisión del PM a la respuesta del dev

> Contexto: el dev respondió en `Handover.md` el 2026-09-04 y abrió la rama `pollux/domain-seo-login-v2`
> en el worktree `…/00 Dominius/pb-website-pollux-v2` desde `f8ab2cf2`. Este bloque es la respuesta del PM.
> **El PM no escribió en `Handover.md` hoy: el dev lo tenía abierto (mtime 15:25) y no se pisa su archivo.**

**Veredicto: las tres correcciones del dev son correctas y se aceptan enteras. Una de ellas es un error del PM y queda escrito.**

#### 1 · 🔴 La auditoría del PM se equivocó — el worktree SÍ tenía trabajo

La auditoría del 2026-09-04 (mañana) escribió *"Sin trabajo sin commitear (todo lo que marca es CRLF)"* sobre el
worktree movido a `_DELETE-ME_pollux-runtime-spill/pb-website-pollux`. **Era falso: había 26 archivos en el índice**
— todo el trabajo de landing / SEO / login del 03-sep.

| Qué se hizo mal | Por qué falló |
|---|---|
| Se leyó el commit `f60e46d7` de la rama | Ese commit efectivamente no trae código; el trabajo estaba **staged, no commiteado** |
| Se leyó el `git status` de ese worktree | Su `gitdir` apuntaba a una ruta inexistente → el status no reflejaba el índice real |

**Regla operativa que sale de esto (aplica a cualquier worktree futuro):** en un worktree con el registro roto,
`git status` **no es evidencia**. Antes de mover, prunear o borrar nada hay que leer el índice
(`git diff --cached --stat`) y exportar un parche. Que el dev exportara `pollux-2026-09-03.patch` el mismo día es
lo único que evitó perder un día entero de trabajo. **Sin ese parche, el `git worktree prune` que ejecutó el PM
habría dejado esos 26 blobs sin referencia y a merced del `gc`.**

#### 2 · `pollux-app.com` — §5.5 queda ANULADO

El dominio se registró el 2026-09-03 (Cloud Domains, `pollux-app-507503`, auto-renew, vence 2027-09-03), con zona
`pollux-app-zone`, mapeos apex + `www` → `pb-pollux`, HTTPS en línea y correo verde en Workspace. La directiva
"registrar `pollux-app.com`" estaba desactualizada al escribirse. Fuente: `docs/runbooks/POLLUX-DOMAIN.md`.

#### 3 · Rebranding del `landing/` — §5.1 CERRADO, verificado en código por el PM

| Comprobación | Estado |
|---|---|
| `landing/index.html` → `<link rel="canonical" href="https://pollux-app.com/">` | ✅ |
| `og:url` = `https://pollux-app.com/` · `og:site_name` = `Pollux` | ✅ |
| `landing/package.json` → `"name": "pollux-frontend"` | ✅ |
| `src/lib/links.ts` con `CASTOR_URL` / `CASTOR_LOGIN_URL` a `castor-app.com` | ✅ |
| `Dashboard.tsx` → `COMPANY_APP = '/company/#/company-dashboard'` (ya no `/app/#/`) | ✅ |
| `RegisterModal` recibe `initialRole="company"` desde el único call site (`LandingPage.tsx:164`) → el selector de rol no se renderiza | ✅ |
| `Login.tsx` → pestaña "Tripulante" enlaza a `CASTOR_LOGIN_URL`, no autentica seafarers aquí | ✅ |
| `auth.ts` → sin `POST /crewing-api/users/{id}/init`; el puente `leto-user` se mantiene | ✅ |

---

#### ✅ Ejecutado por el PM — 2026-09-04 (tarde)

| Acción | Detalle |
|---|---|
| **Borrado de `products/portal/_DELETE-ME_pollux-runtime-spill/`** | Hecho, **después de verificar** que no quedaba nada único (tabla abajo) |
| **Tarea #6 — limpieza del `.env` de Pollux** | Hecho en **las dos copias** (`pb-website/…/pbsds-pollux-app/.env` y la del worktree v2) |

**Verificación previa al borrado — esto es lo que el PM comprobó antes de ejecutar un `rm -rf` irreversible:**

| Subárbol dentro de `_DELETE-ME_` | Archivos | Copia canónica | Veredicto |
|---|---|---|---|
| `ocr-references/` | **0** (solo carpetas vacías) | 24 en `pbsds-castor-app/ocr-references/` | Redundante |
| `Reference/AdminPanel/` | **0** (solo carpetas vacías) | 80 en `pbsds-pollux-app/Reference/AdminPanel/` | Redundante |
| `User database/` | **0** (solo 3 carpetas de UUID vacías) | 40 en `pbsds-castor-app/interfaces/castor/User database/` | Redundante |
| `Reference/Stremio/` | 670 | 671 en `pbsds-castor-app/` (idénticos por nombre) | Redundante |
| `backend/` | 13 | 12 `.pyc` + **1 `main.py.bak` único** | ⚠️ rescatado, ver abajo |
| `interfaces/` | 0 | — | Redundante |
| `pb-website-pollux/` (worktree viejo) | ~9.700 | Rama archivada + `pollux-2026-09-04-v2.patch` | Redundante |

> 🚩 **Por qué esta verificación no era opcional.** Las carpetas `Reference/`, `ocr-references/` y `User database/`
> son exactamente las tres que el `.gitignore` protege porque contienen **documentos personales de Rick**
> (pasaporte, cédula, certificados médicos, CoC, libreta de embarque). Estaban **vacías** ahí — pero un `rm -rf`
> a ciegas sobre una carpeta llamada "_DELETE-ME_" que contiene esos nombres es exactamente el tipo de acción
> que no se ejecuta sin contar archivos primero. El "confirmado: borrar" del dev se refería al código.

**Rescatado antes de borrar:** `backend/app/main.py.bak` (29.5 KB, 2026-06-12 — versión monolítica pre-refactor;
el `main.py` actual son 4.1 KB). No estaba en git ni en ningún otro sitio. Copiado a
`…/00 Dominius/_archive-pre-delete-2026-09-04/pollux-backend-main.py.bak-2026-06-12`.

**`.env` — qué cambió exactamente:**

| Cambio | Justificación verificada |
|---|---|
| Header `# pbsds-leto-app` → `# pbsds-pollux-app` (copia de `main`; la del worktree ya lo tenía) | Cosmético |
| ❌ `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` — eliminadas | `grep` de `AWS_ACCESS`, `AWS_SECRET`, `AWS_REGION` y `boto3` sobre `backend/`: **cero coincidencias**. Config muerta |
| ✅ `STORAGE_BUCKET=leto-documents` — se conserva, con comentario | Decisión de Rick: bucket compartido con Cástor a propósito (misma DB, mismos documentos). No separar sin migrar |
| ➕ `CORS_ORIGINS` añadida **comentada** | Está declarada en `Settings` y ausente del `.env`. Comentada = no cambia el comportamiento actual |

---

#### 🔎 Hallazgos nuevos del PM (no estaban en la cola)

**H1 · 🟠 `STORAGE_BUCKET` tampoco la lee nadie.** No está declarada en `backend/app/core/config.py`
(`Settings` usa `extra = "ignore"`, así que se descarta en silencio) y `grep -i bucket` sobre `backend/` no
devuelve nada. **Se conserva por decisión de Rick, pero queda documentada en el `.env` como intención, no como
config viva.** Discrepancia entre lo escrito y lo que hace el código — queda flagged, no resuelta.
Si el almacenamiento de documentos se implementa de verdad, esta variable hay que declararla en `Settings` primero.

**H2 · 🟡 `RegisterModal` mantiene el fallback `role: initialRole ?? 'seafarer'` (línea 263).** Hoy es inofensivo
—el único call site pasa `initialRole="company"`— pero un segundo call site que olvide la prop reabre el registro
de tripulantes en Pollux **en silencio**, justo lo contrario de la decisión de producto del 2026-09-04.
**Directiva: cambiar el fallback a `'company'`** y dejar `'seafarer'` como opt-in explícito.

**H3 · 🟡 Lock huérfano en un repo anidado.** `pbsds-castor-app/Reference/Stremio/.git/index.lock` existe.
Es un repo anidado e ignorado (Demeter), no bloquea a `pb-website`, pero sí bloqueará cualquier operación de git
*dentro* de esa carpeta. Borrarlo cuando alguien lo necesite.

**H4 · 🟠 El branding interno sigue en Leto.** Como el propio dev anotó: el rebranding cubrió `landing/`, no
`interfaces/leto/` ni `interfaces/admin/`. Es lo que ve el usuario **después** de entrar. Entra a la cola como #10.

---

#### 📌 Lo que NO hizo el PM, a propósito

| Qué | Por qué |
|---|---|
| **Commitear la rama `pollux/domain-seo-login-v2`** | Decisión de Rick: commitea él desde VS Code. Los 28 archivos siguen **solo en el índice** — su único respaldo fuera del disco es `pollux-2026-09-04-v2.patch` |
| **Tarea #7 (gate de `Dockerfile.prod` en `:4001`)** | Aplazada por Rick — el dev está trabajando en la máquina en este momento |
| **Escribir en `Handover.md`** | El dev lo tenía abierto. El PM escribe aquí; el dev responde allí |


---

## 6. Cola de trabajo — orden sugerido

> Actualizada por el PM el 2026-09-04 (tarde). Ver el bloque de esa fecha en §5.

| # | Tarea | Prioridad | Estado |
|---|---|---|---|
| 1 | ~~`.gitattributes` + normalización CRLF~~ | ✅ | Hecho 2026-09-04 (`8a56fcac`) |
| 2 | ~~Rescate de `Reference/AdminPanel/` y `ocr-references/`~~ | ✅ | En disco, **fuera de git a propósito** — documentos personales |
| 3 | ~~`git add` + commitear el split en `main`~~ | ✅ | Hecho 2026-09-04 (`8a56fcac`) |
| 4 | ~~Borrar `_DELETE-ME_pollux-runtime-spill/`~~ | ✅ | **Hecho por el PM 2026-09-04 (tarde)**, con verificación previa de contenido |
| 5 | ~~Rebranding de `landing/`~~ | ✅ | Hecho por el dev (03/04-sep) · **verificado en código por el PM** |
| 6 | ~~Limpiar `.env`~~ | ✅ | **Hecho por el PM 2026-09-04 (tarde)** — ver §5. Pendiente conceptual: H1 |
| 7 | Verificar que `Dockerfile.prod` reproduce `pb-pollux` en prod | 🔴 | **Bloquea cualquier redeploy.** Dev. Aplazado por Rick el 04-sep |
| 8 | ~~Registrar `pollux-app.com`~~ | ✅ | Hecho 2026-09-03, en línea |
| 9 | Decidir el destino de `backend/` y `shared/` duplicados | 🟡 | Decisión de arquitectura — Rick |
| **10** | **Branding interno de `interfaces/leto/` + `interfaces/admin/`** | 🟠 | **NUEVO** — abierto por el dev. Es lo que ve el usuario después del login |
| **11** | **Fallback de rol en `RegisterModal` → `'company'`** (H2) | 🟡 | **NUEVO** — PM. Cambio de una línea |
| **12** | **Commitear la rama `pollux/domain-seo-login-v2`** | 🔴 | **Rick**, desde VS Code. 28 archivos staged sin commit |
| **13** | **Gate local en `localhost:4001`** — login real de cuenta empresa + iframe `/company/` leyendo `leto-user` | 🔴 | **Rick**. Precede a #7 y a cualquier deploy |

---

## 7. Referencias

| Documento | Para qué |
|---|---|
| `Handover.md` (esta carpeta) | Log compartido PM ↔ Dev. **Aquí responde el dev.** |
| `SPLIT-2026-09-03.md` | Qué se movió y por qué |
| `Project_Leto.md` | Historia y specs del producto pre-split |
| `../pbsds-castor-app/Project_Manager.md` | El otro lado del split |
| `../../../CLAUDE.md` | Registro de nombres Leto/Pollux/Castor — leer antes de tocar nada que diga "leto" |
| `../../../PBS-DOMAIN-ARCHITECTURE.md` | Dominios y la regla de un origen por producto |
| `../../../SERVICE-STATUS.md` | Estado de los servicios Cloud Run |
