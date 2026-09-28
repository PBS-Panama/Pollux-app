import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'

interface RelItem {
  id: string
  company_id: string
  company_name: string
  seafarer_id: string
  seafarer_name: string
  seafarer_rank: string | null
  status: string
  notes: string | null
  created_at: string | null
}

interface Page {
  total: number; page: number; pages: number
  status_counts: Record<string, number>
  items: RelItem[]
}

const STATUS_STYLES: Record<string, string> = {
  active:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  pending:  'text-amber-400 bg-amber-400/10 border-amber-400/25',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/25',
  ended:    'text-white/30 bg-white/[0.04] border-white/10',
}

const TABS = [
  { key: 'all',      label: 'All',      icon: 'iconoir-link' },
  { key: 'active',   label: 'Active',   icon: 'iconoir-check-circle' },
  { key: 'pending',  label: 'Pending',  icon: 'iconoir-hourglass' },
  { key: 'rejected', label: 'Rejected', icon: 'iconoir-xmark-circle' },
  { key: 'ended',    label: 'Ended',    icon: 'iconoir-archive' },
]

interface CompanyOption { company_id: string; name: string }
interface SeafarerOption { id: string; first_name: string; last_name: string; rank: string | null }

export default function AdminRelationships() {
  const [data, setData] = useState<Page | null>(null)
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  // Create form
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [seafarers, setSeafarers] = useState<SeafarerOption[]>([])
  const [form, setForm] = useState({ company_id: '', seafarer_id: '', notes: '' })
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/relationships', { params: { status, page, limit: 25 } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [status, page])

  useEffect(() => { load() }, [load])

  const openModal = async () => {
    setShowModal(true)
    setForm({ company_id: '', seafarer_id: '', notes: '' })
    const [c, s] = await Promise.all([
      api.get('/admin/companies', { params: { limit: 50 } }),
      api.get('/admin/seafarers', { params: { limit: 50 } }),
    ])
    setCompanies(c.data.items.map((i: any) => ({ company_id: i.company_id, name: i.name })))
    setSeafarers(s.data.items)
  }

  const createRel = async () => {
    if (!form.company_id || !form.seafarer_id) return
    setCreating(true)
    await api.post('/admin/relationships', {
      company_id: form.company_id,
      seafarer_id: form.seafarer_id,
      notes: form.notes || null,
    })
    setCreating(false)
    setShowModal(false)
    load()
  }

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id)
    await api.patch(`/admin/relationships/${id}`, { status: newStatus })
    setUpdating(null)
    load()
  }

  const deleteRel = async (id: string) => {
    if (!confirm('Delete this relationship?')) return
    await api.delete(`/admin/relationships/${id}`)
    load()
  }

  const total = data?.total ?? 0
  const sc = data?.status_counts ?? {}

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Relationships</h2>
          <p className="text-white/40 text-xs mt-0.5">Company–Seafarer connections and interview pipeline</p>
        </div>
        <button onClick={openModal}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/25 text-cyan-400 hover:bg-cyan-400/20 transition-all">
          + New
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active',   count: sc.active   ?? 0, color: 'text-emerald-400' },
          { label: 'Pending',  count: sc.pending  ?? 0, color: 'text-amber-400'   },
          { label: 'Rejected', count: sc.rejected ?? 0, color: 'text-red-400'     },
          { label: 'Total',    count: total,              color: 'text-white'       },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-5 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setStatus(t.key); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${status === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
            <i className={`${t.icon} mr-1`} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {/* 2026-09-16 (Rick nota 77/79) — overflow-x-auto so narrow viewports scroll the table instead of clipping it */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[11px] text-white/30 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Seafarer</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-white/25 text-xs">Loading…</td></tr>
            )}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-white/25 text-xs">No relationships in this filter</td></tr>
            )}
            {!loading && data?.items.map((r, i) => (
              <tr key={r.id} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                <td className="px-4 py-3">
                  <p className="text-white/75 text-xs font-medium">{r.company_name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white/75 text-xs font-medium">{r.seafarer_name}</p>
                  {r.seafarer_rank && <p className="text-[10px] text-white/30">{r.seafarer_rank}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLES[r.status] ?? STATUS_STYLES.pending}`}>
                    {r.status}
                  </span>
                  {r.notes && <p className="text-[10px] text-white/25 mt-0.5 max-w-[160px] truncate" title={r.notes}>{r.notes}</p>}
                </td>
                <td className="px-4 py-3 text-[11px] text-white/35">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end flex-wrap">
                    {r.status !== 'active' && (
                      <button disabled={updating === r.id} onClick={() => updateStatus(r.id, 'active')}
                        className="text-[10px] font-bold px-2 py-1 rounded border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40">
                        Activate
                      </button>
                    )}
                    {r.status !== 'rejected' && (
                      <button disabled={updating === r.id} onClick={() => updateStatus(r.id, 'rejected')}
                        className="text-[10px] font-bold px-2 py-1 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10 disabled:opacity-40">
                        Reject
                      </button>
                    )}
                    {r.status === 'active' && (
                      <button disabled={updating === r.id} onClick={() => updateStatus(r.id, 'ended')}
                        className="text-[10px] font-bold px-2 py-1 rounded border border-white/15 text-white/40 hover:bg-white/[0.05] disabled:opacity-40">
                        End
                      </button>
                    )}
                    <button onClick={() => deleteRel(r.id)}
                      className="text-[10px] font-bold px-2 py-1 rounded border border-white/10 text-white/25 hover:text-red-400 hover:border-red-400/30">
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/30">Page {data.page} of {data.pages} · {data.total} total</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30">← Prev</button>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-[#0d1a2e] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white">New Relationship</h3>
              <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white/70 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1.5">Company</label>
                <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/50">
                  <option value="">Select company…</option>
                  {companies.map(c => (
                    <option key={c.company_id} value={c.company_id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1.5">Seafarer</label>
                <select value={form.seafarer_id} onChange={e => setForm(f => ({ ...f, seafarer_id: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/50">
                  <option value="">Select seafarer…</option>
                  {seafarers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}{s.rank ? ` — ${s.rank}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1.5">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Interview notes, referral source…"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50 resize-none" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 text-xs py-2 rounded-lg border border-white/10 text-white/40 hover:text-white/70">
                Cancel
              </button>
              <button disabled={!form.company_id || !form.seafarer_id || creating}
                onClick={createRel}
                className="flex-1 text-xs py-2 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 font-semibold hover:bg-cyan-400/25 disabled:opacity-40">
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
