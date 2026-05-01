// Leto Crewing Module: Server-side compliance engine
// Node-compatible mirror of src/common/stcwMatrix.js + src/common/crewDocData.js
// Used by the Express server to compute per-seafarer compliance summaries
// that the company/recruiter Crew Database consumes.

const UNIVERSAL_DOCS = [
    "Seaman's Book",
    'National ID Card',
    'Passport',
    'STCW Certificate',
    'Seaman Identity Document (SID)',
    'Flag State Medical Certificate',
    'Drug & Alcohol Test',
    'Eyesight Test Certificate',
    'IMO 1.19 \u2014 Proficiency in Personal Survival Techniques',
    'IMO 1.20 \u2014 Fire Prevention and Fire Fighting',
    'IMO 1.21 \u2014 Personal Safety and Social Responsibilities',
    'IMO 1.14 \u2014 Medical First Aid',
    'IMO 3.27 \u2014 Security Awareness Training for All Seafarers',
];

const RANK_REQUIRED_DOCS = {
    master: [
        ...UNIVERSAL_DOCS,
        'Flag State CoC',
        'Endorsement of Recognition',
        'IMO 1.07 \u2014 Radar Navigation at Operational Level',
        'IMO 1.08 \u2014 Radar Navigation at Management Level (Radar, ARPA, Bridge Teamwork & SAR)',
        'IMO 1.15 \u2014 Medical Care',
        'IMO 1.22 \u2014 Bridge Resource Management (BRM)',
        'IMO 1.23 \u2014 Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)',
        "IMO 1.25 \u2014 General Operator's Certificate for GMDSS",
        'IMO 1.27 \u2014 Operational Use of ECDIS',
        'IMO 1.29 \u2014 Proficiency in Crisis Management and Human Behavior Training',
        'IMO 1.39 \u2014 Leadership & Teamwork',
        'IMO 1.40 \u2014 Use of Leadership and Managerial Skills',
        'IMO 2.03 \u2014 Advanced Training in Fire Fighting',
        'IMO 3.19 \u2014 Ship Security Officer (SSO)',
        'IMO 7.01 \u2014 Master and Chief Mate',
    ],
    'chief-officer': [
        ...UNIVERSAL_DOCS,
        'Flag State CoC',
        'Endorsement of Recognition',
        'IMO 1.07 \u2014 Radar Navigation at Operational Level',
        'IMO 1.22 \u2014 Bridge Resource Management (BRM)',
        'IMO 1.23 \u2014 Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)',
        "IMO 1.25 \u2014 General Operator's Certificate for GMDSS",
        'IMO 1.27 \u2014 Operational Use of ECDIS',
        'IMO 1.39 \u2014 Leadership & Teamwork',
        'IMO 2.03 \u2014 Advanced Training in Fire Fighting',
        'IMO 7.01 \u2014 Master and Chief Mate',
    ],
    '2nd-officer': [
        ...UNIVERSAL_DOCS,
        'Flag State CoC',
        'Endorsement of Recognition',
        'IMO 1.07 \u2014 Radar Navigation at Operational Level',
        'IMO 1.23 \u2014 Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)',
        'IMO 1.27 \u2014 Operational Use of ECDIS',
        'IMO 2.03 \u2014 Advanced Training in Fire Fighting',
    ],
    '3rd-officer': [
        ...UNIVERSAL_DOCS,
        'Flag State CoC',
        'Endorsement of Recognition',
        'IMO 1.23 \u2014 Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)',
        'IMO 1.27 \u2014 Operational Use of ECDIS',
        'IMO 2.03 \u2014 Advanced Training in Fire Fighting',
    ],
    'chief-engineer': [
        ...UNIVERSAL_DOCS,
        'Flag State CoC',
        'Endorsement of Recognition',
        'IMO 2.03 \u2014 Advanced Training in Fire Fighting',
        'IMO 7.02 \u2014 Chief Engineer Officer & Second Engineer Officer',
        'IMO 7.17 \u2014 Engine-Room Resource Management (ERM)',
        'High Voltage Operations',
    ],
    '2nd-engineer': [
        ...UNIVERSAL_DOCS,
        'Flag State CoC',
        'Endorsement of Recognition',
        'IMO 2.03 \u2014 Advanced Training in Fire Fighting',
        'IMO 7.02 \u2014 Chief Engineer Officer & Second Engineer Officer',
    ],
    electrician: [
        ...UNIVERSAL_DOCS,
        'Flag State CoC',
        'IMO 2.03 \u2014 Advanced Training in Fire Fighting',
        'IMO 7.08 \u2014 Electro-Technical Officer (ETO)',
        'High Voltage Operations',
    ],
    bosun: [...UNIVERSAL_DOCS, 'IMO 7.10 \u2014 Ratings as Able Seafarer Deck'],
    ab: [...UNIVERSAL_DOCS, 'IMO 7.10 \u2014 Ratings as Able Seafarer Deck'],
    cook: [...UNIVERSAL_DOCS, 'IMO 3.27 \u2014 Security Awareness Training for All Seafarers'],
};

