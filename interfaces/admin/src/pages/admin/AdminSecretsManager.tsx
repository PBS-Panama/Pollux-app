import { useEffect, useState } from 'react'
import api from '../../lib/api'

// Infra secrets panel (T8/T9 — docs/specs/secrets-panel.md). Covers the
// secrets that live in env vars / Secret Manager today (SECRET_KEY,
// DRIVE_TOKEN_SECRET, DRIVE_STATE_SECRET, GOOGLE_DRIVE_CLIENT_SECRET) — a
// different concern from the OCR provider keys (AdminOcrManager's sibling,
// api_key_config table). Never shows a real value: only the last-4 hint the
// backend returns, same as api_key_config's pattern.
//
// T9 scope: local only. The backend's secret_loader uses a dev file store,
// not real Secret Manager — this UI doesn't know or care, it just talks to
// /admin/secrets/*.

interface SecretMeta {
  name: string
  configured: boolean
  hint: string | null
  version: number | null
  last_rotated_at: number | null
  has_previous: boolean
}

interface AuditEntry {
  action: string
  version: string
  result: string
  detail: string | null
  performed_by: string
  performed_at: string
}

const SECRET_LABELS: Record<string, { label: string; risk: 'low' | 'medium' | 'high'; hint: string }> = {
  SECRET_KEY: {
    label: 'SECRET_KEY',
    risk: 'high',
    hint: 'Firma los JWT de sesión — compartido con Castor. Rotar invalida sesiones fuera de la ventana de doble clave.',
  },
  DRIVE_TOKEN_SECRET: {
    label: 'DRIVE_TOKEN_SECRET',
    risk: 'high',
    hint: 'Cifra los refresh tokens de Drive y las API keys de Settings — compartido con Castor. Rotar re-cifra todo automáticamente.',
  },
  DRIVE_STATE_SECRET: {
    label: 'DRIVE_STATE_SECRET',
    risk: 'low',
    hint: 'Firma el parámetro state del OAuth de Drive — vida útil de segundos, sin dato persistente.',
  },
  GOOGLE_DRIVE_CLIENT_SECRET: {
    label: 'GOOGLE_DRIVE_CLIENT_SECRET',
    risk: 'medium',
    hint: 'Client secret de Google — el valor nuevo tiene que salir de la consola de Google primero, no se autogenera acá.',
  },
}

const RISK_COLOR: Record<string, string> = {
  low: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/[0.08]',
  medium: 'text-amber-400 border-amber-400/20 bg-amber-400/[0.08]',
  high: 'text-red-400 border-red-400/20 bg-red-400/[0.08]',
}

function fmtDate(epochSeconds: number | null): string {
  if (!epochSeconds) return '—'
  return new Date(epochSeconds * 1000).toLocaleString()
}

// ─── Reauth modal — required before Rotar / Rollback, never before Probar ──

