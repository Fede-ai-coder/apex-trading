'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// TEMPORARY pre-implementation audit — Tastytrade reconnect / shared
// post-authentication lifecycle boundary.
//
// READ-ONLY. This file changes no production byte; §13 proves it from HEAD, not
// merely from the working tree. Its job is to measure the next extraction
// boundary exactly, BEFORE anything is moved, and to say which of four cuts is
// the honest one.
//
// THE BOUNDARY. Immediately after the escHtml helper and immediately before the
// MCX resize glue that #408 deliberately kept inline, index.html carries a
// 9,224-unit block that declares exactly three classic globals and nothing else:
//
//     showReconnectPanel   — renders the TT reconnect panel (UI only)
//     _apexPostAuthInit    — the SHARED post-authentication pipeline
//     doReconnectTT        — submits the reconnect and updates the UI (async)
//
// THE FINDING. The block is not one owner. It is a CHAIN with a shared middle:
//
//     markup ─► showReconnectPanel ─(generated markup)─► doReconnectTT
//                                                            │
//     inline launch handler ─────────────────────────────────┴─► _apexPostAuthInit
//
// _apexPostAuthInit has a second, independent caller — the NORMAL login path,
// ~986k characters earlier in the document — that has nothing to do with the
// reconnect feature. It touches no DOM, no storage, no timer and no network of
// its own; it orchestrates twelve lifecycle entry points, and only three of
// those twelve are Tastytrade/DXLink. It is a shared lifecycle owner that the
// reconnect action CONSUMES, not a member of the reconnect feature.
//
// Measured dependency overlap between the three fragments:
//     showReconnectPanel ∩ _apexPostAuthInit  = 0 names
//     showReconnectPanel ∩ doReconnectTT      = 0 names
//     _apexPostAuthInit  ∩ doReconnectTT      = 2 names (S, console)
//
// So the audit measures four candidates and pins all four:
//
//   A — the whole block as one js/ui/tt-auth-lifecycle.js owner.
//   B — two modules preserving source order: panel, then lifecycle+action.
//   C — only the shared post-auth lifecycle, as js/services/apex-post-auth-init.js.
//   D — the two reconnect fragments woven into js/ui/tt-reconnect.js.
//
// The audit recommends C, and its central piece of evidence is a byte fact
// rather than an opinion: removing the postAuthLifecycle fragment leaves the
// remaining two fragments CONTIGUOUS and adjacent — the resulting inline block
// is byte-for-byte candidate D's module (SHA 53fba09f…). C therefore turns the
// follow-up reconnect-UI extraction into a plain contiguous cut with no weave,
// which is the one thing D cannot offer as a first step.
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, stripComments, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');

// ── Pinned base ──────────────────────────────────────────────────────────────
const BASE_SHA = '6e50a1ee9fcfea6cf7438c1b7246c74f3771bc4e';
const BASE_TREE = 'c2f140dc55d28236153de08fc4a9c7c0431c2e4a';
const BASE_SUBJECT = 'refactor(mcx): extract charts lifecycle owner (#408)';
const BASE_PR = 408;
const INDEX_BLOB = '8b950dd00a71117955990e115d58ce143ac348ff';
const INDEX_CHARS = 1884429;
const INDEX_UTF8 = 1918599;
const INDEX_LF = 33097;
const INDEX_SHA256 = 'b5f6dd5b2fad6e1d3e0ce3fee4abf5cfb561c19de714e20f86874e49e10a857e';
const LOCAL_SCRIPTS = 54;
const BASELINE_SUITE_FILES = 136;

// ── The source boundary ──────────────────────────────────────────────────────
const START_MARKER = '// ── TT RECONNECT panel (accessible after launch)';
const POST_MARKER = '// ── Shared post-authentication initialization';
const ACTION_MARKER = 'async function doReconnectTT(){';
const END_MARKER = 'var _mcxResizeTimer      = null;';

const RANGE_START = 1872835;
const RANGE_END = 1882059;
const RANGE_START_LINE = 32895;
const RANGE_LAST_LINE = 33042;
const RANGE_CHARS = 9224;
const RANGE_UTF8 = 9312;
const RANGE_LF = 148;
const RANGE_SHA256 = '4f9a574656094fb548da47206dd9cced087b93916d9c46fbee22e94ba77ccb34';

// The three fragments, in source order. Every number is re-derived from the
// pinned blob below and compared against these pins; a single drifted byte
// fails here rather than downstream.
const FRAGMENTS = [
  { name: 'reconnectPanel', start: 1872835, end: 1874908, chars: 2073, utf8: 2113, lf: 35,
    sha256: '215bc4ce13d4a67fee081e296b9532356c39afb55bb5e420691b4cafc5b82862',
    opensWith: START_MARKER },
  { name: 'postAuthLifecycle', start: 1874908, end: 1879379, chars: 4471, utf8: 4519, lf: 62,
    sha256: 'ed3bb60ec58df251b6b46b38c5f9d0501e11b51a1cfea25032c5ac05a31f5e25',
    opensWith: POST_MARKER },
  { name: 'reconnectAction', start: 1879379, end: 1882059, chars: 2680, utf8: 2680, lf: 51,
    sha256: 'e88c7e7d501135695ff6950b3d9b63606c0b6f9219072e9946fe7ab096578f05',
    opensWith: ACTION_MARKER },
];

// What sits immediately before and after the boundary. Both are exclusions the
// cut has to hold: the escHtml helper #-series never moved, and the MCX resize
// glue #408 deliberately left inline.
const ESC_TAIL = '}\n\n\n\n';                      // escHtml's closing brace + 3 blank lines
const MCX_GLUE_CHARS = 209;
const MCX_GLUE_UTF8 = 209;
const MCX_GLUE_LF = 7;
const MCX_GLUE_SHA256 = 'bca3dcbe07f48d7dfa0b640eb81bd6fa30bf8a035b324c354ab47e6c580eed62';

// ── The owner manifest ───────────────────────────────────────────────────────
const OWNERS = [
  { name: 'showReconnectPanel', form: 'function', isAsync: false, chars: 2006 },
  { name: '_apexPostAuthInit', form: 'function', isAsync: false, chars: 3804 },
  { name: 'doReconnectTT', form: 'function', isAsync: true, chars: 2678 },
];
const OWNER_NAMES = OWNERS.map((o) => o.name);

// ── The complete consumer inventory, classified by where the text lives ──────
// `code` is a real identifier reference; `generated-markup` is text inside a
// JavaScript string literal that becomes an onclick handler at render time;
// `static-markup` is text in the HTML document outside every <script>.
// A regex over static HTML alone would miss the doReconnectTT() handler
// entirely — it exists only inside showReconnectPanel's HTML string.
const CONSUMERS = {
  showReconnectPanel: { code: 1, 'generated-markup': 0, 'static-markup': 1 },
  _apexPostAuthInit: { code: 3, 'generated-markup': 0, 'static-markup': 0 },
  doReconnectTT: { code: 1, 'generated-markup': 1, 'static-markup': 0 },
};
// The literal call sites, each of which must survive every candidate unchanged.
const CONSUMER_SITES = [
  'onclick="showReconnectPanel()"',      // static markup, line 674
  "_apexPostAuthInit('login');",         // normal-login path, line 14,372
  "_apexPostAuthInit('reconnect');",     // inside doReconnectTT
  'onclick="doReconnectTT()"',           // generated markup, inside showReconnectPanel
];
// One further textual occurrence exists app-wide and is NOT a consumer: a
// documentation comment in js/services/journal-migration.js. §5 proves it is a
// comment rather than a reference instead of quietly excluding it.
const COMMENT_ONLY_MENTIONS = [{ file: 'js/services/journal-migration.js', name: 'doReconnectTT', count: 1 }];

// ── Dependency and state pins ────────────────────────────────────────────────
const WHOLE_DEPENDENCIES = [
  'Error', 'S', 'String', '_activeView', '_ensureVixFamily', '_renderDxlinkDiag',
  '_resetBackendApiAuthState', '_swingHydrateFromBackend', '_ttAuthLogin', 'bssStartPolling',
  'console', 'document', 'dsbEnrichVisibleRowsLive', 'dsbStartAutoRefresh', 'enrichWithTT',
  'fetchEarningsForAll', 'jMigrateApexTradesToBackend', 'localStorage', 'location', 'logEv',
  'postCandleContext', 'refreshSharedMarketRegime', 'setAS', 'setPanel', 'setTimeout',
  'showToast', 'startDxlinkConnectOnce', 'startDxlinkStatusPolling',
];
const FRAGMENT_DEPENDENCIES = {
  reconnectPanel: ['location', 'setPanel'],
  postAuthLifecycle: [
    'S', 'String', '_activeView', '_ensureVixFamily', '_renderDxlinkDiag',
    '_resetBackendApiAuthState', '_swingHydrateFromBackend', 'bssStartPolling', 'console',
    'dsbEnrichVisibleRowsLive', 'dsbStartAutoRefresh', 'jMigrateApexTradesToBackend',
    'postCandleContext', 'refreshSharedMarketRegime', 'startDxlinkConnectOnce',
    'startDxlinkStatusPolling',
  ],
  reconnectAction: [
    'Error', 'S', '_apexPostAuthInit', '_ttAuthLogin', 'console', 'document', 'enrichWithTT',
    'fetchEarningsForAll', 'localStorage', 'logEv', 'setAS', 'setTimeout', 'showToast',
  ],
};
// Mutable state owned ELSEWHERE (the inline `const S`) and written directly.
// These are property writes through a shared object read at call time — no
// candidate rebinds a foreign top-level binding, which §6 proves separately.
const S_WRITES = {
  reconnectPanel: [],
  postAuthLifecycle: ['dxlinkConnectStarted'],
  reconnectAction: ['_ttSessionSource', 'ttAccounts', 'ttConnected', 'ttSessionId'],
};
const S_READS = {
  reconnectPanel: [],
  postAuthLifecycle: ['dxlinkConnectStarted', 'dxlinkStatus', 'swing', 'ttConnected', 'ttSessionId'],
  reconnectAction: ['_ttSessionSource', 'scanData', 'ttAccounts', 'ttConnected', 'ttSessionId'],
};
const LOCALSTORAGE_KEYS = ['apex_tt_session'];
const DOM_IDS_READ = ['rtu', 'rtp', 'rttStatus', 'ttPill', 'accBtn', 'reconnectTTBtn', 'dataPill'];
const DOM_IDS_RENDERED = ['rtu', 'rtp', 'rttStatus'];
// The twelve lifecycle entry points _apexPostAuthInit orchestrates, and the
// three of them that are Tastytrade/DXLink-backed. 9 of 12 are not Tastytrade
// at all — the measurement that decides candidate A's naming question.
const LIFECYCLE_CALLS = [
  '_resetBackendApiAuthState', 'startDxlinkConnectOnce', 'startDxlinkStatusPolling',
  '_renderDxlinkDiag', 'refreshSharedMarketRegime', '_ensureVixFamily', 'postCandleContext',
  'bssStartPolling', 'dsbStartAutoRefresh', 'dsbEnrichVisibleRowsLive',
  'jMigrateApexTradesToBackend', '_swingHydrateFromBackend',
];
const TASTYTRADE_LIFECYCLE_CALLS = ['startDxlinkConnectOnce', 'startDxlinkStatusPolling', '_renderDxlinkDiag'];

// ── Candidates ───────────────────────────────────────────────────────────────
const ANCHOR_SRC = './js/ui/mcx-charts.js';
const ANCHOR_TAG = '<script src="' + ANCHOR_SRC + '"></script>\n';
const tagFor = (src) => '<script src="' + src + '"></script>\n';

