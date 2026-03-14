// Copyright (C) 2017-2023 Smart code 203358507
// PBS Crewing Module: Override translations for STCW seafarer terminology

const { useCallback } = require('react');
const { useTranslation } = require('react-i18next');

// ─── STCW label overrides ───────────────────────────────────────────
// Maps Stremio type keys → Department labels
const TYPE_OVERRIDES = {
    'TYPE_movie':   'Deck Department',
    'TYPE_series':  'Engine Department',
    'TYPE_channel': 'Electro-Technical',
    'TYPE_tv':      'Catering / Hotel',
    'TYPE_music':   'Radio / GMDSS',
    'TYPE_radio':   'Medical',
    'TYPE_podcast': 'Safety & Survival',
    'TYPE_book':    'Environmental',
    'TYPE_game':    'Security',
    'TYPE_other':   'Other',
};

// Maps generic Stremio strings → Crewing labels
const STRING_OVERRIDES = {
    'BOARD_CONTINUE_WATCHING':  'Active Crew',
    'Board':                    'Dashboard',
    'Discover':                 'Crew Database',
    'Library':                  'My Files',
    'Calendar':                 'My Schedule',
    'ADDONS':                   'My Exams',
    'SETTINGS':                 'Settings',
    'BUTTON_SEE_ALL':           'See All',
    'SELECT_TYPE':              'Select Department',
    'SELECT_CATALOG':           'Select Rank',
    'GENRE':                    'Nationality',
    'NO_CATALOG_SELECTED':      'Select a Department and Rank to browse crew',
    'CATALOG_FILTERS':          'Crew Filters',
    'ALL_FILTERS':              'All Filters',
    'ADD_TO_LIB':               'Add to Roster',
    'REMOVE_FROM_LIB':          'Remove from Roster',
    'LIBRARY_RESUME_DISMISS':   'Dismiss',
    'CONTINUE_WATCHING':        'View Profile',
    'SEARCH':                   'Search Crew...',
    'CTX_SHARE':                'Share Profile',
    'SUMMARY':                  'About me',
    'LINKS_GENRES':             'Languages',
    'LINKS_CAST':               'Types of Vessels',
    'LINKS_DIRECTORS':          'Companies',
    'LINKS_LANGUAGES':          'Languages',
    'LINKS_VESSELS':            'Types of Vessels',
    'LINKS_COMPANIES':          'Companies',
};

// Row title counter for Board — cycles through crewing row labels
const BOARD_ROW_LABELS = [
    'Deck Officers – Available',
    'Engine Officers – Available',
    'Ratings – Deck',
    'Ratings – Engine',
    'Catering Crew',
    'Recently Certified',
    'New Applicants',
    'Electro-Technical Officers',
];
let _boardRowIndex = 0;

const useTranslate = () => {
    const { t } = useTranslation();

    const string = useCallback((key) => {
        if (STRING_OVERRIDES[key]) return STRING_OVERRIDES[key];
        return t(key);
    }, [t]);

    const stringWithPrefix = useCallback((value, prefix, fallback = null) => {
        const key = `${prefix}${value}`;
        // Check STCW type overrides first
        if (TYPE_OVERRIDES[key]) return TYPE_OVERRIDES[key];

        const defaultValue = fallback ?? value.charAt(0).toUpperCase() + value.slice(1);
        return t(key, { defaultValue });
    }, [t]);

    const catalogTitle = useCallback(({ addon, id, name, type } = {}, withType = true) => {
        if (addon && id && name) {
            // Override catalog row titles with crewing labels
            const label = BOARD_ROW_LABELS[_boardRowIndex % BOARD_ROW_LABELS.length];
            _boardRowIndex++;
            return label;
        }
        return null;
    }, [stringWithPrefix]);

    return {
        string,
        stringWithPrefix,
        catalogTitle,
    };
};

module.exports = useTranslate;
