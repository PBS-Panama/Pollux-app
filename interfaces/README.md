# interfaces — Tres frontends independientes: `castor` (marino), `leto` (empresa), `admin` (interno PBS).

Cada uno tiene su propio Dockerfile, package.json, build y ciclo de deploy.
Comparten datos ÚNICAMENTE a través del backend en `../backend`.

`castor/` y `leto/` NUNCA se importan entre sí.

Los tres usan el alias de webpack `leto/` para resolver `src/` — es el alias del
core de la plataforma, no del producto Leto. Ver `docs/architecture/NAMING-CONVENTION.md`.

Arquitectura de la fractura: `docs/architecture/CASTOR-ARCHITECTURE.md`
