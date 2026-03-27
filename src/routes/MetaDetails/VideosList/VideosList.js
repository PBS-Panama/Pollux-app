// PBS Crewing Module: Document List by Category
// Shows crew member's documents with issue/expiry dates and status badges

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useProfile } = require('stremio/common');
const { Image, SearchBar, Video } = require('stremio/components');
const CategoryBar = require('./SeasonsBar');
const styles = require('./styles');

const { CREW_ALL_DOCS, CREW_DOC_CATEGORIES, getExpiryStatus } = require('stremio/common/crewDocData');

// Hash function for deterministic per-crew randomization
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); };

// Minimum docs per category so no crew member has an empty tab
const CREW_DOC_MINIMUMS = { 1: 3, 2: 3, 3: 2, 4: 2, 5: 2 };

// Deterministic document selection per crew member, now with expiry data
const getCrewDocs = (crewHash, category) => {
    const pool = CREW_ALL_DOCS[category] || [];
    const minDocs = CREW_DOC_MINIMUMS[category] || 2;

    // Pick docs: each has ~65% chance based on hash
    const picked = [];
    const skipped = [];
    pool.forEach((doc, i) => {
        const h = ((crewHash * 31 + i * 17 + category * 7) >>> 0) % 100;
        if (h < 65) picked.push(doc);
        else skipped.push(doc);
    });

    // Guarantee minimum count
    let idx = 0;
    while (picked.length < minDocs && idx < skipped.length) {
        picked.push(skipped[idx++]);
    }

    // Vary issue dates ±180 days per crew member, compute expiry
    return picked.map((doc, i) => {
        const base = new Date(doc.baseDate).getTime();
        const offsetDays = ((crewHash + i * 13) % 361) - 180;
        const issuedDate = new Date(base + offsetDays * 86400000);
        const issuedStr = issuedDate.toISOString().split('T')[0];
        const expiry = getExpiryStatus(issuedStr, doc.validityYears);

        return {
            title: doc.title,
            issued: issuedStr,
            validityYears: doc.validityYears,
            expiryDate: expiry.expiryDate,
            expiryStatus: expiry.status,
            daysRemaining: expiry.daysRemaining,
        };
    });
};

// Expiry status badge colors
const STATUS_STYLES = {
    valid: { background: 'rgba(46,204,113,0.25)', color: '#2ecc71', label: 'Valid' },
    expiring: { background: 'rgba(241,196,15,0.25)', color: '#f1c40f', label: 'Expiring Soon' },
    expired: { background: 'rgba(231,76,60,0.25)', color: '#e74c3c', label: 'Expired' },
    permanent: { background: 'rgba(149,165,166,0.15)', color: '#95a5a6', label: 'No Expiry' },
};

