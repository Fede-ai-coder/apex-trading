'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Non-destructive Portfolio storage recovery — validation.
//
// Extracts the REAL helpers from index.html and runs them in a vm sandbox with
// a mock localStorage. Proves the acceptance criteria of the "main lost its
// portfolios" recovery fix:
//   1.  apexStorageKey namespaces preview/local but leaves production unchanged
//   2.  apexStorageKeyVariants enumerates primary + plain + __local + present
//       __preview_N siblings
//   3.  apexNonDestructiveLoadArray: primary empty + sibling populated → returns
//       the sibling's data, usedFallback=true, and WRITES/DELETES NOTHING
//   4.  apexNonDestructiveLoadArray: primary populated → ignores siblings
//   5.  apexCreateBackup snapshots a source into a fresh apex_backup_* key
//       WITHOUT mutating the source
//   6.  _pfIdEq binds positions across numeric↔string portfolioId mismatch but
//       never matches null/undefined loosely
//   7.  _apexReadArray is robust to missing / invalid / non-array values
//
// Run: node tests/portfolio-storage-recovery.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    if (i < 0) continue;
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine)  { if (c === '\n') inLine = false; continue; }
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
  }
  throw new Error('function not found: ' + name);
}

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); }
}

// Minimal localStorage mock with the full surface the helpers use
// (getItem/setItem/removeItem/length/key). Records nothing implicitly.
function makeStorage(seed) {
  const map = new Map(Object.entries(seed || {}));
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    key(i) { return Array.from(map.keys())[i]; },
    get length() { return map.size; },
    _dump() { return Object.fromEntries(map); },
    _has(k) { return map.has(k); },
  };
}

function makeCtx(hostname, seed) {
  const storage = makeStorage(seed);
  const ctx = {
    window: { location: { hostname: hostname } },
    localStorage: storage,
    console: { log() {}, warn() {}, error() {} },
    JSON, Array, Date, String, Object,
  };
  vm.createContext(ctx);
  const src = [
    extractFn(HTML, 'apexStorageKey'),
    extractFn(HTML, 'apexStorageKeyVariants'),
    extractFn(HTML, '_apexReadArray'),
    extractFn(HTML, 'apexNonDestructiveLoadArray'),
    extractFn(HTML, 'apexBackupKey'),
    extractFn(HTML, 'apexCreateBackup'),
    extractFn(HTML, '_pfIdEq'),
  ].join('\n');
  vm.runInContext(src, ctx);
  ctx._storage = storage;
  return ctx;
}

const J = (a) => JSON.stringify(a);

// ── 1. apexStorageKey: namespacing per env ──────────────────────────────────
(function() {
  assert(makeCtx('app.example.com').apexStorageKey('apex_portfolios') === 'apex_portfolios',
    '1: production host leaves key unchanged');
  assert(makeCtx('localhost').apexStorageKey('apex_portfolios') === 'apex_portfolios__local',
    '1: localhost namespaced');
  assert(makeCtx('deploy-preview-245--site.netlify.app').apexStorageKey('apex_portfolios') === 'apex_portfolios__preview_245',
    '1: deploy-preview namespaced');
  console.log('✓ 1 apexStorageKey env namespacing');
})();

// ── 2. apexStorageKeyVariants enumerates siblings present in storage ─────────
(function() {
  const ctx = makeCtx('app.example.com', {
    'apex_portfolios': '[]',
    'apex_portfolios__local': '[]',
    'apex_portfolios__preview_245': '[]',
    'apex_portfolios__preview_9': '[]',
    'unrelated_key': '[]',
  });
  const v = ctx.apexStorageKeyVariants('apex_portfolios');
  assert(v[0] === 'apex_portfolios', '2: primary first');
  assert(v.indexOf('apex_portfolios__local') !== -1, '2: includes __local');
  assert(v.indexOf('apex_portfolios__preview_245') !== -1, '2: includes preview_245');
  assert(v.indexOf('apex_portfolios__preview_9') !== -1, '2: includes preview_9');
  assert(v.indexOf('unrelated_key') === -1, '2: excludes unrelated keys');
  console.log('✓ 2 apexStorageKeyVariants sibling enumeration');
})();

