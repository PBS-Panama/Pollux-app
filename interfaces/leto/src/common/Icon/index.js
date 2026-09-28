// PBS Crewing Module — replaces the old Stremio icon package (Fase 2, limpieza Stremio/GPL).
// Same public API as the old package: <Icon className={string} name={string} />.
// Renders the self-hosted Iconoir set already bundled at src/assets/iconoir.css
// (MIT, github.com/iconoir-icons/iconoir) and used since the Mannat reskin for
// the sidebar tabs (see components/MainNavBars/MainNavBars.tsx). Anything
// Iconoir has no equivalent for (brand logos, a couple of window controls)
// falls back to a small hand-drawn SVG, same pattern as the existing
// CREW_ICONS map in NavTabButton.js.
import React from 'react';
import classnames from 'classnames';

// old stremio-icons name -> iconoir-* class (src/assets/iconoir.css)
const ICON_MAP = {
    'actors': 'iconoir-user',
    'add': 'iconoir-plus',
    'addons': 'iconoir-puzzle',
    'bin': 'iconoir-bin',
    'calendar-thin': 'iconoir-calendar',
    'caret-down': 'iconoir-nav-arrow-down',
    'caret-left': 'iconoir-nav-arrow-left',
    'caret-right': 'iconoir-nav-arrow-right',
    'checkmark': 'iconoir-check',
    'chevron-back': 'iconoir-nav-arrow-left',
    'chevron-forward': 'iconoir-nav-arrow-right',
    'close': 'iconoir-xmark',
    'cloud-library': 'iconoir-cloud',
    'download': 'iconoir-download',
    'eye': 'iconoir-eye',
    'facebook': 'iconoir-facebook',
    'filters': 'iconoir-filter',
    'glasses': 'iconoir-glasses',
    'heart': 'iconoir-heart-solid',
    'heart-outline': 'iconoir-heart',
    'help': 'iconoir-help-circle',
    'ic_broken_link': 'iconoir-link-xmark',
    'imdb-outline': 'iconoir-star',
    'link': 'iconoir-link',
    'macos': 'iconoir-app-window',
    'maximize': 'iconoir-maximize',
    'megaphone': 'iconoir-megaphone',
    'more-horizontal': 'iconoir-more-horiz',
    'more-vertical': 'iconoir-more-vert',
    'person': 'iconoir-user',
    'person-outline': 'iconoir-user',
    'play': 'iconoir-play',
    'reddit': 'iconoir-share-android',
    'remote': 'iconoir-gamepad',
    'remove': 'iconoir-minus',
    'reset': 'iconoir-refresh',
    'search': 'iconoir-search',
    'settings': 'iconoir-settings',
    'subtitles': 'iconoir-closed-captions-tag',
    'thumbs-up': 'iconoir-thumbs-up',
    'thumbs-up-outline': 'iconoir-thumbs-up',
    'trailer': 'iconoir-movie',
    'volume-medium': 'iconoir-sound-high',
    'x': 'iconoir-xmark',
};

// Iconoir has no equivalent (no window-manager glyphs, no macOS/reddit/imdb
// brand marks beyond what's mapped above) — hand-drawn fallback, same style
// as CREW_ICONS in NavTabButton.js.
const CUSTOM_ICONS = {
    'minimize': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="19" x2="19" y2="19" />
        </svg>
    ),
};

const Icon = ({ className, name, ...props }) => {
    if (typeof name !== 'string' || name.length === 0) {
        return null;
    }
    const iconoirClass = ICON_MAP[name];
    if (iconoirClass) {
        return <i className={classnames(className, 'icon', iconoirClass)} {...props} />;
    }
    if (CUSTOM_ICONS[name]) {
        return React.cloneElement(CUSTOM_ICONS[name], { className: classnames(className, 'icon') });
    }
    // '<base>-outline' with no explicit mapping — Iconoir icons are already
    // outline-style by default, so the base name (if mapped) covers both.
    const base = name.replace(/-outline$/, '');
    if (base !== name && ICON_MAP[base]) {
        return <i className={classnames(className, 'icon', ICON_MAP[base])} {...props} />;
    }
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[Icon] sin mapeo Iconoir para "${name}" — agregalo a ICON_MAP/CUSTOM_ICONS en common/Icon/index.js`);
    }
    return <i className={classnames(className, 'icon')} />;
};

export default Icon;
