'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS CLIENT — CONTRACT (PST-CLIENT-001..008).
//
// WHAT THIS PINS
//   The frontend client for POST /portfolio/stress-test/run, end to end, with no
//   network: what it sends, what it refuses to send, which transport owner it
//   goes through, and what it does with a response before letting anyone see it.
//
//   The client is deliberately the ONLY thing this suite exercises. There is no
//   renderer to test, because there is no renderer: this PR delivers the
//   contract and the parity proof, and the tab, the matrix and the scenario
//   builder come later. A test that quietly grew a renderer here would be the
//   first place that boundary eroded, so §6 asserts the boundary directly.
//
// THE TRANSPORT IS THE REAL ONE
//   §2 runs the client through the REAL `ttCall` from js/api/backend-client.js,
//   over a fake `fetch`. That is what makes "the client reuses the existing auth
//   owner" a fact rather than a claim: the assertions read the x-api-key header,
//   the session header and the composed URL out of the fetch init the real
//   transport built. A stubbed transport could never show that.
//
// Run: node tests/portfolio-stress-client-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const loader = require('./lib/load-app-source.js');

const ROOT = path.resolve(__dirname, '..');
const CLIENT_PATH = path.join(ROOT, 'js', 'services', 'portfolio-stress-client.js');
const PARITY_PATH = path.join(ROOT, 'js', 'services', 'portfolio-stress-parity.js');
const RESPONSE_PATH = path.join(ROOT, 'js', 'services', 'portfolio-stress-response.js');
const TRANSPORT_PATH = path.join(ROOT, 'js', 'api', 'backend-client.js');

// ── tiny harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
}
function section(t) { console.log('\n' + t); }

const CLIENT_SRC = fs.readFileSync(CLIENT_PATH, 'utf8');
const TRANSPORT_SRC = fs.readFileSync(TRANSPORT_PATH, 'utf8');
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}
const CLIENT_CODE = stripComments(CLIENT_SRC);

