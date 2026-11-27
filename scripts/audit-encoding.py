"""Independent, read-only audit using Python codecs and Unicode categories.

Does not import or run the JavaScript checker. Walks the filesystem independently
of the Git index. Deliberately escaped test/inventory strings are not evaluated.
"""
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUFFIXES = set('.ts .tsx .mts .cts .js .jsx .mjs .cjs .json .md .mdx .css .scss .html .htm .yaml .yml .toml .sql .py .svg .txt .xml .ics .sh .ps1 .csv .tsv .ini .conf .config .map .webmanifest'.split())
NAMES = {'.gitignore', '.gitattributes', '.editorconfig', '.env.example', '.npmrc', 'Dockerfile'}
SKIP = {'.git', 'node_modules', '.next', 'out', 'build', 'coverage', '.codex-temp', '.codex-audit-tmp-phase2', '.phase4-checkpoint', 'visual-validation', 'casa-oceano-airbnb', 'casa-serena-airbnb', 'flor-do-sal-airbnb', 'test-results', 'playwright-report'}
MOJIBAKE = re.compile(r'\u00c3[\x80-\xbf\u0192\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u02c6\u02dc\u2013-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]|\u00c2[\x80-\xbf]|\u00e2[\u0080\u20ac]|\u00f0[\u009f\u0178]|\u00ef\u00bf\u00bd')


def audit(root=ROOT):
    findings = []
    audited = 0
    for directory, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP and not (d == 'worktrees' and Path(directory).name == '.claude')]
        for name in sorted(files):
            p = Path(directory) / name
            if p.suffix.lower() not in SUFFIXES and name not in NAMES:
                continue
            audited += 1
            path = p.relative_to(root).as_posix()
            raw = p.read_bytes()
            try:
                text = raw.decode('utf-8', errors='strict')
            except UnicodeDecodeError as error:
                findings.append(dict(file=path, line=raw[:error.start].count(b'\n') + 1, type='invalid-utf8'))
                continue
            if raw.startswith(bytes.fromhex('efbbbf')):
                findings.append(dict(file=path, line=1, type='bom'))
            for line_number, line in enumerate(text.split('\n'), 1):
                for char in line:
                    if char == '\ufffd' or (unicodedata.category(char) == 'Cc' and char not in '\t\r'):
                        findings.append(dict(file=path, line=line_number, type='replacement-or-control', codepoint=f'U+{ord(char):04X}'))
                if MOJIBAKE.search(line):
                    findings.append(dict(file=path, line=line_number, type='mojibake'))
                if re.match(r'^(<{7}( |$)|={7}$|>{7}( |$)|\|{7}( |$))', line):
                    findings.append(dict(file=path, line=line_number, type='conflict'))
    return dict(audited=audited, errors=len(findings), findings=findings)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    report = audit()
    print(json.dumps(report, ensure_ascii=True, indent=2))
    sys.exit(bool(report['errors']))
