/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Dashboard.tsx — Authenticated Company Dashboard (Pollux)           ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  User arrives here AFTER successful login from /login.               ║
 * ║  Wrapped by ProtectedRoute (requires valid JWT).                     ║
 * ║                                                                      ║
 * ║  POLLUX ONLY (physical split 2026-09-03): this container serves the  ║
 * ║  company SPA at /company/ (supervisord "leto" process, :8081). The   ║
 * ║  seafarer SPA lives in Cástor (own domain). Seafarers manage their   ║
 * ║  profile, documents and schedules there; Pollux reads the same DB.   ║
 * ║  A seafarer account signed in here is told where its app is.        ║
 * ║                                                                      ║
 * ║  The iframe shares origin with this page → the crewing SPA reads     ║
 * ║  the `pollux-user` identity bridge from localStorage (AUTH-FLOW.md). ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { CASTOR_URL } from '../lib/links'

const COMPANY_APP = '/company/#/company-dashboard'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  if (user?.role === 'company' || user?.role === 'admin') {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <iframe
          key={COMPANY_APP}
          src={COMPANY_APP}
          className="w-full h-full border-none"
          title="Pollux — Panel de empresa"
          allow="clipboard-write"
        />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-navy text-ice flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/[0.04] border border-white/10 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center gap-2 font-grotesk text-xl font-bold mb-4">
          <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_10px_#00F0FF]" aria-hidden="true" />Pollux
        </div>
        <h1 className="font-grotesk text-lg font-semibold mb-2">Esta cuenta es de tripulante</h1>
        <p className="text-ice/70 text-sm leading-relaxed mb-6">
          Pollux es la plataforma para navieras y agencias. Tu expediente, certificados, vencimientos y
          calendario viven en <strong className="text-ice">Cástor</strong>, la app del marino. Tu usuario y
          contraseña son los mismos.
        </p>
        <a href={CASTOR_URL}
          className="block w-full bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all mb-3">
          Ir a Cástor →
        </a>
        <button type="button" onClick={logout}
          className="text-sm text-ice/70 hover:text-cyan underline underline-offset-2 decoration-ice/30">
          Cerrar sesión
        </button>
        <p className="text-xs text-ice/60 mt-6">
          ¿Eres empresa? <Link to="/register" className="text-cyan underline underline-offset-2 decoration-cyan/50">Crea tu cuenta empresarial</Link>
        </p>
      </div>
    </main>
  )
}
