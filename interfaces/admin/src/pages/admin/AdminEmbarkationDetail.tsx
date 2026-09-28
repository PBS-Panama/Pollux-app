/**
 * AdminEmbarkationDetail.tsx — E-2 (Handover.md nota 63/68/70): the actual
 * verification pipeline (declared vs verified fields, dropzone + contact
 * log, conclude/revert/reopen, remarks). Endpoints from
 * backend/app/routers/embarkations.py — see that file's docstrings for the
 * two gaps this page needed and closed there (seafarer identity on the
 * read endpoints, and the /reopen + attachment-read routes that existed in
 * the service/storage layer but had no route).
 *
 * The dropzone posts multipart directly to
 * POST /admin/embarkations/{id}/contact-attempts — never to the
 * ocr_references disk pattern (§3 of the spec bans that explicitly).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/api'

interface ContactAttempt {
  id: string; attempt_no: number; contacted_at: string | null
  channel: string; phone_number_called: string | null
  respondent_name: string | null; respondent_position: string | null
  email_contacted: string | null; attachment_ref: string | null
  comments: string | null; actor_user_id: string
}

interface Event {
  from_status: string; to_status: string; reason: string | null
  actor_user_id: string; created_at: string | null
}

interface Remark {
  id: string; subject_type: string; subject_id: string
  field: string; finding: string; created_by: string; created_at: string | null
  appeal_text: string | null; appealed_at: string | null
  resolution: string | null; resolved_by: string | null; resolved_at: string | null
}

interface Embarkation {
  id: string; seafarer_id: string
  seafarer_email: string | null; seafarer_first_name: string | null; seafarer_last_name: string | null
  declared_vessel_name: string; declared_vessel_imo: string | null
  declared_company_name: string; declared_rank: string
  declared_date_from: string | null; declared_date_to: string | null
  verified_vessel_name: string | null; verified_vessel_imo: string | null
  verified_company_name: string | null; verified_rank: string | null
  verified_date_from: string | null; verified_date_to: string | null
  verification_status: string; status_reason: string | null; has_correction: boolean
  verification_opened_at: string | null; verification_deadline_at: string | null
  verification_attempts: number
  verified_by: string | null; verified_at: string | null
  reverted_by: string | null; reverted_at: string | null
  contact_consent: boolean; contact_consent_at: string | null
  created_at: string | null
  contact_log: ContactAttempt[]
  events: Event[]
  remarks: Remark[]
}

const STATUS_LABEL: Record<string, string> = {
  declarado: 'Declarado', en_verificacion: 'En verificación', verificado: 'Verificado',
  no_verificable: 'No verificable', observado: 'Observado',
}
const STATUS_STYLE: Record<string, string> = {
  declarado: 'text-white/40 bg-white/[0.05] border-white/10',
  en_verificacion: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  verificado: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  no_verificable: 'text-red-400 bg-red-400/10 border-red-400/25',
  observado: 'text-violet-400 bg-violet-400/10 border-violet-400/25',
}
const FIELD_LABELS: Record<string, string> = {
  vessel_name: 'Buque', vessel_imo: 'IMO', company_name: 'Naviera',
  rank: 'Rango', date_from: 'Desde', date_to: 'Hasta',
}
const FIELDS = ['vessel_name', 'vessel_imo', 'company_name', 'rank', 'date_from', 'date_to'] as const

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest text-white/25 uppercase mb-0.5">{label}</p>
      <p className="text-sm text-white/75">{value || '—'}</p>
    </div>
  )
}

function fmt(iso: string | null) { return iso ? new Date(iso).toLocaleString() : '—' }

export default function AdminEmbarkationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [e, setE] = useState<Embarkation | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/admin/embarkations/${id}`)
      .then(r => setE(r.data))
      .catch(() => setE(null))
      .finally(() => setLoading(false))
  }, [id])
  useEffect(() => { load() }, [load])

  // ── Contact-attempt form ────────────────────────────────────────────
  const [channel, setChannel] = useState<'telefono' | 'email'>('telefono')
  const [contactedAt, setContactedAt] = useState('')
  const [phone, setPhone] = useState('')
  const [respName, setRespName] = useState('')
  const [respPos, setRespPos] = useState('')
  const [emailContacted, setEmailContacted] = useState('')
  const [comments, setComments] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetAttemptForm = () => {
    setContactedAt(''); setPhone(''); setRespName(''); setRespPos('')
    setEmailContacted(''); setComments(''); setFile(null)
  }

  const submitAttempt = async () => {
    if (!id) return
    setBusy(true); setError(null)
    try {
      const form = new FormData()
      form.append('channel', channel)
      if (contactedAt) form.append('contacted_at', new Date(contactedAt).toISOString())
      if (phone) form.append('phone_number_called', phone)
      if (respName) form.append('respondent_name', respName)
      if (respPos) form.append('respondent_position', respPos)
      if (emailContacted) form.append('email_contacted', emailContacted)
      if (comments) form.append('comments', comments)
      if (file) form.append('attachment', file)
      await api.post(`/admin/embarkations/${id}/contact-attempts`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      resetAttemptForm()
      load()
      showToast('Intento registrado ✓')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo registrar el intento')
    } finally {
      setBusy(false)
    }
  }

  // ── State-change actions ────────────────────────────────────────────
  const openVerification = async () => {
    if (!id) return
    setBusy(true); setError(null)
    try {
      await api.post(`/admin/embarkations/${id}/open-verification`, {})
      load()
      showToast('Verificación abierta ✓')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo abrir la verificación')
    } finally { setBusy(false) }
  }

  const reopen = async () => {
    if (!id) return
    setBusy(true); setError(null)
    try {
      await api.post(`/admin/embarkations/${id}/reopen`, {})
      load()
      showToast('Reabierto ✓')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo reabrir')
    } finally { setBusy(false) }
  }

  const [concludeMode, setConcludeMode] = useState<null | 'verificado' | 'no_verificable' | 'observado'>(null)
  const [verifiedFields, setVerifiedFields] = useState<Record<string, string>>({})
  const [noVerifReason, setNoVerifReason] = useState('')
  const [observField, setObservField] = useState('vessel_name')
  const [observFinding, setObservFinding] = useState('')

  const openConcludeMode = (mode: 'verificado' | 'no_verificable' | 'observado') => {
    setConcludeMode(mode)
    if (mode === 'verificado' && e) {
      setVerifiedFields({
        vessel_name: e.declared_vessel_name || '', vessel_imo: e.declared_vessel_imo || '',
        company_name: e.declared_company_name || '', rank: e.declared_rank || '',
        date_from: e.declared_date_from || '', date_to: e.declared_date_to || '',
      })
    }
  }

  const submitConclude = async () => {
    if (!id || !concludeMode) return
    setBusy(true); setError(null)
    try {
      const payload: any = { outcome: concludeMode }
      if (concludeMode === 'verificado') payload.verified_fields = verifiedFields
      if (concludeMode === 'no_verificable') payload.reason = noVerifReason
      if (concludeMode === 'observado') { payload.field = observField; payload.finding = observFinding }
      await api.post(`/admin/embarkations/${id}/conclude`, payload)
      setConcludeMode(null); setNoVerifReason(''); setObservFinding('')
      load()
      showToast('Concluido ✓')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo concluir')
    } finally { setBusy(false) }
  }

  const [revertOpen, setRevertOpen] = useState(false)
  const [revertCause, setRevertCause] = useState<'no_verificable' | 'observado'>('no_verificable')
  const [revertReason, setRevertReason] = useState('')
  const [revertField, setRevertField] = useState('vessel_name')
  const [revertFinding, setRevertFinding] = useState('')

  const submitRevert = async () => {
    if (!id) return
    setBusy(true); setError(null)
    try {
      const payload: any = { cause: revertCause, reason: revertReason }
      if (revertCause === 'observado') { payload.field = revertField; payload.finding = revertFinding }
      await api.post(`/admin/embarkations/${id}/revert`, payload)
      setRevertOpen(false); setRevertReason(''); setRevertFinding('')
      load()
      showToast('Revertido ✓')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo revertir')
    } finally { setBusy(false) }
  }

  const resolveRemark = async (remarkId: string, resolution: 'subsanado' | 'sostenido') => {
    setBusy(true); setError(null)
    try {
      await api.patch(`/admin/embarkation-remarks/${remarkId}/resolve`, { resolution })
      load()
      showToast('Remarca resuelta ✓')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo resolver')
    } finally { setBusy(false) }
  }

  const markFirm = async (remarkId: string) => {
    setBusy(true); setError(null)
    try {
      await api.post(`/admin/embarkation-remarks/${remarkId}/mark-firm`, {})
      load()
      showToast('Marcada firme ✓')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo marcar firme')
    } finally { setBusy(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-white/30">Cargando…</div>
  if (!e) return <div className="flex items-center justify-center h-64 text-white/30">No encontrado</div>

  const seafarerName = (e.seafarer_first_name || e.seafarer_last_name)
    ? `${e.seafarer_first_name ?? ''} ${e.seafarer_last_name ?? ''}`.trim()
    : (e.seafarer_email ?? e.seafarer_id)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/admin/embarkations')}
        className="text-xs text-white/35 hover:text-white/70 mb-5 flex items-center gap-1.5 transition-colors">
        ← Volver a Embarques
      </button>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 text-xs font-semibold rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-5 mb-6 p-5 bg-white/[0.03] border border-white/[0.07] rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center text-lg font-bold text-cyan-400 flex-shrink-0">
            {seafarerName[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{seafarerName}</h2>
            {e.seafarer_email && <p className="text-xs text-white/35">{e.seafarer_email}</p>}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${STATUS_STYLE[e.verification_status]}`}>
            {STATUS_LABEL[e.verification_status] ?? e.verification_status}
          </span>
          {e.status_reason && <p className="text-[11px] text-white/40 mt-1.5 max-w-xs">{e.status_reason}</p>}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-400/10 border border-red-400/25 text-red-300 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Declared vs Verified */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-3">Declarado por el marino</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buque" value={e.declared_vessel_name} />
            <Field label="IMO" value={e.declared_vessel_imo} />
            <Field label="Naviera" value={e.declared_company_name} />
            <Field label="Rango" value={e.declared_rank} />
            <Field label="Desde" value={e.declared_date_from} />
            <Field label="Hasta" value={e.declared_date_to} />
          </div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-cyan-400/15 rounded-xl">
          <p className="text-[10px] text-cyan-400/60 uppercase tracking-wider font-bold mb-3">
            Verificado {e.has_correction && <span className="text-amber-400/70">· con corrección</span>}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buque" value={e.verified_vessel_name} />
            <Field label="IMO" value={e.verified_vessel_imo} />
            <Field label="Naviera" value={e.verified_company_name} />
            <Field label="Rango" value={e.verified_rank} />
            <Field label="Desde" value={e.verified_date_from} />
            <Field label="Hasta" value={e.verified_date_to} />
          </div>
        </div>
      </div>

      {/* Consent + attempts summary */}
      <div className="flex gap-6 mb-6 px-1 text-xs text-white/40">
        <span>Consentimiento de contacto: <b className="text-white/70">{e.contact_consent ? 'Sí' : 'No'}</b></span>
        <span>Intentos: <b className="text-white/70">{e.verification_attempts}/10</b></span>
        {e.verification_deadline_at && <span>Plazo: <b className="text-white/70">{fmt(e.verification_deadline_at)}</b></span>}
      </div>

      {/* ── Actions by status ─────────────────────────────────────────── */}
      {e.verification_status === 'declarado' && (
        <div className="mb-6">
          <button onClick={openVerification} disabled={busy}
            className="px-4 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/30 text-cyan-300 text-xs font-bold rounded-lg disabled:opacity-40 transition-colors">
            Abrir verificación
          </button>
        </div>
      )}

      {e.verification_status === 'no_verificable' && (
        <div className="mb-6">
          <button onClick={reopen} disabled={busy}
            className="px-4 py-2 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/25 text-amber-300 text-xs font-bold rounded-lg disabled:opacity-40 transition-colors">
            Reabrir verificación
          </button>
        </div>
      )}

      {e.verification_status === 'verificado' && (
        <div className="mb-6">
          {!revertOpen ? (
            <button onClick={() => setRevertOpen(true)}
              className="px-4 py-2 bg-red-400/10 hover:bg-red-400/20 border border-red-400/25 text-red-300 text-xs font-bold rounded-lg transition-colors">
              Revertir verificación
            </button>
          ) : (
            <div className="p-4 bg-white/[0.03] border border-red-400/20 rounded-xl space-y-3 max-w-lg">
              <p className="text-xs font-bold text-red-300">Revertir verificación</p>
              <select value={revertCause} onChange={ev => setRevertCause(ev.target.value as any)}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="no_verificable">No verificable</option>
                <option value="observado">Observado (información falsa)</option>
              </select>
              <textarea value={revertReason} onChange={ev => setRevertReason(ev.target.value)} rows={2}
                placeholder="Motivo de la reversión…"
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none" />
              {revertCause === 'observado' && (
                <>
                  <select value={revertField} onChange={ev => setRevertField(ev.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                    {FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
                  </select>
                  <textarea value={revertFinding} onChange={ev => setRevertFinding(ev.target.value)} rows={2}
                    placeholder="Qué encontró la naviera…"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none" />
                </>
              )}
              <div className="flex gap-2">
                <button onClick={submitRevert} disabled={busy || !revertReason}
                  className="px-4 py-1.5 bg-red-400/20 hover:bg-red-400/30 border border-red-400/30 text-red-300 text-xs font-bold rounded-lg disabled:opacity-40 transition-colors">
                  Confirmar reversión
                </button>
                <button onClick={() => setRevertOpen(false)} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {e.verification_status === 'en_verificacion' && (
        <>
          {/* Contact-attempt dropzone form */}
          <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl">
            <p className="text-xs font-bold text-white/70 mb-3">Registrar intento de contacto</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select value={channel} onChange={ev => setChannel(ev.target.value as any)}
                className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="telefono">Teléfono</option>
                <option value="email">Correo</option>
              </select>
              <input type="datetime-local" value={contactedAt} onChange={ev => setContactedAt(ev.target.value)}
                className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none [color-scheme:dark]" />
              {channel === 'telefono' ? (
                <input value={phone} onChange={ev => setPhone(ev.target.value)} placeholder="Número marcado"
                  className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none" />
              ) : (
                <input value={emailContacted} onChange={ev => setEmailContacted(ev.target.value)} placeholder="Correo contactado"
                  className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none" />
              )}
              <input value={respName} onChange={ev => setRespName(ev.target.value)} placeholder="Nombre de quien respondió"
                className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none" />
              <input value={respPos} onChange={ev => setRespPos(ev.target.value)} placeholder="Cargo de quien respondió"
                className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none col-span-2" />
            </div>
            <textarea value={comments} onChange={ev => setComments(ev.target.value)} rows={2}
              placeholder="Comentarios del admin…"
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none mb-3" />

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={ev => { ev.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={ev => {
                ev.preventDefault(); setDragOver(false)
                const f = ev.dataTransfer.files?.[0]
                if (f) setFile(f)
              }}
              className={`border border-dashed rounded-lg p-4 text-center text-xs cursor-pointer transition-colors mb-3 ${
                dragOver ? 'border-cyan-400/50 text-cyan-300 bg-cyan-400/5' : 'border-white/[0.1] text-white/30 hover:border-white/25 hover:text-white/50'
              }`}
            >
              {file ? (
                <span>📎 {file.name} <button type="button" onClick={ev => { ev.stopPropagation(); setFile(null) }} className="ml-2 text-red-400/60 hover:text-red-400">quitar</button></span>
              ) : (
                <span>Arrastrá el PDF/imagen de respaldo aquí, o hacé clic para elegir uno (opcional)</span>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden"
                onChange={ev => setFile(ev.target.files?.[0] ?? null)} />
            </div>

            <button onClick={submitAttempt} disabled={busy}
              className="px-4 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/30 text-cyan-300 text-xs font-bold rounded-lg disabled:opacity-40 transition-colors">
              {busy ? 'Guardando…' : 'Registrar intento'}
            </button>
          </div>

          {/* Conclude actions */}
          <div className="mb-6">
            {!concludeMode ? (
              <div className="flex gap-2">
                <button onClick={() => openConcludeMode('verificado')}
                  className="px-3 py-1.5 bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-400/25 text-emerald-300 text-xs font-bold rounded-lg transition-colors">
                  Concluir: Verificado
                </button>
                <button onClick={() => openConcludeMode('no_verificable')}
                  className="px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 border border-red-400/25 text-red-300 text-xs font-bold rounded-lg transition-colors">
                  Concluir: No verificable
                </button>
                <button onClick={() => openConcludeMode('observado')}
                  className="px-3 py-1.5 bg-violet-400/10 hover:bg-violet-400/20 border border-violet-400/25 text-violet-300 text-xs font-bold rounded-lg transition-colors">
                  Concluir: Observado
                </button>
              </div>
            ) : (
              <div className="p-4 bg-white/[0.03] border border-white/[0.09] rounded-xl space-y-3 max-w-lg">
                {concludeMode === 'verificado' && (
                  <>
                    <p className="text-xs font-bold text-emerald-300">Concluir como verificado</p>
                    <div className="grid grid-cols-2 gap-2">
                      {FIELDS.map(f => (
                        <input key={f} value={verifiedFields[f] ?? ''} placeholder={FIELD_LABELS[f]}
                          onChange={ev => setVerifiedFields(v => ({ ...v, [f]: ev.target.value }))}
                          className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none" />
                      ))}
                    </div>
                  </>
                )}
                {concludeMode === 'no_verificable' && (
                  <>
                    <p className="text-xs font-bold text-red-300">Concluir como no verificable</p>
                    <p className="text-[11px] text-white/30">Requiere plazo vencido Y al menos 5 intentos registrados.</p>
                    <textarea value={noVerifReason} onChange={ev => setNoVerifReason(ev.target.value)} rows={2}
                      placeholder="La naviera no respondió en 30 días, N intentos registrados."
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none" />
                  </>
                )}
                {concludeMode === 'observado' && (
                  <>
                    <p className="text-xs font-bold text-violet-300">Concluir como observado (información falsa)</p>
                    <select value={observField} onChange={ev => setObservField(ev.target.value)}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                      {FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
                    </select>
                    <textarea value={observFinding} onChange={ev => setObservFinding(ev.target.value)} rows={2}
                      placeholder="Qué dice la naviera…"
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none" />
                  </>
                )}
                <div className="flex gap-2">
                  <button onClick={submitConclude} disabled={busy}
                    className="px-4 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-white text-xs font-bold rounded-lg disabled:opacity-40 transition-colors">
                    Confirmar
                  </button>
                  <button onClick={() => setConcludeMode(null)} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Contact log */}
      <div className="mb-6">
        <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-3">
          Bitácora de contacto ({e.contact_log.length})
        </p>
        {e.contact_log.length === 0 ? (
          <p className="text-white/20 text-xs">Sin intentos registrados todavía</p>
        ) : (
          <div className="flex flex-col gap-2">
            {e.contact_log.map(c => (
              <div key={c.id} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white/70">#{c.attempt_no} · {c.channel === 'telefono' ? 'Teléfono' : 'Correo'}</span>
                  <span className="text-white/25">{fmt(c.contacted_at)}</span>
                </div>
                <p className="text-white/50">
                  {c.respondent_name && <>Contactó: {c.respondent_name}{c.respondent_position ? ` (${c.respondent_position})` : ''} · </>}
                  {c.phone_number_called || c.email_contacted}
                </p>
                {c.comments && <p className="text-white/40 mt-1">{c.comments}</p>}
                {c.attachment_ref && (
                  <a href={`/api/admin/embarkations/${e.id}/contact-attempts/${c.id}/attachment`} target="_blank" rel="noreferrer"
                    className="inline-block mt-1.5 text-cyan-400/70 hover:text-cyan-300">
                    📎 Ver adjunto
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remarks */}
      {e.remarks.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-3">Remarcas ({e.remarks.length})</p>
          <div className="flex flex-col gap-2">
            {e.remarks.map(r => (
              <div key={r.id} className="p-3 bg-violet-400/[0.04] border border-violet-400/15 rounded-lg text-xs">
                <p className="text-white/70"><b>{FIELD_LABELS[r.field] ?? r.field}:</b> {r.finding}</p>
                {r.appeal_text && (
                  <p className="text-white/50 mt-1.5 pl-2 border-l-2 border-white/10">Apelación: {r.appeal_text}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  {r.resolution ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-white/50 bg-white/[0.05] border-white/10">
                      {r.resolution === 'subsanado' ? 'Subsanado' : r.resolution === 'sostenido' ? 'Sostenido' : 'Firme sin apelación'}
                    </span>
                  ) : r.appeal_text ? (
                    <div className="flex gap-1.5">
                      <button onClick={() => resolveRemark(r.id, 'subsanado')} disabled={busy}
                        className="px-2.5 py-1 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/25 text-emerald-300 text-[11px] font-bold rounded disabled:opacity-40">
                        Subsanado
                      </button>
                      <button onClick={() => resolveRemark(r.id, 'sostenido')} disabled={busy}
                        className="px-2.5 py-1 bg-red-400/10 hover:bg-red-400/20 border border-red-400/25 text-red-300 text-[11px] font-bold rounded disabled:opacity-40">
                        Sostenido
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => markFirm(r.id)} disabled={busy}
                      className="px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white/50 text-[11px] font-bold rounded disabled:opacity-40">
                      Marcar firme (sin apelación)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event history */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-3">Historial ({e.events.length})</p>
        <div className="flex flex-col gap-1.5">
          {e.events.map((ev, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/40">
              <span className="text-white/25">{fmt(ev.created_at)}</span>
              <span>{STATUS_LABEL[ev.from_status] ?? ev.from_status} → <b className="text-white/60">{STATUS_LABEL[ev.to_status] ?? ev.to_status}</b></span>
              {ev.reason && <span className="text-white/25">· {ev.reason}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
