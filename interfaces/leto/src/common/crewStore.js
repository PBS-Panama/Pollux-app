// PBS Crewing Module: Shared localStorage store for pending interviews and custom events

const PENDING_KEY = 'pbs_pending_interviews';
const EVENTS_KEY = 'pbs_custom_events';

// ─── Pending Interviews ──────────────────────────────────────────────
const getPendingInterviews = () => {
    try {
        return JSON.parse(localStorage.getItem(PENDING_KEY)) || [];
    } catch { return []; }
};

const addPendingInterview = (crew) => {
    const list = getPendingInterviews();
    if (list.find((c) => c.id === crew.id)) return false; // already exists
    list.push({ ...crew, addedAt: Date.now() });
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    return true;
};

const removePendingInterview = (crewId) => {
    const list = getPendingInterviews().filter((c) => c.id !== crewId);
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
};

// Toggle add/remove — returns true if now added, false if now removed
const togglePendingInterview = (crew) => {
    const list = getPendingInterviews();
    const exists = list.find((c) => c.id === crew.id);
    if (exists) {
        removePendingInterview(crew.id);
        window.dispatchEvent(new CustomEvent('pbs-pending-changed', { detail: { id: crew.id, added: false } }));
        return false;
    } else {
        addPendingInterview(crew);
        window.dispatchEvent(new CustomEvent('pbs-pending-changed', { detail: { id: crew.id, added: true } }));
        return true;
    }
};

const isPendingInterview = (crewId) => {
    return getPendingInterviews().some((c) => c.id === crewId);
};

// ─── Custom Calendar Events ──────────────────────────────────────────
const getCustomEvents = () => {
    try {
        return JSON.parse(localStorage.getItem(EVENTS_KEY)) || [];
    } catch { return []; }
};

const addCustomEvent = (event) => {
    const list = getCustomEvents();
    const newEvent = { ...event, id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) };
    list.push(newEvent);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
    return newEvent;
};

const updateCustomEvent = (id, updates) => {
    const list = getCustomEvents().map((e) => e.id === id ? { ...e, ...updates } : e);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
};

const deleteCustomEvent = (id) => {
    const list = getCustomEvents().filter((e) => e.id !== id);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
};

module.exports = {
    getPendingInterviews, addPendingInterview, removePendingInterview,
    togglePendingInterview, isPendingInterview,
    getCustomEvents, addCustomEvent, updateCustomEvent, deleteCustomEvent,
};
