// Leto: Seafarer dashboard home
// Shows profile progress, document compliance, and exam priorities.

const React = require('react');
const { default: Button } = require('leto/components/Button');
const api = require('leto/common/apiClient');
const { RANK_REQUIRED_DOCS, getComplianceStatus } = require('leto/common/crewDocData');

const getLetoUser = () => {
    try {
        const data = localStorage.getItem('leto-user');
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

const toFriendlyRank = (rank) => {
    if (!rank || typeof rank !== 'string') return 'Seafarer';
    return rank
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const SeafarerHome = () => {
    const user = React.useMemo(() => getLetoUser(), []);
    const userId = user?.id || api.getUserId();
    const [loading, setLoading] = React.useState(true);
    const [settings, setSettings] = React.useState(null);
    const [uploads, setUploads] = React.useState([]);
    const [examsData, setExamsData] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const available = await api.isApiAvailable();
                if (!available || cancelled) {
                    setLoading(false);
                    return;
                }

                const [settingsRes, uploadsRes, examsRes] = await Promise.all([
                    api.getSettings(userId).catch(() => null),
                    api.getUploads(userId).catch(() => ({ uploads: [] })),
                    api.getExamsData(userId).catch(() => null),
                ]);

                if (cancelled) return;
                setSettings(settingsRes);
                setUploads(Array.isArray(uploadsRes?.uploads) ? uploadsRes.uploads : []);
                setExamsData(examsRes);
            } catch {
                // silent fallback to empty dashboard state
            }
            if (!cancelled) setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [userId]);

    const displayName = React.useMemo(() => {
        if (user?.first_name) return [user.first_name, user.last_name].filter(Boolean).join(' ');
        if (user?.email) return user.email.split('@')[0];
        return 'Seafarer';
    }, [user]);

    const rank = settings?.rank || user?.rank || null;
    const requiredDocs = React.useMemo(() => RANK_REQUIRED_DOCS[rank] || [], [rank]);
    const compliance = React.useMemo(() => getComplianceStatus(rank, uploads), [rank, uploads]);

    const totalRequired = requiredDocs.length;
    const totalMissing = compliance.missing.length;
    const totalExpired = compliance.expired.length;
    const totalExpiring = compliance.expiring.length;
    const completed = Math.max(0, totalRequired - totalMissing);
    const completionPct = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0;

    const missingImoExams = React.useMemo(() => {
        return compliance.missing.filter((doc) => doc.startsWith('IMO '));
    }, [compliance.missing]);

    const upcomingExams = React.useMemo(() => {
        const possible = examsData?.bookedExams || examsData?.upcoming || examsData?.exams || [];
        return Array.isArray(possible) ? possible : [];
    }, [examsData]);

    const progressColor = completionPct >= 85 ? '#2ecc71' : completionPct >= 60 ? '#f1c40f' : '#e67e22';

    return (
        <div style={{ padding: '2rem 3rem', color: '#e0e0e0', overflowY: 'auto', height: '100%' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', fontWeight: 600, color: '#fff', marginBottom: '0.3rem' }}>
                    Bienvenido, {displayName}
                </h1>
                <p style={{ color: '#8899aa', fontSize: '0.9rem' }}>
                    {rank ? `${toFriendlyRank(rank)} · ` : ''}
                    {loading ? 'Loading your dashboard...' : 'Here is your current crewing status'}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(12rem, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <StatCard label={'Completion'} value={`${completionPct}%`} hint={`${completed}/${totalRequired || 0} required docs`} accent={progressColor} />
                <StatCard label={'Missing'} value={String(totalMissing)} hint={'Documents not uploaded'} accent={'#f39c12'} />
                <StatCard label={'Expired'} value={String(totalExpired)} hint={'Need immediate renewal'} accent={'#e74c3c'} />
                <StatCard label={'Exams To Take'} value={String(missingImoExams.length)} hint={'Missing IMO-related docs'} accent={'#00d2d3'} />
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem 1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>Where you are at</div>
                    <div style={{ color: progressColor, fontWeight: 700 }}>{completionPct}%</div>
                </div>
                <div style={{ height: '0.5rem', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${completionPct}%`, height: '100%', background: progressColor, transition: 'width 250ms ease' }} />
                </div>
                <div style={{ color: '#778899', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                    {totalMissing > 0 ? `Upload ${totalMissing} missing document(s) to improve compliance.` : 'Great job. All required documents are uploaded.'}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '1.5rem' }}>
                <Panel title={'What we need'}>
                    {totalRequired === 0 ? (
                        <EmptyLine text={'No rank assigned yet. Set your rank in profile to unlock required docs.'} />
                    ) : (
                        <DocList items={compliance.missing.slice(0, 6)} emptyText={'No missing docs. You are up to date.'} />
                    )}
                </Panel>

                <Panel title={'What is missing right now'}>
                    <Line label={'Missing'} value={`${totalMissing} document(s)`} valueColor={'#f39c12'} />
                    <Line label={'Expired'} value={`${totalExpired} document(s)`} valueColor={'#e74c3c'} />
                    <Line label={'Expiring soon'} value={`${totalExpiring} document(s)`} valueColor={'#f1c40f'} />
                    <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                        <QuickLink href={'#/myfiles'} label={'Go to My Files'} />
                        <QuickLink href={'#/my-profile'} label={'Open My Profile'} />
                    </div>
                </Panel>
            </div>

            <Panel title={'Exams to take'}>
                {missingImoExams.length === 0 ? (
                    <EmptyLine text={'No missing IMO exams based on your current rank requirements.'} />
                ) : (
                    <DocList items={missingImoExams.slice(0, 8)} emptyText={'No exam gaps found.'} />
                )}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.8rem', paddingTop: '0.8rem' }}>
                    <div style={{ color: '#9ab', fontSize: '0.78rem', marginBottom: '0.35rem' }}>Booked exams</div>
                    {upcomingExams.length === 0 ? (
                        <EmptyLine text={'No booked exams yet.'} />
                    ) : (
                        upcomingExams.slice(0, 4).map((exam, index) => (
                            <div key={index} style={{ color: '#d7e0ea', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                                • {exam?.title || exam?.name || exam?.course || 'Upcoming exam'}
                            </div>
                        ))
                    )}
                </div>

                <div style={{ marginTop: '0.9rem' }}>
                    <Button href={'#/myexams'} style={{
                        display: 'inline-block',
                        padding: '0.5rem 1.2rem',
                        borderRadius: '6px',
                        background: 'rgba(0,210,211,0.15)',
                        color: '#00d2d3',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        border: '1px solid rgba(0,210,211,0.3)',
                        textDecoration: 'none',
                    }}>
                        Review exams
                    </Button>
                </div>
            </Panel>
        </div>
    );
};

const StatCard = ({ label, value, hint, accent }) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '0.9rem',
    }}>
        <div style={{ color: '#7f91a5', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ color: accent, fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.2, marginTop: '0.2rem' }}>{value}</div>
        <div style={{ color: '#556677', fontSize: '0.75rem', marginTop: '0.25rem' }}>{hint}</div>
    </div>
);

const Panel = ({ title, children }) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1rem 1.1rem',
    }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>{title}</div>
        {children}
    </div>
);

const Line = ({ label, value, valueColor }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b8c7d8', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
        <span>{label}</span>
        <span style={{ color: valueColor, fontWeight: 600 }}>{value}</span>
    </div>
);

const EmptyLine = ({ text }) => (
    <div style={{ color: '#6f8196', fontSize: '0.8rem', lineHeight: 1.5 }}>{text}</div>
);

const QuickLink = ({ href, label }) => (
    <Button href={href} style={{
        display: 'inline-block',
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        background: 'rgba(255,255,255,0.05)',
        color: '#c6d3e0',
        fontSize: '0.76rem',
        border: '1px solid rgba(255,255,255,0.12)',
        textDecoration: 'none',
    }}>
        {label}
    </Button>
);

const DocList = ({ items, emptyText }) => {
    if (!items || items.length === 0) return <EmptyLine text={emptyText} />;
    return (
        <div>
            {items.map((item) => (
                <div key={item} style={{ color: '#d5deea', fontSize: '0.8rem', marginBottom: '0.35rem', lineHeight: 1.45 }}>
                    • {item}
                </div>
            ))}
        </div>
    );
};

module.exports = SeafarerHome;