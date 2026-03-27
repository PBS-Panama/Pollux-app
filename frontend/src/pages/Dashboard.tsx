/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Dashboard.tsx — Authenticated User Dashboard                       ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  WORKFLOW:                                                           ║
 * ║  User arrives here AFTER successful login/register from LandingPage. ║
 * ║  This page is wrapped by ProtectedRoute (requires valid JWT).        ║
 * ║                                                                      ║
 * ║  LAYOUT:                                                             ║
 * ║  ┌────────────────────────────────────────────────────┐              ║
 * ║  │  Leto Nav Bar  │  Panel de Marino • user@email.com │              ║
 * ║  ├────────────────────────────────────────────────────┤              ║
 * ║  │                                                    │              ║
 * ║  │         Leto Crewing Module (iframe → /app/)       │              ║
 * ║  │         Full document management, crew profiles,   │              ║
 * ║  │         PDF viewer, certificates, etc.             │              ║
 * ║  │                                                    │              ║
 * ║  └────────────────────────────────────────────────────┘              ║
 * ║                                                                      ║
 * ║  INTEGRATION:                                                        ║
 * ║  • Crewing Module runs internally in Docker (port 8080)              ║
 * ║  • Proxy routes `/app/` requests securely to the module.             ║
 * ║  • Embedded via <iframe> for seamless UX under Leto branding         ║
 * ║  • "Cerrar sesión" clears JWT and redirects to LandingPage           ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export default function Dashboard() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <iframe
        src="/app/"
        className="w-full h-full border-none"
        title="Leto Crewing Module"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  )
}

