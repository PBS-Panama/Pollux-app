// PBS Crewing Module: Seafarer Calendar mock data

const AVAILABILITY_TYPES = [
    { id: 'embarking', label: 'Embarking (At Sea)', color: '#2563eb', bgAlpha: 0.12 },
    { id: 'days-off', label: 'Days Off', color: '#16a34a', bgAlpha: 0.12 },
    { id: 'available', label: 'Available for Work', color: '#d97706', bgAlpha: 0.12 },
];

// Mock seafarer certificates with expiry dates
// "Due" means the seafarer needs to renew; we flag anything within 30 days
const SEAFARER_CERTIFICATES = [
    { id: 'cert-1', name: 'STCW Basic Safety Training', code: 'STCW A-VI/1', issuedDate: '2022-04-15', expiryDate: '2027-04-15' },
    { id: 'cert-2', name: 'Proficiency in Survival Craft', code: 'STCW A-VI/2-1', issuedDate: '2022-04-15', expiryDate: '2027-04-15' },
    { id: 'cert-3', name: 'Advanced Firefighting', code: 'STCW A-VI/3', issuedDate: '2023-01-10', expiryDate: '2026-04-10' },
    { id: 'cert-4', name: 'Medical First Aid', code: 'STCW A-VI/4-1', issuedDate: '2023-06-20', expiryDate: '2026-06-20' },
    { id: 'cert-5', name: 'GMDSS Radio Operator', code: 'STCW A-IV/2', issuedDate: '2021-09-01', expiryDate: '2026-09-01' },
    { id: 'cert-6', name: 'Seafarer Medical Certificate', code: 'ENG 1 / ILO', issuedDate: '2024-10-01', expiryDate: '2026-10-01' },
    { id: 'cert-7', name: 'Security Awareness Training', code: 'STCW A-VI/6-1', issuedDate: '2023-03-15', expiryDate: '2026-03-15' },
    { id: 'cert-8', name: 'ECDIS Type-Specific', code: 'STCW B-I/12', issuedDate: '2024-01-20', expiryDate: '2029-01-20' },
    { id: 'cert-9', name: 'Seaman\'s Book', code: 'Flag State', issuedDate: '2020-06-01', expiryDate: '2026-06-01' },
    { id: 'cert-10', name: 'Drug & Alcohol Certificate', code: 'Company', issuedDate: '2025-09-01', expiryDate: '2026-03-31' },
];

// Get certificates expiring within N days from a reference date
const getCertificateAlerts = (refDate, daysAhead) => {
    const ref = refDate instanceof Date ? refDate : new Date(refDate);
    const alerts = [];
    SEAFARER_CERTIFICATES.forEach((cert) => {
        const expiry = new Date(cert.expiryDate);
        const diffMs = expiry.getTime() - ref.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= daysAhead) {
            alerts.push({ ...cert, daysUntilExpiry: diffDays });
        }
    });
    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
};

// Get certificate expiry events for a specific month (for calendar day markers)
const getCertExpiryForMonth = (monthKey) => {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr); // 1-based
    const events = [];
    SEAFARER_CERTIFICATES.forEach((cert) => {
        const expiry = new Date(cert.expiryDate);
        if (expiry.getFullYear() === year && (expiry.getMonth() + 1) === month) {
            events.push({
                day: expiry.getDate(),
                title: `${cert.name} expires`,
                category: 'certificate',
                code: cert.code,
                certId: cert.id,
            });
        }
        // Also show 30-day warning in previous month
        const warningDate = new Date(expiry);
        warningDate.setDate(warningDate.getDate() - 30);
        if (warningDate.getFullYear() === year && (warningDate.getMonth() + 1) === month) {
            events.push({
                day: warningDate.getDate(),
                title: `${cert.name} — 30 days to expiry`,
                category: 'cert-warning',
                code: cert.code,
                certId: cert.id,
            });
        }
    });
    return events;
};

// Mock: Default availability for demo (seafarer has some periods pre-set)
const DEFAULT_AVAILABILITY = [
    { id: 'avl-demo-1', type: 'embarking', startDay: 1, endDay: 8, monthKey: '2026-03', label: 'MV Atlantic voyage' },
    { id: 'avl-demo-2', type: 'days-off', startDay: 9, endDay: 14, monthKey: '2026-03', label: 'Shore leave' },
    { id: 'avl-demo-3', type: 'available', startDay: 15, endDay: 31, monthKey: '2026-03', label: 'Available for contracts' },
    { id: 'avl-demo-4', type: 'available', startDay: 1, endDay: 10, monthKey: '2026-04', label: 'Available for contracts' },
    { id: 'avl-demo-5', type: 'embarking', startDay: 11, endDay: 30, monthKey: '2026-04', label: 'MS Robin assignment' },
];

const SEAFARER_CATEGORIES = [
    { id: 'embarking', label: 'Embarking', color: '#2563eb' },
    { id: 'days-off', label: 'Days Off', color: '#16a34a' },
    { id: 'available', label: 'Available', color: '#d97706' },
    { id: 'interview', label: 'Interviews', color: '#8b5cf6' },
    { id: 'certificate', label: 'Cert. Expiry', color: '#dc2626' },
    { id: 'cert-warning', label: 'Cert. Warning', color: '#f97316' },
    { id: 'exam', label: 'Exams', color: '#06b6d4' },
];

module.exports = {
    AVAILABILITY_TYPES,
    SEAFARER_CERTIFICATES,
    getCertificateAlerts,
    getCertExpiryForMonth,
    DEFAULT_AVAILABILITY,
    SEAFARER_CATEGORIES,
};