const DocumentsList = ({ className, metaItem, category, categoryOnSelect }) => {
    const profile = useProfile();

    // PBS Crewing: hash from crew member name for deterministic doc distribution
    const crewHash = React.useMemo(() => {
        const name = metaItem?.content?.content?.name || '';
        return hashStr(name);
    }, [metaItem]);

    // Always show 5 document categories
    const categories = CREW_DOC_CATEGORIES;
    const selectedCategory = React.useMemo(() => {
        if (CREW_DOC_CATEGORIES.includes(category)) return category;
        return 0; // default to All Documents
    }, [category]);

    // Per-crew documents for the selected category (0 = all)
    const documents = React.useMemo(() => {
        if (selectedCategory === 0) {
            // Merge all categories
            return [1, 2, 3, 4, 5].flatMap((cat) => getCrewDocs(crewHash, cat));
        }
        return getCrewDocs(crewHash, selectedCategory);
    }, [selectedCategory, crewHash]);

    const [search, setSearch] = React.useState('');
    const searchInputOnChange = React.useCallback((event) => {
        setSearch(event.currentTarget.value);
    }, []);

    // Summary counts for current category
    const statusCounts = React.useMemo(() => {
        const counts = { valid: 0, expiring: 0, expired: 0, permanent: 0 };
        documents.forEach((doc) => { counts[doc.expiryStatus]++; });
        return counts;
    }, [documents]);

    return (
        <div className={classnames(className, styles['videos-list-container'])}>
            {
                !metaItem || metaItem.content.type === 'Loading' ?
                    <React.Fragment>
                        <CategoryBar.Placeholder className={styles['seasons-bar']} />
                        <SearchBar.Placeholder className={styles['search-bar']} title={'Search documents...'} />
                        <div className={styles['videos-scroll-container']}>
                            <Video.Placeholder />
                            <Video.Placeholder />
                            <Video.Placeholder />
                        </div>
                    </React.Fragment>
                    :
                    metaItem.content.type === 'Err' ?
                        <div className={styles['message-container']}>
                            <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                            <div className={styles['label']}>{'No documents available'}</div>
                        </div>
                        :
                        <React.Fragment>
                            <CategoryBar
                                className={styles['seasons-bar']}
                                category={selectedCategory}
                                categories={categories}
                                onSelect={categoryOnSelect}
                            />
                            {/* Status summary bar */}
                            <div style={{
                                display: 'flex', gap: '0.5rem', padding: '0 1.5rem 0.5rem',
                                fontSize: '0.75rem', flexWrap: 'wrap'
                            }}>
                                {statusCounts.valid > 0 && (
                                    <span style={{ ...STATUS_STYLES.valid, padding: '2px 8px', borderRadius: '4px' }}>
                                        {statusCounts.valid} Valid
                                    </span>
                                )}
                                {statusCounts.expiring > 0 && (
                                    <span style={{ ...STATUS_STYLES.expiring, padding: '2px 8px', borderRadius: '4px' }}>
                                        {statusCounts.expiring} Expiring
                                    </span>
                                )}
                                {statusCounts.expired > 0 && (
                                    <span style={{ ...STATUS_STYLES.expired, padding: '2px 8px', borderRadius: '4px' }}>
                                        {statusCounts.expired} Expired
                                    </span>
                                )}
                                {statusCounts.permanent > 0 && (
                                    <span style={{ ...STATUS_STYLES.permanent, padding: '2px 8px', borderRadius: '4px' }}>
                                        {statusCounts.permanent} Permanent
                                    </span>
                                )}
                            </div>
                            <SearchBar
                                className={styles['search-bar']}
                                title={'Search documents...'}
                                value={search}
                                onChange={searchInputOnChange}
                            />
                            <div className={styles['videos-container']}>
                                {
                                    documents
                                        .filter((doc) => {
                                            return search.length === 0 ||
                                                doc.title.toLowerCase().includes(search.toLowerCase()) ||
                                                (doc.expiryStatus && doc.expiryStatus.toLowerCase().includes(search.toLowerCase()));
                                        })
                                        .map((doc, index) => {
                                            const st = STATUS_STYLES[doc.expiryStatus] || STATUS_STYLES.permanent;
                                            return (
                                                <div key={index} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '0.6rem 0.8rem', margin: '0 0.2rem 0.35rem',
                                                    background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
                                                    borderLeft: `3px solid ${st.color}`,
                                                }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ color: '#e0e0e0', fontSize: '0.9rem', fontWeight: 500 }}>
                                                            {doc.title}
                                                        </div>
                                                        <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px' }}>
                                                            {'Issued: ' + new Date(doc.issued).toLocaleDateString(profile.settings?.interfaceLanguage)}
                                                            {doc.expiryDate && (' — Expires: ' + new Date(doc.expiryDate).toLocaleDateString(profile.settings?.interfaceLanguage))}
                                                            {doc.daysRemaining !== null && doc.daysRemaining >= 0 && ` (${doc.daysRemaining}d)`}
                                                            {doc.daysRemaining !== null && doc.daysRemaining < 0 && ` (${Math.abs(doc.daysRemaining)}d overdue)`}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        ...st, padding: '3px 10px', borderRadius: '4px',
                                                        fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                                                        whiteSpace: 'nowrap', marginLeft: '0.5rem',
                                                    }}>
                                                        {st.label}
                                                    </div>
                                                </div>
                                            );
                                        })
                                }
                            </div>
                        </React.Fragment>
            }
        </div>
    );
};

DocumentsList.propTypes = {
    className: PropTypes.string,
    metaItem: PropTypes.object,
    category: PropTypes.number,
    categoryOnSelect: PropTypes.func,
};

module.exports = DocumentsList;
