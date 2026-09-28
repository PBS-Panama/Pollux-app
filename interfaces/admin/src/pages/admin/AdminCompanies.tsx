import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'

interface Company {
  id: string; email: string; is_active: boolean; created_at: string
  company_id: string; name: string; country: string | null
  fleet_size: number; is_verified: boolean; email_verified: boolean
  company_status: 'pending' | 'approved' | 'rejected'; rejection_reason: string | null
}

interface Page { total: number; page: number; pages: number; items: Company[] }

const STATUS_STYLE: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/25',
}

export default function AdminCompanies() {
  const [data, setData] = useState<Page | null>(null)
  const [search, setSearch] = useState('')
  const [verified, setVerified] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const fetch = useCallback(() => {
    setLoading(true)
    api.get('/admin/companies', { params: { search, verified: verified || undefined, status: status || undefined, page, limit: 25 } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [search, verified, status, page])

  useEffect(() => { fetch() }, [fetch])

  const toggleVerified = async (co: Company) => {
    setActionId(co.id)
    await api.patch(`/admin/companies/${co.id}/status`, { is_verified: !co.is_verified })
    fetch()
    setActionId(null)
  }

  const approve = async (co: Company) => {
    setActionId(co.id)
    await api.patch(`/admin/companies/${co.id}/approve`)
    fetch()
    setActionId(null)
  }

  const reject = async (co: Company) => {
    const reason = window.prompt(`Reject ${co.name} — reason (shown to the company):`)
    if (!reason || !reason.trim()) return
    setActionId(co.id)
    await api.patch(`/admin/companies/${co.id}/reject`, { reason: reason.trim() })
    fetch()
    setActionId(null)
  }

  // Manual bridge for when the verification email doesn't arrive — same
  // effect as the company clicking the link (2026-09-14, Gmail API sender).
  const verifyEmail = async (co: Company) => {
    setActionId(co.id)
    await api.patch(`/admin/companies/${co.id}/verify-email`)
    fetch()
    setActionId(null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Companies</h2>
          <p className="text-white/40 text-xs mt-0.5">{data?.total ?? '—'} registered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search name or email…"
          className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 w-56" />
        <select value={verified} onChange={e => { setVerified(e.target.value); setPage(1) }}
          className="bg-[#0b1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-cyan-400/50">
          <option value="">All</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="bg-[#0b1220] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-cyan-400/50">
          <option value="">Any approval status</option>
          <option value="pending">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {/* 2026-09-16 (Rick nota 77/79) — overflow-x-auto so narrow viewports scroll the table instead of clipping it */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[11px] text-white/35 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-left">Fleet size</th>
              <th className="px-4 py-3 text-left">Verified</th>
              <th className="px-4 py-3 text-left">Approval</th>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-left">Registered</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-white/30">Loading…</td></tr>}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-white/30">No companies found</td></tr>
            )}
            {!loading && data?.items.map((co, i) => (
              <tr key={co.id}
                className={`border-b border-white/[0.04] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-400/15 border border-violet-400/20 flex items-center justify-center text-xs font-bold text-violet-400 flex-shrink-0">
                      {co.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white/85">{co.name}</p>
                      <p className="text-[11px] text-white/35">{co.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/50">{co.country ?? '—'}</td>
                <td className="px-4 py-3 text-white/50">{co.fleet_size} vessels</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${co.is_verified ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' : 'text-white/35 bg-white/[0.04] border-white/10'}`}>
                    {co.is_verified ? <><i className="iconoir-check-circle mr-1" aria-hidden="true" />Verified</> : 'Unverified'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border capitalize ${STATUS_STYLE[co.company_status] ?? STATUS_STYLE.pending}`}
                    title={co.company_status === 'rejected' ? (co.rejection_reason ?? undefined) : undefined}>
                    {co.company_status}
                  </span>
                  {!co.email_verified && (
                    <span className="ml-1.5 inline-flex items-center gap-1">
                      <span className="text-[10px] text-white/35">(email unverified)</span>
                      <button disabled={actionId === co.id} onClick={() => verifyEmail(co)}
                        title="Confirm this company's email manually — use when the verification email didn't arrive"
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition-all disabled:opacity-40">
                        Verify email
                      </button>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${co.is_active ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' : 'text-red-400 bg-red-400/10 border-red-400/25'}`}>
                    {co.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/35 text-xs">
                  {co.created_at ? new Date(co.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {co.company_status !== 'approved' && (
                      <button disabled={actionId === co.id} onClick={() => approve(co)}
                        className="text-xs font-semibold px-2.5 py-1 rounded border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 transition-all disabled:opacity-40">
                        Approve
                      </button>
                    )}
                    {co.company_status !== 'rejected' && (
                      <button disabled={actionId === co.id} onClick={() => reject(co)}
                        className="text-xs font-semibold px-2.5 py-1 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40">
                        Reject
                      </button>
                    )}
                    <button disabled={actionId === co.id} onClick={() => toggleVerified(co)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded border transition-all disabled:opacity-40 ${
                        co.is_verified
                          ? 'border-amber-400/30 text-amber-400 hover:bg-amber-400/10'
                          : 'border-white/15 text-white/50 hover:bg-white/10'
                      }`}>
                      {co.is_verified ? 'Revoke' : 'Verify'}
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
          <p className="text-xs text-white/35">Page {data.page} of {data.pages} · {data.total} total</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30">← Prev</button>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/50 hover:text-white disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
