#!/usr/bin/env node

// Copyright (C) 2017-2023 Smart code 203358507

const HASHED_CACHE = 31536000; // scripts/ and styles/: name changes with content
const HTTP_PORT = parseInt(process.env.PORT) || 8080;

const express = require('express');
const path = require('path');

const build_path = path.resolve(__dirname, 'build');
const index_path = path.join(build_path, 'index.html');

express().use(express.static(build_path, {
    setHeaders: (res, path) => {
        // index.html must revalidate: each deploy publishes new bundle names and removes the
        // old ones, so a cached index would point at files that no longer exist.
        if (path === index_path) res.set('cache-control', 'no-cache');
        // Only content-hashed bundles may be immutable. Images/fonts/favicons/manifest keep
        // their plain names, so they must revalidate (ETag → cheap 304), never be pinned.
        else if (/[\\/](scripts|styles)[\\/][^\\/]+\.[0-9a-f]{8,}\.(js|css)(\.map)?$/.test(path)) {
            res.set('cache-control', `public, max-age=${HASHED_CACHE}, immutable`);
        } else res.set('cache-control', 'no-cache');
    }
})).all('*', (_req, res) => {
    // TODO: better 404 page
    res.status(404).send('<h1>404! Page not found</h1>');
}).listen(HTTP_PORT, () => console.info(`Server listening on port: ${HTTP_PORT}`));
