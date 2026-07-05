'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PortfolioTechnical — formula-parity alias mapping (preview #295 regression).
//
// Symptom on preview #295:
//   [PortfolioTechnical] technical refresh mapping skipped
//     reason: "formula_parity_not_confirmed"
//     required1DParityConfirmed: false
//     returnedTechnicalsCount: 6
// The backend returned 6 valid technicals but the frontend refused to map them.
//
// Root cause (PORTFOLIO_SPY_EQ_EARNINGS_SQZ_AUDIT.md §4, lines 123-129): a backend
// contract drift. The authoritative per-formula 1D parity verdict is emitted under
// the *_1d-suffixed keys (rsi14_1d / sma_1d / distanceFromSma_1d = 'confirmed'),
// while the UNSUFFIXED keys (rsi14 / sma / distanceFromSma) double as a batch-
// completeness flag the backend downgrades to 'partial' when ANY requested symbol is
// cold. The frontend gate read only the unsuffixed keys, so one cold symbol discarded
// the whole batch's technicals.
//
// Fix under test: buildFormulaParityGate maps the *_1d aliases EXPLICITLY into the
// required 1D slots. The gate/threshold is UNCHANGED — all three 1D slots must be
// 'confirmed' (under the canonical key OR its alias); nothing is loosened. Genuinely
// missing parity still skips the mapping. Diagnostics record which aliases were used.
//
// Proves:
//   1. Technicals ARE applied when valid technicals return and parity is confirmed.
//   2. Technicals are NOT applied when parity is genuinely missing.
//   3. The alternate parity path (*_1d-suffixed keys) is parsed correctly.
//   4. Formula aliases are mapped EXPLICITLY (recorded), not silently ignored.
//   5. Existing scanner/candle formulas are not changed.
//   6. #295 option-chain priority behavior is not touched.
//
// Run: node tests/portfolio-technical-parity-alias.test.js
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

// Extract a top-level `var NAME = {...};` literal (for the alias map constant).
function extractVarObject(src, name) {
  const sig = 'var ' + name + ' = {';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('var not found: ' + name);
  let i = src.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1) + ';'; }
  }
  throw new Error('unterminated var: ' + name);
}

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }

// Sandbox with the parity gate + its helpers (+ the full mapping fn and squeeze deps).
function buildCtx() {
  const ctx = {
    console: { log() {}, warn() {}, debug() {}, error() {} },
    String, Object, Array, isFinite, parseFloat, Number, Date, JSON,
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractVarObject(HTML, 'PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES'),
    extractFn(HTML, '_resolvePortfolioTechnicalParityKey'),
    extractFn(HTML, 'buildFormulaParityGate'),
    extractFn(HTML, '_squeezeToState'),
    extractFn(HTML, '_technicalTfSqueezeState'),
    extractFn(HTML, 'buildBackendTechnicalByTickerFromResponse'),
  ].join('\n'), ctx);
  return ctx;
}

const CONFIRMED_1D = { rsi14: 'confirmed', sma: 'confirmed', distanceFromSma: 'confirmed' };
const CONFIRMED_1D_SUFFIXED = { rsi14_1d: 'confirmed', sma_1d: 'confirmed', distanceFromSma_1d: 'confirmed' };
// The exact preview #295 shape: unsuffixed downgraded to 'partial', suffixed confirmed.
const DRIFT_1D = {
  rsi14: 'partial', sma: 'partial', distanceFromSma: 'partial',
  rsi14_1d: 'confirmed', sma_1d: 'confirmed', distanceFromSma_1d: 'confirmed',
};

