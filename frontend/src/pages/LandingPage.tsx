/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  LandingPage.tsx — Public Entry Point & Marketing Page              ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║                                                                      ║
 * ║  WORKFLOW:                                                           ║
 * ║  This is the FIRST page every user sees at "/".                      ║
 * ║  It serves dual purposes:                                            ║
 * ║                                                                      ║
 * ║  A) MARKETING — Scrollable landing page with:                        ║
 * ║     • Hero section (CTA buttons)                                     ║
 * ║     • Features grid (why Leto?)                                      ║
 * ║     • How-it-works steps (01→04)                                     ║
 * ║     • Dual CTA cards (Marino vs Empresa)                             ║
 * ║     • Footer (PBS branding)                                          ║
 * ║                                                                      ║
 * ║  B) AUTH MODALS — Blur overlay pattern:                              ║
 * ║     • "Soy Marino" → opens RegisterModal (3-step flow)              ║
 * ║     • "Acceso Clientes" → opens LoginModal                          ║
 * ║     • Landing stays visible but blurred (backdrop-filter: blur 14px) ║
 * ║     • Click outside or ✕ button closes the modal                    ║
 * ║                                                                      ║
 * ║  NEXT IN FLOW:                                                       ║
 * ║  After successful login/register → navigates to /dashboard           ║
 * ║                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react'
import LoginModal from '../components/LoginModal'
import RegisterModal from '../components/RegisterModal'

type Modal = null | 'login' | 'register'

const features = [
  { icon: '🛡️', title: 'Perfil Verificado', desc: 'Tu identidad y certificaciones verificadas bajo estándares STCW internacionales.' },
  { icon: '📄', title: 'Gestión de Documentos', desc: 'Alertas automáticas antes de que venza tu CoC, certificado médico o GMDSS.' },
  { icon: '🧭', title: 'Agente Guía Personal', desc: 'Analiza tu rango y te indica exactamente qué documentos subir — sin adivinar.' },
  { icon: '⚓', title: 'Visibilidad Global', desc: 'Tu perfil es descubrible por navieras internacionales que buscan tripulación.' },
]

const steps = [
  { n: '01', t: 'Crea tu perfil', d: 'Regístrate con tu información básica y selecciona tu rango. Menos de 5 minutos.' },
  { n: '02', t: 'Guía de documentación', d: 'El agente lógico analiza tu puesto e indica los documentos STCW requeridos.' },
  { n: '03', t: 'Conecta con navieras', d: 'Tu perfil se activa y es visible para empresas verificadas.' },
  { n: '04', t: 'Gestiona tu carrera', d: 'Contratos, rotaciones y vencimientos — todo centralizado.' },
]

