'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Centralized application-source loader for the test suite.
//
// WHY THIS EXISTS
//   Historically every test read `index.html` directly and searched it with
//   text/brace-matching to find real application functions:
//
//       const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
//       function extractFn(src, name) { ... brace-match ... }
//       vm.runInNewContext(extractFn(HTML, 'someRealFn'), sandbox);
//
//   That works only while all application code lives inline inside index.html.
//   As functions are progressively moved out of index.html into external
//   `<script src="./js/...">` files, a test that keeps reading index.html would
//   stop finding the moved function even though the app still works.
//
//   This module is the SINGLE place the tests use to load application source.
//   It derives the load order AUTOMATICALLY from the `<script>` tags in
//   index.html (index.html stays the authoritative source of order — there is
//   no separate manual file list), reads local scripts from disk, preserves the
//   exact document order of inline and external scripts, and concatenates them
//   the same way a browser would execute them. Today index.html contains one
//   inline application `<script>` (plus a remote CDN `<script src>` that is not
//   application code), so `loadAppJavaScriptSource()` returns exactly that inline
//   script — byte-for-byte the same text the old direct reads searched. When
//   functions later move to external local scripts, the same call transparently
//   includes them, in order, with no test changes.
//
// GUARANTEES
//   • Deterministic and fully offline. Never performs any network request.
//   • Remote / CDN scripts are classified but NOT fetched and NOT simulated;
//     they are excluded from the reconstructed application JavaScript because
//     they are third-party libraries, not application code analysed by tests.
//   • Local script paths are resolved relative to index.html and read from the
//     filesystem, with a clear error if a referenced local script is missing.
//   • Path handling uses node's `path` module so it works on POSIX and Windows
//     (forward-slash `src` values in HTML resolve correctly on both).
//   • Top-level `function NAME(...)` declarations are preserved intact so the
//     existing brace-matching helpers in the tests keep working unchanged.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

// Authoritative application document. index.html lives at the repository root;
// this module lives at tests/lib/, so go up two levels.
const DEFAULT_INDEX_HTML = path.resolve(__dirname, '..', '..', 'index.html');

const CLOSE_TAG = '</script>';

// Script `type` values that denote executable JavaScript. An absent/empty type
// is JavaScript by HTML rules. Non-JS types (application/json, text/template,
// …) are treated as data blocks and excluded from the application source.
const JS_TYPES = new Set([
  'text/javascript',
  'application/javascript',
  'text/ecmascript',
  'application/ecmascript',
  'module',
]);

function isJsType(type) {
  if (type == null) return true;
  const t = String(type).trim().toLowerCase();
  return t === '' || JS_TYPES.has(t);
}

