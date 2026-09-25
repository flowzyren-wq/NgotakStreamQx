#!/usr/bin/env python3
"""split.py DECOMP.js OUTDIR -- split hermes-dec output of a Metro bundle into
one file per module (OUTDIR/<mid>.js) plus OUTDIR/deps.json {mid: [deps]}."""
import sys, re, json, os
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
lines = open(src).read().split('\n')
regs, funcs, deps = {}, {}, {}
i, n = 0, len(lines)
top_assign = re.compile(r'^    (r\d+) = (.*);$')
fn_start = re.compile(r'^    (r\d+) = function\(a0, a1, a2, a3, a4, a5, a6\) \{')
call = re.compile(r'^    r\d+ = (r\d+)\.bind\(r\d+\)\((r\d+), (r\d+), (r\d+)\);$')
while i < n:
    l = lines[i]
    m = fn_start.match(l)
    if m:
        j = i + 1
        while j < n and lines[j] != '    };':
            j += 1
        regs[m.group(1)] = ('FN', i, j)
        i = j + 1
        continue
    m = call.match(l)
    if m and regs.get(m.group(2), ('',))[0] == 'FN':
        _, a, b = regs[m.group(2)]
        mid = regs.get(m.group(3))
        dl = regs.get(m.group(4))
        try:
            mid = int(mid)
            d = [] if (not dl or dl.startswith('new Array')) else json.loads(dl)
        except Exception:
            print('skip', i, mid, file=sys.stderr); i += 1; continue
        deps[mid] = d
        with open(f'{out}/{mid}.js', 'w') as f:
            f.write(f'// module {mid} deps {d}\n')
            f.write('\n'.join(x[4:] for x in lines[a:b + 1]) + '\n')
        i += 1
        continue
    m = top_assign.match(l)
    if m:
        regs[m.group(1)] = m.group(2)
    i += 1
json.dump(deps, open(f'{out}/deps.json', 'w'))
print(len(deps), 'modules')
