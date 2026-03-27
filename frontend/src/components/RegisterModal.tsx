/**
 * ╔═════════════════════════════════════════════════════════════════════════╗
 * ║  RegisterModal.tsx — 3-Step Seafarer Registration Flow                 ║
 * ╠═════════════════════════════════════════════════════════════════════════╣
 * ║                                                                         ║
 * ║  WORKFLOW:                                                              ║
 * ║  Opened from LandingPage when user clicks "Soy Marino" or              ║
 * ║  "Registrarme como Marino". Displayed as blur-overlay modal.           ║
 * ║                                                                         ║
 * ║  3-STEP FLOW:                                                           ║
 * ║                                                                         ║
 * ║  STEP 1 — Personal Info                                                 ║
 * ║  • Name, email, nationality, phone, DOB                                 ║
 * ║  • Password + confirm with show/hide toggle                            ║
 * ║  • Validates: min 8 chars, passwords match                             ║
 * ║                                                                         ║
 * ║  STEP 2 — Rank Selection                                                ║
 * ║  • 10 maritime ranks (Master, Chief Officer, AB, Cook, etc.)            ║
 * ║  • Each shows icon + STCW code                                         ║
 * ║  • Selected rank determines Step 3 document requirements               ║
 * ║                                                                         ║
 * ║  STEP 3 — Agent Leto (Document Upload)                                  ║
 * ║  • AI agent "analyzes" rank (2s typing animation)                       ║
 * ║  • Shows per-document upload cards with CRÍTICO/IMPORTANTE/ESTÁNDAR    ║
 * ║  • Each card: 📎 Cargar (PDF only) + 👁 Ver PDF (opens new tab)       ║
 * ║  • Progress counter: "X/N docs subidos | X/N críticos completados"     ║
 * ║  • On submit: POST /api/auth/register → auto-login → /dashboard       ║
 * ║                                                                         ║
 * ║  DATA:                                                                  ║
 * ║  DOCS{} and RANK_NOTES{} mirror onboarding/index.html prototype.       ║
 * ║  Document requirements are per STCW/MLC 2006 regulations.              ║
 * ║                                                                         ║
 * ╚═════════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface Props { onClose: () => void; onSwitchToLogin: () => void }

// ── Document requirements per rank (mirrors onboarding prototype) ──
type DocLevel = 'critical' | 'high' | 'standard'
interface Doc { name: string; cert: string; level: DocLevel }

const DOCS: Record<string, Doc[]> = {
  master: [
    { name: 'Certificado de Competencia — Master', cert: 'STCW Reg. II/2', level: 'critical' },
    { name: 'Certificado Médico (ENG1 / PEME)', cert: 'MLC 2006 Reg. 1.2', level: 'critical' },
    { name: 'GMDSS General Operator Certificate', cert: 'STCW Reg. IV/2', level: 'critical' },
    { name: 'Advanced Fire Fighting', cert: 'STCW Reg. VI/3', level: 'critical' },
    { name: 'Medical Care', cert: 'STCW Reg. VI/4-2', level: 'critical' },
    { name: 'Ship Security Officer (SSO)', cert: 'STCW Reg. VI/5', level: 'high' },
    { name: 'ECDIS Type-Specific Training', cert: 'STCW Reg. II/1', level: 'high' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'standard' },
  ],
  'chief-officer': [
    { name: 'Certificado de Competencia — Chief Officer', cert: 'STCW Reg. II/2', level: 'critical' },
    { name: 'Certificado Médico (ENG1)', cert: 'MLC 2006 Reg. 1.2', level: 'critical' },
    { name: 'Advanced Fire Fighting', cert: 'STCW Reg. VI/3', level: 'critical' },
    { name: 'Medical First Aid', cert: 'STCW Reg. VI/4-1', level: 'critical' },
    { name: 'ECDIS Type-Specific Training', cert: 'STCW Reg. II/1', level: 'high' },
    { name: 'Security Awareness', cert: 'STCW Reg. VI/6-1', level: 'high' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'standard' },
  ],
  '2nd-officer': [
    { name: 'Certificado de Competencia — OOW', cert: 'STCW Reg. II/1', level: 'critical' },
    { name: 'Certificado Médico (ENG1)', cert: 'MLC 2006 Reg. 1.2', level: 'critical' },
    { name: 'Advanced Fire Fighting', cert: 'STCW Reg. VI/3', level: 'high' },
    { name: 'Medical First Aid', cert: 'STCW Reg. VI/4-1', level: 'high' },
    { name: 'ECDIS Training', cert: 'STCW Reg. II/1', level: 'high' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'standard' },
  ],
  '3rd-officer': [
    { name: 'Certificado de Competencia — OOW', cert: 'STCW Reg. II/1', level: 'critical' },
    { name: 'Certificado Médico', cert: 'MLC 2006', level: 'critical' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'critical' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
    { name: 'Proficiency in Survival Craft', cert: 'STCW Reg. VI/2', level: 'high' },
  ],
  'chief-engineer': [
    { name: 'Certificado de Competencia — Chief Engineer', cert: 'STCW Reg. III/2', level: 'critical' },
    { name: 'Certificado Médico (ENG1)', cert: 'MLC 2006 Reg. 1.2', level: 'critical' },
    { name: 'Advanced Fire Fighting', cert: 'STCW Reg. VI/3', level: 'critical' },
    { name: 'High Voltage Safety (si aplica)', cert: 'STCW III/2', level: 'high' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'standard' },
  ],
  '2nd-engineer': [
    { name: 'Certificado de Competencia — 2nd Engineer', cert: 'STCW Reg. III/2', level: 'critical' },
    { name: 'Certificado Médico', cert: 'MLC 2006', level: 'critical' },
    { name: 'Advanced Fire Fighting', cert: 'STCW Reg. VI/3', level: 'high' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'standard' },
  ],
  electrician: [
    { name: 'Certificado STCW para Electricista', cert: 'STCW Reg. III/6', level: 'critical' },
    { name: 'Certificado Médico', cert: 'MLC 2006', level: 'critical' },
    { name: 'High Voltage Safety', cert: 'STCW III/6', level: 'high' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'critical' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
  ],
  bosun: [
    { name: 'Certificado de Competencia — Rating', cert: 'STCW Reg. II/5', level: 'critical' },
    { name: 'Certificado Médico', cert: 'MLC 2006', level: 'critical' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'critical' },
    { name: 'Proficiency in Survival Craft', cert: 'STCW Reg. VI/2', level: 'high' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
  ],
  ab: [
    { name: 'Certificado de Able Seaman', cert: 'STCW Reg. II/5', level: 'critical' },
    { name: 'Certificado Médico', cert: 'MLC 2006', level: 'critical' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'critical' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
  ],
  cook: [
    { name: 'Ship Cook Certificate', cert: 'MLC 2006 Reg. 3.2', level: 'critical' },
    { name: 'Certificado Médico', cert: 'MLC 2006', level: 'critical' },
    { name: 'Food Hygiene & Safety Certificate', cert: 'MLC 2006', level: 'high' },
    { name: 'Basic Safety Training (BST)', cert: 'STCW Reg. VI/1', level: 'critical' },
    { name: 'Pasaporte & Libreta de Mar (CDC)', cert: 'IMO / Nacional', level: 'critical' },
  ],
}

const RANK_NOTES: Record<string, string> = {
  master: 'Como Capitán, eres el máximo responsable de la seguridad del buque y tripulación. El MLC 2006 requiere certificado médico válido en todo momento.',
  'chief-officer': 'Como Primer Oficial, el ECDIS actualizado por tipo de equipo es requerido en la mayoría de flotas modernas.',
  '2nd-officer': 'Como Segundo Oficial, el ECDIS y formación en emergencias médicas son prioritarios.',
  '3rd-officer': 'Como Tercer Oficial, tu BST y CoC son esenciales. Muchas navieras también solicitan ECDIS previo al embarque.',
  'chief-engineer': 'Como Jefe de Máquinas, en buques de alta tensión se requieren certificaciones adicionales de seguridad eléctrica.',
  '2nd-engineer': 'Como Segundo Ingeniero, el registro de horas de guardia es crítico bajo MLC 2006.',
  electrician: 'Como Electricista, la habilitación STCW III/6 y la certificación de alta tensión son requeridas en la mayoría de navieras.',
  bosun: 'Como Contramaestre, el Proficiency in Survival Craft (lifeboat coxswain) es altamente valorado.',
  ab: 'Como AB, asegúrate de tener tu libreta de mar actualizada con el historial completo de embarques.',
  cook: 'Como Cocinero, el MLC 2006 exige específicamente el certificado de cocinero de a bordo y la habilitación sanitaria.',
}

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

const BADGE: Record<DocLevel, string> = { critical: 'bg-red-500/15 text-red-400 border border-red-500/25', high: 'bg-amber-500/12 text-amber-400 border border-amber-500/25', standard: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' }
const BADGE_LABEL: Record<DocLevel, string> = { critical: 'CRÍTICO', high: 'IMPORTANTE', standard: 'ESTÁNDAR' }

export default function RegisterModal({ onClose, onSwitchToLogin }: Props) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw1, setShowPw1] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [agentTyping, setAgentTyping] = useState(false)
  const [agentReady, setAgentReady] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, File>>({})

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm_password: '',
    nationality: '', phone: '', date_of_birth: '', role: 'seafarer', rank: '',
  })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const docs: Doc[] = DOCS[form.rank] || []
  const totalDocs = docs.length
  const uploadedCount = Object.keys(uploadedFiles).length
  const criticalTotal = docs.filter((d) => d.level === 'critical').length
  const criticalDone = docs.reduce((acc, d, i) => acc + (d.level === 'critical' && uploadedFiles[i] ? 1 : 0), 0)

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('La contraseña debe tener mínimo 8 caracteres.'); return }
    if (form.password !== form.confirm_password) { setError('Las contraseñas no coinciden.'); return }
    setError(''); setStep(2)
  }

  const handleStep2 = () => {
    if (!form.rank) { setError('Selecciona tu rango para continuar.'); return }
    setError('')
    setStep(3)
    setAgentTyping(true)
    setAgentReady(false)
    setUploadedFiles({})
    setTimeout(() => { setAgentTyping(false); setAgentReady(true) }, 2000)
  }

  const handleFileUpload = (idx: number, files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.includes('pdf')) { setError('Por favor sube solo archivos PDF.'); return }
    setError('')
    setUploadedFiles((prev) => ({ ...prev, [idx]: file }))
  }

  const viewPdf = (file: File) => {
    const url = URL.createObjectURL(file)
    window.open(url, '_blank')
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      await api.post('/auth/register', {
        email: form.email, password: form.password, role: form.role,
        first_name: form.first_name, last_name: form.last_name,
        nationality: form.nationality, phone: form.phone, rank: form.rank,
        date_of_birth: form.date_of_birth || null,
      })
      const { data: tokens } = await api.post('/auth/login', { email: form.email, password: form.password })
      const { data: user } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
      login(user, tokens.access_token, tokens.refresh_token)
      // Init crewing user folder with real UUID and sync rank
      try {
        await fetch(`/crewing-api/users/${user.id}/init`, { method: 'POST' })
        await fetch(`/crewing-api/users/${user.id}/settings/rank`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rank: form.rank }),
        })
      } catch (_) { /* non-critical */ }
      localStorage.setItem('leto-user', JSON.stringify({
        id: user.id, email: user.email, rank: form.rank,
        first_name: form.first_name, last_name: form.last_name,
      }))
      onClose(); navigate('/dashboard')

    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 400 && detail?.includes('already')) setError('Este correo ya está registrado. ¿Quieres iniciar sesión?')
      else if (err.response?.status === 422) setError('Verifica que todos los campos estén correctos.')
      else setError(detail || 'Error al crear la cuenta. Intenta de nuevo.')
    } finally { setLoading(false) }
  }

  const inp = 'w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-ice text-sm outline-none focus:border-cyan transition-colors placeholder:text-ice/25'

  return (
    <div className="w-full max-w-lg bg-[#0d2040] border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 font-grotesk font-bold text-lg">
          <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_8px_#00F0FF]" />Leto
        </div>
        <button onClick={onClose} className="text-ice/30 hover:text-ice transition-colors text-xl leading-none">✕</button>
      </div>

      <div className="p-6">
        {/* Progress bar */}
        <div className="flex gap-2 mb-5">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-cyan' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* ─── STEP 1: Personal info ─── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <h2 className="font-grotesk text-lg font-semibold">Crea tu cuenta</h2>
              <p className="text-ice/40 text-sm mt-0.5">Paso 1 de 3 — Información personal</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Nombre</label>
                <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Juan" required className={inp} /></div>
              <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Apellido</label>
                <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="García" required className={inp} /></div>
            </div>
            <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Correo Electrónico</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.com" required className={inp} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Nacionalidad</label>
                <input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Panameña" className={inp} /></div>
              <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Teléfono</label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+507 6000 0000" className={inp} /></div>
            </div>
            <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Fecha de Nacimiento</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className={`${inp} [color-scheme:dark]`} /></div>
            {(['password', 'confirm_password'] as const).map((field, i) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-ice/60 mb-1.5">{i === 0 ? 'Contraseña' : 'Confirmar Contraseña'}</label>
                <div className="relative">
                  <input type={(i === 0 ? showPw1 : showPw2) ? 'text' : 'password'}
                    value={form[field]} onChange={(e) => set(field, e.target.value)} placeholder="••••••••" required className={`${inp} pr-10`} />
                  <button type="button" onClick={() => i === 0 ? setShowPw1(!showPw1) : setShowPw2(!showPw2)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ice/30 hover:text-cyan transition-colors">
                    {(i === 0 ? showPw1 : showPw2) ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            ))}
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" className="w-full bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all">
              Continuar →
            </button>
            <p className="text-center text-ice/40 text-sm">¿Ya tienes cuenta?{' '}
              <button type="button" onClick={onSwitchToLogin} className="text-cyan hover:underline">Ingresar</button></p>
          </form>
        )}

        {/* ─── STEP 2: Rank selection ─── */}
        {step === 2 && (
          <div>
            <h2 className="font-grotesk text-lg font-semibold mb-1">Tu posición a bordo</h2>
            <p className="text-ice/40 text-sm mb-4">Paso 2 de 3 — Selecciona tu rango principal</p>
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {RANKS.map((r) => (
                <button key={r.id} onClick={() => set('rank', r.id)}
                  className={`text-center p-3 rounded-xl border-2 transition-all ${form.rank === r.id ? 'border-cyan bg-cyan/10' : 'border-white/10 bg-white/[0.03] hover:border-cyan/40'}`}>
                  <div className="text-2xl mb-1">{r.icon}</div>
                  <div className="text-xs font-semibold leading-tight">{r.label}</div>
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setError('') }}
                className="flex-1 border border-white/15 text-ice/60 font-semibold py-2.5 rounded-lg hover:border-white/30 transition-colors">
                ← Volver
              </button>
              <button onClick={handleStep2}
                className="flex-1 bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all">
                Ver mis documentos →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Agent doc upload ─── */}
        {step === 3 && (
          <div>
            <h2 className="font-grotesk text-lg font-semibold mb-1">Tu guía de documentación</h2>
            <p className="text-ice/40 text-sm mb-4">Paso 3 de 3 — El agente Leto analiza tu rango</p>

            {/* Agent header */}
            <div className="flex items-center gap-3 p-3 bg-cyan/[0.06] border border-cyan/15 rounded-xl mb-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan to-steel flex items-center justify-center text-base flex-shrink-0">🤖</div>
              <div>
                <div className="font-semibold text-sm">Agente Leto</div>
                <div className="text-ice/40 text-xs">{agentTyping ? '● Analizando tu perfil...' : '● Análisis completado'}</div>
              </div>
            </div>

            {/* Typing animation */}
            {agentTyping && (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 mb-4 flex gap-1.5 items-center">
                {[0, 200, 400].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-cyan animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}

            {agentReady && (
              <>
                {/* Agent message */}
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-sm leading-relaxed text-ice/80 mb-4">
                  ¡Hola <strong>{form.first_name || 'marino'}</strong>! Analicé tu rango como{' '}
                  <strong className="text-cyan">{RANKS.find((r) => r.id === form.rank)?.label || form.rank}</strong>.<br /><br />
                  Aquí están los documentos requeridos. Súbelos en PDF — se abrirán en una nueva pestaña para que puedas revisarlos.
                  Los marcados <span className="text-red-400 font-semibold">CRÍTICO</span> son obligatorios.
                </div>

                {/* Document upload cards */}
                <div className="flex flex-col gap-2 mb-4">
                  {docs.map((d, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${uploadedFiles[i] ? 'border-cyan/20 bg-cyan/[0.04]' : 'border-white/[0.07] bg-white/[0.03]'}`}>
                      {/* Badge */}
                      <div className="flex-shrink-0 w-16">
                        <span className={`inline-block text-center w-full text-[0.6rem] font-bold tracking-wide rounded px-1 py-0.5 ${BADGE[d.level]}`}>
                          {BADGE_LABEL[d.level]}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold leading-snug">{d.name}</div>
                        <div className="text-[0.65rem] text-ice/40 mt-0.5">{d.cert}</div>
                        {uploadedFiles[i]
                          ? <div className="text-[0.65rem] text-emerald-400 mt-0.5 truncate">✓ {uploadedFiles[i].name}</div>
                          : <div className="text-[0.65rem] text-ice/25 mt-0.5">Sin archivo</div>}
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <label className="cursor-pointer px-2.5 py-1 rounded-md text-[0.7rem] font-semibold border border-cyan/40 text-cyan hover:bg-cyan/10 transition-colors text-center whitespace-nowrap">
                          📎 Cargar
                          <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => handleFileUpload(i, e.target.files)} />
                        </label>
                        {uploadedFiles[i] && (
                          <button onClick={() => viewPdf(uploadedFiles[i])}
                            className="px-2.5 py-1 rounded-md text-[0.7rem] font-semibold bg-cyan/15 text-cyan hover:bg-cyan/25 transition-colors whitespace-nowrap">
                            👁 Ver PDF
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress counter */}
                <div className="flex items-center justify-between text-xs text-ice/40 mb-4">
                  <span>{uploadedCount}/{totalDocs} documentos subidos</span>
                  <span>{criticalDone}/{criticalTotal} críticos completados</span>
                </div>

                {/* Note */}
                {RANK_NOTES[form.rank] && (
                  <div className="text-xs text-ice/40 bg-cyan/[0.04] border border-cyan/10 rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
                    📌 {RANK_NOTES[form.rank]}
                  </div>
                )}

                {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={() => { setStep(2); setAgentReady(false); setError('') }}
                    className="flex-1 border border-white/15 text-ice/60 font-semibold py-2.5 rounded-lg hover:border-white/30 transition-colors">
                    ← Volver
                  </button>
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex-1 bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50">
                    {loading ? 'Creando cuenta...' : 'Activar mi perfil →'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
