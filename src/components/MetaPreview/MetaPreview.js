// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const UrlUtils = require('url');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { default: Button } = require('leto/components/Button');
const { default: Image } = require('leto/components/Image');
const ModalDialog = require('leto/components/ModalDialog');
const SharePrompt = require('leto/components/SharePrompt');
const CONSTANTS = require('leto/common/CONSTANTS');
const routesRegexp = require('leto/common/routesRegexp');
const useBinaryState = require('leto/common/useBinaryState');
const ActionButton = require('./ActionButton');
const MetaLinks = require('./MetaLinks');
const MetaPreviewPlaceholder = require('./MetaPreviewPlaceholder');
const styles = require('./styles');
const { Ratings } = require('./Ratings');
const { togglePendingInterview, isPendingInterview } = require('leto/common/crewStore');

// PBS Crewing Module: corporate default profile image
const CREW_DEFAULT_POSTER = 'images/profileimg.png';

// PBS Crewing Module: name generator (same logic as MetaItem)
const CREW_FIRST_NAMES = [
    'Carlos', 'Miguel', 'José', 'Ricardo', 'Andrés', 'Fernando', 'Diego', 'Luis',
    'Roberto', 'Alejandro', 'Manuel', 'Gabriel', 'Daniel', 'Marco', 'Eduardo',
    'Héctor', 'Raúl', 'Sergio', 'Víctor', 'Pablo', 'Javier', 'Óscar', 'Tomás',
    'Enrique', 'Arturo', 'Rafael', 'Iván', 'Felipe', 'Adrián', 'Gonzalo',
    'Santiago', 'Martín', 'Ignacio', 'Cristian', 'Emilio', 'Ramón', 'Álvaro',
    'Nicolás', 'Jorge', 'Alberto', 'Pedro', 'Francisco', 'Rodrigo', 'Esteban',
    'Camilo', 'Sebastián', 'Mateo', 'Leonardo', 'David', 'Ernesto',
];
const CREW_LAST_NAMES = [
    'Rodríguez', 'González', 'Martínez', 'López', 'Hernández', 'García', 'Pérez',
    'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz',
    'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Ramos', 'Vargas', 'Castillo',
    'Jiménez', 'Moreno', 'Romero', 'Alvarado', 'Ruiz', 'Mendoza', 'Aguilar',
    'Medina', 'Castro', 'Herrera', 'Vega', 'Delgado', 'Núñez', 'Paredes',
    'Córdoba', 'Salazar', 'Pineda', 'Acosta', 'Miranda', 'Bravo', 'Navarro',
    'Campos', 'Espinoza', 'Arias', 'Rojas', 'Molina', 'Silva', 'Guerrero',
];
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };
const getCrewName = (n) => (typeof n === 'string' ? n : '');

// ─── PBS Crewing: random crew profile data ──────────────────────────
const CITIES = [
    'Panama City', 'Colón', 'Bogotá', 'Cartagena', 'Barranquilla',
    'Lima', 'Callao', 'Guayaquil', 'Quito', 'Mexico City',
    'Veracruz', 'São Paulo', 'Santos', 'Rio de Janeiro', 'Valparaíso',
    'Santiago', 'Buenos Aires', 'Caracas', 'Tegucigalpa', 'San José',
    'Santo Domingo', 'La Habana', 'Managua', 'La Paz', 'Montevideo',
    'Houston', 'Miami', 'Vancouver', 'Manzanillo', 'Puerto Limón',
];

const ABOUT_ME_TEMPLATES = [
    'Dedicated maritime professional with {years} years of experience in international shipping operations. Holds valid STCW certificates including Basic Safety Training, Advanced Firefighting, and Medical First Aid. Experienced in both conventional and DP vessels. Strong commitment to safety protocols and environmental compliance.',
    'Seasoned seafarer with {years} years of service across multiple vessel types. Proficient in cargo handling, navigation systems, and emergency response procedures. Certified in GMDSS operations and survival craft proficiency. Known for strong teamwork and leadership skills onboard.',
    'Experienced maritime officer with {years} years in the shipping industry. Specialized in tanker operations with certificates in Oil and Chemical cargo handling. Familiar with ISM, ISPS, and MLC 2006 requirements. Detail-oriented professional with excellent safety record.',
    'Highly motivated crew member with {years} years of offshore and coastal experience. Trained in dynamic positioning operations, crane operations, and firefighting. Holds endorsements for multiple flag states. Available for worldwide deployment.',
    'Professional mariner with {years} years of experience in commercial shipping routes across the Americas and Europe. Holds certifications in Bridge Resource Management, ECDIS, and Hazmat handling. Committed to continuous professional development and safety culture.',
    'Reliable and skilled seafarer with {years} years onboard various vessel classes. Experienced in port operations, mooring, and cargo securing. Certified in Proficiency in Survival Craft and Medical Care. Fluent communicator with multicultural crew experience.',
    'Accomplished maritime professional with {years} years of sea time. Expertise in vessel maintenance, engine room operations, and fuel management. Holds Chief Engineer certification for vessels over 3000 kW. Strong focus on efficiency and environmental standards.',
    'Versatile crew member with {years} years of experience across tankers, bulk carriers, and offshore supply vessels. STCW-compliant with additional certifications in High Voltage systems and Refrigeration. Proven track record of zero-incident voyages.',
];

