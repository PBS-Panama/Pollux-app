import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'

interface DocItem {
  id: string; name: string; cert_code: string | null; doc_key: string | null
  issued_date: string | null; expiry_date: string | null; status: string
  verification_status: string; rejection_reason: string | null
  uploaded_at: string | null; seafarer_id: string
  seafarer_name: string; seafarer_rank: string | null; seafarer_fleet: string | null
}

interface Page { total: number; page: number; pages: number; items: DocItem[] }

const VS_STYLES: Record<string, string> = {
  verified:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  rejected:     'text-red-400 bg-red-400/10 border-red-400/25',
  under_review: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  pending:      'text-white/40 bg-white/[0.05] border-white/10',
}

const TABS = [
  { key: 'pending',      label: 'Pending',      icon: 'iconoir-clock' },
  { key: 'under_review', label: 'Under Review',  icon: 'iconoir-search' },
  { key: 'verified',     label: 'Verified',      icon: 'iconoir-check-circle' },
  { key: 'rejected',     label: 'Rejected',      icon: 'iconoir-xmark-circle' },
  { key: 'all',          label: 'All',           icon: 'iconoir-page' },
]

export default function AdminDocuments() {
  const [data, setData] = useState<Page | null>(null)
  const [vstatus, setVstatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetch = useCallback(() => {
    setLoading(true)
    api.get('/admin/documents', { params: { vstatus, search, page, limit: 30 } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [vstatus, search, page])

  useEffect(() => { fetch() }, [fetch])

  const verify = async (docId: string, action: string, reason?: string) => {
    setVerifying(docId)
    await api.patch(`/admin/documents/${docId}/verify`, { action, reason })
    fetch()
    setVerifying(null)
    setRejectingId(null)
    setRejectReason('')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Document Verification Queue</h2>
        <p className="text-white/40 text-xs mt-0.5">{data?.total ?? '—'} documents in current filter</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-5 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setVstatus(t.key); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${vstatus === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
            <i className={`${t.icon} mr-1`} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-5">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by seafarer name or document name…"
          className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 w-72" />
      </div>

      {/* Table */}
      {/* 2026-09-16 (Rick nota 77/79) — overflow-x-auto so narrow viewports scroll the table instead of clipping it */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-[11px] text-white/35 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Seafarer</th>
              <th className="px-4 py-3 text-left">Document</th>
              <th className="px-4 py-3 text-left">Dates</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Uploaded</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-white/30">Loading…</td></tr>}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-white/30">No documents in this queue</td></tr>
            )}
            {!loading && data?.items.map((doc, i) => (
              <tr key={doc.id} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}>
                {/* Seafarer */}
                <td className="px-4 py-3">
                  <p className="font-medium text-white/80 text-xs">{doc.seafarer_name || '—'}</p>
                  <p className="text-[10px] text-white/35">{doc.seafarer_rank ?? ''} {doc.seafarer_fleet ? `· ${doc.seafarer_fleet}` : ''}</p>
                </td>

                {/* Document */}
                <td className="px-4 py-3">
                  <p className="text-white/75 text-xs font-medium">{doc.name}</p>
                  {doc.cert_code && <p className="text-[10px] font-mono text-white/30">{doc.cert_code}</p>}
                  {doc.rejection_reason && (
                    <p className="text-[10px] text-red-400/70 mt-0.5">Reason: {doc.rejection_reason}</p>
                  )}
                </td>

                {/* Dates */}
                <td className="px-4 py-3 text-[11px] text-white/40">
                  {doc.issued_date && <p>Issued: {doc.issued_date}</p>}
                  {doc.expiry_date && <p>Expires: {doc.expiry_date}</p>}
                </td>

                {/* Verification status */}
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${VS_STYLES[doc.verification_status]}`}>
                    {doc.verification_status}
                  </span>
                </td>

                {/* Uploaded */}
                <td className="px-4 py-3 text-[11px] text-white/35">
                  {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  {rejectingId === doc.id ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason…" autoFocus
                        className="bg-white/[0.05] border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-red-400/40 w-36" />
                      <button disabled={!rejectReason || verifying === doc.id}
                        onClick={() => verify(doc.id, 'rejected', rejectReason)}
                        className="text-[11px] font-bold px-2 py-1 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10 disabled:opacity-40">OK</button>
                      <button onClick={() => setRejectingId(null)} className="text-[11px] text-white/25 hover:text-white/60">✕</button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      {doc.verification_status !== 'verified' && (
                        <button disabled={verifying === doc.id} onClick={() => verify(doc.id, 'verified')} title="Verify"
                          className="text-[11px] font-bold px-2 py-1 rounded border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40"><i className="iconoir-check-circle" aria-hidden="true" /></button>
                      )}
                      {doc.verification_status !== 'rejected' && (
                        <button onClick={() => { setRejectingId(doc.id); setRejectReason('') }} title="Reject"
                          className="text-[11px] font-bold px-2 py-1 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10"><i className="iconoir-xmark-circle" aria-hidden="true" /></button>
                      )}
                      {doc.verification_status !== 'under_review' && (
                        <button disabled={verifying === doc.id} onClick={() => verify(doc.id, 'under_review')} title="Flag for review"
                          className="text-[11px] font-bold px-2 py-1 rounded border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 disabled:opacity-40"><i className="iconoir-search" aria-hidden="true" /></button>
                      )}
                    </div>
                  )}
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
