/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Register.tsx — Company sign-up page (/register) — Pollux           ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  Pollux registers companies only (Rick, 2026-09-04): seafarers keep   ║
 * ║  their profile in Cástor. So this form collects exactly what the     ║
 * ║  backend needs for role="company" — company name, email, password —  ║
 * ║  nothing seafarer-specific (rank, fleet category…).                  ║
 * ║                                                                      ║
 * ║  2026-09-04: replaces the old `/register` route, which reused the    ║
 * ║  full LandingPage + RegisterModal (navy/cyan design, and a 3-step    ║
 * ║  seafarer-oriented flow — its Step 2 required picking a fleet        ║
 * ║  category and a personal rank even for a company account, and it     ║
 * ║  never collected company_name at all, so every signup through it     ║
 * ║  landed in the DB as "Unnamed Company" — verified against            ║
 * ║  backend/app/routers/auth.py). This page fixes both: same styling    ║
 * ║  as the new landing/site/ and Login.tsx, and the right three fields. ║
 * ║                                                                      ║
 * ║  RegisterModal.tsx (still used nowhere) and LandingPage.tsx's own    ║
 * ║  register-modal wiring are now dead code — left in place, not        ║
 * ║  deleted, pending a separate cleanup pass.                           ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useId, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { registerCompany, destinationFor } from '../lib/auth'
import { useAuthStore, readPersistedSession } from '../store/authStore'
import { usePageMeta } from '../lib/usePageMeta'

const GRADIENT = 'linear-gradient(135deg, #f98f1c 0%, #f45442 100%)'

function registerErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { detail?: unknown } } }
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  if (status === 400 && typeof detail === 'string' && detail.toLowerCase().includes('already registered')) {
    return 'Ese correo ya tiene una cuenta. ¿Quieres iniciar sesión?'
  }
  if (status === 422) return 'Revisa el formato del correo y que la contraseña tenga al menos 8 caracteres.'
  if (typeof detail === 'string' && detail) return detail
  return 'No pudimos conectar con el servidor. Intenta de nuevo.'
}

export default function Register() {
  usePageMeta('Crear cuenta empresarial · Pollux')

  const navigate = useNavigate()
  const storeToken = useAuthStore((s) => s.accessToken)
  const storeUser = useAuthStore((s) => s.user)

  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const companyId = useId()
  const emailId = useId()
  const pwId = useId()
  const confirmId = useId()
  const errorId = useId()

  // Already signed in → skip the form.
  const session = storeToken ? { accessToken: storeToken, user: storeUser } : readPersistedSession()
  if (session.accessToken) {
    return <Navigate to={destinationFor(session.user?.role)} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!companyName.trim()) { setError('Escribe el nombre de tu empresa.'); return }
    if (password.length < 8) { setError('La contraseña debe tener mínimo 8 caracteres.'); return }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return }

    setLoading(true)
    try {
      const user = await registerCompany(companyName.trim(), email.trim(), password)
      navigate(destinationFor(user.role), { replace: true })
    } catch (err) {
      setError(registerErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-white border border-[#ddd] rounded-md px-3.5 py-2.5 text-[#333] text-sm outline-none ' +
    'focus:border-[#f45442] focus:ring-2 focus:ring-[#f98f1c]/20 transition-colors placeholder:text-[#999]'

  return (
    <div className="min-h-screen bg-white text-[#444] flex flex-col font-['Roboto',sans-serif]">
      <a href="#register-form" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-10 text-white px-3 py-1 rounded" style={{ background: GRADIENT }}>
        Saltar al formulario
      </a>

      {/* Top bar — hard nav to "/": served by a different container (the static landing) */}
      <header className="px-[5%] py-5 flex items-center justify-between border-b border-[#eee]">
        <a href="/" className="flex items-center gap-2 text-xl font-bold text-[#444] no-underline" aria-label="Pollux — inicio">
          <img src="/favicon.svg" alt="" className="w-6 h-6" aria-hidden="true" />Pollux
        </a>
        <a href="/" className="text-sm text-[#777] hover:text-[#f45442] underline underline-offset-2 decoration-[#ddd] transition-colors">← Volver al inicio</a>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 items-stretch">
        {/* Brand panel — desktop only */}
        <section aria-labelledby="register-brand-title" className="hidden lg:flex flex-col justify-center px-[10%] relative overflow-hidden text-white" style={{ background: GRADIENT }}>
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 text-white text-xs tracking-widest uppercase mb-6 w-fit">
            Cuenta empresarial
          </div>
          <h2 id="register-brand-title" className="text-4xl xl:text-5xl font-bold leading-tight mb-5">
            Tu tripulación, verificada, desde el primer día.
          </h2>
          <p className="text-white/85 leading-relaxed max-w-md mb-8">
            Crea tu cuenta empresarial y accede al panel de Pollux. La documentación STCW de tu tripulación
            se mantiene al día en Cástor — tú solo la ves organizada, con estado de cumplimiento en tiempo real.
          </p>
          <ul className="space-y-3 text-sm text-white/90">
            {[
              'Sin costo de instalación para empezar',
              'Base de datos de tripulación lista desde el primer login',
              'Soporte de PB Trading Solutions durante la implementación',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white shrink-0" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Form */}
        <section aria-labelledby="register-title" className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white border border-[#ddd] rounded-lg p-8 shadow-sm">
            <h1 id="register-title" className="text-2xl font-semibold mb-1 text-[#444]">Crear cuenta empresarial</h1>
            <p className="text-[#777] text-sm mb-6">Pollux es para navieras y agencias de tripulación.</p>

            <form id="register-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor={companyId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                  Nombre de la empresa
                </label>
                <input id={companyId} type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Naviera del Pacífico S.A." required autoComplete="organization"
                  className={inputClass} />
              </div>

              <div>
                <label htmlFor={emailId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                  Correo electrónico
                </label>
                <input id={emailId} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@empresa.com" required autoComplete="email" inputMode="email"
                  aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
                  className={inputClass} />
              </div>

              <div>
                <label htmlFor={pwId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                  Contraseña
                </label>
                <div className="relative">
                  <input id={pwId} type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required
                    autoComplete="new-password" minLength={8}
                    aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
                    className={`${inputClass} pr-11`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-pressed={showPw}
                    aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-[#777] hover:text-[#f45442] transition-colors">
                    {showPw ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor={confirmId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                  Confirmar contraseña
                </label>
                <input id={confirmId} type={showPw ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" required
                  autoComplete="new-password"
                  aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
                  className={inputClass} />
              </div>

              {error && (
                <p id={errorId} role="alert" className="text-[#c0392b] text-sm bg-[#fdecea] border border-[#f5c6cb] rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading}
                className="w-full text-white font-semibold py-2.5 rounded-md hover:shadow-lg transition-all disabled:opacity-60 mt-2"
                style={{ background: GRADIENT }}>
                {loading ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
            </form>

            <p className="text-center text-[#999] text-xs mt-4 leading-relaxed">
              Al crear tu cuenta aceptas que Pollux y Cástor comparten la misma base de datos de tripulación
              — es el mismo ecosistema PBS, visto desde dos apps.
            </p>

            <p className="text-center text-[#777] text-sm mt-4">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
                Inicia sesión
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
