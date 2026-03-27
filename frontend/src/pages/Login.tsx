import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function Login() {
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
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-grotesk text-2xl font-bold text-ice">
            <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_10px_#00F0FF]" />
            Leto
          </div>
          <p className="text-ice/40 text-sm mt-2">Maritime Talent Platform</p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8">
          <h1 className="font-grotesk text-xl font-semibold mb-1">Iniciar Sesión</h1>
          <p className="text-ice/50 text-sm mb-6">Accede a tu cuenta Leto</p>

          {/* Role Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-white/[0.04] rounded-lg">
            {(['seafarer', 'company'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  role === r
                    ? 'bg-cyan text-navy'
                    : 'text-ice/50 hover:text-ice'
                }`}
              >
                {r === 'seafarer' ? '⚓ Marino' : '🏢 Empresa'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ice/60 mb-1.5 tracking-wide">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ice/60 mb-1.5 tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 pr-10 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ice/30 hover:text-cyan transition-colors"
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-ice/40 text-sm mt-5">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-cyan hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
