// PBS Crewing Module — JS CoreTransport (replaces Rust/WASM stremio-core-web)
// Resolves getState() immediately with safe empty state shapes.
// dispatch() / analytics() / decodeStream() are no-ops.
// Eliminates WASM dependency, Web Worker, and 11470 local streaming server calls.

const EventEmitter = require('eventemitter3');

// ─── Mock crew database for Discover (company-crewdb) ─────────────
const CREW_SEEDS = [];
const VESSEL_TYPES = ['Bulk Carrier', 'Container Ship', 'Oil Tanker', 'LNG Carrier', 'General Cargo', 'Ro-Ro', 'Chemical Tanker', 'Offshore Supply'];
const RANKS_SHORT = [
    'II/2 – Master', 'II/2 – Chief Mate', 'II/1 – OOW Navigation',
    'III/2 – Chief Engineer', 'III/1 – EOOW', 'III/6 – ETO',
    'II/5 – AB Deck', 'III/5 – Motorman', 'IV/2 – GMDSS Operator',
    'II/4 – Helmsman', 'III/4 – Oiler', 'Cadet – Deck',
];
const NATIONALITIES = ['Panama', 'Colombia', 'Peru', 'Ecuador', 'Mexico', 'Honduras', 'Guatemala', 'Costa Rica'];
const DEPARTMENTS = ['Deck Department', 'Engine Department', 'Electro-Technical', 'Catering / Hotel', 'Radio / GMDSS'];
const IMO_NUMBERS = ['9876543', '9765432', '9654321', '9543210', '9432109', '9321098', '9210987', '9109876'];
const VESSEL_NAMES = ['MV Atlantic Pioneer', 'MS Robin', 'MV Pacific Star', 'MT Cristóbal', 'MV Caribbean Wind', 'MS Panamá Spirit', 'MV Andean Explorer', 'MT Gulf Stream'];
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };

// Build a crew profile for MetaDetails from a crew name
const buildCrewProfile = (crewName) => {
    return {
        selected: {
            metaPath: { resource: 'meta', type: 'crew', id: crewName, extra: [] },
            streamPath: null,
        },
        metaItem: {
            content: {
                type: 'Ready',
                content: {
                    id: crewName,
                    type: 'crew',
                    name: crewName,
                    poster: null,
                    logo: null,
                    background: null,
                    description: '',
                    releaseInfo: '',
                    runtime: '',
                    released: new Date().toISOString(),
                    links: [],
                    trailerStreams: [],
                    inLibrary: true,
                    videos: [],
                    behaviorHints: {},
                },
            },
        },
        libraryItem: null,
        streams: [],
        metaExtensions: [],
        selectable: { subtitles_languages: [] },
    };
};
const crewCatalogItems = CREW_SEEDS.map((name, i) => {
    const h = hashStr(name);
    return {
        id: `crew-${i}`,
        type: 'crew',
        name: name,
        poster: null,
        posterShape: 'poster',
        description: `${RANKS_SHORT[h % RANKS_SHORT.length]} · ${NATIONALITIES[h % NATIONALITIES.length]} · ${VESSEL_TYPES[h % VESSEL_TYPES.length]}`,
        releaseInfo: NATIONALITIES[h % NATIONALITIES.length],
        runtime: RANKS_SHORT[h % RANKS_SHORT.length],
        links: [],
        trailerStreams: [],
        inLibrary: i < 8,
        deepLinks: { metaDetailsVideos: `#/metadetails/crew/${name}`, player: null },
        watched: false,
    };
});

// ─── Board catalogs: crew grouped by department ──────────────────
const DEPT_GROUPS = {
    'Ratings – Deck': (h) => ['Deck Department', 'Safety & Survival'].includes(DEPARTMENTS[h % DEPARTMENTS.length]),
    'Ratings – Engine': (h) => ['Engine Department', 'Electro-Technical'].includes(DEPARTMENTS[h % DEPARTMENTS.length]),
    'Ratings – Catering & Support': (h) => ['Catering / Hotel', 'Radio / GMDSS'].includes(DEPARTMENTS[h % DEPARTMENTS.length]),
};
const boardCatalogs = Object.entries(DEPT_GROUPS).map(([title, filter]) => {
    const items = CREW_SEEDS.filter((name) => filter(hashStr(name))).map((name, i) => {
        const h = hashStr(name);
        return {
            id: `crew-${name}`,
            type: 'crew',
            name: name,
            poster: null,
            posterShape: 'poster',
            description: `DEPT ${DEPARTMENTS[h % DEPARTMENTS.length]}\nRANK ${RANKS_SHORT[h % RANKS_SHORT.length]}`,
            releaseInfo: NATIONALITIES[h % NATIONALITIES.length],
            runtime: RANKS_SHORT[h % RANKS_SHORT.length],
            links: [],
            trailerStreams: [],
            inLibrary: false,
            deepLinks: { metaDetailsVideos: `#/metadetails/crew/${name}`, player: null },
            watched: false,
        };
    });
    return {
        addon: { manifest: { name: 'PBS Crewing' } },
        id: `crew-${title.replace(/\s/g, '-').toLowerCase()}`,
        name: title,
        type: 'crew',
        content: { type: 'Ready', content: items },
        deepLinks: { discover: '#/company-crewdb' },
        installed: true,
    };
}).filter((cat) => cat.content.content.length > 0);

