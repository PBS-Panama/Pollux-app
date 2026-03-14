// PBS Crewing Module - Seafarer Schedule (career timeline & assignments)

const React = require('react');
const { useMemo } = React;
const { MainNavBars } = require('stremio/components');
const {
    CURRENT_CONTRACT,
    STATUS_LABELS,
    ROTATION_HISTORY,
    UPCOMING_PORT_CALLS,
    ROTATION_COLORS,
    calculateSeaServiceStats,
    daysBetween,
    formatDate,
} = require('./scheduleData');
const styles = require('./styles');

// ─── Progress Ring ──────────────────────────────────────────────────
const ProgressRing = ({ percent, color }) => {
    const r = 36;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (percent / 100) * circumference;
    return (
        <div className={styles['progress-ring']}>
            <svg className={styles['progress-svg']} viewBox="0 0 80 80">
                <circle className={styles['progress-bg']} cx="40" cy="40" r={r} />
                <circle
                    className={styles['progress-fill']}
                    cx="40" cy="40" r={r}
                    stroke={color}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <span className={styles['progress-text']}>{percent}%</span>
        </div>
    );
};

// ─── Status Card ────────────────────────────────────────────────────
const StatusCard = ({ contract, stats }) => {
    const statusInfo = STATUS_LABELS[contract.status] || STATUS_LABELS['available'];
    return (
        <div className={styles['status-card']}>
            <div className={styles['status-main']}>
                <div className={styles['status-vessel-row']}>
                    <span className={styles['status-vessel']}>{contract.vesselName}</span>
                    <span className={styles['status-badge']} style={{ backgroundColor: statusInfo.color }}>
                        {statusInfo.label}
                    </span>
                </div>
                <div className={styles['status-info-row']}>
                    <div className={styles['status-info-item']}>
                        <span className={styles['info-label']}>Rank</span>
                        <span className={styles['info-value']}>{contract.rank}</span>
                    </div>
                    <div className={styles['status-info-item']}>
                        <span className={styles['info-label']}>Vessel Type</span>
                        <span className={styles['info-value']}>{contract.vesselType}</span>
                    </div>
                    <div className={styles['status-info-item']}>
                        <span className={styles['info-label']}>{contract.vesselIMO}</span>
                        <span className={styles['info-value']}>Flag: {contract.flagState.toUpperCase()}</span>
                    </div>
                </div>
                <div className={styles['status-info-row']}>
                    <div className={styles['status-info-item']}>
                        <span className={styles['info-label']}>Contract Start</span>
                        <span className={styles['info-value']}>{formatDate(contract.contractStart)}</span>
                    </div>
                    <div className={styles['status-info-item']}>
                        <span className={styles['info-label']}>Contract End</span>
                        <span className={styles['info-value']}>{formatDate(contract.contractEnd)}</span>
                    </div>
                    <div className={styles['status-info-item']}>
                        <span className={styles['info-label']}>Embark Port</span>
                        <span className={styles['info-value']}>{contract.embarkPort}</span>
                    </div>
                    <div className={styles['status-info-item']}>
                        <span className={styles['info-label']}>Disembark Port</span>
                        <span className={styles['info-value']}>{contract.disembarkPort}</span>
                    </div>
                </div>
            </div>
            <div className={styles['status-progress']}>
                <ProgressRing percent={stats.contractPercent} color={statusInfo.color} />
                <span className={styles['progress-label']}>Contract Progress</span>
            </div>
        </div>
    );
};

// ─── Stats Row ──────────────────────────────────────────────────────
const StatsRow = ({ stats }) => (
    <div className={styles['stats-row']}>
        <div className={styles['stat-card']}>
            <span className={styles['stat-value']} style={{ color: '#3b82f6' }}>{stats.seaDays}</span>
            <span className={styles['stat-label']}>Sea Days (YTD)</span>
        </div>
        <div className={styles['stat-card']}>
            <span className={styles['stat-value']} style={{ color: '#22c55e' }}>{stats.shoreDays}</span>
            <span className={styles['stat-label']}>Shore Days (YTD)</span>
        </div>
        <div className={styles['stat-card']}>
            <span className={styles['stat-value']} style={{ color: '#f59e0b' }}>{stats.daysUntilChange}</span>
            <span className={styles['stat-label']}>Days to Rotation</span>
        </div>
        <div className={styles['stat-card']}>
            <span className={styles['stat-value']} style={{ color: '#a855f7' }}>{stats.contractPercent}%</span>
            <span className={styles['stat-label']}>Contract Complete</span>
        </div>
    </div>
);

