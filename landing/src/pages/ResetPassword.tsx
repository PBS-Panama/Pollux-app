/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ResetPassword.tsx — Set a new password from the emailed link         ║
 * ║  (/reset-password?token=...)                                          ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  2026-09-15 (Handover.md nota (58)) — POSTs {token, new_password}   ║
 * ║  to /api/auth/reset-password. A missing/malformed token is caught    ║
 * ║  client-side (no request at all); an invalid/expired/used token is   ║
 * ║  a 400 from the backend, shown inline like login's own error path.   ║
 * ║  On success the backend has already revoked every session issued     ║
 * ║  before this moment (password_changed_at / iat check in deps.py) —   ║
 * ║  redirect to /login so the user authenticates fresh.                 ║
 * ║                                                                      ║
 * ║  PALETTE: matches Login.tsx / landing/site/.                        ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { usePageMeta } from '../lib/usePageMeta'

const GRADIENT = 'linear-gradient(135deg, #f98f1c 0%, #f45442 100%)'

function errorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  if (typeof detail === 'string' && detail.length > 0) return detail
  return 'No pudimos restablecer tu contraseña. Probá de nuevo.'
}

export default function ResetPassword() {
  usePageMeta('Elegir nueva contraseña · Pollux')

  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const passwordId = useId()
  const confirmId = useId()

  const inputClass =
    'w-full bg-white border border-[#ddd] rounded-md px-3.5 py-2.5 text-[#333] text-sm outline-none ' +
    'focus:border-[#f45442] focus:ring-2 focus:ring-[#f98f1c]/20 transition-colors placeholder:text-[#999]'

  if (!token) {
    return (
      <div className="min-h-screen bg-white text-[#444] flex flex-col font-['Roboto',sans-serif]">
        <header className="px-[5%] py-5 flex items-center justify-between border-b border-[#eee]">
          <a href="/" className="flex items-center gap-2 text-xl font-bold text-[#444] no-underline" aria-label="Pollux — inicio">
            <img src="/favicon.svg" alt="" className="w-6 h-6" aria-hidden="true" />Pollux
          </a>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white border border-[#ddd] rounded-lg p-8 shadow-sm text-center">
            <h1 className="text-2xl font-semibold mb-2 text-[#444]">Enlace incompleto</h1>
            <p className="text-[#777] text-sm mb-6">
              Este enlace no tiene el token de recuperación. Pedí uno nuevo.
            </p>
            <Link to="/forgot-password" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
              Pedir un nuevo enlace
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      navigate('/login?reset=1')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#444] flex flex-col font-['Roboto',sans-serif]">
      <header className="px-[5%] py-5 flex items-center justify-between border-b border-[#eee]">
        <a href="/" className="flex items-center gap-2 text-xl font-bold text-[#444] no-underline" aria-label="Pollux — inicio">
          <img src="/favicon.svg" alt="" className="w-6 h-6" aria-hidden="true" />Pollux
        </a>
        <a href="/" className="text-sm text-[#777] hover:text-[#f45442] underline underline-offset-2 decoration-[#ddd] transition-colors">← Volver al inicio</a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-[#ddd] rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-semibold mb-1 text-[#444]">Elegí una nueva contraseña</h1>
          <p className="text-[#777] text-sm mb-6">Mínimo 12 caracteres.</p>

          {error && (
            <div className="mb-4 rounded-md border border-[#f45442]/30 bg-[#f45442]/5 px-3.5 py-2.5 text-sm text-[#c0392b]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor={passwordId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                Nueva contraseña
              </label>
              <input id={passwordId} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••" required autoComplete="new-password" minLength={12}
                className={inputClass} />
            </div>

            <div>
              <label htmlFor={confirmId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                Confirmar contraseña
              </label>
              <input id={confirmId} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••••" required autoComplete="new-password" minLength={12}
                className={inputClass} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full text-white font-semibold py-2.5 rounded-md hover:shadow-lg transition-all disabled:opacity-60 mt-2"
              style={{ background: GRADIENT }}>
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>

          <p className="text-center text-[#777] text-sm mt-6">
            <Link to="/login" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </main>

      <footer className="px-[5%] py-5 border-t border-[#eee] text-center text-xs text-[#999]">
        © 2026 PB Trading Solutions · Pollux
      </footer>
    </div>
  )
}
