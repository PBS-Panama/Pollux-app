# landing — Pollux public entry point (static site + Vite/React auth pages)

This container serves TWO things, both via one nginx (`nginx.conf`, `Dockerfile`):
- `/` and everything else (`/recursos.html`, `/css/`, `/js/`, `/img/`…) → the approved static
  marketing site at `site/` (Appdent template, orange brand). This is the one and only
  homepage — there is no React landing page anymore.
- `/login`, `/register`, `/dashboard` → the Vite/React SPA (`src/`), built and served as
  `app-shell.html`, for the real authenticated flows.

2026-09-12 (Rick): the previous React `LandingPage.tsx` (navy/cyan) was never the approved
design and has been deleted, along with `LoginModal.tsx`/`RegisterModal.tsx`. `Login.tsx` and
`Register.tsx` (styled to match `site/`) are what `/login` and `/register` actually render now.

## Routes (`src/App.tsx`)

| Path | What | Notes |
|---|---|---|
| `/` | Marketing landing (static `site/`, not part of this SPA) | Indexable. Canonical `https://pollux-app.com/` |
| `/login` | Dedicated sign-in page (company only) | `noindex`. `?next=/path` (same-origin only) |
| `/register` | Company sign-up page | Collects company name — Pollux registers companies only |
| `/dashboard` | Crewing module iframe (`/company/`) | `ProtectedRoute` → `/login?next=…` when signed out |
| `/admin/*` | Admin panel | Proxied by the outer nginx straight to `interfaces/admin`, not handled by this SPA |

Sign-in logic is shared in `src/lib/auth.ts` (`signIn`, `destinationFor`, `safeNext`), used by
both `/login` and `/register`. The identity bridge into the crewing iframe is the `leto-user`
localStorage key — historic name, **do not rename** (`docs/architecture/AUTH-FLOW.md`).

## SEO / Lighthouse (2026-09-03)

- `index.html`: title/description, canonical + OG/Twitter (`/og-image.png` 1200×630), JSON-LD
  (Organization · WebSite · SoftwareApplication), `theme-color`, SVG favicon + apple-touch-icon.
- `public/robots.txt` (app routes disallowed) + `public/sitemap.xml`.
- Google Fonts loaded async (`media="print" onload`), `preconnect` to both hosts.
- Dashboard + admin pages are `React.lazy` chunks; `vendor` chunk pinned via `vite.config.ts`.
- Text opacity ≥ 60 % on navy for WCAG AA; icons `aria-hidden`; landmarks + skip link.
- DEV helpers (quick-login bar, panel shortcuts, auto-login) only render when `import.meta.env.DEV`.
- Cache policy lives in `infra/nginx/nginx-cloudrun.conf`: `index.html` no-cache, `/assets/` 1 year.

Measured locally (nginx + `dist`, Lighthouse 12, incognito-equivalent): home mobile 99/100/100/100,
home desktop 100/100/100/100. `/login` SEO scores ~66 **by design** (noindex).

## Dev

```bash
npm install
npm run dev        # http://localhost:5173 — /api proxied to backend:8000 (docker compose)
npm run build      # tsc + vite build → dist/
```
