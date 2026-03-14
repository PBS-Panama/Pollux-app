// PBS Crewing Module: Seafarer Document Upload page

const React = require('react');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { useProfile, withCoreSuspender } = require('stremio/common');
const { default: Button } = require('stremio/components/Button');
const { MainNavBars, MultiselectMenu } = require('stremio/components');
const { default: Placeholder } = require('./Placeholder');
const useDocumentUpload = require('./useDocumentUpload');
const styles = require('./styles');

const Library = () => {
    const profile = useProfile();
    const {
        categories,
        categoryLabels,
        selectedCategory,
        setSelectedCategory,
        documentOptions,
        selectedDocName,
        setSelectedDocName,
        uploadedDocs,
        addUpload,
        removeUpload,
    } = useDocumentUpload();

    // Local drag-and-drop state
    const [isDragOver, setIsDragOver] = React.useState(false);

    const onDragOver = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(true);
    }, []);

    const onDragLeave = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
    }, []);

    const onDrop = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
        if (event.dataTransfer && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            addUpload(file.name);
        }
    }, [addUpload]);

    const onDocSelect = React.useCallback((value) => {
        setSelectedDocName(value);
    }, []);

    // Filter uploads for current category
    const filteredUploads = React.useMemo(() => {
        return uploadedDocs.filter((doc) => doc.category === selectedCategory);
    }, [uploadedDocs, selectedCategory]);

    return (
        <MainNavBars className={styles['library-container']} route={'myfiles'}>
            {
                <div className={styles['library-content']}>
                    {/* Left sidebar: category list */}
                    <div className={styles['category-sidebar']}>
                        <div className={styles['sidebar-title']}>{'Document Categories'}</div>
                        {categories.map((catId) => (
                            <Button
                                key={catId}
                                className={classnames(styles['category-item'], {
                                    [styles['active']]: catId === selectedCategory
                                })}
                                onClick={() => setSelectedCategory(catId)}
                            >
                                <div className={classnames(styles['category-dot'], {
                                    [styles['active']]: catId === selectedCategory
                                })} />
                                <div className={styles['category-label']}>
                                    {categoryLabels[catId]}
                                </div>
                            </Button>
                        ))}
                    </div>

                    {/* Right content area */}
                    <div className={styles['upload-area']}>
                        {/* Document selector + drop zone */}
                        <div className={styles['upload-controls']}>
                            <MultiselectMenu
                                className={styles['doc-select']}
                                title={selectedDocName || 'Select document type...'}
                                options={documentOptions}
                                value={selectedDocName}
                                onSelect={onDocSelect}
                            />
                            <div
                                className={classnames(styles['drop-zone'], {
                                    [styles['drag-over']]: isDragOver,
                                    [styles['disabled']]: !selectedDocName,
                                })}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                            >
                                <Icon className={styles['drop-icon']} name={'cloud-upload'} />
                                <div className={styles['drop-label']}>
                                    {!selectedDocName
                                        ? 'Select a document type first'
                                        : 'Drag & drop file here'}
                                </div>
                                {selectedDocName ? (
                                    <div className={styles['drop-sublabel']}>
                                        {'Uploading: ' + selectedDocName}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Uploaded documents list */}
                        <div className={styles['uploads-list']}>
                            <div className={styles['uploads-title']}>
                                {'Uploaded Documents' + (filteredUploads.length > 0 ? ' (' + filteredUploads.length + ')' : '')}
                            </div>
                            {filteredUploads.length === 0 ? (
                                <div className={styles['uploads-empty']}>
                                    {'No documents uploaded in this category'}
                                </div>
                            ) : (
                                filteredUploads.map((doc) => (
                                    <div key={doc.id} className={styles['upload-row']}>
                                        <div className={styles['upload-info']}>
                                            <div className={styles['upload-doc-name']}>
                                                {doc.documentName}
                                            </div>
                                            <div className={styles['upload-file-name']}>
                                                {doc.fileName}
                                            </div>
                                            <div className={styles['upload-date']}>
                                                {new Date(doc.uploadedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className={styles['upload-status']}>
                                            {doc.status}
                                        </div>
                                        <Button
                                            className={styles['upload-remove']}
                                            onClick={() => removeUpload(doc.id)}
                                        >
                                            <Icon name={'close'} className={styles['remove-icon']} />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            }
        </MainNavBars>
    );
};

const LibraryFallback = () => (
    <MainNavBars className={styles['library-container']} route={'myfiles'} />
);

module.exports = withCoreSuspender(Library, LibraryFallback);
