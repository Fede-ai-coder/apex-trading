'use strict';

// Read-only ownership audit for the next post-MCX monolith extraction.
//
// This deliberately does not rewrite index.html. It compares the complete
// JOURNAL UI marker block with smaller coherent sub-blocks and records exact
// identifier references, rather than substring matches (jFilter must not be
// confused with the unrelated DOM id jFilterPortfolio).

const fs = require('fs');
const crypto = require('crypto');
const vm = require('vm');
const { execFileSync } = require('child_process');

const BASE_SHA = 'ca0fd9327821a030f61cd9d72caf8bc0e5254835';
const INDEX = fs.readFileSync('index.html', 'utf8');

const MARKERS = {
  ui: '// ══════════════════════════════════════════════════════════════\n// JOURNAL UI\n// ══════════════════════════════════════════════════════════════\n\n',
  export: '// ── JOURNAL EXCEL EXPORT ──────────────────────────────────────────\n',
  helpers: '// ── UI HELPERS ────────────────────────────────────────────────────\n',
  quick: '// ── Quick capture: pre-fill ADD form from current EIC analysis ──────\n',
  remote: '// ══════════════════════════════════════════════════════════════\n// JOURNAL REMOTE PERSISTENCE — v1\n',
};

function sha256(src) {
  return crypto.createHash('sha256').update(src, 'utf8').digest('hex');
}

