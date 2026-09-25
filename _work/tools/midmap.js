// node midmap.js bundle.js bundle.map out.json  -> {mid: sourcePath}
const fs = require('fs');
const {SourceMapConsumer} = require(process.env.SM || 'source-map');
const [bundle, mapf, out] = process.argv.slice(2);
const lines = fs.readFileSync(bundle, 'utf8').split('\n');
const map = JSON.parse(fs.readFileSync(mapf, 'utf8'));
(async () => {
  const c = await new SourceMapConsumer(map);
  const res = {};
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('__d(function')) start = i;
    const m = /^\},(\d+),\[/.exec(lines[i]);
    if (m && start >= 0) {
      let src = null;
      for (let k = start + 1; k < i && !src; k++) {
        const p = c.originalPositionFor({line: k + 1, column: Math.max(0, lines[k].search(/\S/))});
        if (p && p.source) src = p.source;
      }
      res[m[1]] = src;
      start = -1;
    }
  }
  fs.writeFileSync(out, JSON.stringify(res, null, 0));
  console.log(Object.keys(res).length, 'mapped');
  if (c.destroy) c.destroy();
})();
