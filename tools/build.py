#!/usr/bin/env python3
"""Pakker appen i én HTML-fil.

  python3 tools/build.py            -> dist/kjoreklar.html (frittstående, kan åpnes direkte)
  python3 tools/build.py --fragment -> dist/kjoreklar-fragment.html (uten <html>/<head>/<body>, for innbygging)
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'index.html').read_text(encoding='utf-8')

def inline_css(m):
    css = ''.join((root / h).read_text(encoding='utf-8') for h in re.findall(r'href="([^"]+\.css)"', m.group(0)))
    return '<style>\n' + css + '\n</style>'

def inline_js(m):
    out = []
    for f in re.findall(r'src="([^"]+\.js)"', m.group(0)):
        code = (root / f).read_text(encoding='utf-8').replace('</script', '<\\/script')
        out.append(f'<script>/* {f} */\n{code}\n</script>')
    return '\n'.join(out)

html = re.sub(r'<!--CSS-->.*?<!--/CSS-->', inline_css, src, flags=re.S)
html = re.sub(r'<!--JS-->.*?<!--/JS-->', inline_js, html, flags=re.S)

dist = root / 'dist'
dist.mkdir(exist_ok=True)
if '--fragment' in sys.argv:
    head = re.search(r'<head>(.*?)</head>', html, flags=re.S).group(1)
    body = re.search(r'<body>(.*?)</body>', html, flags=re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>\s*', '', head)
    head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
    title = re.search(r'<title>.*?</title>', head).group(0)
    head = head.replace(title, '')
    out = title + '\n' + head.strip() + '\n' + body.strip() + '\n'
    (dist / 'kjoreklar-fragment.html').write_text(out, encoding='utf-8')
    print('dist/kjoreklar-fragment.html', len(out) // 1024, 'KB')
else:
    (dist / 'kjoreklar.html').write_text(html, encoding='utf-8')
    print('dist/kjoreklar.html', len(html) // 1024, 'KB')
