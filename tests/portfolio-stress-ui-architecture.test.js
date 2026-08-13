'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS UI — ARCHITECTURE CONTRACT.
//
// WHAT THIS PINS
//   That the UI is a RENDERER and nothing more. The governing rule of this whole
//   feature is that the backend owns every number, and the single most likely way
//   for that to erode is not a dramatic rewrite — it is somebody adding one
//   `fetch`, one small sum, one `localStorage.setItem` to a panel that already
//   exists. Each of those is checked here directly.
//
//   • exactly one stress client, reached from exactly one dispatch site;
//   • no fetch, no XHR, no WebSocket, no direct ttCall in the UI tier;
//   • no pricing, no Greek arithmetic, no P&L arithmetic in the UI tier;
//   • no option-chain access;
//   • no persistence of any kind, and no order path;
//   • no timer, no polling, and nothing at all at load time;
//   • the modules are inert at load — declarations only.
//
// SOURCE-LEVEL AND BEHAVIOURAL, BOTH
//   §1–§5 read the source, because some of these properties are about what the
//   file may CONTAIN. §6 loads the modules in a sandbox with no network and no
//   timers defined at all, so a module that tried to use one would throw rather
//   than pass unnoticed.
//
// Run: node tests/portfolio-stress-ui-architecture.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./lib/portfolio-stress-ui-sandbox.js');

const { ok, section, finish } = H.harness('UI architecture contract');

const STATE_PATH = H.FILES.uiState;
const PANEL_PATH = H.FILES.panel;
const UI_FILES = [STATE_PATH, PANEL_PATH];

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}
const SRC = {};
for (const p of UI_FILES) SRC[p] = stripComments(fs.readFileSync(p, 'utf8'));
const rel = (p) => path.relative(H.ROOT, p);

