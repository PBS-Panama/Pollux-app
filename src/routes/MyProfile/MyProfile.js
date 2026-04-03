// Leto Crewing Module: My Profile page
// Clones MetaDetails layout exactly, swaps mock data for real user data
// Left = MetaPreview (editable), Right = DocumentsList (required docs by rank)

const React = require('react');
const classnames = require('classnames');
const { VerticalNavBar, HorizontalNavBar, SearchBar } = require('leto/components');
const { default: Button } = require('leto/components/Button');
const MetaLinks = require('leto/components/MetaPreview/MetaLinks');
const ActionButton = require('leto/components/MetaPreview/ActionButton');
const CategoryBar = require('leto/routes/MetaDetails/VideosList/SeasonsBar');
const metaPreviewStyles = require('leto/components/MetaPreview/styles');
const styles = require('./styles');
const api = require('leto/common/apiClient');
const { CREW_DOC_LABELS, CREW_DOC_CATEGORIES, RANK_REQUIRED_DOCS, getComplianceStatus, getExpiryStatus, CREW_ALL_DOCS } = require('leto/common/crewDocData');
const { VesselIcon, getVesselColor } = require('leto/common/vesselIcons');

const SEAFARER_PROFILE_TABS = [
    { id: 'companyDashboard', label: 'Dashboard', icon: 'crew-dashboard', href: '#/company-dashboard' },
    { id: 'companyCrewdb', label: 'Crew Database', icon: 'crew-person', href: '#/company-crewdb' },
    { id: 'myfiles', label: 'My Files', icon: 'crew-folder', href: '#/myfiles' },
    { id: 'calendar', label: 'Mi Calendario', icon: 'crew-anchor', href: '#/calendar' },
    { id: 'dashboard', label: 'My Schedule', icon: 'crew-ship', href: '#/dashboard' },
    { id: 'myexams', label: 'My Exams', icon: 'crew-exam', href: '#/myexams' },
    { id: 'myprofile', label: 'My Profile', icon: 'crew-person', href: '#/my-profile' },
    { id: 'settings', label: 'Settings', icon: 'crew-settings', href: '#/settings' },
];

const COMPANY_PROFILE_TABS = [
    { id: 'companyDashboard', label: 'Dashboard', icon: 'crew-dashboard', href: '#/company-dashboard' },
    { id: 'companyCrewdb', label: 'Crew Database', icon: 'crew-person', href: '#/company-crewdb' },
    { id: 'companyCalendar', label: 'Calendario', icon: 'crew-calendar', href: '#/company-calendar' },
    { id: 'myprofile', label: 'Mi Flota', icon: 'crew-ship', href: '#/my-profile' },
    { id: 'settings', label: 'Settings', icon: 'crew-settings', href: '#/settings' },
];

