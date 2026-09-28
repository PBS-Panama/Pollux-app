#!/usr/bin/env python3
"""Similarity audit: interfaces/leto/src vs stremio-web @ 091f94e8.

Used across R10-R14 and the MEDIA/BAJA reclassification (T2, 2026-09-28) to
answer "how much of this file's content is still the original stremio-web
line-for-line" — a proxy for "was this genuinely rewritten, or does it still
carry Stremio-derived content", used to drive the GPL-derived-code cleanup
and to produce reproducible numbers for legal review.

Method: for each file that exists at the same relative path in both trees,
strip trivial lines (blank, imports/require, bare module.exports, lines that
are only braces/brackets/parens, the Smart Code copyright line) from both
versions. Compare the two sets of remaining (stripped, trimmed) lines:

    % similarity = |upstream lines that also appear verbatim in Pollux| / |upstream non-trivial lines|

Classification: ALTA (>50%), MEDIA (20-50%), BAJA (<20%). The denominator is
always the upstream (stremio-web) file — this answers "how much of the
original is still here", not "how much Pollux changed in total".

Known limit of the method (read before using this to prioritize anything):
it measures line overlap, not genuine rewriting. A component fully rewritten
from scratch (different state management, different decomposition) can still
share generic lines with the original (`display: flex;`, a `PropTypes.string`,
`color: var(--primary-foreground-color);`) purely because those lines are
generic, not because the file is still a copy. Use this script's output as a
starting signal, then read the actual file + its header comments (R-phase
markers, dead-code-removal notes) to decide if it was genuinely rewritten.
See docs/legal-review/ and docs/handover/clasificacion-media-baja-2026-09-28.md
for that manual pass.

Usage:
    python3 similarity.py <path-to-091f94e8-checkout>/src

Reference checkout used throughout this audit:
    git clone --branch development https://github.com/PBS-Panama/Pollux-app.git /tmp/pollux-ref-091f94e8
    cd /tmp/pollux-ref-091f94e8 && git checkout 091f94e8

(091f94e8 is a commit on that branch close to the original stremio-web fork,
before the Pollux-specific rewrite phases started — NOT a commit in the
upstream Stremio/stremio-web repo directly.)
"""
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
POLLUX_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', 'src'))

COPYRIGHT_RE = re.compile(r'^\s*//\s*Copyright')
BRACE_ONLY_RE = re.compile(r'^[\s{}()\[\];,]*$')
IMPORT_RE = re.compile(r'^\s*(import\b|export\s*\{|export\s+default\s+\w+;?\s*$|const\s+\{[^}]*\}\s*=\s*require\(|require\()')
MODULE_EXPORTS_RE = re.compile(r'^\s*module\.exports\s*=')

EXTS = ('.js', '.jsx', '.ts', '.tsx', '.less', '.json', '.html')
SKIP_DIRS = ('node_modules', '.git', 'dist', 'build')


def nontrivial_lines(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            raw = f.readlines()
    except FileNotFoundError:
        return None
    lines = []
    for line in raw:
        s = line.strip()
        if not s:
            continue
        if COPYRIGHT_RE.match(line) or BRACE_ONLY_RE.match(line) or IMPORT_RE.match(line) or MODULE_EXPORTS_RE.match(line):
            continue
        lines.append(s)
    return lines


def all_files(root):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if fn.endswith(EXTS):
                out.append(os.path.relpath(os.path.join(dirpath, fn), root))
    return out


def classify(pct):
    if pct > 50:
        return 'ALTA'
    if pct >= 20:
        return 'MEDIA'
    return 'BAJA'


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    ref_root = sys.argv[1]
    if not os.path.isdir(ref_root):
        print(f"No existe: {ref_root}")
        sys.exit(1)

    results = []
    for rel in sorted(all_files(POLLUX_ROOT)):
        ref_path = os.path.join(ref_root, rel)
        pollux_path = os.path.join(POLLUX_ROOT, rel)
        if not os.path.exists(ref_path):
            continue  # no equivalente upstream -> propio, fuera de alcance
        ref_lines = nontrivial_lines(ref_path)
        if not ref_lines:
            continue
        pollux_lines = nontrivial_lines(pollux_path) or []
        ref_set = set(ref_lines)
        pollux_set = set(pollux_lines)
        shared = ref_set & pollux_set
        pct = 100.0 * len(shared) / len(ref_set)
        results.append((rel, len(ref_set), len(shared), pct, classify(pct)))

    results.sort(key=lambda x: -x[3])
    counts = {'ALTA': 0, 'MEDIA': 0, 'BAJA': 0}
    for r in results:
        counts[r[4]] += 1

    print(f"Total con equivalente upstream: {len(results)}")
    print(f"ALTA: {counts['ALTA']}  MEDIA: {counts['MEDIA']}  BAJA: {counts['BAJA']}")
    print()
    for rel, total, shared, pct, grp in results:
        print(f"{grp}\t{pct:.1f}%\t{shared}/{total}\t{rel}")


if __name__ == '__main__':
    main()
