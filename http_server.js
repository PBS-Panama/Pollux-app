#!/usr/bin/env node

// Leto Crewing Module — Production Server
// Serves static build + API routes for User Database

const INDEX_CACHE = 7200;
const ASSETS_CACHE = 2629744;
const HTTP_PORT = 8080;

const express = require('express');
const path = require('path');
const multer = require('multer');

const apiRoutes = require('./apiRoutes');

const build_path = path.resolve(__dirname, 'build');
const index_path = path.join(build_path, 'index.html');

const app = express();

// ─── Body Parsers ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Multer (memory storage for file uploads) ──────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

// Apply multer to the upload endpoint
app.post('/api/users/:userId/myfiles/upload', upload.single('file'));

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Static Files (build/) ──────────────────────────────────────────
app.use(express.static(build_path, {
    setHeaders: (res, filePath) => {
        if (filePath === index_path) res.set('cache-control', `public, max-age: ${INDEX_CACHE}`);
        else res.set('cache-control', `public, max-age: ${ASSETS_CACHE}`);
    }
}));

// ─── SPA Fallback ───────────────────────────────────────────────────
app.all('*', (_req, res) => {
    res.status(404).send('<h1>404! Page not found</h1>');
});

// ─── Start ──────────────────────────────────────────────────────────
app.listen(HTTP_PORT, () => {
    console.info(`PBS Crewing Module server listening on port: ${HTTP_PORT}`);
    console.info(`API available at http://localhost:${HTTP_PORT}/api/`);
    console.info('Storage: Firestore (JSON) + GCS bucket pb-leto-uploads (files)');
});
