'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// VIX Family premature-websocket-close guard.
//
// Bug: fetchVixFamily() resolved/applied an all-null VIX family whenever the
// DXLink websocket opened and then closed BEFORE authorization / subscription /
// data. That overwrote a previously valid S.vixFamily with {vix:null,...}.
//
// Fixes verified here (real code extracted from index.html, run in a vm sandbox
// against a scripted mock WebSocket):
//   • _vixFamilyHasAnyValue — true only when a finite, non-null index value exists
//     (note: Number(null)===0 is finite, so the helper must also null-check);
//   • _applyFreshVixFamily — never stores an all-null family; keeps the previous
//     valid one;
//   • fetchVixFamily — premature close returns null (NOT an all-null object),
//     records rich diagnostics on window._vixFamilyLastDiag, retries ONCE, and on
//     the happy path subscribes the 13 current symbols and resolves real values;
//   • _ensureVixFamily — clears _vixFamilyPending on every outcome.
//   • STATIC: 13-symbol candidate set preserved; no Yahoo / new source; VIX
//     spread/ratio formulas unchanged.
//
// Run: node tests/vix-family-premature-close.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── Scripted mock WebSocket ──────────────────────────────────────────────────
// Each test sets WS_SPECS (one spec per successive `new WebSocket`). A spec drives
// the dxfeed handshake: open → SETUP → AUTH_STATE → CHANNEL_OPENED → FEED_DATA, or
// a premature close before any of that.
const WS_INSTANCES = [];
let WS_SPECS = [];
let WS_IDX = 0;

function happySpec(prices) {
  return {
    onOpen(ws) { if (ws.onopen) ws.onopen(); },
    onSend(ws, msg) {
      if (msg.type === 'SETUP') setTimeout(() => ws._deliver({ type: 'SETUP' }), 0);
      else if (msg.type === 'AUTH') setTimeout(() => ws._deliver({ type: 'AUTH_STATE', state: 'AUTHORIZED' }), 0);
      else if (msg.type === 'CHANNEL_REQUEST') setTimeout(() => ws._deliver({ type: 'CHANNEL_OPENED', channel: msg.channel }), 0);
      else if (msg.type === 'FEED_SUBSCRIPTION') setTimeout(() => ws._deliver({
        type: 'FEED_DATA', channel: msg.channel,
        data: Object.keys(prices).map((sym) => ({ eventSymbol: sym, price: prices[sym] })),
      }), 0);
    },
  };
}
function prematureCloseSpec(code) {
  return {
    onOpen(ws) {
      if (ws.onopen) ws.onopen();                 // opens, sends SETUP…
      setTimeout(() => ws._close({ code: code || 1006, reason: 'gone', wasClean: false }), 0); // …then dies
    },
    onSend() { /* ignore everything — never authorizes */ },
  };
}

class MockWS {
  constructor(url) {
    this.url = url; this.sent = []; this.closed = false;
    const spec = WS_SPECS[Math.min(WS_IDX, WS_SPECS.length - 1)] || prematureCloseSpec();
    WS_IDX++;
    this._spec = spec;
    WS_INSTANCES.push(this);
    const self = this;
    this._deliver = function (msg) { if (self.onmessage && !self.closed) self.onmessage({ data: JSON.stringify(msg) }); };
    this._close = function (ev) {
      if (self.closed) return; self.closed = true;
      if (self.onclose) self.onclose(ev || { code: 1000, reason: '', wasClean: true });
    };
    setTimeout(() => { if (spec.onOpen) spec.onOpen(self); }, 0);
  }
  send(data) { this.sent.push(data); const msg = JSON.parse(data); if (this._spec.onSend) this._spec.onSend(this, msg); }
  close() { this._close({ code: 1000, reason: 'client', wasClean: true }); }
}

// ── Sandbox with the REAL functions ──────────────────────────────────────────
const logs = [];
const sandbox = {
  JSON, Date, Math, Number, isFinite, parseFloat, Object, Array, Promise,
  setTimeout, clearTimeout,
  WebSocket: MockWS,
  console: { log: (...a) => logs.push(a.map(String).join(' ')), warn: () => {}, error: () => {} },
  debugLog: () => {},
  logEv: () => {},
  ttCall: async (ep) => (ep === '/quote-token'
    ? { token: 'tok', dxlinkUrl: 'wss://tasty-openapi-dxlink-md-ws.dxfeed.com/realtime' }
    : null),
  window: {},
  S: { ttConnected: true, vixFamily: null, scanData: [] },
};
vm.createContext(sandbox);
vm.runInContext('var _vixFamilyPending = null;', sandbox);
vm.runInContext(
  // _ensureVixFamily now routes through the backend-first chain; include it so the
  // direct-websocket fallback (this file's focus) is still reachable when the
  // backend VIX endpoint is unavailable (ttCall returns null for it in this sandbox).
  ['_vixFamilyTimestampMs', '_vixFamilyHasAnyValue', '_applyFreshVixFamily', '_mcxFiniteNum',
   '_normalizeBackendVixFamily', '_applyNormalizedVixFamily',
   'fetchMarketContextSnapshotFromBackend', 'fetchMarketContextVixFamilyFromBackend',
   '_applyBackendVixFamily', '_vixFamilyDirectWsFallbackAllowed', '_fetchVixFamilyBackendFirst',
   'fetchVixFamily', '_ensureVixFamily']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);

