// Leto Crewing Module: My Profile page
// Clones MetaDetails layout exactly, swaps mock data for real user data
// Left = MetaPreview (editable), Right = DocumentsList (required docs by rank)

const React = require('react');
const classnames = require('classnames');
const { VerticalNavBar, HorizontalNavBar, SearchBar } = require('stremio/components');
const { default: Button } = require('stremio/components/Button');
const MetaLinks = require('stremio/components/MetaPreview/MetaLinks');
const ActionButton = require('stremio/components/MetaPreview/ActionButton');
const CategoryBar = require('stremio/routes/MetaDetails/VideosList/SeasonsBar');
const metaPreviewStyles = require('stremio/components/MetaPreview/styles');
const styles = require('./styles');
const api = require('stremio/common/apiClient');
const { CREW_DOC_LABELS, CREW_DOC_CATEGORIES, RANK_REQUIRED_DOCS, getComplianceStatus, getExpiryStatus, CREW_ALL_DOCS } = require('stremio/common/crewDocData');

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
// MyProfile — clones MetaDetails layout
// ═══════════════════════════════════════════════════════════════════
const MyProfile = () => {
    const user = React.useMemo(() => getLetoUser(), []);
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

                <div className={styles['spacing']} />

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
