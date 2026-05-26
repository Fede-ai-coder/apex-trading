'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Directional Scanner — persistent local-only flag helpers.
//
// These tests extract the REAL DSS flag functions from index.html (no copies, so
// they cannot drift) and run them in a vm sandbox with a minimal in-memory
// localStorage + DOM. They prove the hard requirements:
//   • load empty / corrupt storage → empty list (safe degrade)
//   • toggle adds/removes a symbol
//   • symbols are uppercased / trimmed / deduped
//   • ALL / FLAGGED / UNFLAGGED view filter behaves and preserves order
//   • the view filter never mutates or reorders the candidate list
//   • flag click stops propagation + preventDefault (no row select) and
//     preserves the inner list scroll position (no jump to top)
//   • the flag helpers contain no data-source code (no Yahoo / fetch /
//     /market/ / DXLink / candle pipeline / scanner calculations)
//   • the DSS store is separate from the RS vs SPY store
//
// Run: node tests/directional-scanner.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a top-level `function NAME(...) {...}` by brace-matching. Skips braces
// inside strings, template literals, regex and comments so nested bodies are safe.
function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}

const FNS = [
  '_dssFlagStorageKey', '_dssNormSym', '_dssLoadFlaggedSymbols',
  '_dssSaveFlaggedSymbols', '_dssIsFlaggedSymbol', '_dssToggleFlaggedSymbol',
  '_dssGetFlagFilter', '_dssSetFlagFilter', '_dssApplyFlagFilter',
  '_dssPanelScrollEl', '_dssCapturePanelScroll', '_dssRestorePanelScroll',
  '_dssOnFlagClick',
];

// ── Sandbox ──────────────────────────────────────────────────────────────────
const sandbox = {
  console, JSON, Object, String, Math, isFinite,
  DSS_FLAG_LS_KEY: 'apex_directional_flagged_symbols',
  _dssFlagFilter: 'all',
  localStorage: (function () {
    let store = {};
    return {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      _reset: () => { store = {}; },
      _setRaw: (k, v) => { store[k] = v; },
    };
  })(),
  // Minimal DOM mirroring the real structure: the DSS list scrolls inside an
  // inner .dss-tbl-scroll element (recreated on every innerHTML rebuild); the
  // outer .panel wrapper is the parentElement fallback.
  document: (function () {
    const outerPanel = { scrollTop: 0 };
    const panelContent = {
      parentElement: outerPanel,
      innerHTML: '',
      _inner: { scrollTop: 0 },
      querySelector: function (sel) {
        return sel === '.dss-tbl-scroll' ? this._inner : null;
      },
    };
    return {
      _outerPanel: outerPanel,
      _panelContent: panelContent,
      _rebuildList: () => { panelContent._inner = { scrollTop: 0 }; },
      _setListPresent: (present) => { panelContent._inner = present ? { scrollTop: 0 } : null; },
      getElementById: (id) => (id === 'panelContent' ? panelContent : null),
    };
  })(),
  requestAnimationFrame: (cb) => { cb(); return 1; },
  _renderDssCalls: 0,
  // Mirrors the real render contract: a re-render rebuilds innerHTML (recreating
  // .dss-tbl-scroll at scrollTop 0). _dssOnFlagClick captures before and restores
  // after via the real scroll helpers (rAF is synchronous here).
  renderDirectionalSetupScanner: function () {
    sandbox._renderDssCalls++;
    sandbox.document._rebuildList();
  },
};
vm.createContext(sandbox);
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);
const LS = sandbox.localStorage;

// ── Test harness ───────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// ── 0. storage key is DSS-specific (never the RS key) ────────────────────────
section('0. DSS flag store is separate from RS vs SPY');
ok(sandbox._dssFlagStorageKey() === 'apex_directional_flagged_symbols',
   'DSS storage key is apex_directional_flagged_symbols');
ok(sandbox._dssFlagStorageKey() !== 'apex_rs_spy_flagged_symbols',
   'DSS storage key does not reuse the RS key');

