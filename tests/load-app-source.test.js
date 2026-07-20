'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the centralized application-source loader (tests/lib/load-app-source).
//
// These use DEDICATED FIXTURES under tests/lib/fixtures/ so they never depend on
// (or modify) the real index.html. They verify the infrastructural contract that
// lets the rest of the suite keep finding real application code after functions
// are progressively moved from index.html into external local `<script src>`
// files.
//
// Run: node tests/load-app-source.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const Module = require('module');
const assert = require('assert');

const L = require('./lib/load-app-source');

const ORDERED = path.join(__dirname, 'lib', 'fixtures', 'ordered', 'index.html');
const MISSING = path.join(__dirname, 'lib', 'fixtures', 'missing', 'index.html');

let passed = 0;
function check(msg, cond) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
    throw new Error('assertion failed: ' + msg);
  }
  passed++;
}

// 1. Reads index.html.
{
  const html = L.loadIndexHtml(ORDERED);
  check('1: loadIndexHtml returns the fixture document text', html.includes('<div id="root">'));
  check('1: default document path points at repo-root index.html',
    L.DEFAULT_INDEX_HTML.replace(/\\/g, '/').endsWith('/index.html'));
}

// 2. Detects the <script> tags in document order.
{
  const tags = L.parseScriptTags(L.loadIndexHtml(ORDERED));
  check('2: six <script> tags detected in document order', tags.length === 6);
  check('2: order[0] is the remote vendor script', tags[0].src === 'https://cdn.example.com/vendor.min.js');
  check('2: order[1] is the inline-before script', tags[1].src == null && tags[1].inline.includes('inlineBefore'));
  check('2: order[2] is external-a', tags[2].src === './external-a.js');
  check('2: order[3] is external-b in a subdir', tags[3].src === 'sub/external-b.js');
  check('2: order[4] is the app-config data block', tags[4].type === 'application/json');
  check('2: order[5] is the inline-after script', tags[5].src == null && tags[5].inline.includes('inlineAfter'));
}

// 3. Includes inline scripts in the reconstructed application source.
{
  const app = L.loadAppJavaScriptSource({ htmlPath: ORDERED });
  check('3: inline-before is included', app.includes('function inlineBefore()'));
  check('3: inline-after is included', app.includes('function inlineAfter()'));
}

// 4. Resolves and reads local scripts from disk.
{
  const app = L.loadAppJavaScriptSource({ htmlPath: ORDERED });
  check('4: sibling local script external-a resolved and included', app.includes("function externalA() { return 'a'; }"));
  check('4: subdir local script external-b resolved and included', app.includes("function externalB() { return 'b'; }"));
  const srcs = L.loadOrderedScriptSources({ htmlPath: ORDERED });
  const b = srcs.find(function (s) { return s.src === 'sub/external-b.js'; });
  check('4: local script resolvedPath ends at the on-disk file',
    b && b.resolvedPath === path.resolve(path.dirname(ORDERED), 'sub', 'external-b.js'));
}

// 5. Preserves the relative order inline → external → external → inline.
{
  const app = L.loadAppJavaScriptSource({ htmlPath: ORDERED });
  const iBefore = app.indexOf('function inlineBefore');
  const iA = app.indexOf('function externalA');
  const iB = app.indexOf('function externalB');
  const iAfter = app.indexOf('function inlineAfter');
  check('5: relative order is inlineBefore < externalA < externalB < inlineAfter',
    iBefore >= 0 && iBefore < iA && iA < iB && iB < iAfter);
}

// 6. Concatenation is deterministic (stable across repeated calls).
{
  const a1 = L.loadAppJavaScriptSource({ htmlPath: ORDERED });
  const a2 = L.loadAppJavaScriptSource({ htmlPath: ORDERED });
  check('6: repeated loads produce identical output', a1 === a2);
  const parts = L.loadOrderedScriptSources({ htmlPath: ORDERED })
    .filter(function (s) { return s.isAppJs && s.code != null; })
    .map(function (s) { return s.code; });
  check('6: app source is exactly the included parts joined by newline', a1 === parts.join('\n'));
}

// 7. Clear, readable error when a referenced local script is missing.
{
  let err = null;
  try { L.loadAppJavaScriptSource({ htmlPath: MISSING }); } catch (e) { err = e; }
  check('7: missing local script throws', err instanceof Error);
  check('7: error names the offending script', err && err.message.includes('does-not-exist.js'));
  check('7: error is a filesystem read failure, not a network error',
    err && /could not be read/.test(err.message));
}

