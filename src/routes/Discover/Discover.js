// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { useBinaryState, withCoreSuspender } = require('leto/common');
const { Button, DelayedRenderer, Image, MainNavBars, MetaItem, MetaPreview, ModalDialog, MultiselectMenu } = require('leto/components');
const useSelectableInputs = require('./useSelectableInputs');
const styles = require('./styles');

const getAuthToken = () => {
    try {
        const data = localStorage.getItem('leto-auth');
        return data ? JSON.parse(data)?.state?.accessToken || '' : '';
    } catch {
        return '';
    }
};

const getLetoUser = () => {
    try {
        const data = localStorage.getItem('leto-user');
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

const buildCrewMetaItem = (crew) => {
    const first = (crew.first_name || '').trim();
    const last = (crew.last_name || '').trim();
    const name = [first, last].filter(Boolean).join(' ') || crew.email?.split('@')[0] || 'Unnamed Seafarer';
    const nationality = crew.nationality || 'Unknown Nationality';
    const rank = crew.rank || 'Rank not assigned';
    const experience = Number.isFinite(crew.years_experience) ? `${crew.years_experience} years` : 'N/A';

    return {
        id: crew.id,
        type: 'crew',
        name,
        email: crew.email,
        department: crew.department || 'Safety & Survival',
        rank,
        nationality,
        years_experience: crew.years_experience || 0,
        poster: null,
        logo: null,
        background: null,
        posterShape: 'poster',
        description: crew.bio || `${rank}\nDepartment: ${crew.department || 'Safety & Survival'}\nNationality: ${nationality}`,
        releaseInfo: nationality,
        runtime: rank,
        released: new Date(crew.created_at),
        links: [
            { name: crew.department || 'Safety & Survival', category: 'Department', url: '#' },
            { name: nationality, category: 'Nationality', url: '#' },
            { name: experience, category: 'Experience', url: '#' },
            { name: crew.email, category: 'Contact', url: '#' },
        ],
        deepLinks: { metaDetailsVideos: null, player: null },
        trailerStreams: [],
        inLibrary: true,
        watched: false,
    };
};

const Discover = () => {
    const { t } = useTranslation();
    const [crewItems, setCrewItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [errorMessage, setErrorMessage] = React.useState('');

    const [selectInputs,, filterItem] = useSelectableInputs(crewItems);
    const [inputsModalOpen, openInputsModal, closeInputsModal] = useBinaryState(false);
    const [selectedMetaItemIndex, setSelectedMetaItemIndex] = React.useState(0);

    const metaPreviewRef = React.useRef();

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const user = getLetoUser();
                const companyId = user?.company_id;
                const token = getAuthToken();

                if (!companyId || !token) {
                    if (!cancelled) {
                        setErrorMessage('Company account data is missing. Please log in again.');
                        setCrewItems([]);
                    }
                    return;
                }

                const res = await fetch(`/api/companies/${companyId}/crew`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    throw new Error(`Crew API request failed (${res.status})`);
                }

                const data = await res.json();
                const mapped = Array.isArray(data) ? data.map(buildCrewMetaItem) : [];

                // Enrich with mobility summary (visa / nationality / passport)
                // from the crewing filesystem store. Non-fatal on failure.
                let mobilityMap = {};
                if (mapped.length > 0) {
                    try {
                        const idsParam = mapped.map((m) => m.id).join(',');
                        const mobRes = await fetch(`/crewing-api/users/mobility-summary?ids=${encodeURIComponent(idsParam)}`);
                        if (mobRes.ok) {
                            const mobJson = await mobRes.json();
                            mobilityMap = mobJson?.summary || {};
                        }
                    } catch {
                        // ignore — filter will just treat visa data as empty
                    }
                }

                const enriched = mapped.map((item) => {
                    const mob = mobilityMap[item.id] || {};
                    return { ...item, mobility: mob };
                });

                if (!cancelled) {
                    setCrewItems(enriched);
                    setSelectedMetaItemIndex(0);
                }
            } catch (err) {
                if (!cancelled) {
                    setErrorMessage(err instanceof Error ? err.message : 'Failed to load crew data');
                    setCrewItems([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const filteredItems = React.useMemo(() => {
        return crewItems.filter((item) => filterItem(item));
    }, [crewItems, filterItem]);

    React.useEffect(() => {
        setSelectedMetaItemIndex(0);
    }, [filteredItems.length]);

    const selectedMetaItem = React.useMemo(() => {
        return filteredItems[selectedMetaItemIndex] ?? null;
    }, [filteredItems, selectedMetaItemIndex]);

    const metaItemsOnFocusCapture = React.useCallback((event) => {
        if (event.target.dataset.index !== null && !isNaN(event.target.dataset.index)) {
            setSelectedMetaItemIndex(parseInt(event.target.dataset.index, 10));
        }
    }, []);
    const metaItemOnClick = React.useCallback((event) => {
        const visible = window.getComputedStyle(metaPreviewRef.current).display !== 'none';
        if (event.currentTarget.dataset.index !== selectedMetaItemIndex.toString() && visible) {
            event.preventDefault();
            event.currentTarget.focus();
        }
    }, [selectedMetaItemIndex]);

    return (
        <MainNavBars className={styles['discover-container']} route={'companyCrewdb'}>
            <div className={styles['discover-content']}>
                <div className={styles['catalog-container']}>
                    <div className={styles['selectable-inputs-container']}>
                        {selectInputs.map(({ title, options, value, onSelect, multicheck, selectedValues, onToggle }, index) => (
                            <MultiselectMenu
                                key={index}
                                className={styles['select-input']}
                                title={title}
                                options={options}
                                value={value}
                                onSelect={onSelect}
                                multicheck={multicheck}
                                selectedValues={selectedValues}
                                onToggle={onToggle}
                            />
                        ))}
                        <div className={styles['filter-container']}>
                            <Button className={styles['filter-button']} title={t('ALL_FILTERS')} onClick={openInputsModal}>
                                <Icon className={styles['filter-icon']} name={'filters'} />
                            </Button>
                        </div>
                    </div>
                    {
                        loading ?
                            <DelayedRenderer delay={500}>
                                <div className={styles['message-container']}>
                                    <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                                    <div className={styles['message-label']}>{'Loading crew database...'}</div>
                                </div>
                            </DelayedRenderer>
                            :
                            errorMessage ?
                                <div className={styles['message-container']}>
                                    <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                                    <div className={styles['message-label']}>{errorMessage}</div>
                                </div>
                                :
                                filteredItems.length === 0 ?
                                    <div className={styles['message-container']}>
                                        <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                                        <div className={styles['message-label']}>{'No crew members match the selected filters'}</div>
                                    </div>
                                    :
                                    <div className={classnames(styles['meta-items-container'], 'animation-fade-in')} onFocusCapture={metaItemsOnFocusCapture}>
                                        {filteredItems.map((metaItem, index) => (
                                            <MetaItem
                                                key={metaItem.id}
                                                className={classnames({ 'selected': selectedMetaItemIndex === index })}
                                                type={metaItem.type}
                                                name={metaItem.name}
                                                crewId={metaItem.id}
                                                department={metaItem.department}
                                                rank={metaItem.rank}
                                                nationality={metaItem.nationality}
                                                poster={metaItem.poster}
                                                posterShape={metaItem.posterShape}
                                                playname={selectedMetaItemIndex === index}
                                                deepLinks={metaItem.deepLinks}
                                                watched={metaItem.watched}
                                                data-index={index}
                                                onClick={metaItemOnClick}
                                            />
                                        ))}
                                    </div>
                    }
                </div>
                {
                    selectedMetaItem !== null ?
                        <MetaPreview
                            className={styles['meta-preview-container']}
                            compact={true}
                            ref={metaPreviewRef}
                            name={selectedMetaItem.name}
                            logo={selectedMetaItem.logo}
                            background={selectedMetaItem.poster}
                            runtime={selectedMetaItem.runtime}
                            releaseInfo={selectedMetaItem.releaseInfo}
                            released={selectedMetaItem.released}
                            description={selectedMetaItem.description}
                            department={selectedMetaItem.department}
                            rank={selectedMetaItem.rank}
                            nationality={selectedMetaItem.nationality}
                            yearsExperience={selectedMetaItem.years_experience}
                            email={selectedMetaItem.email}
                            links={selectedMetaItem.links}
                            deepLinks={selectedMetaItem.deepLinks}
                            trailerStreams={selectedMetaItem.trailerStreams}
                            inLibrary={selectedMetaItem.inLibrary}
                            toggleInLibrary={null}
                            metaId={selectedMetaItem.id}
                            like={null}
                        />
                        :
                        loading ?
                            <div className={styles['meta-preview-container']} />
                            :
                            null
                }
            </div>
            {
                inputsModalOpen ?
                    <ModalDialog title={t('CATALOG_FILTERS')} className={styles['selectable-inputs-modal']} onCloseRequest={closeInputsModal}>
                        {selectInputs.map(({ title, options, value, onSelect, multicheck, selectedValues, onToggle }, index) => (
                            <MultiselectMenu
                                key={index}
                                className={styles['select-input']}
                                title={title}
                                options={options}
                                value={value}
                                onSelect={onSelect}
                                multicheck={multicheck}
                                selectedValues={selectedValues}
                                onToggle={onToggle}
                            />
                        ))}
                    </ModalDialog>
                    :
                    null
            }
        </MainNavBars>
    );
};

Discover.propTypes = {
    urlParams: PropTypes.object,
    queryParams: PropTypes.instanceOf(URLSearchParams),
};

const DiscoverFallback = () => (
    <MainNavBars className={styles['discover-container']} route={'companyCrewdb'} />
);

module.exports = withCoreSuspender(Discover, DiscoverFallback);
