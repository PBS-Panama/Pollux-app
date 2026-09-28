// PBS Crewing Module — Seafarer Search
// R5 (limpieza Stremio/GPL): reescritura desde cero del viejo Discover.js —
// sin MetaItem/MetaPreview/ActionButton/MetaLinks/Ratings ni la metafora de
// "catalog"/addons de Stremio. Buscador de marinos propio de Pollux: fetch
// directo a /api/company/seafarers (patron MyFleet), filtros construidos
// SOLO con los valores que de verdad trae ese endpoint (nada de listas STCW
// fijas que no coinciden con los datos reales) y tres acciones reales:
//   - Agregar a mi personal: conecta con el mismo POST /api/company/staff
//     que ya usa MyFleet — antes esto era "Add to list", que dependia de un
//     dispatch AddToLibrary/RemoveFromLibrary que CoreTransport nunca
//     manejaba (no-op real, y ademas ni siquiera estaba cableado a un boton
//     visible).
//   - Agendar entrevista: el toggle de "pending interview" que YA existia
//     (crewStore, alimenta el panel de Calendar) — se preserva tal cual,
//     misma fuente de datos, para no romper esa pantalla.
//   - Descargar CV: mismo endpoint real que ya usa SeafarerProfile.

const React = require('react');
const classnames = require('classnames');
const { MainNavBars } = require('pollux/components');
const { default: Icon } = require('pollux/common/Icon');
const { RANK_CODE_TO_STCW_LABEL, resolveNationalityEntry } = require('pollux/common/crewData');
const { togglePendingInterview, isPendingInterview } = require('pollux/common/crewStore');
const useSeafarerSearch = require('./useSeafarerSearch');
const styles = require('./styles');

const fullNameOf = (s) => (`${s.first_name || ''} ${s.last_name || ''}`).trim() || 'Sin nombre';

const nationalityNamesOf = (s) => {
    const raw = Array.isArray(s.nationalities) && s.nationalities.length > 0
        ? s.nationalities
        : (s.nationality ? [s.nationality] : []);
    return raw.map(resolveNationalityEntry).filter(Boolean).map((n) => n.name);
};

const getAuthToken = () => {
    try {
        const raw = localStorage.getItem('pollux-auth');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return (parsed && parsed.state && parsed.state.accessToken) || null;
    } catch {
        return null;
    }
};

const SeafarerCard = ({ seafarer, selected, onSelect }) => {
    const rankLabel = seafarer.rank ? (RANK_CODE_TO_STCW_LABEL[seafarer.rank] || seafarer.rank) : null;
    const avatarSrc = seafarer.avatar_b64 ? `data:image/jpeg;base64,${seafarer.avatar_b64}` : null;
    return (
        <button
            type={'button'}
            className={classnames(styles['crew-card'], { [styles['selected']]: selected })}
            onClick={() => onSelect(seafarer.id)}
        >
            <div className={styles['crew-avatar']} style={avatarSrc ? { backgroundImage: `url(${avatarSrc})` } : undefined}>
                {!avatarSrc && <Icon className={styles['crew-avatar-placeholder']} name={'person'} />}
            </div>
            <div className={styles['crew-card-body']}>
                <div className={styles['crew-name']}>{fullNameOf(seafarer)}</div>
                <div className={styles['crew-sub']}>
                    {rankLabel || 'Sin rango'}{seafarer.department ? ' · ' + seafarer.department : ''}
                </div>
            </div>
        </button>
    );
};

const DetailPanel = ({ seafarer, isHired, isHiring, isPending, onHire, onTogglePending }) => {
    const [downloading, setDownloading] = React.useState(false);
    const rankLabel = seafarer.rank ? (RANK_CODE_TO_STCW_LABEL[seafarer.rank] || seafarer.rank) : null;
    const nationalityNames = nationalityNamesOf(seafarer);
    const avatarSrc = seafarer.avatar_b64 ? `data:image/jpeg;base64,${seafarer.avatar_b64}` : null;

    const onDownloadCv = () => {
        const token = getAuthToken();
        if (!token || downloading) return;
        setDownloading(true);
        fetch(`/api/company/seafarers/${encodeURIComponent(seafarer.id)}/cv`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('cv download failed'))))
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CV_${fullNameOf(seafarer)}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            })
            .catch(() => { /* silent — el boton solo deja de girar */ })
            .finally(() => setDownloading(false));
    };

    return (
        <div className={styles['detail-panel']}>
            <div className={styles['header-card']}>
                <div className={styles['avatar']} style={avatarSrc ? { backgroundImage: `url(${avatarSrc})` } : undefined}>
                    {!avatarSrc && <Icon className={styles['avatar-placeholder']} name={'person'} />}
                </div>
                <div className={styles['header-info']}>
                    <div className={styles['name']}>{fullNameOf(seafarer)}</div>
                    <div className={styles['row-sub']}>
                        {[rankLabel, seafarer.department, seafarer.city].filter(Boolean).join(' · ')}
                    </div>
                    {seafarer.is_available !== undefined && (
                        <span className={styles['status-chip']} data-status={seafarer.is_available ? 'active' : 'ended'}>
                            {seafarer.is_available ? 'Disponible' : 'No disponible'}
                        </span>
                    )}
                    {nationalityNames.length > 0 && (
                        <div className={styles['chip-row']}>
                            {nationalityNames.map((n) => <span key={n} className={styles['chip']}>{n}</span>)}
                        </div>
                    )}
                </div>
            </div>

            {seafarer.bio && <p className={styles['bio']}>{seafarer.bio}</p>}

            <div className={styles['actions']}>
                <button className={styles['btn-primary']} disabled={isHired || isHiring} onClick={onHire}>
                    {isHired ? 'Ya en tu personal' : isHiring ? 'Agregando…' : 'Agregar a mi personal'}
                </button>
                <button className={styles['btn-secondary']} onClick={onTogglePending}>
                    {isPending ? 'Quitar de entrevistas' : 'Agendar entrevista'}
                </button>
                <button className={styles['btn-secondary']} disabled={downloading} onClick={onDownloadCv}>
                    {downloading ? 'Descargando…' : 'Descargar CV'}
                </button>
                <a className={styles['btn-secondary']} href={`#/seafarer/${seafarer.id}`}>Ver perfil completo</a>
            </div>
        </div>
    );
};

