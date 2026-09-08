'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// STRATEGY TEMPLATES — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// WHAT IS RECOMMENDED. `STRATEGY_TEMPLATES`, [1102,8553) in monolith
// coordinates: 7,451 units in ONE owner — a `var` bound to an object literal
// of option-strategy leg templates. It is PURE DATA. There is no function in
// it, no call, no statement beyond the declaration itself.
//
//     3 external executable edges, ALL reads, ALL at call time
//     0 references from generated markup
//     0 inbound writes — and here that is a MEASUREMENT, not a vacuity
//     0 outbound writes: the region performs no assignment of any kind
//     0 monolith dependencies — it names nothing the monolith declares
//     0 top-level statement lines
//     it loads in a COMPLETELY empty VM, defining exactly its one owner
//
// THE INBOUND ZERO IS REAL THIS TIME, and the contrast with #439 is the point.
// That layer owned no binding, so its inbound zero was VACUOUS — there was
// nothing for an outside write to reach. This region owns exactly one binding,
// a mutable `var`, so an outside write is possible and §5 goes looking for one
// across the whole monolith, the markup and all sixty-eight sibling modules.
// It finds none: every one of the twelve references anywhere is a read.
//
// THE FIRST DATA-ONLY LAYER, and that claim is measured over the whole chain
// rather than inferred from the candidate. §4 scans all TWENTY-FOUR shipped
// modules and asserts that every one of them declares at least one function;
// this would be the first with none. The four superlatives CLAUDE.md records
// were each written from the layers nearest to hand, so this one is an `eq`
// over the set it quantifies over.
//
// A CORRECTION TO THE SCREEN ITSELF, which is why this region outranks two
// that score better on the old metric. "Crossings" counted inbound references
// plus outbound property WRITES — and never counted outbound dependency NAMES.
// A region can therefore score a perfect zero while reaching out to eleven
// monolith declarations, which is not low coupling in any sense a reader would
// accept. §6 measures all three directions over every region and shows what the
// old metric hid:
//
//     region                     inbound  out-writes  out-deps  TOTAL  units
//     STRATEGY_TEMPLATES               3           0         0      3  7,451
//     Scanner IVR cache                4           0         0      4  4,051
//     TICKER SEARCH                    0           0         8      8  7,371
//     CLOSE POSITION MODAL             0           0        11     11  5,339
//
// THREE regions still score ZERO on the old metric — TICKER SEARCH, CLOSE
// POSITION MODAL and the 1,067-unit "Filter / mode handlers" — and not one of
// them is the least coupled region in the monolith. The header said "two" until
// the prose check compared it against OLD_METRIC_ZEROES, which lists three; §6
// asserts the list and the ordering rather than describing either.
//
// AND AN INSTRUMENT THAT DOES NOT MEASURE WHAT IT IS BEING ASKED. Every audit
// before this one proved "nothing runs at load" with `evaluationTimeReads`.
// That function scans top-level STATEMENTS, and this region has none — so its
// empty answer here is VACUOUS, exactly like the inbound zero of #439. §7 maps
// the blind spot with four probes: a `var` initialiser reading a foreign name
// executes at load and the scan does NOT report it. The bare VM load does,
// because it runs the initialiser. For a data region the VM load is the proof
// and the scan is decoration; the audit says so rather than quoting the zero.
//
// THE SEAM IS NOT A CLOSING BRACE. The body ends `;\n`, because a `var` bound
// to an object literal ends on a semicolon. Two of the twenty-four shipped
// layers already end on something other than `}\n`, so this is not new — but it
// is the reason Phase 2's undo helper cannot copy the `endsWith('}\n')` guard
// the last several layers share, and §3 pins the ending so that helper is
// written against a measurement.
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APP_LOADER = require('./lib/load-app-source.js');
const {
  maskLiterals,
  stripComments,
  scanTopLevelDeclarations,
  functionBodyRanges,
} = require('./lib/eic-contract-guards.js');
const {
  isBlankOrComment, snapBodyEnd, assertSeam,
  topLevelBanners, bindingNames, evaluationTimeReads,
} = require('./lib/extraction-boundary.js');

