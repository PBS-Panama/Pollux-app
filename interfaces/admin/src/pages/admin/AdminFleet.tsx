import { Fragment, useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'

interface Vessel {
  id: string; name: string; vessel_type: string | null; flag_country: string | null
  imo_number: string | null; mmsi_number: string | null; crew_capacity: number | null
  is_active: boolean; created_at: string; company_id: string; company_name: string
  current_crew_count: number
}

interface Assignment {
  id: string; seafarer_id: string; seafarer_name: string; rank: string
  embark_date: string | null; disembark_date: string | null; status: string; notes: string | null
}

interface Page { total: number; page: number; pages: number; items: Vessel[] }

// `new Date('2026-09-15')` parses as UTC midnight — toLocaleDateString() then renders it
// in the browser's local timezone, which can shift the displayed day back by one west of
// UTC. Force local-midnight parsing instead (same fix as MyFleet.js's formatDate).
const formatDate = (s: string | null) => s ? new Date(s + 'T00:00:00').toLocaleDateString() : '—'

function AssignmentsPanel({ vesselId }: { vesselId: string }) {
  const [items, setItems] = useState<Assignment[] | null>(null)

  useEffect(() => {
    api.get(`/admin/fleet/${vesselId}/assignments`).then((r) => setItems(r.data.items))
  }, [vesselId])

  if (items === null) return <div className="px-4 py-4 text-xs text-white/30">Loading…</div>
  if (items.length === 0) return <div className="px-4 py-4 text-xs text-white/30">No rotations recorded for this vessel.</div>

  return (
    <div className="px-4 py-3 space-y-1.5">
      {items.map((a) => (
        <div key={a.id} className="flex items-center justify-between text-xs bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
          <div>
            <span className="text-white/80 font-medium">{a.seafarer_name}</span>
            <span className="text-white/35"> — {a.rank}</span>
          </div>
          <div className="flex items-center gap-3 text-white/35">
            <span>
              {formatDate(a.embark_date)}
              {' → '}
              {a.disembark_date ? formatDate(a.disembark_date) : 'permanente'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              a.status === 'aboard' || a.status === 'scheduled'
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-white/30 bg-white/[0.05]'
            }`}>{a.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminFleet() {
  const [data, setData] = useState<Page | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/fleet', { params: { search, page, limit: 25 } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [search, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Fleet</h2>
        <p className="text-white/40 text-xs mt-0.5">{data?.total ?? '—'} vessels registered — read-only, for future assistance reference</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search vessel or company…"
          className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 w-64" />
      </div>

      {/* 2026-09-16 (Rick nota 77/79) — overflow-x-auto so narrow viewports scroll the table instead of clipping it */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[11px] text-white/35 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Vessel</th>
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Type / Flag</th>
              <th className="px-4 py-3 text-left">IMO / MMSI</th>
              <th className="px-4 py-3 text-left">Aboard now</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-white/30">Loading…</td></tr>}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-white/30">No vessels found</td></tr>
            )}
            {!loading && data?.items.map((v, i) => (
              <Fragment key={v.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                  className={`border-b border-white/[0.04] cursor-pointer transition-colors hover:bg-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                        <i className="iconoir-compass text-sm" aria-hidden="true" />
                      </div>
                      <p className="font-medium text-white/85">{v.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50">{v.company_name}</td>
                  <td className="px-4 py-3 text-white/50">
                    {v.vessel_type ?? '—'}{v.flag_country ? ` · ${v.flag_country}` : ''}
                  </td>
                  <td className="px-4 py-3 text-white/35 text-xs">
                    {v.imo_number ?? '—'}{v.mmsi_number ? ` / ${v.mmsi_number}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      v.current_crew_count > 0
                        ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                        : 'text-white/35 bg-white/[0.04] border-white/10'
                    }`}>{v.current_crew_count}</span>
                  </td>
                </tr>
                {expandedId === v.id && (
                  <tr className="bg-black/20">
                    <td colSpan={5} className="p-0"><AssignmentsPanel vesselId={v.id} /></td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/35">Page {data.page} of {data.pages} · {data.total} total</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30">← Prev</button>
            <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
