// PBS Crewing Module — Seafarer Profile
// R3 (limpieza Stremio/GPL): reescritura desde cero de la vieja MetaDetails
// (perfil de tripulante) — sin MetaPreview/VideosList/StreamsList/SeasonsBar/
// Video.js ni la metafora de "temporadas" de Stremio. Dos piezas:
//   - SeafarerProfilePanel: el contenido del perfil en si, sin layout de
//     pagina — pensado para que Board/Discover (R4/R5) lo reusen tal cual
//     (en un modal o panel lateral), no solo esta pagina completa.
//   - SeafarerProfile: la pagina completa (barra superior + Panel), la que
//     cuelga de la ruta.

const React = require('react');
const classnames = require('classnames');
const { HorizontalNavBar, Button } = require('pollux/components');
const { default: Icon } = require('pollux/common/Icon');
const { RANK_CODE_TO_STCW_LABEL, resolveNationalityEntry } = require('pollux/common/crewData');
const vesselTypesData = require('pollux/common/profileData/vessel_types.json');
const languagesData = require('pollux/common/profileData/languages_profile.json');
const useSeafarerProfile = require('./useSeafarerProfile');
const styles = require('./styles');

// Same label-lookup convention as the old MetaPreview.js: the profile stores
// IDs/codes, show the human label, fall back to the raw value if it isn't
// in the catalog.
const VESSEL_LABELS = {};
Object.values(vesselTypesData.vessel_types || {}).forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((v) => { VESSEL_LABELS[v.id] = v.label; });
});
const LANGUAGE_LABELS = {};
(languagesData.languages || []).forEach((l) => { LANGUAGE_LABELS[l.code] = l.label; });

// Exhaustivo contra backend/app/services/compliance_engine.py's DocState enum.
const COMPLIANCE_STATE_LABEL = {
    VALID: 'Vigente',
    EXPIRING: 'Por vencer',
    CRITICAL: 'Crítico',
    EXPIRED: 'Vencido',
    MISSING: 'Faltante',
};

const DOC_STATUS_LABEL = {
    verified: 'Verificado',
    pending: 'Pendiente',
    rejected: 'Rechazado',
};

const formatDate = (s) => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-PA') : null;

