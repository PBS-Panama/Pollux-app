// PBS Crewing Module: Company Calendar mock data

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EVENT_CATEGORIES = [
    { id: 'all', label: 'All Events', color: '#ffffff' },
    { id: 'crew-change', label: 'Crew Changes', color: '#16a34a' },
    { id: 'contract', label: 'Contract Expiry', color: '#d97706' },
    { id: 'audit', label: 'Audits & Inspections', color: '#dc2626' },
    { id: 'recruiting', label: 'Recruitment', color: '#2563eb' },
    { id: 'compliance', label: 'Compliance', color: '#a855f7' },
    { id: 'vessel', label: 'Vessel Schedule', color: '#06b6d4' },
];

const COMPANY_EVENTS = {};

module.exports = { MONTHS, WEEKDAYS_SHORT, EVENT_CATEGORIES, COMPANY_EVENTS };
