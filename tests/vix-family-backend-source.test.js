'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// VIX Family — backend is the PRIMARY source.
//
// The backend already holds the stable DXLink connection (see /dxlink/status), so
// VIX family is fetched via GET /market-context/vix-family/live and consumed by the
// frontend, instead of opening a second frontend DXLink websocket. The direct
// frontend websocket (fetchVixFamily) is only a bounded, opt-in diagnostic fallback.
//
// Verified here (real code extracted from index.html, run in a vm sandbox):
//   • backend VIX family is preferred — when the backend is ready, S.vixFamily is
//     applied and NO websocket is opened;
//   • _ensureVixFamily()/the backend-first path consume /market-context/vix-family/live;
//   • an incomplete/missing backend response never overwrites previously valid VIX
//     data and never fabricates values;
//   • the direct websocket fallback fires only when the backend fails AND the
//     fallback is allowed (localStorage flag), and remains bounded/diagnostic;
//   • _vixFamilyPending always clears.
//
// Run: node tests/vix-family-backend-source.test.js
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

// ── Minimal happy-path mock WebSocket (only used to prove the bounded fallback) ──
const WS_INSTANCES = [];
const HAPPY = { '$VIX.X': 19.73, '$VIX9D.X': 16.29, '$VIX3M.X': 19.76, '$VIX6M.X': 22.15 };
class MockWS {
  constructor(url) {
    this.url = url; this.sent = []; this.closed = false;
    WS_INSTANCES.push(this);
    const self = this;
    this._deliver = (msg) => { if (self.onmessage && !self.closed) self.onmessage({ data: JSON.stringify(msg) }); };
    this._close = (ev) => { if (self.closed) return; self.closed = true; if (self.onclose) self.onclose(ev || { code: 1000, reason: '', wasClean: true }); };
    setTimeout(() => { if (self.onopen) self.onopen(); }, 0);
  }
  send(data) {
    this.sent.push(data); const msg = JSON.parse(data);
    if (msg.type === 'SETUP') setTimeout(() => this._deliver({ type: 'SETUP' }), 0);
    else if (msg.type === 'AUTH') setTimeout(() => this._deliver({ type: 'AUTH_STATE', state: 'AUTHORIZED' }), 0);
    else if (msg.type === 'CHANNEL_REQUEST') setTimeout(() => this._deliver({ type: 'CHANNEL_OPENED', channel: msg.channel }), 0);
    else if (msg.type === 'FEED_SUBSCRIPTION') setTimeout(() => this._deliver({
      type: 'FEED_DATA', channel: msg.channel,
      data: Object.keys(HAPPY).map((sym) => ({ eventSymbol: sym, price: HAPPY[sym] })),
    }), 0);
  }
  close() { this._close({ code: 1000, reason: 'client', wasClean: true }); }
}

// ── Sandbox ──────────────────────────────────────────────────────────────────
const logs = [];
const store = new Map();
let BACKEND_VIX;  // dedicated endpoint: object → returned; Error → thrown by ttCall; null → ok:false
let BACKEND_SNAP; // /market-context/snapshot: object → returned; Error → thrown; null → ok:false
const sandbox = {
  JSON, Date, Math, Number, isFinite, parseFloat, Object, Array, Promise,
  setTimeout, clearTimeout,
  WebSocket: MockWS,
  console: { log: (...a) => logs.push(a.map(String).join(' ')), warn: () => {}, error: () => {} },
  debugLog: () => {}, logEv: () => {},
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  window: {},
  ttCall: async (ep) => {
    if (ep === '/market-context/snapshot') {
      if (BACKEND_SNAP instanceof Error) throw BACKEND_SNAP;
      return BACKEND_SNAP;
    }
    if (ep === '/market-context/vix-family/live') {
      if (BACKEND_VIX instanceof Error) throw BACKEND_VIX;
      return BACKEND_VIX;
    }
    if (ep === '/quote-token') return { token: 'tok', dxlinkUrl: 'wss://tasty-openapi-dxlink-md-ws.dxfeed.com/realtime' };
    return null;
  },
  S: { ttConnected: true, vixFamily: null, scanData: [] },
};
vm.createContext(sandbox);
vm.runInContext('var _vixFamilyPending = null;', sandbox);
vm.runInContext(
  ['_vixFamilyTimestampMs', '_vixFamilyHasAnyValue', '_applyFreshVixFamily', '_mcxFiniteNum',
   '_normalizeBackendVixFamily', '_applyNormalizedVixFamily',
   'fetchMarketContextSnapshotFromBackend', 'fetchMarketContextVixFamilyFromBackend',
   '_applyBackendVixFamily', '_vixFamilyDirectWsFallbackAllowed', '_fetchVixFamilyBackendFirst',
   'fetchVixFamily', '_ensureVixFamily']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);