// A `src` is remote when it has an explicit URI scheme (http:, https:, data:, …)
// or is protocol-relative (//cdn…). Everything else (./x.js, x.js, ../x.js,
// /abs/x.js) is a local filesystem path relative to index.html.
function classifySrc(src) {
  const s = String(src).trim();
  if (s === '') return 'inline';
  if (/^\/\//.test(s)) return 'remote';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return 'remote';
  return 'local';
}

// Read a single attribute value from a raw `<script ...>` attribute string.
// Handles double-quoted, single-quoted and unquoted forms; returns null when
// the attribute is absent.
function readAttr(attrs, name) {
  const re = new RegExp(name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s"\'=<>`]+))', 'i');
  const m = re.exec(attrs);
  if (!m) return null;
  return m[2] != null ? m[2] : (m[3] != null ? m[3] : (m[4] != null ? m[4] : ''));
}

function loadIndexHtml(htmlPath) {
  const p = htmlPath || DEFAULT_INDEX_HTML;
  return fs.readFileSync(p, 'utf8');
}

// Parse every `<script>` tag in DOCUMENT ORDER. Returns lightweight descriptors
// with the raw attributes, inline body and parsed src/type. JavaScript cannot
// contain a literal `</script>`, so a simple open→next-close scan is correct and
// preserves ordering between inline and external scripts.
function parseScriptTags(html) {
  const tags = [];
  const openRe = /<script\b([^>]*)>/gi;
  let m;
  while ((m = openRe.exec(html)) !== null) {
    const attrs = m[1] || '';
    const contentStart = openRe.lastIndex;
    const closeIdx = html.indexOf(CLOSE_TAG, contentStart);
    if (closeIdx < 0) {
      throw new Error('load-app-source: unterminated <script> tag starting at index ' + m.index);
    }
    tags.push({
      index: m.index,
      attrs,
      inline: html.slice(contentStart, closeIdx),
      src: readAttr(attrs, 'src'),
      type: readAttr(attrs, 'type'),
    });
    openRe.lastIndex = closeIdx + CLOSE_TAG.length;
  }
  return tags;
}

// Resolve, in document order, every `<script>` into a descriptor:
//   { order, kind: 'inline'|'local'|'remote', src, type, isAppJs, code, resolvedPath? }
// Local scripts are read from disk; remote scripts keep code === null (never
// fetched). `isAppJs` is true for executable-JavaScript inline/local scripts.
function loadOrderedScriptSources(options) {
  const opts = options || {};
  const htmlPath = opts.htmlPath || DEFAULT_INDEX_HTML;
  const html = opts.html != null ? opts.html : loadIndexHtml(htmlPath);
  const baseDir = path.dirname(htmlPath);

  return parseScriptTags(html).map(function (tag, i) {
    const hasSrc = tag.src != null && String(tag.src).trim() !== '';
    if (!hasSrc) {
      return {
        order: i,
        kind: 'inline',
        src: null,
        type: tag.type,
        isAppJs: isJsType(tag.type),
        code: tag.inline,
      };
    }
    const kind = classifySrc(tag.src);
    if (kind === 'remote') {
      // Third-party / CDN script: classified, never fetched, never simulated.
      return {
        order: i,
        kind: 'remote',
        src: tag.src,
        type: tag.type,
        isAppJs: false,
        code: null,
      };
    }
    // Local script: resolve relative to index.html, strip any URL query/hash,
    // read from the filesystem with a clear error when missing.
    const cleaned = String(tag.src).trim().replace(/[?#].*$/, '');
    const resolvedPath = path.resolve(baseDir, cleaned);
    let code;
    try {
      code = fs.readFileSync(resolvedPath, 'utf8');
    } catch (err) {
      throw new Error(
        'load-app-source: local script "' + tag.src + '" referenced by ' +
        path.basename(htmlPath) + ' could not be read at ' + resolvedPath +
        ' (' + (err && err.code ? err.code : err && err.message) + ')'
      );
    }
    return {
      order: i,
      kind: 'local',
      src: tag.src,
      type: tag.type,
      isAppJs: isJsType(tag.type),
      code: code,
      resolvedPath: resolvedPath,
    };
  });
}

// Reconstruct the application JavaScript exactly in the order a browser would
// execute it: inline and local scripts, in document order, remote/data blocks
// excluded. Parts are joined with a newline so a trailing `//` comment in one
// script cannot swallow the first line of the next, and so top-level function
// declarations stay top-level for the brace-matching helpers.
function loadAppJavaScriptSource(options) {
  return loadOrderedScriptSources(options)
    .filter(function (s) { return s.isAppJs && s.code != null; })
    .map(function (s) { return s.code; })
    .join('\n');
}

// Extract a top-level `function NAME(...) {...}` (or `async function NAME`) from
// the reconstructed application source by brace-matching, skipping braces inside
// strings, template literals and comments. Mirrors the local extractors the
// tests already use; provided so new tests can extract real functions from the
// centrally-loaded source. Pass `{ source }` to extract from a supplied string
// instead of re-reading the application source.
function extractFunctionSource(name, options) {
  const opts = options || {};
  const src = opts.source != null ? opts.source : loadAppJavaScriptSource(opts);
  let start = -1;
  for (const prefix of ['function ' + name + '(', 'async function ' + name + '(']) {
    const k = src.indexOf(prefix);
    if (k >= 0 && (start < 0 || k < start)) start = k;
  }
  if (start < 0) {
    throw new Error('load-app-source: function not found in reconstructed source: ' + name);
  }
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('load-app-source: no function body found for: ' + name);
  let depth = 0, inStr = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('load-app-source: unterminated function body for: ' + name);
}

module.exports = {
  DEFAULT_INDEX_HTML,
  loadIndexHtml,
  parseScriptTags,
  classifySrc,
  isJsType,
  loadOrderedScriptSources,
  loadAppJavaScriptSource,
  extractFunctionSource,
};
