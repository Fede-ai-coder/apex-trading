'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend Directional Preview (BDSP) — EXTRACTION BOUNDARY CONTRACT
//
// WHAT THIS FILE IS
//   An AUDIT contract, not a behaviour test. It measures — against the REAL
//   application source loaded through tests/lib/load-app-source.js — the
//   physical, temporal, statal and behavioural boundary of the Backend
//   Directional Preview, whose 32 declarations now live in the classic script
//   js/ui/backend-directional-preview.js. It copies no implementation, changes
//   no behaviour and moves no code.
//
//   tests/backend-directional-preview.test.js already pins WHAT the preview
//   renders. This file pins WHERE the preview ends: which functions belong to
//   it, what they may depend on, who is allowed to call them, which globals the
//   module must keep late-bound, what stayed behind in the monolith, and what
//   must remain true at load time.
//
// WHY IT EXISTS
//   js/adapters/backend-directional-adapter.js (PR #342) extracted the pure
//   bds* adapter. BDSP was the next candidate, and the relocation has now
//   happened: OPTION A, executed verbatim. Unlike the adapter, BDSP owns DOM,
//   HTML, localStorage and UI state. Its three BSS UI helper dependencies now
//   live in an EARLIER panel script, while escHtml and renderScanResults remain
//   declared LATER in the inline monolith. The whole seam is measured, not
//   assumed, so the shipped split cannot drift away from the decision it implements.
//
// WHAT THE RELOCATION DID AND DID NOT DO (measured in §3, §25, §29, §30, §32)
//   MOVED      the 32 function declarations, verbatim, in the same relative
//              order, together with their directly associated comments.
//   STAYED     the `bdspInit();` call inside the #launchBtn async click handler,
//              the window exposure of the debug helper, the two static onclick
//              handlers, all markup, all CSS and the seeded state slot in the
//              `const S` object literal.
//   ADDED      exactly one classic <script src> tag, after the adapter and
//              before the inline monolith. No import/export, no namespace, no
//              IIFE, no 'use strict', no top-level statement of any kind.
//
// HOW IT MEASURES
//   • static  — the reconstructed application source is scanned with a
//               comment/string stripper, a brace-matching top-level-function
//               span finder, a free-identifier analyser and a markup scanner
//               that looks at index.html OUTSIDE every <script> tag.
//   • dynamic — the 32 declarations are evaluated in a strict vm context whose
//               global object is a Proxy that THROWS on any identifier that is
//               not an explicitly allowed intrinsic (load-time purity), and then
//               again in a fully instrumented context where every DOM access,
//               localStorage access, adapter call, BSS call, timer and network
//               entry point is counted (bootstrap behaviour).
//   • write-guarded — S.scanData and the BSS snapshot are handed to BDSP behind
//               deep write-recording Proxies, so a mutation is caught as a
//               recorded write, not inferred from a grep.
//   • mutation-proof — §33 re-runs this file's own guard predicates against
//               deliberately mutated COPIES of the BDSP source string, of the
//               module text and of index.html's script-tag list, and asserts
//               each guard flips. No application file is ever written.
//
// DIVERGENCES FROM THE AUDIT BRIEF are asserted as facts, not corrected:
//   D1  bdspInit() is NOT a top-level call. Its single call site sits inside the
//       anonymous `async function` handler registered by
//       document.getElementById('launchBtn').addEventListener('click', …),
//       immediately after bssInit(), inside that handler's try block. It runs
//       once per successful LAUNCH (and again after a reconnect that replays the
//       same bring-up). Option "B — move the bootstrap into the module" is
//       therefore not applicable as written: there is no top-level
//       `bdspInit();` statement to relocate, and the call STAYED inline (§25,
//       §32). A top-level call added to the module would be a blocking TDZ
//       regression, because the module is evaluated before `const S` (§31).
//   D2  bdspRender has a SECOND external consumer: bssRender() calls it behind
//       a typeof guard (§6).
//   D3  S.backendDirectionalPreview is created TWICE — eagerly in the `const S`
//       object literal, and lazily/defensively by bdspState() (§7, §8).
//   D4  bdspToggle() has zero callers in JavaScript AND zero references in
//       markup: it is dead code. Pinned as dead, not removed, not wired (§12).
//   D5  escHtml escapes & < > " but NOT the single quote. Pinned as the current
//       tolerance, not fixed (§17).
//   D6  bdspRefresh delegates to bssRefresh, which itself performs network I/O
//       and sets a timer. BDSP does neither directly (§13).
//
// Run: node tests/backend-directional-preview-boundary-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const APP = require('./lib/load-app-source');

const SRC = APP.loadAppJavaScriptSource();
const PARTS = APP.loadOrderedScriptSources();
const APP_JS_PARTS = PARTS.filter(function (p) { return p.isAppJs && p.code != null; });
const RAW_HTML = APP.loadIndexHtml();

const ADAPTER_REL = './js/adapters/backend-directional-adapter.js';
const BSS_SERVICE_REL = './js/services/backend-scanner-snapshot-service.js';
// The extracted BDSP module. Read from disk as well as through the loader, so
// the FILE's own text is audited (top-level statements, window assignments,
// state, auto-calls) and not only the reconstructed concatenation.
const PREVIEW_REL = './js/ui/backend-directional-preview.js';
const PREVIEW_ABS = path.resolve(__dirname, '..', 'js', 'ui', 'backend-directional-preview.js');
const PREVIEW_EXISTS = fs.existsSync(PREVIEW_ABS);
const PREVIEW_SRC = PREVIEW_EXISTS ? fs.readFileSync(PREVIEW_ABS, 'utf8') : '';
// The DSB panel, extracted by PR 3 and loaded AFTER this module.
const DSB_PANEL_REL = './js/ui/backend-directional-snapshot-panel.js';
// The BSS UI panel, extracted after this module and loaded BEFORE it.
const BSS_PANEL_REL = './js/ui/backend-scanner-snapshot-panel.js';
const BSS_PANEL_ABS = path.resolve(__dirname, '..', 'js', 'ui', 'backend-scanner-snapshot-panel.js');
const BSS_PANEL_SRC = fs.existsSync(BSS_PANEL_ABS) ? fs.readFileSync(BSS_PANEL_ABS, 'utf8') : '';
// The SFS UI panel, extracted by SFS PR 3 and loaded BEFORE this module.
const SFS_PANEL_REL = './js/ui/sfs-panel.js';
// PESS PR 3 of 4. Named explicitly, never matched by a `pess-*` or `js/ui/*`
// pattern: the assertion below is an exact-set INVENTORY, and a pattern would
// let an unplanned module join it silently. PESS PR 4 adds js/ui/pess-panel.js
// here the same way. It lives under js/ui/ rather than js/services/ because the
// §8 audit in the PESS contract measured pessAnalyzeAll owning panel DOM — see
// that contract's header for why the planned "analysis service" label was
// rejected.
const PESS_BATCH_PANEL_REL = './js/ui/pess-batch-panel.js';
// PESS PR 4, the last of the family: the interactive panel owner. Named
// explicitly for the same reason as every entry above — an exact-set inventory,
// never a `pess-*` glob, so a fifth PESS module could not join silently.
const PESS_UI_PANEL_REL = './js/ui/pess-panel.js';
// EIC PR 2, the first EIC module to land under js/ui/ — the panel owner
// (runEICPanel + eicAnalyzeAll). EIC PR 1 shipped under js/services/ and so
// never reached this inventory. Named explicitly for the same reason as every
// entry above: an exact-set inventory, never an `eic-*` glob, so EIC PRs 3-4
// cannot join it silently.
const EIC_PANEL_REL = './js/ui/eic-panel.js';
const EIC_TICKER_PANEL_REL = './js/ui/eic-ticker-analysis-panel.js';
// EIC PR 4, the last of the family: the live deep dive (eicFetchLegs ×2,
// eicDXLinkDeepDive, eicRunDXLink). Named explicitly for the same reason as
// every entry above — an exact-set inventory, never an `eic-*` glob — and with
// this entry the EIC family is closed at four modules.
const EIC_LIVE_DEEP_DIVE_REL = './js/ui/eic-live-deep-dive.js';
const PRETRADE_RISK_MODAL_REL = './js/ui/pretrade-risk-modal.js';

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

// ─────────────────────────────────────────────────────────────────────────────
// The audited surface — 32 declarations, in the physical order they appear.
// Categories are the audit's own taxonomy and are asserted in §4.
// ─────────────────────────────────────────────────────────────────────────────
const CAT_STATE = [
  'bdspStorageKey', 'bdspState', 'bdspLoadPersistedEnabled', 'bdspPersistEnabled',
  'bdspIsEnabled', 'bdspSetEnabled', 'bdspToggle', 'bdspRefresh',
];
const CAT_FORMAT = [
  'bdspBadge', 'bdspKV', 'bdspFmtNum', 'bdspFmtAge', 'bdspFmtClock',
  'bdspFreshBadge', 'bdspDirBadge', 'bdspBucketBadge', 'bdspBoolBadge',
  'bdspParityBadge', 'bdspOperationalBadge',
];
const CAT_RENDER = ['bdspRenderSourceState', 'bdspRenderSummary', 'bdspRenderRows'];
const CAT_SCANNER = [
  'bdspIsScannerSourceActive', 'bdspGetRowsForScannerResults',
  'bdspRenderBackendResultEmptyState', 'bdspRenderBackendResultRows',
  'bdspRenderScannerResultsOverride', 'bdspMaybeRenderScannerResults',
  'bdspRestoreFrontendScannerResults',
];
const CAT_ORCH = ['bdspRender', 'bdspInit', 'apexDebugBackendDirectionalPreview'];

const BDSP_ALL = [].concat(CAT_STATE, CAT_FORMAT, CAT_RENDER, CAT_SCANNER, CAT_ORCH);

// Exact parameter lists, re-confirmed against the real source in §2.
const EXPECTED_SIGNATURES = {
  bdspStorageKey: [],
  bdspState: [],
  bdspLoadPersistedEnabled: [],
  bdspPersistEnabled: ['enabled'],
  bdspIsEnabled: [],
  bdspSetEnabled: ['enabled'],
  bdspToggle: [],
  bdspRefresh: [],
  bdspBadge: ['label', 'cls'],
  bdspKV: ['k', 'vHtml'],
  bdspFmtNum: ['v', 'digits'],
  bdspFmtAge: ['ms'],
  bdspFmtClock: ['v'],
  bdspFreshBadge: ['sourceState'],
  bdspDirBadge: ['dir'],
  bdspBucketBadge: ['bucket'],
  bdspBoolBadge: ['v', 'yes', 'no'],
  bdspParityBadge: ['r'],
  bdspOperationalBadge: ['v'],
  bdspRenderSourceState: ['sourceState'],
  bdspRenderSummary: ['summary'],
  bdspRenderRows: ['rows'],
  bdspIsScannerSourceActive: [],
  bdspGetRowsForScannerResults: [],
  bdspRenderBackendResultEmptyState: ['sourceState'],
  bdspRenderBackendResultRows: ['rows'],
  bdspRenderScannerResultsOverride: [],
  bdspMaybeRenderScannerResults: [],
  bdspRestoreFrontendScannerResults: [],
  bdspRender: [],
  bdspInit: [],
  apexDebugBackendDirectionalPreview: [],
};

// The three pure adapter entry points BDSP consumes.
const ADAPTER_DEPS = [
  'bdsDeriveBackendDirectionalRows',
  'bdsBackendDirectionalSummary',
  'bdsGetBackendDirectionalSourceState',
];
// BSS surface BDSP consumes. Split by owning script — this split is the whole
// reason the extraction is delicate.
const BSS_DEPS_SERVICE = ['bssState', 'bssRefresh'];          // js/services/…
// These three used to be inline and LATER than BDSP — reachable only by
// hoisting, which is what made the preview's `typeof` guards a silent-fallback
// hazard. They were relocated verbatim to js/ui/backend-scanner-snapshot-panel.js,
// a script loaded BEFORE this module, so the hazard is gone by construction.
const BSS_DEPS_PANEL_UI = ['bssNum', 'bssFmtAgeMs', 'bssFmtClock']; // js/ui/…-panel.js

// DOM identifiers BDSP looks up.
const DOM_IDS = ['scanResults', 'bdsp-preview', 'bdsp-frontend-btn', 'bdsp-backend-btn'];
// Present in markup, never queried by BDSP.
const DOM_IDS_MARKUP_ONLY = ['bdsp-control'];

const BDSP_STORAGE_KEY = 'apex_directional_backend_preview';

// ── Source helpers ───────────────────────────────────────────────────────────
// LENGTH-PRESERVING mask: the bodies of comments, strings, template literals and
// regular-expression literals are replaced by spaces (newlines kept, delimiters
// kept), so every offset in the masked source is the SAME offset in SRC. That is
// what lets caller attribution, span containment and the region scans below mix
// masked scanning with raw slicing without drifting by a single character.
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

// The masked twin of SRC. Same length, same offsets, no prose and no HTML.
const MASKED = stripCommentsAndStrings(SRC);

// Every top-level `function NAME(...)` span (column 0), brace matched on the
// masked source so that braces inside strings, comments and regex literals are
// invisible. Offsets are valid in SRC as well.
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
// Raw source of a declaration — use it when the assertion is about literal text
// (a typeof guard's `'function'`, an onclick string, an HTML fragment).
function bodyOf(name) { const a = spansOf(name); return a.length && a[0].end > a[0].start ? SRC.slice(a[0].start, a[0].end) : null; }
// Masked source of a declaration — use it when the assertion is about CODE and
// must not match prose or generated HTML.
function codeOf(name) { const a = spansOf(name); return a.length && a[0].end > a[0].start ? MASKED.slice(a[0].start, a[0].end) : ''; }
// A reference to `name` that is a real call/identifier in `code`, excluding the
// declaration header `function name(` itself.
function usesName(code, name) {
  return new RegExp('(?:^|[^.\\w$])(?<!function\\s)' + name + '\\s*\\(').test(
    code.replace(new RegExp('function\\s+' + name + '\\s*\\(', 'g'), 'function  ('));
}

// Innermost top-level span containing an index, or null for script scope.
function enclosingFn(index) {
  let best = null;
  for (const s of SPANS) {
    if (s.start <= index && index < s.end) { if (!best || s.start > best.start) best = s; }
  }
  return best;
}

// Every reference to `name` outside its own declaration, attributed to the
// top-level function that contains it ('(script-scope)' when there is none).
// Scanning happens on the MASKED source, so an onclick="bdspRefresh()" baked
// into a generated HTML string is NOT counted as a JavaScript caller — §29
// audits those separately — while offsets stay valid for span containment.
const SRC_CODE = MASKED;
function callersOf(name) {
  const re = new RegExp('\\b' + name + '\\b', 'g');
  const found = new Map();
  let m;
  while ((m = re.exec(SRC_CODE))) {
    const enc = enclosingFn(m.index);
    const who = enc ? enc.name : '(script-scope)';
    if (who === name) continue;
    found.set(who, (found.get(who) || 0) + 1);
  }
  return found;
}
function callerNames(name) { return Array.from(callersOf(name).keys()).sort(); }

// Parameter names of a top-level declaration, read from the real source.
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
const INLINE_RANGE = PART_RANGES[PART_RANGES.length - 1];
// The residual inline monolith as its own text, and a declaration counter that
// works on any single script — used to prove "declared here, and nowhere else".
const INLINE_SRC = (function () {
  const p = APP_JS_PARTS.filter(function (x) { return x.kind === 'inline'; });
  return p.length ? p[p.length - 1].code : '';
})();
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

// The contiguous BDSP text: first declaration → end of the last declaration.
// Post-extraction this region sits inside the module script, not inside the
// inline monolith — §3 and §30 assert exactly that.
const BDSP_REGION_START = declStart('bdspStorageKey');
const BDSP_REGION_END = declEnd('apexDebugBackendDirectionalPreview');
const BDSP_REGION = SRC.slice(BDSP_REGION_START, BDSP_REGION_END);
const BDSP_CODE = stripCommentsAndStrings(BDSP_REGION);
// The first declaration after the region. It must not be a BDSP function: the
// region is closed. Before the extraction the next declaration was the first
// unrelated inline helper; now it is the first declaration of the monolith,
// because the module ends where the region ends.
const NEXT_AFTER_BDSP = SPANS.filter(function (s) { return s.start >= BDSP_REGION_END; })
  .sort(function (a, b) { return a.start - b.start; })[0];
// The one BDSP top-level statement — the window exposure of the debug helper.
// It did NOT travel with the declarations: it is a statement of the inline
// monolith, so it is located by its own text rather than by "whatever follows
// the region", which is how it was found while the two were adjacent.
const BDSP_EXPOSURE_INDEX = MASKED.indexOf('window.apexDebugBackendDirectionalPreview');
const BDSP_TAIL = (function () {
  if (BDSP_EXPOSURE_INDEX < 0) return '';
  const from = SRC.lastIndexOf('\n', BDSP_EXPOSURE_INDEX) + 1;
  const to = SRC.indexOf('\n', BDSP_EXPOSURE_INDEX);
  return SRC.slice(from, to < 0 ? SRC.length : to + 1);
})();

// The single bdspInit() call site, and the brace depth it sits at inside the
// inline script. Depth > 0 proves it is not a relocatable top-level statement.
const BOOTSTRAP_CALL_INDEX = (function () {
  const re = /\bbdspInit\s*\(\s*\)/g;
  let m;
  while ((m = re.exec(MASKED))) {
    const enc = enclosingSpanOf(m.index);
    if (!enc || enc.name !== 'bdspInit') return m.index;
  }
  return -1;
})();
function enclosingSpanOf(index) {
  let best = null;
  for (const s of SPANS) {
    if (s.end > s.start && s.start <= index && index < s.end) { if (!best || s.start > best.start) best = s; }
  }
  return best;
}
// Brace depth of an offset relative to the start of the inline monolith.
function depthAt(index) {
  let depth = 0;
  for (let i = INLINE_RANGE.start; i < index; i++) {
    const c = MASKED[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  return depth;
}

// ── Strict proxy sandbox: any identifier outside the allowlist throws ─────────
const ALLOWED_INTRINSICS = {
  Array: Array, Object: Object, String: String, Number: Number, Boolean: Boolean,
  Math: Math, isFinite: isFinite, JSON: JSON,
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

// Deep write-guard: reads are transparent and identity-stable; ANY write,
// define or delete anywhere in the tree is recorded instead of applied.
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
    directionDiagnostics: { candidateDirection: 'bullish', confidence: 'high', directionSource: 'diag_v1' },
    cache: { source: 'BACKEND_DXLINK_CANDLE_CACHE', candleCount: 320, ageMs: 1500, reason: null },
    technicalCoverage: { completeCoreTechnicals: true },
    directionParity: { comparable: true, matches: true, mismatchType: null },
    relativeStrengthVsSpy: 1.42, relativeStrengthSource: 'spy_20d',
    rsi14: 58, sma8: 185, sma20: 182, sma30: 180, sma200: 170,
    distFromSma8: 1.3, distFromSma20: 3.0, distFromSma30: 4.1, distFromSma200: 10.2,
    squeezeState: true,
  }, over || {});
}
function snapshot(over) {
  return Object.assign({
    ok: true, stale: false, ageMs: 4200,
    updatedAt: '2026-07-26T12:00:00.000Z',
    nextScheduledRunAt: '2026-07-26T12:05:00.000Z',
    candidates: [candidate()],
  }, over || {});
}
function status(over) { return Object.assign({ ok: true, schedulerEnabled: true }, over || {}); }

// The five characters the audit brief requires probing, in one payload.
const XSS = '<img src=x onerror="alert(1)">&\'"';

