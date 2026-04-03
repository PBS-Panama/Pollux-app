// Leto: Company dashboard home — shown when role === 'company'
// Displays fleet overview, quick actions, and activity

const React = require('react');
const { default: Button } = require('leto/components/Button');
const api = require('leto/common/apiClient');
const { VesselIcon, getVesselColor } = require('leto/common/vesselIcons');
const styles = require('./styles');

const getLetoUser = () => {
    try {
        const data = localStorage.getItem('leto-user');
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

const CompanyHome = () => {
    const user = React.useMemo(() => getLetoUser(), []);
    const [vessels, setVessels] = React.useState([]);
    const [loadingVessels, setLoadingVessels] = React.useState(true);

    // Fetch company vessels from API
    React.useEffect(() => {
        if (!user?.company_id) { setLoadingVessels(false); return; }
        (async () => {
            try {
                const res = await fetch(`/api/companies/${user.company_id}/vessels`, {
                    headers: { Authorization: `Bearer ${getAuthToken()}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setVessels(data);
                }
            } catch { /* silent */ }
            setLoadingVessels(false);
        })();
    }, [user]);

    const companyName = user?.company_name || user?.email?.split('@')[0] || 'Empresa';

    return (
        <div style={{ padding: '2rem 3rem', color: '#e0e0e0', overflowY: 'auto', height: '100%' }}>
            {/* Welcome header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', fontWeight: 600, color: '#fff', marginBottom: '0.3rem' }}>
                    Bienvenido, {companyName}
                </h1>
                <p style={{ color: '#8899aa', fontSize: '0.9rem' }}>
                    {vessels.length} embarcación(es) registrada(s)
                </p>
            </div>

            {/* Fleet section */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Mi Flota</h2>
                </div>

                {loadingVessels ? (
                    <div style={{ color: '#556677', fontSize: '0.9rem', padding: '2rem', textAlign: 'center' }}>Cargando flota...</div>
                ) : vessels.length === 0 ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '12px', padding: '2rem', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚢</div>
                        <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Sin embarcaciones registradas</div>
                        <div style={{ color: '#556677', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Registre su primera embarcación para comenzar a gestionar su tripulación.
                        </div>
                        <Button href={'#/my-profile'} style={{
                            display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '6px',
                            background: 'rgba(0,210,211,0.15)', color: '#00d2d3', fontSize: '0.85rem',
                            fontWeight: 600, border: '1px solid rgba(0,210,211,0.3)', textDecoration: 'none',
                        }}>
                            Agregar embarcaciones
                        </Button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {vessels.map((v) => {
                            const vc = getVesselColor(v.vessel_type);
                            return (
                                <div key={v.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: '10px', padding: '1rem 1.2rem',
                                    borderLeft: `3px solid ${vc}`,
                                    transition: 'background 0.15s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                    <VesselIcon type={v.vessel_type} size={'3rem'} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>{v.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#8899aa', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                            {v.vessel_type && <span style={{ background: `${vc}20`, color: vc, padding: '1px 8px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 600 }}>{v.vessel_type}</span>}
                                            {v.flag_state && <span>{v.flag_state}</span>}
                                            {v.imo_number && <span>IMO {v.imo_number}</span>}
                                        </div>
                                    </div>
                                    {v.gross_tonnage && (
                                        <div style={{
                                            background: 'rgba(255,255,255,0.06)', borderRadius: '6px',
                                            padding: '0.3rem 0.7rem', fontSize: '0.8rem', fontWeight: 600,
                                            color: '#8899aa', whiteSpace: 'nowrap', flexShrink: 0,
                                        }}>
                                            {v.gross_tonnage.toLocaleString()} GT
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick actions */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, marginBottom: '1rem' }}>
                    Acciones rápidas
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                        { icon: '🔍', label: 'Buscar tripulación', desc: 'Explore la base de datos de marinos', href: '#/company-crewdb' },
                        { icon: '📅', label: 'Ver calendario', desc: 'Eventos, entrevistas y crew changes', href: '#/company-calendar' },
                        { icon: '👤', label: 'Mi perfil', desc: 'Datos de la empresa y flota', href: '#/my-profile' },
                        { icon: '⚙️', label: 'Configuración', desc: 'Preferencias y ajustes', href: '#/settings' },
                    ].map((a) => (
                        <Button key={a.label} href={a.href} style={{
                            display: 'block', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '10px', padding: '1rem', textDecoration: 'none', color: 'inherit',
                            transition: 'all 0.15s', cursor: 'pointer',
                        }}>
                            <div style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{a.icon}</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', marginBottom: '0.2rem' }}>{a.label}</div>
                            <div style={{ fontSize: '0.75rem', color: '#556677' }}>{a.desc}</div>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Helper to get auth token from Zustand localStorage
function getAuthToken() {
    try {
        const data = localStorage.getItem('leto-auth');
        if (data) return JSON.parse(data)?.state?.accessToken || '';
    } catch { /* silent */ }
    return '';
}

module.exports = CompanyHome;