function techResponse(formulaParity) {
  return {
    ok: true,
    formulaParity: formulaParity,
    technicalsBySymbol: {
      AMD: { symbol: 'AMD', technical: { '1D': { rsi14: 55, sma20: 100, distFromSma20: 2.5 } } },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. buildFormulaParityGate — alias resolution (requirement 4: explicit mapping)
// ─────────────────────────────────────────────────────────────────────────────
(function() {
  const { buildFormulaParityGate } = buildCtx();

  // 1a. Canonical keys confirmed → confirmed, and NO alias recorded (canonical wins).
  const g1 = buildFormulaParityGate(CONFIRMED_1D);
  assert(g1.required1DParityConfirmed === true, '1a: canonical unsuffixed keys → required1DParityConfirmed');
  assert(Object.keys(g1.appliedParityAliases).length === 0, '1a: no alias recorded when canonical key confirms');
  assert(g1.rsiParityConfirmed === true && g1.smaParityConfirmed === true, '1a: per-formula flags true');

  // 1b. Only *_1d-suffixed keys present → confirmed via EXPLICIT alias mapping.
  const g2 = buildFormulaParityGate(CONFIRMED_1D_SUFFIXED);
  assert(g2.required1DParityConfirmed === true, '1b: *_1d-suffixed keys alone → required1DParityConfirmed (alternate path parsed)');
  assert(g2.appliedParityAliases.rsi14 === 'rsi14_1d'
      && g2.appliedParityAliases.sma === 'sma_1d'
      && g2.appliedParityAliases.distanceFromSma === 'distanceFromSma_1d',
    '1b: aliases recorded explicitly (not silently ignored)');
  assert(g2.rsiParityConfirmed === true && g2.smaParityConfirmed === true, '1b: per-formula flags confirmed via alias');

  // 1c. The exact drift: unsuffixed 'partial' + suffixed 'confirmed' → confirmed.
  const g3 = buildFormulaParityGate(DRIFT_1D);
  assert(g3.required1DParityConfirmed === true, '1c: unsuffixed partial + suffixed confirmed → confirmed (preview #295 shape)');
  assert(g3.appliedParityAliases.rsi14 === 'rsi14_1d', '1c: drift resolved via alias, recorded');

  // 1d. Genuinely missing parity → NOT confirmed; missing keys are the canonical set.
  const g4 = buildFormulaParityGate({});
  assert(g4.required1DParityConfirmed === false, '1d: empty parity → NOT confirmed (gate not loosened)');
  assert(g4.missingRequired1D.length === 3, '1d: all three required 1D keys reported missing');
  assert(Object.keys(g4.appliedParityAliases).length === 0, '1d: no aliases applied when nothing confirms');
  const g4b = buildFormulaParityGate({ rsi14: 'partial', sma: 'partial', distanceFromSma: 'partial' });
  assert(g4b.required1DParityConfirmed === false, '1d: all-partial (no suffixed) → NOT confirmed');

  // 1e. Partial confirmation is still NOT full confirmation (threshold preserved).
  const g5 = buildFormulaParityGate({ rsi14_1d: 'confirmed', sma_1d: 'confirmed' /* distanceFromSma missing */ });
  assert(g5.required1DParityConfirmed === false, '1e: two of three slots → still NOT confirmed (all-three threshold intact)');
  assert(g5.missingRequired1D.indexOf('distanceFromSma') !== -1, '1e: the unresolved slot is reported missing');

  // 1f. availableParityKeys surfaces exactly what the backend sent (diagnostic).
  assert(JSON.stringify(g3.availableParityKeys.sort()) === JSON.stringify(Object.keys(DRIFT_1D).sort()),
    '1f: availableParityKeys mirrors backend-sent keys');

  console.log('✓ 1 buildFormulaParityGate maps *_1d aliases explicitly; threshold unchanged; genuine-miss still skips');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 2. buildBackendTechnicalByTickerFromResponse — end-to-end mapping
//    (requirements 1, 2, 3)
// ─────────────────────────────────────────────────────────────────────────────
(function() {
  const { buildBackendTechnicalByTickerFromResponse } = buildCtx();

  // 2a. Valid technicals + suffixed parity → APPLIED (the preview #295 recovery).
  const r1 = buildBackendTechnicalByTickerFromResponse(['AMD'], techResponse(CONFIRMED_1D_SUFFIXED), 'BACKEND_TECHNICAL_REFRESH');
  assert(r1.usable === true, '2a: usable when technicals valid + parity confirmed via *_1d alias');
  assert(r1.byTicker.AMD && r1.byTicker.AMD.rsi14 === 55, '2a: rsi14 field applied to the position');
  assert(r1.byTicker.AMD.sma20 === 100, '2a: sma20 field applied');
  assert(r1.parityGate.appliedParityAliases.rsi14 === 'rsi14_1d', '2a: alias provenance carried on the result');

  // 2b. Valid technicals + genuinely missing parity → NOT applied.
  const r2 = buildBackendTechnicalByTickerFromResponse(['AMD'], techResponse({}), 'BACKEND_TECHNICAL_REFRESH');
  assert(r2.usable === false, '2b: NOT usable when parity genuinely missing (even with valid technicals)');
  assert(Object.keys(r2.byTicker).length === 0, '2b: no technicals mapped');
  assert(r2.parityGate.required1DParityConfirmed === false, '2b: gate reports parity unconfirmed');
  const r2b = buildBackendTechnicalByTickerFromResponse(['AMD'],
    techResponse({ rsi14: 'partial', sma: 'partial', distanceFromSma: 'partial' }), 'BACKEND_TECHNICAL_REFRESH');
  assert(r2b.usable === false, '2b: all-partial (no suffixed alias) → still NOT usable');

  // 2c. Baseline unchanged: canonical unsuffixed confirmed → APPLIED as before.
  const r3 = buildBackendTechnicalByTickerFromResponse(['AMD'], techResponse(CONFIRMED_1D), 'BACKEND_TECHNICAL_REFRESH');
  assert(r3.usable === true && r3.byTicker.AMD.rsi14 === 55, '2c: canonical-confirmed still maps (no regression)');
  assert(Object.keys(r3.parityGate.appliedParityAliases).length === 0, '2c: no alias recorded on the canonical path');

  console.log('✓ 2 mapping applies with confirmed parity (canonical or *_1d alias); skips when genuinely missing');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 3. Existing 4H behaviour is untouched (no regression to the prior gate)
// ─────────────────────────────────────────────────────────────────────────────
(function() {
  const { buildFormulaParityGate } = buildCtx();
  // 4H-specific keys present & confirmed → required4H confirmed (timeframe_specific).
  const g4h = buildFormulaParityGate(Object.assign({}, CONFIRMED_1D, { rsi14_4h: 'confirmed', sma_4h: 'confirmed', distanceFromSma_4h: 'confirmed' }));
  assert(g4h.required4HParityConfirmed === true && g4h.fourHParityMode === 'timeframe_specific', '3a: 4H-specific confirmed → required4H confirmed');
  // 4H-specific key present but unconfirmed → required4H NOT confirmed (unchanged).
  const g4hBad = buildFormulaParityGate(Object.assign({}, CONFIRMED_1D, { rsi14_4h: 'partial', sma_4h: 'confirmed', distanceFromSma_4h: 'confirmed' }));
  assert(g4hBad.required4HParityConfirmed === false, '3b: any unconfirmed 4H-specific key → required4H NOT confirmed');
  // No 4H-specific keys → global fallback inherits the 1D verdict (now alias-aware).
  const g4hGlobal = buildFormulaParityGate(CONFIRMED_1D_SUFFIXED);
  assert(g4hGlobal.fourHParityMode === 'global_fallback' && g4hGlobal.required4HParityConfirmed === true, '3c: global fallback inherits alias-aware 1D verdict');
  console.log('✓ 3 4H timeframe-specific vs global-fallback semantics preserved');
})();

// ─────────────────────────────────────────────────────────────────────────────
// 4. Static guards — scanner/candle formulas & #295 option-chain priority
//    (requirements 5 & 6)
// ─────────────────────────────────────────────────────────────────────────────
(function() {
  // 4a. The parity helpers contain NO indicator math and NO provider fetch — they
  //     only read the backend's own 'confirmed' string. So no scanner/candle formula
  //     is touched by this change.
  const gateSrc = extractFn(HTML, 'buildFormulaParityGate') + extractFn(HTML, '_resolvePortfolioTechnicalParityKey');
  assert(!/Math\.(sqrt|pow|abs|exp|log)/.test(gateSrc), '4a: parity helpers compute no indicator math');
  assert(!/yahoo|query1|query2|finance\./i.test(gateSrc), '4a: parity helpers add no new data provider');
  assert(gateSrc.indexOf("=== 'confirmed'") !== -1, '4a: gate only reads the backend\'s own confirmed verdict');

  // 4b. Scanner/candle formula surfaces still present (unchanged) — spot-check the
  //     well-known helpers other suites pin.
  ['computeRowBetaWeightedDelta', '_technicalTfSqueezeState', '_squeezeToState'].forEach(function(fn) {
    assert(HTML.indexOf('function ' + fn + '(') !== -1, '4b: ' + fn + ' still defined (candle/technical formula surface intact)');
  });

  // 4c. #295 option-chain priority is untouched: its markers still exist and the
  //     parity change does not reference any option-chain state.
  assert(HTML.indexOf('function _optionChainPriorityActive(') !== -1, '4c: #295 _optionChainPriorityActive still defined');
  assert(HTML.indexOf('optionChainPriorityPending') !== -1, '4c: #295 optionChainPriorityPending state preserved');
  assert(!/optionChain|option-chain/i.test(gateSrc), '4c: parity helpers never touch option-chain priority');

  // 4d. Required diagnostics are wired (manual-verification depends on these tags).
  assert(HTML.indexOf('[PortfolioTechnical] parity audit availableKeys=') !== -1, '4d: parity audit diagnostic wired');
  assert(HTML.indexOf('[PortfolioTechnical] parity aliases applied') !== -1, '4d: parity aliases-applied diagnostic wired');
  assert(HTML.indexOf('[PortfolioTechnical] mapping applied count=') !== -1, '4d: mapping-applied diagnostic wired');
  assert(HTML.indexOf('[PortfolioTechnical] mapping skipped reason=') !== -1, '4d: mapping-skipped diagnostic wired');

  console.log('✓ 4 scanner/candle formulas & #295 priority untouched; diagnostics wired');
})();

console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
if (failed > 0) process.exit(1);
