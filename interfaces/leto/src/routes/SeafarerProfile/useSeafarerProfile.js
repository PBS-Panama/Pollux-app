// PBS Crewing Module — Seafarer Profile
// Fetches the real profile + embarkation history straight from the backend
// (same authedFetch pattern as MyFleet.js) — no CoreTransport model, no
// Stremio meta_details shape in between.

const React = require('react');

const getAuthToken = () => {
    try {
        const raw = localStorage.getItem('pollux-auth');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return (parsed && parsed.state && parsed.state.accessToken) || null;
    } catch {
        return null;
    }
};

const authedFetch = (url, options) => {
    const token = getAuthToken();
    const headers = Object.assign({}, options && options.headers, token ? { Authorization: 'Bearer ' + token } : {});
    return fetch(url, Object.assign({}, options, { headers }));
};

const authedJson = (url, options) => {
    const opts = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers);
    return authedFetch(url, Object.assign({}, opts, { headers })).then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) {
            const err = new Error((body && body.detail) || ('HTTP ' + r.status));
            err.status = r.status;
            throw err;
        }
        return body;
    });
};

const useSeafarerProfile = (seafarerId) => {
    const [profile, setProfile] = React.useState(null);
    const [embarkations, setEmbarkations] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const load = React.useCallback(() => {
        if (!seafarerId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        Promise.all([
            authedJson('/api/company/seafarers/' + encodeURIComponent(seafarerId)),
            authedJson('/api/company/seafarers/' + encodeURIComponent(seafarerId) + '/embarkations').catch(() => ({ items: [] })),
        ])
            .then(([profileData, embarkationsData]) => {
                setProfile(profileData);
                setEmbarkations((embarkationsData && embarkationsData.items) || []);
            })
            .catch((err) => setError(err.message || 'No se pudo cargar el perfil.'))
            .finally(() => setLoading(false));
    }, [seafarerId]);

    React.useEffect(() => { load(); }, [load]);

    const downloadCv = React.useCallback(() => {
        return authedFetch('/api/company/seafarers/' + encodeURIComponent(seafarerId) + '/cv')
            .then((r) => {
                if (!r.ok) throw new Error('No se pudo generar el CV.');
                return r.blob();
            })
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'CV_' + seafarerId + '.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            });
    }, [seafarerId]);

    return { profile, embarkations, loading, error, reload: load, downloadCv };
};

module.exports = useSeafarerProfile;