// 8. No network requests are performed (fully offline), even with a remote script.
{
  const originalLoad = Module._load;
  const blocked = ['http', 'https', 'http2', 'net', 'tls', 'dns', 'node:http', 'node:https', 'node:net', 'node:tls', 'node:dns'];
  Module._load = function (request, parent, isMain) {
    if (blocked.indexOf(request) !== -1) {
      throw new Error('network module "' + request + '" must not be loaded by load-app-source');
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  let threw = null, app = null;
  try {
    app = L.loadAppJavaScriptSource({ htmlPath: ORDERED });
  } catch (e) {
    threw = e;
  } finally {
    Module._load = originalLoad;
  }
  check('8: loading succeeds without touching any network module', threw === null);
  check('8: remote script content is absent (never fetched)', app && !app.includes('vendor'));
}

// 9. Remote / CDN scripts are classified explicitly and never fetched/simulated.
{
  const srcs = L.loadOrderedScriptSources({ htmlPath: ORDERED });
  const remote = srcs.find(function (s) { return s.kind === 'remote'; });
  check('9: remote script is classified as kind="remote"', !!remote);
  check('9: remote script is not treated as application JS', remote && remote.isAppJs === false);
  check('9: remote script code is null (never fetched, never simulated)', remote && remote.code === null);
  const app = L.loadAppJavaScriptSource({ htmlPath: ORDERED });
  check('9: remote script is excluded from reconstructed application source', !app.includes('vendor.min.js'));
  check('9: classifySrc distinguishes remote vs local',
    L.classifySrc('https://cdn/x.js') === 'remote' &&
    L.classifySrc('//cdn/x.js') === 'remote' &&
    L.classifySrc('data:text/javascript,0') === 'remote' &&
    L.classifySrc('./x.js') === 'local' &&
    L.classifySrc('js/x.js') === 'local' &&
    L.classifySrc('/abs/x.js') === 'local');
  // Non-JS data blocks are excluded too.
  check('9: non-JS (application/json) block is excluded from application source',
    !app.includes('"feature":true'));
}

// 10. A real function can be extracted from the reconstructed source.
{
  // From a fixture: crosses the external-b boundary to prove reconstruction works.
  const fn = L.extractFunctionSource('externalB', { htmlPath: ORDERED });
  check('10: extractFunctionSource returns the whole function body from a local script',
    fn === "function externalB() { return 'b'; }");
  // From the REAL application source: a genuine function must be extractable and parseable.
  const realFn = L.extractFunctionSource('smA');
  check('10: a real application function extracts from the reconstructed source',
    /^function smA\s*\(/.test(realFn) && realFn.trim().endsWith('}'));
  check('10: the extracted real function is syntactically valid',
    (function () { try { new Function('return (' + realFn + ')')(); return true; } catch (e) { return false; } })());
  // Unknown names give a clear error.
  let e2 = null;
  try { L.extractFunctionSource('__definitely_not_a_function__', { htmlPath: ORDERED }); } catch (e) { e2 = e; }
  check('10: extracting an unknown function throws a clear error',
    e2 && /function not found/.test(e2.message));
}

// 11. Path handling works for POSIX and Windows conventions.
{
  // The loader resolves forward-slash HTML `src` values (the HTML convention)
  // regardless of the host OS separator, by delegating to node's path module.
  const srcs = L.loadOrderedScriptSources({ htmlPath: ORDERED });
  const b = srcs.find(function (s) { return s.src === 'sub/external-b.js'; });
  check('11: forward-slash subdir src resolves on the current platform',
    b && fs.existsSync(b.resolvedPath) && b.resolvedPath.indexOf(path.sep + 'sub' + path.sep) !== -1);
  // classifySrc is separator-agnostic: URL detection is scheme-based, so both
  // POSIX-style and Windows-style relative paths classify as local.
  check('11: relative paths classify as local under both path styles',
    L.classifySrc('sub/external-b.js') === 'local' &&
    L.classifySrc('sub\\external-b.js') === 'local');
  // The resolved path never hardcodes a separator; it uses the platform's.
  check('11: resolvedPath is absolute for the current platform',
    b && path.isAbsolute(b.resolvedPath));
  // POSIX and Windows resolvers both yield an absolute path from the same src.
  const baseDir = path.dirname(ORDERED);
  check('11: path.posix and path.win32 both produce absolute resolutions',
    path.posix.isAbsolute(path.posix.resolve('/repo/tests/lib/fixtures/ordered', 'sub/external-b.js')) &&
    path.win32.isAbsolute(path.win32.resolve('C:\\repo', 'sub\\external-b.js')));
  void baseDir;
}

// 12. Order is derived from index.html — there is NO duplicated manual source list.
{
  // Proof by construction: reordering the fixture's <script> tags reorders the
  // loader's output, which is impossible if order came from a hardcoded list.
  const html = L.loadIndexHtml(ORDERED);
  const reordered = html
    .replace('<script src="./external-a.js"></script>', '<!--A-->')
    .replace('<script src="sub/external-b.js"></script>', '<script src="./external-a.js"></script>')
    .replace('<!--A-->', '<script src="sub/external-b.js"></script>');
  const app = L.loadAppJavaScriptSource({ htmlPath: ORDERED, html: reordered });
  check('12: swapping script tags swaps output order (order is document-derived)',
    app.indexOf('function externalB') < app.indexOf('function externalA'));
  // The loader module carries no baked-in list of application .js filenames.
  const moduleSource = fs.readFileSync(path.join(__dirname, 'lib', 'load-app-source.js'), 'utf8');
  const hardcodedList = /\[\s*(['"])[^'"]*\.js\1\s*,/.test(moduleSource);
  check('12: loader source contains no hardcoded array of .js application files', !hardcodedList);
}

console.log('PASS: load-app-source loader (' + passed + ' checks)');
