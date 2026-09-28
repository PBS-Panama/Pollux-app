# Castor — Arquitectura de Producto

> **Ámbito:** este documento cubre la fractura de la plataforma en dos productos
> de mercado (Castor / Leto) y lo que eso implica para el código de este repo.
> El mapa de dominios y la topología de despliegue viven en
> `pb-website/PBS-DOMAIN-ARCHITECTURE.md`.
>
> **Fecha:** Agosto 2026 · Complementa `STRUCTURE.md`, `AUTH-FLOW.md` y
> `CASTOR-MOBILE-READINESS.md` (ruta a móvil)

---

## 1. La decisión

La plataforma se presenta al mercado como **dos productos**, no como uno:

```
CASTOR   →  Marinos (seafarers)       B2C · Gratis · Mobile-first
LETO     →  Empresas embarcadoras     B2B · SaaS de pago · Desktop-first
ADMIN    →  Operación interna PBS     No público
```

La fractura es de **producto, marca y mercado**. NO es de datos, backend ni
base de datos.

```
❌ NUNCA                          ✅ SIEMPRE
   Dos backends                      Un backend  (backend/)
   Dos bases de datos                Una PostgreSQL
   Dos objetos Contract              Un Contract
   Dos mlc_validator.py              Un mlc_validator.py
   Sincronización entre sistemas     Nada que sincronizar
```

**Por qué importa:** la propuesta de valor es que la acción de un lado aparece
en el panel del otro. Con dos bases de datos eso deja de existir y quedan dos
productos mediocres en vez de una red. Si alguien propone separar la DB, ese
es el momento de detener el sprint.

---

## 2. Cómo se ve en este repo

La fractura **ya está implementada**. La estructura real es:

```
pbsds-leto-app/
├── backend/                    ← ÚNICO · FastAPI · sirve a los tres frontends
│   └── app/
│       ├── models/             ← User, Seafarer, Company, Document
│       ├── routers/            ← auth, documents
│       └── services/
│           └── mlc_validator.py   ← fuente única de lógica MLC
│
├── interfaces/                 ← Tres frontends independientes
│   ├── castor/                 ← MARINO   (antes 'user')
│   ├── leto/                   ← EMPRESA  (antes 'company')
│   ├── admin/                  ← INTERNO  (greenfield)
│   └── user/                   ← ⚠️ residuo del rename — ver §7
│
├── infra/
│   ├── nginx/                  ← nginx.conf, nginx-cloudrun.conf, nginx-integrated.conf
│   └── postgres/
│
└── docs/
    ├── architecture/           ← STRUCTURE.md, AUTH-FLOW.md, NAMING-CONVENTION.md, este archivo
    ├── crewing-module/
    ├── specs/
    └── handover/sessions/
```

Cada interfaz tiene su propio `Dockerfile`, `package.json`, build y ciclo de
deploy. **Comparten datos únicamente a través de `backend/`.**

**Regla de importación:** `interfaces/castor` e `interfaces/leto` NUNCA se
importan entre sí. Lo compartido pasa por el backend o se duplica
deliberadamente.

---

## 3. ⚠️ El hallazgo crítico: el puente de identidad se rompe entre orígenes

`AUTH-FLOW.md` documenta que la identidad se comparte así:

> *"Ambos corren bajo el mismo origen (`localhost:3000`) gracias a Nginx, lo que
> significa que comparten el mismo `localStorage`. Ese es el puente."*

El landing escribe `leto-user` en `localStorage` y el crewing module —que corre
**dentro de un iframe**— lo lee. Sin tokens por URL, sin `postMessage`, sin
cookies.

**Consecuencia directa:** `localStorage` está aislado por origen. Y para el
navegador, estos son **tres orígenes distintos**:

```
https://castor-app.com          ≠   https://app.castor-app.com
https://castor-app.com          ≠   https://leto-app.com
```

Si el landing queda en el apex y la app en un subdominio `app.`, **el login deja
de funcionar** — el iframe no verá `leto-user` y `getUserId()` caerá al fallback
`'SF-001'`. No es un bug sutil: es la app entera sirviendo datos del usuario
equivocado.

### Resolución adoptada

**Un solo origen por producto. Ruteo por path con nginx, exactamente como hoy.**

