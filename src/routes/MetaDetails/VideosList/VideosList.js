// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { t } = require('i18next');
const { useServices } = require('stremio/services');
const { useProfile } = require('stremio/common');
const { Image, SearchBar, Toggle, Video } = require('stremio/components');
const SeasonsBar = require('./SeasonsBar');
const { default: EpisodePicker } = require('../EpisodePicker');
const styles = require('./styles');

const { CREW_ALL_DOCS, CREW_DOC_CATEGORIES } = require('stremio/common/crewDocData');

// Hash function for deterministic per-crew randomization
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };

// Minimum docs per category so no crew member has an empty tab
const CREW_DOC_MINIMUMS = { 1: 3, 2: 3, 3: 2, 4: 2, 5: 2 };

// Deterministic document selection per crew member
const getCrewDocs = (crewHash, category) => {
    const pool = CREW_ALL_DOCS[category] || [];
    const minDocs = CREW_DOC_MINIMUMS[category] || 2;

    // Pick docs: each has ~65% chance based on hash
    const picked = [];
    const skipped = [];
    pool.forEach((doc, i) => {
        const h = ((crewHash * 31 + i * 17 + category * 7) >>> 0) % 100;
        if (h < 65) picked.push(doc);
        else skipped.push(doc);
    });

    // Guarantee minimum count
    let idx = 0;
    while (picked.length < minDocs && idx < skipped.length) {
        picked.push(skipped[idx++]);
    }

    // Vary issue dates ±180 days per crew member
    return picked.map((doc, i) => {
        const base = new Date(doc.baseDate).getTime();
        const offsetDays = ((crewHash + i * 13) % 361) - 180;
        const varied = new Date(base + offsetDays * 86400000);
        return { title: doc.title, issued: varied.toISOString().split('T')[0] };
    });
};

const VideosList = ({ className, metaItem, libraryItem, season, seasonOnSelect, selectedVideoId, toggleNotifications }) => {
    const { core } = useServices();
    const profile = useProfile();

    const showNotificationsToggle = React.useMemo(() => {
        return metaItem?.content?.content?.inLibrary && metaItem?.content?.content?.videos?.length;
    }, [metaItem]);
    const videos = React.useMemo(() => {
        return metaItem && metaItem.content.type === 'Ready' ?
            metaItem.content.content.videos
            :
            [];
    }, [metaItem]);
    // PBS Crewing: hash from crew member name for deterministic doc distribution
    const crewHash = React.useMemo(() => {
        const name = metaItem?.content?.content?.name || '';
        return hashStr(name);
    }, [metaItem]);
    // PBS Crewing: always show 5 document categories
    const seasons = CREW_DOC_CATEGORIES;
    const selectedSeason = React.useMemo(() => {
        if (CREW_DOC_CATEGORIES.includes(season)) return season;
        return 1; // default to Main Docs
    }, [season]);
    // PBS Crewing: per-crew randomized documents for the selected category
    const videosForSeason = React.useMemo(() => {
        const docs = getCrewDocs(crewHash, selectedSeason);
        return docs.map((doc, i) => ({
            id: `crew-doc-${selectedSeason}-${i}`,
            title: doc.title,
            thumbnail: null,
            season: selectedSeason,
            episode: i + 1,
            released: new Date(doc.issued),
            upcoming: false,
            watched: false,
            progress: null,
            deepLinks: null,
            scheduled: false,
        }));
    }, [selectedSeason, crewHash]);

    const seasonWatched = React.useMemo(() => {
        return videosForSeason.every((video) => video.watched);
    }, [videosForSeason]);

    const [search, setSearch] = React.useState('');
    const searchInputOnChange = React.useCallback((event) => {
        setSearch(event.currentTarget.value);
    }, []);

    const onMarkVideoAsWatched = (video, watched) => {
        core.transport.dispatch({
            action: 'MetaDetails',
            args: {
                action: 'MarkVideoAsWatched',
                args: [video, !watched]
            }
        });
    };

    const onMarkSeasonAsWatched = (season, watched) => {
        core.transport.dispatch({
            action: 'MetaDetails',
            args: {
                action: 'MarkSeasonAsWatched',
                args: [season, !watched]
            }
        });
    };

    const onSeasonSearch = (value) => {
        if (value) {
            seasonOnSelect({
                type: 'select',
                value,
            });
        }
    };

    return (
        <div className={classnames(className, styles['videos-list-container'])}>
            {
                !metaItem || metaItem.content.type === 'Loading' ?
                    <React.Fragment>
                        <SeasonsBar.Placeholder className={styles['seasons-bar']} />
                        <SearchBar.Placeholder className={styles['search-bar']} title={t('SEARCH_VIDEOS')} />
                        <div className={styles['videos-scroll-container']}>
                            <Video.Placeholder />
                            <Video.Placeholder />
                            <Video.Placeholder />
                            <Video.Placeholder />
                            <Video.Placeholder />
                        </div>
                    </React.Fragment>
                    :
                    metaItem.content.type === 'Err' ?
                        <div className={styles['message-container']}>
                            <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                            <div className={styles['label']}>{'No documents available'}</div>
                        </div>
                        :
                        <React.Fragment>
                            <SeasonsBar
                                className={styles['seasons-bar']}
                                season={selectedSeason}
                                seasons={seasons}
                                onSelect={seasonOnSelect}
                            />
                            <SearchBar
                                className={styles['search-bar']}
                                title={'Search documents...'}
                                value={search}
                                onChange={searchInputOnChange}
                            />
                            <div className={styles['videos-container']}>
                                {
                                    videosForSeason
                                        .filter((video) => {
                                            return search.length === 0 ||
                                                (
                                                    (typeof video.title === 'string' && video.title.toLowerCase().includes(search.toLowerCase())) ||
                                                    (!isNaN(video.released.getTime()) && video.released.toLocaleString(profile.settings.interfaceLanguage, { year: '2-digit', month: 'short', day: 'numeric' }).toLowerCase().includes(search.toLowerCase()))
                                                );
                                        })
                                        .map((video, index) => (
                                            <Video
                                                key={index}
                                                id={video.id}
                                                title={video.title}
                                                thumbnail={video.thumbnail}
                                                season={video.season}
                                                episode={video.episode}
                                                released={video.released}
                                                upcoming={video.upcoming}
                                                watched={video.watched}
                                                progress={video.progress}
                                                deepLinks={video.deepLinks}
                                                scheduled={video.scheduled}
                                                seasonWatched={seasonWatched}
                                                selected={video.id === selectedVideoId}
                                                onMarkVideoAsWatched={onMarkVideoAsWatched}
                                                onMarkSeasonAsWatched={onMarkSeasonAsWatched}
                                            />
                                        ))
                                }
                            </div>
                        </React.Fragment>
            }
        </div>
    );
};

VideosList.propTypes = {
    className: PropTypes.string,
    metaItem: PropTypes.object,
    libraryItem: PropTypes.object,
    season: PropTypes.number,
    selectedVideoId: PropTypes.string,
    seasonOnSelect: PropTypes.func,
    toggleNotifications: PropTypes.func,
};

module.exports = VideosList;
