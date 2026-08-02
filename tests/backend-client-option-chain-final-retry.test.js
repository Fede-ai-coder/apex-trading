'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// OPTION-CHAIN FINAL TRANSPORT RETRY — backend-client route-local regression.
//
// Existing UI behaviour performs one clean refresh=1 request after the initial
// option-chain timeout. The backend client gives ONLY that refresh request one
// final transport attempt, so the hard maximum is three real HTTP calls:
// initial read + UI retry + final transport retry. Concurrent refresh=1 callers
// share the same transport lifecycle.
//
// Run: node tests/backend-client-option-chain-final-retry.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const loader = require('./lib/load-app-source');

const TT_CALL_SRC = loader.extractFunctionSource('ttCall', {
  source: loader.loadAppJavaScriptSource(),
});

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) passed++;
  else { failed++; console.error('  ✗ ' + msg); }
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  assert(a === e, msg + (a === e ? '' : ' — got ' + a + ', expected ' + e));
}
function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
  };
}
function timeoutError() {
  const e = new Error('The operation was aborted due to timeout');
  e.name = 'TimeoutError';
  return e;
}

function makeSandbox(fetchImpl) {
  const calls = [];
  const delays = [];
  const logs = [];
  const abortDurations = [];
  const auth = [];
  const sb = {
    console: {
      log: (...args) => logs.push(args.join(' ')),
      warn: () => {},
      error: () => {},
    },
    JSON, Math, Number, String, Object, Array, Promise, Error,
    encodeURIComponent, decodeURIComponent, parseInt, parseFloat, RegExp,
    BACKEND: 'https://backend.test',
    S: { ttSessionId: 'session', backendKey: 'key', _ttSessionSource: 'memory' },
    AbortSignal: {
      timeout: (ms) => {
        abortDurations.push(ms);
        return { timeoutMs: ms };
      },
    },
    setTimeout: (fn, ms) => {
      delays.push(ms);
      fn();
      return 1;
    },
    _recordBackendApiAuthResult: (endpoint, status) => auth.push([endpoint, status]),
    fetch: async (url, init) => {
      calls.push({ url, init });
      return fetchImpl(url, init, calls.length);
    },
  };
  vm.createContext(sb);
  vm.runInContext(TT_CALL_SRC, sb);
  sb.__calls = calls;
  sb.__delays = delays;
  sb.__logs = logs;
  sb.__abortDurations = abortDurations;
  sb.__auth = auth;
  return sb;
}

(async () => {
  // 1. Initial non-refresh option-chain reads keep the existing single-attempt
  // behaviour. The higher UI layer owns the first clean retry.
  {
    const sb = makeSandbox(async () => { throw timeoutError(); });
    let caught = null;
    try { await sb.ttCall('/option-chains/MU/nested'); } catch (e) { caught = e; }
    assert(caught && caught.name === 'TimeoutError', '1: initial chain timeout propagates unchanged');
    assert(sb.__calls.length === 1, '1: initial non-refresh chain read performs exactly one transport attempt');
    eq(sb.__delays, [], '1: initial read schedules no internal delay/retry');
  }

  // 2. The refresh request gets one final transport attempt after 2.5 seconds.
  {
    const sb = makeSandbox(async (_url, _init, n) => {
      if (n === 1) throw timeoutError();
      return response(200, { ok: true, data: { items: [] } });
    });
    const out = await sb.ttCall('/option-chains/MU/nested?refresh=1');
    assert(out && out.ok === true, '2: refresh returns the successful second transport response');
    assert(sb.__calls.length === 2, '2: refresh timeout produces exactly one final transport retry');
    eq(sb.__delays, [2500], '2: final retry waits exactly 2500ms');
    eq(sb.__abortDurations, [20000, 20000], '2: both attempts retain the 20s request timeout');
    assert(sb.__logs.filter((l) => l.includes('final transport retry scheduled ticker=MU attempt=3')).length === 1,
      '2: final retry is logged once as overall attempt 3');
  }

  // 3. Permanent timeout remains bounded: two refresh transports, never a third.
  {
    const sb = makeSandbox(async () => { throw timeoutError(); });
    let caught = null;
    try { await sb.ttCall('/option-chains/MU/nested?refresh=1'); } catch (e) { caught = e; }
    assert(caught && caught.name === 'TimeoutError', '3: final timeout propagates to the existing UI banner');
    assert(sb.__calls.length === 2, '3: refresh path stops after two transport attempts');
    eq(sb.__delays, [2500], '3: only one retry delay is scheduled');
  }

  // 4. Concurrent manual refresh callers share one HTTP lifecycle. This closes
  // the requestId 23/24/25 network storm shown by the live log.
  {
    let releaseFirst;
    const gate = new Promise((resolve) => { releaseFirst = resolve; });
    let first = true;
    const sb = makeSandbox(async () => {
      if (first) {
        first = false;
        await gate;
        throw timeoutError();
      }
      return response(200, { ok: true, source: 'cache_hit' });
    });
    const p1 = sb.ttCall('/option-chains/MU/nested?refresh=1');
    const p2 = sb.ttCall('/option-chains/MU/nested?refresh=1');
    const p3 = sb.ttCall('/option-chains/MU/nested?refresh=1');
    await Promise.resolve();
    assert(sb.__calls.length === 1, '4: three concurrent callers launch only the first HTTP request');
    releaseFirst();
    const results = await Promise.all([p1, p2, p3]);
    assert(sb.__calls.length === 2, '4: shared lifecycle performs one final retry, not one per caller');
    assert(results.every((r) => r && r.ok === true), '4: every deduped caller receives the shared successful result');
    assert(sb.__logs.filter((l) => l.includes('transport dedup hit')).length === 2,
      '4: second and third callers are explicitly transport-deduped');
  }

  // 5. Unrelated endpoints are untouched: no hidden retry or delay.
  {
    const sb = makeSandbox(async () => { throw timeoutError(); });
    let caught = null;
    try { await sb.ttCall('/scanner'); } catch (e) { caught = e; }
    assert(caught && caught.name === 'TimeoutError', '5: unrelated timeout propagates unchanged');
    assert(sb.__calls.length === 1, '5: unrelated endpoint remains single-attempt');
    eq(sb.__delays, [], '5: unrelated endpoint schedules no retry delay');
  }

  // 6. Non-timeout option-chain errors are never retried.
  {
    const sb = makeSandbox(async () => response(401, { error: 'unauthorized session' }));
    let caught = null;
    try { await sb.ttCall('/option-chains/MU/nested?refresh=1'); } catch (e) { caught = e; }
    assert(caught && caught.message === 'unauthorized session', '6: auth error retains the existing message');
    assert(sb.__calls.length === 1, '6: non-timeout option-chain error is not retried');
    eq(sb.__delays, [], '6: non-timeout error schedules no delay');
    eq(sb.__auth, [['/option-chains/MU/nested', 401]], '6: auth recorder still receives the failed response');
  }

  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed) process.exit(1);
})().catch((e) => {
  console.error(e && e.stack || e);
  process.exit(1);
});
