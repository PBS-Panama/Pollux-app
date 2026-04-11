// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const filterInvalidDOMProps = require('filter-invalid-dom-props').default;
const { default: Icon } = require('@stremio/stremio-icons/react');
const { default: Button } = require('leto/components/Button');
const { default: Image } = require('leto/components/Image');
const Multiselect = require('leto/components/Multiselect');
const useBinaryState = require('leto/common/useBinaryState');
const { ICON_FOR_TYPE } = require('leto/common/CONSTANTS');
const styles = require('./styles');

// PBS Crewing Module: corporate default profile image for all cards
const CREW_DEFAULT_POSTER = 'images/profileimg.png';
const { getCrewFlagPath } = require('leto/common/crewData');
const { togglePendingInterview, isPendingInterview } = require('leto/common/crewStore');

const MetaItem = React.memo(({ className, type, name, department, rank, nationality, crewId, poster, posterShape, posterChangeCursor, progress, newVideos, options, deepLinks, dataset, optionOnSelect, onDismissClick, onPlayClick, watched, ...props }) => {
    const { t } = useTranslation();
    const [menuOpen, onMenuOpen, onMenuClose] = useBinaryState(false);
    const crewName = React.useMemo(() => (typeof name === 'string' ? name : ''), [name]);
    const crewDepartment = React.useMemo(() => (typeof department === 'string' ? department : ''), [department]);
    const crewRank = React.useMemo(() => (typeof rank === 'string' ? rank : ''), [rank]);
    const crewNationality = React.useMemo(() => (typeof nationality === 'string' ? nationality : ''), [nationality]);
    const crewFlagSrc = React.useMemo(() => getCrewFlagPath(crewNationality), [crewNationality]);
    const pendingCrewId = React.useMemo(() => (typeof crewId === 'string' && crewId.length > 0 ? crewId : crewName), [crewId, crewName]);
    const [addedToList, setAddedToList] = React.useState(() => isPendingInterview(pendingCrewId));
    // Listen for sync events from the detail panel button
    React.useEffect(() => {
        const handler = (e) => {
            if (e.detail && e.detail.id === pendingCrewId) setAddedToList(e.detail.added);
        };
        window.addEventListener('pbs-pending-changed', handler);
        return () => window.removeEventListener('pbs-pending-changed', handler);
    }, [pendingCrewId]);
    const onAddToList = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.selectPrevented = true;
        const crew = { id: pendingCrewId, name: crewName, department: crewDepartment, rank: crewRank, nationality: crewNationality };
        const nowAdded = togglePendingInterview(crew);
        setAddedToList(nowAdded);
    }, [pendingCrewId, crewName, crewDepartment, crewRank, crewNationality]);
    const href = React.useMemo(() => {
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
    const metaItemOnClick = React.useCallback((event) => {
        if (event.nativeEvent.selectPrevented) {
            event.preventDefault();
        } else if (typeof props.onClick === 'function') {
            props.onClick(event);
        }
    }, [props.onClick]);
    const menuOnClick = React.useCallback((event) => {
        event.nativeEvent.selectPrevented = true;
    }, []);
    const menuOnSelect = React.useCallback((event) => {
        if (typeof optionOnSelect === 'function') {
            optionOnSelect({
                type: 'select-option',
                value: event.value,
                dataset: dataset,
                reactEvent: event.reactEvent,
                nativeEvent: event.nativeEvent
            });
        }
    }, [dataset, optionOnSelect]);
    const renderPosterFallback = React.useCallback(() => (
        <Icon
            className={styles['placeholder-icon']}
            name={ICON_FOR_TYPE.has(type) ? ICON_FOR_TYPE.get(type) : ICON_FOR_TYPE.get('other')}
        />
    ), [type]);
    const renderMenuLabelContent = React.useCallback(() => (
        <Icon className={styles['icon']} name={'more-vertical'} />
    ), []);
    return (
        <Button title={crewName} href={href} {...filterInvalidDOMProps(props)} className={classnames(className, styles['meta-item-container'], styles['poster-shape-poster'], styles[`poster-shape-${posterShape}`], { 'active': menuOpen })} onClick={metaItemOnClick}>
            <div className={classnames(styles['poster-container'], { 'poster-change-cursor': posterChangeCursor })}>
                {
                    onDismissClick ?
                        <div title={t('LIBRARY_RESUME_DISMISS')} className={styles['dismiss-icon-layer']} onClick={onDismissClick}>
                            <Icon className={styles['dismiss-icon']} name={'close'} />
                            <div className={styles['dismiss-icon-backdrop']} />
                        </div>
                        :
                        null
                }
                {
                    watched ?
                        <div className={styles['watched-icon-layer']}>
                            <Icon className={styles['watched-icon']} name={'checkmark'} />
                        </div>
                        :
                        null
                }
                <div className={styles['poster-image-layer']}>
                    <Image
                        className={styles['poster-image']}
                        src={CREW_DEFAULT_POSTER}
                        alt={name || ' '}
                        fallbackSrc={CREW_DEFAULT_POSTER}
                    />
                </div>
                {
                    onPlayClick ?
                        <div title={t('CONTINUE_WATCHING')} className={styles['play-icon-layer']} onClick={onPlayClick}>
                            <Icon className={styles['play-icon']} name={'play'} />
                            <div className={styles['play-icon-outer']} />
                            <div className={styles['play-icon-background']} />
                        </div>
                        :
                        null
                }
                {
                    progress > 0 ?
                        <div className={styles['progress-bar-layer']}>
                            <div className={styles['progress-bar']} style={{ width: `${progress}%` }} />
                            <div className={styles['progress-bar-background']} />
                        </div>
                        :
                        null
                }
                {
                    newVideos > 0 ?
                        <div className={styles['new-videos']}>
                            <div className={styles['layer']} />
                            <div className={styles['layer']} />
                            <div className={styles['layer']}>
                                <Icon className={styles['icon']} name={'add'} />
                                <div className={styles['label']}>
                                    {newVideos}
                                </div>
                            </div>
                        </div>
                        :
                        null
                }
                {
                    typeof crewName === 'string' && crewName.length > 0 ?
                        <div className={styles['crew-overlay']}>
                            <div className={styles['crew-overlay-row']}>
                                <span className={styles['crew-overlay-label']}>{'DEPT'}</span>
                                <span className={styles['crew-overlay-value']}>{crewDepartment}</span>
                            </div>
                            <div className={styles['crew-overlay-row']}>
                                <span className={styles['crew-overlay-label']}>{'RANK'}</span>
                                <span className={styles['crew-overlay-value']}>{crewRank}</span>
                            </div>
                        </div>
                        :
                        null
                }
                {
                    typeof crewName === 'string' && crewName.length > 0 ?
                        <div className={styles['crew-nationality-badge']}>
                            <span className={styles['crew-nationality-text']}>{crewNationality}</span>
                            {
                                crewFlagSrc ?
                                    <Image className={styles['crew-nationality-flag']} src={crewFlagSrc} alt={crewNationality} />
                                    :
                                    null
                            }
                        </div>
                        :
                        null
                }
                {
                    typeof crewName === 'string' && crewName.length > 0 ?
                        <div
                            className={classnames(styles['add-to-list-btn'], { [styles['added']]: addedToList })}
                            title={addedToList ? 'Remove from Interview List' : 'Add to Interview List'}
                            onClick={onAddToList}
                        >
                            <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" className={styles['add-to-list-icon']}>
                                {addedToList
                                    ? <polyline points="416,128 176,368 96,288" />
                                    : <>
                                        <line x1="80" y1="144" x2="336" y2="144" />
                                        <line x1="80" y1="256" x2="288" y2="256" />
                                        <line x1="80" y1="368" x2="240" y2="368" />
                                        <line x1="368" y1="288" x2="368" y2="432" />
                                        <line x1="296" y1="360" x2="440" y2="360" />
                                    </>
                                }
                            </svg>
                        </div>
                        :
                        null
                }
            </div>
            {
                (typeof crewName === 'string' && crewName.length > 0) || (Array.isArray(options) && options.length > 0) ?
                    <div className={styles['title-bar-container']}>
                        <div className={styles['title-label']}>
                            {typeof crewName === 'string' && crewName.length > 0 ? crewName : ''}
                        </div>
                        {
                            Array.isArray(options) && options.length > 0 ?
                                <Multiselect
                                    className={styles['menu-label-container']}
                                    renderLabelContent={renderMenuLabelContent}
                                    options={options}
                                    onOpen={onMenuOpen}
                                    onClose={onMenuClose}
                                    onSelect={menuOnSelect}
                                    tabIndex={-1}
                                    onClick={menuOnClick}
                                />
                                :
                                null
                        }
                    </div>
                    :
                    null
            }
        </Button>
    );
});

MetaItem.displayName = 'MetaItem';

MetaItem.propTypes = {
    className: PropTypes.string,
    type: PropTypes.string,
    name: PropTypes.string,
    department: PropTypes.string,
    rank: PropTypes.string,
    nationality: PropTypes.string,
    crewId: PropTypes.string,
    poster: PropTypes.string,
    posterShape: PropTypes.oneOf(['poster', 'landscape', 'square']),
    posterChangeCursor: PropTypes.bool,
    progress: PropTypes.number,
    newVideos: PropTypes.number,
    options: PropTypes.array,
    deepLinks: PropTypes.shape({
        metaDetailsVideos: PropTypes.string,
        metaDetailsStreams: PropTypes.string,
        player: PropTypes.string
    }),
    dataset: PropTypes.object,
    optionOnSelect: PropTypes.func,
    onDismissClick: PropTypes.func,
    onPlayClick: PropTypes.func,
    onClick: PropTypes.func,
    watched: PropTypes.bool
};

module.exports = MetaItem;
