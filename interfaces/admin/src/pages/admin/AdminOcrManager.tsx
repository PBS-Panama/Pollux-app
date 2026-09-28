import { useEffect, useRef, useState } from 'react'
import api from '../../lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocTypeRule {
  docKey: string
  expectedKeywords: string[]
  redFlagKeywords: string[]
  minConfidence: number
  autoVerifyThreshold: number
  numberRegex: string | null
  notes: string | null
  updatedAt: string | null
}

interface RefFile { name: string; size: number }

interface OcrResult {
  fileName: string
  ocrText: string
  ocrConfidence: number
  suggestedKeywords: string[]
}

interface EditForm {
  expectedKeywords: string[]
  redFlagKeywords: string[]
  minConfidence: number
  autoVerifyThreshold: number
  numberRegex: string
  notes: string
}

interface PreviewState {
  filename: string
  isImage: boolean
  url: string | null
  loading: boolean
  error: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const IMAGE_EXT = /\.(jpe?g|png|gif|bmp|webp|tiff?|svg)$/i

function fileIcon(name: string) {
  if (IMAGE_EXT.test(name)) return 'iconoir-media-image'
  return 'iconoir-page'
}

// ─── Keyword chip input ──────────────────────────────────────────────────────

function ChipInput({ chips, onAdd, onRemove, placeholder, color }: {
  chips: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  placeholder: string
  color: 'cyan' | 'red'
}) {
  const [val, setVal] = useState('')

  const flush = () => {
    val.split(',').map(s => s.trim()).filter(Boolean).forEach(w => {
      if (!chips.includes(w)) onAdd(w)
    })
    setVal('')
  }

  const chip = color === 'red'
    ? 'bg-red-400/10 border-red-400/20 text-red-300'
    : 'bg-cyan-400/10 border-cyan-400/20 text-cyan-300'

  return (
    <div className="flex flex-wrap gap-1.5 min-h-[2.5rem] p-2 bg-white/[0.03] border border-white/[0.07] rounded-lg">
      {chips.map(c => (
        <span
          key={c}
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded border text-[11px] font-medium ${chip}`}
        >
          {c}
          <button
            type="button"
            onClick={() => onRemove(c)}
            className="opacity-40 hover:opacity-100 ml-0.5 leading-none"
          >×</button>
        </span>
      ))}
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); flush() } }}
        onBlur={flush}
        placeholder={chips.length === 0 ? placeholder : '+ añadir…'}
        className="bg-transparent outline-none text-white/70 text-xs placeholder:text-white/20 min-w-[160px] flex-1"
      />
    </div>
  )
}

// ─── File viewer modal ────────────────────────────────────────────────────────

function FileViewerModal({ preview, docKey, onClose }: {
  preview: PreviewState
  docKey: string
  onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden border border-white/[0.1]"
        style={{ width: '90vw', maxWidth: 960, height: '90vh', background: '#0B1220' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07] flex-none">
          <i className={`${fileIcon(preview.filename)} text-lg leading-none flex-none`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/85 truncate">{preview.filename}</p>
            <p className="text-[10px] text-white/30 truncate mt-0.5">{docKey}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white text-xl leading-none transition-colors flex-none"
            title="Cerrar (Esc)"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden" style={{ background: '#060c14' }}>
          {preview.loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-white/30 text-xs">Cargando archivo…</p>
            </div>
          )}

          {preview.error && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-4xl mb-3"><i className="iconoir-warning-triangle" aria-hidden="true" /></p>
                <p className="text-red-400/70 text-sm">{preview.error}</p>
              </div>
            </div>
          )}

          {!preview.loading && !preview.error && preview.url && (
            preview.isImage ? (
              <div className="h-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={preview.url}
                  alt={preview.filename}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                />
              </div>
            ) : (
              <iframe
                src={preview.url}
                title={preview.filename}
                className="w-full h-full"
                style={{ border: 'none' }}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminOcrManager() {
  const [rules, setRules] = useState<DocTypeRule[]>([])
  const [refFiles, setRefFiles] = useState<Record<string, RefFile[]>>({})
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // ── File viewer ──────────────────────────────────────────────────────
  const closePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreview(null)
  }

  const viewFile = async (filename: string) => {
    if (!selectedKey) return
    closePreview()

    const isImage = IMAGE_EXT.test(filename)
    setPreview({ filename, isImage, url: null, loading: true, error: null })

    try {
      const res = await api.get('/admin/ocr-reference-file', {
        params: { doc_key: selectedKey, filename },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      previewUrlRef.current = url
      setPreview({ filename, isImage, url, loading: false, error: null })
    } catch {
      setPreview({ filename, isImage, url: null, loading: false, error: 'No se pudo cargar el archivo.' })
    }
  }

  // ── Data loading ─────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true)
    try {
      const [rRes, fRes] = await Promise.all([
        api.get('/admin/doc-type-rules'),
        api.get('/admin/ocr-references'),
      ])
      setRules(rRes.data)
      setRefFiles(fRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  // cleanup blob URL on unmount
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current) }, [])

  // ── Rule selection ────────────────────────────────────────────────────
  const selectRule = (key: string, freshRules?: DocTypeRule[]) => {
    const list = freshRules || rules
    const rule = list.find(r => r.docKey === key)
    if (!rule) return
    setSelectedKey(key)
    setEditForm({
      expectedKeywords: [...(rule.expectedKeywords || [])],
      redFlagKeywords: [...(rule.redFlagKeywords || [])],
      minConfidence: rule.minConfidence,
      autoVerifyThreshold: rule.autoVerifyThreshold,
      numberRegex: rule.numberRegex || '',
      notes: rule.notes || '',
    })
    setOcrResult(null)
  }

  // ── Save rule ─────────────────────────────────────────────────────────
  const saveRule = async () => {
    if (!selectedKey || !editForm) return
    setSaving(true)
    try {
      await api.put(`/admin/doc-type-rules/${encodeURIComponent(selectedKey)}`, {
        doc_key: selectedKey,
        expected_keywords: editForm.expectedKeywords,
        red_flag_keywords: editForm.redFlagKeywords,
        min_confidence: editForm.minConfidence,
        auto_verify_threshold: editForm.autoVerifyThreshold,
        number_regex: editForm.numberRegex || null,
        notes: editForm.notes || null,
      })
      await loadAll()
      showToast('Rule saved ✓')
    } catch {
      showToast('Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Create new rule ───────────────────────────────────────────────────
  const createRule = async () => {
    if (!newKey.trim()) return
    setCreating(true)
    try {
      await api.post('/admin/doc-type-rules', {
        doc_key: newKey.trim(),
        expected_keywords: [],
        red_flag_keywords: ['sample', 'fake', 'specimen', 'void', 'not valid'],
        min_confidence: 0.5,
        auto_verify_threshold: 0.85,
        number_regex: null,
        notes: null,
      })
      const rRes = await api.get('/admin/doc-type-rules')
      const fRes = await api.get('/admin/ocr-references')
      setRules(rRes.data)
      setRefFiles(fRes.data)
      setShowNew(false)
      const createdKey = newKey.trim()
      setNewKey('')
      selectRule(createdKey, rRes.data)
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Error creating rule')
    } finally {
      setCreating(false)
    }
  }

  // ── Delete rule ───────────────────────────────────────────────────────
  const deleteRule = async (key: string) => {
    if (!confirm(`Eliminar la categoría "${key}"?\n\nEsto no puede deshacerse y dejará de clasificar documentos de ese tipo.`)) return
    try {
      await api.delete(`/admin/doc-type-rules/${encodeURIComponent(key)}`)
      if (selectedKey === key) { setSelectedKey(null); setEditForm(null) }
      await loadAll()
    } catch {
      showToast('Error deleting rule')
    }
  }

  // ── Upload reference file ─────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (!selectedKey) return
    setUploading(true)
    setOcrResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post(
        `/admin/ocr-references/${encodeURIComponent(selectedKey)}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setOcrResult(res.data)
      const fRes = await api.get('/admin/ocr-references')
      setRefFiles(fRes.data)
      showToast('Archivo subido y analizado ✓')
    } catch (err: any) {
      showToast('Upload fallido: ' + (err.response?.data?.detail || err.message))
    } finally {
      setUploading(false)
    }
  }

  // ── Delete reference file ─────────────────────────────────────────────
  const deleteFile = async (filename: string) => {
    if (!selectedKey) return
    try {
      await api.delete(`/admin/ocr-references/${encodeURIComponent(selectedKey)}`, {
        params: { filename },
      })
      setRefFiles(prev => ({
        ...prev,
        [selectedKey]: (prev[selectedKey] || []).filter(f => f.name !== filename),
      }))
      if (ocrResult?.fileName === filename) setOcrResult(null)
      if (preview?.filename === filename) closePreview()
    } catch {
      showToast('Error deleting file')
    }
  }

  const ef = editForm

  // ───────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-white/30 text-sm">Cargando reglas OCR…</p>
      </div>
    )
  }

  return (
    <div className="p-6 relative">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 text-xs font-semibold rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* File viewer modal */}
      {preview && selectedKey && (
        <FileViewerModal preview={preview} docKey={selectedKey} onClose={closePreview} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">OCR Rule Manager</h2>
          <p className="text-white/35 text-xs mt-0.5 max-w-xl">
            Define categorías de documentos con sus palabras clave y sube archivos de referencia.
            El OCR clasifica documentos nuevos comparando contra estas reglas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowNew(v => !v); setNewKey('') }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/25 text-cyan-300 text-xs font-bold rounded-lg transition-colors flex-none ml-4"
        >
          + Nueva Categoría
        </button>
      </div>

      {/* New rule inline form */}
      {showNew && (
        <div className="mb-5 p-4 bg-white/[0.04] border border-cyan-400/20 rounded-xl flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
              Nombre de la categoría (doc_key)
            </label>
            <input
              autoFocus
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createRule() }}
              placeholder="ej. Flag State CoC, BOSIET Certificate, DP Licence…"
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-400/40"
            />
          </div>
          <button
            type="button"
            onClick={createRule}
            disabled={creating || !newKey.trim()}
            className="px-5 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/30 text-cyan-300 text-xs font-bold rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {creating ? 'Creando…' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="px-3 py-2 text-xs text-white/30 hover:text-white/60"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Main two-column layout */}
      <div className="flex gap-5" style={{ minHeight: '65vh' }}>

        {/* ── Left: rule list ───────────────────────────────────── */}
        <div className="w-64 flex-none flex flex-col gap-1 overflow-y-auto">
          {rules.length === 0 && (
            <p className="text-white/20 text-xs text-center py-10">
              Sin categorías — crea la primera con el botón de arriba
            </p>
          )}
          {rules.map(r => {
            const fileCount = (refFiles[r.docKey] || []).length
            const isSelected = selectedKey === r.docKey
            return (
              <div
                key={r.docKey}
                onClick={() => selectRule(r.docKey)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer border transition-colors ${
                  isSelected
                    ? 'bg-cyan-400/[0.08] border-cyan-400/25 text-white'
                    : 'bg-white/[0.02] border-white/[0.05] text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-none ${isSelected ? 'bg-cyan-400' : 'bg-white/15'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">{r.docKey}</p>
                    <p className="text-[10px] text-white/25 leading-none mt-0.5">
                      {(r.expectedKeywords || []).length} kw
                      {fileCount > 0 ? ` · ${fileCount} ref` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); deleteRule(r.docKey) }}
                  className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 text-base leading-none ml-1 flex-none transition-opacity"
                  title="Eliminar categoría"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Right: rule editor ────────────────────────────────── */}
        {selectedKey && ef ? (
          <div className="flex-1 min-w-0 overflow-y-auto flex flex-col gap-5">

            {/* Rule header */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.07]">
              <h3 className="text-sm font-bold text-white">{selectedKey}</h3>
              <span className="text-[10px] text-white/20 bg-white/[0.04] px-2 py-0.5 rounded">regla OCR</span>
            </div>

            {/* Expected keywords */}
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-2">
                Palabras Clave Esperadas
                <span className="ml-1.5 normal-case text-white/20 font-normal">
                  — el documento es válido si estas palabras aparecen en el texto extraído
                </span>
              </label>
              <ChipInput
                chips={ef.expectedKeywords}
                onAdd={w => setEditForm(f => f ? { ...f, expectedKeywords: [...f.expectedKeywords, w] } : f)}
                onRemove={w => setEditForm(f => f ? { ...f, expectedKeywords: f.expectedKeywords.filter(k => k !== w) } : f)}
                placeholder="Añade una palabra o frase, Enter para confirmar…"
                color="cyan"
              />
            </div>

            {/* Red flag keywords */}
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-2">
                Palabras de Alerta Roja
                <span className="ml-1.5 normal-case text-white/20 font-normal">
                  — el documento se marca sospechoso si aparecen
                </span>
              </label>
              <ChipInput
                chips={ef.redFlagKeywords}
                onAdd={w => setEditForm(f => f ? { ...f, redFlagKeywords: [...f.redFlagKeywords, w] } : f)}
                onRemove={w => setEditForm(f => f ? { ...f, redFlagKeywords: f.redFlagKeywords.filter(k => k !== w) } : f)}
                placeholder="sample, fake, void, specimen…"
                color="red"
              />
            </div>

            {/* Thresholds + regex */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                  Confianza Mínima (0.0–1.0)
                </label>
                <input
                  type="number" step="0.05" min="0" max="1"
                  value={ef.minConfidence}
                  onChange={e => setEditForm(f => f ? { ...f, minConfidence: parseFloat(e.target.value) || 0.5 } : f)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
                />
                <p className="text-[10px] text-white/20 mt-1">Umbral mínimo para aceptar el doc</p>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                  Auto-Verificar si confianza ≥
                </label>
                <input
                  type="number" step="0.05" min="0" max="1"
                  value={ef.autoVerifyThreshold}
                  onChange={e => setEditForm(f => f ? { ...f, autoVerifyThreshold: parseFloat(e.target.value) || 0.85 } : f)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
                />
                <p className="text-[10px] text-white/20 mt-1">Por encima de este valor → probable_valid</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                Regex del Número de Documento (opcional)
              </label>
              <input
                type="text"
                value={ef.numberRegex}
                onChange={e => setEditForm(f => f ? { ...f, numberRegex: e.target.value } : f)}
                placeholder="\bPA\d{7}\b"
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-white/15 outline-none focus:border-cyan-400/40"
              />
              <p className="text-[10px] text-white/20 mt-1">Patrón para validar el número de certificado</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                Notas del Admin
              </label>
              <textarea
                value={ef.notes}
                onChange={e => setEditForm(f => f ? { ...f, notes: e.target.value } : f)}
                rows={2}
                placeholder="Autoridad emisora, formato, variantes, notas de validación…"
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/15 outline-none resize-none focus:border-cyan-400/40"
              />
            </div>

            {/* Save */}
            <div>
              <button
                type="button"
                onClick={saveRule}
                disabled={saving}
                className="px-5 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/30 text-cyan-300 text-xs font-bold rounded-lg disabled:opacity-40 transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar Cambios'}
              </button>
            </div>

            {/* ── Reference files section ──────────────────────────── */}
            <div className="pt-5 border-t border-white/[0.07]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                    Archivos de Referencia OCR
                  </span>
                  <span className="ml-2 text-[10px] text-white/20">
                    {(refFiles[selectedKey] || []).length} archivo(s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/45 hover:text-white/70 text-xs rounded-lg disabled:opacity-40 transition-colors"
                >
                  {uploading ? '⏳ Analizando…' : '↑ Subir archivo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) { uploadFile(e.target.files[0]); e.target.value = '' } }}
                />
              </div>

              <p className="text-[10px] text-white/25 mb-3">
                Sube ejemplos reales del documento. El sistema extrae el texto via OCR y sugiere
                palabras clave para agregar a la regla. Haz clic en el nombre para previsualizar.
              </p>

              {/* File list */}
              {(refFiles[selectedKey] || []).length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/[0.08] rounded-lg p-6 text-center text-white/15 text-xs cursor-pointer hover:border-white/20 hover:text-white/30 transition-colors"
                >
                  Sin archivos de referencia — haz clic o arrastra un PDF o imagen
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {(refFiles[selectedKey] || []).map(f => (
                    <div
                      key={f.name}
                      className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.05] rounded-lg group hover:border-white/[0.09] transition-colors"
                    >
                      {/* Clickable area → opens viewer */}
                      <button
                        type="button"
                        onClick={() => viewFile(f.name)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                        title="Ver documento"
                      >
                        <i className={`${fileIcon(f.name)} text-sm flex-none`} aria-hidden="true" />
                        <span className="text-xs text-white/65 truncate group-hover:text-white/85 transition-colors">{f.name}</span>
                        <span className="text-[10px] text-white/20 flex-none">{(f.size / 1024).toFixed(0)} KB</span>
                      </button>

                      {/* View button (shown on hover) */}
                      <button
                        type="button"
                        onClick={() => viewFile(f.name)}
                        title="Ver documento"
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-cyan-400 text-[13px] flex-none transition-opacity px-1"
                      >
                        ⌕
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => deleteFile(f.name)}
                        className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 text-sm flex-none transition-opacity"
                        title="Eliminar archivo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* OCR result panel */}
              {ocrResult && (
                <div className="mt-4 p-4 bg-white/[0.02] border border-cyan-400/15 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-bold">
                      Resultado OCR — {ocrResult.fileName}
                    </span>
                    <span className="text-[10px] text-white/25">
                      Confianza: {(ocrResult.ocrConfidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {ocrResult.suggestedKeywords.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] text-white/30 mb-2">
                        Palabras clave sugeridas — haz clic para agregar a las palabras esperadas:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ocrResult.suggestedKeywords.map(kw => {
                          const already = ef.expectedKeywords.includes(kw)
                          return (
                            <button
                              key={kw}
                              type="button"
                              disabled={already}
                              onClick={() => {
                                if (!already) {
                                  setEditForm(f => f
                                    ? { ...f, expectedKeywords: [...f.expectedKeywords, kw] }
                                    : f
                                  )
                                }
                              }}
                              className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors ${
                                already
                                  ? 'bg-cyan-400/10 border-cyan-400/15 text-cyan-400/35 cursor-default'
                                  : 'bg-white/[0.04] border-white/[0.09] text-white/50 hover:bg-cyan-400/10 hover:border-cyan-400/25 hover:text-cyan-300 cursor-pointer'
                              }`}
                            >
                              {already ? '✓ ' : '+ '}{kw}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-white/20 mt-2">
                        Recuerda guardar los cambios después de agregar palabras clave.
                      </p>
                    </div>
                  )}

                  {ocrResult.ocrText ? (
                    <div>
                      <p className="text-[10px] text-white/25 mb-1.5">Texto extraído:</p>
                      <pre className="text-[11px] text-white/40 bg-black/25 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap font-mono leading-relaxed">
                        {ocrResult.ocrText.length > 1500
                          ? ocrResult.ocrText.slice(0, 1500) + '\n…'
                          : ocrResult.ocrText}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400/60 bg-amber-400/5 border border-amber-400/15 rounded-lg p-3">
                      No se encontró texto embebido en el PDF.
                      Los PDFs escaneados requieren Google Vision API para extracción OCR.
                      Puedes agregar las palabras clave manualmente arriba.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/15 text-sm">Selecciona una categoría en la lista</p>
              <p className="text-white/10 text-xs mt-1">o crea una nueva con el botón de arriba</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
