'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// VIX < 20 "no naked calls" rule + standing overextension risk warning.
//
// Tests prove:
//   1. Centralised helpers exist (_VIX_NAKED_CALL_MAX, _regimeDynForbidden,
//      _REGIME_OVEREXT_FORBIDDEN) and _REGIME_CONTENT is NOT mutated.
//   2. _regimeDynForbidden(vix): "No naked calls" only when vix < 20; the
//      overextension rule is always present.
//   3. Dashboard banner (_regimeRenderCompact): shows "avoid naked calls" when
//      vix < 20, hidden at vix >= 20, and never duplicated across re-renders.
//   4. Market Context (_regimeRenderMain): forbidden list includes
//      "No naked calls" when vix < 20 and always the overextension rule, with
//      no duplication across re-renders.
//
// Run: node tests/regime-naked-calls.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a raw block of source between startStr (inclusive) and endStr (exclusive).
function extractBlock(src, startStr, endStr) {
  const start = src.indexOf(startStr);
  if (start < 0) throw new Error('Block start not found: ' + startStr);
  const end = src.indexOf(endStr, start);
  if (end < 0) throw new Error('Block end not found: ' + endStr);
  return src.slice(start, end);
}

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

// Count non-overlapping occurrences of needle in haystack.
function count(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}

// DOM mock rich enough for _regimeRenderMain (uses el.querySelector(...)) and
// _regimeRenderCompact (sets el.innerHTML directly).
function makeDom() {
  const elements = {};
  function makeChild() {
    return { innerHTML: '', textContent: '', style: { display: '' } };
  }
  function makeEl() {
    const children = {};
    return {
      innerHTML: '', textContent: '', className: '', style: { display: '' },
      querySelector: function (sel) {
        if (!children[sel]) children[sel] = makeChild();
        return children[sel];
      },
      scrollIntoView: function () {},
      _children: children,
    };
  }
  return {
    getElementById: function (id) {
      if (!elements[id]) elements[id] = makeEl();
      return elements[id];
    },
    _elements: elements,
  };
}

// Build a sandbox with all regime render code defined (no top-level calls run).
function makeSandbox(dom) {
  const code = extractBlock(HTML, 'var _REGIME_ADJ_RULES', 'function _mcxDrawVixCurve');
  const sb = {
    document: dom,
    _mcxSpySqzCache: { spy1d: false, spy4h: false },
    localStorage: { getItem: function () { return null; }, setItem: function () {} },
    console,
    Object,
  };
  vm.createContext(sb);
  vm.runInContext(code, sb);
  return sb;
}

