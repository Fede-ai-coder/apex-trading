'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND CONFIG CONTRACT — pin the REAL behaviour of the backend URL config
// after it moves out of index.html into js/config/backend-config.js.
//
// WHY THIS EXISTS
//   The roadmap block moves the backend URL configuration (PROD_BACKEND,
//   DEV_BACKEND, resolveBackendUrl, the global BACKEND and the [BACKEND CONFIG]
//   log) out of the inline monolith into js/config/backend-config.js, loaded as
//   a CLASSIC script after js/api/backend-client.js and before the inline
//   monolith. This test freezes the observable contract so the extraction is
//   proven behaviour-preserving: same resolved URL, same override precedence,
//   same log, same binding form, same side effects, same execution order.
//
//   The REAL block is loaded through the shared loader
//   (tests/lib/load-app-source.js) — NOT copied — so it transparently tracks the
//   block wherever it lives (index.html today via the loader, backend-config.js
//   after the move). The block is executed in a fresh `vm` context per scenario
//   with a simulated window/location so its real logic drives every assertion.
//
//   Every expected value below was derived from the CURRENT source, not from any
//   external convention. Where the real code ignores an input the naive reader
//   might expect it to honour, the test pins the REAL behaviour (documented):
//     • The ONLY override is window.__APEX_BACKEND_URL__ (trimmed, one trailing
//       slash removed). There is NO query-string override, NO localStorage
//       override, NO ENV object.
//     • resolveBackendUrl reads location.hostname ONLY — never protocol, never
//       port, never search. HTTP vs HTTPS and any port are irrelevant.
//     • Dev backend for localhost / 127.0.0.1 / any host containing
//       "deploy-preview" / any host containing
//       "--spontaneous-queijadas-118823.netlify.app"; production otherwise.
//     • BACKEND is a top-level `const` (lexical) — NOT window.BACKEND. So inside
//       a fresh script `typeof BACKEND === 'string'` while
//       `typeof window.BACKEND === 'undefined'`.
//     • Exactly ONE [BACKEND CONFIG] log per load. No fallback logs, no errors.
//
// Run: node tests/backend-config-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const loader = require('./lib/load-app-source');

const REPO_ROOT      = path.resolve(__dirname, '..');
const INDEX_HTML     = path.join(REPO_ROOT, 'index.html');
const CONFIG_FILE    = path.join(REPO_ROOT, 'js', 'config', 'backend-config.js');
const BACKEND_CLIENT = './js/api/backend-client.js';
const CONFIG_SRC_TAG = './js/config/backend-config.js';

const PROD = 'https://apex-tastytrade-backend-production.up.railway.app';
const DEV  = 'https://apex-tastytrade-backend-dev-production.up.railway.app';

// ── Assertion harness ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(msg, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('  FAIL  ' + msg); }
}
function eq(actual, expected, msg) {
  check(msg + '  (got ' + JSON.stringify(actual) + ')', actual === expected);
}
function section(t) { console.log('\n' + t); }

// The full application source, reconstructed in browser execution order from the
// <script> tags in index.html (inline + local scripts). After the move this
// automatically includes js/config/backend-config.js.
const APP_SRC = loader.loadAppJavaScriptSource();

// Extract the REAL backend-config block from the reconstructed source: from the
// PROD_BACKEND declaration through the end of the [BACKEND CONFIG] log line. This
// is the contiguous block the app executes at load — extracted, never copied.
function extractBackendConfigBlock(src) {
  const start = src.indexOf('const PROD_BACKEND =');
  if (start < 0) throw new Error('backend-config block: PROD_BACKEND not found');
  const logIdx = src.indexOf("console.log('[BACKEND CONFIG] host=", start);
  if (logIdx < 0) throw new Error('backend-config block: [BACKEND CONFIG] log not found');
  const nl = src.indexOf('\n', logIdx);
  return src.slice(start, nl < 0 ? src.length : nl + 1);
}
const BLOCK = extractBackendConfigBlock(APP_SRC);

