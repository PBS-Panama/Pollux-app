# Leto — Naming Convention & Stremio Alias Migration

## Background

The crewing module is built on [Stremio Web](https://github.com/nickonometry/stremio-web-shell-linux) (GPLv2). The original codebase used `stremio` as a webpack path alias pointing to `./src/`. This alias appeared in ~150+ import statements across the project.

As of **2026-03-28 (branch `IDM`)**, all internal alias references have been renamed from `stremio` to `leto`.

## What changed

### Webpack aliases (`webpack.config.js`)

```js
// BEFORE
resolve: {
    alias: {
        'stremio': path.resolve(__dirname, 'src'),
        'stremio-router': path.resolve(__dirname, 'src', 'router')
    }
}

// AFTER
resolve: {
    alias: {
        'leto': path.resolve(__dirname, 'src'),
        'leto-router': path.resolve(__dirname, 'src', 'router')
    }
}
```

### TypeScript paths (`tsconfig.json`)

```json
// BEFORE
"paths": { "stremio/*": ["*"] }

// AFTER
"paths": { "leto/*": ["*"] }
```

### Import statements — JS (CommonJS)

```js
// BEFORE
const { Button } = require('stremio/components');
const api = require('stremio/common/apiClient');
const styles = require('stremio/routes/MetaDetails/styles');

// AFTER
const { Button } = require('leto/components');
const api = require('leto/common/apiClient');
const styles = require('leto/routes/MetaDetails/styles');
```

### Import statements — TypeScript (ESM)

```ts
// BEFORE
import { useServices } from 'stremio/services';
import { Button } from 'stremio/components';

// AFTER
import { useServices } from 'leto/services';
import { Button } from 'leto/components';
```

### Less imports

```less
// BEFORE
@import (reference) '~stremio/common/screen-sizes.less';
:import('~stremio/components/ModalDialog/styles.less') { ... }

// AFTER
@import (reference) '~leto/common/screen-sizes.less';
:import('~leto/components/ModalDialog/styles.less') { ... }
```

### Router alias

```js
// BEFORE
require('stremio-router/...')
import { useRouteFocused } from 'stremio-router';
declare module 'stremio-router';

// AFTER
require('leto-router/...')
import { useRouteFocused } from 'leto-router';
declare module 'leto-router';
```

## What did NOT change (npm packages)

These are external packages installed from npm. They cannot be renamed without forking:

| Package | Used for | Why it stays |
|---|---|---|
| `@stremio/stremio-colors` | Less color variables (`@color-surface-*`, etc.) | External npm package |
| `@stremio/stremio-icons` | Icon font (`.icon { name: 'chevron-back' }`) | External npm package |
| `stremio-translations` | i18n translation strings | External npm package |
| `@stremio/stremio-core-web` | Referenced in package.json (not actively loaded) | External npm package |

These appear in imports like:
```less
@import (reference) '~@stremio/stremio-colors/less/stremio-colors.less';
```
```js
const { default: Icon } = require('@stremio/stremio-icons/react');
```

The `@stremio/` prefix is the npm scope — it does NOT refer to our alias. These are safe to keep.

## Files affected (summary)

| Category | Count | Pattern |
|---|---|---|
| JS files (`require('stremio/...')`) | ~80 | `stremio/` → `leto/` |
| TS/TSX files (`import from 'stremio/...'`) | ~20 | `stremio/` → `leto/` |
| Less files (`~stremio/...`) | ~53 | `~stremio/` → `~leto/` |
| Router alias (JS + TS + Less) | ~15 | `stremio-router` → `leto-router` |
| Config files | 2 | `webpack.config.js`, `tsconfig.json` |
| Type declarations | 1 | `src/modules.d.ts` |

## How to merge into `development`

When merging branch `IDM` into `development`, all files that import from `stremio/` or `stremio-router` will conflict. Here's how to handle it:

### Option A — Merge and fix conflicts (recommended)

```bash
git checkout development
git merge IDM
# Fix conflicts: in each conflicted file, accept the 'leto/' version of imports
# The content logic might need manual merge but the imports are always leto/
```

### Option B — Apply the rename to `development` first, then merge

Run these commands on `development` before merging to minimize conflicts:

```bash
# 1. Update aliases
sed -i "s|'stremio': path.resolve|'leto': path.resolve|" webpack.config.js
sed -i "s|'stremio-router': path.resolve|'leto-router': path.resolve|" webpack.config.js
sed -i 's|"stremio/\*"|"leto/*"|' tsconfig.json

# 2. Rename all JS/TS imports
find src/ -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i "s|require('stremio/|require('leto/|g" {} +
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i "s|from 'stremio/|from 'leto/|g" {} +
find src/ -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i "s|'stremio-router|'leto-router|g" {} +

# 3. Rename all Less imports
find src/ -type f -name "*.less" -exec sed -i "s|~stremio/|~leto/|g" {} +

# 4. Fix modules.d.ts
sed -i "s|'stremio/|'leto/|g" src/modules.d.ts

# 5. Build to verify
docker compose up --build -d crewing
```

### What to watch for

- **`@stremio/` (with @)** — do NOT rename. These are npm packages.
- **`stremio-translations`** — do NOT rename. npm package.
- **Copyright headers** — keep `Copyright (C) Smart code 203358507` lines. Required by GPLv2.
- **New files** — any new file created after the rename must use `leto/` imports, not `stremio/`.

## Rule for new code

```
ALWAYS use:     require('leto/common/...')    or    import { X } from 'leto/...'
NEVER use:      require('stremio/common/...')  or    import { X } from 'stremio/...'

ALWAYS use:     @import '~leto/common/screen-sizes.less'
NEVER use:      @import '~stremio/common/screen-sizes.less'

OK to use:      @import '~@stremio/stremio-colors/...'  (npm package, not our alias)
OK to use:      require('@stremio/stremio-icons/...')    (npm package, not our alias)
```
