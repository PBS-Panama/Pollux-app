/**
 * RegisterModal.tsx — Dual Registration Flow (Tripulante + Empresa)
 *
 * TRIPULANTE FLOW (4 steps):
 *   Step 1: Personal info + email/password + role toggle
 *   Step 2: Rank selection (10 maritime ranks)
 *   Step 3: Agent Leto document guide
 *   Step 4: (submit happens in step 3)
 *
 * EMPRESA FLOW (4 steps):
 *   Step 1: Company info + email/password + role toggle
 *   Step 2: Representatives (legal + HR)
 *   Step 3: Fleet (dynamic vessel cards, skippable)
 *   Step 4: Summary + confirm
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

// Custom dark dropdown to replace native <select> (Chromium renders native popups in white)
function DarkSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  const selected = options.find((o) => o.value === value)
  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-cyan transition-colors text-left flex items-center justify-between"
        style={{ color: selected ? '#F5F7FA' : 'rgba(245,247,250,0.25)' }}>
        <span>{selected ? selected.label : placeholder}</span>
        <span className="text-ice/30 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0d1f3c] border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto"
          style={{ animation: 'fadeIn 0.1s ease-out' }}>
          {options.map((o) => (
            <button key={o.value} type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`block w-full text-left px-3.5 py-2 text-sm transition-colors ${value === o.value ? 'bg-cyan/15 text-cyan' : 'text-ice/80 hover:bg-white/[0.06]'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props { onClose: () => void; onSwitchToLogin: () => void }

// ── Seafarer document requirements (unchanged) ──
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
  master: 'Como Capitán, eres el máximo responsable de la seguridad del buque y tripulación.',
  'chief-officer': 'Como Primer Oficial, el ECDIS actualizado por tipo de equipo es requerido en la mayoría de flotas modernas.',
  '2nd-officer': 'Como Segundo Oficial, el ECDIS y formación en emergencias médicas son prioritarios.',
  '3rd-officer': 'Como Tercer Oficial, tu BST y CoC son esenciales.',
  'chief-engineer': 'Como Jefe de Máquinas, en buques de alta tensión se requieren certificaciones adicionales.',
  '2nd-engineer': 'Como Segundo Ingeniero, el registro de horas de guardia es crítico bajo MLC 2006.',
  electrician: 'Como Electricista, la habilitación STCW III/6 y la certificación de alta tensión son requeridas.',
  bosun: 'Como Contramaestre, el Proficiency in Survival Craft es altamente valorado.',
  ab: 'Como AB, asegúrate de tener tu libreta de mar actualizada con el historial completo.',
  cook: 'Como Cocinero, el MLC 2006 exige el certificado de cocinero de a bordo.',
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

const VESSEL_TYPES = [
  'Oil Tanker', 'Chemical Tanker', 'LNG Carrier', 'LPG Carrier',
  'Container Ship', 'Bulk Carrier', 'General Cargo',
  'PSV (Platform Supply Vessel)', 'AHTS (Anchor Handling)',
  'Tug', 'Barge', 'FPSO', 'Offshore Drill Ship',
  'Ro-Ro', 'Car Carrier', 'Cruise Ship', 'Ferry',
  'Cable Layer', 'Dredger', 'Icebreaker',
]

const FLAG_STATES = [
  'Panama', 'Liberia', 'Marshall Islands', 'Hong Kong', 'Singapore',
  'Bahamas', 'Malta', 'Cyprus', 'Bermuda', 'Antigua and Barbuda',
  'Norway (NIS)', 'Denmark (DIS)', 'United Kingdom', 'Greece',
  'Japan', 'South Korea', 'China', 'United States',
]

const SECTORS = ['Shipping', 'Offshore', 'Fishing', 'Cruise', 'Port Services', 'Other']
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '200+']

const BADGE: Record<DocLevel, string> = { critical: 'bg-red-500/15 text-red-400 border border-red-500/25', high: 'bg-amber-500/12 text-amber-400 border border-amber-500/25', standard: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' }
const BADGE_LABEL: Record<DocLevel, string> = { critical: 'CRÍTICO', high: 'IMPORTANTE', standard: 'ESTÁNDAR' }

interface VesselForm { name: string; imo_number: string; vessel_type: string; flag_state: string; gross_tonnage: string }
const emptyVessel = (): VesselForm => ({ name: '', imo_number: '', vessel_type: '', flag_state: '', gross_tonnage: '' })

export default function RegisterModal({ onClose, onSwitchToLogin }: Props) {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw1, setShowPw1] = useState(false)
  const [showPw2, setShowPw2] = useState(false)

  // Seafarer-specific state
  const [agentTyping, setAgentTyping] = useState(false)
  const [agentReady, setAgentReady] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, File>>({})

  // Company-specific state
  const [vessels, setVessels] = useState<VesselForm[]>([emptyVessel()])
  const [hrSameAsLegal, setHrSameAsLegal] = useState(false)
  const [legalUseAccountEmail, setLegalUseAccountEmail] = useState(true)

  const [form, setForm] = useState({
    // Shared
    email: '', password: '', confirm_password: '', role: 'seafarer' as 'seafarer' | 'company',
    // Seafarer
    first_name: '', last_name: '', nationality: '', phone: '', date_of_birth: '', rank: '',
    // Company
    company_name: '', ruc: '', country: '', city: '', address: '', website: '', sector: '', company_size: '',
    legal_rep_name: '', legal_rep_phone: '', legal_rep_email: '',
    hr_rep_name: '', hr_rep_phone: '', hr_rep_email: '',
  })
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const isCompany = form.role === 'company'
  const totalSteps = isCompany ? 4 : 3

  // Seafarer doc helpers
  const docs: Doc[] = DOCS[form.rank] || []
  const totalDocs = docs.length
  const uploadedCount = Object.keys(uploadedFiles).length
  const criticalTotal = docs.filter((d) => d.level === 'critical').length
  const criticalDone = docs.reduce((acc, d, i) => acc + (d.level === 'critical' && uploadedFiles[i] ? 1 : 0), 0)

  // ── Step handlers ─────────────────────────────────────────────
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('La contraseña debe tener mínimo 8 caracteres.'); return }
    if (form.password !== form.confirm_password) { setError('Las contraseñas no coinciden.'); return }
    if (isCompany && !form.company_name.trim()) { setError('El nombre de la empresa es requerido.'); return }
    setError(''); setStep(2)
  }

  // Seafarer step 2 → 3
  const handleSeafarerStep2 = () => {
    if (!form.rank) { setError('Selecciona tu rango para continuar.'); return }
    setError(''); setStep(3)
    setAgentTyping(true); setAgentReady(false); setUploadedFiles({})
    setTimeout(() => { setAgentTyping(false); setAgentReady(true) }, 2000)
  }

  // Company step 2 → 3
  const handleCompanyStep2 = () => {
    if (!form.legal_rep_name.trim()) { setError('El nombre del representante legal es requerido.'); return }
    setError(''); setStep(3)
  }

  // Company step 3 → 4
  const handleCompanyStep3 = () => { setError(''); setStep(4) }

  // Vessel management
  const addVessel = () => setVessels((v) => [...v, emptyVessel()])
  const removeVessel = (i: number) => setVessels((v) => v.filter((_, idx) => idx !== i))
  const updateVessel = (i: number, k: keyof VesselForm, val: string) => {
    setVessels((v) => v.map((vessel, idx) => idx === i ? { ...vessel, [k]: val } : vessel))
  }

  // File upload (seafarer)
  const handleFileUpload = (idx: number, files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.includes('pdf')) { setError('Por favor sube solo archivos PDF.'); return }
    setError(''); setUploadedFiles((prev) => ({ ...prev, [idx]: file }))
  }
  const viewPdf = (file: File) => { window.open(URL.createObjectURL(file), '_blank') }

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const payload: any = { email: form.email, password: form.password, role: form.role }

      if (isCompany) {
        payload.company_name = form.company_name
        payload.ruc = form.ruc || null
        payload.country = form.country || null
        payload.city = form.city || null
        payload.address = form.address || null
        payload.website = form.website || null
        payload.sector = form.sector || null
        payload.company_size = form.company_size || null
        payload.legal_rep_name = form.legal_rep_name || null
        payload.legal_rep_phone = form.legal_rep_phone || null
        payload.legal_rep_email = legalUseAccountEmail ? form.email : (form.legal_rep_email || null)
        payload.hr_rep_name = hrSameAsLegal ? form.legal_rep_name : (form.hr_rep_name || null)
        payload.hr_rep_phone = hrSameAsLegal ? form.legal_rep_phone : (form.hr_rep_phone || null)
        payload.hr_rep_email = hrSameAsLegal ? form.legal_rep_email : (form.hr_rep_email || null)
        // Vessels (filter out empty ones)
        const validVessels = vessels.filter((v) => v.name.trim())
        if (validVessels.length > 0) {
          payload.vessels = validVessels.map((v) => ({
            name: v.name,
            imo_number: v.imo_number || null,
            vessel_type: v.vessel_type || null,
            flag_state: v.flag_state || null,
            gross_tonnage: v.gross_tonnage ? parseInt(v.gross_tonnage) : null,
          }))
        }
      } else {
        payload.first_name = form.first_name
        payload.last_name = form.last_name
        payload.nationality = form.nationality
        payload.phone = form.phone
        payload.rank = form.rank
        payload.date_of_birth = form.date_of_birth || null
      }

      await api.post('/auth/register', payload)
      const { data: tokens } = await api.post('/auth/login', { email: form.email, password: form.password })
      const { data: user } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
      loginStore(user, tokens.access_token, tokens.refresh_token)

      if (!isCompany) {
        // Init crewing user folder for seafarer
        try {
          await fetch(`/crewing-api/users/${user.id}/init`, { method: 'POST' })
          await fetch(`/crewing-api/users/${user.id}/settings`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rank: form.rank }),
          })
        } catch (_) { /* non-critical */ }
      }

      localStorage.setItem('leto-user', JSON.stringify({
        id: user.id, email: user.email, role: user.role,
        rank: user.rank ?? form.rank ?? null,
        first_name: user.first_name ?? form.first_name ?? null,
        last_name: user.last_name ?? form.last_name ?? null,
        date_of_birth: user.date_of_birth ?? form.date_of_birth ?? null,
        company_id: user.company_id ?? null,
        company_name: isCompany ? form.company_name : null,
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
  const sel = `${inp} cursor-pointer [color-scheme:dark]`

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
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-cyan' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 1: Personal/Company info + credentials               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <h2 className="font-grotesk text-lg font-semibold">Crea tu cuenta</h2>
              <p className="text-ice/40 text-sm mt-0.5">Paso 1 de {totalSteps} — {isCompany ? 'Información de empresa' : 'Información personal'}</p>
            </div>

            {/* Role toggle */}
            <div className="flex gap-1.5 p-1 bg-white/[0.04] rounded-lg">
              {(['seafarer', 'company'] as const).map((r) => (
                <button key={r} type="button" onClick={() => { set('role', r); setStep(1); setError('') }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${form.role === r ? 'bg-cyan text-navy' : 'text-ice/50 hover:text-ice'}`}>
                  {r === 'seafarer' ? '⚓ Tripulante' : '🏢 Empresa'}
                </button>
              ))}
            </div>

            {isCompany ? (
              <>
                {/* Company fields */}
                <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Nombre de la Empresa *</label>
                  <input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="Pacific Shipping Co." required className={inp} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">RUC / Tax ID</label>
                    <input value={form.ruc} onChange={(e) => set('ruc', e.target.value)} placeholder="155-0123-456789" className={inp} /></div>
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Sector</label>
                    <DarkSelect value={form.sector} onChange={(v) => set('sector', v)} placeholder="Seleccionar..."
                      options={SECTORS.map((s) => ({ value: s, label: s }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">País</label>
                    <input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Panamá" className={inp} /></div>
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Ciudad</label>
                    <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Ciudad de Panamá" className={inp} /></div>
                </div>
                <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Dirección</label>
                  <input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Av. Balboa, Torre XYZ, Piso 12" className={inp} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Sitio Web</label>
                    <input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="www.empresa.com" className={inp} /></div>
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Tamaño</label>
                    <DarkSelect value={form.company_size} onChange={(v) => set('company_size', v)} placeholder="Seleccionar..."
                      options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} empleados` }))} /></div>
                </div>
              </>
            ) : (
              <>
                {/* Seafarer fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Nombre</label>
                    <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Juan" required className={inp} /></div>
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Apellido</label>
                    <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="García" required className={inp} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Nacionalidad</label>
                    <input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Panameña" className={inp} /></div>
                  <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Teléfono</label>
                    <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+507 6000 0000" className={inp} /></div>
                </div>
                <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Fecha de Nacimiento</label>
                  <input type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className={`${inp} [color-scheme:dark]`} /></div>
              </>
            )}

            {/* Shared: email + password */}
            <div><label className="block text-xs font-semibold text-ice/60 mb-1.5">Correo Electrónico *</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.com" required className={inp} /></div>
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

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 2: Rank (seafarer) or Representatives (company)      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 2 && !isCompany && (
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
                className="flex-1 border border-white/15 text-ice/60 font-semibold py-2.5 rounded-lg hover:border-white/30 transition-colors">← Volver</button>
              <button onClick={handleSeafarerStep2}
                className="flex-1 bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all">Ver mis documentos →</button>
            </div>
          </div>
        )}

        {step === 2 && isCompany && (
          <div className="space-y-4">
            <div>
              <h2 className="font-grotesk text-lg font-semibold">Contactos clave</h2>
              <p className="text-ice/40 text-sm mt-0.5">Paso 2 de 4 — Representantes de la empresa</p>
            </div>

            {/* Legal representative */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-cyan uppercase tracking-wide">Representante Legal *</div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ice/40">
                  <input type="checkbox" checked={legalUseAccountEmail}
                    onChange={(e) => { setLegalUseAccountEmail(e.target.checked); if (e.target.checked) set('legal_rep_email', '') }}
                    className="accent-cyan" />
                  Usar correo de la cuenta
                </label>
              </div>
              <div className="space-y-3">
                <div><input value={form.legal_rep_name} onChange={(e) => set('legal_rep_name', e.target.value)} placeholder="Nombre completo" className={inp} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.legal_rep_phone} onChange={(e) => set('legal_rep_phone', e.target.value)} placeholder="Teléfono" className={inp} />
                  {legalUseAccountEmail
                    ? <div className={`${inp} opacity-60`}>{form.email || 'Correo de la cuenta'}</div>
                    : <input value={form.legal_rep_email} onChange={(e) => set('legal_rep_email', e.target.value)} placeholder="Correo electrónico" className={inp} />
                  }
                </div>
              </div>
            </div>

            {/* HR representative */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-cyan uppercase tracking-wide">Representante de RRHH</div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-ice/40">
                  <input type="checkbox" checked={hrSameAsLegal} onChange={(e) => setHrSameAsLegal(e.target.checked)}
                    className="accent-cyan" />
                  Mismo que legal
                </label>
              </div>
              {!hrSameAsLegal && (
                <div className="space-y-3">
                  <div><input value={form.hr_rep_name} onChange={(e) => set('hr_rep_name', e.target.value)} placeholder="Nombre completo" className={inp} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.hr_rep_phone} onChange={(e) => set('hr_rep_phone', e.target.value)} placeholder="Teléfono" className={inp} />
                    <input value={form.hr_rep_email} onChange={(e) => set('hr_rep_email', e.target.value)} placeholder="Correo electrónico" className={inp} />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setError('') }}
                className="flex-1 border border-white/15 text-ice/60 font-semibold py-2.5 rounded-lg hover:border-white/30 transition-colors">← Volver</button>
              <button onClick={handleCompanyStep2}
                className="flex-1 bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all">Continuar →</button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 3: Agent docs (seafarer) or Fleet (company)          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 3 && !isCompany && (
          <div>
            <h2 className="font-grotesk text-lg font-semibold mb-1">Tu guía de documentación</h2>
            <p className="text-ice/40 text-sm mb-4">Paso 3 de 3 — El agente Leto analiza tu rango</p>

            <div className="flex items-center gap-3 p-3 bg-cyan/[0.06] border border-cyan/15 rounded-xl mb-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan to-steel flex items-center justify-center text-base flex-shrink-0">🤖</div>
              <div>
                <div className="font-semibold text-sm">Agente Leto</div>
                <div className="text-ice/40 text-xs">{agentTyping ? '● Analizando tu perfil...' : '● Análisis completado'}</div>
              </div>
            </div>

            {agentTyping && (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 mb-4 flex gap-1.5 items-center">
                {[0, 200, 400].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-cyan animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}

            {agentReady && (
              <>
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-sm leading-relaxed text-ice/80 mb-4">
                  ¡Hola <strong>{form.first_name || 'tripulante'}</strong>! Analicé tu rango como{' '}
                  <strong className="text-cyan">{RANKS.find((r) => r.id === form.rank)?.label || form.rank}</strong>.<br /><br />
                  Aquí están los documentos requeridos. Los marcados <span className="text-red-400 font-semibold">CRÍTICO</span> son obligatorios.
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {docs.map((d, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${uploadedFiles[i] ? 'border-cyan/20 bg-cyan/[0.04]' : 'border-white/[0.07] bg-white/[0.03]'}`}>
                      <div className="flex-shrink-0 w-16">
                        <span className={`inline-block text-center w-full text-[0.6rem] font-bold tracking-wide rounded px-1 py-0.5 ${BADGE[d.level]}`}>{BADGE_LABEL[d.level]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold leading-snug">{d.name}</div>
                        <div className="text-[0.65rem] text-ice/40 mt-0.5">{d.cert}</div>
                        {uploadedFiles[i]
                          ? <div className="text-[0.65rem] text-emerald-400 mt-0.5 truncate">✓ {uploadedFiles[i].name}</div>
                          : <div className="text-[0.65rem] text-ice/25 mt-0.5">Sin archivo</div>}
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <label className="cursor-pointer px-2.5 py-1 rounded-md text-[0.7rem] font-semibold border border-cyan/40 text-cyan hover:bg-cyan/10 transition-colors text-center whitespace-nowrap">
                          📎 Cargar<input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => handleFileUpload(i, e.target.files)} />
                        </label>
                        {uploadedFiles[i] && (
                          <button onClick={() => viewPdf(uploadedFiles[i])}
                            className="px-2.5 py-1 rounded-md text-[0.7rem] font-semibold bg-cyan/15 text-cyan hover:bg-cyan/25 transition-colors whitespace-nowrap">👁 Ver PDF</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-ice/40 mb-4">
                  <span>{uploadedCount}/{totalDocs} documentos subidos</span>
                  <span>{criticalDone}/{criticalTotal} críticos completados</span>
                </div>

                {RANK_NOTES[form.rank] && (
                  <div className="text-xs text-ice/40 bg-cyan/[0.04] border border-cyan/10 rounded-xl px-3 py-2.5 mb-4 leading-relaxed">
                    📌 {RANK_NOTES[form.rank]}
                  </div>
                )}

                {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setStep(2); setAgentReady(false); setError('') }}
                    className="flex-1 border border-white/15 text-ice/60 font-semibold py-2.5 rounded-lg hover:border-white/30 transition-colors">← Volver</button>
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex-1 bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50">
                    {loading ? 'Creando cuenta...' : 'Activar mi perfil →'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && isCompany && (
          <div className="space-y-4">
            <div>
              <h2 className="font-grotesk text-lg font-semibold">Su flota</h2>
              <p className="text-ice/40 text-sm mt-0.5">Paso 3 de 4 — Registre sus embarcaciones (opcional)</p>
            </div>

            {vessels.map((v, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-cyan uppercase tracking-wide">Embarcación {i + 1}</div>
                  {vessels.length > 1 && (
                    <button onClick={() => removeVessel(i)} className="text-ice/30 hover:text-red-400 text-sm transition-colors">🗑</button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><input value={v.name} onChange={(e) => updateVessel(i, 'name', e.target.value)} placeholder="Nombre del buque" className={inp} /></div>
                    <div><input value={v.imo_number} onChange={(e) => updateVessel(i, 'imo_number', e.target.value)} placeholder="Número IMO" className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DarkSelect value={v.vessel_type} onChange={(val) => updateVessel(i, 'vessel_type', val)} placeholder="Tipo de embarcación..."
                      options={VESSEL_TYPES.map((t) => ({ value: t, label: t }))} />
                    <DarkSelect value={v.flag_state} onChange={(val) => updateVessel(i, 'flag_state', val)} placeholder="Estado de bandera..."
                      options={FLAG_STATES.map((f) => ({ value: f, label: f }))} />
                  </div>
                  <div><input value={v.gross_tonnage} onChange={(e) => updateVessel(i, 'gross_tonnage', e.target.value.replace(/\D/g, ''))}
                    placeholder="Tonelaje bruto (GT)" className={inp} /></div>
                </div>
              </div>
            ))}

            <button onClick={addVessel}
              className="w-full border border-dashed border-white/15 text-ice/40 py-2.5 rounded-lg hover:border-cyan/30 hover:text-cyan transition-colors text-sm">
              + Agregar otra embarcación
            </button>

            <div className="text-xs text-ice/40 text-center">
              {vessels.filter((v) => v.name.trim()).length} embarcación(es) registrada(s)
            </div>

            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setStep(2); setError('') }}
                className="flex-1 border border-white/15 text-ice/60 font-semibold py-2.5 rounded-lg hover:border-white/30 transition-colors">← Volver</button>
              <button onClick={handleCompanyStep3}
                className="flex-1 bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all">
                {vessels.some((v) => v.name.trim()) ? 'Continuar →' : 'Completar después →'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STEP 4: Summary + confirm (company only)                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {step === 4 && isCompany && (
          <div className="space-y-4">
            <div>
              <h2 className="font-grotesk text-lg font-semibold">Resumen de cuenta</h2>
              <p className="text-ice/40 text-sm mt-0.5">Paso 4 de 4 — Verifique los datos antes de activar</p>
            </div>

            {/* Company summary */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-cyan uppercase tracking-wide">Empresa</div>
                <button onClick={() => setStep(1)} className="text-xs text-cyan hover:underline">Editar</button>
              </div>
              <div className="text-sm font-semibold">{form.company_name}</div>
              {form.ruc && <div className="text-xs text-ice/40">RUC: {form.ruc}</div>}
              {form.sector && <div className="text-xs text-ice/40">{form.sector}{form.company_size ? ` · ${form.company_size} empleados` : ''}</div>}
              {(form.country || form.city) && <div className="text-xs text-ice/40">{[form.city, form.country].filter(Boolean).join(', ')}</div>}
            </div>

            {/* Representatives summary */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-cyan uppercase tracking-wide">Representantes</div>
                <button onClick={() => setStep(2)} className="text-xs text-cyan hover:underline">Editar</button>
              </div>
              <div className="text-sm"><span className="text-ice/40">Legal:</span> {form.legal_rep_name || '—'}</div>
              <div className="text-sm"><span className="text-ice/40">RRHH:</span> {hrSameAsLegal ? 'Mismo que legal' : (form.hr_rep_name || 'No asignado')}</div>
            </div>

            {/* Fleet summary */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-cyan uppercase tracking-wide">Flota</div>
                <button onClick={() => setStep(3)} className="text-xs text-cyan hover:underline">Editar</button>
              </div>
              {vessels.filter((v) => v.name.trim()).length === 0 ? (
                <div className="text-xs text-ice/40">Sin embarcaciones registradas — puede agregar después</div>
              ) : (
                <div className="space-y-1">
                  {vessels.filter((v) => v.name.trim()).map((v, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-semibold">{v.name}</span>
                      {v.vessel_type && <span className="text-ice/40"> · {v.vessel_type}</span>}
                      {v.imo_number && <span className="text-ice/40"> · IMO {v.imo_number}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-xs font-semibold text-cyan uppercase tracking-wide mb-2">Cuenta</div>
              <div className="text-sm">{form.email}</div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setStep(3); setError('') }}
                className="flex-1 border border-white/15 text-ice/60 font-semibold py-2.5 rounded-lg hover:border-white/30 transition-colors">← Volver</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-cyan text-navy font-semibold py-2.5 rounded-lg hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50">
                {loading ? 'Creando cuenta...' : 'Activar cuenta →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