| URL | Sirve | Cambio de código |
|---|---|---|
| `castor-app.com/` | Landing de Castor | ninguno |
| `castor-app.com/app/` | Interfaz del marino (iframe) | ninguno |
| `castor-app.com/api/` | Backend FastAPI | ninguno |
| `castor-app.com/crewing-api/` | Express del módulo crewing | ninguno |

Lo mismo para `leto-app.com`. El `infra/nginx/nginx-cloudrun.conf` que ya existe
hace justamente esto — solo cambia el dominio que lo consume.

**Descartado (por ahora):** subdominios `app.` y `api.` separados. Obligarían a
refactorizar el puente de identidad a `postMessage` o a cookies con `domain=`
antes de poder desplegar. Es trabajo real que no compra nada hoy.

**Cuándo revisitarlo:** cuando el crewing module deje de vivir en un iframe.
Ahí el puente de `localStorage` desaparece y los subdominios vuelven a estar
sobre la mesa.

---

## 4. Alias de webpack: se queda `leto` en ambas interfaces

`NAMING-CONVENTION.md` documenta el rename de `stremio` → `leto` en ~150
imports. `interfaces/castor` heredó ese alias.

**No lo renombramos a `castor`.** Razones:

1. Las dos interfaces salen del mismo módulo crewing. Mantener el mismo alias
   permite cherry-pick de fixes entre ellas. Divergir el alias convierte cada
   port en un conflicto manual.
2. Es un alias interno de resolución de paths. Ningún usuario lo ve.
3. Ya se pagó una vez el costo de un rename masivo. No se paga dos veces por
   cosmética.

**Léase `leto/` como "el core de la plataforma", no como "el producto Leto".**
Esto debe quedar dicho en el onboarding de cualquier dev nuevo, porque leer
`require('leto/components')` dentro de `interfaces/castor/` confunde el día uno.

```
✅ interfaces/castor/src/…  →  require('leto/common/apiClient')
✅ interfaces/leto/src/…    →  require('leto/common/apiClient')
❌ nunca                    →  require('castor/…')
✅ npm packages             →  '@stremio/stremio-icons'  (scope npm, no tocar)
```

---

## 5. ⚠️ GPLv2 — riesgo real para Castor móvil

El módulo crewing está basado en **Stremio Web, licencia GPLv2**. Ambas
interfaces heredan esa licencia.

| Escenario | ¿Obliga a liberar el código? |
|---|---|
| Servir Castor por web (SaaS) | **No.** GPLv2 no tiene cláusula de red (eso es AGPL) |
| PWA instalable desde el navegador | **No.** Se sigue sirviendo, no distribuyendo |
| App nativa o wrapper en App Store / Play Store | **Sí.** Eso es distribución. GPLv2 obliga a entregar el fuente |

Castor es mobile-first y el camino natural del producto es una app en tienda.
**Antes de dar ese paso hay que decidir**: liberar el fuente de Castor, o
reescribir la interfaz sin base Stremio. No es una decisión que se pueda tomar
tarde — cambia el plan de producto.

**Decisión tomada (agosto 2026):** Castor sale primero como **webapp**, luego
PWA instalable, y la versión de tienda solo si la PWA se queda corta. Las reglas
de construcción que mantienen esa puerta abierta —sin sobreingeniería— están en
**`CASTOR-MOBILE-READINESS.md`**.

La regla de arquitectura que se deriva y aplica desde hoy: **ninguna lógica de
negocio propietaria puede vivir en `interfaces/castor`.** Todo lo que esté ahí es
código potencialmente publicable bajo GPLv2. La lógica vive en `backend/`.

Mientras tanto: **no borrar los headers `Copyright (C) Smart code 203358507`**.
Es obligación de la GPLv2 y ya está anotado en `NAMING-CONVENTION.md`.

---

## 6. Lo que la fractura sí mejora

| Antes (un producto) | Después |
|---|---|
| Registro con selector de rol | Registrarse en Castor = marino. En Leto = empresa. Sin selector |
| Un bundle con código que la mitad de usuarios no usa | Castor liviano — importa: los marinos abren desde satélite a bordo |
| Un dominio peleando SEO B2C y B2B | Castor posiciona en búsquedas de marinos; Leto en "crew management software" |
| Precios visibles al marino aunque sea gratis | Castor no menciona precios en ninguna parte |