// ── a sandbox holding the three companion modules ────────────────────────────
// `S` and `BACKEND` are the monolith-owned globals the real transport reads.
// They are provided here exactly as index.html would, so the transport behaves
// as it does in the browser.
function makeSandbox(overrides) {
  const calls = { fetch: [], transport: [] };
  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    JSON, Promise, Object, Array, Error, String, Number, Boolean, Math, isFinite,
    AbortController, AbortSignal, setTimeout, clearTimeout,
    BACKEND: 'https://backend.example',
    S: { ttSessionId: 'sess-1', backendKey: 'key-1', _ttSessionSource: 'test' },
    _backendApiAuthState: {},
    _backendCandleAuth: {},
    _BACKEND_CANDLE_BACKOFF_MS: 1000,
    _candleDiagNowIso: () => '2026-08-05T00:00:00.000Z',
    __calls: calls,
  };
  Object.assign(sandbox, overrides || {});
  vm.createContext(sandbox);
  // Load order mirrors index.html: parity, response, client. The transport owner
  // is loaded too, so `ttCall` is the REAL one.
  vm.runInContext(fs.readFileSync(PARITY_PATH, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(RESPONSE_PATH, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(CLIENT_PATH, 'utf8'), sandbox);
  vm.runInContext(TRANSPORT_SRC, sandbox);
  return { sandbox, calls };
}

// A response the backend would produce: the three identifiers at the top level.
function goodResponse(extra) {
  return Object.assign({
    status: 'VALID',
    matrix: [],
    portfolioScopeParityManifestVersion: '2.0.0',
    portfolioScopeParityManifestSha256: '4a1a3d9835b0b859dc0d7452d39bca65546a654acabd6b18f7675a5d4b57fe1e',
    portfolioScopeSemanticsVersion: '2.0.0',
  }, extra || {});
}

const VALID_INPUT = { portfolioId: 'pf-1', portfolioRevision: 'rev-abc' };

// Record what the client hands the transport, without a network.
function recordingTransport(calls, response) {
  return function (p, o) { calls.transport.push({ path: p, options: o }); return Promise.resolve(response); };
}

function run(fn) { return fn().catch((e) => e); }

// ─────────────────────────────────────────────────────────────────────────────
(async function main() {

section('1. The request — endpoint, method, shape and the atomic claim');
{
  const { sandbox, calls } = makeSandbox();
  const t = recordingTransport(calls, goodResponse());
  sandbox.__t = t; sandbox.__in = VALID_INPUT;
  await vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t })', sandbox);

  const sent = calls.transport[0];
  ok(calls.transport.length === 1, '1.1: exactly one backend call is made per run');
  ok(sent.path === '/portfolio/stress-test/run', '1.2: the endpoint is POST /portfolio/stress-test/run');
  ok(sent.options.method === 'POST', '1.3: the method is POST');
  ok(vm.runInContext('PORTFOLIO_STRESS_RUN_PATH', sandbox) === '/portfolio/stress-test/run',
    '1.4: the endpoint is declared once, as a constant');

  const body = sent.options.body;
  const keys = Object.keys(body).sort();
  ok(keys.join(',') === 'overlay,portfolioId,portfolioRevision,portfolioScopeParity,pricingConfiguration,scenarios',
    '1.5: the payload carries exactly the six declared fields, got [' + keys.join(',') + ']');
  ok(body.portfolioId === 'pf-1' && body.portfolioRevision === 'rev-abc',
    '1.6: the portfolio id and revision are sent as given');
  ok(Array.isArray(body.scenarios) && body.scenarios.length === 0, '1.7: scenarios defaults to an empty array');
  ok(body.overlay && Array.isArray(body.overlay.legs), '1.8: overlay is { legs: [] }');
  ok(body.pricingConfiguration && typeof body.pricingConfiguration === 'object',
    '1.9: pricingConfiguration is an object');

  const claim = body.portfolioScopeParity;
  ok(claim && Object.keys(claim).length === 3, '1.10: the request always carries the complete parity triple');
  ok(claim.portfolioScopeParityManifestVersion === '2.0.0' &&
     claim.portfolioScopeParityManifestSha256 === '4a1a3d9835b0b859dc0d7452d39bca65546a654acabd6b18f7675a5d4b57fe1e' &&
     claim.portfolioScopeSemanticsVersion === '2.0.0',
    '1.11: the claim carries the manifest 2.0.0 identity hash and semantics 2.0.0');

  // The claim comes from the parity owner, not from a literal in the client.
  ok(!/4a1a3d98/.test(CLIENT_CODE), '1.12: the client does not hard-code the manifest hash — it asks the parity owner');
  ok(/buildPortfolioScopeParityClaim\(\)/.test(CLIENT_CODE), '1.13: the client builds its claim through the identity owner');
}

section('2. The request goes through the EXISTING transport and auth owner');
{
  // No stub: the real ttCall, over a fake fetch. Everything asserted below was
  // built by the transport owner, not by the client.
  const { sandbox, calls } = makeSandbox();
  sandbox.fetch = function (url, init) {
    calls.fetch.push({ url, init });
    return Promise.resolve({
      ok: true, status: 200,
      text: () => Promise.resolve(JSON.stringify(goodResponse())),
    });
  };
  sandbox.__in = VALID_INPUT;
  const result = await vm.runInContext('runPortfolioStressTestRequest(__in)', sandbox);

  ok(calls.fetch.length === 1, '2.1: the default transport reaches the network exactly once');
  const f = calls.fetch[0];
  ok(f.url === 'https://backend.example/portfolio/stress-test/run',
    '2.2: the URL is composed by the transport owner from BACKEND + path');
  ok(f.init.method === 'POST', '2.3: the transport owner sends POST');
  ok(f.init.headers['x-api-key'] === 'key-1', '2.4: the existing AUTH owner supplies x-api-key');
  ok(f.init.headers['x-session-id'] === 'sess-1', '2.5: the existing auth owner supplies x-session-id');
  ok(f.init.headers['Content-Type'] === 'application/json', '2.6: the transport owner owns the JSON content type');
  const parsed = JSON.parse(f.init.body);
  ok(parsed.portfolioScopeParity && Object.keys(parsed.portfolioScopeParity).length === 3,
    '2.7: the complete claim survives serialization by the transport owner');
  ok(result && result.status === 'VALID', '2.8: the verified result is returned to the caller');

  // The client itself owns none of that.
  ok(!/\bfetch\s*\(/.test(CLIENT_CODE), '2.9: the client contains no fetch call of its own');
  ok(!/BACKEND\b/.test(CLIENT_CODE), '2.10: the client composes no backend URL of its own');
  ok(!/x-api-key|x-session-id|backendKey|_backendAuthHeaders/.test(CLIENT_CODE),
    '2.11: the client reads no key and builds no auth header of its own');
  ok(/typeof ttCall === 'function'/.test(CLIENT_CODE), '2.12: the default transport IS the canonical ttCall');
  ok(!/XMLHttpRequest|navigator\.sendBeacon|WebSocket|EventSource/.test(CLIENT_CODE),
    '2.13: no second HTTP system is introduced');
}

section('3. portfolioRevision is mandatory, and the forbidden fields are refused');
{
  const { sandbox, calls } = makeSandbox();
  sandbox.__t = recordingTransport(calls, goodResponse());

  const reject = async (input, label) => {
    sandbox.__in = input;
    const e = await run(() => vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t })', sandbox));
    ok(e instanceof Error && e.code === 'PORTFOLIO_STRESS_REQUEST_INVALID', label);
    return e;
  };

  await reject({ portfolioId: 'pf-1' }, '3.1: a run with no portfolioRevision is refused');
  await reject({ portfolioId: 'pf-1', portfolioRevision: '' }, '3.2: an empty portfolioRevision is refused');
  await reject({ portfolioId: 'pf-1', portfolioRevision: '   ' }, '3.3: a blank portfolioRevision is refused');
  await reject({ portfolioId: 'pf-1', portfolioRevision: 123 }, '3.4: a non-string portfolioRevision is refused');
  await reject({ portfolioRevision: 'rev-abc' }, '3.5: a run with no portfolioId is refused');

  const e6 = await reject(Object.assign({}, VALID_INPUT, { positions: [{ ticker: 'AAPL' }] }),
    '3.6: a client-supplied positions array is refused');
  ok(e6.errors.some((x) => x.field === 'positions'), '3.6b: the refusal names the positions field');

  await reject(Object.assign({}, VALID_INPUT, { marketSnapshot: { spy: 600 } }),
    '3.7: a client-supplied marketSnapshot is refused');
  await reject(Object.assign({}, VALID_INPUT, { spySnapshotPrice: 600 }),
    '3.8: a client-supplied spySnapshotPrice is refused');
  await reject(Object.assign({}, VALID_INPUT, { spyPrice: 600 }), '3.9: a client-supplied spyPrice is refused');
  await reject(Object.assign({}, VALID_INPUT, { snapshot: {} }), '3.10: a client-supplied snapshot is refused');

  ok(calls.transport.length === 0, '3.11: NOTHING was sent for any refused request');

  // Not merely dropped: dropping them would let a caller believe it had set the
  // price, which is the failure the backend validator refuses for the same reason.
  const { sandbox: s2, calls: c2 } = makeSandbox();
  s2.__t = recordingTransport(c2, goodResponse());
  s2.__in = Object.assign({}, VALID_INPUT, { scenarios: [{ scenarioId: 'a' }] });
  await vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t })', s2);
  const body = c2.transport[0].options.body;
  for (const forbidden of ['positions', 'marketSnapshot', 'spySnapshotPrice', 'spyPrice', 'snapshot']) {
    ok(!(forbidden in body), '3.12: the payload never carries ' + forbidden);
  }
  ok(JSON.stringify(body).indexOf('"positions"') === -1, '3.13: no positions key appears anywhere in the payload');
  ok(body.scenarios.length === 1, '3.14: legitimate scenarios are passed through');
}

