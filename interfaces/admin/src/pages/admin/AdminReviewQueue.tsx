import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../../lib/api'

interface AiVerdict {
  status: string
  confidence: number
  flags: string[]
  identified_as?: string
  seafarer_review_requested?: boolean
}

interface ReviewItem {
  id: string
  name: string
  docKey: string | null
  seafarerId: string
  seafarerCode: string | null
  firstName: string | null
  lastName: string | null
  verificationStatus: string
  aiVerdict: AiVerdict | null
  uploadedAt: string | null
  savedName: string | null
  mimeType: string | null
  rejectionReason?: string | null
  verifiedAt?: string | null
}

interface Page { total: number; page: number; pages: number; mode: string; items: ReviewItem[] }

const STATUS_BADGE: Record<string, string> = {
  wrong_document: 'text-red-400 bg-red-400/10 border border-red-400/25',
  suspicious:     'text-amber-400 bg-amber-400/10 border border-amber-400/25',
  likely_fake:    'text-red-500 bg-red-500/10 border border-red-500/30',
  under_review:   'text-amber-400 bg-amber-400/10 border border-amber-400/25',
  verified:       'text-emerald-400 bg-emerald-400/10 border border-emerald-400/25',
  rejected:       'text-red-400 bg-red-400/10 border border-red-400/25',
}

const STATUS_LABEL: Record<string, string> = {
  wrong_document: 'Doc. incorrecto',
  suspicious:     'Sospechoso',
  likely_fake:    'Posible falsificación',
  under_review:   'En revisión',
  verified:       'Aprobado',
  rejected:       'Rechazado',
}

const STATUS_ICON: Record<string, string> = {
  wrong_document: 'iconoir-prohibition',
  suspicious:     'iconoir-warning-triangle',
  likely_fake:    'iconoir-warning-circle',
  under_review:   'iconoir-search',
  verified:       'iconoir-check-circle',
  rejected:       'iconoir-xmark-circle',
}

interface FileView { url: string; isImage: boolean }