const PROFILE_CHECKS = [
    { id: 'nationality-primary', title: 'Primary nationality set', required: () => true, complete: (s) => Boolean(s?.identity?.nationality_primary) },
    { id: 'passport-1-number', title: 'Passport 1 number set', required: () => true, complete: (s) => Boolean(s?.identity?.passport_1?.number) },
    { id: 'departure-airport', title: 'Departure airport set', required: () => true, complete: (s) => Boolean(s?.travel?.departure_airport_iata) },
    { id: 'nationality-secondary', title: 'Secondary nationality set', required: (s) => Boolean(s?.identity?.double_nationality), complete: (s) => Boolean(s?.identity?.nationality_secondary) },
    { id: 'passport-2-number', title: 'Passport 2 number set', required: (s) => Boolean(s?.identity?.double_nationality), complete: (s) => Boolean(s?.identity?.passport_2?.number) },
    { id: 'visa-link-passport', title: 'Visa linked to a passport', required: (s) => Boolean(s?.visa?.has_visa), complete: (s) => ['passport_1', 'passport_2'].includes(s?.visa?.linked_passport) },
    { id: 'visa-link-consistency', title: 'Visa-passport linking consistent with double nationality', required: (s) => Boolean(s?.visa?.has_visa) && s?.visa?.linked_passport === 'passport_2', complete: (s) => Boolean(s?.identity?.double_nationality) },
];

// Compute compliance summary for a seafarer given their rank, uploaded docs, and settings.
function computeComplianceSummary(rank, uploadedDocs, settings) {
    const rankDocs = (rank && RANK_REQUIRED_DOCS[rank]) || [];
    const conditional = [];
    if (settings?.identity?.double_nationality) conditional.push('Passport 2');
    if (settings?.visa?.has_visa) conditional.push('Visa / Entry Permit');

    const requiredDocs = Array.from(new Set([...rankDocs, ...conditional]));
    const uploadedSet = new Set((uploadedDocs || []).map((d) => d.documentName));

    const missingDocs = requiredDocs.filter((t) => !uploadedSet.has(t));
    // Treat universal docs + conditional (passport 2 / visa) as "critical" for blockers.
    const criticalSet = new Set([...UNIVERSAL_DOCS, ...conditional]);
    const missingCritical = missingDocs.filter((t) => criticalSet.has(t));

    const profileChecks = PROFILE_CHECKS
        .filter((rule) => rule.required(settings || {}))
        .map((rule) => ({ id: rule.id, title: rule.title, complete: Boolean(rule.complete(settings || {})) }));
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
        if (days < 0) { expired += 1; return; }
        if (days <= 90) expiring90 += 1;
        if (days <= 60) expiring60 += 1;
        if (days <= 30) expiring30 += 1;
    });

    const totalRequired = requiredDocs.length;
    const totalUploaded = requiredDocs.length - missingDocs.length;
    const compliancePct = totalRequired > 0 ? Math.round((totalUploaded / totalRequired) * 100) : 100;

    // Build blockers with reason codes
    const blockers = [];
    missingCritical.slice(0, 10).forEach((t) => {
        blockers.push({ type: 'document', title: t, reason_code: 'DOC_MISSING', reason_detail: 'Required for rank, not yet uploaded.' });
    });
    (uploadedDocs || []).forEach((doc) => {
        if (!doc || !doc.expiryDate || doc.expiryDate === 'N/A') return;
        const expiryMs = new Date(doc.expiryDate).getTime();
        if (Number.isNaN(expiryMs)) return;
        if (expiryMs < nowMs && criticalSet.has(doc.documentName)) {
            blockers.push({ type: 'document', title: doc.documentName, reason_code: 'DOC_EXPIRED', reason_detail: `Expired on ${doc.expiryDate}.` });
        }
    });
    profileChecks.filter((c) => !c.complete).forEach((c) => {
        const code = c.id === 'visa-link-consistency' ? 'VISA_PASSPORT_MISMATCH' : 'PROFILE_INCOMPLETE';
        blockers.push({ type: 'profile', title: c.title, reason_code: code, reason_detail: '' });
    });

    return {
        rank,
        compliance_pct: compliancePct,
        required_total: totalRequired,
        uploaded_total: totalUploaded,
        missing_total: missingDocs.length,
        missing_critical_top3: missingCritical.slice(0, 3),
        certification_window: { expired, expiring_90: expiring90, expiring_60: expiring60, expiring_30: expiring30 },
        visa: {
            has_visa: Boolean(settings?.visa?.has_visa),
            country: settings?.visa?.country || '',
            linked_passport: settings?.visa?.linked_passport || '',
        },
        identity: {
            double_nationality: Boolean(settings?.identity?.double_nationality),
            nationality_primary: settings?.identity?.nationality_primary || '',
        },
        blockers,
        compliant: blockers.length === 0,
    };
}

module.exports = { computeComplianceSummary, RANK_REQUIRED_DOCS, UNIVERSAL_DOCS };