function countLiteral(src, needle) {
  let count = 0;
  let at = 0;
  while ((at = src.indexOf(needle, at)) >= 0) {
    count++;
    at += needle.length;
  }
  return count;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function identifierCount(src, name) {
  const escaped = escapeRegExp(name);
  const re = new RegExp('(?:^|[^A-Za-z0-9_$])' + escaped + '(?![A-Za-z0-9_$])', 'gm');
  return (src.match(re) || []).length;
}

function writeCount(src, name) {
  const escaped = escapeRegExp(name);
  const target = escaped + '(?:\\s*\\[[^\\]\\n]+\\]|\\.[A-Za-z_$][A-Za-z0-9_$]*)?';
  const re = new RegExp('(?:^|[^A-Za-z0-9_$])' + target + '\\s*(?:=|\\+=|-=|\\+\\+|--)', 'gm');
  return (src.match(re) || []).length;
}

function topLevelDeclarations(src) {
  const declarations = [];
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(|^var\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gm;
  let match;
  while ((match = re.exec(src))) {
    declarations.push({
      name: match[1] || match[2],
      kind: match[1] ? (/^async\s+/.test(match[0]) ? 'async function' : 'function') : 'var',
      offset: match.index,
    });
  }
  return declarations;
}

function sideEffects(src) {
  const patterns = {
    document: /\bdocument\s*\./g,
    fetch: /\bfetch\s*\(/g,
    ttCall: /\bttCall\s*\(/g,
    setTimeout: /\bsetTimeout\s*\(/g,
    setInterval: /\bsetInterval\s*\(/g,
    WebSocket: /\b(?:new\s+)?WebSocket\b/g,
    addEventListener: /\baddEventListener\s*\(/g,
    localStorage: /\blocalStorage\s*\./g,
    ResizeObserver: /\bResizeObserver\b/g,
    requestAnimationFrame: /\brequestAnimationFrame\s*\(/g,
  };
  const out = {};
  for (const [name, re] of Object.entries(patterns)) {
    const count = (src.match(re) || []).length;
    if (count) out[name] = count;
  }
  return out;
}

function vmLoad(src, label) {
  try {
    const sandbox = { console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: label + '.js' });
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: String(error && error.stack || error) };
  }
}

function lineAt(offset) {
  return INDEX.slice(0, offset).split('\n').length;
}

function outsideSource(start, end) {
  return INDEX.slice(0, start) + '\n' + INDEX.slice(end);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const [name, marker] of Object.entries(MARKERS)) {
  assert(countLiteral(INDEX, marker) === 1, 'marker identity failed: ' + name);
}

const positions = Object.fromEntries(
  Object.entries(MARKERS).map(([name, marker]) => [name, INDEX.indexOf(marker)])
);
assert(positions.ui < positions.export, 'Journal UI marker order: ui -> export');
assert(positions.export < positions.helpers, 'Journal UI marker order: export -> helpers');
assert(positions.helpers < positions.quick, 'Journal UI marker order: helpers -> quick');
assert(positions.quick < positions.remote, 'Journal UI marker order: quick -> remote');

const candidateSpecs = [
  { name: 'wholeUI', start: positions.ui, end: positions.remote },
  { name: 'listAndView', start: positions.ui, end: positions.export },
  { name: 'excelExport', start: positions.export, end: positions.helpers },
  { name: 'formsDetailAnalytics', start: positions.helpers, end: positions.quick },
  { name: 'quickCaptureAndColors', start: positions.quick, end: positions.remote },
];

function auditCandidate(spec) {
  const source = INDEX.slice(spec.start, spec.end);
  const outside = outsideSource(spec.start, spec.end);
  const declarations = topLevelDeclarations(source);
  const owners = declarations.map((entry) => entry.name);
  const vars = declarations.filter((entry) => entry.kind === 'var').map((entry) => entry.name);
  const external = owners.map((name) => ({
    name,
    totalRefs: identifierCount(INDEX, name),
    sliceRefs: identifierCount(source, name),
    outsideRefs: identifierCount(outside, name),
    outsideWrites: writeCount(outside, name),
  })).filter((entry) => entry.outsideRefs || entry.outsideWrites);

  return {
    name: spec.name,
    start: spec.start,
    end: spec.end,
    startLine: lineAt(spec.start),
    endLine: lineAt(spec.end),
    chars: source.length,
    sha256: sha256(source),
    ownerCount: owners.length,
    owners,
    stateOwners: vars,
    externalOwnerRefs: external,
    externalWriteCount: external.reduce((sum, entry) => sum + entry.outsideWrites, 0),
    vmLoad: vmLoad(source, spec.name),
    sideEffects: sideEffects(source),
  };
}

const candidates = candidateSpecs.map(auditCandidate);
const whole = candidates.find((candidate) => candidate.name === 'wholeUI');
const wholeSource = INDEX.slice(positions.ui, positions.remote);
const rawJFilterOutside = countLiteral(outsideSource(positions.ui, positions.remote), 'jFilter');
const identifierJFilterOutside = identifierCount(outsideSource(positions.ui, positions.remote), 'jFilter');

const changed = execFileSync('git', ['diff', '--name-only', BASE_SHA + '...HEAD'], {
  encoding: 'utf8',
}).trim().split(/\r?\n/).filter(Boolean).sort();
const expectedChanged = [
  'tests/temporary-journal-ui-post-mcx-audit.test.js',
].sort();

const report = {
  baseCommit: BASE_SHA,
  baseChars: INDEX.length,
  baseSha256: sha256(INDEX),
  changedFiles: changed,
  markerPositions: positions,
  candidates,
  identifierProof: {
    jFilterTotalIdentifierRefs: identifierCount(INDEX, 'jFilter'),
    jFilterWholeSliceIdentifierRefs: identifierCount(wholeSource, 'jFilter'),
    jFilterOutsideIdentifierRefs: identifierJFilterOutside,
    rawSubstringOutsideMatches: rawJFilterOutside,
    collisionToken: 'jFilterPortfolio',
    collisionTokenCount: countLiteral(INDEX, 'jFilterPortfolio'),
  },
  remoteCallsRemainCallTimeOnly: {
    jLoadFromBackend: identifierCount(wholeSource, 'jLoadFromBackend'),
    jSyncToBackend: identifierCount(wholeSource, 'jSyncToBackend'),
  },
};

console.log('JOURNAL_UI_POST_MCX_AUDIT_BEGIN');
console.log(JSON.stringify(report, null, 2));
console.log('JOURNAL_UI_POST_MCX_AUDIT_END');

assert(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { encoding: 'utf8' }).trim() === BASE_SHA,
  'pinned post-#394 base does not resolve exactly');
assert(JSON.stringify(changed) === JSON.stringify(expectedChanged),
  'audit branch changed files outside the declared audit artifact: ' + JSON.stringify(changed));
assert(whole.ownerCount === 42, 'whole Journal UI owner count changed: ' + whole.ownerCount);
assert(whole.vmLoad.ok, 'whole Journal UI has a top-level dependency access: ' + whole.vmLoad.error);
assert(whole.externalWriteCount === 0, 'whole Journal UI owner is written outside the candidate');
assert(identifierJFilterOutside === 0, 'jFilter has a true identifier reference outside Journal UI');
assert(rawJFilterOutside === 3, 'expected the three measured jFilterPortfolio substring collisions');
assert(countLiteral(INDEX, 'jFilterPortfolio') === 3, 'jFilterPortfolio collision count changed');
assert(!/JOURNAL REMOTE PERSISTENCE/.test(wholeSource), 'whole Journal UI crosses remote persistence marker');
assert(!/\bfetch\s*\(/.test(wholeSource), 'whole Journal UI owns a fetch call');
assert(!/\b(?:new\s+)?WebSocket\b/.test(wholeSource), 'whole Journal UI owns a WebSocket');
assert(report.remoteCallsRemainCallTimeOnly.jLoadFromBackend === 1,
  'Journal UI call-time jLoadFromBackend entry count changed');
assert(report.remoteCallsRemainCallTimeOnly.jSyncToBackend === 1,
  'Journal UI call-time jSyncToBackend entry count changed');

console.log('JOURNAL_UI_POST_MCX_AUDIT_OK');