export default function AdminReviewQueue() {
  const [mode, setMode] = useState<'active' | 'audit'>('active')
  const [data, setData] = useState<Page | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // File viewer state
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [fileView, setFileView] = useState<FileView | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const blobUrlRef = useRef<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/documents/pending-review', { params: { page, limit: 25, mode } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [page, mode])

  useEffect(() => { load() }, [load])

  // Reset page when switching mode
  useEffect(() => { setPage(1) }, [mode])

  // Cleanup blob URL on unmount
  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
  }, [])

  const act = async (docId: string, vs: string, reason?: string) => {
    setActingId(docId)
    await api.patch(`/admin/documents/${docId}/verdict`, {
      verification_status: vs,
      rejection_reason: reason || null,
    })
    load()
    setActingId(null)
    setRejectingId(null)
    setRejectReason('')
    if (viewingId === docId) { closeViewer() }
  }

  const closeViewer = () => {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    setFileView(null)
    setViewingId(null)
  }

  const toggleViewer = async (item: ReviewItem) => {
    if (viewingId === item.id) { closeViewer(); return }
    closeViewer()
    setViewingId(item.id)
    setLoadingFile(true)
    try {
      const res = await api.get<Blob>(`/admin/documents/${item.id}/file`, { responseType: 'blob' })
      const blob = res.data
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const mime = item.mimeType || blob.type || ''
      setFileView({ url, isImage: mime.startsWith('image/') })
    } catch {
      setFileView(null)
      setViewingId(null)
    }
    setLoadingFile(false)
  }

  const total = data?.total ?? 0

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header + mode toggle */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-white">Review Queue</h2>
        {mode === 'active' && total > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-400 border border-amber-400/30">
            {total} pendiente{total !== 1 ? 's' : ''}
          </span>
        )}
        <div className="ml-auto flex items-center rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => setMode('active')}
            className={`px-4 py-1.5 text-xs font-semibold transition-all ${
              mode === 'active'
                ? 'bg-amber-400/20 text-amber-400'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setMode('audit')}
            className={`px-4 py-1.5 text-xs font-semibold transition-all border-l border-white/10 ${
              mode === 'audit'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            <i className="iconoir-archive mr-1" aria-hidden="true" /> Auditoría ({mode === 'audit' ? total : '…'})
          </button>
        </div>
      </div>

      {loading && <p className="text-white/40 text-sm">Cargando...</p>}

      {!loading && total === 0 && mode === 'active' && (
        <div className="text-center py-16 text-white/30">
          <div className="text-4xl mb-3"><i className="iconoir-check-circle" aria-hidden="true" /></div>
          <p className="text-sm">No hay documentos pendientes de revisión.</p>
        </div>
      )}

      {!loading && total === 0 && mode === 'audit' && (
        <div className="text-center py-16 text-white/30">
          <div className="text-4xl mb-3"><i className="iconoir-archive" aria-hidden="true" /></div>
          <p className="text-sm">No hay casos decididos todavía.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {(data?.items ?? []).map(item => {
          const av = item.aiVerdict
          const seafarerRequested = av?.seafarer_review_requested === true
          const verdictStatus = item.verificationStatus
          const badgeClass = STATUS_BADGE[verdictStatus] ?? STATUS_BADGE[av?.status ?? ''] ?? 'text-white/40 bg-white/[0.05] border border-white/10'
          const badgeLabel = STATUS_LABEL[verdictStatus] ?? STATUS_LABEL[av?.status ?? ''] ?? verdictStatus
          const badgeIcon = STATUS_ICON[verdictStatus] ?? STATUS_ICON[av?.status ?? '']
          const confPct = av?.confidence != null ? Math.round(av.confidence * 100) + '%' : '—'
          const seafarerName = [item.firstName, item.lastName].filter(Boolean).join(' ') || '—'
          const isViewing = viewingId === item.id
          const isAudit = mode === 'audit'

          return (
            <div key={item.id} className={`border rounded-xl p-5 ${
              isAudit
                ? 'bg-white/[0.02] border-white/[0.06] opacity-80'
                : 'bg-white/[0.04] border-white/10'
            }`}>

              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-white text-sm">{item.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}`}>
                      {badgeIcon && <i className={`${badgeIcon} mr-1`} aria-hidden="true" />}{badgeLabel}
                    </span>
                    {seafarerRequested && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/25">
                        <i className="iconoir-user mr-1" aria-hidden="true" />Seafarer solicitó revisión
                      </span>
                    )}
                    {isAudit && item.verifiedAt && (
                      <span className="px-2 py-0.5 rounded text-[10px] text-white/30 bg-white/[0.04] border border-white/10">
                        Decidido {new Date(item.verifiedAt).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="text-white/50 text-xs">
                    {seafarerName}
                    {item.seafarerCode && <span className="ml-1 text-white/30">· {item.seafarerCode}</span>}
                    {item.uploadedAt && (
                      <span className="ml-2 text-white/25">
                        Subido {new Date(item.uploadedAt).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {/* Rejection reason — visible in audit mode */}
                  {isAudit && item.rejectionReason && (
                    <div className="mt-1 text-xs text-red-400/80 italic">
                      Motivo de rechazo: <span className="not-italic font-medium text-red-400">{item.rejectionReason}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-white/40 text-xs">
                    Confianza: <span className="text-white/70 font-semibold">{confPct}</span>
                  </div>
                  {item.savedName && (
                    <button
                      onClick={() => toggleViewer(item)}
                      disabled={loadingFile && !isViewing}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                        isViewing
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                          : 'bg-white/[0.06] text-white/60 border-white/10 hover:bg-white/[0.10] hover:text-white/80'
                      } disabled:opacity-40`}
                    >
                      {isViewing ? '↑ Ocultar' : <><i className="iconoir-eye mr-1" aria-hidden="true" />Ver archivo</>}
                    </button>
                  )}
                </div>
              </div>

              {/* AI verdict details */}
              {av && (
                <div className="bg-white/[0.03] rounded-lg p-3 mb-4 text-xs text-white/60 space-y-1">
                  {av.identified_as && (
                    <div>
                      <span className="text-white/40">Identificado como: </span>
                      <span className="text-amber-400 font-semibold">{av.identified_as}</span>
                    </div>
                  )}
                  {av.flags && av.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {av.flags.map((f, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-white/50">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* File viewer */}
              {isViewing && (
                <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/30">
                  {loadingFile && (
                    <div className="flex items-center justify-center h-32 text-white/30 text-sm">
                      Cargando archivo...
                    </div>
                  )}
                  {!loadingFile && fileView && (
                    fileView.isImage ? (
                      <img src={fileView.url} alt={item.name} className="w-full max-h-[36rem] object-contain bg-black/20" style={{ display: 'block' }} />
                    ) : (
                      <iframe src={fileView.url} title={item.name} className="w-full border-0" style={{ height: '36rem' }} />
                    )
                  )}
                  {!loadingFile && !fileView && (
                    <div className="flex items-center justify-center h-20 text-red-400/60 text-xs">
                      No se pudo cargar el archivo
                    </div>
                  )}
                </div>
              )}

              {/* Action row — only in active mode */}
              {!isAudit && (
                rejectingId === item.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Motivo del rechazo — visible para el seafarer..."
                      className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-red-400/50"
                    />
                    <button
                      onClick={() => act(item.id, 'rejected', rejectReason)}
                      disabled={actingId === item.id}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                    >
                      Confirmar rechazo
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason('') }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40 hover:text-white/70 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(item.id, 'verified')}
                      disabled={actingId === item.id}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                    >
                      <i className="iconoir-check-circle mr-1" aria-hidden="true" />Aprobar
                    </button>
                    <button
                      onClick={() => setRejectingId(item.id)}
                      disabled={actingId === item.id}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                    >
                      <i className="iconoir-xmark-circle mr-1" aria-hidden="true" />Rechazar
                    </button>
                  </div>
                )
              )}

              {/* Audit mode: read-only decision stamp */}
              {isAudit && (
                <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg border w-fit ${
                  verdictStatus === 'verified'
                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                    : 'text-red-400 bg-red-400/10 border-red-400/25'
                }`}>
                  {verdictStatus === 'verified'
                    ? <><i className="iconoir-check-circle mr-1" aria-hidden="true" />Caso cerrado — Aprobado</>
                    : <><i className="iconoir-xmark-circle mr-1" aria-hidden="true" />Caso cerrado — Rechazado</>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex gap-2 justify-center mt-6">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === p ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
