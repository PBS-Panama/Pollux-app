// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const filterInvalidDOMProps = require('filter-invalid-dom-props').default;
const { default: Icon } = require('pollux/common/Icon');
const { default: Button } = require('pollux/components/Button');
const { default: Image } = require('pollux/components/Image');
const Multiselect = require('pollux/components/Multiselect');
const useBinaryState = require('pollux/common/useBinaryState');
const { ICON_FOR_TYPE } = require('pollux/common/CONSTANTS');
const styles = require('./styles');

// PBS Crewing Module: corporate default profile image for all cards
const CREW_DEFAULT_POSTER = 'images/profileimg.png';
const { resolveNationalityEntry } = require('pollux/common/crewData');
const { togglePendingInterview, isPendingInterview } = require('pollux/common/crewStore');

const MetaItem = React.memo(({ className, type, name, poster, posterShape, posterChangeCursor, progress, newVideos, options, deepLinks, dataset, optionOnSelect, onDismissClick, onPlayClick, watched, realName, realRank, realDept, realNationalities, ...props }) => {
    const { t } = useTranslation();
    const [menuOpen, onMenuOpen, onMenuClose] = useBinaryState(false);
    // Real data only: name falls back to the `name` the backend sent (never a
    // generated one); dept/rank/nationality with no real value are simply not shown.
    const crewName = realName || name;
    const crewDepartment = realDept || null;
    const crewRank = realRank || null;
    const nationalityEntries = React.useMemo(() => (
        Array.isArray(realNationalities) && realNationalities.length > 0
            ? realNationalities.map(resolveNationalityEntry).filter(Boolean)
            : []
    ), [realNationalities]);
    const crewId = name || '';
    const [addedToList, setAddedToList] = React.useState(() => isPendingInterview(crewId));
    // Listen for sync events from the detail panel button
    React.useEffect(() => {
        const handler = (e) => {
            if (e.detail && e.detail.id === crewId) setAddedToList(e.detail.added);
        };
        window.addEventListener('pbs-pending-changed', handler);
        return () => window.removeEventListener('pbs-pending-changed', handler);
    }, [crewId]);
    const onAddToList = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.selectPrevented = true;
        const crew = { id: crewId, name: crewName, department: crewDepartment || undefined, rank: crewRank || undefined, nationality: nationalityEntries.length > 0 ? nationalityEntries.map((n) => n.name).join(', ') : undefined };
        const nowAdded = togglePendingInterview(crew);
        setAddedToList(nowAdded);
    }, [crewId, crewName, crewDepartment, crewRank, nationalityEntries]);
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
                        className={classnames(styles['poster-image'], { [styles['poster-image-placeholder']]: !poster })}
                        src={poster || CREW_DEFAULT_POSTER}
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
                {
                    // Moved here from below the poster (Rick, 2026-09-12) — the
                    // corporate placeholder photo never fills the card (it's
                    // inset to 80%/80%, top-aligned), leaving real empty space
                    // below it that was going unused. Name + nationality both
                    // live in that space now, one block, stacked — not a badge
                    // pinned to the top corner (collided with the illustration)
                    // — freeing the DEPT/RANK block below to use the full card
                    // width (RANK strings are often long) and dropping the old
                    // title bar entirely. No scrim: this area is the plain
                    // card background, not a photo, so dark theme-aware text
                    // already has real contrast — a darkening gradient here was
                    // masking a text problem by covering up the design instead.
                    typeof crewName === 'string' && crewName.length > 0 ?
                        <div className={styles['poster-name-overlay']}>
                            {
                                nationalityEntries.length > 0 ?
                                    <div className={styles['poster-nationality-line']}>
                                        {
                                            nationalityEntries.map((n, i) => (
                                                n.flagPath ?
                                                    <Image key={i} className={styles['poster-nationality-flag']} src={n.flagPath} alt={n.name} />
                                                    :
                                                    null
                                            ))
                                        }
                                        <span className={styles['poster-nationality-text']}>
                                            {nationalityEntries.map((n) => n.name).join(', ')}
                                        </span>
                                    </div>
                                    :
                                    null
                            }
                            <div className={styles['poster-name-text']}>{crewName}</div>
                        </div>
                        :
                        null
                }
            </div>
            {
                // Below the image, not overlaid on it: a dark gradient scrim
                // read fine on Stremio's always-dark art, but on a themeable
                // light/dark card it either fought the card bg (light themes)
                // or doubled up on it (dark themes). Plain card-colored text
                // reads correctly in all 4 skins with no per-theme tinting.
                typeof crewName === 'string' && crewName.length > 0 ?
                    <div className={styles['crew-meta-container']}>
                        <div className={styles['crew-overlay']}>
                            {crewDepartment ? (
                                <div className={styles['crew-overlay-row']}>
                                    <span className={styles['crew-overlay-label']}>{'DEPT'}</span>
                                    <span className={styles['crew-overlay-value']}>{crewDepartment}</span>
                                </div>
                            ) : null}
                            {crewRank ? (
                                <div className={styles['crew-overlay-row']}>
                                    <span className={styles['crew-overlay-label']}>{'RANK'}</span>
                                    <span className={styles['crew-overlay-value']}>{crewRank}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    :
                    null
            }
            {
                // Name moved onto the poster above — this bar now only exists to
                // host the options menu, when there is one.
                Array.isArray(options) && options.length > 0 ?
                    <div className={styles['title-bar-container']}>
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
    watched: PropTypes.bool,
    realName: PropTypes.string,
    realRank: PropTypes.string,
    realDept: PropTypes.string,
    realNationalities: PropTypes.arrayOf(PropTypes.string)
};

module.exports = MetaItem;
