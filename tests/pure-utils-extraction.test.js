'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Structural guard for the "extract pure utilities from index.html" refactor.
//
// It pins the physical shape of the first progressive extraction so a later edit
// cannot silently re-inline a helper, duplicate a definition, reorder the module
// scripts, switch them to ES modules, or introduce top-level side effects. It does
// NOT re-test behaviour (the existing per-domain suites already do) — it asserts the
// invariants the extraction relies on:
//
//   1. the three <script src> tags are present in index.html
//   2. in the required order (indicators, option-symbols, normalizers)
//   3. none of them use type="module", async or defer
//   4. the three module files exist on disk
//   5. loadAppJavaScriptSource() includes all three local scripts
//   6. every extracted function appears exactly once in the reconstructed source
//   7. every extracted function is absent from the residual inline monolith script
//   8. no extracted function is defined twice anywhere in the reconstructed source
//   9. every extracted function is still a top-level `function NAME(...)` declaration
//  10. the three module files contain only function declarations + comments
//      (no top-level statements / calls / side effects)
//
// Run: node tests/pure-utils-extraction.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const L = require('./lib/load-app-source');

let passed = 0;
function check(msg, cond) {
  if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; throw new Error('assertion failed: ' + msg); }
  passed++;
}

// Module → the exact functions physically moved into it (document order).
const MODULES = [
  { src: './js/utils/indicators.js', file: 'js/utils/indicators.js',
    fns: ['smA', 'emA', 'rma', 'calcRSI', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcKCSnap', 'calcADX',
          'calcMACD', 'calcSqueeze', 'calcHVR'] },
  { src: './js/utils/option-symbols.js', file: 'js/utils/option-symbols.js',
    fns: ['buildStreamerSymbol', 'buildOptionDxlinkSymbolCandidate', 'buildCompactOptionDxlinkSymbol',
          'isOptionStreamerSymbolConsistent', 'parseCompactOptionDxlinkSymbol'] },
  { src: './js/utils/normalizers.js', file: 'js/utils/normalizers.js',
    fns: ['normalizeGreekPoints', 'normalizeIvrPercent'] },
];
const ALL_FNS = MODULES.reduce((a, m) => a.concat(m.fns), []);
const REPO = path.join(__dirname, '..');

const html = L.loadIndexHtml();
const tags = L.parseScriptTags(html);
const ordered = L.loadOrderedScriptSources();
const appSrc = L.loadAppJavaScriptSource();
const inline = ordered.filter(s => s.kind === 'inline').map(s => s.code).join('\n');

function defCount(src, fn) {
  return (src.match(new RegExp('function\\s+' + fn + '\\s*\\(', 'g')) || []).length;
}

// 1 + 2. The three module tags are present, in the required order, as a contiguous
// group placed immediately before the inline monolith and after the remote CDN script.
{
  const utilTags = tags.filter(t => t.src && /^\.\/js\/utils\//.test(t.src));
  check('1: all three js/utils <script src> tags are present', utilTags.length === 3);
  const order = utilTags.map(t => t.src);
  check('2: module scripts are ordered indicators, option-symbols, normalizers',
    order[0] === './js/utils/indicators.js' &&
    order[1] === './js/utils/option-symbols.js' &&
    order[2] === './js/utils/normalizers.js');

  const kinds = ordered.map(s => s.src || '(inline)');
  const firstUtil = kinds.indexOf('./js/utils/indicators.js');
  const lastUtil = kinds.indexOf('./js/utils/normalizers.js');
  const inlineIdx = ordered.findIndex(s => s.kind === 'inline');
  const remoteIdx = ordered.findIndex(s => s.kind === 'remote');
  check('2: module scripts precede the inline application script', lastUtil < inlineIdx);
  check('2: module scripts come after the remote CDN script', remoteIdx >= 0 && firstUtil > remoteIdx);
  check('2: the three module scripts are a contiguous block', lastUtil - firstUtil === 2);
}

// 3. No module tag uses type="module", async or defer (they must stay classic scripts).
{
  const utilTags = tags.filter(t => t.src && /^\.\/js\/utils\//.test(t.src));
  utilTags.forEach(t => {
    check('3: ' + t.src + ' is not type="module"', !/module/i.test(String(t.type || '')));
    check('3: ' + t.src + ' has no async attribute', !/(^|[\s])async([\s=]|$)/i.test(t.attrs));
    check('3: ' + t.src + ' has no defer attribute', !/(^|[\s])defer([\s=]|$)/i.test(t.attrs));
  });
}

// 4 + 5. The files exist on disk and the loader classifies each as a local app script.
{
  MODULES.forEach(m => {
    check('4: ' + m.file + ' exists on disk', fs.existsSync(path.join(REPO, m.file)));
    const rec = ordered.find(s => s.src === m.src);
    check('5: loadAppJavaScriptSource() includes ' + m.src + ' as a local app script',
      rec && rec.kind === 'local' && rec.isAppJs === true && typeof rec.code === 'string' && rec.code.length > 0);
  });
}

// 6 + 7 + 8 + 9. Definition-site invariants for every extracted function.
{
  ALL_FNS.forEach(fn => {
    check('6: ' + fn + ' appears exactly once in the reconstructed source', defCount(appSrc, fn) === 1);
    check('7: ' + fn + ' is absent from the residual inline monolith', defCount(inline, fn) === 0);
    check('8: ' + fn + ' has no duplicate definition anywhere', defCount(appSrc, fn) === 1);
    const body = L.extractFunctionSource(fn, { source: appSrc });
    check('9: ' + fn + ' is still a top-level function declaration', new RegExp('^function\\s+' + fn + '\\s*\\(').test(body));
  });
}

// 9b. Each function lives in its assigned module file (and only there).
{
  MODULES.forEach(m => {
    const text = fs.readFileSync(path.join(REPO, m.file), 'utf8');
    m.fns.forEach(fn => {
      check('9: ' + fn + ' is defined in ' + m.file, defCount(text, fn) === 1);
      MODULES.filter(o => o !== m).forEach(other => {
        const otherText = fs.readFileSync(path.join(REPO, other.file), 'utf8');
        check('9: ' + fn + ' does not leak into ' + other.file, defCount(otherText, fn) === 0);
      });
    });
  });
}

// 10. Each module file contains ONLY function declarations and comments — removing the
// declared functions and all comments must leave nothing but whitespace (no top-level
// statements, calls, assignments, IIFEs or other side effects at load time).
{
  MODULES.forEach(m => {
    let text = fs.readFileSync(path.join(REPO, m.file), 'utf8');
    // Remove the exact source of every declared function (captures inner helpers too).
    m.fns.forEach(fn => {
      const src = L.extractFunctionSource(fn, { source: text });
      const at = text.indexOf(src);
      check('10: ' + fn + ' source located in ' + m.file, at >= 0);
      text = text.slice(0, at) + text.slice(at + src.length);
    });
    // Strip block and line comments, then all whitespace.
    const residue = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
      .replace(/\s+/g, '');
    check('10: ' + m.file + ' has no top-level code beyond functions + comments', residue === '');
  });
}

console.log('PASS: pure-utils extraction structure (' + passed + ' checks)');