// ─────────────────────────────────────────────────────────────────────────────
section('1. One client, one dispatch site, no second transport');
{
  for (const p of UI_FILES) {
    const code = SRC[p];
    ok(!/(?<![A-Za-z0-9_$.])fetch\s*\(/.test(code), '1.1: no direct fetch in ' + rel(p));
    ok(!/XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(code), '1.2: no second HTTP system in ' + rel(p));
    ok(!/(?<![A-Za-z0-9_$.])ttCall\s*\(/.test(code), '1.3: the transport owner is not called directly from ' + rel(p));
    ok(!/\$\.ajax|axios|superagent/.test(code), '1.4: no third-party HTTP client in ' + rel(p));
  }
  const dispatches = (SRC[PANEL_PATH].match(/runPortfolioStressTestRequest\s*\(/g) || []).length;
  ok(dispatches === 1, '1.5: the panel has exactly ONE dispatch site, got ' + dispatches);
  ok((SRC[STATE_PATH].match(/runPortfolioStressTestRequest\s*\(/g) || []).length === 0,
    '1.6: the pure state module dispatches nothing');
  // The endpoint path must appear nowhere in the UI: the client owns it.
  for (const p of UI_FILES) {
    ok(SRC[p].indexOf('/portfolio/stress-test/run') === -1,
      '1.7: the endpoint path is not restated in ' + rel(p));
  }
  ok(SRC[PANEL_PATH].indexOf('_httpStatusFromError') !== -1,
    '1.8: HTTP status is read through the canonical owner, not parsed again');
  ok(!/HTTP\s*\\?s\+\(\\d/.test(SRC[PANEL_PATH]) && !/match\(\/\\bHTTP/.test(SRC[PANEL_PATH]),
    '1.9: the panel does not carry a second HTTP-status parser');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. No engine: no pricing, no Greeks, no P&L arithmetic');
{
  const PRICING = [
    ['Black-Scholes', /blackScholes|black_scholes|d1\s*=|d2\s*=/],
    ['a normal CDF', /normCdf|cumulativeNormal|erf\s*\(/],
    ['exp/log/sqrt pricing maths', /Math\.(exp|log|sqrt|pow)\s*\(/],
    ['a binomial tree', /\bcrr\b|binomialTree|americanExercise/],
    ['an implied-volatility solve', /impliedVol|newtonRaphson|bisect/],
  ];
  for (const p of UI_FILES) {
    for (const [label, re] of PRICING) {
      ok(!re.test(SRC[p]), '2.1: no ' + label + ' in ' + rel(p));
    }
  }
  // The specific identifiers a frontend engine would have to introduce.
  for (const p of UI_FILES) {
    for (const forbidden of ['stressedTheoreticalValue', 'baseTheoreticalValue', 'betaShockFactor',
      'signedShares', 'equityStressPnl', 'symbolStressReturn']) {
      ok(SRC[p].indexOf(forbidden) === -1, '2.2: ' + rel(p) + ' does not compute ' + forbidden);
    }
  }
  // Arithmetic on authoritative result fields. The UI may format them and it may
  // compare them; it may not add, subtract, multiply or divide them.
  const AUTHORITATIVE = ['actualStressPnl', 'proposedStressPnl', 'overlayStressPnl', 'difference',
    'actualStressPnlPctNlv', 'proposedStressPnlPctNlv', 'rawBetaWeightedShareDelta'];
  for (const p of UI_FILES) {
    for (const field of AUTHORITATIVE) {
      const arith = new RegExp(field + "['\"]?\\s*[\\]\\)]*\\s*[+\\-*/]\\s*[A-Za-z0-9_$(]");
      ok(!arith.test(SRC[p]), '2.3: ' + rel(p) + ' performs no arithmetic on ' + field);
    }
  }
  // The one place a difference could be silently recomputed.
  for (const p of UI_FILES) {
    ok(!/proposed\w*\s*-\s*actual\w*|actual\w*\s*\+\s*overlay\w*/i.test(SRC[p]),
      '2.4: ' + rel(p) + ' does not recompute Difference or Proposed');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. No option chain, no persistence, no orders');
{
  for (const p of UI_FILES) {
    for (const [label, re] of [
      ['option chain access', /optionChain|fetchOptionChain|_optChainCache|nestedChain/],
      ['storage', /localStorage|sessionStorage|indexedDB|\bcookie\b/],
      ['an order path', /placeOrder|submitOrder|sendOrder|createOrder|orderTicket|\/orders\b/],
      ['journal persistence', /journalManager|saveJournal|persistJournal|journalSave/],
      ['portfolio mutation', /positionManager|portfolioManager\.(set|upsert|remove)/],
      ['overlay persistence', /saveOverlay|persistOverlay|storeOverlay/],
      ['a result cache', /new Map\s*\(|new WeakMap\s*\(|memoize\s*\(/],
    ]) {
      ok(!re.test(SRC[p]), '3.1: no ' + label + ' in ' + rel(p));
    }
  }
  // The panel reads the portfolio owner, and only ever reads it.
  const reads = (SRC[PANEL_PATH].match(/portfolioManager\.\w+/g) || []);
  ok(reads.every((r) => r === 'portfolioManager.getById'),
    '3.2: the panel only READS the portfolio owner, saw ' + JSON.stringify([...new Set(reads)]));
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Nothing runs by itself');
{
  for (const p of UI_FILES) {
    ok(!/\bsetInterval\s*\(/.test(SRC[p]), '4.1: no interval in ' + rel(p));
    ok(!/\bsetTimeout\s*\(/.test(SRC[p]), '4.2: no timeout in ' + rel(p));
    ok(!/requestAnimationFrame\s*\(/.test(SRC[p]), '4.3: no animation frame in ' + rel(p));
    ok(!/\bpoll\w*\s*\(/i.test(SRC[p]), '4.4: no polling loop in ' + rel(p));
  }
  // Inert at load: every top-level statement is a declaration.
  for (const p of UI_FILES) {
    const offenders = SRC[p].split('\n').filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (/^[\s})\];,]/.test(line)) return false;
      return !/^(var|function|const|let|async function)\b/.test(t);
    });
    ok(offenders.length === 0,
      '4.5: ' + rel(p) + ' is inert at load' + (offenders.length ? ' — ' + JSON.stringify(offenders.slice(0, 2)) : ''));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The pure module is pure');
{
  for (const [label, re] of [
    ['DOM access', /\bdocument\s*\.|\bwindow\s*\.|innerHTML|querySelector|createElement|getElementById/],
    ['an event listener', /\baddEventListener\s*\(/],
    ['inline style writes', /\.style\s*\./],
  ]) {
    ok(!re.test(SRC[STATE_PATH]), '5.1: no ' + label + ' in the pure state module');
  }
  // ...and the renderer is the only file that touches the DOM at all.
  ok(/getElementById/.test(SRC[PANEL_PATH]), '5.2: the renderer is the tier that owns DOM access');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Loading the modules does nothing observable');
{
  // A context with NO fetch, NO timers, NO storage and NO document. Anything the
  // modules tried to touch at load would throw a ReferenceError here rather than
  // succeed quietly.
  const bare = {
    Object, Array, JSON, Math, Error, String, Boolean, isFinite, parseFloat, parseInt, Date, RegExp,
  };
  vm.createContext(bare);
  let threw = null;
  try {
    vm.runInContext(fs.readFileSync(H.FILES.uiState, 'utf8'), bare);
    vm.runInContext(fs.readFileSync(H.FILES.panel, 'utf8'), bare);
  } catch (e) { threw = e; }
  ok(threw === null, '6.1: both modules load in a context with no fetch, no timer, no storage and no DOM' +
    (threw ? ' — ' + threw.message : ''));
  ok(typeof bare.createPortfolioStressUiState === 'function', '6.2: the state factory is declared');
  ok(typeof bare.pstxPanelOpen === 'function' && typeof bare.pstxPanelClose === 'function',
    '6.3: the bootstrap entry points showView calls are declared');
  ok(bare._pstxState === null, '6.4: no state object is constructed at load time');
  ok(bare._pstxAbort === null, '6.5: no AbortController is constructed at load time');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. The monolith wiring is the declared minimum');
{
  const idx = fs.readFileSync(path.join(H.ROOT, 'index.html'), 'utf8');
  ok(idx.indexOf('<script src="./js/services/portfolio-stress-ui-state.js"></script>') !== -1,
    '7.1: the state module is loaded');
  ok(idx.indexOf('<script src="./js/ui/portfolio-stress-panel.js"></script>') !== -1,
    '7.2: the panel is loaded');
  ok(idx.indexOf('<link rel="stylesheet" href="./css/portfolio-stress.css">') !== -1,
    '7.3: the stylesheet is linked');
  ok(/id="ntab-stress"[^>]*onclick="showView\('stress'\)"/.test(idx), '7.4: the navigation entry calls the canonical view owner');
  ok(/<div id="view-stress" class="full-view" style="display:none"><\/div>/.test(idx),
    '7.5: the mount point is EMPTY — the panel owns everything inside it');
  // The panel's script tag must come AFTER the client it depends on.
  ok(idx.indexOf('portfolio-stress-client.js') < idx.indexOf('portfolio-stress-ui-state.js') &&
     idx.indexOf('portfolio-stress-ui-state.js') < idx.indexOf('portfolio-stress-panel.js'),
    '7.6: load order is parity/response/client, then state, then panel');
  // Exactly one bootstrap pair, and each name appears exactly twice: once in the
  // `typeof` guard and once in the call. A third occurrence would mean a second
  // place in the monolith drives the panel.
  ok((idx.match(/pstxPanelOpen\b/g) || []).length === 2,
    '7.7: pstxPanelOpen appears exactly twice (typeof guard + call), got ' + ((idx.match(/pstxPanelOpen\b/g) || []).length));
  ok((idx.match(/pstxPanelClose\b/g) || []).length === 2,
    '7.8: pstxPanelClose appears exactly twice (typeof guard + call), got ' + ((idx.match(/pstxPanelClose\b/g) || []).length));
  ok((idx.match(/\bpstx[A-Z]\w*/g) || []).every((n) => n === 'pstxPanelOpen' || n === 'pstxPanelClose'),
    '7.8b: the monolith reaches no panel function other than the two bootstrap entry points');
  // No stress logic leaked into the monolith beyond that pair.
  for (const forbidden of ['stressPnl', 'scenarioMatrix', 'hypotheticalOverlay', 'ivShockMethod', 'vixChangePct']) {
    ok(idx.indexOf(forbidden) === -1, '7.9: the monolith carries no ' + forbidden);
  }
}

finish();
