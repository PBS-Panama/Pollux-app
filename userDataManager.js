// Leto Crewing Module: User Database — filesystem operations
// Manages per-user folder structure and JSON data persistence

const fs = require('fs');
const path = require('path');

const USER_DB_ROOT = path.resolve(__dirname, 'User database');

// Subfolder names matching each page's route
const PAGE_FOLDERS = ['myfiles', 'calendar', 'dashboard', 'myexams', 'settings'];

// Default data.json content for each page
const DEFAULT_DATA = {
    myfiles: { uploads: [] },
    calendar: { availability: [], confirmedInterviews: [] },
    dashboard: { currentContract: null, rotationHistory: [], portCalls: [] },
    myexams: { bookedExams: [] },
    settings: {
        preferences: {},
        rank: null,
        identity: {
            double_nationality: false,
            nationality_primary: '',
            nationality_secondary: '',
            passport_1: { number: '', country: '', expiry_date: '' },
            passport_2: { number: '', country: '', expiry_date: '' },
        },
        visa: {
            has_visa: false,
            number: '',
            country: '',
            type: '',
            expiry_date: '',
            linked_passport: '',
        },
        travel: {
            departure_airport_iata: '',
            departure_airport_name: '',
        },
    },
};

// ─── Folder Management ──────────────────────────────────────────────

/**
 * Ensure the full folder structure exists for a user.
 * Creates: User database/{userId}/{myfiles,calendar,dashboard,myexams,settings}/
 * Also creates myfiles/uploads/ for actual file storage.
 */
const ensureUserFolders = (userId) => {
    const userDir = path.join(USER_DB_ROOT, userId);
    for (const folder of PAGE_FOLDERS) {
        const folderPath = path.join(userDir, folder);
        fs.mkdirSync(folderPath, { recursive: true });

        // Create uploads subfolder for myfiles
        if (folder === 'myfiles') {
            fs.mkdirSync(path.join(folderPath, 'uploads'), { recursive: true });
        }

        // Create data.json with defaults if it doesn't exist
        const dataPath = path.join(folderPath, 'data.json');
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, JSON.stringify(DEFAULT_DATA[folder], null, 2), 'utf8');
        }
    }
    return userDir;
};

/**
 * List all user IDs in the database
 */
const listUsers = () => {
    if (!fs.existsSync(USER_DB_ROOT)) return [];
    return fs.readdirSync(USER_DB_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
};

// ─── JSON Data Read/Write ───────────────────────────────────────────

/**
 * Read a page's data.json for a user
 */
const readPageData = (userId, page) => {
    ensureUserFolders(userId);
    const dataPath = path.join(USER_DB_ROOT, userId, page, 'data.json');
    try {
        const raw = fs.readFileSync(dataPath, 'utf8');
        const parsed = JSON.parse(raw);
        const defaults = DEFAULT_DATA[page] || {};

        // Backward compatible deep merge for settings shape growth.
        if (page === 'settings') {
            return {
                ...defaults,
                ...parsed,
                identity: {
                    ...(defaults.identity || {}),
                    ...(parsed.identity || {}),
                    passport_1: {
                        ...((defaults.identity && defaults.identity.passport_1) || {}),
                        ...((parsed.identity && parsed.identity.passport_1) || {}),
                    },
                    passport_2: {
                        ...((defaults.identity && defaults.identity.passport_2) || {}),
                        ...((parsed.identity && parsed.identity.passport_2) || {}),
                    },
                },
                visa: {
                    ...(defaults.visa || {}),
                    ...(parsed.visa || {}),
                },
                travel: {
                    ...(defaults.travel || {}),
                    ...(parsed.travel || {}),
                },
            };
        }

        return { ...defaults, ...parsed };
    } catch {
        return DEFAULT_DATA[page] || {};
    }
};

/**
 * Write a page's data.json for a user (full replace)
 */
const writePageData = (userId, page, data) => {
    ensureUserFolders(userId);
    const dataPath = path.join(USER_DB_ROOT, userId, page, 'data.json');
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    return data;
};

/**
 * Merge partial data into a page's data.json (shallow merge)
 */
const mergePageData = (userId, page, partial) => {
    const current = readPageData(userId, page);
    const merged = { ...current, ...partial };
    return writePageData(userId, page, merged);
};

// ─── File Storage (myfiles) ─────────────────────────────────────────

/**
 * Get the uploads directory path for a user
 */
const getUploadsDir = (userId) => {
    ensureUserFolders(userId);
    return path.join(USER_DB_ROOT, userId, 'myfiles', 'uploads');
};

/**
 * Save an uploaded file buffer to the user's uploads folder.
 * Returns the saved file path (relative to uploads dir).
 */
const saveUploadedFile = (userId, fileId, originalName, buffer) => {
    const uploadsDir = getUploadsDir(userId);
    const ext = path.extname(originalName);
    const savedName = `${fileId}${ext}`;
    const filePath = path.join(uploadsDir, savedName);
    fs.writeFileSync(filePath, buffer);
    return savedName;
};

/**
 * Delete an uploaded file from the user's uploads folder
 */
const deleteUploadedFile = (userId, savedName) => {
    const filePath = path.join(getUploadsDir(userId), savedName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
};

/**
 * Get the full path to a user's uploaded file
 */
const getUploadedFilePath = (userId, savedName) => {
    return path.join(getUploadsDir(userId), savedName);
};

/**
 * Add a document metadata entry to myfiles/data.json
 */
const addFileMetadata = (userId, docMeta) => {
    const data = readPageData(userId, 'myfiles');
    data.uploads = [docMeta, ...data.uploads];
    writePageData(userId, 'myfiles', data);
    return docMeta;
};

/**
 * Remove a document metadata entry and its file
 */
const removeFileMetadata = (userId, docId) => {
    const data = readPageData(userId, 'myfiles');
    const doc = data.uploads.find((d) => d.id === docId);
    if (doc && doc.savedName) {
        deleteUploadedFile(userId, doc.savedName);
    }
    data.uploads = data.uploads.filter((d) => d.id !== docId);
    writePageData(userId, 'myfiles', data);
    return true;
};

module.exports = {
    USER_DB_ROOT,
    PAGE_FOLDERS,
    ensureUserFolders,
    listUsers,
    readPageData,
    writePageData,
    mergePageData,
    getUploadsDir,
    saveUploadedFile,
    deleteUploadedFile,
    getUploadedFilePath,
    addFileMetadata,
    removeFileMetadata,
};
