'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// A sandbox for the Portfolio Stress UI suites.
//
// WHY A SHARED HARNESS
//   Five suites exercise the same two modules against the same three
//   dependencies. Five copies of the setup would drift, and a drifted harness is
//   how one suite quietly stops loading the module it claims to test.
//
// WHAT IT BUILDS
//   The REAL modules, in the REAL index.html load order: parity, response,
//   client, ui-state, panel. Nothing is stubbed that the browser would not stub.
//   In particular the client and the response contract are the real ones, so a
//   suite that asserts "the renderer never sees a withdrawn number" is asserting
//   it against the code that actually withdraws it.
//
// THE DOM IS A STUB, AND A DELIBERATELY DUMB ONE
//   `document.getElementById` returns a recording element with `value` and
//   `innerHTML` and nothing else. It is not a DOM implementation and must not
//   become one: the suites assert on the HTML STRING the panel produced, which
//   is the thing the browser would parse. A richer fake would start answering
//   questions about a DOM this repository does not have.
//
// NO NETWORK. `fetch` is a fake the caller supplies. There is no real transport
// anywhere in these suites.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const FILES = {
  parity: path.join(ROOT, 'js', 'services', 'portfolio-stress-parity.js'),
  response: path.join(ROOT, 'js', 'services', 'portfolio-stress-response.js'),
  client: path.join(ROOT, 'js', 'services', 'portfolio-stress-client.js'),
  uiState: path.join(ROOT, 'js', 'services', 'portfolio-stress-ui-state.js'),
  panel: path.join(ROOT, 'js', 'ui', 'portfolio-stress-panel.js'),
  transport: path.join(ROOT, 'js', 'api', 'backend-client.js'),
};

const MANIFEST_SHA = '5dff46fb958c728ae48326a510fc79e6e5a94a8a85608b91538400125ec5d0cb';

/** A response with the three parity identifiers the client verifies. */
function goodResponse(extra) {
  return Object.assign({
    status: 'VALID',
    matrix: [],
    portfolioScopeParityManifestVersion: '2.1.0',
    portfolioScopeParityManifestSha256: MANIFEST_SHA,
    portfolioScopeSemanticsVersion: '2.1.0',
  }, extra || {});
}

/**
 * A matrix cell as the backend publishes one.
 *
 * Defaults to a fully VALID, complete Actual/Overlay/Proposed cell so a test only
 * has to state the part it is about.
 */
function cell(scenarioId, extra) {
  return Object.assign({
    scenarioId: scenarioId,
    status: 'VALID',
    actualStatus: 'VALID', actualComplete: true,
    overlayStatus: 'VALID', overlayComplete: true,
    proposedStatus: 'VALID', proposedComplete: true,
    pctNlvStatus: 'VALID',
    rawBetaWeightedShareDeltaStatus: 'VALID',
  }, extra || {});
}

/** The minimal recording element the panel reads and writes. */
function makeElement(id) {
  return { id: id, value: '', innerHTML: '', style: {} };
}

/**
 * Build a sandbox.
 *
 * @param {object} [opts]
 *   transport   a function replacing `ttCall`. Given one, the REAL backend-client
 *               is not loaded, so no fetch path exists at all.
 *   portfolio   the record `portfolioManager.getById` returns.
 *   activeId    the value of `_activePanelPortfolioId`.
 *   elements    seed values for input elements, keyed by id.
 */
function makeSandbox(opts) {
  const o = opts || {};
  const elements = {};
  const dom = { renders: [] };
  const calls = { transport: [], aborts: [] };

  const mount = makeElement('view-stress');
  Object.defineProperty(mount, 'innerHTML', {
    get() { return dom.lastHtml === undefined ? '' : dom.lastHtml; },
    set(v) { dom.lastHtml = v; dom.renders.push(v); },
  });
  elements['view-stress'] = mount;
  for (const [id, value] of Object.entries(o.elements || {})) {
    const el = makeElement(id);
    el.value = value;
    elements[id] = el;
  }

  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    JSON, Promise, Object, Array, Error, String, Boolean, Math, isFinite, parseFloat, parseInt,
    Date, RegExp, AbortController, AbortSignal,
    document: {
      getElementById: (id) => (Object.prototype.hasOwnProperty.call(elements, id) ? elements[id] : null),
    },
    _activePanelPortfolioId: o.activeId === undefined ? 'pf-1' : o.activeId,
    portfolioManager: {
      getById: () => (o.portfolio === undefined
        ? { id: 'pf-1', name: 'Main', portfolioRevision: 'rev-1' }
        : o.portfolio),
    },
    __dom: dom,
    __elements: elements,
    __calls: calls,
  };

  if (typeof o.transport === 'function') {
    sandbox.ttCall = function (pathArg, init) {
      calls.transport.push({ path: pathArg, init: init });
      if (init && init.signal) {
        init.signal.addEventListener('abort', () => calls.aborts.push(pathArg), { once: true });
      }
      return o.transport(pathArg, init);
    };
  }

  // `sources` lets the mutation suite serve MODIFIED module text from memory.
  // Nothing is ever written to disk: a mutation proof that edited a real file
  // would be one crash away from leaving the repository broken.
  const src = (key) => {
    const override = (o.sources || {})[key];
    return override === undefined ? fs.readFileSync(FILES[key], 'utf8') : override;
  };
  vm.createContext(sandbox);
  vm.runInContext(src('parity'), sandbox);
  vm.runInContext(src('response'), sandbox);
  vm.runInContext(src('client'), sandbox);
  vm.runInContext(src('uiState'), sandbox);
  vm.runInContext(src('panel'), sandbox);
  return { sandbox, dom, calls, elements };
}

/**
 * The text of a module with ONE substring replaced — the raw material of a
 * mutation proof. Throws when the anchor is absent, because a mutation that
 * silently changed nothing would produce a proof that passes for the wrong
 * reason: the check would "catch" a mutation that was never applied.
 */
function mutateSource(key, from, to) {
  const text = fs.readFileSync(FILES[key], 'utf8');
  if (text.indexOf(from) === -1) {
    throw new Error('mutation anchor not found in ' + key + ': ' + JSON.stringify(from.slice(0, 60)));
  }
  return text.replace(from, to);
}

/** A tiny assertion harness, identical in shape to the other stress suites. */
function harness(title) {
  let pass = 0, fail = 0;
  const failures = [];
  return {
    ok(cond, msg) {
      if (cond) { pass++; return true; }
      fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
    },
    section(t) { console.log('\n' + t); },
    finish() {
      console.log('\n' + (pass + fail) + ' checks, ' + pass + ' passed, ' + fail + ' FAILED.');
      if (fail) {
        console.error('\nFAILURES:');
        for (const f of failures) console.error('  - ' + f);
        process.exit(1);
      }
      console.log(title + ': OK');
    },
  };
}

module.exports = { ROOT, FILES, MANIFEST_SHA, goodResponse, cell, makeSandbox, mutateSource, harness };
