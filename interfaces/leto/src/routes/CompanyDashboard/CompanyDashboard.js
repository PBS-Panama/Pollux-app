// PBS Crewing Module — Company Dashboard
// R4 (limpieza Stremio/GPL): reescritura desde cero del viejo Board.js — sin
// MetaRow/ContinueWatchingItem/EventModal ni la metafora de "catalogos"/
// "continue watching" de Stremio. Vista general de la empresa: tres numeros
// reales (marinos en la base, personal contratado, barcos), y la tripulacion
// agrupada por departamento. Un click en un marino abre un perfil rapido que
// reutiliza SeafarerProfilePanel (misma pieza que la pagina de perfil, R3).
// Solo datos reales via /api/company/*: si algo no tiene endpoint, no se
// muestra (notas-pendientes-2026-09-28, R4).

const React = require('react');
const { MainNavBars, ModalDialog } = require('pollux/components');
const { default: Icon } = require('pollux/common/Icon');
const { RANK_CODE_TO_STCW_LABEL } = require('pollux/common/crewData');
const { SeafarerProfilePanel } = require('pollux/routes/SeafarerProfile/SeafarerProfile');
const useSeafarerProfile = require('pollux/routes/SeafarerProfile/useSeafarerProfile');
const useCompanyDashboard = require('./useCompanyDashboard');
const styles = require('./styles');

const SeafarerQuickView = ({ seafarerId, onClose }) => {
    const { profile, embarkations, loading, error, downloadCv } = useSeafarerProfile(seafarerId);
    return (
        <ModalDialog className={styles['quick-view']} title={'Perfil rápido'} onCloseRequest={onClose}>
            <SeafarerProfilePanel
                className={styles['quick-view-panel']}
                profile={profile}
                embarkations={embarkations}
                loading={loading}
                error={error}
                onDownloadCv={downloadCv}
            />
            <a className={styles['btn-secondary']} href={`#/seafarer/${seafarerId}`}>Ver perfil completo</a>
        </ModalDialog>
    );
};

const CrewCard = ({ seafarer, onOpen }) => {
    const fullName = `${seafarer.first_name || ''} ${seafarer.last_name || ''}`.trim() || 'Sin nombre';
    const rankLabel = seafarer.rank ? (RANK_CODE_TO_STCW_LABEL[seafarer.rank] || seafarer.rank) : null;
    const avatarSrc = seafarer.avatar_b64 ? `data:image/jpeg;base64,${seafarer.avatar_b64}` : null;
    return (
        <button type={'button'} className={styles['crew-card']} onClick={() => onOpen(seafarer.id)}>
            <div className={styles['crew-avatar']} style={avatarSrc ? { backgroundImage: `url(${avatarSrc})` } : undefined}>
                {!avatarSrc && <Icon className={styles['crew-avatar-placeholder']} name={'person'} />}
            </div>
            <div className={styles['crew-card-body']}>
                <div className={styles['crew-name']}>{fullName}</div>
                <div className={styles['crew-sub']}>{rankLabel || 'Sin rango'}</div>
            </div>
        </button>
    );
};

const CompanyDashboard = () => {
    const { loading, error, seafarers, staffCount, vesselCount, departmentGroups } = useCompanyDashboard();
    const [openSeafarerId, setOpenSeafarerId] = React.useState(null);

    return (
        <MainNavBars className={styles['dashboard-container']} route={'companyDashboard'}>
            <div className={styles['dashboard-page']}>
                <div className={styles['dashboard-header']}>
                    <h1 className={styles['dashboard-title']}>Dashboard</h1>
                    <p className={styles['dashboard-subtitle']}>Vista general de tu tripulación, personal y flota.</p>
                </div>

                {error && <div className={styles['error-banner']}>{error}</div>}

                <div className={styles['stats-row']}>
                    <div className={styles['stat-card']}>
                        <div className={styles['stat-value']}>{loading ? '—' : seafarers.length}</div>
                        <div className={styles['stat-label']}>Marinos en la base</div>
                    </div>
                    <div className={styles['stat-card']}>
                        <div className={styles['stat-value']}>{loading || staffCount === null ? '—' : staffCount}</div>
                        <div className={styles['stat-label']}>Personal contratado</div>
                    </div>
                    <div className={styles['stat-card']}>
                        <div className={styles['stat-value']}>{loading || vesselCount === null ? '—' : vesselCount}</div>
                        <div className={styles['stat-label']}>Barcos registrados</div>
                    </div>
                </div>

                {loading && <div className={styles['muted']}>Cargando…</div>}

                {!loading && seafarers.length === 0 && !error && (
                    <div className={styles['empty-state']}>
                        <div className={styles['empty-title']}>Todavía no hay marinos en la base de datos</div>
                        <div className={styles['empty-desc']}>Los marinos aparecen acá cuando se registran en Castor.</div>
                    </div>
                )}

                {departmentGroups.map((group) => (
                    <div key={group.name} className={styles['section']}>
                        <div className={styles['section-title']}>
                            {group.name}
                            <span className={styles['section-hint']}> · {group.items.length}</span>
                        </div>
                        <div className={styles['crew-grid']}>
                            {group.items.map((s) => <CrewCard key={s.id} seafarer={s} onOpen={setOpenSeafarerId} />)}
                        </div>
                    </div>
                ))}
            </div>

            {openSeafarerId && (
                <SeafarerQuickView seafarerId={openSeafarerId} onClose={() => setOpenSeafarerId(null)} />
            )}
        </MainNavBars>
    );
};

module.exports = CompanyDashboard;
