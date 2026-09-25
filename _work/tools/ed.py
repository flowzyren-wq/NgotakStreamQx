#!/usr/bin/env python3
"""ed.py FILE < blocks  -- apply search/replace blocks:
<<<<<<<\nSEARCH\n=======\nREPLACE\n>>>>>>>   (SEARCH '@@END@@' appends). CRLF aware, fails loudly."""
import sys, re
path = sys.argv[1]
raw = open(path, newline='').read()
crlf = '\r\n' in raw
text = raw.replace('\r\n', '\n')
spec = sys.stdin.read()
blocks = re.findall(r'<<<<<<<\n(.*?)\n=======\n(.*?)\n?>>>>>>>', spec, re.S)
if not blocks:
    sys.exit('no blocks')
for i, (a, b) in enumerate(blocks):
    if a == '@@END@@':
        text = text + b + '\n'; continue
    c = text.count(a)
    if c != 1:
        sys.exit(f'{path}: block {i} matched {c} times:\n{a[:300]}')
    text = text.replace(a, b)
if crlf:
    text = text.replace('\n', '\r\n')
open(path, 'w', newline='').write(text)
print(f'{path}: {len(blocks)} edits ok')
