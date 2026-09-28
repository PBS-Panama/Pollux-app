import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'

interface FeedbackItem {
  id: string
  documentId: string
  docKey: string | null
  docName: string | null
  seafarerId: string | null
  aiStatus: string | null
  aiConfidence: number | null
  aiFlags: string[]
  aiIdentifiedAs: string | null
  humanDecision: string
  rejectionReason: string | null
  aiCorrect: boolean | null
  createdAt: string | null
}

interface DocStat {
  docKey: string | null
  total: number
  correct: number
  wrong: number
  approved: number
  rejected: number
  agreementRate: number | null
}

interface FeedbackPage {
  total: number
  page: number
  pages: number
  items: FeedbackItem[]
  stats: DocStat[]
}

const AI_STATUS_BADGE: Record<string, string> = {
  probable_valid: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/25',
  suspicious:     'text-amber-400 bg-amber-400/10 border border-amber-400/25',
  likely_fake:    'text-red-500 bg-red-500/10 border border-red-500/30',
  wrong_document: 'text-red-400 bg-red-400/10 border border-red-400/25',
  error:          'text-white/30 bg-white/[0.04] border border-white/10',
}

const HUMAN_BADGE: Record<string, string> = {
  verified: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/25',
  rejected: 'text-red-400 bg-red-400/10 border border-red-400/25',
}

function AgreementBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-white/25 text-xs">—</span>
  const color = rate >= 80 ? 'bg-emerald-400' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden" style={{ minWidth: 60 }}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-semibold text-white/70 w-10 text-right">{rate}%</span>
    </div>
  )
}

export default function AdminOcrFeedback() {
  const [data, setData] = useState<FeedbackPage | null>(null)
  const [page, setPage] = useState(1)
  const [filterKey, setFilterKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'log' | 'stats'>('stats')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/ocr-feedback', { params: { page, limit: 50, doc_key: filterKey } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [page, filterKey])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [filterKey])

  const stats = data?.stats ?? []
  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">OCR Feedback Log</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Cada decisión del admin alimenta el conocimiento del agente Claude en análisis futuros.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg overflow-hidden border border-white/10 flex">
            <button onClick={() => setActiveTab('stats')}
              className={`px-4 py-1.5 text-xs font-semibold transition-all ${activeTab === 'stats' ? 'bg-cyan-400/15 text-cyan-400' : 'text-white/40 hover:text-white/70'}`}>
              <i className="iconoir-stats-report mr-1" aria-hidden="true" /> Stats por tipo
            </button>
            <button onClick={() => setActiveTab('log')}
              className={`px-4 py-1.5 text-xs font-semibold transition-all border-l border-white/10 ${activeTab === 'log' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
              <i className="iconoir-list mr-1" aria-hidden="true" /> Log ({total})
            </button>
          </div>
        </div>
      </div>

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <div>
          {stats.length === 0 && !loading && (
            <div className="text-center py-16 text-white/25">
              <div className="text-4xl mb-3"><i className="iconoir-brain" aria-hidden="true" /></div>
              <p className="text-sm">Sin datos aún — el log se alimenta cuando el admin toma decisiones en la Review Queue.</p>
            </div>
          )}
          {stats.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] text-white/30 text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Tipo de documento</th>
                    <th className="px-4 py-3 text-center">Total casos</th>
                    <th className="px-4 py-3 text-center">Aprobados</th>
                    <th className="px-4 py-3 text-center">Rechazados</th>
                    <th className="px-4 py-3 text-center">IA correcta</th>
                    <th className="px-4 py-3 text-center">IA incorrecta</th>
                    <th className="px-4 py-3 text-left" style={{ minWidth: 160 }}>Tasa de acierto IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {stats.map((s, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setFilterKey(s.docKey || ''); setActiveTab('log') }}
                          className="text-white/80 hover:text-cyan-400 transition-colors font-medium text-left"
                        >
                          {s.docKey || '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-white/60">{s.total}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-400 font-semibold">{s.approved}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-red-400 font-semibold">{s.rejected}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-400">{s.correct}</td>
                      <td className="px-4 py-3 text-center text-red-400">{s.wrong}</td>
                      <td className="px-4 py-3">
                        <AgreementBar rate={s.agreementRate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Log tab */}
      {activeTab === 'log' && (
        <div>
          {/* Filter */}
          <div className="mb-4 flex gap-3 items-center">
            <input
              value={filterKey}
              onChange={e => setFilterKey(e.target.value)}
              placeholder="Filtrar por tipo de documento..."
              className="flex-1 max-w-sm bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/40"
            />
            {filterKey && (
              <button onClick={() => setFilterKey('')}
                className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded border border-white/10">
                ✕ Limpiar
              </button>
            )}
            {loading && <span className="text-white/30 text-xs">Cargando...</span>}
          </div>

          {items.length === 0 && !loading && (
            <div className="text-center py-16 text-white/25">
              <div className="text-4xl mb-3"><i className="iconoir-list" aria-hidden="true" /></div>
              <p className="text-sm">Sin entradas en el log{filterKey ? ` para "${filterKey}"` : ''}.</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {items.map(item => {
              const aiClass = AI_STATUS_BADGE[item.aiStatus ?? ''] ?? 'text-white/30 bg-white/[0.04] border border-white/10'
              const humanClass = HUMAN_BADGE[item.humanDecision] ?? 'text-white/40 bg-white/[0.04] border border-white/10'
              const correct = item.aiCorrect === true
              const wrong = item.aiCorrect === false
              const unknown = item.aiCorrect === null

              return (
                <div key={item.id} className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-white/85 text-sm truncate">{item.docName || '—'}</span>
                        {item.docKey && (
                          <span className="text-[10px] text-white/30 bg-white/[0.04] border border-white/10 px-1.5 py-0.5 rounded">
                            {item.docKey}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* AI verdict */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${aiClass}`}>
                          IA: {item.aiStatus ?? '—'}
                          {item.aiConfidence != null && ` (${Math.round(item.aiConfidence * 100)}%)`}
                        </span>
                        <span className="text-white/20 text-xs">→</span>
                        {/* Human decision */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${humanClass}`}>
                          Admin: {item.humanDecision}
                        </span>
                        {/* Agreement indicator */}
                        {!unknown && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${correct ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 'text-red-400 bg-red-400/10 border border-red-400/20'}`}>
                            {correct ? '✓ IA acertó' : '✗ IA falló'}
                          </span>
                        )}
                        {item.aiIdentifiedAs && (
                          <span className="text-[10px] text-amber-400/70">
                            identificado como: {item.aiIdentifiedAs}
                          </span>
                        )}
                      </div>
                      {item.rejectionReason && (
                        <p className="mt-1 text-xs text-red-400/70 italic">
                          Motivo: <span className="not-italic text-red-400">{item.rejectionReason}</span>
                        </p>
                      )}
                      {item.aiFlags && item.aiFlags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.aiFlags.map((f, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded text-white/35">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-white/25">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-PA', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        }) : '—'}
                      </span>
                    </div>
                  </div>
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
      )}
    </div>
  )
}
