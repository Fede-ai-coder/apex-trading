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
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
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
// §4 is ASYNC, because the backend engine is an ES MODULE.
//
// The first real run of this suite in CI is what established that: it located
// lib/portfolio-stress-scenarios.js at the audited commit, tried to evaluate it
// as CommonJS, and got "Cannot use import statement outside a module". That is
// the suite doing its job — a closed-loop test could not have discovered it.
//
// So the module is loaded by DYNAMIC IMPORT of the real file, which also lets
// its own relative imports resolve. That means reading the WORKING TREE rather
// than `git show <commit>:<path>`, and the guarantee is preserved by checking
// FIRST that the checkout is exactly the audited commit. A checkout on any other
// commit is refused rather than quietly trusted.
async function crossTierSection() {
  section('4. The REAL backend accepts what the UI builds');

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
  if (!backendRoot) {
    return unavailable('no apex-backend checkout is reachable (set ' + envVar + ') — ' +
      'the REAL normalizeScenario was NOT exercised, so nothing here proves the backend accepts this request');
  }
  if (!/^[0-9a-f]{40}$/.test(AUDITED)) {
    return unavailable('the model records no audited implementation commit');
  }

  // The checkout must BE the audited commit. Dynamic import reads the working
  // tree, so without this the suite could be exercising any commit at all.
  let headSha = null;
  try {
    headSha = execFileSync('git', ['-C', backendRoot, 'rev-parse', 'HEAD'],
      { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch (_) { headSha = null; }
  if (headSha !== AUDITED) {
    return unavailable('the apex-backend checkout is at ' + String(headSha).slice(0, 12) +
      ', not the audited commit ' + AUDITED.slice(0, 12) + ' — the working tree is only trusted when it IS that commit');
  }
  ok(true, '4.0: the apex-backend checkout is exactly the audited commit ' + AUDITED.slice(0, 12));

  // Locate the normalizer by NAME across the engine modules, so a relocation on
  // the backend side reports "not found" instead of silently skipping.
  const candidates = ['lib/portfolio-stress-scenarios.js', 'lib/portfolio-stress-engine.js',
    'lib/portfolio-stress.js', 'lib/portfolio-stress-scenarios.mjs'];
  let engineRel = null;
  for (const c of candidates) {
    const abs = path.join(backendRoot, c);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (/(?:export\s+)?(?:async\s+)?function\s+normalizeScenario\s*\(|normalizeScenario\s*[:=]\s*(?:async\s*)?(?:function|\()/.test(text)) {
      engineRel = c; break;
    }
  }
  if (!engineRel) {
    return unavailable('normalizeScenario was not found at ' + AUDITED.slice(0, 12) +
      ' in any of: ' + candidates.join(', '));
  }
  ok(true, '4.1: normalizeScenario located in ' + engineRel + ' at ' + AUDITED.slice(0, 12));

  let mod = null;
  try {
    mod = await import(pathToFileURL(path.join(backendRoot, engineRel)).href);
  } catch (e) {
    return unavailable('the backend engine module did not import: ' + e.message);
  }
  const normalize = (mod && (mod.normalizeScenario || (mod.default && mod.default.normalizeScenario))) || null;
  if (typeof normalize !== 'function') {
    return unavailable('normalizeScenario is not an export of ' + engineRel +
      ' (exports: ' + Object.keys(mod || {}).join(', ') + ')');
  }
  ok(true, '4.1b: normalizeScenario is callable');

  const { sandbox: ui } = H.makeSandbox({});
  const scenarios = ui.buildPortfolioStressUiScenarios(ui.portfolioStressUiDefaultGrid());

  // A rejection may be signalled by a thrown error or by a returned error shape;
  // both are treated as rejection so the assertion does not depend on which
  // convention the backend picked.
  const run = (scenario) => {
    try {
      const out = normalize(scenario);
      if (out && (out.error || out.ok === false || out.valid === false)) {
        return { accepted: false, detail: JSON.stringify(out.error || out) };
      }
      return { accepted: true, out: out };
    } catch (e) { return { accepted: false, detail: e.message }; }
  };

  // 4.2 EVERY default scenario the UI produces must be accepted.
  let accepted = 0; let firstRejection = null;
  for (const s of scenarios) {
    const r = run(s);
    if (r.accepted) accepted++;
    else if (!firstRejection) firstRejection = r.detail;
  }
  ok(accepted === scenarios.length,
    '4.2: the REAL normalizeScenario accepts all ' + scenarios.length + ' default scenarios, accepted ' +
    accepted + (firstRejection ? ' — first rejection: ' + firstRejection : ''));

  // 4.3 THE NEGATIVE CONTROL. Removing the declaration must be REJECTED. Without
  //     this, 4.2 is vacuous: a normalizer that accepted anything would pass it.
  const stripped = Object.assign({}, scenarios[0]);
  delete stripped.vixCurrentSource;
  ok(run(stripped).accepted === false,
    '4.3: the REAL normalizeScenario REJECTS a scenario with no vixCurrentSource — ' +
    'without this negative control, 4.2 proves nothing');

  // 4.4 The declared token must be the one the backend recognises: a different
  //     source string must not be accepted as equivalent.
  const wrongSource = Object.assign({}, scenarios[0], { vixCurrentSource: 'FRONTEND_LIVE_QUOTE' });
  ok(run(wrongSource).accepted === false,
    '4.4: an unrecognised vixCurrentSource is REJECTED — the accepted token is not arbitrary');
}

// ─────────────────────────────────────────────────────────────────────────────
crossTierSection().then(function () {
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
}).catch(function (e) {
  console.error('  \u2717 the cross-tier section threw: ' + (e && e.stack || e));
  process.exit(1);
});
