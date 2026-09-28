/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ForgotPassword.tsx — Request a password-reset link (/forgot-password)║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  2026-09-15 (Handover.md nota (58)) — POSTs to /api/auth/forgot-     ║
 * ║  password, which always returns the same generic response whether   ║
 * ║  or not the email exists (account-enumeration guard on the backend, ║
 * ║  same principle as login's generic "Invalid credentials"). This     ║
 * ║  page mirrors that on purpose: it shows the same success message     ║
 * ║  no matter what, and never reveals whether the account was found.   ║
 * ║                                                                      ║
 * ║  PALETTE: matches Login.tsx / landing/site/.                        ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { usePageMeta } from '../lib/usePageMeta'

const GRADIENT = 'linear-gradient(135deg, #f98f1c 0%, #f45442 100%)'

export default function ForgotPassword() {
  usePageMeta('Recuperar contraseña · Pollux')

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const emailId = useId()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
    } catch {
      // Deliberately swallowed — the backend already returns the same
      // {ok:true} regardless of whether the email exists. A network error
      // here doesn't get a different message either: don't give a prober
      // more signal than a real network hiccup would.
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  const inputClass =
    'w-full bg-white border border-[#ddd] rounded-md px-3.5 py-2.5 text-[#333] text-sm outline-none ' +
    'focus:border-[#f45442] focus:ring-2 focus:ring-[#f98f1c]/20 transition-colors placeholder:text-[#999]'

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
          {sent ? (
            <>
              <h1 className="text-2xl font-semibold mb-1 text-[#444]">Revisá tu correo</h1>
              <p className="text-[#777] text-sm">
                Si esa dirección tiene una cuenta, te enviamos un enlace para elegir una nueva
                contraseña. El enlace vence en 1 hora.
              </p>
              <p className="text-center text-[#777] text-sm mt-6">
                <Link to="/login" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
                  Volver a iniciar sesión
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold mb-1 text-[#444]">Recuperar contraseña</h1>
              <p className="text-[#777] text-sm mb-6">
                Escribí el correo de tu cuenta y te mandamos un enlace para elegir una nueva contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor={emailId} className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide">
                    Correo
                  </label>
                  <input id={emailId} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com" required autoComplete="email" inputMode="email"
                    className={inputClass} />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full text-white font-semibold py-2.5 rounded-md hover:shadow-lg transition-all disabled:opacity-60 mt-2"
                  style={{ background: GRADIENT }}>
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>
              </form>

              <p className="text-center text-[#777] text-sm mt-6">
                <Link to="/login" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
                  Volver a iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="px-[5%] py-5 border-t border-[#eee] text-center text-xs text-[#999]">
        © 2026 PB Trading Solutions · Pollux
      </footer>
    </div>
  )
}
