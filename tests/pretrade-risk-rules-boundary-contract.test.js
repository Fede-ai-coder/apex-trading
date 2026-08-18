'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = 'ade09125fa7d14a293643764bc04b235c067d30d';
const MODULE_REL = 'js/services/pretrade-risk-rules.js';
const TAG = '<script src="./js/services/pretrade-risk-rules.js"></script>\n';
const MANIFEST = [
  "_ptBias",
  "_ptTradeDelta",
  "_ptStructureCount",
  "_ptVolDeltaTolerance",
  "_ptNormalizeGreekPointsSigned",
  "_ptNormalizeGreekPointsAbs",
  "_ptNormalizeIvrPercent",
  "_ptGetIvrDeltaRange",
  "_ptGetVix3mDeltaRange",
  "_ptSelectConservativeVolDeltaRange",
  "_ptGetDeltaRangeForBias",
  "_ptWorstShortLegDelta",
  "_ptVolRange",
  "runPreTradeRiskCheck"
];
const RESIDUAL = [
  "_closePreTradeRiskModal",
  "_showPreTradeRiskModal",
  "_fetchPretradeBackendCandles",
  "ensurePreTradeTechnicals"
];
const EXPECTED_DECL_CHARS = 11406;

let pass = 0, fail = 0;
function ok(v, msg) { if (v) { pass++; } else { fail++; console.log('  FAIL  ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + (a === b ? '' : ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')')); }
function same(a, b, msg) { eq(JSON.stringify(a), JSON.stringify(b), msg); }
function section(s) { console.log('\n' + s); }
function isIdent(c) { return !!c && /[A-Za-z0-9_$]/.test(c); }
function skipQuoted(src, i) { const q = src[i]; for (let j = i + 1; j < src.length; j++) { if (src[j] === '\\') { j++; continue; } if (src[j] === q) return j; } return src.length - 1; }
function matchBrace(src, open) { let depth = 0; for (let i = open; i < src.length; i++) { const c = src[i], n = src[i + 1]; if (c === '/' && n === '/') { i += 2; while (i < src.length && src[i] !== '\n') i++; continue; } if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; } if (c === '"' || c === "'" || c.charCodeAt(0) === 96) { i = skipQuoted(src, i); continue; } if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return i; } } return -1; }
function findFunction(src, name) { const variants = ['function ' + name + '(', 'async function ' + name + '(']; let start = -1; for (const sig of variants) { let p = src.indexOf(sig); while (p >= 0) { if (!isIdent(p ? src[p - 1] : '')) { start = p; break; } p = src.indexOf(sig, p + 1); } if (start >= 0) break; } if (start < 0) return null; const open = src.indexOf('{', start); const e = matchBrace(src, open); if (open < 0 || e < 0) return null; return { name, start, end: e + 1, text: src.slice(start, e + 1) }; }
function findVar(src, name) { const sig = 'var ' + name; let start = src.indexOf(sig); while (start >= 0 && isIdent(src[start - 1])) start = src.indexOf(sig, start + 1); if (start < 0) return null; let pa = 0, br = 0, sq = 0; for (let i = start; i < src.length; i++) { const c = src[i], n = src[i + 1]; if (c === '/' && n === '/') { i += 2; while (i < src.length && src[i] !== '\n') i++; continue; } if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; } if (c === '"' || c === "'" || c.charCodeAt(0) === 96) { i = skipQuoted(src, i); continue; } if (c === '(') pa++; else if (c === ')') pa--; else if (c === '{') br++; else if (c === '}') br--; else if (c === '[') sq++; else if (c === ']') sq--; else if (c === ';' && pa === 0 && br === 0 && sq === 0) return { name, start, end: i + 1, text: src.slice(start, i + 1) }; } return null; }
function decl(src, name) { return name === '_ptVolDeltaTolerance' ? findVar(src, name) : findFunction(src, name); }
function count(src, needle) { let n = 0, p = 0; while ((p = src.indexOf(needle, p)) >= 0) { n++; p += needle.length; } return n; }
function transformFromBase(base) { const ds = MANIFEST.map((n) => decl(base, n)); if (ds.some((d) => !d)) throw new Error('missing base target'); const start = ds[0].start, end = ds[ds.length - 1].end; const module = base.slice(start, end); const scriptOpen = base.lastIndexOf('<script', start); const without = base.slice(0, start) + base.slice(end); return { module, index: without.slice(0, scriptOpen) + TAG + without.slice(scriptOpen), start, end, scriptOpen, ds }; }
function outcome(src, args) { const sandbox = { console, Math, Number, Boolean, Array, Object, JSON, isFinite, parseFloat, parseInt }; sandbox.globalThis = sandbox; vm.createContext(sandbox); try { vm.runInContext(src + '\n;globalThis.__run = runPreTradeRiskCheck;', sandbox); const value = sandbox.__run.apply(null, args); return { ok: true, value: JSON.parse(JSON.stringify(value)) }; } catch (e) { return { ok: false, name: e && e.name, message: e && e.message }; } }

