'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend Directional Adapter (BDS) — EXTRACTION BOUNDARY CONTRACT
//
// WHAT THIS FILE IS
//   An AUDIT contract, not a behaviour test. It measures — against the REAL
//   application source loaded through tests/lib/load-app-source.js — the
//   physical, temporal and behavioural boundary that a FUTURE extraction of the
//   Backend Directional Adapter would have to respect. It copies no
//   implementation and changes no behaviour.
//
//   tests/backend-directional-adapter.test.js already pins WHAT the adapter
//   computes. This file pins WHERE the adapter ends: which functions belong to
//   it, what they may depend on, who is allowed to call them, what must stay
//   behind in the monolith, and what must remain true at load time.
//
// WHY IT EXISTS
//   Before moving bds* out of index.html we must be able to prove, mechanically,
//   that the move is a pure relocation: no helper needs copying, no consumer
//   needs rewiring, no top-level side effect travels with the code, and the
//   Backend Directional Preview (BDSP) — which owns DOM, HTML, localStorage and
//   UI state — does not have to move with it.
//
// HOW IT MEASURES
//   • static  — the reconstructed application source is scanned with a
//               comment/string stripper, a brace-matching top-level-function
//               span finder and a free-identifier analyser.
//   • dynamic — the nine non-debug helpers are executed inside a vm context
//               whose global object is a Proxy that THROWS on every identifier
//               that is not an explicitly allowed intrinsic. Any accidental
//               fetch / ttCall / DOM / localStorage / timer / S access is a hard
//               failure, not a missed grep.
//   • mutation-sensitive — every section is written so that reintroducing a
//               forbidden coupling fails loudly (see the MUTATION PROOF notes).
//
// Run: node tests/backend-directional-adapter-boundary-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const APP = require('./lib/load-app-source');

const SRC = APP.loadAppJavaScriptSource();
const PARTS = APP.loadOrderedScriptSources();

// ── Test harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function eq(actual, expected, msg) {
  ok(actual === expected, msg + ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')');
}
function deepEq(actual, expected, msg) {
  ok(JSON.stringify(actual) === JSON.stringify(expected),
     msg + ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')');
}
function section(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 74 - t.length))); }

// ── The audited surface ──────────────────────────────────────────────────────
// The three coercion primitives. Not exported, not reachable from outside the
// adapter, and only ever called by two adapter functions.
const BDS_PRIMITIVES = ['_bdsNum', '_bdsBoolOrNull', '_bdsStrOrNull'];

// The pure adapter proper.
const BDS_ADAPTER = [
  'bdsIsBackendDirectionalCandidate',
  'bdsMapBackendCandidateToDirectionalRow',
  'bdsSortBackendDirectionalRows',
  'bdsDeriveBackendDirectionalRows',
  'bdsBackendDirectionalSummary',
  'bdsGetBackendDirectionalSourceState',
];

// The debug bridge. Audited separately: it is NOT pure — it reads the live
// bssState() global — so it is not automatically part of the future module.
const BDS_DEBUG = 'apexDebugBackendDirectionalAdapter';

// The nine functions whose purity the future extraction depends on.
const BDS_PURE = BDS_PRIMITIVES.concat(BDS_ADAPTER);
const BDS_ALL = BDS_PURE.concat([BDS_DEBUG]);

// The Backend Directional Preview closure. Inventoried to prove it is a
// DIFFERENT module: DOM + HTML + localStorage + UI state.
const BDSP_FNS = [
  'bdspStorageKey', 'bdspState', 'bdspLoadPersistedEnabled', 'bdspPersistEnabled',
  'bdspIsEnabled', 'bdspSetEnabled', 'bdspToggle', 'bdspRefresh', 'bdspBadge',
  'bdspKV', 'bdspFmtNum', 'bdspFmtAge', 'bdspFmtClock', 'bdspFreshBadge',
  'bdspDirBadge', 'bdspBucketBadge', 'bdspBoolBadge', 'bdspParityBadge',
  'bdspOperationalBadge', 'bdspRenderSourceState', 'bdspRenderSummary',
  'bdspRenderRows', 'bdspIsScannerSourceActive', 'bdspGetRowsForScannerResults',
  'bdspRenderBackendResultEmptyState', 'bdspRenderBackendResultRows',
  'bdspRenderScannerResultsOverride', 'bdspMaybeRenderScannerResults',
  'bdspRestoreFrontendScannerResults', 'bdspRender', 'bdspInit',
  'apexDebugBackendDirectionalPreview',
];

// Frontend scanner entry points that must NOT reach into the adapter.
const SCANNER_FRONTEND = [
  'computeDirectionalSetupCandidates', 'computeRsCandidates',
  'renderDirectionalSetupScanner', 'runScan',
];

// ── Source helpers ───────────────────────────────────────────────────────────
// Replace comments and string/template bodies so that scans never match prose
// or HTML fragments. Newlines are preserved so offsets stay usable per-line.
function stripCommentsAndStrings(s) {
  let out = '', inStr = null, esc = false, inLine = false, inBlock = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += '\n'; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } else if (c === '\n') out += '\n'; continue; }
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '\n') { out += '\n'; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; out += '""'; continue; }
    out += c;
  }
  return out;
}

