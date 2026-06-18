'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Market Context — regime rules, SPY squeeze badge, adjustment rules.
//
// Tests prove:
//   1. _REGIME_ADJ_RULES defined before _REGIME_CONTENT
//   2. adj property added to all three regimes (LOW / MID / HIGH)
//   3. "Put ratio spreads" moved from LOW.favored to LOW.forbidden (with reason)
//   4. _regimeSections renders regime-adj section with ⚙ ADJUSTMENT RULES heading
//   5. _mcxSpySqzBadgeHtml and _mcxRenderSpySqzBadge functions exist in source
//   6. _regimeRenderCompact calls _mcxSpySqzBadgeHtml and uses squeeze-aware cache key
//   7. _mcxSpySqzCache variable declared in source
//   8. _mcxRenderCharts populates _mcxSpySqzCache before _mcxDrawVixCurve
//   9. functional: _mcxSpySqzBadgeHtml returns '' when no squeeze
//  10. functional: _mcxSpySqzBadgeHtml returns correct labels (4H / 1D / 4H + 1D)
//  11. functional: _regimeSections output has adj section + forbidden still has put ratio spreads
//  12. functional: _regimeRenderCompact includes squeeze badge, cache key changes with squeeze
//
// Run: node tests/mcx-regime-rules.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── shared helpers ───────────────────────────────────────────────────────────

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

// Extract a raw block of source between startStr (inclusive) and endStr (exclusive).
function extractBlock(src, startStr, endStr) {
  const start = src.indexOf(startStr);
  if (start < 0) throw new Error('Block start not found: ' + startStr);
  const end = src.indexOf(endStr, start);
  if (end < 0) throw new Error('Block end not found: ' + endStr);
  return src.slice(start, end);
}

// ── harness ──────────────────────────────────────────────────────────────────

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }

function makeDom() {
  const elements = {};
  function makeEl(id) {
    return { _id: id, innerHTML: '', textContent: '', style: { display: '' },
             querySelector: function() { return null; }, scrollIntoView: function() {} };
  }
  return {
    getElementById: function(id) {
      if (!elements[id]) elements[id] = makeEl(id);
      return elements[id];
    },
    _elements: elements,
  };
}

// ── 1. _REGIME_ADJ_RULES defined before _REGIME_CONTENT ─────────────────────
section('1. _REGIME_ADJ_RULES defined before _REGIME_CONTENT');
{
  const adjIdx     = HTML.indexOf('var _REGIME_ADJ_RULES');
  const contentIdx = HTML.indexOf('var _REGIME_CONTENT');
  ok(adjIdx >= 0,          '1: _REGIME_ADJ_RULES is declared in source');
  ok(adjIdx < contentIdx,  '1: _REGIME_ADJ_RULES declared before _REGIME_CONTENT');
  ok(/SMA20 must be below SMA30/.test(HTML), '1: SMA20/SMA30 prerequisite text present in adj rules');
  ok(/Adjustment skipped/.test(HTML),        '1: "Adjustment skipped" guidance text present');
}

// ── 2. adj property added to all three regimes ───────────────────────────────
section('2. adj: _REGIME_ADJ_RULES added to LOW, MID, and HIGH regimes');
{
  const block = extractBlock(HTML, 'var _REGIME_CONTENT = {', 'function _mcxRegimeOf');
  ok(/adj\s*:\s*_REGIME_ADJ_RULES/.test(block),
    '2: adj: _REGIME_ADJ_RULES appears inside _REGIME_CONTENT');
  // Count occurrences — must appear 3 times (one per regime)
  const matches = block.match(/adj\s*:\s*_REGIME_ADJ_RULES/g) || [];
  ok(matches.length === 3, '2: adj appears in exactly 3 regimes (LOW + MID + HIGH), found ' + matches.length);
}

