// PBS Crewing Module - STCW Exams & IMO Courses

const React = require('react');
const { useState, useMemo, useCallback, useRef, useEffect } = React;
const { MainNavBars, MultiselectMenu } = require('leto/components');
const { EXAMS, STCW_LEVELS, EXAM_DEPARTMENTS, RANK_REQUIRED_EXAMS } = require('../Calendar/examData');
const api = require('leto/common/apiClient');
const styles = require('./styles');

const LEVEL_COLORS = {
    'All Levels': '#6b7280',
    'Ratings': '#2563eb',
    'OOW': '#d97706',
    'Management': '#dc2626',
};

const SCROLL_AMOUNT = 300;

const RANK_LABELS = {
    master: 'Capitán / Master',
    'chief-officer': 'Primer Oficial',
    '2nd-officer': 'Segundo Oficial',
    '3rd-officer': 'Tercer Oficial',
    'chief-engineer': 'Jefe de Máquinas',
    '2nd-engineer': 'Segundo Ingeniero',
    electrician: 'Electricista',
    bosun: 'Contramaestre',
    ab: 'Marinero AB',
    cook: 'Cocinero Jefe',
};

const Addons = () => {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedDept, setSelectedDept] = useState('All Departments');
    const [expandedId, setExpandedId] = useState(null);
    const [booked, setBooked] = useState(new Set());
    const [rankOnly, setRankOnly] = useState(false);
    const [userRank, setUserRank] = useState(null);
    const listRef = useRef(null);

    // Load the user's rank from crewing settings, with localStorage fallback
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const userId = api.getUserId();
                if (userId) {
                    const data = await api.getSettings(userId);
                    if (!cancelled && data?.rank) { setUserRank(data.rank); return; }
                }
            } catch { /* silent */ }
            // Fallback: read from leto-user localStorage (set by MyProfile after PATCH)
            if (!cancelled) {
                try {
                    const lu = JSON.parse(localStorage.getItem('leto-user') || '{}');
                    if (lu.rank) setUserRank(lu.rank);
                } catch { /* silent */ }
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const requiredExamIds = useMemo(() => {
        if (!userRank || !RANK_REQUIRED_EXAMS[userRank]) return null;
        return new Set(RANK_REQUIRED_EXAMS[userRank]);
    }, [userRank]);

    // MultiselectMenu inputs (single-select mode)
    // onSelect receives the raw value directly (string), not an event object
    const levelInput = useMemo(() => ({
        title: () => selectedLevel || 'Select STCW Level',
        options: STCW_LEVELS.map((label) => ({ label, value: label })),
        onSelect: (val) => setSelectedLevel(val),
        value: selectedLevel,
    }), [selectedLevel]);

    const deptInput = useMemo(() => ({
        title: () => selectedDept || 'Select Department',
        options: EXAM_DEPARTMENTS.map((label) => ({ label, value: label })),
        onSelect: (val) => setSelectedDept(val),
        value: selectedDept,
    }), [selectedDept]);

    const hasFilter = selectedLevel !== null || selectedDept !== null || rankOnly;

    const filtered = useMemo(() => {
        if (!hasFilter) return [];
        return EXAMS.filter((exam) => {
            if (rankOnly && requiredExamIds && !requiredExamIds.has(exam.id)) return false;
            if (selectedLevel && exam.level !== selectedLevel) return false;
            if (selectedDept && selectedDept !== 'All Departments' && !exam.departments.includes(selectedDept)) return false;
            return true;
        });
    }, [selectedLevel, selectedDept, hasFilter, rankOnly, requiredExamIds]);

    const toggleExpand = useCallback((id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    const toggleBook = useCallback((e, id) => {
        e.stopPropagation();
        setBooked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const scrollUp = useCallback(() => {
        if (listRef.current) {
            listRef.current.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
        }
    }, []);

    const scrollDown = useCallback(() => {
        if (listRef.current) {
            listRef.current.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' });
        }
    }, []);

    return (
        <MainNavBars className={styles['addons-container']} route={'myexams'}>
            <div className={styles['exams-page']}>
                <div className={styles['exams-header']}>
                    <h1 className={styles['exams-title']}>STCW Exams &amp; IMO Courses</h1>
                    <p className={styles['exams-subtitle']}>
                        {hasFilter
                            ? `${filtered.length} course${filtered.length !== 1 ? 's' : ''} available`
                            : 'Select a STCW Level or Department to browse courses'}
                    </p>
                </div>

                <div className={styles['exams-filters']}>
                    <MultiselectMenu
                        {...levelInput}
                        className={styles['filter-dropdown']}
                    />
                    <MultiselectMenu
                        {...deptInput}
                        className={styles['filter-dropdown']}
                    />
                    {requiredExamIds && (
                        <button
                            onClick={() => setRankOnly((v) => !v)}
                            style={{
                                padding: '0.5rem 0.9rem',
                                borderRadius: '6px',
                                border: rankOnly ? '1px solid rgba(0,210,211,0.5)' : '1px solid rgba(255,255,255,0.12)',
                                background: rankOnly ? 'rgba(0,210,211,0.15)' : 'rgba(255,255,255,0.04)',
                                color: rankOnly ? '#00d2d3' : '#d0d0d0',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {rankOnly ? '✓ ' : ''}My rank ({RANK_LABELS[userRank] || userRank})
                        </button>
                    )}
                </div>

                <div className={styles['exam-list-wrapper']}>
                    {hasFilter && filtered.length > 0 && (
                        <button className={styles['scroll-button-up']} onClick={scrollUp}>
                            &#9650;
                        </button>
                    )}

                    <div className={styles['exam-list']} ref={listRef}>
                        {filtered.map((exam) => {
                            const isExpanded = expandedId === exam.id;
                            const isBooked = booked.has(exam.id);
                            const isRequired = requiredExamIds ? requiredExamIds.has(exam.id) : false;
                            return (
                                <div
                                    key={exam.id}
                                    className={`${styles['exam-card']} ${isExpanded ? styles['expanded'] : ''}`}
                                    onClick={() => toggleExpand(exam.id)}
                                >
                                    <div className={styles['exam-card-main']}>
                                        <div className={styles['exam-badges']}>
                                            <span
                                                className={styles['exam-level-badge']}
                                                style={{ backgroundColor: LEVEL_COLORS[exam.level] || '#6b7280' }}
                                            >
                                                {exam.level}
                                            </span>
                                            <span className={styles['exam-code-badge']}>{exam.code}</span>
                                            <span className={styles['exam-stcw-badge']}>{exam.stcwRef}</span>
                                            {isRequired && (
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0.15rem 0.45rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    background: 'rgba(0,210,211,0.2)',
                                                    color: '#00d2d3',
                                                    border: '1px solid rgba(0,210,211,0.3)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                }}>Required</span>
                                            )}
                                        </div>
                                        <div className={styles['exam-info']}>
                                            <h3 className={styles['exam-name']}>{exam.name}</h3>
                                            <div className={styles['exam-depts']}>
                                                {exam.departments.map((d) => (
                                                    <span key={d} className={styles['exam-dept-tag']}>{d}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={styles['exam-actions']}>
                                            <button
                                                className={`${styles['book-button']} ${isBooked ? styles['booked'] : ''}`}
                                                onClick={(e) => toggleBook(e, exam.id)}
                                            >
                                                {isBooked ? '✓ Booked' : 'Book Exam'}
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className={styles['exam-details']}>
                                            <p className={styles['exam-description']}>{exam.description}</p>
                                            <div className={styles['exam-meta']}>
                                                <span><strong>Duration:</strong> {exam.duration}</span>
                                                <span><strong>Validity:</strong> {exam.validity}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {!hasFilter && (
                            <div className={styles['no-results']}>
                                Use the filters above to find STCW courses and IMO exams.
                            </div>
                        )}
                        {hasFilter && filtered.length === 0 && (
                            <div className={styles['no-results']}>
                                No courses match the selected filters.
                            </div>
                        )}
                    </div>

                    {hasFilter && filtered.length > 0 && (
                        <button className={styles['scroll-button-down']} onClick={scrollDown}>
                            &#9660;
                        </button>
                    )}
                </div>
            </div>
        </MainNavBars>
    );
};

module.exports = Addons;
