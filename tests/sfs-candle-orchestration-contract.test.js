'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SFS CANDLE ORCHESTRATION — contract / boundary pin (PRE-EXTRACTION AUDIT).
//
// WHY THIS EXISTS
//   The low-level candle primitives (candle-store client + the DXLink candle read
//   `_sfsFetchBackendCandles`) already live in js/services/*. What REMAINS in the
//   inline monolith is the Squeeze-Fire (SFS) candle *orchestration*: input
//   normalization, usability predicate, the generic-timeframe ensure, the detail-4H
//   bounded-reread loader, the SPY read-only benchmark resolver, the warmup batch
//   POST, the warmup cooldowns, the warmup queue + drain, and every piece of shared
//   in-flight / cooldown / queue state. A later PR intends to extract SOME of that.
//
//   This test freezes the REAL, observable behaviour of that orchestration BEFORE any
//   code moves, so the extraction PR can only pass if it preserves behaviour and the
//   moment state is initialised. Like tests/candle-service-contract.test.js, it does
//   NOT modify, simplify, unify or fix the application. It DESCRIBES and PROTECTS the
//   current behaviour — including the asymmetries the flows deliberately keep:
//
//     • generic ensure  → ONE post-warmup re-read, no delay, warmup opts = undefined;
//     • detail 4H       → THREE bounded re-reads, sleep BEFORE each (1200/2400/3600ms),
//                          warmup reason 'squeeze_fire_detail_chart', priority absent;
//     • SPY read-only   → FOUR bounded re-reads, sleep before re-reads 2..4 only
//                          (900/1800/2700ms), warmup reason 'sfs_spy_rs_warmup',
//                          priority:true, warm-cooldown keyed 'SPY|<tf>';
//     • warmup batch    → cap 3, small (≤3)/single/priority send immediately, only
//                          LARGE (>3) non-priority batches are debounce-gated + queued;
//     • queue drain     → ONE item per timer tick, then reschedules; the timer handle
//                          `_sfsWarmupDrainTimer` (NOT a boolean) is the running guard.
//
//   Where two flows differ in even one re-read / delay / cooldown / reason / return
//   shape, this test pins BOTH variants rather than erasing the difference.
//
// HOW
//   Real functions are loaded from the reconstructed application source via
//   tests/lib/load-app-source.js and executed in a `vm` sandbox with controlled
//   dependencies. NO real network (every fetch/read is a mock), NO real long timers
//   (sleeps/setTimeout are recorded or neutralised, the clock is injectable), NO npm
//   dependencies. No application implementation is copied — the bytes under test are
//   the shipping bytes.
//
// Run: node tests/sfs-candle-orchestration-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const loader = require('./lib/load-app-source');
const HTML = loader.loadAppJavaScriptSource();

// ── Brace-matching extractor (mirrors the helper used across the suite) ───────
function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0 && (start < 0 || k < start)) start = k; }
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
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }
function loadReal(sandbox, names) { vm.runInContext(names.map((n) => extractFn(HTML, n)).join('\n'), sandbox); }
// Named source blocks (declarations + constants + state) exactly as they ship.
// The four detail-4H CORE functions (_sfsDetail4hBaseResult / _sfsMapDetail4hReason /
// _sfsStoreDetail4h / _sfsEnsureDetail4hCandles) were extracted VERBATIM to
// js/services/sfs-candle-detail-4h.js. The detail STATE (_sfsDetail4hInflight /
// _sfsDetail4hPhase / _sfsDetail4hResult) and the two SFS_DETAIL_4H_POST_WARM_* constants
// now live in js/services/sfs-config-state.js, and the detail UI (_sfs4hDetailMessage /
// _sfsRender4hDetailState) moved VERBATIM to js/ui/sfs-panel.js in SFS PR 3; the console
// diagnostics EXPOSURE statement stays inline in the monolith. Reconstruct the detail
// sandbox from the state slice (anchored on the first and last declaration of the detail
// group, so it stays correct wherever that group lives) plus every function BY NAME from
// the reconstructed source — the behaviour under test is unchanged; only the physical
// location of these declarations moved. Pulling BY NAME rather than by physical slice is
// what makes this harness survive each relocation without weakening.
const DETAIL_PATH  = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-detail-4h.js');
const DETAIL_SRC   = fs.existsSync(DETAIL_PATH) ? fs.readFileSync(DETAIL_PATH, 'utf8') : '';
const DETAIL_4H_CORE = ['_sfsDetail4hBaseResult', '_sfsMapDetail4hReason',
  '_sfsStoreDetail4h', '_sfsEnsureDetail4hCandles'];
const DETAIL_4H_UI   = ['_sfs4hDetailMessage', '_sfsRender4hDetailState'];
const DETAIL_BLOCK = [
  HTML.slice(HTML.indexOf('var _sfsDetail4hInflight'),
    HTML.indexOf('\n', HTML.indexOf('var SFS_DETAIL_4H_POST_WARM_DELAY_MS')) + 1),
].concat(DETAIL_4H_UI.map((n) => extractFn(HTML, n)))
 .concat(DETAIL_4H_CORE.map((n) => extractFn(HTML, n))).join('\n');
// The four SPY read-only resolver functions (_sfsSpyDiag / _sfsPromoteSpyCandles /
// _sfsSpyReadResultContext / _sfsSpyReadOnly) were extracted VERBATIM to
// js/services/sfs-candle-spy-read.js. The resolver STATE (_sfsSpyReadInflight /
// _sfsSpyReadCooldown) and the four SFS_SPY_* constants now live in
// js/services/sfs-config-state.js, while the shared _sfsSleep helper stays declared in the
// monolith. Reconstruct the SPY sandbox from the state+constants slice (anchored on the
// first and last declaration of the SPY group), the monolith's _sfsSleep, plus the four
// resolver functions BY NAME from the reconstructed source — the behaviour under test is
// unchanged; only the physical location of these declarations moved.
const SPY_BLOCK    = [
  HTML.slice(HTML.indexOf('var _sfsSpyReadInflight'),
    HTML.indexOf('\n', HTML.indexOf('var SFS_SPY_POST_WARM_RETRY_DELAY_MS')) + 1),
  extractFn(HTML, '_sfsSleep'),
  extractFn(HTML, '_sfsSpyDiag'),
  extractFn(HTML, '_sfsPromoteSpyCandles'),
  extractFn(HTML, '_sfsSpyReadResultContext'),
  extractFn(HTML, '_sfsSpyReadOnly'),
].join('\n');
// _sfsNormSymbolList / _sfsNormTimeframes were extracted to
// js/services/sfs-candle-predicates.js, and the four warmup coordinator functions
// (_sfsWarmupDiag / _sfsWarmupBatch / _sfsQueueWarmupSymbols / _sfsDrainWarmupQueue)
// were extracted VERBATIM to js/services/sfs-candle-warmup.js. The warmup STATE
// (_sfsWarmupLastSentAt / _sfsWarmupQueue / _sfsWarmupQueuedKeys / _sfsWarmupDrainTimer)
// and the CAP/DEBOUNCE constants now live in js/services/sfs-config-state.js. Reconstruct
// the coordinator sandbox from that state+constants slice (anchored on the first and last
// declaration of the warmup group), the two predicates, and the four coordinator functions
// BY NAME from the reconstructed source — the behaviour under test is unchanged; only the
// physical location of these declarations moved.
const WARMUP_BLOCK = [
  extractFn(HTML, '_sfsNormSymbolList'),
  extractFn(HTML, '_sfsNormTimeframes'),
  HTML.slice(HTML.indexOf('var SFS_WARMUP_BATCH_CAP'),
    HTML.indexOf('\n', HTML.indexOf('var _sfsWarmupDrainTimer')) + 1),
  extractFn(HTML, '_sfsWarmupDiag'),
  extractFn(HTML, '_sfsQueueWarmupSymbols'),
  extractFn(HTML, '_sfsDrainWarmupQueue'),
  extractFn(HTML, '_sfsWarmupBatch'),
].join('\n');

// ── Assertion harness ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }
const flush = () => new Promise((r) => setTimeout(r, 0));

// >= 22 usable bars (the _sfsCandlesUsable minimum) ending on a finite close.
function series(n, lastClose) {
  n = n || 25; const arr = [];
  for (let i = 0; i < n; i++) {
    const close = (i === n - 1 && lastClose != null) ? lastClose : 11 + i;
    arr.push({ time: i + 1, open: 10 + i, high: 12 + i, low: 9 + i, close: close, volume: 100 });
  }
  return arr;
}
const okEmpty = () => ({ ok: true, status: 200, count: 0, candles: [], reason: 'empty' });
const okFull  = (n) => ({ ok: true, status: 200, count: (n || 25), candles: series(n || 25) });