const SeafarerSearch = () => {
    const { loading, error, seafarers, hiredIds, hiringId, hire } = useSeafarerSearch();
    const [search, setSearch] = React.useState('');
    const [selectedDept, setSelectedDept] = React.useState('');
    const [selectedRank, setSelectedRank] = React.useState('');
    const [selectedNat, setSelectedNat] = React.useState('');
    const [selectedId, setSelectedId] = React.useState(null);
    const [actionError, setActionError] = React.useState('');
    const [, forceRerender] = React.useReducer((c) => c + 1, 0);

    // Opciones de filtro SOLO con lo que el endpoint realmente trae hoy —
    // nada de listas STCW fijas que no coinciden con los datos reales.
    const departments = React.useMemo(
        () => Array.from(new Set(seafarers.map((s) => s.department).filter(Boolean))).sort(),
        [seafarers]
    );
    const ranks = React.useMemo(
        () => Array.from(new Set(seafarers.map((s) => s.rank).filter(Boolean))).sort(),
        [seafarers]
    );
    const nationalities = React.useMemo(() => {
        const set = new Set();
        seafarers.forEach((s) => nationalityNamesOf(s).forEach((n) => set.add(n)));
        return Array.from(set).sort();
    }, [seafarers]);

    const filtered = React.useMemo(() => seafarers.filter((s) => {
        if (selectedDept && s.department !== selectedDept) return false;
        if (selectedRank && s.rank !== selectedRank) return false;
        if (selectedNat && !nationalityNamesOf(s).includes(selectedNat)) return false;
        if (search.trim() && !fullNameOf(s).toLowerCase().includes(search.trim().toLowerCase())) return false;
        return true;
    }), [seafarers, selectedDept, selectedRank, selectedNat, search]);

    React.useEffect(() => {
        if (selectedId && !filtered.some((s) => s.id === selectedId)) {
            setSelectedId(filtered.length > 0 ? filtered[0].id : null);
        } else if (!selectedId && filtered.length > 0) {
            setSelectedId(filtered[0].id);
        }
    }, [filtered, selectedId]);

    const selected = filtered.find((s) => s.id === selectedId) || null;

    const onHire = () => {
        if (!selected) return;
        setActionError('');
        hire(selected.id).catch((e) => setActionError(e.message || 'No se pudo agregar a tu personal.'));
    };

    const onTogglePending = () => {
        if (!selected) return;
        const rankLabel = selected.rank ? (RANK_CODE_TO_STCW_LABEL[selected.rank] || selected.rank) : undefined;
        togglePendingInterview({
            id: selected.id,
            name: fullNameOf(selected),
            department: selected.department,
            rank: rankLabel,
            nationality: nationalityNamesOf(selected).join(', ') || undefined,
        });
        forceRerender();
    };

    return (
        <MainNavBars className={styles['search-container']} route={'companyCrewdb'}>
            <div className={styles['search-page']}>
                <div className={styles['search-header']}>
                    <h1 className={styles['search-title']}>Crew Database</h1>
                    <p className={styles['search-subtitle']}>Busca marinos por nombre, departamento, rango o nacionalidad.</p>
                </div>

                {error && <div className={styles['error-banner']}>{error}</div>}
                {actionError && <div className={styles['error-banner']}>{actionError}</div>}

                <div className={styles['filters-row']}>
                    <input
                        className={styles['text-input']}
                        placeholder={'Buscar por nombre…'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select className={styles['text-input']} value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                        <option value={''}>Todos los departamentos</option>
                        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className={styles['text-input']} value={selectedRank} onChange={(e) => setSelectedRank(e.target.value)}>
                        <option value={''}>Todos los rangos</option>
                        {ranks.map((r) => <option key={r} value={r}>{RANK_CODE_TO_STCW_LABEL[r] || r}</option>)}
                    </select>
                    <select className={styles['text-input']} value={selectedNat} onChange={(e) => setSelectedNat(e.target.value)}>
                        <option value={''}>Todas las nacionalidades</option>
                        {nationalities.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>

                {loading && <div className={styles['muted']}>Cargando…</div>}

                {!loading && filtered.length === 0 && !error && (
                    <div className={styles['empty-state']}>
                        <div className={styles['empty-title']}>Sin resultados</div>
                        <div className={styles['empty-desc']}>Ningún marino coincide con los filtros seleccionados.</div>
                    </div>
                )}

                <div className={styles['search-body']}>
                    <div className={styles['crew-grid']}>
                        {filtered.map((s) => (
                            <SeafarerCard key={s.id} seafarer={s} selected={s.id === selectedId} onSelect={setSelectedId} />
                        ))}
                    </div>
                    {selected && (
                        <DetailPanel
                            seafarer={selected}
                            isHired={hiredIds.has(selected.id)}
                            isHiring={hiringId === selected.id}
                            isPending={isPendingInterview(selected.id)}
                            onHire={onHire}
                            onTogglePending={onTogglePending}
                        />
                    )}
                </div>
            </div>
        </MainNavBars>
    );
};

module.exports = SeafarerSearch;
