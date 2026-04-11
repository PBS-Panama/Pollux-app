// Leto Crewing Module: STCW competency matrix MVP
// Phase 1 scope: universal + rank rules + core conditional mobility requirements.

const { RANK_REQUIRED_DOCS } = require('leto/common/crewDocData');

const UNIVERSAL_DOCUMENTS = [
    "Seaman's Book",
    'National ID Card',
    'Passport',
    'STCW Certificate',
    'Flag State Medical Certificate',
    'Drug & Alcohol Test',
    'Eyesight Test Certificate',
    'IMO 1.19 — Proficiency in Personal Survival Techniques',
    'IMO 1.20 — Fire Prevention and Fire Fighting',
    'IMO 1.21 — Personal Safety and Social Responsibilities',
    'IMO 1.14 — Medical First Aid',
    'IMO 3.27 — Security Awareness Training for All Seafarers',
];

const PROFILE_REQUIREMENTS = [
    {
        id: 'profile-nationality-primary',
        title: 'Primary nationality is set',
        type: 'profile',
        priority: 'critical',
        isRequired: () => true,
        isComplete: (settings) => Boolean(settings?.identity?.nationality_primary),
    },
    {
        id: 'profile-passport-1-number',
        title: 'Passport 1 number is set',
        type: 'profile',
        priority: 'critical',
        isRequired: () => true,
        isComplete: (settings) => Boolean(settings?.identity?.passport_1?.number),
    },
    {
        id: 'profile-departure-airport',
        title: 'International departure airport is set',
        type: 'profile',
        priority: 'high',
        isRequired: () => true,
        isComplete: (settings) => Boolean(settings?.travel?.departure_airport_iata),
    },
    {
        id: 'profile-nationality-secondary',
        title: 'Secondary nationality is set for double nationality',
        type: 'profile',
        priority: 'critical',
        isRequired: (settings) => Boolean(settings?.identity?.double_nationality),
        isComplete: (settings) => Boolean(settings?.identity?.nationality_secondary),
    },
    {
        id: 'profile-passport-2-number',
        title: 'Passport 2 number is set for double nationality',
        type: 'profile',
        priority: 'critical',
        isRequired: (settings) => Boolean(settings?.identity?.double_nationality),
        isComplete: (settings) => Boolean(settings?.identity?.passport_2?.number),
    },
    {
        id: 'profile-visa-link-passport',
        title: 'Visa is linked to Passport 1 or Passport 2',
        type: 'profile',
        priority: 'critical',
        isRequired: (settings) => Boolean(settings?.visa?.has_visa),
        isComplete: (settings) => {
            const linked = settings?.visa?.linked_passport;
            return linked === 'passport_1' || linked === 'passport_2';
        },
    },
    {
        id: 'profile-visa-link-consistency',
        title: 'Visa linked to Passport 2 requires double nationality',
        type: 'profile',
        priority: 'critical',
        isRequired: (settings) => Boolean(settings?.visa?.has_visa) && settings?.visa?.linked_passport === 'passport_2',
        isComplete: (settings) => Boolean(settings?.identity?.double_nationality),
    },
];

const DOCUMENT_RULES = {
    Passport: [
        'Document must be fully visible (all corners, no crop).',
        'MRZ (machine-readable zone) must be readable and glare-free.',
        'Expiry date must be valid for the intended deployment window.',
    ],
    'Passport 2': [
        'Upload only when double nationality is declared.',
        'MRZ and passport number must be clearly readable.',
        'Country must match secondary nationality profile data.',
    ],
    'Visa / Entry Permit': [
        'Issuing country and visa type must be declared.',
        'Visa expiry date must be entered exactly as printed.',
        'Visa must be linked to Passport 1 or Passport 2.',
    ],
    "Seaman's Book": [
        'Include identification page and latest sea-service entries.',
        'Vessel name, rank, embark/disembark dates must be legible.',
        'All entries should be consistent with profile experience timeline.',
    ],
    'Flag State Medical Certificate': [
        'Certificate number and issuing authority must be visible.',
        'Issue and expiry dates must be readable and complete.',
        'Do not upload certificates that are damaged or partially visible.',
    ],
};

