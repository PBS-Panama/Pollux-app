import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import NotificationBell from '../../components/NotificationBell'

const NAV = [
  { to: '/admin', label: 'Overview', icon: 'iconoir-view-grid', exact: true },
  { section: 'Seafarer Ops' },
  { to: '/admin/seafarers', label: 'Seafarers', icon: 'iconoir-group' },
  { to: '/admin/documents', label: 'Documents', icon: 'iconoir-page' },
  { to: '/admin/review-queue', label: 'Review Queue', icon: 'iconoir-clipboard-check' },
  { to: '/admin/embarkations', label: 'Embarques', icon: 'iconoir-sea-waves' },
  { to: '/admin/ocr-feedback', label: 'OCR Feedback', icon: 'iconoir-brain' },
  { to: '/admin/compliance', label: 'Compliance', icon: 'iconoir-stats-up-square' },
  { to: '/admin/exams', label: 'Exams & Centers', icon: 'iconoir-graduation-cap' },
  { section: 'Company Ops' },
  { to: '/admin/companies', label: 'Companies', icon: 'iconoir-building' },
  { to: '/admin/relationships', label: 'Relationships', icon: 'iconoir-link' },
  { to: '/admin/fleet', label: 'Fleet', icon: 'iconoir-compass' },
  { section: 'Platform Ops' },
  { to: '/admin/learning', label: 'Learning CMS', icon: 'iconoir-book' },
  { to: '/admin/config', label: 'Config', icon: 'iconoir-settings' },
  { to: '/admin/cv-template', label: 'CV Template', icon: 'iconoir-page-star' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'iconoir-stats-report' },
]

export default function AdminShell() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080e1c] text-white font-sans">

      {/* ── Sidebar ───────────────────────────────────────────────
          2026-09-16 (Rick nota 77/79, confirmed live at 744px): fixed
          w-60 never shrank, so under ~900px the sidebar ate ~half the
          viewport and the content to its right had nowhere to go (no
          horizontal scroll on the table either — see AdminEmbarkations).
          Mobile-first here (unlike the rest of this desktop-oriented
          panel): narrow/icon-only by default, full w-60 with labels from
          `lg:` up. No JS toggle — this is a width-driven collapse, not a
          user-controlled one. */}
      <aside className="flex flex-col w-14 lg:w-60 flex-shrink-0 border-r border-white/[0.07] bg-[#0b1220] transition-[width]">

        {/* Logo */}
        <div className="flex items-center justify-center lg:justify-start gap-2.5 px-2 lg:px-5 h-14 border-b border-white/[0.07] flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF] flex-shrink-0" />
          {/* Brand text only — interfaces/leto/, /company/ and pb-leto stay untouched, this is just the visible label */}
          <span className="hidden lg:inline font-bold text-sm tracking-wide text-white/90">Pollux</span>
          <span className="hidden lg:inline ml-auto text-[10px] font-bold tracking-widest text-cyan-400/70 uppercase bg-cyan-400/10 border border-cyan-400/20 rounded px-1.5 py-0.5">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
          {NAV.map((item, i) => {
            if ('section' in item) {
              return (
                <p key={i} className="hidden lg:block px-3 pt-4 pb-1 text-[10px] font-bold tracking-widest text-white/25 uppercase">
                  {item.section}
                </p>
              )
            }
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.exact}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-cyan-400/10 text-cyan-400 font-semibold'
                      : 'text-white/50 hover:text-white/90 hover:bg-white/[0.04]'
                  }`
                }
              >
                <i className={`${item.icon} text-base leading-none flex-shrink-0`} aria-hidden="true" />
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User info */}
        <div className="flex-shrink-0 border-t border-white/[0.07] px-2 lg:px-4 py-3 flex items-center justify-center lg:justify-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/80 truncate">{user?.email ?? 'Admin'}</p>
            <p className="text-[10px] text-white/30">Administrator</p>
          </div>
          <button onClick={handleLogout} title="Logout"
            className="flex-shrink-0 text-white/25 hover:text-red-400 transition-colors text-sm">
            <i className="iconoir-log-out" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Topbar */}
        <header className="flex items-center h-14 px-6 border-b border-white/[0.07] bg-[#0b1220] flex-shrink-0">
          <h1 className="text-sm font-semibold text-white/60">Admin Panel</h1>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <span className="text-xs text-white/30">Ricardo Pimentel</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" title="Connected" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