// Dark dropdown for inline forms — uses fixed positioning to escape overflow:hidden parents
const DarkDropdown = ({ value, onChange, options, placeholder }) => {
    const [open, setOpen] = React.useState(false);
    const btnRef = React.useRef(null);
    const dropRef = React.useRef(null);
    const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });

    React.useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (btnRef.current && btnRef.current.contains(e.target)) return;
            if (dropRef.current && dropRef.current.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const toggleOpen = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
        }
        setOpen(!open);
    };

    const selected = options.find((o) => o.value === value);

    return React.createElement('div', { style: { position: 'relative', width: '100%' } },
        React.createElement('button', {
            ref: btnRef, type: 'button', onClick: toggleOpen,
            style: { width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: selected ? '#fff' : '#888', fontSize: '0.8rem', outline: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
        }, React.createElement('span', null, selected ? selected.label : placeholder), React.createElement('span', { style: { fontSize: '0.6rem', color: '#556677' } }, open ? '▲' : '▼')),
        open && React.createElement('div', {
            ref: dropRef,
            style: { position: 'fixed', zIndex: 9999, top: pos.top, left: pos.left, width: pos.width, background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', maxHeight: '12rem', overflowY: 'auto' }
        }, options.map((o) => React.createElement('button', {
            key: o.value, type: 'button',
            onClick: () => { onChange(o.value); setOpen(false); },
            style: { display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.7rem', fontSize: '0.8rem', border: 'none', background: value === o.value ? 'rgba(0,210,211,0.15)' : 'transparent', color: value === o.value ? '#00d2d3' : '#d0d0d0', cursor: 'pointer' }
        }, o.label)))
    );
};

const STATUS_STYLES = {
    uploaded: { background: 'rgba(46,204,113,0.25)', color: '#2ecc71', label: 'Valid' },
    expiring: { background: 'rgba(241,196,15,0.25)', color: '#f1c40f', label: 'Expiring' },
    expired: { background: 'rgba(231,76,60,0.25)', color: '#e74c3c', label: 'Expired' },
    missing: { background: 'rgba(255,255,255,0.06)', color: '#95a5a6', label: 'Missing' },
    permanent: { background: 'rgba(149,165,166,0.15)', color: '#95a5a6', label: 'No Expiry' },
};

const PROFILE_STORAGE_KEY = 'leto-profile-extra';

const getLetoUser = () => {
    try {
        const data = localStorage.getItem('leto-user');
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};
const loadProfileExtra = () => {
    try {
        const data = localStorage.getItem(PROFILE_STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch { return {}; }
};
const saveProfileExtra = (data) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
};

// ─── Inline editable text (for City/Exp) ───────────────────────────
const EditableText = ({ value, onChange, placeholder }) => {
    const [editing, setEditing] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
    if (editing) {
        return React.createElement('input', {
            ref, value: value || '',
            onChange: (e) => onChange(e.target.value),
            placeholder, onBlur: () => setEditing(false),
            onKeyDown: (e) => { if (e.key === 'Enter') setEditing(false); },
            style: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,210,211,0.4)', borderRadius: '3px', color: '#fff', fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit', padding: '0.1rem 0.4rem', outline: 'none', width: Math.max(8, (value || placeholder || '').length * 0.6) + 'rem' },
        });
    }
    return React.createElement('span', {
        onClick: () => setEditing(true),
        style: { cursor: 'pointer', color: value ? undefined : '#556677', fontStyle: value ? undefined : 'italic' },
    }, value || placeholder);
};

// ─── Editable MetaLinks (for Languages/Vessels/Companies) ──────────
const EditableMetaLinks = ({ label, value, onChange, placeholder }) => {
    const [editing, setEditing] = React.useState(false);
    const ref = React.useRef(null);
    const tags = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
    React.useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
    if (editing) {
        return (
            <div className={metaPreviewStyles['meta-links']} style={{ marginTop: '1.5rem' }}>
                <div style={{ textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>{label}</div>
                <input ref={ref} value={value || ''} onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder} onBlur={() => setEditing(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false); }}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.4rem 0.7rem', borderRadius: '4px', border: '1px solid rgba(0,210,211,0.3)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }} />
            </div>
        );
    }
    if (tags.length === 0) {
        return (
            <div className={metaPreviewStyles['meta-links']} style={{ marginTop: '1.5rem', cursor: 'pointer' }} onClick={() => setEditing(true)}>
                <div style={{ textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ color: '#556677', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    <span style={{ color: '#00d2d3', fontStyle: 'normal', marginRight: '0.3rem' }}>+</span>{placeholder}
                </div>
            </div>
        );
    }
    return (
        <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
            <MetaLinks className={metaPreviewStyles['meta-links']} label={label} links={tags.map((t) => ({ label: t }))} />
        </div>
    );
};

// ─── Editable About Me ─────────────────────────────────────────────
const EditableAbout = ({ value, onChange, placeholder }) => {
    const [editing, setEditing] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
    if (editing) {
        return React.createElement('textarea', {
            ref, value: value || '', onChange: (e) => onChange(e.target.value),
            placeholder, rows: 4, onBlur: () => setEditing(false),
            style: { width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid rgba(0,210,211,0.3)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1rem', fontFamily: 'inherit', lineHeight: '2em', outline: 'none', resize: 'vertical', minHeight: '4rem' },
        });
    }
    if (!value || !value.trim()) {
        return (
            <div onClick={() => setEditing(true)} style={{ color: '#556677', fontStyle: 'italic', fontSize: '0.9rem', cursor: 'pointer' }}>
                <span style={{ color: '#00d2d3', fontStyle: 'normal', marginRight: '0.3rem' }}>+</span>{placeholder}
            </div>
        );
    }
    return <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>{value}</div>;
};

// ─── Unsaved modal ─────────────────────────────────────────────────
const UnsavedModal = ({ onDiscard, onCancel }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
        <div style={{ background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem 2rem', maxWidth: '24rem', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>Cambios sin guardar</div>
            <div style={{ fontSize: '0.9rem', color: '#d0d0d0', lineHeight: 1.5, marginBottom: '1.2rem' }}>Tienes cambios que no has guardado. ¿Deseas descartarlos?</div>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button onClick={onCancel} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d0d0d0', fontSize: '0.85rem', cursor: 'pointer' }}>No, volver</button>
                <button onClick={onDiscard} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: 'rgba(231,76,60,0.2)', color: '#e74c3c', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Sí, descartar</button>
            </div>
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════
// CompanyProfile — shown when role === 'company'
// ═══════════════════════════════════════════════════════════════════
const VESSEL_TYPES = [
    'Oil Tanker', 'Chemical Tanker', 'LNG Carrier', 'LPG Carrier',
    'Container Ship', 'Bulk Carrier', 'General Cargo',
    'PSV (Platform Supply Vessel)', 'AHTS (Anchor Handling)',
    'Tug', 'Barge', 'FPSO', 'Offshore Drill Ship',
    'Ro-Ro', 'Car Carrier', 'Cruise Ship', 'Ferry',
    'Cable Layer', 'Dredger', 'Icebreaker',
];

const FLAG_STATES = [
    'Panama', 'Liberia', 'Marshall Islands', 'Hong Kong', 'Singapore',
    'Bahamas', 'Malta', 'Cyprus', 'Bermuda', 'Antigua and Barbuda',
    'Norway (NIS)', 'Denmark (DIS)', 'United Kingdom', 'Greece',
    'Japan', 'South Korea', 'China', 'United States',
];

const CompanyProfile = () => {
    const user = React.useMemo(() => getLetoUser(), []);
    const [companyVessels, setCompanyVessels] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [showAddForm, setShowAddForm] = React.useState(false);
    // Auto-open add form when fleet is empty
    React.useEffect(() => {
        if (!loading && companyVessels.length === 0) setShowAddForm(true);
    }, [loading, companyVessels.length]);
    const [addingVessel, setAddingVessel] = React.useState(false);
    const [newVessel, setNewVessel] = React.useState({ name: '', imo_number: '', vessel_type: '', flag_state: '', gross_tonnage: '' });
    const setVesselField = (k, v) => setNewVessel((prev) => ({ ...prev, [k]: v }));

    const [addError, setAddError] = React.useState('');

    const addVesselToFleet = async () => {
        if (!newVessel.name.trim()) return;
        setAddingVessel(true);
        setAddError('');
        try {
            const token = getAuthToken();
            // Get company_id — from user or fetch from /me
            let companyId = user?.company_id;
            if (!companyId) {
                const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                if (meRes.ok) {
                    const me = await meRes.json();
                    companyId = me.company_id;
                    // Update localStorage for next time
                    const lu = JSON.parse(localStorage.getItem('leto-user') || '{}');
                    lu.company_id = companyId;
                    lu.company_name = me.company_name;
                    localStorage.setItem('leto-user', JSON.stringify(lu));
                }
            }
            if (!companyId) { setAddError('No se encontró la empresa.'); setAddingVessel(false); return; }

            const res = await fetch(`/api/companies/${companyId}/vessels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: newVessel.name,
                    imo_number: newVessel.imo_number || null,
                    vessel_type: newVessel.vessel_type || null,
                    flag_state: newVessel.flag_state || null,
                    gross_tonnage: newVessel.gross_tonnage ? parseInt(newVessel.gross_tonnage) : null,
                }),
            });
            if (res.ok) {
                const vessel = await res.json();
                setCompanyVessels((prev) => [...prev, vessel]);
                setNewVessel({ name: '', imo_number: '', vessel_type: '', flag_state: '', gross_tonnage: '' });
                setShowAddForm(false);
            } else {
                const err = await res.json().catch(() => ({}));
                setAddError(err.detail || 'Error al agregar embarcación.');
            }
        } catch (e) {
            setAddError('Error de conexión.');
        }
        setAddingVessel(false);
    };

    // Editable company fields
    const savedData = React.useMemo(() => loadProfileExtra(), []);
    const [companyAddress, setCompanyAddress] = React.useState(savedData.companyAddress || '');
    const [companyWebsite, setCompanyWebsite] = React.useState(savedData.companyWebsite || '');
    const [companyAbout, setCompanyAbout] = React.useState(savedData.companyAbout || '');
    const [savedSnapshot, setSavedSnapshot] = React.useState(savedData);

    const isDirty = React.useMemo(() => {
        return companyAddress !== (savedSnapshot.companyAddress || '') ||
            companyWebsite !== (savedSnapshot.companyWebsite || '') ||
            companyAbout !== (savedSnapshot.companyAbout || '');
    }, [companyAddress, companyWebsite, companyAbout, savedSnapshot]);

    const [showModal, setShowModal] = React.useState(false);
    const pendingHash = React.useRef(null);

    React.useEffect(() => {
        if (!isDirty) return;
        const onHashChange = () => {
            const newHash = window.location.hash;
            if (newHash === '#/my-profile') return;
            pendingHash.current = newHash;
            window.history.pushState(null, '', '#/my-profile');
            setShowModal(true);
        };
        const onPopState = () => {
            const newHash = window.location.hash;
            if (newHash === '#/my-profile') return;
            pendingHash.current = newHash;
            window.history.pushState(null, '', '#/my-profile');
            setShowModal(true);
        };
        const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('hashchange', onHashChange);
        window.addEventListener('popstate', onPopState);
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('hashchange', onHashChange);
            window.removeEventListener('popstate', onPopState);
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [isDirty]);

    const handleDiscard = () => {
        setShowModal(false);
        setCompanyAddress(savedSnapshot.companyAddress || '');
        setCompanyWebsite(savedSnapshot.companyWebsite || '');
        setCompanyAbout(savedSnapshot.companyAbout || '');
        if (pendingHash.current) { window.location.hash = pendingHash.current.replace('#', ''); pendingHash.current = null; }
    };
    const handleCancelModal = () => { setShowModal(false); pendingHash.current = null; };
    const handleSave = () => {
        const data = { ...savedSnapshot, companyAddress, companyWebsite, companyAbout };
        saveProfileExtra(data);
        setSavedSnapshot(data);
    };

    // Fetch vessels
    React.useEffect(() => {
        if (!user?.company_id) { setLoading(false); return; }
        (async () => {
            try {
                const authData = localStorage.getItem('leto-auth');
                const token = authData ? JSON.parse(authData)?.state?.accessToken : '';
                const res = await fetch(`/api/companies/${user.company_id}/vessels`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) setCompanyVessels(await res.json());
            } catch { /* silent */ }
            setLoading(false);
        })();
    }, [user]);

    const companyName = user?.company_name || user?.email?.split('@')[0] || 'Empresa';

    return (
        <div className={styles['myprofile-container']}>
            {showModal && <UnsavedModal onDiscard={handleDiscard} onCancel={handleCancelModal} />}
            <HorizontalNavBar className={styles['nav-bar']} backButton={true} fullscreenButton={true} navMenu={true} />
            <div className={styles['myprofile-content']}>
                <VerticalNavBar className={styles['vertical-nav-bar']} tabs={COMPANY_PROFILE_TABS} selected={'myprofile'} />
                {/* Left: Company info */}
                <div className={classnames(styles['profile-panel'], metaPreviewStyles['meta-preview-container'])}>
                    <div className={metaPreviewStyles['meta-info-container']}>
                        {/* Company name */}
                        <div className={metaPreviewStyles['logo-placeholder']}>{companyName}</div>

                        {/* Info row */}
                        <div className={metaPreviewStyles['runtime-release-info-container']}>
                            {user?.sector && <div className={metaPreviewStyles['runtime-label']}>{user.sector}</div>}
                            {user?.company_size && <div className={metaPreviewStyles['release-info-label']}>{user.company_size} empleados</div>}
                            <div className={metaPreviewStyles['release-info-label']}>{companyVessels.length} embarcación(es)</div>
                        </div>

                        {/* Address */}
                        <EditableMetaLinks label={'Dirección'} value={companyAddress} onChange={setCompanyAddress}
                            placeholder={'Agrega la dirección de la empresa'} />

                        {/* Website */}
                        <EditableMetaLinks label={'Sitio Web'} value={companyWebsite} onChange={setCompanyWebsite}
                            placeholder={'www.empresa.com'} />

                        {/* About */}
                        <div className={metaPreviewStyles['description-container']}>
                            <div style={{ textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>{'Sobre la empresa'}</div>
                            <EditableAbout value={companyAbout} onChange={setCompanyAbout}
                                placeholder={'Describe la empresa, servicios, flota y áreas de operación...'} />
                        </div>
                    </div>

                    {/* Save bar */}
                    {isDirty && (
                        <div style={{ padding: '0.8rem 0' }}>
                            <button onClick={handleSave} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', background: '#00d2d3', color: '#0a1628', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Guardar cambios</button>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className={metaPreviewStyles['action-buttons-container']}>
                        <ActionButton className={metaPreviewStyles['action-button']} icon={'crew-add-list'} label={'Crew DB'} href={'#/company-crewdb'} />
                        <ActionButton className={metaPreviewStyles['action-button']} icon={'crew-download-cv'} label={'Calendario'} href={'#/company-calendar'} />
                        <ActionButton className={classnames(metaPreviewStyles['action-button'], metaPreviewStyles['show-button'])} icon={'crew-full-profile'} label={'Settings'} href={'#/settings'} />
                    </div>
                </div>

                {/* Right: Fleet panel */}
                <div className={styles['documents-panel']}>
                    <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Mi Flota</div>
                        <div style={{ fontSize: '0.75rem', color: '#8899aa' }}>{companyVessels.length} embarcación(es)</div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#556677' }}>Cargando flota...</div>
                        ) : (
                            <>
                                {/* Vessel list */}
                                {companyVessels.map((v) => {
                                    const vc = getVesselColor(v.vessel_type);
                                    return (
                                        <div key={v.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.7rem',
                                            padding: '0.8rem', margin: '0 0.2rem 0.4rem',
                                            background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
                                            borderLeft: `3px solid ${vc}`,
                                            transition: 'background 0.15s',
                                            cursor: 'default',
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                                            <VesselIcon type={v.vessel_type} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{v.name}</div>
                                                <div style={{ color: '#8899aa', fontSize: '0.7rem', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                                                    {v.vessel_type && <span style={{ background: `${vc}20`, color: vc, padding: '1px 6px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 600 }}>{v.vessel_type}</span>}
                                                    {v.flag_state && <span>{v.flag_state}</span>}
                                                    {v.imo_number && <span>IMO {v.imo_number}</span>}
                                                </div>
                                            </div>
                                            {v.gross_tonnage && (
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.06)', borderRadius: '4px',
                                                    padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 600,
                                                    color: '#8899aa', whiteSpace: 'nowrap', flexShrink: 0,
                                                }}>
                                                    {v.gross_tonnage.toLocaleString()} GT
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Add vessel form — inline in the content area */}
                                {showAddForm ? (
                                    <div style={{ margin: '0.5rem 0.2rem', padding: '1rem', background: 'rgba(0,210,211,0.04)', border: '1px solid rgba(0,210,211,0.15)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#00d2d3', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nueva embarcación</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <input value={newVessel.name} onChange={(e) => setVesselField('name', e.target.value)} placeholder="Nombre del buque *"
                                                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.8rem', outline: 'none' }} />
                                                <input value={newVessel.imo_number} onChange={(e) => setVesselField('imo_number', e.target.value)} placeholder="IMO Number"
                                                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.8rem', outline: 'none' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <DarkDropdown value={newVessel.vessel_type} onChange={(val) => setVesselField('vessel_type', val)} placeholder="Tipo..."
                                                    options={VESSEL_TYPES.map((t) => ({ value: t, label: t }))} />
                                                <DarkDropdown value={newVessel.flag_state} onChange={(val) => setVesselField('flag_state', val)} placeholder="Bandera..."
                                                    options={FLAG_STATES.map((f) => ({ value: f, label: f }))} />
                                            </div>
                                            <input value={newVessel.gross_tonnage} onChange={(e) => setVesselField('gross_tonnage', e.target.value.replace(/\D/g, ''))} placeholder="Tonelaje bruto (GT)"
                                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.8rem', outline: 'none' }} />
                                            {addError && <div style={{ color: '#e74c3c', fontSize: '0.75rem', padding: '0.3rem 0' }}>{addError}</div>}
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => { setShowAddForm(false); setAddError(''); }}
                                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#8899aa', fontSize: '0.8rem', cursor: 'pointer' }}>Cancelar</button>
                                                <button onClick={addVesselToFleet} disabled={!newVessel.name.trim() || addingVessel}
                                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#00d2d3', color: '#0a1628', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', opacity: !newVessel.name.trim() || addingVessel ? 0.5 : 1 }}>
                                                    {addingVessel ? 'Guardando...' : 'Agregar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowAddForm(true)}
                                        style={{ width: '100%', margin: '0.5rem 0.2rem', padding: '0.6rem', borderRadius: '6px', border: '1px dashed rgba(0,210,211,0.3)', background: 'transparent', color: '#00d2d3', fontSize: '0.8rem', cursor: 'pointer' }}>
                                        + Agregar embarcación
                                    </button>
                                )}

                                {companyVessels.length === 0 && !showAddForm && (
                                    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚢</div>
                                        <div style={{ color: '#8899aa', fontSize: '0.85rem' }}>Sin embarcaciones registradas</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* CSV download */}
                    <div style={{ padding: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button onClick={() => window.open('/downloads/leto_fleet_template.csv', '_blank')}
                            style={{ width: '100%', textAlign: 'center', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#8899aa', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(0,210,211,0.3)'; e.currentTarget.style.color = '#00d2d3'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#8899aa'; }}>
                            📥 Descargar plantilla CSV para importar flota
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════
// MyProfile — role-aware: renders SeafarerProfile or CompanyProfile
// ═══════════════════════════════════════════════════════════════════
const MyProfile = () => {
    const user = React.useMemo(() => getLetoUser(), []);

    // Company users get their own profile layout
    if (user?.role === 'company') return React.createElement(CompanyProfile);

    // Seafarer profile (original code below)
    const userId = user ? user.id : api.getUserId();

    const [settings, setSettings] = React.useState(null);
    const [uploads, setUploads] = React.useState([]);

    // Editable profile fields
    const savedData = React.useMemo(() => loadProfileExtra(), []);
    const [city, setCity] = React.useState(savedData.city || '');
    const [experience, setExperience] = React.useState(savedData.experience || '');
    const [languages, setLanguages] = React.useState(savedData.languages || '');
    const [vessels, setVessels] = React.useState(savedData.vessels || '');
    const [companies, setCompanies] = React.useState(savedData.companies || '');
    const [aboutMe, setAboutMe] = React.useState(savedData.aboutMe || '');
    const [savedSnapshot, setSavedSnapshot] = React.useState(savedData);

    const isDirty = React.useMemo(() => {
        return city !== (savedSnapshot.city || '') || experience !== (savedSnapshot.experience || '') ||
            languages !== (savedSnapshot.languages || '') || vessels !== (savedSnapshot.vessels || '') ||
            companies !== (savedSnapshot.companies || '') || aboutMe !== (savedSnapshot.aboutMe || '');
    }, [city, experience, languages, vessels, companies, aboutMe, savedSnapshot]);

    const [showModal, setShowModal] = React.useState(false);
    const pendingHash = React.useRef(null);

    React.useEffect(() => {
        if (!isDirty) return;
        const onHashChange = () => {
            const newHash = window.location.hash;
            if (newHash === '#/my-profile') return;
            pendingHash.current = newHash;
            window.history.pushState(null, '', '#/my-profile');
            setShowModal(true);
        };
        const onPopState = () => {
            const newHash = window.location.hash;
            if (newHash === '#/my-profile') return;
            pendingHash.current = newHash;
            window.history.pushState(null, '', '#/my-profile');
            setShowModal(true);
        };
        const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('hashchange', onHashChange);
        window.addEventListener('popstate', onPopState);
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('hashchange', onHashChange);
            window.removeEventListener('popstate', onPopState);
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [isDirty]);

    const handleDiscard = () => {
        setShowModal(false);
        setCity(savedSnapshot.city || ''); setExperience(savedSnapshot.experience || '');
        setLanguages(savedSnapshot.languages || ''); setVessels(savedSnapshot.vessels || '');
        setCompanies(savedSnapshot.companies || ''); setAboutMe(savedSnapshot.aboutMe || '');
        if (pendingHash.current) { window.location.hash = pendingHash.current.replace('#', ''); pendingHash.current = null; }
    };
    const handleCancelModal = () => { setShowModal(false); pendingHash.current = null; };
    const handleSave = () => {
        const data = { city, experience, languages, vessels, companies, aboutMe };
        saveProfileExtra(data);
        setSavedSnapshot(data);
    };

    // Fetch from crewing API
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const available = await api.isApiAvailable();
                if (!available || cancelled) return;
                const [s, u] = await Promise.all([api.getSettings(userId), api.getUploads(userId)]);
                if (!cancelled) { setSettings(s); setUploads(u.uploads || []); }
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const displayName = React.useMemo(() => {
        if (user?.first_name) return [user.first_name, user.last_name].filter(Boolean).join(' ');
        if (user?.email) return user.email.split('@')[0];
        return 'Seafarer';
    }, [user]);

    const rank = settings?.rank || user?.rank || null;

    // Age
    const [dobFromApi, setDobFromApi] = React.useState(null);
    React.useEffect(() => {
        if (user?.date_of_birth) return;
        (async () => {
            try {
                const authData = localStorage.getItem('leto-auth');
                if (!authData) return;
                const token = JSON.parse(authData)?.state?.accessToken;
                if (!token) return;
                const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) return;
                const data = await res.json();
                if (data.date_of_birth) {
                    setDobFromApi(data.date_of_birth);
                    const lu = JSON.parse(localStorage.getItem('leto-user') || '{}');
                    lu.date_of_birth = data.date_of_birth;
                    localStorage.setItem('leto-user', JSON.stringify(lu));
                }
            } catch { /* silent */ }
        })();
    }, [user]);

    const age = React.useMemo(() => {
        const dob = user?.date_of_birth || dobFromApi;
        if (!dob) return null;
        const b = new Date(dob); const n = new Date();
        let a = n.getFullYear() - b.getFullYear();
        if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
        return a;
    }, [user, dobFromApi]);

    // ─── Document category state (same as MetaDetails) ─────────────
    const [selectedCategory, setSelectedCategory] = React.useState(0);
    const categoryOnSelect = React.useCallback((event) => {
        const val = typeof event === 'object' ? parseInt(event.value, 10) : parseInt(event, 10);
        if (!isNaN(val)) setSelectedCategory(val);
    }, []);

    // Required docs for rank, with upload status
    const requiredDocs = React.useMemo(() => RANK_REQUIRED_DOCS[rank] || [], [rank]);
    const uploadedByName = React.useMemo(() => {
        const map = {};
        (uploads || []).forEach((u) => { map[u.documentName] = u; });
        return map;
    }, [uploads]);

    // Figure out which category each required doc belongs to
    const docsWithCategory = React.useMemo(() => {
        const docCatMap = {};
        [1, 2, 3, 4, 5].forEach((cat) => {
            (CREW_ALL_DOCS[cat] || []).forEach((d) => { docCatMap[d.title] = cat; });
        });
        return requiredDocs.map((title) => {
            const cat = docCatMap[title] || 5;
            const uploaded = uploadedByName[title];
            let status = 'missing';
            let issuedDate = null, expiryDate = null, daysText = '';
            if (uploaded) {
                status = 'uploaded';
                issuedDate = uploaded.issuedDate;
                expiryDate = uploaded.expiryDate;
                if (expiryDate && expiryDate !== 'N/A') {
                    const expiry = getExpiryStatus(issuedDate, uploaded.validityYears);
                    if (expiry.status === 'expired') { status = 'expired'; daysText = 'Expired'; }
                    else if (expiry.status === 'expiring') { status = 'expiring'; daysText = `${expiry.daysRemaining}d`; }
                    else { daysText = `${expiry.daysRemaining}d`; }
                }
            }
            return { title, category: cat, status, issuedDate, expiryDate, daysText };
        });
    }, [requiredDocs, uploadedByName]);

    // Filter by selected category
    const filteredDocs = React.useMemo(() => {
        if (selectedCategory === 0) return docsWithCategory;
        return docsWithCategory.filter((d) => d.category === selectedCategory);
    }, [docsWithCategory, selectedCategory]);

    const [search, setSearch] = React.useState('');
    const searchedDocs = React.useMemo(() => {
        if (!search.trim()) return filteredDocs;
        const q = search.toLowerCase();
        return filteredDocs.filter((d) => d.title.toLowerCase().includes(q));
    }, [filteredDocs, search]);

    // Status counts
    const statusCounts = React.useMemo(() => {
        const c = { uploaded: 0, expiring: 0, expired: 0, missing: 0 };
        filteredDocs.forEach((d) => { c[d.status]++; });
        return c;
    }, [filteredDocs]);

    const totalRequired = docsWithCategory.length;
    const totalUploaded = docsWithCategory.filter((d) => d.status !== 'missing').length;
    const totalMissing = docsWithCategory.filter((d) => d.status === 'missing').length;

    // ─── RENDER — same structure as MetaDetails ────────────────────
    return (
        <div className={styles['myprofile-container']}>
            {showModal && <UnsavedModal onDiscard={handleDiscard} onCancel={handleCancelModal} />}
            <HorizontalNavBar
                className={styles['nav-bar']}
                backButton={true}
                fullscreenButton={true}
                navMenu={true}
            />
            <div className={styles['myprofile-content']}>
                <VerticalNavBar className={styles['vertical-nav-bar']} tabs={SEAFARER_PROFILE_TABS} selected={'myprofile'} />
                {/* Left: Profile */}
                <div className={classnames(styles['profile-panel'], metaPreviewStyles['meta-preview-container'])}>
                    <div className={metaPreviewStyles['meta-info-container']}>
                        {/* Name */}
                        <div className={metaPreviewStyles['logo-placeholder']}>{displayName}</div>

                        {/* Age · City · Exp */}
                        <div className={metaPreviewStyles['runtime-release-info-container']}>
                            {age !== null && <div className={metaPreviewStyles['runtime-label']}>{'Age: ' + age}</div>}
                            <div className={metaPreviewStyles['release-info-label']}>
                                {'City: '}<EditableText value={city} onChange={setCity} placeholder={'Agrega tu ciudad'} />
                            </div>
                            <div className={metaPreviewStyles['release-info-label']}>
                                {'Exp: '}<EditableText value={experience} onChange={setExperience} placeholder={'Ej: 6.0 years'} />
                            </div>
                        </div>

                        {/* Languages */}
                        <EditableMetaLinks label={'Languages'} value={languages} onChange={setLanguages}
                            placeholder={'Agrega tus idiomas (ej: Spanish, English)'} />
                        {/* Vessels */}
                        <EditableMetaLinks label={'Vessels'} value={vessels} onChange={setVessels}
                            placeholder={'Agrega tipos de embarcación (ej: Oil Tanker, Tug)'} />
                        {/* Companies */}
                        <EditableMetaLinks label={'Companies'} value={companies} onChange={setCompanies}
                            placeholder={'Agrega empresas donde has trabajado'} />
                        {/* About Me */}
                        <div className={metaPreviewStyles['description-container']}>
                            <div style={{ textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>{'About me'}</div>
                            <EditableAbout value={aboutMe} onChange={setAboutMe}
                                placeholder={'Describe tu experiencia, certificaciones y objetivos profesionales...'} />
                        </div>
                    </div>

                    {/* Save bar */}
                    {isDirty && (
                        <div style={{ padding: '0.8rem 0' }}>
                            <button onClick={handleSave} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', background: '#00d2d3', color: '#0a1628', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Guardar cambios</button>
                        </div>
                    )}

                    {/* Action buttons — same as crew detail */}
                    <div className={metaPreviewStyles['action-buttons-container']}>
                        <ActionButton className={metaPreviewStyles['action-button']} icon={'crew-add-list'} label={'Mis Docs'} href={'#/myfiles'} />
                        <ActionButton className={metaPreviewStyles['action-button']} icon={'crew-download-cv'} label={'Calendario'} href={'#/calendar'} />
                        <ActionButton className={metaPreviewStyles['action-button']} icon={'crew-interview'} label={'Exámenes'} href={'#/myexams'} />
                        <ActionButton className={classnames(metaPreviewStyles['action-button'], metaPreviewStyles['show-button'])} icon={'crew-full-profile'} label={'Settings'} href={'#/settings'} />
                    </div>
                </div>

                {/* Right: Documents panel */}
                <div className={styles['documents-panel']}>
                    <CategoryBar
                        category={selectedCategory}
                        categories={CREW_DOC_CATEGORIES}
                        onSelect={categoryOnSelect}
                    />
                    {/* Status summary */}
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1.5rem 0.5rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                        {statusCounts.uploaded > 0 && <span style={{ ...STATUS_STYLES.uploaded, padding: '2px 8px', borderRadius: '4px' }}>{statusCounts.uploaded} Valid</span>}
                        {statusCounts.expiring > 0 && <span style={{ ...STATUS_STYLES.expiring, padding: '2px 8px', borderRadius: '4px' }}>{statusCounts.expiring} Expiring</span>}
                        {statusCounts.expired > 0 && <span style={{ ...STATUS_STYLES.expired, padding: '2px 8px', borderRadius: '4px' }}>{statusCounts.expired} Expired</span>}
                        {statusCounts.missing > 0 && <span style={{ ...STATUS_STYLES.missing, padding: '2px 8px', borderRadius: '4px' }}>{statusCounts.missing} Missing</span>}
                        <span style={{ marginLeft: 'auto', color: '#888', fontSize: '0.75rem' }}>{totalUploaded}/{totalRequired}</span>
                    </div>
                    <SearchBar title={'Buscar documentos...'} value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem' }}>
                        {searchedDocs.map((doc) => {
                            const st = STATUS_STYLES[doc.status] || STATUS_STYLES.missing;
                            return (
                                <div key={doc.title} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.6rem 0.8rem', margin: '0 0.2rem 0.35rem',
                                    background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
                                    borderLeft: `3px solid ${st.color}`,
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ color: '#e0e0e0', fontSize: '0.9rem', fontWeight: 500 }}>{doc.title}</div>
                                        <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px' }}>
                                            {doc.status === 'missing' ? 'No subido'
                                                : `Issued: ${doc.issuedDate || '—'}${doc.expiryDate && doc.expiryDate !== 'N/A' ? ` — Expires: ${doc.expiryDate} (${doc.daysText})` : ''}`}
                                        </div>
                                    </div>
                                    <div style={{ ...st, padding: '3px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                                        {st.label}
                                    </div>
                                </div>
                            );
                        })}
                        {searchedDocs.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
                                {search ? 'Sin resultados' : (rank ? 'Sin documentos requeridos' : 'Sin rango asignado')}
                            </div>
                        )}
                    </div>
                    {/* Bottom action */}
                    {totalMissing > 0 && (
                        <div style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <Button href={'#/myfiles'} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '0.7rem 1rem', borderRadius: '6px', background: 'rgba(0,210,211,0.15)', color: '#00d2d3', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(0,210,211,0.3)', textDecoration: 'none' }}>
                                Agrega tus documentos ({totalMissing} faltantes)
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

module.exports = MyProfile;
