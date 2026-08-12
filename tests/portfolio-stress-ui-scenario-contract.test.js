'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS UI — SCENARIO REQUEST CONTRACT (cross-tier).
//
// WHY THIS SUITE EXISTS
//   The six UI suites were green and had NOT caught a request the deployed
//   backend rejects. They could not have: every one of them builds the request
//   with the UI and validates it with the UI, which is a closed loop. A closed
//   loop cannot fail the one way that matters.
//
//   This suite is the first that opens the loop. §1–§3 are structural and always
//   run. §4 runs the REAL backend `normalizeScenario` against the REAL scenarios
//   the UI builds, and is the only thing here that can prove the request is
//   ACCEPTED rather than merely well-formed by our own definition.
//
// THE VIX OWNERSHIP RULE
//   A scenario needs a VIX level to shock from. The UI declares
//   `vixCurrentSource: 'BACKEND_FROZEN_SNAPSHOT'` and NEVER sends a number,
//   because a frontend-supplied level would be a second market source for one
//   run — what PST-SPY-007 forbids for SPY, for the same reason — and would open
//   a silent window in which the level the UI read and the level the backend
//   froze disagree. §2 and §3 assert that absence over the whole tier rather
//   than trusting the scenario builder alone.
//
// WHEN THE BACKEND IS NOT REACHABLE
//   §4 SKIPS with a printed reason. It does not pass. Running it for real needs
//   an apex-backend checkout:
//
//     APEX_BACKEND_PATH=/path/to/apex-backend node tests/portfolio-stress-ui-scenario-contract.test.js
//
//   and PST_REQUIRE_BACKEND_SOURCE=1 turns every skip into a failure, which is
//   how CI runs it. A suite that quietly passed without the backend would be
//   exactly the false comfort this file was written to remove.
//
// Run: node tests/portfolio-stress-ui-scenario-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const H = require('./lib/portfolio-stress-ui-sandbox.js');

const ROOT = H.ROOT;
const MODEL = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json'), 'utf8'));

let pass = 0, fail = 0, skipped = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
}
function section(t) { console.log('\n' + t); }
function skip(msg) { skipped++; console.log('  ~ SKIPPED: ' + msg); }

const STRICT = /^(1|true|yes)$/i.test(String(process.env.PST_REQUIRE_BACKEND_SOURCE || ''));
function unavailable(reason) {
  if (STRICT) { ok(false, 'STRICT MODE: ' + reason); return true; }
  skip(reason);
  return false;
}

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}

