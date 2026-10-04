/**
 * VerifyEmail.tsx — landing page of the email-verification link
 * (/verify-email?token=...).
 *
 * T16 (Handover.md nota 59): the emailed link used to point straight at
 * GET /api/auth/verify-email, so the user saw raw JSON. The link now opens this
 * page, which calls that same endpoint and shows success or the backend's error.
 * The token is single-use, so the call is made exactly once (the ref guards
 * React StrictMode's double effect, which would otherwise burn the token and
 * show "already used").
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { usePageMeta } from '../lib/usePageMeta'

type State = { kind: 'loading' } | { kind: 'ok' } | { kind: 'error'; message: string }

function errorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return typeof detail === 'string' && detail.length > 0
    ? detail
    : 'No pudimos verificar tu correo. Probá de nuevo más tarde.'
}

export default function VerifyEmail() {
  usePageMeta('Verificar correo · Pollux')

  const token = useSearchParams()[0].get('token') ?? ''
  const [state, setState] = useState<State>(
    token ? { kind: 'loading' } : { kind: 'error', message: 'Este enlace no tiene el token de verificación.' },
  )
  const called = useRef(false)

  useEffect(() => {
    if (!token || called.current) return
    called.current = true
    api.get('/auth/verify-email', { params: { token } })
      .then(() => setState({ kind: 'ok' }))
      .catch((err) => setState({ kind: 'error', message: errorMessage(err) }))
  }, [token])

  return (
    <div className="min-h-screen bg-white text-[#444] flex flex-col font-['Roboto',sans-serif]">
      <header className="px-[5%] py-5 flex items-center justify-between border-b border-[#eee]">
        <a href="/" className="flex items-center gap-2 text-xl font-bold text-[#444] no-underline" aria-label="Pollux — inicio">
          <img src="/favicon.svg" alt="" className="w-6 h-6" aria-hidden="true" />Pollux
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-[#ddd] rounded-lg p-8 shadow-sm text-center" role="status" aria-live="polite">
          {state.kind === 'loading' && <p className="text-[#777] text-sm">Verificando tu correo…</p>}

          {state.kind === 'ok' && (
            <>
              <h1 className="text-2xl font-semibold mb-2 text-[#444]">Correo verificado</h1>
              <p className="text-[#777] text-sm mb-6">
                Listo. Tu cuenta de empresa quedará activa cuando nuestro equipo la apruebe.
              </p>
              <Link to="/login" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
                Ir a iniciar sesión
              </Link>
            </>
          )}

          {state.kind === 'error' && (
            <>
              <h1 className="text-2xl font-semibold mb-2 text-[#444]">No se pudo verificar</h1>
              <p className="text-[#c0392b] text-sm mb-6">{state.message}</p>
              <Link to="/login" className="text-[#f45442] underline underline-offset-2 decoration-[#f45442]/50 hover:decoration-[#f45442]">
                Volver a iniciar sesión
              </Link>
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
