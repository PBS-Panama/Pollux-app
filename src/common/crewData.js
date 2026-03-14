// PBS Crewing Module: shared deterministic crew data generation

// ─── STCW Departments ───────────────────────────────────────────────
const STCW_DEPARTMENTS = [
    'Deck Department',
    'Engine Department',
    'Electro-Technical',
    'Catering / Hotel',
    'Radio / GMDSS',
    'Medical',
    'Safety & Survival',
];

// ─── STCW Ranks (per STCW Convention regulations) ───────────────────
const STCW_RANKS = [
    'II/2 – Master (≥ 3000 GT)',
    'II/2 – Chief Mate (≥ 3000 GT)',
    'II/3 – Master (< 3000 GT)',
    'II/3 – Chief Mate (< 3000 GT)',
    'II/3 – Master Near-Coastal (< 500 GT)',
    'II/1 – OOW Navigation (Second Officer)',
    'II/1 – OOW Navigation (Third Officer)',
    'II/4 – Rating Navigational Watch (Helmsman)',
    'II/5 – Able Seafarer Deck (AB)',
    'III/2 – Chief Engineer (≥ 3000 kW)',
    'III/2 – Second Engineer (≥ 3000 kW)',
    'III/3 – Chief Engineer (750–3000 kW)',
    'III/3 – Second Engineer (750–3000 kW)',
    'III/1 – EOOW (Third Engineer)',
    'III/1 – EOOW (Fourth Engineer)',
    'III/6 – Electro-Technical Officer (ETO)',
    'III/7 – Electro-Technical Rating (ETR)',
    'III/4 – Rating Engineering Watch (Oiler)',
    'III/5 – Able Seafarer Engine (Motorman)',
    'IV/2 – GMDSS Radio Operator',
    'Cadet – Deck (Trainee II/1)',
    'Cadet – Engine (Trainee III/1)',
];

// ─── Nationality (Americas) ────────────────────────────────────────
const NATIONALITIES_AMERICAS = [
    'Panama', 'Colombia', 'Peru', 'Ecuador', 'Mexico', 'Brazil', 'Chile',
    'Argentina', 'Venezuela', 'Honduras', 'Guatemala', 'Dominican Republic',
    'Costa Rica', 'Cuba', 'El Salvador', 'Nicaragua', 'Bolivia', 'Paraguay',
    'Uruguay', 'United States', 'Canada',
];

// ISO 3166-1 alpha-2 codes for flag SVG file lookup
const COUNTRY_CODE_MAP = {
    'Panama': 'pa', 'Colombia': 'co', 'Peru': 'pe', 'Ecuador': 'ec',
    'Mexico': 'mx', 'Brazil': 'br', 'Chile': 'cl', 'Argentina': 'ar',
    'Venezuela': 've', 'Honduras': 'hn', 'Guatemala': 'gt',
    'Dominican Republic': 'do', 'Costa Rica': 'cr', 'Cuba': 'cu',
    'El Salvador': 'sv', 'Nicaragua': 'ni', 'Bolivia': 'bo',
    'Paraguay': 'py', 'Uruguay': 'uy', 'United States': 'us', 'Canada': 'ca',
};

// ─── Crew Names ─────────────────────────────────────────────────────
const CREW_FIRST_NAMES = [
    'Carlos', 'Miguel', 'José', 'Ricardo', 'Andrés', 'Fernando', 'Diego', 'Luis',
    'Roberto', 'Alejandro', 'Manuel', 'Gabriel', 'Daniel', 'Marco', 'Eduardo',
    'Héctor', 'Raúl', 'Sergio', 'Víctor', 'Pablo', 'Javier', 'Óscar', 'Tomás',
    'Enrique', 'Arturo', 'Rafael', 'Iván', 'Felipe', 'Adrián', 'Gonzalo',
    'Santiago', 'Martín', 'Ignacio', 'Cristian', 'Emilio', 'Ramón', 'Álvaro',
    'Nicolás', 'Jorge', 'Alberto', 'Pedro', 'Francisco', 'Rodrigo', 'Esteban',
    'Camilo', 'Sebastián', 'Mateo', 'Leonardo', 'David', 'Ernesto',
];
const CREW_LAST_NAMES = [
    'Rodríguez', 'González', 'Martínez', 'López', 'Hernández', 'García', 'Pérez',
    'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz',
    'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Ramos', 'Vargas', 'Castillo',
    'Jiménez', 'Moreno', 'Romero', 'Alvarado', 'Ruiz', 'Mendoza', 'Aguilar',
    'Medina', 'Castro', 'Herrera', 'Vega', 'Delgado', 'Núñez', 'Paredes',
    'Córdoba', 'Salazar', 'Pineda', 'Acosta', 'Miranda', 'Bravo', 'Navarro',
    'Campos', 'Espinoza', 'Arias', 'Rojas', 'Molina', 'Silva', 'Guerrero',
];

// ─── Hash Function ──────────────────────────────────────────────────
const hashStr = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
};

// ─── Deterministic Crew Data Generators ─────────────────────────────
// Each uses different bit ranges of the hash for statistical independence

const getCrewName = (originalName) => {
    if (typeof originalName !== 'string' || originalName.length === 0) return '';
    const h = hashStr(originalName);
    const first = CREW_FIRST_NAMES[h % CREW_FIRST_NAMES.length];
    const last = CREW_LAST_NAMES[(h >>> 4) % CREW_LAST_NAMES.length];
    return `${first} ${last}`;
};

const getCrewDepartment = (originalName) => {
    const h = hashStr(originalName || '');
    return STCW_DEPARTMENTS[h % STCW_DEPARTMENTS.length];
};

const getCrewRank = (originalName) => {
    const h = hashStr(originalName || '');
    return STCW_RANKS[(h >>> 3) % STCW_RANKS.length];
};

const getCrewNationality = (originalName) => {
    const h = hashStr(originalName || '');
    return NATIONALITIES_AMERICAS[(h >>> 6) % NATIONALITIES_AMERICAS.length];
};

const getCrewFlagPath = (nationality) => {
    const code = COUNTRY_CODE_MAP[nationality];
    return code ? `flags/${code}.svg` : null;
};

module.exports = {
    hashStr,
    getCrewName,
    getCrewDepartment,
    getCrewRank,
    getCrewNationality,
    getCrewFlagPath,
    STCW_DEPARTMENTS,
    STCW_RANKS,
    NATIONALITIES_AMERICAS,
    COUNTRY_CODE_MAP,
    CREW_FIRST_NAMES,
    CREW_LAST_NAMES,
};