// ── 3. Recovery: primary empty + sibling populated → non-destructive load ────
(function() {
  const real = [{ id: 1, name: 'Real Money', type: 'options' },
                { id: 2, name: 'IRA', type: 'equities' }];
  const seed = {
    'apex_portfolios': '[]',                          // primary empty (the regression)
    'apex_portfolios__preview_245': J(real),          // data hiding under a sibling
  };
  const ctx = makeCtx('app.example.com', seed);
  const before = J(ctx._storage._dump());
  const r = ctx.apexNonDestructiveLoadArray('apex_portfolios');
  assert(r.usedFallback === true, '3: usedFallback true');
  assert(r.primaryEmpty === true, '3: primaryEmpty true');
  assert(r.sourceKey === 'apex_portfolios__preview_245', '3: sourceKey = sibling');
  assert(r.count === 2 && r.arr.length === 2, '3: recovered 2 portfolios');
  assert(r.arr[0].name === 'Real Money', '3: recovered real data');
  // CRITICAL: the load wrote/deleted NOTHING
  assert(J(ctx._storage._dump()) === before, '3: storage byte-identical after load (non-destructive)');
  assert(ctx._storage._has('apex_portfolios__preview_245'), '3: sibling NOT deleted');
  console.log('✓ 3 recovery reads sibling, mutates nothing');
})();

// ── 4. Primary populated → siblings ignored ─────────────────────────────────
(function() {
  const ctx = makeCtx('app.example.com', {
    'apex_portfolios': J([{ id: 1, name: 'Primary' }]),
    'apex_portfolios__preview_1': J([{ id: 9 }, { id: 10 }]),
  });
  const r = ctx.apexNonDestructiveLoadArray('apex_portfolios');
  assert(r.usedFallback === false, '4: no fallback when primary has data');
  assert(r.sourceKey === 'apex_portfolios', '4: source = primary');
  assert(r.arr.length === 1 && r.arr[0].name === 'Primary', '4: returns primary data');
  console.log('✓ 4 primary wins over siblings');
})();

// ── 5. apexCreateBackup snapshots without mutating the source ────────────────
(function() {
  const real = J([{ id: 1 }, { id: 2 }, { id: 3 }]);
  const ctx = makeCtx('app.example.com', { 'apex_portfolios__preview_245': real });
  const bkey = ctx.apexCreateBackup('apex_portfolios', 'apex_portfolios__preview_245');
  assert(/^apex_backup_portfolios_\d{8}_\d{6}$/.test(bkey), '5: backup key shape, got ' + bkey);
  assert(ctx._storage.getItem(bkey) === real, '5: backup content equals source');
  assert(ctx._storage.getItem('apex_portfolios__preview_245') === real, '5: source untouched');
  console.log('✓ 5 backup is a pure copy');
})();

// ── 6. _pfIdEq tolerant binding (the broken portfolioId mapping fix) ─────────
(function() {
  const ctx = makeCtx('app.example.com', {});
  assert(ctx._pfIdEq(123, 123) === true, '6: numeric==numeric');
  assert(ctx._pfIdEq('123', 123) === true, '6: string==numeric (the fix)');
  assert(ctx._pfIdEq(123, '123') === true, '6: numeric==string (the fix)');
  assert(ctx._pfIdEq(1, 2) === false, '6: different ids do not match');
  assert(ctx._pfIdEq(null, null) === true, '6: null==null');
  assert(ctx._pfIdEq(null, 123) === false, '6: null never matches an id loosely');
  assert(ctx._pfIdEq(undefined, 123) === false, '6: undefined never matches an id');
  console.log('✓ 6 _pfIdEq tolerant + null-safe');
})();

// ── 7. _apexReadArray robustness ────────────────────────────────────────────
(function() {
  const ctx = makeCtx('app.example.com', {
    'good': J([1, 2, 3]), 'bad': '{not json', 'obj': '{"a":1}',
  });
  assert(ctx._apexReadArray('missing').exists === false, '7: missing → exists false');
  assert(ctx._apexReadArray('bad').arr.length === 0, '7: invalid JSON → []');
  assert(ctx._apexReadArray('obj').arr.length === 0, '7: non-array JSON → []');
  const g = ctx._apexReadArray('good');
  assert(g.exists === true && g.arr.length === 3, '7: valid array parsed');
  console.log('✓ 7 _apexReadArray robust');
})();