function ReauthModal({ title, warning, onConfirm, onCancel, needsValue }: {
  title: string
  warning: string
  needsValue: boolean
  onConfirm: (password: string, value: string) => Promise<void>
  onCancel: () => void
}) {
  const [password, setPassword] = useState('')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!password) { setError('Ingresá tu contraseña para confirmar.'); return }
    if (needsValue && !value.trim()) { setError('Este secreto necesita un valor manual.'); return }
    setBusy(true); setError('')
    try {
      await onConfirm(password, value)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'La operación falló.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 max-w-md w-full flex flex-col gap-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3">{warning}</p>
        {needsValue && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/30">Valor nuevo (de la consola de Google)</span>
            <input type="password" autoComplete="off" value={value} onChange={e => setValue(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-cyan-400/40" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/30">Tu contraseña (reautenticación)</span>
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-cyan-400/40" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/40 border border-white/10">
            Cancelar
          </button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-red-400/30 bg-red-400/15 hover:bg-red-400/25 text-red-400 transition-colors disabled:opacity-40">
            {busy ? 'Confirmando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminSecretsManager() {
  const [secrets, setSecrets] = useState<SecretMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean | null; message: string }>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [modal, setModal] = useState<{ name: string; action: 'rotate' | 'rollback' } | null>(null)
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null)
  const [audit, setAudit] = useState<Record<string, AuditEntry[]>>({})
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const load = () => {
    setLoading(true)
    api.get('/admin/secrets').then(r => setSecrets(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const showToast = (kind: 'ok' | 'error', text: string) => {
    setToast({ kind, text })
    setTimeout(() => setToast(null), 6000)
  }

  const runTest = async (name: string) => {
    setTesting(t => ({ ...t, [name]: true }))
    try {
      const r = await api.post(`/admin/secrets/${name}/test`, {})
      setTestResult(tr => ({ ...tr, [name]: r.data }))
    } catch (e: any) {
      setTestResult(tr => ({ ...tr, [name]: { ok: false, message: e?.response?.data?.detail ?? 'Test failed' } }))
    } finally {
      setTesting(t => ({ ...t, [name]: false }))
    }
  }

  const loadAudit = async (name: string) => {
    if (expandedAudit === name) { setExpandedAudit(null); return }
    setExpandedAudit(name)
    if (!audit[name]) {
      const r = await api.get(`/admin/secrets/${name}/audit`)
      setAudit(a => ({ ...a, [name]: r.data }))
    }
  }

  const doRotate = async (name: string, password: string, value: string) => {
    await api.post(`/admin/secrets/${name}/rotate`, {
      current_password: password,
      ...(value ? { value } : {}),
    })
    setModal(null)
    showToast('ok', `${name}: rotación aplicada.`)
    load()
    setAudit(a => ({ ...a, [name]: undefined as any }))
  }

  const doRollback = async (name: string, password: string) => {
    await api.post(`/admin/secrets/${name}/rollback`, { current_password: password })
    setModal(null)
    showToast('ok', `${name}: rollback aplicado.`)
    load()
    setAudit(a => ({ ...a, [name]: undefined as any }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-red-400/90 bg-red-500/10 border border-red-500/25 rounded-lg p-3">
        Nunca se muestra ni se loguea el valor real de un secreto — solo los últimos 4 caracteres.
        Rotar y Rollback piden tu contraseña de nuevo antes de aplicar nada.
      </div>

      {toast && (
        <div className={`text-xs rounded-lg p-3 border ${toast.kind === 'ok' ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25' : 'text-red-400 bg-red-500/10 border-red-500/25'}`}>
          {toast.text}
        </div>
      )}

      {loading ? (
        <p className="text-white/25 text-sm py-8 text-center">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {secrets.map(s => {
            const meta = SECRET_LABELS[s.name]
            const result = testResult[s.name]
            return (
              <div key={s.name} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-white/85">{meta?.label ?? s.name}</code>
                      {meta && (
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${RISK_COLOR[meta.risk]}`}>
                          {meta.risk === 'high' ? 'alto riesgo' : meta.risk === 'medium' ? 'riesgo medio' : 'bajo riesgo'}
                        </span>
                      )}
                      {!s.configured && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border text-white/30 border-white/15">
                          sin configurar
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/30 mt-0.5 max-w-xl">{meta?.hint}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-sm font-bold text-white/80 tabular-nums">{s.hint ?? '—'}</p>
                      <p className="text-[10px] text-white/25">v{s.version ?? '—'} · {fmtDate(s.last_rotated_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => runTest(s.name)} disabled={testing[s.name]}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/50 border border-white/10 disabled:opacity-40">
                    {testing[s.name] ? 'Probando…' : 'Probar'}
                  </button>
                  <button onClick={() => setModal({ name: s.name, action: 'rotate' })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-400/30 bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 transition-colors">
                    Rotar
                  </button>
                  <button onClick={() => setModal({ name: s.name, action: 'rollback' })} disabled={!s.has_previous}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 transition-colors disabled:opacity-30">
                    Rollback
                  </button>
                  <button onClick={() => loadAudit(s.name)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/30 hover:text-cyan-400 transition-colors ml-auto">
                    {expandedAudit === s.name ? 'Ocultar historial' : 'Ver historial'}
                  </button>
                </div>

                {result && (
                  <p className={`text-xs ${result.ok === true ? 'text-cyan-400' : result.ok === false ? 'text-red-400' : 'text-white/40'}`}>
                    {result.ok === true ? '✓ ' : result.ok === false ? '✗ ' : 'ⓘ '}{result.message}
                  </p>
                )}

                {expandedAudit === s.name && (
                  <div className="border-t border-white/[0.06] pt-3 flex flex-col gap-1.5">
                    {!audit[s.name] ? (
                      <p className="text-[11px] text-white/25">Cargando…</p>
                    ) : audit[s.name].length === 0 ? (
                      <p className="text-[11px] text-white/25">Sin rotaciones todavía.</p>
                    ) : audit[s.name].map((a, i) => (
                      <div key={i} className="text-[11px] text-white/40 flex items-center gap-2 flex-wrap">
                        <span className={`font-bold ${a.result === 'ok' ? 'text-cyan-400' : 'text-red-400'}`}>{a.action}</span>
                        <span>v{a.version}</span>
                        <span className="text-white/25">{new Date(a.performed_at).toLocaleString()}</span>
                        {a.detail && <span className="text-white/25">— {a.detail}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <ReauthModal
          title={modal.action === 'rotate' ? `Rotar ${modal.name}` : `Rollback ${modal.name}`}
          needsValue={modal.action === 'rotate' && modal.name === 'GOOGLE_DRIVE_CLIENT_SECRET'}
          warning={
            modal.action === 'rotate'
              ? (SECRET_LABELS[modal.name]?.risk === 'high'
                ? 'Esto es de alto riesgo: afecta sesiones o datos cifrados compartidos con Castor. Usá Probar antes si no lo hiciste.'
                : 'Esta rotación es de bajo/medio riesgo.')
              : 'Esto revierte a la versión anterior — para DRIVE_TOKEN_SECRET también re-cifra los datos de vuelta.'
          }
          onCancel={() => setModal(null)}
          onConfirm={(password, value) =>
            modal.action === 'rotate' ? doRotate(modal.name, password, value) : doRollback(modal.name, password)
          }
        />
      )}
    </div>
  )
}