section('4. AbortSignal is honoured before dispatch and propagated to the transport');
{
  const { sandbox, calls } = makeSandbox();
  sandbox.__t = recordingTransport(calls, goodResponse());

  // Already aborted: nothing is sent at all.
  const c1 = new AbortController(); c1.abort();
  sandbox.__in = VALID_INPUT; sandbox.__sig = c1.signal;
  const e1 = await run(() => vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t, signal: __sig })', sandbox));
  ok(e1 instanceof Error && e1.code === 'PORTFOLIO_STRESS_ABORTED', '4.1: an already-aborted signal rejects the run');
  ok(e1.name === 'AbortError', '4.2: the rejection is an AbortError');
  ok(calls.transport.length === 0, '4.3: nothing is sent when the signal is already aborted');

  // A live signal is forwarded to the transport.
  const c2 = new AbortController();
  sandbox.__sig = c2.signal;
  await vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t, signal: __sig })', sandbox);
  ok(calls.transport.length === 1 && calls.transport[0].options.signal === c2.signal,
    '4.4: the caller signal is forwarded to the transport owner');

  // ...and the REAL transport turns it into a fetch that the caller can cancel.
  const { sandbox: s3, calls: c3 } = makeSandbox();
  s3.fetch = function (url, init) {
    c3.fetch.push({ url, init });
    return new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  };
  const c4 = new AbortController();
  s3.__in = VALID_INPUT; s3.__sig = c4.signal;
  const pending = run(() => vm.runInContext('runPortfolioStressTestRequest(__in, { signal: __sig })', s3));
  await new Promise((r) => setTimeout(r, 0));
  ok(c3.fetch.length === 1 && c3.fetch[0].init.signal && c3.fetch[0].init.signal.aborted === false,
    '4.5: the real transport passes a live signal to fetch');
  c4.abort();
  const e2 = await pending;
  ok(e2 instanceof Error, '4.6: aborting the caller signal cancels the in-flight request');
  ok(c3.fetch[0].init.signal.aborted === true, '4.7: the abort reached the fetch the transport owner started');

  // Without a caller signal the transport behaves exactly as it always did.
  ok(/AbortSignal\.timeout\(20000\)/.test(TRANSPORT_SRC),
    '4.8: the transport keeps its 20s timeout when no caller signal is supplied');
  ok(/if\s*\(!callerSignal\)\s*return timeout;/.test(stripComments(TRANSPORT_SRC)),
    '4.9: the signal composition is a no-op for every existing call site');
}

