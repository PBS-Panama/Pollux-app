// PBS Crewing Module: document upload hook for Library page
// Uses backend API for file persistence, falls back to localStorage

const React = require('react');
const { CREW_DOC_LABELS, CREW_ALL_DOCS, CREW_DOC_CATEGORIES, getExpiryStatus } = require('stremio/common/crewDocData');
const api = require('stremio/common/apiClient');

const STORAGE_KEY = 'pbs_crew_uploaded_docs';

// localStorage fallback helpers
const loadFromStorage = () => {
    try {
        const data = window.localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

const saveToStorage = (docs) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch (e) { /* silently fail */ }
};

// Lookup validityYears from the doc catalog
const getDefaultValidity = (category, docName) => {
    const pool = CREW_ALL_DOCS[category] || [];
    const match = pool.find((d) => d.title === docName);
    return match ? match.validityYears : null;
};

const useDocumentUpload = () => {
    const [selectedCategory, setSelectedCategory] = React.useState(1);
    const [selectedDocName, setSelectedDocName] = React.useState(null);
    const [issuedDate, setIssuedDate] = React.useState('');
    const [expiryDate, setExpiryDate] = React.useState('');
    const [noExpiry, setNoExpiry] = React.useState(false);
    const [uploadedDocs, setUploadedDocs] = React.useState([]);
    const [useApi, setUseApi] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);

    const userId = api.getUserId();

    // On mount: check API, load data from API or localStorage
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const available = await api.isApiAvailable();
            if (cancelled) return;
            setUseApi(available);

            if (available) {
                try {
                    await api.initUser(userId);
                    const result = await api.getUploads(userId);
                    if (!cancelled) setUploadedDocs(result.uploads || []);
                } catch {
                    if (!cancelled) {
                        setUseApi(false);
                        setUploadedDocs(loadFromStorage());
                    }
                }
            } else {
                setUploadedDocs(loadFromStorage());
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Listen for metadata update events to refresh data
    React.useEffect(() => {
        const refresh = async () => {
            if (!useApi) return;
            try {
                const result = await api.getUploads(userId);
                setUploadedDocs(result.uploads || []);
            } catch { /* silent */ }
        };
        window.addEventListener('pbs-uploads-changed', refresh);
        return () => window.removeEventListener('pbs-uploads-changed', refresh);
    }, [useApi, userId]);

    const documentOptions = React.useMemo(() => {
        const docs = CREW_ALL_DOCS[selectedCategory] || [];
        return docs.map((doc) => ({
            value: doc.title,
            label: doc.title,
        }));
    }, [selectedCategory]);

    // Reset doc selection and dates when category changes
    React.useEffect(() => {
        setSelectedDocName(null);
        setIssuedDate('');
        setExpiryDate('');
        setNoExpiry(false);
    }, [selectedCategory]);

    // Auto-compute expiry when issued date changes and doc has known validity
    React.useEffect(() => {
        if (noExpiry) {
            setExpiryDate('');
            return;
        }
        if (!issuedDate || !selectedDocName) return;
        const validity = getDefaultValidity(selectedCategory, selectedDocName);
        if (validity !== null) {
            const d = new Date(issuedDate);
            d.setFullYear(d.getFullYear() + validity);
            setExpiryDate(d.toISOString().split('T')[0]);
        }
    }, [issuedDate, selectedDocName, selectedCategory, noExpiry]);

    // Persist to localStorage as backup
    React.useEffect(() => {
        if (uploadedDocs.length > 0 || !useApi) {
            saveToStorage(uploadedDocs);
        }
    }, [uploadedDocs, useApi]);

    // addUpload — accepts a File object, includes dates
    const addUpload = React.useCallback(async (fileOrName) => {
        if (!selectedDocName) return;

        const validity = noExpiry ? null : getDefaultValidity(selectedCategory, selectedDocName);
        const finalExpiry = noExpiry ? 'N/A' : (expiryDate || null);

        if (useApi && fileOrName instanceof File) {
            setUploading(true);
            try {
                const docMeta = await api.uploadFile(
                    userId,
                    fileOrName,
                    selectedCategory,
                    CREW_DOC_LABELS[selectedCategory],
                    selectedDocName,
                    issuedDate || null,
                    finalExpiry,
                    validity
                );
                setUploadedDocs((prev) => [docMeta, ...prev]);
            } catch (err) {
                console.error('Upload failed:', err);
                const fallbackDoc = {
                    id: Date.now().toString(),
                    category: selectedCategory,
                    categoryLabel: CREW_DOC_LABELS[selectedCategory],
                    documentName: selectedDocName,
                    fileName: fileOrName.name || fileOrName,
                    issuedDate: issuedDate || null,
                    expiryDate: finalExpiry,
                    validityYears: validity,
                    uploadedAt: new Date().toISOString(),
                    status: 'uploaded',
                };
                setUploadedDocs((prev) => [fallbackDoc, ...prev]);
            }
            setUploading(false);
        } else {
            const fileName = fileOrName instanceof File ? fileOrName.name : fileOrName;
            const newDoc = {
                id: Date.now().toString(),
                category: selectedCategory,
                categoryLabel: CREW_DOC_LABELS[selectedCategory],
                documentName: selectedDocName,
                fileName,
                issuedDate: issuedDate || null,
                expiryDate: finalExpiry,
                validityYears: validity,
                uploadedAt: new Date().toISOString(),
                status: 'uploaded',
            };
            setUploadedDocs((prev) => [newDoc, ...prev]);
        }

        // Reset dates after upload
        setIssuedDate('');
        setExpiryDate('');
        setNoExpiry(false);
    }, [selectedCategory, selectedDocName, useApi, userId, issuedDate, expiryDate, noExpiry]);

    const removeUpload = React.useCallback(async (id) => {
        if (useApi) {
            try {
                await api.deleteUpload(userId, id);
            } catch (err) {
                console.error('Delete failed:', err);
            }
        }
        setUploadedDocs((prev) => prev.filter((doc) => doc.id !== id));
    }, [useApi, userId]);

    return {
        categories: CREW_DOC_CATEGORIES,
        categoryLabels: CREW_DOC_LABELS,
        selectedCategory,
        setSelectedCategory,
        documentOptions,
        selectedDocName,
        setSelectedDocName,
        issuedDate,
        setIssuedDate,
        expiryDate,
        setExpiryDate,
        noExpiry,
        setNoExpiry,
        uploadedDocs,
        addUpload,
        removeUpload,
        uploading,
        useApi,
    };
};

module.exports = useDocumentUpload;