function reset() { WS_INSTANCES.length = 0; logs.length = 0; store.clear(); sandbox.window = {}; sandbox.S.vixFamily = null; BACKEND_VIX = null; BACKEND_SNAP = null; }
const READY = { ok: true, status: 'ready', source: 'BACKEND_DXLINK', timestamp: '2026-06-23T10:00:00Z',
  vix: 19.73, vix9d: 16.29, vix3m: 19.76, vix6m: 22.15,
  symbolsUsed: { vix: 'VIX', vix9d: 'VIX9D', vix3m: 'VIX3M', vix6m: 'VIX6M' }, diagnostics: {} };

// Snapshot payload as the backend exposes it TODAY: vixFamily nested, 3-month as `vi3m`.
const SNAP_READY = { ok: true, source: 'BACKEND', timestamp: '2026-06-23T10:01:00Z',
  termStructure: { shape: 'contango' }, regime: {}, technicals: {},
  vixFamily: { vix: 18.5, vix9d: 15.1, vi3m: 19.2, vix6m: 21.0, source: 'BACKEND_DXLINK' } };

async function main() {
  // ── 0a. Snapshot vixFamily is the FIRST primary source (no dedicated call, no WS) ──
  section('0a. snapshot.vixFamily is preferred over the dedicated endpoint and the websocket');
  {
    reset();
    BACKEND_SNAP = JSON.parse(JSON.stringify(SNAP_READY));
    // Make the dedicated endpoint blow up — it must NOT be consulted when snapshot is valid.
    BACKEND_VIX = new Error('dedicated endpoint must not be called');
    const r = await sandbox._fetchVixFamilyBackendFirst();
    ok(r && r.vix === 18.5 && r.vix9d === 15.1 && r.vix6m === 21.0, '0a: snapshot values resolved');
    ok(r && r.vix3m === 19.2, '0a: vi3m normalized into vix3m');
    ok(sandbox.S.vixFamily && sandbox.S.vixFamily.vix === 18.5, '0a: S.vixFamily set from snapshot');
    ok(WS_INSTANCES.length === 0, '0a: no direct DXLink websocket opened');
    ok(sandbox.window._vixFamilyLastSource === 'BACKEND_SNAPSHOT', '0a: last source tagged BACKEND_SNAPSHOT');
    ok(logs.some((l) => /backend snapshot source ready/.test(l)) && logs.some((l) => /applied backend snapshot VIX family/.test(l)),
       '0a: snapshot-source logs emitted');
  }

  // ── 0b. vi3m normalization (unit) ──────────────────────────────────────────
  section('0b. _normalizeBackendVixFamily maps vi3m AND vix3m into vix3m');
  {
    const n1 = sandbox._normalizeBackendVixFamily({ vix: 1, vix9d: 2, vi3m: 3, vix6m: 4 });
    ok(n1.vix3m === 3, '0b: vi3m → vix3m');
    const n2 = sandbox._normalizeBackendVixFamily({ vix: 1, vix9d: 2, vix3m: 9, vi3m: 3, vix6m: 4 });
    ok(n2.vix3m === 9, '0b: explicit vix3m wins over vi3m');
    const n3 = sandbox._normalizeBackendVixFamily({ vix: '19.73', vix9d: null, vix3m: undefined, vix6m: 'x' });
    ok(n3.vix === 19.73 && n3.vix9d === null && n3.vix3m === null && n3.vix6m === null, '0b: coerces finite, rejects null/undefined/non-numeric');
    ok(sandbox._normalizeBackendVixFamily(null) === null, '0b: null object → null');
  }

  // ── 0c. Incomplete snapshot falls through to the dedicated endpoint ────────
  section('0c. incomplete snapshot vixFamily falls through to /vix-family/live');
  {
    reset();
    BACKEND_SNAP = { ok: true, source: 'BACKEND', vixFamily: { vix: null, vix9d: null, vi3m: null, vix6m: null } };
    BACKEND_VIX = JSON.parse(JSON.stringify(READY));
    const r = await sandbox._fetchVixFamilyBackendFirst();
    ok(logs.some((l) => /backend snapshot vixFamily incomplete/.test(l)), '0c: incomplete-snapshot log emitted');
    ok(r && r.vix === 19.73 && sandbox.window._vixFamilyLastSource === 'BACKEND_DXLINK', '0c: dedicated endpoint used as 2nd source');
    ok(WS_INSTANCES.length === 0, '0c: no websocket opened (2nd backend source satisfied it)');
  }

  // ── 0d. Incomplete snapshot must not overwrite previous valid VIX ──────────
  section('0d. incomplete snapshot does not overwrite a previously valid family');
  {
    reset();
    store.set('apex_ff_vix_family_direct_ws_fallback', '0'); // no WS noise
    sandbox.S.vixFamily = { vix: 21.0, vix9d: 18.0, vix3m: 22.0, vix6m: 24.0, timestamp: '2026-06-23T09:00:00Z', source: 'BACKEND_SNAPSHOT' };
    BACKEND_SNAP = { ok: true, source: 'BACKEND', vixFamily: { vix: null, vix9d: null, vi3m: null, vix6m: null } };
    BACKEND_VIX = { ok: false, status: 'incomplete', reason: 'missing_vix_family_quotes', vix: null, vix9d: null, vix3m: null, vix6m: null };
    await sandbox._fetchVixFamilyBackendFirst();
    ok(sandbox.S.vixFamily.vix === 21.0, '0d: previous valid VIX preserved');
    ok(WS_INSTANCES.length === 0, '0d: fallback disabled → no websocket');
  }

  // ── 1. Backend ready → applied, no websocket opened ────────────────────────
  section('1. dedicated backend VIX family is used when snapshot has none (no websocket)');
  {
    reset(); BACKEND_VIX = JSON.parse(JSON.stringify(READY));
    const r = await sandbox._fetchVixFamilyBackendFirst();
    ok(r && r.vix === 19.73 && r.vix9d === 16.29 && r.vix3m === 19.76 && r.vix6m === 22.15, '1: backend values resolved');
    ok(sandbox.S.vixFamily && sandbox.S.vixFamily.vix === 19.73 && sandbox.S.vixFamily.source === 'BACKEND_DXLINK', '1: S.vixFamily set from backend');
    ok(WS_INSTANCES.length === 0, '1: NO direct DXLink websocket opened');
    ok(sandbox.window._vixFamilyLastSource === 'BACKEND_DXLINK', '1: last source tagged BACKEND_DXLINK');
    ok(logs.some((l) => /backend source ready/.test(l)) && logs.some((l) => /applied backend VIX family/.test(l)), '1: expected backend logs emitted');
  }

  // ── 2. _ensureVixFamily routes through backend; pending clears; no websocket ─
  section('2. _ensureVixFamily uses backend first and clears _vixFamilyPending');
  {
    reset(); BACKEND_VIX = JSON.parse(JSON.stringify(READY));
    await sandbox._ensureVixFamily();
    ok(sandbox.S.vixFamily && sandbox.S.vixFamily.vix === 19.73, '2: S.vixFamily populated via backend');
    ok(WS_INSTANCES.length === 0, '2: no websocket opened on the backend path');
    ok(sandbox._vixFamilyPending === null, '2: _vixFamilyPending cleared');
  }

  // ── 3. Incomplete backend + fallback DISABLED → keep previous, no websocket ─
  section('3. incomplete backend never overwrites valid VIX; fallback off ⇒ no socket');
  {
    reset();
    store.set('apex_ff_vix_family_direct_ws_fallback', '0');     // disable diagnostic fallback
    sandbox.S.vixFamily = { vix: 21.0, vix9d: 18.0, vix3m: 22.0, vix6m: 24.0, timestamp: '2026-06-23T09:00:00Z', source: 'BACKEND_DXLINK' };
    BACKEND_VIX = { ok: false, status: 'incomplete', reason: 'missing_vix_family_quotes', vix: null, vix9d: null, vix3m: null, vix6m: null };
    const r = await sandbox._fetchVixFamilyBackendFirst();
    ok(sandbox.S.vixFamily.vix === 21.0, '3: previous valid VIX preserved (not overwritten)');
    ok(WS_INSTANCES.length === 0, '3: fallback disabled → no websocket opened');
    ok(r && r.vix === 21.0, '3: returns the kept previous family');
  }

  // ── 4. ok:true but all-null payload → not applied, no fabrication ──────────
  section('4. all-null backend payload is rejected (no fabricated values)');
  {
    reset();
    const allNull = { ok: true, status: 'incomplete', source: 'BACKEND_DXLINK', vix: null, vix9d: null, vix3m: null, vix6m: null };
    ok(sandbox._applyBackendVixFamily({ ok: true, data: allNull }) === false, '4: _applyBackendVixFamily false for all-null');
    ok(sandbox.S.vixFamily == null, '4: no all-null family stored');
    ok(sandbox._applyBackendVixFamily({ ok: true, data: READY }) === true, '4: a finite backend family IS applied');
  }

  // ── 5. Backend fails + fallback ALLOWED → bounded direct websocket fallback ─
  section('5. backend failure with fallback allowed uses the bounded diagnostic socket');
  {
    reset(); // default flag = allowed
    BACKEND_VIX = new Error('404 Not Found');     // endpoint not implemented yet
    const r = await sandbox._fetchVixFamilyBackendFirst();
    ok(WS_INSTANCES.length === 1, '5: exactly one direct websocket opened as fallback');
    ok(r && r.vix === 19.73, '5: fallback resolved values via direct DXLink');
    ok(sandbox.window._vixFamilyLastSource === 'FRONTEND_DXLINK_FALLBACK', '5: last source tagged FRONTEND_DXLINK_FALLBACK');
    ok(logs.some((l) => /bounded direct DXLink websocket fallback/.test(l)), '5: bounded-fallback log emitted');
  }

  // ── 6. Fallback flag default is allowed; '0' disables it ───────────────────
  section('6. _vixFamilyDirectWsFallbackAllowed honors the localStorage flag');
  {
    reset();
    ok(sandbox._vixFamilyDirectWsFallbackAllowed() === true, '6: default → allowed (graceful during backend rollout)');
    store.set('apex_ff_vix_family_direct_ws_fallback', '0');
    ok(sandbox._vixFamilyDirectWsFallbackAllowed() === false, '6: flag=0 → disabled');
    store.set('apex_ff_vix_family_direct_ws_fallback', '1');
    ok(sandbox._vixFamilyDirectWsFallbackAllowed() === true, '6: flag=1 → allowed');
  }

  // ── 7. STATIC: wiring + endpoint + no new source ───────────────────────────
  section('7. static: backend-first wiring, endpoint, no Yahoo/new source');
  {
    const ensure = extractFn(HTML, '_ensureVixFamily');
    const backendFirst = extractFn(HTML, '_fetchVixFamilyBackendFirst');
    const shared = extractFn(HTML, 'refreshSharedMarketRegime');
    const backendFetch = extractFn(HTML, 'fetchMarketContextVixFamilyFromBackend');
    const normalize = extractFn(HTML, '_normalizeBackendVixFamily');
    ok(/_fetchVixFamilyBackendFirst\(\)/.test(ensure), '7: _ensureVixFamily routes through _fetchVixFamilyBackendFirst');
    ok(/_fetchVixFamilyBackendFirst\(\)/.test(shared), '7: forced refresh routes through _fetchVixFamilyBackendFirst');
    // Cascade order: snapshot is consulted BEFORE the dedicated endpoint.
    const iSnap = backendFirst.indexOf('fetchMarketContextSnapshotFromBackend(');
    const iLive = backendFirst.indexOf('fetchMarketContextVixFamilyFromBackend(');
    const iWs   = backendFirst.indexOf('fetchVixFamily(');
    ok(iSnap > -1 && iLive > -1 && iSnap < iLive, '7: snapshot source is tried before the dedicated endpoint');
    ok(iLive > -1 && iWs > -1 && iLive < iWs, '7: dedicated endpoint is tried before the direct websocket');
    ok(backendFetch.includes("'/market-context/vix-family/live'"), '7: consumes GET /market-context/vix-family/live');
    ok(/vf\.vi3m/.test(normalize) && /vix3m/.test(normalize), '7: normalizer accepts both vix3m and vi3m');
    ok(!/yahoo/i.test(backendFirst) && !/yahoo/i.test(backendFetch) && !/yahoo/i.test(normalize), '7: no Yahoo reference in backend path');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main();