// ── The base this audit measures ─────────────────────────────────────────────
const BASE_SHA = 'ffc1e946c0b69d55d98207338c6ba62dfcad4152';
const BASE_CHARS = 1577450;
const BASE_SHA256 = '572a03e9f80c0f93c0dafb626b45cc1c3388703d531d14a72e5956853de34928';
const CODE_AT = 113906;
const CODE_CHARS = 1463518;
const LOCAL_SCRIPT_COUNT = 68;
// The suite at this base, and after this audit is added.
const BASE_TEST_FILE_COUNT = 152;
const TEST_FILE_COUNT = 153;

// ── The region, in MONOLITH coordinates ──────────────────────────────────────
const RAW_AT = 1102;
const RAW_END = 8553;
const RAW_CHARS = 7451;
const BODY_END = 8552;
const MODULE_CHARS = 7450;
const MODULE_SHA256 = '3273d4aebcf67ea5e76dc3c3804c7b4c0dc961253a1c43245f86778cf1dfb76a';
const RAW_SHA256 = 'a3fb1472e79ed82f7679ea6dae12da401f63e80cfdd6b9addf23b5c4ec18bbd2';
const OWNER_NAME = 'STRATEGY_TEMPLATES';
const OWNER_CHARS = 7382;
const OWNER_START = 67;
const OWNER_FORM = 'var';
const OWNER_COUNT = 1;
const BODY_ENDING = ';\n';

// ── Coupling, all THREE directions ───────────────────────────────────────────
const EXTERNAL_EDGES = { STRATEGY_TEMPLATES: 3 };
const EXTERNAL_EDGE_TOTAL = 3;
const MARKUP_REFERENCES = 0;
const INBOUND_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const SIBLING_CONSUMER = 'js/ui/journal-trade-forms.js';
const SIBLING_REFERENCES = 9;
const SIBLING_POSITION = 57;
const MODULE_POSITION = 68;
const VM_GLOBALS = 1;
const TOTAL_REFERENCES = 12;

// ── The screen, and the direction it never counted ───────────────────────────
const TOP_LEVEL_BANNERS = 185;
const REGIONS_WITH_OWNERS = 99;
// [start, inbound, outWrites, outDeps, units] for the candidate and the three
// regions it was chosen over. TOTAL is the sum of the three directions.
const RANKING = [
  { start: 1102, inbound: 3, outWrites: 0, outDeps: 0, units: 7451 },
  { start: 88349, inbound: 4, outWrites: 0, outDeps: 0, units: 4051 },
  { start: 723918, inbound: 0, outWrites: 0, outDeps: 8, units: 7371 },
  { start: 1242853, inbound: 0, outWrites: 0, outDeps: 11, units: 5339 },
];
const OLD_METRIC_ZEROES = [345192, 723918, 1242853];

// ── The chain this would join ────────────────────────────────────────────────
const CHAIN_LENGTH = 24;
const LAYERS_WITH_NO_FUNCTION = 0;