// Execute the REAL block in a fresh vm context with a simulated environment.
// A reader appended in the SAME script captures the lexical `const BACKEND`
// exactly as a later classic script (the monolith / backend-client.js) would
// read it — this is faithful to the shared global-lexical environment browsers
// give classic scripts, and it never mutates the block.
function runBlock(env) {
  const logs = [];
  const sandbox = {
    console: { log: function () { logs.push(Array.prototype.join.call(arguments, ' ')); } },
    String: String,
    RegExp: RegExp,
    window: {},
    location: {},
  };
  if ('override' in env) sandbox.window.__APEX_BACKEND_URL__ = env.override;
  sandbox.location.hostname = env.hostname;
  if ('protocol' in env) sandbox.location.protocol = env.protocol;
  if ('port' in env)     sandbox.location.port     = env.port;
  if ('search' in env)   sandbox.location.search   = env.search;
  // A localStorage the resolver must NOT touch — present to prove it is ignored.
  sandbox.localStorage = { getItem: function () { return env.ls != null ? env.ls : null; } };

  vm.createContext(sandbox);
  let err = null, backend, typeofBackend, typeofWindowBackend;
  sandbox.__cap = function (b, t, tw) { backend = b; typeofBackend = t; typeofWindowBackend = tw; };
  try {
    vm.runInContext(
      BLOCK + "\n;__cap(typeof BACKEND!=='undefined'?BACKEND:undefined, typeof BACKEND, typeof window.BACKEND);",
      sandbox
    );
  } catch (e) {
    err = String((e && e.message) || e);
  }
  return { backend: backend, typeofBackend: typeofBackend, typeofWindowBackend: typeofWindowBackend, logs: logs, err: err };
}

// ═════════════════════════════════════════════════════════════════════════════
section('1. Configuration matrix — resolved BACKEND, exact log, log count, errors');
// Each row is derived from the REAL resolver. `expect` is the exact BACKEND the
// real code returns; the log is asserted verbatim; exactly one log; no error.
const MATRIX = [
  { name: 'localhost → dev',                         env: { hostname: 'localhost' },                                                              expect: DEV },
  { name: '127.0.0.1 → dev',                         env: { hostname: '127.0.0.1' },                                                              expect: DEV },
  { name: 'production netlify host → prod',          env: { hostname: 'spontaneous-queijadas-118823.netlify.app' },                               expect: PROD },
  { name: 'deploy-preview → dev',                    env: { hostname: 'deploy-preview-190--spontaneous-queijadas-118823.netlify.app' },           expect: DEV },
  { name: 'netlify branch deploy → dev',             env: { hostname: 'somebranch--spontaneous-queijadas-118823.netlify.app' },                   expect: DEV },
  { name: 'unrecognized host → prod (fallback)',     env: { hostname: 'example.com' },                                                            expect: PROD },
  { name: 'empty host → prod (fallback)',            env: { hostname: '' },                                                                       expect: PROD },
  { name: 'http protocol is ignored',                env: { hostname: 'example.com', protocol: 'http:' },                                         expect: PROD },
  { name: 'https protocol is ignored',               env: { hostname: 'localhost', protocol: 'https:' },                                          expect: DEV },
  { name: 'port present is ignored',                 env: { hostname: 'localhost', port: '8080' },                                                expect: DEV },
  { name: 'port absent is ignored',                  env: { hostname: 'localhost', port: '' },                                                    expect: DEV },
  { name: 'query string is ignored',                 env: { hostname: 'example.com', search: '?backend=https://x' },                              expect: PROD },
  { name: 'localStorage is ignored',                 env: { hostname: 'example.com', ls: 'https://ls-override' },                                 expect: PROD },
  { name: 'override wins on production host',         env: { hostname: 'spontaneous-queijadas-118823.netlify.app', override: 'https://custom.example.com' }, expect: 'https://custom.example.com' },
  { name: 'override wins on dev host',               env: { hostname: 'localhost', override: 'https://custom.example.com' },                      expect: 'https://custom.example.com' },
  { name: 'override: one trailing slash removed',    env: { hostname: 'localhost', override: 'https://x.example/' },                              expect: 'https://x.example' },
  { name: 'override: surrounding whitespace trimmed',env: { hostname: 'localhost', override: '  https://y.example/  ' },                          expect: 'https://y.example' },
  { name: 'override empty string → falls through',   env: { hostname: 'localhost', override: '' },                                                expect: DEV },
  { name: 'override whitespace-only → falls through',env: { hostname: 'localhost', override: '   ' },                                             expect: DEV },
];

MATRIX.forEach(function (row) {
  const r = runBlock(row.env);
  eq(r.backend, row.expect, '1. ' + row.name + ': BACKEND value');
  eq(r.err, null, '1. ' + row.name + ': no exception thrown');
  eq(r.logs.length, 1, '1. ' + row.name + ': exactly one [BACKEND CONFIG] log');
  const expectedLog = '[BACKEND CONFIG] host=' + (row.env.hostname || '') + ' backend=' + row.expect;
  eq(r.logs[0], expectedLog, '1. ' + row.name + ': exact log line');
});