// ── 1. load: empty + corrupt storage degrade to an empty list ────────────────
section('1. load empty / corrupt storage');
LS._reset();
ok(JSON.stringify(sandbox._dssLoadFlaggedSymbols()) === '[]', 'no key → empty list');
LS._setRaw('apex_directional_flagged_symbols', '{not valid json');
ok(JSON.stringify(sandbox._dssLoadFlaggedSymbols()) === '[]', 'corrupt JSON → empty list');
LS._setRaw('apex_directional_flagged_symbols', '42');
ok(JSON.stringify(sandbox._dssLoadFlaggedSymbols()) === '[]', 'non-array/object scalar → empty list');

// mapping form {SYM:true} loads only truthy keys.
LS._setRaw('apex_directional_flagged_symbols', JSON.stringify({ AAA: true, BBB: false }));
const mapLoad = sandbox._dssLoadFlaggedSymbols();
ok(mapLoad.length === 1 && mapLoad[0] === 'AAA', 'map form loads only truthy keys');

// ── 2. toggle adds / removes a symbol ────────────────────────────────────────
section('2. toggle adds/removes');
LS._reset();
ok(sandbox._dssIsFlaggedSymbol('AAPL') === false, 'symbol starts unflagged');
ok(sandbox._dssToggleFlaggedSymbol('AAPL') === true, 'toggle returns true (now flagged)');
ok(sandbox._dssIsFlaggedSymbol('AAPL') === true, 'symbol is flagged after toggle on');
ok(sandbox._dssToggleFlaggedSymbol('AAPL') === false, 'toggle returns false (now unflagged)');
ok(sandbox._dssIsFlaggedSymbol('AAPL') === false, 'symbol is unflagged after toggle off');

// ── 3. normalization: uppercase / trim / dedupe ──────────────────────────────
section('3. normalize (uppercase / trim / dedupe)');
LS._reset();
sandbox._dssSaveFlaggedSymbols([' aapl ', 'AAPL', 'msft', '', null, 'MSFT']);
const saved = sandbox._dssLoadFlaggedSymbols();
ok(saved.length === 2 && saved.indexOf('AAPL') >= 0 && saved.indexOf('MSFT') >= 0,
   'save uppercases + trims + dedupes + drops blanks (' + JSON.stringify(saved) + ')');
ok(sandbox._dssIsFlaggedSymbol(' aapl ') === true, 'isFlagged normalizes its input');

// ── 4. view filter ALL / FLAGGED / UNFLAGGED ─────────────────────────────────
section('4. ALL / FLAGGED / UNFLAGGED filter');
const cands = [{ ticker: 'AAA' }, { ticker: 'BBB' }, { ticker: 'CCC' }];
LS._reset();
sandbox._dssSaveFlaggedSymbols(['BBB']);
sandbox._dssFlagFilter = 'all';
ok(sandbox._dssApplyFlagFilter(cands).length === 3, 'ALL shows every candidate');
sandbox._dssFlagFilter = 'flagged';
const fl = sandbox._dssApplyFlagFilter(cands);
ok(fl.length === 1 && fl[0].ticker === 'BBB', 'FLAGGED shows only flagged symbol');
sandbox._dssFlagFilter = 'unflagged';
const unfl = sandbox._dssApplyFlagFilter(cands).map((c) => c.ticker);
ok(unfl.length === 2 && unfl.indexOf('AAA') >= 0 && unfl.indexOf('CCC') >= 0,
   'UNFLAGGED shows only unflagged symbols');
sandbox._dssFlagFilter = 'all';
ok(cands.length === 3, 'filter does not mutate the input list');

// ── 5. filter preserves incoming order (never reorders) ──────────────────────
section('5. filter preserves incoming sort/order');
const ordered = [{ ticker: 'AAA' }, { ticker: 'BBB' }, { ticker: 'CCC' }, { ticker: 'DDD' }];
LS._reset();
sandbox._dssSaveFlaggedSymbols(['CCC', 'AAA']); // stored in a different order on purpose
sandbox._dssFlagFilter = 'flagged';
ok(sandbox._dssApplyFlagFilter(ordered).map((c) => c.ticker).join(',') === 'AAA,CCC',
   'FLAGGED keeps scanner order (AAA,CCC) not flag-storage order');
