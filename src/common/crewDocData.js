// PBS Crewing Module: shared document category data

const CREW_DOC_LABELS = {
    1: 'Main Docs',
    2: 'IMO Courses',
    3: 'Health Certificates',
    4: 'Job Letters',
    5: 'Other Certificates',
};

const CREW_ALL_DOCS = {
    1: [ // Main Docs
        { title: "Seaman's Book", baseDate: '2023-03-15' },
        { title: 'National ID Card', baseDate: '2022-08-20' },
        { title: 'Passport', baseDate: '2022-11-05' },
        { title: 'Flag State CoC', baseDate: '2023-01-10' },
        { title: 'Endorsement of Recognition', baseDate: '2023-06-05' },
        { title: 'Discharge Book', baseDate: '2021-11-22' },
        { title: 'STCW Certificate', baseDate: '2023-09-01' },
        { title: 'Seaman Identity Document (SID)', baseDate: '2022-12-15' },
    ],
    2: [ // IMO Courses
        { title: 'IMO 1.19 — Basic Safety Training', baseDate: '2022-04-12' },
        { title: 'IMO 1.20 — Fire Prevention & Firefighting', baseDate: '2022-04-15' },
        { title: 'IMO 1.23 — Proficiency in Survival Craft', baseDate: '2022-05-02' },
        { title: 'IMO 1.24 — Medical First Aid', baseDate: '2022-04-18' },
        { title: 'IMO 1.25 — Medical Care', baseDate: '2023-01-20' },
        { title: 'IMO 1.28 — GMDSS Operator', baseDate: '2021-09-10' },
        { title: 'IMO 1.32 — ECDIS', baseDate: '2023-07-14' },
        { title: 'IMO 2.03 — Advanced Firefighting', baseDate: '2022-06-20' },
        { title: 'IMO 3.12 — Ship Security Officer', baseDate: '2023-02-28' },
        { title: 'IMO 3.19 — Security Awareness', baseDate: '2021-11-05' },
        { title: 'IMO 1.39 — Leadership & Teamwork', baseDate: '2023-03-15' },
        { title: 'IMO 7.01 — Master & Chief Mate', baseDate: '2020-08-22' },
    ],
    3: [ // Health Certificates
        { title: 'Flag State Medical Certificate', baseDate: '2024-01-08' },
        { title: 'Yellow Fever Vaccination', baseDate: '2020-06-15' },
        { title: 'COVID-19 Vaccination Record', baseDate: '2021-09-30' },
        { title: 'Drug & Alcohol Test', baseDate: '2024-01-08' },
        { title: 'Eyesight Test Certificate', baseDate: '2024-01-08' },
        { title: 'Color Vision Test', baseDate: '2023-06-20' },
        { title: 'Audiometry Test', baseDate: '2023-06-20' },
        { title: 'Chest X-Ray Report', baseDate: '2023-12-10' },
    ],
    4: [ // Job Letters
        { title: 'Letter of Employment', baseDate: '2024-02-01' },
        { title: 'Letter of Good Standing', baseDate: '2023-12-20' },
        { title: 'Sea Service — MV Pacific Star', baseDate: '2023-06-30' },
        { title: 'Sea Service — MV Atlantic Voyager', baseDate: '2022-09-15' },
        { title: 'Sea Service — MV Caribbean Spirit', baseDate: '2021-03-20' },
        { title: 'Reference Letter', baseDate: '2023-07-01' },
        { title: 'Contract of Employment', baseDate: '2024-01-15' },
        { title: 'Certificate of Discharge', baseDate: '2023-11-30' },
    ],
    5: [ // Other Certificates
        { title: 'GMDSS GOC Certificate', baseDate: '2022-11-10' },
        { title: 'Dynamic Positioning (DP) Basic', baseDate: '2023-03-22' },
        { title: 'Dynamic Positioning (DP) Advanced', baseDate: '2023-08-15' },
        { title: 'H2S Safety Training', baseDate: '2022-08-05' },
        { title: 'High Voltage Operations', baseDate: '2023-09-18' },
        { title: 'BOSIET — Offshore Safety', baseDate: '2022-06-25' },
        { title: 'HUET — Helicopter Escape', baseDate: '2022-06-26' },
        { title: 'Tanker Familiarization', baseDate: '2021-04-10' },
        { title: 'Oil Tanker Operations', baseDate: '2021-10-05' },
        { title: 'Crane Operator Certificate', baseDate: '2023-05-12' },
    ],
};

const CREW_DOC_CATEGORIES = [1, 2, 3, 4, 5];

module.exports = { CREW_DOC_LABELS, CREW_ALL_DOCS, CREW_DOC_CATEGORIES };