const getDocumentRules = (documentName) => {
    if (!documentName || typeof documentName !== 'string') return [];
    if (DOCUMENT_RULES[documentName]) return DOCUMENT_RULES[documentName];

    return [
        'Upload a clear, full-page scan in PDF format.',
        'Ensure issue and expiry dates are correctly captured.',
        'Document must match the rank and deployment requirements.',
    ];
};

const toMatrixRequirement = (title, priority = 'critical', source = 'rank') => ({
    id: `doc:${title}`,
    title,
    type: 'document',
    priority,
    source,
});

const getRankRequirements = (rank) => {
    if (!rank || !RANK_REQUIRED_DOCS[rank]) return [];
    return RANK_REQUIRED_DOCS[rank].map((title) => toMatrixRequirement(title, 'critical', 'rank'));
};

const getUniversalRequirements = () => {
    return UNIVERSAL_DOCUMENTS.map((title) => toMatrixRequirement(title, 'high', 'universal'));
};

const getConditionalDocumentRequirements = (settings) => {
    const requirements = [];

    if (settings?.identity?.double_nationality) {
        requirements.push(toMatrixRequirement('Passport 2', 'critical', 'conditional'));
    }

    if (settings?.visa?.has_visa) {
        requirements.push(toMatrixRequirement('Visa / Entry Permit', 'critical', 'conditional'));
    }

    return requirements;
};

const getStcwMatrixRequirements = (rank, settings) => {
    const all = [
        ...getUniversalRequirements(),
        ...getRankRequirements(rank),
        ...getConditionalDocumentRequirements(settings),
    ];

    // De-duplicate by id, preserving strongest priority.
    const byId = new Map();
    const priorityWeight = { critical: 3, high: 2, standard: 1 };

    for (const item of all) {
        const prev = byId.get(item.id);
        if (!prev) {
            byId.set(item.id, item);
            continue;
        }
        const prevW = priorityWeight[prev.priority] || 0;
        const curW = priorityWeight[item.priority] || 0;
        if (curW > prevW) byId.set(item.id, item);
    }

    return Array.from(byId.values());
};

const evaluateStcwMatrix = (rank, uploadedDocs, settings) => {
    const requirements = getStcwMatrixRequirements(rank, settings);
    const uploadedSet = new Set((uploadedDocs || []).map((d) => d.documentName));

    const missingDocuments = [];
    const missingCritical = [];

    requirements.forEach((req) => {
        if (req.type !== 'document') return;
        if (uploadedSet.has(req.title)) return;
        missingDocuments.push(req.title);
        if (req.priority === 'critical') missingCritical.push(req.title);
    });

    const profileChecks = PROFILE_REQUIREMENTS
        .filter((rule) => rule.isRequired(settings))
        .map((rule) => ({
            id: rule.id,
            title: rule.title,
            priority: rule.priority,
            complete: rule.isComplete(settings),
        }));

    const missingProfile = profileChecks.filter((c) => !c.complete).map((c) => c.title);

    const nowMs = Date.now();
    let expiring90 = 0;
    let expiring60 = 0;
    let expiring30 = 0;
    let expired = 0;

    (uploadedDocs || []).forEach((doc) => {
        if (!doc || !doc.expiryDate || doc.expiryDate === 'N/A') return;
        const expiryMs = new Date(doc.expiryDate).getTime();
        if (Number.isNaN(expiryMs)) return;

        const days = Math.ceil((expiryMs - nowMs) / 86400000);
        if (days < 0) {
            expired += 1;
            return;
        }
        if (days <= 90) expiring90 += 1;
        if (days <= 60) expiring60 += 1;
        if (days <= 30) expiring30 += 1;
    });

    const blockers = [...missingCritical, ...missingProfile];

    return {
        requirements,
        profileChecks,
        missingDocuments,
        missingCritical,
        missingProfile,
        blockers,
        compliant: blockers.length === 0,
        certificationWindow: {
            expired,
            expiring90,
            expiring60,
            expiring30,
        },
    };
};

module.exports = {
    UNIVERSAL_DOCUMENTS,
    PROFILE_REQUIREMENTS,
    getDocumentRules,
    getStcwMatrixRequirements,
    evaluateStcwMatrix,
};
