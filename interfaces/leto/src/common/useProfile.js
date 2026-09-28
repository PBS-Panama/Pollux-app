// PBS Crewing Module — app settings (R8)
// Replaces the Stremio ctx/profile/CoreTransport chain. Of Stremio's ~30
// settings fields (subtitles, audio, streaming server, player...) Pollux
// only ever had one real one: interfaceLanguage (Settings > Interface's
// language selector, R2). Backed directly by localStorage under the same
// key CoreTransport always used, so a returning user's language survives.

const React = require('react');
const EventEmitter = require('eventemitter3');

const SETTINGS_KEY = 'pollux-settings';
const DEFAULT_SETTINGS = { interfaceLanguage: 'en-US' };
const events = new EventEmitter();

const readSettings = () => {
    try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
};

const updateSettings = (partial) => {
    const next = { ...readSettings(), ...partial };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    events.emit('change', next);
    return next;
};

const useProfile = () => {
    const [settings, setSettings] = React.useState(readSettings);
    React.useEffect(() => {
        const onChange = (next) => setSettings(next);
        events.on('change', onChange);
        return () => events.off('change', onChange);
    }, []);
    return { settings };
};

useProfile.readSettings = readSettings;
useProfile.updateSettings = updateSettings;

module.exports = useProfile;