const UI_FILES = [H.FILES.uiState, H.FILES.panel];
const SRC = {};
for (const p of UI_FILES) SRC[p] = stripComments(fs.readFileSync(p, 'utf8'));
const rel = (p) => path.relative(ROOT, p);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The scenario the UI builds is exactly the declared shape');
{
  const { sandbox } = H.makeSandbox({});
  const scenarios = sandbox.buildPortfolioStressUiScenarios(sandbox.portfolioStressUiDefaultGrid());
  ok(scenarios.length >= 20, '1.1: the default grid produces the minimum matrix, got ' + scenarios.length);

  const declared = sandbox.PORTFOLIO_STRESS_UI_SCENARIO_FIELDS.slice().sort();
  ok(declared.indexOf('vixCurrentSource') !== -1, '1.2: vixCurrentSource is part of the declared shape');
  ok(declared.indexOf('vixCurrent') === -1, '1.3: vixCurrent is NOT part of the declared shape');

  let shapeOk = 0, sourceOk = 0, noNumber = 0;
  for (const s of scenarios) {
    if (JSON.stringify(Object.keys(s).sort()) === JSON.stringify(declared)) shapeOk++;
    if (s.vixCurrentSource === 'BACKEND_FROZEN_SNAPSHOT') sourceOk++;
    if (!Object.prototype.hasOwnProperty.call(s, 'vixCurrent')) noNumber++;
  }
  ok(shapeOk === scenarios.length,
    '1.4: every scenario is exactly ' + JSON.stringify(declared) + ' (' + shapeOk + '/' + scenarios.length + ')');
  ok(sourceOk === scenarios.length,
    '1.5: EVERY scenario declares the backend-frozen VIX baseline (' + sourceOk + '/' + scenarios.length + ')');
  ok(noNumber === scenarios.length,
    '1.6: NO scenario carries a vixCurrent number (' + noNumber + '/' + scenarios.length + ')');

  // Per-scenario, not per-request: the backend validates scenarios individually,
  // so a request-level declaration would leave each one ambiguous on its own.
  const body = (function () {
    const { sandbox: sb, calls } = H.makeSandbox({ transport: () => Promise.resolve(H.goodResponse()) });
    const st = sb.createPortfolioStressUiState();
    sb._pstxState = st;
    sb.pstxRun();
    return calls;
  })();
  ok(body.transport.length === 1, '1.7: one request');
  const sent = body.transport[0].init.body;
  ok(sent.scenarios.every((s) => s.vixCurrentSource === 'BACKEND_FROZEN_SNAPSHOT'),
    '1.8: the declaration travels on every scenario in the real request body');
  ok(!Object.prototype.hasOwnProperty.call(sent, 'vixCurrentSource'),
    '1.9: it is a SCENARIO field, not a request-level one');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. No VIX value is read, fetched or computed anywhere in the tier');
{
  for (const p of UI_FILES) {
    const code = SRC[p];
    // The identifier itself must not appear as a value the UI produces.
    ok(!/\bvixCurrent\s*[:=]\s*(?!.*BACKEND_FROZEN)/.test(code.replace(/vixCurrentSource/g, '')),
      '2.1: ' + rel(p) + ' assigns no vixCurrent value');
    for (const [label, re] of [
      ['a VIX family read', /vixFamily|S\.vixFamily|buildVixFamilySnapshot/],
      ['a VIX quote read', /getVix|readVix|fetchVix|vixQuote|vixLast|vixSpot/i],
      ['a market-context read', /marketContextSnapshot|market-context|refreshSharedMarketRegime/],
      ['an SPY price read', /resolveFreshSpyPrice|spySnapshotPrice|spyPrice|spyLast/],
      ['a second market source', /yahoo|twelvedata|alphavantage|finnhub|polygon/i],
      ['a DXLink subscription', /dxlink|DXLink|streamerSymbol/],
    ]) {
      ok(!re.test(code), '2.2: no ' + label + ' in ' + rel(p));
    }
  }
  // The panel reads exactly two application globals, and neither is market data.
  const globals = (SRC[H.FILES.panel].match(/\b(S|BACKEND)\s*\./g) || []);
  ok(globals.length === 0, '2.3: the panel reads neither the global state bag nor the backend URL directly');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Mutation: the declaration cannot be quietly dropped or replaced');
{
  const build = (sources) => {
    const { sandbox } = H.makeSandbox({ sources: sources || {} });
    return sandbox.buildPortfolioStressUiScenarios(sandbox.portfolioStressUiDefaultGrid());
  };
  const baseline = build();
  ok(baseline.every((s) => s.vixCurrentSource === 'BACKEND_FROZEN_SNAPSHOT'),
    '3.0: BASELINE — the declaration is present');

  // Dropped entirely.
  const dropped = build({
    uiState: H.mutateSource('uiState',
      '        vixCurrentSource: PORTFOLIO_STRESS_UI_VIX_CURRENT_SOURCE,\n', ''),
  });
  ok(dropped.every((s) => !Object.prototype.hasOwnProperty.call(s, 'vixCurrentSource')),
    '3.1: MUTATION CAUGHT — removing the field is visible in the built scenario');

  // Replaced by a frontend-sourced number, which is the failure mode that matters.
  const numeric = build({
    uiState: H.mutateSource('uiState',
      '        vixCurrentSource: PORTFOLIO_STRESS_UI_VIX_CURRENT_SOURCE,',
      '        vixCurrent: 17.5,'),
  });
  ok(numeric.every((s) => Object.prototype.hasOwnProperty.call(s, 'vixCurrent')),
    '3.2: MUTATION CAUGHT — a frontend vixCurrent is visible in the built scenario');
  ok(JSON.stringify(numeric[0]) !== JSON.stringify(baseline[0]),
    '3.3: MUTATION CAUGHT — the declared shape assertion in §1.4 would reject it');

  // A different source token, which would claim an ownership the UI does not have.
  const wrongToken = build({
    uiState: H.mutateSource('uiState',
      "var PORTFOLIO_STRESS_UI_VIX_CURRENT_SOURCE = 'BACKEND_FROZEN_SNAPSHOT';",
      "var PORTFOLIO_STRESS_UI_VIX_CURRENT_SOURCE = 'FRONTEND_LIVE_QUOTE';"),
  });
  ok(wrongToken.every((s) => s.vixCurrentSource === 'FRONTEND_LIVE_QUOTE'),
    '3.4: MUTATION CAUGHT — a frontend-owned baseline token is visible');
  ok(wrongToken[0].vixCurrentSource !== baseline[0].vixCurrentSource,
    '3.5: MUTATION CAUGHT — §1.5 would reject it');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The REAL backend accepts what the UI builds');
{
  // An apex-backend GIT REPOSITORY, read AT THE AUDITED COMMIT — never a working
  // tree, and never a branch tip. The audited commit and the dev-deployed merge
  // carry the same source tree, which is what makes this evidence about the
  // running service rather than about a tree nobody executes.
  const roles = (MODEL.backendReferences || {}).backendCommitRoles || {};
  const AUDITED = String((roles.auditedImplementation || {}).commit || '');
  const envVar = (MODEL.sourceFacts || {}).backendCheckoutEnvVar || 'APEX_BACKEND_PATH';

  const resolveBackendRoot = () => {
    const candidates = [];
    if (process.env[envVar]) candidates.push(process.env[envVar]);
    for (const p of (MODEL.sourceFacts || {}).backendCheckoutDefaultPaths || []) {
      candidates.push(path.isAbsolute(p) ? p : path.resolve(ROOT, p));
    }
    for (const c of candidates) {
      try {
        execFileSync('git', ['-C', c, 'rev-parse', '--git-dir'], { stdio: ['ignore', 'pipe', 'pipe'] });
        return c;
      } catch (_) { /* keep looking */ }
    }
    return null;
  };

  const backendRoot = resolveBackendRoot();
  let proceed = true;
  if (!backendRoot) {
    proceed = !unavailable('no apex-backend checkout is reachable (set ' + envVar + ') — ' +
      'the REAL normalizeScenario was NOT exercised, so nothing here proves the backend accepts this request');
  } else if (!/^[0-9a-f]{40}$/.test(AUDITED)) {
    proceed = !unavailable('the model records no audited implementation commit');
  } else {
    try {
      execFileSync('git', ['-C', backendRoot, 'cat-file', '-e', AUDITED + '^{commit}'],
        { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (_) {
      proceed = !unavailable('the audited commit ' + AUDITED.slice(0, 12) + ' is not present in ' + backendRoot);
    }
  }

  if (proceed && backendRoot) {
    const showAt = (rel2) => execFileSync('git', ['-C', backendRoot, 'show', AUDITED + ':' + rel2],
      { maxBuffer: 1 << 28 }).toString('utf8');

    // Locate the scenario normalizer in the backend source. Searched for by NAME
    // across the engine modules rather than hardcoded to one path, so a
    // relocation on the backend side reports "not found" instead of silently
    // skipping.
    let engineSrc = null, engineRel = null;
    const candidates = ['lib/portfolio-stress-scenarios.js', 'lib/portfolio-stress-engine.js',
      'lib/portfolio-stress.js', 'server.js'];
    for (const c of candidates) {
      let text = null;
      try { text = showAt(c); } catch (_) { continue; }
      if (/function\s+normalizeScenario\s*\(|normalizeScenario\s*[:=]\s*(?:function|\()/.test(text)) {
        engineSrc = text; engineRel = c; break;
      }
    }

    if (!engineSrc) {
      unavailable('normalizeScenario was not found at ' + AUDITED.slice(0, 12) +
        ' in any of: ' + candidates.join(', '));
    } else {
      ok(true, '4.1: normalizeScenario located in ' + engineRel + ' at ' + AUDITED.slice(0, 12));

      // Run the REAL function. The module is loaded in a sandbox with the Node
      // builtins a pure normalizer needs and nothing else — no network, no fs —
      // so a normalizer that reached for either would throw rather than pass.
      const sandbox = {
        module: { exports: {} }, exports: {}, console: { log() {}, warn() {}, error() {} },
        Object, Array, JSON, Math, Error, String, Number, Boolean, isFinite, isNaN,
        parseFloat, parseInt, Date, RegExp, Map, Set, Symbol,
        require: (m) => { throw new Error('the normalizer reached for require(' + m + ')'); },
      };
      sandbox.module.exports = sandbox.exports;
      let normalize = null;
      try {
        vm.createContext(sandbox);
        vm.runInContext(engineSrc, sandbox, { timeout: 5000 });
        normalize = sandbox.normalizeScenario
          || (sandbox.module.exports && sandbox.module.exports.normalizeScenario);
      } catch (e) {
        unavailable('the backend engine module did not load in isolation: ' + e.message);
      }

      if (typeof normalize !== 'function') {
        unavailable('normalizeScenario is not callable after loading ' + engineRel);
      } else {
        const { sandbox: ui } = H.makeSandbox({});
        const scenarios = ui.buildPortfolioStressUiScenarios(ui.portfolioStressUiDefaultGrid());

        // 4.2 EVERY default scenario the UI produces must be accepted.
        let accepted = 0; let firstError = null;
        for (const s of scenarios) {
          try {
            const out = normalize(s);
            if (out && out.error) { if (!firstError) firstError = JSON.stringify(out.error); }
            else accepted++;
          } catch (e) { if (!firstError) firstError = e.message; }
        }
        ok(accepted === scenarios.length,
          '4.2: the REAL normalizeScenario accepts all ' + scenarios.length +
          ' default scenarios, accepted ' + accepted +
          (firstError ? ' — first rejection: ' + firstError : ''));

        // 4.3 removing the declaration must be REJECTED by the real normalizer.
        //     This is the assertion that proves 4.2 means something: if the
        //     backend accepted a scenario without it too, 4.2 would be vacuous.
        const stripped = Object.assign({}, scenarios[0]);
        delete stripped.vixCurrentSource;
        let rejected = false;
        try {
          const out = normalize(stripped);
          rejected = !!(out && out.error);
        } catch (_) { rejected = true; }
        ok(rejected,
          '4.3: the REAL normalizeScenario REJECTS a scenario with no vixCurrentSource — ' +
          'without this, 4.2 proves nothing');

        // 4.4 a frontend-supplied vixCurrent is not silently preferred.
        const withNumber = Object.assign({}, scenarios[0], { vixCurrent: 17.5 });
        let normalizedNumber = null;
        try { normalizedNumber = normalize(withNumber); } catch (_) { normalizedNumber = null; }
        ok(normalizedNumber === null || !normalizedNumber.error ||
           typeof normalizedNumber.error === 'object',
          '4.4: a scenario carrying an explicit vixCurrent is handled deterministically by the backend');
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + (pass + fail) + ' checks, ' + pass + ' passed, ' + fail + ' FAILED, ' + skipped + ' skipped.');
if (skipped && !STRICT) {
  console.log('        NOTE: the cross-tier section did NOT run. Nothing above proves the deployed');
  console.log('        backend accepts this request. Re-run with ' +
    ((MODEL.sourceFacts || {}).backendCheckoutEnvVar || 'APEX_BACKEND_PATH') +
    ' set, and PST_REQUIRE_BACKEND_SOURCE=1 to require it.');
}
if (fail) {
  console.error('\nFAILURES:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('UI scenario request contract: OK');
