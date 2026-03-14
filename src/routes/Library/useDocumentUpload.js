// PBS Crewing Module: document upload hook for Library page

const React = require('react');
const { CREW_DOC_LABELS, CREW_ALL_DOCS, CREW_DOC_CATEGORIES } = require('stremio/common/crewDocData');

const STORAGE_KEY = 'pbs_crew_uploaded_docs';

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

const useDocumentUpload = () => {
    const [selectedCategory, setSelectedCategory] = React.useState(1);
    const [selectedDocName, setSelectedDocName] = React.useState(null);
    const [uploadedDocs, setUploadedDocs] = React.useState(loadFromStorage);

    const documentOptions = React.useMemo(() => {
        const docs = CREW_ALL_DOCS[selectedCategory] || [];
        return docs.map((doc) => ({
            value: doc.title,
            label: doc.title,
        }));
    }, [selectedCategory]);

    // Reset doc selection when category changes
    React.useEffect(() => {
        setSelectedDocName(null);
    }, [selectedCategory]);

    // Persist to localStorage
    React.useEffect(() => {
        saveToStorage(uploadedDocs);
    }, [uploadedDocs]);

    const addUpload = React.useCallback((fileName) => {
        if (!selectedDocName) return;
        const newDoc = {
            id: Date.now().toString(),
            category: selectedCategory,
            categoryLabel: CREW_DOC_LABELS[selectedCategory],
            documentName: selectedDocName,
            fileName: fileName,
            uploadedAt: new Date().toISOString(),
            status: 'uploaded',
        };
        setUploadedDocs((prev) => [newDoc, ...prev]);
    }, [selectedCategory, selectedDocName]);

    const removeUpload = React.useCallback((id) => {
        setUploadedDocs((prev) => prev.filter((doc) => doc.id !== id));
    }, []);

    return {
        categories: CREW_DOC_CATEGORIES,
        categoryLabels: CREW_DOC_LABELS,
        selectedCategory,
        setSelectedCategory,
        documentOptions,
        selectedDocName,
        setSelectedDocName,
        uploadedDocs,
        addUpload,
        removeUpload,
    };
};

module.exports = useDocumentUpload;
