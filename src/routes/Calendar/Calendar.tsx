// PBS Crewing Module - Company Calendar with CRUD + Pending Interviews

const React = require('react');
const { useState, useMemo, useCallback, useEffect } = React;
const { MainNavBars } = require('leto/components');
const { MONTHS, WEEKDAYS_SHORT, EVENT_CATEGORIES, COMPANY_EVENTS } = require('./calendarData');
const { getPendingInterviews, removePendingInterview, getCustomEvents, addCustomEvent, updateCustomEvent, deleteCustomEvent } = require('leto/common/crewStore');
const { isInterviewConfirmed } = require('leto/common/seafarerStore');
const styles = require('./Calendar.less');

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
};
const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;

// ─── Event Form Modal (generic) ──────────────────────────────────────
const EventModal = ({ event, onSave, onClose, onDelete }) => {
    const [title, setTitle] = useState(event ? event.title : '');
    const [day, setDay] = useState(event ? event.day : 1);
    const [category, setCategory] = useState(event ? event.category : 'crew-change');
    const [vessel, setVessel] = useState(event ? (event.vessel || '') : '');
    const [details, setDetails] = useState(event ? event.details : '');
    const [monthYear, setMonthYear] = useState(event ? event.monthKey : '');
    // Preserve interview-specific fields when editing
    const isInterview = event && event.crewInfo;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const data = { title: title.trim(), day: parseInt(day), category, vessel: vessel.trim() || null, details: details.trim(), monthKey: monthYear };
        // Carry forward interview metadata
        if (isInterview) {
            data.crewInfo = event.crewInfo;
            data.interviewTime = event.interviewTime;
            data.interviewLocation = event.interviewLocation;
        }
        onSave(data);
    };

    return (
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles['modal-title']}>{event ? 'Edit Event' : 'Add Event'}</h3>
                <form onSubmit={handleSubmit} className={styles['modal-form']}>
                    <label className={styles['form-label']}>
                        Title
                        <input className={styles['form-input']} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
                    </label>
                    <div className={styles['form-row']}>
                        <label className={styles['form-label']}>
                            Day
                            <input className={styles['form-input']} type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} required />
                        </label>
                        <label className={styles['form-label']}>
                            Category
                            <select className={styles['form-input']} value={category} onChange={(e) => setCategory(e.target.value)}>
                                {EVENT_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className={styles['form-label']}>
                        Vessel (optional)
                        <input className={styles['form-input']} value={vessel} onChange={(e) => setVessel(e.target.value)} placeholder="e.g. MS Robin" />
                    </label>
                    {isInterview && (
                        <div className={styles['interview-crew-summary']}>
                            <span className={styles['interview-crew-name']}>{event.crewInfo}</span>
                            {event.interviewTime && <span className={styles['interview-crew-detail']}>Time: {event.interviewTime}</span>}
                            {event.interviewLocation && <span className={styles['interview-crew-detail']}>Location: {event.interviewLocation}</span>}
                        </div>
                    )}
                    <label className={styles['form-label']}>
                        {isInterview ? 'Notes / Comments' : 'Details'}
                        <textarea className={styles['form-textarea']} value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder={isInterview ? 'Your notes about this interview...' : ''} />
                    </label>
                    <div className={styles['modal-actions']}>
                        {event && onDelete && (
                            <button type="button" className={styles['btn-delete']} onClick={() => onDelete(event.id)}>Delete</button>
                        )}
                        <span className={styles['modal-spacer']} />
                        <button type="button" className={styles['btn-cancel']} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles['btn-save']}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Interview Booking Modal (pre-filled from pending crew) ──────────
