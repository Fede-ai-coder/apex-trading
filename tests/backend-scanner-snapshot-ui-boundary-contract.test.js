'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend Scanner Snapshot UI (BSS UI) — EXTRACTION BOUNDARY CONTRACT
//
// WHAT THIS FILE IS
//   An AUDIT contract, not a behaviour test. It measures — against the REAL
//   application source loaded through tests/lib/load-app-source.js — the
//   physical, temporal, statal and behavioural boundary of the Backend Scanner
//   Snapshot UI, which is STILL INLINE in index.html. It copies no
//   implementation, changes no behaviour and moves no code.
//
//   tests/backend-scanner-snapshot.test.js already pins WHAT the panel renders.
//   This file pins WHERE the panel ends: which declarations belong to it, what
//   they may depend on, who is allowed to call them, what the already-extracted
//   service still owns, and what must remain true at load time for a future
//   js/ui/backend-scanner-snapshot-panel.js to be a pure relocation.
//
// WHY IT EXISTS
//   PR #339 extracted js/services/backend-scanner-snapshot-service.js (12
//   declarations; PR #340 was the follow-up shared-in-flight/abort race fix on
//   that same file). PR #342 extracted js/adapters/backend-directional-adapter.js.
//   PR #344 extracted js/ui/backend-directional-preview.js. The BSS UI is the
//   next and last candidate of the family, and it is the most entangled one: it
//   is the render target of the already-extracted service, the provider of three
//   formatters consumed by TWO other subsystems, and the caller of the
//   already-extracted preview. Every edge is measured, not assumed.
//
// DIVERGENCES FROM THE AUDIT BRIEF are asserted as FACTS, not corrected:
//   D1  The surface is 32 inline declarations, NOT the 30 named in the brief's
//       initial manifest. bssUniverseDiagHtml and bssBodyHtml are the two extra
//       HTML builders; both are inventoried, measured and owned by the UI (§1).
//   D2  The brief's assumed declaration order is wrong in two places. The real
//       tail order is bssRenderHeadBadges → bssApplyCollapse → bssToggleCollapse
//       → bssRender → bssInit (§3).
//   D3  The brief's assumed PHYSICAL order puts the launch handler and
//       `bssInit();` AFTER the BSS UI declarations. Reality is the opposite: the
//       single `bssInit();` call site sits ~146k characters BEFORE the first BSS
//       UI declaration. Hoisting is what makes that work (§3, §13, §29).
//   D4  `bssInit();` is NOT a top-level call. It sits at brace depth 2 inside the
//       anonymous `async function` handler registered by
//       document.getElementById('launchBtn').addEventListener('click', …).
//       Option "B" of the brief is therefore not applicable as written (§13, §32).
//   D5  The BSS UI NEVER references `S`. All state access goes through the
//       service's bssState(). `S` is not in its free-global set (§10, §21).
//   D6  The BSS UI reads FIVE state fields and writes exactly ONE. It never
//       reads `coverage`, `coverageError`, `lastCoverageAt`,
//       `coverageEndpointAbsent`, any `fetching*`, any `*Promise`, `timerId`,
//       `lastStatusAt` or `lastSnapshotAt` — the coverage payload is rendered by
//       the Swing screen, not by this panel (§10, §24).
//   D7  bssFmtAgeMs and bssFmtClock have a THIRD consumer beyond BDSP: the
//       inline DSB formatters dsbFmtAge / dsbFmtClock, both behind `typeof`
//       guards with their own fallbacks. The brief assumed BDSP was the only
//       external consumer (§16, §30).
//   D8  bssToggleCollapse has ZERO JavaScript callers. Its only entry point is
//       the static onclick in the panel header markup (§11, §18, §30).
//   D9  The service's bssRefresh still owns a DOM side effect (#bss-refresh
//       disable + 1500 ms re-enable). It is measured and pinned WHERE IT IS —
//       a future UI module must declare it stays in the service (§14).
//   D10 The service calls bssRender() with NO typeof guard, three times, always
//       inside a `finally`. bssRender in turn calls bdspRender WITH a guard,
//       last (§14, §15).
//   D11 escHtml escapes & < > " but NOT the single quote. Pinned as the current
//       tolerance, not fixed (§20).
//   D12 There is NO apexDebugBackendScannerSnapshot, no window exposure and no
//       global alias for any BSS name (§31).
//
// HOW IT MEASURES
//   • static  — the reconstructed application source is scanned with a
//               length-preserving comment/string/regex mask, a brace-matching
//               top-level span finder, a free-identifier analyser and a markup
//               scanner that looks at index.html OUTSIDE every <script> tag.
//   • dynamic — the 32 declarations are evaluated in a strict vm context whose
//               global is a Proxy that THROWS on any non-allowlisted identifier
//               (load-time purity), then again in a fully instrumented context
//               where every DOM access, storage access, timer, network entry
//               point and cross-module call is counted (bootstrap behaviour).
//   • write-guarded — S.scanData and the BSS snapshot are handed to the panel
//               behind deep write-recording Proxies, so a mutation is caught as
//               a recorded write, not inferred from a grep.
//   • mutation-proof — §33 re-runs this file's own guard predicates against
//               deliberately mutated COPIES of the source strings and asserts
//               each guard flips. No application file is ever written.
//
// Run: node tests/backend-scanner-snapshot-ui-boundary-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const APP = require('./lib/load-app-source');

const SRC = APP.loadAppJavaScriptSource();
const PARTS = APP.loadOrderedScriptSources();
const APP_JS_PARTS = PARTS.filter(function (p) { return p.isAppJs && p.code != null; });
const RAW_HTML = APP.loadIndexHtml();

const SERVICE_REL = './js/services/backend-scanner-snapshot-service.js';
const ADAPTER_REL = './js/adapters/backend-directional-adapter.js';
const PREVIEW_REL = './js/ui/backend-directional-preview.js';
const SERVICE_ABS = path.resolve(__dirname, '..', 'js', 'services', 'backend-scanner-snapshot-service.js');
const PREVIEW_ABS = path.resolve(__dirname, '..', 'js', 'ui', 'backend-directional-preview.js');
const ADAPTER_ABS = path.resolve(__dirname, '..', 'js', 'adapters', 'backend-directional-adapter.js');
const SERVICE_SRC = fs.readFileSync(SERVICE_ABS, 'utf8');
const PREVIEW_SRC = fs.readFileSync(PREVIEW_ABS, 'utf8');
const ADAPTER_SRC = fs.readFileSync(ADAPTER_ABS, 'utf8');

// The module files a future relocation would create. None may exist yet.
const FUTURE_MODULES = [
  'js/ui/backend-scanner-snapshot-panel.js',
  'js/ui/backend-scanner-snapshot-ui.js',
  'js/ui/backend-scanner-snapshot-renderers.js',
  'js/utils/backend-scanner-snapshot-formatters.js',
  'js/state/backend-scanner-snapshot-state.js',
];

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
// Assertions that can only be made after a Promise settles are queued here and
// awaited before the summary, so an async section can never be silently skipped.
const PENDING = [];
function pending(p) { PENDING.push(p); return p; }

// ─────────────────────────────────────────────────────────────────────────────
// The audited surface — 32 inline declarations, in the physical order they
// appear. Categories are the audit's own taxonomy and are asserted in §4.
// ─────────────────────────────────────────────────────────────────────────────
const CAT_PRIMITIVE = [                    // pure value formatters, zero app deps
  'bssNum', 'bssInt', 'bssCount', 'bssCountStr', 'bssList', 'bssBoolYN',
  'bssFmtAgeMs', 'bssFmtClock',
];
const CAT_DERIVATION = ['bssScorePreviewOf', 'bssDeriveCandidateRows'];
const CAT_DIAGNOSTIC = [                   // pure shape readers → {label,cls,…}
  'bssSD', 'bssBucketInfo', 'bssParityInfo', 'bssTechComplete',
  'bssTechCompleteInfo', 'bssFmtRs', 'bssDirDiagInfo', 'bssDirBadge',
  'bssOperational', 'bssRankEligBadge',
];
const CAT_HTML = [                         // pure string builders (escHtml-safe)
  'bssBadge', 'bssKV', 'bssKVt', 'bssTopSymbolsHtml', 'bssCandidateTableHtml',
  'bssUniverseDiagHtml', 'bssBodyHtml',
];
const CAT_RENDER = ['bssRenderHeadBadges', 'bssRender'];
const CAT_COLLAPSE = ['bssApplyCollapse', 'bssToggleCollapse'];
const CAT_BOOTSTRAP = ['bssInit'];

// Physical order is NOT category order: the collapse pair sits between the two
// renderers. §3 asserts the real interleaving.
const BSS_UI_ALL = [
  'bssNum', 'bssInt', 'bssCount', 'bssCountStr', 'bssList', 'bssBoolYN',
  'bssFmtAgeMs', 'bssFmtClock',
  'bssScorePreviewOf', 'bssDeriveCandidateRows',
  'bssSD', 'bssBucketInfo', 'bssParityInfo', 'bssTechComplete',
  'bssTechCompleteInfo', 'bssFmtRs', 'bssDirDiagInfo', 'bssDirBadge',
  'bssOperational', 'bssRankEligBadge',
  'bssBadge', 'bssKV', 'bssKVt', 'bssTopSymbolsHtml', 'bssCandidateTableHtml',
  'bssUniverseDiagHtml', 'bssBodyHtml',
  'bssRenderHeadBadges',
  'bssApplyCollapse', 'bssToggleCollapse',
  'bssRender',
  'bssInit',
];

// The brief's initial manifest. §1 measures the delta rather than assuming it.
const BRIEF_MANIFEST_30 = [
  'bssNum', 'bssInt', 'bssCount', 'bssCountStr', 'bssList', 'bssBoolYN',
  'bssFmtAgeMs', 'bssFmtClock', 'bssScorePreviewOf', 'bssDeriveCandidateRows',
  'bssSD', 'bssBucketInfo', 'bssParityInfo', 'bssTechComplete',
  'bssTechCompleteInfo', 'bssFmtRs', 'bssDirDiagInfo', 'bssDirBadge',
  'bssOperational', 'bssRankEligBadge', 'bssBadge', 'bssKV', 'bssKVt',
  'bssTopSymbolsHtml', 'bssCandidateTableHtml', 'bssRender',
  'bssRenderHeadBadges', 'bssInit', 'bssApplyCollapse', 'bssToggleCollapse',
];

// The twelve declarations the extracted service already owns.
const BSS_SERVICE_ALL = [
  'ffBackendScannerSnapshot', 'bssState', 'bssParseStatus', 'bssParseSnapshot',
  'bssIsNoSnapshot', 'bssFreshness', 'bssFetchStatus', 'bssFetchSnapshot',
  'bssFetchCoverage', 'bssRefresh', 'bssStartPolling', 'bssStopPolling',
];

// Exact parameter lists, re-confirmed against the real source in §2.
const EXPECTED_SIGNATURES = {
  bssNum: ['v', 'digits'],
  bssInt: ['v'],
  bssCount: ['v'],
  bssCountStr: ['v'],
  bssList: ['v', 'max'],
  bssBoolYN: ['v'],
  bssFmtAgeMs: ['ms'],
  bssFmtClock: ['iso'],
  bssScorePreviewOf: ['cand'],
  bssDeriveCandidateRows: ['snap'],
  bssSD: ['cand'],
  bssBucketInfo: ['bucket'],
  bssParityInfo: ['parity'],
  bssTechComplete: ['tc'],
  bssTechCompleteInfo: ['tc'],
  bssFmtRs: ['v'],
  bssDirDiagInfo: ['cand'],
  bssDirBadge: ['dir'],
  bssOperational: ['v'],
  bssRankEligBadge: ['v'],
  bssBadge: ['label', 'cls'],
  bssKV: ['k', 'vHtml'],
  bssKVt: ['k', 'text'],
  bssTopSymbolsHtml: ['sd'],
  bssCandidateTableHtml: ['rows'],
  bssUniverseDiagHtml: ['status', 'snap'],
  bssBodyHtml: [],
  bssRenderHeadBadges: [],
  bssApplyCollapse: [],
  bssToggleCollapse: [],
  bssRender: [],
  bssInit: [],
};

// S.backendScanner shape, created lazily by the SERVICE's bssState().
const STATE_FIELDS = [
  'status', 'snapshot', 'coverage',
  'statusError', 'snapshotError', 'coverageError',
  'lastStatusAt', 'lastSnapshotAt', 'lastCoverageAt',
  'fetchingStatus', 'fetchingSnapshot', 'fetchingCoverage',
  'statusPromise', 'snapshotPromise', 'coveragePromise',
  'coverageEndpointAbsent', 'timerId', 'collapsed',
];
const UI_STATE_READS = ['collapsed', 'snapshot', 'snapshotError', 'status', 'statusError'];
const UI_STATE_WRITES = ['collapsed'];

// DOM identifiers, split by owner.
const DOM_IDS_UI = ['bss-panel', 'bss-body', 'bss-head-badges'];
const DOM_ID_SERVICE = 'bss-refresh';
const DOM_IDS_MARKUP_ONLY = ['bss-head', 'bss-chev'];
const DOM_IDS_ALL = ['bss-panel', 'bss-head', 'bss-chev', 'bss-head-badges', 'bss-refresh', 'bss-body'];

const COLLAPSE_STORAGE_KEY = 'apex_bss_collapsed';
const FEATURE_FLAG_STORAGE_KEY = 'apex_ff_backend_scanner_snapshot';

// The three formatters other subsystems consume.
const SHARED_HELPERS = ['bssNum', 'bssFmtAgeMs', 'bssFmtClock'];

