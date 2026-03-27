// PBS Crewing Module: Seafarer-side store
// Manages availability periods, interview confirmations, exam bookings
// Uses localStorage for immediate reads + syncs to backend API when available

const api = require('stremio/common/apiClient');

const AVAILABILITY_KEY = 'pbs_seafarer_availability';
const CONFIRMED_KEY = 'pbs_confirmed_interviews';
const BOOKED_EXAMS_KEY = 'pbs_booked_exams';

// Background sync: push localStorage data to API (fire-and-forget)
const syncToApi = async (page, dataKey, storageKey) => {
    try {
        const available = await api.isApiAvailable();
        if (!available) return;
        const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
        await api.patchPageData(api.getUserId(), page, { [dataKey]: data });
    } catch { /* silent — localStorage is the fallback */ }
};

// Background sync: pull API data into localStorage (on init)
const syncFromApi = async (page, dataKey, storageKey) => {
    try {
        const available = await api.isApiAvailable();
        if (!available) return;
        const userId = api.getUserId();
        await api.initUser(userId);
        const pageData = await api.getPageData(userId, page);
        if (pageData && Array.isArray(pageData[dataKey])) {
            localStorage.setItem(storageKey, JSON.stringify(pageData[dataKey]));
        }
    } catch { /* silent */ }
};

// Initialize: pull data from API on first load
let _initDone = false;
const initSync = () => {
    if (_initDone) return;
    _initDone = true;
    syncFromApi('calendar', 'availability', AVAILABILITY_KEY);
    syncFromApi('calendar', 'confirmedInterviews', CONFIRMED_KEY);
    syncFromApi('myexams', 'bookedExams', BOOKED_EXAMS_KEY);
};

// Run init on module load
if (typeof window !== 'undefined') {
    initSync();
}

// ─── Availability Periods ────────────────────────────────────────────
// Each period: { id, type: 'embarking'|'days-off'|'available', startDay, endDay, monthKey, label? }
const getAvailability = () => {
    try {
        return JSON.parse(localStorage.getItem(AVAILABILITY_KEY)) || [];
    } catch { return []; }
};

const addAvailability = (period) => {
    const list = getAvailability();
    const newPeriod = { ...period, id: 'avl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) };
    list.push(newPeriod);
    localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(list));
    // Sync to API
    api.addAvailability(api.getUserId(), period).catch(() => {});
    syncToApi('calendar', 'availability', AVAILABILITY_KEY);
    return newPeriod;
};

const removeAvailability = (id) => {
    const list = getAvailability().filter((p) => p.id !== id);
    localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(list));
    // Sync to API
    api.removeAvailability(api.getUserId(), id).catch(() => {});
    syncToApi('calendar', 'availability', AVAILABILITY_KEY);
};

const getAvailabilityForMonth = (monthKey) => {
    return getAvailability().filter((p) => p.monthKey === monthKey);
};

// ─── Interview Confirmations ─────────────────────────────────────────
// Stores event IDs that the seafarer has confirmed
const getConfirmedInterviews = () => {
    try {
        return JSON.parse(localStorage.getItem(CONFIRMED_KEY)) || [];
    } catch { return []; }
};

const confirmInterview = (eventId) => {
    const list = getConfirmedInterviews();
    if (!list.includes(eventId)) {
        list.push(eventId);
        localStorage.setItem(CONFIRMED_KEY, JSON.stringify(list));
        // Sync to API
        api.confirmInterview(api.getUserId(), eventId).catch(() => {});
    }
};

const isInterviewConfirmed = (eventId) => {
    return getConfirmedInterviews().includes(eventId);
};

// ─── Booked Exams ────────────────────────────────────────────────────
// Each: { id, examName, examCode, day, monthKey, bookedAt }
const getBookedExams = () => {
    try {
        return JSON.parse(localStorage.getItem(BOOKED_EXAMS_KEY)) || [];
    } catch { return []; }
};

const bookExam = (exam) => {
    const list = getBookedExams();
    const newBooking = { ...exam, id: 'exm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), bookedAt: Date.now() };
    list.push(newBooking);
    localStorage.setItem(BOOKED_EXAMS_KEY, JSON.stringify(list));
    // Sync to API
    api.bookExam(api.getUserId(), exam).catch(() => {});
    syncToApi('myexams', 'bookedExams', BOOKED_EXAMS_KEY);
    return newBooking;
};

const removeBookedExam = (id) => {
    const list = getBookedExams().filter((e) => e.id !== id);
    localStorage.setItem(BOOKED_EXAMS_KEY, JSON.stringify(list));
    // Sync to API
    api.cancelExam(api.getUserId(), id).catch(() => {});
    syncToApi('myexams', 'bookedExams', BOOKED_EXAMS_KEY);
};

module.exports = {
    getAvailability, addAvailability, removeAvailability, getAvailabilityForMonth,
    getConfirmedInterviews, confirmInterview, isInterviewConfirmed,
    getBookedExams, bookExam, removeBookedExam,
    initSync,
};
