import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'

interface Doc {
  id: string; name: string; cert_code: string | null; doc_key: string | null
  issued_date: string | null; expiry_date: string | null; status: string
  verification_status: string; rejection_reason: string | null; uploaded_at: string | null
}

interface Profile {
  id: string; email: string; is_active: boolean; created_at: string
  first_name: string | null; last_name: string | null; nationality: string | null
  date_of_birth: string | null; phone: string | null; rank: string | null
  fleet_category: string | null; years_experience: number; bio: string | null
  is_available: boolean; coc_type: string | null; coc_issuing_country: string | null
  coc_tonnage_limit: string | null; cop_tanker_type: string | null; cop_tanker_level: string | null
  flag_endorsements: string[] | null; special_endorsements: string[] | null
  documents: Doc[]
}

const VS_STYLES: Record<string, string> = {
  verified: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/25',
  under_review: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  pending: 'text-white/40 bg-white/[0.05] border-white/10',
}

const VS_ICONS: Record<string, string> = {
  verified: 'iconoir-check-circle', rejected: 'iconoir-xmark-circle', under_review: 'iconoir-search', pending: 'iconoir-clock',
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest text-white/25 uppercase mb-0.5">{label}</p>
      <p className="text-sm text-white/75">{value || '—'}</p>
    </div>
  )
}

export default function AdminSeafarerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = () => {
    setLoading(true)
    api.get(`/admin/seafarers/${id}`).then(r => setProfile(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const toggleStatus = async () => {
    if (!profile) return
    setToggling(true)
    await api.patch(`/admin/seafarers/${profile.id}/status`, { is_active: !profile.is_active })
    load()
    setToggling(false)
  }

  const verify = async (docId: string, action: string, reason?: string) => {
    setVerifying(docId)
    await api.patch(`/admin/documents/${docId}/verify`, { action, reason })
    load()
    setVerifying(null)
    setRejectingId(null)
    setRejectReason('')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-white/30">Loading…</div>
  if (!profile) return <div className="flex items-center justify-center h-64 text-white/30">Not found</div>

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/admin/seafarers')}
        className="text-xs text-white/35 hover:text-white/70 mb-5 flex items-center gap-1.5 transition-colors">
        ← Back to Seafarers
      </button>

      {/* Header */}
      <div className="flex items-start gap-5 mb-7 p-5 bg-white/[0.03] border border-white/[0.07] rounded-xl">
        <div className="w-12 h-12 rounded-full bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center text-lg font-bold text-cyan-400 flex-shrink-0">
          {(profile.first_name?.[0] ?? profile.email[0]).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-white">{fullName}</h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${profile.is_active ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' : 'text-red-400 bg-red-400/10 border-red-400/25'}`}>
              {profile.is_active ? 'Active' : 'Suspended'}
            </span>
            {profile.is_available && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded border text-cyan-400 bg-cyan-400/10 border-cyan-400/25">Available</span>
            )}
          </div>
          <p className="text-sm text-white/40 mt-0.5">{profile.email}</p>
          <p className="text-xs text-white/30 mt-1">{profile.rank ?? 'No rank'} · {profile.fleet_category ?? 'No fleet'} · {profile.nationality ?? 'Unknown nationality'}</p>
        </div>
        <button disabled={toggling} onClick={toggleStatus}
          className={`text-xs font-semibold px-3 py-1.5 rounded border transition-all disabled:opacity-40 flex-shrink-0 ${
            profile.is_active
              ? 'border-red-400/30 text-red-400 hover:bg-red-400/10'
              : 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10'
          }`}>
          {profile.is_active ? 'Suspend account' : 'Activate account'}
        </button>
      </div>

      {/* Profile fields */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 p-5 bg-white/[0.03] border border-white/[0.07] rounded-xl mb-5">
        <Field label="Date of birth" value={profile.date_of_birth} />
        <Field label="Phone" value={profile.phone} />
        <Field label="Years experience" value={profile.years_experience} />
        <Field label="CoC type" value={profile.coc_type} />
        <Field label="CoC issuing country" value={profile.coc_issuing_country} />
        <Field label="CoC tonnage limit" value={profile.coc_tonnage_limit} />
        <Field label="Tanker type" value={profile.cop_tanker_type} />
        <Field label="Tanker level" value={profile.cop_tanker_level} />
        <Field label="Registered" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : undefined} />
      </div>
      {profile.bio && (
        <div className="p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl mb-5">
          <p className="text-[10px] font-bold tracking-widest text-white/25 uppercase mb-1">Bio</p>
          <p className="text-sm text-white/60 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Documents */}
      <h3 className="text-xs font-bold tracking-widest text-white/30 uppercase mb-3">
        Documents ({profile.documents.length})
      </h3>
      {profile.documents.length === 0 && (
        <p className="text-sm text-white/25 py-6 text-center">No documents uploaded</p>
      )}
      <div className="space-y-2">
        {profile.documents.map(doc => (
          <div key={doc.id} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-white/80">{doc.name}</p>
                {doc.cert_code && <span className="text-[10px] text-white/35 font-mono">{doc.cert_code}</span>}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${VS_STYLES[doc.verification_status]}`}>
                  <i className={`${VS_ICONS[doc.verification_status]} mr-1`} aria-hidden="true" /> {doc.verification_status}
                </span>
              </div>
              <p className="text-xs text-white/35 mt-0.5">
                {doc.issued_date ? `Issued: ${doc.issued_date}` : ''}
                {doc.expiry_date ? ` · Expires: ${doc.expiry_date}` : ''}
                {doc.rejection_reason ? ` · Reason: ${doc.rejection_reason}` : ''}
              </p>
            </div>

            {/* Actions */}
            {rejectingId === doc.id ? (
              <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Rejection reason…" autoFocus
                  className="bg-white/[0.05] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-red-400/50 w-44" />
                <button disabled={!rejectReason || verifying === doc.id}
                  onClick={() => verify(doc.id, 'rejected', rejectReason)}
                  className="text-xs px-2 py-1 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10 disabled:opacity-40">Confirm</button>
                <button onClick={() => setRejectingId(null)} className="text-xs text-white/30 hover:text-white/60">✕</button>
              </div>
            ) : (
              <div className="flex gap-1.5 flex-shrink-0">
                {doc.verification_status !== 'verified' && (
                  <button disabled={verifying === doc.id}
                    onClick={() => verify(doc.id, 'verified')}
                    className="text-[11px] font-bold px-2 py-1 rounded border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40"><i className="iconoir-check-circle mr-1" aria-hidden="true" />Verify</button>
                )}
                {doc.verification_status !== 'rejected' && (
                  <button onClick={() => { setRejectingId(doc.id); setRejectReason('') }}
                    className="text-[11px] font-bold px-2 py-1 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10"><i className="iconoir-xmark-circle mr-1" aria-hidden="true" />Reject</button>
                )}
                {doc.verification_status !== 'under_review' && (
                  <button disabled={verifying === doc.id}
                    onClick={() => verify(doc.id, 'under_review')}
                    className="text-[11px] font-bold px-2 py-1 rounded border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 disabled:opacity-40"><i className="iconoir-search mr-1" aria-hidden="true" />Flag</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
