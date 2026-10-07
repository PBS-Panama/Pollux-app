# Checklist de deploy — Pollux + Castor · STAGING primero (no producción)

**Fuente:** órdenes de Rick vía Dandy del 2026-10-07 (14:34 y 14:38). Este documento **no autoriza** el deploy a producción ni el push.
**Contraparte:** Castor nota 147 (`Castor-app/Handover.md`, checklist de `pb-castor`). Los puntos compartidos se marcan **[C-n]**, con el número de punto de esa nota.
**Relacionado:** `secrets-panel-prod.md` (la fase de rotación, que queda **congelada**; se reusa solo su §4, sembrar sin imprimir).
**Estado:** ✅ verificado (solo lectura, solo NOMBRES de variables) · ⬜ falta · ⛔ bloqueado.

**Regla (Rick, 07-oct 14:38): no se rota ningún secreto.** Ni `leto-secret-key` ni `leto-drive-token-secret` ni ningún otro. La rotación va recién después de los tests de producción con la cuenta de Rick y de la aprobación del cliente. Mientras tanto, solo se usan los **valores actuales** para destrabar el login y Drive.

## Estado medido hoy (2026-10-07)
- `pb-pollux` en prod: rev `pb-pollux-00019-siw`, imagen `pb-pollux:68836b55` (vieja), SA `pollux-run@`. **No existe `pb-pollux-v2`.** La orden de prueba del 05-oct no se ejecutó en Pollux.
- `main` local = `2d1a7959` (T14 a T19 aceptadas, sin deploy).
- Secretos en `pollux-app-507503`: `leto-database-url`, `leto-secret-key`, `leto-drive-token-secret` (creado hoy, **0 versiones, sin IAM**).
- `leto-secret-key`: `castor-run` tiene `secretAccessor` + `viewer`, y `pollux-run` tiene `secretAccessor` → **[C-5] ✅ resuelto**.
- En `pb-pollux` van en texto plano: `DATABASE_URL`, `SECRET_KEY`, `DRIVE_TOKEN_SECRET`, `DRIVE_STATE_SECRET`, `GOOGLE_DRIVE_CLIENT_SECRET` y `GOOGLE_VISION_API_KEY`. `leto-secret-key` está montado bajo un nombre de variable que es un hash (ver el handover). No hay startup probe.

## A. Secretos compartidos (el orden importa: si se altera, Castor puede caerse)
| # | Punto | Estado |
|---|---|---|
| A1 | **Mismo nombre en los dos lados:** Castor lee `leto-drive-token-secret` (alias `SECRET_ID_OVERRIDES`) y Pollux lee el literal `DRIVE_TOKEN_SECRET`, que no existe. Se arregla con **T20**: Pollux adopta el mismo alias. | ⬜ T20 en curso |
| A2 | Sembrar `leto-drive-token-secret` con el valor **actual** de `DRIVE_TOKEN_SECRET` de `pb-pollux`, copiado tal cual y sin generar uno nuevo; si no, los tokens de Drive guardados ya no se pueden descifrar. Primero comprobar que `pb-castor` tenga el mismo valor (comparar hashes, nunca imprimirlo). [C-6] | ⬜ autorizado (14:38), lo ejecuta el developer después de T20 |
| A3 | IAM sobre `leto-drive-token-secret`: `castor-run` con `secretAccessor` + `viewer`, `pollux-run` con `secretAccessor`. Por secreto, nunca a nivel de proyecto. [C-6] | ⬜ igual que A2 |
| A4 | `DRIVE_STATE_SECRET` de Pollux: propio y no compartido. Sigue como env var, sin crearlo en Secret Manager hasta que llegue la fase de rotación. | ✅ decisión del PM: diferido |
| A5 | Después de A2 y A3, avisar a Castor que reintente el login con clave y Drive. [C-12, C-13] | ⬜ |

## B. Base de datos compartida (`leto-postgres`)
| # | Punto | Estado |
|---|---|---|
| B1 | Migración `0013_secret_rotation_log` (aditiva, idéntica en los dos repos): **una sola vez**, como paso de deploy, con backup previo y nunca con `AUTO_MIGRATE`. Sin rotación todavía, la tabla queda vacía. [C-2] | ⛔ decide Rick y define quién la corre |
| B2 | `AUTO_MIGRATE` ausente o `false` en los dos servicios. | ⬜ Pollux · ✅ Castor |
| B3 | F7: desplegar Castor **antes** que el `company.py` de Pollux. [C-17] | ⬜ orden de deploy |

## C. Servicio de prueba `pb-pollux-v2` (de la nota 58 de Pollux)
| # | Punto | Estado |
|---|---|---|
| C1 | Build con `cloudbuild` y `SHORT_SHA` del commit (mismo patrón que Castor [C-1]); imagen nueva desde `main`. | ⬜ |
| C2 | `pb-pollux-v2` con las mismas env vars que `pb-pollux`, más `EMAIL_PROVIDER` ≠ `logger` (si no, no arranca) y `FRONTEND_URL`/`CORS_ORIGINS` de la URL de v2. | ⬜ |
| C3 | Startup/readiness probe en `/ready`. | ⬜ |
| C4 | `ADMIN_SEED_RESET` sin setear. | ⬜ |
| C5 | Rate limit por XFF: con 6 logins y `X-Forwarded-For` falso, el 6º debe dar 429. | ⬜ |
| C6 | Consola sin violaciones de CSP (admin, landing, company). | ⬜ |
| C7 | Adjunto real que abre inline o se descarga (nota 60). | ⬜ |
| C8 | Fetch a Castor con un archivo real (nota 64). | ⬜ |
| C9 | E2E de registro con las cuentas de prueba de la orden del 05-oct (verificación por correo y restablecer clave). | ⬜ |
| C10 | Flota (T19): editar y borrar buque; asignación solapada → 409. | ⬜ |
| C11 | Drive E2E desde Pollux. | ⛔ depende de A1 a A3 y de "Drive en Pollux sí/no" |

## D. Fuera de staging: decisiones de Rick (escaladas por Dandy)
OK de deploy a prod · bucket GCS propio (T17) · Drive sí/no · Calendar + Castor con backend real. Para pasar a prod hace falta además: mover a Secret Manager los secretos que hoy van en texto plano (igual que [C-8], sin rotarlos) y hacer split de tráfico con rollback a `pb-pollux-00019-siw`.
`Reference/`: limpieza autorizada (14:38) → T21.

## Orden propuesto
T20 aceptada → A2 + A3 → aviso a Castor (A5) → B1 (con decisión) → deploy de Castor a v2 → C1 a C10 en `pb-pollux-v2` → informe → Rick decide prod.