const InterviewModal = ({ crew, currentMonth, currentYear, onBook, onClose }) => {
    const [day, setDay] = useState(new Date().getDate());
    const [time, setTime] = useState('09:00');
    const [location, setLocation] = useState('Video Call (Teams)');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onBook({
            crew,
            day: parseInt(day),
            time,
            location: location.trim(),
            notes: notes.trim(),
        });
    };

    return (
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles['modal-title']}>Book Interview</h3>
                <div className={styles['interview-crew-summary']}>
                    <span className={styles['interview-crew-name']}>{crew.name}</span>
                    <span className={styles['interview-crew-detail']}>{crew.rank} · {crew.department}</span>
                    <span className={styles['interview-crew-detail']}>{crew.nationality}</span>
                </div>
                <form onSubmit={handleSubmit} className={styles['modal-form']}>
                    <div className={styles['form-row']}>
                        <label className={styles['form-label']}>
                            Day
                            <input className={styles['form-input']} type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} required autoFocus />
                        </label>
                        <label className={styles['form-label']}>
                            Time
                            <input className={styles['form-input']} type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                        </label>
                    </div>
                    <label className={styles['form-label']}>
                        Location / Platform
                        <select className={styles['form-input']} value={location} onChange={(e) => setLocation(e.target.value)}>
                            <option value="Video Call (Teams)">Video Call (Teams)</option>
                            <option value="Video Call (Zoom)">Video Call (Zoom)</option>
                            <option value="Phone Call">Phone Call</option>
                            <option value="In-Person — Office">In-Person — Office</option>
                            <option value="In-Person — Port">In-Person — Port</option>
                        </select>
                    </label>
                    <label className={styles['form-label']}>
                        Notes (optional)
                        <textarea className={styles['form-textarea']} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Bring certificates, ask about engine room experience..." />
                    </label>
                    <div className={styles['interview-date-preview']}>
                        {MONTHS[currentMonth]} {day}, {currentYear} at {time}
                    </div>
                    <div className={styles['modal-actions']}>
                        <span className={styles['modal-spacer']} />
                        <button type="button" className={styles['btn-cancel']} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles['btn-book']}>Book Interview</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Calendar Component ─────────────────────────────────────────
