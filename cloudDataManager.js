// PBS Crewing Module: Cloud Data Manager
// Firestore for JSON data (profiles, calendar, etc.)
// GCS for binary files (PDFs)

const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'durable-sky-484422-b5';
const BUCKET_NAME = process.env.GCS_BUCKET || 'pb-leto-uploads';
const COLLECTION = 'leto-users';

const storage = new Storage({ projectId: PROJECT_ID });
const firestore = new Firestore({ projectId: PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

const PAGE_FOLDERS = ['myfiles', 'calendar', 'dashboard', 'myexams', 'settings'];

const DEFAULT_DATA = {
    myfiles: { uploads: [] },
    calendar: { availability: [], confirmedInterviews: [] },
    dashboard: { currentContract: null, rotationHistory: [], portCalls: [] },
    myexams: { bookedExams: [] },
    settings: { preferences: {} },
};

// ─── Firestore helpers ───────────────────────────────────────────────

const pageRef = (userId, page) =>
    firestore.collection(COLLECTION).doc(userId).collection('pages').doc(page);

const ensureUserFolders = async (userId) => {
    for (const page of PAGE_FOLDERS) {
        const ref = pageRef(userId, page);
        const doc = await ref.get();
        if (!doc.exists) {
            await ref.set(DEFAULT_DATA[page]);
        }
    }
};

const listUsers = async () => {
    const docs = await firestore.collection(COLLECTION).listDocuments();
    return docs.map((d) => d.id);
};

const readPageData = async (userId, page) => {
    const ref = pageRef(userId, page);
    const doc = await ref.get();
    if (!doc.exists) {
        const defaults = DEFAULT_DATA[page] || {};
        await ref.set(defaults);
        return defaults;
    }
    return doc.data();
};

const writePageData = async (userId, page, data) => {
    await pageRef(userId, page).set(data);
    return data;
};

const mergePageData = async (userId, page, partial) => {
    const current = await readPageData(userId, page);
    const merged = { ...current, ...partial };
    return writePageData(userId, page, merged);
};

// ─── GCS helpers ────────────────────────────────────────────────────

const gcsPath = (userId, savedName) => `users/${userId}/myfiles/${savedName}`;

const saveUploadedFile = async (userId, fileId, originalName, buffer) => {
    const ext = path.extname(originalName);
    const savedName = `${fileId}${ext}`;
    await bucket.file(gcsPath(userId, savedName)).save(buffer, {
        metadata: { contentType: 'application/pdf' },
    });
    return savedName;
};

const deleteUploadedFile = async (userId, savedName) => {
    await bucket.file(gcsPath(userId, savedName)).delete({ ignoreNotFound: true });
    return true;
};

const getFileBuffer = async (userId, savedName) => {
    const [buffer] = await bucket.file(gcsPath(userId, savedName)).download();
    return buffer;
};

const replaceFile = async (userId, savedName, buffer) => {
    await bucket.file(gcsPath(userId, savedName)).save(buffer, {
        metadata: { contentType: 'application/pdf' },
    });
};

// ─── File metadata helpers ──────────────────────────────────────────

const addFileMetadata = async (userId, docMeta) => {
    const data = await readPageData(userId, 'myfiles');
    data.uploads = [docMeta, ...(data.uploads || [])];
    await writePageData(userId, 'myfiles', data);
    return docMeta;
};

const removeFileMetadata = async (userId, docId) => {
    const data = await readPageData(userId, 'myfiles');
    const doc = (data.uploads || []).find((d) => d.id === docId);
    if (doc && doc.savedName) {
        await deleteUploadedFile(userId, doc.savedName);
    }
    data.uploads = (data.uploads || []).filter((d) => d.id !== docId);
    await writePageData(userId, 'myfiles', data);
    return true;
};

module.exports = {
    PAGE_FOLDERS,
    ensureUserFolders,
    listUsers,
    readPageData,
    writePageData,
    mergePageData,
    saveUploadedFile,
    deleteUploadedFile,
    getFileBuffer,
    replaceFile,
    addFileMetadata,
    removeFileMetadata,
};
