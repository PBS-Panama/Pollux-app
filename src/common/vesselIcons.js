// Leto: Vessel type SVG icons + color mapping
// Used by CompanyProfile (MyProfile) and CompanyHome (Board)

const React = require('react');

const VESSEL_SVG = {
    tanker: React.createElement('svg', { viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', width: '100%', height: '100%' },
        React.createElement('path', { d: 'M8 40 C8 40 14 28 32 28 C50 28 56 40 56 40' }),
        React.createElement('ellipse', { cx: 32, cy: 34, rx: 8, ry: 5 }),
        React.createElement('line', { x1: 32, y1: 29, x2: 32, y2: 18 }),
        React.createElement('path', { d: 'M28 18 L36 18' }),
        React.createElement('path', { d: 'M4 44 Q16 52 32 44 Q48 36 60 44', strokeWidth: 2.5 }),
        React.createElement('path', { d: 'M4 50 Q16 58 32 50 Q48 42 60 50', strokeWidth: 2 }),
    ),
    cargo: React.createElement('svg', { viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', width: '100%', height: '100%' },
        React.createElement('path', { d: 'M10 38 L10 26 L54 26 L54 38' }),
        React.createElement('rect', { x: 16, y: 14, width: 10, height: 12, strokeWidth: 2 }),
        React.createElement('rect', { x: 28, y: 14, width: 10, height: 12, strokeWidth: 2 }),
        React.createElement('rect', { x: 40, y: 18, width: 8, height: 8, strokeWidth: 2 }),
        React.createElement('path', { d: 'M6 38 Q20 46 32 38 Q44 30 58 38' }),
        React.createElement('path', { d: 'M4 44 Q16 52 32 44 Q48 36 60 44', strokeWidth: 2 }),
    ),
    offshore: React.createElement('svg', { viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', width: '100%', height: '100%' },
        React.createElement('path', { d: 'M12 40 L12 30 L52 30 L52 40' }),
        React.createElement('rect', { x: 20, y: 20, width: 16, height: 10, strokeWidth: 2 }),
        React.createElement('line', { x1: 36, y1: 20, x2: 36, y2: 12 }),
        React.createElement('line', { x1: 34, y1: 12, x2: 44, y2: 12 }),
        React.createElement('line', { x1: 44, y1: 12, x2: 44, y2: 30 }),
        React.createElement('path', { d: 'M4 44 Q16 52 32 44 Q48 36 60 44', strokeWidth: 2.5 }),
        React.createElement('path', { d: 'M4 50 Q16 58 32 50 Q48 42 60 50', strokeWidth: 2 }),
    ),
    passenger: React.createElement('svg', { viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', width: '100%', height: '100%' },
        React.createElement('path', { d: 'M10 38 L10 22 L50 22 L54 38' }),
        React.createElement('path', { d: 'M14 22 L14 16 L46 16 L46 22' }),
        React.createElement('circle', { cx: 20, cy: 30, r: 2, strokeWidth: 2 }),
        React.createElement('circle', { cx: 28, cy: 30, r: 2, strokeWidth: 2 }),
        React.createElement('circle', { cx: 36, cy: 30, r: 2, strokeWidth: 2 }),
        React.createElement('circle', { cx: 44, cy: 30, r: 2, strokeWidth: 2 }),
        React.createElement('path', { d: 'M6 38 Q20 46 32 38 Q44 30 58 38' }),
        React.createElement('path', { d: 'M4 44 Q16 52 32 44 Q48 36 60 44', strokeWidth: 2 }),
    ),
    utility: React.createElement('svg', { viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', width: '100%', height: '100%' },
        React.createElement('path', { d: 'M14 36 L14 28 L44 28 L48 36' }),
        React.createElement('rect', { x: 18, y: 22, width: 12, height: 6, strokeWidth: 2 }),
        React.createElement('path', { d: 'M6 40 Q20 48 32 40 Q44 32 58 40' }),
        React.createElement('path', { d: 'M4 46 Q16 54 32 46 Q48 38 60 46', strokeWidth: 2 }),
    ),
};

const VESSEL_TYPE_MAP = {
    'Oil Tanker': { svg: 'tanker', color: '#e67e22' },
    'Chemical Tanker': { svg: 'tanker', color: '#9b59b6' },
    'LNG Carrier': { svg: 'tanker', color: '#3498db' },
    'LPG Carrier': { svg: 'tanker', color: '#1abc9c' },
    'Container Ship': { svg: 'cargo', color: '#2ecc71' },
    'Bulk Carrier': { svg: 'cargo', color: '#95a5a6' },
    'General Cargo': { svg: 'cargo', color: '#7f8c8d' },
    'PSV (Platform Supply Vessel)': { svg: 'offshore', color: '#f39c12' },
    'AHTS (Anchor Handling)': { svg: 'offshore', color: '#00d2d3' },
    'Tug': { svg: 'utility', color: '#e74c3c' },
    'Barge': { svg: 'utility', color: '#34495e' },
    'FPSO': { svg: 'offshore', color: '#d35400' },
    'Offshore Drill Ship': { svg: 'offshore', color: '#c0392b' },
    'Ro-Ro': { svg: 'passenger', color: '#2980b9' },
    'Car Carrier': { svg: 'cargo', color: '#27ae60' },
    'Cruise Ship': { svg: 'passenger', color: '#8e44ad' },
    'Ferry': { svg: 'passenger', color: '#16a085' },
    'Cable Layer': { svg: 'utility', color: '#f1c40f' },
    'Dredger': { svg: 'utility', color: '#e67e22' },
    'Icebreaker': { svg: 'utility', color: '#ecf0f1' },
};

const VesselIcon = ({ type, size }) => {
    const mapping = VESSEL_TYPE_MAP[type] || { svg: 'utility', color: '#00d2d3' };
    const s = size || '2.5rem';
    return React.createElement('div', {
        style: {
            width: s, height: s, borderRadius: '8px',
            background: `${mapping.color}15`, color: mapping.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0.4rem', flexShrink: 0, boxSizing: 'border-box',
        }
    }, VESSEL_SVG[mapping.svg]);
};

const getVesselColor = (type) => (VESSEL_TYPE_MAP[type] || { color: '#00d2d3' }).color;

module.exports = { VesselIcon, getVesselColor, VESSEL_TYPE_MAP };