// Every top-level `function NAME(...)` span (column 0), brace matched.
function topLevelSpans(source) {
  const spans = [];
  const re = /(^|\n)(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m;
  while ((m = re.exec(source))) {
    const start = m.index + (m[1] ? m[1].length : 0);
    let i = source.indexOf('{', start);
    let depth = 0, inStr = null, esc = false, inLine = false, inBlock = false, end = -1;
    for (let j = i; j < source.length; j++) {
      const c = source[j], n = source[j + 1];
      if (inLine) { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '/' && n === '/') { inLine = true; j++; continue; }
      if (c === '/' && n === '*') { inBlock = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
    }
    spans.push({ name: m[2], start: start, end: end });
  }
  return spans;
}

const SPANS = topLevelSpans(SRC);
const SPANS_BY_NAME = new Map();
SPANS.forEach(function (s) {
  if (!SPANS_BY_NAME.has(s.name)) SPANS_BY_NAME.set(s.name, []);
  SPANS_BY_NAME.get(s.name).push(s);
});
function spansOf(name) { return SPANS_BY_NAME.get(name) || []; }
function declStart(name) { const a = spansOf(name); return a.length ? a[0].start : -1; }
function bodyOf(name) { const a = spansOf(name); return a.length ? SRC.slice(a[0].start, a[0].end) : null; }

// Innermost top-level span containing an index, or null for module scope.
function enclosingFn(index) {
  let best = null;
  for (const s of SPANS) {
    if (s.start <= index && index < s.end) { if (!best || s.start > best.start) best = s; }
  }
  return best;
}

// Every reference to `name` outside its own declaration, attributed to the
// top-level function that contains it ('(module-scope)' when there is none).
function callersOf(name) {
  const re = new RegExp('\\b' + name + '\\b', 'g');
  const found = new Map();
  let m;
  while ((m = re.exec(SRC))) {
    const enc = enclosingFn(m.index);
    const who = enc ? enc.name : '(module-scope)';
    if (who === name) continue;
    found.set(who, (found.get(who) || 0) + 1);
  }
  return found;
}

// Free identifiers of a function body: bare identifiers that are neither
// keywords, nor property accesses, nor object-literal keys, nor declared
// locally (params, vars, inner function names, catch bindings).
const JS_KEYWORDS = new Set(['var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'new', 'typeof', 'instanceof', 'in', 'of', 'this', 'null',
  'true', 'false', 'void', 'delete', 'throw', 'try', 'catch', 'finally', 'default', 'yield', 'await',
  'async', 'class', 'extends', 'super', 'undefined']);
function freeIdentifiers(body) {
  const s = stripCommentsAndStrings(body);
  const declared = new Set();
  let m;
  const fnRe = /function\s*([A-Za-z0-9_$]*)\s*\(([^)]*)\)/g;
  while ((m = fnRe.exec(s))) {
    if (m[1]) declared.add(m[1]);
    m[2].split(',').map(function (x) { return x.trim(); }).filter(Boolean)
      .forEach(function (p) { declared.add(p.replace(/[^A-Za-z0-9_$].*$/, '')); });
  }
  const catchRe = /catch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((m = catchRe.exec(s))) declared.add(m[1]);
  const declRe = /\b(?:var|let|const)\s+([^;]+);/g;
  while ((m = declRe.exec(s))) {
    m[1].split(',').forEach(function (chunk) {
      const g = /^\s*([A-Za-z0-9_$]+)\s*(=|$)/.exec(chunk);
      if (g) declared.add(g[1]);
    });
  }
  const simpleRe = /\b(?:var|let|const)\s+([A-Za-z0-9_$]+)/g;
  while ((m = simpleRe.exec(s))) declared.add(m[1]);

  const free = new Set();
  const idRe = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b\s*(:?)/g;
  while ((m = idRe.exec(s))) {
    if (m[1] === '.') continue;
    const name = m[2];
    if (JS_KEYWORDS.has(name) || declared.has(name)) continue;
    if (m[3] === ':' && /[{,]\s*$/.test(s.slice(Math.max(0, m.index - 40), m.index))) continue;
    free.add(name);
  }
  return free;
}

// ── Proxy-global sandbox: any identifier outside the allowlist throws ─────────
// This is the strong form of the purity proof. `has` always returns true so
// every free identifier resolves through `get`, which throws for anything that
// was not explicitly seeded. Nothing is stubbed permissively: there is no
// silent no-op fetch to accidentally satisfy.
const ALLOWED_INTRINSICS = { Array: Array, Object: Object, String: String, Number: Number, Boolean: Boolean, Math: Math, isFinite: isFinite, JSON: JSON };
function makeStrictSandbox() {
  const store = Object.create(null);
  Object.keys(ALLOWED_INTRINSICS).forEach(function (k) { store[k] = ALLOWED_INTRINSICS[k]; });
  const touched = [];
  const proxy = new Proxy(store, {
    has: function () { return true; },
    get: function (t, p) {
      if (typeof p === 'symbol') return t[p];
      if (!(p in t)) {
        if (touched.indexOf(p) < 0) touched.push(p);
        throw new ReferenceError('FORBIDDEN_GLOBAL:' + String(p));
      }
      return t[p];
    },
    set: function (t, p, v) { t[p] = v; return true; },
  });
  return { context: vm.createContext(proxy), touched: touched };
}

// Deep write-guard: reading is transparent and identity-stable; ANY write,
// define or delete anywhere in the tree is recorded instead of applied.
function makeWriteGuard() {
  const writes = [];
  const cache = new WeakMap();
  function guard(value, path) {
    if (value === null || typeof value !== 'object') return value;
    if (cache.has(value)) return cache.get(value);
    const p = new Proxy(value, {
      get: function (t, prop, recv) {
        const v = Reflect.get(t, prop, recv);
        if (typeof v === 'function' || typeof prop === 'symbol') return v;
        return guard(v, path + '.' + String(prop));
      },
      set: function (t, prop) { writes.push(path + '.' + String(prop) + ' (set)'); return true; },
      defineProperty: function (t, prop) { writes.push(path + '.' + String(prop) + ' (define)'); return true; },
      deleteProperty: function (t, prop) { writes.push(path + '.' + String(prop) + ' (delete)'); return true; },
    });
    cache.set(value, p);
    return p;
  }
  return { guard: guard, writes: writes };
}

// ── Fixtures ─────────────────────────────────────────────────────────────────
function candidate(over) {
  const base = {
    symbol: 'AAPL', price: 187.5,
    // Operational fields: null on today's diagnostic-only backend.
    direction: null, score: null,
    scoreDiagnostics: { usable: true, rankEligible: true, scorePreview: 91, scoreBucket: 'A' },
    directionDiagnostics: { candidateDirection: 'bullish', confidence: 'high', directionSource: 'diag_v1' },
    cache: { source: 'BACKEND_DXLINK_CANDLE_CACHE', candleCount: 320, ageMs: 1500, reason: null },
    technicalCoverage: { completeCoreTechnicals: true },
    directionParity: { comparable: true, matches: true, mismatchType: null },
    relativeStrengthVsSpy: 1.42, relativeStrengthSource: 'spy_20d',
    rsi14: 58, sma8: 185, sma20: 182, sma30: 180, sma200: 170,
    distFromSma8: 1.3, distFromSma20: 3.0, distFromSma30: 4.1, distFromSma200: 10.2,
    squeezeState: true,
  };
  return Object.assign(base, over || {});
}
function snapshot(over) {
  return Object.assign({
    ok: true, stale: false, ageMs: 4200,
    updatedAt: '2026-07-26T12:00:00.000Z',
    nextScheduledRunAt: '2026-07-26T12:05:00.000Z',
    candidates: [candidate()],
  }, over || {});
}
// A directional row shaped like the adapter's own output, for sort probes.
function row(over) {
  return Object.assign({
    symbol: 'X', scorePreview: 50, scoreBucket: 'B', rankEligible: true,
    relativeStrengthVsSpy: 1, direction: 'bullish', sourceIndex: 0,
  }, over || {});
}

// A strict sandbox holding the nine non-debug helpers, used by the behavioural
// sections below. If any of them ever touches a forbidden global, every probe
// that reaches it throws.
const PURE_BOX = makeStrictSandbox();
BDS_PURE.forEach(function (n) {
  vm.runInContext(APP.extractFunctionSource(n, { source: SRC }), PURE_BOX.context);
});
const A = {};
BDS_PURE.forEach(function (n) { A[n] = vm.runInContext(n, PURE_BOX.context); });

console.log('Backend Directional Adapter — extraction boundary contract');
console.log('application source: ' + SRC.length + ' chars from ' +
  PARTS.filter(function (p) { return p.isAppJs && p.code != null; }).length + ' script(s)');

// ─────────────────────────────────────────────────────────────────────────────
// 1. FUNCTION MANIFEST
//    The audited set must be exactly what it claims to be: ten declarations,
//    each present once, each a real top-level `function` declaration, none of
//    them already extracted into js/.
// ─────────────────────────────────────────────────────────────────────────────
section('1. function manifest');

eq(BDS_ALL.length, 10, 'manifest declares exactly 10 BDS functions');
eq(BDS_PURE.length, 9, 'nine of them are non-debug (3 primitives + 6 adapter)');

BDS_ALL.forEach(function (n) {
  const found = spansOf(n);
  eq(found.length, 1, n + ': declared exactly once (no duplicate declaration)');
  ok(found.length === 1 && found[0].end > found[0].start, n + ': body is brace-balanced');
});

// Function DECLARATION, not a var/const/arrow/method — extraction by relocation
// is only safe while hoisting semantics are the ones in play.
BDS_ALL.forEach(function (n) {
  const stripped = stripCommentsAndStrings(SRC);
  const declRe = new RegExp('(^|\\n)function\\s+' + n + '\\s*\\(', 'g');
  const assignRe = new RegExp('(?:var|let|const)\\s+' + n + '\\s*=|' + n + '\\s*=\\s*(?:function|\\()', 'g');
  ok(declRe.test(stripped), n + ': is a top-level `function` declaration');
  const assigns = stripped.match(assignRe) || [];
  const windowOnly = assigns.every(function (a) { return /=\s*$/.test(a) === false; });
  ok(windowOnly, n + ': not redefined through assignment (only the debug window bridge assigns a bds symbol)');
});

// Nothing has been extracted yet: all ten still live in the inline script.
const INLINE_PART = PARTS.filter(function (p) { return p.isAppJs && p.code != null; })
  .filter(function (p) { return p.kind === 'inline'; });
eq(INLINE_PART.length, 1, 'index.html still holds exactly one inline application script');
BDS_ALL.forEach(function (n) {
  ok(INLINE_PART[0].code.indexOf('function ' + n + '(') >= 0,
     n + ': still inline in index.html (not yet extracted to js/)');
});
['js/adapters/backend-directional-adapter.js', 'js/ui/backend-directional-preview.js',
 'js/services/backend-directional-service.js'].forEach(function (f) {
  const referenced = PARTS.some(function (p) { return p.src && String(p.src).indexOf(f) >= 0; });
  ok(!referenced, 'future module not created yet: ' + f);
});

// The preview closure is fully present and separately inventoried.
eq(BDSP_FNS.length, 32, 'BDSP inventory declares 32 functions');
BDSP_FNS.forEach(function (n) {
  eq(spansOf(n).length, 1, 'BDSP ' + n + ': declared exactly once');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIGNATURES
//    Arity is part of the boundary: a future module that changes it silently
//    breaks every call site that stays in the monolith.
// ─────────────────────────────────────────────────────────────────────────────
section('2. signatures');

const EXPECTED_ARITY = {
  _bdsNum: 1, _bdsBoolOrNull: 1, _bdsStrOrNull: 1,
  bdsIsBackendDirectionalCandidate: 1,
  bdsMapBackendCandidateToDirectionalRow: 2,
  bdsSortBackendDirectionalRows: 1,
  bdsDeriveBackendDirectionalRows: 2,
  bdsBackendDirectionalSummary: 1,
  bdsGetBackendDirectionalSourceState: 2,
};
const EXPECTED_PARAMS = {
  _bdsNum: 'v', _bdsBoolOrNull: 'v', _bdsStrOrNull: 'v',
  bdsIsBackendDirectionalCandidate: 'candidate',
  bdsMapBackendCandidateToDirectionalRow: 'candidate,index',
  bdsSortBackendDirectionalRows: 'rows',
  bdsDeriveBackendDirectionalRows: 'snapshot,options',
  bdsBackendDirectionalSummary: 'rows',
  bdsGetBackendDirectionalSourceState: 'snapshot,status',
};
Object.keys(EXPECTED_ARITY).forEach(function (n) {
  eq(A[n].length, EXPECTED_ARITY[n], n + ': arity');
  const m = /^function\s+[A-Za-z0-9_$]+\s*\(([^)]*)\)/.exec(bodyOf(n));
  const params = m ? m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean).join(',') : '';
  eq(params, EXPECTED_PARAMS[n], n + ': parameter names');
});
const debugSig = /^function\s+apexDebugBackendDirectionalAdapter\s*\(\s*\)/.test(bodyOf(BDS_DEBUG));
ok(debugSig, BDS_DEBUG + ': takes no arguments');

// None of the nine is async or a generator — the boundary is synchronous.
BDS_PURE.forEach(function (n) {
  const b = bodyOf(n);
  ok(b.indexOf('async function') !== 0, n + ': not async');
  ok(!/^function\s*\*/.test(b), n + ': not a generator');
  ok(b.indexOf('await ') < 0, n + ': contains no await');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PHYSICAL ORDER
//    Measured, not assumed. The real layout differs from the naive schema:
//    the BSS service is an EXTERNAL script that precedes everything; inside the
//    inline script the scanner-frontend consumers come BEFORE the adapter, the
//    debug window exposure sits BETWEEN the adapter and BDSP, and the inline
//    BSS UI comes LAST.
// ─────────────────────────────────────────────────────────────────────────────
section('3. physical order');

const APP_PARTS = PARTS.filter(function (p) { return p.isAppJs && p.code != null; });
let offset = 0;
const PART_RANGES = APP_PARTS.map(function (p) {
  const r = { src: p.src || '(inline)', kind: p.kind, start: offset, end: offset + p.code.length };
  offset += p.code.length + 1; // loadAppJavaScriptSource joins with '\n'
  return r;
});
function partOf(index) {
  for (const r of PART_RANGES) if (index >= r.start && index < r.end) return r;
  return null;
}

const bssServicePart = PART_RANGES.filter(function (r) { return /backend-scanner-snapshot-service\.js$/.test(r.src); });
eq(bssServicePart.length, 1, 'BSS snapshot service is its own external script');
ok(partOf(declStart('bssState')) === bssServicePart[0], 'bssState lives in the BSS service script');
ok(partOf(declStart('bssRefresh')) === bssServicePart[0], 'bssRefresh lives in the BSS service script');
ok(bssServicePart[0].end <= PART_RANGES[PART_RANGES.length - 1].start,
   'BSS service script is loaded BEFORE the inline application script');

// Relative order of the ten declarations inside the inline script.
const ORDERED = BDS_ALL.slice();
for (let i = 1; i < ORDERED.length; i++) {
  ok(declStart(ORDERED[i - 1]) < declStart(ORDERED[i]),
     'physical order: ' + ORDERED[i - 1] + ' precedes ' + ORDERED[i]);
}
BDS_ALL.forEach(function (n) {
  const r = partOf(declStart(n));
  ok(r && r.kind === 'inline', n + ': declared in the inline script');
});

// The window bridge sits between the adapter block and the BDSP block.
// NOTE: offsets must be taken from SRC, not from the stripped copy — stripping
// comments and string bodies shifts every index.
const strippedSrc = stripCommentsAndStrings(SRC);
const windowExposureIdx = SRC.indexOf('window.apexDebugBackendDirectionalAdapter =');
ok(windowExposureIdx > declStart(BDS_DEBUG), 'window exposure follows the debug-helper declaration');
ok(windowExposureIdx < declStart('bdspStorageKey'), 'window exposure precedes the BDSP block');

// Measured macro-order of the inline script.
const ORDER_POINTS = [
  ['runScan (scanner frontend)', declStart('runScan')],
  ['renderScanResults (scanner frontend)', declStart('renderScanResults')],
  ['BDS adapter declarations', declStart('_bdsNum')],
  ['debug window exposure', windowExposureIdx],
  ['BDSP declarations', declStart('bdspStorageKey')],
  ['bdspInit() bootstrap call', SRC.indexOf('bdspInit();')],
  ['dsbLegacyOperationalSource (swing/DSB consumer)', declStart('dsbLegacyOperationalSource')],
  ['inline BSS UI (bssRender)', declStart('bssRender')],
];
ORDER_POINTS.forEach(function (p) { ok(p[1] > 0, 'order point located: ' + p[0]); });
for (let i = 1; i < ORDER_POINTS.length; i++) {
  ok(ORDER_POINTS[i - 1][1] < ORDER_POINTS[i][1],
     'measured macro-order: ' + ORDER_POINTS[i - 1][0] + ' before ' + ORDER_POINTS[i][0]);
}
// Explicit corrections of the naive schema.
ok(declStart('bssRender') > declStart('bdspStorageKey'),
   'measured: the INLINE BSS UI comes AFTER BDSP (not before the adapter)');
ok(declStart('runScan') < declStart('_bdsNum'),
   'measured: scanner-frontend consumers are declared BEFORE the adapter');

// Everything is hoisted function declarations in one shared script scope, so
// the only real temporal requirement is that nothing RUNS before the whole
// inline script is evaluated. bdspInit() satisfies this by living in a click
// handler, not at module scope.
const bdspInitCallIdx = SRC.indexOf('bdspInit();');
const bdspInitEnclosing = enclosingFn(bdspInitCallIdx);
ok(bdspInitEnclosing === null || bdspInitEnclosing.name !== 'bdspInit',
   'bdspInit() call site is not a self-call');
ok(bdspInitCallIdx > spansOf('apexDebugBackendDirectionalPreview')[0].end,
   'bdspInit() is invoked only after the whole BDSP block is declared');
ok(SRC.slice(Math.max(0, bdspInitCallIdx - 4000), bdspInitCallIdx).indexOf("addEventListener('click'") >= 0,
   'bdspInit() runs from the launch click handler, not at script evaluation time');

// ─────────────────────────────────────────────────────────────────────────────
// 4. PURITY OF THE NINE NON-DEBUG FUNCTIONS
//    Static token scan + dynamic execution inside the throwing sandbox.
//
//    MUTATION PROOF: adding `fetch(...)` inside bdsDeriveBackendDirectionalRows
//    fails here twice — the static scan flags the token, and every dynamic probe
//    that reaches derive throws FORBIDDEN_GLOBAL:fetch.
// ─────────────────────────────────────────────────────────────────────────────
section('4. purity of the nine non-debug functions');

const FORBIDDEN_TOKENS = [
  ['fetch', /\bfetch\s*\(/],
  ['ttCall', /\bttCall\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['WebSocket', /\bWebSocket\b/],
  ['EventSource', /\bEventSource\b/],
  ['subscribe*', /\bsubscribe[A-Za-z0-9_$]*\s*\(/],
  ['addEventListener', /\baddEventListener\s*\(/],
  ['setTimeout', /\bsetTimeout\s*\(/],
  ['setInterval', /\bsetInterval\s*\(/],
  ['requestAnimationFrame', /\brequestAnimationFrame\s*\(/],
  ['queueMicrotask', /\bqueueMicrotask\s*\(/],
  ['Promise', /\bPromise\b/],
  ['document', /\bdocument\b/],
  ['innerHTML', /\binnerHTML\b/],
  ['getElementById', /\bgetElementById\s*\(/],
  ['localStorage', /\blocalStorage\b/],
  ['sessionStorage', /\bsessionStorage\b/],
  ['console', /\bconsole\s*\./],
  ['window', /\bwindow\b/],
  ['globalThis', /\bglobalThis\b/],
  ['S (app state)', /\bS\s*\./],
  ['S.scanData', /\bS\.scanData\b/],
  ['backend URL', /\b(?:BACKEND_URL|backendUrl|getBackendUrl|apiBase)\b/],
  ['auth/session', /\b(?:backendKey|sessionToken|ttSessionId|Authorization|authHeader)\b/],
];
BDS_PURE.forEach(function (n) {
  const clean = stripCommentsAndStrings(bodyOf(n));
  FORBIDDEN_TOKENS.forEach(function (t) {
    ok(!t[1].test(clean), n + ': no ' + t[0]);
  });
});

// Dynamic: exercise every function across every branch shape and require that
// the sandbox never records a forbidden global.
const dynamicProbes = [
  function () {
    [null, undefined, 0, 1, -1, NaN, Infinity, -Infinity, '3', '', {}, [], true, false].forEach(function (v) {
      A._bdsNum(v); A._bdsBoolOrNull(v); A._bdsStrOrNull(v);
    });
  },
  function () {
    [null, undefined, 'str', 42, {}, { symbol: 'A' }, candidate(),
     candidate({ scoreDiagnostics: null }), candidate({ directionDiagnostics: null }),
     candidate({ cache: null }), candidate({ technicalCoverage: null }),
     candidate({ scoreDiagnostics: { usable: false, rankEligible: true, scorePreview: 1 } }),
     candidate({ directionDiagnostics: { candidateDirection: 'neutral' } })
    ].forEach(function (c) { A.bdsIsBackendDirectionalCandidate(c); });
  },
  function () {
    [null, undefined, {}, candidate(), candidate({ relativeStrength: { vsSpy: -1 } }),
     candidate({ relativeStrength: 2 }), candidate({ relativeStrengthVsSpy: null, relativeStrength: { value: 5 } }),
     candidate({ directionParity: { comparable: true, matches: false, mismatchType: 'flip' } })
    ].forEach(function (c, i) { A.bdsMapBackendCandidateToDirectionalRow(c, i); });
    A.bdsMapBackendCandidateToDirectionalRow(candidate(), 'not-a-number');
  },
  function () {
    A.bdsSortBackendDirectionalRows(null);
    A.bdsSortBackendDirectionalRows('x');
    A.bdsSortBackendDirectionalRows([row(), row({ scorePreview: null }), row({ direction: 'bearish' }), row({ scoreBucket: null })]);
  },
  function () {
    [undefined, null, 'x', {}, { ok: false }, { ok: true }, { ok: true, candidates: null },
     snapshot(), snapshot({ stale: true })
    ].forEach(function (s) {
      A.bdsDeriveBackendDirectionalRows(s);
      A.bdsDeriveBackendDirectionalRows(s, { includeNonEligible: true, requireFresh: true, directionFilter: 'bullish', maxRows: 1 });
      A.bdsDeriveBackendDirectionalRows(s, { directionFilter: 'bearish', maxRows: 0 });
    });
  },
  function () {
    [null, undefined, 'x', [], [null, 'str', {}], A.bdsDeriveBackendDirectionalRows(snapshot(), { includeNonEligible: true })]
      .forEach(function (r) { A.bdsBackendDirectionalSummary(r); });
  },
  function () {
    [[null, null], [undefined, undefined], [snapshot(), null], [snapshot(), {}],
     [snapshot(), { statusError: 'e' }], [snapshot(), { snapshotError: 'e' }],
     [snapshot(), { schedulerEnabled: false }], [snapshot(), { scheduler: { enabled: true } }],
     [{ ok: true, candidates: [] }, null], [{ ok: true, candidates: 'x' }, null],
     [{ ok: false }, null], [{ ok: true, candidates: [{ symbol: 'A' }] }, null]
    ].forEach(function (p) { A.bdsGetBackendDirectionalSourceState(p[0], p[1]); });
  },
];
let dynamicError = null;
try { dynamicProbes.forEach(function (p) { p(); }); } catch (e) { dynamicError = e; }
ok(dynamicError === null, 'dynamic: all nine helpers run to completion in the throwing sandbox' +
   (dynamicError ? ' — threw ' + dynamicError.message : ''));
deepEq(PURE_BOX.touched, [], 'dynamic: zero forbidden globals were touched across all probes');

// No logging of any kind.
BDS_PURE.forEach(function (n) {
  ok(!/\bconsole\b/.test(stripCommentsAndStrings(bodyOf(n))), n + ': no console reference at all');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEPENDENCIES
//    The real intrinsic set is NARROWER than the assumed one: only Array,
//    Object, String and isFinite are used. Number, Boolean, Math and JSON are
//    NOT referenced by the nine. No non-BDS application helper is used at all —
//    which is the single fact that makes a copy-free extraction possible.
// ─────────────────────────────────────────────────────────────────────────────
section('5. dependencies');

const INTRINSIC_CANDIDATES = ['Array', 'Object', 'String', 'Number', 'Boolean', 'Math', 'isFinite', 'JSON'];
const ACTUALLY_USED_INTRINSICS = ['Array', 'Object', 'String', 'isFinite'];
const UNUSED_INTRINSICS = ['Number', 'Boolean', 'Math', 'JSON'];

const unionFree = new Set();
const perFunctionDeps = {};
BDS_PURE.forEach(function (n) {
  const free = freeIdentifiers(bodyOf(n));
  free.delete(n);
  perFunctionDeps[n] = Array.from(free).sort();
  perFunctionDeps[n].forEach(function (x) { unionFree.add(x); });
});
const externalDeps = Array.from(unionFree).filter(function (x) { return BDS_PURE.indexOf(x) < 0; }).sort();
deepEq(externalDeps, ACTUALLY_USED_INTRINSICS.slice().sort(),
   'the nine depend on EXACTLY these non-BDS identifiers');
ACTUALLY_USED_INTRINSICS.forEach(function (i) {
  ok(INTRINSIC_CANDIDATES.indexOf(i) >= 0, i + ': is a plain JS intrinsic (no polyfill, no app helper)');
});
UNUSED_INTRINSICS.forEach(function (i) {
  ok(externalDeps.indexOf(i) < 0, 'measured: ' + i + ' is NOT actually used by the nine');
});

// Zero dependency on any non-BDS application helper — including the ones BDSP
// needs (escHtml is the concrete counter-example).
const APP_HELPER_NAMES = SPANS.map(function (s) { return s.name; })
  .filter(function (n) { return BDS_ALL.indexOf(n) < 0; });
const APP_HELPER_SET = new Set(APP_HELPER_NAMES);
const leakedHelpers = externalDeps.filter(function (d) { return APP_HELPER_SET.has(d); });
deepEq(leakedHelpers, [], 'the nine reference NO application helper declared elsewhere in the monolith');
ok(APP_HELPER_SET.has('escHtml'), 'escHtml exists as a monolith helper');
ok(externalDeps.indexOf('escHtml') < 0, 'the nine do not use escHtml (BDSP does — that is the split)');
ok(externalDeps.indexOf('bssState') < 0, 'the nine do not read bssState (only the debug bridge does)');
ok(externalDeps.indexOf('bssRefresh') < 0, 'the nine do not call bssRefresh (only BDSP does)');

// Per-function dependency inventory, pinned exactly.
const EXPECTED_DEPS = {
  _bdsNum: ['isFinite'],
  _bdsBoolOrNull: [],
  _bdsStrOrNull: [],
  bdsIsBackendDirectionalCandidate: ['isFinite'],
  bdsMapBackendCandidateToDirectionalRow: ['String', '_bdsBoolOrNull', '_bdsNum', '_bdsStrOrNull', 'isFinite'],
  bdsSortBackendDirectionalRows: ['Array', 'Object', 'isFinite'],
  bdsDeriveBackendDirectionalRows: ['Array', 'bdsIsBackendDirectionalCandidate', 'bdsMapBackendCandidateToDirectionalRow', 'bdsSortBackendDirectionalRows', 'isFinite'],
  bdsBackendDirectionalSummary: ['Array'],
  bdsGetBackendDirectionalSourceState: ['Array', '_bdsBoolOrNull', '_bdsNum', '_bdsStrOrNull'],
};
Object.keys(EXPECTED_DEPS).forEach(function (n) {
  deepEq(perFunctionDeps[n], EXPECTED_DEPS[n].slice().sort(), n + ': direct dependency set');
});

// The three primitives are only used inside the adapter — they carry no
// external contract and can move without touching any caller.
BDS_PRIMITIVES.forEach(function (p) {
  const users = Array.from(callersOf(p).keys()).filter(function (u) { return u !== '(module-scope)'; });
  const outside = users.filter(function (u) { return BDS_ALL.indexOf(u) < 0; });
  deepEq(outside, [], p + ': used only from inside the BDS block');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. INTERNAL CALL GRAPH
//    Reconstructed from the real source, not from the schema in the brief.
// ─────────────────────────────────────────────────────────────────────────────
section('6. internal call graph');

const EXPECTED_INTERNAL_EDGES = {
  _bdsNum: [],
  _bdsBoolOrNull: [],
  _bdsStrOrNull: [],
  bdsIsBackendDirectionalCandidate: [],
  bdsMapBackendCandidateToDirectionalRow: ['_bdsBoolOrNull', '_bdsNum', '_bdsStrOrNull'],
  bdsSortBackendDirectionalRows: [],
  bdsDeriveBackendDirectionalRows: ['bdsIsBackendDirectionalCandidate', 'bdsMapBackendCandidateToDirectionalRow', 'bdsSortBackendDirectionalRows'],
  bdsBackendDirectionalSummary: [],
  bdsGetBackendDirectionalSourceState: ['_bdsBoolOrNull', '_bdsNum', '_bdsStrOrNull'],
  apexDebugBackendDirectionalAdapter: ['bdsBackendDirectionalSummary', 'bdsDeriveBackendDirectionalRows', 'bdsGetBackendDirectionalSourceState'],
};
Object.keys(EXPECTED_INTERNAL_EDGES).forEach(function (n) {
  const body = stripCommentsAndStrings(bodyOf(n));
  const edges = BDS_ALL.filter(function (t) {
    return t !== n && new RegExp('\\b' + t + '\\s*\\(').test(body);
  }).sort();
  deepEq(edges, EXPECTED_INTERNAL_EDGES[n].slice().sort(), n + ': internal call edges');
});

// The graph is a DAG rooted at derive; the primitives are leaves.
ok(EXPECTED_INTERNAL_EDGES._bdsNum.length === 0 &&
   EXPECTED_INTERNAL_EDGES._bdsBoolOrNull.length === 0 &&
   EXPECTED_INTERNAL_EDGES._bdsStrOrNull.length === 0, 'primitives are graph leaves (no outgoing edges)');
ok(EXPECTED_INTERNAL_EDGES.bdsBackendDirectionalSummary.length === 0,
   'summary is a leaf: it consumes rows, never the snapshot');
ok(EXPECTED_INTERNAL_EDGES.bdsSortBackendDirectionalRows.length === 0,
   'sort is a leaf: comparator is self-contained');
ok(EXPECTED_INTERNAL_EDGES.bdsGetBackendDirectionalSourceState
     .every(function (e) { return BDS_PRIMITIVES.indexOf(e) >= 0; }),
   'source-state depends only on primitives (never on derive/map/sort)');

// Nothing outside the ten calls a primitive, and nothing inside the nine calls
// the debug bridge — so the bridge is a strict superset, safely detachable.
ok(!new RegExp('\\b' + BDS_DEBUG + '\\s*\\(').test(
     BDS_PURE.map(function (n) { return stripCommentsAndStrings(bodyOf(n)); }).join('\n')),
   'no pure function calls the debug bridge');

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONSUMER: BACKEND DIRECTIONAL PREVIEW (BDSP)
//    BDSP uses the adapter, reads bssState, delegates refresh to bssRefresh,
//    owns localStorage, DOM, HTML and UI state — therefore it does NOT belong
//    to the same pure module.
// ─────────────────────────────────────────────────────────────────────────────
section('7. consumer — Backend Directional Preview');

const BDSP_BDS_USERS = {
  bdspRenderSummary: ['bdsBackendDirectionalSummary'],
  bdspGetRowsForScannerResults: ['bdsBackendDirectionalSummary', 'bdsDeriveBackendDirectionalRows', 'bdsGetBackendDirectionalSourceState'],
  apexDebugBackendDirectionalPreview: ['bdsBackendDirectionalSummary', 'bdsDeriveBackendDirectionalRows', 'bdsGetBackendDirectionalSourceState'],
};
BDSP_FNS.forEach(function (n) {
  const body = stripCommentsAndStrings(bodyOf(n));
  const used = BDS_ALL.filter(function (t) { return new RegExp('\\b' + t + '\\s*\\(').test(body); }).sort();
  deepEq(used, (BDSP_BDS_USERS[n] || []).slice().sort(), 'BDSP ' + n + ': adapter functions used');
});
ok(Object.keys(BDSP_BDS_USERS).length === 3, 'exactly three BDSP functions reach into the adapter');
ok(!Object.keys(BDSP_BDS_USERS).some(function (k) { return BDSP_BDS_USERS[k].indexOf(BDS_DEBUG) >= 0; }),
   'no BDSP function calls the adapter debug bridge');
BDS_PRIMITIVES.forEach(function (p) {
  const anyBdsp = BDSP_FNS.some(function (n) { return new RegExp('\\b' + p + '\\b').test(stripCommentsAndStrings(bodyOf(n))); });
  ok(!anyBdsp, 'no BDSP function reaches the private primitive ' + p);
});

// BDSP owns the impure surfaces, one by one.
const bdspBlockRaw = SRC.slice(declStart('bdspStorageKey'), spansOf('apexDebugBackendDirectionalPreview')[0].end);
const bdspBlock = stripCommentsAndStrings(bdspBlockRaw);
ok(/\bbssState\s*\(/.test(bdspBlock), 'BDSP reads bssState()');
ok(/\bbssRefresh\s*\(/.test(bdspBlock), 'BDSP delegates refresh to bssRefresh()');
ok(/\blocalStorage\.getItem\b/.test(bdspBlock), 'BDSP reads localStorage');
ok(/\blocalStorage\.setItem\b/.test(bdspBlock), 'BDSP writes localStorage');
ok(/\bdocument\.getElementById\b/.test(bdspBlock), 'BDSP touches the DOM');
ok(/\binnerHTML\b/.test(bdspBlock), 'BDSP writes HTML');
ok(/\bescHtml\s*\(/.test(bdspBlock), 'BDSP depends on the monolith helper escHtml');
ok(/\bS\.backendDirectionalPreview\b/.test(bdspBlock), 'BDSP owns UI state on S');

// Refresh delegates only — it never opens a second lifecycle.
const refreshBody = stripCommentsAndStrings(bodyOf('bdspRefresh'));
ok(/\bbssRefresh\s*\(\s*\)/.test(refreshBody), 'bdspRefresh delegates to bssRefresh()');
ok(!/\bfetch\s*\(/.test(refreshBody) && !/\bttCall\s*\(/.test(refreshBody),
   'bdspRefresh performs no request of its own');
ok(!/scanner\/run/.test(refreshBody), 'bdspRefresh never triggers POST /scanner/run (code, comments aside)');
ok(!/\bsetInterval\s*\(/.test(bdspBlock), 'BDSP starts no polling loop');

// The toggle activates no request: it flips state, persists it, re-renders.
const setEnabledBody = stripCommentsAndStrings(bodyOf('bdspSetEnabled'));
ok(!/\bfetch\s*\(/.test(setEnabledBody) && !/\bttCall\s*\(/.test(setEnabledBody) && !/\bbssRefresh\s*\(/.test(setEnabledBody),
   'bdspSetEnabled issues no request when the preview is toggled');
ok(/\bbdspPersistEnabled\s*\(/.test(setEnabledBody) && /\bbdspRender\s*\(/.test(setEnabledBody),
   'bdspSetEnabled only persists and re-renders');

// The override replaces HTML only — S.scanData is read for a reference check
// and never assigned.
const overrideBody = stripCommentsAndStrings(bodyOf('bdspRenderScannerResultsOverride'));
ok(/\binnerHTML\s*=/.test(overrideBody), 'bdspRenderScannerResultsOverride assigns innerHTML');
ok(!/\bS\.scanData\s*=(?!=)/.test(bdspBlock), 'no BDSP function assigns S.scanData');
ok(!/\bS\.scanData\s*\.\s*(?:push|splice|pop|shift|unshift|sort|reverse)\s*\(/.test(bdspBlock),
   'no BDSP function mutates the S.scanData array in place');
const sWrites = new Set();
let sw; const swRe = /\bS\.([A-Za-z0-9_$]+)\s*=(?!=)/g;
while ((sw = swRe.exec(bdspBlock))) sWrites.add(sw[1]);
deepEq(Array.from(sWrites).sort(), ['backendDirectionalPreview'],
   'BDSP writes exactly one property on S');

// bdspToggle is declared but unreferenced anywhere (JS or markup): dead code
// today, so it carries no wiring risk in either direction.
const toggleUsers = Array.from(callersOf('bdspToggle').keys());
deepEq(toggleUsers, [], 'bdspToggle currently has no caller (declared but unused)');

// ─────────────────────────────────────────────────────────────────────────────
// 8. CONSUMER: SCANNER FRONTEND (and the fifth consumer the schema missed)
//
//    MUTATION PROOF: wiring the adapter directly into runScan fails here.
// ─────────────────────────────────────────────────────────────────────────────
section('8. consumer — scanner frontend and other live consumers');

SCANNER_FRONTEND.forEach(function (n) {
  ok(spansOf(n).length === 1, n + ': exists');
  const body = stripCommentsAndStrings(bodyOf(n));
  const bdsHits = BDS_ALL.filter(function (t) { return new RegExp('\\b' + t + '\\b').test(body); });
  deepEq(bdsHits, [], n + ': does NOT use the adapter directly');
  const bdspHits = BDSP_FNS.filter(function (t) { return new RegExp('\\b' + t + '\\b').test(body); });
  deepEq(bdspHits, [], n + ': does NOT use the preview either');
});

// The single frontend touch point is renderScanResults, and it goes through
// BDSP — never through the adapter.
const rsrBody = stripCommentsAndStrings(bodyOf('renderScanResults'));
ok(/\bbdspMaybeRenderScannerResults\s*\(/.test(rsrBody),
   'renderScanResults consults bdspMaybeRenderScannerResults');
ok(/typeof\s+bdspMaybeRenderScannerResults\s*===\s*''/.test(rsrBody) ||
   /typeof\s+bdspMaybeRenderScannerResults/.test(rsrBody),
   'renderScanResults guards the call with a typeof check');
deepEq(BDS_ALL.filter(function (t) { return new RegExp('\\b' + t + '\\b').test(rsrBody); }), [],
   'renderScanResults never touches the adapter directly');

// Who uses the scanner-results override path.
deepEq(Array.from(callersOf('bdspMaybeRenderScannerResults').keys()).sort(), ['renderScanResults'],
   'bdspMaybeRenderScannerResults is called only by renderScanResults');
deepEq(Array.from(callersOf('bdspRenderScannerResultsOverride').keys()).sort(),
   ['bdspMaybeRenderScannerResults', 'bdspRender'],
   'bdspRenderScannerResultsOverride is called only from inside BDSP');
deepEq(Array.from(callersOf('bdspRestoreFrontendScannerResults').keys()).sort(), ['bdspRender'],
   'frontend restore is driven only by bdspRender');
ok(/\brenderScanResults\s*\(/.test(stripCommentsAndStrings(bodyOf('bdspRestoreFrontendScannerResults'))),
   'restore hands rendering back to the frontend renderScanResults');

// MEASURED DIVERGENCE: a fifth consumer exists outside BDSP — the swing /
// directional-source-bias legacy fallback. It calls derive directly and would
// need the adapter to stay reachable as a global after any extraction.
ok(spansOf('dsbLegacyOperationalSource').length === 1,
   'dsbLegacyOperationalSource exists (swing/DSB legacy fallback)');
const dsbBody = stripCommentsAndStrings(bodyOf('dsbLegacyOperationalSource'));
ok(/\bbdsDeriveBackendDirectionalRows\s*\(/.test(dsbBody),
   'DSB consumer calls bdsDeriveBackendDirectionalRows directly');
ok(/typeof\s+bdsDeriveBackendDirectionalRows\s*!==/.test(dsbBody),
   'DSB consumer guards on typeof before calling — tolerant of a missing global');
ok(/\bbssState\s*\(/.test(dsbBody), 'DSB consumer reads bssState() itself');
deepEq(Array.from(callersOf('dsbLegacyOperationalSource').keys()).sort(), ['dsbGetBackendSource'],
   'DSB consumer is reached only through dsbGetBackendSource');

// Full external-consumer inventory of the adapter, measured.
const EXTERNAL_CONSUMERS = {};
BDS_ADAPTER.forEach(function (t) {
  Array.from(callersOf(t).keys()).forEach(function (c) {
    if (BDS_ALL.indexOf(c) >= 0 || c === '(module-scope)') return;
    if (!EXTERNAL_CONSUMERS[c]) EXTERNAL_CONSUMERS[c] = [];
    if (EXTERNAL_CONSUMERS[c].indexOf(t) < 0) EXTERNAL_CONSUMERS[c].push(t);
  });
});
deepEq(Object.keys(EXTERNAL_CONSUMERS).sort(),
   ['apexDebugBackendDirectionalPreview', 'bdspGetRowsForScannerResults', 'bdspRenderSummary', 'dsbLegacyOperationalSource'],
   'the adapter has exactly four external consumers (three BDSP + one DSB)');

// No BSS function calls the adapter — the dependency points one way only.
['bssState', 'bssRefresh', 'bssRender', 'bssInit'].forEach(function (n) {
  if (spansOf(n).length !== 1) { ok(false, n + ': expected exactly one declaration'); return; }
  const body = stripCommentsAndStrings(bodyOf(n));
  deepEq(BDS_ALL.filter(function (t) { return new RegExp('\\b' + t + '\\b').test(body); }), [],
     n + ' (BSS): does not call the adapter');
});
ok(/\bbdspRender\s*\(/.test(stripCommentsAndStrings(bodyOf('bssRender'))),
   'bssRender re-renders BDSP (BSS → BDSP, never BSS → BDS)');

// ─────────────────────────────────────────────────────────────────────────────
// 9. MAPPING OWNERSHIP
//    Which row fields the boundary owns, and which of them are diagnostic,
//    operational-but-inert, derived, or drilldown-only.
//
//    MUTATION PROOF: using candidate.direction as the primary direction, or
//    candidate.score as the primary score, fails here.
// ─────────────────────────────────────────────────────────────────────────────
section('9. mapping ownership');

const mappedRow = A.bdsMapBackendCandidateToDirectionalRow(candidate(), 7);
const ROW_KEYS = [
  'source', 'sourceLabel', 'sourceIndex', 'symbol', 'price', 'direction',
  'directionConfidence', 'directionSource', 'scorePreview', 'scoreBucket',
  'rankEligible', 'rsi14', 'sma8', 'sma20', 'sma30', 'sma200', 'distFromSma8',
  'distFromSma20', 'distFromSma30', 'distFromSma200', 'squeezeState',
  'relativeStrengthVsSpy', 'relativeStrengthSource', 'parityComparable',
  'parityMatches', 'parityMismatchType', 'candleCount', 'candleSource',
  'candleReason', 'cacheAgeMs', 'completeCoreTechnicals', 'backendCandidate',
  'operationalDirection', 'operationalScore', 'warnings',
];
deepEq(Object.keys(mappedRow), ROW_KEYS, 'row shape: exact key list and order');
eq(Object.keys(mappedRow).length, 35, 'row shape: 35 fields');

// The fields the brief asks us to protect, classified.
const FIELD_CLASS = {
  direction: 'diagnostic (from directionDiagnostics.candidateDirection)',
  operationalDirection: 'operational but inert (mirrors candidate.direction)',
  scorePreview: 'diagnostic (from scoreDiagnostics.scorePreview)',
  operationalScore: 'operational but inert (mirrors candidate.score)',
  scoreBucket: 'diagnostic (from scoreDiagnostics.scoreBucket)',
  rankEligible: 'diagnostic (from scoreDiagnostics.rankEligible)',
  relativeStrengthVsSpy: 'derived (multi-shape fallback)',
  source: 'derived constant',
  sourceLabel: 'derived constant',
  sourceIndex: 'derived (snapshot position)',
  backendCandidate: 'drilldown (live reference to the input candidate)',
  warnings: 'derived diagnostics',
  parityComparable: 'diagnostic (from directionParity)',
  parityMatches: 'diagnostic (from directionParity)',
  parityMismatchType: 'diagnostic (from directionParity)',
};
Object.keys(FIELD_CLASS).forEach(function (f) {
  ok(ROW_KEYS.indexOf(f) >= 0, 'protected field present: ' + f + ' — ' + FIELD_CLASS[f]);
});

// Diagnostic-vs-operational ownership, proved with a candidate whose
// operational fields DISAGREE with the diagnostic ones.
const conflicting = candidate({
  direction: 'bearish', score: 12,
  directionDiagnostics: { candidateDirection: 'bullish', confidence: 'low', directionSource: 'diag' },
  scoreDiagnostics: { usable: true, rankEligible: true, scorePreview: 88, scoreBucket: 'A' },
});
const conflictRow = A.bdsMapBackendCandidateToDirectionalRow(conflicting, 0);
eq(conflictRow.direction, 'bullish', 'direction comes from directionDiagnostics.candidateDirection, NOT candidate.direction');
eq(conflictRow.operationalDirection, 'bearish', 'operationalDirection mirrors candidate.direction verbatim');
eq(conflictRow.scorePreview, 88, 'scorePreview comes from scoreDiagnostics.scorePreview, NOT candidate.score');
eq(conflictRow.operationalScore, 12, 'operationalScore mirrors candidate.score verbatim');
ok(conflictRow.direction !== conflictRow.operationalDirection,
   'diagnostic and operational direction are separate fields, never merged');

// On today's diagnostic-only backend both operational fields stay null.
eq(mappedRow.operationalDirection, null, 'operationalDirection null on a diagnostic-only candidate');
eq(mappedRow.operationalScore, null, 'operationalScore null on a diagnostic-only candidate');

// Constants and drilldown reference.
eq(mappedRow.source, 'BACKEND_SCANNER_SNAPSHOT', 'source constant');
eq(mappedRow.sourceLabel, 'Backend snapshot', 'sourceLabel constant');
eq(mappedRow.sourceIndex, 7, 'sourceIndex echoes the supplied index');
eq(A.bdsMapBackendCandidateToDirectionalRow(candidate(), 'x').sourceIndex, 0, 'non-numeric index falls back to 0');
const dr = candidate();
eq(A.bdsMapBackendCandidateToDirectionalRow(dr, 0).backendCandidate, dr,
   'backendCandidate is the SAME reference as the input candidate (drilldown, not a clone)');
eq(A.bdsMapBackendCandidateToDirectionalRow(null, 0).backendCandidate, null,
   'backendCandidate is null for a non-object input');

// Incomplete input is tolerated, never thrown on, and reported through warnings.
let mapThrew = false;
try { A.bdsMapBackendCandidateToDirectionalRow(undefined, 0); } catch (e) { mapThrew = true; }
ok(!mapThrew, 'mapping never throws on missing input');
const emptyRow = A.bdsMapBackendCandidateToDirectionalRow({}, 0);
ok(Array.isArray(emptyRow.warnings), 'warnings is always an array');
['missing_symbol', 'missing_direction_diagnostics', 'missing_score_preview',
 'not_rank_eligible', 'cache_not_ready', 'core_technicals_incomplete'].forEach(function (w) {
  ok(emptyRow.warnings.indexOf(w) >= 0, 'empty candidate warns: ' + w);
});
deepEq(A.bdsMapBackendCandidateToDirectionalRow(candidate(), 0).warnings, [],
   'a complete candidate produces no warnings');
const parityBad = A.bdsMapBackendCandidateToDirectionalRow(
  candidate({ directionParity: { comparable: true, matches: false, mismatchType: 'flip' } }), 0);
ok(parityBad.warnings.indexOf('parity_mismatch') >= 0, 'parity mismatch is warned');
eq(parityBad.parityMismatchType, 'flip', 'parityMismatchType is carried through');
const neutralRow = A.bdsMapBackendCandidateToDirectionalRow(
  candidate({ directionDiagnostics: { candidateDirection: 'neutral' } }), 0);
eq(neutralRow.direction, null, 'neutral candidateDirection maps to null direction');
ok(neutralRow.warnings.indexOf('direction_not_directional') >= 0, 'non-directional direction is warned');

// relativeStrengthVsSpy fallback chain (number → object.vsSpy → object.value).
eq(A.bdsMapBackendCandidateToDirectionalRow(candidate({ relativeStrengthVsSpy: null, relativeStrength: 3 }), 0).relativeStrengthVsSpy, 3,
   'relativeStrength as a plain number is accepted');
eq(A.bdsMapBackendCandidateToDirectionalRow(candidate({ relativeStrengthVsSpy: null, relativeStrength: { vsSpy: -2 } }), 0).relativeStrengthVsSpy, -2,
   'relativeStrength.vsSpy is accepted');
eq(A.bdsMapBackendCandidateToDirectionalRow(candidate({ relativeStrengthVsSpy: null, relativeStrength: { value: 9 } }), 0).relativeStrengthVsSpy, 9,
   'relativeStrength.value is accepted');

// ─────────────────────────────────────────────────────────────────────────────
// 10. SORTING
//     The observed ordering is pinned as-is. No "better" sort is imposed.
//
//     MUTATION PROOF: an in-place sort fails here.
// ─────────────────────────────────────────────────────────────────────────────
section('10. sorting');

const sortInput = [row({ symbol: 'A', sourceIndex: 0 }), row({ symbol: 'B', scorePreview: 90, sourceIndex: 1 })];
const sortInputOrder = sortInput.map(function (r) { return r.symbol; });
const sorted = A.bdsSortBackendDirectionalRows(sortInput);
ok(sorted !== sortInput, 'sort returns a NEW array reference');
deepEq(sortInput.map(function (r) { return r.symbol; }), sortInputOrder, 'sort leaves the input array order untouched');
eq(sortInput.length, 2, 'sort leaves the input array length untouched');
eq(sorted[0], sortInput[1], 'sort shares row references (shallow copy, no cloning)');
deepEq(A.bdsSortBackendDirectionalRows(null), [], 'sort of null yields []');
deepEq(A.bdsSortBackendDirectionalRows('x'), [], 'sort of a non-array yields []');
deepEq(A.bdsSortBackendDirectionalRows([]), [], 'sort of [] yields []');

function symbolsOf(rows) { return A.bdsSortBackendDirectionalRows(rows).map(function (r) { return r.symbol; }).join(','); }
eq(symbolsOf([row({ symbol: 'LO', scorePreview: 10 }), row({ symbol: 'HI', scorePreview: 90 })]), 'HI,LO',
   'primary key: scorePreview descending');
eq(symbolsOf([row({ symbol: 'N', scorePreview: null }), row({ symbol: 'V', scorePreview: 5 })]), 'V,N',
   'null scorePreview sorts last');
eq(symbolsOf([row({ symbol: 'INF', scorePreview: Infinity }), row({ symbol: 'V', scorePreview: 5 })]), 'V,INF',
   'non-finite scorePreview is treated as null and sorts last');
eq(symbolsOf([row({ symbol: 'NAN', scorePreview: NaN }), row({ symbol: 'V', scorePreview: 5 })]), 'V,NAN',
   'NaN scorePreview is treated as null and sorts last');
eq(symbolsOf([row({ symbol: 'NO', rankEligible: false }), row({ symbol: 'YES', rankEligible: true })]), 'YES,NO',
   'tie-break 1: rankEligible true before false');
eq(symbolsOf([row({ symbol: 'D', scoreBucket: 'D', rankEligible: true }), row({ symbol: 'A', scoreBucket: 'A', rankEligible: true })]), 'A,D',
   'tie-break 2: bucket A < B < C < D');
eq(symbolsOf([row({ symbol: 'UNK', scoreBucket: null }), row({ symbol: 'D', scoreBucket: 'D' })]), 'D,UNK',
   'unknown bucket ranks last (99)');
eq(symbolsOf([row({ symbol: 'RS1', relativeStrengthVsSpy: 1 }), row({ symbol: 'RS5', relativeStrengthVsSpy: 5 })]), 'RS5,RS1',
   'tie-break 3: relative strength DESCENDING for non-bearish pairs');
eq(symbolsOf([row({ symbol: 'W', direction: 'bearish', relativeStrengthVsSpy: -5 }),
              row({ symbol: 'S', direction: 'bearish', relativeStrengthVsSpy: -1 })]), 'W,S',
   'tie-break 3: relative strength ASCENDING when both rows are bearish (weakness wins)');
eq(symbolsOf([row({ symbol: 'NULLRS', relativeStrengthVsSpy: null }), row({ symbol: 'HASRS', relativeStrengthVsSpy: 2 })]), 'HASRS,NULLRS',
   'null relative strength sorts last');
eq(symbolsOf([row({ symbol: 'THIRD', sourceIndex: 2 }), row({ symbol: 'FIRST', sourceIndex: 0 }), row({ symbol: 'SECOND', sourceIndex: 1 })]),
   'FIRST,SECOND,THIRD', 'final tie-break: original snapshot order via sourceIndex');
eq(symbolsOf([row({ symbol: 'P' }), row({ symbol: 'Q' }), row({ symbol: 'R' })]), 'P,Q,R',
   'fully-tied rows (same sourceIndex) keep their input order — observed stability');

// ─────────────────────────────────────────────────────────────────────────────
// 11. DERIVE
//     Guards, option defaults, and the non-mutation guarantee.
//
//     MUTATION PROOF: mutating snapshot.candidates fails here (write guard).
// ─────────────────────────────────────────────────────────────────────────────
section('11. derive');

deepEq(A.bdsDeriveBackendDirectionalRows(null), [], 'null snapshot → []');
deepEq(A.bdsDeriveBackendDirectionalRows(undefined), [], 'undefined snapshot → []');
deepEq(A.bdsDeriveBackendDirectionalRows('nope'), [], 'non-object snapshot → []');
deepEq(A.bdsDeriveBackendDirectionalRows({ ok: false, candidates: [candidate()] }), [], 'ok !== true → []');
deepEq(A.bdsDeriveBackendDirectionalRows({ candidates: [candidate()] }), [], 'missing ok → []');
deepEq(A.bdsDeriveBackendDirectionalRows({ ok: true, candidates: null }), [], 'candidates null → []');
deepEq(A.bdsDeriveBackendDirectionalRows({ ok: true, candidates: 'x' }), [], 'candidates non-array → []');
deepEq(A.bdsDeriveBackendDirectionalRows({ ok: true, candidates: [] }), [], 'candidates [] → []');

const mixed = snapshot({ candidates: [
  candidate({ symbol: 'AAA' }),
  candidate({ symbol: 'BBB', directionDiagnostics: { candidateDirection: 'bearish' } }),
  { symbol: 'JUNK' },
] });
deepEq(A.bdsDeriveBackendDirectionalRows(mixed).map(function (r) { return r.symbol; }), ['AAA', 'BBB'],
   'default eligibility: only eligible candidates are returned');
deepEq(A.bdsDeriveBackendDirectionalRows(mixed, {}).map(function (r) { return r.symbol; }), ['AAA', 'BBB'],
   'empty options behaves like no options');
deepEq(A.bdsDeriveBackendDirectionalRows(mixed, { includeNonEligible: true }).map(function (r) { return r.symbol; }).sort(),
   ['AAA', 'BBB', 'JUNK'], 'includeNonEligible: true bypasses the eligibility gate');
deepEq(A.bdsDeriveBackendDirectionalRows(mixed, { includeNonEligible: 'yes' }).map(function (r) { return r.symbol; }), ['AAA', 'BBB'],
   'includeNonEligible is strict === true (truthy strings do not count)');
deepEq(A.bdsDeriveBackendDirectionalRows(mixed, { directionFilter: 'bearish' }).map(function (r) { return r.symbol; }), ['BBB'],
   'directionFilter bearish');
deepEq(A.bdsDeriveBackendDirectionalRows(mixed, { directionFilter: 'bullish' }).map(function (r) { return r.symbol; }), ['AAA'],
   'directionFilter bullish');
deepEq(A.bdsDeriveBackendDirectionalRows(mixed, { directionFilter: 'sideways' }).map(function (r) { return r.symbol; }), ['AAA', 'BBB'],
   'unrecognised directionFilter falls back to "all"');
eq(A.bdsDeriveBackendDirectionalRows(mixed, { maxRows: 1 }).length, 1, 'maxRows caps the result');
eq(A.bdsDeriveBackendDirectionalRows(mixed, { maxRows: 0 }).length, 0, 'maxRows 0 yields an empty result');
eq(A.bdsDeriveBackendDirectionalRows(mixed, { maxRows: -1 }).length, 2, 'negative maxRows is ignored (>= 0 guard)');
eq(A.bdsDeriveBackendDirectionalRows(mixed, { maxRows: 99 }).length, 2, 'maxRows above length is a no-op');
eq(A.bdsDeriveBackendDirectionalRows(mixed, { maxRows: '1' }).length, 2, 'non-numeric maxRows is ignored');

// requireFresh — an option the schema in the brief did not list. Default false.
const staleSnap = snapshot({ stale: true });
eq(A.bdsDeriveBackendDirectionalRows(staleSnap).length, 1, 'requireFresh defaults to false: stale snapshots still derive');
eq(A.bdsDeriveBackendDirectionalRows(staleSnap, { requireFresh: true }).length, 0, 'requireFresh: true drops a stale snapshot');
ok(A.bdsDeriveBackendDirectionalRows(staleSnap)[0].warnings.indexOf('snapshot_stale') >= 0,
   'stale snapshots add the snapshot_stale warning');
ok(A.bdsDeriveBackendDirectionalRows(snapshot())[0].warnings.indexOf('snapshot_stale') < 0,
   'fresh snapshots carry no snapshot_stale warning');

const DERIVE_OPTIONS = ['includeNonEligible', 'requireFresh', 'directionFilter', 'maxRows'];
const deriveBody = stripCommentsAndStrings(bodyOf('bdsDeriveBackendDirectionalRows'));
DERIVE_OPTIONS.forEach(function (o) {
  ok(new RegExp('opts\\.' + o + '\\b').test(deriveBody), 'derive reads option: ' + o);
});
const readOptions = (deriveBody.match(/opts\.([A-Za-z0-9_$]+)/g) || [])
  .map(function (s) { return s.slice(5); });
deepEq(Array.from(new Set(readOptions)).sort(), DERIVE_OPTIONS.slice().sort(),
   'derive reads EXACTLY four options');
ok(Array.isArray(A.bdsDeriveBackendDirectionalRows(snapshot())), 'derive always returns an array');

// Non-mutation, proved with a deep write guard rather than a value comparison.
const wg = makeWriteGuard();
const guardedSnap = wg.guard(snapshot({ candidates: [candidate({ symbol: 'M1' }), candidate({ symbol: 'M2' })] }), 'snapshot');
const guardedRows = A.bdsDeriveBackendDirectionalRows(guardedSnap, { includeNonEligible: true });
deepEq(wg.writes, [], 'derive performs ZERO writes anywhere in the snapshot tree');
eq(guardedRows.length, 2, 'derive still produced rows through the write guard');
const wg2 = makeWriteGuard();
const guardedCand = wg2.guard(candidate(), 'candidate');
A.bdsMapBackendCandidateToDirectionalRow(guardedCand, 0);
deepEq(wg2.writes, [], 'mapping performs ZERO writes on the candidate');
const wg3 = makeWriteGuard();
const guardedRowsIn = wg3.guard([row({ symbol: 'S1' }), row({ symbol: 'S2', scorePreview: 90 })], 'rows');
A.bdsSortBackendDirectionalRows(guardedRowsIn);
deepEq(wg3.writes, [], 'sorting performs ZERO writes on the input rows');
const wg4 = makeWriteGuard();
A.bdsBackendDirectionalSummary(wg4.guard(A.bdsDeriveBackendDirectionalRows(snapshot(), { includeNonEligible: true }), 'rows'));
deepEq(wg4.writes, [], 'summary performs ZERO writes on the input rows');
const wg5 = makeWriteGuard();
A.bdsGetBackendDirectionalSourceState(wg5.guard(snapshot(), 'snapshot'), wg5.guard({ schedulerEnabled: true }, 'status'));
deepEq(wg5.writes, [], 'source-state performs ZERO writes on snapshot or status');

// Derive composes eligibility → mapping → filter → sort → cap, in that order.
// Anchored on the APPLICATION sites, not on the first mention of an option name
// (options are all parsed at the top of the function).
const PIPELINE_STAGES = [
  ['eligibility gate', 'bdsIsBackendDirectionalCandidate('],
  ['mapping', 'bdsMapBackendCandidateToDirectionalRow('],
  ['direction filter', 'rows.filter('],
  ['sorting', 'bdsSortBackendDirectionalRows(rows)'],
  ['maxRows cap', 'rows.slice(0, maxRows)'],
];
const orderIdx = PIPELINE_STAGES.map(function (s) { return deriveBody.indexOf(s[1]); });
PIPELINE_STAGES.forEach(function (s, i) {
  ok(orderIdx[i] >= 0, 'derive pipeline stage present: ' + s[0]);
});
for (let i = 1; i < orderIdx.length; i++) {
  ok(orderIdx[i - 1] >= 0 && orderIdx[i] > orderIdx[i - 1],
     'derive pipeline order: ' + PIPELINE_STAGES[i - 1][0] + ' before ' + PIPELINE_STAGES[i][0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
section('12. summary');

const SUMMARY_KEYS = ['total', 'bullish', 'bearish', 'rankEligible', 'bucketCounts',
  'parityMatches', 'parityMismatches', 'withCompleteTechnicals', 'withCache', 'topSymbols'];
const emptySummary = A.bdsBackendDirectionalSummary(null);
deepEq(Object.keys(emptySummary), SUMMARY_KEYS, 'summary shape: exact key list and order');
eq(Object.keys(emptySummary).length, 10, 'summary shape: 10 fields');
deepEq(Object.keys(emptySummary.bucketCounts), ['A', 'B', 'C', 'D'], 'bucketCounts shape');
deepEq(A.bdsBackendDirectionalSummary(undefined), emptySummary, 'undefined input yields the zero summary');
deepEq(A.bdsBackendDirectionalSummary('x'), emptySummary, 'non-array input yields the zero summary');
deepEq(A.bdsBackendDirectionalSummary([]), emptySummary, 'empty array yields the zero summary');
eq(emptySummary.total, 0, 'zero summary total is 0');
deepEq(emptySummary.topSymbols, [], 'zero summary topSymbols is []');

const summaryRows = [
  row({ symbol: 'S1', direction: 'bullish', scoreBucket: 'A', rankEligible: true }),
  row({ symbol: 'S2', direction: 'bearish', scoreBucket: 'B', rankEligible: false }),
  row({ symbol: 'S3', direction: 'neutral', scoreBucket: null, rankEligible: true }),
  row({ symbol: 'S4', direction: undefined, scoreBucket: 'Z', rankEligible: true }),
  null, 'not-a-row', 42,
];
summaryRows[0].parityMatches = true; summaryRows[0].completeCoreTechnicals = true; summaryRows[0].candleCount = 10;
summaryRows[1].parityComparable = true; summaryRows[1].parityMatches = false; summaryRows[1].candleSource = 'BACKEND_DXLINK_CANDLE_CACHE';
const sm = A.bdsBackendDirectionalSummary(summaryRows);
eq(sm.total, 7, 'total counts every array entry, including non-row entries');
eq(sm.bullish, 1, 'bullish counts only direction === "bullish"');
eq(sm.bearish, 1, 'bearish counts only direction === "bearish"');
eq(sm.rankEligible, 3, 'rankEligible counts strict true');
deepEq(sm.bucketCounts, { A: 1, B: 1, C: 0, D: 0 }, 'unknown and null buckets are not counted');
eq(sm.parityMatches, 1, 'parityMatches counts strict true');
eq(sm.parityMismatches, 1, 'parityMismatches requires comparable === true and matches === false');
eq(sm.withCompleteTechnicals, 1, 'withCompleteTechnicals counts strict true');
eq(sm.withCache, 2, 'withCache counts a positive candleCount OR a truthy candleSource');
let summaryThrew = false;
try { A.bdsBackendDirectionalSummary([null, undefined, {}, 'x', 0]); } catch (e) { summaryThrew = true; }
ok(!summaryThrew, 'summary never throws on malformed rows');

const manyRows = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(function (s) { return row({ symbol: s }); });
deepEq(A.bdsBackendDirectionalSummary(manyRows).topSymbols, ['T1', 'T2', 'T3', 'T4', 'T5'],
   'topSymbols takes the first five rows in the supplied order');
deepEq(A.bdsBackendDirectionalSummary([row({ symbol: null }), row({ symbol: 'OK' })]).topSymbols, ['OK'],
   'topSymbols drops rows without a symbol');
const summaryInput = [row({ symbol: 'K1' }), row({ symbol: 'K2' })];
const beforeSummary = JSON.stringify(summaryInput);
A.bdsBackendDirectionalSummary(summaryInput);
eq(JSON.stringify(summaryInput), beforeSummary, 'summary does not mutate its input rows');

// ─────────────────────────────────────────────────────────────────────────────
// 13. SOURCE-STATE REASON PRECEDENCE
//     The measured order is pinned exactly as implemented — including the fact
//     that a status error is reported ONLY once candidates exist, and that
//     'no_candidates_array' is a distinct reason from 'no_candidates'.
//
//     MUTATION PROOF: removing the diagnostics_not_ready branch fails here.
// ─────────────────────────────────────────────────────────────────────────────
section('13. source-state reason precedence');

const SOURCE_STATE_KEYS = ['available', 'reason', 'snapshotOk', 'schedulerEnabled', 'stale',
  'ageMs', 'updatedAt', 'nextScheduledRunAt', 'diagnosticsReady', 'scoreDiagnosticsReady',
  'directionDiagnosticsReady', 'parityReady'];
deepEq(Object.keys(A.bdsGetBackendDirectionalSourceState(null, null)), SOURCE_STATE_KEYS,
   'sourceState shape: exact key list and order');

const REASON_ORDER = ['no_snapshot', 'snapshot_not_ok', 'no_candidates_array', 'no_candidates', 'status_error', 'diagnostics_not_ready'];
const sourceStateBody = stripCommentsAndStrings(bodyOf('bdsGetBackendDirectionalSourceState'));
const reasonPositions = REASON_ORDER.map(function (r) { return sourceStateBody.indexOf("" + r); });
REASON_ORDER.forEach(function (r) {
  ok(bodyOf('bdsGetBackendDirectionalSourceState').indexOf("'" + r + "'") >= 0,
     'reason literal present in source: ' + r);
});
for (let i = 1; i < REASON_ORDER.length; i++) {
  ok(bodyOf('bdsGetBackendDirectionalSourceState').indexOf("'" + REASON_ORDER[i - 1] + "'") <
     bodyOf('bdsGetBackendDirectionalSourceState').indexOf("'" + REASON_ORDER[i] + "'"),
     'reason branch order in source: ' + REASON_ORDER[i - 1] + ' before ' + REASON_ORDER[i]);
}

function reasonFor(snap, status) { return A.bdsGetBackendDirectionalSourceState(snap, status).reason; }
eq(reasonFor(null, null), 'no_snapshot', 'precedence 1: no snapshot');
eq(reasonFor(undefined, { statusError: 'x' }), 'no_snapshot', 'precedence 1 wins over a status error');
eq(reasonFor('x', null), 'no_snapshot', 'a non-object snapshot is "no snapshot"');
eq(reasonFor({ ok: false, candidates: [candidate()] }, { statusError: 'x' }), 'snapshot_not_ok', 'precedence 2: snapshot not ok');
eq(reasonFor({ ok: true, candidates: 'x' }, { statusError: 'x' }), 'no_candidates_array', 'precedence 3: candidates is not an array');
eq(reasonFor({ ok: true }, null), 'no_candidates_array', 'a missing candidates key is "no_candidates_array"');
eq(reasonFor({ ok: true, candidates: [] }, { statusError: 'x' }), 'no_candidates',
   'precedence 4: an empty candidates array outranks a status error');
eq(reasonFor({ ok: true, candidates: [candidate()] }, { statusError: 'boom' }), 'status_error', 'precedence 5: status error');
eq(reasonFor({ ok: true, candidates: [candidate()] }, { snapshotError: 'boom' }), 'status_error', 'snapshotError also yields status_error');
eq(reasonFor({ ok: true, candidates: [{ symbol: 'A' }] }, null), 'diagnostics_not_ready', 'precedence 6: diagnostics not ready');
eq(reasonFor({ ok: true, candidates: [{ symbol: 'A', scoreDiagnostics: {} }] }, null), 'diagnostics_not_ready',
   'score diagnostics alone are not enough');
eq(reasonFor({ ok: true, candidates: [{ symbol: 'A', directionDiagnostics: {} }] }, null), 'diagnostics_not_ready',
   'direction diagnostics alone are not enough');
eq(reasonFor(snapshot(), {}), null, 'a healthy snapshot has a null reason');
eq(A.bdsGetBackendDirectionalSourceState(snapshot(), {}).available, true, 'a healthy snapshot is available');
[[null, null], [{ ok: false }, null], [{ ok: true, candidates: [] }, null]].forEach(function (p) {
  eq(A.bdsGetBackendDirectionalSourceState(p[0], p[1]).available, false, 'available is false whenever a reason is set');
});

// Readiness diagnostics are independent of availability.
const partial = { ok: true, candidates: [{ symbol: 'A', scoreDiagnostics: {}, directionDiagnostics: {} }] };
const ps = A.bdsGetBackendDirectionalSourceState(partial, null);
eq(ps.scoreDiagnosticsReady, true, 'scoreDiagnosticsReady is derived per-candidate');
eq(ps.directionDiagnosticsReady, true, 'directionDiagnosticsReady is derived per-candidate');
eq(ps.parityReady, false, 'parityReady is false without a directionParity block');
eq(ps.diagnosticsReady, true, 'diagnosticsReady = score AND direction readiness (parity excluded)');
eq(A.bdsGetBackendDirectionalSourceState(snapshot(), null).parityReady, true, 'parityReady true when parity blocks exist');

// Freshness and scheduling passthrough.
const full = A.bdsGetBackendDirectionalSourceState(snapshot({ stale: true, ageMs: 99 }), { schedulerEnabled: true });
eq(full.snapshotOk, true, 'snapshotOk reflects snapshot.ok');
eq(full.stale, true, 'stale is passed through as a strict boolean-or-null');
eq(full.ageMs, 99, 'ageMs is passed through as a finite number-or-null');
eq(full.updatedAt, '2026-07-26T12:00:00.000Z', 'updatedAt is passed through as a non-empty string-or-null');
eq(full.nextScheduledRunAt, '2026-07-26T12:05:00.000Z', 'nextScheduledRunAt is passed through');
eq(full.schedulerEnabled, true, 'schedulerEnabled read from status.schedulerEnabled');
eq(A.bdsGetBackendDirectionalSourceState(snapshot(), { scheduler: { enabled: false } }).schedulerEnabled, false,
   'schedulerEnabled falls back to status.scheduler.enabled');
eq(A.bdsGetBackendDirectionalSourceState(snapshot(), {}).schedulerEnabled, null,
   'schedulerEnabled is null when the status says nothing');
eq(A.bdsGetBackendDirectionalSourceState({ ok: true, candidates: [] }, null).stale, null,
   'stale is null when the snapshot omits it');
eq(A.bdsGetBackendDirectionalSourceState(null, null).ageMs, null, 'ageMs is null without a snapshot');

// ─────────────────────────────────────────────────────────────────────────────
// 14. DEBUG HELPER
//     It is NOT pure: it reads the live bssState global. That single fact is
//     what keeps it out of the pure module.
// ─────────────────────────────────────────────────────────────────────────────
section('14. debug helper');

const debugBody = stripCommentsAndStrings(bodyOf(BDS_DEBUG));
ok(/\bbssState\b/.test(debugBody), BDS_DEBUG + ': depends on the bssState global');
ok(/typeof\s+bssState\s*===\s*''/.test(debugBody) || /typeof\s+bssState/.test(debugBody),
   BDS_DEBUG + ': guards bssState with typeof (tolerant when absent)');
ok(!/\bfetch\s*\(/.test(debugBody) && !/\bttCall\s*\(/.test(debugBody), BDS_DEBUG + ': performs no network call');
ok(!/\bdocument\b/.test(debugBody) && !/\binnerHTML\b/.test(debugBody), BDS_DEBUG + ': touches no DOM');
ok(!/\blocalStorage\b/.test(debugBody), BDS_DEBUG + ': touches no localStorage');
ok(!/\bconsole\b/.test(debugBody), BDS_DEBUG + ': logs nothing');
ok(!/\bS\s*\./.test(debugBody), BDS_DEBUG + ': reads no application state on S');
ok(!/=(?!=)/.test(debugBody.replace(/var\s+[^;]+;/g, '').replace(/[!<>=]==?/g, '')) ||
   !/\bS\.[A-Za-z0-9_$]+\s*=(?!=)/.test(debugBody), BDS_DEBUG + ': assigns no external state');

// Behaviour with and without bssState — measured in a permissive vm context,
// because `typeof bssState` on a genuinely absent global must not throw.
function runDebugHelper(bssStateImpl) {
  const ctx = vm.createContext(Object.assign({ Array: Array, Object: Object, String: String, isFinite: isFinite },
    bssStateImpl ? { bssState: bssStateImpl } : {}));
  BDS_PURE.concat([BDS_DEBUG]).forEach(function (n) {
    vm.runInContext(APP.extractFunctionSource(n, { source: SRC }), ctx);
  });
  return vm.runInContext(BDS_DEBUG + '()', ctx);
}
let noStateResult = null, noStateThrew = false;
try { noStateResult = runDebugHelper(null); } catch (e) { noStateThrew = true; }
ok(!noStateThrew, BDS_DEBUG + ': does not throw when bssState is absent');
deepEq(noStateResult && Object.keys(noStateResult), ['sourceState', 'summary', 'rows'],
   BDS_DEBUG + ': return shape is { sourceState, summary, rows }');
eq(noStateResult.rows.length, 0, 'without bssState: rows is empty');
eq(noStateResult.sourceState.reason, 'no_snapshot', 'without bssState: reason is no_snapshot');
eq(noStateResult.sourceState.available, false, 'without bssState: not available');
eq(noStateResult.summary.total, 0, 'without bssState: summary is the zero summary');

const liveResult = runDebugHelper(function () { return { snapshot: snapshot(), status: { schedulerEnabled: true } }; });
eq(liveResult.rows.length, 1, 'with bssState: rows derived from the live snapshot');
eq(liveResult.sourceState.available, true, 'with bssState: source state is available');
eq(liveResult.summary.total, 1, 'with bssState: summary matches the derived rows');
ok(/includeNonEligible\s*:\s*true/.test(debugBody),
   BDS_DEBUG + ': derives with includeNonEligible true (diagnostic view, not the BDSP view)');
eq(runDebugHelper(function () { return null; }).sourceState.reason, 'no_snapshot',
   'a null bssState() result degrades to no_snapshot');

// The helper is called by nothing — it exists only for the console.
const debugCallers = Array.from(callersOf(BDS_DEBUG).keys()).filter(function (c) { return c !== '(module-scope)'; });
deepEq(debugCallers, [], BDS_DEBUG + ': no application code calls it');

// ─────────────────────────────────────────────────────────────────────────────
// 15. WINDOW EXPOSURE
//
//     MUTATION PROOF: an auto-call of the debug helper fails here and in §16.
// ─────────────────────────────────────────────────────────────────────────────
section('15. window exposure');

const exposureMatches = strippedSrc.match(/window\.apexDebugBackendDirectionalAdapter\s*=/g) || [];
eq(exposureMatches.length, 1, 'window.apexDebugBackendDirectionalAdapter is assigned exactly once');
const exposureLineStart = SRC.lastIndexOf('\n', windowExposureIdx) + 1;
const exposureLine = SRC.slice(exposureLineStart, SRC.indexOf('\n', windowExposureIdx));
ok(exposureLine.indexOf('window.apexDebugBackendDirectionalAdapter =\n') < 0, 'exposure is a single-line statement');
ok(/window\.apexDebugBackendDirectionalAdapter\s*=\s*apexDebugBackendDirectionalAdapter\s*;/.test(exposureLine),
   'exposure assigns the function itself: window.apexDebugBackendDirectionalAdapter = apexDebugBackendDirectionalAdapter');
ok(!/window\.apexDebugBackendDirectionalAdapter\s*=\s*apexDebugBackendDirectionalAdapter\s*\(/.test(strippedSrc),
   'exposure assigns the function, NOT the result of calling it');
ok(/typeof\s+window\s*!==/.test(exposureLine), 'exposure is guarded by a typeof window check');
ok(/^\s*try\s*\{/.test(exposureLine) && /catch\s*\(/.test(exposureLine), 'exposure is wrapped in try/catch');
ok(enclosingFn(windowExposureIdx) === null, 'exposure is a MODULE-SCOPE statement (runs at script evaluation)');
ok(windowExposureIdx > spansOf(BDS_DEBUG)[0].end - 1, 'exposure is physically after the helper it exposes');

// The BDS block has exactly one module-scope statement: this one.
const bdsBlockStart = declStart('_bdsNum');
const bdsBlockEnd = declStart('bdspStorageKey');
const bdsBlockLines = SRC.slice(bdsBlockStart, bdsBlockEnd).split('\n');
const bdsTopLevelStatements = bdsBlockLines.filter(function (ln) {
  if (/^\s*$/.test(ln) || /^\s/.test(ln)) return false;      // blank or indented (inside a body)
  if (/^\/\//.test(ln) || /^\/\*/.test(ln) || /^\*/.test(ln)) return false; // comment
  if (/^function\s/.test(ln) || /^\}/.test(ln)) return false; // declaration / close brace
  return true;
});
eq(bdsTopLevelStatements.length, 1, 'the BDS block has exactly ONE module-scope statement');
ok(bdsTopLevelStatements[0].indexOf('window.apexDebugBackendDirectionalAdapter') >= 0,
   'that single statement is the window exposure');

// BDSP has its own, separate exposure — it does not travel with the adapter.
eq((strippedSrc.match(/window\.apexDebugBackendDirectionalPreview\s*=/g) || []).length, 1,
   'BDSP has its own single window exposure');
ok(SRC.indexOf('window.apexDebugBackendDirectionalPreview =') > windowExposureIdx,
   'the BDSP exposure is separate and later');

// ─────────────────────────────────────────────────────────────────────────────
// 16. LOAD-TIME BEHAVIOUR
//     Evaluating the whole BDS block must assign the bridge and do nothing else.
// ─────────────────────────────────────────────────────────────────────────────
section('16. load-time behaviour');

const bdsBlockSource = SRC.slice(bdsBlockStart, bdsBlockEnd);
const assignments = [];
const fakeWindow = new Proxy({}, {
  set: function (t, p, v) { assignments.push({ key: String(p), value: v }); t[p] = v; return true; },
  get: function (t, p) { return t[p]; },
  has: function () { return true; },
});
// bssState THROWS: if anything in the block auto-invoked the debug helper at
// load time, evaluation would fail here.
const loadCtx = vm.createContext({
  Array: Array, Object: Object, String: String, isFinite: isFinite,
  window: fakeWindow,
  bssState: function () { throw new Error('bssState must not be called at load time'); },
});
let loadError = null;
try { vm.runInContext(bdsBlockSource, loadCtx); } catch (e) { loadError = e; }
ok(loadError === null, 'the BDS block evaluates cleanly' + (loadError ? ' — threw ' + loadError.message : ''));
eq(assignments.length, 1, 'evaluating the block performs exactly one window assignment');
eq(assignments[0] && assignments[0].key, 'apexDebugBackendDirectionalAdapter', 'the assigned key is the debug bridge');
eq(typeof (assignments[0] && assignments[0].value), 'function', 'the assigned value is a function, not a result object');
eq(assignments[0] && assignments[0].value.name, BDS_DEBUG, 'the assigned value is the helper itself');
eq(vm.runInContext('typeof bdsDeriveBackendDirectionalRows', loadCtx), 'function', 'the adapter is available after evaluation');
BDS_ALL.forEach(function (n) {
  eq(vm.runInContext('typeof ' + n, loadCtx), 'function', 'declared at load: ' + n);
});

// No initialisation, no singleton, no cache: the block declares and exposes.
ok(!/\bnew\s+(?:Map|Set|WeakMap|WeakSet)\b/.test(stripCommentsAndStrings(bdsBlockSource)),
   'the BDS block creates no module-level collection/cache');
ok(!/\bnew\s+Date\b/.test(stripCommentsAndStrings(bdsBlockSource)), 'the BDS block reads no clock');
ok(!/\bMath\.random\b/.test(stripCommentsAndStrings(bdsBlockSource)), 'the BDS block is deterministic');
const blockNoStrings = stripCommentsAndStrings(bdsBlockSource);
BDS_ALL.forEach(function (n) {
  const selfCall = new RegExp('(^|[^.\\w])' + n + '\\s*\\(', 'g');
  const callsOutsideBodies = (blockNoStrings.split('\n').filter(function (ln) {
    return !/^\s/.test(ln) && selfCall.test(ln) && !/^function\s/.test(ln);
  }));
  eq(callsOutsideBodies.length, 0, 'no module-scope invocation of ' + n + ' (no auto-call)');
});

// Calling the nine is idempotent: identical inputs give identical outputs.
const idemSnap = snapshot();
deepEq(A.bdsDeriveBackendDirectionalRows(idemSnap).map(function (r) { return r.symbol; }),
       A.bdsDeriveBackendDirectionalRows(idemSnap).map(function (r) { return r.symbol; }),
       'derive is idempotent across repeated calls');
deepEq(A.bdsGetBackendDirectionalSourceState(idemSnap, {}), A.bdsGetBackendDirectionalSourceState(idemSnap, {}),
       'source-state is idempotent across repeated calls');

// ─────────────────────────────────────────────────────────────────────────────
// 17. NETWORK AND SUBSCRIPTION GUARDS
// ─────────────────────────────────────────────────────────────────────────────
section('17. network and subscription guards');

const netBox = makeStrictSandbox();
BDS_PURE.forEach(function (n) { vm.runInContext(APP.extractFunctionSource(n, { source: SRC }), netBox.context); });
const N = {};
BDS_PURE.forEach(function (n) { N[n] = vm.runInContext(n, netBox.context); });
const fullSnap = snapshot({ candidates: [candidate(), candidate({ symbol: 'MSFT', directionDiagnostics: { candidateDirection: 'bearish' } })] });
const netRows = N.bdsDeriveBackendDirectionalRows(fullSnap, { includeNonEligible: true });
N.bdsBackendDirectionalSummary(netRows);
N.bdsGetBackendDirectionalSourceState(fullSnap, { schedulerEnabled: true });
N.bdsSortBackendDirectionalRows(netRows);
deepEq(netBox.touched, [], 'a full derive → summary → source-state pass touches no network/subscription global');
eq(netRows.length, 2, 'the full pass really produced rows (the guard was exercised)');

const bdsBlockClean = stripCommentsAndStrings(bdsBlockSource);
['/scanner/run', '/scanner/snapshot', '/scanner/status', 'http://', 'https://'].forEach(function (t) {
  ok(bdsBlockSource.indexOf(t) < 0 || bdsBlockClean.indexOf(t) < 0,
     'the BDS block hardcodes no endpoint/URL literal: ' + t);
});
['dxlink', 'DXLink', 'subscribeDxlink', 'quoteToken', 'streamer'].forEach(function (t) {
  ok(bdsBlockClean.indexOf(t) < 0, 'the BDS block references no market-data plumbing: ' + t);
});
ok(!/\bPromise\b|\bthen\s*\(|\basync\b|\bawait\b/.test(bdsBlockClean.replace(/apexDebug\w*/g, '')),
   'the BDS block is entirely synchronous (no Promise/async/await/then)');

// ─────────────────────────────────────────────────────────────────────────────
// 18. DOM AND LOCALSTORAGE SEPARATION
// ─────────────────────────────────────────────────────────────────────────────
section('18. DOM and localStorage separation');

['document', 'innerHTML', 'getElementById', 'classList', 'localStorage', 'sessionStorage', 'style.']
  .forEach(function (t) {
    ok(bdsBlockClean.indexOf(t) < 0, 'the BDS block contains no ' + t);
  });
ok(!/<\s*(?:div|span|button|table|tr|td|strong)\b/i.test(bdsBlockClean),
   'the BDS block builds no HTML markup');
ok(/<\s*div\b/i.test(bdspBlockRaw) && /bdsp-/.test(bdspBlockRaw), 'the BDSP block DOES build HTML markup');

// Concentration of the impure surfaces on the BDSP side.
const bdspDomUsers = BDSP_FNS.filter(function (n) { return /\bdocument\b/.test(stripCommentsAndStrings(bodyOf(n))); });
ok(bdspDomUsers.length >= 3, 'DOM access is concentrated in BDSP (' + bdspDomUsers.length + ' functions)');
const bdspStorageUsers = BDSP_FNS.filter(function (n) { return /\blocalStorage\b/.test(stripCommentsAndStrings(bodyOf(n))); });
deepEq(bdspStorageUsers.sort(), ['bdspLoadPersistedEnabled', 'bdspPersistEnabled'],
   'localStorage is confined to exactly two BDSP functions');
ok(/apex_directional_backend_preview/.test(bodyOf('bdspStorageKey')),
   'the persistence key lives in BDSP, not in the adapter');
ok(bdsBlockSource.indexOf('apex_directional_backend_preview') < 0,
   'the adapter has no knowledge of the persistence key');

// ─────────────────────────────────────────────────────────────────────────────
// 19. STATE SEPARATION
//
//     MUTATION PROOF: moving BDSP state into the BDS block fails here.
// ─────────────────────────────────────────────────────────────────────────────
section('19. state separation');

ok(!/\bS\s*\./.test(bdsBlockClean), 'the BDS block never references the application state object S');
ok(bdsBlockClean.indexOf('backendDirectionalPreview') < 0,
   'the BDS block has no knowledge of S.backendDirectionalPreview');
ok(!/\bbdsp[A-Za-z0-9_$]*\b/.test(bdsBlockClean), 'the BDS block references no BDSP symbol');
ok(!/\bbss[A-Za-z0-9_$]*\s*\(/.test(bdsBlockClean.replace(/apexDebug[\s\S]*/, '')),
   'no BDS function below the debug bridge calls into BSS');

// No module-level mutable binding of any kind lives in the BDS block.
const moduleBindings = bdsBlockLines.filter(function (ln) { return /^(?:var|let|const)\s/.test(ln); });
deepEq(moduleBindings, [], 'the BDS block declares no module-level variable (no singleton, no cache)');

// Every value the nine functions produce is freshly constructed per call.
const s1 = A.bdsGetBackendDirectionalSourceState(snapshot(), {});
const s2 = A.bdsGetBackendDirectionalSourceState(snapshot(), {});
ok(s1 !== s2, 'source-state returns a fresh object each call');
ok(A.bdsBackendDirectionalSummary([]) !== A.bdsBackendDirectionalSummary([]), 'summary returns a fresh object each call');
ok(A.bdsBackendDirectionalSummary([]).bucketCounts !== A.bdsBackendDirectionalSummary([]).bucketCounts,
   'bucketCounts is fresh per call (not a shared literal)');
ok(A.bdsDeriveBackendDirectionalRows(snapshot()) !== A.bdsDeriveBackendDirectionalRows(snapshot()),
   'derive returns a fresh array each call');

// BDSP state, by contrast, is owned on S and survives across calls.
ok(/S\.backendDirectionalPreview\s*=\s*\{/.test(bdspBlock), 'BDSP lazily creates its own state slot on S');
['enabled', 'scanDataReferenceAtEnable', 'renderedInScannerResults', 'lastRenderAt', 'lastRowCount', 'rows']
  .forEach(function (k) {
    ok(new RegExp('\\b' + k + '\\b').test(bdspBlock), 'BDSP state field observed: ' + k);
  });
ok(bdsBlockClean.indexOf('renderedInScannerResults') < 0 && bdsBlockClean.indexOf('scanDataReferenceAtEnable') < 0,
   'no BDSP state field appears anywhere in the BDS block');

// ─────────────────────────────────────────────────────────────────────────────
// 20. FUTURE OWNERSHIP — A / B / C / D / E
//
//     RECOMMENDATION: **A** — extract the NINE pure functions into
//     js/adapters/backend-directional-adapter.js and leave behind the debug
//     helper, its window exposure and the whole of BDSP.
//
//     The sections above establish the preconditions; this section asserts them
//     as a single, checkable decision record so the recommendation cannot drift
//     away from the code.
// ─────────────────────────────────────────────────────────────────────────────
section('20. future ownership decision (A/B/C/D/E)');

const RECOMMENDATION = 'A';
const OPTION_A_MOVE = BDS_PURE.slice();
const OPTION_A_KEEP = [BDS_DEBUG, 'window.apexDebugBackendDirectionalAdapter'].concat(BDSP_FNS);

eq(RECOMMENDATION, 'A', 'recommendation: A — nine pure functions only');
eq(OPTION_A_MOVE.length, 9, 'option A moves exactly nine functions');
deepEq(OPTION_A_MOVE, ['_bdsNum', '_bdsBoolOrNull', '_bdsStrOrNull',
  'bdsIsBackendDirectionalCandidate', 'bdsMapBackendCandidateToDirectionalRow',
  'bdsSortBackendDirectionalRows', 'bdsDeriveBackendDirectionalRows',
  'bdsBackendDirectionalSummary', 'bdsGetBackendDirectionalSourceState'],
  'option A: the exact function list to move');
ok(OPTION_A_KEEP.indexOf(BDS_DEBUG) >= 0, 'option A keeps the debug helper in the monolith');
ok(OPTION_A_KEEP.length === 34, 'option A keeps 34 symbols behind (debug helper + exposure + 32 BDSP)');

// Precondition 1 — the nine are self-contained (this is what rules out copying
// any helper, and what makes A viable at all).
ok(externalDeps.every(function (d) { return ACTUALLY_USED_INTRINSICS.indexOf(d) >= 0; }),
   'A-precondition: the nine depend only on JS intrinsics');
deepEq(leakedHelpers, [], 'A-precondition: no monolith helper needs to be copied');

// Precondition 2 — the nine carry no load-time side effect, so moving them into
// a plain <script> introduces none.
eq(bdsTopLevelStatements.length, 1, 'A-precondition: the only module-scope statement is the debug exposure');
ok(bdsTopLevelStatements[0].indexOf(BDS_DEBUG) >= 0,
   'A-precondition: that statement belongs to the part that STAYS — option A moves zero side effects');

// Precondition 3 — the debug helper is impure (bssState) and is therefore the
// natural cut line. This is the argument against B and C.
ok(/\bbssState\b/.test(debugBody),
   'A-rationale: the debug helper reads bssState, so option B would import a global dependency into the pure module');
ok(!BDS_PURE.some(function (n) { return /\bbssState\b/.test(stripCommentsAndStrings(bodyOf(n))); }),
   'A-rationale: none of the nine reads bssState');
ok(enclosingFn(windowExposureIdx) === null,
   'A-rationale: option C would relocate a module-scope side effect into the new file — rejected');

// Precondition 4 — BDSP is a different module by every measure, so option D
// (moving both at once) is unnecessary risk, not a requirement.
ok(bdspStorageUsers.length === 2 && bdspDomUsers.length >= 3,
   'A-rationale: BDSP owns localStorage and DOM — a separate concern from the pure adapter');
ok(Object.keys(BDSP_BDS_USERS).length === 3,
   'A-rationale: BDSP depends on the adapter through only three functions — a narrow, stable seam');
ok(externalDeps.indexOf('escHtml') < 0 && /\bescHtml\s*\(/.test(bdspBlock),
   'A-rationale: BDSP needs a monolith helper the adapter does not — moving both would drag escHtml too');

// Precondition 5 — option E (do not extract) is not forced: nothing blocks the
// move. All four consumers resolve the adapter as a plain global, and the new
// script only has to load BEFORE the inline script evaluates its bootstrap.
eq(Object.keys(EXTERNAL_CONSUMERS).length, 4, 'A-precondition: exactly four external consumers must keep resolving the globals');
ok(Object.keys(EXTERNAL_CONSUMERS).every(function (c) { return declStart(c) > declStart('_bdsNum'); }),
   'A-note: every external consumer is declared AFTER the adapter today');
ok(bssServicePart[0].end <= PART_RANGES[PART_RANGES.length - 1].start,
   'A-note: the BSS service already proves the external-script-before-inline pattern works');
ok(declStart('dsbLegacyOperationalSource') > 0 && /typeof\s+bdsDeriveBackendDirectionalRows\s*!==/.test(dsbBody),
   'A-risk: the DSB consumer is typeof-guarded, so a load-order mistake degrades silently instead of throwing — script order must be asserted at extraction time');

// Tests that will have to be updated when the extraction happens: none of the
// existing ones read index.html directly — they all go through load-app-source,
// which follows <script> tags automatically.
ok(typeof APP.loadOrderedScriptSources === 'function' && typeof APP.loadAppJavaScriptSource === 'function',
   'A-note: load-app-source derives order from <script> tags, so tests survive the move unchanged');
ok(APP.loadAppJavaScriptSource().indexOf('function bdsDeriveBackendDirectionalRows(') >= 0,
   'A-note: this contract itself reads the adapter through load-app-source and will keep working post-extraction');

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
