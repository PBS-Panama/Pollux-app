// PBS Crewing Module: Seafarer Calendar mock data

const AVAILABILITY_TYPES = [
    { id: 'embarking', label: 'Embarking (At Sea)', color: '#2563eb', bgAlpha: 0.12 },
    { id: 'days-off', label: 'Days Off', color: '#16a34a', bgAlpha: 0.12 },
    { id: 'available', label: 'Available for Work', color: '#d97706', bgAlpha: 0.12 },
];

// Runtime certificate events should come from persisted/backend sources.
const SEAFARER_CERTIFICATES = [];

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
    SEAFARER_CATEGORIES,
};