const Calendar = () => {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());
    const [selectedDay, setSelectedDay] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [customEvents, setCustomEvents] = useState(getCustomEvents());
    const [pendingList, setPendingList] = useState(getPendingInterviews());
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [bookingCrew, setBookingCrew] = useState(null);
    const [selectedPending, setSelectedPending] = useState(null);

    // Track which interviews have been confirmed by seafarers
    const [confirmedIds, setConfirmedIds] = useState(() => {
        // Build initial set from all custom events that are interviews
        const set = {};
        getCustomEvents().forEach((ev) => {
            if (ev.crewInfo && ev.id) set[ev.id] = isInterviewConfirmed(ev.id);
        });
        return set;
    });

    // Refresh pending list when tab gains focus (in case added from Discover)
    useEffect(() => {
        const onFocus = () => setPendingList(getPendingInterviews());
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    // Listen for interview confirmation events from seafarer side
    useEffect(() => {
        const handler = (e) => {
            if (e.detail && e.detail.eventId) {
                setConfirmedIds((prev) => ({ ...prev, [e.detail.eventId]: true }));
            }
        };
        window.addEventListener('pbs-interview-confirmed', handler);
        // Also refresh on focus (seafarer might confirm in another tab)
        const onFocus = () => {
            const events = getCustomEvents();
            const set = {};
            events.forEach((ev) => {
                if (ev.crewInfo && ev.id) set[ev.id] = isInterviewConfirmed(ev.id);
            });
            setConfirmedIds(set);
        };
        window.addEventListener('focus', onFocus);
        return () => {
            window.removeEventListener('pbs-interview-confirmed', handler);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    const key = monthKey(year, month);

    // Merge mock + custom events for current month
    const allEvents = useMemo(() => {
        const mock = (COMPANY_EVENTS[key] || []).map((e) => ({ ...e, monthKey: key, source: 'mock' }));
        const custom = customEvents.filter((e) => e.monthKey === key).map((e) => ({ ...e, source: 'custom' }));
        return [...mock, ...custom].sort((a, b) => a.day - b.day);
    }, [key, customEvents]);

    const filteredEvents = useMemo(() => {
        let events = allEvents;
        if (activeCategory !== 'all') events = events.filter((e) => e.category === activeCategory);
        if (selectedDay !== null) events = events.filter((e) => e.day === selectedDay);
        return events;
    }, [allEvents, activeCategory, selectedDay]);

    const eventsByDay = useMemo(() => {
        const map = {};
        allEvents.forEach((e) => { if (!map[e.day]) map[e.day] = []; map[e.day].push(e); });
        return map;
    }, [allEvents]);

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;
    const today = now.getDate();

    const prevMonth = useCallback(() => { setMonth((m) => { if (m === 0) { setYear((y) => y - 1); return 11; } return m - 1; }); setSelectedDay(null); }, []);
    const nextMonth = useCallback(() => { setMonth((m) => { if (m === 11) { setYear((y) => y + 1); return 0; } return m + 1; }); setSelectedDay(null); }, []);
    const onDayClick = useCallback((day) => setSelectedDay((prev) => prev === day ? null : day), []);

    const getCategoryColor = (catId) => (EVENT_CATEGORIES.find((c) => c.id === catId) || {}).color || '#6b7280';

    // CRUD handlers
    const openAddModal = useCallback(() => { setEditingEvent(null); setModalOpen(true); }, []);
    const openEditModal = useCallback((ev) => { if (ev.source === 'custom') { setEditingEvent(ev); setModalOpen(true); } }, []);
    const closeModal = useCallback(() => { setModalOpen(false); setEditingEvent(null); }, []);

    const onSaveEvent = useCallback((data) => {
        if (editingEvent) {
            updateCustomEvent(editingEvent.id, data);
        } else {
            addCustomEvent({ ...data, monthKey: key });
        }
        setCustomEvents(getCustomEvents());
        closeModal();
    }, [editingEvent, key]);

    const onDeleteEvent = useCallback((id) => {
        deleteCustomEvent(id);
        setCustomEvents(getCustomEvents());
        closeModal();
    }, []);

    // Pending interview → open booking modal
    const openBookingModal = useCallback((crew) => {
        setBookingCrew(crew);
    }, []);

    const closeBookingModal = useCallback(() => {
        setBookingCrew(null);
    }, []);

    const onBookInterview = useCallback((data) => {
        const { crew, day: bookDay, time, location, notes } = data;
        addCustomEvent({
            title: `Interview – ${crew.name}`,
            day: bookDay,
            category: 'recruiting',
            vessel: null,
            details: notes || '',
            crewInfo: `${crew.rank} (${crew.department}) — ${crew.nationality}`,
            interviewTime: time,
            interviewLocation: location,
            monthKey: key,
        });
        removePendingInterview(crew.id);
        setCustomEvents(getCustomEvents());
        setPendingList(getPendingInterviews());
        setBookingCrew(null);
        setSelectedPending(null);
    }, [key]);

    const removePending = useCallback((crewId) => {
        removePendingInterview(crewId);
        setPendingList(getPendingInterviews());
        if (selectedPending === crewId) setSelectedPending(null);
    }, [selectedPending]);

    const togglePendingSelect = useCallback((crewId) => {
        setSelectedPending((prev) => prev === crewId ? null : crewId);
    }, []);

    return (
        <MainNavBars className={styles['calendar']} route={'companyCalendar'}>
            <div className={styles['company-page']}>
                {/* ── Sidebar ── */}
                <div className={styles['sidebar']}>
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
                                const dayEvents = eventsByDay[day];
                                let cls = styles['cal-day'];
                                if (dayEvents) cls += ' ' + styles['has-event'];
                                if (selectedDay === day) cls += ' ' + styles['selected'];
                                if (isCurrentMonth && day === today) cls += ' ' + styles['today'];
                                return (
                                    <button key={day} className={cls} onClick={() => onDayClick(day)}>
                                        <span className={styles['day-num']}>{day}</span>
                                        {dayEvents && (
                                            <div className={styles['day-dots']}>
                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                    <span key={i} className={styles['day-dot']} style={{ backgroundColor: getCategoryColor(e.category) }} />
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category filters */}
                    <div className={styles['category-filters']}>
                        <span className={styles['filter-title']}>Filter by Category</span>
                        {EVENT_CATEGORIES.map((cat) => (
                            <button key={cat.id} className={`${styles['cat-btn']} ${activeCategory === cat.id ? styles['active'] : ''}`} onClick={() => setActiveCategory(cat.id)}>
                                <span className={styles['cat-dot']} style={{ backgroundColor: cat.color }} />
                                <span className={styles['cat-label']}>{cat.label}</span>
                                {cat.id !== 'all' && <span className={styles['cat-count']}>{allEvents.filter((e) => e.category === cat.id).length}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Pending Interviews — Glass Card */}
                    {pendingList.length > 0 && (
                        <div className={styles['pending-glass-card']}>
                            <div className={styles['pending-glass-header']}>
                                <span className={styles['pending-glass-title']}>Pending Interviews</span>
                                <span className={styles['pending-glass-count']}>{pendingList.length}</span>
                            </div>
                            <div className={styles['pending-glass-list']}>
                                {pendingList.map((crew) => (
                                    <div
                                        key={crew.id}
                                        className={`${styles['pending-card']} ${selectedPending === crew.id ? styles['pending-selected'] : ''}`}
                                        onClick={() => togglePendingSelect(crew.id)}
                                    >
                                        <div className={styles['pending-avatar']}>
                                            {crew.name ? crew.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div className={styles['pending-info']}>
                                            <span className={styles['pending-name']}>{crew.name}</span>
                                            <span className={styles['pending-detail']}>{crew.rank} · {crew.department}</span>
                                            <span className={styles['pending-detail']}>{crew.nationality}</span>
                                        </div>
                                        <button
                                            className={styles['pending-remove']}
                                            onClick={(e) => { e.stopPropagation(); removePending(crew.id); }}
                                            title="Remove"
                                        >
                                            &#10005;
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {selectedPending && (
                                <button
                                    className={styles['btn-book-interview']}
                                    onClick={() => openBookingModal(pendingList.find((c) => c.id === selectedPending))}
                                >
                                    Book Interview
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Main panel ── */}
                <div className={styles['main-panel']}>
                    <div className={styles['panel-header']}>
                        <h2 className={styles['panel-title']}>
                            {selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : `${MONTHS[month]} ${year} — Company Schedule`}
                        </h2>
                        <div className={styles['panel-header-right']}>
                            <span className={styles['panel-count']}>{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
                            <button className={styles['btn-add-event']} onClick={openAddModal}>+ Add Event</button>
                        </div>
                    </div>

                    <div className={styles['event-list']}>
                        {filteredEvents.length === 0 && (
                            <div className={styles['event-empty']}>
                                {selectedDay ? 'No events scheduled for this day.' : 'No events this month for the selected category.'}
                            </div>
                        )}
                        {filteredEvents.map((ev, i) => (
                            <div key={ev.id || i} className={`${styles['event-card']} ${ev.source === 'custom' ? styles['editable'] : ''}`} onClick={() => openEditModal(ev)}>
                                <div className={styles['event-card-header']}>
                                    <span className={styles['event-dot']} style={{ backgroundColor: getCategoryColor(ev.category) }} />
                                    <span className={styles['event-day-label']}>Day {ev.day}</span>
                                    <span className={styles['event-cat']} style={{ color: getCategoryColor(ev.category) }}>
                                        {(EVENT_CATEGORIES.find((c) => c.id === ev.category) || {}).label || ev.category}
                                    </span>
                                    {ev.vessel && <span className={styles['event-vessel']}>{ev.vessel}</span>}
                                    {ev.source === 'custom' && <span className={styles['event-edit-hint']}>click to edit</span>}
                                    {ev.crewInfo && confirmedIds[ev.id] && (
                                        <span className={styles['confirmed-badge']}>
                                            <svg viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round" className={styles['confirmed-icon']}>
                                                <polyline points="416,128 176,368 96,288" />
                                            </svg>
                                            Confirmed
                                        </span>
                                    )}
                                </div>
                                <h4 className={styles['event-title']}>{ev.title}</h4>
                                {ev.crewInfo && (
                                    <div className={styles['event-interview-info']}>
                                        <span className={styles['event-info-row']}>{ev.crewInfo}</span>
                                        {ev.interviewTime && <span className={styles['event-info-row']}>Time: {ev.interviewTime}</span>}
                                        {ev.interviewLocation && <span className={styles['event-info-row']}>Location: {ev.interviewLocation}</span>}
                                    </div>
                                )}
                                {ev.details && <p className={styles['event-details']}>{ev.details}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {modalOpen && (
                <EventModal
                    event={editingEvent}
                    onSave={onSaveEvent}
                    onClose={closeModal}
                    onDelete={editingEvent ? onDeleteEvent : null}
                />
            )}

            {bookingCrew && (
                <InterviewModal
                    crew={bookingCrew}
                    currentMonth={month}
                    currentYear={year}
                    onBook={onBookInterview}
                    onClose={closeBookingModal}
                />
            )}
        </MainNavBars>
    );
};

module.exports = Calendar;