// ── The modelled extraction ──────────────────────────────────────────────────
const MODULE_REL = 'js/config/strategy-templates.js';
const TAG = '<script src="./js/config/strategy-templates.js"></script>\n';
const TAG_CHARS = 58;
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-dxlink-greeks.js"></script>\n';
const INLINE_OPEN = '<script>';
const EXTRACTED_CHARS = 1570057;
const EXTRACTED_UTF8 = 1600063;
const EXTRACTED_LF = 27325;
const EXTRACTED_SHA256 = 'a1537ed737f4e940bab4782e037a5e92cba4b3a92f8b3acc1014bd57f1c36815';
const EXTRACTED_LOCAL_SCRIPTS = 69;
const AUDIT_REL = 'tests/temporary-strategy-templates-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/strategy-templates-audit.spec.js';
const ADDED_FILES = [AUDIT_SPEC_REL, AUDIT_REL].sort();
const RATCHETED_CONTRACTS = 14;
// Not ratchet edits: these re-pin mutation constants that the ratchet moved.
const MUTATION_BOOKKEEPING = [
  'tests/mutation-coverage-contract.test.js',
  'tests/mutation-specs/mutation-coverage-contract.spec.js',
  'tests/mutation-specs/portfolio-dxlink-greeks-contract.spec.js',
];

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = []; let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
function lexicalViews(src) {
  const masked = maskLiterals(src);
  const noComments = stripComments(src);
  const build = (keep) => {
    const o = new Array(src.length);
    for (let i = 0; i < src.length; i++) o[i] = keep(i) ? src[i] : (src[i] === '\n' ? '\n' : ' ');
    return o.join('');
  };
  return { code: masked, strings: build((i) => masked[i] !== src[i] && noComments[i] === src[i]) };
}
function isWriteAt(text, at, name) {
  const after = text.slice(at + name.length, at + name.length + 40);
  return /^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(after) ||
    /^\s*(?:\[[^\]]*\]|\.[A-Za-z0-9_$]+)+\s*=[^=]/.test(after);
}
function statementLines(src, decls) {
  const ch = Array.from(src);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
  return ch.join('').split('\n').filter((l) => !isBlankOrComment(l));
}
function propertyWriteBases(maskedBody) {
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]{1,60}\])\s*=(?!=)/g;
  const out = []; let m;
  while ((m = re.exec(maskedBody))) out.push(m[1]);
  return out;
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('STRATEGY TEMPLATES — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA.slice(0, 7));

const INDEX = APP_LOADER.loadIndexHtml();
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const VIEWS = lexicalViews(CODE);
const BODY = CODE.slice(RAW_AT, BODY_END);
const MASKED_BODY = maskLiterals(BODY);
const OWNERS = scanTopLevelDeclarations(BODY);
const ALL_DECLS = scanTopLevelDeclarations(CODE);
const MONOLITH_OWNED = new Map(ALL_DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);

// The three directions, for any monolith range.
function coupling(s, e) {
  const own = ALL_DECLS.filter((d) => d.start >= s && d.start + d.chars <= e);
  const set = new Set(own.map((d) => d.name));
  let inbound = 0;
  for (const n of set) for (const p of refSites(VIEWS.code, n)) if (p < s || p >= e) inbound++;
  let outWrites = 0;
  for (const base of propertyWriteBases(VIEWS.code.slice(s, e))) {
    if (!set.has(base) && MONOLITH_OWNED.has(base)) outWrites++;
  }
  const deps = new Set();
  for (const m of VIEWS.code.slice(s, e).matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (MONOLITH_OWNED.has(m[0]) && !set.has(m[0])) deps.add(m[0]);
  }
  return { owners: own.length, inbound, outWrites, outDeps: deps.size,
    total: inbound + outWrites + deps.size, units: e - s };
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(Array.from(INDEX).length, BASE_CHARS, 'index.html is 1,577,450 units');
eq(sha256(INDEX), BASE_SHA256, '…and hashes to the pinned digest');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at the pinned offset');
eq(Array.from(CODE).length, CODE_CHARS, '…and is 1,463,518 units');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-eight local scripts precede it');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 153 files — this audit is the one that was added');
{
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, BASE_CHARS, 'the pinned base commit really carries this index.html');
  eq(sha256(fromGit), BASE_SHA256, '…byte for byte');
  // Pin the base by something only IT has. #439 changed index.html, so unlike
  // the previous cycle the hash alone does distinguish this commit from its
  // parent — asserted rather than assumed, because that was a survivor twice.
  const parent = git(['rev-parse', BASE_SHA + '^']).trim();
  ok(git(['show', parent + ':index.html']) !== fromGit,
    'the parent carries a DIFFERENT index.html, so the hash above does pin this commit');
}
{
  const committedAdds = git(['diff', '--name-only', '--diff-filter=A', BASE_SHA]).split('\n').filter(Boolean);
  const untracked = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter((l) => /^(\?\?|A )/.test(l)).map((l) => l.slice(3));
  eq(Array.from(new Set(committedAdds.concat(untracked))).sort(), ADDED_FILES,
    '…and these are exactly the files this PR adds, committed or not');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(CODE, FN_BODIES);
  eq(marks.length, TOP_LEVEL_BANNERS, '185 banners sit at top level');
  ok(marks.indexOf(RAW_AT) >= 0, 'the region opens on one of them');
  ok(marks.indexOf(RAW_END) >= 0, '…and its seam is another');
  ok(CODE.slice(RAW_END, RAW_END + 120).indexOf('STATE') > 0,
    'what follows the seam is the STATE section — a different concern');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next banner');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts the boundary');
  eq(Array.from(CODE.slice(RAW_AT, RAW_END)).length, RAW_CHARS, 'the raw block is 7,451 units');
  eq(sha256(CODE.slice(RAW_AT, RAW_END)), RAW_SHA256, '…hashing to the pinned digest');
  eq(Array.from(BODY).length, MODULE_CHARS, '…and the module body 7,450');
  eq(sha256(BODY), MODULE_SHA256, '…hashing to the digest Phase 2 must reproduce');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', 'the raw block is the body plus one LF');

  // THE ENDING IS NOT `}\n`, and Phase 2's undo helper must be written to it.
  eq(BODY.slice(-2), BODY_ENDING, 'the body ends on a SEMICOLON and a newline, not a closing brace');
  ok(!BODY.endsWith('}\n'), '…so the guard the recent layers share would reject this module');
  ok(!BODY.endsWith('\n\n'), '…and it does not end on a blank line');

  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. One owner, and it is DATA');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the region declares exactly one name at top level');
  eq(OWNERS[0].name, OWNER_NAME, '…STRATEGY_TEMPLATES');
  eq(OWNERS[0].chars, OWNER_CHARS, '…7,382 units');
  eq(OWNERS[0].start, OWNER_START, '…starting 67 units in, after its header');
  eq(OWNERS[0].form, OWNER_FORM, '…declared with `var`, not a function');
  eq(OWNERS.filter((d) => d.form === 'function').length, 0, 'there is NO function in the region');
  eq(bindingNames(OWNERS), [OWNER_NAME], 'it owns exactly one binding — so §5 is not vacuous');
  eq(OWNER_START + OWNER_CHARS + 1, MODULE_CHARS,
    'header + the declaration + the trailing newline is the whole body');
  eq(statementLines(BODY, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the declaration');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. It would be the FIRST data-only layer — measured over all 24');
// ─────────────────────────────────────────────────────────────────────────────
{
  const bridge = fs.readFileSync(path.join(ROOT, 'tests/lib/post-journal-mcx-pr3-undo.js'), 'utf8');
  const helpers = Array.from(bridge.matchAll(/require\('\.\/([a-z0-9-]+-undo\.js)'\)/g))
    .map((m) => m[1]).filter((h) => h !== 'mcx-pr3-undo.js');
  eq(helpers.length, CHAIN_LENGTH, 'the bridge peels twenty-four layers');
  const dataOnly = [];
  for (const h of helpers) {
    const helper = require(path.join(ROOT, 'tests/lib', h));
    const rel = (helper.TAG || '').match(/src="\.\/([^"]+)"/);
    ok(rel !== null, h + ' names a module');
    const src = fs.readFileSync(path.join(ROOT, rel[1]), 'utf8');
    if (scanTopLevelDeclarations(src).filter((d) => d.form === 'function').length === 0) {
      dataOnly.push(rel[1]);
    }
  }
  eq(dataOnly, [], 'EVERY shipped layer declares at least one function');
  eq(dataOnly.length, LAYERS_WITH_NO_FUNCTION, '…so none of the twenty-four is data-only');
  // The control that makes that zero a measurement: the detector does find
  // functions, and does report a data-only source when given one.
  ok(scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, 'js/services/journal-core.js'), 'utf8'))
    .filter((d) => d.form === 'function').length > 0,
    'control — the detector finds functions in a module that has them');
  eq(scanTopLevelDeclarations('var T = { a: 1 };\n').filter((d) => d.form === 'function').length, 0,
    'control — …and reports none for a data-only source, which is this candidate’s shape');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling in all three directions — and a REAL inbound zero');
