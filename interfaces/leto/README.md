# leto — Interfaz de la EMPRESA naviera. Producto público: Leto.

Construida desde el módulo crewing con el rol fijado a `company`.
Mapea al nombre interno `company` en el código fuente (antes esta carpeta se
llamaba `company`).

- Mercado: B2B · suscripción mensual por flota · desktop-first
- Habla con el backend en `/api/*` y `/crewing-api/*`
- Se sirve junto a su landing bajo un MISMO origen (`leto-app.com/` + `/app/`).
  Ver `docs/architecture/AUTH-FLOW.md` y sección 3 de
  `docs/architecture/CASTOR-ARCHITECTURE.md`.

Pasos de setup: `Project_Leto.md` sección 8.
