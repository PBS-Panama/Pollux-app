// PBS Crewing Module: Seafarer Document Upload page

const React = require('react');
const classnames = require('classnames');
const { useProfile, withCoreSuspender } = require('leto/common');
const { default: Button } = require('leto/components/Button');
const { MainNavBars } = require('leto/components');
const { default: Placeholder } = require('./Placeholder');
const { getExpiryStatus, getComplianceStatus } = require('leto/common/crewDocData');
const api = require('leto/common/apiClient');
const useDocumentUpload = require('./useDocumentUpload');
const styles = require('./styles');

const STATUS_COLORS = {
    valid: { bg: 'rgba(46,204,113,0.2)', color: '#2ecc71', label: 'VALID' },
    expiring: { bg: 'rgba(241,196,15,0.2)', color: '#f1c40f', label: 'EXPIRING' },
    expired: { bg: 'rgba(231,76,60,0.2)', color: '#e74c3c', label: 'EXPIRED' },
    permanent: { bg: 'rgba(149,165,166,0.15)', color: '#95a5a6', label: 'NO EXPIRY' },
};

const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    color: '#e0e0e0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
};

const btnBase = {
    flex: 1,
    padding: '0.6rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    transition: 'background 0.2s, color 0.2s',
};

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
    } = useDocumentUpload();

    const [docFilter, setDocFilter] = React.useState('');
    const [stagedFile, setStagedFile] = React.useState(null);
    const [savedDocName, setSavedDocName] = React.useState(null);
    const [isDragOver, setIsDragOver] = React.useState(false);
    // Inline preview: which uploaded doc from the list is being previewed
    const [listPreviewDocId, setListPreviewDocId] = React.useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
    // Rotate modal state
    const [showRotateModal, setShowRotateModal] = React.useState(false);
    const [rotating, setRotating] = React.useState(false);
    const [previewRotation, setPreviewRotation] = React.useState(0);
    const [previewKey, setPreviewKey] = React.useState(0); // force iframe reload after rotate

    // ── Compliance: rank-based document requirements ──────────────────
    const [userRank, setUserRank] = React.useState(null);
    const [compliance, setCompliance] = React.useState(null); // { missing, expiring, expired, compliant }
    const [bannerVisible, setBannerVisible] = React.useState(false);

    // Fetch rank and compute compliance whenever uploaded docs change
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await api.getSettings(api.DEFAULT_USER_ID);
                if (cancelled) return;
                const rank = data?.rank || null;
                setUserRank(rank);
                if (rank) {
                    const status = getComplianceStatus(rank, uploadedDocs);
                    setCompliance(status);
                    setBannerVisible(true);
                    // Auto-hide green banner after 3s
                    if (status.compliant && status.expiring.length === 0) {
                        setTimeout(() => { if (!cancelled) setBannerVisible(false); }, 3000);
                    }
                }
            } catch (_) { /* API not available */ }
        })();
        return () => { cancelled = true; };
    }, [uploadedDocs]);




    // Map of docName → upload record for current category
    const uploadedDocMap = React.useMemo(() => {
        const map = {};
        uploadedDocs.forEach((doc) => {
            if (doc.category === selectedCategory) {
                map[doc.documentName] = doc;
            }
        });
        return map;
    }, [uploadedDocs, selectedCategory]);

    const uploadedDocNames = React.useMemo(() => new Set(Object.keys(uploadedDocMap)), [uploadedDocMap]);

    // The uploaded record for the currently selected doc (if any)
    const selectedDocRecord = selectedDocName ? uploadedDocMap[selectedDocName] || null : null;
    const hasFileInDb = !!(selectedDocRecord && selectedDocRecord.savedName);

    // Preview URL for the selected doc
    const previewUrl = React.useMemo(() => {
        if (!hasFileInDb) return null;
        return api.getDownloadUrl(api.DEFAULT_USER_ID, selectedDocRecord.savedName);
    }, [hasFileInDb, selectedDocRecord]);

    const filteredDocOptions = React.useMemo(() => {
        if (!docFilter) return documentOptions;
        const lower = docFilter.toLowerCase();
        return documentOptions.filter((opt) => opt.label.toLowerCase().includes(lower));
    }, [documentOptions, docFilter]);

    React.useEffect(() => { setDocFilter(''); setStagedFile(null); setShowRotateModal(false); setPreviewRotation(0); }, [selectedCategory]);
    React.useEffect(() => { setStagedFile(null); setShowRotateModal(false); setPreviewRotation(0); }, [selectedDocName]);

    const onDragOver = React.useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
    const onDragLeave = React.useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
    const onDrop = React.useCallback((e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        if (e.dataTransfer && e.dataTransfer.files.length > 0) setStagedFile(e.dataTransfer.files[0]);
    }, []);

    const fileInputRef = React.useRef(null);
    const onDropZoneClick = React.useCallback(() => {
        if (selectedDocName && fileInputRef.current) fileInputRef.current.click();
    }, [selectedDocName]);
    const onFileInputChange = React.useCallback((e) => {
        if (e.target.files && e.target.files.length > 0) { setStagedFile(e.target.files[0]); e.target.value = ''; }
    }, []);

    const onSave = React.useCallback(async () => {
        if (!selectedDocName) return;

        if (hasFileInDb && !stagedFile) {
            // Update dates only on existing record
            try {
                const validity = noExpiry ? null : undefined; // keep existing if not N/A
                const finalExpiry = noExpiry ? 'N/A' : (expiryDate || undefined);
                const updates = {};
                if (issuedDate) updates.issuedDate = issuedDate;
                if (finalExpiry !== undefined) updates.expiryDate = finalExpiry;
                if (validity !== undefined) updates.validityYears = validity;

                const updated = await api.updateUploadMeta(api.DEFAULT_USER_ID, selectedDocRecord.id, updates);
                // Refresh local state
                const result = await api.getUploads(api.DEFAULT_USER_ID);
                // We can't call setUploadedDocs directly from here — trigger via addUpload's parent
                // Instead, reload the page data
                window.dispatchEvent(new CustomEvent('pbs-uploads-changed'));
            } catch (err) {
                console.error('Update failed:', err);
            }
        } else if (stagedFile) {
            // New upload or replace existing
            if (hasFileInDb) {
                // Remove old file first, then upload new
                await removeUpload(selectedDocRecord.id);
            }
            await addUpload(stagedFile);
        }

        setSavedDocName(selectedDocName);
        setStagedFile(null);
        setPreviewKey((k) => k + 1);
        setTimeout(() => setSavedDocName(null), 3000);
    }, [stagedFile, selectedDocName, addUpload, hasFileInDb, selectedDocRecord, removeUpload, issuedDate, expiryDate, noExpiry]);

    const onRemove = React.useCallback(async () => {
        if (!selectedDocRecord) return;
        await removeUpload(selectedDocRecord.id);
    }, [selectedDocRecord, removeUpload]);

    // Rotate: apply pending rotations to the actual file on server
    const onRotateSave = React.useCallback(async () => {
        if (!selectedDocRecord) {
            setShowRotateModal(false);
            return;
        }
        setRotating(true);
        try {
            if (previewRotation === 0) {
                // User may have rotated via browser PDF viewer — no-op but still reload preview
            } else {
                // Normalize rotation to number of 90-degree CW steps
                const normalized = ((previewRotation % 360) + 360) % 360; // 0, 90, 180, 270
                if (normalized === 90) {
                    await api.rotateDocument(api.DEFAULT_USER_ID, selectedDocRecord.id, 'cw');
                } else if (normalized === 180) {
                    await api.rotateDocument(api.DEFAULT_USER_ID, selectedDocRecord.id, 'cw');
                    await api.rotateDocument(api.DEFAULT_USER_ID, selectedDocRecord.id, 'cw');
                } else if (normalized === 270) {
                    await api.rotateDocument(api.DEFAULT_USER_ID, selectedDocRecord.id, 'ccw');
                }
            }
            setPreviewRotation(0);
            setPreviewKey((k) => k + 1); // force iframe reload
        } catch (err) {
            console.error('Rotate failed:', err);
        }
        setRotating(false);
        setShowRotateModal(false);
    }, [selectedDocRecord, previewRotation]);

    // Save is enabled when: (1) new file staged, OR (2) doc already in DB and dates changed
    const canSave = !!selectedDocName && !uploading && (!!stagedFile || hasFileInDb);

    const filteredUploads = React.useMemo(() => {
        return uploadedDocs.filter((doc) => doc.category === selectedCategory);
    }, [uploadedDocs, selectedCategory]);

    // ── Pre-compute compliance banner values to avoid JSX IIFE issues ──
    const RANK_LABELS = {
        master: 'Capitán / Master', 'chief-officer': 'Primer Oficial',
        '2nd-officer': 'Segundo Oficial', '3rd-officer': 'Tercer Oficial',
        'chief-engineer': 'Jefe de Máquinas', '2nd-engineer': 'Segundo Ingeniero',
        electrician: 'Electricista', bosun: 'Contramaestre', ab: 'Marinero AB', cook: 'Cocinero Jefe',
    };
    const rankLabel = userRank ? RANK_LABELS[userRank] || userRank : '';
    const isGreen = compliance && compliance.compliant && compliance.expiring.length === 0;
    const isYellow = compliance && compliance.compliant && compliance.expiring.length > 0;
    const isRed = compliance && !compliance.compliant;
    const bannerBgColor = isRed ? 'rgba(231,76,60,0.13)' : isYellow ? 'rgba(241,196,15,0.10)' : 'rgba(46,204,113,0.10)';
    const bannerBorderColor = isRed ? 'rgba(231,76,60,0.4)' : isYellow ? 'rgba(241,196,15,0.4)' : 'rgba(46,204,113,0.4)';
    const bannerTextColor = isRed ? '#e74c3c' : isYellow ? '#f1c40f' : '#2ecc71';
    const bannerIcon = isRed ? '🔴' : isYellow ? '🟡' : '✅';

    return (
        <MainNavBars className={styles['library-container']} route={'myfiles'}>
            <div className={styles['library-content']} style={{ flexDirection: 'column' }}>

                {/* ── Compliance Alert Banner (full-width, above the row) ── */}
                {bannerVisible && compliance && userRank && (
                    <div style={{
                        flexShrink: 0,
                        margin: '0.6rem 1rem 0',
                        padding: '0.55rem 1rem',
                        borderRadius: '7px',
                        background: bannerBgColor,
                        border: `1px solid ${bannerBorderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontSize: '0.8rem',
                        color: '#ccc',
                    }}>
                        <span style={{ fontSize: '0.9rem', flex: 'none' }}>{bannerIcon}</span>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, color: bannerTextColor }}>
                                {isGreen
                                    ? `✓ Todos tus documentos están al día (${rankLabel})`
                                    : `Documentos pendientes — ${rankLabel}: `
                                }
                            </span>
                            {isRed && (
                                <span>
                                    {compliance.missing.length > 0 && (
                                        <span style={{ color: '#e74c3c' }}>
                                            {compliance.missing.length} faltante{compliance.missing.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {compliance.expired.length > 0 && (
                                        <span style={{ color: '#e74c3c', marginLeft: '0.4rem' }}>
                                            · {compliance.expired.length} expirado{compliance.expired.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {compliance.expiring.length > 0 && (
                                        <span style={{ color: '#f1c40f', marginLeft: '0.4rem' }}>
                                            · {compliance.expiring.length} por expirar
                                        </span>
                                    )}
                                </span>
                            )}
                            {isYellow && (
                                <span style={{ color: '#f1c40f' }}>
                                    {compliance.expiring.length} documento{compliance.expiring.length !== 1 ? 's' : ''} por expirar pronto
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setBannerVisible(false)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#777', fontSize: '0.85rem', flex: 'none', lineHeight: 1, padding: '0.1rem',
                            }}
                            title="Cerrar"
                        >✕</button>
                    </div>
                )}

                    {/* Inner row: sidebar + content */}
                    <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0 }}>

                    {/* Left sidebar */}
                    <div className={styles['category-sidebar']}>

                        <div className={styles['sidebar-title']}>{'Document Categories'}</div>
                        {categories.map((catId) => (
                            <Button
                                key={catId}
                                className={classnames(styles['category-item'], { [styles['active']]: catId === selectedCategory })}
                                onClick={() => setSelectedCategory(catId)}
                            >
                                <div className={classnames(styles['category-dot'], { [styles['active']]: catId === selectedCategory })} />
                                <div className={styles['category-label']}>{categoryLabels[catId]}</div>
                            </Button>
                        ))}
                    </div>

                    {/* Right content: 2 columns */}
                    <div className={styles['upload-area']} style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', padding: '1rem 1.5rem' }}>

                        {/* LEFT: Document list */}
                        <div style={{ flex: '0 0 20rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>
                                {'Select Document Type'}
                            </div>
                            <input
                                type="text"
                                placeholder="Filter documents..."
                                value={docFilter}
                                onChange={(e) => setDocFilter(e.target.value)}
                                style={{ ...inputStyle, marginBottom: '0.5rem', flex: 'none' }}
                            />
                            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', minHeight: '12rem' }}>
                                {filteredDocOptions.map((opt) => {
                                    const isUploaded = uploadedDocNames.has(opt.value);
                                    const isSelected = opt.value === selectedDocName;
                                    const justSaved = opt.value === savedDocName;
                                    return (
                                        <div
                                            key={opt.value}
                                            onClick={() => setSelectedDocName(opt.value)}
                                            style={{
                                                padding: '0.45rem 0.75rem', fontSize: '0.82rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                color: isSelected ? '#fff' : '#ccc',
                                                background: justSaved ? 'rgba(46,204,113,0.35)' : isSelected ? 'rgba(46,204,113,0.2)' : 'transparent',
                                                borderLeft: isSelected ? '3px solid #2ecc71' : '3px solid transparent',
                                                transition: 'background 0.3s',
                                            }}
                                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                            onMouseLeave={(e) => { if (!isSelected && !justSaved) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <span style={{
                                                display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '50%', flexShrink: 0,
                                                background: isUploaded ? '#2ecc71' : 'rgba(255,255,255,0.1)',
                                                boxShadow: isUploaded ? '0 0 4px rgba(46,204,113,0.5)' : 'none',
                                                transition: 'background 0.3s, box-shadow 0.3s',
                                            }} />
                                            <span style={{ flex: 1, minWidth: 0 }}>{opt.label}</span>
                                        </div>
                                    );
                                })}
                                {filteredDocOptions.length === 0 ? (
                                    <div style={{ padding: '1rem', color: '#888', textAlign: 'center', fontSize: '0.85rem' }}>{'No matching documents'}</div>
                                ) : null}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#777', marginTop: '0.35rem' }}>
                                {filteredDocOptions.length + ' document' + (filteredDocOptions.length !== 1 ? 's' : '')}
                                {' — '}<span style={{ color: '#2ecc71' }}>{uploadedDocNames.size + ' uploaded'}</span>
                            </div>
                        </div>

                        {/* RIGHT: Dates + drop + buttons + preview + list */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '0.6rem', overflowY: 'auto' }}>

                            {/* Date inputs */}
                            {selectedDocName ? (
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 'none' }}>
                                    <div style={{ flex: '1 1 12rem' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                                            {'Issue Date'}
                                        </label>
                                        <input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} style={inputStyle} />
                                    </div>
                                    <div style={{ flex: '1 1 12rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <label style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{'Expiry Date'}</label>
                                            <button type="button" onClick={() => { setNoExpiry(!noExpiry); if (!noExpiry) setExpiryDate(''); }}
                                                style={{
                                                    background: noExpiry ? 'rgba(241,196,15,0.25)' : 'rgba(255,255,255,0.06)',
                                                    border: noExpiry ? '1px solid rgba(241,196,15,0.5)' : '1px solid rgba(255,255,255,0.12)',
                                                    borderRadius: '4px', color: noExpiry ? '#f1c40f' : '#888',
                                                    padding: '2px 8px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase',
                                                }}>
                                                {noExpiry ? 'N/A Active' : 'N/A'}
                                            </button>
                                        </div>
                                        {noExpiry ? (
                                            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f1c40f', opacity: 0.7, fontStyle: 'italic', height: '2.35rem' }}>
                                                {'Does not expire'}
                                            </div>
                                        ) : (
                                            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
                                        )}
                                        {!noExpiry && expiryDate && issuedDate ? (
                                            <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>
                                                {(() => {
                                                    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
                                                    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
                                                    if (days <= 90) return `Expires in ${days} days`;
                                                    return `Valid for ${days} days`;
                                                })()}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            {/* Drop zone */}
                            <div
                                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={onDropZoneClick}
                                style={{
                                    flex: 'none', height: '4.5rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                                    border: stagedFile ? '2px solid #2ecc71' : isDragOver ? '2px solid #2ecc71' : '2px dashed rgba(255,255,255,0.15)',
                                    borderRadius: '8px',
                                    background: stagedFile ? 'rgba(46,204,113,0.08)' : isDragOver ? 'rgba(46,204,113,0.06)' : 'rgba(255,255,255,0.02)',
                                    cursor: selectedDocName ? 'pointer' : 'default',
                                    opacity: selectedDocName ? 1 : 0.35,
                                    pointerEvents: selectedDocName ? 'auto' : 'none',
                                    transition: 'border-color 0.2s, background 0.2s',
                                }}
                            >
                                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={onFileInputChange} />
                                {stagedFile ? (
                                    <React.Fragment>
                                        <div style={{ color: '#2ecc71', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>{'File ready'}</div>
                                        <div style={{ color: '#e0e0e0', fontSize: '0.85rem', fontWeight: 500 }}>{stagedFile.name}</div>
                                        <div style={{ color: '#888', fontSize: '0.7rem' }}>{(stagedFile.size / 1024).toFixed(1) + ' KB'}</div>
                                    </React.Fragment>
                                ) : (
                                    <React.Fragment>
                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', fontWeight: 500 }}>{'Drop your PDF file here'}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem' }}>{'or click to browse'}</div>
                                    </React.Fragment>
                                )}
                            </div>

                            {/* Buttons row: SAVE + REMOVE */}
                            <div style={{ display: 'flex', gap: '0.75rem', flex: 'none' }}>
                                <button type="button" onClick={onSave} disabled={!canSave}
                                    style={{ ...btnBase, background: canSave ? '#2ecc71' : 'rgba(255,255,255,0.06)', color: canSave ? '#000' : '#555', cursor: canSave ? 'pointer' : 'not-allowed' }}>
                                    {uploading ? 'Saving...' : 'Save to Database'}
                                </button>
                                {hasFileInDb ? (
                                    <button type="button" onClick={onRemove}
                                        style={{ ...btnBase, background: 'rgba(231,76,60,0.2)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.4)', cursor: 'pointer' }}>
                                        {'Remove'}
                                    </button>
                                ) : null}
                            </div>

                            {/* Success flash */}
                            {savedDocName ? (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 'none',
                                    padding: '0.4rem 0.75rem', background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)',
                                    borderRadius: '6px', color: '#2ecc71', fontSize: '0.8rem', fontWeight: 500,
                                }}>
                                    <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 6px rgba(46,204,113,0.6)' }} />
                                    {'Saved: ' + savedDocName}
                                </div>
                            ) : null}

                            {/* Preview panel — shows when selected doc has a file in DB AND no list preview is active */}
                            {previewUrl && !listPreviewDocId ? (
                                <div style={{ flex: 1, minHeight: '10rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                            {'Preview — ' + selectedDocRecord.fileName}
                                        </div>
                                        <button type="button" onClick={() => { setPreviewRotation(0); setShowRotateModal(true); }}
                                            style={{
                                                ...btnBase, flex: 'none', padding: '0.3rem 0.8rem', fontSize: '0.7rem',
                                                background: 'rgba(52,152,219,0.2)', color: '#3498db', border: '1px solid rgba(52,152,219,0.4)',
                                            }}>
                                            {'Edit'}
                                        </button>
                                    </div>
                                    <iframe
                                        key={previewKey}
                                        src={previewUrl}
                                        style={{
                                            flex: 1, width: '100%', minHeight: '8rem',
                                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                                            background: '#1a1a2e',
                                        }}
                                        title="Document Preview"
                                    />
                                </div>
                            ) : null}

                            {/* Rotate Modal */}
                            {showRotateModal && previewUrl ? (
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                    onClick={() => { if (!rotating) setShowRotateModal(false); }}
                                >
                                    <div style={{
                                        background: '#1e1e30', borderRadius: '12px', padding: '1.5rem',
                                        width: '90%', maxWidth: '750px', height: '85vh',
                                        display: 'flex', flexDirection: 'column', gap: '1rem',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Modal header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ color: '#e0e0e0', fontSize: '1rem', fontWeight: 600 }}>
                                                {'Rotate Document'}
                                            </div>
                                            <button type="button" onClick={() => setShowRotateModal(false)}
                                                style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer' }}>
                                                {'×'}
                                            </button>
                                        </div>
                                        <div style={{ color: '#999', fontSize: '0.8rem' }}>
                                            {selectedDocRecord.fileName}
                                        </div>

                                        {/* Preview with rotation applied — toolbar hidden to avoid confusion */}
                                        <div style={{
                                            flex: 1, overflow: 'hidden',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: '#12121f', borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                        }}>
                                            <iframe
                                                key={previewKey}
                                                src={previewUrl + '#toolbar=0'}
                                                style={{
                                                    width: '100%', height: '100%',
                                                    border: 'none',
                                                    transform: `rotate(${previewRotation}deg)`,
                                                    transition: 'transform 0.3s ease',
                                                }}
                                                title="Rotate Preview"
                                            />
                                        </div>

                                        {/* Rotate controls */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flex: 'none' }}>
                                            <button type="button"
                                                onClick={() => setPreviewRotation((r) => r - 90)}
                                                disabled={rotating}
                                                style={{
                                                    ...btnBase, flex: 'none', padding: '0.5rem 1.2rem',
                                                    background: 'rgba(255,255,255,0.06)', color: '#ccc', border: '1px solid rgba(255,255,255,0.12)',
                                                    fontSize: '0.85rem',
                                                }}>
                                                {'Rotate Left'}
                                            </button>
                                            <div style={{ color: '#888', fontSize: '0.8rem', minWidth: '3rem', textAlign: 'center' }}>
                                                {previewRotation !== 0 ? (previewRotation > 0 ? '+' : '') + previewRotation + '\u00B0' : '0\u00B0'}
                                            </div>
                                            <button type="button"
                                                onClick={() => setPreviewRotation((r) => r + 90)}
                                                disabled={rotating}
                                                style={{
                                                    ...btnBase, flex: 'none', padding: '0.5rem 1.2rem',
                                                    background: 'rgba(255,255,255,0.06)', color: '#ccc', border: '1px solid rgba(255,255,255,0.12)',
                                                    fontSize: '0.85rem',
                                                }}>
                                                {'Rotate Right'}
                                            </button>
                                        </div>

                                        {/* Save / Cancel */}
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flex: 'none' }}>
                                            <button type="button" onClick={() => setShowRotateModal(false)} disabled={rotating}
                                                style={{ ...btnBase, flex: 'none', padding: '0.5rem 1.5rem', background: 'rgba(255,255,255,0.06)', color: '#999', border: '1px solid rgba(255,255,255,0.12)' }}>
                                                {'Cancel'}
                                            </button>
                                            <button type="button" onClick={onRotateSave} disabled={rotating}
                                                style={{
                                                    ...btnBase, flex: 'none', padding: '0.5rem 1.5rem',
                                                    background: !rotating ? '#2ecc71' : 'rgba(255,255,255,0.06)',
                                                    color: !rotating ? '#000' : '#555',
                                                    cursor: !rotating ? 'pointer' : 'not-allowed',
                                                }}>
                                                {rotating ? 'Applying...' : 'Save Rotation'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Uploaded documents list — ALWAYS visible */}
                            <div style={{ flex: listPreviewDocId ? 'none' : 1, overflowY: 'auto', minHeight: 0, maxHeight: listPreviewDocId ? '12rem' : 'none' }}>
                                <div style={{ fontSize: '0.7rem', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    {'Uploaded Documents' + (filteredUploads.length > 0 ? ' (' + filteredUploads.length + ')' : '')}
                                </div>
                                {filteredUploads.length === 0 ? (
                                    <div style={{ fontSize: '0.9rem', color: '#999', padding: '0.5rem 0' }}>
                                        {'No documents uploaded in this category'}
                                    </div>
                                ) : (
                                    filteredUploads.map((doc) => {
                                        let expStatus;
                                        if (doc.expiryDate === 'N/A' || (doc.expiryDate === null && doc.validityYears === null)) {
                                            expStatus = 'permanent';
                                        } else if (doc.expiryDate && doc.expiryDate !== 'N/A') {
                                            const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000);
                                            expStatus = days < 0 ? 'expired' : days <= 90 ? 'expiring' : 'valid';
                                        } else if (doc.issuedDate && doc.validityYears) {
                                            expStatus = getExpiryStatus(doc.issuedDate, doc.validityYears).status;
                                        } else {
                                            expStatus = 'permanent';
                                        }
                                        const badge = STATUS_COLORS[expStatus] || STATUS_COLORS.permanent;
                                        const isListPreview = listPreviewDocId === doc.id;
                                        const isConfirmingDelete = confirmDeleteId === doc.id;
                                        return (
                                            <div key={doc.id} style={{
                                                display: 'flex', alignItems: 'center', padding: '0.5rem 0.6rem',
                                                marginBottom: '0.35rem', borderRadius: '4px',
                                                background: isListPreview ? 'rgba(52,152,219,0.15)' : 'rgba(255,255,255,0.03)',
                                                borderLeft: isListPreview ? '3px solid #3498db' : `3px solid ${badge.color}`,
                                                cursor: doc.savedName ? 'pointer' : 'default',
                                                transition: 'background 0.2s, border-color 0.2s',
                                            }}
                                                onClick={() => { if (doc.savedName) setListPreviewDocId(isListPreview ? null : doc.id); }}
                                                onMouseEnter={(e) => { if (!isListPreview && doc.savedName) e.currentTarget.style.background = 'rgba(52,152,219,0.08)'; }}
                                                onMouseLeave={(e) => { if (!isListPreview) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ color: '#e0e0e0', fontSize: '0.85rem', fontWeight: 500 }}>{doc.documentName}</div>
                                                    <div style={{ color: '#999', fontSize: '0.7rem' }}>
                                                        {doc.fileName}{doc.fileSize ? ` (${(doc.fileSize / 1024).toFixed(1)} KB)` : ''}
                                                    </div>
                                                    <div style={{ color: '#777', fontSize: '0.65rem' }}>
                                                        {doc.issuedDate ? 'Issued: ' + new Date(doc.issuedDate).toLocaleDateString() : 'Uploaded: ' + new Date(doc.uploadedAt).toLocaleDateString()}
                                                        {doc.expiryDate === 'N/A' ? ' — Does not expire' : doc.expiryDate ? ' — Expires: ' + new Date(doc.expiryDate).toLocaleDateString() : ''}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                                    <div style={{
                                                        padding: '2px 6px', borderRadius: '3px', fontSize: '0.6rem', fontWeight: 600,
                                                        textTransform: 'uppercase', background: badge.bg, color: badge.color, whiteSpace: 'nowrap',
                                                    }}>
                                                        {badge.label}
                                                    </div>
                                                    {/* Delete button */}
                                                    {isConfirmingDelete ? (
                                                        <div style={{ display: 'flex', gap: '0.3rem' }} onClick={(e) => e.stopPropagation()}>
                                                            <button type="button"
                                                                onClick={async (e) => { e.stopPropagation(); await removeUpload(doc.id); setConfirmDeleteId(null); setListPreviewDocId((prev) => prev === doc.id ? null : prev); }}
                                                                style={{ ...btnBase, flex: 'none', padding: '2px 8px', fontSize: '0.6rem', background: 'rgba(231,76,60,0.3)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.5)' }}>
                                                                {'Yes'}
                                                            </button>
                                                            <button type="button"
                                                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                                                style={{ ...btnBase, flex: 'none', padding: '2px 8px', fontSize: '0.6rem', background: 'rgba(255,255,255,0.06)', color: '#999', border: '1px solid rgba(255,255,255,0.12)' }}>
                                                                {'No'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button type="button"
                                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(doc.id); }}
                                                            title="Delete document"
                                                            style={{
                                                                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                                                                color: '#888', fontSize: '0.9rem', transition: 'color 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#e74c3c'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; }}>
                                                            {'🗑️'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Inline preview — shows when user clicks an uploaded doc */}
                            {(() => {
                                const listDoc = listPreviewDocId ? filteredUploads.find((d) => d.id === listPreviewDocId) : null;
                                const listUrl = listDoc && listDoc.savedName ? api.getDownloadUrl(api.DEFAULT_USER_ID, listDoc.savedName) : null;
                                if (!listUrl) return null;
                                return (
                                    <div style={{ flex: 1, minHeight: '14rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                                {'Preview — ' + listDoc.fileName}
                                            </div>
                                            <button type="button" onClick={() => setListPreviewDocId(null)}
                                                style={{
                                                    background: 'none', border: 'none', color: '#888', fontSize: '1rem', cursor: 'pointer',
                                                    padding: '0 4px', lineHeight: 1,
                                                }}>
                                                {'✕'}
                                            </button>
                                        </div>
                                        <iframe
                                            src={listUrl}
                                            style={{
                                                flex: 1, width: '100%', minHeight: '12rem',
                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                                                background: '#1a1a2e',
                                            }}
                                            title={'Preview: ' + listDoc.documentName}
                                        />
                                    </div>
                                );
                            })()}
                        </div> {/* end RIGHT */}
                    </div>  {/* end upload-area */}
                </div>  {/* end inner row */}
            </div>  {/* end library-content */}

        </MainNavBars>
    );
};

const LibraryFallback = () => (
    <MainNavBars className={styles['library-container']} route={'myfiles'} />
);

module.exports = withCoreSuspender(Library, LibraryFallback);