sandbox._dssFlagFilter = 'unflagged';
ok(sandbox._dssApplyFlagFilter(ordered).map((c) => c.ticker).join(',') === 'BBB,DDD',
   'UNFLAGGED keeps scanner order (BBB,DDD)');
sandbox._dssFlagFilter = 'all';
ok(sandbox._dssApplyFlagFilter(ordered).map((c) => c.ticker).join(',') === 'AAA,BBB,CCC,DDD',
   'ALL keeps full scanner order unchanged');

// ── 6. _dssSetFlagFilter normalizes the mode + re-renders ────────────────────
section('6. _dssSetFlagFilter');
sandbox._renderDssCalls = 0;
sandbox._dssSetFlagFilter('flagged');
ok(sandbox._dssGetFlagFilter() === 'flagged', 'set flagged');
sandbox._dssSetFlagFilter('bogus');
ok(sandbox._dssGetFlagFilter() === 'all', 'unknown mode falls back to all');
ok(sandbox._renderDssCalls === 2, 'each set triggers a re-render');

// ── 7. scroll preservation ───────────────────────────────────────────────────
section('7. scroll position survives a flag re-render');
sandbox.document._setListPresent(true);
sandbox.document._panelContent._inner.scrollTop = 555;
ok(sandbox._dssPanelScrollEl() === sandbox.document._panelContent._inner,
   '_dssPanelScrollEl targets inner .dss-tbl-scroll when present');
ok(sandbox._dssCapturePanelScroll() === 555, '_dssCapturePanelScroll reads inner list scrollTop');
sandbox.document._setListPresent(false);
ok(sandbox._dssPanelScrollEl() === sandbox.document._outerPanel,
   '_dssPanelScrollEl falls back to .panel when no list table');
sandbox.document._setListPresent(true);

// flag click: stops propagation + preventDefault, preserves inner list scroll.
LS._reset();
sandbox._renderDssCalls = 0;
sandbox.document._panelContent._inner.scrollTop = 742; // user scrolled down
let stopped = false, prevented = false;
const ret = sandbox._dssOnFlagClick(
  { stopPropagation: () => { stopped = true; }, preventDefault: () => { prevented = true; } },
  'uvxy'
);
ok(stopped && prevented, 'flag click stops propagation + prevents default (no row select)');
ok(ret === false, 'flag click returns false (cancels default anchor/row action)');
ok(sandbox._renderDssCalls === 1, 'flag click re-renders once');
ok(sandbox.document._panelContent._inner.scrollTop === 742,
   'inner list scrollTop restored after flag re-render (no jump to top)');
ok(sandbox._dssIsFlaggedSymbol('UVXY') === true, 'symbol flagged (uppercase normalized) after click');

// ── 8. anti-regression: flag helpers are pure local UI/state ─────────────────
section('8. flag helpers contain no data-source code');
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}
['_dssFlagStorageKey', '_dssNormSym', '_dssLoadFlaggedSymbols', '_dssSaveFlaggedSymbols',
 '_dssIsFlaggedSymbol', '_dssToggleFlaggedSymbol', '_dssGetFlagFilter', '_dssSetFlagFilter',
 '_dssApplyFlagFilter', '_dssOnFlagClick',
 '_dssPanelScrollEl', '_dssCapturePanelScroll', '_dssRestorePanelScroll']
  .forEach((n) => {
    const body = stripComments(extractFn(HTML, n));
    ok(!/yahoo/i.test(body), n + ' contains no "yahoo"');
    ok(!/\bfetch\b/.test(body), n + ' makes no fetch call');
    ok(!/\/market\//.test(body), n + ' has no /market/ data access');
    ok(!/\.candles\b/.test(body) && !/scanData/.test(body), n + ' never reads scanData/candles');
    ok(!/computeDirectionalSetupCandidates|computeRsCandidates/.test(body), n + ' runs no scanner calculation');
    ok(!/DXLink|_candleBuffer|_candleWs/.test(body), n + ' touches no DXLink/candle pipeline');
    ok(!/apex_rs_spy_flagged_symbols|_rsLoadFlaggedSymbols|_rsSaveFlaggedSymbols/.test(body),
       n + ' never reads/writes the RS flag store');
  });

// ── done ─────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