// ─── Rotation Timeline ──────────────────────────────────────────────
const RotationTimeline = ({ rotations }) => (
    <div className={styles['timeline-section']}>
        <h3 className={styles['timeline-title']}>Rotation Timeline</h3>
        <div className={styles['timeline-track']}>
            {rotations.map((rot) => {
                const color = ROTATION_COLORS[rot.type] || '#6b7280';
                const days = daysBetween(rot.embarkDate, rot.disembarkDate);
                return (
                    <div
                        key={rot.id}
                        className={`${styles['timeline-block']} ${styles[rot.status] || ''}`}
                        style={{ backgroundColor: `${color}20`, borderColor: rot.status === 'current' ? color : undefined }}
                    >
                        <span className={styles['block-vessel']}>{rot.vessel}</span>
                        <span className={styles['block-dates']}>
                            {formatDate(rot.embarkDate)} — {formatDate(rot.disembarkDate)}
                        </span>
                        <span className={styles['block-days']}>{days} days{rot.rank ? ` · ${rot.rank}` : ''}</span>
                        {rot.status === 'current' && (
                            <span className={styles['block-current-label']}>Current</span>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

// ─── Sea Service Record ─────────────────────────────────────────────
const SeaServiceRecord = ({ rotations }) => {
    const seaRotations = rotations.filter((r) => r.type === 'sea');
    return (
        <div className={styles['service-card']}>
            <h3 className={styles['service-title']}>Sea Service Record</h3>
            <table className={styles['service-table']}>
                <thead>
                    <tr>
                        <th>Vessel</th>
                        <th>Rank</th>
                        <th>Period</th>
                        <th>Area</th>
                        <th>Days</th>
                    </tr>
                </thead>
                <tbody>
                    {seaRotations.map((rot) => {
                        const days = daysBetween(rot.embarkDate, rot.disembarkDate);
                        const color = ROTATION_COLORS[rot.type];
                        return (
                            <tr key={rot.id} className={rot.status === 'current' ? styles['row-current'] : ''}>
                                <td>
                                    <span className={styles['type-dot']} style={{ backgroundColor: color }} />
                                    {rot.vessel}
                                </td>
                                <td>{rot.rank}</td>
                                <td>{formatDate(rot.embarkDate)} — {formatDate(rot.disembarkDate)}</td>
                                <td>{rot.voyageArea}</td>
                                <td className={styles['days-cell']}>{days}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─── Upcoming Port Calls ────────────────────────────────────────────
const PortCalls = ({ ports }) => (
    <div className={styles['ports-card']}>
        <h3 className={styles['ports-title']}>Upcoming Port Calls</h3>
        <div className={styles['port-list']}>
            {ports.map((p) => (
                <div key={p.id} className={styles['port-row']}>
                    <img
                        className={styles['port-flag']}
                        src={`flags/${p.country}.svg`}
                        alt={p.country}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className={styles['port-info']}>
                        <span className={styles['port-name']}>{p.port}</span>
                        <span className={styles['port-purpose']}>{p.purpose}</span>
                    </div>
                    <div className={styles['port-dates']}>
                        <span className={styles['port-eta']}>ETA {formatDate(p.eta)}</span>
                        <span className={styles['port-etd']}>ETD {formatDate(p.etd)}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// ─── Main Component ─────────────────────────────────────────────────
const SeafarerSchedule = () => {
    const stats = useMemo(() => calculateSeaServiceStats(ROTATION_HISTORY, new Date()), []);

    return (
        <MainNavBars className={styles['schedule-container']} route={'dashboard'}>
            <div className={styles['schedule-page']}>
                <StatusCard contract={CURRENT_CONTRACT} stats={stats} />
                <StatsRow stats={stats} />
                <RotationTimeline rotations={ROTATION_HISTORY} />
                <div className={styles['bottom-section']}>
                    <SeaServiceRecord rotations={ROTATION_HISTORY} />
                    <PortCalls ports={UPCOMING_PORT_CALLS} />
                </div>
            </div>
        </MainNavBars>
    );
};

module.exports = SeafarerSchedule;
