#!/usr/bin/env node
/*
 * Static source-level tests for the Dashboard "VIX context reminder" badge.
 *
 * index.html is a single monolithic file (no module system / no DOM test
 * harness), so these are lightweight static assertions over the source text.
 * They guard the pure-UI enhancement that places a persistent, theme-aware
 * reminder badge immediately beside the Dashboard VIX value:
 *
 *   - badge renders wherever the VIX value is rendered (static markup + the
 *     JS re-render path, so it survives Dashboard refreshes/re-renders),
 *   - the exact badge text and tooltip text exist,
 *   - a subtle (non-aggressive) pulse animation + reduced-motion guard exist,
 *   - responsive wrapping is enabled (wrap below VIX on narrow layouts),
 *   - the badge coexists with the existing regime banner features (SPY squeeze
 *     badge + low-VIX naked-call notes) without removing them, and
 *   - no backend / API / VIX-calculation changes were introduced, and the
 *     badge constant is defined before it is referenced (no ReferenceError).
 *
 * Run: node tests/dashboard-vix-context-badge.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

// Residual full-document reader: this test verifies markup, inline CSS
// (@keyframes / :hover / :focus tooltip rules) and static DOM placement of the
// VIX-context badge — all of which live in index.html, not in extracted JS — so
// it deliberately loads the whole document via the centralized loader.
const SRC = require('./lib/load-app-source').loadIndexHtml();

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failures.push(name); console.log('  FAIL ' + name); }
}
// Extract a function body by brace matching, starting at `function <name>`.
function fnBody(name) {
  const start = SRC.indexOf('function ' + name);
  if (start === -1) return '';
  const open = SRC.indexOf('{', start);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    const c = SRC[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return SRC.slice(start, i + 1); }
  }
  return SRC.slice(start);
}

// Source uses the &#9888; HTML entity for the ⚠ warning sign; the test asserts
// against the source form (rendered DOM shows ⚠ READ MARKET CONTEXT ...).
const BADGE_TEXT = 'READ MARKET CONTEXT MULTIPLE TIMES A DAY';
const BADGE_TEXT_SRC = '&#9888; READ MARKET CONTEXT MULTIPLE TIMES A DAY';
const TOOLTIP_TEXT = 'Market conditions can change quickly. Review Market Context several times during the trading session before opening, adjusting or closing positions.';

console.log('Dashboard VIX context reminder badge - static tests\n');

// 1. Badge text + tooltip text exist -----------------------------------------
check('badge text present', SRC.includes(BADGE_TEXT));
check('badge warning glyph (⚠ via &#9888;) precedes the text', SRC.includes(BADGE_TEXT_SRC));
check('tooltip text present', SRC.includes(TOOLTIP_TEXT));
check('badge uses the .vix-ctx-badge class', SRC.includes('class="vix-ctx-badge"'));
check('tooltip uses the .vix-ctx-tip element', SRC.includes('class="vix-ctx-tip"'));

// 2. Badge renders next to the VIX value (static Dashboard markup) ------------
const dashStart = SRC.indexOf('id="dash-regime-alert"');
check('dash-regime-alert markup exists', dashStart !== -1);
// Look at the static alert block (up to the next regime-transition wrapper).
const dashBlock = dashStart !== -1
  ? SRC.slice(dashStart, SRC.indexOf('dash-regime-transition', dashStart))
  : '';
check('static markup wraps VIX value + badge in .regime-compact-vixwrap',
  dashBlock.includes('regime-compact-vixwrap'));
check('static markup renders the badge beside the VIX value',
  dashBlock.includes('regime-compact-val') && dashBlock.includes('vix-ctx-badge'));
check('static badge carries the tooltip text', dashBlock.includes(TOOLTIP_TEXT));

// 3. Badge survives Dashboard refreshes/re-renders ---------------------------
// The regime card is re-rendered by _regimeRenderCompact on every VIX update;
// the badge must be re-emitted in BOTH the "no regime" and live-regime branches.
const renderBody = fnBody('_regimeRenderCompact');
check('_regimeRenderCompact exists', renderBody.length > 0);
check('re-render references the shared badge constant', renderBody.includes('_VIX_CTX_BADGE'));
const badgeRefs = (renderBody.match(/_VIX_CTX_BADGE/g) || []).length;
check('badge re-emitted in both render branches (awaiting + live regime)', badgeRefs >= 2);
check('badge constant is defined before _regimeRenderCompact (no ReferenceError)',
  SRC.indexOf('var _VIX_CTX_BADGE') !== -1 &&
  SRC.indexOf('var _VIX_CTX_BADGE') < SRC.indexOf('function _regimeRenderCompact'));
check('shared badge constant carries badge + tooltip text',
  /var _VIX_CTX_BADGE\s*=/.test(SRC) && SRC.includes(BADGE_TEXT_SRC) && SRC.includes(TOOLTIP_TEXT));

// 4. Coexistence with existing regime banner features (PR #278 + SPY squeeze) -
// The badge must be additive: it must NOT remove the low-VIX naked-call notes
// or the SPY squeeze badge that already live inside the compact regime card.
check('low-VIX naked-call notes still rendered (regime-compact-notes preserved)',
  renderBody.includes('regime-compact-notes') && renderBody.includes('notesHtml'));
check('SPY squeeze badge still rendered in compact card', renderBody.includes('_mcxSpySqzBadgeHtml(true)'));
check('context badge sits outside the VIX column, beside the SPY squeeze badge',
  renderBody.includes("_mcxSpySqzBadgeHtml(true)+'</div>'+_VIX_CTX_BADGE"));

// 5. Visual behaviour: subtle, non-aggressive pulse + theme-aware ------------
check('pulse keyframes vixCtxPulse defined', SRC.includes('@keyframes vixCtxPulse'));
check('badge uses the pulse animation', /\.vix-ctx-badge\{[^}]*animation:\s*vixCtxPulse/.test(SRC));
const kf = SRC.slice(SRC.indexOf('@keyframes vixCtxPulse'),
                     SRC.indexOf('@keyframes vixCtxPulse') + 220);
// "Not aggressive" = a gentle cycle (>= ~3s) and opacity never drops to 0/hidden.
check('pulse is gentle (>= 3s cycle, not a fast flash)',
  /animation:\s*vixCtxPulse\s*3(\.\d+)?s/.test(SRC));
check('pulse never fully hides the badge (no opacity:0 keyframe)', !/opacity:0[;\s}]/.test(kf));
check('badge remains visible (base style has no display:none)',
  !/\.vix-ctx-badge\{[^}]*display:\s*none/.test(SRC));
check('reduced-motion preference disables the pulse',
  /prefers-reduced-motion:reduce\)\{[^}]*\.vix-ctx-badge[^}]*animation:\s*none/.test(SRC));
check('badge colours use theme variables (works in light + dark)',
  /\.vix-ctx-badge\{[^}]*color:var\(--am\)/.test(SRC));
check('tooltip colours use theme variables (works in light + dark)',
  /\.vix-ctx-tip\{[^}]*background:var\(--bg2\)/.test(SRC) &&
  /\.vix-ctx-tip\{[^}]*color:var\(--tx\)/.test(SRC));

// 6. Responsive: inline on desktop, wrap below VIX on narrow layouts ---------
check('vix wrapper enables flex-wrap (badge wraps below VIX when narrow)',
  /\.regime-compact-vixwrap\{[^}]*flex-wrap:wrap/.test(SRC));
check('container allows the tooltip to escape (overflow not clipped)',
  /\.regime-compact\{[^}]*overflow:visible/.test(SRC));

// 7. Tooltip surfaces on hover AND focus (desktop hover + mobile tap/focus) ---
check('tooltip shown on hover', SRC.includes('.vix-ctx-badge:hover .vix-ctx-tip'));
check('tooltip shown on focus (keyboard / mobile tap)',
  SRC.includes('.vix-ctx-badge:focus .vix-ctx-tip') || SRC.includes(':focus-within .vix-ctx-tip'));
check('badge is focusable for tap/keyboard access', SRC.includes('class="vix-ctx-badge" tabindex="0"'));

// 8. Pure UI: no backend / API / VIX-calculation changes ---------------------
check('badge markup does not touch fetch/XHR (frontend only)',
  !/_VIX_CTX_BADGE[^;]*fetch\(/.test(SRC));
check('badge constant is a plain string literal (no API call)',
  /var _VIX_CTX_BADGE\s*=\s*'/.test(SRC));

// ---------------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.log('FAILED:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('ALL TESTS PASSED');
