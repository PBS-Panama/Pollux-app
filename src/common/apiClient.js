// PBS Crewing Module: API Client
// Communicates with the Express backend for User Database persistence.
// Falls back to localStorage when the API is not available (e.g., webpack dev server).

const getUserId = () => {
    try {
        const data = typeof localStorage !== 'undefined' && localStorage.getItem('leto-user');
        if (data) {
            const parsed = JSON.parse(data);
            if (parsed.id) return parsed.id;
        }

        const authData = typeof localStorage !== 'undefined' && localStorage.getItem('leto-auth');
        if (authData) {
            const parsedAuth = JSON.parse(authData);
            const authUserId = parsedAuth?.state?.user?.id;
            if (authUserId) return authUserId;
        }
    } catch { /* silent */ }
    return '';
};

// API base — same origin in Docker/production, configurable for dev
const API_BASE = (typeof window !== 'undefined' && window.PBS_API_BASE) || '/crewing-api';

let _apiAvailable = null; // null = not checked yet

/**
 * Check if the API is reachable (cached after first check)
 */
const isApiAvailable = async () => {
    if (_apiAvailable !== null) return _apiAvailable;
    try {
        const res = await fetch(`${API_BASE}/users`, { method: 'GET' });
        _apiAvailable = res.ok;
    } catch {
        _apiAvailable = false;
    }
    return _apiAvailable;
};

/**
 * Reset API availability check (e.g., after reconnecting)
 */
const resetApiCheck = () => { _apiAvailable = null; };

// ─── Generic API helpers ────────────────────────────────────────────

const apiGet = async (path) => {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
};

const apiPost = async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json();
};

const apiPut = async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
    return res.json();
};

const apiPatch = async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
    return res.json();
};

const apiDelete = async (path) => {
    const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
    return res.json();
};

// ─── Page Data (generic read/write) ─────────────────────────────────

const getPageData = (userId, page) => apiGet(`/users/${userId}/${page}`);
const setPageData = (userId, page, data) => apiPut(`/users/${userId}/${page}`, data);
const patchPageData = (userId, page, data) => apiPatch(`/users/${userId}/${page}`, data);

// ─── My Files ───────────────────────────────────────────────────────

const getUploads = (userId) => apiGet(`/users/${userId}/myfiles/uploads`);

const uploadFile = async (userId, file, category, categoryLabel, documentName, issuedDate, expiryDate, validityYears) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category.toString());
    formData.append('categoryLabel', categoryLabel);
    formData.append('documentName', documentName);
    if (issuedDate) formData.append('issuedDate', issuedDate);
    if (expiryDate) formData.append('expiryDate', expiryDate);
    if (validityYears !== null && validityYears !== undefined) formData.append('validityYears', validityYears.toString());

    const res = await fetch(`${API_BASE}/users/${userId}/myfiles/upload`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
};

const deleteUpload = (userId, docId) => apiDelete(`/users/${userId}/myfiles/uploads/${docId}`);

const updateUploadMeta = (userId, docId, updates) => apiPatch(`/users/${userId}/myfiles/uploads/${docId}`, updates);

const getDownloadUrl = (userId, savedName) => `${API_BASE}/users/${userId}/myfiles/download/${savedName}`;

const rotateDocument = (userId, docId, direction) => apiPost(`/users/${userId}/myfiles/rotate/${docId}`, { direction });

// ─── Calendar ───────────────────────────────────────────────────────

const getCalendarData = (userId) => getPageData(userId, 'calendar');
const addAvailability = (userId, period) => apiPost(`/users/${userId}/calendar/availability`, period);
const removeAvailability = (userId, periodId) => apiDelete(`/users/${userId}/calendar/availability/${periodId}`);
const confirmInterview = (userId, eventId) => apiPost(`/users/${userId}/calendar/confirm/${eventId}`);

// ─── My Exams ───────────────────────────────────────────────────────

const getExamsData = (userId) => getPageData(userId, 'myexams');
const bookExam = (userId, exam) => apiPost(`/users/${userId}/myexams/book`, exam);
const cancelExam = (userId, examId) => apiDelete(`/users/${userId}/myexams/book/${examId}`);

// ─── Settings ───────────────────────────────────────────────────────

const getSettings = (userId) => getPageData(userId, 'settings');
const updateUserSettings = (userId, partialSettings) => patchPageData(userId, 'settings', partialSettings);
const updateSettings = (userId, prefs) => patchPageData(userId, 'settings', { preferences: prefs });

// ─── Dashboard ──────────────────────────────────────────────────────

const getDashboardData = (userId) => getPageData(userId, 'dashboard');
const updateDashboardData = (userId, data) => setPageData(userId, 'dashboard', data);

// ─── Initialize user on app start ───────────────────────────────────

const initUser = (userId) => apiPost(`/users/${userId}/init`);

module.exports = {
    getUserId,
    API_BASE,
    isApiAvailable,
    resetApiCheck,
    // Generic
    getPageData,
    setPageData,
    patchPageData,
    // My Files
    getUploads,
    uploadFile,
    deleteUpload,
    updateUploadMeta,
    getDownloadUrl,
    rotateDocument,
    // Calendar
    getCalendarData,
    addAvailability,
    removeAvailability,
    confirmInterview,
    // Exams
    getExamsData,
    bookExam,
    cancelExam,
    // Settings
    getSettings,
    updateUserSettings,
    updateSettings,
    // Dashboard
    getDashboardData,
    updateDashboardData,
    // Init
    initUser,
};