// ── 1. Centralised helpers exist; _REGIME_CONTENT untouched ──────────────────
section('1. Centralised VIX/overextension rule helpers exist');
{
  ok(/var _VIX_NAKED_CALL_MAX\s*=\s*20\b/.test(HTML),
    '1: _VIX_NAKED_CALL_MAX = 20 declared');
  ok(/function _regimeDynForbidden\(vix\)/.test(HTML),
    '1: _regimeDynForbidden(vix) helper declared');
  ok(/var _REGIME_OVEREXT_FORBIDDEN\s*=\s*\{/.test(HTML),
    '1: _REGIME_OVEREXT_FORBIDDEN object declared');
  ok(/Do not sell naked calls or short call ratios if overextended/.test(HTML),
    '1: overextension rule text present in source');
  // The static regime content must NOT hard-code these dynamic rules.
  const regimeData = extractBlock(HTML, 'var _REGIME_CONTENT = {', 'function _mcxRegimeOf');
  ok(regimeData.indexOf("'No naked calls'") < 0 && regimeData.indexOf('No naked calls') < 0,
    '1: "No naked calls" is NOT baked into _REGIME_CONTENT (layered at render time)');
}

// ── 2. _regimeDynForbidden behaviour ─────────────────────────────────────────
section('2. _regimeDynForbidden gates "No naked calls" on VIX < 20');
{
  const sb = makeSandbox(makeDom());

  const below = sb._regimeDynForbidden(19.99);
  ok(below.indexOf('No naked calls') >= 0,
    '2: vix=19.99 → includes "No naked calls"');
  ok(below.some(function (x) { return x && x.text === 'Do not sell naked calls or short call ratios if overextended'; }),
    '2: vix=19.99 → includes overextension rule');

  const at = sb._regimeDynForbidden(20.00);
  ok(at.indexOf('No naked calls') < 0,
    '2: vix=20.00 → does NOT include "No naked calls"');
  ok(at.some(function (x) { return x && x.text === 'Do not sell naked calls or short call ratios if overextended'; }),
    '2: vix=20.00 → overextension rule still present (standing warning)');

  const none = sb._regimeDynForbidden(null);
  ok(none.indexOf('No naked calls') < 0 &&
     none.some(function (x) { return x && x.text; }),
    '2: vix=null → no VIX<20 rule, overextension rule still present');
}

// ── 3. Dashboard banner ──────────────────────────────────────────────────────
section('3. Dashboard banner (_regimeRenderCompact) VIX<20 note + no duplication');
{
  const dom = makeDom();
  const sb  = makeSandbox(dom);
  const el  = dom.getElementById('dash-regime-alert');

  sb._regimeRenderCompact(19.99, 'MID');
  ok(/avoid naked calls/i.test(el.innerHTML),
    '3: vix=19.99 banner shows "avoid naked calls"');
  ok(count(el.innerHTML, 'regime-compact-naked') === 1,
    '3: VIX<20 note rendered exactly once');

  // Re-render with same value (tab switch / refresh) — key guard skips rebuild,
  // and even a forced rebuild replaces innerHTML wholesale → never duplicates.
  sb._regimeCompactKey = null;
  sb._regimeRenderCompact(19.99, 'MID');
  ok(count(el.innerHTML, 'regime-compact-naked') === 1,
    '3: still exactly one note after a forced re-render (no duplication)');

  sb._regimeRenderCompact(20.00, 'MID');
  ok(!/avoid naked calls/i.test(el.innerHTML),
    '3: vix=20.00 banner does NOT show the VIX<20 note');
  ok(count(el.innerHTML, 'regime-compact-naked') === 0,
    '3: note element absent at vix=20.00');

  sb._regimeRenderCompact(17.0, 'LOW');
  ok(/avoid naked calls/i.test(el.innerHTML),
    '3: vix=17.0 (LOW regime) also shows the note');
}

// ── 4. Market Context ────────────────────────────────────────────────────────
section('4. Market Context (_regimeRenderMain) forbidden rules + no duplication');
{
  const dom = makeDom();
  const sb  = makeSandbox(dom);
  const el  = dom.getElementById('mcx-regime-alert');

  sb._regimeRenderMain(19.99, 'MID');
  let sections = el.querySelector('.regime-sections').innerHTML;
  ok(sections.indexOf('No naked calls') >= 0,
    '4: vix=19.99 forbidden list includes "No naked calls"');
  ok(sections.indexOf('Do not sell naked calls or short call ratios if overextended') >= 0,
    '4: forbidden list includes the overextension rule');
  ok(count(sections, '>No naked calls<') === 1,
    '4: "No naked calls" rendered exactly once');
  ok(count(sections, 'Do not sell naked calls or short call ratios if overextended') === 1,
    '4: overextension rule rendered exactly once');

  // Forced re-render — innerHTML replaced wholesale, no accumulation.
  sb._regimeMainKey = null;
  sb._regimeRenderMain(19.99, 'MID');
  sections = el.querySelector('.regime-sections').innerHTML;
  ok(count(sections, '>No naked calls<') === 1,
    '4: still exactly one "No naked calls" after re-render');

  // VIX >= 20 → conditional rule gone, overextension warning stays.
  sb._regimeRenderMain(24.0, 'MID');
  sections = el.querySelector('.regime-sections').innerHTML;
  ok(sections.indexOf('No naked calls') < 0,
    '4: vix=24.0 forbidden list does NOT include "No naked calls"');
  ok(sections.indexOf('Do not sell naked calls or short call ratios if overextended') >= 0,
    '4: overextension rule still present at vix=24.0');

  // Static regime content was not mutated by the render.
  ok(sb._REGIME_CONTENT.MID.forbidden.indexOf('No naked calls') < 0,
    '4: _REGIME_CONTENT.MID.forbidden was not mutated by rendering');
}

// ── 5. Dashboard low-VIX operative notes (_regimeCompactVixNotes) ────────────
section('5. Dashboard banner low-VIX notes: strict thresholds (20 / 19 / 18.50)');
{
  ok(/var _VIX_AVOID_NAKED_PUT_MAX\s*=\s*19\b/.test(HTML),
    '5: _VIX_AVOID_NAKED_PUT_MAX = 19 declared');
  ok(/var _VIX_LOW_IV_STRATEGY_MAX\s*=\s*18\.5\b/.test(HTML),
    '5: _VIX_LOW_IV_STRATEGY_MAX = 18.5 declared');
  ok(/function _regimeCompactVixNotes\(vix\)/.test(HTML),
    '5: _regimeCompactVixNotes(vix) helper declared');

  const sb = makeSandbox(makeDom());

  const NAKED_CALLS = 'avoid naked calls';
  const NAKED_PUTS  = 'avoid naked puts';
  const BEAR_CALL   = 'avoid bear call spreads';
  const BULL_PUT    = 'Only bull put spreads';
  const PMCC        = "Poor man's covered call only if the market is in a possible technical breakout";
  const SHOCK       = 'Light 1-1-2s only to defend market shocks';
  const LOW_IV = [BEAR_CALL, BULL_PUT, PMCC, SHOCK];

  function joined(vix){ return sb._regimeCompactVixNotes(vix).join(' || '); }
  function has(vix, s){ return joined(vix).indexOf(s) >= 0; }

  // VIX = 18.49 → all rules (20 + 19 + 18.50)
  ok(has(18.49, NAKED_CALLS), '5: vix=18.49 shows "avoid naked calls"');
  ok(has(18.49, NAKED_PUTS),  '5: vix=18.49 shows "avoid naked puts"');
  ok(LOW_IV.every(function (s) { return has(18.49, s); }),
    '5: vix=18.49 shows all four VIX<18.50 low-IV rules');
  ok(sb._regimeCompactVixNotes(18.49).length === 6,
    '5: vix=18.49 → exactly 6 notes');

  // VIX = 18.50 → strictly-less means 18.50 rules are OFF
  ok(has(18.50, NAKED_CALLS) && has(18.50, NAKED_PUTS),
    '5: vix=18.50 still shows naked calls + naked puts');
  ok(LOW_IV.every(function (s) { return !has(18.50, s); }),
    '5: vix=18.50 does NOT show any VIX<18.50 low-IV rule (strict <)');
  ok(sb._regimeCompactVixNotes(18.50).length === 2,
    '5: vix=18.50 → exactly 2 notes');

  // VIX = 18.99 → naked calls + naked puts, no 18.50 rules
  ok(has(18.99, NAKED_CALLS) && has(18.99, NAKED_PUTS),
    '5: vix=18.99 shows naked calls + naked puts');
  ok(LOW_IV.every(function (s) { return !has(18.99, s); }),
    '5: vix=18.99 does NOT show VIX<18.50 rules');

  // VIX = 19.00 → only naked calls (strict < on 19)
  ok(has(19.00, NAKED_CALLS), '5: vix=19.00 shows "avoid naked calls"');
  ok(!has(19.00, NAKED_PUTS), '5: vix=19.00 does NOT show "avoid naked puts" (strict <)');
  ok(sb._regimeCompactVixNotes(19.00).length === 1,
    '5: vix=19.00 → exactly 1 note');

  // VIX = 20.00 → no low-VIX notes at all
  ok(sb._regimeCompactVixNotes(20.00).length === 0,
    '5: vix=20.00 → no low-VIX notes (strict <)');
  ok(sb._regimeCompactVixNotes(null).length === 0,
    '5: vix=null → no low-VIX notes');
}

// ── 6. Dashboard render integration + no duplication on re-render ────────────
section('6. _regimeRenderCompact renders all low-VIX notes; no duplication');
{
  const dom = makeDom();
  const sb  = makeSandbox(dom);
  const el  = dom.getElementById('dash-regime-alert');

  sb._regimeRenderCompact(18.49, 'LOW');
  let html = el.innerHTML;
  ok(/avoid naked calls/i.test(html), '6: vix=18.49 banner shows avoid naked calls');
  ok(/avoid naked puts/i.test(html),  '6: vix=18.49 banner shows avoid naked puts');
  ok(/avoid bear call spreads/i.test(html), '6: vix=18.49 banner shows avoid bear call spreads');
  ok(html.indexOf('Only bull put spreads') >= 0, '6: vix=18.49 banner shows Only bull put spreads');
  ok(html.indexOf("Poor man's covered call only if the market is in a possible technical breakout") >= 0,
    '6: vix=18.49 banner shows the PMCC breakout note');
  ok(html.indexOf('Light 1-1-2s only to defend market shocks') >= 0,
    '6: vix=18.49 banner shows the 1-1-2 shock-defence note');
  ok(count(html, 'regime-compact-naked') === 6,
    '6: vix=18.49 → exactly 6 note chips rendered');

  // Forced re-render with same VIX — innerHTML replaced wholesale, no dupes.
  sb._regimeCompactKey = null;
  sb._regimeRenderCompact(18.49, 'LOW');
  ok(count(el.innerHTML, 'regime-compact-naked') === 6,
    '6: still exactly 6 chips after a forced re-render (no duplication)');

  // VIX = 19.00 → only the naked-calls note
  sb._regimeRenderCompact(19.00, 'MID');
  html = el.innerHTML;
  ok(/avoid naked calls/i.test(html) && !/avoid naked puts/i.test(html),
    '6: vix=19.00 banner shows only avoid naked calls');
  ok(count(html, 'regime-compact-naked') === 1, '6: vix=19.00 → exactly 1 chip');

  // VIX = 20.00 → no low-VIX notes
  sb._regimeRenderCompact(20.00, 'MID');
  ok(count(el.innerHTML, 'regime-compact-naked') === 0, '6: vix=20.00 → no note chips');
}

// ── summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);
