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
const { evaluateStcwMatrix, getStcwMatrixRequirements } = require('leto/common/stcwMatrix');

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

// Legacy localStorage key for free-text tag fields (Languages / Vessels / Companies).
// These are not yet in the seafarer DB schema; tracked in ROADMAP.md as
// "Seafarer tag fields → DB". Once migrated, this key will be removed entirely.
const PROFILE_STORAGE_KEY = 'leto-profile-extra';

const getLetoUser = () => {
    try {
        const data = localStorage.getItem('leto-user');
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};
const getAuthToken = () => {
    try {
        const data = localStorage.getItem('leto-auth');
        return data ? JSON.parse(data)?.state?.accessToken || '' : '';
    } catch { return ''; }
};
const getRefreshToken = () => {
    try {
        const data = localStorage.getItem('leto-auth');
        return data ? JSON.parse(data)?.state?.refreshToken || '' : '';
    } catch { return ''; }
};
const setStoredAuth = (next) => {
    try {
        const data = JSON.parse(localStorage.getItem('leto-auth') || '{}');
        if (!data.state) data.state = {};
        Object.assign(data.state, next);
        localStorage.setItem('leto-auth', JSON.stringify(data));
    } catch { /* non-fatal */ }
};

// Try to refresh the access token. Returns new token or '' on failure.
const refreshAccessToken = async () => {
    const refresh = getRefreshToken();
    if (!refresh) return '';
    try {
        const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) return '';
        const data = await res.json();
        if (data.access_token) {
            setStoredAuth({ accessToken: data.access_token, refreshToken: data.refresh_token || refresh });
            return data.access_token;
        }
    } catch { /* ignore */ }
    return '';
};

// fetch wrapper that retries once with a refreshed token on 401.
const authFetch = async (url, init = {}) => {
    const token = getAuthToken();
    const headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
    let res = await fetch(url, { ...init, headers });
    if (res.status !== 401) return res;
    const fresh = await refreshAccessToken();
    if (!fresh) return res;
    const headers2 = { ...(init.headers || {}), Authorization: `Bearer ${fresh}` };
    res = await fetch(url, { ...init, headers: headers2 });
    return res;
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

// ─── Tag input with +Add button and individual X to remove ─────────
// Matches the original MetaLinks pill styling (rounded, overlay bg, no cyan border)
const tagPillStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.4rem 1.25rem',
    borderRadius: '2rem',
    fontSize: '1rem',
    fontWeight: 500,
    color: 'var(--primary-foreground-color, #e0e0e0)',
    background: 'var(--overlay-color, rgba(255,255,255,0.08))',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
    cursor: 'default',
};

