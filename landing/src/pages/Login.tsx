/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Login.tsx — Dedicated sign-in page (/login) — Pollux (company)     ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  Entry point for returning users (bookmark, "Iniciar sesión" link,  ║
 * ║  expired-session redirects from api.ts and the route guards).        ║
 * ║                                                                      ║
 * ║  2026-09-04 (Rick): company-only, no role toggle — a seafarer         ║
 * ║  landing on this form by mistake should not find a path forward      ║
 * ║  here; Cástor is a different app entirely. Three fields, in order:   ║
 * ║  Nombre de Empresa, Usuario (email), Contraseña — so the form itself ║
 * ║  makes "this is for companies" obvious without needing a tab.        ║
 * ║  Company name is a real credential, not decoration: the backend      ║
 * ║  (routers/auth.py) checks it against the account's Company row.      ║
 * ║                                                                      ║
 * ║  • ?next=/path  → where to go after sign-in (same-origin only).      ║
 * ║  • Already signed in → straight to the destination.                  ║
 * ║  • noindex: the page is app chrome, not marketing content.           ║
 * ║                                                                      ║
 * ║  The actual API flow lives in lib/auth.ts (shared with Register).    ║
 * ║                                                                      ║
 * ║  PALETTE: matches landing/site/ (the Appdent-based static marketing  ║
 * ║  site) — white background, #f98f1c→#f45442 orange gradient, #444     ║
 * ║  headings, #777 muted text, #ddd borders. Hex values copied from     ║
 * ║  landing/site/css/main.css, not eyeballed.                           ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useId, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { signIn, loginErrorMessage, destinationFor, safeNext } from '../lib/auth'
import { useAuthStore, readPersistedSession } from '../store/authStore'
import { usePageMeta } from '../lib/usePageMeta'

const GRADIENT = 'linear-gradient(135deg, #f98f1c 0%, #f45442 100%)'