function resetWS(specs) { WS_INSTANCES.length = 0; WS_SPECS = specs; WS_IDX = 0; logs.length = 0; }
const HAPPY = { '$VIX.X': 19.73, '$VIX9D.X': 16.29, '$VIX3M.X': 19.76, '$VIX6M.X': 22.15 };

async function main() {
  // ── 1. _vixFamilyHasAnyValue ───────────────────────────────────────────────
  section('1. _vixFamilyHasAnyValue: only a real finite value counts');
  {
    const f = sandbox._vixFamilyHasAnyValue;
    ok(f({ vix: 19.7, vix9d: null, vix3m: null, vix6m: null }) === true, '1: one finite value → true');
    ok(f({ vix: null, vix9d: null, vix3m: null, vix6m: null }) === false, '1: all null → false (Number(null)===0 NOT counted)');
    ok(f({ vix: undefined, vix9d: undefined, vix3m: undefined, vix6m: undefined }) === false, '1: all undefined → false');
    ok(f(null) === false, '1: null object → false');
  }

  // ── 2. _applyFreshVixFamily: all-null never replaces a valid family ─────────
  section('2. _applyFreshVixFamily: all-null cannot overwrite valid data');
  {
    const valid = { vix: 19.73, vix9d: 16.29, vix3m: 19.76, vix6m: 22.15, timestamp: '2026-06-23T10:00:00Z', source: 'DXLink' };
    sandbox.S.vixFamily = JSON.parse(JSON.stringify(valid));
    const applied = sandbox._applyFreshVixFamily({ vix: null, vix9d: null, vix3m: null, vix6m: null, timestamp: '2026-06-23T10:05:00Z', source: 'DXLink' });
    ok(applied === false, '2: all-null update rejected (returns false)');
    ok(sandbox.S.vixFamily.vix === 19.73, '2: previous valid VIX preserved');

    sandbox.S.vixFamily = null;
    const applied2 = sandbox._applyFreshVixFamily({ vix: null, vix9d: null, vix3m: null, vix6m: null });
    ok(applied2 === false, '2: all-null update rejected even with no previous value');
    ok(sandbox.S.vixFamily == null, '2: no all-null object stored as fresh family');

    const applied3 = sandbox._applyFreshVixFamily(JSON.parse(JSON.stringify(valid)));
    ok(applied3 === true && sandbox.S.vixFamily.vix === 19.73, '2: a real family is still applied');
  }

  // ── 3. fetchVixFamily happy path: 13 symbols, real values ──────────────────
  section('3. fetchVixFamily happy path: subscribes 13 symbols and resolves values');
  {
    sandbox.S.vixFamily = null;
    resetWS([happySpec(HAPPY)]);
    const r = await sandbox.fetchVixFamily();
    ok(r && r.vix === 19.73 && r.vix9d === 16.29 && r.vix3m === 19.76 && r.vix6m === 22.15, '3: all four indices resolved');
    ok(sandbox.S.vixFamily && sandbox.S.vixFamily.vix === 19.73, '3: S.vixFamily set with valid data');
    const subMsg = WS_INSTANCES[0].sent.map((s) => JSON.parse(s)).find((m) => m.type === 'FEED_SUBSCRIPTION');
    const symbols = new Set(subMsg.add.map((a) => a.symbol));
    ok(symbols.size === 13, '3: exactly 13 distinct symbols subscribed (got ' + symbols.size + ')');
    ok(logs.some((l) => /all 4 indices covered/.test(l)), '3: "all 4 indices covered" logged');
    ok(sandbox.window._vixFamilyLastDiag && sandbox.window._vixFamilyLastDiag.ok === true, '3: window._vixFamilyLastDiag.ok=true on success');
  }

  // ── 4. Premature close → returns null, keeps previous valid family ─────────
  section('4. premature ws close before data → null, previous family preserved');
  {
    const valid = { vix: 19.73, vix9d: 16.29, vix3m: 19.76, vix6m: 22.15, timestamp: '2026-06-23T10:00:00Z', source: 'DXLink' };
    sandbox.S.vixFamily = JSON.parse(JSON.stringify(valid));
    resetWS([prematureCloseSpec(1006), prematureCloseSpec(1006)]); // both attempts die early
    const r = await sandbox.fetchVixFamily();
    ok(r === null, '4: returns null (NOT an all-null object)');
    ok(sandbox.S.vixFamily && sandbox.S.vixFamily.vix === 19.73, '4: previous valid VIX family preserved');
    ok(logs.some((l) => /ws closed code=1006/.test(l) && /authorized=false/.test(l) && /subscribed=false/.test(l) && /priceMapKeys=\[\]/.test(l)),
       '4: close diag log has code/authorized/subscribed/priceMapKeys');
    ok(logs.some((l) => /fetch failed\/incomplete; keeping previous VIX family/.test(l)), '4: failure/keep-previous logged');
    const d = sandbox.window._vixFamilyLastDiag;
    ok(d && d.ok === false && d.wsOpened === true && d.authorized === false && d.subscribed === false &&
       d.anyPriceReceived === false && d.closeCode === 1006 && d.closeWasClean === false &&
       Array.isArray(d.priceMapKeys) && d.priceMapKeys.length === 0,
       '4: window._vixFamilyLastDiag captured full close diagnostics');
  }

  // ── 5. Bounded single retry recovers when 2nd attempt is healthy ───────────
  section('5. one bounded retry: premature close then healthy attempt resolves');
  {
    sandbox.S.vixFamily = null;
    resetWS([prematureCloseSpec(1006), happySpec(HAPPY)]); // attempt 1 dies, attempt 2 works
    const r = await sandbox.fetchVixFamily();
    ok(WS_INSTANCES.length === 2, '5: exactly two websocket attempts (one retry, no infinite loop)');
    ok(r && r.vix === 19.73, '5: retry recovered real values');
    ok(logs.some((l) => /retrying once after 1200ms/.test(l)), '5: bounded retry was logged');
  }

  // ── 6. No retry once data/subscription happened (no extra socket) ──────────
  section('6. healthy first attempt does not open a second socket');
  {
    sandbox.S.vixFamily = null;
    resetWS([happySpec(HAPPY), happySpec(HAPPY)]);
    await sandbox.fetchVixFamily();
    ok(WS_INSTANCES.length === 1, '6: only one websocket opened on the happy path');
  }

  // ── 7. _ensureVixFamily clears _vixFamilyPending on success and failure ────
  section('7. _ensureVixFamily always clears _vixFamilyPending');
  {
    sandbox.S.vixFamily = null;
    resetWS([happySpec(HAPPY)]);
    await sandbox._ensureVixFamily();
    ok(sandbox._vixFamilyPending === null, '7: pending cleared after a successful fetch');

    sandbox.S.vixFamily = null;
    resetWS([prematureCloseSpec(1006), prematureCloseSpec(1006)]);
    await sandbox._ensureVixFamily();
    ok(sandbox._vixFamilyPending === null, '7: pending cleared after a failed/null fetch');
  }

  // ── 8. STATIC guards ───────────────────────────────────────────────────────
  section('8. static: candidate set, no new source, formulas unchanged');
  {
    const src = extractFn(HTML, 'fetchVixFamily');
    const groups = {
      vix: ['$VIX.X', 'VIX', '^VIX'],
      vix9d: ['$VIX9D.X', 'VIX9D', '^VIX9D'],
      vix3m: ['$VIX3M.X', '$VXMT.X', 'VIX3M', '^VIX3M'],
      vix6m: ['$VIX6M.X', 'VIX6M', '^VIX6M'],
    };
    const total = Object.values(groups).reduce((n, g) => n + g.length, 0);
    ok(total === 13, '8: known-good candidate set still totals 13 symbols');
    Object.values(groups).forEach((g) => g.forEach((sym) => {
      ok(src.includes("'" + sym + "'"), '8: candidate present: ' + sym);
    }));
    // The only "Yahoo" mention is a comment about the ^SYMBOL naming convention;
    // assert no actual Yahoo endpoint / fetch was introduced as a data source.
    ok(!/yahoo[^\n]*\.(com|finance)/i.test(src) && !/finance\.yahoo/i.test(src), '8: no Yahoo data-source endpoint in fetchVixFamily');
    ok(src.includes("source:     'DXLink'") || /source:\s*'DXLink'/.test(src), '8: source stays DXLink');
    // Spread/ratio formulas unchanged (sampled from _buildRichSnapshot).
    ok(HTML.includes('var vixSpread_9d_0  = (vix9d !== null && vix   !== null) ? Math.round((vix9d - vix)   * 100) / 100 : null;'),
       '8: vixSpread_9d_0 formula unchanged');
    ok(HTML.includes('var vixRatio_9d_0  = (vix9d !== null && vix   !== null && vix   > 0) ? Math.round(vix9d / vix   * 1000) / 1000 : null;'),
       '8: vixRatio_9d_0 formula unchanged');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main();
