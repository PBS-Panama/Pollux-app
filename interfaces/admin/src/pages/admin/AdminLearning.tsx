import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../../lib/api'

interface Episode {
  id: string; title: string; youtube_url: string | null
  thumbnail: string | null; duration_seconds: number | null; order: number
}
interface Season {
  id: string; title: string; order: number; episodes: Episode[]
}
interface Series {
  id: string; badge_id: string; title: string; description: string | null
  card_thumbnail: string | null; background_image: string | null
  is_published: boolean
  industry_category: string; rank_level: string
  season_count?: number; episode_count?: number
  seasons?: Season[]
}

const INDUSTRY_CATEGORIES = [
  { value: 'general',   label: 'General — All Seafarers' },
  { value: 'cargo',     label: 'Cargo' },
  { value: 'gas',       label: 'Gas Carrier' },
  { value: 'offshore',  label: 'Offshore Industry' },
  { value: 'supply',    label: 'Supply & Support' },
  { value: 'passenger', label: 'Passenger & RoPax' },
  { value: 'fishing',   label: 'Fishing' },
  { value: 'yacht',     label: 'Yacht & Superyacht' },
]

const RANK_LEVELS = [
  { value: 'all',        label: 'All Seafarers' },
  { value: 'ratings',    label: 'Ratings' },
  { value: 'oow',        label: 'OOW — Operational Level' },
  { value: 'management', label: 'Management Level' },
]

const CAT_COLORS: Record<string, string> = {
  general:   'text-cyan-400 bg-cyan-400/10 border-cyan-400/25',
  cargo:     'text-amber-400 bg-amber-400/10 border-amber-400/25',
  gas:       'text-blue-400 bg-blue-400/10 border-blue-400/25',
  offshore:  'text-orange-400 bg-orange-400/10 border-orange-400/25',
  supply:    'text-purple-400 bg-purple-400/10 border-purple-400/25',
  passenger: 'text-pink-400 bg-pink-400/10 border-pink-400/25',
  fishing:   'text-teal-400 bg-teal-400/10 border-teal-400/25',
  yacht:     'text-indigo-400 bg-indigo-400/10 border-indigo-400/25',
}

type View = 'list' | 'editor'

// ── Image Crop Modal ──────────────────────────────────────────────────────────
// Pure canvas/mouse — no external deps. aspect = width/height (e.g. 2/3 or 16/9)

