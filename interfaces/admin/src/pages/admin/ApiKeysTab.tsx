import { useEffect, useState } from 'react'
import api from '../../lib/api'

// "API Keys" tab of Platform Config (AdminConfig.tsx) — load/rotate the OCR
// provider keys without touching env vars. The backend is write-only by
// design (Handover.md nota 48): GET never returns the value, only a 4-char
// hint, so this screen can replace a key but never show one.
//
// Rules this file must keep (they are the point of the feature):
//  - the typed key lives ONLY in ApiKeyRow's local state, and is cleared the
//    moment it is sent — never a store, localStorage/sessionStorage or the URL;
//  - never console.log an axios error here: `error.config.data` is the request
//    body, i.e. the key. Use errorMessage() and nothing else from the error.

interface ApiKeyStatus {
  key_name: string
  configured: boolean
  hint: string | null
  updated_at: string | null
  updated_by: string | null
  updated_by_email?: string | null
}

interface TestResult {
  ok: boolean
  source: 'panel' | 'env' | null
  undecryptable: boolean
  detail: string
}

type Notice = { kind: 'ok' | 'error'; text: string }

const KEY_META: Record<string, { label: string; purpose: string }> = {
  ANTHROPIC_API_KEY: {
    label: 'Anthropic',
    purpose: 'Análisis visual de los documentos con Claude — es el proveedor que se usa si está cargada.',
  },
  GOOGLE_VISION_API_KEY: {
    label: 'Google Vision',
    purpose: 'Lectura de texto (OCR) de los documentos — se usa solo cuando no hay clave de Anthropic.',
  },
}

const errorMessage = (e: any, fallback: string): string => {
  const status = e?.response?.status
  const data = e?.response?.data
  // FastAPI errors come as {detail}, the rate limiter's 429 as {error}.
  const reason = typeof data?.detail === 'string' ? data.detail : typeof data?.error === 'string' ? data.error : null
  if (status === 429) return `Límite de intentos alcanzado${reason ? ` (${reason})` : ''}. Intenta de nuevo más tarde.`
  if (status === 403) return reason ?? 'Solo un administrador puede hacer esto.'
  return reason ?? fallback
}

const testNotice = (r: TestResult): Notice => {
  const viaEnv = r.source === 'env' ? ' Se probó la variable de entorno del servidor, no una clave cargada desde aquí.' : ''
  const unreadable = r.undecryptable
    ? 'La clave guardada no se puede leer en este servidor (cambió DRIVE_TOKEN_SECRET): cárgala de nuevo. '
    : ''
  if (r.ok) return { kind: r.undecryptable ? 'error' : 'ok', text: `${unreadable}Funciona: el proveedor aceptó la clave.${viaEnv}` }
  return { kind: 'error', text: `${unreadable}${r.detail}${viaEnv}` }
}

const inp = 'bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-cyan-400/40'
const btnPrimary = 'px-3 py-2 rounded-lg text-xs font-semibold border transition-colors border-cyan-400/30 bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-400/15'
const btnQuiet = 'px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/40 border border-white/10 transition-colors disabled:opacity-40'

function ApiKeyRow({ status, onSaved }: { status: ApiKeyStatus; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const meta = KEY_META[status.key_name]
  const inputId = `api-key-${status.key_name}`

  const save = async () => {
    const submitted = value.trim()
    if (!submitted) return
    setValue('') // out of the field as soon as it is sent, whatever the outcome
    setSaving(true)
    setNotice(null)
    try {
      await api.patch('/admin/config/api-keys', { key_name: status.key_name, value: submitted })
      await onSaved()
      setNotice({ kind: 'ok', text: 'Clave guardada. Usa "Probar" para confirmar que el proveedor la acepta.' })
    } catch (e: any) {
      setNotice({ kind: 'error', text: errorMessage(e, 'No se pudo guardar la clave.') })
    } finally { setSaving(false) }
  }

  const test = async () => {
    setTesting(true)
    setNotice(null)
    try {
      const r = await api.post('/admin/config/api-keys/test', { key_name: status.key_name })
      setNotice(testNotice(r.data))
    } catch (e: any) {
      setNotice({ kind: 'error', text: errorMessage(e, 'No se pudo probar la clave.') })
    } finally { setTesting(false) }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-white/75">{meta?.label ?? status.key_name}</p>
        <p className="text-xs text-white/30 mt-0.5">{meta?.purpose ?? ''}</p>
      </div>

      <p className="text-xs">
        {status.configured ? (
          <span className="text-emerald-400/90">
            Configurada · termina en ••••{(status.hint ?? '').replace(/^\.+/, '')}
            {status.updated_at && ` · actualizada ${new Date(status.updated_at).toLocaleString()}`}
            {(status.updated_by_email ?? status.updated_by) && ` por ${status.updated_by_email ?? status.updated_by}`}
          </span>
        ) : (
          <span className="text-white/35">No configurada</span>
        )}
      </p>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label htmlFor={inputId} className="text-[10px] text-white/30">
            {status.configured ? 'Clave nueva (reemplaza a la actual)' : 'Clave'}
          </label>
          <input
            id={inputId}
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            className={inp}
            placeholder="Pega la clave aquí"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
          />
        </div>
        <button onClick={save} disabled={saving || !value.trim()} className={btnPrimary}>
          {saving ? 'Guardando…' : status.configured ? 'Reemplazar' : 'Guardar'}
        </button>
        <button onClick={test} disabled={testing || saving} className={btnQuiet}
          title="Hace una llamada mínima al proveedor con la clave guardada">
          {testing ? 'Probando…' : 'Probar'}
        </button>
      </div>

      {notice && (
        <p role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`text-xs rounded-lg p-3 border ${notice.kind === 'ok'
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
            : 'text-red-400 bg-red-500/10 border-red-500/25'}`}>
          {notice.text}
        </p>
      )}
    </div>
  )
}

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = () =>
    api.get('/admin/config/api-keys')
      .then(r => { setKeys(r.data); setLoadError('') })
      .catch((e: any) => setLoadError(errorMessage(e, 'No se pudo cargar el estado de las claves.')))

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3">
        Las claves se guardan cifradas con el DRIVE_TOKEN_SECRET del servidor. Si ese secreto cambia, las
        claves guardadas dejan de poder leerse y hay que cargarlas otra vez desde acá (ya pasó en producción
        el 2026-10-01 con la clave de Vision). Una clave guardada no se puede volver a ver, solo reemplazar.
      </div>

      {loading
        ? <p className="text-white/25 text-sm py-8 text-center">Loading…</p>
        : loadError
          ? <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg p-3">{loadError}</p>
          : keys.map(k => <ApiKeyRow key={k.key_name} status={k} onSaved={load} />)
      }
    </div>
  )
}
