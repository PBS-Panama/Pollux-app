// PBS Crewing Module - Vite dev server config (dev only, webpack handles production)

const path = require('path');
const fs = require('fs');
const { defineConfig, transformWithOxc } = require('vite');
const react = require('@vitejs/plugin-react');
const { default: commonjs } = require('vite-plugin-commonjs');
const packageJson = require('./package.json');

// ─── Custom plugin: Less CSS Modules ────────────────────────────────
// The project uses .less files as CSS Modules (not .module.less).
// Uses resolveId + load hooks with virtual modules so Vite's built-in
// vite:css plugin doesn't also try to process the .less files.
function lessCssModulesPlugin() {
    let lessCompiler;
    const postcssLib = require('postcss');
    const crypto = require('crypto');
    const projectRoot = __dirname;
    // Virtual prefix with .js suffix so vite:css doesn't try to process as Less
    const VIRTUAL_PREFIX = '\0less-module:';
    const VIRTUAL_SUFFIX = '.js';

    // Aliases must match resolve.alias — longest first for prefix matching
    const aliases = [
        ['stremio-router', path.resolve(projectRoot, 'src', 'router')],
        ['stremio', path.resolve(projectRoot, 'src')],
    ];

    function resolveTildeImport(pkg) {
        for (const [alias, target] of aliases) {
            if (pkg === alias || pkg.startsWith(alias + '/')) {
                return (target + pkg.slice(alias.length)).replace(/\\/g, '/');
            }
        }
        return path.resolve(projectRoot, 'node_modules', pkg).replace(/\\/g, '/');
    }

    // Scope class names in CSS selectors using postcss (no file following)
    function scopeClassNames(css, filename) {
        const classMap = {};
        const root = postcssLib.parse(css);
        root.walkRules((rule) => {
            rule.selector = rule.selector.replace(/\.([a-zA-Z_][\w-]*)/g, (match, name) => {
                if (!classMap[name]) {
                    const h = crypto.createHash('md5')
                        .update(filename + name).digest('base64url').slice(0, 5);
                    classMap[name] = `${name}-${h}`;
                }
                return '.' + classMap[name];
            });
        });
        return { css: root.toString(), classNames: classMap };
    }

    return {
        name: 'less-css-modules',
        enforce: 'pre',

        async buildStart() {
            lessCompiler = require('less');
        },

        // Intercept .less imports and redirect to virtual module IDs
        // ending in .js so vite:css doesn't process them
        async resolveId(source, importer, options) {
            if (source.startsWith(VIRTUAL_PREFIX)) return source;
            if (importer && importer.includes('node_modules') && !importer.startsWith(VIRTUAL_PREFIX)) return null;

            // Let Vite's default resolver handle alias + extension resolution
            const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
            if (!resolved || resolved.external) return null;

            // Redirect src .less files to virtual JS modules
            if (resolved.id.endsWith('.less') && !resolved.id.includes('node_modules')) {
                return VIRTUAL_PREFIX + resolved.id + VIRTUAL_SUFFIX;
            }
            return null;
        },

        async load(id) {
            if (!id.startsWith(VIRTUAL_PREFIX)) return null;
            const realPath = id.slice(VIRTUAL_PREFIX.length, -VIRTUAL_SUFFIX.length);

            try {
                const fileContent = fs.readFileSync(realPath, 'utf-8');

                // Strip CSS Modules :import() blocks (not valid Less syntax)
                const stripped = fileContent.replace(
                    /:import\([^)]*\)\s*\{[^}]*\}/g, ''
                );

                // Resolve ~ imports inside quoted strings only (not CSS ~ sibling selectors)
                const processed = stripped.replace(
                    /(?<=["'])~(@?[^/'";\s]+)/g,
                    (_, pkg) => resolveTildeImport(pkg)
                );

                // Compile Less → CSS
                const lessResult = await lessCompiler.render(processed, {
                    filename: realPath,
                    math: 'strict',
                    paths: [
                        path.dirname(realPath),
                        path.resolve(projectRoot, 'src'),
                        path.resolve(projectRoot, 'node_modules'),
                    ],
                });

                // Scope class names in selectors (replaces postcss-modules)
                const { css: scopedCss, classNames } = scopeClassNames(lessResult.css, realPath);

                // Return JS module: inject CSS + export class mapping
                const cssText = scopedCss.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
                return `
const __css = \`${cssText}\`;
const __style = document.createElement('style');
__style.setAttribute('data-vite-dev', ${JSON.stringify(path.basename(realPath))});
__style.textContent = __css;
document.head.appendChild(__style);
const __classNames = ${JSON.stringify(classNames)};
export default __classNames;
`;
            } catch (err) {
                console.error(`[less-css-modules] Error processing ${realPath}:`, err.message);
                // Fallback: return identity proxy so the app doesn't crash
                return `
const handler = { get: (_, key) => typeof key === 'string' ? key : undefined };
export default new Proxy({}, handler);
`;
            }
        },
    };
}

// ─── Custom plugin: JSX in .js files ─────────────────────────────────
// Vite 8 uses OXC which only enables JSX parsing for .jsx/.tsx files.
// This plugin transforms .js files with JSX before OXC sees them.
function jsxInJsPlugin() {
    return {
        name: 'jsx-in-js',
        enforce: 'pre',
        async transform(code, id) {
            if (!id.endsWith('.js') || id.includes('node_modules')) return null;
            // Only transform files that actually contain JSX
            if (!code.includes('<') || !/<[A-Z]|<[a-z]+[\s/>]/.test(code)) return null;
            return await transformWithOxc(code, id, { lang: 'jsx' });
        },
    };
}

