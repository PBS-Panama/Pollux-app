/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  LoginModal.tsx — Authentication Modal (Login)                      ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  WORKFLOW:                                                           ║
 * ║  Opened from LandingPage when user clicks "Acceso Clientes"         ║
 * ║  or "Soy una Empresa Naviera".                                      ║
 * ║  Displayed as a blur-overlay modal ON TOP of the landing page.      ║
 * ║                                                                      ║
 * ║  FEATURES:                                                           ║
 * ║  • Dual-role toggle: ⚓ Marino / 🏢 Empresa                        ║
 * ║  • Email + Password form with show/hide toggle                      ║
 * ║  • Spanish-language error messages for 401, 422, network errors     ║
 * ║                                                                      ║
 * ║  API FLOW:                                                           ║
 * ║  1. POST /api/auth/login → { access_token, refresh_token }          ║
 * ║  2. GET  /api/auth/me    → user profile                             ║
 * ║  3. Stores JWT + user in Zustand (authStore)                        ║
 * ║  4. Navigates to /dashboard                                         ║
 * ║                                                                      ║
 * ║  DEMO ACCOUNT:                                                       ║
 * ║  Email: demo@leto.com  |  Password: Demo1234!                       ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface Props { onClose: () => void }

export default function LoginModal({ onClose }: Props) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [role, setRole] = useState<'seafarer' | 'company'>('seafarer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: tokens } = await api.post('/auth/login', { email, password })
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      login(user, tokens.access_token, tokens.refresh_token)
      // Init crewing user folder and read rank, then bridge identity to crewing module via localStorage
      let rank: string | null = null
      try {
        await fetch(`/crewing-api/users/${user.id}/init`, { method: 'POST' })
        const settings = await fetch(`/crewing-api/users/${user.id}/settings`).then((r) => r.json())
        rank = settings?.rank ?? null
      } catch { /* non-critical */ }
      localStorage.setItem('leto-user', JSON.stringify({
        id: user.id, email: user.email, rank,
        first_name: user.first_name ?? null, last_name: user.last_name ?? null,
      }))
      onClose()
      navigate('/dashboard')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 401) setError('Correo o contraseña incorrectos. Verifica tus datos.')
      else if (err.response?.status === 422) setError('Formato de correo inválido.')
      else setError(detail || 'Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-[#0d2040] border border-white/10 rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 font-grotesk font-bold text-lg">
          <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_#00F0FF]" />Leto
        </div>
        <button onClick={onClose} className="text-ice/30 hover:text-ice transition-colors text-xl leading-none">✕</button>
      </div>
      <div className="p-6">
        <h2 className="font-grotesk text-lg font-semibold mb-1">Iniciar Sesión</h2>
        <p className="text-ice/40 text-sm mb-5">Accede a tu cuenta Leto</p>
        <div className="flex gap-1.5 p-1 bg-white/[0.04] rounded-lg mb-5">
          {(['seafarer','company'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${role===r ? 'bg-cyan text-navy' : 'text-ice/50 hover:text-ice'}`}>
              {r==='seafarer' ? '⚓ Marino' : '🏢 Empresa'}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ice/60 mb-1.5 tracking-wide">Correo Electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ice/60 mb-1.5 tracking-wide">Contraseña</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 pr-10 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ice/30 hover:text-cyan transition-colors">
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