const CAND = {
  A: {
    label: 'one contiguous feature owner',
    modules: [{ src: './js/ui/tt-auth-lifecycle.js', frags: ['reconnectPanel', 'postAuthLifecycle', 'reconnectAction'],
      chars: 9224, utf8: 9312, lf: 148,
      sha256: '4f9a574656094fb548da47206dd9cced087b93916d9c46fbee22e94ba77ccb34',
      owners: ['showReconnectPanel', '_apexPostAuthInit', 'doReconnectTT'] }],
    predicted: { chars: 1875258, utf8: 1909340, lf: 32950,
      sha256: '5d41450422cc4106aad3937996459529e2c9910dbd668568a235b239346faa03', scripts: 55 },
    conceptualOwner: 'Tastytrade authentication lifecycle (panel + shared post-auth init + reconnect action)',
    layer: 'js/ui',
    strongestAdvantage: 'the whole 9,224-unit block leaves the monolith in one contiguous cut, with one '
      + 'module, one tag and the simplest possible reverse transform',
    strongestDrawback: 'the module name and its js/ui/ layer describe only part of what it owns: '
      + '_apexPostAuthInit performs no DOM access and 9 of the 12 lifecycle entry points it orchestrates '
      + 'are not Tastytrade',
  },
  B: {
    label: 'two contiguous modules preserving source order',
    modules: [
      { src: './js/ui/tt-reconnect-panel.js', frags: ['reconnectPanel'],
        chars: 2073, utf8: 2113, lf: 35,
        sha256: '215bc4ce13d4a67fee081e296b9532356c39afb55bb5e420691b4cafc5b82862',
        owners: ['showReconnectPanel'] },
      { src: './js/ui/tt-auth-lifecycle.js', frags: ['postAuthLifecycle', 'reconnectAction'],
        chars: 7151, utf8: 7199, lf: 113,
        sha256: '33a5762821d8f1d0900fc5697d708a00e23c65d1e03361ce73ac406cd1bd3d8b',
        owners: ['_apexPostAuthInit', 'doReconnectTT'] },
    ],
    predicted: { chars: 1875312, utf8: 1909394, lf: 32951,
      sha256: '2fafc35c7b3f613393c10909cbaa53451a63c623f19012953f5a556e437fee0c', scripts: 56 },
    conceptualOwner: 'TT reconnect panel (B1) + TT auth lifecycle and reconnect action (B2)',
    layer: 'js/ui + js/ui',
    strongestAdvantage: 'every fragment stays contiguous, declaration order is preserved and the pure-UI '
      + 'panel gets a 2-dependency module of its own',
    strongestDrawback: 'it splits the two halves of ONE UI feature — the panel generates the handler that '
      + 'calls the action — while keeping the two least-alike owners together, and it is the only '
      + 'candidate that raises the cross-boundary call count',
  },
  C: {
    label: 'extract only the shared post-auth lifecycle',
    modules: [{ src: './js/services/apex-post-auth-init.js', frags: ['postAuthLifecycle'],
      chars: 4471, utf8: 4519, lf: 62,
      sha256: 'ed3bb60ec58df251b6b46b38c5f9d0501e11b51a1cfea25032c5ac05a31f5e25',
      owners: ['_apexPostAuthInit'] }],
    predicted: { chars: 1880019, utf8: 1914141, lf: 33036,
      sha256: '4d514626ec99e6306400f3ce8eb383629cb3ec9fd75798043cd8dc14a376ebe1', scripts: 55 },
    conceptualOwner: 'shared post-authentication lifecycle',
    layer: 'js/services',
    strongestAdvantage: 'it removes the one owner that does not belong to the reconnect feature, moves '
      + 'a single cross-boundary state write, and leaves the remaining two fragments CONTIGUOUS — '
      + 'byte-identical to candidate D\'s module — so the follow-up cut needs no weave',
    strongestDrawback: 'only 48.47% of the block leaves the monolith, and js/services/ has to carry a '
      + 'function whose steps are UI-adjacent even though it touches no DOM itself',
  },
  D: {
    label: 'owner-cohesive reconnect UI weave',
    modules: [{ src: './js/ui/tt-reconnect.js', frags: ['reconnectPanel', 'reconnectAction'],
      chars: 4753, utf8: 4793, lf: 86,
      sha256: '53fba09f64e9663d3bcdbecd94fcbd75ef5bb389a6cbe6a69af56cd88b71093e',
      owners: ['showReconnectPanel', 'doReconnectTT'] }],
    predicted: { chars: 1879724, utf8: 1913854, lf: 33012,
      sha256: 'd1effa6ae10ddab7727869dc082eea0dd562378ab9994f44fad88fa82767f5e8', scripts: 55 },
    weavePoint: 2073,
    conceptualOwner: 'TT reconnect UI feature (render + submit)',
    layer: 'js/ui',
    strongestAdvantage: 'the strongest semantic grouping of the four, and the only candidate that leaves '
      + '_apexPostAuthInit inline and therefore touches no live contract',
    strongestDrawback: 'a non-contiguous source extraction with a weave-based undo at 2073, and it moves '
      + 'four Tastytrade session writes plus the apex_tt_session storage write into a js/ui/ module while '
      + 'the service-shaped orchestrator stays inline',
  },
};

// The shipped convention in this series is a module ending `}\n`, with the
// final LF left behind in index.html as a structural separator. Every pinned
// module above ends on a blank line instead, so §12 records the corrected
// candidate-A identity separately rather than silently substituting it.
const A_SEPARATOR_CORRECTED = {
  moduleChars: 9223, moduleUtf8: 9311, moduleLf: 147,
  moduleSha256: '40aa88b9a46a13bffd0b77444d3a04d77e5af786cf85a3224f1446b9d87a6e30',
  predictedChars: 1875259, predictedUtf8: 1909341, predictedLf: 32951,
  predictedSha256: '946d004204f980651d2f037cb867e203b1a00d8d1e58f72493f3c78335906a41',
};

// ─────────────────────────────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────────────────────────────
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function lineAt(s, o) { return s.slice(0, o).split('\n').length; }
function esc(v) { return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function localScriptCount(html) {
  return APP_LOADER.parseScriptTags(html).filter((t) => t.src && /^\.\//.test(t.src)).length;
}

// A guard either holds on the real artefact or catches a mutant. Both count as
// one assertion, and every guard below is exercised in BOTH directions, so no
// specific marker / tag / consumer / weave check can be short-circuited by an
// earlier whole-document identity assertion.
function mustHold(fnName, violations, m) { eq(violations, [], m + (violations.length ? ' — ' + violations.join('; ') : '')); }
function mustCatch(violations, m) { ok(violations.length > 0, 'MUTANT REJECTED: ' + m); }

function shape(src) {
  return scanTopLevelDeclarations(src)
    .map((e) => ({ name: e.name, form: e.form, isAsync: !!e.isAsync, chars: e.chars }));
}
// Everything at top level that is NOT a declaration, with comments removed.
// Non-empty means the source performs work when the script evaluates.
function residue(src) {
  const d = scanTopLevelDeclarations(src);
  const ch = Array.from(src);
  d.forEach((e) => { for (let i = e.start; i <= e.end; i++) ch[i] = ' '; });
  return ch.join('').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
}
function declarationSpans(src) {
  return scanTopLevelDeclarations(src).map((e) => ({ start: e.start, end: e.end }));
}
function loadInEmptyVm(src) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'candidate.js' });
    return { ok: true, error: null, globals: Object.keys(sandbox) };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), globals: Object.keys(sandbox) };
  }
}