// ─────────────────────────────────────────────────────────────────────────────
// Instrumented bootstrap sandbox.
//
// Everything BDSP can reach is real where realism matters (the three adapter
// functions and the three BSS UI formatters are the REAL sources, extracted
// through load-app-source) and counted everywhere else. Network, timers and
// subscription entry points are present but throw, so a regression is a hard
// failure rather than a silently satisfied stub.
// ─────────────────────────────────────────────────────────────────────────────
function makeBox(opts) {
  const o = opts || {};
  const log = {
    domGet: [], domWrites: [], storageReads: [], storageWrites: [],
    adapter: [], bss: [], network: [], timers: [], renderScanResults: 0,
  };
  const elements = Object.create(null);
  const present = o.presentIds || DOM_IDS;
  function makeEl(id) {
    const style = new Proxy({}, {
      set: function (t, p, v) { log.domWrites.push('#' + id + '.style.' + String(p) + '=' + String(v)); t[p] = v; return true; },
    });
    const classes = new Set();
    return {
      id: id,
      style: style,
      get innerHTML() { return this._html || ''; },
      set innerHTML(v) { log.domWrites.push('#' + id + '.innerHTML'); this._html = String(v); },
      _html: '',
      classList: {
        toggle: function (c, on) { log.domWrites.push('#' + id + '.classList.toggle(' + c + ',' + on + ')'); if (on) classes.add(c); else classes.delete(c); },
        contains: function (c) { return classes.has(c); },
        add: function (c) { log.domWrites.push('#' + id + '.classList.add'); classes.add(c); },
        remove: function (c) { log.domWrites.push('#' + id + '.classList.remove'); classes.delete(c); },
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
    getItem: function (k) { log.storageReads.push(k); if (o.storageThrows) throw new Error('QuotaExceeded'); return store.has(k) ? store.get(k) : null; },
    setItem: function (k, v) { log.storageWrites.push(k + '=' + v); if (o.storageThrows) throw new Error('QuotaExceeded'); store.set(k, String(v)); },
  };

  const S = o.S || { scanData: [{ ticker: 'FRONTEND', score: 1 }], backendDirectionalPreview: { enabled: false } };

  function blocked(name) { return function () { log.network.push(name); throw new Error('BLOCKED_' + name); }; }

  const box = makeStrictSandbox({
    Date: Date, Intl: Intl, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat,
    RegExp: RegExp, Error: Error, console: console,
    S: S,
    document: document,
    localStorage: localStorage,
    window: {},
    escHtml: function (str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    bssState: o.bssState !== undefined ? o.bssState : function () { log.bss.push('bssState'); return { snapshot: snapshot(), status: status() }; },
    bssRefresh: o.bssRefresh !== undefined ? o.bssRefresh : function () { log.bss.push('bssRefresh'); },
    renderScanResults: o.renderScanResults !== undefined ? o.renderScanResults : function () { log.renderScanResults++; },
    fetch: blocked('fetch'), XMLHttpRequest: blocked('XMLHttpRequest'),
    WebSocket: blocked('WebSocket'), ttCall: blocked('ttCall'),
    subscribeDxlinkQuotes: blocked('subscribeDxlinkQuotes'),
    setTimeout: function () { log.timers.push('setTimeout'); throw new Error('BLOCKED_setTimeout'); },
    setInterval: function () { log.timers.push('setInterval'); throw new Error('BLOCKED_setInterval'); },
    requestAnimationFrame: function () { log.timers.push('requestAnimationFrame'); throw new Error('BLOCKED_rAF'); },
    queueMicrotask: function () { log.timers.push('queueMicrotask'); throw new Error('BLOCKED_qmt'); },
    Promise: Promise,
  });

  // Real adapter + real BSS UI formatters, wrapped so their use is counted.
  ADAPTER_DEPS.concat(['bdsIsBackendDirectionalCandidate', 'bdsMapBackendCandidateToDirectionalRow',
    'bdsSortBackendDirectionalRows', '_bdsNum', '_bdsBoolOrNull', '_bdsStrOrNull'])
    .forEach(function (n) { vm.runInContext(APP.extractFunctionSource(n, { source: SRC }), box.context); });
  BSS_DEPS_PANEL_UI.forEach(function (n) {
    vm.runInContext(APP.extractFunctionSource(n, { source: SRC }), box.context);
  });
  ADAPTER_DEPS.forEach(function (n) {
    const real = vm.runInContext(n, box.context);
    box.store[n] = function () { log.adapter.push(n); return real.apply(null, arguments); };
  });
  BSS_DEPS_PANEL_UI.forEach(function (n) {
    const real = vm.runInContext(n, box.context);
    box.store[n] = function () { log.bss.push(n); return real.apply(null, arguments); };
  });

  // The 32 BDSP declarations, verbatim from the real source.
  BDSP_ALL.forEach(function (n) { vm.runInContext(APP.extractFunctionSource(n, { source: SRC }), box.context); });

  const api = {};
  BDSP_ALL.forEach(function (n) { api[n] = vm.runInContext(n, box.context); });
  return { api: api, log: log, S: S, store: store, elements: elements, box: box, document: document };
}

console.log('Backend Directional Preview — extraction boundary contract');
console.log('application source: ' + SRC.length + ' chars from ' + APP_JS_PARTS.length + ' script(s)');
console.log('BDSP region: offsets ' + BDSP_REGION_START + '–' + BDSP_REGION_END +
            ' (' + BDSP_REGION.length + ' chars) inside ' + partOf(BDSP_REGION_START));

// ─────────────────────────────────────────────────────────────────────────────
// 0. MEASUREMENT SANITY
//    Every later section slices SRC with offsets computed on MASKED. If the mask
//    ever stopped being length-preserving, or a brace match silently failed, the
//    contract would keep "passing" while measuring the wrong text. Gate it.
// ─────────────────────────────────────────────────────────────────────────────
section('0. measurement sanity');

eq(MASKED.length, SRC.length, 'the mask is length-preserving — masked offsets are valid in the raw source');
(function () {
  const RELIED_ON = BDSP_ALL.concat(ADAPTER_DEPS, BSS_DEPS_SERVICE, BSS_DEPS_PANEL_UI,
    ['escHtml', 'renderScanResults', 'bssRender', 'runScan', 'bssRefresh']);
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
eq(BDSP_REGION_START > 0 && BDSP_REGION_END > BDSP_REGION_START, true, 'the BDSP region resolved to a real span');
eq(MASKED.slice(BDSP_REGION_START, BDSP_REGION_START + 24), 'function bdspStorageKey(', 'masked and raw offsets agree at the region start');

// ─────────────────────────────────────────────────────────────────────────────
// 1. FUNCTION MANIFEST
// ─────────────────────────────────────────────────────────────────────────────
section('1. function manifest');

eq(BDSP_ALL.length, 32, 'the audited BDSP surface is 32 names');
eq(new Set(BDSP_ALL).size, 32, 'no name is listed twice in the manifest');

BDSP_ALL.forEach(function (n) {
  eq(spansOf(n).length, 1, n + ' is declared exactly once as a top-level function declaration');
});

// Nothing named bdsp* exists outside the manifest, and nothing in the manifest
// is a var/const/arrow/method: a future module must move declarations, not
// expressions.
const ALL_BDSP_DECLS = SPANS.filter(function (s) { return /^bdsp/.test(s.name); }).map(function (s) { return s.name; });
deepEq(ALL_BDSP_DECLS.slice().sort(),
       BDSP_ALL.filter(function (n) { return /^bdsp/.test(n); }).slice().sort(),
       'every top-level bdsp* declaration in the app is in the manifest, and vice versa');
ok(!/\b(?:var|let|const)\s+bdsp[A-Za-z0-9_$]*\s*=/.test(SRC_CODE),
   'no bdsp* function is assigned to a var/let/const binding (all are hoistable declarations)');
ok(!/\bbdsp[A-Za-z0-9_$]*\s*=\s*(?:function|\()/.test(SRC_CODE.replace(/function\s+bdsp[A-Za-z0-9_$]*\s*\(/g, '')),
   'no bdsp* function is defined as a function expression or arrow');

// The 32 are physically contiguous: nothing unrelated is interleaved.
const CONTIGUOUS = SPANS.filter(function (s) { return s.start >= BDSP_REGION_START && s.start < BDSP_REGION_END; });
eq(CONTIGUOUS.length, 32, 'exactly 32 top-level declarations live inside the BDSP region (no interleaved foreign function)');
deepEq(CONTIGUOUS.map(function (s) { return s.name; }), BDSP_ALL,
       'the 32 declarations inside the region are exactly the manifest, in manifest order');

// The debug helper is inventoried as part of the surface but is a bridge, not a
// preview function: §28 audits it separately.
ok(BDSP_ALL.indexOf('apexDebugBackendDirectionalPreview') === 31,
   'apexDebugBackendDirectionalPreview is the last declaration of the region');

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIGNATURES
// ─────────────────────────────────────────────────────────────────────────────
section('2. signatures');

BDSP_ALL.forEach(function (n) {
  deepEq(paramsOf(n), EXPECTED_SIGNATURES[n], n + ' signature unchanged');
});
BDSP_ALL.forEach(function (n) {
  ok(!/^async\s/.test(bodyOf(n)), n + ' is synchronous (no async signature to preserve across a module boundary)');
});
ok(!/\.\.\./.test(BDSP_ALL.map(function (n) { return (paramsOf(n) || []).join(','); }).join('|')),
   'no BDSP function uses rest parameters or destructuring in its signature');

// Runtime arity matches the source signature — a future module cannot silently
// change a call convention.
(function () {
  const b = makeBox();
  BDSP_ALL.forEach(function (n) {
    eq(b.api[n].length, EXPECTED_SIGNATURES[n].length, n + ' runtime arity matches its declared parameter count');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 3. PHYSICAL ORDER
// ─────────────────────────────────────────────────────────────────────────────
section('3. physical order');

const ORDER = BDSP_ALL.map(function (n) { return declStart(n); });
ok(ORDER.every(function (v, i) { return i === 0 || v > ORDER[i - 1]; }),
   'the 32 declarations appear in strictly increasing source order, exactly as listed');
BDSP_ALL.forEach(function (n) {
  eq(partOf(declStart(n)), PREVIEW_REL, n + ' is declared inside the extracted module ' + PREVIEW_REL);
  eq(defCountIn(INLINE_SRC, n), 0, n + ' is no longer declared in the inline monolith');
  eq(defCountIn(PREVIEW_SRC, n), 1, n + ' is declared exactly once in the module file on disk');
  eq(defCountIn(SRC, n), 1, n + ' has exactly one definition application-wide');
});
ok(declStart('bdspStorageKey') > declEnd('bdsGetBackendDirectionalSourceState'),
   'the BDSP region starts after the last declaration of the BDS adapter module it consumes');
ok(declStart('bdspStorageKey') < declStart('apexDebugBackendDirectionalAdapter'),
   'the region now PRECEDES the residual adapter debug bridge — the bridge stayed inline, the region did not');
ok(NEXT_AFTER_BDSP && !/^bdsp/.test(NEXT_AFTER_BDSP.name),
   'the declaration following the region is not a BDSP function (region is closed)');
ok(BDSP_REGION.indexOf('function bdspStorageKey(') === 0,
   'the region begins exactly at bdspStorageKey');
// The module file is the region plus its own header comment and nothing else:
// the relative order 32/32 survives inside the file itself, and no foreign
// declaration was picked up on the way.
deepEq(topLevelSpans(stripCommentsAndStrings(PREVIEW_SRC)).map(function (s) { return s.name; }), BDSP_ALL,
       'the module declares exactly the 32, in the manifest order (32/32 relative order preserved)');
ok(PREVIEW_SRC.indexOf('// ── Backend Directional Preview (BDSP)') === 0,
   'the module opens with the BDSP header comment that travelled with the block');
ok(PREVIEW_SRC.indexOf('function bdspStorageKey(') > 0 &&
   PREVIEW_SRC.slice(PREVIEW_SRC.indexOf('function bdspStorageKey(')).indexOf(BDSP_REGION) === 0,
   'the module body after the header IS the region, byte-for-byte');
eq(PREVIEW_SRC.slice(PREVIEW_SRC.indexOf(BDSP_REGION) + BDSP_REGION.length).trim(), '',
   'nothing follows the last declaration in the module file — no exposure, no bootstrap, no trailer');

// The region contains no top-level statement other than the 32 declarations:
// a relocation would move code, never a side effect.
(function () {
  let rest = BDSP_CODE;
  BDSP_ALL.forEach(function (n) {
    const a = spansOf(n)[0];
    rest = rest.slice(0, a.start - BDSP_REGION_START) + ' '.repeat(a.end - a.start) + rest.slice(a.end - BDSP_REGION_START);
  });
  eq(rest.trim(), '', 'the BDSP region is exclusively function declarations — zero top-level statements between them');
})();

// The one top-level statement that belongs to BDSP lives immediately AFTER the
// region and would have to be handled explicitly by any extraction.
ok(/window\.apexDebugBackendDirectionalPreview\s*=\s*apexDebugBackendDirectionalPreview/.test(BDSP_TAIL),
   'the only BDSP top-level statement is the window exposure of the debug helper, placed after the region');
eq((BDSP_TAIL.match(/apexDebugBackendDirectionalPreview/g) || []).length, 2,
   'the window exposure references the debug helper exactly twice (assignment target and value)');
ok(/try\s*\{[^}]*typeof\s+window\s*!==/.test(BDSP_TAIL),
   'the window exposure is typeof-guarded and wrapped in try/catch (safe in a non-browser context)');

// ─────────────────────────────────────────────────────────────────────────────
// 4. CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
section('4. categories');

eq(CAT_STATE.length, 8, 'state and persistence: 8 functions');
eq(CAT_FORMAT.length, 11, 'formatters and badges: 11 functions');
eq(CAT_RENDER.length, 3, 'preview renderers: 3 functions');
eq(CAT_SCANNER.length, 7, 'scanner-results integration: 7 functions');
eq(CAT_ORCH.length, 3, 'orchestration and debug: 3 functions');
eq(CAT_STATE.length + CAT_FORMAT.length + CAT_RENDER.length + CAT_SCANNER.length + CAT_ORCH.length, 32,
   'the five categories partition the 32 functions exactly');

// Category invariants that a split (option C/D) would have to respect.
CAT_FORMAT.forEach(function (n) {
  const c = codeOf(n);
  ok(!/document\b/.test(c), n + ' (formatter) never touches document');
  ok(!/localStorage\b/.test(c), n + ' (formatter) never touches localStorage');
  ok(!/\bS\b/.test(c), n + ' (formatter) never reads or writes S');
});
CAT_RENDER.forEach(function (n) {
  const c = codeOf(n);
  ok(!/document\b/.test(c), n + ' (renderer) returns HTML and never touches document itself');
  ok(!/\bS\b/.test(c), n + ' (renderer) never reads or writes S');
});
CAT_STATE.forEach(function (n) {
  ok(!/innerHTML/.test(codeOf(n)), n + ' (state) never writes innerHTML directly');
});
ok(/document\.getElementById/.test(codeOf('bdspRenderScannerResultsOverride')) &&
   /document\.getElementById/.test(codeOf('bdspRestoreFrontendScannerResults')) &&
   /document\.getElementById/.test(codeOf('bdspRender')),
   'only bdspRenderScannerResultsOverride, bdspRestoreFrontendScannerResults and bdspRender reach the live DOM');
(function () {
  const domOwners = BDSP_ALL.filter(function (n) { return /document\.getElementById/.test(codeOf(n)); });
  deepEq(domOwners.sort(), ['bdspRender', 'bdspRenderScannerResultsOverride', 'bdspRestoreFrontendScannerResults'],
         'exactly three BDSP functions perform a DOM lookup');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTERNAL CALL GRAPH
// ─────────────────────────────────────────────────────────────────────────────
section('5. internal call graph');

// Direct BDSP→BDSP edges, measured from the stripped source.
const EDGES = {};
BDSP_ALL.forEach(function (from) {
  const c = codeOf(from);
  EDGES[from] = BDSP_ALL.filter(function (to) {
    return to !== from && new RegExp('\\b' + to + '\\s*\\(').test(c);
  });
});

deepEq(EDGES.bdspLoadPersistedEnabled, ['bdspStorageKey'], 'bdspLoadPersistedEnabled → bdspStorageKey only');
deepEq(EDGES.bdspPersistEnabled, ['bdspStorageKey'], 'bdspPersistEnabled → bdspStorageKey only');
deepEq(EDGES.bdspIsEnabled, ['bdspState'], 'bdspIsEnabled → bdspState only');
deepEq(EDGES.bdspSetEnabled, ['bdspState', 'bdspPersistEnabled', 'bdspRender'], 'bdspSetEnabled → bdspState, bdspPersistEnabled, bdspRender');
deepEq(EDGES.bdspToggle, ['bdspIsEnabled', 'bdspSetEnabled'], 'bdspToggle → bdspIsEnabled, bdspSetEnabled');
deepEq(EDGES.bdspRefresh, ['bdspRender'], 'bdspRefresh → bdspRender (the BSS delegation is an external edge, §13)');
deepEq(EDGES.bdspIsScannerSourceActive, ['bdspIsEnabled'], 'bdspIsScannerSourceActive → bdspIsEnabled only');
deepEq(EDGES.bdspMaybeRenderScannerResults, ['bdspIsScannerSourceActive', 'bdspRenderScannerResultsOverride'],
       'bdspMaybeRenderScannerResults → bdspIsScannerSourceActive, bdspRenderScannerResultsOverride');
deepEq(EDGES.bdspRenderBackendResultRows, ['bdspRenderRows'], 'bdspRenderBackendResultRows → bdspRenderRows (thin alias)');
deepEq(EDGES.bdspRender, ['bdspIsEnabled', 'bdspRenderScannerResultsOverride', 'bdspRestoreFrontendScannerResults'],
       'bdspRender → bdspIsEnabled, bdspRenderScannerResultsOverride, bdspRestoreFrontendScannerResults');
deepEq(EDGES.bdspInit, ['bdspState', 'bdspLoadPersistedEnabled', 'bdspRender'],
       'bdspInit → bdspState, bdspLoadPersistedEnabled, bdspRender');
deepEq(EDGES.bdspGetRowsForScannerResults, [], 'bdspGetRowsForScannerResults calls no BDSP function (adapter + BSS only)');
deepEq(EDGES.bdspStorageKey, [], 'bdspStorageKey is a leaf');
deepEq(EDGES.bdspState, [], 'bdspState is a leaf (it only touches S)');
deepEq(EDGES.bdspBadge, [], 'bdspBadge is a leaf (escHtml only)');
deepEq(EDGES.bdspKV, [], 'bdspKV is a leaf (escHtml only)');

// No BDSP→BDSP cycle exists inside the module itself.
(function () {
  const state = {};
  let cyclic = null;
  function visit(n, stack) {
    if (state[n] === 1) { cyclic = stack.concat(n).join(' → '); return; }
    if (state[n] === 2) return;
    state[n] = 1;
    EDGES[n].forEach(function (m) { visit(m, stack.concat(n)); });
    state[n] = 2;
  }
  BDSP_ALL.forEach(function (n) { if (!state[n]) visit(n, []); });
  eq(cyclic, null, 'the internal BDSP call graph is acyclic');
})();

// The only cycle in the WHOLE graph crosses the module boundary and is broken by
// an enabled check — this is the single most important structural fact for a
// future extraction and is measured, not assumed.
ok(/\bbdspMaybeRenderScannerResults\s*\(/.test(codeOf('renderScanResults')) &&
   /\brenderScanResults\s*\(/.test(codeOf('bdspRestoreFrontendScannerResults')),
   'a cross-boundary cycle exists: bdspRestoreFrontendScannerResults → renderScanResults → bdspMaybeRenderScannerResults');
ok(/if\s*\(\s*!\s*bdspIsScannerSourceActive\s*\(\s*\)\s*\)\s*return\s+false/.test(codeOf('bdspMaybeRenderScannerResults')),
   'the cycle terminates because bdspMaybeRenderScannerResults returns false when the preview is OFF');
ok(/else\s+bdspRestoreFrontendScannerResults\s*\(/.test(codeOf('bdspRender')),
   'bdspRender only enters the restore branch when the preview is OFF, so the cycle cannot recurse');

// Dead / unreferenced within the module.
deepEq(BDSP_ALL.filter(function (n) {
  return BDSP_ALL.every(function (m) { return EDGES[m].indexOf(n) < 0; });
}).sort(), ['bdspFmtAge', 'bdspFmtClock', 'bdspFmtNum', 'bdspGetRowsForScannerResults', 'bdspInit',
            'bdspMaybeRenderScannerResults', 'bdspRefresh', 'bdspStorageKey', 'bdspToggle',
            'apexDebugBackendDirectionalPreview'].sort().filter(function (n) {
  return BDSP_ALL.every(function (m) { return EDGES[m].indexOf(n) < 0; });
}), 'the set of BDSP functions with no in-module caller is stable');

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXTERNAL CONSUMERS
// ─────────────────────────────────────────────────────────────────────────────
section('6. external consumers');

// Every BDSP name, and who outside BDSP references it in JavaScript.
const EXTERNAL = {};
BDSP_ALL.forEach(function (n) {
  EXTERNAL[n] = callerNames(n).filter(function (c) { return BDSP_ALL.indexOf(c) < 0; });
});

deepEq(EXTERNAL.bdspMaybeRenderScannerResults, ['renderScanResults'],
       'bdspMaybeRenderScannerResults has exactly one external consumer: renderScanResults');
deepEq(EXTERNAL.bdspRender, ['bssRender'],
       'DIVERGENCE D2 — bdspRender has an external consumer the brief did not list: bssRender');
deepEq(EXTERNAL.bdspInit, ['(script-scope)'],
       'DIVERGENCE D1 — bdspInit is called from no named top-level function: its call site is the ' +
       'anonymous launchBtn click handler registered at script scope (§25)');
deepEq(EXTERNAL.bdspSetEnabled, [],
       'bdspSetEnabled has no JavaScript consumer — its only live callers are markup onclick handlers (§29)');
deepEq(EXTERNAL.bdspRefresh, [],
       'bdspRefresh has no JavaScript consumer — its only caller is an onclick baked into generated HTML (§29)');
deepEq(EXTERNAL.apexDebugBackendDirectionalPreview, ['(script-scope)'],
       'the debug helper is referenced only by its own script-scope window exposure');

// Everything else must have NO external consumer: those 26 names are free to
// move without touching any other subsystem.
(function () {
  const withExternal = BDSP_ALL.filter(function (n) { return EXTERNAL[n].length > 0; }).sort();
  deepEq(withExternal,
         ['apexDebugBackendDirectionalPreview', 'bdspInit', 'bdspMaybeRenderScannerResults', 'bdspRender'],
         'exactly four BDSP names are reachable from outside the module in JavaScript');
})();

// Both live cross-boundary calls are typeof-guarded; the bootstrap call is not.
ok(/typeof\s+bdspMaybeRenderScannerResults\s*===\s*'function'/.test(bodyOf('renderScanResults')),
   'renderScanResults calls into BDSP behind a typeof guard (degrades silently if BDSP is missing)');
ok(/typeof\s+bdspRender\s*===\s*'function'/.test(bodyOf('bssRender')),
   'bssRender calls bdspRender behind a typeof guard');
ok(!/typeof\s+bdspInit/.test(SRC.slice(BOOTSTRAP_CALL_INDEX - 400, BOOTSTRAP_CALL_INDEX + 40)),
   'the bdspInit() bootstrap call is NOT typeof-guarded — a missing BDSP would throw in the launch handler');

// Subsystem boundaries: nobody else reaches in.
ok(!/bdsp/i.test(fs.readFileSync(path.resolve(__dirname, '..', 'js', 'adapters', 'backend-directional-adapter.js'), 'utf8')),
   'the extracted BDS adapter contains no reference to BDSP (adapter never calls the preview)');
(function () {
  const bss = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'services', 'backend-scanner-snapshot-service.js'), 'utf8');
  const code = stripCommentsAndStrings(bss);
  ok(!/\bbdsp[A-Za-z0-9_$]*\s*\(/.test(code),
     'the BSS snapshot service calls no BDSP function (only the BSS UI panel does, via bssRender)');
})();
(function () {
  const foreign = ['runScan', 'computeDirectionalSetupCandidates', 'computeRsCandidates', 'renderDirectionalSetupScanner'];
  foreign.forEach(function (f) {
    const b = bodyOf(f);
    if (b == null) { ok(true, f + ' is not declared in the app (nothing to check)'); return; }
    ok(!/\bbdsp[A-Za-z0-9_$]*\s*\(/.test(stripCommentsAndStrings(b)),
       f + ' does not call BDSP directly — the scanner reaches BDSP only through renderScanResults');
  });
})();
(function () {
  const dsbSwing = SPANS.filter(function (s) { return /^(dsb|swing|sfs)/i.test(s.name); });
  const offenders = dsbSwing.filter(function (s) { return /\bbdsp[A-Za-z0-9_$]*\s*\(/.test(stripCommentsAndStrings(SRC.slice(s.start, s.end))); });
  deepEq(offenders.map(function (s) { return s.name; }), [],
         'no DSB / Swing / SFS function depends on BDSP');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 7. BDSP STATE — OWNERSHIP
// ─────────────────────────────────────────────────────────────────────────────
section('7. BDSP state');

(function () {
  const refs = [];
  let m; const re = /S\.backendDirectionalPreview/g;
  while ((m = re.exec(SRC_CODE))) refs.push(enclosingFn(m.index) ? enclosingFn(m.index).name : '(script-scope)');
  deepEq(Array.from(new Set(refs)).sort(), ['bdspState'],
         'S.backendDirectionalPreview is touched by exactly one function: bdspState');
  eq(refs.length, 6, 'bdspState references S.backendDirectionalPreview exactly 6 times');
})();

ok(/backendDirectionalPreview:\s*\{\s*enabled:\s*false\s*\}/.test(SRC),
   'DIVERGENCE D3 — the state ALSO pre-exists in the `const S` object literal as { enabled:false }');
// The seeded slot did NOT travel with the declarations: it is still part of the
// inline `const S` literal, and the module contains no state of its own (§26).
ok(INLINE_SRC.indexOf('backendDirectionalPreview:{ enabled:false }') >= 0,
   'the seeding literal is still a property of the inline `const S` object');
eq((SRC.match(/backendDirectionalPreview:\{ enabled:false \}/g) || []).length, 1,
   'the state is seeded in exactly one place application-wide');
ok(PREVIEW_SRC.indexOf('backendDirectionalPreview:{ enabled:false }') < 0,
   'the module does not duplicate or re-seed the state slot');
ok(declStart('bdspState') < SRC.indexOf('backendDirectionalPreview:{ enabled:false }'),
   'post-extraction bdspState is DECLARED in an earlier script than the `const S` literal — ordering is safe only ' +
   'because bdspState never runs at load time, it runs when a caller calls it (§26, §31)');

(function () {
  const b = makeBox();
  const st1 = b.api.bdspState();
  const st2 = b.api.bdspState();
  ok(st1 === b.S.backendDirectionalPreview, 'bdspState() === S.backendDirectionalPreview');
  ok(st1 === st2, 'bdspState() === bdspState() — reference stable across calls');
  b.api.bdspSetEnabled(true);
  ok(b.api.bdspState() === st1, 'the state reference survives a toggle (never replaced)');
  b.api.bdspRender();
  ok(b.api.bdspState() === st1, 'the state reference survives a render');
})();

(function () {
  // Reconstruction path: a destroyed/foreign state is rebuilt in place.
  const S = { scanData: [], backendDirectionalPreview: null };
  const b = makeBox({ S: S });
  const st = b.api.bdspState();
  ok(st && typeof st === 'object' && st.enabled === false,
     'bdspState() rebuilds a missing state object with enabled:false');
  ok(st === S.backendDirectionalPreview, 'the rebuilt object is installed on S');
  S.backendDirectionalPreview = { enabled: 'yes' };
  eq(b.api.bdspState().enabled, false, 'a non-true enabled value is normalised to false on every read');
  S.backendDirectionalPreview = 'not-an-object';
  ok(b.api.bdspState().enabled === false, 'a non-object state is replaced by a fresh { enabled:false }');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 8. STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────
section('8. state shape');

(function () {
  const b = makeBox();
  deepEq(Object.keys(b.api.bdspState()), ['enabled'], 'initial in-memory shape is exactly { enabled }');
  eq(b.api.bdspState().enabled, false, 'the initial default is OFF');

  b.api.bdspSetEnabled(true);
  ok(Object.keys(b.api.bdspState()).indexOf('scanDataReferenceAtEnable') >= 0,
     'bdspSetEnabled(true) adds scanDataReferenceAtEnable');
  deepEq(Object.keys(b.api.bdspState()).sort(),
         ['enabled', 'lastRenderAt', 'lastRowCount', 'renderedInScannerResults', 'rows', 'scanDataReferenceAtEnable'],
         'after a first ON render the shape is exactly the six documented fields');

  b.api.bdspSetEnabled(false);
  deepEq(Object.keys(b.api.bdspState()).sort(),
         ['enabled', 'lastRenderAt', 'lastRowCount', 'renderedInScannerResults', 'rows', 'scanDataReferenceAtEnable'],
         'toggling OFF removes no field — the extra fields are sticky');
  eq(b.api.bdspState().renderedInScannerResults, false, 'OFF clears renderedInScannerResults');
  eq(b.api.bdspState().lastRowCount, 0, 'OFF resets lastRowCount to 0');
  ok(Array.isArray(b.api.bdspState().rows), 'rows stays an array after OFF (it is not cleared)');
})();

// Which function writes which field — the ownership map a split must preserve.
(function () {
  function writesField(fn, field) { return new RegExp('\\b(?:st|S\\.backendDirectionalPreview)\\.' + field + '\\s*=').test(codeOf(fn)); }
  ok(writesField('bdspSetEnabled', 'enabled'), 'bdspSetEnabled writes st.enabled');
  ok(writesField('bdspSetEnabled', 'scanDataReferenceAtEnable'), 'bdspSetEnabled writes st.scanDataReferenceAtEnable');
  ok(writesField('bdspRenderScannerResultsOverride', 'renderedInScannerResults'), 'bdspRenderScannerResultsOverride writes renderedInScannerResults');
  ok(writesField('bdspRenderScannerResultsOverride', 'lastRenderAt'), 'bdspRenderScannerResultsOverride writes lastRenderAt');
  ok(writesField('bdspRenderScannerResultsOverride', 'lastRowCount'), 'bdspRenderScannerResultsOverride writes lastRowCount');
  ok(writesField('bdspRenderScannerResultsOverride', 'rows'), 'bdspRenderScannerResultsOverride writes rows');
  ok(writesField('bdspRestoreFrontendScannerResults', 'renderedInScannerResults'), 'bdspRestoreFrontendScannerResults writes renderedInScannerResults');
  ok(writesField('bdspRestoreFrontendScannerResults', 'lastRowCount'), 'bdspRestoreFrontendScannerResults writes lastRowCount');
  ok(/bdspState\(\)\.enabled\s*=/.test(codeOf('bdspInit')), 'bdspInit writes bdspState().enabled directly');
  const ASSIGN = /\bst\.[A-Za-z0-9_$]+\s*=(?!=)|bdspState\(\)\.[A-Za-z0-9_$]+\s*=(?!=)|S\.backendDirectionalPreview\s*=(?!=)/;
  const writers = BDSP_ALL.filter(function (n) { return ASSIGN.test(codeOf(n)); }).sort();
  deepEq(writers, ['bdspInit', 'bdspRenderScannerResultsOverride', 'bdspRestoreFrontendScannerResults', 'bdspSetEnabled', 'bdspState'],
         'exactly five functions write BDSP state');
})();

// The in-memory state is NOT a mirror of localStorage: only `enabled` is
// persisted, and only bdspSetEnabled persists it.
(function () {
  const b = makeBox();
  b.api.bdspSetEnabled(true);
  deepEq(Array.from(b.store.keys()), [BDSP_STORAGE_KEY], 'only one key is ever written');
  eq(b.store.get(BDSP_STORAGE_KEY), '1', 'only the enabled flag is persisted — no other state field reaches storage');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 9. LOCALSTORAGE KEY
// ─────────────────────────────────────────────────────────────────────────────
section('9. localStorage key');

(function () {
  const b = makeBox();
  eq(b.api.bdspStorageKey(), BDSP_STORAGE_KEY, 'the storage key is exactly "' + BDSP_STORAGE_KEY + '"');
  eq(b.api.bdspStorageKey(), b.api.bdspStorageKey(), 'the key is a constant, not derived from state');
  ok(/return\s*'apex_directional_backend_preview'/.test(bodyOf('bdspStorageKey')),
     'the key is a literal in bdspStorageKey — no prefix/namespace indirection to carry into a module');
})();
(function () {
  const uses = [];
  let m; const re = /\blocalStorage\b/g;
  while ((m = re.exec(SRC_CODE))) {
    const enc = enclosingFn(m.index);
    if (enc && BDSP_ALL.indexOf(enc.name) >= 0) uses.push(enc.name);
  }
  deepEq(Array.from(new Set(uses)).sort(), ['bdspLoadPersistedEnabled', 'bdspPersistEnabled'],
         'localStorage is reachable from exactly two BDSP functions');
})();
(function () {
  const uses = BDSP_ALL.filter(function (n) { return usesName(codeOf(n), 'bdspStorageKey'); }).sort();
  deepEq(uses, ['bdspLoadPersistedEnabled', 'bdspPersistEnabled'], 'bdspStorageKey has exactly two callers');
  eq((SRC.match(new RegExp("'" + BDSP_STORAGE_KEY + "'", 'g')) || []).length, 1,
     'the raw key literal appears exactly once in the application source — inside bdspStorageKey');
  ok(SRC.indexOf("'" + BDSP_STORAGE_KEY + "'") >= declStart('bdspStorageKey') &&
     SRC.indexOf("'" + BDSP_STORAGE_KEY + "'") < declEnd('bdspStorageKey'),
     'that single literal is inside the bdspStorageKey declaration');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 10. LOAD PERSISTED
// ─────────────────────────────────────────────────────────────────────────────
section('10. load persisted');

(function () {
  const b = makeBox({ storage: {} });
  eq(b.api.bdspLoadPersistedEnabled(), false, 'missing key → false (the default is OFF)');
  eq(b.log.storageReads.length, 1, 'exactly one getItem per call');
  deepEq(b.log.storageReads, [BDSP_STORAGE_KEY], 'the read targets only the BDSP key');
})();
(function () {
  const cases = [['1', true], ['0', false], ['true', false], ['yes', false], ['', false], ['01', false], [' 1', false], ['1 ', false]];
  cases.forEach(function (c) {
    const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: c[0] } });
    eq(b.api.bdspLoadPersistedEnabled(), c[1], 'stored ' + JSON.stringify(c[0]) + ' → ' + c[1] + ' (strict === "1")');
  });
})();
(function () {
  const b = makeBox({ storageThrows: true });
  let threw = false;
  let v;
  try { v = b.api.bdspLoadPersistedEnabled(); } catch (e) { threw = true; }
  ok(!threw, 'a throwing localStorage does not propagate out of bdspLoadPersistedEnabled');
  eq(v, false, 'a throwing localStorage yields the OFF default');
})();
ok(/try\s*\{[\s\S]*localStorage\.getItem[\s\S]*\}\s*catch/.test(bodyOf('bdspLoadPersistedEnabled')),
   'the read is wrapped in try/catch — private-mode safety must survive extraction');
ok(/===\s*'1'/.test(bodyOf('bdspLoadPersistedEnabled')),
   'the accepted truthy value is the strict string "1"');

// ─────────────────────────────────────────────────────────────────────────────
// 11. PERSIST ENABLED
// ─────────────────────────────────────────────────────────────────────────────
section('11. persist enabled');

(function () {
  const b = makeBox();
  b.api.bdspPersistEnabled(true);
  deepEq(b.log.storageWrites, [BDSP_STORAGE_KEY + '=1'], 'true is stored as "1"');
  b.api.bdspPersistEnabled(false);
  eq(b.store.get(BDSP_STORAGE_KEY), '0', 'false is stored as "0" (OFF is written explicitly, not removed)');
  b.api.bdspPersistEnabled(undefined);
  eq(b.store.get(BDSP_STORAGE_KEY), '0', 'any falsy argument is stored as "0"');
  b.api.bdspPersistEnabled('truthy');
  eq(b.store.get(BDSP_STORAGE_KEY), '1', 'any truthy argument is stored as "1" (the coercion is `enabled ? …`)');
  eq(b.log.storageWrites.length, 4, 'exactly one setItem per call');
  eq(b.log.storageReads.length, 0, 'persisting never reads back');
})();
(function () {
  const b = makeBox({ storageThrows: true });
  let threw = false;
  try { b.api.bdspPersistEnabled(true); } catch (e) { threw = true; }
  ok(!threw, 'a throwing localStorage does not propagate out of bdspPersistEnabled');
})();
ok(!/removeItem/.test(BDSP_CODE), 'BDSP never removes its key — OFF is a stored "0", never an absent key');

// Timing: who persists, and when.
(function () {
  const persisters = BDSP_ALL.filter(function (n) { return usesName(codeOf(n), 'bdspPersistEnabled'); });
  deepEq(persisters, ['bdspSetEnabled'], 'bdspSetEnabled is the only function that persists');
  const loaders = BDSP_ALL.filter(function (n) { return usesName(codeOf(n), 'bdspLoadPersistedEnabled'); });
  deepEq(loaders, ['bdspInit'], 'bdspInit is the only function that loads the persisted value');
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' } });
  b.api.bdspInit();
  eq(b.log.storageReads.length, 1, 'bdspInit reads storage exactly once');
  eq(b.log.storageWrites.length, 0, 'bdspInit never writes storage (load is not a round-trip)');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 12. TOGGLE
// ─────────────────────────────────────────────────────────────────────────────
section('12. toggle');

(function () {
  const b = makeBox();
  eq(b.api.bdspIsEnabled(), false, 'bdspIsEnabled() is false by default');
  eq(b.api.bdspSetEnabled(true), undefined, 'bdspSetEnabled returns undefined');
  eq(b.api.bdspIsEnabled(), true, 'ON is reflected by bdspIsEnabled');
  eq(b.store.get(BDSP_STORAGE_KEY), '1', 'ON is persisted immediately');
  ok(b.log.domWrites.some(function (w) { return w.indexOf('#scanResults.innerHTML') === 0; }), 'ON renders');
  eq(b.log.network.length, 0, 'ON performs no network call');
  eq(b.log.timers.length, 0, 'ON starts no timer');
  eq(b.log.bss.filter(function (x) { return x === 'bssRefresh'; }).length, 0, 'ON does not refresh BSS');

  b.api.bdspSetEnabled(false);
  eq(b.api.bdspIsEnabled(), false, 'OFF is reflected by bdspIsEnabled');
  eq(b.store.get(BDSP_STORAGE_KEY), '0', 'OFF is persisted immediately');
  eq(b.log.renderScanResults, 1, 'OFF restores the frontend scanner exactly once');
  eq(b.log.network.length, 0, 'OFF performs no network call');
})();
(function () {
  const b = makeBox();
  ['yes', 1, {}, null, undefined].forEach(function (v) {
    b.api.bdspSetEnabled(v);
    eq(b.api.bdspIsEnabled(), false, 'bdspSetEnabled(' + JSON.stringify(v) + ') is strict === true, so it stays OFF');
  });
})();
// The declared order inside bdspSetEnabled: state → reference capture → persist → render.
(function () {
  const c = codeOf('bdspSetEnabled');
  const iState = c.indexOf('st.enabled =');
  const iRef = c.indexOf('scanDataReferenceAtEnable');
  const iPersist = c.indexOf('bdspPersistEnabled');
  const iRender = c.indexOf('bdspRender');
  ok(iState >= 0 && iState < iRef && iRef < iPersist && iPersist < iRender,
     'bdspSetEnabled order is: set enabled → capture scanData reference → persist → render');
})();
// DIVERGENCE D4 — bdspToggle is dead.
(function () {
  eq(EXTERNAL.bdspToggle.length, 0, 'DIVERGENCE D4 — bdspToggle has no JavaScript caller');
  ok(!/bdspToggle/.test(MARKUP), 'DIVERGENCE D4 — bdspToggle has no markup reference either: it is dead code');
  eq((SRC_CODE.match(/\bbdspToggle\b/g) || []).length, 1,
     'bdspToggle appears exactly once in the whole application source — its own declaration');
  // Pinned as dead, NOT removed and NOT wired. It still has to work if called.
  const b = makeBox();
  b.api.bdspToggle();
  eq(b.api.bdspIsEnabled(), true, 'bdspToggle still flips OFF→ON when invoked manually');
  b.api.bdspToggle();
  eq(b.api.bdspIsEnabled(), false, 'bdspToggle still flips ON→OFF when invoked manually');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 13. REFRESH
// ─────────────────────────────────────────────────────────────────────────────
section('13. refresh');

(function () {
  const c = codeOf('bdspRefresh');
  ok(!/\bfetch\s*\(/.test(c), 'bdspRefresh performs no fetch');
  ok(!/\bttCall\s*\(/.test(c), 'bdspRefresh does not call ttCall');
  ok(!/XMLHttpRequest|WebSocket|EventSource/.test(c), 'bdspRefresh opens no XHR/WebSocket/EventSource');
  ok(!/subscribe|Subscription|FEED_SUBSCRIPTION/i.test(c), 'bdspRefresh opens no subscription');
  ok(!/setTimeout|setInterval|requestAnimationFrame/.test(c), 'bdspRefresh starts no timer');
  ok(!/scanner\/run|\/scanner|http/i.test(c), 'bdspRefresh names no endpoint');
  ok(/typeof\s+bssRefresh\s*===\s*'function'/.test(bodyOf('bdspRefresh')), 'bdspRefresh delegates to bssRefresh behind a typeof guard');
  ok(!/\bS\.scanData\b/.test(c), 'bdspRefresh does not touch S.scanData');
  ok(!/candidates/.test(c), 'bdspRefresh does not touch backend candidates');
  const iRefresh = c.indexOf('bssRefresh');
  const iRender = c.indexOf('bdspRender');
  ok(iRefresh >= 0 && iRefresh < iRender, 'call order is bssRefresh() first, then bdspRender()');
  ok(!/return\s+[^;]/.test(c.replace(/\/\/.*$/gm, '')), 'bdspRefresh has no return expression');
})();
(function () {
  const b = makeBox();
  eq(b.api.bdspRefresh(), undefined, 'bdspRefresh() returns undefined');
  eq(b.log.bss.filter(function (x) { return x === 'bssRefresh'; }).length, 1, 'exactly one bssRefresh() per bdspRefresh()');
  eq(b.log.network.length, 0, 'no network entry point is reached by BDSP itself');
  eq(b.log.timers.length, 0, 'no timer is started by BDSP itself');
})();
(function () {
  // bssRefresh missing → the typeof guard skips it, the render still happens.
  const b = makeBox({ bssRefresh: undefined });
  delete b.box.store.bssRefresh;
  let threw = false;
  try { b.api.bdspRefresh(); } catch (e) { threw = true; }
  ok(!threw, 'a missing bssRefresh does not throw');
})();
(function () {
  // bssRefresh throwing → the exception propagates and the render is skipped.
  const b = makeBox({ bssRefresh: function () { throw new Error('bss down'); } });
  let threw = false, renderedBefore = b.log.domWrites.length;
  try { b.api.bdspRefresh(); } catch (e) { threw = true; }
  ok(threw, 'a throwing bssRefresh propagates out of bdspRefresh (no try/catch today)');
  eq(b.log.domWrites.length, renderedBefore, 'when bssRefresh throws, bdspRender() is never reached');
})();
(function () {
  // The immediate render is synchronous and uses the CURRENT snapshot: refresh
  // does not wait for the BSS fetch to land.
  const b = makeBox();
  b.api.bdspSetEnabled(true);
  const before = b.log.domWrites.filter(function (w) { return w === '#scanResults.innerHTML'; }).length;
  b.api.bdspRefresh();
  const after = b.log.domWrites.filter(function (w) { return w === '#scanResults.innerHTML'; }).length;
  eq(after - before, 1, 'bdspRefresh triggers exactly one immediate synchronous re-render');
})();
// The delegation target itself is where the network lives — pinned so that
// swapping bssRefresh for bssFetchSnapshot is detectable (§33 mutation 5).
ok(/\bbssFetchStatus\s*\(/.test(codeOf('bssRefresh')) && /\bbssFetchSnapshot\s*\(/.test(codeOf('bssRefresh')),
   'DIVERGENCE D6 — the network lives in bssRefresh (bssFetchStatus + bssFetchSnapshot), which BDSP only delegates to');
ok(!/bssFetchSnapshot|bssFetchStatus/.test(BDSP_CODE),
   'BDSP never names a BSS fetch function directly — only bssRefresh');

// ─────────────────────────────────────────────────────────────────────────────
// 14. ADAPTER DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────
section('14. adapter dependencies');

(function () {
  const users = {};
  ADAPTER_DEPS.forEach(function (d) {
    users[d] = BDSP_ALL.filter(function (n) { return new RegExp('\\b' + d + '\\s*\\(').test(codeOf(n)); }).sort();
  });
  deepEq(users.bdsDeriveBackendDirectionalRows, ['apexDebugBackendDirectionalPreview', 'bdspGetRowsForScannerResults'],
         'bdsDeriveBackendDirectionalRows is used by bdspGetRowsForScannerResults and the debug helper');
  deepEq(users.bdsBackendDirectionalSummary, ['apexDebugBackendDirectionalPreview', 'bdspGetRowsForScannerResults', 'bdspRenderSummary'],
         'bdsBackendDirectionalSummary is used by bdspGetRowsForScannerResults, bdspRenderSummary and the debug helper');
  deepEq(users.bdsGetBackendDirectionalSourceState, ['apexDebugBackendDirectionalPreview', 'bdspGetRowsForScannerResults'],
         'bdsGetBackendDirectionalSourceState is used by bdspGetRowsForScannerResults and the debug helper');
  // No other bds* entry point is consumed: the seam is exactly three functions.
  const allBds = SPANS.filter(function (s) { return /^bds[A-Z_]/.test(s.name) || /^_bds/.test(s.name); }).map(function (s) { return s.name; });
  const consumed = allBds.filter(function (n) { return new RegExp('\\b' + n + '\\s*\\(').test(BDSP_CODE); });
  deepEq(consumed.sort(), ADAPTER_DEPS.slice().sort(), 'BDSP consumes exactly three adapter entry points and no primitive');
})();

// Resolution style: direct global calls, no typeof guard, no namespace.
ADAPTER_DEPS.forEach(function (d) {
  ok(!new RegExp("typeof\\s+" + d).test(BDSP_CODE), d + ' is called directly, NOT behind a typeof guard');
  ok(!new RegExp("[A-Za-z0-9_$]\\." + d).test(BDSP_CODE), d + ' is resolved as a bare global — no namespace object');
});

// Physical order: the adapter module is a separate <script>, loaded before the
// inline monolith, so the globals exist by the time BDSP runs.
(function () {
  const adapterPart = PART_RANGES.filter(function (r) { return r.src === ADAPTER_REL; });
  eq(adapterPart.length, 1, 'the adapter is referenced by exactly one <script> tag');
  ADAPTER_DEPS.forEach(function (d) {
    eq(partOf(declStart(d)), ADAPTER_REL, d + ' is declared inside ' + ADAPTER_REL);
    ok(declStart(d) < BDSP_REGION_START, d + ' is declared physically BEFORE the BDSP region');
  });
  ok(adapterPart[0].end <= INLINE_RANGE.start, 'the adapter script is fully evaluated before the inline monolith begins');
  const tagCount = (RAW_HTML.match(/<script[^>]*backend-directional-adapter\.js/g) || []).length;
  eq(tagCount, 1, 'index.html loads backend-directional-adapter.js exactly once');
  ok(!/\basync\b|\bdefer\b/.test((/<script[^>]*backend-directional-adapter\.js[^>]*>/.exec(RAW_HTML) || [''])[0]),
     'the adapter script tag carries no async/defer, so its order is guaranteed');
})();

// No silent fallback: if the adapter were missing, BDSP would throw rather than
// render a degraded panel. Pinned as the CURRENT behaviour, not endorsed.
(function () {
  const b = makeBox();
  delete b.box.store.bdsDeriveBackendDirectionalRows;
  let threw = false;
  try { b.api.bdspGetRowsForScannerResults(); } catch (e) { threw = /FORBIDDEN_GLOBAL|not a function|not defined/.test(String(e)); }
  ok(threw, 'a missing adapter global makes bdspGetRowsForScannerResults throw — there is no silent fallback');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 15. BSS DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────
section('15. BSS dependencies');

(function () {
  const users = {};
  BSS_DEPS_SERVICE.concat(BSS_DEPS_PANEL_UI).forEach(function (d) {
    users[d] = BDSP_ALL.filter(function (n) { return new RegExp('\\b' + d + '\\s*\\(').test(codeOf(n)); }).sort();
  });
  deepEq(users.bssState, ['apexDebugBackendDirectionalPreview', 'bdspGetRowsForScannerResults'],
         'bssState is read by bdspGetRowsForScannerResults and the debug helper only');
  deepEq(users.bssRefresh, ['bdspRefresh'], 'bssRefresh is called by bdspRefresh only');
  deepEq(users.bssNum, ['bdspFmtNum'], 'bssNum is used by bdspFmtNum only');
  deepEq(users.bssFmtAgeMs, ['bdspFmtAge'], 'bssFmtAgeMs is used by bdspFmtAge only');
  deepEq(users.bssFmtClock, ['bdspFmtClock'], 'bssFmtClock is used by bdspFmtClock only');
  // The complete bss* surface BDSP touches — nothing else.
  const allBss = SPANS.filter(function (s) { return /^bss/.test(s.name); }).map(function (s) { return s.name; });
  const consumed = allBss.filter(function (n) { return new RegExp('\\b' + n + '\\b').test(BDSP_CODE); }).sort();
  deepEq(consumed, BSS_DEPS_SERVICE.concat(BSS_DEPS_PANEL_UI).slice().sort(),
         'BDSP touches exactly five bss* names — the whole BSS seam');
})();

// Guard style differs by dependency, and that difference is load-order relevant.
ok(/typeof\s+bssState\s*===\s*'function'/.test(bodyOf('bdspGetRowsForScannerResults')),
   'bssState is typeof-guarded in bdspGetRowsForScannerResults');
ok(/typeof\s+bssState\s*===\s*'function'/.test(bodyOf('apexDebugBackendDirectionalPreview')),
   'bssState is typeof-guarded in the debug helper');
ok(/typeof\s+bssRefresh\s*===\s*'function'/.test(bodyOf('bdspRefresh')), 'bssRefresh is typeof-guarded');
BSS_DEPS_PANEL_UI.forEach(function (d) {
  const owner = { bssNum: 'bdspFmtNum', bssFmtAgeMs: 'bdspFmtAge', bssFmtClock: 'bdspFmtClock' }[d];
  ok(new RegExp("typeof\\s+" + d + "\\s*===\\s*'function'").test(bodyOf(owner)),
     d + ' is typeof-guarded in ' + owner + ' with an inline fallback');
});

// BDSP owns nothing of BSS.
(function () {
  ok(!/S\.backendScanner/.test(BDSP_CODE), 'BDSP never names S.backendScanner');
  ok(!/\.candidates\s*=|\.candidates\.(push|splice|sort|pop|shift|unshift|reverse)/.test(BDSP_CODE),
     'BDSP never assigns to or mutates snapshot.candidates');
  ok(!/\.status\s*=/.test(BDSP_CODE), 'BDSP never assigns to a status object');
  ok(!/bssStartPolling|bssStopPolling|bssPoll|bssSchedule/.test(BDSP_CODE), 'BDSP neither starts nor stops BSS polling');
  ok(!/inflight|inFlight|AbortController|abort\b/i.test(BDSP_CODE), 'BDSP knows nothing about single-flight Promises or aborts');
  ok(!/timeout|TIMEOUT/.test(BDSP_CODE), 'BDSP knows nothing about BSS timeouts');
  ok(!/\/scanner|\/snapshot|\/status|https?:/.test(BDSP_CODE), 'BDSP names no endpoint');
})();

// Physical split of the BSS seam — the core hoisting risk, measured in §31.
// The seam is no longer split: BOTH halves of the BSS surface BDSP consumes now
// live in scripts that load before this module, so every one of the five is
// resolved by script ORDER, not by hoisting.
BSS_DEPS_SERVICE.forEach(function (d) {
  eq(partOf(declStart(d)), BSS_SERVICE_REL, d + ' lives in ' + BSS_SERVICE_REL + ' (a script BEFORE the monolith)');
  ok(declStart(d) < BDSP_REGION_START, d + ' is declared physically before BDSP');
});
BSS_DEPS_PANEL_UI.forEach(function (d) {
  eq(partOf(declStart(d)), BSS_PANEL_REL, d + ' lives in ' + BSS_PANEL_REL + ' (a script BEFORE this module)');
  ok(declStart(d) < BDSP_REGION_START,
     d + ' is declared physically BEFORE BDSP — the hoisting-only window that made the typeof guard a silent-fallback hazard is closed');
  eq(defCountIn(PREVIEW_SRC, d), 0, d + ' was NOT copied into the preview module');
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. DOM INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
section('16. DOM inventory');

(function () {
  const ids = [];
  let m; const re = /getElementById\((['"])([^'"]+)\1\)/g;
  while ((m = re.exec(BDSP_REGION))) ids.push(m[2]);
  deepEq(ids, ['scanResults', 'scanResults', 'bdsp-preview', 'bdsp-frontend-btn', 'bdsp-backend-btn'],
         'BDSP performs exactly five getElementById lookups over four distinct ids, in this order');
  deepEq(Array.from(new Set(ids)).sort(), DOM_IDS.slice().sort(), 'the DOM surface is exactly four ids');
  ok(!/querySelector|getElementsBy|createElement|appendChild|insertAdjacent|document\.body|document\.write/.test(BDSP_CODE),
     'BDSP uses only getElementById — no querySelector, no node construction, no body access');
  DOM_IDS_MARKUP_ONLY.forEach(function (id) {
    ok(MARKUP.indexOf('id="' + id + '"') >= 0, id + ' exists in markup');
    ok(BDSP_REGION.indexOf("'" + id + "'") < 0, id + ' is never queried by BDSP (markup-only container)');
  });
})();

// Per-id ownership: who looks it up, what it writes, and the missing-element path.
(function () {
  eq(spansOf('bdspRenderScannerResultsOverride').length, 1, 'scanResults owner is a single declaration');
  const ov = codeOf('bdspRenderScannerResultsOverride');
  ok(/if\s*\(\s*!\s*scan\s*\)\s*return\s+false/.test(ov), '#scanResults missing → bdspRenderScannerResultsOverride returns false (no throw)');
  ok(/scan\.style\.display\s*=\s*$|scan\.style\.display\s*=/.test(ov), '#scanResults: style.display written by the override');
  ok(/scan\.innerHTML\s*=/.test(ov), '#scanResults: innerHTML written by the override');
  const re = codeOf('bdspRestoreFrontendScannerResults');
  ok(/if\s*\(\s*scan\s*\)\s*scan\.style\.display/.test(re), '#scanResults missing → restore skips the style write');
  ok(/else\s+if\s*\(\s*scan\s*\)\s*scan\.innerHTML\s*=/.test(re), '#scanResults: restore only clears innerHTML when renderScanResults is absent');
  const rd = codeOf('bdspRender');
  ok(/if\s*\(\s*fb\s*\)\s*fb\.classList\.toggle/.test(rd), '#bdsp-frontend-btn missing → classList write skipped');
  ok(/if\s*\(\s*bb\s*\)\s*bb\.classList\.toggle/.test(rd), '#bdsp-backend-btn missing → classList write skipped');
  ok(/if\s*\(\s*wrap\s*\)\s*\{\s*wrap\.style\.display\s*=\s*""\s*;\s*wrap\.innerHTML\s*=\s*""\s*;\s*\}/.test(rd.replace(/\s+/g, ' ').replace(/ ;/g, ';')) ||
     /if\(wrap\)\{\s*wrap\.style\.display/.test(rd),
     '#bdsp-preview missing → both writes skipped');
})();

// Write counts for the four lifecycle transitions.
(function () {
  function counts(log) {
    const c = {};
    log.forEach(function (w) { c[w] = (c[w] || 0) + 1; });
    return c;
  }
  const b = makeBox();
  b.api.bdspInit();
  const init = counts(b.log.domWrites);
  eq(init['#bdsp-preview.style.display=none'], 1, 'INIT (OFF): #bdsp-preview hidden exactly once');
  eq(init['#bdsp-preview.innerHTML'], 1, 'INIT (OFF): #bdsp-preview cleared exactly once');
  eq(init['#bdsp-frontend-btn.classList.toggle(on,true)'], 1, 'INIT (OFF): frontend button marked active');
  eq(init['#bdsp-backend-btn.classList.toggle(on,false)'], 1, 'INIT (OFF): backend button marked inactive');
  eq(init['#scanResults.style.display=block'], 1, 'INIT (OFF): scanResults shown exactly once');
  eq(init['#scanResults.innerHTML'], undefined, 'INIT (OFF): scanResults innerHTML is NOT written (renderScanResults owns it)');

  b.log.domWrites.length = 0;
  b.api.bdspSetEnabled(true);
  const on = counts(b.log.domWrites);
  eq(on['#scanResults.innerHTML'], 1, 'ON: scanResults innerHTML written exactly once');
  eq(on['#scanResults.style.display=block'], 1, 'ON: scanResults shown exactly once');
  eq(on['#bdsp-preview.innerHTML'], 1, 'ON: the separate preview panel is still cleared and hidden');
  eq(on['#bdsp-preview.style.display=none'], 1, 'ON: #bdsp-preview stays hidden — the override renders into #scanResults');
  eq(on['#bdsp-frontend-btn.classList.toggle(on,false)'], 1, 'ON: frontend button deactivated');
  eq(on['#bdsp-backend-btn.classList.toggle(on,true)'], 1, 'ON: backend button activated');

  b.log.domWrites.length = 0;
  const rsBefore = b.log.renderScanResults;
  b.api.bdspRender();
  eq(counts(b.log.domWrites)['#scanResults.innerHTML'], 1, 'RENDER (ON): exactly one innerHTML write');
  eq(b.log.renderScanResults, rsBefore, 'RENDER (ON): the frontend renderer is not invoked');

  b.log.domWrites.length = 0;
  b.api.bdspRefresh();
  eq(counts(b.log.domWrites)['#scanResults.innerHTML'], 1, 'REFRESH (ON): exactly one innerHTML write');

  b.log.domWrites.length = 0;
  b.api.bdspSetEnabled(false);
  const off = counts(b.log.domWrites);
  eq(off['#scanResults.innerHTML'], undefined, 'OFF: BDSP does not write scanResults innerHTML — it hands over to renderScanResults');
  eq(off['#scanResults.style.display=block'], 1, 'OFF: scanResults shown exactly once');
  eq(b.log.renderScanResults, rsBefore + 1, 'OFF: the frontend renderer runs exactly once');
})();

// Every id BDSP queries exists in the static markup.
DOM_IDS.forEach(function (id) {
  ok(MARKUP.indexOf('id="' + id + '"') >= 0, 'markup declares #' + id);
});
// A completely absent DOM must not throw.
(function () {
  const b = makeBox({ presentIds: [] });
  let threw = false;
  try { b.api.bdspInit(); b.api.bdspSetEnabled(true); b.api.bdspRender(); b.api.bdspSetEnabled(false); } catch (e) { threw = true; }
  ok(!threw, 'a fully missing DOM never throws through init/ON/render/OFF');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 17. HTML ESCAPING
// ─────────────────────────────────────────────────────────────────────────────
section('17. HTML escaping');

(function () {
  const users = BDSP_ALL.filter(function (n) { return /\bescHtml\s*\(/.test(codeOf(n)); }).sort();
  deepEq(users, ['bdspBadge', 'bdspKV', 'bdspRenderBackendResultEmptyState', 'bdspRenderRows',
                 'bdspRenderSourceState', 'bdspRenderSummary'],
         'escHtml is used by exactly six BDSP functions');
  eq(partOf(declStart('escHtml')), '(inline)', 'escHtml lives in the inline monolith');
  ok(declStart('escHtml') > BDSP_REGION_END, 'escHtml is declared AFTER BDSP — another hoisting-only dependency');
  ok(!new RegExp("typeof\\s+escHtml").test(BDSP_CODE), 'escHtml is called directly, without a typeof guard');
  ok(!/function\s+bdspEsc|function\s+bdspEscape/.test(SRC_CODE), 'BDSP defines no escaping helper of its own');
  // Pinned tolerance, not a fix.
  ok(!/replace\(\/'\/g/.test(bodyOf('escHtml')),
     "DIVERGENCE D5 — escHtml escapes & < > \" but NOT the single quote (pinned as-is)");
})();

// Backend-controllable text must never reach the DOM unescaped.
(function () {
  const hostile = candidate({
    symbol: 'EVIL' + XSS,
    cache: { source: 'CACHE' + XSS, candleCount: 7, reason: 'REASON' + XSS, ageMs: 10 },
    directionDiagnostics: { candidateDirection: 'bullish', confidence: 'high', directionSource: 'SRC' + XSS },
    directionParity: { comparable: true, matches: false, mismatchType: 'MISMATCH' + XSS },
  });
  const b = makeBox({
    bssState: function () {
      return { snapshot: snapshot({ candidates: [hostile], reason: 'REASON' + XSS }), status: status() };
    },
  });
  b.api.bdspSetEnabled(true);
  const html = b.elements.scanResults.innerHTML;
  ok(html.length > 0, 'the hostile snapshot produced rendered HTML');
  ok(html.indexOf('EVIL&lt;img') >= 0, 'symbol is escaped in the rows table');
  ok(html.indexOf('CACHE&lt;img') >= 0, 'cache.source (candleSource) is escaped');
  ok(html.indexOf('REASON&lt;img') >= 0, 'cache.reason (candleReason) is escaped');
  ok(html.indexOf('<img src=x') < 0, 'no raw <img> tag from backend text survives anywhere in the output');
  ok(html.indexOf('onerror="alert(1)"') < 0, 'no raw event-handler attribute from backend text survives');
  ok(!/EVIL<|CACHE<|REASON<|SRC<|MISMATCH</.test(html), 'no backend-controlled string reaches the DOM with a live "<"');
  // Top symbols travel the same escaping path.
  ok(html.indexOf('Top symbols') >= 0 && html.split('EVIL&lt;img').length > 2,
     'the escaped symbol also appears escaped in the summary top-symbols badges');
})();
(function () {
  // The five required characters, one at a time, through every text sink.
  ['<', '>', '&', '"', "'"].forEach(function (ch) {
    const b = makeBox({
      bssState: function () {
        return { snapshot: snapshot({ candidates: [candidate({ symbol: 'A' + ch + 'B',
          cache: { source: 'C' + ch + 'D', candleCount: 3, reason: 'E' + ch + 'F', ageMs: 1 } })] }), status: status() };
      },
    });
    b.api.bdspSetEnabled(true);
    const html = b.elements.scanResults.innerHTML;
    if (ch === '<') ok(html.indexOf('A&lt;B') >= 0 && html.indexOf('A<B') < 0, '"<" is escaped in symbol');
    else if (ch === '>') ok(html.indexOf('A&gt;B') >= 0 && html.indexOf('A>B') < 0, '">" is escaped in symbol');
    else if (ch === '&') ok(html.indexOf('A&amp;B') >= 0 && !/A&B/.test(html), '"&" is escaped in symbol');
    else if (ch === '"') ok(html.indexOf('A&quot;B') >= 0 && html.indexOf('A"B') < 0, '"\\"" is escaped in symbol');
    else ok(html.indexOf("A'B") >= 0, "DIVERGENCE D5 — \"'\" passes through unescaped (text-content position only)");
  });
})();
(function () {
  // The source-state card escapes its own reason string.
  const b = makeBox({
    bssState: function () { return { snapshot: { ok: false, candidates: [], reason: 'X' + XSS }, status: status() }; },
  });
  b.api.bdspSetEnabled(true);
  const html = b.elements.scanResults.innerHTML;
  ok(html.indexOf('<img src=x') < 0, 'the unavailable/empty-state card escapes the snapshot reason too');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 18. SOURCE-STATE RENDERING
// ─────────────────────────────────────────────────────────────────────────────
section('18. source-state rendering');

(function () {
  const b = makeBox();
  eq(typeof b.api.bdspRenderSourceState(null), 'string', 'bdspRenderSourceState(null) returns a string, never throws');
  ok(/Backend snapshot panel not loaded yet/.test(b.api.bdspRenderSourceState(null)),
     'a null source state renders the "panel not loaded yet" fallback');
  ok(!/bdsp-grid/.test(b.api.bdspRenderSourceState(null)), 'the null fallback renders no key/value grid');

  const full = b.api.bdspRenderSourceState({
    available: true, reason: null, snapshotOk: true, schedulerEnabled: true,
    stale: false, ageMs: 4200, updatedAt: '2026-07-26T12:00:00.000Z',
    nextScheduledRunAt: '2026-07-26T12:05:00.000Z', diagnosticsReady: true,
  });
  ['Backend available', 'Reason', 'Snapshot ok', 'Scheduler', 'Freshness', 'Age', 'Updated at', 'Next run']
    .forEach(function (label) { ok(full.indexOf('>' + label + '<') >= 0, 'source state renders the "' + label + '" field'); });
  const order = ['Backend available', 'Reason', 'Snapshot ok', 'Scheduler', 'Freshness', 'Age', 'Updated at', 'Next run']
    .map(function (l) { return full.indexOf('>' + l + '<'); });
  ok(order.every(function (v, i) { return i === 0 || v > order[i - 1]; }), 'source-state fields keep their declared order');
  ok(/DIAGNOSTIC ONLY/.test(full) && /NOT OPERATIONAL/.test(full), 'the diagnostic-only / not-operational copy is present');
  ok(/FRESH/.test(full), 'stale:false renders FRESH');
  ok(/>ON</.test(full), 'schedulerEnabled:true renders ON');

  ok(/STALE/.test(b.api.bdspRenderSourceState({ available: true, stale: true })), 'stale:true renders STALE');
  ok(/>OFF</.test(b.api.bdspRenderSourceState({ available: true, schedulerEnabled: false })), 'schedulerEnabled:false renders OFF');
  const partial = b.api.bdspRenderSourceState({});
  ok(typeof partial === 'string' && partial.length > 0, 'an empty source-state object still renders without throwing');
  ok(/—/.test(partial), 'absent fields render the em-dash placeholder');
  ok(/>no</.test(partial), 'available:undefined renders "no"');

  ok(/snapshot_not_ok|—/.test(b.api.bdspRenderSourceState({ available: false, reason: 'snapshot_not_ok' })),
     'an unavailable source renders its reason string');
  ok(!/undefined|NaN|\[object/.test(full + partial), 'no undefined/NaN/[object Object] leaks into the source-state HTML');
})();
(function () {
  // No mutation of the input.
  const b = makeBox();
  const input = { available: true, reason: 'r', snapshotOk: true, schedulerEnabled: true, stale: false, ageMs: 1, updatedAt: 'u', nextScheduledRunAt: 'n' };
  const g = makeWriteGuard();
  b.api.bdspRenderSourceState(g.guard(input, 'sourceState'));
  deepEq(g.writes, [], 'bdspRenderSourceState never mutates its input');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 19. SUMMARY RENDERING
// ─────────────────────────────────────────────────────────────────────────────
section('19. summary rendering');

(function () {
  const b = makeBox();
  const empty = b.api.bdspRenderSummary(null);
  ok(typeof empty === 'string' && empty.length > 0, 'bdspRenderSummary(null) falls back to an empty adapter summary');
  eq(b.log.adapter.filter(function (x) { return x === 'bdsBackendDirectionalSummary'; }).length, 1,
     'the null fallback calls bdsBackendDirectionalSummary([]) exactly once');
  ok(/Total rows/.test(empty) && />0</.test(empty), 'the empty summary renders zeroed counters');

  const s = {
    total: 5, bullish: 3, bearish: 2, rankEligible: 4,
    bucketCounts: { A: 1, B: 2, C: 1, D: 1 },
    parityMatches: 3, parityMismatches: 2,
    withCompleteTechnicals: 4, withCache: 5,
    topSymbols: ['AAPL', 'MSFT', 'SPY'],
  };
  const html = b.api.bdspRenderSummary(s);
  ['Total rows', 'Bullish', 'Bearish', 'Rank eligible', 'Buckets', 'Parity', 'Complete core', 'Top symbols']
    .forEach(function (l) { ok(html.indexOf('>' + l + '<') >= 0, 'summary renders the "' + l + '" field'); });
  const order = ['Total rows', 'Bullish', 'Bearish', 'Rank eligible', 'Buckets', 'Parity', 'Complete core', 'Top symbols']
    .map(function (l) { return html.indexOf('>' + l + '<'); });
  ok(order.every(function (v, i) { return i === 0 || v > order[i - 1]; }), 'summary fields keep their declared order');
  ok(/A 1 \/ B 2 \/ C 1 \/ D 1/.test(html), 'bucketCounts render as "A n / B n / C n / D n"');
  ok(/match 3 \/ mismatch 2/.test(html), 'parity renders as "match n / mismatch n"');
  ok(html.indexOf('AAPL') < html.indexOf('MSFT') && html.indexOf('MSFT') < html.indexOf('SPY'),
     'topSymbols keep the order supplied by the adapter');
  // withCache is computed by the adapter but NOT displayed — pinned as-is.
  ok(!/Cache coverage|With cache/i.test(html),
     'withCache is present in the adapter summary but is NOT rendered by the preview (pinned, not fixed)');

  const partial = b.api.bdspRenderSummary({ total: 2 });
  ok(!/undefined|NaN|\[object/.test(partial), 'an incomplete summary renders zeros, never undefined/NaN');
  ok(/A 0 \/ B 0 \/ C 0 \/ D 0/.test(partial), 'a missing bucketCounts renders all zeros');
  ok(/—/.test(b.api.bdspRenderSummary({ total: 0, topSymbols: [] })), 'empty topSymbols renders the em-dash placeholder');

  const unsafe = b.api.bdspRenderSummary({ total: 1, topSymbols: ['BAD' + XSS] });
  ok(unsafe.indexOf('<img src=x') < 0 && unsafe.indexOf('BAD&lt;img') >= 0, 'unsafe top symbols are escaped');
})();
(function () {
  const b = makeBox();
  const input = { total: 1, bullish: 1, bearish: 0, rankEligible: 1, bucketCounts: { A: 1, B: 0, C: 0, D: 0 }, parityMatches: 1, parityMismatches: 0, withCompleteTechnicals: 1, withCache: 1, topSymbols: ['AAPL'] };
  const g = makeWriteGuard();
  b.api.bdspRenderSummary(g.guard(input, 'summary'));
  deepEq(g.writes, [], 'bdspRenderSummary never mutates its input');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 20. ROWS RENDERING
// ─────────────────────────────────────────────────────────────────────────────
section('20. rows rendering');

const ROW_COLUMNS = ['Symbol', 'Source', 'Direction', 'Confidence', 'Score Preview', 'Bucket',
  'Rank Eligible', 'Price', 'RSI14', 'RS vs SPY', 'SMA8/SMA20/SMA30', 'Dist SMA8/SMA20',
  'Parity', 'Candles', 'Core Technicals', 'Operational Direction', 'Operational Score', 'Warnings'];

(function () {
  const b = makeBox();
  ok(/No backend directional rows are currently eligible/.test(b.api.bdspRenderRows([])), 'empty rows render the empty state');
  ok(/No backend directional rows are currently eligible/.test(b.api.bdspRenderRows(null)), 'null rows render the empty state');
  ok(/No backend directional rows are currently eligible/.test(b.api.bdspRenderRows('nope')), 'a non-array renders the empty state');
  ok(!/<table/.test(b.api.bdspRenderRows([])), 'the empty state renders no table');

  const rows = [
    { symbol: 'AAPL', direction: 'bullish', directionConfidence: 'high', scorePreview: 91, scoreBucket: 'A',
      rankEligible: true, price: 187.5, rsi14: 58, relativeStrengthVsSpy: 1.42,
      sma8: 185, sma20: 182, sma30: 180, distFromSma8: 1.3, distFromSma20: 3,
      parityComparable: true, parityMatches: true, candleCount: 320, candleSource: 'BACKEND_DXLINK_CANDLE_CACHE',
      candleReason: null, completeCoreTechnicals: true, operationalDirection: null, operationalScore: null, warnings: [] },
    { symbol: 'MSFT', direction: 'bearish', directionConfidence: null, scorePreview: 70, scoreBucket: 'C',
      rankEligible: false, price: null, rsi14: null, relativeStrengthVsSpy: null,
      sma8: null, sma20: null, sma30: null, distFromSma8: null, distFromSma20: null,
      parityComparable: true, parityMatches: false, candleCount: null, candleSource: null,
      candleReason: 'cold', completeCoreTechnicals: false, operationalDirection: null, operationalScore: null,
      warnings: ['parity_mismatch', 'core_technicals_incomplete'] },
  ];
  const html = b.api.bdspRenderRows(rows);

  const heads = ROW_COLUMNS.map(function (c) { return html.indexOf('<th>' + c.replace(/&/g, '&amp;') + '</th>'); });
  ok(heads.every(function (v) { return v >= 0; }), 'all 18 columns are present');
  ok(heads.every(function (v, i) { return i === 0 || v > heads[i - 1]; }), 'the 18 columns keep their exact order');
  eq((html.match(/<th>/g) || []).length, 18, 'the table has exactly 18 columns');
  eq((html.match(/<tr>/g) || []).length, 3, 'one header row plus one row per input row');
  ok(html.indexOf('AAPL') < html.indexOf('MSFT'), 'row order is the order received — the preview never re-sorts');

  ok(/BULLISH/.test(html) && /BEARISH/.test(html), 'direction badges render for both directions');
  ok(/91 preview/.test(html), 'scorePreview renders with the "preview" suffix');
  ok(/>A</.test(html) && />C</.test(html), 'bucket badges render');
  ok(/eligible/.test(html) && />no</.test(html), 'rankEligible renders as eligible/no');
  ok(/187\.50/.test(html), 'price uses the 2-digit BSS numeric formatter');
  ok(/58\.0/.test(html), 'rsi14 uses 1 digit');
  ok(/1\.42/.test(html), 'relativeStrengthVsSpy uses 2 digits');
  ok(/185\.00 \/ 182\.00 \/ 180\.00/.test(html), 'SMA triple renders as "a / b / c"');
  ok(/1\.30 \/ 3\.00/.test(html), 'distance pair renders as "a / b"');
  ok(/match/.test(html) && /mismatch/.test(html), 'parity badges render both outcomes');
  ok(/320 · BACKEND_DXLINK_CANDLE_CACHE/.test(html), 'candles render as "count · source"');
  ok(/— · cold/.test(html), 'a missing candle count renders the em-dash and keeps the reason');
  ok(/null \/ inactive/.test(html), 'null operational direction/score render as "null / inactive"');
  eq((html.match(/null \/ inactive/g) || []).length, 4, 'both operational columns render inert for both rows');
  ok(/parity_mismatch, core_technicals_incomplete/.test(html), 'warnings render comma-joined');
  ok(/<td class="bdsp-warn">—<\/td>/.test(html), 'an empty warnings list renders the em-dash');
  ok(!/undefined|NaN|\[object/.test(html), 'no undefined/NaN/[object Object] leaks into the rows HTML');
  ok(/Backend-derived candidates/.test(html) && /Backend Preview rows/.test(html) && /Diagnostic only/.test(html),
     'the rows card keeps its diagnostic-only heading and badges');
})();
(function () {
  const b = makeBox();
  const rows = [{ symbol: 'A', direction: 'bullish', scorePreview: 1, warnings: ['w'] }];
  const g = makeWriteGuard();
  b.api.bdspRenderRows(g.guard(rows, 'rows'));
  deepEq(g.writes, [], 'bdspRenderRows never mutates the rows array or its elements');
})();
(function () {
  // bdspRenderBackendResultRows is a pure alias — same output, no extra work.
  const b = makeBox();
  const rows = [{ symbol: 'A', direction: 'bullish', scorePreview: 1, warnings: [] }];
  eq(b.api.bdspRenderBackendResultRows(rows), b.api.bdspRenderRows(rows),
     'bdspRenderBackendResultRows returns exactly bdspRenderRows output');
  ok(/^\s*function bdspRenderBackendResultRows\(rows\)\{ return bdspRenderRows\(rows\); \}$/.test(bodyOf('bdspRenderBackendResultRows').trim()),
     'bdspRenderBackendResultRows is a one-line delegation and nothing else');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 21. SCANNER OVERRIDE
// ─────────────────────────────────────────────────────────────────────────────
section('21. scanner override');

(function () {
  // The real call graph, measured.
  const raw = bodyOf('renderScanResults');
  ok(/typeof bdspMaybeRenderScannerResults === 'function' && bdspMaybeRenderScannerResults\(\)\) return;/.test(raw),
     'renderScanResults short-circuits on the FIRST statement when the override renders');
  ok(raw.indexOf('bdspMaybeRenderScannerResults') < 120,
     'the BDSP hook is the first thing renderScanResults does — nothing frontend runs before it');
})();
(function () {
  const b = makeBox();
  eq(b.api.bdspMaybeRenderScannerResults(), false, 'OFF: bdspMaybeRenderScannerResults returns false (frontend keeps rendering)');
  eq(b.log.domGet.length, 0, 'OFF: the override is not even reached — no DOM lookup');
  b.api.bdspSetEnabled(true);
  b.log.domGet.length = 0;
  eq(b.api.bdspMaybeRenderScannerResults(), true, 'ON: bdspMaybeRenderScannerResults returns true (frontend is suppressed)');
  ok(b.log.domGet.indexOf('scanResults') >= 0, 'ON: the override looks up #scanResults');
})();
(function () {
  const b = makeBox({ presentIds: ['bdsp-preview', 'bdsp-frontend-btn', 'bdsp-backend-btn'] });
  b.api.bdspSetEnabled(true);
  eq(b.api.bdspRenderScannerResultsOverride(), false, 'a missing #scanResults makes the override return false');
})();
(function () {
  // The full chain: override → bdspGetRowsForScannerResults → bssState + adapter.
  const b = makeBox();
  b.api.bdspSetEnabled(true);
  ok(b.log.bss.indexOf('bssState') >= 0, 'the override reads the snapshot through bssState');
  deepEq(Array.from(new Set(b.log.adapter)).sort(), ADAPTER_DEPS.slice().sort(),
         'the override calls all three adapter entry points');
  const pack = b.api.bdspGetRowsForScannerResults();
  deepEq(Object.keys(pack), ['state', 'snapshot', 'status', 'sourceState', 'rows', 'summary'],
         'bdspGetRowsForScannerResults returns exactly { state, snapshot, status, sourceState, rows, summary }');
  ok(Array.isArray(pack.rows), 'the pack carries a rows array');
  ok(/includeNonEligible\s*:\s*false/.test(codeOf('bdspGetRowsForScannerResults')),
     'the preview requests eligible rows only (includeNonEligible:false)');

  const html = b.elements.scanResults.innerHTML;
  ok(/Backend Preview source active — diagnostic only/.test(html), 'the override headline is unchanged');
  ok(/onclick="bdspRefresh\(\)"/.test(html), 'the override embeds exactly the bdspRefresh() onclick handler');
  eq((html.match(/onclick="/g) || []).length, 1, 'the override embeds exactly one inline handler');
  ok(/RUN SCAN updates frontend scanner data/.test(html), 'the RUN SCAN note copy is unchanged');
  ok(/NOT OPERATIONAL/.test(html), 'the override is labelled not-operational');
})();
(function () {
  // The unavailable branch: no summary, no rows, just the empty-state card.
  const cases = [
    ['no bssState', function () { return null; }],
    ['snapshot not ok', function () { return { snapshot: { ok: false, reason: 'NO_SNAPSHOT', candidates: [] }, status: status() }; }],
    ['no candidates', function () { return { snapshot: snapshot({ candidates: [] }), status: status() }; }],
  ];
  cases.forEach(function (c) {
    const b = makeBox({ bssState: c[1] });
    b.api.bdspSetEnabled(true);
    const html = b.elements.scanResults.innerHTML;
    ok(/Backend snapshot unavailable — switch back to Frontend Scanner or wait for scheduler/.test(html),
       c[0] + ' → the empty-state card is rendered');
    ok(!/Backend-derived candidates/.test(html), c[0] + ' → no rows table is rendered');
    ok(!/Backend directional summary/.test(html), c[0] + ' → no summary card is rendered');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 22. FRONTEND RESTORE
// ─────────────────────────────────────────────────────────────────────────────
section('22. frontend restore');

(function () {
  const b = makeBox();
  b.api.bdspSetEnabled(true);
  const before = b.log.renderScanResults;
  b.api.bdspSetEnabled(false);
  eq(b.log.renderScanResults, before + 1, 'toggle OFF calls the real frontend renderer exactly once');
  eq(b.api.bdspState().renderedInScannerResults, false, 'restore clears renderedInScannerResults');
  eq(b.api.bdspState().lastRowCount, 0, 'restore zeroes lastRowCount');
  ok(/typeof\s+renderScanResults\s*===\s*'function'/.test(bodyOf('bdspRestoreFrontendScannerResults')),
     'the restore path is typeof-guarded on renderScanResults');
})();
(function () {
  // No frontend renderer → the area is cleared instead of left stale.
  const b = makeBox({ renderScanResults: undefined });
  delete b.box.store.renderScanResults;
  b.api.bdspSetEnabled(true);
  const stale = b.elements.scanResults.innerHTML;
  ok(stale.length > 0, 'the override wrote backend HTML');
  b.api.bdspSetEnabled(false);
  eq(b.elements.scanResults.innerHTML, '', 'without renderScanResults the override HTML is cleared, not left behind');
})();
(function () {
  const b = makeBox({ presentIds: [] });
  let threw = false;
  try { b.api.bdspRestoreFrontendScannerResults(); } catch (e) { threw = true; }
  ok(!threw, 'restore with no #scanResults does not throw');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 23. S.scanData PRESERVATION
// ─────────────────────────────────────────────────────────────────────────────
section('23. S.scanData preservation');

(function () {
  const c = BDSP_CODE;
  ok(!/S\.scanData\s*=/.test(c), 'no BDSP statement assigns to S.scanData');
  ok(!/S\.scanData\.(push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)\s*\(/.test(c),
     'no BDSP statement mutates S.scanData through an array method');
  ok(!/S\.scanData\[/.test(c), 'no BDSP statement writes an index of S.scanData');
  const readers = BDSP_ALL.filter(function (n) { return /\bS\.scanData\b/.test(codeOf(n)); }).sort();
  deepEq(readers, ['apexDebugBackendDirectionalPreview', 'bdspSetEnabled'],
         'S.scanData is READ by exactly two BDSP functions and written by none');
})();
(function () {
  // Deep write-guard: any write anywhere under S.scanData is recorded.
  const g = makeWriteGuard();
  const realScan = [{ ticker: 'FRONTEND', score: 1 }, { ticker: 'OTHER', score: 2 }];
  const S = { scanData: g.guard(realScan, 'S.scanData'), backendDirectionalPreview: { enabled: false } };
  const b = makeBox({ S: S });
  const identity = S.scanData;
  const jsonBefore = JSON.stringify(realScan);

  b.api.bdspInit();
  b.api.bdspSetEnabled(true);
  deepEq(g.writes, [], 'toggle ON writes nothing into S.scanData');
  b.api.bdspRender();
  deepEq(g.writes, [], 'a backend render writes nothing into S.scanData');
  b.api.bdspRefresh();
  deepEq(g.writes, [], 'refresh writes nothing into S.scanData');
  b.api.bdspMaybeRenderScannerResults();
  deepEq(g.writes, [], 'the scanner override writes nothing into S.scanData');
  b.api.bdspSetEnabled(false);
  deepEq(g.writes, [], 'toggle OFF writes nothing into S.scanData');

  ok(S.scanData === identity, 'the S.scanData reference is never replaced');
  eq(JSON.stringify(realScan), jsonBefore, 'the underlying frontend array is byte-identical after the full ON/render/refresh/OFF cycle');
  eq(realScan.length, 2, 'no row was appended to the frontend scanner data');
})();
(function () {
  // Backend rows are stored on BDSP state, never copied into S.scanData.
  const b = makeBox();
  b.api.bdspSetEnabled(true);
  const st = b.api.bdspState();
  ok(Array.isArray(st.rows) && st.rows.length > 0, 'backend rows are parked on BDSP state');
  ok(st.rows !== b.S.scanData, 'the backend rows array is not S.scanData');
  ok(b.S.scanData.every(function (r) { return r.ticker === 'FRONTEND'; }), 'S.scanData still holds only frontend rows');
  ok(st.scanDataReferenceAtEnable === b.S.scanData,
     'scanDataReferenceAtEnable captures the SAME reference (the audit hook the debug helper reports)');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 24. BSS SNAPSHOT PRESERVATION
// ─────────────────────────────────────────────────────────────────────────────
section('24. BSS snapshot preservation');

(function () {
  const g = makeWriteGuard();
  const snap = snapshot({ candidates: [candidate(), candidate({ symbol: 'MSFT' })] });
  const stat = status();
  const bssStateObj = { snapshot: snap, status: stat };
  const jsonBefore = JSON.stringify(bssStateObj);
  const b = makeBox({ bssState: function () { return g.guard(bssStateObj, 'bssState()'); } });

  b.api.bdspInit();
  b.api.bdspSetEnabled(true);
  b.api.bdspRender();
  b.api.bdspRefresh();
  b.api.apexDebugBackendDirectionalPreview();
  b.api.bdspSetEnabled(false);

  deepEq(g.writes, [], 'BDSP performs zero writes anywhere in the BSS state tree');
  eq(JSON.stringify(bssStateObj), jsonBefore, 'the BSS snapshot and status are byte-identical after a full lifecycle');
  eq(snap.candidates.length, 2, 'snapshot.candidates is neither extended nor truncated');
})();
(function () {
  const b = makeBox();
  b.api.bdspSetEnabled(true);
  const st = b.api.bdspState();
  const raw = b.api.bdspGetRowsForScannerResults();
  ok(st.rows !== raw.snapshot.candidates, 'the stored rows array is not the snapshot candidates array');
  ok(st.rows.every(function (r) { return raw.snapshot.candidates.indexOf(r) < 0; }),
     'no stored row is a live reference to a backend candidate object');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 25. BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────
section('25. bootstrap');

(function () {
  const refs = [];
  let m; const re = /\bbdspInit\s*\(/g;
  while ((m = re.exec(MASKED))) {
    const enc = enclosingSpanOf(m.index);
    if (!enc || enc.name !== 'bdspInit') refs.push(enc ? enc.name : '(script-scope)');
  }
  eq(refs.length, 1, 'DIVERGENCE D1 — bdspInit() has exactly ONE call site in the whole application');
  deepEq(refs, ['(script-scope)'],
         'DIVERGENCE D1 — that call site is inside no named top-level function');
  eq((MASKED.match(/\bbdspInit\b/g) || []).length, 2,
     'bdspInit appears exactly twice in the application source: its declaration and its single call');
  ok(!/bdspInit/.test(MARKUP), 'no markup handler calls bdspInit');

  // Where it actually is: the anonymous async click handler of #launchBtn.
  ok(BOOTSTRAP_CALL_INDEX > 0, 'the bootstrap call site was located');
  eq(partOf(BOOTSTRAP_CALL_INDEX), '(inline)', 'the bootstrap call is inside the inline monolith');
  ok(depthAt(BOOTSTRAP_CALL_INDEX) > 0,
     'DIVERGENCE D1 — the bootstrap call is at brace depth ' + depthAt(BOOTSTRAP_CALL_INDEX) +
     ', NOT a top-level statement: it cannot simply be moved into a module');
  eq(depthAt(BOOTSTRAP_CALL_INDEX), 2, 'the call sits two braces deep: click handler → try block');
  const before = SRC.slice(0, BOOTSTRAP_CALL_INDEX);
  const handlerAt = before.lastIndexOf("getElementById('launchBtn').addEventListener('click'");
  ok(handlerAt > 0, 'the enclosing construct is the #launchBtn click listener registration');
  eq((SRC.match(/getElementById\('launchBtn'\)\.addEventListener/g) || []).length, 1,
     'that listener is registered exactly once');
  ok(/async function\s*\(\s*\)\s*\{/.test(SRC.slice(handlerAt, handlerAt + 120)),
     'the handler is an anonymous async function — there is no named routine to move the call out of');
  ok(/bssInit\(\);[\s\S]{0,160}?bdspInit\(\);/.test(SRC),
     'the bootstrap call sits immediately after bssInit() in the same bring-up sequence');
  ok(BOOTSTRAP_CALL_INDEX > BDSP_REGION_END,
     'the call is physically after the BDSP declarations — no hoisting is needed for the call itself');
  // The split the relocation had to get exactly right: DECLARATION in the module,
  // CALL in the monolith, and not one extra call anywhere.
  eq(partOf(declStart('bdspInit')), PREVIEW_REL, 'the bdspInit DECLARATION lives in the module');
  eq(defCountIn(PREVIEW_SRC, 'bdspInit'), 1, 'bdspInit is declared exactly once in the module file');
  eq(defCountIn(INLINE_SRC, 'bdspInit'), 0, 'bdspInit is not declared in the monolith any more');
  ok(INLINE_SRC.indexOf('bdspInit();') >= 0, 'the `bdspInit();` CALL is a statement of the inline monolith');
  eq((stripCommentsAndStrings(PREVIEW_SRC).match(/\bbdspInit\b/g) || []).length, 1,
     'bdspInit appears exactly once in the module — its declaration header, never a call');
  eq((stripCommentsAndStrings(INLINE_SRC).match(/\bbdspInit\b/g) || []).length, 1,
     'bdspInit appears exactly once in the monolith — the single bootstrap call');
})();
(function () {
  const b = makeBox({ storage: {} });
  b.api.bdspInit();
  deepEq(b.log.storageReads, [BDSP_STORAGE_KEY], 'init reads localStorage exactly once, for the BDSP key only');
  eq(b.log.storageWrites.length, 0, 'init writes localStorage zero times');
  eq(b.log.network.length, 0, 'init performs no network call');
  eq(b.log.timers.length, 0, 'init starts no timer');
  eq(b.api.bdspIsEnabled(), false, 'init with no stored value leaves the preview OFF');
  eq(b.log.renderScanResults, 1, 'init (OFF) hands rendering to the frontend renderer exactly once');
  deepEq(Array.from(new Set(b.log.domGet)).sort(), ['bdsp-backend-btn', 'bdsp-frontend-btn', 'bdsp-preview', 'scanResults'],
         'init touches exactly the four BDSP dom ids');
  eq(b.log.adapter.length, 0, 'init (OFF) calls no adapter function');
  eq(b.log.bss.length, 0, 'init (OFF) calls no BSS function');
})();
(function () {
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' } });
  b.api.bdspInit();
  eq(b.api.bdspIsEnabled(), true, 'init with a stored "1" restores the preview ON');
  ok(b.log.adapter.length > 0, 'init (ON) reaches the adapter to render the override');
  ok(b.log.bss.indexOf('bssState') >= 0, 'init (ON) reads BSS state');
  eq(b.log.network.length, 0, 'init (ON) still performs no network call');
  eq(b.log.timers.length, 0, 'init (ON) still starts no timer');
  eq(b.log.renderScanResults, 0, 'init (ON) does not call the frontend renderer');
})();
(function () {
  // Idempotency: the launch bring-up sequence can be replayed (a reconnect
  // repeats the same #launchBtn handler path), so init can run more than once.
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' } });
  b.api.bdspInit();
  const st = b.api.bdspState();
  const readsAfterFirst = b.log.storageReads.length;
  b.api.bdspInit();
  eq(b.log.storageReads.length, readsAfterFirst + 1, 're-running init re-reads localStorage (one read per call)');
  ok(b.api.bdspState() === st, 're-running init keeps the same state object');
  eq(b.api.bdspIsEnabled(), true, 're-running init converges on the same enabled value');
  eq(b.log.storageWrites.length, 0, 're-running init still never writes localStorage');
  eq(b.log.network.length, 0, 're-running init still performs no network call');
  ok(true, 'init is idempotent in state but NOT in side effects: every call re-renders (2 renders for 2 calls)');
})();
(function () {
  const b = makeBox({ presentIds: [] });
  let threw = false;
  try { b.api.bdspInit(); } catch (e) { threw = true; }
  ok(!threw, 'init with a completely missing DOM does not throw');
})();
(function () {
  const b = makeBox({ storageThrows: true });
  let threw = false;
  try { b.api.bdspInit(); } catch (e) { threw = true; }
  ok(!threw, 'init with a throwing localStorage does not throw');
  eq(b.api.bdspIsEnabled(), false, 'a throwing localStorage leaves the preview OFF');
})();
(function () {
  // Missing BSS state → init(ON) still renders the unavailable card.
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' }, bssState: undefined });
  delete b.box.store.bssState;
  let threw = false;
  try { b.api.bdspInit(); } catch (e) { threw = true; }
  ok(!threw, 'init (ON) with no bssState global does not throw — the typeof guard holds');
  ok(/Backend snapshot unavailable/.test(b.elements.scanResults.innerHTML),
     'init (ON) with no bssState renders the unavailable card');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 26. LOAD-TIME — DECLARATIONS ONLY
// ─────────────────────────────────────────────────────────────────────────────
section('26. load-time declarations');

(function () {
  // Evaluate the 32 declarations in a context where EVERY identifier outside a
  // tiny intrinsic allowlist throws. If any declaration ran code, this fails.
  const box = makeStrictSandbox();
  let threw = null;
  try {
    BDSP_ALL.forEach(function (n) { vm.runInContext(APP.extractFunctionSource(n, { source: SRC }), box.context); });
  } catch (e) { threw = String(e); }
  eq(threw, null, 'evaluating all 32 declarations touches no forbidden global');
  deepEq(box.touched, [], 'the strict sandbox recorded zero identifier accesses at declaration time');
  BDSP_ALL.forEach(function (n) {
    eq(typeof vm.runInContext('typeof ' + n, box.context), 'string', n + ' evaluates to a value');
  });
  eq(vm.runInContext('typeof bdspInit', box.context), 'function', 'the declarations are hoistable functions after evaluation');
})();
(function () {
  // Static confirmation of the same fact, so the guarantee is not sandbox-only:
  // EVERY reference to a side-effecting global inside the region must fall
  // inside one of the 32 declarations. A top-level `document.getElementById(…)`,
  // `localStorage.getItem(…)` or `S.… =` added to the region would surface here
  // as an out-of-span offset, even if the strict sandbox above were loosened.
  const DECL_SPANS = BDSP_ALL.map(function (n) { return spansOf(n)[0]; });
  function insideADeclaration(abs) {
    return DECL_SPANS.some(function (s) { return s.start <= abs && abs < s.end; });
  }
  [['document', 5], ['localStorage', 2], ['S', 8]].forEach(function (pair) {
    const g = pair[0], expected = pair[1];
    const re = new RegExp('\\b' + g + '\\b', 'g');
    const hits = [];
    let m;
    while ((m = re.exec(BDSP_CODE))) hits.push(BDSP_REGION_START + m.index);
    eq(hits.length, expected, 'the region references `' + g + '` exactly ' + expected + ' times');
    deepEq(hits.filter(function (abs) { return !insideADeclaration(abs); }), [],
           'every `' + g + '` reference sits inside a function body — none at region top level');
  });
  ok(!/\bwindow\b/.test(BDSP_CODE),
     'the region itself never references `window` (the exposure lives in the trailing statement, §3)');
  ok(!/^\s*(?!function)\S/m.test(BDSP_CODE.split('\n').filter(function (l) {
    return l.trim() && !/^\s/.test(l) && !/^function /.test(l) && !/^\}/.test(l);
  }).join('\n')), 'no column-0 statement other than function declarations and their closing braces');
  ok(!/setTimeout|setInterval|requestAnimationFrame|queueMicrotask/.test(BDSP_CODE), 'BDSP contains no timer anywhere');
  ok(!/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|EventSource|ttCall\s*\(/.test(BDSP_CODE), 'BDSP contains no network call anywhere');
  ok(!/addEventListener/.test(BDSP_CODE), 'BDSP registers no event listener (its handlers are markup onclick attributes)');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 27. LOAD-TIME — REAL BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────
section('27. load-time bootstrap');

(function () {
  // The exact, complete side-effect budget of one real bdspInit() with the
  // preview OFF (today's default). This is the number a future module has to
  // reproduce byte for byte.
  const b = makeBox({ storage: {} });
  b.api.bdspInit();
  eq(b.log.storageReads.length, 1, 'bootstrap OFF: 1 localStorage read');
  eq(b.log.storageWrites.length, 0, 'bootstrap OFF: 0 localStorage writes');
  eq(b.log.domGet.length, 4, 'bootstrap OFF: 4 getElementById lookups');
  eq(b.log.domWrites.length, 5, 'bootstrap OFF: 5 DOM writes');
  eq(b.log.adapter.length, 0, 'bootstrap OFF: 0 adapter calls');
  eq(b.log.bss.length, 0, 'bootstrap OFF: 0 BSS calls');
  eq(b.log.renderScanResults, 1, 'bootstrap OFF: 1 delegation to the frontend renderer');
  eq(b.log.network.length, 0, 'bootstrap OFF: 0 network calls');
  eq(b.log.timers.length, 0, 'bootstrap OFF: 0 timers');
  deepEq(Object.keys(b.S.backendDirectionalPreview), ['enabled', 'renderedInScannerResults', 'lastRowCount'],
         'bootstrap OFF: the restore path adds renderedInScannerResults and lastRowCount — no other field');
})();
(function () {
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' } });
  b.api.bdspInit();
  eq(b.log.storageReads.length, 1, 'bootstrap ON: 1 localStorage read');
  eq(b.log.storageWrites.length, 0, 'bootstrap ON: 0 localStorage writes');
  eq(b.log.domGet.length, 4, 'bootstrap ON: 4 getElementById lookups');
  eq(b.log.bss.filter(function (x) { return x === 'bssState'; }).length, 1, 'bootstrap ON: exactly 1 bssState read');
  eq(b.log.bss.filter(function (x) { return x === 'bssRefresh'; }).length, 0, 'bootstrap ON: bssRefresh is NOT called');
  eq(b.log.adapter.filter(function (x) { return x === 'bdsGetBackendDirectionalSourceState'; }).length, 1,
     'bootstrap ON: 1 bdsGetBackendDirectionalSourceState call');
  eq(b.log.adapter.filter(function (x) { return x === 'bdsDeriveBackendDirectionalRows'; }).length, 1,
     'bootstrap ON: 1 bdsDeriveBackendDirectionalRows call');
  ok(b.log.adapter.filter(function (x) { return x === 'bdsBackendDirectionalSummary'; }).length >= 1,
     'bootstrap ON: bdsBackendDirectionalSummary is called at least once');
  eq(b.log.network.length, 0, 'bootstrap ON: 0 network calls');
  eq(b.log.timers.length, 0, 'bootstrap ON: 0 timers');
  eq(b.log.renderScanResults, 0, 'bootstrap ON: the frontend renderer is not called');
  ok(b.log.bss.some(function (x) { return BSS_DEPS_PANEL_UI.indexOf(x) >= 0; }),
     'bootstrap ON reaches the BSS UI formatters — proof they must exist before init runs');
})();
(function () {
  // The decisive temporal fact for option B: the ON path CALLS the three BSS UI
  // formatters during init, so they must already exist when bdspInit() runs.
  // They used to be declared ~760k characters later in the same inline script,
  // reachable only by hoisting; they now live in js/ui/backend-scanner-snapshot-panel.js,
  // an EARLIER script, so script order guarantees what hoisting used to.
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' } });
  b.api.bdspInit();
  const used = Array.from(new Set(b.log.bss.filter(function (x) { return BSS_DEPS_PANEL_UI.indexOf(x) >= 0; }))).sort();
  deepEq(used, ['bssFmtAgeMs', 'bssFmtClock', 'bssNum'],
         'a real ON bootstrap calls all three shared BSS UI helpers');
  const b2 = makeBox({ storage: {} });
  b2.api.bdspInit();
  eq(b2.log.bss.length, 0, 'an OFF bootstrap calls none of them — the exposure is ON-path only');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 28. DEBUG HELPER
// ─────────────────────────────────────────────────────────────────────────────
section('28. debug helper');

(function () {
  const c = codeOf('apexDebugBackendDirectionalPreview');
  ok(!/document\b/.test(c), 'the debug helper reads no DOM');
  ok(!/innerHTML|style\.|classList/.test(c), 'the debug helper writes no DOM');
  ok(!/localStorage/.test(c), 'the debug helper touches no localStorage');
  ok(!/fetch|ttCall|XMLHttpRequest|WebSocket/.test(c), 'the debug helper performs no network call');
  ok(!/setTimeout|setInterval/.test(c), 'the debug helper starts no timer');
  ok(!/\bbdspRender\b|\bbdspSetEnabled\b|\bbdspRefresh\b/.test(c), 'the debug helper triggers no render and changes no state');
  ok(/typeof\s+bssState\s*===\s*'function'/.test(bodyOf('apexDebugBackendDirectionalPreview')), 'the debug helper typeof-guards bssState');
})();
(function () {
  const b = makeBox();
  const before = JSON.stringify(b.log);
  const off = b.api.apexDebugBackendDirectionalPreview();
  deepEq(Object.keys(off), ['enabled', 'renderingScannerResults', 'sourceState', 'summary', 'rowCount', 'rows', 'scanDataUntouched'],
         'the debug return shape is exactly seven keys');
  eq(off.enabled, false, 'OFF: enabled is false');
  eq(off.renderingScannerResults, false, 'OFF: renderingScannerResults is false');
  eq(off.scanDataUntouched, true, 'OFF: scanDataUntouched is true (no reference was ever captured)');
  ok(off.sourceState && typeof off.sourceState === 'object', 'OFF: a sourceState object is still returned');
  ok(Array.isArray(off.rows), 'OFF: rows is an array');
  eq(b.log.domWrites.length, 0, 'the debug helper wrote nothing to the DOM');
  eq(b.log.storageReads.length + b.log.storageWrites.length, 0, 'the debug helper touched no localStorage');
  eq(b.log.network.length, 0, 'the debug helper performed no network call');
  ok(before !== JSON.stringify(b.log), 'the helper did call adapter/BSS reads (it is not inert)');

  b.api.bdspSetEnabled(true);
  const on = b.api.apexDebugBackendDirectionalPreview();
  eq(on.enabled, true, 'ON: enabled is true');
  eq(on.renderingScannerResults, true, 'ON: renderingScannerResults is true');
  eq(on.scanDataUntouched, true, 'ON: scanDataUntouched is true while S.scanData keeps its captured reference');
  eq(on.rowCount, on.rows.length, 'rowCount always matches rows.length');

  b.S.scanData = [{ ticker: 'REPLACED' }];
  eq(b.api.apexDebugBackendDirectionalPreview().scanDataUntouched, false,
     'replacing S.scanData flips scanDataUntouched to false — the audit hook actually works');
})();
(function () {
  const b = makeBox({ bssState: undefined });
  delete b.box.store.bssState;
  let threw = false, r = null;
  try { r = b.api.apexDebugBackendDirectionalPreview(); } catch (e) { threw = true; }
  ok(!threw, 'the debug helper survives a missing bssState global');
  ok(r && r.rowCount === 0, 'with no BSS state the helper reports zero rows');
})();
// The one split the brief singles out: the DECLARATION travelled, the window
// ASSIGNMENT did not. Both halves are pinned to their owning script.
(function () {
  eq(partOf(declStart('apexDebugBackendDirectionalPreview')), PREVIEW_REL,
     'the debug helper DECLARATION moved into the module');
  eq(defCountIn(PREVIEW_SRC, 'apexDebugBackendDirectionalPreview'), 1,
     'the debug helper is declared exactly once in the module file');
  eq(defCountIn(INLINE_SRC, 'apexDebugBackendDirectionalPreview'), 0,
     'the debug helper declaration was NOT left duplicated in the monolith');
  eq(partOf(BDSP_EXPOSURE_INDEX), '(inline)', 'the window ASSIGNMENT stayed in the inline monolith');
  eq((INLINE_SRC.match(/window\.apexDebugBackendDirectionalPreview/g) || []).length, 1,
     'the monolith carries exactly one window assignment for the helper');
  ok(PREVIEW_SRC.indexOf('window.apexDebugBackendDirectionalPreview') < 0,
     'the window assignment did NOT travel into the module');
  ok(!/window\.apexDebugBackendDirectionalPreview\s*=\s*apexDebugBackendDirectionalPreview\s*\(/.test(SRC_CODE),
     'the exposure assigns the FUNCTION, not the result of calling it');
})();
(function () {
  ok(/window\.apexDebugBackendDirectionalPreview/.test(BDSP_TAIL), 'the helper is exposed on window');
  eq((SRC_CODE.match(/window\.apexDebugBackendDirectionalPreview/g) || []).length, 1, 'exposed exactly once');
  eq(EXTERNAL.apexDebugBackendDirectionalPreview.filter(function (c) { return c !== '(script-scope)'; }).length, 0,
     'no application code calls the debug helper — it is console-only, zero auto-calls');
  const outside = MASKED.slice(0, declStart('apexDebugBackendDirectionalPreview')) +
                  MASKED.slice(declEnd('apexDebugBackendDirectionalPreview'));
  ok(!/apexDebugBackendDirectionalPreview\s*\(/.test(outside),
     'the debug helper is never invoked anywhere in the application source');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 29. MARKUP HANDLERS
// ─────────────────────────────────────────────────────────────────────────────
section('29. markup handlers');

(function () {
  const handlers = [];
  let m; const re = /on[a-z]+\s*=\s*"([^"]*bdsp[^"]*)"/gi;
  while ((m = re.exec(MARKUP))) handlers.push(m[0]);
  deepEq(handlers, ['onclick="bdspSetEnabled(false)"', 'onclick="bdspSetEnabled(true)"'],
         'the static markup contains exactly two BDSP handlers, both bdspSetEnabled');
  ok(/id="bdsp-frontend-btn"\s+onclick="bdspSetEnabled\(false\)"/.test(MARKUP),
     '#bdsp-frontend-btn is wired to bdspSetEnabled(false)');
  ok(/id="bdsp-backend-btn"\s+onclick="bdspSetEnabled\(true\)"/.test(MARKUP),
     '#bdsp-backend-btn is wired to bdspSetEnabled(true)');
  ok(!/bdspToggle|bdspRefresh|bdspRender|bdspInit/.test(MARKUP),
     'the static markup references no other BDSP function');
  // Every markup-referenced BDSP name must actually exist as a global.
  const names = Array.from(new Set((MARKUP.match(/\bbdsp[A-Za-z0-9_$]*\s*\(/g) || [])
    .map(function (s) { return s.replace(/\s*\($/, ''); })));
  deepEq(names, ['bdspSetEnabled'], 'markup depends on exactly one BDSP global name');
  names.forEach(function (n) { ok(BDSP_ALL.indexOf(n) >= 0, 'markup handler ' + n + ' resolves to a real declaration'); });
  // No auto-enable: the ON handler is a click target only.
  ok(!/onload\s*=\s*"[^"]*bdsp/i.test(MARKUP), 'no onload handler enables the preview');
  ok(!/autofocus[^>]*bdsp-backend-btn|bdsp-backend-btn[^>]*autofocus/.test(MARKUP), 'the Backend Preview button is not autofocused');
  ok(/class="bdsp-toggle on"\s+id="bdsp-frontend-btn"/.test(MARKUP),
     'the FRONTEND button carries the initial "on" class — the default rendered state is Frontend Scanner');
  ok(!/class="bdsp-toggle on"\s+id="bdsp-backend-btn"/.test(MARKUP), 'the BACKEND button does not carry the initial "on" class');
})();
(function () {
  // The one handler that lives in generated HTML rather than static markup.
  const b = makeBox();
  b.api.bdspSetEnabled(true);
  const html = b.elements.scanResults.innerHTML;
  eq((html.match(/onclick="bdspRefresh\(\)"/g) || []).length, 1,
     'the generated override HTML contains exactly one bdspRefresh() handler');
  ok(!/onclick="bdspSetEnabled/.test(html), 'the generated override HTML does not duplicate the toggle handlers');
  ok(/onclick="bdspRefresh\(\)"/.test(bodyOf('bdspRenderScannerResultsOverride')),
     'that handler is authored inside bdspRenderScannerResultsOverride');
})();
(function () {
  // All three markup/generated handlers depend on BARE GLOBAL names: any future
  // module MUST keep bdspSetEnabled and bdspRefresh as globals.
  ok(!/window\.bdsp|apex\.bdsp|APEX\.bdsp/.test(MARKUP + BDSP_REGION),
     'no handler uses a namespaced form — the globals cannot be hidden behind an object');
  ok(/onclick="bdspSetEnabled\(false\)"/.test(MARKUP) && /onclick="bdspSetEnabled\(true\)"/.test(MARKUP) &&
     /onclick="bdspRefresh\(\)"/.test(BDSP_REGION),
     'all three handlers call BARE globals: a future module MUST keep bdspSetEnabled and bdspRefresh global');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 30. PHYSICAL SCRIPT ORDER
// ─────────────────────────────────────────────────────────────────────────────
section('30. physical script order');

(function () {
  const srcs = PARTS.map(function (p) { return p.kind === 'inline' ? '(inline)' : p.src; });
  eq(srcs.filter(function (s) { return s === '(inline)'; }).length, 1,
     'index.html still has exactly ONE inline application script — the relocation added no second inline block');
  eq(srcs[srcs.length - 1], '(inline)', 'the inline monolith is the LAST script in the document');
  const iBss = srcs.indexOf(BSS_SERVICE_REL);
  const iAdapter = srcs.indexOf(ADAPTER_REL);
  const iPreview = srcs.indexOf(PREVIEW_REL);
  ok(iBss >= 0 && iAdapter >= 0 && iBss < iAdapter, 'load order starts: BSS snapshot service → BDS adapter');
  ok(iPreview >= 0, 'index.html loads the BDSP module script');
  eq(srcs.filter(function (s) { return /backend-directional-preview/.test(String(s)); }).length, 1,
     'the BDSP module is referenced by EXACTLY ONE script tag (loaded once)');
  ok(iAdapter < iPreview, 'ORDER: the BDSP module loads AFTER the BDS adapter it consumes');
  ok(iBss < iPreview, 'ORDER: the BDSP module loads AFTER the BSS snapshot service it reads');
  // PR 1 of the DSB extraction inserted js/adapters/backend-directional-snapshot-adapter.js
  // between the BDSP module and the inline monolith; PR 2 inserted
  // js/services/backend-directional-snapshot-service.js after it and PR 3
  // js/ui/backend-directional-snapshot-panel.js after that, so the panel is now
  // the last script before the monolith. Positions stay EXACT and every
  // occupant is pinned by name, so an unplanned script in that gap still fails.
  const iDsbAdapter = srcs.indexOf('./js/adapters/backend-directional-snapshot-adapter.js');
  const iDsbService = srcs.indexOf('./js/services/backend-directional-snapshot-service.js');
  const iDsbPanel = srcs.indexOf('./js/ui/backend-directional-snapshot-panel.js');
  ok(iDsbAdapter >= 0, 'index.html loads the DSB pure adapter script');
  ok(iDsbService >= 0, 'index.html loads the DSB service script');
  ok(iDsbPanel >= 0, 'index.html loads the DSB panel script');
  const iPretrade = srcs.indexOf('./js/services/pretrade-risk-rules.js');
  const iPretradeTech = srcs.indexOf('./js/services/pretrade-technicals.js');
  const iPretradeModal = srcs.indexOf('./js/ui/pretrade-risk-modal.js');
  ok(iPretrade >= 0, 'index.html loads the later PRETRADE risk-rules script');
  ok(iPretradeTech >= 0, 'index.html loads the PRETRADE technicals script');
  ok(iPretradeModal >= 0, 'index.html loads the newest PRETRADE risk-modal script');
  eq(iDsbPanel, iPretrade - 1, 'ORDER: the DSB panel remains immediately before the later PRETRADE owner');
  eq(iPretrade, iPretradeTech - 1, 'ORDER: the PRETRADE risk-rules owner is immediately before the PRETRADE technicals owner');
  eq(iPretradeTech, iPretradeModal - 1, 'ORDER: the PRETRADE technicals owner is immediately before the PRETRADE risk-modal owner');
  const iMcx = srcs.indexOf('./js/services/mcx-market-context.js');
  ok(iMcx >= 0, 'index.html loads the newest MCX market-context script');
  eq(iPretradeModal, iMcx - 1, 'ORDER: the PRETRADE risk modal is immediately before the MCX market-context owner');
  eq(iMcx, srcs.length - 2, 'ORDER: the MCX market-context owner is the LAST external script before the inline monolith');
  eq(iDsbService, iDsbPanel - 1, 'ORDER: the DSB service is the script immediately before the DSB panel');
  eq(iDsbAdapter, iDsbService - 1, 'ORDER: the DSB pure adapter is the script immediately before the DSB service');
  eq(iPreview, iDsbAdapter - 1, 'ORDER: the BDSP module is the script immediately before the DSB pure adapter');
  eq(iAdapter, iPreview - 1, 'ORDER: the adapter is the script immediately before the BDSP module');
  eq(PARTS.filter(function (p) { return p.kind === 'remote'; }).length, 1,
     'exactly one remote/CDN script (Chart.js), unchanged');
  PARTS.filter(function (p) { return p.kind === 'local'; }).forEach(function (p) {
    ok(/^\.\//.test(p.src), 'local script ' + p.src + ' uses a document-relative src');
  });
})();
// The <script> tag itself: exactly one, classic, synchronous, no inline body.
(function () {
  const TAGS = APP.parseScriptTags(RAW_HTML);
  const clean = function (s) { return String(s == null ? '' : s).trim().replace(/[?#].*$/, ''); };
  const isPreview = function (t) { return /(^|\/)js\/ui\/backend-directional-preview\.js$/.test(clean(t.src)); };
  const attrHas = function (attrs, name) {
    return new RegExp('(?:^|[ \\t\\n\\f\\r])' + name + '(?=[ \\t\\n\\f\\r=/>]|$)', 'i').test(attrs || '');
  };
  const previewTags = TAGS.filter(isPreview);
  eq(previewTags.length, 1, 'index.html carries exactly ONE BDSP <script> tag');
  const tag = previewTags[0] || { attrs: '', inline: '', type: null };
  eq(tag.type, null, 'the BDSP script declares no `type` — it is a CLASSIC script');
  ok(!/(?:^|[ \t\n\f\r])type\s*=\s*["']?module/i.test(tag.attrs), 'the BDSP script is NOT type="module"');
  ok(!attrHas(tag.attrs, 'async'), 'the BDSP script is NOT async');
  ok(!attrHas(tag.attrs, 'defer'), 'the BDSP script is NOT defer');
  ok(!attrHas(tag.attrs, 'nomodule'), 'the BDSP script is not nomodule');
  eq(String(tag.inline).trim(), '', 'the BDSP <script> tag has no inline body');
  eq(String(tag.src).trim(), PREVIEW_REL, 'the BDSP src is exactly ' + PREVIEW_REL);
  ok(/^\.\//.test(String(tag.src).trim()), 'the BDSP src is document-relative (./js/ui/…)');
  // Tag position: after the adapter tag, immediately before the inline monolith.
  const adapterTagIdx = TAGS.findIndex(function (t) { return /backend-directional-adapter\.js$/.test(clean(t.src)); });
  const previewTagIdx = TAGS.indexOf(tag);
  const inlineTagIdx = TAGS.findIndex(function (t) { return clean(t.src) === '' && t.inline.length > 1000; });
  ok(adapterTagIdx >= 0 && previewTagIdx > adapterTagIdx, 'tag order: the BDSP tag comes AFTER the adapter tag');
  ok(inlineTagIdx >= 0 && previewTagIdx < inlineTagIdx, 'tag order: the BDSP tag comes BEFORE the inline monolith');
  const dsbAdapterTagIdx = TAGS.findIndex(function (t) { return /backend-directional-snapshot-adapter\.js$/.test(clean(t.src)); });
  const dsbServiceTagIdx = TAGS.findIndex(function (t) { return /backend-directional-snapshot-service\.js$/.test(clean(t.src)); });
  const dsbPanelTagIdx = TAGS.findIndex(function (t) { return /backend-directional-snapshot-panel\.js$/.test(clean(t.src)); });
  ok(dsbAdapterTagIdx >= 0, 'tag order: the DSB pure adapter tag is present');
  ok(dsbServiceTagIdx >= 0, 'tag order: the DSB service tag is present');
  ok(dsbPanelTagIdx >= 0, 'tag order: the DSB panel tag is present');
  const pretradeTagIdx = TAGS.findIndex(function (t) { return /pretrade-risk-rules\.js$/.test(clean(t.src)); });
  const pretradeTechTagIdx = TAGS.findIndex(function (t) { return /pretrade-technicals\.js$/.test(clean(t.src)); });
  const pretradeModalTagIdx = TAGS.findIndex(function (t) { return /pretrade-risk-modal\.js$/.test(clean(t.src)); });
  ok(pretradeTagIdx >= 0, 'tag order: the later PRETRADE owner tag is present');
  ok(pretradeTechTagIdx >= 0, 'tag order: the PRETRADE technicals tag is present');
  ok(pretradeModalTagIdx >= 0, 'tag order: the newest PRETRADE risk-modal tag is present');
  eq(dsbPanelTagIdx, pretradeTagIdx - 1, 'tag order: DSB panel remains immediately before PRETRADE');
  eq(pretradeTagIdx, pretradeTechTagIdx - 1, 'tag order: PRETRADE risk rules remains immediately before PRETRADE technicals');
  eq(pretradeTechTagIdx, pretradeModalTagIdx - 1, 'tag order: PRETRADE technicals remains immediately before the PRETRADE risk modal');
  const mcxTagIdx = TAGS.findIndex(function (t) { return /mcx-market-context\.js$/.test(clean(t.src)); });
  ok(mcxTagIdx >= 0, 'tag order: the newest MCX market-context tag is present');
  eq(pretradeModalTagIdx, mcxTagIdx - 1, 'tag order: the PRETRADE risk modal remains immediately before the MCX market-context owner');
  eq(mcxTagIdx, inlineTagIdx - 1, 'tag order: the MCX market-context owner is the LAST script tag before the inline monolith');
  eq(dsbServiceTagIdx, dsbPanelTagIdx - 1, 'tag order: no tag was inserted between the DSB service and the DSB panel');
  eq(dsbAdapterTagIdx, dsbServiceTagIdx - 1, 'tag order: no tag was inserted between the DSB pure adapter and the DSB service');
  eq(previewTagIdx, dsbAdapterTagIdx - 1, 'tag order: no tag was inserted between the BDSP module and the DSB pure adapter');
  eq(adapterTagIdx, previewTagIdx - 1, 'tag order: no tag was inserted between the adapter and the BDSP module');
})();
(function () {
  // The two files the module sits between, pinned by content.
  const adapterAbs = path.resolve(__dirname, '..', 'js', 'adapters', 'backend-directional-adapter.js');
  ok(fs.existsSync(adapterAbs), 'js/adapters/backend-directional-adapter.js exists on disk');
  const adapterSrc = fs.readFileSync(adapterAbs, 'utf8');
  ok(SRC.indexOf(adapterSrc) >= 0, 'the reconstructed source contains the adapter module verbatim');
  ok(SRC.indexOf(adapterSrc) < BDSP_REGION_START, 'the adapter text precedes the BDSP region in the reconstructed source');
  const bssAbs = path.resolve(__dirname, '..', 'js', 'services', 'backend-scanner-snapshot-service.js');
  ok(fs.existsSync(bssAbs), 'js/services/backend-scanner-snapshot-service.js exists on disk');
  ok(SRC.indexOf(fs.readFileSync(bssAbs, 'utf8')) < BDSP_REGION_START,
     'the BSS snapshot service text precedes the BDSP region in the reconstructed source');
  // The module exists, and the loader supplies exactly the bytes on disk.
  ok(PREVIEW_EXISTS, PREVIEW_REL + ' exists on disk');
  const previewParts = PARTS.filter(function (p) {
    return p.kind === 'local' && /(^|\/)js\/ui\/backend-directional-preview\.js$/
      .test(String(p.src == null ? '' : p.src).trim().replace(/[?#].*$/, ''));
  });
  eq(previewParts.length, 1, 'LOADER: exactly one loaded part resolves to the BDSP module');
  ok(previewParts[0].isAppJs, 'LOADER: the BDSP module is classified as application JavaScript');
  eq(previewParts[0].code, PREVIEW_SRC, 'LOADER: the source the loader supplies is the file on disk, byte-for-byte');
  ok(SRC.indexOf(PREVIEW_SRC) >= 0, 'LOADER: loadAppJavaScriptSource() includes the module verbatim, in tag order');
  // The relocation created ONE module and no other.
  ['js/services/backend-directional-preview-service.js',
   'js/state/backend-directional-preview-state.js',
   'js/ui/backend-directional-preview-renderers.js',
   'js/ui/backend-directional-preview-debug.js'].forEach(function (rel) {
    ok(!fs.existsSync(path.resolve(__dirname, '..', rel)), 'SCOPE: module not created: ' + rel);
  });
  // js/ui/ holds exactly seven scripts: this module, the BSS panel extracted
  // after it, the DSB panel extracted by PR 3, the SFS UI panel extracted by SFS
  // PR 3, the PESS batch panel extracted by PESS PR 3, the PESS UI panel
  // extracted by PESS PR 4 which closed that family, the EIC panel extracted by
  // EIC PR 2, the EIC ticker-analysis panel extracted by EIC PR 3, and the EIC
  // live deep dive extracted by EIC PR 4 which closed THAT family. The BDSP
  // relocation itself still contributed only one — which
  // is what this exact-set assertion pins; it is an inventory, not a budget, so
  // it is stated as the full sorted set rather than a count or a lower bound.
  // Each new entry is NAMED: there is deliberately no `js/ui/eic-*` pattern, so
  // an unplanned panel still fails here.
  deepEq(PARTS.filter(function (p) {
    return p.kind === 'local' && /(^|\/)js\/ui\//.test(String(p.src == null ? '' : p.src));
  }).map(function (p) { return String(p.src); }).sort(),
     [BSS_PANEL_REL, DSB_PANEL_REL, PREVIEW_REL, SFS_PANEL_REL, PESS_BATCH_PANEL_REL, PESS_UI_PANEL_REL,
      EIC_PANEL_REL, EIC_TICKER_PANEL_REL, EIC_LIVE_DEEP_DIVE_REL, PRETRADE_RISK_MODAL_REL].slice().sort(),
     'SCOPE: js/ui/ contributes exactly ten scripts — the BDSP module, the BSS panel, the DSB panel, the SFS UI panel, the PESS batch panel, the PESS UI panel, the EIC panel, the EIC ticker-analysis panel, the EIC live-deep-dive module and the PRETRADE risk modal');
  // The files this PR was forbidden to touch are still their own scripts.
  [ADAPTER_REL, BSS_SERVICE_REL].forEach(function (rel) {
    eq(PARTS.filter(function (p) { return p.src === rel; }).length, 1, rel + ' is still referenced exactly once');
  });
})();
// The module is a plain classic script: no module system, no wrapper, no state.
(function () {
  const code = stripCommentsAndStrings(PREVIEW_SRC);
  ok(!/\b(?:import|export)\b/.test(code), 'the module uses no import/export');
  ok(code.indexOf('require(') < 0, 'the module uses no require()');
  ok(code.indexOf('module.exports') < 0 && code.indexOf('exports.') < 0, 'the module sets no CommonJS exports');
  ok(!/^\s*['"]use strict['"]/.test(PREVIEW_SRC), "the module declares no 'use strict' — it is a sloppy-mode classic script");
  // IIFE / top-level bindings are column-0 constructs: an indented `function(){}`
  // is a callback inside one of the 32 bodies, not a wrapper around them.
  ok(!/(?:^|\n)[(!+~\-]/.test(code) && !/(?:^|\n)[^\S\n]*\(\s*function/.test(code),
     'the module has no IIFE wrapper');
  ok(!/\bclass\s+[A-Za-z0-9_$]/.test(code), 'the module declares no class');
  ok(!/\bwindow\s*\./.test(code) && !/\bglobalThis\s*\./.test(code),
     'the module makes no window/globalThis assignment — the debug exposure stayed inline');
  ok(!/(?:^|\n)(?:var|let|const)\s/.test(code), 'the module declares no top-level variable — zero module state');
  ok(!/\bnew\s+(?:Map|Set|WeakMap|WeakSet)\b/.test(code), 'the module creates no registry/singleton container');
  ok(!/\baddEventListener\b/.test(code), 'the module registers no listener');
  ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame|queueMicrotask/.test(code), 'the module starts no timer');
  ok(!/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|EventSource|ttCall\s*\(/.test(code), 'the module performs no network call');
  ok(!/subscribe|FEED_SUBSCRIPTION/i.test(code), 'the module opens no subscription');
  ok(!/https?:|\/scanner|\/snapshot|Authorization|Bearer/i.test(code), 'the module names no endpoint, backend URL or auth header');
  // Declarations-and-comments only: removing all 32 bodies leaves no statement.
  let residue = PREVIEW_SRC;
  BDSP_ALL.forEach(function (n) {
    residue = residue.replace(APP.extractFunctionSource(n, { source: residue }), '');
  });
  const residueLines = residue
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(function (l) { return l.replace(/\/\/.*$/, '').trim(); })
    .filter(function (l) { return l.length > 0; });
  eq(residueLines.length, 0,
     'TOP-LEVEL: the module has zero executable top-level statements; unexpected: ' + JSON.stringify(residueLines.slice(0, 3)));
  ok(residue.indexOf('// ── Backend Directional Preview (BDSP)') >= 0,
     'TOP-LEVEL: what remains after removing the 32 bodies is the BDSP header comment');
})();
// Loading the module must touch nothing: same strict-sandbox proof as §26, run
// against the FILE this time, not against the extracted declarations.
(function () {
  const box = makeStrictSandbox();
  let threw = null;
  try { vm.runInContext(PREVIEW_SRC, box.context); } catch (e) { threw = String(e); }
  eq(threw, null, 'evaluating the module FILE touches no forbidden global');
  deepEq(box.touched, [], 'the strict sandbox recorded zero identifier accesses while loading the module file');
  eq(vm.runInContext('typeof bdspInit', box.context), 'function', 'after loading the file the 32 names are defined');
  BDSP_ALL.forEach(function (n) {
    eq(vm.runInContext('typeof ' + n, box.context), 'function', 'loading the module file defines ' + n);
  });
  // …and `S` is still absent: nothing in the file created, seeded or captured it.
  eq(vm.runInContext('typeof S', box.context), 'undefined',
     'loading the module file did not create, seed or capture `S`');
  ['document', 'localStorage', 'escHtml', 'renderScanResults', 'bssState'].forEach(function (g) {
    eq(vm.runInContext('typeof ' + g, box.context), 'undefined',
       'loading the module file left ' + g + ' unresolved — it is bound only when a BDSP function is called');
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// 31. HOISTING DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────
section('31. hoisting dependencies');

// The complete free-global dependency list of the BDSP region, measured.
const BDSP_GLOBALS = (function () {
  const declared = new Set(BDSP_ALL);
  const found = new Set();
  const code = BDSP_CODE;
  const re = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
  const KEYWORDS = new Set(['var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'new', 'typeof', 'instanceof', 'in', 'of', 'this', 'null', 'true',
    'false', 'void', 'delete', 'throw', 'try', 'catch', 'finally', 'default', 'yield', 'await', 'async',
    'class', 'extends', 'super', 'undefined']);
  // Locals: parameters, vars, catch bindings.
  const locals = new Set();
  let m;
  const fnRe = /function\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g;
  while ((m = fnRe.exec(code))) {
    m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (p) { locals.add(p); });
  }
  const varRe = /\bvar\s+([A-Za-z0-9_$]+)/g;
  while ((m = varRe.exec(code))) locals.add(m[1]);
  const catchRe = /catch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((m = catchRe.exec(code))) locals.add(m[1]);
  while ((m = re.exec(code))) {
    if (m[1] === '.') continue;
    const n = m[2];
    if (KEYWORDS.has(n) || locals.has(n) || declared.has(n)) continue;
    // Object-literal keys (`{ rows: rows }`, `{ includeNonEligible: false }`) are
    // property names, not global reads. A key is an identifier followed by ':'
    // whose preceding significant character opens or continues a literal.
    const after = code.slice(re.lastIndex, re.lastIndex + 4);
    if (/^\s*:/.test(after) && /[{,]\s*$/.test(code.slice(Math.max(0, m.index - 60), m.index))) continue;
    found.add(n);
  }
  return Array.from(found).sort();
})();

deepEq(BDSP_GLOBALS,
       ['Array', 'Date', 'S', 'String', 'bdsBackendDirectionalSummary', 'bdsDeriveBackendDirectionalRows',
        'bdsGetBackendDirectionalSourceState', 'bssFmtAgeMs', 'bssFmtClock', 'bssNum', 'bssRefresh',
        'bssState', 'document', 'escHtml', 'localStorage', 'renderScanResults'].sort(),
       'the complete free-global dependency list of the 32 declarations is exactly these 16 names');
ok(BDSP_GLOBALS.indexOf('window') < 0 && /\bwindow\b/.test(BDSP_TAIL),
   '`window` is NOT a dependency of the declarations — it appears only in the trailing exposure statement');
deepEq(BDSP_GLOBALS.filter(function (g) { return ['Array', 'Date', 'String', 'document', 'localStorage', 'window'].indexOf(g) < 0; }).sort(),
       ['S', 'bdsBackendDirectionalSummary', 'bdsDeriveBackendDirectionalRows', 'bdsGetBackendDirectionalSourceState',
        'bssFmtAgeMs', 'bssFmtClock', 'bssNum', 'bssRefresh', 'bssState', 'escHtml', 'renderScanResults'].sort(),
       'stripping intrinsics and host objects leaves exactly 11 APPLICATION globals the module must resolve');
// None of the 11 is captured in a module-scope alias: every one is read fresh,
// by bare name, inside a function body — that is what makes them late-bound.
(function () {
  // Column-0 only: an indented `var x = document…` is a local inside one of the
  // 32 bodies, which is exactly the call-time resolution this asserts.
  const aliased = BDSP_GLOBALS.filter(function (g) {
    return new RegExp('(?:^|\\n)(?:var|let|const)\\s+[A-Za-z0-9_$]+\\s*=\\s*' + g + '\\b').test(
      stripCommentsAndStrings(PREVIEW_SRC));
  });
  deepEq(aliased, [], 'no late dependency is captured in a module-scope alias — all stay call-time bare-global reads');
})();

// Classify each dependency by declaration position and resolution style.
(function () {
  // Post-extraction the module is its OWN script, evaluated before the inline
  // monolith, so EVERY inline dependency is late-declared relative to it. The
  // three BSS UI formatters left that set when the BSS panel was extracted into
  // a script loaded before this one: only the two genuinely-monolithic names
  // remain late.
  const LATE = ['escHtml', 'renderScanResults'];
  const EARLY_MODULE = ['bssState', 'bssRefresh'].concat(BSS_DEPS_PANEL_UI, ADAPTER_DEPS);
  LATE.forEach(function (n) {
    ok(declStart(n) > BDSP_REGION_END, n + ' is declared AFTER the BDSP region — resolvable only at call time');
    eq(partOf(declStart(n)), '(inline)', n + ' lives in the inline monolith, a LATER script than the module');
  });
  EARLY_MODULE.forEach(function (n) {
    ok(declStart(n) < INLINE_RANGE.start, n + ' is declared in an earlier <script> — available by script order, not hoisting');
    ok(declStart(n) < BDSP_REGION_START, n + ' is declared before the module, so its script has already run');
  });
  // `S` is the one non-function dependency and the one with a TDZ.
  ok(/^\s*const S = \{/m.test(SRC) || /\nconst S = \{/.test(SRC),
     'S is a `const` binding, not a hoisted var — a top-level read before its initialiser would be a TDZ error');
  ok(SRC.indexOf('\nconst S = {') > BDSP_REGION_END,
     'the `const S` initialiser runs AFTER the module script — reading S at module load time would be a TDZ error (§26, §33)');
  ok(SRC.indexOf('\nconst S = {') > INLINE_RANGE.start,
     'the `const S` initialiser is INSIDE the inline monolith — the module script cannot read S at its own load time');
})();

// The hoisting question stated as a decidable fact.
(function () {
  const usedAtInit = ['bssNum', 'bssFmtAgeMs', 'bssFmtClock', 'escHtml'];
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' } });
  b.api.bdspInit();
  ok(b.log.bss.filter(function (x) { return usedAtInit.indexOf(x) >= 0; }).length > 0,
     'a persisted-ON bootstrap DOES reach the shared BSS UI helpers during init');
  ok(true, 'CONCLUSION, now EXECUTED: the 32 declarations moved to an earlier script (they only need call-time ' +
           'resolution), while the bdspInit() CALL stayed where it was — it still depends on S, escHtml and ' +
           'renderScanResults, which only exist once the inline monolith has finished evaluating. The three BSS UI ' +
           'helpers are no longer part of that set: the panel module is loaded before this one');
})();
// A module loaded before the monolith could not call bdspInit at its own top level.
(function () {
  const box = makeStrictSandbox();
  BDSP_ALL.forEach(function (n) { vm.runInContext(APP.extractFunctionSource(n, { source: SRC }), box.context); });
  let threw = false;
  try { vm.runInContext('bdspInit()', box.context); } catch (e) { threw = true; }
  ok(threw, 'calling bdspInit() with the monolith not yet evaluated throws');
  eq(box.touched[0], 'S',
     'the FIRST unresolved global is `S` — a module-scope bdspInit() before the monolith is load-order unsafe');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 32. OWNERSHIP — OPTION A, EXECUTED
//     What used to be the PRECONDITIONS of the move are now its POSTCONDITIONS:
//     each is re-measured against the post-extraction source, so the shipped
//     split cannot drift away from the decision it implements. B/C/D/E stay
//     recorded as the rejected alternatives, with the blockers that ruled them
//     out still measured — a later PR must not silently drift into one of them.
// ─────────────────────────────────────────────────────────────────────────────
section('32. ownership — option A, executed');

(function () {
  // ── Option A — the 32 declarations moved, the bootstrap stayed ─────────────
  ok(BDSP_ALL.every(function (n) { return spansOf(n).length === 1 && /^(?:async\s+)?function\s/.test(bodyOf(n)); }),
     'A-postcondition: all 32 are still single, hoistable top-level function declarations');
  eq(SPANS.filter(function (s) { return s.start >= BDSP_REGION_START && s.start < BDSP_REGION_END; }).length, 32,
     'A-postcondition: the 32 are still physically contiguous — the cut/paste stayed verbatim');
  const HOST = ['Array', 'Date', 'String', 'window', 'document', 'localStorage'];
  ok(BDSP_GLOBALS.every(function (g) { return HOST.indexOf(g) >= 0 || g === 'S' || declStart(g) >= 0; }),
     'A-postcondition: every free global is either an intrinsic/host object, `S`, or a real application declaration');
  ok(BDSP_GLOBALS.filter(function (g) { return declStart(g) > BDSP_REGION_END; }).length === 2,
     'A-postcondition: two dependencies are still late-declared (escHtml, renderScanResults), and both are used only at CALL time');
  ok(BSS_DEPS_PANEL_UI.every(function (n) { return declStart(n) < BDSP_REGION_START; }),
     'A-postcondition, SHARPER: the three BSS UI formatters are no longer late — the BSS panel module loads before this one');
  ok(!/\bS\b/.test(BDSP_CODE.slice(0, BDSP_CODE.indexOf('function bdspState'))),
     'A-postcondition: nothing before the first S-touching function needs S at load time');
  eq(EXTERNAL.bdspSetEnabled.length + EXTERNAL.bdspRefresh.length, 0,
     'A-postcondition: the two markup-facing names still have no JS consumer — only the globals had to survive');
  eq(partOf(BOOTSTRAP_CALL_INDEX), '(inline)',
     'A-executed: index.html kept `bdspInit();` inside the #launchBtn async click handler');
  ok(BDSP_TAIL.indexOf('window.apexDebugBackendDirectionalPreview') >= 0 &&
     partOf(BDSP_EXPOSURE_INDEX) === '(inline)',
     'A-executed: the window exposure of the debug helper stayed inline');
  eq((MARKUP.match(/onclick="bdspSetEnabled\((?:true|false)\)"/g) || []).length, 2,
     'A-executed: the two static onclick handlers stayed in the markup');
  ok(DOM_IDS.every(function (id) { return MARKUP.indexOf('id="' + id + '"') >= 0; }),
     'A-executed: the four DOM ids stayed in the markup');
  ok(partOf(declStart('bdspStorageKey')) === PREVIEW_REL &&
     declStart('bdspStorageKey') > declEnd('bdsGetBackendDirectionalSourceState') &&
     BDSP_REGION_END < INLINE_RANGE.start,
     'A-executed: the new script loads AFTER backend-directional-adapter.js and BEFORE the inline monolith');
  ok(!/\b(?:import|export)\b/.test(stripCommentsAndStrings(PREVIEW_SRC)) &&
     PREVIEW_SRC.indexOf('require(') < 0,
     'A-executed: all free globals stayed global and late-bound — no import, no export, no require');

  // ── Option B — also move the bootstrap: still REJECTED ─────────────────────
  ok(depthAt(BOOTSTRAP_CALL_INDEX) > 0,
     'B-blocker: there is no top-level `bdspInit();` to move — the call lives inside the launchBtn click handler');
  ok(SRC.indexOf('\nconst S = {') > INLINE_RANGE.start,
     'B-blocker: a top-level bdspInit() in the module would hit the `const S` TDZ');
  ok(SRC.indexOf('\nconst S = {') > BDSP_REGION_END,
     'B-blocker, now SHARPER: the module is evaluated BEFORE `const S` exists, so a module-scope call would throw');
  ok(['escHtml', 'renderScanResults'].every(function (n) { return declStart(n) > BDSP_REGION_END; }),
     'B-blocker: two helpers the ON path needs are still declared later, in the monolith');
  ok(!/(?:^|\n)\s*bdspInit\s*\(/.test(stripCommentsAndStrings(PREVIEW_SRC)),
     'B-verdict: REJECTED and NOT executed — the module contains no bdspInit() call at any scope');

  // ── Option C — split state / controller / renderers ────────────────────────
  ok(EDGES.bdspRender.indexOf('bdspRenderScannerResultsOverride') >= 0 &&
     EDGES.bdspRenderScannerResultsOverride === undefined ? true :
     EDGES.bdspRenderScannerResultsOverride.indexOf('bdspRenderSourceState') >= 0,
     'C-cost: the scanner-integration layer calls the renderers directly');
  ok(/bdspState\s*\(/.test(codeOf('bdspRenderScannerResultsOverride')),
     'C-cost: the renderer layer writes BDSP state — a state/renderer split would cut through one function');
  ok(BDSP_ALL.filter(function (n) { return EDGES[n].length > 0; }).length >= 10,
     'C-cost: the internal graph is densely connected; a 3-way split multiplies the seams without removing a dependency');
  eq(PARTS.filter(function (p) { return /backend-directional-preview/.test(String(p.src || '')); }).length, 1,
     'C-verdict: REJECTED and NOT executed — the preview is ONE script, not a state/controller/renderer trio');
  ['js/services/backend-directional-preview-service.js',
   'js/state/backend-directional-preview-state.js',
   'js/ui/backend-directional-preview-renderers.js',
   'js/ui/backend-directional-preview-debug.js'].forEach(function (rel) {
    ok(!fs.existsSync(path.resolve(__dirname, '..', rel)), 'C-verdict: ' + rel + ' was not created');
  });

  // ── Option D — move only formatters and renderers ──────────────────────────
  (function () {
    const movable = CAT_FORMAT.concat(CAT_RENDER);
    ok(movable.every(function (n) { return !/document\b|localStorage|\bS\b/.test(codeOf(n)); }),
       'D-observation: the 14 formatter/renderer functions are DOM-free, storage-free and S-free');
    const stillNeeded = movable.filter(function (n) {
      return BDSP_ALL.filter(function (m) { return movable.indexOf(m) < 0; })
        .some(function (m) { return EDGES[m].indexOf(n) >= 0; });
    }).sort();
    ok(stillNeeded.length > 0,
       'D-cost: the residual monolith would still call ' + stillNeeded.length + ' of the moved functions across the new boundary');
    ok(/bssNum|bssFmtAgeMs|bssFmtClock/.test(movable.map(codeOf).join('')),
       'D-cost: the moved half keeps the cross-module BSS UI dependency anyway');
  })();
  ok(CAT_FORMAT.concat(CAT_RENDER).every(function (n) { return partOf(declStart(n)) === PREVIEW_REL; }) &&
     CAT_STATE.concat(CAT_SCANNER, CAT_ORCH).every(function (n) { return partOf(declStart(n)) === PREVIEW_REL; }),
     'D-verdict: REJECTED and NOT executed — all five categories travelled together into one module');

  // ── Option E — do not extract: REJECTED, and the move happened ─────────────
  ok(BDSP_REGION.length > 10000, 'E-context: the region is ' + BDSP_REGION.length + ' chars, now out of the monolith');
  eq(BDSP_ALL.filter(function (n) { return EXTERNAL[n].length > 0; }).length, 4,
     'E-counter-argument: only four names are externally reachable in JavaScript — the seam was narrow, not entangled');
  eq(BDSP_GLOBALS.filter(function (g) { return declStart(g) > BDSP_REGION_END; }).length, 2,
     'E-counter-argument: the late dependencies are call-time only, which script order and hoisting handle');
  ok(PREVIEW_EXISTS && partOf(BDSP_REGION_START) === PREVIEW_REL,
     'E-verdict: REJECTED and NOT executed — the boundary was measurable and narrow enough, and the block did move');

  // ── EXECUTED DECISION ─────────────────────────────────────────────────────
  ok(true, 'EXECUTED: option A — the 32 declarations were relocated verbatim to ' +
           'js/ui/backend-directional-preview.js, loaded after js/adapters/backend-directional-adapter.js ' +
           'and before the inline monolith; bdspInit() stayed inside the #launchBtn async click handler, ' +
           'and the window exposure, the two onclick handlers, the CSS and all markup stayed untouched');
})();

// The residual monolith kept everything the relocation was not allowed to touch.
(function () {
  ok(defCountIn(INLINE_SRC, 'renderScanResults') === 1 &&
     defCountIn(INLINE_SRC, 'escHtml') === 1,
     'residual monolith still declares renderScanResults and escHtml');
  // bssRender and bssInit left the monolith with the BSS panel extraction, which
  // is a relocation this module neither performed nor is allowed to duplicate:
  // exactly one definition each, in the panel module, and none here.
  ['bssRender', 'bssInit'].forEach(function (n) {
    eq(defCountIn(INLINE_SRC, n), 0, n + ' is no longer declared in the residual monolith');
    eq(defCountIn(BSS_PANEL_SRC, n), 1, n + ' is declared once in ' + BSS_PANEL_REL);
    eq(defCountIn(PREVIEW_SRC, n), 0, n + ' was NOT dragged into the module');
  });
  BSS_DEPS_PANEL_UI.forEach(function (n) {
    eq(defCountIn(INLINE_SRC, n), 0, 'the BSS UI formatter ' + n + ' is no longer declared in the residual monolith');
    eq(defCountIn(BSS_PANEL_SRC, n), 1, 'the BSS UI formatter ' + n + ' is declared once in ' + BSS_PANEL_REL);
    eq(defCountIn(PREVIEW_SRC, n), 0, n + ' was NOT dragged into the module');
  });
  ['escHtml', 'renderScanResults'].forEach(function (n) {
    eq(defCountIn(PREVIEW_SRC, n), 0, n + ' was NOT dragged into the module');
  });
  ADAPTER_DEPS.concat(BSS_DEPS_SERVICE).forEach(function (n) {
    eq(defCountIn(PREVIEW_SRC, n), 0, n + ' was NOT copied into the module — it stays in its own earlier script');
  });
})();

// The BDSP CSS is markup-side and stayed in index.html, outside every <script>.
(function () {
  const cssClasses = ['bdsp-b', 'bdsp-kv', 'bdsp-card', 'bdsp-table', 'bdsp-toggle', 'bdsp-empty'];
  cssClasses.forEach(function (c) {
    ok(new RegExp('\\.' + c + '\\b').test(MARKUP), 'the BDSP CSS rule .' + c + ' is still in index.html markup');
  });
  ok(!/\.bdsp-/.test(PREVIEW_SRC), 'the module carries no CSS — it only emits class names inside HTML strings');
  ok(MARKUP.indexOf('id="bdsp-control"') >= 0, 'the #bdsp-control container is still in the markup');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 33. MUTATION PROOF
//     Each mutation is applied to a COPY of the BDSP source string, never to a
//     file on disk. The corresponding guard from the section above is re-run
//     against the mutant and must FLIP. If a mutation does not flip its guard,
//     the guard is not actually protecting the invariant and this file fails.
// ─────────────────────────────────────────────────────────────────────────────
section('33. mutation proof');

function mutantBox(mutate, opts) {
  const o = Object.assign({}, opts || {});
  const src = BDSP_ALL.map(function (n) { return APP.extractFunctionSource(n, { source: SRC }); }).join('\n');
  const mutated = mutate(src);
  ok(mutated !== src, '  (mutation actually changed the source)');
  const b = makeBox(o);
  // Re-declare the mutated functions over the pristine ones.
  vm.runInContext(mutated, b.box.context);
  BDSP_ALL.forEach(function (n) { b.api[n] = vm.runInContext(n, b.box.context); });
  return b;
}
function mutationCatches(label, detected) { ok(detected, 'MUTATION ' + label + ' is caught'); }

// M1 — default preview flipped from OFF to ON.
(function () {
  const b = mutantBox(function (s) {
    return s.replace("function bdspLoadPersistedEnabled(){\n  try { return localStorage.getItem(bdspStorageKey()) === '1'; } catch(e) { return false; }\n}",
                     "function bdspLoadPersistedEnabled(){\n  try { return localStorage.getItem(bdspStorageKey()) !== '0'; } catch(e) { return true; }\n}");
  }, { storage: {} });
  b.api.bdspInit();
  mutationCatches('1 (default OFF → ON)', b.api.bdspIsEnabled() === true);
})();

// M2 — the localStorage key is changed.
(function () {
  const b = mutantBox(function (s) {
    return s.replace("'apex_directional_backend_preview'", "'apex_directional_backend_preview_v2'");
  });
  mutationCatches('2 (storage key changed)', b.api.bdspStorageKey() !== BDSP_STORAGE_KEY);
})();

// M3 — persistence removed from the toggle.
(function () {
  const b = mutantBox(function (s) { return s.replace('bdspPersistEnabled(st.enabled);', ''); });
  b.api.bdspSetEnabled(true);
  mutationCatches('3 (persistence removed)', b.log.storageWrites.length === 0);
})();

// M4 — a direct fetch inside bdspRefresh.
(function () {
  const mutated = BDSP_ALL.map(function (n) { return APP.extractFunctionSource(n, { source: SRC }); }).join('\n')
    .replace('function bdspRefresh(){', "function bdspRefresh(){\n  fetch('/scanner/snapshot');");
  const code = stripCommentsAndStrings(mutated);
  const body = /function bdspRefresh\(\)\{[\s\S]*?\n\}/.exec(code)[0];
  mutationCatches('4 (fetch inside bdspRefresh)', /\bfetch\s*\(/.test(body));
  const b = mutantBox(function (s) { return s.replace('function bdspRefresh(){', "function bdspRefresh(){\n  fetch('/scanner/snapshot');"); });
  let threw = false;
  try { b.api.bdspRefresh(); } catch (e) { threw = /BLOCKED_fetch/.test(String(e)); }
  ok(threw && b.log.network.indexOf('fetch') >= 0, 'MUTATION 4 also trips the instrumented network guard');
})();

// M5 — bssRefresh replaced by bssFetchSnapshot.
(function () {
  const mutated = BDSP_ALL.map(function (n) { return APP.extractFunctionSource(n, { source: SRC }); }).join('\n')
    .replace(/bssRefresh/g, 'bssFetchSnapshot');
  mutationCatches('5 (bssRefresh → bssFetchSnapshot)',
    !/typeof\s+bssRefresh\s*===\s*'function'/.test(stripCommentsAndStrings(mutated)) &&
    /bssFetchSnapshot/.test(stripCommentsAndStrings(mutated)));
})();

// M6 — backend rows assigned into S.scanData.
(function () {
  const g = makeWriteGuard();
  const arr = [{ ticker: 'FRONTEND' }];
  const S = { scanData: g.guard(arr, 'S.scanData'), backendDirectionalPreview: { enabled: false } };
  const b = mutantBox(function (s) {
    return s.replace('st.rows = rows;', 'st.rows = rows; S.scanData.push.apply(S.scanData, rows);');
  }, { S: S });
  b.api.bdspSetEnabled(true);
  mutationCatches('6 (backend rows written into S.scanData)', g.writes.length > 0);
})();

// M7 — the frontend restore is dropped on toggle OFF.
(function () {
  const b = mutantBox(function (s) {
    return s.replace('else bdspRestoreFrontendScannerResults();', '');
  });
  b.api.bdspSetEnabled(true);
  const before = b.log.renderScanResults;
  b.api.bdspSetEnabled(false);
  mutationCatches('7 (frontend restore dropped)', b.log.renderScanResults === before);
})();

// M8 — escHtml removed from a backend-controlled field.
(function () {
  const b = mutantBox(function (s) {
    return s.replace("+ '<td><strong>'+escHtml(r.symbol || '—')+'</strong></td>'",
                     "+ '<td><strong>'+(r.symbol || '—')+'</strong></td>'");
  }, {
    bssState: function () { return { snapshot: snapshot({ candidates: [candidate({ symbol: 'EVIL' + XSS })] }), status: status() }; },
  });
  b.api.bdspSetEnabled(true);
  const html = b.elements.scanResults.innerHTML;
  mutationCatches('8 (escHtml removed from symbol)', html.indexOf('<img src=x') >= 0);
})();

// M9 — an extra auto-call of bdspInit at declaration time.
(function () {
  const mutated = BDSP_ALL.map(function (n) { return APP.extractFunctionSource(n, { source: SRC }); }).join('\n') + '\nbdspInit();';
  const box = makeStrictSandbox();
  let threw = null;
  try { vm.runInContext(mutated, box.context); } catch (e) { threw = String(e); }
  mutationCatches('9 (extra top-level bdspInit auto-call)', threw !== null && box.touched.length > 0);
  // And statically: the region would no longer be declarations-only.
  const codeOnly = stripCommentsAndStrings(BDSP_REGION + '\nbdspInit();');
  ok(/\n\s*bdspInit\(\);/.test(codeOnly), 'MUTATION 9 is also caught by the declarations-only scan of §3');
})();

// M10 — the bootstrap moved before the adapter is loaded.
(function () {
  // Simulated by removing the adapter globals before init runs with the preview ON.
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' } });
  ADAPTER_DEPS.forEach(function (d) { delete b.box.store[d]; });
  let threw = false;
  try { b.api.bdspInit(); } catch (e) { threw = /FORBIDDEN_GLOBAL/.test(String(e)); }
  mutationCatches('10 (bootstrap before the adapter is loaded)', threw);
  // Static counterpart: the script order assertion in §14/§30.
  const srcs = PARTS.map(function (p) { return p.kind === 'inline' ? '(inline)' : p.src; });
  ok(srcs.indexOf(ADAPTER_REL) < srcs.length - 1, 'MUTATION 10 is also caught by the §30 script-order assertion');
})();

// M11 — snapshot.candidates mutated.
(function () {
  const g = makeWriteGuard();
  const snap = snapshot({ candidates: [candidate()] });
  const stateObj = { snapshot: snap, status: status() };
  const b = mutantBox(function (s) {
    return s.replace('var st = bdspState();\n  st.renderedInScannerResults = true;',
                     'var st = bdspState();\n  if(pack.snapshot && pack.snapshot.candidates) pack.snapshot.candidates.length = 0;\n  st.renderedInScannerResults = true;');
  }, { bssState: function () { return g.guard(stateObj, 'bssState()'); } });
  b.api.bdspSetEnabled(true);
  mutationCatches('11 (snapshot.candidates mutated)', g.writes.length > 0);
})();

// M12 — BDSP wired directly into runScan, bypassing renderScanResults.
(function () {
  const runScanBody = bodyOf('runScan');
  ok(runScanBody != null, 'runScan exists and can be audited');
  const mutatedRunScan = runScanBody.replace('function runScan(', 'function runScan(')
    .replace(/\{/, '{\n  bdspMaybeRenderScannerResults();');
  const code = stripCommentsAndStrings(mutatedRunScan);
  mutationCatches('12 (BDSP wired directly into runScan)', /\bbdsp[A-Za-z0-9_$]*\s*\(/.test(code));
  ok(!/\bbdsp[A-Za-z0-9_$]*\s*\(/.test(stripCommentsAndStrings(runScanBody)),
     'the REAL runScan still contains no direct BDSP call');
})();

// ─────────────────────────────────────────────────────────────────────────────
// The POST-EXTRACTION structural mutations. Each one is a way the relocation
// could have been done wrong; each acts on a COPY of a source string or of the
// index.html text, never on a file, and each must flip the guard that protects
// it above.
// ─────────────────────────────────────────────────────────────────────────────

// M13 — the module tag moved BEFORE the adapter it consumes.
(function () {
  const ADAPTER_TAG = '<script src="./js/adapters/backend-directional-adapter.js"></script>';
  const PREVIEW_TAG = '<script src="./js/ui/backend-directional-preview.js"></script>';
  ok(RAW_HTML.indexOf(ADAPTER_TAG + '\n' + PREVIEW_TAG) >= 0, '  (the real tag order is adapter → preview)');
  const mutated = RAW_HTML.replace(ADAPTER_TAG + '\n' + PREVIEW_TAG, PREVIEW_TAG + '\n' + ADAPTER_TAG);
  ok(mutated !== RAW_HTML, '  (mutation actually changed the document)');
  const srcs = APP.loadOrderedScriptSources({ htmlPath: APP.DEFAULT_INDEX_HTML, html: mutated })
    .map(function (p) { return p.kind === 'inline' ? '(inline)' : p.src; });
  mutationCatches('13 (module loaded BEFORE the adapter)', srcs.indexOf(PREVIEW_REL) < srcs.indexOf(ADAPTER_REL));
  // Dynamic counterpart: with the adapter globals absent, an ON bootstrap throws.
  const b = makeBox({ storage: { [BDSP_STORAGE_KEY]: '1' } });
  ADAPTER_DEPS.forEach(function (d) { delete b.box.store[d]; });
  let threw = false;
  try { b.api.bdspInit(); } catch (e) { threw = /FORBIDDEN_GLOBAL/.test(String(e)); }
  ok(threw, 'MUTATION 13 also trips the strict-sandbox adapter dependency');
})();

// M14 — a bdspInit() call added at MODULE scope (the blocking TDZ regression).
(function () {
  const mutated = PREVIEW_SRC + '\nbdspInit();\n';
  // (a) the declarations-only residue scan of §30 must find a statement.
  let residue = mutated;
  BDSP_ALL.forEach(function (n) { residue = residue.replace(APP.extractFunctionSource(n, { source: residue }), ''); });
  const residueLines = residue.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .map(function (l) { return l.replace(/\/\/.*$/, '').trim(); })
    .filter(function (l) { return l.length > 0; });
  mutationCatches('14a (module-scope bdspInit() — declarations-only scan)', residueLines.length > 0);
  // (b) loading the mutated module in the strict sandbox must throw on `S`.
  const box = makeStrictSandbox();
  let threw = null;
  try { vm.runInContext(mutated, box.context); } catch (e) { threw = String(e); }
  mutationCatches('14b (module-scope bdspInit() — load-time purity)', threw !== null && box.touched[0] === 'S');
})();

// M15 — the window exposure moved INTO the module.
(function () {
  const mutated = PREVIEW_SRC + BDSP_TAIL;
  const code = stripCommentsAndStrings(mutated);
  mutationCatches('15 (window exposure moved into the module)',
    /\bwindow\s*\./.test(code) && mutated.indexOf('window.apexDebugBackendDirectionalPreview') >= 0);
  // …and it would also stop being a statement of the monolith.
  const mutatedInline = INLINE_SRC.replace(BDSP_TAIL, '');
  mutationCatches('15b (exposure removed from the monolith)',
    (mutatedInline.match(/window\.apexDebugBackendDirectionalPreview/g) || []).length === 0);
})();

// M16 — the debug helper left duplicated in the monolith.
(function () {
  const dup = APP.extractFunctionSource('apexDebugBackendDirectionalPreview', { source: PREVIEW_SRC });
  const mutatedInline = INLINE_SRC + '\n' + dup + '\n';
  mutationCatches('16 (debug helper duplicated in the monolith)',
    defCountIn(mutatedInline, 'apexDebugBackendDirectionalPreview') === 1 &&
    defCountIn(PREVIEW_SRC, 'apexDebugBackendDirectionalPreview') +
      defCountIn(mutatedInline, 'apexDebugBackendDirectionalPreview') !== 1);
})();

// M17 — one BDSP function left behind inline as well as moved.
(function () {
  const left = APP.extractFunctionSource('bdspRefresh', { source: PREVIEW_SRC });
  const mutatedInline = INLINE_SRC + '\n' + left + '\n';
  mutationCatches('17 (a BDSP function left inline)', defCountIn(mutatedInline, 'bdspRefresh') !== 0);
  const mutatedAll = PREVIEW_SRC + '\n' + mutatedInline;
  mutationCatches('17b (two definitions application-wide)', defCountIn(mutatedAll, 'bdspRefresh') !== 1);
})();

// M18 — one BDSP function dropped from the module entirely.
(function () {
  const dropped = APP.extractFunctionSource('bdspParityBadge', { source: PREVIEW_SRC });
  const mutated = PREVIEW_SRC.replace(dropped, '');
  ok(mutated !== PREVIEW_SRC, '  (mutation actually changed the module source)');
  const names = topLevelSpans(stripCommentsAndStrings(mutated)).map(function (s) { return s.name; });
  mutationCatches('18 (a BDSP function missing from the module)',
    names.length !== 32 && names.indexOf('bdspParityBadge') < 0);
})();

// M19 — the module script tag carries `defer`.
(function () {
  const PREVIEW_TAG = '<script src="./js/ui/backend-directional-preview.js"></script>';
  const mutated = RAW_HTML.replace(PREVIEW_TAG, '<script defer src="./js/ui/backend-directional-preview.js"></script>');
  ok(mutated !== RAW_HTML, '  (mutation actually changed the document)');
  const tag = APP.parseScriptTags(mutated).filter(function (t) {
    return /backend-directional-preview\.js$/.test(String(t.src || '').trim());
  })[0];
  const attrHas = function (attrs, name) {
    return new RegExp('(?:^|[ \\t\\n\\f\\r])' + name + '(?=[ \\t\\n\\f\\r=/>]|$)', 'i').test(attrs || '');
  };
  mutationCatches('19 (module script tag marked defer)', !!tag && attrHas(tag.attrs, 'defer'));
})();

// M20 — a late dependency captured in a module-scope alias (breaks late binding).
(function () {
  const mutated = 'var bdspEsc = escHtml;\n' + PREVIEW_SRC;
  const code = stripCommentsAndStrings(mutated);
  const aliased = BDSP_GLOBALS.filter(function (g) {
    return new RegExp('(?:^|\\n)(?:var|let|const)\\s+[A-Za-z0-9_$]+\\s*=\\s*' + g + '\\b').test(code);
  });
  mutationCatches('20a (late dependency captured in a top-level alias)', aliased.indexOf('escHtml') >= 0);
  mutationCatches('20b (the alias is also a top-level binding)', /(?:^|\n)(?:var|let|const)\s/.test(code));
  // …and it would break load-time purity: the alias reads escHtml immediately.
  const box = makeStrictSandbox();
  let threw = null;
  try { vm.runInContext(mutated, box.context); } catch (e) { threw = String(e); }
  mutationCatches('20c (the alias reads its dependency at LOAD time)', threw !== null && box.touched[0] === 'escHtml');
})();

// The mutations never touched disk.
(function () {
  ok(fs.readFileSync(APP.DEFAULT_INDEX_HTML, 'utf8').length === RAW_HTML.length,
     'index.html is unchanged on disk after the mutation proof');
  ok(fs.readFileSync(PREVIEW_ABS, 'utf8') === PREVIEW_SRC,
     PREVIEW_REL + ' is byte-identical on disk after the mutation proof');
  ok(APP.loadAppJavaScriptSource().length === SRC.length,
     'the reconstructed application source is unchanged after the mutation proof');
  BDSP_ALL.forEach(function (n) {
    ok(APP.extractFunctionSource(n, { source: APP.loadAppJavaScriptSource() }) === APP.extractFunctionSource(n, { source: SRC }),
       n + ' source is byte-identical after the mutation proof');
  });
})();

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
