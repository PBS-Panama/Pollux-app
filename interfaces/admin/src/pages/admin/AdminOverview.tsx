import { useEffect, useState } from 'react'
import api from '../../lib/api'

interface Stats { seafarers: number; companies: number; documents: number; pending_docs: number }

function StatCard({ label, value, icon, accent }: { label: string; value: number | string; icon: string; accent: string }) {
  return (
    <div className={`bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 flex items-start gap-4`}>
      <div className={`text-2xl leading-none mt-0.5`}><i className={icon} aria-hidden="true" /></div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

const MODULES = [
  { label: 'Seafarers', desc: 'View and manage all registered seafarers', icon: 'iconoir-group', to: '/admin/seafarers', ready: true },
  { label: 'Documents', desc: 'Verification queue — review, verify or reject uploaded credentials', icon: 'iconoir-page', to: '/admin/documents', ready: true },
  { label: 'Compliance', desc: 'Platform-wide compliance scores and expiry alerts', icon: 'iconoir-stats-up-square', to: '/admin/compliance', ready: true },
  { label: 'Exams & Centers', desc: 'STCW catalog and training centers management', icon: 'iconoir-graduation-cap', to: '/admin/exams', ready: true },
  { label: 'Config', desc: 'Platform settings and STCW rank compliance catalog viewer', icon: 'iconoir-settings', to: '/admin/config', ready: true },
  { label: 'CV Template', desc: 'Branding and placeholders for the company-facing CV download', icon: 'iconoir-page-star', to: '/admin/cv-template', ready: true },
  { label: 'Companies', desc: 'View and manage all registered companies', icon: 'iconoir-building', to: '/admin/companies', ready: true },
  { label: 'Relationships', desc: 'Company–Seafarer connections and interview pipeline', icon: 'iconoir-link', to: '/admin/relationships', ready: true },
  { label: 'Fleet', desc: 'Vessels and crew rotations across all companies', icon: 'iconoir-compass', to: '/admin/fleet', ready: true },
  { label: 'Learning CMS', desc: 'Create series, seasons and episodes for Learning Record', icon: 'iconoir-book', to: '/admin/learning', ready: true },
  { label: 'Analytics', desc: 'Active users, document volume, platform health', icon: 'iconoir-stats-report', to: '/admin/analytics', ready: true },
]

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Platform Overview</h2>
        <p className="text-white/40 text-sm mt-1">Leto Admin Panel — Sprint 1</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Seafarers" value={stats?.seafarers ?? '—'} icon="iconoir-group" accent="cyan" />
        <StatCard label="Companies" value={stats?.companies ?? '—'} icon="iconoir-building" accent="emerald" />
        <StatCard label="Documents" value={stats?.documents ?? '—'} icon="iconoir-page" accent="violet" />
        <StatCard label="Pending Verification" value={stats?.pending_docs ?? '—'} icon="iconoir-clock" accent="amber" />
      </div>

      {/* Module grid */}
      <h3 className="text-xs font-bold tracking-widest text-white/30 uppercase mb-4">Modules</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MODULES.map((m) => (
          <a key={m.label} href={m.ready ? m.to : undefined}
            onClick={e => { if (!m.ready) e.preventDefault() }}
            className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
              m.ready
                ? 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-cyan-400/30 cursor-pointer'
                : 'border-white/[0.04] bg-white/[0.015] opacity-50 cursor-not-allowed'
            }`}
          >
            <i className={`${m.icon} text-xl leading-none mt-0.5`} aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white/80">{m.label}</p>
                {!m.ready && <span className="text-[9px] font-bold tracking-widest uppercase text-white/25 bg-white/[0.06] px-1.5 py-0.5 rounded">Soon</span>}
              </div>
              <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{m.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
