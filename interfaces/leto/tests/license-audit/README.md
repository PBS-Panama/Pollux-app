# License audit — similarity vs stremio-web @ 091f94e8

Reproduces the line-overlap numbers used across R10-R14 and the MEDIA/BAJA
reclassification (T2, 2026-09-28) to measure how much of `interfaces/leto/src`
is still original stremio-web content, file by file. Used to drive the
GPL-derived-code rewrite and to give legal review a number anyone can
regenerate — not just a claim in a handover doc.

## What it measures

Percentage of each upstream file's non-trivial lines (no blanks, imports,
`module.exports`, brace-only lines, or the Smart Code copyright header) that
still appear verbatim, line-for-line, in the current Pollux file at the same
path. **This is a starting signal, not a verdict** — see the caveat in the
script's docstring and `docs/legal-review/` for the manual read-through that
turns a raw percentage into "genuinely rewritten" vs "still original" vs
"same generic CSS/boilerplate any implementation would share".

## Reference checkout

```bash
git clone --branch development https://github.com/PBS-Panama/Pollux-app.git /tmp/pollux-ref-091f94e8
cd /tmp/pollux-ref-091f94e8
git checkout 091f94e8
```

`091f94e8` is a commit on that repo's `development` branch, close to the
original stremio-web fork point, before any of the Pollux-specific rewrite
phases (R1 onward) started. It is not a commit in the upstream
Stremio/stremio-web GitHub repo directly — `development` is where this
project's own history keeps that pre-rewrite snapshot.

## Running it

From this directory:

```bash
python3 similarity.py /tmp/pollux-ref-091f94e8/src
```

No dependencies beyond Python 3 (stdlib only). Output: total files compared,
counts per group (ALTA >50% / MEDIA 20-50% / BAJA <20%), then the full list
sorted by percentage descending.

## Known limitation

Line overlap is a proxy, not a direct measure of "was this rewritten". A
component rewritten from scratch (different state management, different
decomposition, same external contract) can still share generic lines with
the original purely because they're generic (`display: flex;`, a
`useCallback` with the same shape, `color: var(--primary-foreground-color);`)
— not because the file is still a copy. The reverse also happens: a file
that's 100% "propio" data (Pollux's own route regexes, its own 3-language
catalog) can still score non-zero if a few lines happen to coincide. Treat
the percentage as a place to start reading, not the final answer — the
handover docs (`docs/handover/r14-*`, `docs/handover/clasificacion-media-baja-2026-09-28.md`)
and the final legal report document, file by file, which side of that line
each result actually falls on, with the evidence used to decide.
