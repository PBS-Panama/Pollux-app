import { useEffect, useRef, useState } from 'react'
import api from '../../lib/api'

interface CvTemplate {
  html_template: string
  logo_b64: string | null
  accent_color: string
  updated_at: string | null
}

const PLACEHOLDERS: { token: string; desc: string }[] = [
  { token: '{{full_name}}', desc: 'Nombre completo del seafarer' },
  { token: '{{rank}}', desc: 'Rango' },
  { token: '{{fleet_category_label}}', desc: 'Categoria de flota' },
  { token: '{{seafarer_code}}', desc: 'Codigo de seafarer' },
  { token: '{{nationality}}', desc: 'Nacionalidad' },
  { token: '{{years_experience}}', desc: 'Anos de experiencia' },
  { token: '{{availability}}', desc: '"Available" / "Not available"' },
  { token: '{{bio}}', desc: 'Biografia / About me' },
  { token: '{{documents_rows}}', desc: 'Filas de la tabla de certificados verificados (HTML ya armado)' },
  { token: '{{generated_date}}', desc: 'Fecha de generacion del PDF' },
  { token: '{{logo_html}}', desc: 'Logo subido abajo, ya envuelto en <img>' },
  { token: '{{accent_color}}', desc: 'Color de marca elegido abajo' },
]

export default function AdminCvTemplate() {
  const [tpl, setTpl] = useState<CvTemplate | null>(null)
  const [htmlTemplate, setHtmlTemplate] = useState('')
  const [logoB64, setLogoB64] = useState<string | null>(null)
  const [accentColor, setAccentColor] = useState('#0ea5e9')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    api.get('/admin/cv-template').then(r => {
      setTpl(r.data)
      setHtmlTemplate(r.data.html_template)
      setLogoB64(r.data.logo_b64)
      setAccentColor(r.data.accent_color)
    }).catch(() => setError('No se pudo cargar el template.')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const runPreview = () => {
    setPreviewLoading(true)
    api.post('/admin/cv-template/preview', {
      html_template: htmlTemplate, logo_b64: logoB64, accent_color: accentColor,
    }).then(r => setPreviewHtml(r.data.html)).catch(() => setError('No se pudo generar la vista previa.'))
      .finally(() => setPreviewLoading(false))
  }
  // Auto-preview on first load
  useEffect(() => { if (tpl) runPreview() }, [tpl])

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoB64(reader.result as string)
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const r = await api.patch('/admin/cv-template', {
        html_template: htmlTemplate, logo_b64: logoB64, accent_color: accentColor,
      })
      setTpl(r.data)
      setSavedAt(r.data.updated_at)
    } catch {
      setError('No se pudo guardar. Revisa el HTML del template.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-white/40 text-sm">Cargando template...</div>

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-white/90">CV Template</h1>
        <p className="text-xs text-white/40 mt-1">
          Este es el formato que las empresas descargan al hacer clic en "Download CV" sobre un seafarer.
          Edita el HTML, sube el logo y elige el color de marca — la vista previa usa datos de ejemplo.
        </p>
      </div>

      {error && <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Editor column ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40 mb-1">Logo</label>
              <div className="flex items-center gap-2">
                {logoB64 && <img src={logoB64} alt="logo" className="w-10 h-10 object-contain bg-white/10 rounded" />}
                <button onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold px-3 py-1.5 rounded border border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10">
                  {logoB64 ? 'Cambiar' : 'Subir logo'}
                </button>
                {logoB64 && (
                  <button onClick={() => setLogoB64(null)} className="text-xs text-white/40 hover:text-red-400">Quitar</button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40 mb-1">Color de marca</label>
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                className="w-16 h-8 rounded cursor-pointer bg-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40 mb-1">HTML Template</label>
            <textarea value={htmlTemplate} onChange={e => setHtmlTemplate(e.target.value)} spellCheck={false}
              className="w-full h-96 bg-black/30 border border-white/10 rounded-lg p-3 text-[11px] font-mono text-white/80 outline-none focus:border-cyan-400/50 resize-y" />
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/40 mb-2">Placeholders disponibles</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PLACEHOLDERS.map(p => (
                <div key={p.token} className="text-[10px] text-white/50">
                  <code className="text-cyan-400">{p.token}</code> — {p.desc}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={runPreview} disabled={previewLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/15 text-white/70 hover:bg-white/5 disabled:opacity-50">
              {previewLoading ? 'Generando...' : 'Actualizar vista previa'}
            </button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-400 text-black hover:bg-cyan-300 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            {savedAt && <span className="text-[10px] text-emerald-400">Guardado {new Date(savedAt).toLocaleTimeString()}</span>}
          </div>
        </div>

        {/* ── Preview column ── */}
        <div className="flex flex-col gap-2">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40">Vista previa (datos de ejemplo)</label>
          <div className="bg-white rounded-lg overflow-hidden border border-white/10" style={{ height: '44rem' }}>
            <iframe title="cv-preview" srcDoc={previewHtml} className="w-full h-full" style={{ border: 'none' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
