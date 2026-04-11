// Leto Crewing Module: API Routes
// Express router for per-user data persistence (local filesystem)

const express = require('express');
const fs = require('fs');
const dm = require('./userDataManager');

const router = express.Router();

// ─── Middleware: validate page name ─────────────────────────────────
const validPage = (req, res, next) => {
    if (!dm.PAGE_FOLDERS.includes(req.params.page)) {
        return res.status(400).json({ error: `Invalid page: ${req.params.page}. Valid: ${dm.PAGE_FOLDERS.join(', ')}` });
    }
    next();
};

// ─── User Management ────────────────────────────────────────────────

// GET /api/users — list all user IDs
router.get('/users', async (_req, res) => {
    try {
        const users = await dm.listUsers();
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users/:userId/init — initialize data structure for a user
router.post('/users/:userId/init', async (req, res) => {
    try {
        const { userId } = req.params;
        await dm.ensureUserFolders(userId);
        res.json({ ok: true, userId, pages: dm.PAGE_FOLDERS });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Mobility Summary: bulk visa/nationality/passport readiness ─────
// GET /api/users/mobility-summary?ids=a,b,c
// Returns a compact map of user_id -> { has_visa, visa_country, visa_expiry,
//   double_nationality, nationality_primary, nationality_secondary,
//   passport_1_country, passport_1_expiry, passport_2_country, passport_2_expiry,
//   departure_airport_iata, linked_passport }
// Used by the recruiter Crew Database to apply mobility filters.
router.get('/users/mobility-summary', async (req, res) => {
    try {
        const raw = typeof req.query.ids === 'string' ? req.query.ids : '';
        const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
        const summary = {};
        for (const id of ids) {
            try {
                const data = await dm.readPageData(id, 'settings');
                summary[id] = {
                    has_visa: Boolean(data?.visa?.has_visa),
                    visa_country: data?.visa?.country || '',
                    visa_type: data?.visa?.type || '',
                    visa_expiry: data?.visa?.expiry_date || '',
                    linked_passport: data?.visa?.linked_passport || '',
                    double_nationality: Boolean(data?.identity?.double_nationality),
                    nationality_primary: data?.identity?.nationality_primary || '',
                    nationality_secondary: data?.identity?.nationality_secondary || '',
                    passport_1_country: data?.identity?.passport_1?.country || '',
                    passport_1_expiry: data?.identity?.passport_1?.expiry_date || '',
                    passport_2_country: data?.identity?.passport_2?.country || '',
                    passport_2_expiry: data?.identity?.passport_2?.expiry_date || '',
                    departure_airport_iata: data?.travel?.departure_airport_iata || '',
                };
            } catch {
                summary[id] = null;
            }
        }
        res.json({ summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Rank: store/retrieve user rank ─────────────────────────────────

// PATCH /api/users/:userId/settings/rank — set rank (called from Leto on registration)
router.patch('/users/:userId/settings/rank', async (req, res) => {
    try {
        const { userId } = req.params;
        const { rank } = req.body;
        if (!rank) return res.status(400).json({ error: 'rank is required' });
        const data = await dm.readPageData(userId, 'settings');
        data.rank = rank;
        await dm.writePageData(userId, 'settings', data);
        res.json({ ok: true, rank });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Generic Page Data (calendar, dashboard, myexams, settings) ─────


// GET /api/users/:userId/:page — read page data
router.get('/users/:userId/:page', validPage, async (req, res) => {
    try {
        const { userId, page } = req.params;
        const data = await dm.readPageData(userId, page);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/:userId/:page — full replace page data
router.put('/users/:userId/:page', validPage, async (req, res) => {
    try {
        const { userId, page } = req.params;
        const data = await dm.writePageData(userId, page, req.body);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/users/:userId/:page — merge partial data into page
router.patch('/users/:userId/:page', validPage, async (req, res) => {
    try {
        const { userId, page } = req.params;
        const data = await dm.mergePageData(userId, page, req.body);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── My Files: Document Upload ──────────────────────────────────────

// GET /api/users/:userId/myfiles/uploads — list uploaded documents
router.get('/users/:userId/myfiles/uploads', async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await dm.readPageData(userId, 'myfiles');
        res.json({ uploads: data.uploads || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users/:userId/myfiles/upload — upload a file
// Multer middleware is applied in http_server.js before this handler
router.post('/users/:userId/myfiles/upload', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { category, categoryLabel, documentName, issuedDate, expiryDate, validityYears } = req.body;
        if (!category || !documentName) {
            return res.status(400).json({ error: 'category and documentName are required' });
        }

        const docId = Date.now().toString();
        const savedName = await dm.saveUploadedFile(userId, docId, req.file.originalname, req.file.buffer);

        const docMeta = {
            id: docId,
            category: parseInt(category, 10),
            categoryLabel: categoryLabel || '',
            documentName,
            fileName: req.file.originalname,
            savedName,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: new Date().toISOString(),
            issuedDate: issuedDate || null,
            expiryDate: expiryDate || null,
            validityYears: validityYears ? parseInt(validityYears, 10) : null,
            status: 'uploaded',
        };

        await dm.addFileMetadata(userId, docMeta);
        res.status(201).json(docMeta);
    } catch (err) {
        console.error('Upload failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/users/:userId/myfiles/uploads/:docId — update document metadata (dates only)
router.patch('/users/:userId/myfiles/uploads/:docId', async (req, res) => {
    try {
        const { userId, docId } = req.params;
        const data = await dm.readPageData(userId, 'myfiles');
        const idx = (data.uploads || []).findIndex((d) => d.id === docId);
        if (idx === -1) return res.status(404).json({ error: 'Document not found' });

        const updates = req.body;
        if (updates.issuedDate !== undefined) data.uploads[idx].issuedDate = updates.issuedDate;
        if (updates.expiryDate !== undefined) data.uploads[idx].expiryDate = updates.expiryDate;
        if (updates.validityYears !== undefined) data.uploads[idx].validityYears = updates.validityYears;

        await dm.writePageData(userId, 'myfiles', data);
        res.json(data.uploads[idx]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/users/:userId/myfiles/uploads/:docId — remove a document
router.delete('/users/:userId/myfiles/uploads/:docId', async (req, res) => {
    try {
        const { userId, docId } = req.params;
        await dm.removeFileMetadata(userId, docId);
        res.json({ ok: true, deletedId: docId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/:userId/myfiles/download/:savedName — download a file from local storage
router.get('/users/:userId/myfiles/download/:savedName', (req, res) => {
    try {
        const { userId, savedName } = req.params;
        const filePath = dm.getUploadedFilePath(userId, savedName);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${savedName}"`);
        res.sendFile(filePath);
    } catch (err) {
        res.status(404).json({ error: 'File not found' });
    }
});

// POST /api/users/:userId/myfiles/rotate/:docId — rotate PDF pages
router.post('/users/:userId/myfiles/rotate/:docId', async (req, res) => {
    const { userId, docId } = req.params;
    const { direction } = req.body; // 'cw' or 'ccw'

    if (!direction || !['cw', 'ccw'].includes(direction)) {
        return res.status(400).json({ error: 'direction must be "cw" or "ccw"' });
    }

    try {
        const data = dm.readPageData(userId, 'myfiles');
        const doc = (data.uploads || []).find((d) => d.id === docId);
        if (!doc || !doc.savedName) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const filePath = dm.getUploadedFilePath(userId, doc.savedName);
        const buffer = fs.readFileSync(filePath);
        const { PDFDocument, degrees } = require('pdf-lib');
        const pdfDoc = await PDFDocument.load(buffer);
        const angle = direction === 'cw' ? 90 : -90;

        const pages = pdfDoc.getPages();
        for (const page of pages) {
            page.setRotation(degrees(page.getRotation().angle + angle));
        }

        const rotatedBytes = await pdfDoc.save();
        fs.writeFileSync(filePath, Buffer.from(rotatedBytes));

        res.json({ ok: true, docId, direction, pages: pages.length });
    } catch (err) {
        console.error('Rotate failed:', err);
        res.status(500).json({ error: 'Failed to rotate PDF: ' + err.message });
    }
});

// ─── Calendar: Availability & Confirmations ─────────────────────────

// POST /api/users/:userId/calendar/availability — add availability period
router.post('/users/:userId/calendar/availability', async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await dm.readPageData(userId, 'calendar');
        const period = {
            ...req.body,
            id: 'avl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        };
        data.availability.push(period);
        await dm.writePageData(userId, 'calendar', data);
        res.status(201).json(period);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/users/:userId/calendar/availability/:periodId
router.delete('/users/:userId/calendar/availability/:periodId', async (req, res) => {
    try {
        const { userId, periodId } = req.params;
        const data = await dm.readPageData(userId, 'calendar');
        data.availability = data.availability.filter((p) => p.id !== periodId);
        await dm.writePageData(userId, 'calendar', data);
        res.json({ ok: true, deletedId: periodId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users/:userId/calendar/confirm/:eventId — confirm interview
router.post('/users/:userId/calendar/confirm/:eventId', async (req, res) => {
    try {
        const { userId, eventId } = req.params;
        const data = await dm.readPageData(userId, 'calendar');
        if (!data.confirmedInterviews.includes(eventId)) {
            data.confirmedInterviews.push(eventId);
            await dm.writePageData(userId, 'calendar', data);
        }
        res.json({ ok: true, eventId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── My Exams: Bookings ─────────────────────────────────────────────

// POST /api/users/:userId/myexams/book — book an exam
router.post('/users/:userId/myexams/book', async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await dm.readPageData(userId, 'myexams');
        const booking = {
            ...req.body,
            id: 'exm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            bookedAt: Date.now(),
        };
        data.bookedExams.push(booking);
        await dm.writePageData(userId, 'myexams', data);
        res.status(201).json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/users/:userId/myexams/book/:examId — cancel an exam booking
router.delete('/users/:userId/myexams/book/:examId', async (req, res) => {
    try {
        const { userId, examId } = req.params;
        const data = await dm.readPageData(userId, 'myexams');
        data.bookedExams = data.bookedExams.filter((e) => e.id !== examId);
        await dm.writePageData(userId, 'myexams', data);
        res.json({ ok: true, deletedId: examId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