const base = execFileSync('git', ['show', BASE_SHA + ':index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const moduleSrc = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const expected = transformFromBase(base);

section('1. exact manifest + declaration byte identity');
let sum = 0;
for (const name of MANIFEST) {
  const b = decl(base, name), m = decl(moduleSrc, name), i = decl(index, name);
  ok(!!b, name + ' exists at base');
  ok(!!m, name + ' exists in owner');
  ok(!i, name + ' absent inline');
  if (b && m) { eq(m.text, b.text, name + ' declaration byte-identical'); sum += m.text.length; }
}
eq(sum, EXPECTED_DECL_CHARS, 'declaration-char ratchet is 11,406');

section('2. owner contains no foreign top-level declaration');
const owned = MANIFEST.filter((n) => !!decl(moduleSrc, n));
same(owned, MANIFEST, 'all and only manifest declarations present');
const topLine = [];
const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(?:var|const|let)\s+([A-Za-z_$][\w$]*)/gm;
let mm; while ((mm = re.exec(moduleSrc))) topLine.push(mm[1] || mm[2]);
same(topLine.filter((n) => MANIFEST.includes(n) || RESIDUAL.includes(n)), MANIFEST, 'physical run has no residual/foreign peer');

section('3. PRETRADE ratchet 18 -> 4');
for (const name of RESIDUAL) { ok(!!decl(index, name), name + ' remains inline'); ok(!decl(moduleSrc, name), name + ' not pulled into owner'); eq(decl(index, name).text, decl(base, name).text, name + ' remains byte-identical'); }
eq(MANIFEST.filter((n) => !!decl(index, n)).length + RESIDUAL.filter((n) => !!decl(index, n)).length, 4, 'inline PRETRADE owner-residual is exactly four');

section('4. exact transform, load order and round trip');
eq(moduleSrc, expected.module, 'module is exact source slice from base');
eq(index, expected.index, 'index equals mechanical base transform only');
eq(count(index, TAG), 1, 'script tag occurs exactly once');
const tagAt = index.indexOf(TAG); const residualAt = index.indexOf('function _closePreTradeRiskModal(');
ok(tagAt >= 0 && residualAt > tagAt, 'owner loads before residual PRETRADE consumers');
let undo = index.slice(0, tagAt) + index.slice(tagAt + TAG.length);
undo = undo.slice(0, expected.start) + moduleSrc + undo.slice(expected.start);
eq(undo, base, 'byte-exact undo reconstructs pinned base');

section('5. completed-family ratchets stay terminal');
const terminalModules = [
  'js/adapters/backend-directional-snapshot-adapter.js', 'js/services/backend-directional-snapshot-service.js', 'js/ui/backend-directional-snapshot-panel.js',
  'js/services/sfs-config-state.js', 'js/services/sfs-scan-service.js', 'js/ui/sfs-panel.js',
  'js/services/pess-config-rules.js', 'js/services/pess-live-transport.js', 'js/ui/pess-batch-panel.js', 'js/ui/pess-panel.js',
  'js/services/eic-screening-rules.js', 'js/services/eic-decision-rules.js', 'js/ui/eic-panel.js', 'js/ui/eic-ticker-analysis-panel.js', 'js/ui/eic-live-deep-dive.js'
];
for (const rel of terminalModules) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const names = []; let x;
  const rr = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(?:var|const|let)\s+([A-Za-z_$][\w$]*)/gm;
  while ((x = rr.exec(src))) names.push(x[1] || x[2]);
  for (const n of names) if (n !== 'apexDebugBackendDirectionalAdapter') ok(!decl(index, n), rel + ' declaration remains external: ' + n);
}

section('6. runPreTradeRiskCheck parity');
const fixtures = [
  ['SPY', [], {}],
  ['AAPL', [{ action: 'SELL', type: 'PUT', quantity: 1, delta: -0.12 }], { price: 200, ivr: 25, ivrSource: 'TASTYTRADE', vix3m: 18, bias: 'BULLISH' }],
  ['QQQ', [{ action: 'SELL', type: 'CALL', quantity: 2, delta: 0.18 }, { action: 'BUY', type: 'CALL', quantity: 2, delta: 0.08 }], { price: 500, ivr: 70, ivrSource: 'TASTYTRADE', vix3m: 30, bias: 'BEARISH' }]
];
for (const f of fixtures) same(outcome(moduleSrc, f), outcome(expected.module, f), 'behavior parity for ' + f[0]);

section('7. mutation controls');
function valid(layout) {
  if (layout.module !== expected.module) throw new Error('module byte identity');
  if (layout.index !== expected.index) throw new Error('index mechanical identity');
  for (const n of MANIFEST) if (!decl(layout.module, n) || decl(layout.index, n)) throw new Error('ownership ' + n);
  for (const n of RESIDUAL) if (!decl(layout.index, n) || decl(layout.module, n)) throw new Error('residual ' + n);
  return true;
}
const mutants = [];
mutants.push({ name: 'missing declaration', value: { module: moduleSrc.replace(decl(moduleSrc, MANIFEST[0]).text, ''), index } });
mutants.push({ name: 'duplicate owner inline', value: { module: moduleSrc, index: index + '\n' + decl(moduleSrc, MANIFEST[1]).text } });
mutants.push({ name: 'residual moved into owner', value: { module: moduleSrc + '\n' + decl(index, RESIDUAL[0]).text, index: index.replace(decl(index, RESIDUAL[0]).text, '') } });
const d0 = decl(moduleSrc, MANIFEST[0]), d1 = decl(moduleSrc, MANIFEST[1]);
mutants.push({ name: 'reordered declarations', value: { module: moduleSrc.slice(0, d0.start) + d1.text + moduleSrc.slice(d0.end, d1.start) + d0.text + moduleSrc.slice(d1.end), index } });
mutants.push({ name: 'mutated body', value: { module: moduleSrc.replace('return', 'return /*mutant*/'), index } });
mutants.push({ name: 'wrong script path', value: { module: moduleSrc, index: index.replace('./js/services/pretrade-risk-rules.js', './js/services/pretrade-risk-rulez.js') } });
mutants.push({ name: 'wrong load order', value: { module: moduleSrc, index: index.replace(TAG, '').replace('</body>', TAG + '</body>') } });
mutants.push({ name: 'foreign declaration', value: { module: moduleSrc + '\nfunction foreignPretradeMutation(){}', index } });
let killed = 0;
for (const m of mutants) { try { valid(m.value); } catch (_) { killed++; } }
eq(killed, mutants.length, 'all ' + mutants.length + ' structural mutants killed');

section('8. no production files outside declared relocation changed');
const changed = execFileSync('git', ['diff', '--name-only', BASE_SHA, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
// During the bootstrap Action HEAD still points at the setup commit; use worktree status too.
const work = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).map((s) => s.slice(3));
const all = Array.from(new Set(changed.concat(work))).filter((p) => !p.startsWith('scripts/_bootstrap-pretrade-risk-rules.js') && p !== '.github/workflows/pretrade-extraction-bootstrap.yml');
const allowedProduction = ['index.html', MODULE_REL];
const allowedContractSidecars = [
  'tests/pretrade-risk-rules-boundary-contract.test.js',
  'tests/lib/pretrade-pr1-undo.js',
  'tests/backend-directional-adapter-boundary-contract.test.js',
  'tests/backend-directional-preview-boundary-contract.test.js',
  'tests/backend-directional-snapshot-boundary-contract.test.js',
  'tests/backend-scanner-snapshot-ui-boundary-contract.test.js',
  'tests/eic-extraction-boundary-contract.test.js',
  'tests/pess-extraction-boundary-contract.test.js',
  'tests/post-eic-monolith-extraction-audit.test.js',
  'tests/sfs-extraction-boundary-contract.test.js',
];
const allowed = allowedProduction.concat(allowedContractSidecars);
ok(all.every((p) => allowed.includes(p)), 'only the two production relocation files plus explicitly named contract/audit sidecars changed');
const changedProduction = all.filter((p) => p === 'index.html' || p.startsWith('js/')).sort();
same(changedProduction, allowedProduction.slice().sort(), 'production footprint is exactly index.html + PRETRADE owner module');

console.log('\nPRETRADE boundary contract: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
