// PBS Crewing Module: shared document category data
// Each document has a baseDate (issue) and validityYears (how long it's valid)
// validityYears: null = no expiry (permanent), number = years from issue

const CREW_DOC_LABELS = {
    1: 'Main Docs',
    2: 'IMO Courses',
    3: 'Health Certificates',
    4: 'Job Letters',
    5: 'Other Certificates',
};

const CREW_ALL_DOCS = {
    1: [ // Main Docs
        { title: "Seaman's Book", baseDate: '2023-03-15', validityYears: 5 },
        { title: 'National ID Card', baseDate: '2022-08-20', validityYears: 10 },
        { title: 'Passport', baseDate: '2022-11-05', validityYears: 10 },
        { title: 'Flag State CoC', baseDate: '2023-01-10', validityYears: 5 },
        { title: 'Endorsement of Recognition', baseDate: '2023-06-05', validityYears: 5 },
        { title: 'Discharge Book', baseDate: '2021-11-22', validityYears: null },
        { title: 'STCW Certificate', baseDate: '2023-09-01', validityYears: 5 },
        { title: 'Seaman Identity Document (SID)', baseDate: '2022-12-15', validityYears: 5 },
    ],
    2: [ // IMO Model Courses — Official catalog

        // ── Serie 1 — Deck / Navigation / Operations ────────────────
        { title: 'IMO 1.01 — Basic Training for Oil and Chemical Tanker Cargo Operations', baseDate: '2022-03-01', validityYears: 5 },
        { title: 'IMO 1.02 — Advanced Training for Oil Tanker Cargo Operations', baseDate: '2022-03-05', validityYears: 5 },
        { title: 'IMO 1.03 — Advanced Training for Chemical Tanker Cargo Operations', baseDate: '2022-03-10', validityYears: 5 },
        { title: 'IMO 1.04 — Basic Training for Liquefied Gas Tanker Cargo Operations', baseDate: '2022-03-15', validityYears: 5 },
        { title: 'IMO 1.05 — Advanced Training for Liquefied Gas Tanker Cargo Operations', baseDate: '2022-03-20', validityYears: 5 },
        { title: 'IMO 1.07 — Radar Navigation at Operational Level', baseDate: '2022-02-05', validityYears: 5 },
        { title: 'IMO 1.08 — Radar Navigation at Management Level (Radar, ARPA, Bridge Teamwork & SAR)', baseDate: '2022-02-10', validityYears: 5 },
        { title: 'IMO 1.10 — Dangerous, Hazardous and Harmful Cargo', baseDate: '2022-03-01', validityYears: 5 },
        { title: 'IMO 1.14 — Medical First Aid', baseDate: '2022-04-18', validityYears: 5 },
        { title: 'IMO 1.15 — Medical Care', baseDate: '2023-01-20', validityYears: 5 },
        { title: 'IMO 1.19 — Proficiency in Personal Survival Techniques', baseDate: '2022-04-12', validityYears: 5 },
        { title: 'IMO 1.20 — Fire Prevention and Fire Fighting', baseDate: '2022-04-15', validityYears: 5 },
        { title: 'IMO 1.21 — Personal Safety and Social Responsibilities', baseDate: '2022-04-16', validityYears: 5 },
        { title: 'IMO 1.22 — Bridge Resource Management (BRM)', baseDate: '2023-06-01', validityYears: 5 },
        { title: 'IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)', baseDate: '2022-05-02', validityYears: 5 },
        { title: 'IMO 1.24 — Proficiency in Fast Rescue Boats', baseDate: '2022-07-05', validityYears: 5 },
        { title: 'IMO 1.25 — General Operator\'s Certificate for GMDSS', baseDate: '2021-09-10', validityYears: 5 },
        { title: 'IMO 1.26 — Restricted Operator\'s Certificate for GMDSS', baseDate: '2021-09-12', validityYears: 5 },
        { title: 'IMO 1.27 — Operational Use of ECDIS', baseDate: '2023-07-10', validityYears: 5 },
        { title: 'IMO 1.29 — Proficiency in Crisis Management and Human Behavior Training', baseDate: '2022-08-05', validityYears: 5 },
        { title: 'IMO 1.30 — Onboard Assessment', baseDate: '2022-03-05', validityYears: null },
        { title: 'IMO 1.31 — Radio Electronic Certificate for GMDSS Radio Personnel', baseDate: '2021-10-01', validityYears: 5 },
        { title: 'IMO 1.32 — Operational Use of Integrated Bridge System (IBS)', baseDate: '2023-07-14', validityYears: 5 },
        { title: 'IMO 1.33 — Safety of Fishing Operations (Support Level)', baseDate: '2022-08-01', validityYears: 5 },
        { title: 'IMO 1.34 — Automatic Identification Systems (AIS)', baseDate: '2022-09-01', validityYears: 5 },
        { title: 'IMO 1.35 — Liquefied Gas (LPG) Tanker Cargo and Ballast Handling Simulator', baseDate: '2022-10-01', validityYears: 5 },
        { title: 'IMO 1.36 — LNG Tanker Cargo & Ballast Handling Simulator', baseDate: '2022-10-05', validityYears: 5 },
        { title: 'IMO 1.38 — Marine Environmental Awareness', baseDate: '2023-01-15', validityYears: 5 },
        { title: 'IMO 1.39 — Leadership & Teamwork', baseDate: '2023-03-15', validityYears: 5 },
        { title: 'IMO 1.40 — Use of Leadership and Managerial Skills', baseDate: '2023-03-18', validityYears: 5 },
        { title: 'IMO 1.41 — Passenger Ship Crowd Management Training', baseDate: '2022-08-10', validityYears: 5 },
        { title: 'IMO 1.42 — Passenger Ship Crisis Management & Human Behavior Training', baseDate: '2022-08-15', validityYears: 5 },
        { title: 'IMO 1.44 — Safety Training for Personnel Providing Direct Service to Passengers', baseDate: '2022-09-05', validityYears: 5 },
        { title: 'IMO 1.45 — Safe Handling & Transport of Solid Bulk Cargoes', baseDate: '2022-09-10', validityYears: 5 },
        { title: 'IMO 1.46 — Passenger Safety, Cargo Safety and Hull Integrity Training', baseDate: '2022-09-15', validityYears: 5 },

        // ── Serie 2 — Simulators ────────────────────────────────────
        { title: 'IMO 2.03 — Advanced Training in Fire Fighting', baseDate: '2022-06-20', validityYears: 5 },
        { title: 'IMO 2.06 — Oil Tanker Cargo and Ballast Handling Simulator', baseDate: '2022-10-10', validityYears: 5 },
        { title: 'IMO 2.07 — Engine-Room Simulator', baseDate: '2023-02-10', validityYears: 5 },

        // ── Serie 3 — Administration / Survey / Port Security ───────
        { title: 'IMO 3.03 — Survey of Machinery Installations', baseDate: '2022-06-01', validityYears: 5 },
        { title: 'IMO 3.04 — Survey of Electrical Installations', baseDate: '2022-06-05', validityYears: 5 },
        { title: 'IMO 3.05 — Survey of Fire Appliances and Provisions', baseDate: '2022-06-10', validityYears: 5 },
        { title: 'IMO 3.06 — Survey of Life-Saving Appliances and Arrangements', baseDate: '2022-06-15', validityYears: 5 },
        { title: 'IMO 3.07 — Hull and Structural Surveys', baseDate: '2022-06-20', validityYears: 5 },
        { title: 'IMO 3.08 — Survey of Navigational Aids and Equipment', baseDate: '2022-06-25', validityYears: 5 },
        { title: 'IMO 3.09 — Port State Control', baseDate: '2022-07-01', validityYears: 5 },
        { title: 'IMO 3.11 — Safety Investigation into Marine Casualties and Incidents', baseDate: '2022-07-10', validityYears: 5 },
        { title: 'IMO 3.12 — Assessment, Examination & Certification of Seafarers', baseDate: '2023-02-28', validityYears: 5 },
        { title: 'IMO 3.13 — SAR Administration (IAMSAR Vol. I)', baseDate: '2022-07-15', validityYears: 5 },
        { title: 'IMO 3.14 — SAR Mission Coordinator (IAMSAR Vol. II)', baseDate: '2022-07-20', validityYears: 5 },
        { title: 'IMO 3.15 — SAR On-Scene Coordinator (IAMSAR Vol. III)', baseDate: '2022-07-25', validityYears: 5 },
        { title: 'IMO 3.17 — Maritime English', baseDate: '2022-03-10', validityYears: null },
        { title: 'IMO 3.18 — Safe Packing of Cargo Transport Units (CTUs)', baseDate: '2022-08-01', validityYears: 5 },
        { title: 'IMO 3.19 — Ship Security Officer (SSO)', baseDate: '2021-11-05', validityYears: 5 },
        { title: 'IMO 3.20 — Company Security Officer (CSO)', baseDate: '2023-04-01', validityYears: 5 },
        { title: 'IMO 3.21 — ISPS Port Security Officer (PFSO)', baseDate: '2023-04-05', validityYears: 5 },
        { title: 'IMO 3.23 — Piracy & Armed Robbery Prevention', baseDate: '2022-11-10', validityYears: 5 },
        { title: 'IMO 3.24 — Security Awareness Training for Port Facility Personnel with Designated Security Duties', baseDate: '2022-11-15', validityYears: 5 },
        { title: 'IMO 3.25 — Security Awareness Training for All Port Facility Personnel', baseDate: '2022-11-20', validityYears: 5 },
        { title: 'IMO 3.26 — Security Training for Seafarers with Designated Security Duties', baseDate: '2022-12-01', validityYears: 5 },
        { title: 'IMO 3.27 — Security Awareness Training for All Seafarers', baseDate: '2022-12-05', validityYears: 5 },

        // ── Serie 4 — Environment ───────────────────────────────────
        { title: 'IMO 4.05 — Energy Efficient Operation of Ships', baseDate: '2023-01-10', validityYears: 5 },

        // ── Serie 6 — Instructors / Trainers ────────────────────────
        { title: 'IMO 6.09 — Training Course for Instructors', baseDate: '2023-05-01', validityYears: 5 },
        { title: 'IMO 6.10 — Train the Simulator Trainer and Assessor', baseDate: '2023-05-05', validityYears: 5 },

        // ── Serie 7 — Competency by Rank ────────────────────────────
        { title: 'IMO 7.01 — Master and Chief Mate', baseDate: '2020-08-22', validityYears: 5 },
        { title: 'IMO 7.02 — Chief Engineer Officer & Second Engineer Officer', baseDate: '2020-09-10', validityYears: 5 },
        { title: 'IMO 7.03 — Officer in Charge of a Navigational Watch (OOW)', baseDate: '2021-03-15', validityYears: 5 },
        { title: 'IMO 7.04 — Officer in Charge of an Engineering Watch', baseDate: '2021-03-20', validityYears: 5 },
        { title: 'IMO 7.05 — Skipper on Fishing Vessel', baseDate: '2021-06-01', validityYears: 5 },
        { title: 'IMO 7.06 — Navigational Watch on a Fishing Vessel', baseDate: '2021-06-05', validityYears: 5 },
        { title: 'IMO 7.07 — Chief & Second Engineer Officers on a Fishing Vessel', baseDate: '2021-06-10', validityYears: 5 },
        { title: 'IMO 7.08 — Electro-Technical Officer (ETO)', baseDate: '2023-02-15', validityYears: 5 },
        { title: 'IMO 7.09 — Ratings Forming Part of an Engine-Room Watch', baseDate: '2021-07-01', validityYears: null },
        { title: 'IMO 7.10 — Ratings as Able Seafarer Deck', baseDate: '2021-07-05', validityYears: null },
        { title: 'IMO 7.11 — Basic Training for Ships Operating in Polar Waters', baseDate: '2023-10-01', validityYears: 5 },
        { title: 'IMO 7.12 — Advanced Training for Ships Operating in Polar Waters', baseDate: '2023-10-05', validityYears: 5 },
        { title: 'IMO 7.13 — Basic Training on Ships Subject to the IGF Code', baseDate: '2023-10-10', validityYears: 5 },
        { title: 'IMO 7.14 — Advanced Training for Ships Subject to the IGF Code', baseDate: '2023-10-15', validityYears: 5 },
        { title: 'IMO 7.15 — Electro-Technical Rating', baseDate: '2021-08-01', validityYears: null },
        { title: 'IMO 7.16 — Able Ratings Seafarer Engine', baseDate: '2021-08-05', validityYears: null },
        { title: 'IMO 7.17 — Engine-Room Resource Management (ERM)', baseDate: '2023-06-05', validityYears: 5 },
    ],
    3: [ // Health Certificates
        { title: 'Flag State Medical Certificate', baseDate: '2024-01-08', validityYears: 2 },
        { title: 'Yellow Fever Vaccination', baseDate: '2020-06-15', validityYears: null },
        { title: 'COVID-19 Vaccination Record', baseDate: '2021-09-30', validityYears: 1 },
        { title: 'Drug & Alcohol Test', baseDate: '2024-01-08', validityYears: 1 },
        { title: 'Eyesight Test Certificate', baseDate: '2024-01-08', validityYears: 2 },
        { title: 'Color Vision Test', baseDate: '2023-06-20', validityYears: 5 },
        { title: 'Audiometry Test', baseDate: '2023-06-20', validityYears: 2 },
        { title: 'Chest X-Ray Report', baseDate: '2023-12-10', validityYears: 2 },
    ],
    4: [ // Job Letters
        { title: 'Letter of Employment', baseDate: '2024-02-01', validityYears: null },
        { title: 'Letter of Good Standing', baseDate: '2023-12-20', validityYears: null },
        { title: 'Sea Service — MV Pacific Star', baseDate: '2023-06-30', validityYears: null },
        { title: 'Sea Service — MV Atlantic Voyager', baseDate: '2022-09-15', validityYears: null },
        { title: 'Sea Service — MV Caribbean Spirit', baseDate: '2021-03-20', validityYears: null },
        { title: 'Reference Letter', baseDate: '2023-07-01', validityYears: null },
        { title: 'Contract of Employment', baseDate: '2024-01-15', validityYears: 1 },
        { title: 'Certificate of Discharge', baseDate: '2023-11-30', validityYears: null },
    ],
    5: [ // Other Certificates
        { title: 'GMDSS GOC Certificate', baseDate: '2022-11-10', validityYears: 5 },
        { title: 'Dynamic Positioning (DP) Basic', baseDate: '2023-03-22', validityYears: 5 },
        { title: 'Dynamic Positioning (DP) Advanced', baseDate: '2023-08-15', validityYears: 5 },
        { title: 'H2S Safety Training', baseDate: '2022-08-05', validityYears: 4 },
        { title: 'High Voltage Operations', baseDate: '2023-09-18', validityYears: 5 },
        { title: 'BOSIET — Offshore Safety', baseDate: '2022-06-25', validityYears: 4 },
        { title: 'HUET — Helicopter Escape', baseDate: '2022-06-26', validityYears: 4 },
        { title: 'Tanker Familiarization', baseDate: '2021-04-10', validityYears: null },
        { title: 'Oil Tanker Operations', baseDate: '2021-10-05', validityYears: 5 },
        { title: 'Crane Operator Certificate', baseDate: '2023-05-12', validityYears: 5 },
    ],
};

const CREW_DOC_CATEGORIES = [1, 2, 3, 4, 5];

/**
 * Calculate expiry status for a document
 * @param {string} issuedDate - ISO date string
 * @param {number|null} validityYears - null = permanent
 * @returns {{ expiryDate: string|null, status: 'valid'|'expiring'|'expired'|'permanent', daysRemaining: number|null }}
 */
const getExpiryStatus = (issuedDate, validityYears) => {
    if (validityYears === null || validityYears === undefined) {
        return { expiryDate: null, status: 'permanent', daysRemaining: null };
    }

    const issued = new Date(issuedDate);
    const expiry = new Date(issued);
    expiry.setFullYear(expiry.getFullYear() + validityYears);

    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / 86400000);

    let status;
    if (daysRemaining < 0) {
        status = 'expired';
    } else if (daysRemaining <= 90) {
        status = 'expiring';
    } else {
        status = 'valid';
    }

    return {
        expiryDate: expiry.toISOString().split('T')[0],
        status,
        daysRemaining,
    };
};

module.exports = { CREW_DOC_LABELS, CREW_ALL_DOCS, CREW_DOC_CATEGORIES, getExpiryStatus };
