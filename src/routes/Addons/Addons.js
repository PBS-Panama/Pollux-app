// PBS Crewing Module - STCW Exams & IMO Courses

const React = require('react');
const { useState, useMemo, useCallback, useRef } = React;
const { MainNavBars, MultiselectMenu } = require('stremio/components');
const { EXAMS, STCW_LEVELS, EXAM_DEPARTMENTS } = require('../Calendar/examData');
const styles = require('./styles');

const LEVEL_COLORS = {
    'All Levels': '#6b7280',
    'Ratings': '#2563eb',
    'OOW': '#d97706',
    'Management': '#dc2626',
};

const SCROLL_AMOUNT = 300;

const Addons = () => {
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedDept, setSelectedDept] = useState('All Departments');
    const [expandedId, setExpandedId] = useState(null);
    const [booked, setBooked] = useState(new Set());
    const listRef = useRef(null);

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

    const hasFilter = selectedLevel !== null || selectedDept !== null;

    const filtered = useMemo(() => {
        if (!hasFilter) return [];
        return EXAMS.filter((exam) => {
            // "All Levels" shows ONLY exams tagged as "All Levels", not Ratings/OOW/Management
            if (selectedLevel && exam.level !== selectedLevel) return false;
            if (selectedDept && selectedDept !== 'All Departments' && !exam.departments.includes(selectedDept)) return false;
            return true;
        });
    }, [selectedLevel, selectedDept, hasFilter]);

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