const VESSEL_TYPES = [
    'Oil Tanker', 'Chemical Tanker', 'LNG Carrier', 'LPG Carrier',
    'Container Ship', 'Bulk Carrier', 'General Cargo',
    'PSV (Platform Supply Vessel)', 'AHTS (Anchor Handling)',
    'Tug', 'Barge', 'FPSO', 'Offshore Drill Ship',
    'Ro-Ro', 'Car Carrier', 'Cruise Ship', 'Ferry',
    'Cable Layer', 'Dredger', 'Icebreaker',
];

const SHIPPING_COMPANIES = [
    'Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd', 'Evergreen Marine',
    'COSCO Shipping', 'Ocean Network Express', 'VT Shipping',
    'Teekay Corporation', 'Frontline', 'Euronav', 'Stena Bulk',
    'Pacific International Lines', 'Tidewater', 'Bourbon Offshore',
    'Swire Pacific Offshore', 'DOF Group', 'Solstad Offshore',
    'SEACOR Marine', 'Intermarine', 'Crowley Maritime',
    'Seaspan Corporation', 'Star Bulk Carriers', 'Navios Maritime',
];

// Language sets matched to nationality patterns
const LANG_SETS = {
    spanish: ['Spanish', 'English'],
    portuguese: ['Portuguese', 'Spanish', 'English'],
    english: ['English', 'Spanish'],
    french: ['French', 'Spanish', 'English'],
};
// Map nationality keywords → language set
const NATIONALITY_LANG_MAP = {
    'Brazil': 'portuguese', 'United States': 'english', 'Canada': 'english',
};

const getCrewAge = (h) => 22 + (h % 38); // 22-59
const getCrewCity = (h) => CITIES[h % CITIES.length];
const getCrewExperience = (h) => { const y = 1 + (h % 25); const m = (h >>> 2) % 12; return y + m / 12; }; // 1.0-25.9 years
const getCrewAbout = (h) => {
    const years = 2 + (h % 20);
    return ABOUT_ME_TEMPLATES[h % ABOUT_ME_TEMPLATES.length].replace('{years}', years);
};
const getCrewVessels = (h) => {
    const count = 2 + (h % 4); // 2-5 vessel types
    const result = [];
    for (let i = 0; i < count; i++) result.push(VESSEL_TYPES[(h + i * 7) % VESSEL_TYPES.length]);
    return result;
};
const getCrewCompanies = (h) => {
    const count = 2 + (h % 3); // 2-4 companies
    const result = [];
    for (let i = 0; i < count; i++) result.push(SHIPPING_COMPANIES[(h + i * 5) % SHIPPING_COMPANIES.length]);
    return result;
};
const getCrewLanguages = (h, links) => {
    // Try to detect nationality from the links (Genres category)
    let langSet = 'spanish'; // default
    if (Array.isArray(links)) {
        const genreLink = links.find((l) => l && l.category === 'Genres');
        if (genreLink && NATIONALITY_LANG_MAP[genreLink.name]) {
            langSet = NATIONALITY_LANG_MAP[genreLink.name];
        }
    }
    const base = LANG_SETS[langSet] || LANG_SETS.spanish;
    // Sometimes add French
    if (h % 5 === 0 && !base.includes('French')) return [...base, 'French'];
    return base;
};

const ALLOWED_LINK_REDIRECTS = [
    routesRegexp.search.regexp,
    routesRegexp.companyCrewdb.regexp,
    routesRegexp.metadetails.regexp
];

