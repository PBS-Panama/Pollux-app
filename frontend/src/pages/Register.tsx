import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function Register() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw1, setShowPw1] = useState(false)
  const [showPw2, setShowPw2] = useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm_password: '',
    nationality: '', phone: '', role: 'seafarer', rank: '',
    date_of_birth: '',
  })

  const RANKS = [
    { id: 'master', label: 'Capitán / Master', icon: '👨‍✈️' },
    { id: 'chief-officer', label: 'Primer Oficial', icon: '🎖️' },
    { id: '2nd-officer', label: 'Segundo Oficial', icon: '🗺️' },
    { id: '3rd-officer', label: 'Tercer Oficial', icon: '⛵' },
    { id: 'chief-engineer', label: 'Jefe de Máquinas', icon: '⚙️' },
    { id: '2nd-engineer', label: 'Segundo Ingeniero', icon: '🔧' },
    { id: 'electrician', label: 'Electricista', icon: '⚡' },
    { id: 'bosun', label: 'Contramaestre', icon: '⚓' },
    { id: 'ab', label: 'Marinero AB', icon: '🌊' },
    { id: 'cook', label: 'Cocinero Jefe', icon: '🍽️' },
  ]

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Mínimo 8 caracteres'); return }
    if (form.password !== form.confirm_password) { setError('Las contraseñas no coinciden'); return }
    setError(''); setStep(2)
  }

  const handleSubmit = async () => {
    if (!form.rank) { setError('Selecciona tu rango'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/register', {
        email: form.email, password: form.password, role: form.role,
        first_name: form.first_name, last_name: form.last_name,
        nationality: form.nationality, phone: form.phone, rank: form.rank,
        date_of_birth: form.date_of_birth || null,
      })
      const { data: tokens } = await api.post('/auth/login', { email: form.email, password: form.password })
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      login(user, tokens.access_token, tokens.refresh_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrar cuenta')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-grotesk text-2xl font-bold text-ice">
            <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_10px_#00F0FF]" />Leto
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8">
          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-cyan' : 'bg-white/10'}`} />
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <h1 className="font-grotesk text-xl font-semibold">Crea tu cuenta</h1>
                <p className="text-ice/50 text-sm mt-1">Paso 1 de 2 — Información personal</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ice/60 mb-1.5">Nombre</label>
                  <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Juan" required
                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ice/60 mb-1.5">Apellido</label>
                  <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="García" required
                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ice/60 mb-1.5">Correo Electrónico</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.com" required
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ice/60 mb-1.5">Nacionalidad</label>
                  <input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Panameña"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ice/60 mb-1.5">Teléfono</label>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+507 6000 0000"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ice/60 mb-1.5">Fecha de Nacimiento</label>
                  <input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors [color-scheme:dark]" />
                </div>
                <div className="flex items-end">
                  <p className="text-ice/30 text-xs leading-relaxed">Requerida para verificación de documentos STCW.</p>
                </div>
              </div>
              {(['password', 'confirm_password'] as const).map((field, i) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-ice/60 mb-1.5">
                    {i === 0 ? 'Contraseña' : 'Confirmar Contraseña'}
                  </label>
                  <div className="relative">
                    <input type={(i === 0 ? showPw1 : showPw2) ? 'text' : 'password'} value={form[field]}
                      onChange={(e) => set(field, e.target.value)} placeholder="••••••••" required
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 pr-10 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25" />
                    <button type="button" onClick={() => i === 0 ? setShowPw1(!showPw1) : setShowPw2(!showPw2)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ice/30 hover:text-cyan transition-colors">
                      {(i === 0 ? showPw1 : showPw2) ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
              ))}
              {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" className="w-full bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all mt-2">
                Continuar →
              </button>
              <p className="text-center text-ice/40 text-sm">
                ¿Ya tienes cuenta? <Link to="/login" className="text-cyan hover:underline">Ingresar</Link>
              </p>
            </form>
          )}

          {step === 2 && (
            <div>
              <h1 className="font-grotesk text-xl font-semibold mb-1">Tu posición a bordo</h1>
              <p className="text-ice/50 text-sm mb-5">Paso 2 de 2 — Selecciona tu rango principal</p>
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {RANKS.map((r) => (
                  <button key={r.id} onClick={() => set('rank', r.id)}
                    className={`text-center p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      form.rank === r.id ? 'border-cyan bg-cyan/10' : 'border-white/10 bg-white/[0.03] hover:border-cyan/40'
                    }`}>
                    <div className="text-2xl mb-1">{r.icon}</div>
                    <div className="text-xs font-semibold leading-tight">{r.label}</div>
                  </button>
                ))}
              </div>
              {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setError('') }}
                  className="flex-1 border border-white/15 text-ice/60 font-semibold py-2.5 rounded-lg hover:border-white/30 transition-colors">
                  ← Volver
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50">
                  {loading ? 'Creando cuenta...' : 'Crear Perfil'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
