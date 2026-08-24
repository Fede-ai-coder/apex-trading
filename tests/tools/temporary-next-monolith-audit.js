#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { execFileSync } = require('child_process');

const BASE = '72a2c5759e17a3fd0477f62724d6fd4490be1c8f';
const SRC = fs.readFileSync('index.html', 'utf8');
const baseSrc = execFileSync('git', ['show', `${BASE}:index.html`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
if (SRC !== baseSrc) throw new Error('REFUSE_INDEX_NOT_BYTE_IDENTICAL_TO_POST_JOURNAL_BASE');

function lineOf(pos) { return SRC.slice(0, pos).split('\n').length; }
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function countWord(src, name) {
  const m = src.match(new RegExp(`(^|[^A-Za-z0-9_$])${escRe(name)}(?=$|[^A-Za-z0-9_$])`, 'g'));
  return m ? m.length : 0;
}
function lineTextAt(pos) {
  const a = SRC.lastIndexOf('\n', pos) + 1;
  const b0 = SRC.indexOf('\n', pos);
  const b = b0 < 0 ? SRC.length : b0;
  return SRC.slice(a, b).trim().slice(0, 240);
}
function contexts(name, excludeStart, excludeEnd, limit = 12) {
  const re = new RegExp(`(^|[^A-Za-z0-9_$])(${escRe(name)})(?=$|[^A-Za-z0-9_$])`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(SRC))) {
    const p = m.index + m[1].length;
    if (p >= excludeStart && p < excludeEnd) continue;
    out.push({ line: lineOf(p), text: lineTextAt(p) });
    if (out.length >= limit) break;
  }
  return out;
}

function scanBalanced(start, openAt, endChar) {
  let curly = 0, paren = 0, bracket = 0;
  let inS = null, esc = false, inLine = false, inBlock = false;
  for (let i = openAt; i < SRC.length; i++) {
    const c = SRC[i], n = SRC[i + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
    if (inS) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') curly++;
    else if (c === '}') {
      curly--;
      if (endChar === '}' && curly === 0) return i + 1;
    } else if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === '[') bracket++;
    else if (c === ']') bracket--;
    else if (c === ';' && endChar === ';' && curly === 0 && paren === 0 && bracket === 0) return i + 1;
  }
  return SRC.length;
}

const decls = [];
const fnRe = /^(async\s+function|function)\s+([A-Za-z_$][\w$]*)\s*\(/gm;
let m;
while ((m = fnRe.exec(SRC))) {
  const start = m.index;
  const open = SRC.indexOf('{', fnRe.lastIndex);
  if (open < 0) continue;
  const end = scanBalanced(start, open, '}');
  decls.push({ name: m[2], kind: m[1], start, end, line: lineOf(start) });
}
const varRe = /^(var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/gm;
while ((m = varRe.exec(SRC))) {
  const start = m.index;
  const eq = SRC.indexOf('=', start);
  const end = scanBalanced(start, eq + 1, ';');
  decls.push({ name: m[2], kind: m[1], start, end, line: lineOf(start) });
}
decls.sort((a, b) => a.start - b.start);
const byName = new Map(decls.map(d => [d.name, d]));

function sideEffects(body) {
  const tokens = [
    ['document', /\bdocument\s*\./g],
    ['fetch', /\bfetch\s*\(/g],
    ['ttCall', /\bttCall\s*\(/g],
    ['setInterval', /\bsetInterval\s*\(/g],
    ['setTimeout', /\bsetTimeout\s*\(/g],
    ['WebSocket', /\bWebSocket\b/g],
    ['addEventListener', /\baddEventListener\s*\(/g],
    ['localStorage', /\blocalStorage\s*\./g],
    ['ResizeObserver', /\bResizeObserver\b/g],
    ['requestAnimationFrame', /\brequestAnimationFrame\s*\(/g],
  ];
  const o = {};
  for (const [k, re] of tokens) {
    const n = (body.match(re) || []).length;
    if (n) o[k] = n;
  }
  return o;
}

function ownerDetail(name) {
  const d = byName.get(name);
  if (!d) return { name, missing: true };
  const own = SRC.slice(d.start, d.end);
  const externalCount = countWord(SRC.slice(0, d.start) + SRC.slice(d.end), name);
  return {
    name, kind: d.kind, line: d.line, start: d.start, end: d.end, chars: d.end - d.start,
    totalRefs: countWord(SRC, name), externalRefs: externalCount,
    externalContexts: contexts(name, d.start, d.end),
    sideEffects: sideEffects(own),
  };
}

function family(name, owners) {
  const present = owners.map(n => byName.get(n)).filter(Boolean);
  if (!present.length) return { name, owners: owners.map(ownerDetail), missingAll: true };
  const start = Math.min(...present.map(d => d.start));
  const end = Math.max(...present.map(d => d.end));
  const ownerSet = new Set(owners);
  const foreign = decls.filter(d => d.start >= start && d.start < end && !ownerSet.has(d.name));
  const body = SRC.slice(start, end);
  return {
    name,
    start, end, startLine: lineOf(start), endLine: lineOf(end), chars: end - start,
    ownerCount: owners.length,
    missingOwners: owners.filter(n => !byName.has(n)),
    foreignDeclarationsInsideSpan: foreign.map(d => ({ name: d.name, kind: d.kind, line: d.line })),
    sideEffects: sideEffects(body),
    owners: owners.map(ownerDetail),
    leadingContext: SRC.slice(Math.max(0, start - 500), start).split('\n').slice(-10),
    trailingContext: SRC.slice(end, Math.min(SRC.length, end + 500)).split('\n').slice(0, 10),
  };
}

const journalUI = [
  'runJournalPanel', 'renderJournalView', 'renderJournalList',
  'renderJournalDetail', 'renderJournalAnalytics'
];
const journalSync = ['jLoadFromBackend', 'jSyncToBackend', 'jSaveRemote'];
const regime = [
  '_REGIME_ADJ_RULES', '_VIX_NAKED_CALL_MAX', '_VIX_AVOID_NAKED_PUT_MAX',
  '_VIX_LOW_IV_STRATEGY_MAX', '_REGIME_OVEREXT_FORBIDDEN', '_REGIME_CONTENT',
  '_regimeDynForbidden', '_regimeCompactVixNotes', '_mcxRegimeOf',
  '_regimeSections', '_regimeRenderCompact', '_regimeRenderMain', '_regimeRefresh',
  '_regimeCompactKey', '_regimeMainKey'
];
const mcxChartLifecycle = [
  'ffBackendCandlesMcxCharts', '_mcxBackendFetchInFlight', '_mcxSpySqzCache',
  '_mcxSpySqzBadgeHtml', '_mcxRenderSpySqzBadge', '_mcxRenderCharts',
  '_mcxDrawVixCurve', '_mcxInit'
];

const prefixes = ['_mcx', '_regime', '_REGIME', '_VIX_', 'j', 'runJournal', 'renderJournal'];
const relevantInventory = decls
  .filter(d => prefixes.some(p => d.name.startsWith(p)))
  .map(d => ({
    name: d.name, kind: d.kind, line: d.line, start: d.start, chars: d.end - d.start,
    externalRefs: countWord(SRC.slice(0, d.start) + SRC.slice(d.end), d.name),
    sideEffects: sideEffects(SRC.slice(d.start, d.end)),
  }));

// State-write probes for known cross-boundary variables. These intentionally
// report textual assignment contexts outside the declaration itself.
function assignmentContexts(name, limit = 20) {
  const d = byName.get(name) || { start: -1, end: -1 };
  const re = new RegExp(`${escRe(name)}(?:\\.[A-Za-z_$][\\w$]*)?\\s*(?:=|\\+=|-=|\\+\\+|--)`, 'g');
  const out = [];
  let x;
  while ((x = re.exec(SRC))) {
    if (x.index >= d.start && x.index < d.end) continue;
    out.push({ line: lineOf(x.index), text: lineTextAt(x.index) });
    if (out.length >= limit) break;
  }
  return out;
}

const report = {
  base: BASE,
  indexChars: SRC.length,
  declarationCount: decls.length,
  families: {
    journalUI: family('journalUI', journalUI),
    journalSync: family('journalSync', journalSync),
    regime: family('regime', regime),
    mcxChartLifecycle: family('mcxChartLifecycle', mcxChartLifecycle),
  },
  stateWritesOutsideDeclaration: {
    _regimeCompactKey: assignmentContexts('_regimeCompactKey'),
    _regimeMainKey: assignmentContexts('_regimeMainKey'),
    _mcxSpySqzCache: assignmentContexts('_mcxSpySqzCache'),
    _mcxBackendFetchInFlight: assignmentContexts('_mcxBackendFetchInFlight'),
  },
  relevantInventory,
};

fs.writeFileSync('/tmp/next-monolith-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  base: report.base,
  indexChars: report.indexChars,
  families: Object.fromEntries(Object.entries(report.families).map(([k, v]) => [k, {
    lines: v.startLine && `${v.startLine}-${v.endLine}`,
    chars: v.chars,
    missing: v.missingOwners,
    foreign: v.foreignDeclarationsInsideSpan && v.foreignDeclarationsInsideSpan.map(x => x.name),
    sideEffects: v.sideEffects,
  }])),
  stateWritesOutsideDeclaration: report.stateWritesOutsideDeclaration,
}, null, 2));