function ImageCropModal({ src, aspect, label, onConfirm, onCancel }: {
  src: string
  aspect: number   // width / height
  label: string
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement>(null)

  const [box, setBox]           = useState({ x: 0, y: 0, w: 0, h: 0 })
  const boxRef                  = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const [imgLoaded, setImgLoaded] = useState(false)

  const dragging = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null)
  const resizing = useRef<{ sx: number; sw: number } | null>(null)

  // Keep boxRef in sync so mouse handlers see current box
  useEffect(() => { boxRef.current = box }, [box])

  const initBox = () => {
    const c = containerRef.current
    if (!c) return
    const cw = c.clientWidth, ch = c.clientHeight
    let w, h
    if (cw / ch > aspect) { h = ch * 0.88; w = h * aspect }
    else                   { w = cw * 0.88; h = w / aspect }
    const b = { x: (cw - w) / 2, y: (ch - h) / 2, w, h }
    setBox(b); boxRef.current = b; setImgLoaded(true)
  }

  // Mouse move / up on window
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const c = containerRef.current
      if (!c) return
      const cw = c.clientWidth, ch = c.clientHeight
      const b  = boxRef.current

      if (dragging.current) {
        const { sx, sy, bx, by } = dragging.current
        const nx = Math.max(0, Math.min(cw - b.w, bx + (e.clientX - sx)))
        const ny = Math.max(0, Math.min(ch - b.h, by + (e.clientY - sy)))
        const nb = { ...b, x: nx, y: ny }
        setBox(nb); boxRef.current = nb
      }

      if (resizing.current) {
        const { sx, sw } = resizing.current
        let nw = Math.max(60, sw + (e.clientX - sx))
        let nh = nw / aspect
        if (b.x + nw > cw) { nw = cw - b.x; nh = nw / aspect }
        if (b.y + nh > ch) { nh = ch - b.y; nw = nh * aspect }
        const nb = { ...b, w: nw, h: nh }
        setBox(nb); boxRef.current = nb
      }
    }
    const onUp = () => { dragging.current = null; resizing.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [aspect])

  const onBoxDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragging.current = { sx: e.clientX, sy: e.clientY, bx: box.x, by: box.y }
  }
  const onHandleDown = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    resizing.current = { sx: e.clientX, sw: box.w }
  }

  const confirm = () => {
    const img = imgRef.current
    const c   = containerRef.current
    if (!img || !c) return

    const cw = c.clientWidth, ch = c.clientHeight
    const na = img.naturalWidth / img.naturalHeight
    const ca = cw / ch
    let rendW: number, rendH: number, offX: number, offY: number
    if (na > ca) { rendW = cw; rendH = cw / na; offX = 0; offY = (ch - rendH) / 2 }
    else          { rendH = ch; rendW = ch * na; offX = (cw - rendW) / 2; offY = 0 }

    const sx = img.naturalWidth  / rendW
    const sy = img.naturalHeight / rendH
    const b  = boxRef.current

    const srcX = Math.max(0, (b.x - offX) * sx)
    const srcY = Math.max(0, (b.y - offY) * sy)
    const srcW = Math.min(b.w * sx, img.naturalWidth  - srcX)
    const srcH = Math.min(b.h * sy, img.naturalHeight - srcY)

    // Output size: card 300×450, background 1280×720
    const outW = aspect >= 1 ? 1280 : 300
    const outH = aspect >= 1 ? Math.round(1280 / aspect) : Math.round(300 / aspect)

    const canvas = document.createElement('canvas')
    canvas.width = outW; canvas.height = outH
    canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
    onConfirm(canvas.toDataURL('image/jpeg', 0.82))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1623] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <div>
            <p className="text-sm font-bold text-white">{label}</p>
            <p className="text-[11px] text-white/35 mt-0.5">
              {aspect < 1
                ? `Recorte vertical 2:3 (póster) · ${300}×${450}px`
                : `Recorte horizontal 16:9 (fondo) · ${1280}×${720}px`
              }
            </p>
          </div>
          <button onClick={onCancel} className="text-white/25 hover:text-white/70 text-lg transition-colors">✕</button>
        </div>

        {/* Instructions */}
        <div className="px-6 py-2 flex items-center gap-6 border-b border-white/[0.05] bg-white/[0.02]">
          <span className="text-[10px] text-white/30 flex items-center gap-1.5">
            <span className="text-cyan-400/60">✦</span> Arrastra el recuadro para reposicionar
          </span>
          <span className="text-[10px] text-white/30 flex items-center gap-1.5">
            <span className="text-cyan-400/60">✦</span> Esquina azul para redimensionar
          </span>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="relative bg-[#050810] overflow-hidden select-none"
          style={{ height: 420 }}
        >
          <img
            ref={imgRef}
            src={src}
            onLoad={initBox}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />

          {imgLoaded && (
            <>
              {/* Dim overlay — 4 panels */}
              <div className="absolute bg-black/60 pointer-events-none" style={{ top: 0, left: 0, right: 0, height: box.y }} />
              <div className="absolute bg-black/60 pointer-events-none" style={{ top: box.y + box.h, left: 0, right: 0, bottom: 0 }} />
              <div className="absolute bg-black/60 pointer-events-none" style={{ top: box.y, left: 0, width: box.x, height: box.h }} />
              <div className="absolute bg-black/60 pointer-events-none" style={{ top: box.y, left: box.x + box.w, right: 0, height: box.h }} />

              {/* Crop box */}
              <div
                onMouseDown={onBoxDown}
                className="absolute border border-cyan-400/70 cursor-move"
                style={{ top: box.y, left: box.x, width: box.w, height: box.h, boxSizing: 'border-box' }}
              >
                {/* Rule-of-thirds grid */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-white/10" />
                  <div className="absolute top-2/3 left-0 right-0 border-t border-white/10" />
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/10" />
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/10" />
                </div>

                {/* Corner markers */}
                {[['top-0 left-0','border-t border-l'],['top-0 right-0','border-t border-r'],
                  ['bottom-0 left-0','border-b border-l'],['bottom-0 right-0','border-b border-r']].map(([pos, cls]) => (
                  <div key={pos} className={`absolute ${pos} w-4 h-4 ${cls} border-cyan-400 pointer-events-none`} />
                ))}

                {/* Resize handle — bottom-right */}
                <div
                  onMouseDown={onHandleDown}
                  className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end"
                  style={{ margin: '-4px' }}
                >
                  <div className="w-4 h-4 bg-cyan-400 rounded-sm" />
                </div>

                {/* Aspect ratio badge */}
                <div className="absolute top-1.5 left-1.5 bg-black/70 text-[9px] font-bold text-cyan-400 px-1.5 py-0.5 rounded-sm tracking-wider pointer-events-none">
                  {aspect < 1 ? '2:3' : '16:9'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.07]">
          <button onClick={onCancel}
            className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5">
            Cancelar
          </button>
          <button onClick={confirm}
            className="text-xs font-bold px-5 py-2 rounded-lg border border-cyan-400/35 text-cyan-400 hover:bg-cyan-400/10 transition-all">
            ✓ Recortar y guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Image Upload Field ────────────────────────────────────────────────────────

function ImageUploadField({ label, hint, aspect, value, onChange }: {
  label: string
  hint: string
  aspect: number
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = () => fileRef.current?.click()

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCropSrc(URL.createObjectURL(f))
    e.target.value = ''
  }

  const onCrop = (dataUrl: string) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    onChange(dataUrl)
  }

  const cancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  // Preview box: portrait (2:3) or landscape (16:9)
  const isPortrait = aspect < 1

  return (
    <div>
      <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-2">
        {label} <span className="normal-case font-normal text-white/20">{hint}</span>
      </label>

      <div className={`flex gap-3 ${isPortrait ? 'items-start' : 'flex-col'}`}>
        {/* Preview */}
        <div
          className="relative bg-white/[0.05] border border-white/[0.08] rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 group"
          style={isPortrait
            ? { width: 72, height: 108 }   // 2:3 poster
            : { width: '100%', height: 112 } // 16:9 wide
          }
        >
          {value ? (
            <>
              <img src={value} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={pick} className="text-[10px] text-white font-bold bg-black/50 px-2 py-1 rounded">Cambiar</button>
              </div>
            </>
          ) : (
            <button onClick={pick} className="flex flex-col items-center gap-1.5 text-white/20 hover:text-white/50 transition-colors p-3">
              <span className="text-2xl">＋</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">{isPortrait ? '2:3' : '16:9'}</span>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-1.5">
          <button onClick={pick}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/80 hover:border-white/25 transition-all whitespace-nowrap">
            {value ? '↩ Cambiar imagen' : '↑ Subir imagen'}
          </button>
          {value && (
            <button onClick={() => onChange(null)}
              className="text-[11px] px-3 py-1 rounded-lg border border-red-400/15 text-red-400/40 hover:text-red-400 hover:border-red-400/30 transition-all">
              Quitar
            </button>
          )}
          <p className="text-[9px] text-white/20 leading-relaxed">
            {isPortrait ? 'Póster vertical 2:3\n300×450 px · JPEG' : 'Fondo panorámico 16:9\n1280×720 px · JPEG'}
          </p>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={aspect}
          label={label}
          onConfirm={onCrop}
          onCancel={cancel}
        />
      )}
    </div>
  )
}

// ── Admin Learning — List view ────────────────────────────────────────────────

export default function AdminLearning() {
  const [view, setView]       = useState<View>('list')
  const [series, setSeries]   = useState<Series[]>([])
  const [active, setActive]   = useState<Series | null>(null)
  const [loading, setLoading] = useState(false)

  const loadList = useCallback(() => {
    setLoading(true)
    api.get('/admin/learning/series').then(r => setSeries(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadList() }, [loadList])

  const openNew = () => {
    setActive({
      id: '', badge_id: '', title: '', description: '',
      card_thumbnail: null, background_image: null, is_published: false,
      industry_category: 'general', rank_level: 'all', seasons: [],
    })
    setView('editor')
  }

  const openEdit = async (s: Series) => {
    setLoading(true)
    const r = await api.get(`/admin/learning/series/${s.id}`)
    setActive(r.data)
    setView('editor')
    setLoading(false)
  }

  const deleteSeries = async (id: string) => {
    if (!window.confirm('¿Eliminar esta serie y todo su contenido?')) return
    await api.delete(`/admin/learning/series/${id}`)
    loadList()
  }

  if (view === 'editor' && active !== null) {
    return (
      <SeriesEditor
        series={active}
        onBack={() => { setView('list'); loadList() }}
        onSaved={(updated) => setActive(updated)}
      />
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Learning Record CMS</h2>
          <p className="text-white/40 text-xs mt-1">{series.length} series configuradas</p>
        </div>
        <button onClick={openNew}
          className="text-xs font-bold px-4 py-2 rounded-lg border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition-all">
          + Nueva Serie
        </button>
      </div>

      {loading && <p className="text-white/30 text-sm">Cargando...</p>}

      <div className="space-y-2">
        {series.map(s => (
          <div key={s.id}
            className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl hover:border-white/[0.12] transition-all">

            {/* Poster thumbnail — 2:3 portrait */}
            <div className="w-10 h-[60px] rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0 border border-white/[0.06] flex items-center justify-center">
              {s.card_thumbnail
                ? <img src={s.card_thumbnail} alt="" className="w-full h-full object-cover" />
                : <i className="iconoir-book text-base" aria-hidden="true" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-white/90 truncate">{s.title}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                  s.is_published
                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                    : 'text-white/30 bg-white/[0.04] border-white/10'
                }`}>
                  {s.is_published ? 'Publicado' : 'Borrador'}
                </span>
              </div>
              <p className="text-[10px] text-white/35 font-mono">{s.badge_id}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${CAT_COLORS[s.industry_category] ?? CAT_COLORS.general}`}>
                  {INDUSTRY_CATEGORIES.find(c => c.value === s.industry_category)?.label.split(' ')[0] ?? s.industry_category}
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border text-white/35 bg-white/[0.04] border-white/10">
                  {RANK_LEVELS.find(r => r.value === s.rank_level)?.label.split(' ')[0] ?? s.rank_level}
                </span>
                <span className="text-[10px] text-white/20">
                  {s.season_count ?? 0} temp. · {s.episode_count ?? 0} ep.
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => openEdit(s)}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all">
                Editar
              </button>
              <button onClick={() => deleteSeries(s.id)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-red-400/20 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
                ✕
              </button>
            </div>
          </div>
        ))}
        {!loading && series.length === 0 && (
          <p className="text-center text-white/25 py-12 text-sm">
            No hay series aún. Crea una nueva para empezar.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Series Editor ─────────────────────────────────────────────────────────────

function SeriesEditor({ series, onBack, onSaved }: {
  series: Series
  onBack: () => void
  onSaved: (s: Series) => void
}) {
  const isNew = !series.id
  const [form, setForm]               = useState({ ...series })
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const savedTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [addingEp, setAddingEp]       = useState<string | null>(null)
  const [addingSn, setAddingSn]       = useState(false)
  const [newSnTitle, setNewSnTitle]   = useState('')
  const [epForm, setEpForm]           = useState({ title: '', youtube_url: '', duration_seconds: '' })
  const [oembedLoading, setOembedLoading] = useState(false)
  const [editingSeasonId, setEditingSeasonId]   = useState<string | null>(null)
  const [seasonEditTitle, setSeasonEditTitle]   = useState('')
  const [seasonSaving, setSeasonSaving]         = useState(false)
  const [editingEpId, setEditingEpId]   = useState<string | null>(null)
  const [epEditTitle, setEpEditTitle]   = useState('')
  const [epEditUrl, setEpEditUrl]       = useState('')
  const [epEditSaving, setEpEditSaving] = useState(false)

  const patch = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  const refreshForm = async () => {
    const fresh = await api.get(`/admin/learning/series/${form.id}`)
    setForm(fresh.data); onSaved(fresh.data)
  }

  const save = async () => {
    setSaving(true); setSaved(false)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    try {
      if (isNew) {
        const r = await api.post('/admin/learning/series', {
          badge_id:          form.badge_id,
          title:             form.title,
          description:       form.description,
          card_thumbnail:    form.card_thumbnail,
          background_image:  form.background_image,
          is_published:      form.is_published,
          industry_category: form.industry_category ?? 'general',
          rank_level:        form.rank_level ?? 'all',
        })
        const fresh = await api.get(`/admin/learning/series/${r.data.id}`)
        onSaved(fresh.data); setForm(fresh.data)
      } else {
        await api.patch(`/admin/learning/series/${form.id}`, {
          title:             form.title,
          description:       form.description,
          card_thumbnail:    form.card_thumbnail,
          background_image:  form.background_image,
          is_published:      form.is_published,
          industry_category: form.industry_category ?? 'general',
          rank_level:        form.rank_level ?? 'all',
        })
        await refreshForm()
      }
      setSaved(true)
      savedTimer.current = setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const addSeason = async () => {
    if (!newSnTitle.trim() || !form.id) return
    await api.post('/admin/learning/seasons', {
      series_id: form.id, title: newSnTitle.trim(),
      order: (form.seasons?.length ?? 0),
    })
    setNewSnTitle(''); setAddingSn(false)
    await refreshForm()
  }

  const deleteSeason = async (seasonId: string) => {
    await api.delete(`/admin/learning/seasons/${seasonId}`)
    await refreshForm()
  }

  const fetchOembed = async (url: string) => {
    if (!url) return
    setOembedLoading(true)
    try {
      const r = await api.get('/admin/learning/oembed', { params: { url } })
      setEpForm(f => ({ ...f, title: f.title || r.data.title || f.title, _thumbnail: r.data.thumbnail } as any))
    } catch { /* silent */ }
    setOembedLoading(false)
  }

  const addEpisode = async (seasonId: string) => {
    await api.post('/admin/learning/episodes', {
      season_id:        seasonId,
      title:            epForm.title,
      youtube_url:      epForm.youtube_url || null,
      youtube_thumbnail: (epForm as any)._thumbnail || null,
      duration_seconds: epForm.duration_seconds ? parseInt(epForm.duration_seconds) : null,
      order: (form.seasons?.find(s => s.id === seasonId)?.episodes.length ?? 0),
    })
    setEpForm({ title: '', youtube_url: '', duration_seconds: '' })
    setAddingEp(null); await refreshForm()
  }

  const deleteEpisode = async (epId: string) => {
    await api.delete(`/admin/learning/episodes/${epId}`)
    await refreshForm()
  }

  const startEditSeason = (season: Season) => {
    setEditingSeasonId(season.id); setSeasonEditTitle(season.title)
  }

  const saveSeasonTitle = async (seasonId: string) => {
    if (!seasonEditTitle.trim()) return
    setSeasonSaving(true)
    try {
      await api.patch(`/admin/learning/seasons/${seasonId}`, { title: seasonEditTitle.trim() })
      await refreshForm(); setEditingSeasonId(null)
    } finally { setSeasonSaving(false) }
  }

  const startEditEp = (ep: Episode) => {
    setEditingEpId(ep.id); setEpEditTitle(ep.title); setEpEditUrl(ep.youtube_url || '')
  }

  const saveEpEdit = async (epId: string) => {
    setEpEditSaving(true)
    try {
      await api.patch(`/admin/learning/episodes/${epId}`, {
        title:       epEditTitle.trim() || undefined,
        youtube_url: epEditUrl.trim() || null,
      })
      await refreshForm(); setEditingEpId(null)
    } finally { setEpEditSaving(false) }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={onBack}
        className="text-xs text-white/35 hover:text-white/70 mb-6 flex items-center gap-1.5 transition-colors">
        ← Volver a series
      </button>

      {/* ── Series info card ─── */}
      <div className="mb-8 p-6 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
        <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-5">
          {isNew ? 'Nueva Serie' : 'Información de la Serie'}
        </h3>

        {/* Row 1: badge + title */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Badge ID *</label>
            <input value={form.badge_id} onChange={e => patch('badge_id', e.target.value)}
              disabled={!isNew}
              placeholder="ej: stcw-bst, radar-arpa"
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50 disabled:opacity-40" />
          </div>
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Título *</label>
            <input value={form.title} onChange={e => patch('title', e.target.value)}
              placeholder="Nombre de la serie"
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50" />
          </div>
        </div>

        {/* Row 2: description */}
        <div className="mb-5">
          <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Descripción</label>
          <textarea value={form.description || ''} onChange={e => patch('description', e.target.value)}
            rows={3}
            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50 resize-none" />
        </div>

        {/* Row 2b: Industry Category + Rank Level */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Industry Category</label>
            <select
              value={form.industry_category ?? 'general'}
              onChange={e => patch('industry_category', e.target.value)}
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50 appearance-none cursor-pointer"
            >
              {INDUSTRY_CATEGORIES.map(c => (
                <option key={c.value} value={c.value} className="bg-[#0f1a2b]">{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Rank Level</label>
            <select
              value={form.rank_level ?? 'all'}
              onChange={e => patch('rank_level', e.target.value)}
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50 appearance-none cursor-pointer"
            >
              {RANK_LEVELS.map(r => (
                <option key={r.value} value={r.value} className="bg-[#0f1a2b]">{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Images side by side */}
        <div className="grid grid-cols-2 gap-6 mb-5 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center text-cyan-400 text-[9px]">▬</span>
              Imagen de Card (Póster)
            </p>
            <ImageUploadField
              label="Card Thumbnail"
              hint="· Vertical 2:3"
              aspect={2 / 3}
              value={form.card_thumbnail}
              onChange={v => patch('card_thumbnail', v)}
            />
          </div>

          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-purple-400/10 border border-purple-400/25 flex items-center justify-center text-purple-400 text-[9px]">▬</span>
              Imagen de Fondo (Hero)
            </p>
            <ImageUploadField
              label="Background Image"
              hint="· Panorámica 16:9"
              aspect={16 / 9}
              value={form.background_image}
              onChange={v => patch('background_image', v)}
            />
          </div>
        </div>

        {/* Row 4: published toggle + save */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.is_published}
              onChange={e => patch('is_published', e.target.checked)}
              className="w-4 h-4 accent-emerald-400" />
            <span className="text-sm text-white/60">Publicado (visible en el app)</span>
          </label>
          <button onClick={save} disabled={saving || saved || !form.title || !form.badge_id}
            className={`text-xs font-bold px-5 py-2 rounded-lg border transition-all ${
              saved
                ? 'border-emerald-400 bg-emerald-400/15 text-emerald-400 cursor-default'
                : 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40'
            }`}>
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : isNew ? 'Crear Serie' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* ── Seasons + Episodes ─── */}
      {!isNew && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold tracking-widest text-white/30 uppercase">
              Temporadas ({form.seasons?.length ?? 0})
            </h3>
            <button onClick={() => setAddingSn(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-cyan-400/25 text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all">
              + Temporada
            </button>
          </div>

          {addingSn && (
            <div className="flex gap-2 mb-4">
              <input value={newSnTitle} onChange={e => setNewSnTitle(e.target.value)}
                placeholder="Título de la temporada" autoFocus
                onKeyDown={e => e.key === 'Enter' && addSeason()}
                className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50" />
              <button onClick={addSeason} disabled={!newSnTitle.trim()}
                className="text-xs px-3 py-2 rounded-lg border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40">OK</button>
              <button onClick={() => { setAddingSn(false); setNewSnTitle('') }}
                className="text-xs text-white/25 hover:text-white/60 px-1">✕</button>
            </div>
          )}

          <div className="space-y-4">
            {form.seasons?.map(season => (
              <div key={season.id} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">

                {/* Season header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <span className="text-xs font-bold text-cyan-400/50 w-6 flex-shrink-0">S{season.order + 1}</span>

                  {editingSeasonId === season.id ? (
                    <>
                      <input value={seasonEditTitle} onChange={e => setSeasonEditTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveSeasonTitle(season.id)}
                        autoFocus
                        className="flex-1 bg-white/[0.07] border border-cyan-400/30 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60" />
                      <button onClick={() => saveSeasonTitle(season.id)} disabled={seasonSaving || !seasonEditTitle.trim()}
                        className="text-[11px] px-3 py-1 rounded-lg border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40 flex-shrink-0 transition-all">
                        {seasonSaving ? '...' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditingSeasonId(null)}
                        className="text-[11px] text-white/25 hover:text-white/60 px-1 flex-shrink-0">✕</button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white/85 flex-1">{season.title}</p>
                      <span className="text-[10px] text-white/25 flex-shrink-0">{season.episodes.length} ep.</span>
                      <button onClick={() => startEditSeason(season)}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 text-white/30 hover:text-white/70 hover:border-white/25 transition-all flex-shrink-0"><i className="iconoir-edit-pencil" aria-hidden="true" /></button>
                      <button onClick={() => setAddingEp(season.id)}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-cyan-400/20 text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all flex-shrink-0">
                        + Episodio
                      </button>
                      <button onClick={() => deleteSeason(season.id)}
                        className="text-[11px] text-white/20 hover:text-red-400 transition-colors px-1 flex-shrink-0">✕</button>
                    </>
                  )}
                </div>

                {/* Add episode form */}
                {addingEp === season.id && (
                  <div className="px-5 py-4 bg-cyan-400/[0.03] border-b border-cyan-400/10 space-y-3">
                    <p className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-bold">Nuevo episodio</p>
                    <div className="flex gap-2.5">
                      <input value={epForm.youtube_url} onChange={e => setEpForm(f => ({ ...f, youtube_url: e.target.value }))}
                        onBlur={e => fetchOembed(e.target.value)}
                        placeholder="YouTube URL — pega y el título se auto-rellena"
                        className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50" />
                      {oembedLoading && <span className="text-xs text-white/30 self-center">...</span>}
                    </div>
                    <div className="flex gap-2.5">
                      <input value={epForm.title} onChange={e => setEpForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Título del episodio"
                        className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50" />
                      <input value={epForm.duration_seconds} onChange={e => setEpForm(f => ({ ...f, duration_seconds: e.target.value }))}
                        placeholder="Duración (seg)" type="number"
                        className="w-32 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setAddingEp(null); setEpForm({ title: '', youtube_url: '', duration_seconds: '' }) }}
                        className="text-xs text-white/25 hover:text-white/60 transition-colors">Cancelar</button>
                      <button onClick={() => addEpisode(season.id)} disabled={!epForm.title}
                        className="text-xs px-4 py-1.5 rounded-lg border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40 transition-all">
                        Agregar
                      </button>
                    </div>
                  </div>
                )}

                {/* Episodes list */}
                {season.episodes.map((ep, idx) => (
                  <div key={ep.id}>
                    <div className="flex items-center gap-3.5 px-5 py-3 border-b border-white/[0.04] last:border-0">
                      {ep.thumbnail
                        ? <img src={ep.thumbnail} alt="" className="w-14 h-9 object-cover rounded-lg flex-shrink-0 opacity-75" />
                        : <div className="w-14 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 text-white/20 text-sm">▶</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 truncate font-medium">{idx + 1}. {ep.title}</p>
                        {ep.duration_seconds
                          ? <p className="text-[10px] text-white/30 mt-0.5">{Math.floor(ep.duration_seconds / 60)}:{String(ep.duration_seconds % 60).padStart(2, '0')}</p>
                          : ep.youtube_url
                            ? <p className="text-[10px] text-emerald-400/60 mt-0.5 truncate font-mono">{ep.youtube_url}</p>
                            : <p className="text-[10px] text-white/20 mt-0.5">Sin URL</p>
                        }
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ep.youtube_url ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-white/15'}`}
                        title={ep.youtube_url ? 'URL cargada' : 'Sin URL'} />
                      <button onClick={() => editingEpId === ep.id ? setEditingEpId(null) : startEditEp(ep)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all flex-shrink-0 ${
                          editingEpId === ep.id
                            ? 'border-cyan-400/40 text-cyan-400 bg-cyan-400/10'
                            : 'border-white/10 text-white/30 hover:text-white/70 hover:border-white/25'
                        }`}>
                        {editingEpId === ep.id ? 'cerrar' : <i className="iconoir-edit-pencil" aria-hidden="true" />}
                      </button>
                      <button onClick={() => deleteEpisode(ep.id)}
                        className="text-[10px] text-white/20 hover:text-red-400 transition-colors px-1 flex-shrink-0"><i className="iconoir-trash" aria-hidden="true" /></button>
                    </div>

                    {editingEpId === ep.id && (
                      <div className="px-5 py-4 bg-white/[0.02] border-b border-white/[0.05] space-y-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Editar episodio</p>
                        <div>
                          <label className="text-[10px] text-white/25 uppercase tracking-wide block mb-1.5">Título</label>
                          <input value={epEditTitle} onChange={e => setEpEditTitle(e.target.value)}
                            placeholder="Título del episodio"
                            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/25 uppercase tracking-wide block mb-1.5">YouTube URL</label>
                          <input value={epEditUrl} onChange={e => setEpEditUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50" />
                        </div>
                        <div className="flex gap-2.5 justify-end pt-1">
                          <button onClick={() => setEditingEpId(null)}
                            className="text-xs text-white/25 hover:text-white/60 transition-colors">Cancelar</button>
                          <button onClick={() => saveEpEdit(ep.id)} disabled={epEditSaving}
                            className="text-xs font-bold px-5 py-2 rounded-lg border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40 transition-all">
                            {epEditSaving ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {season.episodes.length === 0 && addingEp !== season.id && (
                  <p className="px-5 py-4 text-xs text-white/20">Sin episodios aún. Haz clic en "+ Episodio" para agregar.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
