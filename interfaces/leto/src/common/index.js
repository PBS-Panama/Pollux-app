const { PlatformProvider, usePlatform } = require('./Platform');
const { ShortcutsProvider, useShortcuts } = require('./Shortcuts');
const { withCoreSuspender } = require('./CoreSuspender');
const interfaceLanguages = require('./interfaceLanguages.json');
const routesRegexp = require('./routesRegexp');
const useBinaryState = require('./useBinaryState');
const { default: useFullscreen } = require('./useFullscreen');
const useProfile = require('./useProfile');
const { default: useLanguageSorting } = require('./useLanguageSorting');
const { THEMES, DEFAULT_THEME, getStoredTheme, applyTheme, applyStoredTheme } = require('./theme');

module.exports = {
    PlatformProvider,
    usePlatform,
    ShortcutsProvider,
    useShortcuts,
    withCoreSuspender,
    interfaceLanguages,
    routesRegexp,
    useBinaryState,
    useFullscreen,
    useProfile,
    useLanguageSorting,
    THEMES,
    DEFAULT_THEME,
    getStoredTheme,
    applyTheme,
    applyStoredTheme,
};
