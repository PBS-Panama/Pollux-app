// PBS Crewing Module: Company Calendar mock data

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EVENT_CATEGORIES = [
    { id: 'all', label: 'All Events', color: '#ffffff' },
    { id: 'crew-change', label: 'Crew Changes', color: '#16a34a' },
    { id: 'contract', label: 'Contract Expiry', color: '#d97706' },
    { id: 'audit', label: 'Audits & Inspections', color: '#dc2626' },
    { id: 'recruiting', label: 'Recruitment', color: '#2563eb' },
    { id: 'compliance', label: 'Compliance', color: '#a855f7' },
    { id: 'vessel', label: 'Vessel Schedule', color: '#06b6d4' },
];

// Events keyed by "YYYY-MM" for easy lookup; day is inside each event
const COMPANY_EVENTS = {
    '2026-03': [
        { day: 2, title: 'Crew Change – MV Atlantic', vessel: 'MV Atlantic', category: 'crew-change', details: '3/O Rodriguez disembarks, 3/O Fernandez embarks. Flight AR1204 Buenos Aires → Rotterdam.' },
        { day: 3, title: 'ISM Internal Audit', vessel: 'MS Robin', category: 'audit', details: 'Annual ISM audit by ClassNK surveyor. Documents to prepare: SMS manual, NCR log, drill records.' },
        { day: 5, title: 'Interview – 2/E Candidates', vessel: null, category: 'recruiting', details: '3 candidates shortlisted for 2nd Engineer position. Video interviews 09:00-12:00 UTC.' },
        { day: 7, title: 'STCW Compliance Review', vessel: null, category: 'compliance', details: 'Quarterly review of crew STCW certificates. 4 certificates expiring within 60 days.' },
        { day: 9, title: 'Contract Expiry – C/O Petrov', vessel: 'MS Robin', category: 'contract', details: 'Chief Officer Petrov contract ends. Extension offer sent, awaiting response.' },
        { day: 10, title: 'Crew Change – MS Robin', vessel: 'MS Robin', category: 'crew-change', details: 'Bosun Alvarez + AB Santos disembark Hamburg. Replacements confirmed.' },
        { day: 12, title: 'Drug & Alcohol Testing', vessel: 'MV Atlantic', category: 'compliance', details: 'Random D&A testing batch for MV Atlantic crew. 8 crew members selected.' },
        { day: 14, title: 'Manning Agent Meeting', vessel: null, category: 'recruiting', details: 'Quarterly review with Manila manning agent. Pipeline status for Deck & Engine ratings.' },
        { day: 15, title: 'MV Atlantic – Dry Dock Entry', vessel: 'MV Atlantic', category: 'vessel', details: 'Scheduled dry dock at Sembcorp Marine, Singapore. Duration: 14 days.' },
        { day: 17, title: 'Port State Inspection Prep', vessel: 'MS Robin', category: 'audit', details: 'Pre-inspection checklist review. Focus areas: fire safety, MARPOL records, rest hours.' },
        { day: 19, title: 'Contract Expiry – AB Santos', vessel: 'MV Atlantic', category: 'contract', details: 'AB Santos 9-month contract ends. Crew change arranged for Hamburg.' },
        { day: 21, title: 'Budget Review – Q2 Manning', vessel: null, category: 'recruiting', details: 'Manning cost analysis for Q2. Overtime trends, agency fees, travel costs.' },
        { day: 23, title: 'Flag State Doc Renewal', vessel: 'MS Robin', category: 'compliance', details: 'Panama flag annual safety certificate renewal. Surveyor visit confirmed.' },
        { day: 24, title: 'Crew Change – MV Pacific Star', vessel: 'MV Pacific Star', category: 'crew-change', details: 'Full crew rotation: Master, C/E, 2/O, 3/E. Charter flight Manila → Singapore.' },
        { day: 26, title: 'Recruitment Drive – Engine Dept', vessel: null, category: 'recruiting', details: 'Job fair participation at MAAP (Manila). Target: 4/E and Oiler positions.' },
        { day: 28, title: 'Safety Committee Meeting', vessel: null, category: 'audit', details: 'Fleet-wide safety review. Topics: near-miss reports, enclosed space incidents, PPE audit.' },
        { day: 29, title: 'MV Atlantic – Dry Dock Exit', vessel: 'MV Atlantic', category: 'vessel', details: 'Expected undocking. Sea trials scheduled for March 30.' },
        { day: 30, title: 'ISPS Audit – MV Pacific Star', vessel: 'MV Pacific Star', category: 'audit', details: 'ISPS Code compliance verification. SSP review, access control, security drills.' },
    ],
    '2026-04': [
        { day: 1, title: 'MV Atlantic – Sea Trials', vessel: 'MV Atlantic', category: 'vessel', details: 'Post dry-dock sea trials. Engine performance, navigation equipment, safety systems.' },
        { day: 3, title: 'Contract Expiry – Master Chen', vessel: 'MV Pacific Star', category: 'contract', details: 'Master Chen 12-month contract ends. Replacement Master Yamamoto confirmed.' },
        { day: 5, title: 'New Hire Onboarding – 3/E', vessel: null, category: 'recruiting', details: '3rd Engineer Garcia starts pre-sea briefing. Medical, STCW docs, company induction.' },
        { day: 8, title: 'Crew Change – MS Robin', vessel: 'MS Robin', category: 'crew-change', details: '2/O and Electrician rotation at Rotterdam. Travel booked.' },
        { day: 11, title: 'MLC Inspection', vessel: 'MV Atlantic', category: 'compliance', details: 'Maritime Labour Convention inspection. Focus: SEA, crew accommodation, wages, rest hours.' },
        { day: 14, title: 'Vetting Inspection – SIRE', vessel: 'MV Atlantic', category: 'audit', details: 'OCIMF SIRE inspection for upcoming charter. Critical for BP time-charter approval.' },
        { day: 18, title: 'Crew Change – MV Atlantic', vessel: 'MV Atlantic', category: 'crew-change', details: 'Post dry-dock full handover. C/E + 1/E rotation.' },
        { day: 22, title: 'Contract Expiry – 2/O Kim', vessel: 'MS Robin', category: 'contract', details: '2nd Officer Kim 6-month contract ends. Extension discussed.' },
        { day: 25, title: 'MS Robin – Port Call Singapore', vessel: 'MS Robin', category: 'vessel', details: 'Bunker stop + provisions. Crew shore leave 12 hours.' },
        { day: 28, title: 'Q1 Fleet Performance Review', vessel: null, category: 'audit', details: 'KPIs: port state detentions, crew retention rate, training compliance, incident rate.' },
    ],
};

module.exports = { MONTHS, WEEKDAYS_SHORT, EVENT_CATEGORIES, COMPANY_EVENTS };