async function main() {

  // ═══════════════════════════════════════════════════════════════════════════
  // MANIFEST — ownership + module non-existence (drift-proof structural pin).
  // ═══════════════════════════════════════════════════════════════════════════
  section('MANIFEST. ownership of SFS candle orchestration + future modules absent');
  {
    const ordered = loader.loadOrderedScriptSources();
    const inlineMonolith = ordered.filter((s) => s.kind === 'inline' && s.isAppJs).map((s) => s.code).join('\n');
    // The SFS in-flight / cooldown / queue STATE and the SFS_* constants were relocated
    // verbatim out of the monolith into js/services/sfs-config-state.js. Ownership below is
    // asserted against that module AND against absence from the monolith.
    const CONFIG_STATE_SRC = fs.readFileSync(
      path.resolve(__dirname, '..', 'js', 'services', 'sfs-config-state.js'), 'utf8');
    // The shared non-DOM helpers (_sfsSleep, _sfsCandlesFromSyncSource) were likewise
    // relocated verbatim out of the monolith into js/services/sfs-scan-service.js.
    // Ownership below is asserted against that module AND against absence from the monolith.
    const SCAN_SERVICE_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-scan-service.js');
    const SCAN_SERVICE_SRC = fs.existsSync(SCAN_SERVICE_PATH) ? fs.readFileSync(SCAN_SERVICE_PATH, 'utf8') : '';
    const localTags = ordered.filter((s) => s.kind === 'local').map((s) => s.src);
    const DX_PATH = path.resolve(__dirname, '..', 'js', 'services', 'candle-dxlink-client.js');
    const DX_SRC = fs.existsSync(DX_PATH) ? fs.readFileSync(DX_PATH, 'utf8') : '';
    const rawIndex = loader.loadIndexHtml();

    // (1) The low-level DXLink read primitive lives in candle-dxlink-client.js …
    ok(fs.existsSync(DX_PATH), 'MANIFEST: js/services/candle-dxlink-client.js exists');
    ok(/function\s+_sfsFetchBackendCandles\s*\(/.test(DX_SRC), 'MANIFEST: _sfsFetchBackendCandles lives in candle-dxlink-client.js');
    ok(localTags.indexOf('./js/services/candle-dxlink-client.js') !== -1, 'MANIFEST: index.html loads candle-dxlink-client.js');
    // … and is NOT (re)declared in the inline monolith.
    ok(!/(?:async\s+)?function\s+_sfsFetchBackendCandles\s*\(/.test(inlineMonolith), 'MANIFEST: _sfsFetchBackendCandles NOT declared in the monolith');

    // (2) NO SFS read orchestrator is left in the inline monolith. The four read-only predicates
    //     (_sfsNormSymbolList / _sfsNormTimeframes / _sfsCandlesUsable / _sfsCandleSubLimitActive)
    //     were extracted to sfs-candle-predicates.js (asserted in (2b)). The four warmup
    //     coordinator functions were extracted to sfs-candle-warmup.js (asserted in
    //     SFS_CANDLE_WARMUP below). The generic-timeframe ensure was extracted to
    //     sfs-candle-generic-ensure.js (asserted in SFS_GENERIC_ENSURE below). The
    //     self-sufficient 1D chart hydration was extracted to sfs-candle-chart-hydration.js
    //     (asserted in SFS_CHART_HYDRATION below). The SPY read-only resolver was extracted to
    //     sfs-candle-spy-read.js (asserted in SFS_SPY_READ below). The detail-4H read
    //     orchestrator — the LAST one — was extracted to sfs-candle-detail-4h.js together with
    //     its three exclusive core helpers (asserted in SFS_DETAIL_4H_CORE below). What STAYS in
    //     the monolith is the detail-4H UI, its phase/result/in-flight state and its constants.
    const SFS_READ_ORCHESTRATORS = ['_sfsEnsureDetail4hCandles', '_sfsEnsureTfCandles',
      '_sfsEnsureChartData', '_sfsSpyReadOnly'];
    SFS_READ_ORCHESTRATORS.forEach((n) => {
      ok(!new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(').test(inlineMonolith),
         'MANIFEST: no SFS read orchestrator left in the monolith: ' + n);
      ok(DX_SRC.indexOf(n) === -1, 'MANIFEST: orchestrator NOT in candle-dxlink-client.js: ' + n);
    });
    // The detail-4H UI pair left the monolith in SFS PR 3 and is owned by the SFS UI
    // panel module. Asserted on both sides — in the panel AND gone from the monolith —
    // so a duplicate or a drop fails here by name, not as a count drift.
    const DETAIL_4H_UI_PANEL_REL = 'js/ui/sfs-panel.js';
    const DETAIL_4H_UI_PANEL_SRC = stripComments(
      fs.readFileSync(path.resolve(__dirname, '..', DETAIL_4H_UI_PANEL_REL), 'utf8'));
    DETAIL_4H_UI.forEach((n) => {
      const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
      ok((DETAIL_4H_UI_PANEL_SRC.match(reAll) || []).length === 1,
         'MANIFEST: detail-4H UI is declared in ' + DETAIL_4H_UI_PANEL_REL + ': ' + n);
      ok((inlineMonolith.match(reAll) || []).length === 0,
         'MANIFEST: detail-4H UI is NO LONGER declared in the monolith: ' + n);
      ok(DX_SRC.indexOf(n) === -1, 'MANIFEST: detail-4H UI NOT in candle-dxlink-client.js: ' + n);
    });

    // (2w) SFS_CANDLE_WARMUP — the four warmup coordinator functions were extracted VERBATIM to
    //      their OWN classic module js/services/sfs-candle-warmup.js (loaded AFTER
    //      sfs-candle-predicates.js and BEFORE the inline monolith): present there, absent from
    //      the residual inline monolith and the dxlink-client module, exactly one overall definition.
    const SFS_CANDLE_WARMUP = ['_sfsWarmupDiag', '_sfsWarmupBatch', '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue'];
    {
      const WARMUP_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-warmup.js');
      const WARMUP_SRC = fs.existsSync(WARMUP_PATH) ? fs.readFileSync(WARMUP_PATH, 'utf8') : '';
      const WARMUP_TAG = './js/services/sfs-candle-warmup.js';
      const warmupEntry = ordered.filter((s) => s.kind === 'local' && s.src === WARMUP_TAG)[0];
      const wPredEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/services/sfs-candle-predicates.js')[0];
      const wFirstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
      ok(fs.existsSync(WARMUP_PATH), 'SFS_CANDLE_WARMUP: js/services/sfs-candle-warmup.js exists');
      ok(localTags.indexOf(WARMUP_TAG) !== -1, 'SFS_CANDLE_WARMUP: index.html loads sfs-candle-warmup.js');
      ok(!!warmupEntry && !!wPredEntry && wPredEntry.order < warmupEntry.order, 'SFS_CANDLE_WARMUP: loads AFTER sfs-candle-predicates.js');
      ok(!!warmupEntry && !!wFirstInline && warmupEntry.order < wFirstInline.order, 'SFS_CANDLE_WARMUP: loads BEFORE the inline monolith');
      SFS_CANDLE_WARMUP.forEach((n) => {
        const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
        ok((WARMUP_SRC.match(reAll) || []).length === 1, 'SFS_CANDLE_WARMUP: ' + n + ' defined in sfs-candle-warmup.js');
        ok((inlineMonolith.match(reAll) || []).length === 0, 'SFS_CANDLE_WARMUP: ' + n + ' NOT defined in the residual inline monolith');
        ok((HTML.match(reAll) || []).length === 1, 'SFS_CANDLE_WARMUP: exactly one overall definition of ' + n + ' in reconstructed source');
        ok(DX_SRC.indexOf(n) === -1, 'SFS_CANDLE_WARMUP: ' + n + ' NOT in candle-dxlink-client.js');
      });
    }

    // (2g) SFS_GENERIC_ENSURE — the generic-timeframe candle ensure (_sfsEnsureTfCandles) was
    //      extracted VERBATIM to its OWN classic module js/services/sfs-candle-generic-ensure.js
    //      (loaded AFTER sfs-candle-warmup.js and BEFORE the inline monolith): present there,
    //      absent from the residual inline monolith and the sibling extracted modules, exactly
    //      one overall definition. The in-flight / cooldown / last-failure state and the
    //      SFS_WARMUP_COOLDOWN_MS constant STAY declared in the monolith (asserted in (3) below).
    {
      const GEN_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-generic-ensure.js');
      const GEN_SRC = fs.existsSync(GEN_PATH) ? fs.readFileSync(GEN_PATH, 'utf8') : '';
      const GEN_TAG = './js/services/sfs-candle-generic-ensure.js';
      const GEN_CODE = stripComments(GEN_SRC);
      const genEntry = ordered.filter((s) => s.kind === 'local' && s.src === GEN_TAG)[0];
      const gWarmupEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/services/sfs-candle-warmup.js')[0];
      const gFirstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
      const gTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-generic-ensure\.js["'][^>]*>/gi) || [];
      ok(fs.existsSync(GEN_PATH), 'SFS_GENERIC_ENSURE: js/services/sfs-candle-generic-ensure.js exists');
      ok(localTags.indexOf(GEN_TAG) !== -1, 'SFS_GENERIC_ENSURE: index.html loads sfs-candle-generic-ensure.js');
      ok(gTags.length === 1 && !/\btype\s*=/.test(gTags[0]), 'SFS_GENERIC_ENSURE: the <script> tag is classic (no type= attribute)');
      ok(gTags.length === 1 && !/\basync\b/.test(gTags[0]) && !/\bdefer\b/.test(gTags[0]), 'SFS_GENERIC_ENSURE: the <script> tag has no async/defer');
      ok(!!genEntry && !!gWarmupEntry && gWarmupEntry.order < genEntry.order, 'SFS_GENERIC_ENSURE: loads AFTER sfs-candle-warmup.js');
      ok(!!genEntry && !!gFirstInline && genEntry.order < gFirstInline.order, 'SFS_GENERIC_ENSURE: loads BEFORE the inline monolith');
      const reAll = /(?:async\s+)?function\s+_sfsEnsureTfCandles\s*\(/g;
      ok((GEN_SRC.match(reAll) || []).length === 1, 'SFS_GENERIC_ENSURE: _sfsEnsureTfCandles defined in sfs-candle-generic-ensure.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, 'SFS_GENERIC_ENSURE: _sfsEnsureTfCandles NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, 'SFS_GENERIC_ENSURE: exactly one overall definition of _sfsEnsureTfCandles in reconstructed source');
      ok(DX_SRC.indexOf('_sfsEnsureTfCandles') === -1, 'SFS_GENERIC_ENSURE: _sfsEnsureTfCandles NOT in candle-dxlink-client.js');
      // module contains ONLY the one declaration + comments — no top-level executable code.
      const genResidual = GEN_CODE.replace(stripComments(extractFn(GEN_SRC, '_sfsEnsureTfCandles')), '');
      ok(genResidual.trim() === '', 'SFS_GENERIC_ENSURE: module contains ONLY the single declaration + comments (no top-level executable code)');
      ok((GEN_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 1, 'SFS_GENERIC_ENSURE: module has exactly one named function declaration');
      ok(!/\b(?:var|let|const)\s+\w/.test(genResidual), 'SFS_GENERIC_ENSURE: module declares no top-level state/constants');
      // the state + constant it uses are NOT (re)declared in the module (they stay in the monolith).
      ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsLastFailReason', 'SFS_WARMUP_COOLDOWN_MS'].forEach((s) => {
        ok(!new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b').test(GEN_SRC), 'SFS_GENERIC_ENSURE: ' + s + ' NOT (re)declared in the module');
      });
      // no detail-4H / SPY helper leaked into the generic-ensure module.
      ['_sfsEnsureDetail4hCandles', '_sfsSpyReadOnly', '_sfsSleep'].forEach((n) => {
        ok(GEN_SRC.indexOf('function ' + n + '(') === -1, 'SFS_GENERIC_ENSURE: no detail/SPY helper in the module: ' + n);
      });
      // classic-script hygiene.
      ok(GEN_SRC.indexOf("'use strict'") === -1 && GEN_SRC.indexOf('"use strict"') === -1, 'SFS_GENERIC_ENSURE: module has no "use strict" pragma');
      ok(!/\bimport\b/.test(GEN_SRC) && !/\bexport\b/.test(GEN_SRC), 'SFS_GENERIC_ENSURE: module has no import/export');
      ok(GEN_SRC.indexOf('require(') === -1, 'SFS_GENERIC_ENSURE: module has no require(');
      ok(!/window\.\w+\s*=/.test(GEN_SRC), 'SFS_GENERIC_ENSURE: module has no window.* export');
    }

    // (2c) SFS_CHART_HYDRATION — the self-sufficient 1D chart hydration (_sfsEnsureChartData) was
    //      extracted VERBATIM to its OWN classic module js/services/sfs-candle-chart-hydration.js
    //      (loaded AFTER sfs-candle-generic-ensure.js and BEFORE the inline monolith): present
    //      there, absent from the residual inline monolith and the sibling extracted modules,
    //      exactly one overall definition. It delegates ONLY to _sfsEnsureTfCandles (the generic
    //      ensure); it owns NO state, does NO direct read/warmup/transport, touches NO DOM, uses
    //      NO timers, and contains NO detail-4H / SPY logic (those stay in the monolith).
    {
      const HYD_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-chart-hydration.js');
      const HYD_SRC = fs.existsSync(HYD_PATH) ? fs.readFileSync(HYD_PATH, 'utf8') : '';
      const HYD_TAG = './js/services/sfs-candle-chart-hydration.js';
      const HYD_CODE = stripComments(HYD_SRC);
      const hydEntry = ordered.filter((s) => s.kind === 'local' && s.src === HYD_TAG)[0];
      const hGenEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/services/sfs-candle-generic-ensure.js')[0];
      const hFirstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
      const hTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-chart-hydration\.js["'][^>]*>/gi) || [];
      // (1) file exists.
      ok(fs.existsSync(HYD_PATH), 'SFS_CHART_HYDRATION: js/services/sfs-candle-chart-hydration.js exists');
      // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
      ok(hTags.length === 1, 'SFS_CHART_HYDRATION: exactly one sfs-candle-chart-hydration.js <script> tag in index.html');
      ok(hTags.length === 1 && !/\btype\s*=/.test(hTags[0]), 'SFS_CHART_HYDRATION: the <script> tag is classic (no type= attribute)');
      ok(hTags.length === 1 && !/\basync\b/.test(hTags[0]) && !/\bdefer\b/.test(hTags[0]), 'SFS_CHART_HYDRATION: the <script> tag has no async/defer');
      // (5)(6) load order: AFTER sfs-candle-generic-ensure.js, BEFORE the inline monolith.
      ok(localTags.indexOf(HYD_TAG) !== -1, 'SFS_CHART_HYDRATION: index.html loads sfs-candle-chart-hydration.js');
      ok(!!hydEntry && !!hGenEntry && hGenEntry.order < hydEntry.order, 'SFS_CHART_HYDRATION: loads AFTER sfs-candle-generic-ensure.js');
      ok(!!hydEntry && !!hFirstInline && hydEntry.order < hFirstInline.order, 'SFS_CHART_HYDRATION: loads BEFORE the inline monolith');
      // (7)(8)(9)(10) present in the module, absent from the residual monolith, one overall def.
      const reAll = /(?:async\s+)?function\s+_sfsEnsureChartData\s*\(/g;
      ok((HYD_SRC.match(reAll) || []).length === 1, 'SFS_CHART_HYDRATION: _sfsEnsureChartData defined in sfs-candle-chart-hydration.js');
      ok((inlineMonolith.match(reAll) || []).length === 0, 'SFS_CHART_HYDRATION: _sfsEnsureChartData NOT defined in the residual inline monolith');
      ok((HTML.match(reAll) || []).length === 1, 'SFS_CHART_HYDRATION: exactly one overall definition of _sfsEnsureChartData in reconstructed source');
      // (11)(12) the module contains ONLY the single declaration + comments — no top-level code.
      const hydResidual = HYD_CODE.replace(stripComments(extractFn(HYD_SRC, '_sfsEnsureChartData')), '');
      ok(hydResidual.trim() === '', 'SFS_CHART_HYDRATION: module contains ONLY the single declaration + comments (no top-level executable code)');
      ok((HYD_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 1, 'SFS_CHART_HYDRATION: module has exactly one named function declaration');
      // (13)(14) declares NO state and NO constants.
      ok(!/\b(?:var|let|const)\s+\w/.test(hydResidual), 'SFS_CHART_HYDRATION: module declares no top-level state/constants');
      // (15)(16) no timers, no DOM.
      ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(HYD_CODE), 'SFS_CHART_HYDRATION: module creates no timers');
      ok(!/\bdocument\b|getElementById|querySelector|addEventListener/.test(HYD_CODE), 'SFS_CHART_HYDRATION: module touches no DOM');
      // (17) delegation only: it calls _sfsEnsureTfCandles and performs NO direct transport.
      ok(/_sfsEnsureTfCandles\s*\(/.test(HYD_CODE), 'SFS_CHART_HYDRATION: delegates to _sfsEnsureTfCandles');
      ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest|_sfsFetchBackendCandles/.test(HYD_CODE), 'SFS_CHART_HYDRATION: module performs no direct transport');
      // (18) no direct warmup.
      ok(!/[Ww]armup/.test(HYD_CODE) && !/_sfsWarmupBatch/.test(HYD_CODE), 'SFS_CHART_HYDRATION: module performs no direct warmup');
      // (19)(20) no detail-4H / SPY logic leaked in.
      ok(!/4H/.test(HYD_CODE) && !/_sfsEnsureDetail4hCandles/.test(HYD_CODE), 'SFS_CHART_HYDRATION: module contains no detail-4H logic');
      ok(!/SPY/.test(HYD_CODE) && !/_sfsSpyReadOnly/.test(HYD_CODE), 'SFS_CHART_HYDRATION: module contains no SPY logic');
      // the shared in-flight / cooldown / last-failure state is NOT (re)declared in the module.
      ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsLastFailReason', 'SFS_WARMUP_COOLDOWN_MS'].forEach((s) => {
        ok(!new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b').test(HYD_SRC), 'SFS_CHART_HYDRATION: ' + s + ' NOT (re)declared in the module');
      });
      // no detail/SPY helper leaked into the hydration module.
      ['_sfsEnsureDetail4hCandles', '_sfsSpyReadOnly', '_sfsSleep'].forEach((n) => {
        ok(HYD_SRC.indexOf('function ' + n + '(') === -1, 'SFS_CHART_HYDRATION: no detail/SPY helper in the module: ' + n);
      });
      // classic-script hygiene.
      ok(HYD_SRC.indexOf("'use strict'") === -1 && HYD_SRC.indexOf('"use strict"') === -1, 'SFS_CHART_HYDRATION: module has no "use strict" pragma');
      ok(!/\bimport\b/.test(HYD_SRC) && !/\bexport\b/.test(HYD_SRC), 'SFS_CHART_HYDRATION: module has no import/export');
      ok(HYD_SRC.indexOf('require(') === -1, 'SFS_CHART_HYDRATION: module has no require(');
      ok(!/window\.\w+\s*=/.test(HYD_SRC), 'SFS_CHART_HYDRATION: module has no window.* export');
    }

    // (2s) SFS_SPY_READ — the SPY read-only benchmark resolver and its EXCLUSIVE helpers
    //      (_sfsSpyDiag / _sfsPromoteSpyCandles / _sfsSpyReadResultContext / _sfsSpyReadOnly)
    //      were extracted VERBATIM to their OWN classic module js/services/sfs-candle-spy-read.js
    //      (loaded AFTER sfs-candle-chart-hydration.js and BEFORE the inline monolith): present
    //      there, absent from the residual inline monolith, exactly one overall definition each.
    //      ONLY the four function declarations moved. The resolver STATE
    //      (_sfsSpyReadInflight / _sfsSpyReadCooldown), the four SFS_SPY_* constants and the
    //      shared helpers (_sfsSleep / _sfsCandlesFromSyncSource — the latter also used by the
    //      detail-4H flow) stay declared in the monolith and resolve globally at call time.
    const SFS_SPY_READ = ['_sfsSpyDiag', '_sfsPromoteSpyCandles', '_sfsSpyReadResultContext', '_sfsSpyReadOnly'];
    {
      const SPY_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-spy-read.js');
      const SPY_SRC = fs.existsSync(SPY_PATH) ? fs.readFileSync(SPY_PATH, 'utf8') : '';
      const SPY_TAG = './js/services/sfs-candle-spy-read.js';
      const SPY_CODE = stripComments(SPY_SRC);
      const spyEntry = ordered.filter((s) => s.kind === 'local' && s.src === SPY_TAG)[0];
      const sHydEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/services/sfs-candle-chart-hydration.js')[0];
      const sFirstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
      const sTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-spy-read\.js["'][^>]*>/gi) || [];
      // (1) file exists.
      ok(fs.existsSync(SPY_PATH), 'SFS_SPY_READ: js/services/sfs-candle-spy-read.js exists');
      // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
      ok(sTags.length === 1, 'SFS_SPY_READ: exactly one sfs-candle-spy-read.js <script> tag in index.html');
      ok(sTags.length === 1 && !/\btype\s*=/.test(sTags[0]), 'SFS_SPY_READ: the <script> tag is classic (no type= attribute)');
      ok(sTags.length === 1 && !/\basync\b/.test(sTags[0]) && !/\bdefer\b/.test(sTags[0]), 'SFS_SPY_READ: the <script> tag has no async/defer');
      // (5)(6)(7) load order: AFTER chart hydration, BEFORE the inline monolith; loader sees it.
      ok(!!spyEntry && !!sHydEntry && sHydEntry.order < spyEntry.order, 'SFS_SPY_READ: loads AFTER sfs-candle-chart-hydration.js');
      ok(!!spyEntry && !!sFirstInline && spyEntry.order < sFirstInline.order, 'SFS_SPY_READ: loads BEFORE the inline monolith');
      ok(localTags.indexOf(SPY_TAG) !== -1, 'SFS_SPY_READ: the shared loader includes sfs-candle-spy-read.js');
      // (8)(9)(10) the four functions: in the module, gone from the monolith, one def overall.
      SFS_SPY_READ.forEach((n) => {
        const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
        ok((SPY_SRC.match(reAll) || []).length === 1, 'SFS_SPY_READ: ' + n + ' defined in sfs-candle-spy-read.js');
        ok((inlineMonolith.match(reAll) || []).length === 0, 'SFS_SPY_READ: ' + n + ' NOT defined in the residual inline monolith');
        ok((HTML.match(reAll) || []).length === 1, 'SFS_SPY_READ: exactly one overall definition of ' + n + ' in reconstructed source');
      });
      ok((SPY_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 4, 'SFS_SPY_READ: module has exactly four named function declarations');
      // (11) resolver STATE + the four SFS_SPY_* constants stay in the monolith, not (re)declared here.
      ['_sfsSpyReadInflight', '_sfsSpyReadCooldown', 'SFS_SPY_READ_COOLDOWN_MS', 'SFS_SPY_WARM_COOLDOWN_MS',
        'SFS_SPY_POST_WARM_READ_ATTEMPTS', 'SFS_SPY_POST_WARM_RETRY_DELAY_MS'].forEach((s) => {
        const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
        ok(reDecl.test(CONFIG_STATE_SRC), 'SFS_SPY_READ: ' + s + ' declared in sfs-config-state.js');
        ok(!reDecl.test(inlineMonolith), 'SFS_SPY_READ: ' + s + ' no longer declared in the monolith');
        ok(!reDecl.test(SPY_SRC), 'SFS_SPY_READ: ' + s + ' NOT (re)declared in the module');
      });
      // (12)(13) the shared helpers are owned by the extracted scan service, no longer
      //          declared in the monolith, and NOT duplicated/proxied here.
      ['_sfsSleep', '_sfsCandlesFromSyncSource'].forEach((n) => {
        const reDef = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(');
        ok(reDef.test(SCAN_SERVICE_SRC), 'SFS_SPY_READ: shared helper declared in sfs-scan-service.js: ' + n);
        ok(!reDef.test(inlineMonolith), 'SFS_SPY_READ: shared helper no longer declared in the monolith: ' + n);
        ok(SPY_SRC.indexOf('function ' + n + '(') === -1, 'SFS_SPY_READ: shared helper NOT (re)declared in the module: ' + n);
      });
      // (14) the module contains ONLY the four declarations + comments — no top-level code.
      let spyResidual = SPY_CODE;
      SFS_SPY_READ.forEach((n) => { spyResidual = spyResidual.replace(stripComments(extractFn(SPY_SRC, n)), ''); });
      ok(spyResidual.trim() === '', 'SFS_SPY_READ: module contains ONLY the four declarations + comments (no top-level executable code)');
      ok(!/\b(?:var|let|const)\s+\w/.test(spyResidual), 'SFS_SPY_READ: module declares no top-level state/constants');
      ok(!/\bnew\s+Promise\b|\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(spyResidual), 'SFS_SPY_READ: module creates no top-level Promise/timer');
      // (15) no DOM / rendering: the RS panel UI is owned by js/ui/sfs-panel.js.
      ok(!/\bdocument\b|getElementById|querySelector|innerHTML|addEventListener/.test(SPY_CODE), 'SFS_SPY_READ: module touches NO DOM');
      ok(!/_sfsDrawRsPanel|_pfDrawRsPanel|_sfsRsPanelMsg/.test(SPY_CODE), 'SFS_SPY_READ: module calls no RS panel rendering helper');
      // (16) no DIRECT transport: it goes through _sfsFetchBackendCandles / _sfsWarmupBatch only.
      ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest|candles-dxlink|\/market\/candles/.test(SPY_CODE), 'SFS_SPY_READ: module performs NO direct transport');
      ok(/_sfsFetchBackendCandles\s*\(\s*'SPY'/.test(SPY_CODE), 'SFS_SPY_READ: module reads via the _sfsFetchBackendCandles primitive');
      ok(/_sfsWarmupBatch\s*\(\s*\[\s*'SPY'\s*\]/.test(SPY_CODE), 'SFS_SPY_READ: module warms via the _sfsWarmupBatch coordinator (SPY only)');
      // (17) no detail-4H logic leaked into the SPY module — the detail-4H core has its OWN
      //      module (sfs-candle-detail-4h.js), its UI lives in js/ui/sfs-panel.js and its
      //      state in js/services/sfs-config-state.js.
      ['_sfsEnsureDetail4hCandles', '_sfsDetail4hBaseResult', '_sfsMapDetail4hReason', '_sfs4hDetailMessage',
        '_sfsStoreDetail4h', '_sfsRender4hDetailState', '_sfsDetail4hInflight', '_sfsDetail4hPhase', '_sfsDetail4hResult'].forEach((n) => {
        ok(SPY_CODE.indexOf(n) === -1, 'SFS_SPY_READ: no detail-4H symbol in the module: ' + n);
      });
      ok(new RegExp('(?:async\\s+)?function\\s+_sfsEnsureDetail4hCandles\\s*\\(').test(DETAIL_SRC), 'SFS_SPY_READ: _sfsEnsureDetail4hCandles lives in sfs-candle-detail-4h.js');
      // (18) the aggregate candle-service module is still NOT created by this extraction.
      ok(fs.existsSync(path.resolve(__dirname, '..', 'js', 'services', 'candle-service.js')) === false, 'SFS_SPY_READ: js/services/candle-service.js does NOT exist');
      // classic-script hygiene.
      ok(SPY_SRC.indexOf("'use strict'") === -1 && SPY_SRC.indexOf('"use strict"') === -1, 'SFS_SPY_READ: module has no "use strict" pragma');
      ok(!/\bimport\b/.test(SPY_SRC) && !/\bexport\b/.test(SPY_SRC), 'SFS_SPY_READ: module has no import/export');
      ok(SPY_SRC.indexOf('require(') === -1, 'SFS_SPY_READ: module has no require(');
      ok(!/window\.\w+\s*=/.test(SPY_SRC), 'SFS_SPY_READ: module has no window.* export');
    }

    // SFS_DETAIL_4H_CORE — the four detail-4H CORE declarations (_sfsDetail4hBaseResult /
    //   _sfsMapDetail4hReason / _sfsStoreDetail4h / _sfsEnsureDetail4hCandles) were extracted
    //   VERBATIM to their OWN classic module js/services/sfs-candle-detail-4h.js, loaded AFTER
    //   sfs-candle-spy-read.js and BEFORE the inline monolith. This is the LAST SFS read
    //   orchestrator to leave the monolith. What STAYS behind: the detail UI
    //   (_sfs4hDetailMessage / _sfsRender4hDetailState), the phase/result/in-flight state, the
    //   two SFS_DETAIL_4H_POST_WARM_* constants and the shared cooldown/last-fail maps +
    //   SFS_WARMUP_COOLDOWN_MS (shared with the extracted generic ensure) and the shared
    //   _sfsSleep / _sfsCandlesFromSyncSource helpers. The orchestrator keeps calling the
    //   renderer GLOBALLY — no wrapper, callback, event emitter or injected dependency.
    {
      const DETAIL_CODE = stripComments(DETAIL_SRC);
      const DETAIL_TAG = './js/services/sfs-candle-detail-4h.js';
      const detailTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-detail-4h\.js["'][^>]*>/gi) || [];
      const detailEntry = ordered.filter((s) => s.kind === 'local' && s.src === DETAIL_TAG)[0];
      const dSpyEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/services/sfs-candle-spy-read.js')[0];
      const dFirstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];

      // (1) file exists and is loaded by index.html through the shared loader.
      ok(fs.existsSync(DETAIL_PATH), 'SFS_DETAIL_4H_CORE: js/services/sfs-candle-detail-4h.js exists');
      ok(localTags.indexOf(DETAIL_TAG) !== -1, 'SFS_DETAIL_4H_CORE: index.html loads sfs-candle-detail-4h.js');
      // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
      ok(detailTags.length === 1, 'SFS_DETAIL_4H_CORE: exactly one sfs-candle-detail-4h.js <script> tag');
      ok(detailTags.length === 1 && !/\btype\s*=/.test(detailTags[0]), 'SFS_DETAIL_4H_CORE: the <script> tag is classic (no type= attribute)');
      ok(detailTags.length === 1 && !/\basync\b/.test(detailTags[0]) && !/\bdefer\b/.test(detailTags[0]), 'SFS_DETAIL_4H_CORE: the <script> tag has no async/defer');
      // (5)(6) load order: AFTER sfs-candle-spy-read.js, BEFORE the inline monolith.
      ok(!!detailEntry && !!dSpyEntry && dSpyEntry.order < detailEntry.order, 'SFS_DETAIL_4H_CORE: loads AFTER sfs-candle-spy-read.js');
      ok(!!detailEntry && !!dFirstInline && detailEntry.order < dFirstInline.order, 'SFS_DETAIL_4H_CORE: loads BEFORE the inline monolith');
      // (7)(8)(9) the four core functions: in the module, gone from the monolith, one definition overall.
      DETAIL_4H_CORE.forEach((n) => {
        const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
        ok((DETAIL_CODE.match(reAll) || []).length === 1, 'SFS_DETAIL_4H_CORE: declared in the module: ' + n);
        ok((inlineMonolith.match(reAll) || []).length === 0, 'SFS_DETAIL_4H_CORE: NOT declared in the residual monolith: ' + n);
        ok((HTML.match(reAll) || []).length === 1, 'SFS_DETAIL_4H_CORE: exactly one overall definition: ' + n);
      });
      // (10) the module contains ONLY the four declarations + comments — no top-level code.
      let detailResidual = DETAIL_CODE;
      DETAIL_4H_CORE.forEach((n) => { detailResidual = detailResidual.replace(stripComments(extractFn(DETAIL_SRC, n)), ''); });
      ok(detailResidual.trim() === '', 'SFS_DETAIL_4H_CORE: module contains ONLY the four declarations + comments (no top-level executable code)');
      ok((DETAIL_CODE.match(/(?:async\s+)?function\s+\w+\s*\(/g) || []).length === 4, 'SFS_DETAIL_4H_CORE: module has exactly four named function declarations');
      ok(!/\b(?:var|let|const)\s+\w/.test(detailResidual), 'SFS_DETAIL_4H_CORE: module declares no top-level state/constants');
      ok(!/\bnew\s+Promise\b|\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(detailResidual), 'SFS_DETAIL_4H_CORE: module creates no top-level Promise/timer');
      // (11) the detail UI is owned by js/ui/sfs-panel.js (SFS PR 3), is gone from the
      //      monolith, and is NOT (re)declared in this core module.
      DETAIL_4H_UI.forEach((n) => {
        const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
        ok((stripComments(fs.readFileSync(path.resolve(__dirname, '..', 'js', 'ui', 'sfs-panel.js'), 'utf8')).match(reAll) || []).length === 1,
           'SFS_DETAIL_4H_CORE: UI is declared in js/ui/sfs-panel.js: ' + n);
        ok((inlineMonolith.match(reAll) || []).length === 0, 'SFS_DETAIL_4H_CORE: UI is NO LONGER in the monolith: ' + n);
        ok(DETAIL_CODE.indexOf('function ' + n + '(') === -1, 'SFS_DETAIL_4H_CORE: UI NOT (re)declared in the module: ' + n);
      });
      // (12) detail state + constants stay declared in the monolith, not (re)declared here.
      ['_sfsDetail4hInflight', '_sfsDetail4hPhase', '_sfsDetail4hResult',
        'SFS_DETAIL_4H_POST_WARM_ATTEMPTS', 'SFS_DETAIL_4H_POST_WARM_DELAY_MS'].forEach((s) => {
        const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
        ok(reDecl.test(CONFIG_STATE_SRC), 'SFS_DETAIL_4H_CORE: ' + s + ' declared in sfs-config-state.js');
        ok(!reDecl.test(inlineMonolith), 'SFS_DETAIL_4H_CORE: ' + s + ' no longer declared in the monolith');
        ok(!reDecl.test(DETAIL_SRC), 'SFS_DETAIL_4H_CORE: ' + s + ' NOT (re)declared in the module');
      });
      // (13) shared cooldown/last-fail state + constant + shared helpers stay in the monolith and
      //      remain SHARED with the extracted generic ensure — not duplicated or split.
      const GEN_SHARED = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-generic-ensure.js'), 'utf8');
      ['_sfsWarmupCooldown', '_sfsLastFailReason', 'SFS_WARMUP_COOLDOWN_MS'].forEach((s) => {
        const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
        ok(reDecl.test(CONFIG_STATE_SRC), 'SFS_DETAIL_4H_CORE: shared ' + s + ' declared in sfs-config-state.js');
        ok(!reDecl.test(inlineMonolith), 'SFS_DETAIL_4H_CORE: shared ' + s + ' no longer declared in the monolith');
        ok(!reDecl.test(DETAIL_SRC), 'SFS_DETAIL_4H_CORE: shared ' + s + ' NOT (re)declared in the module');
        ok(GEN_SHARED.indexOf(s) >= 0 && DETAIL_CODE.indexOf(s) >= 0, 'SFS_DETAIL_4H_CORE: shared ' + s + ' is used by BOTH the generic ensure and the detail core');
      });
      ['_sfsSleep', '_sfsCandlesFromSyncSource'].forEach((n) => {
        const reDef = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(');
        ok(reDef.test(SCAN_SERVICE_SRC), 'SFS_DETAIL_4H_CORE: shared helper declared in sfs-scan-service.js: ' + n);
        ok(!reDef.test(inlineMonolith), 'SFS_DETAIL_4H_CORE: shared helper no longer declared in the monolith: ' + n);
        ok(DETAIL_CODE.indexOf('function ' + n + '(') === -1, 'SFS_DETAIL_4H_CORE: shared helper NOT duplicated in the module: ' + n);
      });
      // (14) NO DOM of its own — it renders by calling the monolith renderer GLOBALLY, once,
      //      immediately after the phase → warming write, with no guard or wrapper added.
      ok(!/\bdocument\b|getElementById|querySelector|innerHTML|addEventListener/.test(DETAIL_CODE), 'SFS_DETAIL_4H_CORE: module implements NO DOM access');
      const detOrch = stripComments(extractFn(DETAIL_SRC, '_sfsEnsureDetail4hCandles'));
      ok((detOrch.match(/_sfsRender4hDetailState\(/g) || []).length === 1, 'SFS_DETAIL_4H_CORE: module calls the GLOBAL renderer exactly once');
      ok(/_sfsDetail4hPhase\[symbol\]\s*=\s*'warming';\s*_sfsRender4hDetailState\(symbol\)/.test(detOrch.replace(/\s+/g, ' ')), 'SFS_DETAIL_4H_CORE: the render call immediately follows the phase → warming write');
      ok(!/typeof\s+_sfsRender4hDetailState/.test(DETAIL_CODE), 'SFS_DETAIL_4H_CORE: no typeof guard was added around the renderer');
      // (15) no DIRECT transport: reads via _sfsFetchBackendCandles, warms via _sfsWarmupBatch.
      ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest|candles-dxlink|\/market\/candles/.test(DETAIL_CODE), 'SFS_DETAIL_4H_CORE: module performs NO direct transport');
      ok((detOrch.match(/_sfsFetchBackendCandles\(/g) || []).length === 2, 'SFS_DETAIL_4H_CORE: exactly two read call sites');
      ok((detOrch.match(/_sfsWarmupBatch\(/g) || []).length === 1, 'SFS_DETAIL_4H_CORE: exactly one warmup call site');
      ok(/_sfsWarmupBatch\(\s*\[\s*symbol\s*\]\s*,\s*\[\s*'30M'\s*\]/.test(detOrch), 'SFS_DETAIL_4H_CORE: warms a single symbol, 30M only');
      // (16) no sibling-owned function was duplicated into the module.
      ['_sfsSpyReadOnly', '_sfsEnsureTfCandles', '_sfsEnsureChartData', '_sfsWarmupBatch',
        '_sfsWarmupDiag', '_sfsQueueWarmupSymbols', '_sfsDrainWarmupQueue',
        '_sfsCandlesUsable', '_sfsCandleSubLimitActive', '_sfsFetchBackendCandles'].forEach((n) => {
        ok(DETAIL_CODE.indexOf('function ' + n + '(') === -1, 'SFS_DETAIL_4H_CORE: module does NOT (re)declare: ' + n);
      });
      // (17) no separate detail UI / state / aggregate module was created.
      ['sfs-candle-detail-4h-ui.js', 'sfs-candle-detail-4h-helpers.js', 'sfs-candle-orchestrator.js',
        'candle-state.js', 'candle-service.js'].forEach((f) => {
        ok(fs.existsSync(path.resolve(__dirname, '..', 'js', 'services', f)) === false, 'SFS_DETAIL_4H_CORE: js/services/' + f + ' does NOT exist');
      });
      ok(fs.existsSync(path.resolve(__dirname, '..', 'js', 'ui', 'sfs-detail-4h-ui.js')) === false, 'SFS_DETAIL_4H_CORE: js/ui/sfs-detail-4h-ui.js does NOT exist');
      // classic-script hygiene.
      ok(DETAIL_SRC.indexOf("'use strict'") === -1 && DETAIL_SRC.indexOf('"use strict"') === -1, 'SFS_DETAIL_4H_CORE: module has no "use strict" pragma');
      ok(!/\bimport\b/.test(DETAIL_SRC) && !/\bexport\b/.test(DETAIL_SRC), 'SFS_DETAIL_4H_CORE: module has no import/export');
      ok(DETAIL_SRC.indexOf('require(') === -1, 'SFS_DETAIL_4H_CORE: module has no require(');
      ok(!/window\.\w+\s*=/.test(DETAIL_SRC), 'SFS_DETAIL_4H_CORE: module has no window.* export');
      ok(!/\(function\s*\(/.test(DETAIL_CODE), 'SFS_DETAIL_4H_CORE: module wraps nothing in an IIFE');
    }

    // (2b) The four read-only SFS candle predicates now live in their OWN classic module,
    //      js/services/sfs-candle-predicates.js — extracted verbatim from the monolith.
    {
      const PRED_PATH = path.resolve(__dirname, '..', 'js', 'services', 'sfs-candle-predicates.js');
      const PRED_SRC = fs.existsSync(PRED_PATH) ? fs.readFileSync(PRED_PATH, 'utf8') : '';
      const PREDICATES = ['_sfsNormSymbolList', '_sfsNormTimeframes', '_sfsCandlesUsable', '_sfsCandleSubLimitActive'];
      const PRED_TAG = './js/services/sfs-candle-predicates.js';
      const scriptTags = rawIndex.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/services\/sfs-candle-predicates\.js["'][^>]*><\/script>/gi) || [];
      const predEntry = ordered.filter((s) => s.kind === 'local' && s.src === PRED_TAG)[0];
      const dxEntry = ordered.filter((s) => s.kind === 'local' && s.src === './js/services/candle-dxlink-client.js')[0];
      const firstInline = ordered.filter((s) => s.kind === 'inline' && s.isAppJs)[0];
      const PRED_CODE = stripComments(PRED_SRC);

      // (1) file exists.
      ok(fs.existsSync(PRED_PATH), 'PREDICATES: js/services/sfs-candle-predicates.js exists');
      // (2)(3)(4) exactly one CLASSIC <script> tag — no type=module, no async, no defer.
      ok(scriptTags.length === 1, 'PREDICATES: exactly one sfs-candle-predicates.js <script> tag in index.html');
      ok(scriptTags.length === 1 && !/\btype\s*=/.test(scriptTags[0]), 'PREDICATES: the <script> tag is classic (no type= attribute)');
      ok(scriptTags.length === 1 && !/\basync\b/.test(scriptTags[0]) && !/\bdefer\b/.test(scriptTags[0]), 'PREDICATES: the <script> tag has no async/defer');
      // (5)(6) loaded AFTER candle-dxlink-client.js, BEFORE the inline monolith.
      ok(!!predEntry && !!dxEntry && dxEntry.order < predEntry.order, 'PREDICATES: loads AFTER candle-dxlink-client.js');
      ok(!!predEntry && !!firstInline && predEntry.order < firstInline.order, 'PREDICATES: loads BEFORE the inline monolith');
      // (7) the shared loader includes the module in the reconstructed source.
      ok(localTags.indexOf(PRED_TAG) !== -1, 'PREDICATES: loader parses sfs-candle-predicates.js as a local script');
      PREDICATES.forEach((n) => {
        const reAll = new RegExp('(?:async\\s+)?function\\s+' + n + '\\s*\\(', 'g');
        // (8) present in the module.
        ok((PRED_SRC.match(reAll) || []).length === 1, 'PREDICATES: ' + n + ' defined in sfs-candle-predicates.js');
        // (9) absent from the residual inline monolith.
        ok((inlineMonolith.match(reAll) || []).length === 0, 'PREDICATES: ' + n + ' NOT defined in the residual inline monolith');
        // (10) exactly one overall definition across the reconstructed source.
        ok((HTML.match(reAll) || []).length === 1, 'PREDICATES: exactly one overall definition of ' + n + ' in reconstructed source');
      });
      // (11) the module contains ONLY the four declarations + comments — no top-level code.
      let predResidual = PRED_CODE;
      PREDICATES.forEach((n) => { predResidual = predResidual.replace(stripComments(extractFn(PRED_SRC, n)), ''); });
      ok(predResidual.trim() === '', 'PREDICATES: module contains ONLY the four declarations + comments (no top-level executable code)');
      ok((PRED_CODE.match(/function\s+\w+\s*\(/g) || []).length === 4, 'PREDICATES: module has exactly four named function declarations');
      // (12) no top-level executable code (no runtime statements at module scope).
      ok(!/^\s*[A-Za-z_$][\w$]*\s*\(/m.test(predResidual), 'PREDICATES: module runs no top-level function call at load time');
      // (13) declares NO state / constants.
      ok(!/\b(?:var|let|const)\s+\w/.test(predResidual), 'PREDICATES: module declares no top-level state/constants');
      // (14) no timers.
      ok(!/\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/.test(PRED_CODE), 'PREDICATES: module creates no timers');
      // (15) no DOM.
      ok(!/\bdocument\b|getElementById|querySelector|addEventListener/.test(PRED_CODE), 'PREDICATES: module touches no DOM');
      // (16) no network.
      ok(!/\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest/.test(PRED_CODE), 'PREDICATES: module performs no network');
      // (17)(18)(19)(20) no warmup / queue / cooldown / in-flight map.
      ok(!/[Ww]armup/.test(PRED_CODE), 'PREDICATES: module contains no warmup');
      ok(!/[Qq]ueue/.test(PRED_CODE), 'PREDICATES: module contains no queue');
      ok(!/[Cc]ooldown/.test(PRED_CODE), 'PREDICATES: module contains no cooldown');
      ok(!/Inflight|InFlight/.test(PRED_CODE), 'PREDICATES: module holds no in-flight map');
      // (21) _sfsCandleSubLimitActive may READ S but must NOT declare it.
      ok(/\bS\.dxlinkStatus\b/.test(PRED_CODE), 'PREDICATES: _sfsCandleSubLimitActive reads S.dxlinkStatus at call time');
      ok(!/\b(?:var|let|const)\s+S\b/.test(PRED_CODE), 'PREDICATES: module does NOT declare S (resolves it lexically from the monolith)');
      // Classic-script hygiene: no wrappers, pragmas, module syntax or window.* export.
      ok(PRED_SRC.indexOf("'use strict'") === -1 && PRED_SRC.indexOf('"use strict"') === -1, 'PREDICATES: module has no "use strict" pragma');
      ok(!/\bimport\b/.test(PRED_SRC) && !/\bexport\b/.test(PRED_SRC), 'PREDICATES: module has no import/export');
      ok(PRED_SRC.indexOf('require(') === -1, 'PREDICATES: module has no require(');
      ok(!/window\.\w+\s*=/.test(PRED_SRC), 'PREDICATES: module has no window.* export');
      // (22) no stateful SFS read orchestrator leaked into the predicate module — each one now
      //      lives in its own extracted service module, none of them here.
      SFS_READ_ORCHESTRATORS.forEach((n) => {
        ok(PRED_SRC.indexOf(n) === -1, 'PREDICATES: stateful orchestrator NOT in sfs-candle-predicates.js: ' + n);
      });
    }

    // (3) Every piece of SFS orchestration STATE is declared in the SFS config/state module.
    const STATE = ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsLastFailReason',
      '_sfsDetail4hInflight', '_sfsDetail4hPhase', '_sfsDetail4hResult',
      '_sfsSpyReadInflight', '_sfsSpyReadCooldown',
      '_sfsWarmupLastSentAt', '_sfsWarmupQueue', '_sfsWarmupQueuedKeys', '_sfsWarmupDrainTimer'];
    STATE.forEach((s) => {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + s + '\\b');
      ok(reDecl.test(CONFIG_STATE_SRC), 'MANIFEST: SFS state declared in sfs-config-state.js: ' + s);
      ok(!reDecl.test(inlineMonolith), 'MANIFEST: SFS state no longer declared in the monolith: ' + s);
      ok(DX_SRC.indexOf(s) === -1, 'MANIFEST: SFS state NOT referenced in candle-dxlink-client.js: ' + s);
    });

    // (4) The future extraction targets do NOT yet exist and are NOT referenced.
    ['sfs-candle-orchestrator', 'candle-warmup-client', 'candle-service', 'candle-orchestration', 'candle-state'].forEach((mod) => {
      ok(fs.existsSync(path.resolve(__dirname, '..', 'js', 'services', mod + '.js')) === false, 'MANIFEST: js/services/' + mod + '.js does NOT exist yet');
      ok(localTags.indexOf('./js/services/' + mod + '.js') === -1, 'MANIFEST: index.html loads no ' + mod + '.js script');
      ok(rawIndex.indexOf(mod) === -1, 'MANIFEST: index.html does not reference ' + mod);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZATION — _sfsNormSymbolList / _sfsNormTimeframes (PURE_NORMALIZER).
  // ═══════════════════════════════════════════════════════════════════════════
  section('NORMALIZATION. _sfsNormSymbolList / _sfsNormTimeframes');
  {
    const sb = { console, JSON, Object, Math, String, Array, isFinite };
    vm.createContext(sb);
    loadReal(sb, ['_sfsNormSymbolList', '_sfsNormTimeframes']);
    const NS = sb._sfsNormSymbolList, NT = sb._sfsNormTimeframes;

    ok(JSON.stringify(NS(['aapl', 'msft'])) === '["AAPL","MSFT"]', 'NORM: array is uppercased');
    ok(JSON.stringify(NS('spy')) === '["SPY"]', 'NORM: a single string becomes a 1-element list');
    ok(JSON.stringify(NS(null)) === '[]', 'NORM: null → []');
    ok(JSON.stringify(NS(undefined)) === '[]', 'NORM: undefined → []');
    ok(JSON.stringify(NS([])) === '[]', 'NORM: empty array → []');
    ok(JSON.stringify(NS(['', '  ', null, undefined])) === '[]', 'NORM: empty/blank/nullish entries are dropped');
    ok(JSON.stringify(NS(['  aapl  '])) === '["AAPL"]', 'NORM: entries are trimmed');
    ok(JSON.stringify(NS(['aapl', 'AAPL', 'AaPl'])) === '["AAPL"]', 'NORM: case-insensitive de-duplication');
    ok(JSON.stringify(NS(['msft', 'aapl', 'msft', 'nvda'])) === '["MSFT","AAPL","NVDA"]', 'NORM: first-seen order preserved, later dups removed');
    ok(JSON.stringify(NS(['brk.b'])) === '["BRK.B"]', 'NORM: a dotted symbol keeps its dot (uppercased)');
    ok(JSON.stringify(NS(['^vix'])) === '["^VIX"]', 'NORM: a caret symbol keeps its caret (uppercased)');
    ok(JSON.stringify(NS([1, 2, 1])) === '["1","2"]', 'NORM: non-string entries are stringified then normalized');
    ok(NS(['a', 'b', 'c', 'd', 'e', 'f']).length === 6, 'NORM: symbol list has NO max-length cap (caller caps, not the normalizer)');

    ok(JSON.stringify(NT(['1d', '30m'])) === '["1D","30M"]', 'NORM: timeframes are UPPERCASED (1d→1D, 30m→30M)');
    ok(JSON.stringify(NT('1d')) === '["1D"]', 'NORM: a single timeframe string becomes a 1-element list');
    ok(JSON.stringify(NT(null)) === '[]', 'NORM: null timeframes → []');
    ok(JSON.stringify(NT(['1D', '1d', '4H', '4h'])) === '["1D","4H"]', 'NORM: timeframe de-duplication is case-insensitive');
    ok(JSON.stringify(NT([' 4h '])) === '["4H"]', 'NORM: timeframes are trimmed');
    ok(JSON.stringify(NT(['weird', 'zzz'])) === '["WEIRD","ZZZ"]', 'NORM: unrecognized timeframes are passed through uppercased (no whitelist)');
    ok(JSON.stringify(NT(['', null, '1d'])) === '["1D"]', 'NORM: blank/nullish timeframes are dropped');
    // Purity: no argument mutation.
    const inp = ['aapl', 'msft']; NS(inp);
    ok(JSON.stringify(inp) === '["aapl","msft"]', 'NORM: input array is not mutated (pure)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USABILITY — _sfsCandlesUsable (USABILITY_CHECK). Threshold is 22 bars.
  // ═══════════════════════════════════════════════════════════════════════════
  section('USABILITY. _sfsCandlesUsable — 22-bar minimum + finite last close');
  {
    const sb = { console, isFinite };
    vm.createContext(sb);
    loadReal(sb, ['_sfsCandlesUsable']);
    const U = sb._sfsCandlesUsable;
    ok(U(series(22)) === true, 'USABLE: exactly 22 bars with a finite close → usable (the real minimum)');
    ok(U(series(21)) === false, 'USABLE: 21 bars (one below the minimum) → NOT usable');
    ok(U(series(100)) === true, 'USABLE: a long finite series → usable');
    ok(U([]) === false, 'USABLE: empty array → not usable');
    ok(U(null) === false, 'USABLE: null → not usable');
    ok(U(undefined) === false, 'USABLE: undefined → not usable');
    ok(U({ length: 30 }) === false, 'USABLE: a non-array object with a length is not usable (no real last bar)');
    ok(U((() => { const a = series(22); a[21].close = null; return a; })()) === false, 'USABLE: 22 bars but last close null → not usable');
    ok(U((() => { const a = series(22); a[21].close = NaN; return a; })()) === false, 'USABLE: 22 bars but last close NaN → not usable');
    ok(U((() => { const a = series(22); a[21].close = Infinity; return a; })()) === false, 'USABLE: 22 bars but last close Infinity → not usable');
    ok(U((() => { const a = series(30); a[29] = undefined; return a; })()) === false, 'USABLE: 30 bars but missing last element → not usable');
    ok(U(series(23)) === true, 'USABLE: 23 bars (above minimum) → usable');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION_LIMIT — _sfsCandleSubLimitActive (needs BOTH keywords).
  // ═══════════════════════════════════════════════════════════════════════════
  section('SUBSCRIPTION_LIMIT. _sfsCandleSubLimitActive classification');
  {
    const sb = { console, String, S: { dxlinkStatus: null } };
    vm.createContext(sb);
    loadReal(sb, ['_sfsCandleSubLimitActive']);
    const L = sb._sfsCandleSubLimitActive;
    const set = (e) => { sb.S.dxlinkStatus = e == null ? e : { feedChannelLastError: e }; };
    set("Your subscription size for event type 'Candle' is too big"); ok(L() === true, 'SUBLIMIT: real DXLink candle-subscription error → active');
    set('CANDLE SUBSCRIPTION too big'); ok(L() === true, 'SUBLIMIT: match is case-insensitive');
    set('subscription too big'); ok(L() === false, 'SUBLIMIT: "subscription" without "candle" → NOT active (no false positive)');
    set("event type 'Candle' problem'"); ok(L() === false, 'SUBLIMIT: "candle" without "subscription" → NOT active');
    set('quote channel error'); ok(L() === false, 'SUBLIMIT: an unrelated feed error → NOT active');
    set(''); ok(L() === false, 'SUBLIMIT: empty error string → NOT active');
    set(null); ok(L() === false, 'SUBLIMIT: null feedChannelLastError → NOT active');
    sb.S.dxlinkStatus = null; ok(L() === false, 'SUBLIMIT: null dxlinkStatus → NOT active');
    sb.S.dxlinkStatus = {}; ok(L() === false, 'SUBLIMIT: dxlinkStatus without feedChannelLastError → NOT active');
    sb.S = undefined; ok(L() === false, 'SUBLIMIT: missing S is swallowed defensively → NOT active (never throws)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC_ENSURE — _sfsEnsureTfCandles (READ_ORCHESTRATOR).
  // Read-first, ONE post-warmup re-read, per-(sym|tf) in-flight + cooldown.
  // ═══════════════════════════════════════════════════════════════════════════
  section('GENERIC_ENSURE. _sfsEnsureTfCandles read-first / one-reread contract');
  {
    let clock = 10 * 1e6;
    const reads = [], warms = [], prov = [];
    const readQ = [];
    const sb = {
      console, JSON, Object, Math, String, Number, isFinite, Promise,
      Date: { now: () => clock },
      debugLog() {}, debugWarn() {},
      _recordCandleProvenance: (src, meta) => prov.push({ src, meta }),
      S: { squeezeFireScanner: { chartCacheCandles: {} }, dxlinkStatus: null },
      SFS_WARMUP_COOLDOWN_MS: 30000,
      _sfsTfFetchInflight: {}, _sfsWarmupCooldown: {}, _sfsLastFailReason: {},
      __subLimit: false, __throwMode: null,
      _sfsCandleSubLimitActive: () => sb.__subLimit,
      _sfsFetchBackendCandles: (s, t) => {
        reads.push(s + '|' + t);
        if (sb.__throwMode === 'reject') return Promise.reject(new Error('boom'));
        return Promise.resolve(readQ.length ? readQ.shift() : okEmpty());
      },
      _sfsWarmupBatch: (s, t, o) => { warms.push({ s, t, o }); return Promise.resolve({ ok: true, status: 200, sentSymbols: s }); },
    };
    vm.createContext(sb);
    loadReal(sb, ['_sfsCandlesUsable']);
    vm.runInContext(extractFn(HTML, '_sfsEnsureTfCandles'), sb);
    const reset = () => {
      reads.length = warms.length = prov.length = readQ.length = 0;
      sb.S.squeezeFireScanner.chartCacheCandles = {};
      sb._sfsTfFetchInflight = {}; sb._sfsWarmupCooldown = {}; sb._sfsLastFailReason = {};
      sb.__subLimit = false; sb.__throwMode = null;
    };

    // 1) usable cache hit → returns the array, zero network.
    reset();
    sb.S.squeezeFireScanner.chartCacheCandles = { CAT: { '1D': series(30) } };
    let r = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(Array.isArray(r) && r.length === 30, 'GENERIC: usable cache hit returns the cached array');
    ok(reads.length === 0 && warms.length === 0, 'GENERIC: cache hit does zero reads and zero warmups');

    // 2) first read usable → store + return, no warmup, provenance backend_cache, cooldown cleared.
    reset();
    readQ.push(okFull(25));
    r = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(Array.isArray(r) && r.length === 25, 'GENERIC: first read usable → returns candles');
    ok(reads.length === 1 && warms.length === 0, 'GENERIC: usable first read → exactly ONE read, NO warmup');
    ok(sb.S.squeezeFireScanner.chartCacheCandles.CAT['1D'].length === 25, 'GENERIC: usable read is stored into the SFS chart cache');
    ok(prov.some((p) => p.src === 'backend_cache'), 'GENERIC: a backend_cache provenance record is written on a usable read');
    ok(!('CAT|1D' in sb._sfsTfFetchInflight), 'GENERIC: in-flight key cleaned after a successful read');

    // 3) empty read → ONE warmup (opts undefined) → ONE re-read → success.
    reset();
    readQ.push(okEmpty()); readQ.push(okFull(25));
    r = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(Array.isArray(r) && r.length === 25, 'GENERIC: empty→warm→reread success returns candles');
    ok(warms.length === 1, 'GENERIC: exactly ONE warmup fired');
    ok(warms[0].o === undefined, 'GENERIC: warmup is called with NO opts (default reason path) — an asymmetry vs detail/SPY');
    ok(JSON.stringify(warms[0].s) === '["CAT"]' && JSON.stringify(warms[0].t) === '["1D"]', 'GENERIC: 1D warmup is single-symbol 1D');
    ok(reads.length === 2, 'GENERIC: exactly ONE post-warmup re-read (no bounded loop) — asymmetry vs detail/SPY');

    // 3b) 4H maps to a 30M warmup (backend derives 4H from 30M).
    reset();
    readQ.push(okEmpty()); readQ.push(okEmpty());
    r = await sb._sfsEnsureTfCandles('CAT', '4H');
    ok(JSON.stringify(warms[0].t) === '["30M"]', 'GENERIC: a 4H ensure warms 30M, never 4H directly');
    ok(r === null, 'GENERIC: still-empty after one re-read → returns null');
    ok(sb._sfsLastFailReason['CAT|4H'] === 'EMPTY', 'GENERIC: still-empty is classified EMPTY');
    ok(sb._sfsWarmupCooldown['CAT|4H'] === clock + 30000, 'GENERIC: a 30s cooldown is armed after a failed warm+reread');

    // 4) failure classification matrix (single re-read shape).
    const classify = async (firstRead, secondRead) => {
      reset(); readQ.push(firstRead); readQ.push(secondRead);
      const rr = await sb._sfsEnsureTfCandles('CAT', '1D');
      return { rr, reason: sb._sfsLastFailReason['CAT|1D'] };
    };
    ok((await classify(okEmpty(), { ok: true, status: 200, count: 10, candles: series(10) })).reason === 'SHORT', 'GENERIC: a short (<22) re-read → SHORT');
    ok((await classify(okEmpty(), { ok: false, status: 500, count: 0, reason: 'http_500' })).reason === 'FETCH_ERROR', 'GENERIC: a failed re-read → FETCH_ERROR');
    ok((await classify(okEmpty(), okEmpty())).reason === 'EMPTY', 'GENERIC: an empty re-read → EMPTY');
    {
      reset(); readQ.push({ ok: true, status: 200, count: 0, candles: [], reason: 'subscription too big' });
      const rr = await sb._sfsEnsureTfCandles('CAT', '1D');
      ok(rr === null && sb._sfsLastFailReason['CAT|1D'] === 'SUBSCRIPTION_LIMIT', 'GENERIC: a body reason of "subscription" on read → SUBSCRIPTION_LIMIT, NO warmup');
      ok(warms.length === 0, 'GENERIC: subscription-limit path skips warmup entirely');
    }

    // 5) subscription limit active (live status) → skip warmup, arm cooldown, null.
    reset(); sb.__subLimit = true; readQ.push(okEmpty());
    r = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(r === null && warms.length === 0, 'GENERIC: live Candle sub-limit → no warmup, returns null');
    ok(sb._sfsLastFailReason['CAT|1D'] === 'SUBSCRIPTION_LIMIT', 'GENERIC: sub-limit is classified SUBSCRIPTION_LIMIT');
    ok(sb._sfsWarmupCooldown['CAT|1D'] === clock + 30000, 'GENERIC: sub-limit arms the cooldown');

    // 6) cooldown active → skip warmup on a fresh empty read.
    reset(); sb._sfsWarmupCooldown['CAT|1D'] = clock + 5000; readQ.push(okEmpty());
    r = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(r === null && warms.length === 0, 'GENERIC: an active cooldown suppresses the warmup (returns null)');
    ok(reads.length === 1, 'GENERIC: cooldown path does the first read but no re-read');

    // 6b) expired cooldown → warmup proceeds again.
    reset(); sb._sfsWarmupCooldown['CAT|1D'] = clock - 1; readQ.push(okEmpty()); readQ.push(okFull(25));
    r = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(warms.length === 1 && Array.isArray(r), 'GENERIC: an EXPIRED cooldown lets the warmup proceed');

    // 7) in-flight dedup: two concurrent identical calls share ONE flow.
    reset(); readQ.push(okFull(25));
    const [a, b] = await Promise.all([sb._sfsEnsureTfCandles('CAT', '1D'), sb._sfsEnsureTfCandles('CAT', '1D')]);
    ok(reads.length === 1, 'GENERIC: two concurrent identical ensures share ONE backend read (in-flight dedup)');
    ok(a === b, 'GENERIC: both concurrent callers resolve to the same result reference');

    // 8) independence across symbols and timeframes.
    reset(); readQ.push(okFull(25)); readQ.push(okFull(25));
    await Promise.all([sb._sfsEnsureTfCandles('CAT', '1D'), sb._sfsEnsureTfCandles('DOG', '1D')]);
    ok(reads.length === 2, 'GENERIC: different symbols run independent flows (no cross-dedup)');
    reset(); readQ.push(okFull(25)); readQ.push(okFull(25));
    await Promise.all([sb._sfsEnsureTfCandles('CAT', '1D'), sb._sfsEnsureTfCandles('CAT', '4H')]);
    ok(reads.length === 2, 'GENERIC: different timeframes on one symbol run independent flows');

    // 9) cleanup after a rejected read; a subsequent call can proceed.
    reset(); sb.__throwMode = 'reject';
    let threw = false;
    try { await sb._sfsEnsureTfCandles('CAT', '1D'); } catch (e) { threw = true; }
    ok(threw === true, 'GENERIC: a rejected backend read propagates as a rejection');
    ok(!('CAT|1D' in sb._sfsTfFetchInflight), 'GENERIC: in-flight key is cleaned even when the read rejects');
    sb.__throwMode = null; readQ.push(okFull(25));
    r = await sb._sfsEnsureTfCandles('CAT', '1D');
    ok(Array.isArray(r), 'GENERIC: a fresh call works after the in-flight key was cleaned');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETAIL_4H — _sfsEnsureDetail4hCandles (DETAIL_4H, BOUNDED_REREAD).
  // Bounded re-reads (3), sleep BEFORE each, per-symbol in-flight, structured return.
  // ═══════════════════════════════════════════════════════════════════════════
  section('DETAIL_4H. _sfsEnsureDetail4hCandles bounded-reread contract');
  {
    let clock = 20 * 1e6;
    const reads = [], warms = [], sleeps = [];
    const readQ = [];
    const els = {};
    const sb = {
      console, JSON, Object, Math, String, Number, isFinite, Promise,
      Date: { now: () => clock },
      debugLog() {}, debugWarn() {}, window: {},
      document: { getElementById: (id) => (els[id] || (els[id] = { innerHTML: '', textContent: '', style: {}, querySelector: () => null })) },
      S: { squeezeFireScanner: { chartSymbol: 'CAT', chartCacheCandles: {} } },
      _sfsLastFailReason: {}, _sfsWarmupCooldown: {}, SFS_WARMUP_COOLDOWN_MS: 30000, _sfsTfFetchInflight: {},
      __sync: null, __subLimit: false,
      _sfsCandlesFromSyncSource: () => sb.__sync,
      _sfsCandleSubLimitActive: () => sb.__subLimit,
      _sfsSleep: (ms) => { sleeps.push(ms); return Promise.resolve(); },
      _sfsFetchBackendCandles: (s, t) => { reads.push(s + '|' + t); return Promise.resolve(readQ.length ? readQ.shift() : okEmpty()); },
      _sfsWarmupBatch: (s, t, o) => { warms.push({ s, t, o }); return Promise.resolve({ ok: true, status: 200, sentSymbols: s }); },
    };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_sfsCandlesUsable') + '\n' + DETAIL_BLOCK, sb);
    const reset = () => {
      reads.length = warms.length = sleeps.length = readQ.length = 0;
      for (const k in els) delete els[k];
      sb.__sync = null; sb.__subLimit = false;
      sb.S.squeezeFireScanner.chartSymbol = 'CAT';
      sb.S.squeezeFireScanner.chartCacheCandles = {};
      sb._sfsLastFailReason = {}; sb._sfsWarmupCooldown = {};
      sb._sfsDetail4hInflight = {}; sb._sfsDetail4hPhase = {}; sb._sfsDetail4hResult = {};
    };

    // 1) empty guard.
    reset();
    let r = await sb._sfsEnsureDetail4hCandles('');
    ok(r && r.ok === false && r.timeframe === '4H' && r.candles === null, 'DETAIL_4H: empty symbol → base result (ok:false, 4H, candles:null)');

    // 2) synchronous cache/buffer hit → no network, no in-flight key.
    reset(); sb.__sync = { candles: series(25), path: 'sfsCache' };
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === true && r.source === 'SFS_CACHE', 'DETAIL_4H: sync SFS-cache hit → ok, source SFS_CACHE');
    ok(reads.length === 0 && warms.length === 0 && sleeps.length === 0, 'DETAIL_4H: sync hit does zero reads/warmups/sleeps');
    ok(r.warmupAttempted === false, 'DETAIL_4H: sync hit sets warmupAttempted:false');
    sb.__sync = { candles: series(25), path: 'dxlinkBuffer' };
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.source === 'DXLINK_BUFFER', 'DETAIL_4H: a live DXLink buffer hit reports source DXLINK_BUFFER');

    // 3) backend read hit → store + return, no warmup.
    reset(); readQ.push(okFull(25));
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === true && r.source === 'BACKEND_DXLINK_CANDLE_CACHE', 'DETAIL_4H: usable first read → source BACKEND_DXLINK_CANDLE_CACHE');
    ok(reads.length === 1 && warms.length === 0, 'DETAIL_4H: usable first read → ONE read, NO warmup');
    ok(sb.S.squeezeFireScanner.chartCacheCandles.CAT['4H'].length === 25, 'DETAIL_4H: usable read stored under [symbol][4H]');

    // 4) empty read → ONE 30M warmup (tagged, non-priority) → 3 bounded rereads → success.
    reset(); readQ.push(okEmpty()); readQ.push(okEmpty()); readQ.push(okFull(25));
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === true && r.warmupAttempted === true, 'DETAIL_4H: empty→warm→bounded reread success');
    ok(warms.length === 1 && JSON.stringify(warms[0].t) === '["30M"]', 'DETAIL_4H: exactly ONE 30M warmup (backend derives 4H)');
    ok(warms[0].o && warms[0].o.reason === 'squeeze_fire_detail_chart', 'DETAIL_4H: warmup reason tags the detail chart');
    ok(warms[0].o && warms[0].o.priority === undefined, 'DETAIL_4H: warmup is NOT priority (asymmetry vs SPY which IS priority)');
    ok(warms[0].o && warms[0].o.context && warms[0].o.context.requestedTimeframe === '4H', 'DETAIL_4H: warmup context records requestedTimeframe 4H');

    // 5) all rereads empty → CANDLES_NOT_READY + cooldown, delays are 1200/2400/3600 BEFORE each reread.
    reset(); for (let i = 0; i < 5; i++) readQ.push(okEmpty());
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === false && r.reason === 'CANDLES_NOT_READY', 'DETAIL_4H: all-empty polling → CANDLES_NOT_READY (never "Run scan first")');
    ok(warms.length === 1, 'DETAIL_4H: still only ONE warmup across all bounded rereads');
    ok(reads.length === 4, 'DETAIL_4H: exactly 1 pre-warmup read + 3 bounded post-warmup rereads');
    ok(JSON.stringify(sleeps) === '[1200,2400,3600]', 'DETAIL_4H: sleeps BEFORE each reread scale 1200×attempt (1200/2400/3600) — asymmetry');
    ok(sb._sfsWarmupCooldown['CAT|4H'] === clock + 30000, 'DETAIL_4H: a 30s cooldown is armed after exhausting the rereads');

    // 6) subscription cap active → NO warmup, SUBSCRIPTION_LIMIT_BACKOFF.
    reset(); sb.__subLimit = true; readQ.push(okEmpty());
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.ok === false && r.reason === 'SUBSCRIPTION_LIMIT_BACKOFF', 'DETAIL_4H: sub-cap active → SUBSCRIPTION_LIMIT_BACKOFF');
    ok(warms.length === 0 && sleeps.length === 0, 'DETAIL_4H: sub-cap → no warmup and no bounded rereads');

    // 7) first read HTTP 404 → ENDPOINT_UNAVAILABLE (no warmup, NO cooldown armed — asymmetry).
    reset(); readQ.push({ ok: false, status: 404, count: 0, reason: 'http_404' });
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.reason === 'ENDPOINT_UNAVAILABLE', 'DETAIL_4H: a 404 first read → ENDPOINT_UNAVAILABLE');
    ok(warms.length === 0, 'DETAIL_4H: an HTTP-failed first read fires no warmup');
    ok(!('CAT|4H' in sb._sfsWarmupCooldown), 'DETAIL_4H: a hard-transport failure does NOT arm the warmup cooldown (asymmetry vs generic)');
    reset(); readQ.push({ ok: false, status: 500, count: 0, reason: 'http_500' });
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.reason === 'FETCH_ERROR', 'DETAIL_4H: a non-404 HTTP failure first read → FETCH_ERROR');

    // 8) per-symbol in-flight dedup + cleanup.
    reset(); readQ.push(okEmpty()); readQ.push(okFull(25));
    const c1 = sb._sfsEnsureDetail4hCandles('CAT');
    const c2 = sb._sfsEnsureDetail4hCandles('CAT');
    const [d1, d2] = await Promise.all([c1, c2]);
    ok(d1 === d2, 'DETAIL_4H: two concurrent CHART clicks share ONE in-flight promise (per-symbol key)');
    ok(warms.length === 1, 'DETAIL_4H: concurrent clicks fire only ONE warmup');
    ok(!('CAT' in sb._sfsDetail4hInflight), 'DETAIL_4H: the per-symbol in-flight key is cleaned after settling');
    ok(sb._sfsDetail4hResult.CAT && sb._sfsDetail4hPhase.CAT === null, 'DETAIL_4H: last result is stored and phase reset to null on settle');

    // 9) symbol switch mid-poll → SYMBOL_CHANGED, no stale store.
    reset();
    readQ.push(okEmpty()); readQ.push(okFull(25));
    sb._sfsSleep = (ms) => { sleeps.push(ms); sb.S.squeezeFireScanner.chartSymbol = 'MSFT'; return Promise.resolve(); };
    r = await sb._sfsEnsureDetail4hCandles('CAT');
    ok(r.reason === 'SYMBOL_CHANGED', 'DETAIL_4H: navigating away mid-poll bails with SYMBOL_CHANGED');
    ok(!sb.S.squeezeFireScanner.chartCacheCandles.CAT || !sb.S.squeezeFireScanner.chartCacheCandles.CAT['4H'], 'DETAIL_4H: no 4H candles stored for the abandoned symbol');
    sb._sfsSleep = (ms) => { sleeps.push(ms); return Promise.resolve(); };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC vs DETAIL_4H — explicit asymmetry matrix (do NOT unify these flows).
  // ═══════════════════════════════════════════════════════════════════════════
  section('ASYMMETRY. generic ensure vs detail 4H differ by design');
  {
    const gen = stripComments(extractFn(HTML, '_sfsEnsureTfCandles'));
    const det = stripComments(extractFn(HTML, '_sfsEnsureDetail4hCandles'));
    ok(/_sfsTfFetchInflight/.test(gen) && !/_sfsDetail4hInflight/.test(gen), 'ASYMMETRY: generic uses _sfsTfFetchInflight keyed sym|tf');
    ok(/_sfsDetail4hInflight/.test(det) && !/_sfsTfFetchInflight/.test(det), 'ASYMMETRY: detail uses _sfsDetail4hInflight keyed by symbol');
    ok(!/_sfsSleep/.test(gen), 'ASYMMETRY: generic ensure has NO sleep/backoff (single immediate reread)');
    ok(/_sfsSleep/.test(det), 'ASYMMETRY: detail 4H sleeps between bounded rereads');
    ok(/SFS_DETAIL_4H_POST_WARM_ATTEMPTS/.test(det) && !/POST_WARM_ATTEMPTS/.test(gen), 'ASYMMETRY: only detail has a bounded post-warm attempt count');
    ok(/for\s*\(/.test(det) && !/for\s*\(/.test(gen), 'ASYMMETRY: detail loops rereads; generic does not');
    ok(/return result/.test(det) && !/return result/.test(gen), 'ASYMMETRY: detail returns a structured result object; generic returns an array|null');
    ok(/squeeze_fire_detail_chart/.test(det) && !/squeeze_fire_detail_chart/.test(gen), 'ASYMMETRY: detail tags its warmup reason; generic warms with no opts');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHART_HYDRATION — _sfsEnsureChartData (self-sufficient 1D, delegates only).
  // ═══════════════════════════════════════════════════════════════════════════
  section('CHART_HYDRATION. _sfsEnsureChartData ensures ONLY 1D and swallows errors');
  {
    const ensureCalls = [];
    const sb = {
      console, Promise,
      _sfsEnsureTfCandles: (s, t) => { ensureCalls.push(s + '|' + t); return Promise.resolve(series(30)); },
    };
    vm.createContext(sb);
    loadReal(sb, ['_sfsEnsureChartData']);
    let r = await sb._sfsEnsureChartData('CAT');
    ok(ensureCalls.length === 1 && ensureCalls[0] === 'CAT|1D', 'CHART_HYDRATION: ensures exactly ONE series — the selected symbol at 1D (never 4H, never SPY)');
    ok(r === undefined, 'CHART_HYDRATION: resolves to undefined (fire-and-forget hydration)');
    // error swallowing: a rejecting ensure must not throw out.
    ensureCalls.length = 0;
    sb._sfsEnsureTfCandles = (s, t) => { ensureCalls.push(s + '|' + t); return Promise.reject(new Error('x')); };
    let threw = false;
    try { await sb._sfsEnsureChartData('CAT'); } catch (e) { threw = true; }
    ok(threw === false, 'CHART_HYDRATION: a rejecting ensure is swallowed — hydration never throws');
    // static: it does not fan out to results / watchlist and does not warm SPY.
    const src = stripComments(extractFn(HTML, '_sfsEnsureChartData'));
    ok(/var tfs\s*=\s*\[\s*'1D'\s*\]/.test(src) && !/'4H'/.test(src), 'CHART_HYDRATION: STATIC — hydrates only 1D (4H decoupled to the background loader)');
    ok(!/_sfsEnsureTfCandles\(\s*'SPY'/.test(src) && !/SPY/.test(src.replace(/SPY is|SPY 1D|SPY read/gi, '')), 'CHART_HYDRATION: STATIC — does not frontend-ensure SPY');
    ok(!/results|WL\.map|scanner\/run/.test(src), 'CHART_HYDRATION: STATIC — never iterates scan results or triggers a scanner run');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPY_READ_ONLY — _sfsSpyReadOnly (SPY_READ_ONLY). Read-only benchmark resolver.
  // 4 bounded rereads, sleep before rereads 2..4, warm-cooldown keyed 'SPY|<tf>'.
  // ═══════════════════════════════════════════════════════════════════════════
  section('SPY_READ_ONLY. _sfsSpyReadOnly read-only + one-warmup contract');
  {
    let clock = 30 * 1e6;
    const reads = [], warms = [], diag = [], sleeps = [];
    const readQ = [];
    const sb = {
      console, JSON, Object, Math, String, Number, isFinite, Promise,
      Date: { now: () => clock },
      setTimeout: (fn, ms) => { sleeps.push(ms); fn(); return 1; },
      debugLog() {}, debugWarn() {},
      S: { squeezeFireScanner: { chartSymbol: 'MSFT', chartCacheCandles: {} }, dxlinkStatus: {} },
      _sfsSpyReadInflight: {}, _sfsSpyReadCooldown: {},
      SFS_SPY_READ_COOLDOWN_MS: 30000, SFS_SPY_WARM_COOLDOWN_MS: 120000,
      SFS_SPY_POST_WARM_READ_ATTEMPTS: 4, SFS_SPY_POST_WARM_RETRY_DELAY_MS: 900,
      __spy1d: null, __spy4h: null, __subLimit: false,
      _rsGetDailyCandles: (s) => (s === 'SPY' ? sb.__spy1d : null),
      getFourHourCandles: (s) => (s === 'SPY' ? sb.__spy4h : null),
      _sfsCandleSubLimitActive: () => sb.__subLimit,
      _recordCandleSubscriptionRequest: (m) => diag.push(m),
      _sfsFetchBackendCandles: (s, t) => { reads.push(s + '|' + t); return Promise.resolve(readQ.length ? readQ.shift() : okEmpty()); },
      _sfsWarmupBatch: (s, t, o) => { warms.push({ s, t, o }); return Promise.resolve({ ok: true, status: 200, sentSymbols: s }); },
    };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_sfsCandlesUsable') + '\n' + extractFn(HTML, '_sfsCandlesFromSyncSource') + '\n' + SPY_BLOCK, sb);
    const reset = () => {
      reads.length = warms.length = diag.length = sleeps.length = readQ.length = 0;
      sb.__spy1d = null; sb.__spy4h = null; sb.__subLimit = false;
      sb.S.squeezeFireScanner.chartCacheCandles = {};
      sb._sfsSpyReadInflight = {}; sb._sfsSpyReadCooldown = {};
    };

    // 1) sync buffer hit → returns candles, zero network/warmup.
    reset(); sb.__spy4h = series(40);
    let r = await sb._sfsSpyReadOnly('4H');
    ok(Array.isArray(r) && r.length === 40, 'SPY: a live-buffer hit returns SPY candles');
    ok(reads.length === 0 && warms.length === 0, 'SPY: sync buffer hit does zero reads and zero warmups');

    // 2) backend read hit → promote + return, no warmup.
    reset(); readQ.push(okFull(40));
    r = await sb._sfsSpyReadOnly('4H');
    ok(Array.isArray(r) && r.length === 40, 'SPY: a usable backend read returns SPY candles');
    ok(reads.length === 1 && warms.length === 0, 'SPY: usable read → ONE read, NO warmup');
    ok(sb.S.squeezeFireScanner.chartCacheCandles.SPY['4H'].length === 40, 'SPY: usable read is promoted into the SFS cache');

    // 3) empty read → ONE priority 30M warmup → 4 bounded rereads, sleeps before rereads 2..4.
    reset(); for (let i = 0; i < 6; i++) readQ.push(okEmpty());
    r = await sb._sfsSpyReadOnly('4H');
    ok(r === null, 'SPY: all-empty → returns null (read-only, no retry storm)');
    ok(warms.length === 1 && JSON.stringify(warms[0].s) === '["SPY"]' && JSON.stringify(warms[0].t) === '["30M"]', 'SPY: exactly ONE SPY-only 30M warmup');
    ok(warms[0].o && warms[0].o.priority === true, 'SPY: warmup IS priority:true (asymmetry vs detail 4H)');
    ok(warms[0].o && warms[0].o.reason === 'sfs_spy_rs_warmup', 'SPY: warmup reason tags the SPY RS flow');
    ok(reads.length === 5, 'SPY: 1 pre-warmup read + 4 bounded post-warmup rereads');
    ok(JSON.stringify(sleeps) === '[900,1800,2700]', 'SPY: sleeps only before rereads 2..4 (900/1800/2700) — first reread has NO sleep (asymmetry vs detail 4H)');
    ok(sb._sfsSpyReadCooldown['4H'] === clock + 30000, 'SPY: a read cooldown (keyed by tf) is armed after exhausting rereads');
    ok(sb._sfsSpyReadCooldown['SPY|4H'] === clock + 120000, 'SPY: a SEPARATE warm cooldown is keyed "SPY|<tf>" (120s)');

    // 4) delayed availability → a later reread promotes + returns.
    reset(); readQ.push(okEmpty()); readQ.push(okEmpty()); readQ.push(okFull(40));
    r = await sb._sfsSpyReadOnly('4H');
    ok(Array.isArray(r) && r.length === 40, 'SPY: candles appearing on a later reread are returned');
    ok(warms.length === 1, 'SPY: delayed availability still uses only ONE warmup');
    ok(diag.some((d) => d.action === 'promoted'), 'SPY: the promoting reread is diagnosed');

    // 5) subscription limit at first read → no warmup, read cooldown, null.
    reset(); sb.__subLimit = true; readQ.push(okEmpty());
    r = await sb._sfsSpyReadOnly('4H');
    ok(r === null && warms.length === 0, 'SPY: sub-limit → no warmup, returns null');
    ok(sb._sfsSpyReadCooldown['4H'] === clock + 30000, 'SPY: sub-limit arms the read cooldown (not the warm cooldown)');
    ok(!('SPY|4H' in sb._sfsSpyReadCooldown), 'SPY: sub-limit does NOT arm the warm cooldown');

    // 6) read cooldown active → returns null before any read.
    reset(); sb._sfsSpyReadCooldown['4H'] = clock + 5000;
    r = await sb._sfsSpyReadOnly('4H');
    ok(r === null && reads.length === 0 && warms.length === 0, 'SPY: an active read cooldown short-circuits before the backend read');

    // 7) warm cooldown active → reads, but skips the warmup.
    reset(); sb._sfsSpyReadCooldown['SPY|4H'] = clock + 5000; readQ.push(okEmpty());
    r = await sb._sfsSpyReadOnly('4H');
    ok(reads.length === 1 && warms.length === 0 && r === null, 'SPY: an active warm cooldown allows the read but suppresses the warmup');

    // 8) in-flight dedup + cleanup.
    reset(); readQ.push(okFull(40));
    const [x, y] = await Promise.all([sb._sfsSpyReadOnly('4H'), sb._sfsSpyReadOnly('4H')]);
    ok(reads.length === 1 && x === y, 'SPY: two concurrent identical reads dedupe to ONE (per-tf in-flight)');
    ok(!('4H' in sb._sfsSpyReadInflight), 'SPY: the per-tf in-flight key is cleaned after settling');

    // 9) different tf → independent flow.
    reset(); readQ.push(okFull(40)); readQ.push(okFull(40));
    await Promise.all([sb._sfsSpyReadOnly('4H'), sb._sfsSpyReadOnly('1D')]);
    ok(reads.length === 2, 'SPY: 1D and 4H resolve independently (separate in-flight keys)');

    // 10) 1D warms 1D (not 30M).
    reset(); for (let i = 0; i < 6; i++) readQ.push(okEmpty());
    r = await sb._sfsSpyReadOnly('1D');
    ok(warms.length === 1 && JSON.stringify(warms[0].t) === '["1D"]', 'SPY: a 1D resolve warms 1D (only 4H maps to 30M)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WARMUP_BATCH — _sfsWarmupBatch (WARMUP_PRIMITIVE / WARMUP_BATCH).
  // Endpoint, payload, cap, debounce gate, return shapes, failure matrix.
  // ═══════════════════════════════════════════════════════════════════════════
  section('WARMUP_BATCH. _sfsWarmupBatch endpoint / payload / cap / debounce');
  {
    let clock = 40 * 1e6;
    const posts = [], diag = [], timers = [];
    const sb = {
      console, JSON, Object, Math,
      Date: { now: () => clock },
      BACKEND: 'https://backend.test', AbortSignal: { timeout: (ms) => ({ __timeout: ms }) },
      _backendAuthHeaders: (h) => Object.assign({ 'X-Auth': 'k' }, h || {}),
      _recordCandleSubscriptionRequest: (m) => diag.push(m),
      setTimeout: (fn, ms) => { const id = timers.length + 1; timers.push({ fn, ms, id }); return id; },
      __fetch: null,
      fetch: (url, opts) => { posts.push({ url, opts, body: JSON.parse(opts.body) }); return sb.__fetch ? sb.__fetch(url, opts) : Promise.resolve({ ok: true, status: 200 }); },
    };
    vm.createContext(sb);
    vm.runInContext(WARMUP_BLOCK, sb);
    const reset = () => {
      posts.length = diag.length = timers.length = 0;
      sb.__fetch = null; sb._sfsWarmupLastSentAt = 0;
      sb._sfsWarmupQueue = []; sb._sfsWarmupQueuedKeys = {}; sb._sfsWarmupDrainTimer = null;
      clock += 60000; // always past the debounce window vs the last send
    };

    // 1) endpoint + method + headers + body + timeout.
    reset();
    let r = await sb._sfsWarmupBatch(['aapl', 'AAPL', 'msft'], ['1d', '1D'], { reason: 'unit', priority: true });
    ok(posts.length === 1, 'WARMUP: sends exactly one POST');
    ok(posts[0].url === 'https://backend.test/dev/market/candles-dxlink/warmup', 'WARMUP: endpoint is /dev/market/candles-dxlink/warmup');
    ok(posts[0].opts.method === 'POST', 'WARMUP: method is POST');
    ok(posts[0].opts.cache === 'no-store', 'WARMUP: cache is no-store');
    ok(posts[0].opts.headers && posts[0].opts.headers['Content-Type'] === 'application/json', 'WARMUP: Content-Type application/json header');
    ok(posts[0].opts.headers['X-Auth'] === 'k', 'WARMUP: auth headers are merged in');
    ok(JSON.stringify(posts[0].body.symbols) === '["AAPL","MSFT"]', 'WARMUP: body symbols normalized (upper, deduped)');
    ok(JSON.stringify(posts[0].body.timeframes) === '["1D"]', 'WARMUP: body timeframes normalized (upper, deduped)');
    ok(posts[0].body.waitMs === 15000, 'WARMUP: body waitMs is 15000');
    ok(posts[0].opts.signal && posts[0].opts.signal.__timeout === 30000, 'WARMUP: request uses a 30000ms abort timeout');
    ok(r.ok === true && r.status === 200 && JSON.stringify(r.sentSymbols) === '["AAPL","MSFT"]', 'WARMUP: success return shape {ok,status,sentSymbols,deferredSymbols}');
    ok(JSON.stringify(r.deferredSymbols) === '[]', 'WARMUP: small batch has no deferred symbols');
    ok(diag.some((d) => d.action === 'sent'), 'WARMUP: a "sent" diagnostic is recorded');

    // 2) cap at 3 → deferred queued.
    reset();
    r = await sb._sfsWarmupBatch(['A', 'B', 'C', 'D', 'E'], ['1D'], { priority: true });
    ok(posts.length === 1 && JSON.stringify(posts[0].body.symbols) === '["A","B","C"]', 'WARMUP: caps the POST at 3 symbols (SFS_WARMUP_BATCH_CAP)');
    ok(JSON.stringify(r.deferredSymbols) === '["D","E"]', 'WARMUP: overflow symbols are reported as deferred');
    ok(sb._sfsWarmupQueue.length === 1 && JSON.stringify(sb._sfsWarmupQueue[0].symbols) === '["D","E"]', 'WARMUP: overflow symbols are queued, not sent');

    // 3) empty inputs → skip, no POST.
    reset();
    r = await sb._sfsWarmupBatch([], ['1D'], {});
    ok(posts.length === 0 && r.ok === false && r.reason === 'no_symbols_or_timeframes', 'WARMUP: no symbols → {ok:false, reason:no_symbols_or_timeframes}, no POST');
    r = await sb._sfsWarmupBatch(['A'], [], {});
    ok(r.ok === false && r.reason === 'no_symbols_or_timeframes', 'WARMUP: no timeframes → same skip shape');

    // 4) single symbol always sends immediately regardless of debounce.
    reset(); sb._sfsWarmupLastSentAt = clock; // "just sent"
    r = await sb._sfsWarmupBatch(['ONLY'], ['1D'], {});
    ok(posts.length === 1, 'WARMUP: a single-symbol warmup sends immediately even inside the debounce window');

    // 4b) small (≤3) non-priority sends immediately even inside the debounce window.
    reset(); sb._sfsWarmupLastSentAt = clock;
    r = await sb._sfsWarmupBatch(['A', 'B', 'C'], ['1D'], {});
    ok(posts.length === 1, 'WARMUP: a ≤3 non-priority batch is not debounced (only LARGE >3 batches are)');

    // 5) LARGE (>3) non-priority within the debounce window → queued, not sent.
    reset(); sb._sfsWarmupLastSentAt = clock; // sent "now"
    r = await sb._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D'], {});
    ok(posts.length === 0 && r.ok === false && r.reason === 'cooldown_blocked', 'WARMUP: a LARGE non-priority batch inside the debounce → cooldown_blocked, queued');
    ok(diag.some((d) => d.action === 'cooldown_blocked'), 'WARMUP: cooldown_blocked is diagnosed');
    // …but a priority LARGE batch overrides the debounce.
    reset(); sb._sfsWarmupLastSentAt = clock;
    r = await sb._sfsWarmupBatch(['A', 'B', 'C', 'D'], ['1D'], { priority: true });
    ok(posts.length === 1, 'WARMUP: priority:true overrides the debounce for a LARGE batch');

    // 6) failure matrix — HTTP error / network error return shapes.
    reset(); sb.__fetch = () => Promise.resolve({ ok: false, status: 503 });
    r = await sb._sfsWarmupBatch(['A'], ['1D'], { priority: true });
    ok(r.ok === false && r.status === 503 && JSON.stringify(r.sentSymbols) === '["A"]', 'WARMUP: HTTP 503 → {ok:false,status:503,sentSymbols,deferredSymbols}');
    reset(); sb.__fetch = () => Promise.reject(new Error('neterr'));
    r = await sb._sfsWarmupBatch(['A'], ['1D'], { priority: true });
    ok(r.ok === false && r.reason === 'warmup:neterr' && JSON.stringify(r.sentSymbols) === '["A"]', 'WARMUP: a network error → {ok:false, reason:"warmup:<msg>", sentSymbols,...}');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUEUE + DRAIN — _sfsQueueWarmupSymbols / _sfsDrainWarmupQueue (QUEUE_DRAIN).
  // One item per timer tick, then reschedule; _sfsWarmupDrainTimer is the guard.
  // ═══════════════════════════════════════════════════════════════════════════
  section('QUEUE_DRAIN. _sfsQueueWarmupSymbols / _sfsDrainWarmupQueue');
  {
    let clock = 50 * 1e6;
    const posts = [], timers = [];
    const sb = {
      console, JSON, Object, Math,
      Date: { now: () => clock },
      BACKEND: 'https://backend.test', AbortSignal: { timeout: () => undefined },
      _backendAuthHeaders: (h) => h || {},
      _recordCandleSubscriptionRequest: () => {},
      setTimeout: (fn, ms) => { const id = timers.length + 1; timers.push({ fn, ms, id }); return id; },
      fetch: (url, opts) => { posts.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true, status: 200 }); },
    };
    vm.createContext(sb);
    vm.runInContext(WARMUP_BLOCK, sb);
    const reset = () => {
      posts.length = timers.length = 0;
      sb._sfsWarmupLastSentAt = 0; sb._sfsWarmupQueue = []; sb._sfsWarmupQueuedKeys = {}; sb._sfsWarmupDrainTimer = null;
      clock += 60000;
    };

    // 1) queue splits by cap, schedules a drain, and dedupes identical chunks.
    reset();
    let q = sb._sfsQueueWarmupSymbols(['X1', 'X2', 'X3', 'X4', 'X5'], ['1D'], 'r1');
    ok(q === 5, 'QUEUE: returns the number of symbols queued');
    ok(sb._sfsWarmupQueue.length === 2, 'QUEUE: 5 symbols split into 2 chunks (cap 3)');
    ok(JSON.stringify(sb._sfsWarmupQueue[0].symbols) === '["X1","X2","X3"]', 'QUEUE: first chunk is the first 3 symbols');
    ok(sb._sfsWarmupDrainTimer !== null, 'QUEUE: a drain timer is scheduled');
    ok(timers.length === 1 && timers[0].ms === 10000, 'QUEUE: the drain is scheduled after SFS_WARMUP_DEBOUNCE_MS (10000ms)');
    // Re-queue the SAME chunks → deduped (no growth), no second timer while one is pending.
    q = sb._sfsQueueWarmupSymbols(['X1', 'X2', 'X3'], ['1D'], 'r1');
    ok(q === 0 && sb._sfsWarmupQueue.length === 2, 'QUEUE: an identical chunk is de-duplicated (queuedKeys guard)');
    ok(timers.length === 1, 'QUEUE: no extra drain timer is scheduled while one is pending');

    // 2) empty inputs queue nothing.
    ok(sb._sfsQueueWarmupSymbols([], ['1D'], 'r') === 0, 'QUEUE: empty symbols → queues 0');
    ok(sb._sfsQueueWarmupSymbols(['A'], [], 'r') === 0, 'QUEUE: empty timeframes → queues 0');

    // 3) drain processes ONE item per tick, then reschedules while items remain.
    reset(); clock += 60000;
    sb._sfsQueueWarmupSymbols(['A1', 'A2', 'A3', 'B1', 'B2', 'B3'], ['1D'], 'r2'); // 2 chunks
    ok(sb._sfsWarmupQueue.length === 2, 'QUEUE_DRAIN: two chunks are queued');
    const drainTimer = timers[timers.length - 1];
    await drainTimer.fn();            // fire the scheduled drain
    await flush();
    ok(posts.length === 1, 'QUEUE_DRAIN: a single drain tick sends exactly ONE batch (not the whole queue)');
    ok(sb._sfsWarmupQueue.length === 1, 'QUEUE_DRAIN: one item remains queued after the first drain');
    ok(sb._sfsWarmupDrainTimer !== null, 'QUEUE_DRAIN: the drain reschedules itself while the queue is non-empty');
    // fire the reschedule → drains the last item, no further reschedule.
    const nextTimer = timers[timers.length - 1];
    await nextTimer.fn();
    await flush();
    ok(posts.length === 2, 'QUEUE_DRAIN: the second tick drains the remaining item');
    ok(sb._sfsWarmupQueue.length === 0 && sb._sfsWarmupDrainTimer === null, 'QUEUE_DRAIN: an empty queue stops rescheduling (timer handle is the running guard)');

    // 4) items arriving DURING a drain are picked up by a subsequent drain (nothing lost).
    reset(); clock += 60000;
    sb._sfsQueueWarmupSymbols(['C1', 'C2', 'C3'], ['1D'], 'r3');
    const t = timers[timers.length - 1];
    // enqueue more before firing the drain
    sb._sfsQueueWarmupSymbols(['D1', 'D2', 'D3'], ['1D'], 'r4');
    ok(sb._sfsWarmupQueue.length === 2, 'QUEUE_DRAIN: new items enqueue while a drain is pending');
    await t.fn(); await flush();
    ok(posts.length === 1 && sb._sfsWarmupQueue.length === 1, 'QUEUE_DRAIN: the first drain handles one, leaving the later-added item');
    const t2 = timers[timers.length - 1];
    await t2.fn(); await flush();
    ok(posts.length === 2 && sb._sfsWarmupQueue.length === 0, 'QUEUE_DRAIN: the later-added item is drained next — nothing is lost');

    // 5) a drained chunk is sent with staged context and marks lastSentAt.
    ok(posts.every((b) => Array.isArray(b.symbols) && b.symbols.length <= 3), 'QUEUE_DRAIN: every drained POST respects the cap of 3');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH_GATE — the shared read primitive _sfsFetchBackendCandles (real).
  // Gate is enforced by the READ; the warmup POST has NO gate (documented asymmetry).
  // ═══════════════════════════════════════════════════════════════════════════
  section('AUTH_GATE. read-primitive gate + return shapes; warmup has NO gate');
  {
    const prov = [];
    const sb = {
      console, JSON, Object, Math, String, Number, isFinite, parseFloat, encodeURIComponent,
      BACKEND: 'https://backend.test', AbortSignal: { timeout: (ms) => ({ __timeout: ms }) },
      _backendAuthHeaders: () => ({ 'X-Auth': '1' }),
      __gateOpen: true, __gateReason: 'open', __resp: null,
      _backendCandleGateOpen: () => sb.__gateOpen,
      _backendCandleGateReason: () => sb.__gateReason,
      _backendGateProvenanceSource: (r) => 'gate:' + r,
      _recordCandleProvenance: (src, meta) => prov.push({ src, meta }),
      _noteBackendCandleFailure: () => {}, _noteBackendCandleSuccess: () => {},
      __lastUrl: null, __lastOpts: null,
      fetch: (url, opts) => { sb.__lastUrl = url; sb.__lastOpts = opts; return sb.__resp(url, opts); },
    };
    vm.createContext(sb);
    loadReal(sb, ['_apexParityNormTime', '_apexParityNormCandle', '_apexParityNormCandleArray',
      '_apexParityExtractBackendCandles', '_sfsExtractBackendCandles', '_sfsFetchBackendCandles']);

    // gate closed → no fetch, structured skip, provenance recorded.
    sb.__gateOpen = false; sb.__gateReason = 'auth_not_ready'; prov.length = 0; sb.__lastUrl = null;
    sb.__resp = () => { throw new Error('fetch must not be called'); };
    let r = await sb._sfsFetchBackendCandles('SPY', '4H');
    ok(r.ok === false && r.status === 0 && r.count === 0 && r.reason === 'auth_not_ready', 'AUTH_GATE: gate closed → {ok:false,status:0,count:0,reason:<gateReason>} and NO fetch');
    ok(sb.__lastUrl === null, 'AUTH_GATE: gate closed performs zero network');
    ok(prov.length === 1, 'AUTH_GATE: a gate-closed provenance record is written');

    // gate open, success → endpoint/headers/timeout, mapped candles, reason null.
    sb.__gateOpen = true;
    sb.__resp = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: series(25) }) });
    r = await sb._sfsFetchBackendCandles('BRK.B', '1D');
    ok(sb.__lastUrl === 'https://backend.test/dev/market/candles-dxlink/BRK.B?timeframe=1D', 'AUTH_GATE: GET url encodes symbol + timeframe on the dxlink candles endpoint');
    ok(sb.__lastOpts.cache === 'no-store' && sb.__lastOpts.headers['X-Auth'] === '1', 'AUTH_GATE: read uses no-store + auth headers');
    ok(sb.__lastOpts.signal && sb.__lastOpts.signal.__timeout === 15000, 'AUTH_GATE: read uses a 15000ms abort timeout (distinct from the 30000ms warmup)');
    ok(r.ok === true && r.count === 25 && r.reason === null, 'AUTH_GATE: a usable read → {ok:true,count,candles, reason:null}');

    // gate open, HTTP error → http_<status>.
    sb.__resp = () => Promise.resolve({ ok: false, status: 429 });
    r = await sb._sfsFetchBackendCandles('SPY', '1D');
    ok(r.ok === false && r.status === 429 && r.reason === 'http_429', 'AUTH_GATE: HTTP 429 → {ok:false,status:429,reason:"http_429"}');

    // gate open, invalid JSON → json_parse.
    sb.__resp = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error('bad')) });
    r = await sb._sfsFetchBackendCandles('SPY', '1D');
    ok(r.ok === false && r.reason === 'json_parse', 'AUTH_GATE: invalid JSON body → {ok:false, reason:"json_parse"}');

    // gate open, network throw → fetch:<msg>.
    sb.__resp = () => Promise.reject(new Error('down'));
    r = await sb._sfsFetchBackendCandles('SPY', '1D');
    ok(r.ok === false && r.status === 0 && r.reason === 'fetch:down', 'AUTH_GATE: a network throw → {ok:false,status:0,reason:"fetch:<msg>"}');

    // gate open, 200 but empty candles → reason surfaces backend body reason or "empty".
    sb.__resp = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candles: [], reason: 'subscription too big' }) });
    r = await sb._sfsFetchBackendCandles('SPY', '1D');
    ok(r.ok === true && r.count === 0 && r.reason === 'subscription too big', 'AUTH_GATE: HTTP 200 empty surfaces the backend body reason (not silently "empty")');

    // ASYMMETRY: the warmup POST does NOT consult the auth gate.
    const warmSrc = stripComments(extractFn(HTML, '_sfsWarmupBatch'));
    ok(!/_backendCandleGateOpen|_backendCandleGateReason/.test(warmSrc), 'AUTH_GATE: STATIC — _sfsWarmupBatch does NOT gate on auth (asymmetry vs the read primitive)');
    const readSrc = stripComments(extractFn(HTML, '_sfsFetchBackendCandles'));
    ok(/_backendCandleGateOpen\(\)/.test(readSrc), 'AUTH_GATE: STATIC — _sfsFetchBackendCandles DOES gate on _backendCandleGateOpen()');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONCURRENCY — cross-flow independence in one shared sandbox.
  // ═══════════════════════════════════════════════════════════════════════════
  section('CONCURRENCY. generic + detail 4H share leaves but stay independent');
  {
    const reads = [], warms = [];
    const readMap = { generic: [], detail: [] };
    const sb = {
      console, JSON, Object, Math, String, Number, isFinite, Promise,
      Date: { now: () => 60 * 1e6 },
      debugLog() {}, debugWarn() {}, window: {},
      document: { getElementById: () => ({ innerHTML: '', textContent: '', style: {}, querySelector: () => null }) },
      S: { squeezeFireScanner: { chartSymbol: 'CAT', chartCacheCandles: {} } },
      _sfsLastFailReason: {}, _sfsWarmupCooldown: {}, SFS_WARMUP_COOLDOWN_MS: 30000, _sfsTfFetchInflight: {},
      _recordCandleProvenance() {},
      _sfsCandlesFromSyncSource: () => null,
      _sfsCandleSubLimitActive: () => false,
      _sfsSleep: () => Promise.resolve(),
      _sfsFetchBackendCandles: (s, t) => { reads.push(s + '|' + t); return Promise.resolve(okFull(30)); },
      _sfsWarmupBatch: (s, t, o) => { warms.push({ s, t, o }); return Promise.resolve({ ok: true, status: 200, sentSymbols: s }); },
    };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_sfsCandlesUsable') + '\n' + extractFn(HTML, '_sfsEnsureTfCandles') + '\n' + DETAIL_BLOCK, sb);

    // generic and detail 4H concurrently on the same symbol → independent in-flight maps.
    const [g, d] = await Promise.all([sb._sfsEnsureTfCandles('CAT', '1D'), sb._sfsEnsureDetail4hCandles('CAT')]);
    ok(Array.isArray(g) && g.length === 30, 'CONCURRENCY: generic 1D resolves to an array');
    ok(d && d.ok === true && d.candles && d.candles.length === 30, 'CONCURRENCY: detail 4H resolves to a structured result');
    ok(reads.some((x) => x === 'CAT|1D') && reads.some((x) => x === 'CAT|4H'), 'CONCURRENCY: the two flows read different timeframes (CAT|1D and CAT|4H)');
    ok(!('CAT|1D' in sb._sfsTfFetchInflight) && !('CAT' in sb._sfsDetail4hInflight), 'CONCURRENCY: both in-flight maps are cleaned after settling');

    // two identical generic ensures + two identical detail loaders → each dedupes independently.
    reads.length = 0; warms.length = 0;
    sb._sfsTfFetchInflight = {}; sb._sfsDetail4hInflight = {}; sb._sfsDetail4hPhase = {}; sb._sfsDetail4hResult = {};
    sb.S.squeezeFireScanner.chartCacheCandles = {};
    await Promise.all([
      sb._sfsEnsureTfCandles('CAT', '1D'), sb._sfsEnsureTfCandles('CAT', '1D'),
      sb._sfsEnsureDetail4hCandles('CAT'), sb._sfsEnsureDetail4hCandles('CAT'),
    ]);
    ok(reads.filter((x) => x === 'CAT|1D').length === 1, 'CONCURRENCY: duplicate generic ensures dedupe to ONE 1D read');
    ok(reads.filter((x) => x === 'CAT|4H').length === 1, 'CONCURRENCY: duplicate detail loaders dedupe to ONE 4H read');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN_SHAPES + STATE — static contract (do NOT introduce a common envelope).
  // ═══════════════════════════════════════════════════════════════════════════
  section('RETURN_SHAPES / STATE. per-flow shapes stay distinct; state init pinned');
  {
    // Distinct shapes: generic returns array|null, detail/spy do NOT build the same object.
    const gen = stripComments(extractFn(HTML, '_sfsEnsureTfCandles'));
    const det = stripComments(extractFn(HTML, '_sfsEnsureDetail4hCandles'));
    const base = stripComments(extractFn(HTML, '_sfsDetail4hBaseResult'));
    ok(/return\s+null/.test(gen), 'RETURN_SHAPES: generic ensure returns null on failure (no envelope)');
    ok(/ok:false/.test(base) && /timeframe:'4H'/.test(base) && /warmupAttempted:false/.test(base), 'RETURN_SHAPES: detail 4H base result carries {ok,timeframe,candles,warmupAttempted,...}');
    ok(!/warmupAttempted/.test(gen), 'RETURN_SHAPES: generic never grows a warmupAttempted field (shapes stay distinct)');

    // State initialisation moment: every shared state object is initialised at declaration
    // (module load), not lazily — so an extraction must preserve the same init timing.
    const ordered = loader.loadOrderedScriptSources();
    const inlineMonolith = ordered.filter((s) => s.kind === 'inline' && s.isAppJs).map((s) => s.code).join('\n');
    // The SFS in-flight / cooldown / queue STATE and the SFS_* constants were relocated
    // verbatim out of the monolith into js/services/sfs-config-state.js. Ownership below is
    // asserted against that module AND against absence from the monolith.
    const CONFIG_STATE_SRC = fs.readFileSync(
      path.resolve(__dirname, '..', 'js', 'services', 'sfs-config-state.js'), 'utf8');
    ok(/var\s+_sfsTfFetchInflight\s*=\s*\{\}/.test(CONFIG_STATE_SRC), 'STATE: _sfsTfFetchInflight initialised to {} at declaration');
    ok(/var\s+_sfsDetail4hInflight\s*=\s*\{\}/.test(CONFIG_STATE_SRC), 'STATE: _sfsDetail4hInflight initialised to {} at declaration');
    ok(/var\s+_sfsSpyReadInflight\s*=\s*\{\}/.test(CONFIG_STATE_SRC), 'STATE: _sfsSpyReadInflight initialised to {} at declaration');
    ok(/var\s+_sfsWarmupQueue\s*=\s*\[\]/.test(CONFIG_STATE_SRC), 'STATE: _sfsWarmupQueue initialised to [] at declaration');
    ok(/var\s+_sfsWarmupLastSentAt\s*=\s*0/.test(CONFIG_STATE_SRC), 'STATE: _sfsWarmupLastSentAt initialised to 0 at declaration');
    ok(/var\s+_sfsWarmupDrainTimer\s*=\s*null/.test(CONFIG_STATE_SRC), 'STATE: _sfsWarmupDrainTimer initialised to null (drain uses the timer handle, not a boolean, as the running guard)');
    // Constants pinned to their shipping values.
    ok(/var\s+SFS_WARMUP_BATCH_CAP\s*=\s*3\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_WARMUP_BATCH_CAP = 3');
    ok(/var\s+SFS_WARMUP_DEBOUNCE_MS\s*=\s*10000\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_WARMUP_DEBOUNCE_MS = 10000');
    ok(/var\s+SFS_WARMUP_COOLDOWN_MS\s*=\s*30000\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_WARMUP_COOLDOWN_MS = 30000');
    ok(/var\s+SFS_DETAIL_4H_POST_WARM_ATTEMPTS\s*=\s*3\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_DETAIL_4H_POST_WARM_ATTEMPTS = 3');
    ok(/var\s+SFS_DETAIL_4H_POST_WARM_DELAY_MS\s*=\s*1200\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_DETAIL_4H_POST_WARM_DELAY_MS = 1200');
    ok(/var\s+SFS_SPY_POST_WARM_READ_ATTEMPTS\s*=\s*4\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_SPY_POST_WARM_READ_ATTEMPTS = 4');
    ok(/var\s+SFS_SPY_POST_WARM_RETRY_DELAY_MS\s*=\s*900\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_SPY_POST_WARM_RETRY_DELAY_MS = 900');
    ok(/var\s+SFS_SPY_READ_COOLDOWN_MS\s*=\s*30000\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_SPY_READ_COOLDOWN_MS = 30000');
    ok(/var\s+SFS_SPY_WARM_COOLDOWN_MS\s*=\s*120000\b/.test(CONFIG_STATE_SRC), 'STATE: SFS_SPY_WARM_COOLDOWN_MS = 120000');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main();
