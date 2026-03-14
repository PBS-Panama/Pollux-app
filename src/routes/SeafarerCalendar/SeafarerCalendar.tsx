// PBS Crewing Module - Seafarer Calendar (employee-side)

const React = require('react');
const { useState, useMemo, useCallback, useEffect } = React;
const { MainNavBars } = require('stremio/components');
const { MONTHS, WEEKDAYS_SHORT } = require('../Calendar/calendarData');
const { AVAILABILITY_TYPES, SEAFARER_CATEGORIES, getCertExpiryForMonth, getCertificateAlerts, DEFAULT_AVAILABILITY } = require('./seafarerData');
const { getAvailability, addAvailability, removeAvailability, getAvailabilityForMonth, confirmInterview, isInterviewConfirmed, getBookedExams } = require('stremio/common/seafarerStore');
const { getCustomEvents } = require('stremio/common/crewStore');
const styles = require('./SeafarerCalendar.less');

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
};
const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;

// ─── Availability Period Modal ───────────────────────────────────────
const AvailabilityModal = ({ currentMonth, currentYear, daysInMonth, onSave, onClose }) => {
    const [type, setType] = useState('available');
    const [startDay, setStartDay] = useState(1);
    const [endDay, setEndDay] = useState(daysInMonth);
    const [label, setLabel] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const s = parseInt(startDay);
        const en = parseInt(endDay);
        if (s > en) return;
        onSave({ type, startDay: s, endDay: en, label: label.trim() || null });
    };

    const typeInfo = AVAILABILITY_TYPES.find((t) => t.id === type);

    return (
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles['modal-title']}>Set Availability Period</h3>
                <form onSubmit={handleSubmit} className={styles['modal-form']}>
                    <label className={styles['form-label']}>
                        Status
                        <div className={styles['type-selector']}>
                            {AVAILABILITY_TYPES.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    className={`${styles['type-btn']} ${type === t.id ? styles['type-active'] : ''}`}
                                    style={type === t.id ? { backgroundColor: t.color, borderColor: t.color } : {}}
                                    onClick={() => setType(t.id)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </label>
                    <div className={styles['form-row']}>
                        <label className={styles['form-label']}>
                            From Day
                            <input className={styles['form-input']} type="number" min="1" max={daysInMonth} value={startDay} onChange={(e) => setStartDay(e.target.value)} required />
                        </label>
                        <label className={styles['form-label']}>
                            To Day
                            <input className={styles['form-input']} type="number" min="1" max={daysInMonth} value={endDay} onChange={(e) => setEndDay(e.target.value)} required />
                        </label>
                    </div>
                    <div className={styles['period-preview']} style={{ borderColor: typeInfo.color, color: typeInfo.color }}>
                        {typeInfo.label}: {MONTHS[currentMonth]} {startDay} – {endDay}, {currentYear}
                    </div>
                    <label className={styles['form-label']}>
                        Label (optional)
                        <input className={styles['form-input']} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. MV Atlantic voyage, Shore leave..." />
                    </label>
                    <div className={styles['modal-actions']}>
                        <span className={styles['modal-spacer']} />
                        <button type="button" className={styles['btn-cancel']} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles['btn-save']}>Set Period</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Seafarer Calendar ──────────────────────────────────────────
const SeafarerCalendar = () => {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());
    const [selectedDay, setSelectedDay] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Load availability (seed defaults on first run)
    const [availability, setAvailability] = useState(() => {
        let stored = getAvailability();
        if (stored.length === 0) {
            // Seed with demo data
            DEFAULT_AVAILABILITY.forEach((p) => addAvailability(p));
            stored = getAvailability();
        }
        return stored;
    });

    // Interviews booked by companies (from custom events store)
    const [companyEvents, setCompanyEvents] = useState(getCustomEvents());
    const [confirmedIds, setConfirmedIds] = useState([]);

    // Booked exams
    const [bookedExams, setBookedExams] = useState(getBookedExams());

    // Refresh on focus
    useEffect(() => {
        const onFocus = () => {
            setCompanyEvents(getCustomEvents());
            setBookedExams(getBookedExams());
            setAvailability(getAvailability());
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    const key = monthKey(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;
    const today = now.getDate();

    const prevMonth = useCallback(() => { setMonth((m) => { if (m === 0) { setYear((y) => y - 1); return 11; } return m - 1; }); setSelectedDay(null); }, []);
    const nextMonth = useCallback(() => { setMonth((m) => { if (m === 11) { setYear((y) => y + 1); return 0; } return m + 1; }); setSelectedDay(null); }, []);
    const onDayClick = useCallback((day) => setSelectedDay((prev) => prev === day ? null : day), []);

    // Availability for current month
    const monthAvailability = useMemo(() => {
        return availability.filter((p) => p.monthKey === key);
    }, [availability, key]);

    // Get day's availability type
    const getDayType = useCallback((day) => {
        for (const p of monthAvailability) {
            if (day >= p.startDay && day <= p.endDay) return p.type;
        }
        return null;
    }, [monthAvailability]);

    // Certificate events for this month
    const certEvents = useMemo(() => getCertExpiryForMonth(key), [key]);

    // Certificate alerts (next 60 days from today)
    const certAlerts = useMemo(() => getCertificateAlerts(now, 60), []);

    // Interviews scheduled for this seafarer (any recruiting event from company)
    const interviewEvents = useMemo(() => {
        return companyEvents
            .filter((e) => e.category === 'recruiting' && e.monthKey === key && e.crewInfo)
            .map((e) => ({ ...e, confirmed: isInterviewConfirmed(e.id) }));
    }, [companyEvents, key]);

    // Exam bookings for this month
    const monthExams = useMemo(() => {
        return bookedExams.filter((e) => e.monthKey === key);
    }, [bookedExams, key]);

    // All events combined for the main panel
    const allDayEvents = useMemo(() => {
        const events = [];
        // Availability periods as cards
        monthAvailability.forEach((p) => {
            events.push({ day: p.startDay, endDay: p.endDay, title: p.label || AVAILABILITY_TYPES.find((t) => t.id === p.type).label, category: p.type, source: 'availability', periodId: p.id });
        });
        // Cert events
        certEvents.forEach((e) => events.push({ ...e, source: 'cert' }));
        // Interviews
        interviewEvents.forEach((e) => events.push({ ...e, source: 'interview', category: 'interview' }));
        // Exams
        monthExams.forEach((e) => events.push({ day: e.day, title: e.examName, category: 'exam', code: e.examCode, source: 'exam', examId: e.id }));
        return events.sort((a, b) => a.day - b.day);
    }, [monthAvailability, certEvents, interviewEvents, monthExams]);

    // Filtered by selected day
    const filteredEvents = useMemo(() => {
        if (selectedDay === null) return allDayEvents;
        return allDayEvents.filter((e) => {
            if (e.endDay) return selectedDay >= e.day && selectedDay <= e.endDay;
            return e.day === selectedDay;
        });
    }, [allDayEvents, selectedDay]);

    // Color helper
    const getCatColor = (catId) => (SEAFARER_CATEGORIES.find((c) => c.id === catId) || {}).color || '#6b7280';

    // Handlers
    const openModal = useCallback(() => setModalOpen(true), []);
    const closeModal = useCallback(() => setModalOpen(false), []);

    const onSaveAvailability = useCallback((data) => {
        addAvailability({ ...data, monthKey: key });
        setAvailability(getAvailability());
        closeModal();
    }, [key]);

    const onRemoveAvailability = useCallback((id) => {
        removeAvailability(id);
        setAvailability(getAvailability());
    }, []);

    const onConfirmInterview = useCallback((eventId) => {
        confirmInterview(eventId);
        setConfirmedIds((prev) => [...prev, eventId]);
        // Dispatch event so company calendar can pick it up
        window.dispatchEvent(new CustomEvent('pbs-interview-confirmed', { detail: { eventId } }));
    }, []);

    return (
        <MainNavBars className={styles['seafarer-cal']} route={'calendar'}>
            <div className={styles['seafarer-page']}>
                {/* ── Sidebar ── */}
                <div className={styles['sidebar']}>
                    {/* Calendar grid */}
                    <div className={styles['cal-card']}>
                        <div className={styles['cal-header']}>
                            <button className={styles['cal-nav']} onClick={prevMonth}>&#9664;</button>
                            <div className={styles['cal-title']}>
                                <span className={styles['cal-month']}>{MONTHS[month]}</span>
                                <span className={styles['cal-year']}>{year}</span>
                            </div>
                            <button className={styles['cal-nav']} onClick={nextMonth}>&#9654;</button>
                        </div>
                        <div className={styles['cal-weekdays']}>
                            {WEEKDAYS_SHORT.map((d) => <span key={d} className={styles['cal-wd']}>{d}</span>)}
                        </div>
                        <div className={styles['cal-grid']}>
                            {blanks.map((_, i) => <span key={`b${i}`} className={styles['cal-blank']} />)}
                            {days.map((day) => {
                                const dayType = getDayType(day);
                                const typeColor = dayType ? getCatColor(dayType) : null;
                                let cls = styles['cal-day'];
                                if (dayType) cls += ' ' + styles['has-period'];
                                if (selectedDay === day) cls += ' ' + styles['selected'];
                                if (isCurrentMonth && day === today) cls += ' ' + styles['today'];
                                // Check if this day has cert/interview/exam
                                const hasCert = certEvents.some((e) => e.day === day);
                                const hasInterview = interviewEvents.some((e) => e.day === day);
                                const hasExam = monthExams.some((e) => e.day === day);
                                return (
                                    <button key={day} className={cls} onClick={() => onDayClick(day)} style={dayType ? { backgroundColor: `${typeColor}18` } : {}}>
                                        <span className={styles['day-num']} style={dayType ? { color: typeColor } : {}}>{day}</span>
                                        {(hasCert || hasInterview || hasExam) && (
                                            <div className={styles['day-dots']}>
                                                {hasCert && <span className={styles['day-dot']} style={{ backgroundColor: '#dc2626' }} />}
                                                {hasInterview && <span className={styles['day-dot']} style={{ backgroundColor: '#8b5cf6' }} />}
                                                {hasExam && <span className={styles['day-dot']} style={{ backgroundColor: '#06b6d4' }} />}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Availability legend + Add */}
                    <div className={styles['legend-card']}>
                        <div className={styles['legend-header']}>
                            <span className={styles['legend-title']}>My Availability</span>
                            <button className={styles['btn-set-period']} onClick={openModal}>+ Set Period</button>
                        </div>
                        {monthAvailability.length === 0 && (
                            <div className={styles['legend-empty']}>No periods set for this month.</div>
                        )}
                        {monthAvailability.map((p) => {
                            const typeInfo = AVAILABILITY_TYPES.find((t) => t.id === p.type);
                            return (
                                <div key={p.id} className={styles['period-row']}>
                                    <span className={styles['period-dot']} style={{ backgroundColor: typeInfo.color }} />
                                    <div className={styles['period-info']}>
                                        <span className={styles['period-label']}>{typeInfo.label}</span>
                                        <span className={styles['period-dates']}>Day {p.startDay} – {p.endDay}{p.label ? ` · ${p.label}` : ''}</span>
                                    </div>
                                    <button className={styles['period-remove']} onClick={() => onRemoveAvailability(p.id)} title="Remove">&#10005;</button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Certificate Alerts */}
                    {certAlerts.length > 0 && (
                        <div className={styles['cert-alert-card']}>
                            <span className={styles['cert-alert-title']}>Certificate Alerts</span>
                            {certAlerts.map((cert) => (
                                <div key={cert.id} className={styles['cert-alert-row']}>
                                    <span className={styles['cert-alert-dot']} style={{ backgroundColor: cert.daysUntilExpiry <= 30 ? '#dc2626' : '#f97316' }} />
                                    <div className={styles['cert-alert-info']}>
                                        <span className={styles['cert-alert-name']}>{cert.name}</span>
                                        <span className={styles['cert-alert-days']}>
                                            {cert.daysUntilExpiry === 0 ? 'Expires today!' : `${cert.daysUntilExpiry} days left`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Main panel ── */}
                <div className={styles['main-panel']}>
                    <div className={styles['panel-header']}>
                        <h2 className={styles['panel-title']}>
                            {selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : `${MONTHS[month]} ${year} — My Schedule`}
                        </h2>
                        <span className={styles['panel-count']}>{filteredEvents.length} item{filteredEvents.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className={styles['event-list']}>
                        {filteredEvents.length === 0 && (
                            <div className={styles['event-empty']}>No events for this {selectedDay ? 'day' : 'month'}.</div>
                        )}
                        {filteredEvents.map((ev, i) => (
                            <div key={ev.id || ev.periodId || ev.examId || i} className={styles['event-card']}>
                                <div className={styles['event-card-header']}>
                                    <span className={styles['event-dot']} style={{ backgroundColor: getCatColor(ev.category) }} />
                                    <span className={styles['event-day-label']}>
                                        {ev.endDay ? `Day ${ev.day}–${ev.endDay}` : `Day ${ev.day}`}
                                    </span>
                                    <span className={styles['event-cat']} style={{ color: getCatColor(ev.category) }}>
                                        {(SEAFARER_CATEGORIES.find((c) => c.id === ev.category) || {}).label || ev.category}
                                    </span>
                                    {ev.source === 'availability' && (
                                        <button className={styles['event-remove-btn']} onClick={() => onRemoveAvailability(ev.periodId)} title="Remove period">&#10005;</button>
                                    )}
                                </div>
                                <h4 className={styles['event-title']}>{ev.title}</h4>

                                {/* Interview card with confirm button */}
                                {ev.source === 'interview' && (
                                    <div className={styles['interview-action']}>
                                        {ev.crewInfo && <p className={styles['event-details']}>{ev.crewInfo}</p>}
                                        {ev.interviewTime && <p className={styles['event-details']}>Time: {ev.interviewTime} · {ev.interviewLocation}</p>}
                                        {ev.details && <p className={styles['event-details']}>{ev.details}</p>}
                                        {ev.confirmed || confirmedIds.includes(ev.id) ? (
                                            <div className={styles['confirmed-badge']}>&#10003; Attendance Confirmed</div>
                                        ) : (
                                            <button className={styles['btn-confirm']} onClick={() => onConfirmInterview(ev.id)}>
                                                Confirm Attendance
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Cert event details */}
                                {(ev.source === 'cert') && ev.code && (
                                    <p className={styles['event-details']}>{ev.code}</p>
                                )}

                                {/* Exam details */}
                                {ev.source === 'exam' && ev.code && (
                                    <p className={styles['event-details']}>Code: {ev.code}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {modalOpen && (
                <AvailabilityModal
                    currentMonth={month}
                    currentYear={year}
                    daysInMonth={daysInMonth}
                    onSave={onSaveAvailability}
                    onClose={closeModal}
                />
            )}
        </MainNavBars>
    );
};

module.exports = SeafarerCalendar;