// ─── Custom plugin: CJS require fixups ───────────────────────────────
// Fixes two patterns before vite-plugin-commonjs processes them:
// 1. bare require('polyfill'); → import 'polyfill'; (avoids false default import)
// 2. const { default: X } = require('...') → const X = require('...')
//    (vite-plugin-commonjs already extracts .default, so destructuring it
//    double-extracts and returns undefined)
function requireFixupsPlugin() {
    return {
        name: 'require-fixups',
        enforce: 'pre',
        transform(code, id) {
            if (!id.endsWith('.js') || id.includes('node_modules')) return null;
            let newCode = code;
            // Fix 1: bare require() → side-effect import
            newCode = newCode.replace(
                /^\s*require\(\s*(['"])([^'"]+)\1\s*\)\s*;?\s*$/gm,
                (_, q, pkg) => `import '${pkg}';`
            );
            // Fix 2: const { default: X } = require('...') → const X = require('...')
            newCode = newCode.replace(
                /const\s+\{\s*default\s*:\s*(\w+)\s*\}\s*=\s*(require\([^)]+\))/g,
                'const $1 = $2'
            );
            if (newCode === code) return null;
            return { code: newCode, map: null };
        },
    };
}

// ─── Custom plugin: CJS named exports ────────────────────────────────
// vite-plugin-commonjs converts require() → import but doesn't generate
// named exports from module.exports = { A, B }. TSX files that use
// import { A } from '...' need named exports. This plugin adds them.
function cjsNamedExportsPlugin() {
    return {
        name: 'cjs-named-exports',
        enforce: 'pre',
        transform(code, id) {
            if (!id.endsWith('.js') || id.includes('node_modules')) return null;
            if (!code.includes('module.exports')) return null;

            // Match: module.exports = { A, B, C: val, ... };
            const match = code.match(/module\.exports\s*=\s*\{([\s\S]*?)\}\s*;?\s*$/m);
            if (!match) return null;

            const propNames = match[1]
                .split(',')
                .map(s => s.trim().match(/^(\w+)/))
                .filter(m => m)
                .map(m => m[1]);

            if (propNames.length === 0) return null;

            // Replace module.exports with __exports + export default + named exports
            let newCode = code.replace(
                /module\.exports\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/m,
                'const __exports = $1;\nexport default __exports;'
            );
            for (const name of propNames) {
                // If the name already exists as a variable (shorthand or destructured),
                // use export { name }. Otherwise use export const for computed properties.
                const directDecl = new RegExp(`\\b(?:const|let|var|function)\\s+${name}\\b`).test(code);
                const destructuredDecl = new RegExp(`\\b(?:const|let|var)\\s+\\{[^}]*\\b${name}\\b[^}]*\\}`).test(code);
                const isDeclared = directDecl || destructuredDecl;
                if (isDeclared) {
                    newCode += `\nexport { ${name} };`;
                } else {
                    newCode += `\nexport const ${name} = __exports.${name};`;
                }
            }
            return { code: newCode, map: null };
        },
    };
}

// ─── Custom plugin: Buffer polyfill ─────────────────────────────────
function bufferPolyfillPlugin() {
    return {
        name: 'buffer-polyfill',
        transformIndexHtml() {
            return [
                {
                    tag: 'script',
                    attrs: { type: 'module' },
                    children: "import { Buffer } from 'buffer'; window.Buffer = Buffer;",
                    injectTo: 'head-prepend',
                },
            ];
        },
    };
}

module.exports = defineConfig({
    plugins: [
        requireFixupsPlugin(),
        cjsNamedExportsPlugin(),
        jsxInJsPlugin(),
        lessCssModulesPlugin(),
        commonjs(),
        react.default(),
        bufferPolyfillPlugin(),
    ],

    resolve: {
        alias: {
            'stremio': path.resolve(__dirname, 'src'),
            'stremio-router': path.resolve(__dirname, 'src', 'router'),
        },
        extensions: ['.tsx', '.ts', '.js', '.json', '.less', '.wasm'],
    },

    // Serve assets/ as static files (flags, images, favicons)
    publicDir: 'assets',

    server: {
        port: 5173,
        host: '0.0.0.0',
        open: true,
    },

    // Map process.env variables used throughout the codebase
    define: {
        'process.env.SENTRY_DSN': 'null',
        'process.env.SERVICE_WORKER_DISABLED': '"true"',
        'process.env.DEBUG': '"true"',
        'process.env.VERSION': JSON.stringify(packageJson.version),
        'process.env.COMMIT_HASH': '"dev"',
        'process.env.NODE_ENV': '"development"',
    },

    // Pre-bundle CJS dependencies (comprehensive list avoids on-the-fly optimization issues)
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-dom/client',
            'classnames',
            'prop-types',
            'i18next',
            'react-i18next',
            'bowser',
            'buffer',
            'eventemitter3',
            'spatial-navigation-polyfill',
            'stremio-translations',
            '@stremio/stremio-icons/react',
            'fast-equals',
            'langs',
            'lodash.debounce',
            'lodash.intersection',
            'lodash.throttle',
            'magnet-uri',
            'react-focus-lock',
            'react-is',
            'url',
            '@sentry/browser',
            'a-color-picker',
            'filter-invalid-dom-props',
            'hat',
            'use-long-press',
        ],
    },
});
