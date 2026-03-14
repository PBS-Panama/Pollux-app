// PBS Crewing Module - Seafarer Schedule mock data

const CURRENT_CONTRACT = {
    id: 'contract-001',
    vesselName: 'MV Atlantic Pioneer',
    vesselIMO: 'IMO 9876543',
    vesselType: 'Bulk Carrier',
    rank: 'II/1 - OOW Navigation (Second Officer)',
    contractStart: '2026-01-15',
    contractEnd: '2026-07-14',
    embarkPort: 'Panama City, Panama',
    disembarkPort: 'Cartagena, Colombia',
    status: 'at-sea',
    flagState: 'pa',
};

const STATUS_LABELS = {
    'at-sea': { label: 'At Sea', color: '#3b82f6' },
    'ashore': { label: 'Ashore', color: '#22c55e' },
    'available': { label: 'Available', color: '#f59e0b' },
    'standby': { label: 'Standby', color: '#a855f7' },
};

const ROTATION_HISTORY = [
    {
        id: 'rot-1',
        vessel: 'MV Caribbean Star',
        rank: 'III Officer',
        embarkDate: '2024-09-01',
        disembarkDate: '2024-12-20',
        embarkPort: 'Colon, Panama',
        disembarkPort: 'Santo Domingo, DR',
        voyageArea: 'Caribbean / Atlantic',
        status: 'completed',
        type: 'sea',
    },
    {
        id: 'rot-2',
        vessel: 'Shore Leave',
        rank: null,
        embarkDate: '2024-12-21',
        disembarkDate: '2025-03-14',
        embarkPort: null,
        disembarkPort: null,
        voyageArea: null,
        status: 'completed',
        type: 'shore',
    },
    {
        id: 'rot-3',
        vessel: 'MV Pacific Trader',
        rank: 'II Officer',
        embarkDate: '2025-03-15',
        disembarkDate: '2025-09-10',
        embarkPort: 'Buenaventura, Colombia',
        disembarkPort: 'Callao, Peru',
        voyageArea: 'Pacific / South America',
        status: 'completed',
        type: 'sea',
    },
    {
        id: 'rot-4',
        vessel: 'Shore Leave',
        rank: null,
        embarkDate: '2025-09-11',
        disembarkDate: '2026-01-14',
        embarkPort: null,
        disembarkPort: null,
        voyageArea: null,
        status: 'completed',
        type: 'shore',
    },
    {
        id: 'rot-5',
        vessel: 'MV Atlantic Pioneer',
        rank: 'II Officer',
        embarkDate: '2026-01-15',
        disembarkDate: '2026-07-14',
        embarkPort: 'Panama City, Panama',
        disembarkPort: 'Cartagena, Colombia',
        voyageArea: 'Atlantic / Caribbean',
        status: 'current',
        type: 'sea',
    },
    {
        id: 'rot-6',
        vessel: 'Shore Leave (Projected)',
        rank: null,
        embarkDate: '2026-07-15',
        disembarkDate: '2026-10-14',
        embarkPort: null,
        disembarkPort: null,
        voyageArea: null,
        status: 'projected',
        type: 'shore',
    },
];

const UPCOMING_PORT_CALLS = [
    { id: 'port-1', port: 'Cartagena', country: 'co', eta: '2026-03-18', etd: '2026-03-20', purpose: 'Cargo discharge' },
    { id: 'port-2', port: 'Kingston', country: 'jm', eta: '2026-03-25', etd: '2026-03-27', purpose: 'Bunkering + Cargo' },
    { id: 'port-3', port: 'Freeport', country: 'bs', eta: '2026-04-01', etd: '2026-04-02', purpose: 'Cargo loading' },
    { id: 'port-4', port: 'Houston', country: 'us', eta: '2026-04-08', etd: '2026-04-12', purpose: 'Discharge + Crew change' },
    { id: 'port-5', port: 'Veracruz', country: 'mx', eta: '2026-04-18', etd: '2026-04-20', purpose: 'Cargo loading' },
];

const ROTATION_COLORS = {
    sea: '#3b82f6',
    shore: '#22c55e',
    standby: '#f59e0b',
};

function daysBetween(dateA, dateB) {
    const a = new Date(dateA);
    const b = new Date(dateB);
    return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function calculateSeaServiceStats(rotations, referenceDate) {
    const ref = referenceDate || new Date();
    const yearStart = new Date(ref.getFullYear(), 0, 1);
    let seaDays = 0;
    let shoreDays = 0;

    for (const rot of rotations) {
        const start = new Date(rot.embarkDate);
        const end = rot.status === 'current' ? ref : new Date(rot.disembarkDate);
        if (end < yearStart) continue;
        const effectiveStart = start < yearStart ? yearStart : start;
        const days = daysBetween(effectiveStart, end);
        if (rot.type === 'sea') seaDays += days;
        else shoreDays += days;
    }

    // Find current rotation
    const current = rotations.find((r) => r.status === 'current');
    let daysUntilChange = 0;
    let contractPercent = 0;
    if (current) {
        const endDate = new Date(current.disembarkDate);
        const startDate = new Date(current.embarkDate);
        daysUntilChange = Math.max(0, daysBetween(ref, endDate));
        const totalDays = daysBetween(startDate, endDate);
        const elapsed = daysBetween(startDate, ref);
        contractPercent = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0;
    }

    return { seaDays, shoreDays, daysUntilChange, contractPercent };
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

module.exports = {
    CURRENT_CONTRACT,
    STATUS_LABELS,
    ROTATION_HISTORY,
    UPCOMING_PORT_CALLS,
    ROTATION_COLORS,
    calculateSeaServiceStats,
    daysBetween,
    formatDate,
};