// ── 3. Put ratio spreads moved to LOW.forbidden ──────────────────────────────
section('3. "Put ratio spreads" moved from LOW.favored to LOW.forbidden');
{
  // Extract LOW regime block (between "LOW: {" and "MID: {")
  const lowStart    = HTML.indexOf("  LOW: {");
  const lowEnd      = HTML.indexOf("  MID: {", lowStart);
  const lowBlock    = HTML.slice(lowStart, lowEnd);

  // Find forbidden and favored sub-sections within LOW block
  const forbStart   = lowBlock.indexOf('forbidden:[');
  const forbEnd     = lowBlock.indexOf('\n    ],', forbStart) + 6; // include closing ],
  const favStart    = lowBlock.indexOf('favored:[');
  const favEnd      = lowBlock.indexOf('\n    ],', favStart) + 6;

  const forbText    = lowBlock.slice(forbStart, forbEnd);
  const favText     = lowBlock.slice(favStart, favEnd);

  ok(/Put ratio spreads/.test(forbText),
    '3: "Put ratio spreads" appears in LOW.forbidden section');
  ok(/Put-side IV too low/.test(forbText),
    '3: reason sub-text "Put-side IV too low" present in LOW.forbidden');
  ok(!/['"]Put ratio spreads['"]/.test(favText),
    '3: "Put ratio spreads" is NOT a standalone string in LOW.favored');
}

// ── 4. _regimeSections renders adj section ───────────────────────────────────
section('4. _regimeSections renders regime-adj section');
{
  const src = extractFn(HTML, '_regimeSections');
  ok(/regime-adj/.test(src),        '4: _regimeSections passes "regime-adj" class to sect()');
  ok(/ADJUSTMENT RULES/.test(src),  '4: "ADJUSTMENT RULES" heading text present in _regimeSections');
  ok(/c\.adj/.test(src),            '4: _regimeSections passes c.adj items to sect()');
  // Verify the adj sect call is added AFTER regime-tech (section order: forbidden→caution→favored→tech→adj)
  const techIdx = src.indexOf('regime-tech');
  const adjIdx  = src.indexOf('regime-adj');
  ok(techIdx >= 0 && adjIdx >= 0 && techIdx < adjIdx,
    '4: regime-adj rendered after regime-tech in output order');
}

// ── 5. SPY squeeze badge helper functions exist ──────────────────────────────
section('5. _mcxSpySqzBadgeHtml and _mcxRenderSpySqzBadge exist in source');
{
  let fnHtml = null, fnBadge = null;
  try { fnHtml  = extractFn(HTML, '_mcxSpySqzBadgeHtml');  } catch (e) { fnHtml = null; }
  try { fnBadge = extractFn(HTML, '_mcxRenderSpySqzBadge'); } catch (e) { fnBadge = null; }
  ok(fnHtml  !== null, '5: _mcxSpySqzBadgeHtml function exists in source');
  ok(fnBadge !== null, '5: _mcxRenderSpySqzBadge function exists in source');
  ok(/SPY SQUEEZE/.test(fnHtml || ''),
    '5: _mcxSpySqzBadgeHtml contains "SPY SQUEEZE" label text');
  ok(/4H \+ 1D/.test(fnHtml || ''),
    '5: _mcxSpySqzBadgeHtml generates "4H + 1D" combined label');
  ok(/mcx-spy-sqz-badge/.test(fnBadge || ''),
    '5: _mcxRenderSpySqzBadge targets #mcx-spy-sqz-badge element');
}

// ── 6. _regimeRenderCompact includes squeeze badge and squeeze-aware cache key
section('6. _regimeRenderCompact: squeeze badge + squeeze-aware cache key');
{
  const src = extractFn(HTML, '_regimeRenderCompact');
  ok(/_mcxSpySqzBadgeHtml/.test(src),
    '6: _regimeRenderCompact calls _mcxSpySqzBadgeHtml');
  ok(/sqzTag/.test(src),
    '6: cache key variable sqzTag used in _regimeRenderCompact');
  ok(/_mcxSpySqzCache\.spy1d/.test(src),
    '6: _regimeRenderCompact reads _mcxSpySqzCache.spy1d for cache key');
  ok(/_mcxSpySqzCache\.spy4h/.test(src),
    '6: _regimeRenderCompact reads _mcxSpySqzCache.spy4h for cache key');
}

// ── 7. _mcxSpySqzCache variable declared ─────────────────────────────────────
section('7. _mcxSpySqzCache module-level variable declared');
{
  ok(/var _mcxSpySqzCache\s*=\s*\{/.test(HTML),
    '7: _mcxSpySqzCache variable declaration found');
  ok(/spy1d\s*:\s*null/.test(HTML.slice(HTML.indexOf('var _mcxSpySqzCache'), HTML.indexOf('var _mcxSpySqzCache') + 100)),
    '7: spy1d: null in _mcxSpySqzCache initializer');
  ok(/spy4h\s*:\s*null/.test(HTML.slice(HTML.indexOf('var _mcxSpySqzCache'), HTML.indexOf('var _mcxSpySqzCache') + 100)),
    '7: spy4h: null in _mcxSpySqzCache initializer');
}

// ── 8. _mcxRenderCharts populates cache before _mcxDrawVixCurve ──────────────
section('8. _mcxRenderCharts populates _mcxSpySqzCache before _mcxDrawVixCurve()');
{
  const src = extractFn(HTML, '_mcxRenderCharts');
  ok(/_mcxSpySqzCache\.spy1d\s*=/.test(src),
    '8: _mcxSpySqzCache.spy1d assigned inside _mcxRenderCharts');
  ok(/_mcxSpySqzCache\.spy4h\s*=/.test(src),
    '8: _mcxSpySqzCache.spy4h assigned inside _mcxRenderCharts');
  const sqz1Idx = src.indexOf('_mcxSpySqzCache.spy1d =');
  const vixIdx  = src.indexOf('_mcxDrawVixCurve()');
  ok(sqz1Idx >= 0 && vixIdx >= 0 && sqz1Idx < vixIdx,
    '8: spy1d cache assignment precedes _mcxDrawVixCurve() call');
  ok(/_mcxRenderSpySqzBadge\(\)/.test(src),
    '8: _mcxRenderSpySqzBadge() called inside _mcxRenderCharts');
  ok(/_regimeCompactKey\s*=\s*null/.test(src),
    '8: _regimeCompactKey reset to null inside _mcxRenderCharts (force compact re-render)');
}

// ── 9. functional: _mcxSpySqzBadgeHtml returns '' when no squeeze ────────────
section('9. functional: _mcxSpySqzBadgeHtml returns empty string when no squeeze');
{
  const sb = {
    _mcxSpySqzCache: { spy1d: false, spy4h: false },
    console,
  };
  vm.createContext(sb);
  vm.runInContext(extractFn(HTML, '_mcxSpySqzBadgeHtml'), sb);

  ok(sb._mcxSpySqzBadgeHtml() === '',
    '9: returns "" when spy1d=false and spy4h=false');
  ok(sb._mcxSpySqzBadgeHtml(true) === '',
    '9: compact variant also returns "" when no squeeze');
}

// ── 10. functional: _mcxSpySqzBadgeHtml labels ───────────────────────────────
section('10. functional: _mcxSpySqzBadgeHtml generates correct labels for all combinations');
{
  const cases = [
    { spy1d: true,  spy4h: true,  full: '4H + 1D', compact: 'SQZ 4H + 1D' },
    { spy1d: false, spy4h: true,  full: '4H',       compact: 'SQZ 4H'      },
    { spy1d: true,  spy4h: false, full: '1D',       compact: 'SQZ 1D'      },
  ];

  for (const tc of cases) {
    const sb = {
      _mcxSpySqzCache: { spy1d: tc.spy1d, spy4h: tc.spy4h },
      console,
    };
    vm.createContext(sb);
    vm.runInContext(extractFn(HTML, '_mcxSpySqzBadgeHtml'), sb);

    const html = sb._mcxSpySqzBadgeHtml();
    ok(html.indexOf('SPY SQUEEZE: ' + tc.full) >= 0,
      '10: full badge label "SPY SQUEEZE: ' + tc.full + '" for spy1d=' + tc.spy1d + ' spy4h=' + tc.spy4h);
    ok(html.indexOf('mcx-spy-sqz-badge') >= 0,
      '10: full badge has mcx-spy-sqz-badge class');

    const htmlC = sb._mcxSpySqzBadgeHtml(true);
    ok(htmlC.indexOf(tc.compact) >= 0,
      '10: compact badge contains "' + tc.compact + '"');
    ok(htmlC.indexOf('mcx-spy-sqz-compact') >= 0,
      '10: compact badge has mcx-spy-sqz-compact class');
  }
}

// ── 11. functional: _regimeSections renders adj + forbidden intact ────────────
section('11. functional: _regimeSections renders adj section and forbidden contains put ratio spreads');
{
  // Extract _REGIME_ADJ_RULES + _REGIME_CONTENT block (stops before function _mcxRegimeOf)
  const regimeDataCode = extractBlock(HTML, 'var _REGIME_ADJ_RULES', 'function _mcxRegimeOf');
  const regimeSectFn   = extractFn(HTML, '_regimeSections');

  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(regimeDataCode + '\n' + regimeSectFn, sb);

  // Test LOW regime sections
  const html = sb._regimeSections(sb._REGIME_CONTENT['LOW']);

  ok(html.indexOf('regime-adj') >= 0,
    '11: adj section class regime-adj present in _regimeSections output');
  ok(html.indexOf('ADJUSTMENT RULES') >= 0,
    '11: "ADJUSTMENT RULES" heading rendered in output');
  ok(html.indexOf('SMA20 must be below SMA30') >= 0,
    '11: SMA20/SMA30 prerequisite text rendered inside adj section');
  ok(html.indexOf('regime-forbidden') >= 0,
    '11: forbidden section still rendered');
  ok(html.indexOf('Put ratio spreads') >= 0,
    '11: "Put ratio spreads" still appears in output (now in forbidden)');

  // Forbidden section precedes favored — so "Put ratio spreads" should appear before "regime-favored" class
  const putIdx     = html.indexOf('Put ratio spreads');
  const favoredIdx = html.indexOf('regime-favored');
  ok(putIdx >= 0 && favoredIdx >= 0 && putIdx < favoredIdx,
    '11: "Put ratio spreads" appears before the favored section (it is in forbidden)');

  // Test MID and HIGH also render adj section
  const htmlMid  = sb._regimeSections(sb._REGIME_CONTENT['MID']);
  const htmlHigh = sb._regimeSections(sb._REGIME_CONTENT['HIGH']);
  ok(htmlMid.indexOf('regime-adj') >= 0,  '11: MID regime also renders adj section');
  ok(htmlHigh.indexOf('regime-adj') >= 0, '11: HIGH regime also renders adj section');
}

// ── 12. functional: _regimeRenderCompact squeeze badge + cache invalidation ──
section('12. functional: _regimeRenderCompact includes squeeze badge; cache invalidates on squeeze change');
{
  const regimeDataCode = extractBlock(HTML, 'var _REGIME_ADJ_RULES', 'function _mcxRegimeOf');
  const badgeFn        = extractFn(HTML, '_mcxSpySqzBadgeHtml');
  const renderCmpFn    = extractFn(HTML, '_regimeRenderCompact');

  // _REGIME_LABEL is a simple one-liner — extract it directly
  const labelIdx  = HTML.indexOf('var _REGIME_LABEL=');
  const labelCode = HTML.slice(labelIdx, HTML.indexOf(';', labelIdx) + 1);

  const dom = makeDom();
  const sb  = {
    _mcxSpySqzCache: { spy1d: false, spy4h: true }, // only 4H squeeze
    _regimeCompactKey: null,
    _VIX_NAKED_CALL_MAX: 20,                         // VIX<20 naked-calls rule threshold
    document: dom,
    console,
  };
  vm.createContext(sb);
  vm.runInContext(regimeDataCode, sb);
  vm.runInContext(labelCode, sb);
  vm.runInContext(badgeFn, sb);
  vm.runInContext(renderCmpFn, sb);

  sb._regimeRenderCompact(22.5, 'MID');

  const html1 = dom._elements['dash-regime-alert'].innerHTML;
  ok(html1.indexOf('SQZ 4H') >= 0,
    '12: compact dashboard shows "SQZ 4H" badge when only spy4h squeeze is active');
  ok(html1.indexOf('22.5') >= 0,
    '12: VIX value 22.5 rendered in compact dashboard');

  // Change to both squeeze active — cache key must differ → forces re-render
  sb._mcxSpySqzCache.spy1d = true;
  sb._regimeRenderCompact(22.5, 'MID');

  const html2 = dom._elements['dash-regime-alert'].innerHTML;
  ok(html2.indexOf('SQZ 4H + 1D') >= 0,
    '12: badge updates to "SQZ 4H + 1D" when both spy1d and spy4h are active');

  // No squeeze — badge disappears
  sb._mcxSpySqzCache.spy1d = false;
  sb._mcxSpySqzCache.spy4h = false;
  sb._regimeRenderCompact(22.5, 'MID');

  const html3 = dom._elements['dash-regime-alert'].innerHTML;
  ok(html3.indexOf('SQZ') < 0,
    '12: no squeeze badge in compact dashboard when neither spy1d nor spy4h is active');

  // Verify no-regime path doesn't crash
  sb._regimeRenderCompact(null, null);
  ok(dom._elements['dash-regime-alert'].className.indexOf('regime-na') >= 0,
    '12: no-regime path sets regime-na class without error');
}

// ── summary ──────────────────────────────────────────────────────────────────
console.log('\n' + (fail === 0
  ? 'All ' + pass + ' tests passed.'
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.'));
if (fail > 0) process.exit(1);