const TagInput = ({ label, value, onChange, placeholder }) => {
    const [inputValue, setInputValue] = React.useState('');
    const inputRef = React.useRef(null);
    const tags = React.useMemo(() => {
        return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
    }, [value]);

    const addTag = React.useCallback(() => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        const current = tags;
        if (current.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
            setInputValue('');
            return;
        }
        onChange([...current, trimmed].join(', '));
        setInputValue('');
        if (inputRef.current) inputRef.current.focus();
    }, [inputValue, tags, onChange]);

    const removeTag = React.useCallback((index) => {
        const next = tags.filter((_, i) => i !== index);
        onChange(next.join(', '));
    }, [tags, onChange]);

    const onKeyDown = React.useCallback((e) => {
        if (e.key === 'Enter') { e.preventDefault(); addTag(); }
        if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    }, [addTag, inputValue, tags, removeTag]);

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                {tags.map((tag, i) => (
                    <span key={`${tag}-${i}`} style={tagPillStyle}>
                        {tag}
                        <button type="button" onClick={() => removeTag(i)} style={{
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
                            cursor: 'pointer', fontSize: '0.8rem', padding: 0, lineHeight: 1,
                        }}>✕</button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={tags.length === 0 ? placeholder : 'Add more...'}
                    style={{
                        width: '8rem', background: 'transparent', border: 'none',
                        color: '#fff', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
                        padding: '0.4rem 0',
                    }}
                />
                <button type="button" onClick={addTag} style={{
                    background: 'rgba(0,210,211,0.15)', border: '1px solid rgba(0,210,211,0.3)',
                    color: '#00d2d3', borderRadius: '2rem', padding: '0.35rem 0.8rem',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>+ Add</button>
            </div>
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

// ─── Career section (rank, years experience, availability) ────────
const SEAFARER_RANKS = [
    { id: 'master', label: 'Capitán / Master', icon: '👨‍✈️' },
    { id: 'chief-officer', label: 'Primer Oficial', icon: '🎖️' },
    { id: '2nd-officer', label: 'Segundo Oficial', icon: '🗺️' },
    { id: '3rd-officer', label: 'Tercer Oficial', icon: '⛵' },
    { id: 'chief-engineer', label: 'Jefe de Máquinas', icon: '⚙️' },
    { id: '2nd-engineer', label: 'Segundo Ingeniero', icon: '🔧' },
    { id: 'electrician', label: 'Electricista', icon: '⚡' },
    { id: 'bosun', label: 'Contramaestre', icon: '⚓' },
    { id: 'ab', label: 'Marinero AB', icon: '🌊' },
    { id: 'cook', label: 'Cocinero Jefe', icon: '🍽️' },
];

const SEAFARER_RANK_NOTES = {
    master: 'Como Capitán, eres el máximo responsable de la seguridad del buque y tripulación.',
    'chief-officer': 'Como Primer Oficial, el ECDIS actualizado por tipo de equipo es requerido en flotas modernas.',
    '2nd-officer': 'Como Segundo Oficial, el ECDIS y la formación en emergencias médicas son prioritarios.',
    '3rd-officer': 'Como Tercer Oficial, tu BST y CoC son esenciales.',
    'chief-engineer': 'Como Jefe de Máquinas, en buques de alta tensión se requieren certificaciones adicionales.',
    '2nd-engineer': 'Como Segundo Ingeniero, el registro de horas de guardia es crítico bajo MLC 2006.',
    electrician: 'Como Electricista, la habilitación STCW III/6 y la certificación de alta tensión son requeridas.',
    bosun: 'Como Contramaestre, el Proficiency in Survival Craft es altamente valorado.',
    ab: 'Como AB, asegúrate de tener tu libreta de mar actualizada con el historial completo.',
    cook: 'Como Cocinero, el MLC 2006 exige el certificado de cocinero de a bordo.',
};

const getRankLabel = (rankId) => {
    const r = SEAFARER_RANKS.find((x) => x.id === rankId);
    return r ? r.label : (rankId || '—');
};

const RankConfirmModal = ({ fromRank, toRank, onConfirm, onCancel }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
        <div style={{ background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem 1.8rem', maxWidth: '28rem', width: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Cambiar de rango</div>
            <div style={{ fontSize: '0.85rem', color: '#d0d0d0', lineHeight: 1.55, marginBottom: '0.9rem' }}>
                Vas a cambiar tu rango de <strong style={{ color: '#00d2d3' }}>{getRankLabel(fromRank)}</strong> a <strong style={{ color: '#00d2d3' }}>{getRankLabel(toRank)}</strong>.
                <br /><br />
                Esto recalculará tus documentos requeridos, tu porcentaje de cumplimiento y los bloqueos de viaje. Algunos documentos podrían dejar de ser obligatorios y otros nuevos aparecerán como faltantes.
            </div>
            {SEAFARER_RANK_NOTES[toRank] && (
                <div style={{ background: 'rgba(0,210,211,0.08)', border: '1px solid rgba(0,210,211,0.2)', color: '#9fdde0', fontSize: '0.78rem', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    📌 {SEAFARER_RANK_NOTES[toRank]}
                </div>
            )}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button onClick={onCancel} style={{ padding: '0.55rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d0d0d0', fontSize: '0.85rem', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={onConfirm} style={{ padding: '0.55rem 1.1rem', borderRadius: '6px', border: 'none', background: '#00d2d3', color: '#0a1628', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Sí, cambiar rango</button>
            </div>
        </div>
    </div>
);

const isCanonicalRank = (id) => SEAFARER_RANKS.some((r) => r.id === id);

const CareerSection = ({ initialRank, initialYears, initialAvailable, onSaved }) => {
    // If the stored value isn't one of our canonical rank IDs (e.g. a legacy
    // label like "II/1 - OOW Navigation"), start the dropdown empty so the
    // user picks a canonical option. The original label is still shown in the
    // header so they have context.
    const initialCanonicalRank = isCanonicalRank(initialRank) ? initialRank : '';
    const [rank, setRank] = React.useState(initialCanonicalRank);
    const [years, setYears] = React.useState(initialYears != null ? String(initialYears) : '');
    const [available, setAvailable] = React.useState(initialAvailable !== false);
    const [pendingRank, setPendingRank] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [savedAt, setSavedAt] = React.useState(0);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        setRank(isCanonicalRank(initialRank) ? initialRank : '');
        setYears(initialYears != null ? String(initialYears) : '');
        setAvailable(initialAvailable !== false);
    }, [initialRank, initialYears, initialAvailable]);

    const persist = React.useCallback(async (overrideRank) => {
        setSaving(true);
        setError('');
        try {
            const body = {
                rank: overrideRank !== undefined ? overrideRank : (rank || null),
                years_experience: years === '' ? null : Math.max(0, parseInt(years, 10) || 0),
                is_available: available,
            };
            const res = await authFetch('/api/seafarers/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Save failed (${res.status})`);
            }
            const next = await res.json();
            // Mirror new rank into the legacy crewing settings store so the dashboard
            // and SeafarerHome (which read settings.rank) update without a logout.
            try { await api.updateUserSettings(api.getUserId(), { rank: next.rank || null }); } catch { /* non-fatal */ }
            // Update leto-user localStorage so other pages immediately see the new rank.
            try {
                const lu = JSON.parse(localStorage.getItem('leto-user') || '{}');
                lu.rank = next.rank;
                lu.years_experience = next.years_experience;
                lu.is_available = next.is_available;
                localStorage.setItem('leto-user', JSON.stringify(lu));
            } catch { /* non-fatal */ }
            setSavedAt(Date.now());
            if (typeof onSaved === 'function') onSaved(next);
        } catch (e) {
            setError(e && e.message ? e.message : 'Save failed');
        }
        setSaving(false);
    }, [rank, years, available, onSaved]);

    const onSubmit = React.useCallback((e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (rank && rank !== (initialRank || '')) {
            setPendingRank(rank);
            return;
        }
        persist();
    }, [rank, initialRank, persist]);

    const confirmRankChange = React.useCallback(async () => {
        const next = pendingRank;
        setPendingRank(null);
        await persist(next);
    }, [pendingRank, persist]);

    const cancelRankChange = React.useCallback(() => {
        setPendingRank(null);
        setRank(initialRank || '');
    }, [initialRank]);

    return (
        <form onSubmit={onSubmit} style={{ marginTop: '1.5rem' }}>
            {pendingRank && (
                <RankConfirmModal
                    fromRank={initialRank}
                    toRank={pendingRank}
                    onConfirm={confirmRankChange}
                    onCancel={cancelRankChange}
                />
            )}

            {/* Header bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.6rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                background: 'rgba(0,210,211,0.05)',
                border: '1px solid rgba(0,210,211,0.2)',
                marginBottom: '0.6rem',
                flexWrap: 'wrap',
            }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Career
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: available ? '#00d2d3' : '#d2dbe5', cursor: 'pointer', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: available ? 'rgba(0,210,211,0.12)' : 'rgba(255,255,255,0.03)' }}>
                        <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
                        Available for work
                    </label>
                    {savedAt > 0 && Date.now() - savedAt < 4000 && (
                        <span style={{ color: '#2ecc71', fontSize: '0.72rem' }}>Saved</span>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '0.4rem 0.9rem', borderRadius: '6px', border: 'none',
                            background: '#00d2d3', color: '#0a1628', fontSize: '0.72rem', fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Career'}
                    </button>
                </div>
            </div>

            <div style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 2, minWidth: '14rem' }}>
                        <div style={mobilityLabelStyle}>Rank</div>
                        <DarkDropdown
                            value={rank}
                            onChange={setRank}
                            options={SEAFARER_RANKS.map((r) => ({ value: r.id, label: `${r.icon} ${r.label}` }))}
                            placeholder="— Select your rank —"
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '8rem' }}>
                        <div style={mobilityLabelStyle}>Years of experience</div>
                        <input
                            type="number"
                            min="0"
                            max="60"
                            value={years}
                            onChange={(e) => setYears(e.target.value)}
                            placeholder="6"
                            style={mobilityInputStyle}
                        />
                    </div>
                </div>
                {rank && SEAFARER_RANK_NOTES[rank] && (
                    <div style={{ marginTop: '0.6rem', color: '#9ab', fontSize: '0.72rem', lineHeight: 1.45 }}>
                        📌 {SEAFARER_RANK_NOTES[rank]}
                    </div>
                )}
                {error && <div style={{ marginTop: '0.5rem', color: '#e74c3c', fontSize: '0.75rem' }}>{error}</div>}
            </div>
        </form>
    );
};

// ─── Mobility Profile form ─────────────────────────────────────────
const toMobilityForm = (settings) => ({
    double_nationality: Boolean(settings?.identity?.double_nationality),
    nationality_primary: settings?.identity?.nationality_primary || '',
    nationality_secondary: settings?.identity?.nationality_secondary || '',
    passport_1_number: settings?.identity?.passport_1?.number || '',
    passport_1_country: settings?.identity?.passport_1?.country || '',
    passport_1_expiry: settings?.identity?.passport_1?.expiry_date || '',
    passport_2_number: settings?.identity?.passport_2?.number || '',
    passport_2_country: settings?.identity?.passport_2?.country || '',
    passport_2_expiry: settings?.identity?.passport_2?.expiry_date || '',
    has_visa: Boolean(settings?.visa?.has_visa),
    visa_number: settings?.visa?.number || '',
    visa_country: settings?.visa?.country || '',
    visa_type: settings?.visa?.type || '',
    visa_expiry: settings?.visa?.expiry_date || '',
    linked_passport: settings?.visa?.linked_passport || '',
    departure_airport_iata: settings?.travel?.departure_airport_iata || '',
    departure_airport_name: settings?.travel?.departure_airport_name || '',
});

const fromMobilityForm = (form) => ({
    identity: {
        double_nationality: Boolean(form.double_nationality),
        nationality_primary: form.nationality_primary || '',
        nationality_secondary: form.double_nationality ? (form.nationality_secondary || '') : '',
        passport_1: {
            number: form.passport_1_number || '',
            country: form.passport_1_country || '',
            expiry_date: form.passport_1_expiry || '',
        },
        passport_2: {
            number: form.double_nationality ? (form.passport_2_number || '') : '',
            country: form.double_nationality ? (form.passport_2_country || '') : '',
            expiry_date: form.double_nationality ? (form.passport_2_expiry || '') : '',
        },
    },
    visa: {
        has_visa: Boolean(form.has_visa),
        number: form.has_visa ? (form.visa_number || '') : '',
        country: form.has_visa ? (form.visa_country || '') : '',
        type: form.has_visa ? (form.visa_type || '') : '',
        expiry_date: form.has_visa ? (form.visa_expiry || '') : '',
        linked_passport: form.has_visa ? (form.linked_passport || '') : '',
    },
    travel: {
        departure_airport_iata: form.departure_airport_iata || '',
        departure_airport_name: form.departure_airport_name || '',
    },
});

const mobilityInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.5rem 0.7rem',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
    outline: 'none',
};

const mobilityLabelStyle = {
    display: 'block',
    fontSize: '0.68rem',
    color: '#8899aa',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
};

const MobilityField = ({ label, children }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
        <div style={mobilityLabelStyle}>{label}</div>
        {children}
    </div>
);

const MobilitySection = ({ title, children }) => (
    <div style={{
        padding: '0.75rem 0.9rem',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '0.6rem',
    }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00d2d3', marginBottom: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {children}
        </div>
    </div>
);

const HeaderToggle = ({ label, checked, onChange }) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#d2dbe5', cursor: 'pointer', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: checked ? 'rgba(0,210,211,0.12)' : 'rgba(255,255,255,0.03)' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span style={{ color: checked ? '#00d2d3' : '#d2dbe5' }}>{label}</span>
    </label>
);

const MobilityProfileForm = ({ userId, uploadedDocs }) => {
    const [form, setForm] = React.useState(() => toMobilityForm(null));
    const [loaded, setLoaded] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [savedAt, setSavedAt] = React.useState(0);
    const [errorMsg, setErrorMsg] = React.useState('');

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await api.getSettings(userId);
                if (cancelled) return;
                setForm(toMobilityForm(data));
                setLoaded(true);
            } catch {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const setField = React.useCallback((key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrorMsg('');
    }, []);

    const linkInvalid = form.has_visa && form.linked_passport === 'passport_2' && !form.double_nationality;

    const onSubmit = React.useCallback(async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (linkInvalid) {
            setErrorMsg('Visa is linked to Passport 2 but double nationality is not enabled.');
            return;
        }
        setSaving(true);
        setErrorMsg('');
        try {
            const payload = fromMobilityForm(form);
            const next = await api.updateUserSettings(userId, payload);
            setForm(toMobilityForm(next));
            setSavedAt(Date.now());
        } catch (err) {
            setErrorMsg(err && err.message ? err.message : 'Save failed');
        }
        setSaving(false);
    }, [form, linkInvalid, userId]);

    // Live matrix evaluation from current form values (so counters update before save).
    const matrix = React.useMemo(() => {
        const settingsLike = fromMobilityForm(form);
        return evaluateStcwMatrix(null, uploadedDocs || [], settingsLike);
    }, [form, uploadedDocs]);

    const travelBlocks = matrix.blockers.length;
    const certWindow90 = matrix.certificationWindow.expiring90;
    const expiredCount = matrix.certificationWindow.expired;

    if (!loaded) {
        return (
            <div style={{ marginTop: '1.5rem', color: '#8899aa', fontSize: '0.8rem' }}>Loading mobility profile...</div>
        );
    }

    return (
        <form onSubmit={onSubmit} style={{ marginTop: '1.5rem' }}>
            {/* Header bar with title + toggles + save */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.6rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                background: 'rgba(0,210,211,0.05)',
                border: '1px solid rgba(0,210,211,0.2)',
                marginBottom: '0.6rem',
                flexWrap: 'wrap',
            }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Mobility Profile
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <HeaderToggle
                        label="Double nationality"
                        checked={form.double_nationality}
                        onChange={(v) => setField('double_nationality', v)}
                    />
                    <HeaderToggle
                        label="Has visa"
                        checked={form.has_visa}
                        onChange={(v) => setField('has_visa', v)}
                    />
                    {savedAt > 0 && Date.now() - savedAt < 4000 && (
                        <span style={{ color: '#2ecc71', fontSize: '0.72rem' }}>Saved</span>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '0.4rem 0.9rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#00d2d3',
                            color: '#0a1628',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </div>

            {/* Identity row */}
            <MobilitySection title="Identity">
                <MobilityField label="Primary nationality">
                    <input style={mobilityInputStyle} value={form.nationality_primary}
                        onChange={(e) => setField('nationality_primary', e.target.value)} placeholder="e.g. Peru" />
                </MobilityField>
                {form.double_nationality && (
                    <MobilityField label="Secondary nationality">
                        <input style={mobilityInputStyle} value={form.nationality_secondary}
                            onChange={(e) => setField('nationality_secondary', e.target.value)} placeholder="e.g. Italy" />
                    </MobilityField>
                )}
            </MobilitySection>

            {/* Passport 1 row */}
            <MobilitySection title="Passport 1">
                <MobilityField label="Number">
                    <input style={mobilityInputStyle} value={form.passport_1_number}
                        onChange={(e) => setField('passport_1_number', e.target.value)} placeholder="A1234567" />
                </MobilityField>
                <MobilityField label="Country">
                    <input style={mobilityInputStyle} value={form.passport_1_country}
                        onChange={(e) => setField('passport_1_country', e.target.value)} placeholder="Peru" />
                </MobilityField>
                <MobilityField label="Expiry date">
                    <input type="date" style={mobilityInputStyle} value={form.passport_1_expiry}
                        onChange={(e) => setField('passport_1_expiry', e.target.value)} />
                </MobilityField>
            </MobilitySection>

            {/* Passport 2 row (conditional) */}
            {form.double_nationality && (
                <MobilitySection title="Passport 2">
                    <MobilityField label="Number">
                        <input style={mobilityInputStyle} value={form.passport_2_number}
                            onChange={(e) => setField('passport_2_number', e.target.value)} placeholder="B7654321" />
                    </MobilityField>
                    <MobilityField label="Country">
                        <input style={mobilityInputStyle} value={form.passport_2_country}
                            onChange={(e) => setField('passport_2_country', e.target.value)} placeholder="Italy" />
                    </MobilityField>
                    <MobilityField label="Expiry date">
                        <input type="date" style={mobilityInputStyle} value={form.passport_2_expiry}
                            onChange={(e) => setField('passport_2_expiry', e.target.value)} />
                    </MobilityField>
                </MobilitySection>
            )}

            {/* Visa row (conditional) */}
            {form.has_visa && (
                <MobilitySection title="Visa">
                    <MobilityField label="Number">
                        <input style={mobilityInputStyle} value={form.visa_number}
                            onChange={(e) => setField('visa_number', e.target.value)} placeholder="V123456" />
                    </MobilityField>
                    <MobilityField label="Country">
                        <input style={mobilityInputStyle} value={form.visa_country}
                            onChange={(e) => setField('visa_country', e.target.value)} placeholder="USA" />
                    </MobilityField>
                    <MobilityField label="Type">
                        <input style={mobilityInputStyle} value={form.visa_type}
                            onChange={(e) => setField('visa_type', e.target.value)} placeholder="C1/D, Schengen..." />
                    </MobilityField>
                    <MobilityField label="Expiry date">
                        <input type="date" style={mobilityInputStyle} value={form.visa_expiry}
                            onChange={(e) => setField('visa_expiry', e.target.value)} />
                    </MobilityField>
                    <MobilityField label="Linked passport">
                        <select style={mobilityInputStyle} value={form.linked_passport}
                            onChange={(e) => setField('linked_passport', e.target.value)}>
                            <option value="">Link to...</option>
                            <option value="passport_1">Passport 1</option>
                            {form.double_nationality && (
                                <option value="passport_2">Passport 2</option>
                            )}
                        </select>
                    </MobilityField>
                </MobilitySection>
            )}

            {/* Travel row */}
            <MobilitySection title="Travel">
                <MobilityField label="Departure airport IATA">
                    <input style={mobilityInputStyle} value={form.departure_airport_iata}
                        onChange={(e) => setField('departure_airport_iata', e.target.value.toUpperCase())} placeholder="LIM" />
                </MobilityField>
                <MobilityField label="Departure airport name">
                    <input style={mobilityInputStyle} value={form.departure_airport_name}
                        onChange={(e) => setField('departure_airport_name', e.target.value)} placeholder="Jorge Chavez Intl" />
                </MobilityField>
            </MobilitySection>

            {linkInvalid && (
                <div style={{ marginTop: '0.5rem', color: '#e74c3c', fontSize: '0.75rem' }}>
                    Visa is linked to Passport 2 but double nationality is not enabled. Enable double nationality or link the visa to Passport 1.
                </div>
            )}
            {errorMsg && !linkInvalid && (
                <div style={{ marginTop: '0.5rem', color: '#e74c3c', fontSize: '0.75rem' }}>{errorMsg}</div>
            )}

            {/* Live readiness pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
                <div style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', background: 'rgba(231,76,60,0.12)', color: '#ff9f96', fontSize: '0.72rem', fontWeight: 600 }}>
                    Travel blocks: {travelBlocks}
                </div>
                <div style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', background: 'rgba(241,196,15,0.12)', color: '#f1c40f', fontSize: '0.72rem', fontWeight: 600 }}>
                    Certification window 90d: {certWindow90}
                </div>
                <div style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', background: 'rgba(231,76,60,0.12)', color: '#e74c3c', fontSize: '0.72rem', fontWeight: 600 }}>
                    Expired: {expiredCount}
                </div>
            </div>
        </form>
    );
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
    const [crewModalVessel, setCrewModalVessel] = React.useState(null);
    const [crewPool, setCrewPool] = React.useState([]);
    const [assignments, setAssignments] = React.useState([]);
    const [assigning, setAssigning] = React.useState(false);
    const [loadingCrewModal, setLoadingCrewModal] = React.useState(false);
    const [selectedSeafarerId, setSelectedSeafarerId] = React.useState('');
    const [roleOnboard, setRoleOnboard] = React.useState('');
    const [crewError, setCrewError] = React.useState('');

    const resolveCompanyId = React.useCallback(async () => {
        let companyId = user?.company_id;
        if (companyId) return companyId;
        const token = getAuthToken();
        if (!token) return null;
        const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!meRes.ok) return null;
        const me = await meRes.json();
        companyId = me.company_id;
        if (companyId) {
            const lu = JSON.parse(localStorage.getItem('leto-user') || '{}');
            lu.company_id = companyId;
            lu.company_name = me.company_name;
            localStorage.setItem('leto-user', JSON.stringify(lu));
        }
        return companyId || null;
    }, [user]);

    const loadCrewManagerData = React.useCallback(async (vessel) => {
        setCrewError('');
        setLoadingCrewModal(true);
        try {
            const token = getAuthToken();
            const companyId = await resolveCompanyId();
            if (!token || !companyId) {
                setCrewError('No se encontró la empresa.');
                setLoadingCrewModal(false);
                return;
            }

            const [crewRes, assignmentsRes] = await Promise.all([
                fetch(`/api/companies/${companyId}/crew`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/companies/${companyId}/vessels/${vessel.id}/assignments`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            if (!crewRes.ok) throw new Error('No se pudo cargar la tripulación.');
            if (!assignmentsRes.ok) throw new Error('No se pudieron cargar las asignaciones.');

            const crewData = await crewRes.json();
            const assignmentsData = await assignmentsRes.json();

            setCrewPool(Array.isArray(crewData) ? crewData : []);
            setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
        } catch (e) {
            setCrewError(e instanceof Error ? e.message : 'Error cargando crew manager.');
            setCrewPool([]);
            setAssignments([]);
        }
        setLoadingCrewModal(false);
    }, [resolveCompanyId]);

    const openCrewModal = async (vessel) => {
        setCrewModalVessel(vessel);
        setSelectedSeafarerId('');
        setRoleOnboard('');
        await loadCrewManagerData(vessel);
    };

    const closeCrewModal = () => {
        setCrewModalVessel(null);
        setAssignments([]);
        setCrewPool([]);
        setCrewError('');
    };

    const addAssignment = async () => {
        if (!crewModalVessel || !selectedSeafarerId) return;
        setAssigning(true);
        setCrewError('');
        try {
            const token = getAuthToken();
            const companyId = await resolveCompanyId();
            if (!token || !companyId) throw new Error('No se encontró la empresa.');

            const res = await fetch(`/api/companies/${companyId}/vessels/${crewModalVessel.id}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    seafarer_id: selectedSeafarerId,
                    role_onboard: roleOnboard || null,
                    status: 'planned',
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'No se pudo asignar tripulante.');
            }
            setSelectedSeafarerId('');
            setRoleOnboard('');
            await loadCrewManagerData(crewModalVessel);
        } catch (e) {
            setCrewError(e instanceof Error ? e.message : 'Error asignando tripulante.');
        }
        setAssigning(false);
    };

    const removeAssignment = async (assignmentId) => {
        if (!crewModalVessel || !assignmentId) return;
        try {
            const token = getAuthToken();
            const companyId = await resolveCompanyId();
            if (!token || !companyId) throw new Error('No se encontró la empresa.');

            const res = await fetch(`/api/companies/${companyId}/assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'No se pudo remover asignación.');
            }
            await loadCrewManagerData(crewModalVessel);
        } catch (e) {
            setCrewError(e instanceof Error ? e.message : 'Error removiendo asignación.');
        }
    };

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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                                <button
                                                    onClick={() => openCrewModal(v)}
                                                    style={{
                                                        padding: '0.35rem 0.55rem',
                                                        borderRadius: '5px',
                                                        border: '1px solid rgba(0,210,211,0.35)',
                                                        background: 'rgba(0,210,211,0.08)',
                                                        color: '#00d2d3',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Crew
                                                </button>
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

            {crewModalVessel && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
                    <div style={{ width: 'min(56rem, 95vw)', maxHeight: '86vh', overflow: 'auto', borderRadius: '10px', background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Crew Manager</div>
                                <div style={{ color: '#8899aa', fontSize: '0.75rem' }}>{crewModalVessel.name}</div>
                            </div>
                            <button onClick={closeCrewModal} style={{ border: 'none', background: 'transparent', color: '#8899aa', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                        </div>

                        <div style={{ padding: '1rem' }}>
                            {crewError && <div style={{ marginBottom: '0.8rem', color: '#e74c3c', fontSize: '0.8rem' }}>{crewError}</div>}

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', marginBottom: '0.9rem' }}>
                                <select
                                    value={selectedSeafarerId}
                                    onChange={(e) => setSelectedSeafarerId(e.target.value)}
                                    style={{ padding: '0.5rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.8rem' }}
                                >
                                    <option value="">Selecciona tripulante...</option>
                                    {crewPool.map((crew) => (
                                        <option key={crew.id} value={crew.id}>
                                            {crew.full_name || crew.email} {crew.rank ? `- ${crew.rank}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    value={roleOnboard}
                                    onChange={(e) => setRoleOnboard(e.target.value)}
                                    placeholder="Rol a bordo (opcional)"
                                    style={{ padding: '0.5rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.8rem' }}
                                />
                                <button
                                    onClick={addAssignment}
                                    disabled={!selectedSeafarerId || assigning}
                                    style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', background: '#00d2d3', color: '#0a1628', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', opacity: !selectedSeafarerId || assigning ? 0.5 : 1 }}
                                >
                                    {assigning ? 'Asignando...' : 'Asignar'}
                                </button>
                            </div>

                            {loadingCrewModal ? (
                                <div style={{ color: '#8899aa', fontSize: '0.8rem', padding: '1rem 0' }}>Cargando datos de tripulación...</div>
                            ) : assignments.length === 0 ? (
                                <div style={{ color: '#8899aa', fontSize: '0.8rem', padding: '1rem 0' }}>No hay tripulantes asignados a este buque.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                    {assignments.map((a) => (
                                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '0.6rem 0.7rem' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>{a.seafarer_name || a.seafarer_id}</div>
                                                <div style={{ color: '#8899aa', fontSize: '0.72rem' }}>
                                                    {a.role_onboard || 'Sin rol definido'}
                                                    {a.status ? ` | ${a.status}` : ''}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeAssignment(a.id)}
                                                style={{ border: '1px solid rgba(231,76,60,0.35)', background: 'rgba(231,76,60,0.08)', color: '#ff9f96', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer' }}
                                            >
                                                Quitar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
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

    // Seafarer profile — backed by /api/auth/me + PATCH /api/seafarers/me.
    const userId = user ? user.id : api.getUserId();

    const [me, setMe] = React.useState(null);            // server snapshot from /me
    const [uploads, setUploads] = React.useState([]);
    const [savingProfile, setSavingProfile] = React.useState(false);
    const [profileSavedAt, setProfileSavedAt] = React.useState(0);
    const [profileError, setProfileError] = React.useState('');

    // Editable fields (mirror server values)
    const [city, setCity] = React.useState('');
    const [bio, setBio] = React.useState('');
    // Tag fields: languages, vessels, companies — now backed by PostgreSQL
    const [languages, setLanguages] = React.useState('');
    const [vesselsTags, setVesselsTags] = React.useState('');
    const [companiesTags, setCompaniesTags] = React.useState('');

    // Initial snapshot for dirty detection
    const [snapshot, setSnapshot] = React.useState({ city: '', bio: '', languages: '', vesselsTags: '', companiesTags: '' });

    const refreshFromMe = React.useCallback(async () => {
        try {
            const res = await authFetch('/api/auth/me');
            if (!res.ok) return null;
            const data = await res.json();
            setMe(data);
            setCity(data.city || '');
            setBio(data.bio || '');
            setLanguages(data.languages || '');
            setVesselsTags(data.vessels_worked || '');
            setCompaniesTags(data.companies_worked || '');
            setSnapshot({
                city: data.city || '', bio: data.bio || '',
                languages: data.languages || '', vesselsTags: data.vessels_worked || '', companiesTags: data.companies_worked || '',
            });
            // Mirror into leto-user for legacy consumers (dashboard, sidebar)
            try {
                const lu = JSON.parse(localStorage.getItem('leto-user') || '{}');
                Object.assign(lu, {
                    rank: data.rank,
                    nationality: data.nationality,
                    phone: data.phone,
                    city: data.city,
                    years_experience: data.years_experience,
                    bio: data.bio,
                    is_available: data.is_available,
                    date_of_birth: data.date_of_birth,
                });
                localStorage.setItem('leto-user', JSON.stringify(lu));
            } catch { /* non-fatal */ }
            return data;
        } catch { return null; }
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            await refreshFromMe();
            if (cancelled) return;
            try {
                const u = await api.getUploads(userId);
                if (!cancelled) setUploads(u.uploads || []);
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [userId, refreshFromMe]);

    const isDirty = React.useMemo(() => {
        return city !== snapshot.city || bio !== snapshot.bio
            || languages !== snapshot.languages
            || vesselsTags !== snapshot.vesselsTags
            || companiesTags !== snapshot.companiesTags;
    }, [city, bio, languages, vesselsTags, companiesTags, snapshot]);

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
        setCity(snapshot.city);
        setBio(snapshot.bio);
        setLanguages(snapshot.languages);
        setVesselsTags(snapshot.vesselsTags);
        setCompaniesTags(snapshot.companiesTags);
        if (pendingHash.current) { window.location.hash = pendingHash.current.replace('#', ''); pendingHash.current = null; }
    };
    const handleCancelModal = () => { setShowModal(false); pendingHash.current = null; };

    const handleSave = React.useCallback(async () => {
        setSavingProfile(true);
        setProfileError('');
        try {
            const res = await authFetch('/api/seafarers/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city: city || null,
                    bio: bio || null,
                    languages: languages || null,
                    vessels_worked: vesselsTags || null,
                    companies_worked: companiesTags || null,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Save failed (${res.status})`);
            }
            const next = await res.json();
            setMe(next);
            setSnapshot({
                city: next.city || '', bio: next.bio || '',
                languages: next.languages || '', vesselsTags: next.vessels_worked || '', companiesTags: next.companies_worked || '',
            });
            setProfileSavedAt(Date.now());
        } catch (e) {
            setProfileError(e && e.message ? e.message : 'Save failed');
        }
        setSavingProfile(false);
    }, [city, bio, languages, vesselsTags, companiesTags]);

    const displayName = React.useMemo(() => {
        const fn = me?.first_name || user?.first_name;
        const ln = me?.last_name || user?.last_name;
        if (fn) return [fn, ln].filter(Boolean).join(' ');
        if (user?.email) return user.email.split('@')[0];
        return 'Seafarer';
    }, [me, user]);

    const rank = me?.rank || user?.rank || null;
    const yearsExperience = me?.years_experience != null ? me.years_experience : null;

    const age = React.useMemo(() => {
        const dob = me?.date_of_birth || user?.date_of_birth;
        if (!dob) return null;
        const b = new Date(dob); const n = new Date();
        let a = n.getFullYear() - b.getFullYear();
        if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
        return a;
    }, [me, user]);

    // ─── Document category state (same as MetaDetails) ─────────────
    const [selectedCategory, setSelectedCategory] = React.useState(0);
    const categoryOnSelect = React.useCallback((event) => {
        const val = typeof event === 'object' ? parseInt(event.value, 10) : parseInt(event, 10);
        if (!isNaN(val)) setSelectedCategory(val);
    }, []);

    // Required docs for rank, with upload status
    // Combine rank-specific docs (from RANK_REQUIRED_DOCS) with
    // matrix universal + conditional requirements (e.g. Passport 2, Visa when enabled).
    const requiredDocs = React.useMemo(() => {
        const rankDocs = RANK_REQUIRED_DOCS[rank] || [];
        // Add matrix document requirements not already in the rank list.
        const matrixReqs = getStcwMatrixRequirements(rank, me || {});
        const matrixDocTitles = matrixReqs.filter((r) => r.type === 'document').map((r) => r.title);
        const existing = new Set(rankDocs);
        const extras = matrixDocTitles.filter((t) => !existing.has(t));
        return [...rankDocs, ...extras];
    }, [rank, me]);
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

                        {/* Age · Rank · City · Exp — read-only summary line, all driven by /me */}
                        <div className={metaPreviewStyles['runtime-release-info-container']}>
                            {age !== null && <div className={metaPreviewStyles['runtime-label']}>{'Age: ' + age}</div>}
                            <div className={metaPreviewStyles['release-info-label']}>{'Rank: ' + (rank ? (isCanonicalRank(rank) ? getRankLabel(rank) : rank) : '—')}</div>
                            <div className={metaPreviewStyles['release-info-label']}>
                                {'City: '}<EditableText value={city} onChange={setCity} placeholder={'Agrega tu ciudad'} />
                            </div>
                            <div className={metaPreviewStyles['release-info-label']}>{'Exp: ' + (yearsExperience != null ? `${yearsExperience} years` : '—')}</div>
                        </div>

                        {/* Languages / Vessels / Companies — backed by PostgreSQL */}
                        <TagInput label={'Languages'} value={languages} onChange={setLanguages}
                            placeholder={'Add languages (e.g. Spanish, English)'} />
                        <TagInput label={'Vessels'} value={vesselsTags} onChange={setVesselsTags}
                            placeholder={'Add vessel types (e.g. Oil Tanker, Tug)'} />
                        <TagInput label={'Companies'} value={companiesTags} onChange={setCompaniesTags}
                            placeholder={'Add companies worked at'} />
                        {/* About Me — backed by seafarers.bio in PostgreSQL */}
                        <div className={metaPreviewStyles['description-container']}>
                            <div style={{ textTransform: 'uppercase', fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>{'About me'}</div>
                            <EditableAbout value={bio} onChange={setBio}
                                placeholder={'Describe tu experiencia, certificaciones y objetivos profesionales...'} />
                        </div>

                        {/* Career section (rank dropdown + years experience + availability) */}
                        <CareerSection
                            initialRank={rank}
                            initialYears={yearsExperience}
                            initialAvailable={me?.is_available}
                            onSaved={() => { refreshFromMe(); }}
                        />

                        {/* Mobility Profile (Phase 1: nationality, passports, visa, departure airport) */}
                        <MobilityProfileForm userId={userId} uploadedDocs={uploads} />
                    </div>

                    {/* Save bar for City / About Me / tag fields */}
                    {(isDirty || profileSavedAt > 0) && (
                        <div style={{ padding: '0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            <button onClick={handleSave} disabled={savingProfile || !isDirty} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', background: '#00d2d3', color: '#0a1628', fontSize: '0.85rem', fontWeight: 600, cursor: savingProfile || !isDirty ? 'not-allowed' : 'pointer', opacity: savingProfile || !isDirty ? 0.6 : 1 }}>
                                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            {profileSavedAt > 0 && Date.now() - profileSavedAt < 4000 && (
                                <span style={{ color: '#2ecc71', fontSize: '0.78rem' }}>Saved</span>
                            )}
                            {profileError && <span style={{ color: '#e74c3c', fontSize: '0.78rem' }}>{profileError}</span>}
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
                    {/* Rank context header */}
                    {rank && (
                        <div style={{
                            padding: '0.7rem 1.5rem 0.5rem',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00d2d3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Required for {isCanonicalRank(rank) ? getRankLabel(rank) : rank}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#8899aa' }}>
                                {totalRequired} document{totalRequired !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
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
