#!/usr/bin/env python3
"""Compile full TikZ blocks in the references; not a math or custom-class validator."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Directory for temporary TeX, logs, PDFs and results.json')
    parser.add_argument('--font', default='DejaVu Serif', help='Installed Unicode font with Vietnamese glyphs')
    args = parser.parse_args()
    if shutil.which('xelatex') is None:
        parser.exit(2, 'Not run: xelatex is not available.\n')
    if not re.fullmatch(r'[\w .,+-]+', args.font):
        parser.error('Use a plain installed font name.')
    root = Path(__file__).resolve().parents[1]
    out = args.output.resolve() if args.output else Path(tempfile.mkdtemp(prefix='latex-skill-check-'))
    if out == root or root in out.parents:
        parser.error('Use an output directory outside the skill to keep build artifacts out of the skill.')
    out.mkdir(parents=True, exist_ok=True)
    jobs = []
    for filename in ('tikz-hinh-hoc.md', 'tikz-bieu-do.md'):
        source = (root / 'references' / filename).read_text(encoding='utf-8')
        libraries = set()
        for group in re.findall(r'\\usetikzlibrary\{([^}]+)\}', source):
            libraries.update(x.strip() for x in group.split(','))
        if 'decorations.markings' in source:
            libraries.add('decorations.markings')
        preamble = '\n'.join([
            r'\documentclass[border=8pt]{standalone}',
            r'\usepackage{fontspec}',
            r'\setmainfont{' + args.font + '}',
            r'\usepackage{amsmath,amssymb,tikz}',
            r'\usetikzlibrary{' + ','.join(sorted(libraries)) + '}',
            r'\begin{document}',
        ]) + '\n'
        number = 0
        for match in re.finditer(r'```latex\s*\n(.*?)\n```', source, re.S):
            code = match.group(1)
            if r'\begin{tikzpicture}' not in code:
                continue
            number += 1
            name = Path(filename).stem + f'-{number:02}'
            # center controls placement in the parent document, not drawing semantics.
            code = code.replace(r'\begin{center}', '').replace(r'\end{center}', '')
            tex = preamble + code + '\n' + r'\end{document}' + '\n'
            (out / (name + '.tex')).write_text(tex, encoding='utf-8')
            jobs.append((name, filename, source[:match.start()].count('\n') + 1))

    def compile_one(job):
        name, filename, line = job
        try:
            result = subprocess.run(
                ['xelatex', '-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', name + '.tex'],
                cwd=out, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, timeout=45,
            )
            errors = [s for s in result.stdout.splitlines()
                      if s.startswith('!') or 'Error:' in s or 'Missing character' in s]
            success = result.returncode == 0 and not errors and (out / (name + '.pdf')).is_file()
            return dict(name=name, source=filename, line=line, passed=success, errors=errors[:8])
        except subprocess.TimeoutExpired:
            return dict(name=name, source=filename, line=line, passed=False, errors=['Compilation timed out.'])

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(compile_one, jobs))
    report = {'scope': 'Full TikZ blocks only; partial snippets, mathematical correctness and user macros need separate checks.',
              'font': args.font, 'results': results}
    (out / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    passed = sum(item['passed'] for item in results)
    print(f'{passed}/{len(results)} full TikZ blocks compiled. Results: {out / "results.json"}')
    for item in results:
        if not item['passed']:
            print(item['name'] + ': ' + '; '.join(item['errors']))
    return 0 if results and passed == len(results) else 1


if __name__ == '__main__':
    raise SystemExit(main())