export default function LandingPage() {
  const [modal, setModal] = useState<Modal>(null)

  const openRegister = () => setModal('register')
  const openLogin = () => setModal('login')
  const closeModal = () => setModal(null)

  return (
    <div className="min-h-screen bg-navy text-ice" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ─── Blur overlay modal ─── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(6, 15, 30, 0.75)', backdropFilter: 'blur(14px)' }}
          onClick={closeModal}
        >
          <div onClick={e => e.stopPropagation()} className="w-full" style={{ maxWidth: modal === 'register' ? '34rem' : '28rem' }}>
            {modal === 'login'
              ? <LoginModal onClose={closeModal} />
              : <RegisterModal onClose={closeModal} onSwitchToLogin={openLogin} />
            }
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-[5%] py-5 bg-navy/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-2 font-grotesk text-xl font-bold">
          <span className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_10px_#00F0FF]" />Leto
        </div>
        <div className="flex gap-3">
          <button onClick={openLogin}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-steel text-ice hover:border-cyan hover:text-cyan transition-colors">
            Acceso Clientes
          </button>
          <button onClick={openRegister}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-cyan text-navy hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] transition-all">
            Soy Marino
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-[5%] py-28 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,240,255,0.07) 0%, transparent 70%)' }} />
        <div className="inline-flex items-center gap-2 bg-cyan/10 border border-cyan/20 rounded-full px-4 py-1.5 text-cyan text-xs tracking-widest uppercase mb-6">
          🌊 MLC 2006 Compliant Platform
        </div>
        <h1 className="font-grotesk text-5xl md:text-7xl font-bold leading-tight max-w-4xl mx-auto mb-6">
          La Plataforma que Conecta el{' '}
          <span className="text-cyan">Talento Marítimo</span>{' '}
          con el Mundo
        </h1>
        <p className="text-ice/60 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Leto digitaliza el ciclo de vida completo de la tripulación — desde la contratación hasta la gestión de documentos — con cumplimiento normativo desde el primer día.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <button onClick={openRegister}
            className="px-8 py-3 rounded-lg bg-cyan text-navy font-semibold text-base hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all">
            Registrarme como Marino
          </button>
          <button onClick={openLogin}
            className="px-8 py-3 rounded-lg border border-white/20 text-ice font-semibold text-base hover:border-white/40 transition-colors">
            Soy una Empresa Naviera
          </button>
        </div>
        <div className="flex justify-center gap-12 mt-16 flex-wrap">
          {[['150+','Rangos Certificados'],['STCW','Validación Automática'],['24/7','Disponibilidad Global'],['100%','MLC 2006 Compliant']].map(([v,l])=>(
            <div key={l} className="text-center">
              <div className="font-grotesk text-3xl font-bold text-cyan">{v}</div>
              <div className="text-ice/40 text-xs mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-[5%] py-20">
        <div className="text-cyan text-xs tracking-widest uppercase mb-3">¿Por qué Leto?</div>
        <h2 className="font-grotesk text-4xl font-bold mb-3">Todo lo que tu carrera necesita</h2>
        <p className="text-ice/50 mb-12 max-w-lg leading-relaxed">Deja de gestionar certificados en carpetas y correos. Leto pone tu perfil frente a quienes contratan.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(f=>(
            <div key={f.title} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-6 hover:border-cyan/25 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-cyan/10 flex items-center justify-center text-xl mb-4">{f.icon}</div>
              <h3 className="font-grotesk font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-ice/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-[5%] py-20 bg-black/20 border-y border-white/[0.05]">
        <div className="text-cyan text-xs tracking-widest uppercase mb-3">El Proceso</div>
        <h2 className="font-grotesk text-4xl font-bold mb-12">De cero a contratado en 3 pasos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map(s=>(
            <div key={s.n}>
              <div className="font-grotesk text-4xl font-bold text-cyan/25 mb-3">{s.n}</div>
              <h3 className="font-semibold mb-2">{s.t}</h3>
              <p className="text-sm text-ice/50 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DUAL CTA */}
      <section className="px-[5%] py-24 text-center">
        <h2 className="font-grotesk text-4xl font-bold mb-3">¿Quién eres tú en el mar?</h2>
        <p className="text-ice/50 mb-12">Leto sirve a ambos lados del ecosistema marítimo</p>
        <div className="flex justify-center gap-6 flex-wrap">
          {[
            { icon:'⚓', badge:'MARINO / SEAFARER', badgeColor:'gold', title:'Soy Tripulante', desc:'Gestiona tu perfil, documentos y conecta con las mejores navieras del mundo.', btn:'Crear mi Perfil', action: openRegister, primary: true },
            { icon:'🏢', badge:'EMPRESA NAVIERA', badgeColor:'steel', title:'Soy una Empresa', desc:'Encuentra y contrata tripulación calificada con documentación verificada.', btn:'Acceso Empresarial', action: openLogin, primary: false },
          ].map(c=>(
            <div key={c.title} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 w-72 hover:border-cyan/30 hover:-translate-y-1 transition-all">
              <div className="text-4xl mb-3">{c.icon}</div>
              <div className={`inline-block text-xs font-bold border rounded px-2 py-0.5 mb-3 ${c.badgeColor==='gold'?'text-gold border-gold/30 bg-gold/10':'text-steel border-steel/30 bg-steel/10'}`}>
                {c.badge}
              </div>
              <h3 className="font-grotesk font-semibold text-lg mb-2">{c.title}</h3>
              <p className="text-ice/50 text-sm mb-5 leading-relaxed">{c.desc}</p>
              <button onClick={c.action}
                className={`block w-full font-semibold py-2.5 rounded-lg text-sm transition-all ${c.primary?'bg-cyan text-navy hover:shadow-[0_0_16px_rgba(0,240,255,0.35)]':'border border-steel/40 text-ice/70 hover:border-ice/40'}`}>
                {c.btn}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-[5%] py-6 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 font-grotesk font-bold text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan shadow-[0_0_8px_#00F0FF]" />
          Leto <span className="text-ice/30 font-normal ml-1.5">by PBS</span>
        </div>
        <p className="text-ice/30 text-xs">© 2026 PB Trading Solutions. MLC 2006 Compliant.</p>
      </footer>
    </div>
  )
}