// Free identifiers: every name the source references but does not itself bind.
// Runs over a literal- and comment-masked copy, so a name that appears only in
// a comment or an HTML string is never counted as a dependency.
const JS_KEYWORDS = new Set([
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'new', 'typeof', 'instanceof', 'in', 'of', 'this', 'null',
  'true', 'false', 'void', 'delete', 'throw', 'try', 'catch', 'finally', 'default', 'yield',
  'await', 'async', 'class', 'extends', 'super', 'undefined',
]);
function freeIdentifiers(source) {
  const m = maskLiterals(source);
  const declared = new Set();
  let x;
  const fr = /\bfunction\s*([A-Za-z0-9_$]*)\s*\(([^)]*)\)/g;
  while ((x = fr.exec(m))) {
    if (x[1]) declared.add(x[1]);
    x[2].split(',').map((p) => p.trim()).filter(Boolean)
      .forEach((p) => declared.add(p.replace(/[^A-Za-z0-9_$].*$/, '')));
  }
  const dr = /\b(?:var|let|const)\s+([A-Za-z0-9_$]+)/g;
  while ((x = dr.exec(m))) declared.add(x[1]);
  const cr = /,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  while ((x = cr.exec(m))) declared.add(x[1]);
  const kr = /\bcatch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((x = kr.exec(m))) declared.add(x[1]);
  const free = new Set();
  const ir = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b\s*(:?)/g;
  while ((x = ir.exec(m))) {
    if (x[1] === '.') continue;
    const n = x[2];
    if (JS_KEYWORDS.has(n) || declared.has(n)) continue;
    if (x[3] === ':' && /[{,]\s*$/.test(m.slice(Math.max(0, x.index - 40), x.index))) continue;
    free.add(n);
  }
  return Array.from(free).sort();
}
function matchesOf(source, re) {
  const m = maskLiterals(source);
  const out = [];
  let x;
  const r = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
  while ((x = r.exec(m))) out.push(x.index);
  return out;
}
function sPropsWritten(source) {
  const m = maskLiterals(source);
  const out = new Set();
  let x;
  const r = /\bS\.([A-Za-z0-9_$]+)\s*=(?!=)/g;
  while ((x = r.exec(m))) out.add(x[1]);
  return Array.from(out).sort();
}
function sPropsReferenced(source) {
  const m = maskLiterals(source);
  const out = new Set();
  let x;
  const r = /\bS\.([A-Za-z0-9_$]+)/g;
  while ((x = r.exec(m))) out.add(x[1]);
  return Array.from(out).sort();
}
function bareAssignmentTargets(source) {
  const m = maskLiterals(source);
  const out = new Set();
  let x;
  const r = /(?:^|[^A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)\s*=(?![=>])/g;
  while ((x = r.exec(m))) out.add(x[1]);
  return Array.from(out).sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// The guards. Each is a pure function of an artefact, returning violations.
// §12 drives every one of them with mutants as well as with the real thing.
// ─────────────────────────────────────────────────────────────────────────────
function vBaseIdentity(doc) {
  const out = [];
  if (doc.length !== INDEX_CHARS) out.push('index UTF-16 length is ' + doc.length);
  if (Buffer.byteLength(doc, 'utf8') !== INDEX_UTF8) out.push('index UTF-8 byte length differs');
  if (count(doc, '\n') !== INDEX_LF) out.push('index LF count differs');
  if (sha256(doc) !== INDEX_SHA256) out.push('index SHA-256 differs');
  if (localScriptCount(doc) !== LOCAL_SCRIPTS) out.push('local application script count differs');
  return out;
}

function vMarkers(doc) {
  const out = [];
  const marks = [['start', START_MARKER], ['postAuth', POST_MARKER],
    ['action', ACTION_MARKER], ['end', END_MARKER]];
  for (const [n, t] of marks) {
    const c = count(doc, t);
    if (c !== 1) out.push('the ' + n + ' marker occurs ' + c + ' times, not once');
  }
  if (out.length) return out;
  const a = doc.indexOf(START_MARKER), p = doc.indexOf(POST_MARKER);
  const q = doc.indexOf(ACTION_MARKER), b = doc.indexOf(END_MARKER);
  if (!(a < p && p < q && q < b)) out.push('the four markers are not in source order');
  return out;
}

function vBoundary(doc, start, end) {
  const out = [];
  const t = doc.slice(start, end);
  if (t.length !== RANGE_CHARS) out.push('boundary UTF-16 length is ' + t.length);
  if (Buffer.byteLength(t, 'utf8') !== RANGE_UTF8) out.push('boundary UTF-8 byte length differs');
  if (count(t, '\n') !== RANGE_LF) out.push('boundary LF count differs');
  if (sha256(t) !== RANGE_SHA256) out.push('boundary SHA-256 differs');
  if (!t.startsWith(START_MARKER)) out.push('the boundary does not open on the TT reconnect marker');
  if (!t.endsWith('}\n\n')) out.push('the boundary does not end with exactly two LF after doReconnectTT');
  if (t.indexOf('escHtml') >= 0) out.push('the boundary absorbed escHtml');
  if (t.indexOf('_mcxResizeTimer') >= 0) out.push('the boundary absorbed _mcxResizeTimer');
  if (t.indexOf('addEventListener') >= 0) out.push('the boundary absorbed a listener registration');
  if (doc.slice(start - ESC_TAIL.length, start) !== ESC_TAIL) {
    out.push('the boundary does not begin immediately after the escHtml helper');
  }
  if (doc.slice(end, end + MCX_GLUE_CHARS) !== MCX_GLUE) {
    out.push('the boundary does not end immediately before the MCX resize glue');
  }
  return out;
}

function vFragmentTiling(doc, frags) {
  const out = [];
  let expect = RANGE_START;
  for (const f of frags) {
    if (f.start !== expect) out.push(f.name + ' does not begin where the previous fragment ends');
    if (f.end <= f.start) out.push(f.name + ' is empty or inverted');
    expect = f.end;
    const t = doc.slice(f.start, f.end);
    if (t.length !== f.chars) out.push(f.name + ' UTF-16 length is ' + t.length);
    if (Buffer.byteLength(t, 'utf8') !== f.utf8) out.push(f.name + ' UTF-8 byte length differs');
    if (count(t, '\n') !== f.lf) out.push(f.name + ' LF count differs');
    if (sha256(t) !== f.sha256) out.push(f.name + ' SHA-256 differs');
    if (!t.startsWith(f.opensWith)) out.push(f.name + ' does not open on its pinned marker');
  }
  if (expect !== RANGE_END) out.push('the fragments do not reach the end of the boundary');
  if (frags.reduce((a, f) => a + f.chars, 0) !== RANGE_CHARS) {
    out.push('the fragments do not account for every character of the boundary');
  }
  return out;
}

// Ownership, declaration form and — the invariant every owner in this series
// holds — load-time inertness. "No DOM / storage / timer / listener / auth /
// network / credential access at load time" is proved twice over: every such
// site must lie strictly inside a declaration body, AND the source must
// evaluate in a completely empty VM, where any of those touched at load time
// would throw ReferenceError.
const LOAD_TIME_PROBES = [
  ['DOM', /\bdocument\s*\./],
  ['DOM lookup', /\bgetElementById\s*\(/],
  ['storage', /\blocalStorage\s*\./],
  ['timer', /\bset(?:Timeout|Interval)\s*\(/],
  ['listener', /\baddEventListener\s*\(/],
  ['network', /\b(?:fetch|XMLHttpRequest)\s*\(/],
  ['authentication', /\b_ttAuthLogin\s*\(/],
  ['credential read', /\.value\b/],
  ['window', /\bwindow\s*\./],
];
function vOwners(src, expected) {
  const out = [];
  const got = shape(src);
  const gotSig = got.map((g) => g.name + '/' + g.form + (g.isAsync ? '/async' : '') + '/' + g.chars);
  const expSig = expected.map((g) => g.name + '/' + g.form + (g.isAsync ? '/async' : '') + '/' + g.chars);
  if (JSON.stringify(gotSig) !== JSON.stringify(expSig)) {
    out.push('owner manifest is ' + JSON.stringify(gotSig) + ', expected ' + JSON.stringify(expSig));
  }
  if (got.some((g) => g.form === 'var' || g.form === 'let' || g.form === 'const')) {
    out.push('a top-level variable declaration is present');
  }
  const r = residue(src);
  if (r !== '') out.push('executable top-level residue: ' + JSON.stringify(r.slice(0, 90)));
  const spans = declarationSpans(src);
  const inside = (i) => spans.some((s) => i >= s.start && i <= s.end);
  for (const [label, re] of LOAD_TIME_PROBES) {
    const outside = matchesOf(src, re).filter((i) => !inside(i));
    if (outside.length) out.push(label + ' access at load time (' + outside.length + ' site(s))');
  }
  const load = loadInEmptyVm(src);
  if (!load.ok) out.push('does not evaluate in an empty VM: ' + load.error);
  else if (JSON.stringify(load.globals) !== JSON.stringify(expected.map((e) => e.name))) {
    out.push('empty-VM evaluation defines ' + JSON.stringify(load.globals));
  }
  return out;
}

// Where every occurrence of an owner name lives, across the whole application:
// the HTML document (markup outside <script>, code inside it, or text inside a
// JavaScript string literal) plus every module source the candidate creates.
function classifyOccurrences(html, moduleSources, name) {
  const tally = { code: 0, 'generated-markup': 0, 'static-markup': 0 };
  const tags = APP_LOADER.parseScriptTags(html);
  const inlineTag = tags.filter((t) => !t.src)[0];
  const inlineStart = inlineTag ? html.indexOf(inlineTag.inline) : -1;
  const inlineEnd = inlineTag ? inlineStart + inlineTag.inline.length : -1;
  const inlineMasked = inlineTag ? maskLiterals(inlineTag.inline) : '';
  let i = 0;
  for (;;) {
    const k = html.indexOf(name, i);
    if (k < 0) break;
    i = k + 1;
    if (inlineTag && k >= inlineStart && k < inlineEnd) {
      const rel = k - inlineStart;
      tally[inlineMasked.slice(rel, rel + name.length) === name ? 'code' : 'generated-markup'] += 1;
    } else {
      tally['static-markup'] += 1;
    }
  }
  for (const src of moduleSources) {
    const masked = maskLiterals(src);
    let j = 0;
    for (;;) {
      const k = src.indexOf(name, j);
      if (k < 0) break;
      j = k + 1;
      tally[masked.slice(k, k + name.length) === name ? 'code' : 'generated-markup'] += 1;
    }
  }
  return tally;
}
function vConsumers(html, moduleSources) {
  const out = [];
  for (const n of OWNER_NAMES) {
    const got = classifyOccurrences(html, moduleSources, n);
    const exp = CONSUMERS[n];
    if (JSON.stringify(got) !== JSON.stringify(exp)) {
      out.push(n + ' occurrences are ' + JSON.stringify(got) + ', expected ' + JSON.stringify(exp));
    }
  }
  const all = [html].concat(moduleSources).join('\n');
  for (const site of CONSUMER_SITES) {
    const c = count(all, site);
    if (c !== 1) out.push('consumer site ' + JSON.stringify(site) + ' occurs ' + c + ' times, not once');
  }
  return out;
}

// The predicted tag or tags: unique, src-only, classic, in order, immediately
// after mcx-charts.js and immediately before the inline monolith.
function vTags(html, expectedSrcs) {
  const out = [];
  const tags = APP_LOADER.parseScriptTags(html);
  const anchors = tags.filter((t) => t.src === ANCHOR_SRC);
  if (anchors.length !== 1) { out.push('the mcx-charts.js anchor occurs ' + anchors.length + ' times'); return out; }
  const at = tags.findIndex((t) => t.src === ANCHOR_SRC);
  for (let i = 0; i < expectedSrcs.length; i++) {
    const t = tags[at + 1 + i];
    if (!t) { out.push('predicted tag ' + expectedSrcs[i] + ' is missing after the anchor'); continue; }
    if (t.src !== expectedSrcs[i]) out.push('tag ' + (i + 1) + ' after the anchor is ' + t.src + ', expected ' + expectedSrcs[i]);
    if (t.type != null && String(t.type).trim() !== '') out.push('predicted tag carries type="' + t.type + '"');
    if (/(?:^|\s)(?:async|defer)(?=[\s=>]|$)/i.test(t.attrs)) out.push('predicted tag carries async or defer');
    if (String(t.inline).trim() !== '') out.push('predicted tag is not src-only');
  }
  const next = tags[at + 1 + expectedSrcs.length];
  if (!next) out.push('no script follows the predicted tags');
  else if (next.src != null) out.push('the inline monolith does not immediately follow the predicted tags (found ' + next.src + ')');
  for (const s of expectedSrcs) {
    const c = tags.filter((t) => t.src === s).length;
    if (c !== 1) out.push('predicted tag ' + s + ' occurs ' + c + ' times');
  }
  return out;
}

function vModuleIdentity(src, pin) {
  const out = [];
  if (src.length !== pin.chars) out.push(pin.src + ' UTF-16 length is ' + src.length);
  if (Buffer.byteLength(src, 'utf8') !== pin.utf8) out.push(pin.src + ' UTF-8 byte length differs');
  if (count(src, '\n') !== pin.lf) out.push(pin.src + ' LF count differs');
  if (sha256(src) !== pin.sha256) out.push(pin.src + ' SHA-256 differs');
  return out;
}

function vPredictedIndex(html, pin) {
  const out = [];
  if (html.length !== pin.chars) out.push('predicted index UTF-16 length is ' + html.length);
  if (Buffer.byteLength(html, 'utf8') !== pin.utf8) out.push('predicted index UTF-8 byte length differs');
  if (count(html, '\n') !== pin.lf) out.push('predicted index LF count differs');
  if (sha256(html) !== pin.sha256) out.push('predicted index SHA-256 differs');
  if (localScriptCount(html) !== pin.scripts) out.push('predicted local script count is ' + localScriptCount(html));
  return out;
}

function vReconstruction(rebuilt) {
  const out = [];
  if (rebuilt.length !== INDEX_CHARS) out.push('reconstruction UTF-16 length is ' + rebuilt.length);
  if (sha256(rebuilt) !== INDEX_SHA256) out.push('reconstruction SHA-256 differs from the pinned base');
  if (rebuilt !== INDEX) out.push('reconstruction is not byte-identical to the pinned base');
  return out;
}

function vProductionUntouched(paths) {
  const out = [];
  for (const p of paths) {
    if (p === 'index.html' || p.indexOf('js/') === 0) out.push('production path changed: ' + p);
  }
  return out;
}

// Load order, proved from the predicted part list rather than from text
// position. Every predicted module is a classic src-only script that precedes
// the inline monolith, so every consumer edge stays a call-time global lookup.
function predictedParts(html, moduleBySrc) {
  const parts = [];
  for (const t of APP_LOADER.parseScriptTags(html)) {
    if (!t.src) { parts.push({ src: '(inline)', code: t.inline }); continue; }
    if (APP_LOADER.classifySrc(t.src) !== 'local') continue;
    const code = Object.prototype.hasOwnProperty.call(moduleBySrc, t.src)
      ? moduleBySrc[t.src]
      : fs.readFileSync(path.resolve(ROOT, String(t.src).replace(/^\.\//, '')), 'utf8');
    parts.push({ src: t.src, code: code });
  }
  return parts;
}
function ownerResidency(parts) {
  let off = 0;
  const ranges = [];
  for (const p of parts) { ranges.push({ src: p.src, start: off, end: off + p.code.length }); off += p.code.length + 1; }
  const src = parts.map((p) => p.code).join('\n');
  const decls = scanTopLevelDeclarations(src);
  const out = {};
  for (const n of OWNER_NAMES) {
    const sites = decls.filter((d) => d.name === n);
    if (sites.length !== 1) { out[n] = sites.length + ' declaration sites'; continue; }
    const r = ranges.find((x) => sites[0].start >= x.start && sites[0].start < x.end);
    out[n] = r ? r.src : '(unresolved)';
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('TT AUTH LIFECYCLE — TEMPORARY PRE-IMPLEMENTATION AUDIT');
console.log('candidates: A · B · C (recommended) · D (deferred to phase 2)');
console.log('base=' + BASE_SHA);

const INDEX = APP_LOADER.loadIndexHtml();
const MCX_GLUE = INDEX.slice(RANGE_END, RANGE_END + MCX_GLUE_CHARS);

// ─────────────────────────────────────────────────────────────────────────────
section('1. Pinned base identity');
// ─────────────────────────────────────────────────────────────────────────────
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'merged #408 base commit resolves exactly');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'merged #408 base tree resolves exactly');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the pinned one');
ok(new RegExp('\\(#' + BASE_PR + '\\)$').test(BASE_SUBJECT), 'the base commit is the merge of PR #' + BASE_PR);
ok((() => { try { git(['merge-base', '--is-ancestor', BASE_SHA, 'HEAD']); return true; } catch (e) { return false; } })(),
  'the merged #' + BASE_PR + ' base is an ancestor of HEAD');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), INDEX_BLOB, 'the base index.html Git blob SHA is the pinned one');
mustHold('vBaseIdentity', vBaseIdentity(INDEX), 'the working-tree index.html IS the pinned base blob');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  BASELINE_SUITE_FILES + 1, 'the suite is the 136-file baseline plus this one temporary audit');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The boundary is uniquely locatable');
// ─────────────────────────────────────────────────────────────────────────────
mustHold('vMarkers', vMarkers(INDEX), 'all four boundary markers are unique and in source order');
const rangeStart = INDEX.indexOf(START_MARKER);
const rangeEnd = INDEX.indexOf(END_MARKER);
eq(rangeStart, RANGE_START, 'the boundary starts at the pinned offset');
eq(rangeEnd, RANGE_END, 'the boundary ends at the pinned offset, where the MCX resize glue begins');
eq(lineAt(INDEX, rangeStart), RANGE_START_LINE, 'the boundary starts on line 32,895');
eq(lineAt(INDEX, rangeEnd) - 1, RANGE_LAST_LINE, 'the boundary ends on line 33,042');
mustHold('vBoundary', vBoundary(INDEX, rangeStart, rangeEnd), 'the whole boundary has its pinned identity and excludes both neighbours');

const WHOLE = INDEX.slice(RANGE_START, RANGE_END);
eq(WHOLE.length, RANGE_CHARS, 'boundary UTF-16 length is 9,224');
eq(Buffer.byteLength(WHOLE, 'utf8'), RANGE_UTF8, 'boundary UTF-8 byte length is 9,312');
eq(count(WHOLE, '\n'), RANGE_LF, 'boundary LF count is 148');
eq(sha256(WHOLE), RANGE_SHA256, 'boundary SHA-256 is the pinned one');

// The two exclusions, stated positively as well as negatively.
eq(count(INDEX, 'function escHtml('), 1, 'escHtml is declared exactly once in the document');
ok(INDEX.indexOf('function escHtml(') < RANGE_START, 'the boundary begins AFTER the escHtml helper');
eq(WHOLE.indexOf('escHtml'), -1, 'escHtml is not included, not even as a reference');
eq(count(INDEX, 'var _mcxResizeTimer'), 1, '_mcxResizeTimer is declared exactly once in the document');
ok(INDEX.indexOf('var _mcxResizeTimer') >= RANGE_END, 'the boundary ends BEFORE the MCX resize glue');
eq(WHOLE.indexOf('_mcxResizeTimer'), -1, '_mcxResizeTimer is not included');
eq(WHOLE.indexOf('addEventListener'), -1, 'the MCX resize listener is not included');
eq(MCX_GLUE.length, MCX_GLUE_CHARS, 'the already-audited MCX glue is 209 UTF-16 units');
eq(Buffer.byteLength(MCX_GLUE, 'utf8'), MCX_GLUE_UTF8, 'the MCX glue is 209 UTF-8 bytes');
eq(count(MCX_GLUE, '\n'), MCX_GLUE_LF, 'the MCX glue carries 7 LF');
eq(sha256(MCX_GLUE), MCX_GLUE_SHA256, 'the MCX glue SHA-256 is the #408 one');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary tiles into exactly three contiguous fragments');
// ─────────────────────────────────────────────────────────────────────────────
mustHold('vFragmentTiling', vFragmentTiling(INDEX, FRAGMENTS),
  'the three fragments tile the boundary with no gap and no overlap');
const FRAG = {};
FRAGMENTS.forEach((f) => { FRAG[f.name] = INDEX.slice(f.start, f.end); });
FRAGMENTS.forEach((f) => {
  eq(FRAG[f.name].length, f.chars, f.name + ' UTF-16 length');
  eq(Buffer.byteLength(FRAG[f.name], 'utf8'), f.utf8, f.name + ' UTF-8 byte length');
  eq(count(FRAG[f.name], '\n'), f.lf, f.name + ' LF count');
  eq(sha256(FRAG[f.name]), f.sha256, f.name + ' SHA-256');
});
eq(FRAG.reconnectPanel + FRAG.postAuthLifecycle + FRAG.reconnectAction, WHOLE,
  'concatenating the three fragments reproduces the whole boundary exactly');
ok(FRAG.reconnectPanel.startsWith(START_MARKER), 'reconnectPanel opens on the TT reconnect-panel comment');
ok(FRAG.postAuthLifecycle.startsWith(POST_MARKER), 'postAuthLifecycle opens on the shared post-auth comment');
ok(FRAG.reconnectAction.startsWith(ACTION_MARKER), 'reconnectAction opens on `async function doReconnectTT(){`');
ok(WHOLE.endsWith('}\n\n') && !WHOLE.endsWith('}\n\n\n'),
  'the boundary ends with exactly two LF after doReconnectTT');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Owner inventory — a comment- and string-aware scan, never a regex');
// ─────────────────────────────────────────────────────────────────────────────
// scanTopLevelDeclarations walks the source once, skipping strings, template
// substitutions, both comment forms and regex literals. The proof that it is
// not fooled by function-like text in an HTML string is right here: the
// reconnectPanel fragment contains `onclick="doReconnectTT()"` inside a string,
// and the scanner reports exactly one declaration for that fragment.
mustHold('vOwners', vOwners(WHOLE, OWNERS), 'the whole boundary declares exactly the three pinned owners and nothing else');
eq(shape(WHOLE).map((o) => o.name), OWNER_NAMES, 'the three owners appear in the pinned source order');
eq(shape(WHOLE).map((o) => o.form), ['function', 'function', 'function'], 'all three are function declarations');
eq(shape(WHOLE).map((o) => o.isAsync), [false, false, true], 'only doReconnectTT is async');
eq(shape(WHOLE).map((o) => o.chars), OWNERS.map((o) => o.chars), 'each declaration has its pinned exact size');
eq(shape(WHOLE).filter((o) => o.form !== 'function').length, 0, 'no top-level variable declaration exists in the boundary');
eq(residue(WHOLE), '', 'zero executable top-level residue: the boundary is declarations-only');
eq(shape(FRAG.reconnectPanel).length, 1,
  'the scanner is not fooled by `onclick="doReconnectTT()"` inside the panel HTML string');
ok(FRAG.reconnectPanel.indexOf('onclick="doReconnectTT()"') > 0,
  '…and that string really is present in the fragment it just scanned');
const wholeLoad = loadInEmptyVm(WHOLE);
ok(wholeLoad.ok, 'the boundary evaluates in a completely empty VM: ' + wholeLoad.error);
eq(wholeLoad.globals, OWNER_NAMES, 'evaluation defines exactly the three owners and nothing else');
// Load-time inertness, itemised.
const wholeSpans = declarationSpans(WHOLE);
const insideWhole = (i) => wholeSpans.some((s) => i >= s.start && i <= s.end);
LOAD_TIME_PROBES.forEach(([label, re]) => {
  eq(matchesOf(WHOLE, re).filter((i) => !insideWhole(i)).length, 0, 'no ' + label + ' access at load time');
});
eq(matchesOf(WHOLE, /\baddEventListener\s*\(/).length, 0, 'the boundary registers no listener at all');
eq(matchesOf(WHOLE, /\b(?:fetch|XMLHttpRequest)\s*\(/).length, 0, 'the boundary opens no network call of its own');
eq(matchesOf(WHOLE, /\bset(?:Timeout|Interval)\s*\(/).filter((i) => !insideWhole(i)).length, 0,
  'the two timers it schedules are call-time, inside doReconnectTT');
eq(matchesOf(WHOLE, /\b_ttAuthLogin\s*\(/).length, 1,
  'exactly one authentication call exists, and it is call-time inside doReconnectTT');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Consumer inventory — markup, generated markup and code');
// ─────────────────────────────────────────────────────────────────────────────
mustHold('vConsumers', vConsumers(INDEX, []), 'the complete application-wide consumer inventory is exact');
const baseOccurrences = {};
OWNER_NAMES.forEach((n) => { baseOccurrences[n] = classifyOccurrences(INDEX, [], n); });
eq(baseOccurrences.showReconnectPanel, { code: 1, 'generated-markup': 0, 'static-markup': 1 },
  'showReconnectPanel: exactly two occurrences — one markup handler, one declaration');
eq(baseOccurrences._apexPostAuthInit, { code: 3, 'generated-markup': 0, 'static-markup': 0 },
  '_apexPostAuthInit: exactly three occurrences — login consumer, declaration, reconnect consumer');
eq(baseOccurrences.doReconnectTT, { code: 1, 'generated-markup': 1, 'static-markup': 0 },
  'doReconnectTT: exactly two occurrences — one generated handler, one async declaration');
eq(lineAt(INDEX, INDEX.indexOf('onclick="showReconnectPanel()"')), 674,
  'the showReconnectPanel markup consumer sits on line 674');
eq(lineAt(INDEX, INDEX.indexOf("_apexPostAuthInit('login');")), 14372,
  "the normal-login _apexPostAuthInit('login') consumer sits on line 14,372");
ok(INDEX.indexOf("_apexPostAuthInit('reconnect');") > RANGE_START
  && INDEX.indexOf("_apexPostAuthInit('reconnect');") < RANGE_END,
  "the _apexPostAuthInit('reconnect') consumer is inside doReconnectTT");
ok(INDEX.indexOf('onclick="doReconnectTT()"') > FRAGMENTS[0].start
  && INDEX.indexOf('onclick="doReconnectTT()"') < FRAGMENTS[0].end,
  'the doReconnectTT handler is generated markup inside showReconnectPanel');
// A scanner limited to static HTML outside JavaScript would report ZERO here.
const staticOnly = INDEX.replace(/<script[\s\S]*?<\/script>/g, '');
eq(count(staticOnly, 'doReconnectTT'), 0,
  'a static-HTML-only scanner finds NO doReconnectTT consumer — which is exactly why it is insufficient');
eq(count(staticOnly, 'showReconnectPanel'), 1, '…while it does find the one static showReconnectPanel handler');
// The one textual occurrence app-wide that is NOT a consumer.
COMMENT_ONLY_MENTIONS.forEach((m) => {
  const src = fs.readFileSync(path.join(ROOT, m.file), 'utf8');
  eq(count(src, m.name), m.count, m.file + ' mentions ' + m.name + ' ' + m.count + ' time(s)');
  eq(count(maskLiterals(src), m.name), 0, '…and every one of them is inside a comment, so none is a consumer');
});
// Every consumer resolves through an ordinary classic-global binding: nothing
// in the application imports, exports, wraps or window-exposes these names.
OWNER_NAMES.forEach((n) => {
  eq(count(INDEX, 'window.' + n), 0, n + ' is never exposed through window.*');
  eq(count(INDEX, 'export ' + n), 0, n + ' is never exported');
  eq(count(INDEX, "require('" + n), 0, n + ' is never required');
});
eq(APP_LOADER.parseScriptTags(INDEX).filter((t) => t.type === 'module').length, 0,
  'the application carries no type="module" script — every owner is a classic global');

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependency and state analysis');
// ─────────────────────────────────────────────────────────────────────────────
const wholeDeps = freeIdentifiers(WHOLE);
eq(wholeDeps, WHOLE_DEPENDENCIES, 'the whole boundary free-dependency inventory is exact');
eq(wholeDeps.length, 28, 'the whole boundary needs 28 call-time globals');
const fragDeps = {};
FRAGMENTS.forEach((f) => {
  fragDeps[f.name] = freeIdentifiers(FRAG[f.name]);
  eq(fragDeps[f.name], FRAGMENT_DEPENDENCIES[f.name], f.name + ' free-dependency inventory is exact');
});
// COHESION, MEASURED. The three fragments barely share anything.
const inter = (a, b) => a.filter((n) => b.indexOf(n) >= 0);
eq(inter(fragDeps.reconnectPanel, fragDeps.postAuthLifecycle), [],
  'showReconnectPanel and _apexPostAuthInit share ZERO free dependencies');
eq(inter(fragDeps.reconnectPanel, fragDeps.reconnectAction), [],
  'showReconnectPanel and doReconnectTT share ZERO free dependencies');
eq(inter(fragDeps.postAuthLifecycle, fragDeps.reconnectAction), ['S', 'console'],
  '_apexPostAuthInit and doReconnectTT share exactly two: S and console');
// LAYER, MEASURED. The shared lifecycle owner is not UI and is mostly not Tastytrade.
LIFECYCLE_CALLS.forEach((n) => {
  ok(fragDeps.postAuthLifecycle.indexOf(n) >= 0, '_apexPostAuthInit orchestrates ' + n);
});
eq(LIFECYCLE_CALLS.length, 12, '_apexPostAuthInit orchestrates exactly twelve lifecycle entry points');
eq(TASTYTRADE_LIFECYCLE_CALLS.filter((n) => LIFECYCLE_CALLS.indexOf(n) >= 0).length, 3,
  '…of which exactly three are Tastytrade/DXLink-backed');
eq(LIFECYCLE_CALLS.length - TASTYTRADE_LIFECYCLE_CALLS.length, 9,
  '…so nine of twelve have nothing to do with Tastytrade');
eq(matchesOf(FRAG.postAuthLifecycle, /\bdocument\s*\./).length, 0, '_apexPostAuthInit performs no DOM access at all');
eq(matchesOf(FRAG.postAuthLifecycle, /\blocalStorage\s*\./).length, 0, '_apexPostAuthInit touches no storage');
eq(matchesOf(FRAG.postAuthLifecycle, /\bset(?:Timeout|Interval)\s*\(/).length, 0, '_apexPostAuthInit creates no timer');
eq(matchesOf(FRAG.postAuthLifecycle, /\.innerHTML\s*=/).length, 0, '_apexPostAuthInit writes no innerHTML');
eq(matchesOf(FRAG.postAuthLifecycle, /\b(?:fetch|XMLHttpRequest)\s*\(/).length, 0, '_apexPostAuthInit opens no network call');
// State: what each fragment owns, orchestrates and writes across the boundary.
FRAGMENTS.forEach((f) => {
  eq(sPropsWritten(FRAG[f.name]), S_WRITES[f.name], f.name + ' writes exactly these S.* properties');
  eq(sPropsReferenced(FRAG[f.name]), S_READS[f.name], f.name + ' references exactly these S.* properties');
});
eq(sPropsWritten(WHOLE), ['_ttSessionSource', 'dxlinkConnectStarted', 'ttAccounts', 'ttConnected', 'ttSessionId'],
  'the whole boundary writes five S.* properties');
eq(bareAssignmentTargets(WHOLE).filter((n) => wholeDeps.indexOf(n) >= 0), [],
  'NO candidate would rebind a foreign top-level binding — every foreign write is a property write on S');
eq(sPropsReferenced(WHOLE).filter((n) => sPropsWritten(WHOLE).indexOf(n) < 0),
  ['dxlinkStatus', 'scanData', 'swing'], 'three S.* properties are read-only from this boundary');
// Storage, DOM and timers, all call-time.
eq((stripComments(WHOLE).match(/localStorage\.setItem\('([^']+)'/g) || [])
  .map((s) => s.replace(/.*'([^']+)'.*/, '$1')), LOCALSTORAGE_KEYS,
  'exactly one localStorage key is written: apex_tt_session');
eq((stripComments(WHOLE).match(/getElementById\('([^']+)'\)/g) || [])
  .map((s) => s.replace(/.*'([^']+)'.*/, '$1')), DOM_IDS_READ,
  'exactly seven DOM element ids are read, in this order');
DOM_IDS_RENDERED.forEach((id) => {
  ok(FRAG.reconnectPanel.indexOf('id="' + id + '"') > 0, 'the panel renders the #' + id + ' element it later reads');
});
eq(matchesOf(WHOLE, /\bset(?:Timeout|Interval)\s*\(/).length, 2, 'exactly two timers are scheduled, both inside doReconnectTT');
eq(matchesOf(FRAG.postAuthLifecycle, /S\.dxlinkConnectStarted\s*=/).length, 1,
  'the one singleton/guard reset is S.dxlinkConnectStarted, re-armed only on a non-login reason');
eq(sPropsWritten(FRAG.reconnectAction).length, 4, 'four authentication/session state mutations live in doReconnectTT');
eq(matchesOf(FRAG.reconnectAction, /\b_ttAuthLogin\s*\(/).length, 1, 'the single Tastytrade login call lives in doReconnectTT');
eq(matchesOf(WHOLE, /\bawait\s/).length, 1, 'the boundary contains exactly one await, in doReconnectTT');

// ─────────────────────────────────────────────────────────────────────────────
section('7. Candidates — forward transform, load order and reverse reconstruction');
// ─────────────────────────────────────────────────────────────────────────────
// Build every candidate from the pinned fragments, entirely in memory. Nothing
// below is written anywhere: §13 proves the repository is untouched.
function buildCandidate(key) {
  const c = CAND[key];
  const modules = c.modules.map((m) => ({
    src: m.src, pin: m, code: m.frags.map((n) => FRAG[n]).join(''),
  }));
  const movedNames = new Set();
  c.modules.forEach((m) => m.frags.forEach((n) => movedNames.add(n)));
  const kept = FRAGMENTS.filter((f) => !movedNames.has(f.name));
  const html = INDEX.slice(0, RANGE_START)
    + kept.map((f) => FRAG[f.name]).join('')
    + INDEX.slice(RANGE_END);
  const tags = c.modules.map((m) => tagFor(m.src)).join('');
  const predicted = html.replace(ANCHOR_TAG, ANCHOR_TAG + tags);
  const bySrc = {};
  modules.forEach((m) => { bySrc[m.src] = m.code; });
  return { key: key, cand: c, modules: modules, keptFragments: kept, untagged: html, predicted: predicted, bySrc: bySrc };
}
const BUILT = { A: buildCandidate('A'), B: buildCandidate('B'), C: buildCandidate('C'), D: buildCandidate('D') };

eq(count(INDEX, ANCHOR_TAG), 1, 'the mcx-charts.js tag is the unique anchor for every predicted tag');

Object.keys(BUILT).forEach((k) => {
  const b = BUILT[k];
  section('7.' + k + ' Candidate ' + k + ' — ' + b.cand.label);
  // Module identity and ownership.
  b.modules.forEach((m) => {
    mustHold('vModuleIdentity', vModuleIdentity(m.code, m.pin), 'candidate ' + k + ' module ' + m.src + ' has its pinned identity');
    const expected = m.pin.owners.map((n) => OWNERS.filter((o) => o.name === n)[0]);
    mustHold('vOwners', vOwners(m.code, expected), 'candidate ' + k + ' module ' + m.src + ' owns exactly ' + JSON.stringify(m.pin.owners));
    const load = loadInEmptyVm(m.code);
    ok(load.ok, 'candidate ' + k + ' module ' + m.src + ' evaluates in a completely empty VM: ' + load.error);
    eq(load.globals, m.pin.owners, '…defining exactly its declared owners and nothing else');
    eq(residue(m.code), '', '…with zero executable top-level residue');
    ok((() => { try { new vm.Script(m.code, { filename: m.src }); return true; } catch (e) { return false; } })(),
      '…and it parses standalone as a classic script');
  });
  // Predicted document.
  mustHold('vPredictedIndex', vPredictedIndex(b.predicted, b.cand.predicted), 'candidate ' + k + ' predicted index.html has its pinned identity');
  mustHold('vTags', vTags(b.predicted, b.modules.map((m) => m.src)),
    'candidate ' + k + ' tags are unique, classic, src-only, in order after mcx-charts.js and before the inline monolith');
  eq(localScriptCount(b.predicted), b.cand.predicted.scripts,
    'candidate ' + k + ' predicts ' + b.cand.predicted.scripts + ' local application scripts');
  // Consumers survive the relocation unchanged.
  mustHold('vConsumers', vConsumers(b.predicted, b.modules.map((m) => m.code)),
    'candidate ' + k + ' preserves the complete consumer inventory exactly');
  // Load order, proved from the predicted part list rather than text position.
  const parts = predictedParts(b.predicted, b.bySrc);
  const residency = ownerResidency(parts);
  const inlineIdx = parts.findIndex((p) => p.src === '(inline)');
  eq(inlineIdx, parts.length - 1, 'candidate ' + k + ': the inline monolith is still the LAST script');
  b.modules.forEach((m) => {
    const mi = parts.findIndex((p) => p.src === m.src);
    ok(mi >= 0 && mi < inlineIdx, 'candidate ' + k + ': ' + m.src + ' evaluates before the inline monolith');
    ok(mi > parts.findIndex((p) => p.src === ANCHOR_SRC), '…and after mcx-charts.js');
    m.pin.owners.forEach((n) => {
      eq(residency[n], m.src, 'candidate ' + k + ': ' + n + ' is owned by ' + m.src);
    });
  });
  b.keptFragments.forEach((f) => {
    shape(FRAG[f.name]).forEach((o) => {
      eq(residency[o.name], '(inline)', 'candidate ' + k + ': ' + o.name + ' stays in the inline monolith');
    });
  });
  eq(Object.keys(residency).sort(), OWNER_NAMES.slice().sort(),
    'candidate ' + k + ': all three owners still resolve to exactly one declaration site each');
  eq(shape(parts.map((p) => p.code).join('\n')).filter((o) => o.name === 'doReconnectTT')[0].isAsync, true,
    'candidate ' + k + ': doReconnectTT remains async');
  b.modules.forEach((m) => {
    eq(count(m.code, 'window.'), 0, 'candidate ' + k + ': ' + m.src + ' needs no manual window.* exposure');
    eq(count(m.code, 'export '), 0, '…and no export');
    eq(count(m.code, 'import '), 0, '…and no import');
  });
  // Reverse transform: byte-for-byte back to the pinned base.
  let rebuilt;
  if (k === 'D') {
    const untagged = b.predicted.replace(tagFor(b.modules[0].src), '');
    const mod = b.modules[0].code;
    const w = b.cand.weavePoint;
    eq(w, FRAG.reconnectPanel.length, 'candidate D weave point is exactly |reconnectPanel|');
    rebuilt = untagged.slice(0, RANGE_START)
      + mod.slice(0, w) + FRAG.postAuthLifecycle + mod.slice(w)
      + untagged.slice(RANGE_START + FRAG.postAuthLifecycle.length);
  } else if (k === 'C') {
    const untagged = b.predicted.replace(tagFor(b.modules[0].src), '');
    const at = RANGE_START + FRAG.reconnectPanel.length;
    rebuilt = untagged.slice(0, at) + b.modules[0].code + untagged.slice(at);
  } else {
    let untagged = b.predicted;
    b.modules.forEach((m) => { untagged = untagged.replace(tagFor(m.src), ''); });
    rebuilt = untagged.slice(0, RANGE_START)
      + b.modules.map((m) => m.code).join('')
      + untagged.slice(RANGE_START);
  }
  eq(b.predicted.replace(new RegExp(b.modules.map((m) => esc(tagFor(m.src))).join('|'), 'g'), ''), b.untagged,
    'candidate ' + k + ': removing the predicted tag(s) restores the tag-free document exactly');
  mustHold('vReconstruction', vReconstruction(rebuilt), 'candidate ' + k + ' reverse transform reconstructs the pinned base byte-for-byte');
  eq(sha256(rebuilt), INDEX_SHA256, 'candidate ' + k + ' reconstruction hashes to the pinned base SHA-256');
  eq(rebuilt.length, INDEX_CHARS, 'candidate ' + k + ' reconstruction has the pinned base length');
});

// Candidate-specific structure the generic loop cannot state.
eq(BUILT.B.modules.length, 2, 'candidate B is two modules');
eq(BUILT.B.modules[0].code + BUILT.B.modules[1].code, WHOLE,
  'candidate B reconstructs the original block as B1 + B2, in source order');
eq(BUILT.A.modules[0].code, WHOLE, 'candidate A moves the one whole module at the unique source boundary');
eq(BUILT.C.modules[0].code, FRAG.postAuthLifecycle, 'candidate C moves only the shared post-auth lifecycle');
eq(BUILT.D.modules[0].code, FRAG.reconnectPanel + FRAG.reconnectAction,
  'candidate D moves the two non-contiguous reconnect fragments, in source order');
eq(BUILT.D.cand.weavePoint, 2073, 'candidate D uses the exact weave point 2073');

// THE CENTRAL FINDING. What candidate C leaves behind is, byte for byte,
// candidate D's module — contiguous and adjacent, needing no weave at all.
const cTagLen = tagFor(CAND.C.modules[0].src).length;
const cLeftInline = BUILT.C.predicted.slice(RANGE_START + cTagLen, RANGE_START + cTagLen + CAND.D.modules[0].chars);
eq(cLeftInline, BUILT.D.modules[0].code,
  'C leaves the two reconnect fragments CONTIGUOUS — byte-identical to candidate D\'s module');
eq(sha256(cLeftInline), CAND.D.modules[0].sha256, '…hashing to candidate D\'s pinned module SHA-256');
ok(BUILT.C.predicted.indexOf(FRAG.reconnectPanel + FRAG.reconnectAction) > 0,
  '…so the follow-up reconnect-UI extraction is a plain contiguous cut, no weave');
ok(BUILT.D.predicted.indexOf(FRAG.postAuthLifecycle) > 0,
  'D, by contrast, leaves the shared lifecycle owner inline and needs a weave to undo');

// ─────────────────────────────────────────────────────────────────────────────
section('8. Cost model — the numbers the recommendation is made from');
// ─────────────────────────────────────────────────────────────────────────────
// Call edges in the whole application. Exactly four, and every candidate is
// scored by how many of them cross its module boundary.
const EDGES = [
  { from: 'static markup', to: 'showReconnectPanel', where: 'markup' },
  { from: 'showReconnectPanel', to: 'doReconnectTT', where: 'generated markup' },
  { from: 'inline launch handler', to: '_apexPostAuthInit', where: 'code' },
  { from: 'doReconnectTT', to: '_apexPostAuthInit', where: 'code' },
];
eq(EDGES.length, 4, 'the whole feature has exactly four call edges');
function ownerOf(built, name) {
  const m = built.modules.filter((x) => x.pin.owners.indexOf(name) >= 0)[0];
  return m ? m.src : '(inline)';
}
function metrics(key) {
  const b = BUILT[key];
  const moved = b.modules.reduce((a, m) => a + m.pin.chars, 0);
  const crossing = EDGES.filter((e) => {
    const to = ownerOf(b, e.to);
    const from = OWNER_NAMES.indexOf(e.from) >= 0 ? ownerOf(b, e.from) : '(inline)';
    return from !== to;
  }).length;
  const movedFrags = new Set();
  b.cand.modules.forEach((m) => m.frags.forEach((n) => movedFrags.add(n)));
  const stateWrites = FRAGMENTS.filter((f) => movedFrags.has(f.name))
    .reduce((a, f) => a + S_WRITES[f.name].length, 0);
  const stateReads = FRAGMENTS.filter((f) => movedFrags.has(f.name))
    .reduce((a, f) => a.concat(S_READS[f.name]), []);
  const deps = b.modules.map((m) => freeIdentifiers(m.code));
  return {
    modules: b.modules.length,
    scriptTags: b.modules.length,
    movedChars: moved,
    movedPct: Number(((moved / RANGE_CHARS) * 100).toFixed(2)),
    retainedInlineChars: RANGE_CHARS - moved,
    freeDependencies: Array.from(new Set([].concat.apply([], deps))).sort().length,
    perModuleDependencies: deps.map((d) => d.length),
    crossBoundaryCalls: crossing,
    crossBoundaryStateWrites: stateWrites,
    crossBoundaryStateReads: Array.from(new Set(stateReads)).length,
    loadTimeEffects: 0,
    reverseTransform: key === 'D' ? 'weave at 2073' : (key === 'C' ? 'single re-insertion between the two retained fragments' : 'single contiguous re-insertion'),
    // Declaration order is preserved when every module's owners, read left to
    // right across the modules in tag order, are a subsequence of the pinned
    // source order. Derived, never asserted by hand.
    declarationOrderPreserved: (function () {
      const seq = [].concat.apply([], b.cand.modules.map((m) => m.owners));
      let at = -1;
      return seq.every((n) => { const i = OWNER_NAMES.indexOf(n); const okOrder = i > at; at = i; return okOrder; });
    })(),
    conceptualOwner: b.cand.conceptualOwner,
    layer: b.cand.layer,
    strongestAdvantage: b.cand.strongestAdvantage,
    strongestDrawback: b.cand.strongestDrawback,
    predictedLocalScripts: b.cand.predicted.scripts,
  };
}
const M = { A: metrics('A'), B: metrics('B'), C: metrics('C'), D: metrics('D') };
eq([M.A.modules, M.B.modules, M.C.modules, M.D.modules], [1, 2, 1, 1], 'module counts are 1, 2, 1, 1');
eq([M.A.movedChars, M.B.movedChars, M.C.movedChars, M.D.movedChars], [9224, 9224, 4471, 4753],
  'moved units are 9224, 9224, 4471 and 4753');
eq([M.A.retainedInlineChars, M.B.retainedInlineChars, M.C.retainedInlineChars, M.D.retainedInlineChars],
  [0, 0, 4753, 4471], 'retained inline units are 0, 0, 4753 and 4471');
eq([M.A.crossBoundaryCalls, M.B.crossBoundaryCalls, M.C.crossBoundaryCalls, M.D.crossBoundaryCalls],
  [2, 3, 2, 2], 'cross-boundary call edges are 2, 3, 2 and 2 — candidate B is the only one that adds one');
eq([M.A.crossBoundaryStateWrites, M.B.crossBoundaryStateWrites, M.C.crossBoundaryStateWrites, M.D.crossBoundaryStateWrites],
  [5, 5, 1, 4], 'cross-boundary S.* writes are 5, 5, 1 and 4 — candidate C moves the fewest by far');
eq([M.A.loadTimeEffects, M.B.loadTimeEffects, M.C.loadTimeEffects, M.D.loadTimeEffects], [0, 0, 0, 0],
  'no candidate performs any load-time effect');
eq([M.A.declarationOrderPreserved, M.B.declarationOrderPreserved,
  M.C.declarationOrderPreserved, M.D.declarationOrderPreserved], [true, true, true, true],
  'every candidate preserves the original declaration order');
eq([M.A.layer, M.B.layer, M.C.layer, M.D.layer], ['js/ui', 'js/ui + js/ui', 'js/services', 'js/ui'],
  'the four candidates propose these layers');
ok([M.A, M.B, M.C, M.D].every((m) => m.conceptualOwner && m.strongestAdvantage && m.strongestDrawback),
  'every candidate carries a conceptual owner name, a strongest advantage and a strongest drawback');
// The order flag is not vacuously true: a swapped manifest must read false.
ok(!(function () {
  let at = -1;
  return ['doReconnectTT', 'showReconnectPanel'].every((n) => {
    const i = OWNER_NAMES.indexOf(n); const okOrder = i > at; at = i; return okOrder;
  });
})(), 'MUTANT REJECTED: a reordered owner manifest does not count as order-preserving');
ok(M.B.scriptTags > M.A.scriptTags && M.B.movedChars === M.A.movedChars,
  'candidate B costs one more script than A for exactly the same relocation — and splits one UI feature in two');
ok(M.C.crossBoundaryStateWrites < M.D.crossBoundaryStateWrites,
  'candidate C moves fewer session-state writes across the boundary than D');
// Layer check: D would place four Tastytrade session writes and the session
// localStorage write into a js/ui/ module while the service-shaped orchestrator
// stays inline — the layering inverted.
ok(CAND.D.modules[0].src.indexOf('/ui/') > 0 && S_WRITES.reconnectAction.length === 4,
  'candidate D puts four session-state writes into a js/ui/ module');
ok(CAND.C.modules[0].src.indexOf('/services/') > 0,
  'candidate C places the non-UI orchestrator in js/services/, the only non-UI home this tree has');
eq(fs.readdirSync(path.join(ROOT, 'js')).sort(), ['adapters', 'api', 'config', 'services', 'ui', 'utils'],
  '…and the tree really does offer only these six layers');

// A live contract that every candidate touching _apexPostAuthInit would change.
const BSS_CONTRACT = 'tests/backend-scanner-snapshot-ui-boundary-contract.test.js';
const bssSrc = fs.readFileSync(path.join(ROOT, BSS_CONTRACT), 'utf8');
ok(bssSrc.indexOf("'_apexPostAuthInit'") > 0 && bssSrc.indexOf("' stayed in the inline monolith'") > 0,
  BSS_CONTRACT + ' requires _apexPostAuthInit to be resident in the inline monolith');
['A', 'B', 'C'].forEach((k) => {
  ok(ownerOf(BUILT[k], '_apexPostAuthInit') !== '(inline)',
    'candidate ' + k + ' moves _apexPostAuthInit, so phase 2 must update ' + BSS_CONTRACT);
});
eq(ownerOf(BUILT.D, '_apexPostAuthInit'), '(inline)',
  'candidate D alone leaves _apexPostAuthInit inline and would not touch that contract');

// The shipped module convention in this series, and where the pinned module
// identities depart from it. Reported, never silently substituted.
const shippedModules = ['js/ui/mcx-charts.js', 'js/ui/mcx-macro-check.js', 'js/services/journal-core.js'];
shippedModules.forEach((rel) => {
  const t = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(t.endsWith('}\n') && !t.endsWith('\n\n'), rel + ' ends `}\\n` — no blank line at EOF');
});
Object.keys(BUILT).forEach((k) => {
  BUILT[k].modules.forEach((m) => {
    ok(m.code.endsWith('\n\n'),
      'candidate ' + k + ' module ' + m.src + ' as pinned ends on a blank line — `git diff --check` would flag it in phase 2');
  });
});
const aCorrected = WHOLE.slice(0, -1);
const aCorrectedIndex = (INDEX.slice(0, RANGE_START) + '\n' + INDEX.slice(RANGE_END))
  .replace(ANCHOR_TAG, ANCHOR_TAG + tagFor(CAND.A.modules[0].src));
eq(aCorrected.length, A_SEPARATOR_CORRECTED.moduleChars, 'separator-corrected candidate A module UTF-16 length');
eq(Buffer.byteLength(aCorrected, 'utf8'), A_SEPARATOR_CORRECTED.moduleUtf8, 'separator-corrected candidate A module UTF-8 byte length');
eq(count(aCorrected, '\n'), A_SEPARATOR_CORRECTED.moduleLf, 'separator-corrected candidate A module LF count');
eq(sha256(aCorrected), A_SEPARATOR_CORRECTED.moduleSha256, 'separator-corrected candidate A module SHA-256');
eq(aCorrectedIndex.length, A_SEPARATOR_CORRECTED.predictedChars, 'separator-corrected candidate A predicted index UTF-16 length');
eq(sha256(aCorrectedIndex), A_SEPARATOR_CORRECTED.predictedSha256, 'separator-corrected candidate A predicted index SHA-256');
ok(aCorrected.endsWith('}\n') && sha256(aCorrected) !== CAND.A.modules[0].sha256,
  'the separator-corrected module is a DIFFERENT byte sequence — the pinned prediction is not silently reused for it');

// ─────────────────────────────────────────────────────────────────────────────
section('9. What each candidate would leave inline');
// ─────────────────────────────────────────────────────────────────────────────
Object.keys(BUILT).forEach((k) => {
  const b = BUILT[k];
  eq(count(b.predicted, MCX_GLUE), 1, 'candidate ' + k + ' leaves the #408 MCX resize glue byte-for-byte inline');
  ok(b.predicted.indexOf('function escHtml(') > 0, 'candidate ' + k + ' leaves escHtml inline');
  eq(count(b.predicted, ANCHOR_TAG), 1, 'candidate ' + k + ' leaves the mcx-charts.js tag untouched');
  b.modules.forEach((m) => {
    eq(m.code.indexOf('escHtml'), -1, 'candidate ' + k + ' module ' + m.src + ' carries no escHtml');
    eq(m.code.indexOf('_mcxResizeTimer'), -1, '…and no _mcxResizeTimer');
    eq(m.code.indexOf('addEventListener'), -1, '…and no listener registration');
  });
});
ok(!fs.existsSync(path.join(ROOT, 'js/ui/tt-auth-lifecycle.js')), 'no proposed module exists yet (A/B2)');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/tt-reconnect-panel.js')), 'no proposed module exists yet (B1)');
ok(!fs.existsSync(path.join(ROOT, 'js/services/apex-post-auth-init.js')), 'no proposed module exists yet (C)');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/tt-reconnect.js')), 'no proposed module exists yet (D)');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
// Every guard above is driven here with a mutant it must reject. The guards are
// pure functions of an artefact, so none of these is short-circuited by an
// earlier whole-document identity assertion.
const owner1 = OWNERS.slice();

// (1) a changed base/index blob
mustCatch(vBaseIdentity(INDEX.replace('function escHtml(', 'function escHtml2(')), 'a changed base index blob');
mustCatch(vBaseIdentity(INDEX + '\n'), 'a base index blob with one extra byte');
// (2)(3) a duplicated or missing start marker
mustCatch(vMarkers(INDEX.slice(0, RANGE_START) + START_MARKER + INDEX.slice(RANGE_START)), 'a duplicated start marker');
mustCatch(vMarkers(INDEX.replace(START_MARKER, '// removed')), 'a missing start marker');
// (4)(5) a duplicated or missing end marker
mustCatch(vMarkers(INDEX.slice(0, RANGE_END) + END_MARKER + INDEX.slice(RANGE_END)), 'a duplicated end marker');
mustCatch(vMarkers(INDEX.replace(END_MARKER, 'var _other = null;')), 'a missing end marker');
// (6) a boundary expanded upward to absorb escHtml
mustCatch(vBoundary(INDEX, INDEX.indexOf('function escHtml('), RANGE_END), 'a boundary expanded upward to absorb escHtml');
// (7) a boundary expanded downward to absorb _mcxResizeTimer
mustCatch(vBoundary(INDEX, RANGE_START, RANGE_END + END_MARKER.length + 1), 'a boundary expanded downward to absorb _mcxResizeTimer');
// (8) absorption of the MCX resize listener
mustCatch(vBoundary(INDEX, RANGE_START, RANGE_END + MCX_GLUE_CHARS), 'absorption of the whole MCX resize glue and its listener');
mustCatch(vOwners(WHOLE + MCX_GLUE, owner1), 'a module that absorbed the MCX resize listener');
ok(!loadInEmptyVm(WHOLE + MCX_GLUE).ok, '…and such a module stops evaluating in an empty VM');
// (9) a missing owner
mustCatch(vOwners(FRAG.reconnectPanel + FRAG.reconnectAction, owner1), 'a missing owner');
// (10) a renamed owner
mustCatch(vOwners(WHOLE.replace('function _apexPostAuthInit(', 'function _apexPostAuthInitV2('), owner1), 'a renamed owner');
// (11) reordered owners
mustCatch(vOwners(FRAG.postAuthLifecycle + FRAG.reconnectPanel + FRAG.reconnectAction, owner1), 'reordered owners');
// (12) doReconnectTT changed from async to sync
mustCatch(vOwners(WHOLE.replace('async function doReconnectTT(', 'function doReconnectTT('), owner1),
  'doReconnectTT changed from async to sync');
// (13) an added top-level call
mustCatch(vOwners(WHOLE + '\n_apexPostAuthInit("login");\n', owner1), 'an added top-level call');
// (14) an added top-level listener
mustCatch(vOwners(WHOLE + "\nwindow.addEventListener('resize', function(){});\n", owner1), 'an added top-level listener');
// (15) an added top-level timer
mustCatch(vOwners(WHOLE + '\nsetTimeout(showReconnectPanel, 0);\n', owner1), 'an added top-level timer');
mustCatch(vOwners(WHOLE + "\ndocument.getElementById('rtu');\n", owner1), 'an added top-level DOM access');
mustCatch(vOwners(WHOLE + "\nlocalStorage.setItem('x','y');\n", owner1), 'an added top-level storage write');
mustCatch(vOwners(WHOLE + "\n_ttAuthLogin('u','p');\n", owner1), 'an added top-level authentication call');
// (16) a changed external consumer count
mustCatch(vConsumers(INDEX.replace('onclick="showReconnectPanel()"', 'onclick="void 0"'), []), 'a removed markup consumer');
mustCatch(vConsumers(INDEX.slice(0, 57982) + 'showReconnectPanel' + INDEX.slice(57982), []), 'an added external consumer');
// (17) a missing generated doReconnectTT() handler
mustCatch(vConsumers(INDEX.replace('onclick="doReconnectTT()"', 'onclick="doReconnectTTx()"'), []),
  'a missing generated doReconnectTT() handler');
// (18) a changed normal-login consumer
mustCatch(vConsumers(INDEX.replace("_apexPostAuthInit('login');", "_apexPostAuthInit('relaunch');"), []),
  "a changed normal-login _apexPostAuthInit('login') consumer");
// (19) reordered candidate fragments
{
  const swapped = FRAG.reconnectAction + FRAG.reconnectPanel;
  mustCatch(vModuleIdentity(swapped, CAND.D.modules[0].pin || CAND.D.modules[0]), 'reordered candidate D fragments');
  mustCatch(vOwners(swapped, ['showReconnectPanel', 'doReconnectTT'].map((n) => OWNERS.filter((o) => o.name === n)[0])),
    '…and the reordered module no longer matches the owner manifest');
  const untagged = BUILT.D.predicted.replace(tagFor(CAND.D.modules[0].src), '');
  const w = CAND.D.weavePoint;
  mustCatch(vReconstruction(untagged.slice(0, RANGE_START) + swapped.slice(0, w) + FRAG.postAuthLifecycle
    + swapped.slice(w) + untagged.slice(RANGE_START + FRAG.postAuthLifecycle.length)),
    '…and reconstruction from the reordered module fails');
}
// (20) a changed Candidate D weave point
{
  const untagged = BUILT.D.predicted.replace(tagFor(CAND.D.modules[0].src), '');
  const mod = BUILT.D.modules[0].code;
  [CAND.D.weavePoint - 1, CAND.D.weavePoint + 1, 0, mod.length].forEach((w) => {
    mustCatch(vReconstruction(untagged.slice(0, RANGE_START) + mod.slice(0, w) + FRAG.postAuthLifecycle
      + mod.slice(w) + untagged.slice(RANGE_START + FRAG.postAuthLifecycle.length)),
      'a candidate D weave point of ' + w + ' instead of ' + CAND.D.weavePoint);
  });
}
// (21) a duplicate, missing or reordered predicted tag
{
  const srcsB = CAND.B.modules.map((m) => m.src);
  mustCatch(vTags(BUILT.B.predicted.replace(tagFor(srcsB[0]), tagFor(srcsB[0]) + tagFor(srcsB[0])), srcsB), 'a duplicated predicted tag');
  mustCatch(vTags(BUILT.B.predicted.replace(tagFor(srcsB[1]), ''), srcsB), 'a missing predicted tag');
  mustCatch(vTags(BUILT.B.untagged.replace(ANCHOR_TAG, ANCHOR_TAG + tagFor(srcsB[1]) + tagFor(srcsB[0])), srcsB),
    'reordered predicted tags');
}
// (22) a tag placed anywhere other than after mcx-charts.js and before the inline monolith
{
  const srcA = CAND.A.modules[0].src;
  const firstTag = '<script src="./js/utils/indicators.js"></script>\n';
  mustCatch(vTags(BUILT.A.untagged.replace(firstTag, tagFor(srcA) + firstTag), [srcA]),
    'a predicted tag placed at the head of the load order');
  mustCatch(vTags(BUILT.A.untagged.replace(firstTag, firstTag + tagFor(srcA)), [srcA]),
    'a predicted tag placed after indicators.js instead of after mcx-charts.js');
  mustCatch(vTags(BUILT.A.untagged.replace(ANCHOR_TAG, tagFor(srcA) + ANCHOR_TAG), [srcA]),
    'a predicted tag placed BEFORE mcx-charts.js');
}
// (23) type="module", async or defer added to a predicted tag
{
  const srcA = CAND.A.modules[0].src;
  mustCatch(vTags(BUILT.A.predicted.replace(tagFor(srcA), '<script type="module" src="' + srcA + '"></script>\n'), [srcA]),
    'type="module" added to a predicted tag');
  mustCatch(vTags(BUILT.A.predicted.replace(tagFor(srcA), '<script src="' + srcA + '" async></script>\n'), [srcA]),
    'async added to a predicted tag');
  mustCatch(vTags(BUILT.A.predicted.replace(tagFor(srcA), '<script src="' + srcA + '" defer></script>\n'), [srcA]),
    'defer added to a predicted tag');
}
// (24) a truncated or mutated predicted module
{
  const pinA = CAND.A.modules[0];
  mustCatch(vModuleIdentity(WHOLE.slice(0, -10), pinA), 'a truncated predicted module');
  mustCatch(vModuleIdentity(WHOLE.replace('CONNETTI ORA', 'CONNETTI  ORA'), pinA), 'a mutated predicted module');
  let untagged = BUILT.A.predicted.replace(tagFor(pinA.src), '');
  mustCatch(vReconstruction(untagged.slice(0, RANGE_START) + WHOLE.slice(0, -10) + untagged.slice(RANGE_START)),
    '…and reconstruction from a truncated module fails');
}
// (25) a foreign production change
mustCatch(vProductionUntouched(['tests/temporary-tt-auth-lifecycle-audit.test.js', 'index.html']), 'a foreign index.html change');
mustCatch(vProductionUntouched(['js/ui/tt-auth-lifecycle.js']), 'a foreign js/ module appearing in the change set');
// …and the guards are not vacuous: each holds on the real artefact.
mustHold('vProductionUntouched', vProductionUntouched(['tests/temporary-tt-auth-lifecycle-audit.test.js']),
  'a test-only change set is accepted');
mustHold('vTags', vTags(BUILT.A.predicted, [CAND.A.modules[0].src]), 'the real candidate A tag placement is accepted');
mustHold('vModuleIdentity', vModuleIdentity(WHOLE, CAND.A.modules[0]), 'the real candidate A module is accepted');
mustHold('vReconstruction', vReconstruction(INDEX), 'the pinned base itself is accepted as its own reconstruction');

// ─────────────────────────────────────────────────────────────────────────────
section('11. This audit changes no production byte — verified from HEAD');
// ─────────────────────────────────────────────────────────────────────────────
const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const statusPaths = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const allPaths = Array.from(new Set(changed.concat(statusPaths))).sort();
mustHold('vProductionUntouched', vProductionUntouched(allPaths), 'ZERO production files changed: this is a measurement, not a relocation');
ok(allPaths.every((r) => r.indexOf('tests/') === 0), 'every changed path is a test artefact: ' + JSON.stringify(allPaths));
// From HEAD's tree, not the working copy.
eq(git(['ls-tree', '-r', '--name-only', 'HEAD', '--', 'index.html', 'js']).trim(),
  git(['ls-tree', '-r', '--name-only', BASE_SHA, '--', 'index.html', 'js']).trim(),
  'HEAD carries exactly the base production file set');
eq(git(['ls-tree', '-r', 'HEAD', '--', 'index.html', 'js']).trim(),
  git(['ls-tree', '-r', BASE_SHA, '--', 'index.html', 'js']).trim(),
  'every production blob at HEAD is byte-identical to the base');
eq(git(['rev-parse', 'HEAD:index.html']).trim(), INDEX_BLOB, 'index.html at HEAD is the pinned base blob');

// ─────────────────────────────────────────────────────────────────────────────
section('12. Recommendation');
// ─────────────────────────────────────────────────────────────────────────────
const RECOMMENDATION = 'C';
ok(M.C.crossBoundaryStateWrites === 1 && M.C.crossBoundaryStateWrites < M.A.crossBoundaryStateWrites
  && M.C.crossBoundaryStateWrites < M.B.crossBoundaryStateWrites
  && M.C.crossBoundaryStateWrites < M.D.crossBoundaryStateWrites,
  'C is recommended on evidence: it moves the fewest cross-boundary state writes of any candidate');
ok(cLeftInline === BUILT.D.modules[0].code,
  '…and it is the only candidate whose remainder is a contiguous, weave-free next boundary');
ok(inter(fragDeps.reconnectPanel, fragDeps.postAuthLifecycle).length === 0
  && inter(fragDeps.postAuthLifecycle, fragDeps.reconnectAction).length === 2,
  '…because the 9.2k block is a chain with a shared middle, not one cohesive owner');

const report = {
  base: {
    commit: BASE_SHA, tree: BASE_TREE, subject: BASE_SUBJECT, pullRequest: BASE_PR,
    indexBlob: INDEX_BLOB, indexChars: INDEX.length, indexUtf8: Buffer.byteLength(INDEX, 'utf8'),
    indexLf: count(INDEX, '\n'), indexSha256: sha256(INDEX), localScripts: localScriptCount(INDEX),
    baselineSuiteFiles: BASELINE_SUITE_FILES,
  },
  source: {
    range: [RANGE_START, RANGE_END], startLine: RANGE_START_LINE, lastLine: RANGE_LAST_LINE,
    chars: WHOLE.length, utf8: Buffer.byteLength(WHOLE, 'utf8'), lf: count(WHOLE, '\n'),
    sha256: sha256(WHOLE),
    beginsAfter: 'escHtml', endsBefore: 'var _mcxResizeTimer (the #408 MCX resize glue)',
    mcxGlue: { chars: MCX_GLUE.length, utf8: Buffer.byteLength(MCX_GLUE, 'utf8'),
      lf: count(MCX_GLUE, '\n'), sha256: sha256(MCX_GLUE), inside: false },
    fragments: FRAGMENTS.map((f) => ({
      name: f.name, range: [f.start, f.end], chars: f.chars, utf8: f.utf8, lf: f.lf, sha256: f.sha256,
    })),
  },
  owners: shape(WHOLE),
  consumers: {
    occurrences: baseOccurrences,
    sites: {
      'showReconnectPanel(): static markup': 674,
      "_apexPostAuthInit('login'): normal login": 14372,
      "_apexPostAuthInit('reconnect'): inside doReconnectTT": lineAt(INDEX, INDEX.indexOf("_apexPostAuthInit('reconnect');")),
      'doReconnectTT(): generated markup inside showReconnectPanel': lineAt(INDEX, INDEX.indexOf('onclick="doReconnectTT()"')),
    },
    staticHtmlOnlyScannerWouldFind: { showReconnectPanel: 1, doReconnectTT: 0, _apexPostAuthInit: 0 },
    commentOnlyMentions: COMMENT_ONLY_MENTIONS,
    classicGlobalResolutionOnly: true,
    windowExposureNeeded: false, importsNeeded: false, exportsNeeded: false,
    typeModuleNeeded: false, asyncOrDeferNeeded: false, declarationRewritesNeeded: false,
  },
  dependencies: {
    whole: { count: wholeDeps.length, names: wholeDeps },
    perFragment: Object.fromEntries(FRAGMENTS.map((f) => [f.name, {
      count: fragDeps[f.name].length, names: fragDeps[f.name],
      sWrites: S_WRITES[f.name], sReads: S_READS[f.name],
    }])),
    overlap: {
      'reconnectPanel∩postAuthLifecycle': inter(fragDeps.reconnectPanel, fragDeps.postAuthLifecycle),
      'reconnectPanel∩reconnectAction': inter(fragDeps.reconnectPanel, fragDeps.reconnectAction),
      'postAuthLifecycle∩reconnectAction': inter(fragDeps.postAuthLifecycle, fragDeps.reconnectAction),
    },
    stateOwnedByBoundary: [],
    stateOrchestratedThroughCalls: LIFECYCLE_CALLS,
    tastytradeLifecycleCalls: TASTYTRADE_LIFECYCLE_CALLS,
    nonTastytradeLifecycleCalls: LIFECYCLE_CALLS.filter((n) => TASTYTRADE_LIFECYCLE_CALLS.indexOf(n) < 0),
    stateOwnedElsewhereButWrittenDirectly: { object: 'S (inline const)', properties: sPropsWritten(WHOLE) },
    foreignTopLevelBindingsRebound: [],
    localStorageKeys: LOCALSTORAGE_KEYS,
    domIdsRead: DOM_IDS_READ, domIdsRendered: DOM_IDS_RENDERED,
    timersScheduled: 2, timersAtLoadTime: 0,
    guardStateReset: ['S.dxlinkConnectStarted'],
    authenticationStateMutations: S_WRITES.reconnectAction.concat(['localStorage:apex_tt_session']),
    loadTimeDependencies: [], callTimeDependencies: wholeDeps,
  },
  candidates: Object.fromEntries(Object.keys(BUILT).map((k) => [k, {
    label: CAND[k].label,
    modules: BUILT[k].modules.map((m) => ({
      path: m.src.replace(/^\.\//, ''), chars: m.code.length,
      utf8: Buffer.byteLength(m.code, 'utf8'), lf: count(m.code, '\n'), sha256: sha256(m.code),
      owners: m.pin.owners, declarationsOnly: residue(m.code) === '', emptyVmSafe: loadInEmptyVm(m.code).ok,
      endsOnBlankLine: m.code.endsWith('\n\n'),
    })),
    weavePoint: CAND[k].weavePoint || null,
    metrics: M[k],
    predictedIndex: {
      chars: BUILT[k].predicted.length, utf8: Buffer.byteLength(BUILT[k].predicted, 'utf8'),
      lf: count(BUILT[k].predicted, '\n'), sha256: sha256(BUILT[k].predicted),
      localScripts: localScriptCount(BUILT[k].predicted),
    },
    loadOrder: {
      inlineMonolithLast: true, tagsAfterMcxCharts: true, classicSrcOnly: true,
      ownerResidency: ownerResidency(predictedParts(BUILT[k].predicted, BUILT[k].bySrc)),
      allConsumersStillResolve: true, doReconnectTTStillAsync: true,
    },
    reverseReconstruction: { byteExact: true, sha256: INDEX_SHA256 },
    touchesLiveContract: ownerOf(BUILT[k], '_apexPostAuthInit') !== '(inline)' ? [BSS_CONTRACT] : [],
  }])),
  separatorCorrectedCandidateA: A_SEPARATOR_CORRECTED,
  answers: {
    'is _apexPostAuthInit a shared service owner, a UI lifecycle owner or feature-level orchestration':
      'a SHARED, non-UI post-authentication lifecycle owner. It performs zero DOM, storage, timer, '
      + 'listener and network access of its own; it orchestrates 12 lifecycle entry points of which only '
      + '3 are Tastytrade/DXLink-backed; and it has two independent callers, the normal-login path '
      + '(line 14,372) and the reconnect action. It is service-layer orchestration, not reconnect-feature code.',
    'does doReconnectTT belong with it or only consume it':
      'it only CONSUMES it. Their free-dependency overlap is two names (S, console). doReconnectTT is '
      + 'DOM- and credential-bound (7 getElementById sites, 1 innerHTML write, the apex_tt_session storage '
      + 'write, 4 S.* session writes, the single await on _ttAuthLogin); _apexPostAuthInit touches none of '
      + 'that. The edge between them is one call-time call, not shared state.',
    'is the 9.2k-unit whole block cohesive enough for one module':
      'no. It is a chain with a shared middle, not a cluster: showReconnectPanel shares ZERO free '
      + 'dependencies with either other owner, and the other two share two. Naming the whole block a '
      + 'Tastytrade auth-lifecycle UI owner would mislabel the 9 of 12 lifecycle calls that are not Tastytrade.',
    'would splitting improve ownership enough to justify more scripts and contracts':
      'yes for candidate C (one extra script, and it removes the only owner that does not belong to the '
      + 'reconnect feature). No for candidate B, which costs a second script for the same relocation as A '
      + 'while splitting one UI feature across two modules.',
    'does any candidate create cross-boundary mutable-state writes worse than the current inline state':
      'no candidate is unsafe — every foreign write is a property write on the inline-owned S object, '
      + 'resolved at call time, and none rebinds a foreign top-level binding. But they differ sharply: '
      + 'A and B move 5 S.* writes across the boundary, D moves 4 (all Tastytrade session state, into a '
      + 'js/ui/ module, while the service-shaped orchestrator stays inline), and C moves 1.',
    'which candidate gives the best next extraction boundary without premature fragmentation':
      'C. Removing postAuthLifecycle leaves reconnectPanel and reconnectAction CONTIGUOUS and adjacent — '
      + 'byte-identical to candidate D\'s module, SHA 53fba09f… — so the follow-up reconnect-UI extraction '
      + 'becomes a plain contiguous cut with no weave, and the whole 9,224-unit block is gone in two '
      + 'independently reversible steps with correct layers.',
  },
  recommendation: RECOMMENDATION,
  recommendationSummary:
    'Extract ONLY the shared post-authentication lifecycle, as js/services/apex-post-auth-init.js: '
    + '4,471 units, one owner, declarations-only, empty-VM safe, 1 cross-boundary state write, '
    + '2 call-time cross-boundary edges, byte-exact reverse. Phase 2 must also carve the trailing LF out '
    + 'of the module (shipped convention is `}\\n`) and update the one live contract that pins '
    + '_apexPostAuthInit to the inline monolith.',
  rejections: {
    A: 'rejected — mechanically the simplest cut, but it names a shared, mostly-non-Tastytrade lifecycle '
      + 'orchestrator as TT reconnect UI and files it under js/ui/. 9 of the 12 lifecycle entry points it '
      + 'orchestrates are not Tastytrade, it performs zero DOM access, and its second caller is the normal '
      + 'login path 986k characters away. One module, wrong label, wrong layer.',
    B: 'rejected — strictly dominated by A. Identical 9,224 units moved, but +1 module and +1 script tag, '
      + 'and it makes the wrong split: showReconnectPanel and doReconnectTT are the two halves of ONE UI '
      + 'feature (the panel generates the handler that calls the action) and B separates them, while '
      + 'keeping the two least-alike owners — shared orchestration and reconnect submit — together. It is '
      + 'the only candidate that raises the cross-boundary call count, from 2 to 3.',
    D: 'deferred, not rejected — it is the right js/ui/ module, but only as step 2. As a first step it '
      + 'needs a non-contiguous weave at 2073, moves 4 Tastytrade session writes and the apex_tt_session '
      + 'storage write into a js/ui/ module while the service-shaped orchestrator stays inline, and keeps '
      + 'the doReconnectTT → _apexPostAuthInit edge crossing the boundary anyway. After C ships, D\'s exact '
      + 'bytes are already contiguous and the weave disappears.',
  },
  phase2Notes: {
    liveContractToUpdate: BSS_CONTRACT + " pins _apexPostAuthInit to '(inline)'; candidates A, B and C move it.",
    moduleEofConvention: 'every pinned module identity ends on a blank line; `git diff --check` (which CI '
      + 'runs) reports "new blank line at EOF", and every module shipped in this series ends `}\\n`. Carve '
      + 'the final LF out of the module and leave it inline as the structural separator.',
    historicalTaxonomy: 'tests/post-eic-monolith-extraction-audit.test.js classifies all three owners as '
      + 'CORE_SHELL, a family it called a non-candidate. That audit reads a PINNED historical blob, so it '
      + 'is a classification to argue with, not a gate that extraction would break.',
  },
  productionChanged: [],
};

console.log('\nTT_AUTH_LIFECYCLE_AUDIT_BEGIN');
console.log(JSON.stringify(report, null, 2));
console.log('TT_AUTH_LIFECYCLE_AUDIT_END');
console.log('\n' + pass + ' assertions passed');
console.log('TT_AUTH_LIFECYCLE_AUDIT_OK');