// ── 8. Legacy apex_positions migration is NON-DESTRUCTIVE (source preserved) ──
// Extracts the REAL migration block from index.html and runs it against a mock
// localStorage. Proves apex_positions (or a sibling) is migrated into apex_trades
// but the source key is NEVER deleted or emptied, and a backup is still created.
(function() {
  const startMark = "var _posKeys = apexStorageKeyVariants('apex_positions');";
  const endMark   = "} catch(e) { console.warn('[Journal] apex_positions migration failed:', e); }";
  const s = HTML.indexOf(startMark);
  const e = HTML.indexOf(endMark, s);
  assert(s >= 0 && e > s, '8: migration block located in index.html');
  const migBody = HTML.slice(s, e);

  // Static regression guard: the migration must not remove the legacy source key.
  assert(migBody.indexOf('removeItem') === -1,
    '8: migration block contains NO removeItem (source key never deleted)');
  assert(/apexCreateBackup\('apex_positions'/.test(migBody),
    '8: migration still creates an apex_positions backup');

  // Run the REAL extracted migration twice (load + simulated reload).
  const legacyPos = [{ id: 'P1', portfolioId: 42, ticker: 'AAPL', direction: 'LONG', qty: 1, entryPrice: 100 }];
  const legacyRaw = J(legacyPos);
  const storage = makeStorage({ 'apex_positions': legacyRaw });
  const ctx = {
    window: { location: { hostname: 'app.example.com' } },
    localStorage: storage,
    console: { log() {}, warn() {}, error() {} },
    JSON, Array, Date, String, Object, parseFloat,
    _trades: [],
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, 'apexStorageKey'),
    extractFn(HTML, 'apexStorageKeyVariants'),
    extractFn(HTML, '_apexReadArray'),
    extractFn(HTML, 'apexBackupKey'),
    extractFn(HTML, 'apexCreateBackup'),
    'function _save(){ localStorage.setItem("apex_trades", JSON.stringify(_trades)); }',
    'function runMig(){ try {\n' + migBody + '\n} catch(_e){ console.warn("mig", _e && _e.message); } }',
  ].join('\n'), ctx);

  const backupsOf = () => Object.keys(storage._dump()).filter((k) => /^apex_backup_positions_/.test(k));

  // First run = the real migration.
  ctx.runMig();
  const b1 = backupsOf();
  assert(storage._has('apex_positions'), '8: source key apex_positions STILL EXISTS after migration');
  assert(storage.getItem('apex_positions') === legacyRaw, '8: source content is byte-identical (unchanged)');
  assert(b1.length === 1, '8: exactly one apex_backup_positions_* created, got ' + b1.length);
  assert(storage.getItem(b1[0]) === legacyRaw, '8: backup content equals the source');
  assert(ctx._trades.length === 1 && ctx._trades[0].sourcePositionId === 'P1' && ctx._trades[0].status === 'OPEN',
    '8: position migrated into apex_trades as an OPEN trade');
  assert(ctx._trades[0].portfolioId === 42 && ctx._trades[0].ticker === 'AAPL',
    '8: migrated trade keeps its portfolio binding');

  // Second run = simulated reload: idempotent, no dup, no new backup, source intact.
  ctx.runMig();
  const b2 = backupsOf();
  assert(ctx._trades.length === 1, '8: reload does NOT duplicate the migrated position');
  assert(b2.length === 1, '8: reload creates NO additional backup (no spam)');
  assert(storage._has('apex_positions') && storage.getItem('apex_positions') === legacyRaw,
    '8: source key still fully intact after reload');
  console.log('✓ 8 legacy apex_positions migration: source preserved, backup kept, idempotent');
})();

console.log('\n' + (failed ? ('FAILED ' + failed + ' / ' + (passed + failed)) : ('ALL PASS (' + passed + ' assertions)')));
process.exit(failed ? 1 : 0);
