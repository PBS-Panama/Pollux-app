// PBS Crewing Module: My Files category state.
// Uploading is disabled: no company-facing upload endpoint exists yet
// (documents.py only exposes /seafarer/me and /users/{id}). The old flow faked
// success and persisted to localStorage - removed.

const React = require('react');
const { CREW_DOC_LABELS, CREW_DOC_CATEGORIES } = require('pollux/common/crewDocData');

const useDocumentUpload = () => {
    const [selectedCategory, setSelectedCategory] = React.useState(1);

    return {
        categories: CREW_DOC_CATEGORIES,
        categoryLabels: CREW_DOC_LABELS,
        selectedCategory,
        setSelectedCategory,
    };
};

module.exports = useDocumentUpload;