const MetaPreview = React.forwardRef(({ className, compact, name, logo, background, runtime, releaseInfo, released, description, department, rank, nationality, yearsExperience, email, metaId, deepLinks, links, trailerStreams, inLibrary, toggleInLibrary, ratingInfo, complianceSummary }, ref) => {
    const { t } = useTranslation();
    const crewName = React.useMemo(() => getCrewName(name), [name]);
    const [shareModalOpen, openShareModal, closeShareModal] = useBinaryState(false);

    // PBS Crewing: "Add to list" toggle synced with card button via crewStore
    const crewDepartmentPreview = React.useMemo(() => {
        if (typeof department === 'string' && department.length > 0) return department;
        const fromLinks = Array.isArray(links) ? links.find((link) => link?.category === 'Department')?.name : null;
        return fromLinks || '';
    }, [department, links]);
    const crewRankPreview = React.useMemo(() => {
        if (typeof rank === 'string' && rank.length > 0) return rank;
        if (typeof runtime === 'string' && runtime.length > 0) return runtime;
        return '';
    }, [rank, runtime]);
    const crewNationalityPreview = React.useMemo(() => {
        if (typeof nationality === 'string' && nationality.length > 0) return nationality;
        if (typeof releaseInfo === 'string' && releaseInfo.length > 0) return releaseInfo;
        return '';
    }, [nationality, releaseInfo]);
    const crewId = (typeof metaId === 'string' && metaId.length > 0) ? metaId : (name || '');
    const [addedToList, setAddedToList] = React.useState(() => isPendingInterview(crewId));
    // Re-check when name changes (navigating between crew)
    React.useEffect(() => {
        setAddedToList(isPendingInterview(crewId));
    }, [crewId]);
    // Listen for sync events from the card button
    React.useEffect(() => {
        const handler = (e) => {
            if (e.detail && e.detail.id === crewId) setAddedToList(e.detail.added);
        };
        window.addEventListener('pbs-pending-changed', handler);
        return () => window.removeEventListener('pbs-pending-changed', handler);
    }, [crewId]);
    const onAddToList = React.useCallback(() => {
        const crew = { id: crewId, name: crewName, department: crewDepartmentPreview, rank: crewRankPreview, nationality: crewNationalityPreview };
        const nowAdded = togglePendingInterview(crew);
        setAddedToList(nowAdded);
    }, [crewId, crewName, crewDepartmentPreview, crewRankPreview, crewNationalityPreview]);

    const crewExperience = React.useMemo(() => {
        if (Number.isFinite(yearsExperience)) return Number(yearsExperience);
        const fromLinks = Array.isArray(links) ? links.find((link) => link?.category === 'Experience')?.name : null;
        if (typeof fromLinks === 'string') {
            const parsed = parseFloat(fromLinks);
            if (Number.isFinite(parsed)) return parsed;
        }
        return null;
    }, [yearsExperience, links]);
    const crewAbout = React.useMemo(() => (typeof description === 'string' ? description : ''), [description]);

    const linksGroups = React.useMemo(() => {
        const groups = new Map();

        if (Array.isArray(links)) {
            links.forEach((link) => {
                if (!link || typeof link.category !== 'string' || typeof link.name !== 'string') return;
                if (
                    link.category === CONSTANTS.IMDB_LINK_CATEGORY ||
                    link.category === CONSTANTS.SHARE_LINK_CATEGORY ||
                    link.category === CONSTANTS.WRITERS_LINK_CATEGORY
                ) {
                    return;
                }
                if (!groups.has(link.category)) groups.set(link.category, []);
                groups.get(link.category).push({ label: link.name, href: link.url });
            });
        }

        if (typeof email === 'string' && email.length > 0 && !groups.has('Contact')) {
            groups.set('Contact', [{ label: email }]);
        }

        return groups;
    }, [links, email]);
    const showHref = React.useMemo(() => {
        return deepLinks ?
            typeof deepLinks.player === 'string' ?
                deepLinks.player
                :
                typeof deepLinks.metaDetailsStreams === 'string' ?
                    deepLinks.metaDetailsStreams
                    :
                    typeof deepLinks.metaDetailsVideos === 'string' ?
                        deepLinks.metaDetailsVideos
                        :
                        null
            :
            null;
    }, [deepLinks]);
    const trailerHref = React.useMemo(() => {
        if (!Array.isArray(trailerStreams) || trailerStreams.length === 0) {
            return null;
        }

        return trailerStreams[0].deepLinks.player;
    }, [trailerStreams]);
    return (
        <div className={classnames(className, styles['meta-preview-container'], { [styles['compact']]: compact })} ref={ref}>
            <div className={styles['meta-info-container']}>
                {
                    typeof name === 'string' && name.length > 0 ?
                        <div className={styles['logo-placeholder']}>{crewName}</div>
                        :
                        null
                }
                {
                    typeof name === 'string' && name.length > 0 ?
                        <div className={styles['runtime-release-info-container']}>
                            <div className={styles['runtime-label']}>{`Rank: ${crewRankPreview || 'N/A'}`}</div>
                            <div className={styles['release-info-label']}>{`Nationality: ${crewNationalityPreview || 'N/A'}`}</div>
                            {
                                Number.isFinite(crewExperience) ?
                                    <div className={styles['release-info-label']}>{`Exp: ${crewExperience.toFixed(1)} years`}</div>
                                    :
                                    null
                            }
                        </div>
                        :
                        null
                }
                {
                    compact && typeof name === 'string' && name.length > 0 ?
                        <div className={styles['description-container']}>
                            {crewAbout}
                        </div>
                        :
                        null
                }
                {
                    complianceSummary && typeof name === 'string' && name.length > 0 ?
                        (() => {
                            const cs = complianceSummary;
                            const pct = cs.compliance_pct || 0;
                            const pctColor = pct >= 80 ? '#2ecc71' : pct >= 50 ? '#f1c40f' : '#e74c3c';
                            const cw = cs.certification_window || {};
                            const visa = cs.visa || {};
                            const identity = cs.identity || {};
                            const blockers = Array.isArray(cs.blockers) ? cs.blockers : [];
                            const reasonColor = (code) => {
                                if (code === 'DOC_EXPIRED' || code === 'VISA_PASSPORT_MISMATCH') return '#e74c3c';
                                if (code === 'DOC_EXPIRING_SOON') return '#f1c40f';
                                if (code === 'PROFILE_INCOMPLETE') return '#00d2d3';
                                return '#8899aa';
                            };
                            return (
                                <div style={{ marginTop: '1.5rem', padding: '0.8rem 0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                        <div style={{ color: '#00d2d3', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compliance Summary</div>
                                        <div style={{ color: pctColor, fontSize: '1rem', fontWeight: 700 }}>{pct}%</div>
                                    </div>
                                    <div style={{ height: '0.35rem', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.7rem' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: pctColor, transition: 'width 250ms ease' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.4rem 0.8rem', fontSize: '0.72rem', marginBottom: '0.6rem' }}>
                                        <div><span style={{ color: '#8899aa' }}>Missing:</span> <span style={{ color: '#fff', fontWeight: 600 }}>{cs.missing_total || 0}</span> / {cs.required_total || 0}</div>
                                        <div><span style={{ color: '#8899aa' }}>Travel blocks:</span> <span style={{ color: blockers.length > 0 ? '#ff9f96' : '#2ecc71', fontWeight: 600 }}>{blockers.length}</span></div>
                                        <div><span style={{ color: '#8899aa' }}>Expired:</span> <span style={{ color: cw.expired > 0 ? '#e74c3c' : '#fff', fontWeight: 600 }}>{cw.expired || 0}</span></div>
                                        <div><span style={{ color: '#8899aa' }}>Expiring ≤90d:</span> <span style={{ color: cw.expiring_90 > 0 ? '#f1c40f' : '#fff', fontWeight: 600 }}>{cw.expiring_90 || 0}</span></div>
                                        <div><span style={{ color: '#8899aa' }}>Visa:</span> <span style={{ color: visa.has_visa ? '#2ecc71' : '#8899aa', fontWeight: 600 }}>{visa.has_visa ? `Yes${visa.country ? ` (${visa.country})` : ''}` : 'No'}</span></div>
                                        <div><span style={{ color: '#8899aa' }}>Dual nationality:</span> <span style={{ color: '#fff', fontWeight: 600 }}>{identity.double_nationality ? 'Yes' : 'No'}</span></div>
                                    </div>
                                    {Array.isArray(cs.missing_critical_top3) && cs.missing_critical_top3.length > 0 ? (
                                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div style={{ color: '#ff9f96', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>Top missing docs</div>
                                            {cs.missing_critical_top3.map((t, i) => (
                                                <div key={i} style={{ color: '#d2dbe5', fontSize: '0.72rem', lineHeight: 1.5 }}>• {t}</div>
                                            ))}
                                        </div>
                                    ) : null}
                                    {blockers.length > 0 ? (
                                        <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div style={{ color: '#00d2d3', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>Why blocked</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                {blockers.slice(0, 8).map((b, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                        <span style={{ flex: 'none', display: 'inline-block', padding: '0.1rem 0.35rem', borderRadius: '3px', fontSize: '0.6rem', fontWeight: 700, color: reasonColor(b.reason_code), background: `${reasonColor(b.reason_code)}20`, border: `1px solid ${reasonColor(b.reason_code)}40`, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{(b.reason_code || '').replace(/_/g, ' ')}</span>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ color: '#d2dbe5', fontSize: '0.72rem', fontWeight: 500 }}>{b.title}</div>
                                                            {b.reason_detail ? <div style={{ color: '#8899aa', fontSize: '0.68rem' }}>{b.reason_detail}</div> : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : cs.compliant ? (
                                        <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#2ecc71', fontSize: '0.72rem', fontWeight: 600 }}>
                                            ✓ Meets all requirements{rank ? ` for ${rank}` : ''}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })()
                        :
                        null
                }
                {
                    Array.from(linksGroups.keys())
                        .filter((category) => {
                            return category !== CONSTANTS.IMDB_LINK_CATEGORY &&
                                category !== CONSTANTS.SHARE_LINK_CATEGORY &&
                                category !== CONSTANTS.WRITERS_LINK_CATEGORY;
                        })
                        .map((category, index) => (
                            <MetaLinks
                                key={index}
                                className={styles['meta-links']}
                                label={category}
                                links={linksGroups.get(category)}
                            />
                        ))
                }
                {
                    !compact && typeof name === 'string' && name.length > 0 ?
                        <div className={styles['description-container']}>
                            <div className={styles['label-container']}>
                                {'About me'}
                            </div>
                            {crewAbout}
                        </div>
                        :
                        null
                }
            </div>
            <div className={styles['action-buttons-container']}>
                <ActionButton
                    className={classnames(styles['action-button'], { [styles['added-to-list']]: addedToList })}
                    icon={addedToList ? 'crew-check' : 'crew-add-list'}
                    label={addedToList ? 'Added' : 'Add to list'}
                    tabIndex={compact ? -1 : 0}
                    onClick={onAddToList}
                />
                <ActionButton
                    className={styles['action-button']}
                    icon={'crew-download-cv'}
                    label={'Download CV'}
                    tabIndex={compact ? -1 : 0}
                />
                {
                    typeof trailerHref === 'string' ?
                        <ActionButton
                            className={styles['action-button']}
                            icon={'crew-interview'}
                            label={'Interview'}
                            tabIndex={compact ? -1 : 0}
                            href={trailerHref}
                        />
                        :
                        <ActionButton
                            className={styles['action-button']}
                            icon={'crew-interview'}
                            label={'Interview'}
                            tabIndex={compact ? -1 : 0}
                        />
                }
                <ActionButton
                    className={classnames(styles['action-button'], styles['show-button'])}
                    icon={'crew-full-profile'}
                    label={'Full Profile'}
                    tabIndex={compact ? -1 : 0}
                    href={showHref}
                />
            </div>
        </div>
    );
});

MetaPreview.Placeholder = MetaPreviewPlaceholder;

MetaPreview.propTypes = {
    className: PropTypes.string,
    compact: PropTypes.bool,
    name: PropTypes.string,
    logo: PropTypes.string,
    background: PropTypes.string,
    runtime: PropTypes.string,
    releaseInfo: PropTypes.string,
    released: PropTypes.instanceOf(Date),
    description: PropTypes.string,
    department: PropTypes.string,
    rank: PropTypes.string,
    nationality: PropTypes.string,
    yearsExperience: PropTypes.number,
    email: PropTypes.string,
    metaId: PropTypes.string,
    deepLinks: PropTypes.shape({
        metaDetailsVideos: PropTypes.string,
        metaDetailsStreams: PropTypes.string,
        player: PropTypes.string
    }),
    links: PropTypes.arrayOf(PropTypes.shape({
        category: PropTypes.string,
        name: PropTypes.string,
        url: PropTypes.string
    })),
    trailerStreams: PropTypes.array,
    inLibrary: PropTypes.bool,
    toggleInLibrary: PropTypes.func,
    ratingInfo: PropTypes.object,
};

module.exports = MetaPreview;