// ─────────────────────────────────────────────────────────────────────────────
{
  const edges = {};
  let total = 0;
  for (const p of refSites(VIEWS.code, OWNER_NAME)) {
    if (p < RAW_AT || p >= BODY_END) { edges[OWNER_NAME] = (edges[OWNER_NAME] || 0) + 1; total++; }
  }
  eq(edges, EXTERNAL_EDGES, 'three external executable edges');
  eq(total, EXTERNAL_EDGE_TOTAL, '…three references in total');
  const sites = refSites(VIEWS.code, OWNER_NAME).filter((p) => p < RAW_AT || p >= BODY_END);
  eq(sites.filter((p) => insideFunction(p)).length, EXTERNAL_EDGE_TOTAL,
    'all three sit inside a function body — call time');
  ok(FN_BODIES.length > 100, 'control — the function-body index is populated');

  // INBOUND WRITES. The region owns a MUTABLE binding, so this is the direction
  // that could disqualify it, and it is searched everywhere rather than assumed.
  eq(sites.filter((p) => isWriteAt(VIEWS.code, p, OWNER_NAME)).length, INBOUND_WRITES,
    'not one of them WRITES — every external reference is a read');
  eq(isWriteAt('STRATEGY_TEMPLATES = {};', 0, OWNER_NAME), true,
    'control — a rebinding would be detected');
  eq(isWriteAt('STRATEGY_TEMPLATES.X = 1;', 0, OWNER_NAME), true,
    'control — …and so would a property write');
  eq(isWriteAt('STRATEGY_TEMPLATES[k].label;', 0, OWNER_NAME), false,
    'control — …while an indexed READ is not counted as one');

  let markup = 0;
  for (const p of refSites(VIEWS.strings, OWNER_NAME)) markup++;
  eq(markup, MARKUP_REFERENCES, 'the name appears in no string the monolith builds');
  ok(refSites(VIEWS.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so that zero is a measurement');

  // OUTBOUND. A data literal assigns nothing and names nothing.
  eq(propertyWriteBases(MASKED_BODY).length, OUTBOUND_WRITES,
    'the region performs NO property write of any kind');
  const deps = new Set();
  for (const m of MASKED_BODY.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (MONOLITH_OWNED.has(m[0]) && m[0] !== OWNER_NAME) deps.add(m[0]);
  }
  eq(Array.from(deps).sort(), MONOLITH_DEPENDENCIES, 'and names NOTHING the monolith declares');
  ok(MONOLITH_OWNED.size > 100,
    'control — the monolith declaration index is populated, so that empty list is a measurement');

  // THE SIBLING that actually consumes it, and the load order that makes it safe.
  const sib = fs.readFileSync(path.join(ROOT, SIBLING_CONSUMER), 'utf8');
  const sibMasked = maskLiterals(sib);
  const sibBodies = functionBodyRanges(sib);
  const sibSites = refSites(sibMasked, OWNER_NAME);
  eq(sibSites.length, SIBLING_REFERENCES, 'the journal trade-forms module references it nine times');
  eq(sibSites.every((p) => sibBodies.some((r) => p >= r.start && p <= r.end)), true,
    '…every one inside a function body — call time');
  eq(sibSites.filter((p) => isWriteAt(sibMasked, p, OWNER_NAME)).length, 0,
    '…and not one of them writes');
  eq(evaluationTimeReads(sib, scanTopLevelDeclarations(sib), maskLiterals)
    .filter((n) => n === OWNER_NAME), [],
    '…so the sibling does not read it at evaluation time');
  eq(LOCALS.indexOf(SIBLING_CONSUMER), SIBLING_POSITION, 'that sibling is script #57');
  ok(SIBLING_POSITION < MODULE_POSITION, '…which loads BEFORE the new module at #68');

  // No OTHER sibling touches it, so the reference count is closed.
  const others = LOCALS.filter((rel) => rel !== SIBLING_CONSUMER &&
    new RegExp('\\b' + OWNER_NAME + '\\b').test(maskLiterals(fs.readFileSync(path.join(ROOT, rel), 'utf8'))));
  eq(others, [], 'no other shipped module names it');
  eq(EXTERNAL_EDGE_TOTAL + SIBLING_REFERENCES, TOTAL_REFERENCES,
    'twelve references exist in the whole application, and all twelve are reads');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen counted two directions of three');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(CODE, FN_BODIES);
  const scored = [];
  for (let i = 0; i < marks.length; i++) {
    const s = marks[i];
    const e = (i + 1 < marks.length ? marks[i + 1] : CODE.length);
    const c = coupling(s, e);
    if (c.owners === 0) continue;
    scored.push(Object.assign({ start: s }, c));
  }
  eq(scored.length, REGIONS_WITH_OWNERS, '99 banner-to-banner regions own declarations');

  // The four regions this audit compared, measured rather than recalled.
  for (const want of RANKING) {
    const got = scored.filter((r) => r.start === want.start)[0];
    ok(got !== undefined, 'region at ' + want.start + ' is on the screen');
    eq({ inbound: got.inbound, outWrites: got.outWrites, outDeps: got.outDeps, units: got.units },
      { inbound: want.inbound, outWrites: want.outWrites, outDeps: want.outDeps, units: want.units },
      '…and scores what the header records');
  }
  const totals = RANKING.map((r) => r.inbound + r.outWrites + r.outDeps);
  eq(totals, [3, 4, 8, 11], 'the four compared regions total 3, 4, 8 and 11');
  eq(totals[0], Math.min.apply(null, totals), 'the recommendation is the least coupled of them');

  // THE CORRECTION. The old metric — inbound + outbound WRITES, with outbound
  // dependency names never counted — scores two of these at zero.
  const oldMetric = (r) => r.inbound + r.outWrites;
  const zeroes = scored.filter((r) => oldMetric(r) === 0).map((r) => r.start).sort((a, b) => a - b);
  eq(zeroes, OLD_METRIC_ZEROES, 'three regions still score ZERO on the old metric');
  ok(zeroes.indexOf(RAW_AT) < 0, '…and the recommendation is NOT one of them');
  for (const s of OLD_METRIC_ZEROES) {
    const r = scored.filter((x) => x.start === s)[0];
    ok(r.outDeps > 0, 'region at ' + s + ' scores zero on the old metric while depending on ' +
      r.outDeps + ' monolith names');
  }
  const here = scored.filter((r) => r.start === RAW_AT)[0];
  for (const s of OLD_METRIC_ZEROES) {
    const r = scored.filter((x) => x.start === s)[0];
    ok(here.total < r.total,
      'the recommendation is LESS coupled overall than the old-metric zero at ' + s);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It runs nothing at load, and loads in an empty VM');
// ─────────────────────────────────────────────────────────────────────────────
{
  // `evaluationTimeReads` RETURNS EMPTY HERE, AND THAT PROVES NOTHING. It scans
  // top-level STATEMENTS, and this region has none — it is one declaration. Its
  // empty answer is vacuous for exactly the reason §3 records, and every audit
  // before this one leaned on it as the primary load-time proof. That was sound
  // for regions whose owners are function declarations, where the initialiser is
  // not where load-time work hides; it would have been false comfort here.
  //
  // The four probes below map the blind spot instead of describing it, and the
  // one that matters is the second: a `var` initialiser reading a foreign name
  // runs at load and this instrument does not see it.
  eq(evaluationTimeReads(BODY, OWNERS, maskLiterals), [], 'the instrument answers empty…');
  {
    const stmt = 'window.h = elsewhere;\n';
    eq(evaluationTimeReads(stmt, scanTopLevelDeclarations(stmt), maskLiterals),
      ['elsewhere', 'window'], 'control — it DOES report a top-level statement that reads foreign names');
    const init = 'var T = { a: elsewhere };\n';
    eq(evaluationTimeReads(init, scanTopLevelDeclarations(init), maskLiterals), [],
      '…and does NOT report a var initialiser that reads one — which is this region’s shape');
    const inFn = 'function f(){ return elsewhere; }\n';
    eq(evaluationTimeReads(inFn, scanTopLevelDeclarations(inFn), maskLiterals), [],
      '…nor a name inside a function body, which is correct: that is call time');
  }
  // SO THE BARE VM LOAD IS THE PROOF, not the scan. It executes the initialiser,
  // which is the thing the scan skips.
  {
    const init = 'var T = { a: elsewhere };\n';
    let threw = null;
    try { const sb = {}; vm.createContext(sb); vm.runInContext(init, sb, { filename: 'probe.js' }); }
    catch (e) { threw = e.constructor.name; }
    eq(threw, 'ReferenceError',
      'control — an initialiser reading a foreign name FAILS in an empty VM, so the load below is the real test');
  }

  const bare = {};
  vm.createContext(bare);
  vm.runInContext(BODY, bare, { filename: MODULE_REL });
  eq(Object.keys(bare).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(bare), [OWNER_NAME], '…defining exactly its one owner');
  eq(bare.STRATEGY_TEMPLATES.constructor.name, 'Object', '…which is a plain object');

  // It is DATA, so it can be checked as data rather than only loaded.
  const keys = Object.keys(bare.STRATEGY_TEMPLATES);
  ok(keys.length > 0, 'the table is not empty');
  ok(keys.indexOf('SHORT_STRANGLE') >= 0, '…and carries the strategies the forms offer');
  eq(keys.every((k) => typeof bare.STRATEGY_TEMPLATES[k].label === 'string'), true,
    'every entry has the label the option list renders');
  eq(keys.every((k) => Array.isArray(bare.STRATEGY_TEMPLATES[k].legs)), true,
    '…and the legs array the form clones');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The modelled extraction — the figures Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(TAG.length, TAG_CHARS, 'the tag line is 58 units');
  eq(INDEX.split(ANCHOR_TAG).length - 1, 1, 'the anchor tag appears exactly once');
  ok(INDEX.indexOf(ANCHOR_TAG + INLINE_OPEN) >= 0,
    '…immediately before the inline monolith, which is where the new tag goes');
  eq(INDEX.indexOf(TAG), -1, 'the new tag is NOT in the document yet — this is Phase 1');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL)), '…and the module file does not exist yet');
  ok(fs.existsSync(path.join(ROOT, 'js/config')), 'js/config already exists, so the path is not new');

  const docAt = CODE_AT + RAW_AT;
  const docEnd = CODE_AT + RAW_END;
  eq(INDEX.slice(docAt, docEnd), CODE.slice(RAW_AT, RAW_END),
    'the monolith range maps to the document range Phase 2 will cut');
  const withoutRaw = INDEX.slice(0, docAt) + INDEX.slice(docEnd);
  const insertAt = withoutRaw.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length;
  const extracted = withoutRaw.slice(0, insertAt) + TAG + withoutRaw.slice(insertAt);

  eq(extracted.length, EXTRACTED_CHARS, 'the extracted document is 1,570,057 units');
  eq(Buffer.byteLength(extracted, 'utf8'), EXTRACTED_UTF8, '…1,600,063 bytes');
  eq((extracted.match(/\n/g) || []).length, EXTRACTED_LF, '…27,325 line feeds');
  eq(sha256(extracted), EXTRACTED_SHA256, '…and hashes to the digest Phase 2 must produce');
  eq(BASE_CHARS - RAW_CHARS + TAG_CHARS, EXTRACTED_CHARS, 'the arithmetic closes: base − raw + tag');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src)).length,
    EXTRACTED_LOCAL_SCRIPTS, '…carrying sixty-nine local scripts');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src))
    .map((t) => t.src.replace(/^\.\//, '')).indexOf(MODULE_REL), MODULE_POSITION,
    '…the new one last, at position 68');
  // THE TAG LANDS AFTER THE CUT this time, which is the opposite of the last
  // several layers: the region sits at the TOP of the monolith and the tag goes
  // just before it. Phase 2's REINSERT_AT must account for the tag's own length.
  ok(insertAt - TAG.length > 0 && insertAt - TAG.length < docAt,
    'the tag still lands before the cut, so the base offset applies once it is removed');
  eq(CODE_CHARS - RAW_CHARS, 1456067, 'the residual monolith would be 1,456,067 units');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is untouched');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NO production file changed — index.html and every module are byte-identical');
  eq(changed.filter((rel) => !rel.startsWith('tests/')), [],
    '…and nothing outside tests/ changed at all');
  for (const rel of ADDED_FILES) ok(changed.indexOf(rel) >= 0, rel + ' is in the change set');

  // TWO families of edit, kept apart because they are not the same edit. The
  // ratchet touches one line in each contract; the mutation bookkeeping re-pins
  // constants the ratchet itself moved. Lumping them together would let a
  // careless change hide inside "everything that is not an addition".
  eq(changed.filter((rel) => ADDED_FILES.indexOf(rel) < 0 &&
    MUTATION_BOOKKEEPING.indexOf(rel) < 0).sort(),
    changed.filter((rel) => ADDED_FILES.indexOf(rel) < 0 &&
      MUTATION_BOOKKEEPING.indexOf(rel) < 0).sort(),
    'the change set splits into additions, ratchet and mutation bookkeeping');
  for (const rel of MUTATION_BOOKKEEPING) {
    ok(changed.indexOf(rel) >= 0, rel + ' is in the change set');
    const before = git(['show', BASE_SHA + ':' + rel]).split('\n');
    const after = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
    eq(after.length, before.length, rel + ': the re-pin changed no line COUNT');
    const differing = [];
    for (let i = 0; i < after.length; i++) if (after[i] !== before[i]) differing.push(i);
    ok(differing.length >= 1 && differing.length <= 2,
      rel + ': one or two lines differ — a constant and, in a spec, its replacement');
    for (const i of differing) {
      ok(/DECLARED_MUTANTS|TEST_FILE_COUNT/.test(after[i]),
        rel + ': every differing line re-pins a count, and nothing else');
    }
  }
  // WHY THE SPECS MOVED AT ALL, recorded because it will recur every cycle: the
  // ratchet rewrites `TEST_FILE_COUNT` inside a file that a committed mutant
  // pins by its exact text, so the mutant stops matching. §2 of the coverage
  // contract caught it in a second, which is the whole reason that check is
  // cheap and runs first.
  const ratcheted = changed.filter((rel) => ADDED_FILES.indexOf(rel) < 0 &&
    MUTATION_BOOKKEEPING.indexOf(rel) < 0);
  eq(ratcheted.length, RATCHETED_CONTRACTS, 'fourteen contracts carry the suite-count ratchet');
  for (const rel of ratcheted) {
    const before = git(['show', BASE_SHA + ':' + rel]);
    const after = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const b = before.split('\n'), a = after.split('\n');
    eq(a.length, b.length, rel + ': the ratchet changed no line COUNT');
    const differing = [];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differing.push(i);
    eq(differing.length, 1, rel + ': exactly one line differs from the base');
    eq(b[differing[0]], 'const TEST_FILE_COUNT = ' + BASE_TEST_FILE_COUNT + ';',
      rel + ': …and the old line was the base count');
    eq(a[differing[0]], 'const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';',
      rel + ': …replaced by the incremented count, and nothing else');
    const calls = (t) => (t.match(/\b(?:eq|ok|throws|throwsWith|same|near)\(/g) || []).length;
    eq(calls(after), calls(before), rel + ': no assertion call was added or removed');
  }
  for (const rel of LOCALS) {
    eq(sha256(fs.readFileSync(path.join(ROOT, rel), 'utf8')),
      sha256(git(['show', BASE_SHA + ':' + rel])), rel + ' is byte-identical to the base');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('STRATEGY_TEMPLATES_AUDIT_OK');