export default function Login() {
  usePageMeta('Iniciar sesión · Pollux')

  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const storeToken = useAuthStore((s) => s.accessToken)
  const storeUser = useAuthStore((s) => s.user)

  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const companyId = useId()
  const emailId = useId()
  const pwId = useId()
  const errorId = useId()

  // Already signed in → skip the form.
  const session = storeToken ? { accessToken: storeToken, user: storeUser } : readPersistedSession()
  if (session.accessToken) {
    const fallback = destinationFor(session.user?.role)
    const target = next && !(next.startsWith('/admin') && session.user?.role !== 'admin') ? next : fallback
    // /admin is a separate container (interfaces/admin) proxied by the outer nginx —
    // not a route this SPA owns. A client-side <Navigate> would just render blank
    // (no matching <Route>), so it needs a real browser navigation instead.
    if (target.startsWith('/admin')) {
      window.location.replace(target)
      return null
    }
    return <Navigate to={target} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await signIn(email.trim(), password, companyName.trim())
      const fallback = destinationFor(user.role)
      const target = next && !(next.startsWith('/admin') && user.role !== 'admin') ? next : fallback
      // Same reasoning as above: /admin needs a hard navigation, not react-router's navigate().
      if (target.startsWith('/admin')) {
        window.location.href = target
      } else {
        navigate(target, { replace: true })
      }
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-white border border-[#ddd] rounded-md px-3.5 py-2.5 text-[#333] text-sm outline-none ' +
    'focus:border-[#f45442] focus:ring-2 focus:ring-[#f98f1c]/20 transition-colors placeholder:text-[#999]'

  return (
    <div className="min-h-screen bg-white text-[#444] flex flex-col font-['Roboto',sans-serif]">
      <a href="#login-form" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-10 text-white px-3 py-1 rounded" style={{ background: GRADIENT }}>
        Saltar al formulario
      </a>

      {/* Top bar — hard nav to "/": served by a different container (the static landing).
          Logo lives here only on mobile/tablet (<lg) — from lg up, the brand panel below
          carries it instead, bigger, so the constellation detail actually reads. */}
      <header className="px-[5%] py-5 flex items-center justify-between border-b border-[#eee]">
        <a href="/" className="flex items-center gap-2 text-xl font-bold text-[#444] no-underline lg:hidden" aria-label="Pollux — inicio">
          <img src="/favicon.svg" alt="" className="w-6 h-6" aria-hidden="true" />Pollux
        </a>
        <a href="/" className="text-sm text-[#777] hover:text-[#f45442] underline underline-offset-2 decoration-[#ddd] transition-colors lg:ml-auto">← Volver al inicio</a>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 items-stretch">
        {/* Brand panel — desktop only, mirrors the site's own hero gradient */}
        <section aria-labelledby="login-brand-title" className="hidden lg:flex flex-col justify-center px-[10%] relative overflow-hidden text-white" style={{ background: GRADIENT }}>
          <a href="/" className="flex items-center gap-4 text-5xl font-bold text-white no-underline mb-12" aria-label="Pollux — inicio">
            <img src="/favicon.svg" alt="" className="w-20 h-20 shrink-0" aria-hidden="true" />Pollux
          </a>
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-white text-xs tracking-widest uppercase mb-6 w-fit">
            Plataforma de talento marítimo · Empresas
          </div>
          <h2 id="login-brand-title" className="text-4xl xl:text-5xl font-bold leading-tight mb-5">
            Tu tripulación, en regla y a un clic.
          </h2>
          <p className="text-white/85 leading-relaxed max-w-md mb-8">
            Pollux centraliza la documentación STCW de cada marino, calcula vencimientos por rango y mantiene tu base de datos de tripulación siempre lista para operar.
          </p>
          <ul className="space-y-3 text-sm text-white/90">
            {[
              'Documentos verificados con evidencia de registro',
              'Estado de cumplimiento en tiempo real · STCW / MLC 2006',
              'Sincronizado con Cástor: el marino actualiza, tú lo ves al instante',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white shrink-0" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Form */}
        <section aria-labelledby="login-title" className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white border border-[#ddd] rounded-lg p-8 shadow-sm">
            <h1 id="login-title" className="text-2xl font-semibold mb-1 text-[#444]">Iniciar sesión</h1>
            <p className="text-[#777] text-sm mb-6">Acceso exclusivo para empresas · Pollux</p>

            <form id="login-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor={companyId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                  Nombre de empresa
                </label>
                <input id={companyId} type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Naviera del Pacífico S.A." required autoComplete="organization"
                  aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
                  className={inputClass} />
              </div>

              <div>
                <label htmlFor={emailId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                  Usuario
                </label>
                <input id={emailId} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com" required autoComplete="email" inputMode="email"
                  aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
                  className={inputClass} />
              </div>

              <div>
                <label htmlFor={pwId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                  Contraseña
                </label>
                <div className="relative">
                  <input id={pwId} type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                    autoComplete="current-password" aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
                    className={`${inputClass} pr-11`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-pressed={showPw}
                    aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-[#777] hover:text-[#f45442] transition-colors">
                    {showPw ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {/* The /forgot-password page shipped 2026-09-15 (nota 58) with no way to reach it from here. */}
                <p className="text-right text-sm mt-1.5">
                  <Link to="/forgot-password" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </p>
              </div>

              {error && (
                <p id={errorId} role="alert" className="text-[#c0392b] text-sm bg-[#fdecea] border border-[#f5c6cb] rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading}
                className="w-full text-white font-semibold py-2.5 rounded-md hover:shadow-lg transition-all disabled:opacity-60 mt-2"
                style={{ background: GRADIENT }}>
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <p className="text-center text-[#777] text-sm mt-6">
              ¿Tu empresa aún no tiene cuenta?{' '}
              <Link to="/register" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
                Regístrala
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="px-[5%] py-5 border-t border-[#eee] text-center text-xs text-[#999]">
        © 2026 PB Trading Solutions · Pollux
      </footer>
    </div>
  )
}