// Minimal valid state shapes for each model used in the UI
const DEFAULT_STATES = {
    ctx: {
        profile: {
            auth: null,
            settings: {
                interfaceLanguage: 'en-US',
                streamingServerUrl: null,
                streamingServerWarningDismissed: null,
                binge_watching: false,
                play_in_background: false,
                play_in_external: false,
                hardware_decoding: false,
                subtitles_language: null,
                subtitles_size: 100,
                subtitles_text_color: '#ffffff',
                subtitles_background_color: 'transparent',
                subtitles_outline_color: '#000000',
                audio_passthrough: false,
                audio_normalization: false,
                surround_sound: false,
                secondary_audio_track_language: null,
                seek_time_duration: 10000,
                streaming_server_warning_dismissed: null,
            }
        },
        searchHistory: [],
        notifications: { count: 0, items: [] },
        library: null,
        streamingServerUrls: [],
    },
    streaming_server: {
        settings: null,
        selected: null,
        torrent: null,
        playback: null,
        base_url: null,
        remote_url: null,
        network_info: null,
    },
    library: {
        selected: null,
        selectable: { types: [], sort: [], page: 1 },
        catalog: [],
    },
    catalog_page: {
        selected: null,
        selectable: { catalogs: [], extra_supported: [], extra_required: [], types: [], sort: [] },
        catalog: null,
        loading: { catalog: false, next_page: false },
    },
    discover: {
        selected: null,
        selectable: { catalogs: [], extra_supported: [], extra_required: [], types: [], sort: [] },
        catalog: {
            installed: true,
            content: { type: 'Ready', content: crewCatalogItems },
        },
        loading: { catalog: false, next_page: false },
    },
    meta_detail: {
        selected: null,
        meta_item: null,
        library_item: null,
        streams: [],
        selectable: { subtitles_languages: [] },
    },
    local_search: {
        query: null,
        items: [],
    },
    notifications: {
        count: 0,
        items: [],
        last_videos: [],
    },
    addon_catalog_with_filters: {
        selected: null,
        selectable: { catalogs: [], types: [] },
        catalog: [],
        loading: false,
    },
    installed_addons_with_filters: {
        selected: null,
        selectable: { types: [] },
        addons: [],
    },
    settings: {
        settings: null,
        selected: null,
    },
    search: {
        selected: null,
        catalogs: [],
    },
    board: {
        selected: null,
        catalogs: boardCatalogs,
    },
    continue_watching_preview: {
        library_items: [],
        items: [],
    },
    player: {
        selected: null,
        meta_item: null,
        subtitles: [],
        next_video: null,
        series_info: null,
        library_item: null,
        stream: null,
        title: null,
    },
    meta_details: {
        selected: null,
        metaItem: null,
        libraryItem: null,
        streams: [],
        metaExtensions: [],
        selectable: { subtitles_languages: [] },
    },
    addon_details: {
        selected: null,
        local_addon: null,
        remote_addon: null,
    },
    installed_addons: {
        selected: null,
        selectable: { types: [] },
        addons: [],
    },
    remote_addons: {
        selected: null,
        selectable: { catalogs: [], types: [] },
        catalog: [],
        loading: false,
    },
    data_export: {
        export: null,
        exportUrl: null,
    },
    calendar: {
        selected: null,
        selectable: { months: [] },
        items: [],
    },
};

function CoreTransport() {
    const events = new EventEmitter();

    // Dynamic state overrides (updated by dispatch)
    const overrides = {};

    // Emit 'init' on next tick so Core.js marks itself active
    setTimeout(() => {
        try { events.emit('init'); } catch (e) { console.error('CoreTransport mock init emit:', e); }
    }, 0);

    this.on = (name, listener) => events.on(name, listener);
    this.off = (name, listener) => events.off(name, listener);
    this.removeAllListeners = () => events.removeAllListeners();

    // Synchronous thenable — wrapPromise calls .then(cb) which calls cb(value)
    // synchronously, setting status='success' BEFORE .read() is called.
    // This means components NEVER suspend and NEVER retry.
    const syncThenable = (value) => ({
        then(resolve) { resolve(value); return Promise.resolve(value); }
    });

    this.getState = (model) => syncThenable(overrides[model] || DEFAULT_STATES[model] || {});
    this.getDebugState = () => syncThenable({ transport: 'js-mock' });
    this.dispatch = (action, model) => {
        // Intercept MetaDetails Load to generate crew profile data
        if (action && action.action === 'Load' && action.args && action.args.model === 'MetaDetails') {
            const metaPath = action.args.args && action.args.args.metaPath;
            if (metaPath && metaPath.id) {
                overrides['meta_details'] = buildCrewProfile(metaPath.id);
                // Notify useModelState listeners that meta_details changed
                setTimeout(() => { events.emit('NewState', ['meta_details']); }, 0);
            }
        }
        return syncThenable(undefined);
    };
    this.analytics = () => syncThenable(undefined);
    this.decodeStream = () => syncThenable(null);
}

module.exports = CoreTransport;