---

## 7. Deuda técnica detectada

| # | Hallazgo | Acción |
|---|---|---|
| 1 | `interfaces/README.md` dice *"admin, user, company"* | ✅ Corregido |
| 2 | `interfaces/castor/README.md` empieza con `# user —` | ✅ Corregido |
| 3 | `interfaces/leto/README.md` empieza con `# company —` | ✅ Corregido |
| 4 | `interfaces/user/` sigue existiendo con una carpeta `User database` | ⬜ Verificar si tiene datos vivos antes de borrar |
| 5 | `STRUCTURE.md` describe `frontend/` + crewing en la raíz — no menciona `interfaces/` | ⬜ Reescritura pendiente. Banner de aviso añadido |
| 6 | `PBS-PROJECT-MAP.md` apuntaba a `products/portal/demo/Leto/IDM/` | ✅ Corregido — IDM eliminado, rutas actualizadas |
| 7 | La carpeta se llama `pbsds-leto-app` pero contiene dos productos | ⬜ Decisión de Rick — ver abajo |
| 8 | `backend/app/main.py.bak` versionado | ⬜ Borrar |
| 9 | El Cloud Run `pb-leto` en producción se construyó desde IDM, que ya no existe | ⬜ **No es reconstruible.** Redesplegar desde `pbsds-leto-app` antes de tocarlo |

### Sobre el punto 7 — ¿renombrar la carpeta?

`pbsds-leto-app` ahora aloja Castor, Leto y Admin. El nombre miente.

| Opción | A favor | En contra |
|---|---|---|
| **Renombrar a `pbsds-crewing-platform`** | El nombre dice la verdad; más barato ahora que post-lanzamiento | Toca `docker-compose.yml` raíz, `CLAUDE.md`, `PBS-PROJECT-MAP.md`, scripts de deploy |
| Dejarlo | Cero churn hoy | Cada dev nuevo asume que Castor es subordinado de Leto |

**Recomendación: renombrar antes del primer deploy de Castor a producción.**
Después hay URLs, pipelines y documentación externa apuntando al path viejo.

---

## 8. Secuencia de lanzamiento

```
ETAPA A · Castor solo al mercado                    Meses 1–4
          Registro, documentos con alertas, perfil, disponibilidad.
          Sin Stripe. Sin empresas.
          MÉTRICA: marinos con ≥3 documentos vigentes.

ETAPA B · Leto en beta cerrada                      Meses 4–6
          2–3 navieras conocidas, gratis, a cambio de uso real.
          Contrato + MLC + rotaciones contra marinos reales de Castor.
          MÉTRICA: contratos creados dentro del sistema.

ETAPA C · Leto comercial                            Meses 7–8
          Stripe, tiers, venta activa sobre una base que ya existe.
```

**Por qué Castor primero:** el marino gratuito es el activo que hace que la
empresa pague. Vender Leto con una base vacía de marinos es vender una demo que
se cae en la primera búsqueda. Además, un equipo de 3 construyendo dos frontends
en paralelo entrega dos productos a medias.

---

## 9. Decisiones pendientes

| # | Decisión | Recomendación | Urgencia |
|---|---|---|---|
| 1 | Comprar `leto-app.com` | Verificar y asegurar esta semana | 🔴 |
| 2 | Dueño de Castor y dueño de Leto en el equipo de 3 | Asignar antes del Sprint 1 | 🔴 |
| 3 | ¿Castor lanza solo primero? | Sí | 🔴 |
| 4 | Renombrar `pbsds-leto-app` | Sí, antes del primer deploy de Castor | 🟡 |
| 5 | Plan GPLv2 para Castor móvil | ✅ Decidido: webapp → PWA → tienda condicional. Ver `CASTOR-MOBILE-READINESS.md` | — |
| 6 | Borrar `interfaces/user/` | Verificar datos primero | 🟢 |

La #2 es la que hunde estos splits: con dos frontends y nadie asignado, el
design system se bifurca en el mes 2 y ya no hay vuelta sin reescribir.

---

*Castor Architecture v1.0 · PBS · PB Trading Solution · Panamá · 2026*