const SeafarerProfilePanel = ({ profile, embarkations, loading, error, onDownloadCv, className }) => {
    if (loading) {
        return <div className={classnames(className, styles['muted'])}>Cargando perfil…</div>;
    }
    if (error) {
        return <div className={classnames(className, styles['error-banner'])}>{error}</div>;
    }
    if (!profile) {
        return <div className={classnames(className, styles['muted'])}>No se encontró este perfil.</div>;
    }

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Sin nombre';
    const rankLabel = profile.rank ? (RANK_CODE_TO_STCW_LABEL[profile.rank] || profile.rank) : null;
    const nationalities = Array.isArray(profile.nationalities) && profile.nationalities.length > 0
        ? profile.nationalities
        : (profile.nationality ? [profile.nationality] : []);
    const nationalityLabels = nationalities.map((n) => resolveNationalityEntry(n).name);
    const vesselLabels = Array.isArray(profile.vessel_types) ? profile.vessel_types.map((id) => VESSEL_LABELS[id] || id) : [];
    const languageLabels = Array.isArray(profile.spoken_languages) ? profile.spoken_languages.map((c) => LANGUAGE_LABELS[c] || c) : [];
    const avatarSrc = profile.avatar_b64 ? `data:image/jpeg;base64,${profile.avatar_b64}` : null;

    return (
        <div className={classnames(className, styles['panel'])}>
            <div className={styles['header-card']}>
                <div className={styles['avatar']} style={avatarSrc ? { backgroundImage: `url(${avatarSrc})` } : undefined}>
                    {!avatarSrc && <Icon className={styles['avatar-placeholder']} name={'person'} />}
                </div>
                <div className={styles['header-info']}>
                    <div className={styles['name-row']}>
                        <h1 className={styles['name']}>{fullName}</h1>
                        <span className={styles['status-chip']} data-status={profile.is_available ? 'active' : 'ended'}>
                            {profile.is_available ? 'Disponible' : 'No disponible'}
                        </span>
                    </div>
                    <div className={styles['row-sub']}>
                        {[rankLabel, profile.department, profile.city].filter(Boolean).join(' · ')}
                    </div>
                    {profile.seafarer_code && <div className={styles['muted-small']}>Código {profile.seafarer_code}</div>}
                    {nationalityLabels.length > 0 && (
                        <div className={styles['chip-row']}>
                            {nationalityLabels.map((n) => <span key={n} className={styles['chip']}>{n}</span>)}
                        </div>
                    )}
                </div>
                {typeof profile.compliance_score === 'number' && (
                    <div className={styles['compliance-badge']} data-level={profile.compliance_score >= 80 ? 'good' : profile.compliance_score >= 50 ? 'warn' : 'bad'}>
                        <div className={styles['compliance-score']}>{profile.compliance_score}%</div>
                        <div className={styles['compliance-label']}>Cumplimiento</div>
                    </div>
                )}
                <Button className={styles['btn-primary']} onClick={onDownloadCv}>
                    <Icon className={styles['btn-icon']} name={'download'} />
                    Descargar CV
                </Button>
            </div>

            {profile.bio && (
                <div className={styles['section']}>
                    <div className={styles['section-title']}>Sobre mí</div>
                    <p className={styles['bio']}>{profile.bio}</p>
                </div>
            )}

            {(vesselLabels.length > 0 || languageLabels.length > 0) && (
                <div className={styles['section']}>
                    {vesselLabels.length > 0 && (
                        <div className={styles['field-row']}>
                            <div className={styles['field-label']}>Tipos de buque</div>
                            <div className={styles['chip-row']}>{vesselLabels.map((v) => <span key={v} className={styles['chip']}>{v}</span>)}</div>
                        </div>
                    )}
                    {languageLabels.length > 0 && (
                        <div className={styles['field-row']}>
                            <div className={styles['field-label']}>Idiomas</div>
                            <div className={styles['chip-row']}>{languageLabels.map((l) => <span key={l} className={styles['chip']}>{l}</span>)}</div>
                        </div>
                    )}
                </div>
            )}

            <div className={styles['section']}>
                <div className={styles['section-title']}>
                    Cumplimiento de certificaciones
                    {profile.missing_count > 0 && <span className={styles['section-hint']}> · {profile.missing_count} faltante{profile.missing_count !== 1 ? 's' : ''}</span>}
                </div>
                {Array.isArray(profile.compliance_docs) && profile.compliance_docs.length > 0 ? (
                    <div className={styles['card-list']}>
                        {profile.compliance_docs.map((doc, i) => (
                            <div key={i} className={styles['doc-card']}>
                                <div>
                                    <div className={styles['row-title']}>{doc.name}{doc.level ? ` · ${doc.level}` : ''}</div>
                                    <div className={styles['row-sub']}>
                                        {doc.expiry_date ? `Vence ${formatDate(doc.expiry_date)}` : 'Sin fecha de vencimiento'}
                                        {typeof doc.days_remaining === 'number' ? ` · ${doc.days_remaining} días` : ''}
                                    </div>
                                </div>
                                <span className={styles['status-chip']} data-status={doc.state === 'VALID' ? 'active' : doc.state === 'EXPIRING' ? 'scheduled' : 'ended'}>
                                    {COMPLIANCE_STATE_LABEL[doc.state] || doc.state || '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles['muted']}>Sin certificaciones requeridas para este rango, o sin rango asignado todavía.</div>
                )}
            </div>

            {Array.isArray(profile.documents) && profile.documents.length > 0 && (
                <div className={styles['section']}>
                    <div className={styles['section-title']}>Documentos subidos</div>
                    <div className={styles['card-list']}>
                        {profile.documents.map((doc) => (
                            <div key={doc.id} className={styles['doc-card']}>
                                <div>
                                    <div className={styles['row-title']}>{doc.name}</div>
                                    <div className={styles['row-sub']}>
                                        {doc.expiry_date ? `Vence ${formatDate(doc.expiry_date)}` : (doc.issued_date ? `Emitido ${formatDate(doc.issued_date)}` : '')}
                                    </div>
                                </div>
                                <span className={styles['status-chip']} data-status={doc.verification_status === 'verified' ? 'active' : doc.verification_status === 'rejected' ? 'ended' : 'scheduled'}>
                                    {DOC_STATUS_LABEL[doc.verification_status] || doc.verification_status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles['section']}>
                <div className={styles['section-title']}>Historial de embarques</div>
                {embarkations.length > 0 ? (
                    <div className={styles['card-list']}>
                        {embarkations.map((e) => (
                            <div key={e.id} className={styles['doc-card']}>
                                <div>
                                    <div className={styles['row-title']}>{e.vessel_name || 'Buque sin nombre'} — {e.rank || 'Sin rango'}</div>
                                    <div className={styles['row-sub']}>
                                        {e.company_name ? `${e.company_name} · ` : ''}
                                        {formatDate(e.date_from)}
                                        {' → '}
                                        {e.date_to ? formatDate(e.date_to) : 'Presente'}
                                    </div>
                                    {e.status_reason && <div className={styles['row-sub']}>{e.status_reason}</div>}
                                </div>
                                <span className={styles['status-chip']} data-status={e.verification_status === 'verificado' ? 'active' : e.verification_status === 'observado' ? 'ended' : 'scheduled'}>
                                    {e.verification_status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles['muted']}>Sin embarques registrados todavía.</div>
                )}
            </div>

            {Array.isArray(profile.badges) && profile.badges.length > 0 && (
                <div className={styles['section']}>
                    <div className={styles['section-title']}>Certificados de formación completados</div>
                    <div className={styles['chip-row']}>
                        {profile.badges.map((b) => <span key={b.badge_id} className={styles['chip']}>{b.title}</span>)}
                    </div>
                </div>
            )}
        </div>
    );
};

const SeafarerProfile = ({ urlParams }) => {
    const seafarerId = urlParams && urlParams.id;
    const { profile, embarkations, loading, error, downloadCv } = useSeafarerProfile(seafarerId);

    return (
        <div className={styles['page']}>
            <HorizontalNavBar
                className={styles['nav-bar']}
                backButton={true}
                fullscreenButton={true}
                navMenu={true}
            />
            <div className={styles['page-content']}>
                <SeafarerProfilePanel
                    profile={profile}
                    embarkations={embarkations}
                    loading={loading}
                    error={error}
                    onDownloadCv={downloadCv}
                />
            </div>
        </div>
    );
};

module.exports = SeafarerProfile;
module.exports.SeafarerProfilePanel = SeafarerProfilePanel;
