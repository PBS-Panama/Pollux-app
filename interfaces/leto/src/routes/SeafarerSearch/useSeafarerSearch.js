// PBS Crewing Module — SeafarerSearch data hook
// Same pattern as MyFleet/CompanyDashboard: JWT from localStorage, direct
// fetch() to real /api/company/* endpoints, no CoreTransport model. Fetches
// the crew directory plus the current staff list (to know who's already
// hired, for the "Agregar a mi personal" button state) and exposes a real
// hire() that calls the same POST /api/company/staff MyFleet's "Contratar"
// button already uses.

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

const useSeafarerSearch = () => {
    const [seafarers, setSeafarers] = React.useState([]);
    const [staff, setStaff] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [hiringId, setHiringId] = React.useState(null);

    const loadStaff = React.useCallback(() => {
        return authedJson('/api/company/staff').then((data) => setStaff((data && data.items) || [])).catch(() => {});
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        Promise.all([
            authedJson('/api/company/seafarers').catch(() => null),
            authedJson('/api/company/staff').catch(() => null),
        ]).then(([seafarersRes, staffRes]) => {
            if (cancelled) return;
            if (!seafarersRes) setError('No se pudo cargar la base de tripulantes.');
            setSeafarers((seafarersRes && Array.isArray(seafarersRes.seafarers)) ? seafarersRes.seafarers : []);
            setStaff((staffRes && Array.isArray(staffRes.items)) ? staffRes.items : []);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const hiredIds = React.useMemo(
        () => new Set(staff.filter((s) => s.status === 'active').map((s) => s.seafarer_id)),
        [staff]
    );

    const hire = React.useCallback((seafarerId) => {
        setHiringId(seafarerId);
        return authedJson('/api/company/staff', { method: 'POST', body: JSON.stringify({ seafarer_id: seafarerId }) })
            .then(() => loadStaff())
            .finally(() => setHiringId(null));
    }, [loadStaff]);

    return { loading, error, seafarers, hiredIds, hiringId, hire };
};

module.exports = useSeafarerSearch;
