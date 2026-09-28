# Runbook · Dominio `pollux-app.com` → `pb-pollux`

> **Producto:** Pollux · **Proyecto GCP:** `pollux-app-507503` · **Servicio:** `pb-pollux` (us-central1)
> **Regla que gobierna todo:** un origen por producto — ruteo por *path*, nunca `app.` / `api.`
> (`pb-website/PBS-DOMAIN-ARCHITECTURE.md` §3). El único subdominio permitido además de `www`
> es `staging.` (copia autocontenida).
>
> **Auth:** `gcloud auth login` solo desde la **terminal integrada de VS Code** (regla #4 de `CLAUDE.md`); con la sesión ya
> válida, Claude puede correr el resto. Excepción: el `register` (compra) lo bloquea el clasificador de Claude Code → lo corre Rick.

Estado (actualizado 2026-09-03, tras ejecutar Fases 0–3):

| Pieza | Estado |
|---|---|
| `pb-pollux` en Cloud Run | ✅ sirviendo en `https://pb-pollux-mlb5b3vcjq-uc.a.run.app` |
| `pollux-app.com` | ✅ **registrado 2026-09-03** por Rick (Cloud Domains, `pollux-app-507503`, ACTIVE, auto-renew, vence 2027-09-03, WHOIS redactado). ⚠️ `issues: UNVERIFIED_EMAIL` → clic en el correo de verificación ICANN enviado a `admin@pbtradingsolutions.com` (15 días o suspensión) |
| Zona Cloud DNS | ✅ `pollux-app-zone` (NS `ns-cloud-b1..b4`, DNSSEC off) · A ×4 · AAAA ×4 · CNAME `www` · CAA |
| Mapeo de dominio en Cloud Run | ✅ `pollux-app.com` + `www.pollux-app.com` → `pb-pollux` (2026-09-03). Certificado emitido 18:42 (≈25 min tras publicar DNS); el borde tardó ≈4 min más en servirlo. **`https://pollux-app.com/` en producción desde 2026-09-03 18:46** (aún con la imagen rev 00003: landing "Leto", sin `www`→apex, sin `robots.txt` — se arregla en la Fase 5) |
| nginx `www` → apex | ✅ en `infra/nginx/nginx-cloudrun.conf` (esta rama) |
| Landing con canonical / OG / sitemap en `pollux-app.com` | ✅ en `landing/` (esta rama) |
| `CORS_ORIGINS` con el dominio | ⬜ pendiente (Fase 5) |

---

## Fase 0 · Preparación (5 min)

```bash
gcloud auth list                                   # cuenta activa = admin@pbtradingsolutions.com
gcloud config set project pollux-app-507503
gcloud services enable domains.googleapis.com dns.googleapis.com run.googleapis.com

# El dominio sigue libre?
gcloud domains registrations search-domains pollux-app.com
```

> ℹ️ Cloud Domains está en salida (las registraciones migran a Squarespace) — `PBS-DOMAIN-ARCHITECTURE.md` §5.1.
> Se usa igual porque `castor-app.com` ya vive ahí y así los dos productos comparten registrador y runbook.
> Cuando pasen los 60 días ICANN se puede transferir a Cloudflare junto con Castor (decisión aparte).

## Fase 1 · Zona DNS primero, registro después (10 min)

Crear la zona **antes** de registrar, para que el registro nazca apuntando a ella y no a una zona residual
(el desorden `b1–b4` de Castor salió de hacerlo al revés).

```bash
gcloud dns managed-zones create pollux-app-zone \
  --dns-name="pollux-app.com." \
  --description="Pollux — pollux-app.com (Cloud Run pb-pollux)" \
  --dnssec-state=off \
  --visibility=public

gcloud dns managed-zones describe pollux-app-zone --format="value(nameServers)"
# Anotar los 4 NS (ns-cloud-XX.googledomains.com). Es lo que debe publicar el registrador.
```

`--dnssec-state=off` a propósito: DNSSEC obliga a esperar 24 h ante cualquier cambio de NS. Se activa
después, cuando el dominio lleve semanas estable.

## Fase 2 · Registrar el dominio (Rick · 10 min · $12)

Opción A — consola (recomendada; los datos de contacto y el pago son interactivos):
`Cloud Console › Network Services › Cloud Domains › Register domain` → `pollux-app.com` →
DNS: **"Use Cloud DNS zone" → `pollux-app-zone`** → privacidad WHOIS **Private** → auto-renew **ON**.

Opción B — CLI (necesita un `contacts.yaml` con los datos de contacto; no versionarlo):

```bash
gcloud domains registrations get-register-parameters pollux-app.com   # supportedPrivacy: PUBLIC | REDACTED
gcloud domains registrations register pollux-app.com \
  --contact-data-from-file=contacts.yaml \
  --contact-privacy=redacted-contact-data \
  --cloud-dns-zone=pollux-app-zone \
  --yearly-price="12.00 USD"
```

Verificar:

```bash
gcloud domains registrations describe pollux-app.com --format="yaml(state,managementSettings,dnsSettings)"
# state: ACTIVE · renewalMethod: AUTOMATIC_RENEWAL · dnsSettings.googleDomainsDns NO debe aparecer;
# debe haber customDns.nameServers = los 4 NS de pollux-app-zone
```

Los dominios comprados en Cloud Domains quedan **verificados automáticamente** para la cuenta que compra
(hace falta para el mapeo de Cloud Run). Comprobar:

```bash
gcloud domains list-user-verified | grep pollux-app.com
# Si no aparece: Search Console → Add property (Domain) → TXT en la zona → verify.
```

## Fase 3 · Mapear el dominio a `pb-pollux` (15 min + propagación)

```bash
# Apex
gcloud beta run domain-mappings create \
  --service=pb-pollux --domain=pollux-app.com --region=us-central1

# www (nginx lo redirige 301 al apex)
gcloud beta run domain-mappings create \
  --service=pb-pollux --domain=www.pollux-app.com --region=us-central1

# Leer los registros que pide Cloud Run (NO asumir IPs de memoria)
gcloud beta run domain-mappings describe --domain=pollux-app.com --region=us-central1 \
  --format="yaml(status.resourceRecords)"
gcloud beta run domain-mappings describe --domain=www.pollux-app.com --region=us-central1 \
  --format="yaml(status.resourceRecords)"
```

Publicar exactamente lo que devolvió el `describe` (típicamente 4 A + 4 AAAA para el apex y un CNAME
`ghs.googlehosted.com.` para `www`):

```bash
Z=pollux-app-zone
gcloud dns record-sets create pollux-app.com.     --zone=$Z --type=A    --ttl=300 --rrdatas="IP1,IP2,IP3,IP4"
gcloud dns record-sets create pollux-app.com.     --zone=$Z --type=AAAA --ttl=300 --rrdatas="IP6_1,IP6_2,IP6_3,IP6_4"
gcloud dns record-sets create www.pollux-app.com. --zone=$Z --type=CNAME --ttl=300 --rrdatas="ghs.googlehosted.com."

# CAA — Cloud Run emite con Google Trust Services (pki.goog). letsencrypt queda por si algún día
# se mueve a un balanceador con certificado propio.
gcloud dns record-sets create pollux-app.com. --zone=$Z --type=CAA --ttl=3600 \
  --rrdatas='0 issue "pki.goog",0 issue "letsencrypt.org"'
```

Esperar el certificado (15 min a 24 h; normalmente < 1 h):

```bash
gcloud beta run domain-mappings describe --domain=pollux-app.com --region=us-central1 \
  --format="yaml(status.conditions)"
# CertificateProvisioned: True  +  Ready: True
```

> ⚠️ Los *domain mappings* de Cloud Run son un feature "preview" con límites (sin HTTP/3, sin
> balanceo multi-región). Sirven para el lanzamiento. Si más adelante hace falta CDN/WAF, el camino es
> un External HTTPS Load Balancer + NEG serverless; cambia solo la Fase 3, no el resto.

## Fase 4 · Verificación pública (después de la propagación)

```powershell
# Windows
nslookup -type=NS pollux-app.com 8.8.8.8
nslookup -type=A  pollux-app.com 8.8.8.8
nslookup -type=CNAME www.pollux-app.com 8.8.8.8
curl.exe -sI https://pollux-app.com/            | Select-String "HTTP|strict-transport|x-frame"
curl.exe -sI https://www.pollux-app.com/        | Select-String "HTTP|location"     # 301 → apex
curl.exe -s  https://pollux-app.com/robots.txt
curl.exe -s  https://pollux-app.com/sitemap.xml
curl.exe -sI https://pollux-app.com/og-image.png | Select-String "HTTP|content-type"
```

Esperado: `HTTP/2 200` en el apex con `strict-transport-security`, `301` en `www` con
`location: https://pollux-app.com/`, `robots.txt` y `sitemap.xml` con contenido, `og-image.png` como `image/png`.

## Fase 5 · `CORS_ORIGINS` + redeploy (10 min)

El validador de arranque (`backend/app/core/config.py`) exige que `CORS_ORIGINS` liste los orígenes
públicos. Hay que añadir el dominio **sin perder las demás variables**: `--env-vars-file` **reemplaza el
set completo**, así que el YAML debe traer las 13 (plantilla en `infra/cloudrun/pb-pollux.env.example.yaml`;
los valores reales viven fuera del repo — `…/00 Dominius/pb-leto-config-backup-2026-09-02.yaml` + memoria
`prod_credentials_pollux`).

```yaml
CORS_ORIGINS: "https://pollux-app.com,https://www.pollux-app.com,https://pb-pollux-mlb5b3vcjq-uc.a.run.app"
```

```bash
# 1) Nueva imagen con la landing SEO + nginx www→apex de esta rama
cd products/portal/pbsds-pollux-app
docker build -f Dockerfile.prod -t us-central1-docker.pkg.dev/pollux-app-507503/pollux-registry/pb-pollux:latest .
docker push us-central1-docker.pkg.dev/pollux-app-507503/pollux-registry/pb-pollux:latest

# 2) Deploy con el YAML completo (nunca --set-env-vars: la @ de DATABASE_URL lo trunca)
gcloud run deploy pb-pollux \
  --image=us-central1-docker.pkg.dev/pollux-app-507503/pollux-registry/pb-pollux:latest \
  --region=us-central1 --port=80 --allow-unauthenticated \
  --service-account=pollux-run@pollux-app-507503.iam.gserviceaccount.com \
  --add-cloudsql-instances=durable-sky-484422-b5:us-central1:leto-postgres \
  --env-vars-file=/ruta/fuera/del/repo/pb-pollux.env.yaml

# 3) Smoke
curl -s -o /dev/null -w "%{http_code}\n" https://pollux-app.com/api/docs        # 200
curl -s -X POST https://pollux-app.com/api/auth/login -H "content-type: application/json" \
  -d '{"email":"x@x.com","password":"x"}' -w " %{http_code}\n'                   # 401 = backend + DB OK
```

> 🚦 Gate de Rick (`Project_Manager.md` 2026-06-12): antes del `gcloud run deploy`, la imagen se prueba
> en local (`docker compose up -d` → `http://localhost:4000`) y Rick da el OK.

## Fase 6 · SEO post-dominio (Rick · 15 min)

1. **Search Console** → propiedad de dominio `pollux-app.com` (TXT en `pollux-app-zone`) → enviar
   `https://pollux-app.com/sitemap.xml`.
2. **Lighthouse en incógnito** sobre `https://pollux-app.com/` (móvil + escritorio). Regla del sitio
   maestro: medir siempre en incógnito, con extensiones apagadas.
3. Compartir el enlace en WhatsApp/LinkedIn para comprobar la tarjeta OG (`og-image.png`, 1200×630).
4. Business Profile / redes: cuando existan handles de Pollux, registrarlos en `Handover.md` igual que
   la tabla de identidad pública de Castor.

## Fase 7 · Correo (opcional, no bloquea el lanzamiento)

> ✅ **Ejecutada 2026-09-03 (noche):** `pollux-app.com` añadido como dominio secundario en Workspace (Rick); MX, SPF,
> DMARC (`rua=pollux@pollux-app.com`) y DKIM (`google._domainkey`, 2 strings) publicados en `pollux-app-zone` (Dev).
> ⚠️ El asistente "Activar Gmail" enlaza a Squarespace — ignorarlo: el DNS está en Cloud DNS, no en Squarespace.
> ✅ **Cerrada la misma noche:** Rick confirmó el MX e inició la autenticación DKIM → `pollux-app.com` en **"Todo está bien"**
> en Administrar dominios (MX + SPF + DKIM aceptados). Queda: buzón `pollux@pollux-app.com` (recibe los reportes DMARC) y la
> prueba de campo `DKIM: PASS` con `d=pollux-app.com`. Tras 4–6 semanas de reportes, subir DMARC a `p=quarantine`.

Solo si Pollux tendrá buzón propio (`hola@pollux-app.com`): añadir el dominio como **secundario** en
Workspace y publicar MX/SPF/DKIM/DMARC con la plantilla de `PBS-DOMAIN-ARCHITECTURE.md` §4. Seguir el
orden del runbook DKIM de Castor (`Handover.md`): crear usuario → activar Gmail → publicar DKIM →
recién ahí "Iniciar la autenticación". DMARC arranca en `p=none` con `rua=` a un buzón del mismo dominio.

## Rollback

- Quitar el mapeo: `gcloud beta run domain-mappings delete --domain=pollux-app.com --region=us-central1`.
  La URL `*.run.app` sigue funcionando; nada más cambia.
- `CORS_ORIGINS` puede volver al valor anterior con el YAML previo.
- La zona y el registro no se tocan en un rollback.

## Definición de terminado

- [ ] `pollux-app.com` registrado en `pollux-app-507503`, auto-renew ON, apuntando a `pollux-app-zone`
- [ ] `nslookup -type=NS pollux-app.com 8.8.8.8` devuelve los NS de `pollux-app-zone`
- [ ] Mapeos `pollux-app.com` + `www` en estado `Ready` con certificado emitido
- [ ] `https://www.pollux-app.com/` → 301 → `https://pollux-app.com/`
- [ ] `CORS_ORIGINS` incluye el dominio; `pb-pollux` arrancó (sin `RuntimeError` del validador)
- [ ] `robots.txt`, `sitemap.xml`, `og-image.png` sirven en el dominio
- [ ] Sitemap enviado en Search Console; Lighthouse incógnito anotado en el session log
- [ ] `Handover.md` + `SERVICE-STATUS.md` (pb-website) actualizados con el dominio en producción