section('5. Parity is verified BEFORE the response is exposed');
{
  const base = goodResponse({ matrix: [{ scenarioId: 's1' }] });

  const runWith = async (response) => {
    const { sandbox, calls } = makeSandbox();
    sandbox.__t = recordingTransport(calls, response);
    sandbox.__in = VALID_INPUT;
    return run(() => vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t })', sandbox));
  };

  const good = await runWith(base);
  ok(!(good instanceof Error), '5.1: a complete, correct triple is accepted');
  ok(good.cells.length === 1 && good.portfolioScopeParity, '5.2: the verified result exposes the matrix and the identity');

  const extra = await runWith(goodResponse({ harmlessExtraField: 'ignored', matrix: [] }));
  ok(!(extra instanceof Error), '5.3: a harmless extra field does not reject a correct response');

  const FIELDS = ['portfolioScopeParityManifestVersion', 'portfolioScopeParityManifestSha256', 'portfolioScopeSemanticsVersion'];
  for (const f of FIELDS) {
    const missing = goodResponse(); delete missing[f];
    const e1 = await runWith(missing);
    ok(e1 instanceof Error && e1.code === 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE',
      '5.4: a response missing ' + f + ' is rejected with the canonical error');

    const e2 = await runWith(goodResponse({ [f]: 'something-else' }));
    ok(e2 instanceof Error && e2.code === 'PORTFOLIO_SCOPE_PARITY_DIVERGENCE',
      '5.5: a response divergent in ' + f + ' is rejected');
    ok(e2.mismatches.length === 1 && e2.mismatches[0].field === f,
      '5.5b: the diagnostics name exactly ' + f);

    ok((await runWith(goodResponse({ [f]: null }))) instanceof Error, '5.6: a null ' + f + ' is rejected');
    ok((await runWith(goodResponse({ [f]: '' }))) instanceof Error, '5.7: an empty ' + f + ' is rejected');
  }

  ok((await runWith({})) instanceof Error, '5.8: an empty response object is rejected');
  ok((await runWith(null)) instanceof Error, '5.9: a null response is rejected');
  ok((await runWith({ portfolioScopeParity: 'not-an-object' })) instanceof Error,
    '5.10: an invalid identity object is rejected');

  // A divergent run must not leak its numbers, and its diagnostics must not
  // carry Portfolio data.
  const diverged = await runWith(goodResponse({
    portfolioScopeSemanticsVersion: '1.0.0',
    matrix: [{ scenarioId: 's1', actualStressPnl: -12345 }],
  }));
  ok(diverged instanceof Error, '5.11: a divergent run is an error, not a degraded result');
  ok(diverged.cells === undefined && JSON.stringify(diverged.mismatches).indexOf('12345') === -1,
    '5.12: no number from a divergent run reaches the caller');
}