// ── Source helpers ───────────────────────────────────────────────────────────
// LENGTH-PRESERVING mask: the bodies of comments, strings, template literals and
// regular-expression literals become spaces (newlines kept, delimiters kept), so
// every offset in the masked source is the SAME offset in SRC. That is what lets
// caller attribution, span containment and region scans mix masked scanning with
// raw slicing without drifting by a single character.
//
// Regex-literal awareness matters: escHtml contains `.replace(/"/g, …)`, and a
// scanner that mistakes that `"` for a string delimiter mis-brace-matches the
// rest of the file. §0 asserts that every span this file relies on closed.
function stripCommentsAndStrings(s) {
  const out = s.split('');
  let inStr = null, esc = false, inLine = false, inBlock = false, inRe = false, inClass = false;
  let prevSig = '';
  const RE_START_AFTER = /[=(,:[!&|?{};+\-*%~^<>]/;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (inLine) { if (c === '\n') inLine = false; else out[i] = ' '; continue; }
    if (inBlock) {
      if (c === '*' && n === '/') { out[i] = ' '; out[i + 1] = ' '; i++; inBlock = false; }
      else if (c !== '\n') out[i] = ' ';
      continue;
    }
    if (inStr) {
      if (esc) { esc = false; if (c !== '\n') out[i] = ' '; continue; }
      if (c === '\\') { esc = true; out[i] = ' '; continue; }
      if (c === inStr) { inStr = null; prevSig = c; continue; }
      if (c !== '\n') out[i] = ' ';
      continue;
    }
    if (inRe) {
      if (esc) { esc = false; out[i] = ' '; continue; }
      if (c === '\\') { esc = true; out[i] = ' '; continue; }
      if (c === '[') { inClass = true; out[i] = ' '; continue; }
      if (c === ']') { inClass = false; out[i] = ' '; continue; }
      if (c === '/' && !inClass) { inRe = false; prevSig = c; continue; }
      if (c !== '\n') out[i] = ' ';
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; out[i] = ' '; continue; }
    if (c === '/' && n === '*') { inBlock = true; out[i] = ' '; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; prevSig = c; continue; }
    if (c === '/' && RE_START_AFTER.test(prevSig)) { inRe = true; inClass = false; prevSig = c; continue; }
    if (!/\s/.test(c)) prevSig = c;
  }
  return out.join('');
}

const MASKED = stripCommentsAndStrings(SRC);

// Every top-level `function NAME(...)` span (column 0), brace matched on the
// masked source. Offsets are valid in SRC as well.
function topLevelSpans(masked) {
  const spans = [];
  const re = /(^|\n)(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m;
  while ((m = re.exec(masked))) {
    const start = m.index + (m[1] ? m[1].length : 0);
    const i = masked.indexOf('{', start);
    let depth = 0, end = -1;
    for (let j = i; j >= 0 && j < masked.length; j++) {
      const c = masked[j];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
    }
    spans.push({ name: m[2], start: start, end: end });
  }
  return spans;
}

const SPANS = topLevelSpans(MASKED);
const SPANS_BY_NAME = new Map();
SPANS.forEach(function (s) {
  if (!SPANS_BY_NAME.has(s.name)) SPANS_BY_NAME.set(s.name, []);
  SPANS_BY_NAME.get(s.name).push(s);
});
function spansOf(name) { return SPANS_BY_NAME.get(name) || []; }
function declStart(name) { const a = spansOf(name); return a.length ? a[0].start : -1; }
function declEnd(name) { const a = spansOf(name); return a.length ? a[0].end : -1; }
function bodyOf(name) { const a = spansOf(name); return a.length && a[0].end > a[0].start ? SRC.slice(a[0].start, a[0].end) : null; }
function codeOf(name) { const a = spansOf(name); return a.length && a[0].end > a[0].start ? MASKED.slice(a[0].start, a[0].end) : ''; }

// Innermost top-level span containing an index, or null for script scope.
function enclosingFn(index) {
  let best = null;
  for (const s of SPANS) {
    if (s.end > s.start && s.start <= index && index < s.end) { if (!best || s.start > best.start) best = s; }
  }
  return best;
}

// Every reference to `name` outside its own declaration, attributed to the
// top-level function that contains it ('(script-scope)' when there is none).
// Scanning happens on the MASKED source, so an onclick="bssRefresh()" baked into
// markup or into a generated HTML string is NOT counted as a JavaScript caller —
// §18 audits those separately — while offsets stay valid for span containment.
function callersOf(name) {
  const re = new RegExp('\\b' + name + '\\b', 'g');
  const found = new Map();
  let m;
  while ((m = re.exec(MASKED))) {
    const enc = enclosingFn(m.index);
    const who = enc ? enc.name : '(script-scope)';
    if (who === name) continue;
    found.set(who, (found.get(who) || 0) + 1);
  }
  return found;
}
function callerNames(name) { return Array.from(callersOf(name).keys()).sort(); }

function paramsOf(name) {
  const b = bodyOf(name);
  if (b == null) return null;
  const m = /^(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(([^)]*)\)/.exec(b);
  if (!m) return null;
  return m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

// Which <script> part an absolute offset belongs to.
const PART_RANGES = [];
(function () {
  let off = 0;
  APP_JS_PARTS.forEach(function (p) {
    PART_RANGES.push({ src: p.src || '(inline)', kind: p.kind, start: off, end: off + p.code.length });
    off += p.code.length + 1;
  });
})();
function partOf(index) {
  const r = PART_RANGES.find(function (r) { return index >= r.start && index < r.end; });
  return r ? r.src : null;
}
function partIndexOf(index) {
  return PART_RANGES.findIndex(function (r) { return index >= r.start && index < r.end; });
}
const INLINE_RANGE = PART_RANGES[PART_RANGES.length - 1];

function defCountIn(source, name) {
  return (String(source).match(new RegExp('(?:^|\\n)(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g')) || []).length;
}

// index.html with every <script>…</script> body removed: the static markup.
const MARKUP = (function () {
  const openRe = /<script\b[^>]*>/gi;
  const parts = [];
  let m, cur = 0;
  while ((m = openRe.exec(RAW_HTML)) !== null) {
    const contentStart = openRe.lastIndex;
    const closeIdx = RAW_HTML.indexOf('</script>', contentStart);
    if (closeIdx < 0) break;
    parts.push(RAW_HTML.slice(cur, m.index));
    cur = closeIdx + '</script>'.length;
    openRe.lastIndex = cur;
  }
  parts.push(RAW_HTML.slice(cur));
  return parts.join('\n');
})();

// Everything inside <style>…</style>: the CSS the panel depends on.
const CSS = (function () {
  return (RAW_HTML.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
})();

// The contiguous BSS UI text: first declaration → end of the last declaration.
const REGION_START = declStart('bssNum');
const REGION_END = declEnd('bssInit');
const REGION = SRC.slice(REGION_START, REGION_END);
const REGION_CODE = MASKED.slice(REGION_START, REGION_END);
const NEXT_AFTER_REGION = SPANS.filter(function (s) { return s.start >= REGION_END; })
  .sort(function (a, b) { return a.start - b.start; })[0];
const PREV_BEFORE_REGION = SPANS.filter(function (s) { return s.end <= REGION_START; })
  .sort(function (a, b) { return b.end - a.end; })[0];

// The single `bssInit();` call site (the declaration header is excluded), and
// the brace depth it sits at inside the inline script. Depth > 0 proves it is
// not a relocatable top-level statement.
function enclosingSpanOf(index) { return enclosingFn(index); }
function depthAt(index) {
  let depth = 0;
  for (let i = INLINE_RANGE.start; i < index; i++) {
    const c = MASKED[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  return depth;
}
function callSitesOf(name) {
  const re = new RegExp('\\b' + name + '\\s*\\(\\s*\\)', 'g');
  const out = [];
  let m;
  while ((m = re.exec(MASKED))) {
    // Skip the declaration header itself.
    const before = MASKED.slice(Math.max(0, m.index - 12), m.index);
    if (/function\s+$/.test(before)) continue;
    out.push(m.index);
  }
  return out;
}
const BSS_INIT_CALLS = callSitesOf('bssInit');
const BDSP_INIT_CALLS = callSitesOf('bdspInit');

// The verbatim source text of a top-level declaration, taken from the SAME
// reconstructed application source the loader produced. load-app-source's own
// extractFunctionSource is used wherever it agrees; it is not regex-literal
// aware, so escHtml (which contains `.replace(/"/g, …)`) is taken from the
// regex-aware brace matcher above instead. §0 asserts the two agree everywhere
// they both succeed, so this is a fallback, not a second source of truth.
function realSourceOf(name) {
  const mine = bodyOf(name);
  if (mine == null) throw new Error('boundary-contract: no span for ' + name);
  return mine;
}
function loaderSourceOrNull(name) {
  try { return APP.extractFunctionSource(name, { source: SRC }); } catch (e) { return null; }
}

// ── Free-global analyser ─────────────────────────────────────────────────────
// The complete list of identifiers a chunk of code resolves from OUTSIDE itself.
// Locals (parameters, var declarators including comma lists, catch bindings) and
// object-literal keys are excluded, so the result is exactly what a future module
// would have to find on the global/script scope at CALL time.
const JS_KEYWORDS = new Set(['var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'new', 'typeof', 'instanceof', 'in', 'of', 'this', 'null', 'true',
  'false', 'void', 'delete', 'throw', 'try', 'catch', 'finally', 'default', 'yield', 'await', 'async',
  'class', 'extends', 'super', 'undefined']);
function freeGlobals(code, declared) {
  const found = new Set();
  const locals = new Set();
  let m;
  const fnRe = /function\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g;
  while ((m = fnRe.exec(code))) {
    m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (p) { locals.add(p); });
  }
  // var/let/const declarator lists, comma-aware and bracket-depth aware.
  const declRe = /\b(?:var|let|const)\s+/g;
  while ((m = declRe.exec(code))) {
    let i = m.index + m[0].length, depth = 0, cur = '';
    for (; i < code.length; i++) {
      const c = code[i];
      if (c === '(' || c === '[' || c === '{') { depth++; }
      else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
      else if (c === ';' && depth === 0) break;
      else if (c === ',' && depth === 0) {
        const g = /^\s*([A-Za-z_$][\w$]*)/.exec(cur);
        if (g) locals.add(g[1]);
        cur = '';
        continue;
      }
      cur += c;
    }
    const g = /^\s*([A-Za-z_$][\w$]*)/.exec(cur);
    if (g) locals.add(g[1]);
  }
  const catchRe = /catch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((m = catchRe.exec(code))) locals.add(m[1]);
  const re = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
  while ((m = re.exec(code))) {
    if (m[1] === '.') continue;
    const n = m[2];
    if (JS_KEYWORDS.has(n) || locals.has(n) || (declared && declared.has(n))) continue;
    // Object-literal keys (`{ label: b, cls: 'x' }`) are property names, not
    // global reads. A key is an identifier followed by ':' whose preceding
    // significant character opens or continues a literal.
    const after = code.slice(re.lastIndex, re.lastIndex + 4);
    if (/^\s*:/.test(after) && /[{,]\s*$/.test(code.slice(Math.max(0, m.index - 60), m.index))) continue;
    found.add(n);
  }
  return Array.from(found).sort();
}

// ── Strict proxy sandbox: any identifier outside the allowlist throws ─────────
const ALLOWED_INTRINSICS = {
  Array: Array, Object: Object, String: String, Number: Number, Boolean: Boolean,
  Math: Math, isFinite: isFinite, JSON: JSON, Infinity: Infinity,
};
function makeStrictSandbox(extra) {
  const store = Object.create(null);
  Object.keys(ALLOWED_INTRINSICS).forEach(function (k) { store[k] = ALLOWED_INTRINSICS[k]; });
  Object.keys(extra || {}).forEach(function (k) { store[k] = extra[k]; });
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
  return { context: vm.createContext(proxy), touched: touched, store: store };
}

// Deep write-guard: reads are transparent and identity-stable; ANY write, define
// or delete anywhere in the tree is recorded instead of applied.
function makeWriteGuard() {
  const writes = [];
  const cache = new WeakMap();
  function guard(value, p) {
    if (value === null || typeof value !== 'object') return value;
    if (cache.has(value)) return cache.get(value);
    const proxy = new Proxy(value, {
      get: function (t, prop, recv) {
        const v = Reflect.get(t, prop, recv);
        if (typeof v === 'function' || typeof prop === 'symbol') return v;
        return guard(v, p + '.' + String(prop));
      },
      set: function (t, prop) { writes.push(p + '.' + String(prop) + ' (set)'); return true; },
      defineProperty: function (t, prop) { writes.push(p + '.' + String(prop) + ' (define)'); return true; },
      deleteProperty: function (t, prop) { writes.push(p + '.' + String(prop) + ' (delete)'); return true; },
    });
    cache.set(value, proxy);
    return proxy;
  }
  return { guard: guard, writes: writes };
}

// ── Fixtures ─────────────────────────────────────────────────────────────────
function candidate(over) {
  return Object.assign({
    symbol: 'AAPL', price: 187.5,
    direction: null, score: null,
    scoreDiagnostics: { usable: true, rankEligible: true, scorePreview: 91, scoreBucket: 'A' },
    directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.82 },
    cache: { source: 'BACKEND_DXLINK_CANDLE_CACHE', candleCount: 320, reason: null },
    technicalCoverage: { completeCoreTechnicals: true },
    directionParity: { comparable: true, matches: true },
    relativeStrengthVsSpy: 1.42,
    rsi14: 58,
  }, over || {});
}
function snapshot(over) {
  return Object.assign({
    ok: true, stale: false, ageMs: 4200,
    updatedAt: '2026-07-27T12:00:00.000Z',
    nextScheduledRunAt: '2026-07-27T12:05:00.000Z',
    marketSession: 'REGULAR',
    universe: ['AAPL', 'MSFT'],
    diagnostics: {
      warmup: { enabled: true, symbolsWarmed: 2, symbolsStillCold: [], warmAttempts: 1, reason: null },
      cache: { symbolsWithCandles: 2, symbolsWithoutCandles: 0, coldSymbols: [], staleSymbols: [] },
      technicalCoverage: { candidatesWithCompleteCoreTechnicals: 1, candidatesTotal: 1 },
      directionParity: { candidatesComparable: 1, matches: 1, mismatches: 0, matchRate: 1 },
      scoreDiagnostics: { candidatesUsable: 1, rankEligibleCount: 1, averageScorePreview: 91, maxScorePreview: 91, topSymbols: [{ symbol: 'AAPL', scorePreview: 91, scoreBucket: 'A' }] },
    },
    candidates: [candidate()],
  }, over || {});
}
function status(over) {
  return Object.assign({
    ok: true, schedulerEnabled: true, schedulerRunning: true, timerActive: true, running: false,
    universeCount: 2, universeSource: 'backend_default',
    lastSnapshotUpdatedAt: '2026-07-27T12:00:00.000Z',
    nextScheduledRunAt: '2026-07-27T12:05:00.000Z',
    lastScheduledRunAt: '2026-07-27T11:55:00.000Z',
    runCount: 12, errorCount: 0, lastDurationMs: 1800,
  }, over || {});
}

// The five characters the audit brief requires probing, in one payload.
const XSS = '<img src=x onerror="alert(1)">&\'"';

// ─────────────────────────────────────────────────────────────────────────────
// Instrumented panel sandbox.
//
// The five service/monolith dependencies the panel actually resolves are the
// REAL sources (extracted through load-app-source), so the measurement is of the
// shipped code and not of a stub. Everything else is counted. Network, timers
// and subscription entry points are present but THROW, so a regression is a hard
// failure rather than a silently satisfied stub.
// ─────────────────────────────────────────────────────────────────────────────
const REAL_DEPS_FROM_SERVICE = ['ffBackendScannerSnapshot', 'bssState', 'bssFreshness', 'bssIsNoSnapshot'];
const REAL_DEPS_FROM_MONOLITH = ['escHtml'];

function makeBox(opts) {
  const o = opts || {};
  const log = {
    domGet: [], domWrites: [], storageReads: [], storageWrites: [],
    service: [], bdsp: [], network: [], timers: [], universe: [],
  };
  const elements = Object.create(null);
  const present = o.presentIds || DOM_IDS_ALL;
  function makeEl(id) {
    const style = new Proxy({}, {
      set: function (t, p, v) { log.domWrites.push('#' + id + '.style.' + String(p) + '=' + String(v)); t[p] = v; return true; },
      get: function (t, p) { return t[p]; },
    });
    const classes = new Set();
    return {
      id: id,
      style: style,
      _html: '',
      _scrollTop: 0,
      get innerHTML() { return this._html; },
      set innerHTML(v) { log.domWrites.push('#' + id + '.innerHTML'); this._html = String(v); },
      get textContent() { return this._text || ''; },
      set textContent(v) { log.domWrites.push('#' + id + '.textContent'); this._text = String(v); },
      get disabled() { return this._disabled === true; },
      set disabled(v) { log.domWrites.push('#' + id + '.disabled=' + String(v)); this._disabled = v; },
      get scrollTop() { return this._scrollTop; },
      set scrollTop(v) { log.domWrites.push('#' + id + '.scrollTop'); this._scrollTop = v; },
      classList: {
        toggle: function (c, on) { log.domWrites.push('#' + id + '.classList.toggle(' + c + ',' + on + ')'); if (on) classes.add(c); else classes.delete(c); },
        contains: function (c) { return classes.has(c); },
        add: function (c) { log.domWrites.push('#' + id + '.classList.add(' + c + ')'); classes.add(c); },
        remove: function (c) { log.domWrites.push('#' + id + '.classList.remove(' + c + ')'); classes.delete(c); },
      },
    };
  }
  const document = {
    getElementById: function (id) {
      log.domGet.push(id);
      if (present.indexOf(id) < 0) return null;
      if (!elements[id]) elements[id] = makeEl(id);
      return elements[id];
    },
  };

  const store = new Map(Object.entries(o.storage || {}));
  const localStorage = {
    getItem: function (k) { log.storageReads.push(k); if (o.storageThrows) throw new Error('SecurityError'); return store.has(k) ? store.get(k) : null; },
    setItem: function (k, v) { log.storageWrites.push(k + '=' + v); if (o.storageThrows) throw new Error('SecurityError'); store.set(k, String(v)); },
    removeItem: function (k) { log.storageWrites.push(k + '=(removed)'); store.delete(k); },
  };

  const S = o.S || { scanData: [{ ticker: 'FRONTEND', score: 1 }] };
  if (o.backendScanner !== undefined) S.backendScanner = o.backendScanner;

  function blocked(name) { return function () { log.network.push(name); throw new Error('BLOCKED_' + name); }; }

  const box = makeStrictSandbox({
    Date: Date, Intl: Intl, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat,
    RegExp: RegExp, Error: Error, console: console, Promise: Promise,
    S: S,
    document: document,
    localStorage: localStorage,
    window: {},
    WL: o.WL !== undefined ? o.WL : ['AAPL', 'MSFT'],
    rsbGetBackendSource: o.rsbGetBackendSource !== undefined ? o.rsbGetBackendSource
      : function () { log.universe.push('rsbGetBackendSource'); return { available: true, universe: 2, rows: [{}], skipped: [] }; },
    dsbGetBackendSource: o.dsbGetBackendSource !== undefined ? o.dsbGetBackendSource
      : function () { log.universe.push('dsbGetBackendSource'); return { available: true, rows: [{}], skipped: [] }; },
    bdspRender: o.bdspRender !== undefined ? o.bdspRender : function () { log.bdsp.push('bdspRender'); },
    bssStartPolling: o.bssStartPolling !== undefined ? o.bssStartPolling : function () { log.service.push('bssStartPolling'); },
    bssStopPolling: function () { log.service.push('bssStopPolling'); },
    bssRefresh: function () { log.service.push('bssRefresh'); },
    bssFetchStatus: function () { log.service.push('bssFetchStatus'); },
    bssFetchSnapshot: function () { log.service.push('bssFetchSnapshot'); },
    bssFetchCoverage: function () { log.service.push('bssFetchCoverage'); },
    renderScanResults: function () { log.service.push('renderScanResults'); },
    fetch: blocked('fetch'), XMLHttpRequest: blocked('XMLHttpRequest'),
    WebSocket: blocked('WebSocket'), EventSource: blocked('EventSource'),
    ttCall: blocked('ttCall'), _backendAuthHeaders: blocked('_backendAuthHeaders'),
    subscribeDxlinkQuotes: blocked('subscribeDxlinkQuotes'),
    navigator: { sendBeacon: blocked('sendBeacon') },
    setTimeout: function () { log.timers.push('setTimeout'); throw new Error('BLOCKED_setTimeout'); },
    setInterval: function () { log.timers.push('setInterval'); throw new Error('BLOCKED_setInterval'); },
    clearInterval: function () { log.timers.push('clearInterval'); },
    requestAnimationFrame: function () { log.timers.push('requestAnimationFrame'); throw new Error('BLOCKED_rAF'); },
    queueMicrotask: function () { log.timers.push('queueMicrotask'); throw new Error('BLOCKED_qmt'); },
  });

  // Real service + monolith dependencies, wrapped so their use is counted.
  REAL_DEPS_FROM_SERVICE.concat(REAL_DEPS_FROM_MONOLITH).forEach(function (n) {
    vm.runInContext(realSourceOf(n), box.context);
  });
  REAL_DEPS_FROM_SERVICE.forEach(function (n) {
    const real = vm.runInContext(n, box.context);
    box.store[n] = function () { log.service.push(n); return real.apply(null, arguments); };
  });

  // The 32 BSS UI declarations, verbatim from the real source.
  BSS_UI_ALL.forEach(function (n) { vm.runInContext(realSourceOf(n), box.context); });

  const api = {};
  BSS_UI_ALL.forEach(function (n) { api[n] = vm.runInContext(n, box.context); });
  return { api: api, log: log, S: S, store: store, elements: elements, box: box, document: document };
}

// ─────────────────────────────────────────────────────────────────────────────
// Instrumented SERVICE sandbox — used only to measure the service → UI bridge.
// The three GET readers and the polling lifecycle are the REAL service source;
// bssRender is a counter (or absent / throwing, per option).
// ─────────────────────────────────────────────────────────────────────────────
const SERVICE_FNS = ['ffBackendScannerSnapshot', 'bssState', 'bssParseStatus', 'bssParseSnapshot',
  'bssIsNoSnapshot', 'bssFreshness', 'bssFetchStatus', 'bssFetchSnapshot', 'bssFetchCoverage',
  'bssRefresh', 'bssStartPolling', 'bssStopPolling'];

function makeServiceBox(opts) {
  const o = opts || {};
  const log = { render: 0, fetches: [], timers: [], domGet: [], domWrites: [], warns: [] };
  const elements = Object.create(null);
  const present = o.presentIds !== undefined ? o.presentIds : [DOM_ID_SERVICE];
  function makeEl(id) {
    return {
      id: id, _disabled: false,
      get disabled() { return this._disabled; },
      set disabled(v) { log.domWrites.push('#' + id + '.disabled=' + String(v)); this._disabled = v; },
    };
  }
  const document = {
    getElementById: function (id) {
      log.domGet.push(id);
      if (present.indexOf(id) < 0) return null;
      if (!elements[id]) elements[id] = makeEl(id);
      return elements[id];
    },
  };
  const S = o.S || {};
  const extra = {
    Date: Date, console: { warn: function (m) { log.warns.push(String(m)); }, log: function () {}, error: function () {} },
    Promise: Promise, Error: Error, RegExp: RegExp, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat,
    S: S, document: document,
    localStorage: { getItem: function () { return null; }, setItem: function () {} },
    BACKEND: 'https://backend.test',
    _backendAuthHeaders: function () { return {}; },
    _swingIsAbortError: function (m) { return /abort|timed out/i.test(String(m)); },
    _activeView: 'dashboard',
    AbortSignal: { timeout: function (ms) { return { _ms: ms }; } },
    fetch: o.fetch || function (url) {
      log.fetches.push(String(url));
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(o.payload || { ok: true }); } });
    },
    setTimeout: function (fn, ms) { log.timers.push('setTimeout:' + ms); return 't' + log.timers.length; },
    setInterval: function (fn, ms) { log.timers.push('setInterval:' + ms); return 'i' + log.timers.length; },
    clearInterval: function (id) { log.timers.push('clearInterval:' + String(id)); },
  };
  if (o.bssRender !== null) {
    extra.bssRender = o.bssRender || function () { log.render++; };
  }
  const box = makeStrictSandbox(extra);
  SERVICE_FNS.forEach(function (n) { vm.runInContext(realSourceOf(n), box.context); });
  const api = {};
  SERVICE_FNS.forEach(function (n) { api[n] = vm.runInContext(n, box.context); });
  return { api: api, log: log, S: S, elements: elements, box: box };
}

console.log('Backend Scanner Snapshot UI — extraction boundary contract');
console.log('application source: ' + SRC.length + ' chars from ' + APP_JS_PARTS.length + ' script(s)');
console.log('BSS UI region: offsets ' + REGION_START + '–' + REGION_END +
            ' (' + REGION.length + ' chars) inside ' + partOf(REGION_START));

// ─────────────────────────────────────────────────────────────────────────────
// 0. MEASUREMENT SANITY
//    Every later section slices SRC with offsets computed on MASKED. If the mask
//    ever stopped being length-preserving, or a brace match silently failed, the
//    contract would keep "passing" while measuring the wrong text. Gate it.
// ─────────────────────────────────────────────────────────────────────────────
section('0. measurement sanity');

eq(MASKED.length, SRC.length, 'the mask is length-preserving — masked offsets are valid in the raw source');
(function () {
  const RELIED_ON = BSS_UI_ALL.concat(BSS_SERVICE_ALL,
    ['escHtml', 'bdspRender', 'bdspInit', 'bdspRefresh', 'bdspFmtNum', 'bdspFmtAge', 'bdspFmtClock',
     'dsbFmtAge', 'dsbFmtClock', 'dsbGetBackendSource', 'rsbGetBackendSource', 'showView',
     'renderScanResults', '_swingHydrateFromBackend', '_apexPostAuthInit']);
  const broken = RELIED_ON.filter(function (n) { const a = spansOf(n)[0]; return !a || a.end <= a.start; });
  deepEq(broken, [], 'every declaration this contract measures was brace-matched successfully');
  RELIED_ON.forEach(function (n) {
    const raw = bodyOf(n);
    ok(raw != null && raw.indexOf('function ' + n) >= 0 && raw.charAt(raw.length - 1) === '}',
       n + ' span starts at its header and ends on its closing brace');
  });
  // escHtml is the canary: it contains `.replace(/"/g, …)`, which a scanner
  // without regex-literal awareness mis-reads as an unterminated string.
  const esc = bodyOf('escHtml');
  ok(esc.length < 400 && /replace\(\/"\/g/.test(esc),
     'escHtml is bounded correctly despite its regex literal containing a double quote');
})();
eq(REGION_START > 0 && REGION_END > REGION_START, true, 'the BSS UI region resolved to a real span');
eq(MASKED.slice(REGION_START, REGION_START + 17), 'function bssNum(v', 'masked and raw offsets agree at the region start');
eq(partOf(REGION_START), '(inline)', 'the BSS UI region is still inside the inline monolith');
eq(partOf(REGION_END - 1), '(inline)', 'the BSS UI region ends inside the inline monolith');

// The five future module paths must not exist yet: this PR audits, it does not
// relocate.
FUTURE_MODULES.forEach(function (rel) {
  ok(!fs.existsSync(path.resolve(__dirname, '..', rel)), rel + ' does not exist yet (this PR is audit-only)');
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. FUNCTION MANIFEST
// ─────────────────────────────────────────────────────────────────────────────
section('1. function manifest');

eq(BSS_UI_ALL.length, 32, 'the audited BSS UI surface is 32 names, not the 30 of the brief');
eq(new Set(BSS_UI_ALL).size, 32, 'no name is listed twice in the manifest');

BSS_UI_ALL.forEach(function (n) {
  eq(spansOf(n).length, 1, n + ' is declared exactly once as a top-level function declaration');
  eq(partOf(declStart(n)), '(inline)', n + ' is still declared inline in index.html');
});

// Every bss* declaration in the whole application is either UI or service —
// nothing is unaccounted for, and the two sets do not overlap.
const ALL_BSS_DECLS = SPANS
  .filter(function (s) { return /^bss/.test(s.name) || s.name === 'ffBackendScannerSnapshot'; })
  .map(function (s) { return s.name; });
eq(ALL_BSS_DECLS.length, 44, 'the application declares 44 bss*/ff* functions in total (32 UI + 12 service)');
deepEq(ALL_BSS_DECLS.slice().sort(),
       BSS_UI_ALL.concat(BSS_SERVICE_ALL).slice().sort(),
       'every bss* declaration in the app is either in the UI manifest or in the service manifest');
deepEq(BSS_UI_ALL.filter(function (n) { return BSS_SERVICE_ALL.indexOf(n) >= 0; }), [],
       'the UI manifest and the service manifest are disjoint');

// The delta against the brief's initial 30-name manifest, measured not assumed.
(function () {
  const extra = BSS_UI_ALL.filter(function (n) { return BRIEF_MANIFEST_30.indexOf(n) < 0; });
  const missing = BRIEF_MANIFEST_30.filter(function (n) { return BSS_UI_ALL.indexOf(n) < 0; });
  deepEq(extra, ['bssUniverseDiagHtml', 'bssBodyHtml'],
         'D1 — the brief missed exactly two declarations: bssUniverseDiagHtml and bssBodyHtml');
  deepEq(missing, [], 'every name the brief listed really exists (no phantom candidate)');
  eq(BRIEF_MANIFEST_30.length + extra.length, 32, '30 briefed + 2 discovered = the 32 real declarations');
})();

// The service manifest is exactly the 12 already-extracted names, and all 12
// live in the module file — not inline.
BSS_SERVICE_ALL.forEach(function (n) {
  eq(partOf(declStart(n)), SERVICE_REL, n + ' is owned by the extracted service module');
  eq(defCountIn(SERVICE_SRC, n), 1, n + ' is declared exactly once in the service file');
});
BSS_UI_ALL.forEach(function (n) {
  eq(defCountIn(SERVICE_SRC, n), 0, n + ' is NOT declared in the service module');
  eq(defCountIn(PREVIEW_SRC, n), 0, n + ' is NOT declared in the BDSP module');
  eq(defCountIn(ADAPTER_SRC, n), 0, n + ' is NOT declared in the BDS adapter module');
});

// Nothing in the manifest is a var/const/arrow/method: a future module must move
// declarations, not expressions.
ok(!/\b(?:var|let|const)\s+bss[A-Za-z0-9_$]*\s*=/.test(MASKED),
   'no bss* function is assigned to a var/let/const binding (all are hoistable declarations)');
ok(!/\bbss[A-Za-z0-9_$]*\s*=\s*(?:function|\()/.test(MASKED.replace(/function\s+bss[A-Za-z0-9_$]*\s*\(/g, '')),
   'no bss* function is defined as a function expression or arrow');

// The 32 are physically contiguous: nothing unrelated is interleaved.
const CONTIGUOUS = SPANS.filter(function (s) { return s.start >= REGION_START && s.start < REGION_END; });
eq(CONTIGUOUS.length, 32, 'exactly 32 top-level declarations live inside the BSS UI region (no interleaved foreign function)');
deepEq(CONTIGUOUS.map(function (s) { return s.name; }), BSS_UI_ALL,
       'the 32 declarations inside the region are exactly the manifest, in manifest order');
eq(NEXT_AFTER_REGION.name, 'showView', 'the first declaration after the region is showView — the region is closed');
ok(!/^bss/.test(NEXT_AFTER_REGION.name), 'no bss* declaration follows the region');
ok(!/^bss/.test(PREV_BEFORE_REGION.name), 'no bss* declaration immediately precedes the region');

// The region contains ZERO top-level statements — only the 32 declarations and
// their comments. That is what makes Option A a pure relocation.
(function () {
  let cursor = REGION_START;
  const gaps = [];
  CONTIGUOUS.forEach(function (s) {
    const gap = MASKED.slice(cursor, s.start);
    if (gap.trim() !== '') gaps.push(JSON.stringify(gap.trim().slice(0, 80)));
    cursor = s.end;
  });
  const tail = MASKED.slice(cursor, REGION_END);
  if (tail.trim() !== '') gaps.push(JSON.stringify(tail.trim().slice(0, 80)));
  deepEq(gaps, [], 'the region contains no code between/after the declarations — zero top-level statements');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIGNATURES
// ─────────────────────────────────────────────────────────────────────────────
section('2. signatures');

BSS_UI_ALL.forEach(function (n) {
  deepEq(paramsOf(n), EXPECTED_SIGNATURES[n], n + ' signature unchanged');
});
BSS_UI_ALL.forEach(function (n) {
  ok(!/^async\s/.test(bodyOf(n)), n + ' is synchronous (no async signature to preserve across a module boundary)');
});
ok(!/\.\.\./.test(BSS_UI_ALL.map(function (n) { return (paramsOf(n) || []).join(','); }).join('|')),
   'no BSS UI function uses rest parameters or destructuring in its signature');
ok(!/=/.test(BSS_UI_ALL.map(function (n) { return (paramsOf(n) || []).join(','); }).join('|')),
   'no BSS UI function uses default parameter values');

// Runtime arity matches the source signature — a future module cannot silently
// change a call convention.
(function () {
  const b = makeBox();
  BSS_UI_ALL.forEach(function (n) {
    eq(b.api[n].length, EXPECTED_SIGNATURES[n].length, n + ' runtime arity matches its declared parameter count');
  });
  // The three service readers the panel never calls are absent from its own API.
  ['bssFetchStatus', 'bssFetchSnapshot', 'bssFetchCoverage'].forEach(function (n) {
    ok(BSS_UI_ALL.indexOf(n) < 0, n + ' is not part of the UI surface');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 3. PHYSICAL ORDER
// ─────────────────────────────────────────────────────────────────────────────
section('3. physical order');

const ORDER = BSS_UI_ALL.map(function (n) { return declStart(n); });
ok(ORDER.every(function (v, i) { return i === 0 || v > ORDER[i - 1]; }),
   'the 32 declarations appear in strictly increasing source order, exactly as listed');

// D2 — the brief's assumed tail order is wrong. The real tail is measured.
deepEq(BSS_UI_ALL.slice(27),
       ['bssRenderHeadBadges', 'bssApplyCollapse', 'bssToggleCollapse', 'bssRender', 'bssInit'],
       'D2 — the real tail order is headBadges → applyCollapse → toggleCollapse → render → init');
ok(declStart('bssRenderHeadBadges') < declStart('bssRender'),
   'D2 — bssRenderHeadBadges is declared BEFORE bssRender (the brief assumed the reverse)');
ok(declStart('bssApplyCollapse') < declStart('bssInit'),
   'D2 — the collapse pair is declared BEFORE bssInit (the brief assumed the reverse)');

// The overall load order, reconstructed from the real <script> tags.
const SCRIPT_ORDER = PART_RANGES.map(function (r) { return r.src; });
(function () {
  const idx = function (rel) { return SCRIPT_ORDER.indexOf(rel); };
  ok(idx('./js/api/backend-client.js') >= 0, 'backend-client.js is part of the application load order');
  ok(idx('./js/config/backend-config.js') > idx('./js/api/backend-client.js'),
     'backend-config.js loads after backend-client.js');
  ok(idx(SERVICE_REL) > idx('./js/config/backend-config.js'),
     'the BSS service loads after backend-client + backend-config');
  ok(idx(ADAPTER_REL) > idx(SERVICE_REL), 'the BDS adapter loads after the BSS service');
  ok(idx(PREVIEW_REL) > idx(ADAPTER_REL), 'the BDSP preview loads after the BDS adapter');
  eq(SCRIPT_ORDER[SCRIPT_ORDER.length - 1], '(inline)', 'the inline monolith is the LAST application script');
  eq(idx(PREVIEW_REL), SCRIPT_ORDER.length - 2, 'the BDSP preview is the last external script before the monolith');
  // Slot 4 of the brief — a future BSS UI module — is empty today.
  ok(!SCRIPT_ORDER.some(function (s) { return /backend-scanner-snapshot-(panel|ui|renderers)/.test(String(s)); }),
     'no BSS UI module script exists in the load order yet');
})();

// The inline monolith's own internal order, measured. D3 is the headline: the
// launch handler and its bssInit() call come LONG BEFORE the declarations.
(function () {
  const CONST_S = MASKED.indexOf('\nconst S = {');
  const CONST_WL = MASKED.indexOf('\nconst WL=[');
  ok(CONST_S > INLINE_RANGE.start, '`const S` is declared inside the inline monolith');
  ok(CONST_WL > CONST_S, '`const WL` is declared after `const S`');
  ok(CONST_S < REGION_START, '`const S` precedes the BSS UI region');
  ok(CONST_WL < REGION_START, '`const WL` precedes the BSS UI region');
  eq(BSS_INIT_CALLS.length, 1, 'there is exactly one bssInit() call site in the whole application');
  ok(BSS_INIT_CALLS[0] < REGION_START,
     'D3 — the bssInit() call site precedes the BSS UI declarations by ' +
     (REGION_START - BSS_INIT_CALLS[0]) + ' characters (hoisting is what makes it work)');
  ok(declStart('escHtml') > REGION_END,
     'D3 — escHtml is declared AFTER the region (a late-bound dependency of the HTML helpers)');
  ok(declStart('_apexPostAuthInit') > REGION_END, 'D3 — _apexPostAuthInit is declared after the region');
  ok(declStart('dsbFmtAge') < REGION_START && declStart('dsbFmtClock') < REGION_START,
     'the DSB formatters that consume BSS helpers are declared BEFORE the region');
  ok(declStart('dsbGetBackendSource') < REGION_START,
     'dsbGetBackendSource — a dependency of bssUniverseDiagHtml — is declared before the region');
  ok(declStart('rsbGetBackendSource') < REGION_START,
     'rsbGetBackendSource — a dependency of bssUniverseDiagHtml — is declared before the region');
  ok(declStart('showView') > REGION_END, 'showView (a bssStartPolling caller) is declared after the region');
  ok(declStart('_swingHydrateFromBackend') < REGION_START,
     '_swingHydrateFromBackend (a service reader consumer) is declared before the region');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 4. CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
section('4. categories');

const CATEGORIES = {
  'pure primitive/formatter': CAT_PRIMITIVE,
  'candidate derivation': CAT_DERIVATION,
  'diagnostic shape reader': CAT_DIAGNOSTIC,
  'HTML builder': CAT_HTML,
  'renderer / DOM writer': CAT_RENDER,
  'collapse controller': CAT_COLLAPSE,
  'bootstrap': CAT_BOOTSTRAP,
};
(function () {
  const union = [];
  Object.keys(CATEGORIES).forEach(function (k) { CATEGORIES[k].forEach(function (n) { union.push(n); }); });
  eq(union.length, 32, 'the categories partition all 32 declarations');
  eq(new Set(union).size, 32, 'no declaration is in two categories');
  deepEq(union.slice().sort(), BSS_UI_ALL.slice().sort(), 'the category union is exactly the manifest');
})();
eq(CAT_PRIMITIVE.length, 8, 'pure primitives/formatters: 8');
eq(CAT_DERIVATION.length, 2, 'candidate derivation: 2');
eq(CAT_DIAGNOSTIC.length, 10, 'diagnostic shape readers: 10');
eq(CAT_HTML.length, 7, 'HTML builders: 7 (the brief listed 5; +bssUniverseDiagHtml +bssBodyHtml)');
eq(CAT_RENDER.length, 2, 'renderers / DOM writers: 2');
eq(CAT_COLLAPSE.length, 2, 'collapse controllers: 2');
eq(CAT_BOOTSTRAP.length, 1, 'bootstrap: 1');

// Category membership is provable from the code, not just declared:
//  • only renderers, collapse controllers and bootstrap touch `document`;
//  • only collapse + bootstrap touch localStorage;
//  • the HTML builders are the only ones producing markup strings.
const DOM_TOUCHERS = BSS_UI_ALL.filter(function (n) { return /\bdocument\b/.test(codeOf(n)); });
deepEq(DOM_TOUCHERS.slice().sort(),
       ['bssApplyCollapse', 'bssInit', 'bssRender', 'bssRenderHeadBadges'].sort(),
       'exactly four declarations reference `document`: the two renderers, applyCollapse and init');
const STORAGE_TOUCHERS = BSS_UI_ALL.filter(function (n) { return /\blocalStorage\b/.test(codeOf(n)); });
deepEq(STORAGE_TOUCHERS.slice().sort(), ['bssInit', 'bssToggleCollapse'].sort(),
       'exactly two declarations reference localStorage: bssInit (read) and bssToggleCollapse (write)');
CAT_PRIMITIVE.concat(CAT_DERIVATION, CAT_DIAGNOSTIC).forEach(function (n) {
  ok(!/\bdocument\b|\blocalStorage\b|\bwindow\b/.test(codeOf(n)),
     n + ' is host-free: no document, no localStorage, no window');
});
CAT_HTML.filter(function (n) { return n !== 'bssKVt'; }).forEach(function (n) {
  ok(/</.test(bodyOf(n)), n + ' produces markup (it contains literal HTML)');
});
ok(!/</.test(bodyOf('bssKVt')) && /bssKV\s*\(/.test(codeOf('bssKVt')),
   'bssKVt contains NO literal HTML — it is an HTML builder purely by delegation to bssKV');
CAT_PRIMITIVE.concat(CAT_DERIVATION, CAT_DIAGNOSTIC).forEach(function (n) {
  ok(!/<(?:div|span|table|tr|td|th|thead|tbody|strong)\b/.test(bodyOf(n)),
     n + ' emits no HTML element (it is not an HTML builder)');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PURE HELPERS
//    The eight primitives are the part a future module can move with the least
//    risk — and the part two other subsystems already depend on. Their exact
//    outputs are pinned so a relocation cannot "tidy" them.
// ─────────────────────────────────────────────────────────────────────────────
section('5. pure helpers');

(function () {
  const A = makeBox().api;

  // bssNum
  eq(A.bssNum(null), '—', 'bssNum(null) → em dash');
  eq(A.bssNum(undefined), '—', 'bssNum(undefined) → em dash');
  eq(A.bssNum('   '), '—', 'bssNum(blank string) → em dash');
  eq(A.bssNum('abc'), '—', 'bssNum(non-numeric string) → em dash');
  eq(A.bssNum(Infinity), '—', 'bssNum(Infinity) → em dash');
  eq(A.bssNum(NaN), '—', 'bssNum(NaN) → em dash');
  eq(A.bssNum(1.23456), '1.23', 'bssNum without digits rounds to 2 decimals via Math.round(n*100)/100');
  eq(A.bssNum(1.005), '1', 'bssNum(1.005) → "1": Math.round(1.005*100)/100 collapses to 1 — pinned, not corrected');
  eq(A.bssNum(1.23456, 3), '1.235', 'bssNum with digits uses toFixed');
  eq(A.bssNum(5, 2), '5.00', 'bssNum(5, 2) → 5.00');
  eq(A.bssNum('7.5', 1), '7.5', 'bssNum coerces numeric strings');
  eq(A.bssNum(0), '0', 'bssNum(0) → "0" (zero is not treated as missing)');
  eq(A.bssNum(0, 2), '0.00', 'bssNum(0, 2) → 0.00');

  // bssInt
  eq(A.bssInt(null), '—', 'bssInt(null) → em dash');
  eq(A.bssInt(''), '0', 'bssInt("") → "0" (Number("") is 0 — pinned, not corrected)');
  eq(A.bssInt(4.6), '5', 'bssInt rounds');
  eq(A.bssInt(-4.6), '-5', 'bssInt rounds negatives away from zero via Math.round semantics');
  eq(A.bssInt('12'), '12', 'bssInt coerces numeric strings');
  eq(A.bssInt(NaN), '—', 'bssInt(NaN) → em dash');

  // bssCount / bssCountStr
  eq(A.bssCount(7), 7, 'bssCount(number) → the number');
  eq(A.bssCount([1, 2, 3]), 3, 'bssCount(array) → length');
  eq(A.bssCount([]), 0, 'bssCount([]) → 0');
  eq(A.bssCount(null), null, 'bssCount(null) → null');
  eq(A.bssCount('3'), null, 'bssCount(string) → null (no string coercion)');
  eq(A.bssCount(Infinity), null, 'bssCount(Infinity) → null');
  eq(A.bssCountStr(null), '—', 'bssCountStr(null) → em dash');
  eq(A.bssCountStr([1, 2]), '2', 'bssCountStr(array) → the length as a string');
  eq(A.bssCountStr(0), '0', 'bssCountStr(0) → "0", not em dash');

  // bssList
  eq(A.bssList(null), null, 'bssList(null) → null');
  eq(A.bssList([]), null, 'bssList([]) → null (empty is null, not an empty string)');
  eq(A.bssList(['A', 'B']), 'A, B', 'bssList joins with ", "');
  eq(A.bssList([1, 2, 3, 4, 5, 6, 7, 8, 9]), '1, 2, 3, 4, 5, 6, 7, 8 +1', 'bssList default limit is 8 with a "+n" suffix');
  eq(A.bssList([1, 2, 3], 2), '1, 2 +1', 'bssList honours an explicit max');
  eq(A.bssList([{ symbol: 'AAPL' }, { sym: 'MSFT' }, { s: 'NVDA' }, {}]), 'AAPL, MSFT, NVDA, ?',
     'bssList reads symbol/sym/s from objects and falls back to "?"');
  eq(A.bssList([null, undefined]), '?, ?', 'bssList maps null/undefined entries to "?"');

  // bssBoolYN
  eq(A.bssBoolYN(true), 'yes', 'bssBoolYN(true) → yes');
  eq(A.bssBoolYN(false), 'no', 'bssBoolYN(false) → no');
  eq(A.bssBoolYN(null), '—', 'bssBoolYN(null) → em dash');
  eq(A.bssBoolYN(1), '—', 'bssBoolYN(1) → em dash (strict boolean only)');

  // bssFmtAgeMs
  eq(A.bssFmtAgeMs(null), '—', 'bssFmtAgeMs(null) → em dash');
  eq(A.bssFmtAgeMs(-1), '—', 'bssFmtAgeMs(negative) → em dash');
  eq(A.bssFmtAgeMs(NaN), '—', 'bssFmtAgeMs(NaN) → em dash');
  eq(A.bssFmtAgeMs(0), '0s', 'bssFmtAgeMs(0) → 0s');
  eq(A.bssFmtAgeMs(59_000), '59s', 'bssFmtAgeMs under a minute → seconds');
  eq(A.bssFmtAgeMs(65_000), '1m 05s', 'bssFmtAgeMs under an hour → "Nm SSs" with a zero-padded seconds part');
  eq(A.bssFmtAgeMs(3_900_000), '1h 05m', 'bssFmtAgeMs over an hour → "Nh MMm" with a zero-padded minutes part');

  // bssFmtClock
  eq(A.bssFmtClock(null), '—', 'bssFmtClock(null) → em dash');
  eq(A.bssFmtClock(''), '—', 'bssFmtClock("") → em dash');
  eq(A.bssFmtClock('not-a-date'), '—', 'bssFmtClock(unparseable) → em dash');
  ok(/^\d{2}:\d{2}:\d{2}$/.test(A.bssFmtClock('2026-07-27T12:34:56.000Z')),
     'bssFmtClock(ISO) → zero-padded local HH:MM:SS');
  ok(/^\d{2}:\d{2}:\d{2}$/.test(A.bssFmtClock(Date.parse('2026-07-27T12:34:56.000Z'))),
     'bssFmtClock accepts an epoch number as well as an ISO string');

  // Purity: no host access, identical results across repeated calls, no argument
  // mutation.
  const arr = ['A', 'B'];
  const before = JSON.stringify(arr);
  A.bssList(arr, 1); A.bssCount(arr); A.bssCountStr(arr);
  eq(JSON.stringify(arr), before, 'the pure helpers never mutate their array argument');
  const objArg = { symbol: 'AAPL' };
  A.bssList([objArg]);
  deepEq(Object.keys(objArg), ['symbol'], 'the pure helpers never add properties to object arguments');
})();

// A strict-sandbox re-evaluation proves the eight primitives resolve NOTHING
// beyond ECMAScript intrinsics: they are relocatable to any script position.
(function () {
  const PRIMITIVE_FREE = {
    bssNum: ['Math', 'Number', 'String', 'isFinite'],
    bssInt: ['Math', 'Number', 'String', 'isFinite'],
    bssCount: ['Array', 'isFinite'],
    bssCountStr: ['String', 'bssCount'],
    bssList: ['Array', 'String'],
    bssBoolYN: [],
    bssFmtAgeMs: ['Math', 'isFinite'],
    bssFmtClock: ['Date', 'isFinite'],
  };
  CAT_PRIMITIVE.forEach(function (n) {
    deepEq(freeGlobals(codeOf(n), new Set([n])), PRIMITIVE_FREE[n],
           n + ' free-identifier set is exactly ' + JSON.stringify(PRIMITIVE_FREE[n]));
  });
  const APP_LEVEL = CAT_PRIMITIVE.reduce(function (acc, n) {
    return acc.concat(PRIMITIVE_FREE[n].filter(function (g) {
      return ['Math', 'Number', 'String', 'Array', 'Date', 'isFinite'].indexOf(g) < 0;
    }));
  }, []);
  deepEq(Array.from(new Set(APP_LEVEL)).sort(), ['bssCount'],
         'the only non-intrinsic dependency inside the primitives is bssCount (bssCountStr → bssCount)');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 6. DIAGNOSTICS AND BADGES
// ─────────────────────────────────────────────────────────────────────────────
section('6. diagnostics and badges');

(function () {
  const A = makeBox().api;

  // bssSD — always an object, never the candidate itself.
  deepEq(A.bssSD(null), {}, 'bssSD(null) → {}');
  deepEq(A.bssSD({}), {}, 'bssSD(candidate without scoreDiagnostics) → {}');
  deepEq(A.bssSD({ scoreDiagnostics: 'x' }), {}, 'bssSD(non-object scoreDiagnostics) → {}');
  (function () {
    const sd = { scorePreview: 1 };
    eq(A.bssSD({ scoreDiagnostics: sd }), sd, 'bssSD returns the SAME reference when the shape is valid (no copy)');
  })();

  // bssBucketInfo
  deepEq(A.bssBucketInfo(null), { label: '—', cls: 'bss-b-muted' }, 'bssBucketInfo(null) → muted em dash');
  deepEq(A.bssBucketInfo(''), { label: '—', cls: 'bss-b-muted' }, 'bssBucketInfo("") → muted em dash');
  deepEq(A.bssBucketInfo('a'), { label: 'A', cls: 'bss-b-ok' }, 'bssBucketInfo lower-cases input then upper-cases the label; A → ok');
  deepEq(A.bssBucketInfo('B'), { label: 'B', cls: 'bss-b-info' }, 'bucket B → info');
  deepEq(A.bssBucketInfo(' c '), { label: 'C', cls: 'bss-b-warn' }, 'bucket C (trimmed) → warn');
  deepEq(A.bssBucketInfo('D'), { label: 'D', cls: 'bss-b-muted' }, 'bucket D → muted');
  deepEq(A.bssBucketInfo('Z'), { label: 'Z', cls: 'bss-b-pu' }, 'an unknown bucket → purple, label preserved');

  // bssParityInfo — string, object and recursive-status forms.
  deepEq(A.bssParityInfo(null), { label: 'n/c', cls: 'bss-b-muted', state: 'na' }, 'parity null → n/c');
  deepEq(A.bssParityInfo('match'), { label: 'match', cls: 'bss-b-ok', state: 'match' }, 'parity "match" → ok');
  deepEq(A.bssParityInfo('MATCHED'), { label: 'match', cls: 'bss-b-ok', state: 'match' }, 'parity "MATCHED" → ok');
  deepEq(A.bssParityInfo('true'), { label: 'match', cls: 'bss-b-ok', state: 'match' }, 'parity "true" → ok');
  deepEq(A.bssParityInfo('mismatch'), { label: 'mismatch', cls: 'bss-b-err', state: 'mismatch' }, 'parity "mismatch" → err');
  deepEq(A.bssParityInfo('false'), { label: 'mismatch', cls: 'bss-b-err', state: 'mismatch' }, 'parity "false" → err');
  deepEq(A.bssParityInfo('not_comparable'), { label: 'n/c', cls: 'bss-b-muted', state: 'na' }, 'parity "not_comparable" → n/c');
  deepEq(A.bssParityInfo('weird'), { label: 'weird', cls: 'bss-b-muted', state: 'other' }, 'an unknown parity string is echoed lower-cased with state "other"');
  deepEq(A.bssParityInfo({ comparable: false }), { label: 'n/c', cls: 'bss-b-muted', state: 'na' }, 'parity {comparable:false} → n/c');
  deepEq(A.bssParityInfo({ isComparable: false }), { label: 'n/c', cls: 'bss-b-muted', state: 'na' }, 'parity {isComparable:false} → n/c');
  deepEq(A.bssParityInfo({ matches: true }), { label: 'match', cls: 'bss-b-ok', state: 'match' }, 'parity {matches:true} → match');
  deepEq(A.bssParityInfo({ match: false }), { label: 'mismatch', cls: 'bss-b-err', state: 'mismatch' }, 'parity {match:false} → mismatch');
  deepEq(A.bssParityInfo({ isMatch: true }), { label: 'match', cls: 'bss-b-ok', state: 'match' }, 'parity {isMatch:true} → match');
  deepEq(A.bssParityInfo({ status: 'mismatch' }), { label: 'mismatch', cls: 'bss-b-err', state: 'mismatch' }, 'parity {status} recurses through the string form');
  deepEq(A.bssParityInfo({}), { label: 'n/c', cls: 'bss-b-muted', state: 'na' }, 'an empty parity object → n/c');
  deepEq(A.bssParityInfo(42), { label: 'n/c', cls: 'bss-b-muted', state: 'na' }, 'a numeric parity → n/c');

  // bssTechComplete / bssTechCompleteInfo
  eq(A.bssTechComplete(null), null, 'bssTechComplete(null) → null');
  eq(A.bssTechComplete(true), true, 'bssTechComplete(boolean) → the boolean');
  ['complete', 'coreComplete', 'completeCoreTechnicals', 'hasCompleteCoreTechnicals', 'isComplete', 'core'].forEach(function (k) {
    const o = {}; o[k] = true;
    eq(A.bssTechComplete(o), true, 'bssTechComplete reads the `' + k + '` key');
  });
  eq(A.bssTechComplete({ complete: 'yes' }), null, 'bssTechComplete ignores non-boolean values');
  eq(A.bssTechComplete({ unknownKey: true }), null, 'bssTechComplete returns null for an unrecognised shape');
  deepEq(A.bssTechCompleteInfo({ complete: true }), { label: 'yes', cls: 'bss-b-ok', complete: true }, 'techCompleteInfo(true) → yes/ok');
  deepEq(A.bssTechCompleteInfo({ complete: false }), { label: 'no', cls: 'bss-b-warn', complete: false }, 'techCompleteInfo(false) → no/warn');
  deepEq(A.bssTechCompleteInfo(null), { label: '—', cls: 'bss-b-muted', complete: null }, 'techCompleteInfo(null) → muted em dash');

  // bssFmtRs
  eq(A.bssFmtRs(null), '—', 'bssFmtRs(null) → em dash');
  eq(A.bssFmtRs(1.234), '1.23', 'bssFmtRs(number) → 2 decimals via bssNum');
  eq(A.bssFmtRs(Infinity), '—', 'bssFmtRs(Infinity) → em dash');
  ['value', 'ratio', 'rs', 'vsSpy', 'relativeStrength', 'percent', 'pct'].forEach(function (k) {
    const o = {}; o[k] = 2.5;
    eq(A.bssFmtRs(o), '2.50', 'bssFmtRs reads the `' + k + '` key');
  });
  eq(A.bssFmtRs({ strong: true }), 'strong', 'bssFmtRs({strong:true}) → "strong"');
  eq(A.bssFmtRs({ strong: false }), 'weak', 'bssFmtRs({strong:false}) → "weak"');
  eq(A.bssFmtRs({ label: 'X' }), 'X', 'bssFmtRs falls back to the label key');
  eq(A.bssFmtRs({}), '—', 'bssFmtRs({}) → em dash');
  eq(A.bssFmtRs('n/a'), 'n/a', 'bssFmtRs(string) is passed through verbatim (NOT escaped here — the caller escapes)');
  eq(A.bssFmtRs(true), '—', 'bssFmtRs(boolean) → em dash');

  // bssDirDiagInfo
  deepEq(A.bssDirDiagInfo(null), { dir: null, confidence: null }, 'dirDiagInfo(null) → nulls');
  deepEq(A.bssDirDiagInfo({ directionDiagnostics: 'x' }), { dir: null, confidence: null }, 'dirDiagInfo(non-object) → nulls');
  deepEq(A.bssDirDiagInfo({ directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.5 } }),
         { dir: 'LONG', confidence: 0.5 }, 'dirDiagInfo prefers candidateDirection + confidence');
  deepEq(A.bssDirDiagInfo({ directionDiagnostics: { direction: 'SHORT', score: 3 } }),
         { dir: 'SHORT', confidence: 3 }, 'dirDiagInfo falls back to direction + score');

  // bssDirBadge
  deepEq(A.bssDirBadge(null), { label: '—', cls: 'bss-b-muted' }, 'dirBadge(null) → muted');
  deepEq(A.bssDirBadge(''), { label: '—', cls: 'bss-b-muted' }, 'dirBadge("") → muted');
  ['LONG', 'BULL', 'BULLISH', 'UP'].forEach(function (d) {
    deepEq(A.bssDirBadge(d.toLowerCase()), { label: d, cls: 'bss-b-ok' }, 'dirBadge("' + d + '") → ok, upper-cased');
  });
  ['SHORT', 'BEAR', 'BEARISH', 'DOWN'].forEach(function (d) {
    deepEq(A.bssDirBadge(d), { label: d, cls: 'bss-b-err' }, 'dirBadge("' + d + '") → err');
  });
  ['NEUTRAL', 'FLAT', 'NONE'].forEach(function (d) {
    deepEq(A.bssDirBadge(d), { label: d, cls: 'bss-b-muted' }, 'dirBadge("' + d + '") → muted');
  });
  deepEq(A.bssDirBadge('SIDEWAYS'), { label: 'SIDEWAYS', cls: 'bss-b-info' }, 'an unknown direction → info, label preserved');

  // bssOperational — the "inert operational field" contract.
  deepEq(A.bssOperational(null), { label: 'null', cls: 'bss-b-muted', active: false },
         'operational(null) → the literal string "null", muted, active:false');
  deepEq(A.bssOperational(undefined), { label: 'null', cls: 'bss-b-muted', active: false },
         'operational(undefined) → the same inert badge as null');
  deepEq(A.bssOperational(0), { label: '0', cls: 'bss-b-pu', active: true },
         'operational(0) → active (zero is a real operational value)');
  deepEq(A.bssOperational('LONG'), { label: 'LONG', cls: 'bss-b-pu', active: true }, 'operational(value) → purple, active:true');

  // bssRankEligBadge returns HTML, not an info object.
  eq(A.bssRankEligBadge(true), '<span class="bss-b bss-b-ok">elig</span>', 'rankEligBadge(true) → the exact elig badge');
  eq(A.bssRankEligBadge(false), '<span class="bss-b bss-b-muted">no</span>', 'rankEligBadge(false) → the exact "no" badge');
  eq(A.bssRankEligBadge(null), '<span class="bss-b bss-b-muted">—</span>', 'rankEligBadge(null) → the exact muted em dash badge');
  eq(A.bssRankEligBadge(1), '<span class="bss-b bss-b-muted">—</span>', 'rankEligBadge(truthy non-boolean) → muted em dash');

  // No mutation anywhere in the diagnostic family.
  const cand = candidate();
  const snapshotBefore = JSON.stringify(cand);
  A.bssSD(cand); A.bssDirDiagInfo(cand); A.bssParityInfo(cand.directionParity);
  A.bssTechCompleteInfo(cand.technicalCoverage); A.bssBucketInfo(cand.scoreDiagnostics.scoreBucket);
  A.bssFmtRs(cand.relativeStrengthVsSpy); A.bssOperational(cand.direction);
  eq(JSON.stringify(cand), snapshotBefore, 'no diagnostic helper mutates the candidate it inspects');
})();

// Every cls value the diagnostic family can emit is a real CSS class.
(function () {
  const EMITTED = ['bss-b-ok', 'bss-b-off', 'bss-b-warn', 'bss-b-err', 'bss-b-info', 'bss-b-pu', 'bss-b-muted'];
  EMITTED.forEach(function (c) {
    ok(new RegExp('\\.' + c + '\\s*\\{').test(CSS), c + ' has a CSS rule in index.html');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 7. CANDIDATE DERIVATION
//    The single most dangerous function to relocate: a sort that must stay a
//    sort of a COPY. Guarded with deep write proxies, not with a grep.
// ─────────────────────────────────────────────────────────────────────────────
section('7. candidate derivation');

(function () {
  const A = makeBox().api;

  // bssScorePreviewOf — diagnostic field first, top-level fallback second.
  eq(A.bssScorePreviewOf(null), null, 'scorePreviewOf(null) → null');
  eq(A.bssScorePreviewOf({}), null, 'scorePreviewOf({}) → null');
  eq(A.bssScorePreviewOf({ scoreDiagnostics: { scorePreview: 42 } }), 42,
     'scorePreviewOf reads scoreDiagnostics.scorePreview as the PRIMARY source');
  eq(A.bssScorePreviewOf({ scorePreview: 7 }), 7, 'scorePreviewOf falls back to the top-level scorePreview');
  eq(A.bssScorePreviewOf({ scoreDiagnostics: { scorePreview: 42 }, scorePreview: 7 }), 42,
     'the diagnostic field WINS over the top-level fallback');
  eq(A.bssScorePreviewOf({ scoreDiagnostics: { scorePreview: Infinity }, scorePreview: 7 }), 7,
     'a non-finite diagnostic preview falls through to the top-level value');
  eq(A.bssScorePreviewOf({ scoreDiagnostics: { scorePreview: '9' } }), null,
     'a string preview is rejected (numbers only)');
  eq(A.bssScorePreviewOf({ scorePreview: NaN }), null, 'NaN is rejected');
  eq(A.bssScorePreviewOf({ score: 99 }), null,
     'candidate.score is NOT a source of the preview — the operational field is never substituted');
  ok(!/\bcand\s*\.\s*score\b(?!Preview|Diagnostics|Bucket)/.test(codeOf('bssScorePreviewOf')),
     'bssScorePreviewOf never reads candidate.score in source');

  // bssDeriveCandidateRows — empty/degenerate inputs.
  deepEq(A.bssDeriveCandidateRows(null), [], 'deriveCandidateRows(null) → []');
  deepEq(A.bssDeriveCandidateRows(undefined), [], 'deriveCandidateRows(undefined) → []');
  deepEq(A.bssDeriveCandidateRows({}), [], 'a snapshot without candidates → []');
  deepEq(A.bssDeriveCandidateRows({ candidates: null }), [], 'candidates:null → []');
  deepEq(A.bssDeriveCandidateRows({ candidates: 'nope' }), [], 'a non-array candidates → []');
  deepEq(A.bssDeriveCandidateRows({ candidates: {} }), [], 'an object candidates → []');
  deepEq(A.bssDeriveCandidateRows({ candidates: [] }), [], 'an empty candidates array → []');

  // Sorting: scored DESC first, unscored last, original order as the tie-break.
  (function () {
    const src = [
      { symbol: 'A', scoreDiagnostics: { scorePreview: 10 } },
      { symbol: 'B' },
      { symbol: 'C', scoreDiagnostics: { scorePreview: 30 } },
      { symbol: 'D', scoreDiagnostics: { scorePreview: 20 } },
      { symbol: 'E' },
    ];
    const rows = A.bssDeriveCandidateRows({ candidates: src });
    deepEq(rows.map(function (r) { return r.symbol; }), ['C', 'D', 'A', 'B', 'E'],
           'scored candidates come first in score DESC order; unscored keep their original relative order at the end');
  })();
  (function () {
    const src = [
      { symbol: 'A', scoreDiagnostics: { scorePreview: 50 } },
      { symbol: 'B', scoreDiagnostics: { scorePreview: 50 } },
      { symbol: 'C', scoreDiagnostics: { scorePreview: 50 } },
    ];
    deepEq(A.bssDeriveCandidateRows({ candidates: src }).map(function (r) { return r.symbol; }), ['A', 'B', 'C'],
           'equal scores preserve the original snapshot order (the sort is stabilised by index)');
  })();
  (function () {
    const src = [{ symbol: 'A' }, { symbol: 'B' }, { symbol: 'C' }];
    deepEq(A.bssDeriveCandidateRows({ candidates: src }).map(function (r) { return r.symbol; }), ['A', 'B', 'C'],
           'when NOBODY has a score preview the original order is returned untouched (the sort is skipped entirely)');
  })();
  (function () {
    const src = [
      { symbol: 'A', scoreDiagnostics: { scorePreview: Infinity } },
      { symbol: 'B', scoreDiagnostics: { scorePreview: 5 } },
    ];
    deepEq(A.bssDeriveCandidateRows({ candidates: src }).map(function (r) { return r.symbol; }), ['B', 'A'],
           'a non-finite preview is treated as unscored and sinks to the end');
  })();

  // Reference discipline: new array, same candidate objects, source untouched.
  (function () {
    const c1 = { symbol: 'A', scoreDiagnostics: { scorePreview: 1 } };
    const c2 = { symbol: 'B', scoreDiagnostics: { scorePreview: 9 } };
    const src = [c1, c2];
    const snap = { candidates: src };
    const rows = A.bssDeriveCandidateRows(snap);
    ok(rows !== src, 'the returned array is a NEW reference, never the snapshot array');
    eq(rows[0], c2, 'the returned rows are the SAME candidate objects (no copy, no re-shape)');
    eq(rows[1], c1, 'every returned row is identical to its source candidate object');
    deepEq(src.map(function (c) { return c.symbol; }), ['A', 'B'], 'the SOURCE array order is unchanged after derivation');
    eq(snap.candidates, src, 'snapshot.candidates still points at the same array');
    const rows2 = A.bssDeriveCandidateRows(snap);
    ok(rows2 !== rows, 'each call returns a fresh array (no cached/shared result)');
  })();

  // Deep write guard: derivation through a proxy that records any write.
  (function () {
    const g = makeWriteGuard();
    const snap = snapshot({ candidates: [candidate({ symbol: 'A' }), candidate({ symbol: 'B', scoreDiagnostics: { scorePreview: 99 } })] });
    const guarded = g.guard(snap, 'snapshot');
    const rows = A.bssDeriveCandidateRows(guarded);
    deepEq(g.writes, [], 'bssDeriveCandidateRows performs ZERO writes anywhere in the snapshot tree');
    eq(rows.length, 2, 'the guarded derivation still produced both rows');
  })();

  // Static proof that no in-place sort/reverse/splice reaches the source array.
  const derive = codeOf('bssDeriveCandidateRows');
  ok(/\.map\s*\(/.test(derive), 'bssDeriveCandidateRows builds an indexed COPY with .map before sorting');
  ok(!/\bcands\s*\.\s*(?:sort|reverse|splice|push|pop|shift|unshift|fill|copyWithin)\s*\(/.test(derive),
     'the source `cands` array is never sorted or mutated in place');
  ok(!/\bsnap\s*\.\s*candidates\s*\.\s*(?:sort|reverse|splice)\s*\(/.test(derive),
     'snapshot.candidates is never sorted in place');
  ok(/\bindexed\s*\.\s*sort\s*\(/.test(derive), 'the sort target is the local `indexed` copy');
  ok(/\ba\.i\s*-\s*b\.i\b/.test(derive), 'the comparator falls back to the original index — the sort is stabilised');

  // The BSS panel owns this derivation. It is NOT the BDS adapter's.
  ok(!/\bbds[A-Z]/.test(derive), 'bssDeriveCandidateRows does not delegate to the BDS adapter');
  ok(defCountIn(ADAPTER_SRC, 'bssDeriveCandidateRows') === 0 && defCountIn(ADAPTER_SRC, 'bssScorePreviewOf') === 0,
     'the BDS adapter does not redefine the BSS derivation — two ownerships, two implementations');
  deepEq(callerNames('bssDeriveCandidateRows'), ['bssBodyHtml'],
         'bssDeriveCandidateRows has exactly one caller: bssBodyHtml');
  deepEq(callerNames('bssScorePreviewOf'), ['bssCandidateTableHtml', 'bssDeriveCandidateRows'],
         'bssScorePreviewOf has exactly two callers, both inside the BSS UI');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 8. HTML HELPERS
// ─────────────────────────────────────────────────────────────────────────────
section('8. HTML helpers');

(function () {
  const A = makeBox().api;

  eq(A.bssBadge('X', 'bss-b-ok'), '<span class="bss-b bss-b-ok">X</span>', 'bssBadge emits the exact span markup');
  eq(A.bssBadge('<b>', 'bss-b-ok'), '<span class="bss-b bss-b-ok">&lt;b&gt;</span>', 'bssBadge escapes its label');
  eq(A.bssBadge('X', undefined), '<span class="bss-b undefined">X</span>',
     'bssBadge does NOT default its class — an undefined cls is stringified (pinned, not corrected)');
  eq(A.bssKV('K', '<i>v</i>'), '<div class="bss-kv"><div class="bss-k">K</div><div class="bss-v"><i>v</i></div></div>',
     'bssKV emits the exact kv markup and passes vHtml through RAW');
  eq(A.bssKV('<K>', 'v'), '<div class="bss-kv"><div class="bss-k">&lt;K&gt;</div><div class="bss-v">v</div></div>',
     'bssKV escapes the KEY but not the value html');
  eq(A.bssKVt('K', '<v>'), '<div class="bss-kv"><div class="bss-k">K</div><div class="bss-v">&lt;v&gt;</div></div>',
     'bssKVt escapes the value — it is the safe variant');
  eq(A.bssKVt('K', null), '<div class="bss-kv"><div class="bss-k">K</div><div class="bss-v">—</div></div>',
     'bssKVt(null) renders an em dash');
  eq(A.bssKVt('K', 0), '<div class="bss-kv"><div class="bss-k">K</div><div class="bss-v">0</div></div>',
     'bssKVt(0) renders "0", not an em dash');

  // bssTopSymbolsHtml — string entries, object entries, empty state.
  eq(A.bssTopSymbolsHtml(null), '<span class="bss-empty">—</span>', 'topSymbols(null) → the exact empty state');
  eq(A.bssTopSymbolsHtml({}), '<span class="bss-empty">—</span>', 'topSymbols without the key → empty state');
  eq(A.bssTopSymbolsHtml({ topSymbols: [] }), '<span class="bss-empty">—</span>', 'topSymbols([]) → empty state');
  eq(A.bssTopSymbolsHtml({ topSymbols: 'AAPL' }), '<span class="bss-empty">—</span>',
     'a STRING topSymbols (not an array) → empty state');
  eq(A.bssTopSymbolsHtml({ topSymbols: ['AAPL'] }),
     '<div class="bss-chips"><span class="bss-b bss-b-pu">AAPL</span></div>',
     'a string entry becomes a plain purple chip');
  eq(A.bssTopSymbolsHtml({ topSymbols: [{ symbol: 'AAPL', scorePreview: 91, scoreBucket: 'A' }] }),
     '<div class="bss-chips"><span class="bss-b bss-b-pu">AAPL 91 A</span></div>',
     'an object entry becomes "SYMBOL score bucket"');
  eq(A.bssTopSymbolsHtml({ topSymbols: [{ sym: 'MSFT' }] }),
     '<div class="bss-chips"><span class="bss-b bss-b-pu">MSFT</span></div>',
     'object entries fall back to sym');
  eq(A.bssTopSymbolsHtml({ topSymbols: [{}] }),
     '<div class="bss-chips"><span class="bss-b bss-b-pu">?</span></div>',
     'an unnamed object entry renders "?"');
  eq(A.bssTopSymbolsHtml({ topSymbols: [null] }), '<div class="bss-chips"></div>',
     'a null entry contributes an empty string, leaving an empty chips container');
  eq(A.bssTopSymbolsHtml({ topSymbols: new Array(15).fill('X') }).match(/bss-b-pu/g).length, 12,
     'topSymbols is capped at 12 chips');

  // bssCandidateTableHtml — columns, order, empty body, sparse input.
  const COLS = ['Symbol', 'Price', 'RSI14', 'RS vs SPY', 'Backend dir', 'Conf', 'Parity', 'Score prev',
                'Bucket', 'Rank elig', 'Cache', 'Tech core', 'Op dir', 'Op score'];
  (function () {
    const html = A.bssCandidateTableHtml([]);
    eq(html, '<div class="bss-tbl-wrap"><table class="bss-tbl"><thead><tr>'
       + COLS.map(function (c) { return '<th>' + c + '</th>'; }).join('')
       + '</tr></thead><tbody></tbody></table></div>',
       'an empty row list still emits the full 14-column header and an empty body');
    const heads = html.match(/<th>([^<]*)<\/th>/g).map(function (h) { return h.replace(/<\/?th>/g, ''); });
    deepEq(heads, COLS, 'the 14 columns appear in the exact declared order');
  })();
  (function () {
    const html = A.bssCandidateTableHtml([candidate()]);
    ok(html.indexOf('<td><strong>AAPL</strong></td>') >= 0, 'the symbol cell is bold');
    ok(html.indexOf('<td>187.50</td>') >= 0, 'the price cell uses 2 decimals');
    ok(html.indexOf('<td>58.0</td>') >= 0, 'the RSI cell uses 1 decimal');
    ok(html.indexOf('1.42') >= 0, 'the RS cell renders the relativeStrengthVsSpy value');
    ok(html.indexOf('<span class="bss-b bss-b-ok">LONG</span>') >= 0, 'the backend direction badge renders');
    ok(html.indexOf('<span class="bss-b bss-b-ok">match</span>') >= 0, 'the parity badge renders');
    ok(html.indexOf('<td>91</td>') >= 0, 'the score preview cell uses 0 decimals');
    ok(html.indexOf('<span class="bss-b bss-b-ok">A</span>') >= 0, 'the bucket badge renders');
    ok(html.indexOf('<span class="bss-b bss-b-ok">elig</span>') >= 0, 'the rank-eligibility badge renders');
    ok(html.indexOf('320 · BACKEND_DXLINK_CANDLE_CACHE') >= 0, 'the cache cell is "count · source"');
    ok(html.indexOf('style="text-align:left"') >= 0, 'the cache cell keeps its left alignment style');
    ok(html.indexOf('<span class="bss-b bss-b-muted">null</span>') >= 0,
       'operational direction/score render as inert "null" badges');
    eq((html.match(/<span class="bss-b bss-b-muted">null<\/span>/g) || []).length, 2,
       'BOTH operational cells render the inert null badge');
  })();
  (function () {
    const html = A.bssCandidateTableHtml([null]);
    ok(html.indexOf('<td><strong>—</strong></td>') >= 0, 'a NULL candidate row renders an em dash symbol, not a crash');
    ok(html.indexOf('<tr>') >= 0, 'a null candidate still produces a row');
  })();
  (function () {
    const html = A.bssCandidateTableHtml([{ symbol: 'X' }]);
    ok(html.indexOf('<td><strong>X</strong></td>') >= 0, 'a sparse candidate renders its symbol');
    eq((html.match(/—/g) || []).length >= 5, true, 'a sparse candidate renders em dashes for every missing field');
  })();
  (function () {
    const html = A.bssCandidateTableHtml([{ symbol: 'Y', cache: { count: 12, reason: 'cold' } }]);
    ok(html.indexOf('12 · cold') >= 0, 'the cache cell falls back to cache.count and appends cache.reason');
  })();
  (function () {
    const html = A.bssCandidateTableHtml([{ symbol: 'Z', relativeStrength: 3.5 }]);
    ok(html.indexOf('3.50') >= 0, 'the RS cell falls back to relativeStrength when relativeStrengthVsSpy is absent');
  })();

  // bssUniverseDiagHtml — the two extra HTML builders the brief missed.
  (function () {
    const html = A.bssUniverseDiagHtml(status(), snapshot());
    ok(html.indexOf('Universe diagnostics') >= 0, 'the universe block keeps its heading copy');
    ok(html.indexOf('UI only · read-only · no scanner/backend change') >= 0,
       'the universe block keeps its read-only disclaimer copy');
    ok(html.indexOf('Frontend WL universe') >= 0, 'the WL row renders');
    ok(html.indexOf('Backend scanner universeCount') >= 0, 'the backend universeCount row renders');
    ok(html.indexOf('Backend snapshot universe') >= 0, 'the snapshot universe row renders');
    ok(html.indexOf('RS snapshot universe') >= 0, 'the RS snapshot row renders');
    ok(html.indexOf('Directional snapshot') >= 0, 'the directional snapshot row renders');
    ok(html.indexOf('backend-defined — unavailable') >= 0 || html.indexOf('symbols (Directional + Squeeze)') >= 0,
       'the universe block renders either a value or the "backend-defined — unavailable" fallback copy');
  })();
  (function () {
    const b = makeBox({ WL: ['A', 'B', 'C'] });
    const html = b.api.bssUniverseDiagHtml(status({ universeCount: 99 }), snapshot());
    ok(html.indexOf('WL 3 ≠ backend 99') >= 0, 'a WL/backend universe mismatch renders the exact warning copy');
    ok(html.indexOf('bss-b-warn') >= 0, 'the mismatch badge uses the warn class');
  })();
  (function () {
    const b = makeBox({ rsbGetBackendSource: function () { return null; }, dsbGetBackendSource: function () { return null; } });
    const html = b.api.bssUniverseDiagHtml(status(), snapshot());
    ok(html.indexOf('(open RS tab to populate)') >= 0, 'an unavailable RS source renders its exact fallback copy');
    ok(html.indexOf('(not cached)') >= 0, 'an unavailable directional source renders its exact fallback copy');
  })();

  // Nothing in the HTML family mutates its input, and every builder is pure.
  (function () {
    const g = makeWriteGuard();
    const snap = snapshot();
    const st = status();
    A.bssCandidateTableHtml(g.guard(snap.candidates, 'candidates'));
    A.bssTopSymbolsHtml(g.guard(snap.diagnostics.scoreDiagnostics, 'sd'));
    A.bssUniverseDiagHtml(g.guard(st, 'status'), g.guard(snap, 'snapshot'));
    deepEq(g.writes, [], 'the HTML builders perform ZERO writes on status, snapshot, candidates or diagnostics');
  })();
  (function () {
    const rows = [candidate()];
    const a1 = A.bssCandidateTableHtml(rows);
    const a2 = A.bssCandidateTableHtml(rows);
    eq(a1, a2, 'bssCandidateTableHtml is deterministic — identical input, identical HTML (no cache, no counter)');
  })();
  ['bssBadge', 'bssKV', 'bssKVt', 'bssTopSymbolsHtml', 'bssCandidateTableHtml', 'bssUniverseDiagHtml'].forEach(function (n) {
    ok(!/\bdocument\b/.test(codeOf(n)), n + ' builds a STRING — it never touches the DOM');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 9. RENDERING
// ─────────────────────────────────────────────────────────────────────────────
section('9. rendering');

function withState(over, boxOpts) {
  const b = makeBox(boxOpts);
  b.S.backendScanner = Object.assign({
    status: null, snapshot: null, coverage: null,
    statusError: null, snapshotError: null, coverageError: null,
    lastStatusAt: null, lastSnapshotAt: null, lastCoverageAt: null,
    fetchingStatus: false, fetchingSnapshot: false, fetchingCoverage: false,
    statusPromise: null, snapshotPromise: null, coveragePromise: null,
    coverageEndpointAbsent: false, timerId: null, collapsed: false,
  }, over || {});
  return b;
}

(function () {
  // DOM ids read and written by the two renderers, measured from the raw source.
  const ids = function (n) {
    return Array.from(new Set((bodyOf(n).match(/getElementById\('([^']+)'\)/g) || [])
      .map(function (m) { return /'([^']+)'/.exec(m)[1]; }))).sort();
  };
  deepEq(ids('bssRender'), ['bss-body', 'bss-panel'], 'bssRender looks up exactly #bss-panel and #bss-body');
  deepEq(ids('bssRenderHeadBadges'), ['bss-head-badges'], 'bssRenderHeadBadges looks up exactly #bss-head-badges');
  deepEq(ids('bssApplyCollapse'), ['bss-body', 'bss-panel'], 'bssApplyCollapse looks up exactly #bss-panel and #bss-body');
  deepEq(ids('bssInit'), ['bss-panel'], 'bssInit looks up exactly #bss-panel');
  ok(bodyOf('bssRefresh').indexOf("getElementById('bss-refresh')") >= 0,
     '#bss-refresh is looked up by the SERVICE, never by the UI');
  BSS_UI_ALL.forEach(function (n) {
    ok(bodyOf(n).indexOf('bss-refresh') < 0, n + ' never touches #bss-refresh');
  });
})();

(function () {
  // Full render with a healthy snapshot.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: false });
  const out = b.api.bssRender();
  eq(out, undefined, 'bssRender returns undefined (it is a side-effecting renderer, not a builder)');
  ok(b.log.domGet.indexOf('bss-panel') >= 0, 'bssRender queries #bss-panel first');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-head-badges.innerHTML'; }),
     'the head badges container is written via innerHTML');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-body.innerHTML'; }),
     'the body container is written via innerHTML when expanded');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-body.scrollTop'; }),
     'the body scroll position is restored after the innerHTML swap');
  deepEq(b.log.bdsp, ['bdspRender'], 'bssRender calls bdspRender exactly once');
  deepEq(b.log.network, [], 'bssRender performs ZERO network calls');
  deepEq(b.log.timers, [], 'bssRender starts ZERO timers');
  deepEq(b.log.storageWrites, [], 'bssRender writes nothing to localStorage');
  const html = b.elements['bss-body']._html;
  ok(html.indexOf('Scheduler / status') >= 0, 'the status section heading copy is unchanged');
  ok(html.indexOf('Snapshot health') >= 0, 'the snapshot-health heading copy is unchanged');
  ok(html.indexOf('Universe diagnostics') >= 0, 'the universe diagnostics heading copy is unchanged');
  ok(html.indexOf('Candidates') >= 0, 'the candidates heading copy is unchanged');
  ok(html.indexOf('diagnostic preview · operational direction/score inactive') >= 0,
     'the candidates disclaimer copy is unchanged');
})();

(function () {
  // Collapsed: head badges still render, body is NOT rewritten.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: true });
  b.api.bssRender();
  ok(b.log.domWrites.some(function (w) { return w === '#bss-head-badges.innerHTML'; }),
     'head badges render even while collapsed');
  ok(!b.log.domWrites.some(function (w) { return w === '#bss-body.innerHTML'; }),
     'the body is NOT rebuilt while collapsed (the expensive HTML is skipped)');
  deepEq(b.log.bdsp, ['bdspRender'], 'bdspRender is still called while collapsed');
})();

(function () {
  // Feature flag OFF short-circuits before any DOM access.
  const b = withState({ status: status(), snapshot: snapshot() }, { storage: { 'apex_ff_backend_scanner_snapshot': '0' } });
  b.log.domGet.length = 0; b.log.domWrites.length = 0; b.log.bdsp.length = 0;
  b.api.bssRender();
  deepEq(b.log.domGet, [], 'with the feature flag OFF bssRender touches NO DOM at all');
  deepEq(b.log.bdsp, [], 'with the feature flag OFF bdspRender is not called either');
})();

(function () {
  // No panel in the document: bssRender bails out before rendering anything.
  const b = withState({ status: status(), snapshot: snapshot() }, { presentIds: [] });
  b.api.bssRender();
  deepEq(b.log.domGet, ['bss-panel'], 'without #bss-panel bssRender stops after the first lookup');
  deepEq(b.log.domWrites, [], 'without #bss-panel nothing is written');
  deepEq(b.log.bdsp, [], 'without #bss-panel bdspRender is NOT reached');
})();

(function () {
  // Panel present, body missing: head badges still render.
  const b = withState({ status: status(), snapshot: snapshot() }, { presentIds: ['bss-panel', 'bss-head-badges'] });
  b.api.bssRender();
  ok(b.log.domWrites.some(function (w) { return w === '#bss-head-badges.innerHTML'; }),
     'a missing #bss-body does not stop the head badges');
  deepEq(b.log.bdsp, ['bdspRender'], 'a missing #bss-body does not stop the BDSP bridge');
})();

(function () {
  // Head badges missing: bssRenderHeadBadges returns without writing.
  const b = withState({ status: status(), snapshot: snapshot() }, { presentIds: ['bss-panel', 'bss-body'] });
  b.api.bssRender();
  ok(!b.log.domWrites.some(function (w) { return /head-badges/.test(w); }),
     'a missing #bss-head-badges is a silent no-op');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-body.innerHTML'; }), 'the body still renders');
})();

(function () {
  // Error precedence and the "snapshot preserved despite a recent error" case.
  const b = withState({ status: status(), snapshot: snapshot(), statusError: 'HTTP 500', snapshotError: 'HTTP 502', collapsed: false });
  b.api.bssRender();
  const html = b.elements['bss-body']._html;
  ok(html.indexOf('GET /scanner/status failed: HTTP 500') >= 0, 'the status error box copy is exact');
  ok(html.indexOf('GET /scanner/snapshot failed: HTTP 502') >= 0, 'the snapshot error box copy is exact');
  ok(html.indexOf('GET /scanner/status failed') < html.indexOf('GET /scanner/snapshot failed'),
     'the status error box precedes the snapshot error box');
  ok(html.indexOf('AAPL') >= 0, 'a PRESERVED snapshot is still rendered even with a recent fetch error');
  ok(html.indexOf('Scheduler / status') >= 0, 'the status section still renders alongside the errors');
  const badges = b.elements['bss-head-badges']._html;
  ok(badges.indexOf('SCHED ON') >= 0, 'the head badge prefers a present status over the status error');
})();

(function () {
  // Empty state: nothing fetched yet.
  const b = withState({ collapsed: false });
  b.api.bssRender();
  eq(b.elements['bss-body']._html, '<div class="bss-empty">Loading backend scanner status…</div>',
     'with no status, no snapshot and no errors the body is exactly the loading placeholder');
  eq(b.elements['bss-head-badges']._html, '', 'the head badges are empty in the loading state');
})();

(function () {
  // Partial state: status only, no snapshot.
  const b = withState({ status: status(), collapsed: false });
  b.api.bssRender();
  const html = b.elements['bss-body']._html;
  ok(html.indexOf('Waiting for snapshot…') >= 0, 'status without a snapshot renders the waiting copy');
  ok(html.indexOf('bss-tbl') < 0, 'no candidate table is rendered without an ok snapshot');
})();

(function () {
  // Snapshot error only.
  const b = withState({ status: status(), snapshotError: 'boom', collapsed: false });
  b.api.bssRender();
  ok(b.elements['bss-body']._html.indexOf('Snapshot unavailable.') >= 0,
     'a snapshot error without a snapshot renders "Snapshot unavailable."');
  ok(b.elements['bss-head-badges']._html.indexOf('SNAP ERR') >= 0, 'the head badge shows SNAP ERR');
})();

(function () {
  // NO_SNAPSHOT.
  const b = withState({ status: status(), snapshot: { ok: false, reason: 'NO_SNAPSHOT' }, collapsed: false });
  b.api.bssRender();
  const html = b.elements['bss-body']._html;
  ok(html.indexOf('No backend snapshot yet (NO_SNAPSHOT)') >= 0, 'the NO_SNAPSHOT copy includes the reason in brackets');
  ok(html.indexOf('Scheduler is ON — a snapshot should appear shortly.') >= 0,
     'with the scheduler ON the NO_SNAPSHOT box adds the reassurance copy');
  ok(b.elements['bss-head-badges']._html.indexOf('NO SNAPSHOT') >= 0, 'the head badge shows NO SNAPSHOT');
})();

(function () {
  // Status error with no status object.
  const b = withState({ statusError: 'net down', collapsed: false });
  b.api.bssRender();
  ok(b.elements['bss-body']._html.indexOf('Scheduler status unavailable.') >= 0,
     'a status error without a status renders "Scheduler status unavailable."');
  ok(b.elements['bss-head-badges']._html.indexOf('STATUS ERR') >= 0, 'the head badge shows STATUS ERR');
})();

(function () {
  // Head badges: freshness, age and candidate count.
  const b = withState({ status: status(), snapshot: snapshot({ stale: false, ageMs: 65_000 }) });
  b.api.bssRenderHeadBadges();
  const html = b.elements['bss-head-badges']._html;
  ok(html.indexOf('SCHED ON') >= 0, 'scheduler badge');
  ok(html.indexOf('FRESH') >= 0, 'freshness badge');
  ok(html.indexOf('age 1m 05s') >= 0, 'age badge uses bssFmtAgeMs');
  ok(html.indexOf('1 cand') >= 0, 'candidate-count badge');
  eq(b.api.bssRenderHeadBadges(), undefined, 'bssRenderHeadBadges returns undefined');
})();

(function () {
  // Scheduler OFF / unknown variants of the head badge.
  const off = withState({ status: status({ schedulerEnabled: false }) });
  off.api.bssRenderHeadBadges();
  ok(off.elements['bss-head-badges']._html.indexOf('SCHED OFF') >= 0, 'schedulerEnabled:false → SCHED OFF');
  const unk = withState({ status: status({ schedulerEnabled: null }) });
  unk.api.bssRenderHeadBadges();
  ok(unk.elements['bss-head-badges']._html.indexOf('SCHED ?') >= 0, 'an unknown schedulerEnabled → SCHED ?');
})();

// The renderers never write textContent, never set `disabled`, never change
// `display` on anything but the panel (that is bssInit's job).
(function () {
  ok(!/\.textContent\b/.test(codeOf('bssRender') + codeOf('bssRenderHeadBadges')),
     'neither renderer uses textContent — the panel is innerHTML-only');
  ok(!/\.disabled\b/.test(REGION_CODE), 'no BSS UI declaration touches a `disabled` property (that is the service\'s refresh button)');
  const displayWriters = BSS_UI_ALL.filter(function (n) { return /\.style\.display\b/.test(codeOf(n)); });
  deepEq(displayWriters.slice().sort(), ['bssApplyCollapse', 'bssInit'].sort(),
         'only bssApplyCollapse and bssInit write style.display');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 10. STATE OWNERSHIP
//     The UI must never own, seed, duplicate or extend S.backendScanner.
// ─────────────────────────────────────────────────────────────────────────────
section('10. state ownership');

// The shape is created ONLY by the service's bssState().
(function () {
  const stateBody = bodyOf('bssState');
  const fields = Array.from(new Set((stateBody.match(/(?:^|[\s{,])([A-Za-z_$][\w$]*)\s*:/g) || [])
    .map(function (m) { return /([A-Za-z_$][\w$]*)\s*:$/.exec(m.trim())[1]; })));
  deepEq(fields.slice().sort(), STATE_FIELDS.slice().sort(),
         'S.backendScanner has exactly the 18 documented fields, seeded by the service');
  eq(fields.length, 18, 'the state shape is 18 fields');
  eq(partOf(declStart('bssState')), SERVICE_REL, 'bssState — the only state factory — belongs to the service module');
  ok(/collapsed:\s*true/.test(stateBody), 'the seeded default is collapsed: true');
})();

// The slot is NOT pre-seeded in the `const S` object literal — unlike BDSP's.
(function () {
  const sLiteralStart = MASKED.indexOf('\nconst S = {');
  let depth = 0, end = -1;
  for (let i = MASKED.indexOf('{', sLiteralStart); i < MASKED.length; i++) {
    const c = MASKED[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  const literal = MASKED.slice(sLiteralStart, end);
  ok(!/\bbackendScanner\s*:/.test(literal),
     'S.backendScanner is NOT seeded in the `const S` literal — it is created lazily by bssState()');
  ok(/\bbackendDirectionalPreview\s*:/.test(literal),
     'by contrast S.backendDirectionalPreview IS seeded in the literal (the two slots differ)');
})();

// D5 — the UI never references `S`.
(function () {
  const REGION_FREE = freeGlobals(REGION_CODE, new Set(BSS_UI_ALL));
  deepEq(REGION_FREE,
         ['Array', 'Date', 'Infinity', 'Math', 'Number', 'String', 'WL', 'bdspRender', 'bssFreshness',
          'bssIsNoSnapshot', 'bssStartPolling', 'bssState', 'document', 'dsbGetBackendSource', 'escHtml',
          'ffBackendScannerSnapshot', 'isFinite', 'localStorage', 'rsbGetBackendSource'].sort(),
         'the complete free-global dependency list of the 32 declarations is exactly these 19 names');
  ok(REGION_FREE.indexOf('S') < 0,
     'D5 — `S` is NOT a free global of the BSS UI: every state read goes through bssState()');
  const APP_GLOBALS = REGION_FREE.filter(function (g) {
    return ['Array', 'Date', 'Infinity', 'Math', 'Number', 'String', 'isFinite', 'document', 'localStorage'].indexOf(g) < 0;
  });
  deepEq(APP_GLOBALS.sort(),
         ['WL', 'bdspRender', 'bssFreshness', 'bssIsNoSnapshot', 'bssStartPolling', 'bssState',
          'dsbGetBackendSource', 'escHtml', 'ffBackendScannerSnapshot', 'rsbGetBackendSource'].sort(),
         'stripping intrinsics and host objects leaves exactly 10 APPLICATION globals the module must resolve');
  // None of the ten is captured in a module-scope alias: all are late-bound.
  APP_GLOBALS.forEach(function (g) {
    // An ALIAS is `var x = name;`. A CALL — `var st = bssState();` — is not an
    // alias: the trailing `(` is what distinguishes them.
    ok(!new RegExp('(?:^|\\n)\\s*(?:var|let|const)\\s+[A-Za-z0-9_$]+\\s*=\\s*' + g + '\\b\\s*(?!\\()').test(REGION_CODE),
       g + ' is read by bare name at call time — never captured in a top-level alias');
  });
})();

// Which fields the UI reads, and which it writes.
(function () {
  const reads = new Set(), writes = new Set();
  BSS_UI_ALL.forEach(function (n) {
    const code = codeOf(n);
    STATE_FIELDS.forEach(function (f) {
      if (new RegExp('\\bst\\s*\\.\\s*' + f + '\\b').test(code)) reads.add(f);
      if (new RegExp('\\bst\\s*\\.\\s*' + f + '\\s*=[^=]').test(code)) writes.add(f);
    });
  });
  deepEq(Array.from(reads).sort(), UI_STATE_READS, 'D6 — the UI reads exactly five state fields');
  deepEq(Array.from(writes).sort(), UI_STATE_WRITES, 'D6 — the UI writes exactly ONE state field: collapsed');
  const never = STATE_FIELDS.filter(function (f) { return UI_STATE_READS.indexOf(f) < 0; }).sort();
  deepEq(never,
         ['coverage', 'coverageEndpointAbsent', 'coverageError', 'coveragePromise', 'fetchingCoverage',
          'fetchingSnapshot', 'fetchingStatus', 'lastCoverageAt', 'lastSnapshotAt', 'lastStatusAt',
          'snapshotPromise', 'statusPromise', 'timerId'].sort(),
         'D6 — thirteen state fields are NEVER read by the UI (coverage, all fetching*, all *Promise, all last*At, timerId)');
})();

// Runtime confirmation with a real bssState + a write-recording S.
(function () {
  const b = makeBox();
  const st1 = vm.runInContext('bssState()', b.box.context);
  const st2 = vm.runInContext('bssState()', b.box.context);
  eq(st1, st2, 'bssState() === bssState() — the accessor is idempotent and reference-stable');
  eq(st1, b.S.backendScanner, 'bssState() === S.backendScanner — one object, no duplicate');
  deepEq(Object.keys(st1).slice().sort(), STATE_FIELDS.slice().sort(),
         'the lazily created state has exactly the 18 fields');
  eq(st1.collapsed, true, 'the real default of `collapsed` is true (the panel starts closed)');
})();

(function () {
  // A full render leaves the state shape untouched — no renderer-added property.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: false });
  const before = Object.keys(b.S.backendScanner).slice().sort();
  const beforeJson = JSON.stringify(b.S.backendScanner);
  b.api.bssRender();
  b.api.bssRenderHeadBadges();
  b.api.bssApplyCollapse();
  deepEq(Object.keys(b.S.backendScanner).slice().sort(), before,
         'rendering adds NO property to S.backendScanner');
  eq(JSON.stringify(b.S.backendScanner), beforeJson, 'rendering changes NO value in S.backendScanner');
})();

(function () {
  // Missing state: the UI creates it through the service, never inline.
  const b = makeBox();
  delete b.S.backendScanner;
  b.api.bssRenderHeadBadges();
  ok(b.S.backendScanner && typeof b.S.backendScanner === 'object',
     'rendering with no state at all lazily creates it — via the service accessor');
  deepEq(Object.keys(b.S.backendScanner).slice().sort(), STATE_FIELDS.slice().sort(),
         'the lazily created state is the SERVICE shape, not a UI-invented shape');
  deepEq(b.log.service.filter(function (x) { return x === 'bssState'; }).length > 0, true,
         'the creation went through the service bssState()');
})();

(function () {
  // Incomplete state: an object with only some fields must not crash any renderer.
  const b = makeBox({ backendScanner: { collapsed: false } });
  let threw = null;
  try { b.api.bssRender(); b.api.bssRenderHeadBadges(); b.api.bssApplyCollapse(); }
  catch (e) { threw = String(e); }
  eq(threw, null, 'an incomplete S.backendScanner ({collapsed} only) renders without throwing');
  eq(b.elements['bss-body']._html, '<div class="bss-empty">Loading backend scanner status…</div>',
     'an incomplete state renders the loading placeholder');
})();

// No BSS UI declaration ever assigns to S.* directly.
ok(!/\bS\s*\.\s*[A-Za-z_$][\w$]*\s*=[^=]/.test(REGION_CODE),
   'no BSS UI declaration assigns to any property of S');
ok(!/\bS\s*\.\s*backendScanner\s*=/.test(REGION_CODE),
   'the UI never replaces S.backendScanner');

// ─────────────────────────────────────────────────────────────────────────────
// 11. COLLAPSE
// ─────────────────────────────────────────────────────────────────────────────
section('11. collapse');

(function () {
  const applyCode = codeOf('bssApplyCollapse');
  const toggleCode = codeOf('bssToggleCollapse');
  ok(/\bst\.collapsed\b/.test(applyCode), 'bssApplyCollapse reads st.collapsed');
  ok(!/\bst\.collapsed\s*=[^=]/.test(applyCode), 'bssApplyCollapse never WRITES st.collapsed — it only projects it');
  ok(/\bst\.collapsed\s*=\s*!\s*st\.collapsed\b/.test(toggleCode.replace(/\s+/g, ' ')) ||
     /st\.collapsed\s*=\s*!st\.collapsed/.test(toggleCode),
     'bssToggleCollapse is the ONLY writer of st.collapsed, and it flips the current value');
  ok(/classList\.toggle\('bss-open'/.test(bodyOf('bssApplyCollapse')),
     'the panel open state is expressed with the bss-open class');
  ok(/body\.style\.display\s*=\s*st\.collapsed\s*\?\s*'none'\s*:\s*'block'/.test(bodyOf('bssApplyCollapse')),
     'the body is shown/hidden with style.display none/block');
  ok(!/textContent|innerHTML/.test(applyCode),
     'the collapse controller changes NO text and NO icon — the chevron rotation is pure CSS');
  ok(new RegExp('\\.bss-panel\\.bss-open\\s+\\.bss-chev').test(CSS),
     'the chevron rotation is driven by the .bss-panel.bss-open .bss-chev CSS rule');
})();

(function () {
  // Toggle: expanded → collapsed → expanded, with a render on expand only.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: true });
  b.log.domWrites.length = 0; b.log.bdsp.length = 0;
  b.api.bssToggleCollapse();
  eq(b.S.backendScanner.collapsed, false, 'toggling from collapsed sets collapsed=false');
  deepEq(b.log.storageWrites, ['apex_bss_collapsed=0'], 'expanding persists "0"');
  ok(b.log.domWrites.some(function (w) { return /classList\.toggle\(bss-open,true\)/.test(w); }),
     'expanding adds the bss-open class');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-body.style.display=block'; }),
     'expanding sets the body display to block');
  eq(b.log.bdsp.length, 1, 'expanding renders exactly once (one bdspRender bridge call)');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-body.innerHTML'; }),
     'expanding rebuilds the body HTML');

  b.log.domWrites.length = 0; b.log.bdsp.length = 0; b.log.storageWrites.length = 0;
  b.api.bssToggleCollapse();
  eq(b.S.backendScanner.collapsed, true, 'toggling again sets collapsed=true');
  deepEq(b.log.storageWrites, ['apex_bss_collapsed=1'], 'collapsing persists "1"');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-body.style.display=none'; }),
     'collapsing hides the body');
  eq(b.log.bdsp.length, 0, 'collapsing does NOT re-render (bssRender is only called when expanding)');
})();

(function () {
  // Idempotence: apply twice, same DOM outcome, no state change.
  const b = withState({ collapsed: true });
  b.api.bssApplyCollapse();
  const first = b.log.domWrites.slice();
  b.log.domWrites.length = 0;
  b.api.bssApplyCollapse();
  deepEq(b.log.domWrites, first, 'bssApplyCollapse is idempotent — the same writes, in the same order');
  eq(b.S.backendScanner.collapsed, true, 'bssApplyCollapse leaves the state value alone');
  eq(b.api.bssApplyCollapse(), undefined, 'bssApplyCollapse returns undefined');
  eq(b.api.bssToggleCollapse(), undefined, 'bssToggleCollapse returns undefined');
})();

(function () {
  // Missing nodes: both collapse functions degrade silently.
  const b = withState({ collapsed: false }, { presentIds: [] });
  let threw = null;
  try { b.api.bssApplyCollapse(); } catch (e) { threw = String(e); }
  eq(threw, null, 'bssApplyCollapse with neither #bss-panel nor #bss-body present is a silent no-op');
  deepEq(b.log.domWrites, [], 'nothing is written when both nodes are missing');
})();

(function () {
  // Storage that throws: the toggle still flips and still repaints.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: true }, { storageThrows: true });
  let threw = null;
  try { b.api.bssToggleCollapse(); } catch (e) { threw = String(e); }
  eq(threw, null, 'a throwing localStorage.setItem does NOT break the toggle (it is wrapped in try/catch)');
  eq(b.S.backendScanner.collapsed, false, 'the in-memory collapse state still flipped');
  eq(b.log.bdsp.length, 1, 'the expand still rendered');
})();

// D8 — bssToggleCollapse has zero JavaScript callers.
deepEq(callerNames('bssToggleCollapse'), [],
       'D8 — bssToggleCollapse has ZERO JavaScript callers; its only entry point is the header onclick');
deepEq(callerNames('bssApplyCollapse'), ['bssInit', 'bssToggleCollapse'],
       'bssApplyCollapse is called by bssInit (restore) and bssToggleCollapse (flip) only');
ok(MARKUP.indexOf('onclick="bssToggleCollapse()"') >= 0,
   'the panel header carries the static onclick="bssToggleCollapse()" handler');

// ─────────────────────────────────────────────────────────────────────────────
// 12. PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
section('12. persistence');

(function () {
  const keys = Array.from(new Set((REGION.match(/localStorage\.\w+\('([^']+)'/g) || [])
    .map(function (m) { return /'([^']+)'/.exec(m)[1]; })));
  deepEq(keys, [COLLAPSE_STORAGE_KEY], 'the BSS UI touches exactly ONE storage key: ' + COLLAPSE_STORAGE_KEY);
  ok(bodyOf('bssInit').indexOf("localStorage.getItem('" + COLLAPSE_STORAGE_KEY + "')") >= 0,
     'bssInit is the only READER of the collapse key');
  ok(bodyOf('bssToggleCollapse').indexOf("localStorage.setItem('" + COLLAPSE_STORAGE_KEY + "'") >= 0,
     'bssToggleCollapse is the only WRITER of the collapse key');
  ok(bodyOf('ffBackendScannerSnapshot').indexOf(FEATURE_FLAG_STORAGE_KEY) >= 0,
     'the separate feature-flag key ' + FEATURE_FLAG_STORAGE_KEY + ' belongs to the SERVICE, not the UI');
  ok(REGION.indexOf(FEATURE_FLAG_STORAGE_KEY) < 0, 'the UI never reads the feature-flag key directly');
  ok(!/sessionStorage|indexedDB|document\.cookie/.test(REGION_CODE),
     'the UI uses no sessionStorage, no IndexedDB and no cookies');
})();

(function () {
  // Accepted values, and the behaviour of everything else.
  const cases = [
    ['0', false, 'the stored "0" restores an EXPANDED panel'],
    ['1', true, 'the stored "1" restores a COLLAPSED panel'],
  ];
  cases.forEach(function (c) {
    const b = makeBox({ storage: { 'apex_bss_collapsed': c[0] } });
    b.api.bssInit();
    eq(b.S.backendScanner.collapsed, c[1], c[2]);
  });
  [null, '', 'true', 'false', '2', 'yes'].forEach(function (v) {
    const storage = {};
    if (v !== null) storage['apex_bss_collapsed'] = v;
    const b = makeBox({ storage: storage });
    b.api.bssInit();
    eq(b.S.backendScanner.collapsed, true,
       'a stored value of ' + JSON.stringify(v) + ' is ignored — the default (collapsed=true) survives');
  });
})();

(function () {
  // A throwing localStorage.getItem leaves the default in place.
  const b = makeBox({ storageThrows: true });
  let threw = null;
  try { b.api.bssInit(); } catch (e) { threw = String(e); }
  eq(threw, null, 'a throwing localStorage.getItem does not break bssInit');
  eq(b.S.backendScanner.collapsed, true, 'the default collapse state survives a storage failure');
})();

(function () {
  // Round trip: toggle writes the value bssInit reads back.
  const b = withState({ collapsed: true });
  b.api.bssToggleCollapse();
  eq(b.store.get('apex_bss_collapsed'), '0', 'the toggle wrote "0"');
  const b2 = makeBox({ storage: { 'apex_bss_collapsed': b.store.get('apex_bss_collapsed') } });
  b2.api.bssInit();
  eq(b2.S.backendScanner.collapsed, false, 'a fresh bssInit restores the persisted expanded state');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 13. BOOTSTRAP — declaration vs call
// ─────────────────────────────────────────────────────────────────────────────
section('13. bootstrap');

// D4 — one call site, inside the launch handler, not at top level.
eq(BSS_INIT_CALLS.length, 1, 'there is exactly ONE bssInit() call site in the whole application');
eq(BDSP_INIT_CALLS.length, 1, 'there is exactly ONE bdspInit() call site in the whole application');
eq(partOf(BSS_INIT_CALLS[0]), '(inline)', 'the bssInit() call site is in the inline monolith');
eq(enclosingFn(BSS_INIT_CALLS[0]), null,
   'the bssInit() call site is inside no NAMED top-level function — it lives in an anonymous handler');
eq(depthAt(BSS_INIT_CALLS[0]), 2,
   'D4 — the bssInit() call sits at brace depth 2 inside the inline script: it is NOT a relocatable top-level statement');
eq(depthAt(declStart('bssInit')), 0, 'the bssInit DECLARATION sits at brace depth 0 — it IS relocatable');
ok(BSS_INIT_CALLS[0] < BDSP_INIT_CALLS[0], 'bssInit() is called BEFORE bdspInit()');
eq(BDSP_INIT_CALLS[0] - BSS_INIT_CALLS[0] < 220, true, 'the two bootstrap calls are adjacent (same statement block)');

(function () {
  // The enclosing handler is the #launchBtn async click listener.
  const before = SRC.slice(Math.max(0, BSS_INIT_CALLS[0] - 12000), BSS_INIT_CALLS[0]);
  const idx = before.lastIndexOf("document.getElementById('launchBtn').addEventListener('click',async function(){");
  ok(idx >= 0, 'D4 — the bssInit() call is inside the #launchBtn async click handler');
  ok(before.slice(idx).indexOf('try {') >= 0, 'the call sits inside that handler\'s try block');
  // Login/auth ordering: the TT login await happens BEFORE the bootstrap calls,
  // the post-auth init AFTER them.
  const seg = before.slice(idx);
  ok(seg.indexOf('_ttAuthLogin') >= 0 && seg.indexOf('_ttAuthLogin') < seg.length,
     'the Tastytrade login attempt precedes bssInit() in the same handler');
  const after = SRC.slice(BDSP_INIT_CALLS[0], BDSP_INIT_CALLS[0] + 1200);
  ok(after.indexOf("_apexPostAuthInit('login')") >= 0,
     'bssInit()/bdspInit() run BEFORE _apexPostAuthInit(\'login\') in the launch sequence');
  ok(before.slice(idx).indexOf('_sfsInit();') >= 0, '_sfsInit() runs immediately before bssInit()');
})();

// The declaration and the call are separable: this is the whole point of §32.
ok(defCountIn(SRC, 'bssInit') === 1, 'bssInit is declared exactly once in the whole application');
ok(!/^\s*bssInit\s*\(\s*\)\s*;/m.test(SERVICE_SRC) && !/^\s*bssInit\s*\(\s*\)\s*;/m.test(PREVIEW_SRC),
   'no already-extracted module contains a top-level bssInit() call');
// A call is "top level in the region" only when no declaration encloses it.
// Depth, not indentation, is what decides — every real call inside the region
// sits inside one of the 32 bodies.
BSS_UI_ALL.forEach(function (n) {
  const re = new RegExp('\\b' + n + '\\s*\\(', 'g');
  const topLevel = [];
  let m;
  while ((m = re.exec(REGION_CODE))) {
    const abs = REGION_START + m.index;
    const before = MASKED.slice(Math.max(0, abs - 12), abs);
    if (/function\s+$/.test(before)) continue;   // the declaration header
    if (enclosingFn(abs) === null) topLevel.push(abs);
  }
  deepEq(topLevel, [], n + ' is never invoked at top level inside the region');
});

// What bssInit actually does, in order, measured in the instrumented sandbox.
(function () {
  const b = makeBox({ storage: { 'apex_bss_collapsed': '0' } });
  const out = b.api.bssInit();
  eq(out, undefined, 'bssInit returns undefined');
  eq(b.log.domGet[0], 'bss-panel', 'bssInit looks up #bss-panel FIRST');
  ok(b.log.service.indexOf('ffBackendScannerSnapshot') >= 0, 'bssInit consults the feature flag');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-panel.style.display=block'; }),
     'bssInit makes the panel visible');
  ok(b.log.service.indexOf('bssState') >= 0, 'bssInit obtains state through the SERVICE accessor');
  deepEq(b.log.storageReads, ['apex_ff_backend_scanner_snapshot', 'apex_bss_collapsed', 'apex_ff_backend_scanner_snapshot'],
         'bssInit reads exactly two DISTINCT storage keys — the flag (twice: once itself, once via bssRender) and the collapse key');
  deepEq(Array.from(new Set(b.log.storageReads)).sort(), ['apex_bss_collapsed', 'apex_ff_backend_scanner_snapshot'],
         'bssInit reads no storage key beyond the flag and the collapse key');
  deepEq(b.log.storageWrites, [], 'bssInit writes NOTHING to storage');
  eq(b.S.backendScanner.collapsed, false, 'bssInit restored the persisted collapse state');
  ok(b.log.domWrites.some(function (w) { return /classList\.toggle\(bss-open,true\)/.test(w); }),
     'bssInit applies the restored collapse state to the DOM');
  ok(b.log.domWrites.some(function (w) { return w === '#bss-head-badges.innerHTML'; }),
     'bssInit performs an initial render');
  deepEq(b.log.service.filter(function (x) { return x === 'bssStartPolling'; }), ['bssStartPolling'],
         'bssInit starts polling exactly once — through the SERVICE, never with its own timer');
  deepEq(b.log.timers, [], 'bssInit creates NO timer of its own');
  deepEq(b.log.network, [], 'bssInit performs NO direct network call');
  deepEq(b.log.bdsp, ['bdspRender'], 'bssInit reaches BDSP exactly once, through bssRender');
  // The exact operation order, as a single sequence.
  const order = bodyOf('bssInit').replace(/\s+/g, ' ');
  ok(order.indexOf('bssApplyCollapse()') < order.indexOf('bssRender()'),
     'bssInit applies the collapse state BEFORE the first render');
  ok(order.indexOf('bssRender()') < order.indexOf('bssStartPolling()'),
     'bssInit renders BEFORE it starts polling');
})();

(function () {
  // Idempotence: a second bssInit (relaunch / reconnect) repeats the same work
  // and reaches the same state — it does not stack anything of its own.
  const b = makeBox({ storage: { 'apex_bss_collapsed': '1' } });
  b.api.bssInit();
  const firstState = JSON.stringify(b.S.backendScanner);
  const startCalls1 = b.log.service.filter(function (x) { return x === 'bssStartPolling'; }).length;
  b.api.bssInit();
  const startCalls2 = b.log.service.filter(function (x) { return x === 'bssStartPolling'; }).length;
  eq(JSON.stringify(b.S.backendScanner), firstState, 'a second bssInit() leaves the state identical');
  eq(startCalls2 - startCalls1, 1, 'a second bssInit() calls bssStartPolling once more — de-duplication is the SERVICE\'s job');
  ok(/if\s*\(\s*!\s*st\.timerId\s*\)/.test(codeOf('bssStartPolling')),
     'bssStartPolling itself guards against stacking duplicate timers');
  deepEq(b.log.timers, [], 'repeated bssInit() still creates no UI-owned timer');
})();

(function () {
  // No panel node → bssInit is a complete no-op.
  const b = makeBox({ presentIds: [] });
  b.api.bssInit();
  deepEq(b.log.domGet, ['bss-panel'], 'without #bss-panel bssInit stops at the first lookup');
  deepEq(b.log.storageReads, [], 'without #bss-panel bssInit reads no storage');
  deepEq(b.log.service, [], 'without #bss-panel bssInit reaches neither the service nor the state');
})();

(function () {
  // Feature flag OFF → the panel is hidden and nothing else happens.
  const b = makeBox({ storage: { 'apex_ff_backend_scanner_snapshot': '0' } });
  b.api.bssInit();
  deepEq(b.log.domWrites, ['#bss-panel.style.display=none'],
         'with the flag OFF bssInit hides the panel and writes nothing else');
  ok(b.log.service.indexOf('bssStartPolling') < 0, 'with the flag OFF no polling is started');
  ok(b.log.service.indexOf('bssState') < 0, 'with the flag OFF no state is created');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 14. SERVICE → UI BRIDGE
// ─────────────────────────────────────────────────────────────────────────────
section('14. service → UI bridge');

// The service is the byte-identical artefact this PR must not touch.
(function () {
  const serviceCalls = ['bssFetchStatus', 'bssFetchSnapshot', 'bssFetchCoverage'];
  serviceCalls.forEach(function (n) {
    const code = codeOf(n);
    eq((code.match(/\bbssRender\s*\(/g) || []).length, 1, n + ' calls bssRender exactly once');
    ok(!/typeof\s+bssRender/.test(code), 'D10 — ' + n + ' calls bssRender with NO typeof guard (a hard dependency)');
    ok(/finally\s*\{[\s\S]*bssRender\s*\(\s*\)\s*;[\s\S]*?\}/.test(code),
       n + ' calls bssRender inside its `finally` — one render after success AND after failure');
  });
  eq((codeOf('bssRefresh').match(/\bbssRender\b/g) || []).length, 0, 'bssRefresh does NOT render directly');
  eq((codeOf('bssStartPolling').match(/\bbssRender\b/g) || []).length, 0,
     'bssStartPolling does not render directly — it renders THROUGH the two readers it calls');
  eq((codeOf('bssStopPolling').match(/\bbssRender\b/g) || []).length, 0, 'bssStopPolling never renders');
  const fromService = Array.from(callersOf('bssRender').keys()).filter(function (c) {
    return BSS_SERVICE_ALL.indexOf(c) >= 0;
  }).sort();
  deepEq(fromService, ['bssFetchCoverage', 'bssFetchSnapshot', 'bssFetchStatus'],
         'exactly three service functions call bssRender');
  deepEq(callerNames('bssRender').sort(),
         ['bssFetchCoverage', 'bssFetchSnapshot', 'bssFetchStatus', 'bssInit', 'bssToggleCollapse'],
         'bssRender has exactly five callers: three in the service, two in the UI');
})();

pending((function () {
  // Success path: one fetch, one commit, one render.
  const b = makeServiceBox({ payload: { ok: true, schedulerEnabled: true } });
  return b.api.bssFetchStatus().then(function () {
    eq(b.log.render, 1, 'a successful bssFetchStatus renders exactly once');
    eq(b.log.fetches.length, 1, 'a successful bssFetchStatus issues exactly one GET');
    ok(/\/scanner\/status$/.test(b.log.fetches[0]), 'the status reader hits GET /scanner/status');
    eq(b.S.backendScanner.fetchingStatus, false, 'the fetching flag is cleared');
    eq(b.S.backendScanner.statusPromise, null, 'the single-flight promise slot is cleared');
    eq(b.S.backendScanner.statusError, null, 'no error is recorded on success');
  });
})());

pending((function () {
  // Error path: still exactly one render, from the finally.
  const b = makeServiceBox({ fetch: function () { return Promise.reject(new Error('network down')); } });
  return b.api.bssFetchSnapshot().then(function () {
    eq(b.log.render, 1, 'a FAILED bssFetchSnapshot still renders exactly once (the finally always runs)');
    eq(b.S.backendScanner.snapshotError, 'network down', 'the error message is committed to state');
    eq(b.S.backendScanner.fetchingSnapshot, false, 'the fetching flag is cleared on failure');
    eq(b.S.backendScanner.snapshotPromise, null, 'the single-flight slot is cleared on failure');
  });
})());

pending((function () {
  // Abort path: an AbortSignal.timeout rejection is an ordinary failure here.
  const b = makeServiceBox({
    fetch: function () { const e = new Error('The operation timed out.'); e.name = 'TimeoutError'; return Promise.reject(e); },
  });
  return b.api.bssFetchCoverage().then(function () {
    eq(b.log.render, 1, 'an ABORTED bssFetchCoverage still renders exactly once');
    eq(b.S.backendScanner.coverage, null, 'an aborted coverage read clears the coverage payload');
    ok(b.log.warns.some(function (w) { return /timed out/.test(w); }), 'the abort is classified and warned about');
  });
})());

pending((function () {
  // HTTP error path.
  const b = makeServiceBox({
    fetch: function () { return Promise.resolve({ ok: false, status: 503, json: function () { return Promise.resolve({}); } }); },
  });
  return b.api.bssFetchStatus().then(function () {
    eq(b.log.render, 1, 'an HTTP-error bssFetchStatus renders exactly once');
    eq(b.S.backendScanner.statusError, 'HTTP 503', 'the HTTP status is recorded as the error');
  });
})());

pending((function () {
  // A MISSING bssRender is a hard failure: the reader rejects.
  const b = makeServiceBox({ bssRender: null, payload: { ok: true } });
  return b.api.bssFetchStatus().then(function () {
    ok(false, 'a missing bssRender should have rejected the reader');
  }, function (e) {
    ok(/FORBIDDEN_GLOBAL:bssRender|bssRender is not defined/.test(String(e)),
       'D10 — with bssRender ABSENT the service reader REJECTS (there is no typeof guard)');
    eq(b.S.backendScanner.status && b.S.backendScanner.status.ok, true,
       'the payload was already COMMITTED before the missing renderer threw');
    eq(b.S.backendScanner.fetchingStatus, false, 'the fetching flag was cleared before the renderer ran');
    eq(b.S.backendScanner.statusPromise, null, 'the single-flight slot was cleared before the renderer ran');
  });
})());

pending((function () {
  // A THROWING bssRender rejects too, but leaves the reader clean.
  const b = makeServiceBox({ bssRender: function () { throw new Error('render boom'); }, payload: { ok: true } });
  return b.api.bssFetchSnapshot().then(function () {
    ok(false, 'a throwing bssRender should have rejected the reader');
  }, function (e) {
    ok(/render boom/.test(String(e)), 'a THROWING bssRender propagates out of the reader');
    eq(b.S.backendScanner.fetchingSnapshot, false, 'the reader is left clean — the flag is cleared');
    eq(b.S.backendScanner.snapshotPromise, null, 'the reader is left clean — the promise slot is cleared');
  });
})());

pending((function () {
  // Polling: two readers per tick, one render each; stop performs no render.
  const b = makeServiceBox({ payload: { ok: true } });
  b.api.bssStartPolling();
  return Promise.resolve().then(function () {}).then(function () {}).then(function () {
    ok(b.log.timers.indexOf('setInterval:60000') >= 0, 'bssStartPolling installs the 60 s interval');
    eq(b.log.fetches.length, 2, 'bssStartPolling immediately fetches status AND snapshot once');
    const renders = b.log.render;
    b.api.bssStopPolling();
    eq(b.log.render, renders, 'bssStopPolling performs NO render');
    ok(b.log.timers.some(function (t) { return /^clearInterval/.test(t); }), 'bssStopPolling clears the interval');
    eq(b.S.backendScanner.timerId, null, 'bssStopPolling nulls the timer id');
  });
})());

// D9 — the DOM side effect that STAYED in the service.
(function () {
  const code = bodyOf('bssRefresh');
  ok(code.indexOf("document.getElementById('bss-refresh')") >= 0,
     'D9 — bssRefresh reaches into the DOM for #bss-refresh');
  ok(/btn\.disabled\s*=\s*true/.test(code), 'D9 — bssRefresh disables the refresh button');
  ok(/setTimeout\(function\s*\(\)\s*\{[^}]*b\.disabled\s*=\s*false;[^}]*\},\s*1500\)/.test(code.replace(/\s+/g, ' ')) ||
     /1500/.test(code), 'D9 — bssRefresh re-enables the button after 1500 ms');
  ok(/getElementById\('bss-refresh'\)[\s\S]*getElementById\('bss-refresh'\)/.test(code),
     'D9 — the node is looked up AGAIN inside the timeout, so a re-rendered button is still re-enabled');
  eq((code.match(/document\./g) || []).length, 2, 'D9 — bssRefresh is the ONLY service function touching the DOM, twice');
  BSS_SERVICE_ALL.filter(function (n) { return n !== 'bssRefresh'; }).forEach(function (n) {
    ok(!/\bdocument\b/.test(codeOf(n)), n + ' (service) touches no DOM');
  });
})();

(function () {
  // The refresh side effect, measured live.
  const b = makeServiceBox({ payload: { ok: true } });
  b.api.bssRefresh();
  deepEq(b.log.domGet, ['bss-refresh'], 'bssRefresh looks up exactly #bss-refresh');
  deepEq(b.log.domWrites, ['#bss-refresh.disabled=true'], 'bssRefresh disables the button synchronously');
  deepEq(b.log.timers, ['setTimeout:1500'], 'bssRefresh schedules exactly one 1500 ms re-enable timer');
  eq(b.log.fetches.length, 2, 'bssRefresh triggers exactly two GETs: status and snapshot');
  ok(b.log.fetches.some(function (u) { return /\/scanner\/status$/.test(u); }), 'bssRefresh re-fetches /scanner/status');
  ok(b.log.fetches.some(function (u) { return /\/scanner\/snapshot$/.test(u); }), 'bssRefresh re-fetches /scanner/snapshot');
  ok(!b.log.fetches.some(function (u) { return /coverage/.test(u); }), 'bssRefresh does NOT re-fetch coverage');
  ok(!b.log.fetches.some(function (u) { return /\/scanner\/run/.test(u); }), 'bssRefresh NEVER posts /scanner/run');
})();

(function () {
  // The refresh button node missing: no crash, no timer.
  const b = makeServiceBox({ presentIds: [], payload: { ok: true } });
  let threw = null;
  try { b.api.bssRefresh(); } catch (e) { threw = String(e); }
  eq(threw, null, 'a missing #bss-refresh node does not break bssRefresh');
  deepEq(b.log.timers, [], 'with the node missing no re-enable timer is scheduled');
  eq(b.log.fetches.length, 2, 'the two GETs still happen without the button');
})();

(function () {
  // Refresh while a request is already in flight: the single-flight join means
  // no second request, and the button is still disabled.
  let resolveFetch;
  const b = makeServiceBox({
    fetch: function () { return new Promise(function (r) { resolveFetch = function () { r({ ok: true, status: 200, json: function () { return Promise.resolve({ ok: true }); } }); }; }); },
  });
  b.api.bssRefresh();
  const firstCount = b.log.fetches.length;
  b.api.bssRefresh();
  eq(b.log.fetches.length, firstCount,
     'a second bssRefresh while requests are in flight issues NO extra request (single-flight join)');
  eq(b.log.domWrites.length, 2, 'the button is disabled again by the second refresh (the DOM effect is not de-duplicated)');
  eq(b.log.timers.length, 2, 'the second refresh schedules a second re-enable timer');
  resolveFetch();
})();

(function () {
  // After bssStopPolling, a manual refresh still works: the DOM effect is not
  // tied to the polling lifecycle.
  const b = makeServiceBox({ payload: { ok: true } });
  b.api.bssStopPolling();
  b.api.bssRefresh();
  deepEq(b.log.domWrites, ['#bss-refresh.disabled=true'], 'bssRefresh still disables the button after bssStopPolling');
  eq(b.log.fetches.length, 2, 'bssRefresh still fetches after bssStopPolling');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 15. UI → BDSP BRIDGE
// ─────────────────────────────────────────────────────────────────────────────
section('15. UI → BDSP bridge');

(function () {
  const code = codeOf('bssRender');
  const raw = bodyOf('bssRender');
  eq((code.match(/\bbdspRender\b/g) || []).length, 2,
     'bssRender mentions bdspRender exactly twice: the typeof guard and the call');
  ok(/typeof\s+bdspRender\s*===\s*'function'/.test(raw),
     'D10 — the BDSP bridge IS guarded with a typeof check (unlike the service → bssRender edge)');
  const guardIdx = raw.indexOf('typeof bdspRender');
  ok(guardIdx > raw.indexOf('bssRenderHeadBadges()'), 'the BDSP call comes AFTER the BSS head badges render');
  ok(guardIdx > raw.indexOf('bssBodyHtml()'), 'the BDSP call comes AFTER the BSS body render');
  ok(raw.lastIndexOf('bdspRender') > raw.lastIndexOf('body.scrollTop'),
     'the BDSP call is the LAST statement of bssRender');
  const bdspCallers = Array.from(callersOf('bdspRender').keys()).sort();
  deepEq(bdspCallers, ['bdspInit', 'bdspRefresh', 'bdspSetEnabled', 'bssRender'],
         'bdspRender has exactly four callers — three inside the BDSP module and bssRender');
  eq(BSS_UI_ALL.filter(function (n) { return /\bbdsp/.test(codeOf(n)); }).length, 1,
     'exactly ONE BSS UI declaration references the BDSP module at all');
  ok(!/\bbds[A-Z]/.test(REGION_CODE), 'no BSS UI declaration touches the BDS ADAPTER directly');
})();

(function () {
  // BDSP absent: bssRender completes anyway.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: false }, { bdspRender: undefined });
  delete b.box.store.bdspRender;
  let threw = null;
  try { b.api.bssRender(); } catch (e) { threw = String(e); }
  eq(threw, null, 'with bdspRender ABSENT bssRender completes without throwing (the typeof guard holds)');
  ok(b.elements['bss-body']._html.length > 0, 'the BSS body still rendered without BDSP');
})();

(function () {
  // BDSP throwing: the exception propagates — measured, not corrected.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: false },
                      { bdspRender: function () { throw new Error('bdsp boom'); } });
  let threw = null;
  try { b.api.bssRender(); } catch (e) { threw = String(e); }
  ok(threw !== null && /bdsp boom/.test(threw),
     'a THROWING bdspRender propagates out of bssRender — there is no try/catch around the bridge');
  ok(b.elements['bss-body']._html.length > 0,
     'because the bridge is last, the whole BSS panel is already painted when BDSP throws');
})();

(function () {
  // No recursion: bdspRender never calls back into bssRender.
  ok(!/\bbssRender\b/.test(PREVIEW_SRC), 'the BDSP module never calls bssRender — the bridge is one-way');
  ok(!/\bbssRender\b/.test(ADAPTER_SRC), 'the BDS adapter never calls bssRender');
  const previewCode = stripCommentsAndStrings(PREVIEW_SRC);
  ok(/renderScanResults/.test(previewCode),
     'bdspRender CAN reach the frontend scanner results renderer — that path is BDSP-owned, not BSS-owned');
  ok(!/renderScanResults/.test(REGION_CODE),
     'no BSS UI declaration calls renderScanResults itself');
})();

(function () {
  // One render → exactly one bridge call, never more.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: false });
  b.api.bssRender();
  b.api.bssRender();
  eq(b.log.bdsp.length, 2, 'two bssRender calls produce exactly two bdspRender calls — no amplification');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 16. HELPERS SHARED WITH BDSP (and DSB)
// ─────────────────────────────────────────────────────────────────────────────
section('16. shared helpers');

(function () {
  const consumers = {
    bssNum: ['bdspFmtNum'],
    bssFmtAgeMs: ['bdspFmtAge', 'dsbFmtAge'],
    bssFmtClock: ['bdspFmtClock', 'dsbFmtClock'],
  };
  SHARED_HELPERS.forEach(function (h) {
    const external = callerNames(h).filter(function (c) { return BSS_UI_ALL.indexOf(c) < 0; }).sort();
    deepEq(external, consumers[h].slice().sort(), h + ' has exactly these EXTERNAL consumers: ' + consumers[h].join(', '));
  });
  // D7 — the DSB consumers the brief did not expect.
  ok(consumers.bssFmtAgeMs.indexOf('dsbFmtAge') >= 0 && consumers.bssFmtClock.indexOf('dsbFmtClock') >= 0,
     'D7 — dsbFmtAge / dsbFmtClock are a THIRD consumer of the shared formatters, beyond BDSP');
  eq(partOf(declStart('dsbFmtAge')), '(inline)', 'the DSB formatters are inline, in the same script as the helpers today');
  eq(partOf(declStart('bdspFmtNum')), PREVIEW_REL, 'the BDSP formatters live in the extracted preview module');
})();

(function () {
  // Every consumer guards with typeof and carries its own fallback.
  const guards = {
    bdspFmtNum: 'bssNum', bdspFmtAge: 'bssFmtAgeMs', bdspFmtClock: 'bssFmtClock',
    dsbFmtAge: 'bssFmtAgeMs', dsbFmtClock: 'bssFmtClock',
  };
  Object.keys(guards).forEach(function (fn) {
    const raw = bodyOf(fn);
    ok(new RegExp("typeof\\s+" + guards[fn] + "\\s*===\\s*'function'").test(raw),
       fn + ' guards its use of ' + guards[fn] + ' with a typeof check');
    ok(raw.indexOf('—') >= 0, fn + ' carries its own em-dash fallback when the helper is missing');
  });
})();

(function () {
  // The silent-fallback hazard, demonstrated: absent helper → a DIFFERENT string.
  const box = makeStrictSandbox({ Date: Date, Math: Math, isFinite: isFinite, String: String, Number: Number });
  vm.runInContext(realSourceOf('bdspFmtAge'), box.context);
  vm.runInContext(realSourceOf('bdspFmtClock'), box.context);
  vm.runInContext(realSourceOf('bdspFmtNum'), box.context);
  const withoutHelpers = {
    age: vm.runInContext('bdspFmtAge(65000)', box.context),
    clock: vm.runInContext('bdspFmtClock(0)', box.context),
    num: vm.runInContext('bdspFmtNum(1.239, 2)', box.context),
  };
  const box2 = makeStrictSandbox({ Date: Date, Math: Math, isFinite: isFinite, String: String, Number: Number });
  SHARED_HELPERS.forEach(function (h) { vm.runInContext(realSourceOf(h), box2.context); });
  ['bdspFmtAge', 'bdspFmtClock', 'bdspFmtNum'].forEach(function (n) { vm.runInContext(realSourceOf(n), box2.context); });
  const withHelpers = {
    age: vm.runInContext('bdspFmtAge(65000)', box2.context),
    clock: vm.runInContext('bdspFmtClock(0)', box2.context),
    num: vm.runInContext('bdspFmtNum(1.239, 2)', box2.context),
  };
  eq(withHelpers.age, '1m 05s', 'with the helper present bdspFmtAge produces the BSS format');
  eq(withoutHelpers.age, '65000', 'with the helper MISSING bdspFmtAge silently degrades to the raw number');
  ok(withHelpers.age !== withoutHelpers.age,
     'the fallback is SILENT but VISIBLE in the output — losing the helper changes what the preview shows');
  eq(withHelpers.num, '1.24', 'with the helper present bdspFmtNum uses bssNum precision');
  eq(withoutHelpers.num, '1.239', 'with the helper MISSING bdspFmtNum loses the precision contract');
  ok(withHelpers.clock !== withoutHelpers.clock, 'bdspFmtClock also degrades observably without bssFmtClock');
})();

(function () {
  // The helpers themselves are order-independent: pure, intrinsic-only.
  SHARED_HELPERS.forEach(function (h) {
    const free = freeGlobals(codeOf(h), new Set([h]));
    const appLevel = free.filter(function (g) {
      return ['Math', 'Number', 'String', 'Array', 'Date', 'isFinite', 'Infinity'].indexOf(g) < 0;
    });
    deepEq(appLevel, [], h + ' depends on NO application global — its position in the script order is free');
  });
  ok(declStart('bdspFmtNum') < declStart('bssNum'),
     'today bdspFmtNum is declared BEFORE bssNum (an earlier script) and still resolves it at call time');
  ok(declStart('dsbFmtAge') < declStart('bssFmtAgeMs'),
     'today dsbFmtAge is declared BEFORE bssFmtAgeMs (same script, earlier) and still resolves it at call time');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 17. DOM INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
section('17. DOM inventory');

(function () {
  const OWNERS = {
    'bss-panel':       { markup: true, queriedBy: ['bssApplyCollapse', 'bssInit', 'bssRender'], writes: ['style.display', 'classList.toggle(bss-open)'] },
    'bss-head':        { markup: true, queriedBy: [], writes: [] },
    'bss-chev':        { markup: true, queriedBy: [], writes: [] },
    'bss-head-badges': { markup: true, queriedBy: ['bssRenderHeadBadges'], writes: ['innerHTML'] },
    'bss-refresh':     { markup: true, queriedBy: ['bssRefresh'], writes: ['disabled'] },
    'bss-body':        { markup: true, queriedBy: ['bssApplyCollapse', 'bssRender'], writes: ['innerHTML', 'style.display', 'scrollTop'] },
  };
  const markupIds = Array.from(new Set((MARKUP.match(/id="(bss-[a-z-]+)"/g) || [])
    .map(function (m) { return /"([^"]+)"/.exec(m)[1]; })));
  deepEq(markupIds, DOM_IDS_ALL, 'index.html markup declares exactly the six bss-* ids, in document order');
  deepEq(Object.keys(OWNERS).sort(), DOM_IDS_ALL.slice().sort(), 'the ownership table covers every markup id');

  Object.keys(OWNERS).forEach(function (id) {
    const queried = SPANS.map(function (s) { return s.name; }).filter(function (n) {
      const b = bodyOf(n);
      return b != null && b.indexOf("getElementById('" + id + "')") >= 0;
    }).sort();
    deepEq(queried, OWNERS[id].queriedBy.slice().sort(),
           '#' + id + ' is queried by exactly: ' + (OWNERS[id].queriedBy.join(', ') || '(nobody — markup/CSS only)'));
  });
  DOM_IDS_MARKUP_ONLY.forEach(function (id) {
    ok(SRC.indexOf("getElementById('" + id + "')") < 0,
       '#' + id + ' is never queried by any JavaScript — it is markup + CSS only');
  });
  deepEq(DOM_IDS_UI.slice().sort(), ['bss-body', 'bss-head-badges', 'bss-panel'].sort(),
         'the future UI module would own exactly three DOM ids');
  eq(DOM_ID_SERVICE, 'bss-refresh', 'the fourth queried id, #bss-refresh, stays with the SERVICE');
})();

(function () {
  // Missing-node fallbacks, one per id, measured.
  const b = withState({ status: status(), snapshot: snapshot(), collapsed: false }, { presentIds: [] });
  let threw = null;
  try { b.api.bssRender(); b.api.bssRenderHeadBadges(); b.api.bssApplyCollapse(); b.api.bssInit(); }
  catch (e) { threw = String(e); }
  eq(threw, null, 'with NO bss-* node present every UI entry point is a silent no-op');
})();

(function () {
  // Initial DOM state, from the markup itself.
  const panelTag = /<div id="bss-panel"[^>]*>/.exec(MARKUP);
  ok(panelTag && /style="display:none"/.test(panelTag[0]),
     'the panel starts hidden in markup (style="display:none") — bssInit is what reveals it');
  const bodyTag = /<div class="bss-body" id="bss-body"[^>]*>/.exec(MARKUP);
  ok(bodyTag && /style="display:none"/.test(bodyTag[0]),
     'the body starts hidden in markup, matching the collapsed:true default');
  ok(!/class="[^"]*bss-open/.test(MARKUP), 'the panel does NOT start with the bss-open class');
  ok(/<span class="bss-head-badges" id="bss-head-badges"><\/span>/.test(MARKUP),
     'the head-badges container starts empty');
  ok(/<div class="bss-body" id="bss-body"[^>]*><\/div>/.test(MARKUP), 'the body container starts empty');
})();

// The UI never creates, removes or queries anything outside its three ids.
(function () {
  const domApis = REGION_CODE.match(/document\.[A-Za-z]+/g) || [];
  deepEq(Array.from(new Set(domApis)).sort(), ['document.getElementById'],
         'the ONLY DOM API the UI uses is document.getElementById');
  ok(!/createElement|appendChild|removeChild|insertAdjacent|querySelector|addEventListener/.test(REGION_CODE),
     'the UI creates no nodes, removes no nodes, and registers no listeners');
  const ids = Array.from(new Set((REGION.match(/getElementById\('([^']+)'\)/g) || [])
    .map(function (m) { return /'([^']+)'/.exec(m)[1]; }))).sort();
  deepEq(ids, DOM_IDS_UI.slice().sort(), 'the UI queries exactly its three ids and nothing else');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 18. MARKUP HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
section('18. markup handlers');

(function () {
  const handlers = (MARKUP.match(/on[a-z]+="[^"]*bss[A-Za-z]*[^"]*"/g) || []);
  deepEq(handlers, ['onclick="bssToggleCollapse()"', 'onclick="event.stopPropagation();bssRefresh()"'],
         'the markup carries exactly two bss handlers, in document order');
  ok(MARKUP.indexOf('id="bss-head" onclick="bssToggleCollapse()"') >= 0,
     'the collapse handler is on the panel HEADER');
  ok(/id="bss-refresh" onclick="event\.stopPropagation\(\);bssRefresh\(\)"/.test(MARKUP),
     'the refresh handler is on the refresh BUTTON and stops propagation so it does not also collapse the panel');
  // A static onclick can only reach a GLOBAL function: this is the constraint
  // that forbids wrapping a future module in an IIFE or a module scope.
  ok(!/\bwindow\.bss/.test(MARKUP), 'the handlers call bare global names, not window.* properties');
  ok(!/bssRender|bssInit|bssApplyCollapse/.test(MARKUP),
     'no other BSS function is referenced from markup');
  // Both handler targets must therefore stay reachable as globals.
  eq(partOf(declStart('bssToggleCollapse')), '(inline)', 'bssToggleCollapse — a markup target — is inline today');
  eq(partOf(declStart('bssRefresh')), SERVICE_REL, 'bssRefresh — the other markup target — already lives in a module and still works as a global');
  ok(!/^\s*\(function|^\s*['"]use strict['"]/.test(SERVICE_SRC.split('\n').filter(function (l) { return l.trim() && !/^\s*\/\//.test(l); })[0] || ''),
     'the service module is a plain classic script with no IIFE and no "use strict" — that is why its globals stay reachable from markup');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 19. CSS OWNERSHIP
// ─────────────────────────────────────────────────────────────────────────────
section('19. CSS ownership');

(function () {
  const cssClasses = Array.from(new Set((CSS.match(/\.(bss-[a-zA-Z0-9-]+)/g) || [])
    .map(function (m) { return m.slice(1); }))).sort();
  const EXPECTED_CSS = ['bss-b', 'bss-b-err', 'bss-b-info', 'bss-b-muted', 'bss-b-off', 'bss-b-ok', 'bss-b-pu',
    'bss-b-warn', 'bss-badge', 'bss-badge-diag', 'bss-body', 'bss-chev', 'bss-chips', 'bss-empty', 'bss-err-box',
    'bss-grid', 'bss-head', 'bss-head-badges', 'bss-k', 'bss-kv', 'bss-open', 'bss-panel', 'bss-refresh',
    'bss-sub', 'bss-tbl', 'bss-tbl-wrap', 'bss-title', 'bss-v'];
  deepEq(cssClasses, EXPECTED_CSS, 'index.html defines exactly these 28 bss-* CSS classes');

  // Classes emitted by the JS must all exist in the CSS.
  const jsClasses = Array.from(new Set(
    ((REGION.match(/class="([^"]*)"/g) || []).join(' ').match(/bss-[a-z0-9-]+/g) || [])
      .concat((REGION.match(/'(bss-b[a-z-]*)'/g) || []).map(function (m) { return m.slice(1, -1); }))
      .concat(['bss-open'])
  )).sort();
  const missing = jsClasses.filter(function (c) { return cssClasses.indexOf(c) < 0; });
  deepEq(missing, [], 'every class the BSS UI emits has a CSS rule in index.html');

  // Classes that exist only for the static markup — they must NOT travel with a
  // future JS module.
  const markupOnly = EXPECTED_CSS.filter(function (c) { return jsClasses.indexOf(c) < 0; }).sort();
  deepEq(markupOnly, ['bss-badge', 'bss-badge-diag', 'bss-chev', 'bss-head', 'bss-head-badges', 'bss-panel',
                      'bss-refresh', 'bss-title'],
         'eight bss-* classes belong to the STATIC markup only — the JS never emits them, it reaches those nodes by id');

  // Shared with BDSP: the badge palette is reused by the preview, which is why
  // the CSS cannot move into a BSS-only module.
  ok(/bdsp-b bss-b-pu/.test(MARKUP), 'the BDSP markup reuses the bss-b-pu badge class');
  ok(/bdsp-b bss-b-muted/.test(MARKUP), 'the BDSP markup reuses the bss-b-muted badge class');
  ok(PREVIEW_SRC.indexOf("'bss-b-muted'") >= 0 || PREVIEW_SRC.indexOf('bss-b-muted') >= 0,
     'the BDSP module emits bss-b-* classes at runtime too — the palette is shared');
  ok(CSS.indexOf('.bss-b{') >= 0, 'the shared .bss-b base rule lives in index.html and must stay there');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 20. HTML ESCAPING
// ─────────────────────────────────────────────────────────────────────────────
section('20. escaping');

(function () {
  const escBody = bodyOf('escHtml');
  ok(/&amp;/.test(escBody) && /&lt;/.test(escBody) && /&gt;/.test(escBody) && /&quot;/.test(escBody),
     'escHtml replaces & < > and "');
  ok(escBody.indexOf('&#39;') < 0 && escBody.indexOf('&apos;') < 0,
     'D11 — escHtml does NOT escape the single quote (pinned as the current tolerance, not fixed)');
  eq(declStart('escHtml') > REGION_END, true, 'escHtml is declared AFTER the region — a late-bound dependency');
  eq(partOf(declStart('escHtml')), '(inline)', 'escHtml stays in the inline monolith');
  const escUsers = BSS_UI_ALL.filter(function (n) { return /\bescHtml\b/.test(codeOf(n)); }).sort();
  deepEq(escUsers, ['bssBadge', 'bssBodyHtml', 'bssCandidateTableHtml', 'bssKV', 'bssKVt'].sort(),
         'exactly five BSS UI declarations call escHtml directly');
  ok(!/function\s+bss[A-Za-z]*Esc|escapeHtml|htmlEscape/.test(REGION_CODE),
     'the BSS UI defines NO escaping helper of its own — it must keep using the monolith\'s escHtml');
})();

(function () {
  const A = makeBox().api;
  const ESCAPED_LT = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;\'&quot;';

  // Every backend-sourced field the audit brief names, probed with the payload.
  eq(A.bssBadge(XSS, 'bss-b-ok'), '<span class="bss-b bss-b-ok">' + ESCAPED_LT + '</span>',
     'a badge label is escaped (& < > " escaped; the apostrophe is not)');
  ok(A.bssKVt('k', XSS).indexOf(ESCAPED_LT) >= 0, 'a bssKVt value is escaped');

  // symbol, cache source, cache reason.
  (function () {
    const html = A.bssCandidateTableHtml([{ symbol: XSS, cache: { candleCount: 1, source: XSS, reason: XSS } }]);
    ok(html.indexOf('<img src=x') < 0, 'a hostile SYMBOL never reaches the DOM unescaped');
    ok(html.indexOf('&lt;img src=x') >= 0, 'the hostile symbol is escaped');
    eq((html.match(/&lt;img src=x/g) || []).length, 3, 'symbol, cache source AND cache reason are all escaped');
    ok(html.indexOf('onerror=&quot;') >= 0, 'the double quotes inside the payload are escaped');
    ok(html.indexOf("'") >= 0, 'D11 — the apostrophe survives unescaped, as escHtml intends today');
  })();

  // direction, parity and RS come through the badge/format path.
  (function () {
    const html = A.bssCandidateTableHtml([{
      symbol: 'S',
      directionDiagnostics: { candidateDirection: XSS },
      directionParity: XSS,
      relativeStrengthVsSpy: XSS,
    }]);
    ok(html.indexOf('<img src=x') < 0, 'hostile direction / parity / RS values never reach the DOM unescaped');
    ok(html.indexOf('&lt;IMG SRC=X') >= 0 || html.indexOf('&lt;img src=x') >= 0,
       'the direction badge upper-cases and escapes the payload');
  })();

  // topSymbols, both shapes.
  eq(A.bssTopSymbolsHtml({ topSymbols: [XSS] }).indexOf('<img src=x'), -1, 'a hostile string topSymbol is escaped');
  eq(A.bssTopSymbolsHtml({ topSymbols: [{ symbol: XSS }] }).indexOf('<img src=x'), -1, 'a hostile object topSymbol is escaped');

  // status/snapshot errors, reason, universe source, market session, warnings.
  (function () {
    const b = withState({
      status: status({ universeSource: XSS, lastError: XSS, lastSchedulerError: XSS, lastSchedulerSkipReason: XSS }),
      snapshot: snapshot({ marketSession: XSS,
        diagnostics: Object.assign({}, snapshot().diagnostics, { warmup: { enabled: true, reason: XSS } }) }),
      statusError: XSS, snapshotError: XSS, collapsed: false,
    });
    b.api.bssRender();
    const html = b.elements['bss-body']._html;
    ok(html.indexOf('<img src=x') < 0, 'no backend-sourced field reaches the panel body unescaped');
    ok(html.indexOf('&lt;img src=x') >= 0, 'the hostile payloads appear escaped');
    ok(html.indexOf('onerror=&quot;alert(1)&quot;') >= 0, 'quotes inside the payload are escaped in the body too');
  })();

  // The universe diagnostics block escapes the RS/DSB reason strings.
  (function () {
    const b = makeBox({
      rsbGetBackendSource: function () { return { available: false, reason: XSS }; },
      dsbGetBackendSource: function () { return { available: false, reason: XSS }; },
    });
    const html = b.api.bssUniverseDiagHtml(status(), snapshot());
    ok(html.indexOf('<img src=x') < 0, 'a hostile universe-source reason is escaped');
  })();

  // The single deliberate raw-HTML seam: bssKV's value argument.
  eq(A.bssKV('k', '<b>raw</b>').indexOf('<b>raw</b>') >= 0, true,
     'bssKV passes its vHtml through RAW — that is the composition seam, and every caller escapes first');
  const kvCallers = BSS_UI_ALL.filter(function (n) { return n !== 'bssKVt' && /\bbssKV\s*\(/.test(codeOf(n)); });
  kvCallers.forEach(function (n) {
    ok(/escHtml|bssBadge|bssRankEligBadge|bssTopSymbolsHtml|bssFreshness/.test(codeOf(n)),
       n + ' only feeds bssKV values it produced through an escaping builder');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 21. S.scanData
// ─────────────────────────────────────────────────────────────────────────────
section('21. S.scanData');

ok(REGION_CODE.indexOf('scanData') < 0, 'the string "scanData" does not appear anywhere in the BSS UI code');
ok(!/\bS\b/.test(freeGlobals(REGION_CODE, new Set(BSS_UI_ALL)).join(' ')),
   'D5 — `S` is not even reachable from the BSS UI: it cannot touch S.scanData by construction');

(function () {
  // Deep write guard on the WHOLE of S during a full bootstrap + render cycle.
  const frontendRows = [{ ticker: 'FRONTEND', score: 1 }, { ticker: 'OTHER', score: 2 }];
  const realS = { scanData: frontendRows, backendScanner: null };
  const g = makeWriteGuard();
  const b = makeBox({ S: realS, storage: { 'apex_bss_collapsed': '0' } });
  // Re-seed the sandbox's S with a guarded view of scanData only: the state slot
  // must stay writable so bssState() can create it, which is exactly the ONE
  // write the UI is allowed to cause.
  b.box.store.S = {
    get scanData() { return g.guard(frontendRows, 'S.scanData'); },
    set scanData(v) { g.writes.push('S.scanData (set)'); },
    backendScanner: null,
  };
  b.api.bssInit();
  b.api.bssRender();
  b.api.bssToggleCollapse();
  deepEq(g.writes, [], 'a full bootstrap + render + toggle cycle performs ZERO writes to S.scanData or its rows');
  deepEq(frontendRows.map(function (r) { return r.ticker; }), ['FRONTEND', 'OTHER'],
         'the frontend scanner rows are untouched and un-reordered');
  eq(frontendRows.length, 2, 'no backend candidate was appended to S.scanData');
})();

(function () {
  // Nor does the BSS UI hand rows to the frontend scanner renderer.
  ok(REGION_CODE.indexOf('renderScanResults') < 0, 'the BSS UI never calls renderScanResults');
  ok(REGION_CODE.indexOf('runScan') < 0, 'the BSS UI never triggers a frontend scan');
  ok(!/\bS\.activeFilter\b|\bS\.sortKey\b|\bS\.selectedTicker\b/.test(REGION_CODE),
     'the BSS UI touches no frontend-scanner state at all');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 22. SNAPSHOT PRESERVATION
// ─────────────────────────────────────────────────────────────────────────────
section('22. snapshot preservation');

(function () {
  const snap = snapshot({ candidates: [candidate({ symbol: 'A' }), candidate({ symbol: 'B', scoreDiagnostics: { scorePreview: 99 } })] });
  const originalOrder = snap.candidates.map(function (c) { return c.symbol; });
  const originalJson = JSON.stringify(snap);
  const g = makeWriteGuard();
  const b = makeBox();
  b.S.backendScanner = { collapsed: false, status: status(), statusError: null, snapshotError: null };
  Object.defineProperty(b.S.backendScanner, 'snapshot', {
    get: function () { return g.guard(snap, 'snapshot'); },
    set: function () { g.writes.push('snapshot (set)'); },
    enumerable: true, configurable: true,
  });
  b.api.bssRender();
  b.api.bssRenderHeadBadges();
  deepEq(g.writes, [], 'a full render performs ZERO writes anywhere inside the snapshot tree');
  deepEq(snap.candidates.map(function (c) { return c.symbol; }), originalOrder,
         'the source candidates array keeps its original order after rendering (the sort is on a copy)');
  eq(JSON.stringify(snap), originalJson, 'the snapshot is byte-identical after rendering');
  ok(b.elements['bss-body']._html.indexOf('<strong>B</strong>') <
     b.elements['bss-body']._html.indexOf('<strong>A</strong>'),
     'the RENDERED table is nevertheless sorted (B before A) — the reorder lives only in the derived copy');
})();

ok(!/\bsnapshot\s*\.\s*candidates\s*=[^=]/.test(REGION_CODE), 'the UI never assigns snapshot.candidates');
ok(!/\bsnap\s*\.\s*candidates\s*=[^=]/.test(REGION_CODE), 'the UI never assigns snap.candidates');
ok(!/\bst\s*\.\s*snapshot\s*=[^=]/.test(REGION_CODE), 'the UI never assigns S.backendScanner.snapshot');
ok(!/\.candidates\s*\.\s*(?:sort|reverse|splice|push|pop|shift|unshift)\s*\(/.test(REGION_CODE),
   'the UI never mutates any candidates array in place');

// ─────────────────────────────────────────────────────────────────────────────
// 23. STATUS PRESERVATION
// ─────────────────────────────────────────────────────────────────────────────
section('23. status preservation');

(function () {
  const st = status();
  const originalJson = JSON.stringify(st);
  const g = makeWriteGuard();
  const b = makeBox();
  b.S.backendScanner = { collapsed: false, snapshot: snapshot(), statusError: null, snapshotError: null };
  Object.defineProperty(b.S.backendScanner, 'status', {
    get: function () { return g.guard(st, 'status'); },
    set: function () { g.writes.push('status (set)'); },
    enumerable: true, configurable: true,
  });
  b.api.bssRender();
  b.api.bssRenderHeadBadges();
  deepEq(g.writes, [], 'a full render performs ZERO writes anywhere inside the status tree');
  eq(JSON.stringify(st), originalJson, 'the status payload is byte-identical after rendering');
})();
ok(!/\bst\s*\.\s*status\s*=[^=]/.test(REGION_CODE), 'the UI never assigns S.backendScanner.status');
ok(!/\bstatus\s*\.\s*[A-Za-z_$][\w$]*\s*=[^=]/.test(REGION_CODE), 'the UI never writes a field of the status payload');

// ─────────────────────────────────────────────────────────────────────────────
// 24. COVERAGE PRESERVATION
// ─────────────────────────────────────────────────────────────────────────────
section('24. coverage preservation');

// D6 — the panel does not render coverage at all. The Swing screen does.
ok(REGION_CODE.indexOf('coverage') < 0,
   'D6 — the string "coverage" does not appear anywhere in the BSS UI: the panel neither reads nor writes it');
ok(bodyOf('bssFetchCoverage').indexOf('st.coverage') >= 0,
   'coverage is written exclusively by the SERVICE reader bssFetchCoverage');
deepEq(callerNames('bssFetchCoverage'), ['_swingHydrateFromBackend'],
       'the coverage reader has exactly one caller — the Swing hydration, not the panel');
ok(/lastGoodCoverageStatus/.test(bodyOf('bssFetchCoverage')),
   'the coverage last-known-good cache lives in the service, on S.swing');
ok(REGION_CODE.indexOf('lastGoodCoverageStatus') < 0, 'the UI never touches the coverage cache');
ok(REGION_CODE.indexOf('S.swing') < 0 && REGION_CODE.indexOf('swing') < 0,
   'the UI never touches any Swing state');

(function () {
  // A render with a populated coverage slot leaves it exactly as it was.
  const cov = { ok: true, symbols: 500, generatedAt: '2026-07-27T12:00:00.000Z' };
  const b = withState({ status: status(), snapshot: snapshot(), coverage: cov, collapsed: false });
  const before = JSON.stringify(b.S.backendScanner.coverage);
  b.api.bssRender();
  eq(JSON.stringify(b.S.backendScanner.coverage), before, 'rendering leaves the coverage payload byte-identical');
  eq(b.S.backendScanner.coverage, cov, 'the coverage reference is unchanged');
  ok(b.elements['bss-body']._html.indexOf('500') < 0, 'the coverage payload is not rendered by this panel');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 25. NETWORK ISOLATION
// ─────────────────────────────────────────────────────────────────────────────
section('25. network isolation');

(function () {
  const FORBIDDEN = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon',
    'ttCall', '_backendAuthHeaders', 'BACKEND', 'AbortController', 'AbortSignal', 'navigator'];
  FORBIDDEN.forEach(function (t) {
    ok(!new RegExp('\\b' + t + '\\b').test(REGION_CODE), 'no BSS UI declaration references `' + t + '`');
  });
  ok(!/\/scanner\//.test(REGION_CODE),
     'no BSS UI declaration contains a /scanner/ endpoint path in CODE — every occurrence is display copy');
  ok(/GET \/scanner\/status failed/.test(REGION),
     'the /scanner/ strings inside the region are error-box COPY, not request targets');
  ok(!/\bmethod\s*:\s*'POST'/.test(REGION) && REGION.indexOf('/scanner/run') < 0,
     'no BSS UI declaration contains a POST or a /scanner/run path, in code or in copy');
  // The three GET readers belong to the service, and only there.
  ['/scanner/status', '/scanner/snapshot', '/scanner/coverage/status'].forEach(function (p) {
    ok(SERVICE_SRC.indexOf(p) >= 0, 'the service owns the ' + p + ' reader');
    ok(REGION_CODE.indexOf(p) < 0, 'the UI does not duplicate the ' + p + ' transport (it appears only as copy)');
  });
  eq((stripCommentsAndStrings(SERVICE_SRC).match(/\bfetch\s*\(/g) || []).length, 3,
     'the service performs exactly three fetch calls — one per GET reader');
  ok(!/\/scanner\/run/.test(SERVICE_SRC.replace(/\/\/[^\n]*/g, '')) || SERVICE_SRC.indexOf('NEVER POST /scanner/run') >= 0,
     '/scanner/run appears in the service only as a prohibition comment, never as a request');
})();

(function () {
  // Live proof: every network entry point in the sandbox THROWS, and a complete
  // bootstrap + render + toggle cycle never touches one.
  const b = makeBox({ storage: { 'apex_bss_collapsed': '0' } });
  b.S.backendScanner = null;
  b.api.bssInit();
  b.api.bssRender();
  b.api.bssRenderHeadBadges();
  b.api.bssToggleCollapse();
  b.api.bssToggleCollapse();
  deepEq(b.log.network, [], 'a full UI lifecycle triggers ZERO network entry points');
  deepEq(b.log.timers, [], 'a full UI lifecycle creates ZERO timers');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 26. SUBSCRIPTION ISOLATION
// ─────────────────────────────────────────────────────────────────────────────
section('26. subscription isolation');

(function () {
  const FORBIDDEN = ['subscribeDxlink', 'subscribeDxlinkQuotes', 'unsubscribeDxlink', 'dxlink', 'DXLink',
    'addEventListener', 'removeEventListener', 'onmessage', 'postMessage', 'MutationObserver',
    'IntersectionObserver', 'ResizeObserver'];
  FORBIDDEN.forEach(function (t) {
    ok(REGION_CODE.indexOf(t) < 0, 'no BSS UI declaration references `' + t + '`');
  });
  ok(!/\bsetInterval\b|\bsetTimeout\b|\brequestAnimationFrame\b|\bqueueMicrotask\b/.test(REGION_CODE),
     'the BSS UI schedules NOTHING — every timer belongs to the service');
  ok(/setInterval\(/.test(codeOf('bssStartPolling')), 'the 60 s polling interval belongs to bssStartPolling (service)');
  ok(/setTimeout\(/.test(codeOf('bssRefresh')), 'the 1500 ms re-enable timeout belongs to bssRefresh (service)');
  ok(!/\bPromise\b|\basync\b|\bawait\b/.test(REGION_CODE),
     'the BSS UI is fully synchronous: no Promise, no async, no await — it owns no single-flight and no abort');
  ['statusPromise', 'snapshotPromise', 'coveragePromise', 'AbortController', 'timerId'].forEach(function (t) {
    ok(REGION_CODE.indexOf(t) < 0, 'the UI owns no `' + t + '`');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 27. LOAD-TIME DECLARATIONS
// ─────────────────────────────────────────────────────────────────────────────
section('27. load-time declarations');

(function () {
  // Evaluating all 32 declarations in a context whose global THROWS on any
  // non-intrinsic identifier must touch nothing at all.
  const box = makeStrictSandbox();
  let threw = null;
  try {
    BSS_UI_ALL.forEach(function (n) { vm.runInContext(realSourceOf(n), box.context); });
  } catch (e) { threw = String(e); }
  eq(threw, null, 'the 32 declarations evaluate cleanly with a global that throws on every application identifier');
  deepEq(box.touched, [], 'evaluating the declarations reads ZERO globals — no S, no document, no localStorage, no fetch');
  BSS_UI_ALL.forEach(function (n) {
    eq(typeof vm.runInContext('typeof ' + n, box.context), 'string', n + ' exists after evaluation');
    eq(vm.runInContext('typeof ' + n, box.context), 'function', n + ' is a function after evaluation');
  });
})();

(function () {
  // Evaluating the WHOLE region as one text — exactly what a module file would
  // contain — is equally inert.
  const box = makeStrictSandbox();
  let threw = null;
  try { vm.runInContext(REGION, box.context); } catch (e) { threw = String(e); }
  eq(threw, null, 'the whole contiguous region evaluates cleanly in the strict sandbox');
  deepEq(box.touched, [], 'evaluating the whole region reads ZERO globals');
  eq(vm.runInContext('typeof bssInit', box.context), 'function', 'bssInit is defined but NOT invoked at load time');
  eq(vm.runInContext('typeof bssRender', box.context), 'function', 'bssRender is defined but NOT invoked at load time');
})();

(function () {
  // Nothing in the region auto-calls, exposes or subscribes.
  ok(!/\bwindow\s*\./.test(REGION_CODE), 'the region contains no window.* assignment');
  ok(!/\bglobalThis\b|\bself\b/.test(REGION_CODE), 'the region references neither globalThis nor self');
  ok(!/\bmodule\.exports\b|\bexports\b|\brequire\s*\(|\bimport\s|\bexport\s/.test(REGION_CODE),
     'the region uses no module system — it is classic-script code');
  ok(!/^\s*['"]use strict['"]/.test(REGION), 'the region does not open a strict-mode pragma');
  ok(!/\(function\s*\(\s*\)\s*\{/.test(REGION_CODE.slice(0, 200)), 'the region does not open with an IIFE');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 28. LOAD-TIME BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────
section('28. load-time bootstrap');

(function () {
  // The measured difference between "declare" and "run". This is the whole
  // argument for Option A over Option B.
  const declOnly = makeStrictSandbox();
  BSS_UI_ALL.forEach(function (n) { vm.runInContext(realSourceOf(n), declOnly.context); });
  deepEq(declOnly.touched, [], 'DECLARING the 32 functions: zero global reads');

  const b = makeBox({ storage: { 'apex_bss_collapsed': '0' } });
  b.S.backendScanner = null;
  b.api.bssInit();
  ok(b.S.backendScanner !== null, 'RUNNING bssInit(): the state slot is created');
  ok(b.log.storageReads.length > 0, 'RUNNING bssInit(): storage is read');
  ok(b.log.domGet.length > 0, 'RUNNING bssInit(): the DOM is read');
  ok(b.log.domWrites.length > 0, 'RUNNING bssInit(): the DOM is written');
  ok(b.log.service.indexOf('bssStartPolling') >= 0, 'RUNNING bssInit(): polling starts — which is what performs the network I/O');
  ok(b.log.bdsp.length > 0, 'RUNNING bssInit(): the BDSP bridge fires');
  deepEq(b.log.network, [], 'bssInit performs no DIRECT network call — the I/O is the service\'s, one call deep');
  deepEq(b.log.timers, [], 'bssInit creates no timer of its own — the interval is the service\'s');
})();

(function () {
  // TDZ: a module evaluated BEFORE the inline monolith must not read `S` or `WL`
  // at load time, because both are `const` bindings of that later script.
  const sLit = MASKED.indexOf('\nconst S = {');
  const wlLit = MASKED.indexOf('\nconst WL=[');
  ok(sLit > 0 && wlLit > 0, 'both `S` and `WL` are lexical `const` bindings, not `var`');
  ok(!/\bvar\s+S\s*=/.test(MASKED.slice(INLINE_RANGE.start, INLINE_RANGE.start + 20000)),
     '`S` is not additionally declared with var');
  // A module loaded earlier that CALLS anything at load time would hit the TDZ.
  const box = makeStrictSandbox();
  vm.runInContext(REGION, box.context);
  let threw = null;
  try { vm.runInContext('bssRenderHeadBadges()', box.context); } catch (e) { threw = String(e); }
  ok(threw !== null && /ReferenceError/.test(threw) && /document|bssState|FORBIDDEN_GLOBAL/.test(threw),
     'CALLING a renderer before its dependencies exist throws a ReferenceError immediately — which is why no call may be added at module scope');
  // And the same for the `typeof WL` guard, which is NOT TDZ-safe for a const.
  ok(/typeof\s+WL\s*!==\s*'undefined'/.test(bodyOf('bssUniverseDiagHtml')),
     'bssUniverseDiagHtml guards WL with typeof — safe at CALL time, but a `typeof` on a const in its TDZ still throws');
  ok(declStart('bssUniverseDiagHtml') > MASKED.indexOf('\nconst WL=['),
     'today bssUniverseDiagHtml is declared after `const WL`, so no TDZ window exists in the current layout');
})();

(function () {
  // Second invocation: same outcome, no accumulation.
  const b = makeBox({ storage: { 'apex_bss_collapsed': '0' } });
  b.api.bssInit();
  const domWrites1 = b.log.domWrites.length;
  const keys1 = Object.keys(b.S.backendScanner).length;
  b.api.bssInit();
  eq(Object.keys(b.S.backendScanner).length, keys1, 'a second bssInit() adds no state field');
  ok(b.log.domWrites.length > domWrites1, 'a second bssInit() repaints (it is a re-entrant bring-up, not a guard)');
  eq(b.S.backendScanner.collapsed, false, 'the collapse state is re-read from storage and is unchanged');
  deepEq(b.log.timers, [], 'no UI timer accumulates across repeated bring-ups');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 29. SCRIPT ORDER — measured, and the recommendation it implies
// ─────────────────────────────────────────────────────────────────────────────
section('29. script order');

(function () {
  const tags = APP.parseScriptTags(RAW_HTML);
  const local = tags.filter(function (t) { return String(t.src || '').indexOf('./js/') === 0; });
  eq(local.length, 19, 'index.html loads 19 local application scripts today');
  local.forEach(function (t) {
    const attrs = String(t.attrs || '');
    ok(!/\bdefer\b/i.test(attrs), (t.src || '') + ' is NOT deferred');
    ok(!/\basync\b/i.test(attrs), (t.src || '') + ' is NOT async');
    ok(!/type\s*=\s*["']module["']/i.test(attrs), (t.src || '') + ' is a CLASSIC script, not a module');
  });
  // A future panel module must be a classic, non-deferred script too, or the
  // static onclick handlers and the hoisted-global contract break.
  ok(local.every(function (t) { return !/\btype\s*=/.test(String(t.attrs || '')) || /text\/javascript/i.test(String(t.attrs || '')); }),
     'no local script declares a non-JavaScript type');
})();

(function () {
  // Every cross-script edge is resolved at CALL time, never at LOAD time. That
  // is what makes BOTH candidate orders runnable — and what makes the choice a
  // matter of hazard, not of correctness.
  const edges = [
    ['service → bssRender', SERVICE_REL, 'bssRender', '(inline)'],
    ['BDSP → bssNum', PREVIEW_REL, 'bssNum', '(inline)'],
    ['BDSP → bssFmtAgeMs', PREVIEW_REL, 'bssFmtAgeMs', '(inline)'],
    ['BDSP → bssFmtClock', PREVIEW_REL, 'bssFmtClock', '(inline)'],
    ['BDSP → bssState', PREVIEW_REL, 'bssState', SERVICE_REL],
    ['BDSP → bssRefresh', PREVIEW_REL, 'bssRefresh', SERVICE_REL],
    ['UI → bdspRender', '(inline)', 'bdspRender', PREVIEW_REL],
  ];
  edges.forEach(function (e) {
    eq(partOf(declStart(e[2])), e[3], e[0] + ': the callee is declared in ' + e[3]);
  });
  // The three BSS-UI-owned helpers BDSP consumes live in a LATER script today,
  // and the preview still works — proof that resolution is call-time.
  SHARED_HELPERS.forEach(function (h) {
    ok(PART_RANGES.findIndex(function (r) { return r.src === PREVIEW_REL; }) <
       PART_RANGES.findIndex(function (r) { return r.src === partOf(declStart(h)); }),
       h + ' is declared in a LATER script than its BDSP consumer — and the preview still resolves it at call time');
  });
  // Symmetrically, bssRender is declared later than the service that calls it.
  ok(PART_RANGES.findIndex(function (r) { return r.src === SERVICE_REL; }) <
     PART_RANGES.findIndex(function (r) { return r.src === '(inline)'; }),
     'the service is declared in an EARLIER script than bssRender, and calls it at call time');
})();

(function () {
  // ORDER 1 vs ORDER 2, evaluated against the measured hazards.
  //   ORDER 1: service → PANEL → adapter → preview → inline
  //   ORDER 2: service → adapter → preview → PANEL → inline
  // Both are runnable. Only ORDER 1 also removes the silent-fallback hazard,
  // because it makes bssNum/bssFmtAgeMs/bssFmtClock exist before the preview
  // script is even parsed.
  const ORDER_1 = [SERVICE_REL, 'PANEL', ADAPTER_REL, PREVIEW_REL, '(inline)'];
  const ORDER_2 = [SERVICE_REL, ADAPTER_REL, PREVIEW_REL, 'PANEL', '(inline)'];
  eq(ORDER_1.indexOf('PANEL') < ORDER_1.indexOf(PREVIEW_REL), true,
     'ORDER 1 places the panel BEFORE the preview — the shared helpers exist first');
  eq(ORDER_2.indexOf('PANEL') > ORDER_2.indexOf(PREVIEW_REL), true,
     'ORDER 2 places the panel AFTER the preview — the shared helpers arrive later');
  eq(ORDER_1[ORDER_1.length - 1], '(inline)', 'ORDER 1 keeps the monolith last, so escHtml/WL/rsb/dsb resolve at call time');
  eq(ORDER_2[ORDER_2.length - 1], '(inline)', 'ORDER 2 also keeps the monolith last');
  eq(ORDER_1.indexOf('PANEL') > ORDER_1.indexOf(SERVICE_REL), true,
     'ORDER 1 keeps the panel after the service, so bssState/bssFreshness/bssIsNoSnapshot precede it');
  // Neither order can be validated by load-time execution, because there is none.
  ok(BSS_INIT_CALLS.every(function (i) { return depthAt(i) > 0; }),
     'no BSS bring-up runs at load time, so neither order changes what happens during parsing');
  // RECOMMENDATION — asserted against the recommended array itself, so the
  // sentence cannot drift away from the ordering it claims.
  const RECOMMENDED_ORDER = ORDER_1;
  ok(RECOMMENDED_ORDER.indexOf(SERVICE_REL) < RECOMMENDED_ORDER.indexOf('PANEL') &&
     RECOMMENDED_ORDER.indexOf('PANEL') < RECOMMENDED_ORDER.indexOf(ADAPTER_REL) &&
     RECOMMENDED_ORDER.indexOf(ADAPTER_REL) < RECOMMENDED_ORDER.indexOf(PREVIEW_REL) &&
     RECOMMENDED_ORDER.indexOf(PREVIEW_REL) < RECOMMENDED_ORDER.indexOf('(inline)'),
     'RECOMMENDATION — ORDER 1: service → backend-scanner-snapshot-panel.js → adapter → preview → inline monolith');
  ok(RECOMMENDED_ORDER !== ORDER_2 &&
     RECOMMENDED_ORDER.indexOf('PANEL') !== ORDER_2.indexOf('PANEL'),
     'the recommendation is ORDER 1, not ORDER 2 — the two place the panel at different positions');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 30. EXTERNAL CONSUMERS
// ─────────────────────────────────────────────────────────────────────────────
section('30. external consumers');

(function () {
  // The complete external-caller map of the 32 declarations.
  const EXTERNAL = {};
  BSS_UI_ALL.forEach(function (n) {
    EXTERNAL[n] = callerNames(n).filter(function (c) { return BSS_UI_ALL.indexOf(c) < 0; }).sort();
  });
  deepEq(EXTERNAL.bssNum, ['bdspFmtNum'], 'bssNum external consumers: bdspFmtNum');
  deepEq(EXTERNAL.bssFmtAgeMs, ['bdspFmtAge', 'dsbFmtAge'], 'bssFmtAgeMs external consumers: bdspFmtAge, dsbFmtAge');
  deepEq(EXTERNAL.bssFmtClock, ['bdspFmtClock', 'dsbFmtClock'], 'bssFmtClock external consumers: bdspFmtClock, dsbFmtClock');
  deepEq(EXTERNAL.bssRender, ['bssFetchCoverage', 'bssFetchSnapshot', 'bssFetchStatus'],
         'bssRender external consumers: the three service readers');
  deepEq(EXTERNAL.bssInit, ['(script-scope)'], 'bssInit has one external caller: the launch handler (anonymous → script-scope)');
  const withNoExternal = BSS_UI_ALL.filter(function (n) { return EXTERNAL[n].length === 0; });
  eq(withNoExternal.length, 27, '27 of the 32 declarations have NO external consumer at all');
  const withExternal = BSS_UI_ALL.filter(function (n) { return EXTERNAL[n].length > 0; }).sort();
  deepEq(withExternal, ['bssFmtAgeMs', 'bssFmtClock', 'bssInit', 'bssNum', 'bssRender'].sort(),
         'exactly five declarations are reachable from outside the BSS UI');
})();

(function () {
  // Who does NOT depend on the BSS UI.
  ok(!/\bbss[A-Z]/.test(stripCommentsAndStrings(ADAPTER_SRC)),
     'the BDS ADAPTER calls no BSS function at all — it is a pure transform');
  const previewCode = stripCommentsAndStrings(PREVIEW_SRC);
  const previewBssRefs = Array.from(new Set((previewCode.match(/\bbss[A-Za-z0-9_$]*/g) || []))).sort();
  deepEq(previewBssRefs, ['bssFmtAgeMs', 'bssFmtClock', 'bssNum', 'bssRefresh', 'bssState'],
         'the BDSP module references exactly five BSS names: three UI formatters and two service functions');
  deepEq(previewBssRefs.filter(function (n) { return BSS_UI_ALL.indexOf(n) >= 0; }).sort(), SHARED_HELPERS.slice().sort(),
         'the only BSS UI names BDSP uses are the three measured formatters — never a renderer');
  // Swing.
  const swing = codeOf('_swingHydrateFromBackend');
  const swingBss = Array.from(new Set((swing.match(/\bbss[A-Za-z0-9_$]*/g) || []))).sort();
  deepEq(swingBss, ['bssFetchCoverage', 'bssFetchSnapshot', 'bssFetchStatus'],
         'the SWING hydration uses only the three SERVICE readers — it depends on NO BSS renderer or helper');
  swingBss.forEach(function (n) {
    ok(BSS_UI_ALL.indexOf(n) < 0, 'Swing dependency ' + n + ' is service-owned, not UI-owned');
  });
  // DSB — D7 is the one real dependency, and it is on helpers only.
  const dsbConsumers = ['dsbFmtAge', 'dsbFmtClock'];
  dsbConsumers.forEach(function (n) {
    const refs = Array.from(new Set((codeOf(n).match(/\bbss[A-Za-z0-9_$]*/g) || [])));
    ok(refs.every(function (r) { return SHARED_HELPERS.indexOf(r) >= 0; }),
       'D7 — ' + n + ' depends only on the shared FORMATTERS, never on a BSS renderer');
  });
  const dsbAll = SPANS.filter(function (s) { return /^dsb/.test(s.name); }).map(function (s) { return s.name; });
  const dsbUsingRenderers = dsbAll.filter(function (n) {
    return CAT_RENDER.concat(CAT_COLLAPSE, CAT_BOOTSTRAP, CAT_HTML).some(function (r) { return new RegExp('\\b' + r + '\\b').test(codeOf(n)); });
  });
  deepEq(dsbUsingRenderers, [], 'no DSB function depends on a BSS renderer, collapse controller, bootstrap or HTML builder');
  // RS backend source.
  const rsbAll = SPANS.filter(function (s) { return /^rsb/.test(s.name); }).map(function (s) { return s.name; });
  const rsbUsingBss = rsbAll.filter(function (n) { return /\bbss[A-Z]/.test(codeOf(n)); });
  deepEq(rsbUsingBss, [], 'no RS-backend function depends on any BSS declaration');
  // The dependency runs the other way for the universe diagnostics.
  ok(/rsbGetBackendSource/.test(codeOf('bssUniverseDiagHtml')) && /dsbGetBackendSource/.test(codeOf('bssUniverseDiagHtml')),
     'the BSS UI depends on rsb/dsb source readers — not the reverse — and guards both with typeof');
  ok(/typeof\s+rsbGetBackendSource\s*===\s*'function'/.test(bodyOf('bssUniverseDiagHtml')) &&
     /typeof\s+dsbGetBackendSource\s*===\s*'function'/.test(bodyOf('bssUniverseDiagHtml')),
     'both universe-source readers are consumed behind typeof guards');
})();

(function () {
  // Test harness reach: the existing suite must keep finding these names.
  const behaviourTest = fs.readFileSync(path.resolve(__dirname, 'backend-scanner-snapshot.test.js'), 'utf8');
  const named = BSS_UI_ALL.filter(function (n) { return new RegExp('\\b' + n + '\\b').test(behaviourTest); });
  ok(named.length > 0, 'the existing behaviour test already exercises ' + named.length + ' of the 32 declarations by name');
  ok(/load-app-source/.test(behaviourTest),
     'the existing behaviour test loads application source through the shared loader, so a relocation keeps working');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 31. DEBUG EXPOSURE
// ─────────────────────────────────────────────────────────────────────────────
section('31. debug exposure');

// D12 — there is none.
ok(SRC.indexOf('apexDebugBackendScannerSnapshot') < 0,
   'D12 — there is NO apexDebugBackendScannerSnapshot helper anywhere in the application');
ok(!/window\.bss|window\['bss|window\["bss/.test(MASKED), 'D12 — no BSS name is exposed on window');
ok(!/globalThis\.bss/.test(MASKED), 'D12 — no BSS name is exposed on globalThis');
ok(!new RegExp('(?:^|\\n)\\s*(?:var|let|const)\\s+[A-Za-z0-9_$]+\\s*=\\s*bss[A-Za-z0-9_$]*\\s*;').test(MASKED),
   'D12 — no global alias is created for any BSS function');
(function () {
  // The sibling subsystems DO expose debug helpers — the contrast is the point.
  ok(/window\.apexDebugBackendDirectionalPreview/.test(MASKED),
     'by contrast BDSP exposes apexDebugBackendDirectionalPreview on window');
  ok(/window\.apexDebugDirectionalBackendSnapshot/.test(MASKED),
     'by contrast DSB exposes apexDebugDirectionalBackendSnapshot on window');
  const debugDecls = SPANS.filter(function (s) { return /^apexDebug/.test(s.name); }).map(function (s) { return s.name; });
  ok(!debugDecls.some(function (n) { return /ScannerSnapshot$/.test(n) && !/Directional/.test(n); }),
     'no apexDebug* declaration belongs to the BSS panel');
  // A future module therefore has NO exposure statement to relocate.
  eq(REGION_CODE.indexOf('window'), -1, 'the region contains zero window references — nothing to expose, nothing to move');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 32. FUTURE OWNERSHIP — A / B / C / D / E
// ─────────────────────────────────────────────────────────────────────────────
section('32. future ownership');

(function () {
  // The evidence each option is judged against, restated as assertions so the
  // recommendation cannot drift away from the measurements.
  ok(CONTIGUOUS.length === 32 && NEXT_AFTER_REGION.name === 'showView',
     'A-evidence: the 32 declarations are contiguous and closed — they can move as one block');
  (function () {
    // "No top-level statement" measured by DEPTH, not by indentation: every
    // character of the region that is not inside one of the 32 spans is blank.
    let cursor = REGION_START, residue = '';
    CONTIGUOUS.forEach(function (sp) { residue += MASKED.slice(cursor, sp.start); cursor = sp.end; });
    residue += MASKED.slice(cursor, REGION_END);
    ok(residue.trim() === '' && REGION_CODE.indexOf('window') < 0,
       'A-evidence: the region has no top-level statement and no exposure — a pure relocation');
  })();
  ok(freeGlobals(REGION_CODE, new Set(BSS_UI_ALL)).indexOf('S') < 0,
     'A-evidence: the region never reads `S`, so no TDZ window opens when it loads before the monolith');
  ok(depthAt(BSS_INIT_CALLS[0]) === 2,
     'B-counter-evidence: there is no top-level `bssInit();` statement to move — it lives at depth 2 in the launch handler');
  (function () {
    // B, demonstrated: a module-scope bssInit() call evaluated before `const S`
    // throws immediately.
    const box = makeStrictSandbox();
    let threw = null;
    try { vm.runInContext(REGION + '\nbssInit();\n', box.context); } catch (e) { threw = String(e); }
    ok(threw !== null,
       'B-counter-evidence: adding `bssInit();` at module scope throws at LOAD time (document/S are not there yet)');
  })();
  (function () {
    // C, quantified: splitting helpers from renderers cuts 3 intra-region call
    // edges, which would all become cross-file edges.
    const helperSet = new Set(CAT_PRIMITIVE.concat(CAT_DERIVATION, CAT_DIAGNOSTIC, CAT_HTML));
    const rendererSet = new Set(CAT_RENDER.concat(CAT_COLLAPSE, CAT_BOOTSTRAP));
    let crossEdges = 0;
    rendererSet.forEach(function (r) {
      helperSet.forEach(function (h) { if (new RegExp('\\b' + h + '\\s*\\(').test(codeOf(r))) crossEdges++; });
    });
    ok(crossEdges === 3,
       'C-quantified: a helpers/renderers split creates ' + crossEdges + ' cross-file call edges');
    const moved = CAT_PRIMITIVE.concat(CAT_DERIVATION, CAT_DIAGNOSTIC, CAT_HTML).length;
    const left = CAT_RENDER.concat(CAT_COLLAPSE, CAT_BOOTSTRAP).length;
    eq(moved, 27, 'C-counter-evidence: option C moves the 27 pure declarations…');
    eq(left, 5, '…and leaves inline exactly the 5 that own DOM, storage and bootstrap — the risky half stays');
    const risky = CAT_RENDER.concat(CAT_COLLAPSE, CAT_BOOTSTRAP).filter(function (n) {
      return /\bdocument\b|\blocalStorage\b/.test(codeOf(n));
    });
    eq(risky.length, 5,
       'C-counter-evidence: ALL 5 declarations option C leaves behind are exactly the ones touching document/localStorage');
  })();
  (function () {
    // D, quantified: FIVE declarations have external consumers, but only THREE
    // of them are helpers a second module could isolate. The other two external
    // entry points are bssRender (called by the service) and bssInit (called by
    // the launch handler) — a helpers module would not contain either.
    const externalEntryPoints = BSS_UI_ALL.filter(function (n) {
      return callerNames(n).some(function (c) { return BSS_UI_ALL.indexOf(c) < 0; });
    }).sort();
    deepEq(externalEntryPoints, ['bssFmtAgeMs', 'bssFmtClock', 'bssInit', 'bssNum', 'bssRender'].sort(),
           'D-evidence: FIVE declarations have consumers outside the region');
    deepEq(externalEntryPoints.filter(function (n) { return SHARED_HELPERS.indexOf(n) >= 0; }).sort(),
           SHARED_HELPERS.slice().sort(),
           'D-counter-evidence: only THREE of those five are shared HELPERS (bssNum, bssFmtAgeMs, bssFmtClock)');
    deepEq(externalEntryPoints.filter(function (n) { return SHARED_HELPERS.indexOf(n) < 0; }).sort(),
           ['bssInit', 'bssRender'],
           'D-counter-evidence: the other two are bssRender (service bridge) and bssInit (launch bring-up) — neither belongs in a helpers module');
    eq(SHARED_HELPERS.length, 3,
       'D-counter-evidence: a second seam could isolate only 3 of the 32 declarations');
    const helpersWithNoExternalUse = CAT_PRIMITIVE.concat(CAT_DERIVATION, CAT_DIAGNOSTIC, CAT_HTML)
      .filter(function (n) { return callerNames(n).every(function (c) { return BSS_UI_ALL.indexOf(c) >= 0; }); });
    eq(helpersWithNoExternalUse.length, 24,
       'D-counter-evidence: 24 of the 27 helpers are consumed ONLY inside the region — a second module would isolate almost nothing');
  })();
  (function () {
    // E, bounded: the residual service DOM coupling is exactly two statements on
    // one node, and it is NOT a blocker because the UI never touches that node.
    const refresh = bodyOf('bssRefresh');
    eq((refresh.match(/document\./g) || []).length, 2, 'E-counter-evidence: the residual service DOM coupling is exactly two statements');
    ok(REGION.indexOf('bss-refresh') < 0,
       'E-counter-evidence: the UI never touches #bss-refresh, so the residual coupling does not straddle the seam');
  })();

  // THE RECOMMENDATION.
  const RECOMMENDATION = 'A';
  eq(RECOMMENDATION, 'A',
     'RECOMMENDATION — OPTION A: move all 32 declarations to js/ui/backend-scanner-snapshot-panel.js and leave everything else inline');
  const STAYS_INLINE = ['bssInit(); call site', 'panel markup', 'bss-* CSS', 'static onclick handlers',
    'S.backendScanner (service-created)', 'launch handler', 'escHtml', 'WL', 'rsbGetBackendSource',
    'dsbGetBackendSource', 'bssRefresh DOM side effect (service)'];
  eq(STAYS_INLINE.length, 11, 'OPTION A leaves eleven measured things exactly where they are');
  // And nothing in this PR has moved yet.
  FUTURE_MODULES.forEach(function (rel) {
    ok(!fs.existsSync(path.resolve(__dirname, '..', rel)), rel + ' still does not exist — the relocation is NOT part of this PR');
  });
  BSS_UI_ALL.forEach(function (n) {
    eq(partOf(declStart(n)), '(inline)', n + ' is still inline after this audit PR');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 33. MUTATION PROOF
//     Each mutant is applied to a COPY of a source string. The guard predicates
//     this file relies on are re-run against the copy and must FLIP. Nothing is
//     ever written to disk.
// ─────────────────────────────────────────────────────────────────────────────
section('33. mutation proof');

const MUTANTS = [];
function mutationCatches(label, caught) {
  MUTANTS.push({ label: label, caught: !!caught });
  ok(caught, 'mutant ' + label + ' is caught');
}

// M1 — an in-place sort inside bssDeriveCandidateRows.
(function () {
  const original = realSourceOf('bssDeriveCandidateRows');
  const mutated = original.replace('var indexed = cands.map(', 'cands.sort(function(a,b){return 0;}); var indexed = cands.map(');
  ok(mutated !== original, '  (M1 actually changed the source)');
  const code = stripCommentsAndStrings(mutated);
  mutationCatches('1a (static: in-place sort of the source array)',
    /\bcands\s*\.\s*(?:sort|reverse|splice)\s*\(/.test(code));
  // …and dynamically, through the write guard.
  const box = makeStrictSandbox({ Infinity: Infinity });
  vm.runInContext(realSourceOf('bssScorePreviewOf'), box.context);
  vm.runInContext(mutated, box.context);
  const g = makeWriteGuard();
  const snap = { candidates: [{ symbol: 'A', scoreDiagnostics: { scorePreview: 1 } }, { symbol: 'B', scoreDiagnostics: { scorePreview: 9 } }] };
  box.store.__snap = g.guard(snap, 'snapshot');
  vm.runInContext('bssDeriveCandidateRows(__snap)', box.context);
  mutationCatches('1b (dynamic: the write guard records the in-place sort)', g.writes.length > 0);
})();

// M2 — candidate.score used instead of the diagnostic score preview.
(function () {
  const original = realSourceOf('bssScorePreviewOf');
  const mutated = original.replace(
    'if (typeof cand.scorePreview === \'number\' && isFinite(cand.scorePreview)) return cand.scorePreview;',
    'if (typeof cand.score === \'number\' && isFinite(cand.score)) return cand.score;');
  ok(mutated !== original, '  (M2 actually changed the source)');
  mutationCatches('2a (static: the operational score substituted for the preview)',
    /\bcand\s*\.\s*score\b(?!Preview|Diagnostics|Bucket)/.test(stripCommentsAndStrings(mutated)));
  const box = makeStrictSandbox();
  vm.runInContext(mutated, box.context);
  box.store.__c = { score: 99 };
  mutationCatches('2b (dynamic: candidate.score now leaks into the preview)',
    vm.runInContext('bssScorePreviewOf(__c)', box.context) === 99);
})();

// M3 — a backend symbol inserted without escHtml.
(function () {
  const original = realSourceOf('bssCandidateTableHtml');
  const mutated = original.replace(
    "+ '<td><strong>' + escHtml(String((cand && cand.symbol) || '—')) + '</strong></td>'",
    "+ '<td><strong>' + String((cand && cand.symbol) || '—') + '</strong></td>'");
  ok(mutated !== original, '  (M3 actually changed the source)');
  const box = makeStrictSandbox({ Infinity: Infinity });
  ['bssNum', 'bssFmtRs', 'bssSD', 'bssScorePreviewOf', 'bssBucketInfo', 'bssParityInfo', 'bssTechComplete',
   'bssTechCompleteInfo', 'bssDirDiagInfo', 'bssDirBadge', 'bssOperational', 'bssRankEligBadge', 'bssBadge']
    .forEach(function (n) { vm.runInContext(realSourceOf(n), box.context); });
  box.store.escHtml = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  vm.runInContext(mutated, box.context);
  box.store.__rows = [{ symbol: XSS }];
  const html = vm.runInContext('bssCandidateTableHtml(__rows)', box.context);
  mutationCatches('3 (unescaped backend symbol reaches the DOM)', html.indexOf('<img src=x') >= 0);
})();

// M4 — a direct fetch inside bssRender.
(function () {
  const original = realSourceOf('bssRender');
  const mutated = original.replace('var panel = document.getElementById(\'bss-panel\');',
    'fetch(\'/scanner/snapshot\'); var panel = document.getElementById(\'bss-panel\');');
  ok(mutated !== original, '  (M4 actually changed the source)');
  const code = stripCommentsAndStrings(mutated);
  mutationCatches('4a (static: fetch inside a renderer)', /\bfetch\s*\(/.test(code));
  mutationCatches('4b (static: a scanner endpoint path inside the UI)', /\/scanner\//.test(mutated));
  // Dynamic: the instrumented sandbox blocks and records it.
  const b = makeBox();
  b.S.backendScanner = { collapsed: true, status: null, snapshot: null, statusError: null, snapshotError: null };
  vm.runInContext(mutated, b.box.context);
  let threw = null;
  try { vm.runInContext('bssRender()', b.box.context); } catch (e) { threw = String(e); }
  mutationCatches('4c (dynamic: the network entry point is reached and blocked)',
    b.log.network.indexOf('fetch') >= 0 && threw !== null);
})();

// M5 — a POST /scanner/run inside the UI.
(function () {
  const original = realSourceOf('bssToggleCollapse');
  const mutated = original.replace('bssApplyCollapse();',
    "fetch('/scanner/run', { method: 'POST' }); bssApplyCollapse();");
  ok(mutated !== original, '  (M5 actually changed the source)');
  mutationCatches('5a (static: /scanner/run appears in the UI)', mutated.indexOf('/scanner/run') >= 0);
  mutationCatches('5b (static: a POST method appears in the UI)', /method\s*:\s*'POST'/.test(mutated));
  const b = makeBox();
  vm.runInContext(mutated, b.box.context);
  let threw = null;
  try { vm.runInContext('bssToggleCollapse()', b.box.context); } catch (e) { threw = String(e); }
  mutationCatches('5c (dynamic: the blocked fetch stops the scan trigger)', b.log.network.indexOf('fetch') >= 0);
})();

// M6 — a subscription opened by the UI.
(function () {
  const original = realSourceOf('bssInit');
  const mutated = original.replace('bssStartPolling();', 'subscribeDxlinkQuotes([\'AAPL\']); bssStartPolling();');
  ok(mutated !== original, '  (M6 actually changed the source)');
  const code = stripCommentsAndStrings(mutated);
  mutationCatches('6a (static: a subscription entry point inside the UI)', /subscribeDxlink/.test(code));
  const b = makeBox();
  vm.runInContext(mutated, b.box.context);
  let threw = null;
  try { vm.runInContext('bssInit()', b.box.context); } catch (e) { threw = String(e); }
  mutationCatches('6b (dynamic: the subscription is reached and blocked)',
    b.log.network.indexOf('subscribeDxlinkQuotes') >= 0 && threw !== null);
})();

// M7 — backend rows assigned to S.scanData.
(function () {
  const original = realSourceOf('bssBodyHtml');
  const mutated = original.replace('var rows = bssDeriveCandidateRows(snap);',
    'var rows = bssDeriveCandidateRows(snap); S.scanData = rows;');
  ok(mutated !== original, '  (M7 actually changed the source)');
  const code = stripCommentsAndStrings(mutated);
  mutationCatches('7a (static: scanData referenced by the UI)', code.indexOf('scanData') >= 0);
  mutationCatches('7b (static: an assignment to a property of S)', /\bS\s*\.\s*[A-Za-z_$][\w$]*\s*=[^=]/.test(code));
  mutationCatches('7c (static: `S` becomes a free global of the region)',
    freeGlobals(code, new Set(BSS_UI_ALL)).indexOf('S') >= 0);
  // Dynamic: the write guard records the assignment.
  const b = makeBox();
  b.S.backendScanner = { collapsed: false, status: status(), snapshot: snapshot(), statusError: null, snapshotError: null };
  const g = makeWriteGuard();
  const rows = [{ ticker: 'FRONTEND' }];
  b.box.store.S = new Proxy({ scanData: rows, backendScanner: b.S.backendScanner }, {
    set: function (t, p, v) { g.writes.push('S.' + String(p) + ' (set)'); t[p] = v; return true; },
  });
  vm.runInContext(mutated, b.box.context);
  vm.runInContext('bssBodyHtml()', b.box.context);
  mutationCatches('7d (dynamic: the write guard records S.scanData being replaced)',
    g.writes.indexOf('S.scanData (set)') >= 0);
})();

// M8 — snapshot.candidates mutated.
(function () {
  const original = realSourceOf('bssBodyHtml');
  const mutated = original.replace('var rows = bssDeriveCandidateRows(snap);',
    'snap.candidates.reverse(); var rows = bssDeriveCandidateRows(snap);');
  ok(mutated !== original, '  (M8 actually changed the source)');
  const code = stripCommentsAndStrings(mutated);
  mutationCatches('8a (static: an in-place mutation of a candidates array)',
    /\.candidates\s*\.\s*(?:sort|reverse|splice|push|pop|shift|unshift)\s*\(/.test(code));
  // Dynamic: the deep write guard on the snapshot flags the reverse.
  const b = makeBox();
  const snap = snapshot({ candidates: [candidate({ symbol: 'A' }), candidate({ symbol: 'B' })] });
  const g = makeWriteGuard();
  b.S.backendScanner = { collapsed: false, status: status(), statusError: null, snapshotError: null };
  Object.defineProperty(b.S.backendScanner, 'snapshot', {
    get: function () { return g.guard(snap, 'snapshot'); }, enumerable: true, configurable: true,
  });
  vm.runInContext(mutated, b.box.context);
  try { vm.runInContext('bssBodyHtml()', b.box.context); } catch (e) { /* the guard makes reverse a no-op */ }
  mutationCatches('8b (dynamic: the write guard records the candidates mutation)', g.writes.length > 0);
})();

// M9 — the bssRender → bdspRender bridge removed.
(function () {
  const original = realSourceOf('bssRender');
  const mutated = original.replace("  if (typeof bdspRender === 'function') bdspRender();\n", '');
  ok(mutated !== original, '  (M9 actually changed the source)');
  mutationCatches('9a (static: the BDSP bridge is gone from bssRender)',
    (stripCommentsAndStrings(mutated).match(/\bbdspRender\b/g) || []).length === 0);
  const b = makeBox();
  b.S.backendScanner = { collapsed: true, status: status(), snapshot: snapshot(), statusError: null, snapshotError: null };
  vm.runInContext(mutated, b.box.context);
  vm.runInContext('bssRender()', b.box.context);
  mutationCatches('9b (dynamic: rendering no longer reaches BDSP)', b.log.bdsp.length === 0);
})();

// M10 — the service → bssRender bridge removed.
pending((function () {
  const original = realSourceOf('bssFetchStatus');
  const mutated = original.replace('      bssRender();\n', '');
  ok(mutated !== original, '  (M10 actually changed the source)');
  mutationCatches('10a (static: the reader no longer renders)',
    (stripCommentsAndStrings(mutated).match(/\bbssRender\s*\(/g) || []).length === 0);
  const b = makeServiceBox({ payload: { ok: true } });
  vm.runInContext(mutated, b.box.context);
  return vm.runInContext('bssFetchStatus()', b.box.context).then(function () {
    mutationCatches('10b (dynamic: a committed payload never reaches the panel)', b.log.render === 0);
  });
})());

// M11 — the collapse default flipped.
(function () {
  const original = realSourceOf('bssState');
  const mutated = original.replace('collapsed: true,', 'collapsed: false,');
  ok(mutated !== original, '  (M11 actually changed the source)');
  mutationCatches('11a (static: the seeded default changed)', /collapsed:\s*false/.test(mutated));
  const box = makeStrictSandbox({ S: {} });
  vm.runInContext(mutated, box.context);
  mutationCatches('11b (dynamic: a fresh state now starts EXPANDED)',
    vm.runInContext('bssState().collapsed', box.context) === false);
})();

// M12 — the collapse storage key changed.
(function () {
  const original = realSourceOf('bssToggleCollapse');
  const mutated = original.replace("'apex_bss_collapsed'", "'apex_bss_collapsed_v2'");
  ok(mutated !== original, '  (M12 actually changed the source)');
  const keys = Array.from(new Set((mutated.match(/localStorage\.\w+\('([^']+)'/g) || [])
    .map(function (m) { return /'([^']+)'/.exec(m)[1]; })));
  mutationCatches('12a (static: the storage key no longer matches the pinned one)',
    keys.indexOf(COLLAPSE_STORAGE_KEY) < 0);
  const b = withState({ collapsed: true });
  vm.runInContext(mutated, b.box.context);
  vm.runInContext('bssToggleCollapse()', b.box.context);
  mutationCatches('12b (dynamic: the writer and the reader no longer agree)',
    b.log.storageWrites.join(',').indexOf('apex_bss_collapsed=') < 0);
})();

// M13 — collapse persistence removed entirely.
(function () {
  const original = realSourceOf('bssToggleCollapse');
  const mutated = original.replace(/try \{ localStorage\.setItem[^\n]*\n/, '');
  ok(mutated !== original, '  (M13 actually changed the source)');
  mutationCatches('13a (static: the only writer of the collapse key is gone)',
    mutated.indexOf('localStorage.setItem') < 0);
  const b = withState({ collapsed: true });
  vm.runInContext(mutated, b.box.context);
  vm.runInContext('bssToggleCollapse()', b.box.context);
  mutationCatches('13b (dynamic: toggling no longer persists anything)', b.log.storageWrites.length === 0);
})();

// M14 — bssInit() added at module scope.
(function () {
  const mutated = REGION + '\nbssInit();\n';
  ok(mutated !== REGION, '  (M14 actually changed the source)');
  // Static: the region acquires a top-level statement.
  const spans = topLevelSpans(stripCommentsAndStrings(mutated));
  let cursor = 0, residue = '';
  const masked = stripCommentsAndStrings(mutated);
  spans.forEach(function (sp) { residue += masked.slice(cursor, sp.start); cursor = sp.end; });
  residue += masked.slice(cursor);
  mutationCatches('14a (static: the region acquires a top-level statement)', residue.trim() !== '');
  // Dynamic: it throws at LOAD time in a strict sandbox.
  const box = makeStrictSandbox();
  let threw = null;
  try { vm.runInContext(mutated, box.context); } catch (e) { threw = String(e); }
  mutationCatches('14b (dynamic: the module now has a load-time side effect that throws)', threw !== null);
  // And it would be a real TDZ hazard: the first thing it reaches is `document`,
  // and one step later `S`, both unavailable before the monolith.
  mutationCatches('14c (dynamic: the load-time read is a host/app global, not an intrinsic)',
    threw !== null && /document|ReferenceError/.test(threw));
})();

// M15 — the UI script loaded BEFORE the service.
(function () {
  const SERVICE_TAG = '<script src="./js/services/backend-scanner-snapshot-service.js"></script>';
  const PANEL_TAG = '<script src="./js/ui/backend-scanner-snapshot-panel.js"></script>';
  const wrongOrder = RAW_HTML.replace(SERVICE_TAG, PANEL_TAG + '\n' + SERVICE_TAG);
  ok(wrongOrder !== RAW_HTML, '  (M15 actually changed the document)');
  const order = APP.parseScriptTags(wrongOrder)
    .map(function (t) { return String(t.src || '').trim(); })
    .filter(function (s) { return s.indexOf('./js/') === 0; });
  const iPanel = order.indexOf('./js/ui/backend-scanner-snapshot-panel.js');
  const iService = order.indexOf('./js/services/backend-scanner-snapshot-service.js');
  mutationCatches('15a (static: the panel is ordered before the service)', iPanel >= 0 && iPanel < iService);
  // The recommended ORDER 1 predicate rejects it.
  const ORDER_OK = function (list) {
    const p = list.indexOf('./js/ui/backend-scanner-snapshot-panel.js');
    const s = list.indexOf('./js/services/backend-scanner-snapshot-service.js');
    const v = list.indexOf('./js/ui/backend-directional-preview.js');
    return s >= 0 && p > s && (v < 0 || p < v);
  };
  mutationCatches('15b (the ORDER 1 predicate rejects the mutated order)', !ORDER_OK(order));
  const correct = order.slice();
  correct.splice(iPanel, 1);
  correct.splice(correct.indexOf('./js/services/backend-scanner-snapshot-service.js') + 1, 0,
                 './js/ui/backend-scanner-snapshot-panel.js');
  ok(ORDER_OK(correct), '  (the same predicate ACCEPTS the recommended ORDER 1)');
})();

// M16 — bssNum removed, leaving BDSP on its silent fallback.
(function () {
  const box = makeStrictSandbox({ Math: Math, Number: Number, String: String, isFinite: isFinite });
  vm.runInContext(realSourceOf('bdspFmtNum'), box.context);
  const degraded = vm.runInContext('bdspFmtNum(1.239, 2)', box.context);
  const box2 = makeStrictSandbox({ Math: Math, Number: Number, String: String, isFinite: isFinite });
  vm.runInContext(realSourceOf('bssNum'), box2.context);
  vm.runInContext(realSourceOf('bdspFmtNum'), box2.context);
  const correct = vm.runInContext('bdspFmtNum(1.239, 2)', box2.context);
  mutationCatches('16a (dynamic: removing bssNum silently changes what BDSP renders)', degraded !== correct);
  mutationCatches('16b (static: bssNum would no longer be declared anywhere)',
    defCountIn(REGION.replace(realSourceOf('bssNum'), ''), 'bssNum') === 0);
})();

// M17 — bssRefresh duplicated / redefined inside the UI.
(function () {
  const mutated = REGION + '\n' + realSourceOf('bssRefresh') + '\n';
  ok(mutated !== REGION, '  (M17 actually changed the source)');
  const names = topLevelSpans(stripCommentsAndStrings(mutated)).map(function (s) { return s.name; });
  mutationCatches('17a (static: the region no longer holds exactly the 32 manifest names)',
    names.length !== 32 || names.indexOf('bssRefresh') >= 0);
  mutationCatches('17b (static: bssRefresh becomes defined twice application-wide)',
    defCountIn(SERVICE_SRC, 'bssRefresh') + defCountIn(mutated, 'bssRefresh') !== 1);
  mutationCatches('17c (static: the duplicate brings a service-owned DOM id into the UI)',
    mutated.indexOf('bss-refresh') >= 0);
})();

// M18 — the refresh DOM side effect moved out of the service without updating
// ownership: the service keeps the fetches, the UI silently acquires the node.
(function () {
  const strippedService = SERVICE_SRC.replace(
    "  var btn = document.getElementById('bss-refresh');\n", '');
  ok(strippedService !== SERVICE_SRC, '  (M18 actually changed the service source)');
  mutationCatches('18a (static: the service loses its only DOM statement)',
    (stripCommentsAndStrings(strippedService).match(/document\./g) || []).length !== 2);
  const uiWithNode = REGION.replace('function bssRender() {',
    "function bssRender() {\n  var b = document.getElementById('bss-refresh');");
  mutationCatches('18b (static: the UI silently acquires the service-owned node)',
    uiWithNode.indexOf('bss-refresh') >= 0 && REGION.indexOf('bss-refresh') < 0);
  // The DOM-id ownership table no longer holds.
  const queriedByUi = topLevelSpans(stripCommentsAndStrings(uiWithNode)).map(function (s) { return s.name; })
    .filter(function (n) {
      const m = new RegExp('function ' + n + '\\\\b[\\\\s\\\\S]*?bss-refresh').test(uiWithNode);
      return m;
    });
  mutationCatches('18c (the DOM ownership table breaks: a UI declaration now queries #bss-refresh)',
    queriedByUi.length > 0 || uiWithNode.indexOf("getElementById('bss-refresh')") >= 0);
})();

// The mutations never touched disk.
(function () {
  ok(fs.readFileSync(APP.DEFAULT_INDEX_HTML, 'utf8').length === RAW_HTML.length,
     'index.html is unchanged on disk after the mutation proof');
  ok(fs.readFileSync(SERVICE_ABS, 'utf8') === SERVICE_SRC, SERVICE_REL + ' is byte-identical on disk after the mutation proof');
  ok(fs.readFileSync(PREVIEW_ABS, 'utf8') === PREVIEW_SRC, PREVIEW_REL + ' is byte-identical on disk after the mutation proof');
  ok(fs.readFileSync(ADAPTER_ABS, 'utf8') === ADAPTER_SRC, ADAPTER_REL + ' is byte-identical on disk after the mutation proof');
  ok(APP.loadAppJavaScriptSource().length === SRC.length,
     'the reconstructed application source is unchanged after the mutation proof');
  BSS_UI_ALL.forEach(function (n) {
    ok(bodyOf(n) === SRC.slice(declStart(n), declEnd(n)), n + ' source is byte-identical after the mutation proof');
  });
  FUTURE_MODULES.forEach(function (rel) {
    ok(!fs.existsSync(path.resolve(__dirname, '..', rel)), rel + ' was not created by the mutation proof');
  });
})();

// ── done ─────────────────────────────────────────────────────────────────────
// Every queued asynchronous section settles BEFORE the mutant tally and the
// summary, so an async assertion can never be skipped by an early exit.
Promise.all(PENDING).then(function () {
  const caught = MUTANTS.filter(function (m) { return m.caught; }).length;
  console.log('\n  mutants: ' + caught + '/' + MUTANTS.length + ' caught');
  eq(caught, MUTANTS.length, 'every mutant is caught by at least one guard predicate');
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}, function (e) {
  console.log('  FAIL  an asynchronous section rejected: ' + String(e));
  console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
  process.exit(1);
});
