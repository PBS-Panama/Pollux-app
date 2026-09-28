import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

interface Seafarer {
  id: string; email: string; is_active: boolean; created_at: string
  first_name: string | null; last_name: string | null; nationality: string | null
  rank: string | null; fleet_category: string | null; is_available: boolean
}

interface Page { total: number; page: number; pages: number; items: Seafarer[] }

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  suspended: 'text-red-400 bg-red-400/10 border-red-400/25',
}

const FLEET_COLORS: Record<string, string> = {
  merchant: 'text-cyan-400', offshore: 'text-violet-400',
  fishing: 'text-amber-400', yacht: 'text-sky-400', national: 'text-slate-400',
}

export default function AdminSeafarers() {
  const navigate = useNavigate()
  const [data, setData] = useState<Page | null>(null)
  const [search, setSearch] = useState('')
  const [rank, setRank] = useState('')
  const [fleet, setFleet] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetch = useCallback(() => {
    setLoading(true)
    api.get('/admin/seafarers', { params: { search, rank, fleet, status, page, limit: 25 } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [search, rank, fleet, status, page])

  useEffect(() => { fetch() }, [fetch])

  const toggleStatus = async (sf: Seafarer) => {
    setActionId(sf.id)
    await api.patch(`/admin/seafarers/${sf.id}/status`, { is_active: !sf.is_active })
    fetch()
    setActionId(null)
  }

  const deleteSeafarer = async (sf: Seafarer) => {
    const name = sf.first_name || sf.last_name ? `${sf.first_name ?? ''} ${sf.last_name ?? ''}`.trim() : sf.email
    if (!window.confirm(`Permanently delete ${name}? This cannot be undone.`)) return
    setActionId(sf.id)
    await api.delete(`/admin/seafarers/${sf.id}`)
    fetch()
    setActionId(null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Seafarers</h2>
          <p className="text-white/40 text-xs mt-0.5">{data?.total ?? '—'} registered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search name or email…"
          className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 w-56" />
        <input value={rank} onChange={e => { setRank(e.target.value); setPage(1) }}
          placeholder="Rank…"
          className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 w-40" />
        <select value={fleet} onChange={e => { setFleet(e.target.value); setPage(1) }}
          className="bg-[#0b1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-cyan-400/50">
          <option value="">All fleets</option>
          {['merchant','offshore','fishing','yacht','national'].map(f =>
            <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>
          )}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="bg-[#0b1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-cyan-400/50">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      {/* 2026-09-16 (Rick nota 77/79) — overflow-x-auto so narrow viewports scroll the table instead of clipping it */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[11px] text-white/35 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Seafarer</th>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Fleet</th>
              <th className="px-4 py-3 text-left">Nationality</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Registered</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-white/30 text-sm">Loading…</td></tr>
            )}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-white/30 text-sm">No seafarers found</td></tr>
            )}
            {!loading && data?.items.map((sf, i) => (
              <tr key={sf.id}
                className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                onClick={() => navigate(`/admin/seafarers/${sf.id}`)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
                      {(sf.first_name?.[0] ?? sf.email[0]).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white/85">
                        {sf.first_name || sf.last_name ? `${sf.first_name ?? ''} ${sf.last_name ?? ''}`.trim() : '—'}
                      </p>
                      <p className="text-[11px] text-white/35">{sf.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/60">{sf.rank ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold capitalize ${FLEET_COLORS[sf.fleet_category ?? ''] ?? 'text-white/40'}`}>
                    {sf.fleet_category ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/50">{sf.nationality ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${STATUS_COLORS[sf.is_active ? 'active' : 'suspended']}`}>
                    {sf.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/35 text-xs">
                  {sf.created_at ? new Date(sf.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      disabled={actionId === sf.id}
                      onClick={() => toggleStatus(sf)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded border transition-all disabled:opacity-40 ${
                        sf.is_active
                          ? 'border-red-400/30 text-red-400 hover:bg-red-400/10'
                          : 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10'
                      }`}>
                      {sf.is_active ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      disabled={actionId === sf.id}
                      onClick={() => deleteSeafarer(sf)}
                      title="Permanently delete"
                      className="text-xs font-bold px-2.5 py-1 rounded border border-white/10 text-white/25 hover:text-red-400 hover:border-red-400/30 transition-all disabled:opacity-40">
                      <i className="iconoir-trash" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/35">Page {data.page} of {data.pages} · {data.total} total</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30 transition-colors">← Prev</button>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30 transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
