// PBS Crewing Module — CompanyDashboard data hook
// Same fetch pattern as MyFleet/SeafarerProfile: JWT from localStorage,
// direct fetch() to real /api/company/* endpoints, no CoreTransport model.
// Three real endpoints, three real numbers — nothing here is synthesized
// (notas-pendientes-2026-09-28, R4: "si un dato no tiene endpoint, no se muestra").

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

const authedJson = (url) => authedFetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);

const useCompanyDashboard = () => {
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [seafarers, setSeafarers] = React.useState([]);
    const [staffCount, setStaffCount] = React.useState(null);
    const [vesselCount, setVesselCount] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        Promise.all([
            authedJson('/api/company/seafarers'),
            authedJson('/api/company/staff'),
            authedJson('/api/company/vessels'),
        ]).then(([seafarersRes, staffRes, vesselsRes]) => {
            if (cancelled) return;
            if (!seafarersRes) {
                setError('No se pudo cargar la base de tripulantes.');
            }
            setSeafarers((seafarersRes && Array.isArray(seafarersRes.seafarers)) ? seafarersRes.seafarers : []);
            setStaffCount((staffRes && Array.isArray(staffRes.items)) ? staffRes.items.filter((s) => s.status === 'active').length : null);
            setVesselCount((vesselsRes && Array.isArray(vesselsRes.items)) ? vesselsRes.items.length : null);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const departmentGroups = React.useMemo(() => {
        const groups = {};
        seafarers.forEach((s) => {
            const dept = s.department || 'General';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(s);
        });
        return Object.entries(groups)
            .map(([name, items]) => ({ name, items }))
            .sort((a, b) => b.items.length - a.items.length);
    }, [seafarers]);

    return { loading, error, seafarers, staffCount, vesselCount, departmentGroups };
};

module.exports = useCompanyDashboard;
