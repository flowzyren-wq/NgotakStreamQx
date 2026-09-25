#!/usr/bin/env python3
"""compare.py APKMODS AIRMODS air_midmap.json out.json
Match every APK module to an upstream (AirFlix) module and classify SAME/DIFF/NEW."""
import sys, os, re, json
A, B, mm, out = sys.argv[1:5]
midmap = json.load(open(mm))
STR = re.compile(r"'((?:[^'\\]|\\.){2,200})'")
NAME = re.compile(r'Original name: ([\w$]+)')
def load(d):
    res = {}
    for f in os.listdir(d):
        if not f.endswith('.js'): continue
        mid = int(f[:-3]); t = open(os.path.join(d, f)).read()
        body = t.split('\n', 1)[1]
        norm = re.sub(r'_fun\d+', '_f', body)
        norm = re.sub(r'#fid \d+', '', norm)
        norm = re.sub(r'_ip = \d+', '_ip = N', norm)
        norm = re.sub(r'(?m)^\s*(case )?\d+:$', 'L:', norm)
        norm = re.sub(r'Unsupported instruction: .*', 'UNSUP', norm)
        feats = set(STR.findall(body)) | {'N:' + x for x in NAME.findall(body)}
        res[mid] = dict(norm=norm, feats=feats, size=len(body))
    return res
a, b = load(A), load(B)
bynorm = {}
for m, v in b.items():
    bynorm.setdefault(hash(v['norm']), []).append(m)
# inverted index on features
inv = {}
for m, v in b.items():
    for f in v['feats']:
        inv.setdefault(f, set()).add(m)
used = set(); result = {}
order = sorted(a)
# pass 1 exact
for m in order:
    c = [x for x in bynorm.get(hash(a[m]['norm']), []) if x not in used and b[x]['norm'] == a[m]['norm']]
    if c:
        best = min(c, key=lambda x: abs(x - m)); used.add(best)
        result[m] = ('SAME', best, 1.0)
# pass 2 fuzzy
for m in order:
    if m in result: continue
    fa = a[m]['feats']
    cand = {}
    for f in fa:
        s = inv.get(f)
        if s and len(s) < 60:
            for x in s:
                if x not in used: cand[x] = cand.get(x, 0) + 1
    best, bs = None, 0
    for x, k in cand.items():
        j = k / (len(fa | b[x]['feats']) or 1)
        ratio = min(a[m]['size'], b[x]['size']) / max(a[m]['size'], b[x]['size'])
        sc = j * 0.8 + ratio * 0.2 - abs(x - m) * 1e-5
        if sc > bs: best, bs = x, sc
    if best is not None and bs > 0.3:
        used.add(best); result[m] = ('DIFF', best, round(bs, 3))
    else:
        result[m] = ('NEW', None, 0)
json.dump({str(k): [v[0], v[1], v[2], midmap.get(str(v[1])) if v[1] is not None else None] for k, v in result.items()}, open(out, 'w'), indent=0)
from collections import Counter
print(Counter(v[0] for v in result.values()))
print('unmatched upstream', len(set(b) - used))
