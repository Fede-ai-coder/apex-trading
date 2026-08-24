'use strict';
const fs = require('fs');
const crypto = require('crypto');
const vm = require('vm');

const INDEX = fs.readFileSync('index.html', 'utf8');
const START = '// ══════════════════════════════════════════════════════════════\n// JOURNAL UI\n// ══════════════════════════════════════════════════════════════\n\n';
const END = '// ══════════════════════════════════════════════════════════════\n// JOURNAL REMOTE PERSISTENCE — v1\n';

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}
function count(src, needle) {
  let n = 0, p = 0;
  while ((p = src.indexOf(needle, p)) >= 0) { n++; p += needle.length; }
  return n;
}
function topLevelNames(src) {
  const out = [];
  const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^var\s+([A-Za-z_$][\w$]*)\s*=/gm;
  let m;
  while ((m = re.exec(src))) out.push(m[1] || m[2]);
  return out;
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(count(INDEX, START) === 1, 'expected exactly one JOURNAL UI start marker');
assert(count(INDEX, END) === 1, 'expected exactly one JOURNAL REMOTE PERSISTENCE end marker');
const start = INDEX.indexOf(START);
const end = INDEX.indexOf(END);
assert(start >= 0 && end > start, 'invalid Journal UI slice bounds');
const slice = INDEX.slice(start, end);

const names = topLevelNames(slice);
const states = ['jView', 'jFilter', 'jDetailId', 'jEditLeg', 'J_LEG_TEMPLATES'];
const stateRefs = {};
for (const name of states) {
  stateRefs[name] = {
    base: count(INDEX, name),
    slice: count(slice, name),
    outside: count(INDEX, name) - count(slice, name),
  };
}

let vmLoad = { ok: true, error: null };
try {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(slice, sandbox, { filename: 'journal-ui-candidate.js' });
} catch (e) {
  vmLoad = { ok: false, error: String(e && e.stack || e) };
}

const report = {
  baseChars: INDEX.length,
  baseSha256: sha256(INDEX),
  sliceAt: start,
  sliceChars: slice.length,
  sliceSha256: sha256(slice),
  topLevelOwnerCount: names.length,
  topLevelOwners: names,
  stateRefs,
  vmLoad,
  containsDomText: /\bdocument\s*\./.test(slice),
  containsFetchCall: /\bfetch\s*\(/.test(slice),
  containsTimer: /\bset(?:Timeout|Interval)\s*\(/.test(slice),
  containsWebSocket: /\bnew\s+WebSocket\b/.test(slice),
  containsRemotePersistenceMarker: slice.includes('JOURNAL REMOTE PERSISTENCE'),
  remoteEntryCalls: {
    jLoadFromBackend: count(slice, 'jLoadFromBackend'),
    jSyncToBackend: count(slice, 'jSyncToBackend'),
  },
};

console.log('JOURNAL_UI_AUDIT_BEGIN');
console.log(JSON.stringify(report, null, 2));
console.log('JOURNAL_UI_AUDIT_END');

assert(vmLoad.ok, 'candidate has top-level dependency access: ' + vmLoad.error);
assert(!report.containsRemotePersistenceMarker, 'slice crosses into remote persistence');
assert(names.includes('runJournalPanel'), 'runJournalPanel missing');
assert(names.includes('renderJournalView'), 'renderJournalView missing');
assert(names.includes('renderJournalList'), 'renderJournalList missing');
assert(names.includes('renderJournalDetail'), 'renderJournalDetail missing');
assert(names.includes('renderJournalAnalytics'), 'renderJournalAnalytics missing');
assert(names.includes('showJournalExportModal'), 'export modal missing');
assert(names.includes('runJournalExport'), 'export runner missing');
assert(names.includes('jQuickCapture'), 'quick capture missing');
assert(stateRefs.jView.outside === 0, 'jView has references outside candidate slice');
assert(stateRefs.jFilter.outside === 0, 'jFilter has references outside candidate slice');
assert(stateRefs.jDetailId.outside === 0, 'jDetailId has references outside candidate slice');
assert(stateRefs.jEditLeg.outside === 0, 'jEditLeg has references outside candidate slice');
assert(stateRefs.J_LEG_TEMPLATES.outside === 0, 'J_LEG_TEMPLATES has references outside candidate slice');
console.log('JOURNAL_UI_AUDIT_OK');
