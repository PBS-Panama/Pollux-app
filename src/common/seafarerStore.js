// PBS Crewing Module: Seafarer-side localStorage store
// Manages availability periods, interview confirmations, certificate alerts, exam bookings

const AVAILABILITY_KEY = 'pbs_seafarer_availability';
const CONFIRMED_KEY = 'pbs_confirmed_interviews';
const BOOKED_EXAMS_KEY = 'pbs_booked_exams';

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
    return newPeriod;
};

const removeAvailability = (id) => {
    const list = getAvailability().filter((p) => p.id !== id);
    localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(list));
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
    return newBooking;
};

const removeBookedExam = (id) => {
    const list = getBookedExams().filter((e) => e.id !== id);
    localStorage.setItem(BOOKED_EXAMS_KEY, JSON.stringify(list));
};

module.exports = {
    getAvailability, addAvailability, removeAvailability, getAvailabilityForMonth,
    getConfirmedInterviews, confirmInterview, isInterviewConfirmed,
    getBookedExams, bookExam, removeBookedExam,
};
