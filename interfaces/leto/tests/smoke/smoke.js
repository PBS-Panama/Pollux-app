// PBS Crewing Module — Pollux smoke test (R3b, extended in R5 and R8)
//
// Runs in a throwaway official Playwright container (nothing installed on
// the host, no paid service): logs in as the local demo company account and
// walks Board / Discover / the real Add to Roster flow (R5, reverted after)
// / MyFleet / a seafarer profile (new + old URL) / Calendar / Library /
// Settings / a real en->es->pt->en language switch (R8) / admin, failing on
// console errors, uncaught page errors, 4xx/5xx from our own origin, or a
// blank page.
//
// Credentials come ONLY from environment variables — never hardcoded here,
// never printed to stdout/screenshots beyond what the app itself renders.
// See ../../../docs/handover/notas-pendientes-2026-09-28.md for how to run
// this (the actual demo values are NOT written there either — they already
// exist as the local dev seed in backend/app/db/seeds.py).
//
// Required env vars:
//   PBS_SMOKE_BASE_URL       e.g. http://localhost:4001
//   PBS_SMOKE_COMPANY_NAME   the demo company's name (as seeded)
//   PBS_SMOKE_COMPANY_EMAIL  the demo company user's email
//   PBS_SMOKE_COMPANY_PASSWORD
//   PBS_SMOKE_ADMIN_EMAIL    admin account (ADMIN_SEED_EMAIL in .env) —
//                            /admin/'s auto-auth only accepts an existing
//                            admin-role session; without a real one it falls
//                            back to a deliberately stale dev password
//                            (App.tsx) that fails closed (401/403), so admin
//                            needs its own top-level /login pass first.
//   PBS_SMOKE_ADMIN_PASSWORD
// Optional:
//   PBS_SMOKE_OUT_DIR        where to write screenshots (default ./output,
//                            gitignored — see tests/smoke/.gitignore)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.PBS_SMOKE_BASE_URL || 'http://localhost:4001';
const COMPANY_NAME = process.env.PBS_SMOKE_COMPANY_NAME;
const COMPANY_EMAIL = process.env.PBS_SMOKE_COMPANY_EMAIL;
const COMPANY_PASSWORD = process.env.PBS_SMOKE_COMPANY_PASSWORD;
const ADMIN_EMAIL = process.env.PBS_SMOKE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PBS_SMOKE_ADMIN_PASSWORD;
const OUT_DIR = process.env.PBS_SMOKE_OUT_DIR || path.join(__dirname, 'output');

// El flujo de Add to Roster ESCRIBE datos reales (hire + revert) — nunca
// correr esto contra nada que no sea un stack local. Un typo en
// PBS_SMOKE_BASE_URL no puede terminar contratando/dando de baja gente en
// una base real.
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
try {
    const { hostname } = new URL(BASE_URL);
    if (!LOCAL_HOSTNAMES.has(hostname)) {
        console.error(`PBS_SMOKE_BASE_URL apunta a "${hostname}", no a localhost/127.0.0.1. Este script escribe datos reales (hire/baja) — me niego a correr contra un host que no sea local.`);
        process.exit(2);
    }
} catch {
    console.error(`PBS_SMOKE_BASE_URL invalida: "${BASE_URL}".`);
    process.exit(2);
}