// ═════════════════════════════════════════════════════════════════════════════
section('2. Global binding form — const (lexical), NOT window.BACKEND');
{
  const r = runBlock({ hostname: 'localhost' });
  eq(r.typeofBackend, 'string', '2. typeof BACKEND is "string" (declared/visible)');
  eq(r.typeofWindowBackend, 'undefined', '2. typeof window.BACKEND is "undefined" (not a window property)');
  // The block must declare BACKEND as a top-level `const`, never window.BACKEND.
  check('2. block declares "const BACKEND ="', BLOCK.indexOf('const BACKEND =') !== -1);
  check('2. block does NOT assign window.BACKEND', BLOCK.indexOf('window.BACKEND') === -1);
  check('2. resolver is a classic function declaration (not arrow)',
    /function\s+resolveBackendUrl\s*\(/.test(BLOCK) && BLOCK.indexOf('resolveBackendUrl=') === -1 && BLOCK.indexOf('resolveBackendUrl =') === -1);
  check('2. PROD_BACKEND / DEV_BACKEND declared as const',
    /const PROD_BACKEND =/.test(BLOCK) && /const DEV_BACKEND =/.test(BLOCK));
}

// ═════════════════════════════════════════════════════════════════════════════
section('3. Environment precedence order (highest → lowest)');
{
  // 1) window.__APEX_BACKEND_URL__ override beats every host rule.
  eq(runBlock({ hostname: 'localhost', override: 'https://o' }).backend, 'https://o', '3. override beats localhost');
  eq(runBlock({ hostname: 'spontaneous-queijadas-118823.netlify.app', override: 'https://o' }).backend, 'https://o', '3. override beats production');
  // 2) localhost / 127.0.0.1 → dev, 3) deploy-preview → dev, 4) branch deploy → dev
  eq(runBlock({ hostname: 'localhost' }).backend, DEV, '3. localhost → dev');
  eq(runBlock({ hostname: 'deploy-preview-1--spontaneous-queijadas-118823.netlify.app' }).backend, DEV, '3. deploy-preview → dev');
  // 5) default → prod
  eq(runBlock({ hostname: 'anything-else.com' }).backend, PROD, '3. default → prod');
}

// ═════════════════════════════════════════════════════════════════════════════
section('4. Structural — new module exists and is wired correctly');
const HTML = loader.loadIndexHtml(INDEX_HTML);
const ordered = loader.loadOrderedScriptSources({ htmlPath: INDEX_HTML });

// 4.1 file exists
check('4.1 js/config/backend-config.js exists', fs.existsSync(CONFIG_FILE));

// 4.2 exactly one <script src="./js/config/backend-config.js"> tag in index.html
const tagMatches = HTML.match(/<script\b[^>]*\bsrc\s*=\s*["']\.\/js\/config\/backend-config\.js["'][^>]*>/gi) || [];
eq(tagMatches.length, 1, '4.2 exactly one backend-config.js script tag in index.html');
const theTag = tagMatches[0] || '';

// 4.3 classic script tag / 4.4 no module/async/defer
check('4.3 tag has no type=module', !/type\s*=\s*["']?module/i.test(theTag));
check('4.4 tag has no async attribute', !/\basync\b/i.test(theTag));
check('4.4 tag has no defer attribute', !/\bdefer\b/i.test(theTag));

// 4.5 tag AFTER backend-client.js  &  4.6 tag BEFORE the inline monolith
const idxClient = HTML.indexOf('src="' + BACKEND_CLIENT + '"');
const idxConfig = HTML.indexOf('src="' + CONFIG_SRC_TAG + '"');
check('4.5 backend-client.js tag present', idxClient !== -1);
check('4.5 backend-config.js tag present', idxConfig !== -1);
check('4.5 backend-config.js loads AFTER backend-client.js', idxClient !== -1 && idxConfig > idxClient);
// The first inline application <script> is the residual monolith.
const firstInlineOrder = ordered.filter(function (s) { return s.kind === 'inline' && s.isAppJs; })[0];
const configOrderEntry = ordered.filter(function (s) { return s.kind === 'local' && s.src === CONFIG_SRC_TAG; })[0];
check('4.6 backend-config.js is a local classic script in the load order', !!configOrderEntry);
check('4.6 backend-config.js loaded before the inline monolith',
  !!configOrderEntry && !!firstInlineOrder && configOrderEntry.order < firstInlineOrder.order);
// Order relative to backend-client.js in the parsed load order.
const clientOrderEntry = ordered.filter(function (s) { return s.kind === 'local' && s.src === BACKEND_CLIENT; })[0];
check('4.6 order is: backend-client.js < backend-config.js < inline monolith',
  !!clientOrderEntry && !!configOrderEntry && !!firstInlineOrder &&
  clientOrderEntry.order < configOrderEntry.order && configOrderEntry.order < firstInlineOrder.order);

// ═════════════════════════════════════════════════════════════════════════════
section('5. Structural — symbols removed from the residual monolith');
const inlineMonolith = ordered
  .filter(function (s) { return s.kind === 'inline' && s.isAppJs; })
  .map(function (s) { return s.code; })
  .join('\n');
check('5. residual monolith no longer declares "const BACKEND ="', inlineMonolith.indexOf('const BACKEND =') === -1);
check('5. residual monolith no longer defines resolveBackendUrl', !/function\s+resolveBackendUrl\s*\(/.test(inlineMonolith));
check('5. residual monolith no longer declares PROD_BACKEND', inlineMonolith.indexOf('const PROD_BACKEND =') === -1);
check('5. residual monolith no longer declares DEV_BACKEND', inlineMonolith.indexOf('const DEV_BACKEND =') === -1);
check('5. residual monolith no longer emits [BACKEND CONFIG] log', inlineMonolith.indexOf('[BACKEND CONFIG]') === -1);

// ═════════════════════════════════════════════════════════════════════════════
section('6. Structural — exactly one overall declaration in reconstructed source');
function countOccurrences(s, sub) { return s.split(sub).length - 1; }
eq(countOccurrences(APP_SRC, 'const BACKEND ='), 1, '6. exactly one `const BACKEND =` in the whole app source');
eq((APP_SRC.match(/function\s+resolveBackendUrl\s*\(/g) || []).length, 1, '6. exactly one resolveBackendUrl definition');
eq(countOccurrences(APP_SRC, 'const PROD_BACKEND ='), 1, '6. exactly one PROD_BACKEND declaration');
eq(countOccurrences(APP_SRC, 'const DEV_BACKEND ='), 1, '6. exactly one DEV_BACKEND declaration');
eq((APP_SRC.match(/\[BACKEND CONFIG\] host=/g) || []).length, 1, '6. exactly one [BACKEND CONFIG] log');

// ═════════════════════════════════════════════════════════════════════════════
section('7. Structural — the shared loader includes the new script');
const localSrcs = ordered.filter(function (s) { return s.kind === 'local'; }).map(function (s) { return s.src; });
check('7. loader parses backend-config.js as a local script', localSrcs.indexOf(CONFIG_SRC_TAG) !== -1);
check('7. reconstructed app source contains the backend-config block', APP_SRC.indexOf('const BACKEND = resolveBackendUrl();') !== -1);

// ═════════════════════════════════════════════════════════════════════════════
section('8. Structural — module contains ONLY backend-config, no out-of-scope symbols');
const MODULE_SRC = fs.readFileSync(CONFIG_FILE, 'utf8');
// It must be a classic script: no module syntax, no wrappers.
check('8. module has no "use strict" pragma', MODULE_SRC.indexOf("'use strict'") === -1 && MODULE_SRC.indexOf('"use strict"') === -1);
check('8. module has no import', !/\bimport\b/.test(MODULE_SRC));
check('8. module has no export', !/\bexport\b/.test(MODULE_SRC));
check('8. module has no require(', MODULE_SRC.indexOf('require(') === -1);
check('8. module has no module.exports', MODULE_SRC.indexOf('module.exports') === -1);
// No out-of-scope symbols leaked into the backend-config module.
const FORBIDDEN = [
  'STRATEGY_TEMPLATES', 'APEX_BUILD_TAG', 'backendKey', 'ttSessionId', 'sessionId',
  '_backendApiAuthState', '_backendCandleAuth', '_BACKEND_CANDLE_BACKOFF_MS',
  'ffSqueezeFireScanner', 'ttCall', 'WebSocket', 'DXLink', 'localStorage',
];
FORBIDDEN.forEach(function (sym) {
  check('8. module does NOT contain out-of-scope symbol: ' + sym, MODULE_SRC.indexOf(sym) === -1);
});
// It must contain exactly the in-scope backend-config symbols.
['PROD_BACKEND', 'DEV_BACKEND', 'resolveBackendUrl', 'const BACKEND =', '[BACKEND CONFIG]'].forEach(function (sym) {
  check('8. module contains in-scope symbol: ' + sym, MODULE_SRC.indexOf(sym) !== -1);
});
// No standalone `S` application-state usage in the module.
check('8. module does not reference application state S', !/(^|[^A-Za-z0-9_$.])S\s*[.\[=]/.test(MODULE_SRC));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' assertions passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail !== 0) process.exitCode = 1;