section('6. The boundary — no renderer, no persistence, no orders, no cache');
{
  for (const [label, re] of [
    ['DOM access', /\bdocument\b|\bwindow\.|innerHTML|querySelector|createElement|appendChild|getElementById/],
    ['a timer', /setInterval\s*\(|setTimeout\s*\(/],
    ['an event listener', /addEventListener\s*\(/],
    ['storage', /localStorage|sessionStorage|indexedDB/],
    ['journal persistence', /saveJournal|journalSave|persistJournal|saveTrade|_saveJ\b/],
    ['order placement', /placeOrder|submitOrder|sendOrder|createOrder|orderTicket/],
    ['overlay persistence', /saveOverlay|persistOverlay|storeOverlay/],
    ['a result cache', /_cache\b|Cache\s*=|memo(?:ize)?\s*\(|new Map\(/],
    ['a renderer', /render[A-Z]|Html\s*\(|\.style\b/],
  ]) {
    ok(!re.test(CLIENT_CODE), '6.1: the client contains no ' + label);
  }

  // Inert at load: loading the module must make no call and leave no timer.
  const { sandbox, calls } = makeSandbox({
    fetch: function () { throw new Error('the module must not fetch at load time'); },
  });
  ok(calls.fetch.length === 0 && calls.transport.length === 0, '6.2: loading the module performs no request');
  ok(typeof vm.runInContext('buildPortfolioStressRunRequest', sandbox) === 'function',
    '6.3: the module exposes its builder after an inert load');

  // Building a request is pure: same input, same output, no I/O.
  sandbox.__in = VALID_INPUT;
  const a = vm.runInContext('JSON.stringify(buildPortfolioStressRunRequest(__in))', sandbox);
  const b = vm.runInContext('JSON.stringify(buildPortfolioStressRunRequest(__in))', sandbox);
  ok(a === b, '6.4: the request builder is pure and deterministic');
  ok(calls.fetch.length === 0, '6.5: building a request performs no request');

  // Two identical runs must both reach the backend: no memoized answer.
  const { sandbox: s2, calls: c2 } = makeSandbox();
  s2.__t = recordingTransport(c2, goodResponse());
  s2.__in = VALID_INPUT;
  await vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t })', s2);
  await vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t })', s2);
  ok(c2.transport.length === 2, '6.6: an identical second run is NOT served from a frontend cache');

  // The client speaks to one endpoint only.
  const paths = (CLIENT_CODE.match(/'\/[a-z0-9\-/:]+'/gi) || []).filter((p) => p.indexOf('/') === 1);
  ok(paths.length === 1 && paths[0] === "'/portfolio/stress-test/run'",
    '6.7: exactly one endpoint literal exists in the client, got ' + JSON.stringify(paths));
}

section('7. Transport failures surface as errors, not as empty results');
{
  const { sandbox } = makeSandbox();
  sandbox.__t = function () { return Promise.reject(new Error('HTTP 500: stress_run_failed')); };
  sandbox.__in = VALID_INPUT;
  const e = await run(() => vm.runInContext('runPortfolioStressTestRequest(__in, { transport: __t })', sandbox));
  ok(e instanceof Error && /500/.test(e.message), '7.1: a backend error propagates to the caller unchanged');

  const { sandbox: s2 } = makeSandbox({ ttCall: undefined });
  vm.runInContext('ttCall = undefined;', s2);
  s2.__in = VALID_INPUT;
  const e2 = await run(() => vm.runInContext('runPortfolioStressTestRequest(__in, { transport: null })', s2));
  ok(e2 instanceof Error && e2.code === 'PORTFOLIO_STRESS_TRANSPORT_UNAVAILABLE',
    '7.2: an absent transport owner is a named error, never a silent no-op');
}

// ── summary ─────────────────────────────────────────────────────────────────
console.log(fail === 0
  ? '\nAll ' + pass + ' assertions passed.'
  : '\n' + pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.');
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);

})().catch((e) => { console.error(e); process.exit(1); });