if (!COMPANY_NAME || !COMPANY_EMAIL || !COMPANY_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Faltan PBS_SMOKE_COMPANY_NAME / PBS_SMOKE_COMPANY_EMAIL / PBS_SMOKE_COMPANY_PASSWORD / PBS_SMOKE_ADMIN_EMAIL / PBS_SMOKE_ADMIN_PASSWORD en el entorno.');
    process.exit(2);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const ownOrigin = new URL(BASE_URL).origin;
const results = [];
let currentPageErrors = null;

const isOwnRequest = (url) => {
    try { return new URL(url).origin === ownOrigin; } catch { return false; }
};

const attachListeners = (page) => {
    page.on('console', (msg) => {
        if (msg.type() === 'error' && currentPageErrors) {
            currentPageErrors.push(`console.error: ${msg.text()}`);
        }
    });
    page.on('pageerror', (err) => {
        if (currentPageErrors) currentPageErrors.push(`pageerror: ${err.message}`);
    });
    page.on('response', (res) => {
        if (currentPageErrors && res.status() >= 400 && isOwnRequest(res.url())) {
            currentPageErrors.push(`HTTP ${res.status()}: ${res.url()}`);
        }
    });
};

const checkNotBlank = async (page) => {
    const elementCount = await page.evaluate(() => document.body.querySelectorAll('*').length);
    return elementCount > 10;
};

const visit = async (page, { name, url, waitMs = 1500, screenshotName }) => {
    currentPageErrors = [];
    let navError = null;
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(waitMs);
    } catch (err) {
        navError = err.message;
    }
    const notBlank = navError ? false : await checkNotBlank(page).catch(() => false);
    const screenshotPath = path.join(OUT_DIR, `${screenshotName || name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    const errors = [...currentPageErrors];
    if (navError) errors.unshift(`navigation error: ${navError}`);
    if (!navError && !notBlank) errors.push('pantalla en blanco (menos de 10 elementos en el DOM)');

    const passed = errors.length === 0;
    results.push({ name, url, passed, errors, screenshot: screenshotPath });
    console.log(`${passed ? 'OK  ' : 'FAIL'} ${name.padEnd(28)} ${url}`);
    if (!passed) {
        errors.forEach((e) => console.log(`       - ${e}`));
    }
    return { passed, page };
};

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    attachListeners(page);

    // ─── Login (real JWT flow, /login on the landing app) ─────────────────
    currentPageErrors = [];
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'load', timeout: 20000 });
    await page.getByLabel('Nombre de empresa', { exact: true }).fill(COMPANY_NAME);
    await page.getByLabel('Usuario', { exact: true }).fill(COMPANY_EMAIL);
    await page.getByLabel('Contraseña', { exact: true }).fill(COMPANY_PASSWORD);
    await Promise.all([
        page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => null),
        page.getByRole('button', { name: 'Ingresar' }).click(),
    ]);
    await page.waitForTimeout(1500);
    const loginOk = page.url().includes('/dashboard');
    await page.screenshot({ path: path.join(OUT_DIR, 'login-dashboard.png'), fullPage: true }).catch(() => {});
    results.push({ name: 'login', url: `${BASE_URL}/login`, passed: loginOk, errors: loginOk ? [] : [`no llegó a /dashboard, quedó en ${page.url()}`] });
    console.log(`${loginOk ? 'OK  ' : 'FAIL'} login                        -> ${page.url()}`);
    if (!loginOk) {
        console.error('Login falló, no tiene sentido seguir — abortando el resto del smoke test.');
        await browser.close();
        printSummaryAndExit();
        return;
    }

    // ─── Board (default company route) ─────────────────────────────────────
    await visit(page, { name: 'board', url: `${BASE_URL}/company/#/company-dashboard` });

    // ─── Discover (Crew Database) — also used to grab a real seafarer id ───
    await visit(page, { name: 'discover', url: `${BASE_URL}/company/#/company-crewdb` });
    let seafarerId = null;
    try {
        const firstCard = page.locator('a[href*="#/seafarer/"], [href*="#/seafarer/"]').first();
        const href = await firstCard.getAttribute('href', { timeout: 5000 });
        if (href) {
            const m = href.match(/#\/seafarer\/([^/?"]+)/);
            if (m) seafarerId = m[1];
        }
    } catch { /* no card rendered — reported as a failure on the discover step's blank/error checks already */ }

    // ─── Add to Roster (R5: wired to the real POST /company/staff) ────────
    // The detail panel auto-selects the same seafarer `seafarerId` came from
    // (first item), so no extra click is needed to line them up. Reverts the
    // test hire afterwards via the same PATCH status=ended MyFleet's "Dar de
    // baja" uses — never a raw DB write.
    let addToRosterOk = false;
    const addToRosterErrors = [];
    if (seafarerId) {
        currentPageErrors = [];
        try {
            const hireButton = page.getByRole('button', { name: 'Agregar a mi personal' });
            await hireButton.waitFor({ state: 'visible', timeout: 5000 });
            await hireButton.click();
            await page.waitForFunction(() => Array.from(document.querySelectorAll('button'))
                .some((b) => b.textContent && b.textContent.trim() === 'Ya en tu personal'), { timeout: 10000 });
            await page.screenshot({ path: path.join(OUT_DIR, 'add-to-roster.png'), fullPage: true }).catch(() => {});
            addToRosterOk = true;
        } catch (err) {
            addToRosterErrors.push('flujo Add to Roster: ' + err.message);
        }
        addToRosterErrors.push(...currentPageErrors);

        try {
            await page.evaluate(async (sfId) => {
                const raw = localStorage.getItem('pollux-auth');
                const token = raw && JSON.parse(raw)?.state?.accessToken;
                if (!token) throw new Error('no token');
                const headers = { Authorization: 'Bearer ' + token };
                const res = await fetch('/api/company/staff', { headers });
                const data = await res.json();
                const rel = (data.items || []).find((s) => s.seafarer_id === sfId && s.status === 'active');
                if (!rel) throw new Error('no se encontro la relacion activa a revertir');
                const patchRes = await fetch('/api/company/staff/' + rel.id, {
                    method: 'PATCH',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'ended' }),
                });
                if (!patchRes.ok) throw new Error('revert fallo: HTTP ' + patchRes.status);
            }, seafarerId);
        } catch (err) {
            addToRosterErrors.push('no se pudo deshacer el dato de prueba: ' + err.message);
            addToRosterOk = false;
        }
    } else {
        addToRosterErrors.push('no se encontró id de marino real para probar Add to Roster');
    }
    const addToRosterPassed = addToRosterOk && addToRosterErrors.length === 0;
    results.push({ name: 'add-to-roster', url: `${BASE_URL}/company/#/company-crewdb`, passed: addToRosterPassed, errors: addToRosterErrors });
    console.log(`${addToRosterPassed ? 'OK  ' : 'FAIL'} add-to-roster`);
    if (!addToRosterPassed) addToRosterErrors.forEach((e) => console.log(`       - ${e}`));

    // ─── MyFleet ────────────────────────────────────────────────────────────
    await visit(page, { name: 'myfleet', url: `${BASE_URL}/company/#/my-fleet` });

    // ─── Seafarer profile — new URL and the old Stremio-shaped one ─────────
    if (seafarerId) {
        await visit(page, { name: 'seafarer-profile-new-url', url: `${BASE_URL}/company/#/seafarer/${seafarerId}` });
        await visit(page, { name: 'seafarer-profile-old-url', url: `${BASE_URL}/company/#/metadetails/crew/${seafarerId}` });
    } else {
        results.push({ name: 'seafarer-profile-new-url', url: null, passed: false, errors: ['no se encontró ningún link #/seafarer/{id} en Discover para probar'] });
        results.push({ name: 'seafarer-profile-old-url', url: null, passed: false, errors: ['idem — sin id no se pudo armar la URL vieja'] });
        console.log('FAIL seafarer-profile-new-url    (sin id de marino real para probar)');
        console.log('FAIL seafarer-profile-old-url    (sin id de marino real para probar)');
    }

    // ─── Calendar / Library / Settings ──────────────────────────────────────
    await visit(page, { name: 'calendar', url: `${BASE_URL}/company/#/company-calendar` });
    await visit(page, { name: 'library', url: `${BASE_URL}/company/#/myfiles` });
    await visit(page, { name: 'settings', url: `${BASE_URL}/company/#/settings` });

    // ─── Language switch en/es/pt (R8: useProfile.js replaced CoreTransport's
    // Ctx/UpdateSettings) — checks the sidebar's "Crew Database" nav label,
    // which has a distinct real value in all 3 catalogs, visits an invalid
    // route (NotFound, R11) in each language, and scans the whole page for
    // any raw ALL_CAPS_KEY leaking through unresolved. Leaves the language
    // back on English at the end (repeatable, no leftover state).
    const RAW_KEY_PATTERN = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
    const EXPECTED_CREW_DB_LABEL = { English: 'Crew Database', 'español': 'Base de Tripulantes', 'português Brazil': 'Base de Tripulação' };
    const EXPECTED_NOT_FOUND_MESSAGE = { English: 'We couldn\'t find this page.', 'español': 'No encontramos esta página.', 'português Brazil': 'Não encontramos esta página.' };
    const languageErrors = [];
    currentPageErrors = [];
    try {
        const switchTo = async (from, to) => {
            await page.getByText(from, { exact: true }).click();
            await page.waitForTimeout(300);
            await page.getByText(to, { exact: true }).click();
            await page.waitForTimeout(600);
            const bodyText = await page.locator('body').innerText();
            if (!bodyText.includes(EXPECTED_CREW_DB_LABEL[to])) {
                languageErrors.push(`tras cambiar a "${to}", no se encontró "${EXPECTED_CREW_DB_LABEL[to]}" en la página`);
            }
            const rawKeys = [...new Set(bodyText.match(RAW_KEY_PATTERN) || [])];
            if (rawKeys.length > 0) {
                languageErrors.push(`claves sin traducir visibles en "${to}": ${rawKeys.join(', ')}`);
            }
            await page.screenshot({ path: path.join(OUT_DIR, `settings-lang-${to.replace(/\s+/g, '-')}.png`), fullPage: true }).catch(() => {});

            // NotFound (R11) en este idioma
            await page.goto(`${BASE_URL}/company/#/this-route-does-not-exist`, { waitUntil: 'load' });
            await page.waitForTimeout(600);
            const notFoundText = await page.locator('body').innerText();
            if (!notFoundText.includes('404') || !notFoundText.includes(EXPECTED_NOT_FOUND_MESSAGE[to])) {
                languageErrors.push(`NotFound en "${to}": no se encontró "404" + "${EXPECTED_NOT_FOUND_MESSAGE[to]}"`);
            }
            const notFoundRawKeys = [...new Set(notFoundText.match(RAW_KEY_PATTERN) || [])];
            if (notFoundRawKeys.length > 0) {
                languageErrors.push(`NotFound en "${to}": claves sin traducir: ${notFoundRawKeys.join(', ')}`);
            }
            await page.screenshot({ path: path.join(OUT_DIR, `notfound-${to.replace(/\s+/g, '-')}.png`), fullPage: true }).catch(() => {});

            // Volver a Settings para el próximo switchTo
            await page.goto(`${BASE_URL}/company/#/settings`, { waitUntil: 'load' });
            await page.waitForTimeout(600);
        };
        await switchTo('English', 'español');
        await switchTo('español', 'português Brazil');
        await switchTo('português Brazil', 'English');
    } catch (err) {
        languageErrors.push('flujo de cambio de idioma: ' + err.message);
    }
    languageErrors.push(...currentPageErrors);
    const languagePassed = languageErrors.length === 0;
    results.push({ name: 'language-switch', url: `${BASE_URL}/company/#/settings`, passed: languagePassed, errors: languageErrors });
    console.log(`${languagePassed ? 'OK  ' : 'FAIL'} language-switch`);
    if (!languagePassed) languageErrors.forEach((e) => console.log(`       - ${e}`));

    // ─── Admin (separate container) — needs its own admin-role session ────
    // /admin/'s auto-auth (App.tsx) only accepts an EXISTING admin-role
    // token in the shared `pollux-auth` storage; the company session above
    // doesn't qualify (wrong role), so it'd fall back to a deliberately
    // stale dev password that fails closed (401/403) — a fresh context +
    // real /login as the admin account first, same as a real admin would.
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const adminPage = await adminContext.newPage();
    attachListeners(adminPage);
    currentPageErrors = [];
    await adminPage.goto(`${BASE_URL}/login`, { waitUntil: 'load', timeout: 20000 });
    await adminPage.getByLabel('Nombre de empresa', { exact: true }).fill('N/A');
    await adminPage.getByLabel('Usuario', { exact: true }).fill(ADMIN_EMAIL);
    await adminPage.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
    await Promise.all([
        adminPage.waitForURL('**/admin**', { timeout: 15000 }).catch(() => null),
        adminPage.getByRole('button', { name: 'Ingresar' }).click(),
    ]);
    await adminPage.waitForTimeout(1000);
    await visit(adminPage, { name: 'admin', url: `${BASE_URL}/admin/` });
    await adminContext.close();

    await browser.close();
    printSummaryAndExit();
})().catch((err) => {
    console.error('El smoke test se cayó de forma inesperada:', err);
    process.exit(2);
});

function printSummaryAndExit() {
    const failed = results.filter((r) => !r.passed);
    console.log('\n──────── Resumen ────────');
    results.forEach((r) => console.log(`${r.passed ? 'OK  ' : 'FAIL'} ${r.name}`));
    console.log(`${results.length - failed.length}/${results.length} pantallas OK. Screenshots en ${OUT_DIR}`);
    process.exit(failed.length > 0 ? 1 : 0);
}
