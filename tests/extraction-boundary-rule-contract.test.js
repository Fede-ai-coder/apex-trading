'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// EXTRACTION SEAMS — PERMANENT CONTRACT.
//
// This file exists because a rule that lives only in prose is not executed, and
// so nothing contradicts it when it drifts. This programme's boundary rule
// drifted twice in two cycles, and the second version was wrong about the very
// counterexample the first had just uncovered. Both versions passed review
// because review reads; it does not run.
//
// WHAT IS ACTUALLY TRUE, and what this file pins:
//
//   • WHERE a region ends is a JUDGEMENT, not a rule. §5 measures the six
//     boundaries the undo helpers still record and shows that no rule over
//     banners or headers reproduces them: two are followed immediately by
//     another feature's code with no header between, and one SPANS a `// ── `
//     section banner.
//
//   • The SNAP, once the last construct is chosen, is mechanical. §2 pins it.
//
//   • Four seam INVARIANTS hold at every recorded boundary. §3 verifies them
//     against real historical offsets — recorded when those regions were cut,
//     so they cannot have been fitted to this file — and §4 against the
//     seventeen shipped modules.
//
//   • §6 pins the two dead rules against the case that killed them, so neither
//     can be reintroduced by someone who finds the old comment. Two of the
//     seventeen layers end on trailing top-level code — one on an IIFE, one on
//     a bare statement — but only ONE of the sixteen that predate this cycle,
//     which is why fifteen-of-sixteen read like a law.
//
// Historical offsets are reached by peeling the undo onion newest-first with
// the shipped helpers, which reconstruct byte-exactly or throw. Nothing here
// re-measures the tree with a fresh scratch tool.
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_LOADER = require('./lib/load-app-source.js');
const { scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');
const { isBlankOrComment, snapBodyEnd, assertSeam } = require('./lib/extraction-boundary.js');

const BACKEND_PORTFOLIOS = require('./lib/backend-portfolios-undo.js');
const PORTFOLIO = require('./lib/portfolio-data-fetch-undo.js');
const TRADE_DETAIL = require('./lib/journal-trade-detail-undo.js');
const TRADE_FORMS = require('./lib/journal-trade-forms-undo.js');
const CLOSE_LEGS = require('./lib/journal-close-legs-undo.js');
const TT_RECONNECT = require('./lib/tt-reconnect-undo.js');
const APEX_POST_AUTH = require('./lib/apex-post-auth-init-undo.js');

// The seventeen shipped layers, oldest first.
const CHAIN = [
  'js/services/journal-core.js',
  'js/services/mcx-regime-policy.js',
  'js/ui/journal-ui.js',
  'js/services/journal-remote-persistence.js',
  'js/services/journal-backend-write-through.js',
  'js/services/journal-migration.js',
  'js/services/journal-manual-import.js',
  'js/ui/journal-backup-restore.js',
  'js/ui/mcx-macro-check.js',
  'js/ui/mcx-charts.js',
  'js/services/apex-post-auth-init.js',
  'js/ui/tt-reconnect.js',
  'js/ui/journal-close-legs.js',
  'js/ui/journal-trade-forms.js',
  'js/ui/journal-trade-detail.js',
  'js/portfolio/portfolio-data-fetch.js',
  'js/portfolio/backend-portfolios.js',
];
const CHAIN_LENGTH = 17;

// The one layer that already ended on trailing top-level code, and by how much.
const TRAILING_CODE_LAYER = 'js/services/journal-backend-write-through.js';
const TRAILING_CODE_UNITS = 4878;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

console.log('EXTRACTION SEAMS — PERMANENT CONTRACT');

// ─────────────────────────────────────────────────────────────────────────────
section('1. isBlankOrComment — what counts as a line with no code');
// ─────────────────────────────────────────────────────────────────────────────
eq(isBlankOrComment(''), true, 'an empty line');
eq(isBlankOrComment('    '), true, 'a line of spaces — the monolith indents, so blanks carry them');
eq(isBlankOrComment('\t'), true, 'a tab-only line');
eq(isBlankOrComment('  // note'), true, 'an indented line comment');
eq(isBlankOrComment('  /* open'), true, 'a block-comment opener');
eq(isBlankOrComment('   * continued'), true, 'a block-comment continuation');
eq(isBlankOrComment('var x = 1;'), false, 'a statement is code');
eq(isBlankOrComment('}'), false, 'a lone closing brace is code');
eq(isBlankOrComment('})();'), false, 'an IIFE terminator is code');
eq(isBlankOrComment('var x = 1; // trailing'), false,
  'a line that merely ENDS with a comment is code — the check is deliberately conservative');

// ─────────────────────────────────────────────────────────────────────────────
section('2. snapBodyEnd — the mechanical half');
// ─────────────────────────────────────────────────────────────────────────────
{
  const src = 'var a = 1;\nvar b = 2;\n\n// next feature\n';
  eq(snapBodyEnd(src, 0, src.length), 22, 'it lands just past the last code line’s newline');
  eq(src.slice(0, 22), 'var a = 1;\nvar b = 2;\n', '…which is exactly the two code lines');

  // It walks back over ANY run of blanks and comments, however long.
  const padded = 'var a = 1;\n' + '\n'.repeat(9) + '// a\n// b\n   \n';
  eq(snapBodyEnd(padded, 0, padded.length), 11, 'a long run of blanks and comments is walked back over');

  // It does not walk past the region start.
  eq(snapBodyEnd('\n\n// only comments\n', 0, 19), null, 'a window with no code returns null');

  // The window is respected: code beyond `limit` is not reachable.
  const beyond = 'var a = 1;\n\nvar b = 2;\n';
  eq(snapBodyEnd(beyond, 0, 12), 11, 'code past the limit is not taken');
  eq(snapBodyEnd(beyond, 0, beyond.length), 23, '…and is taken when the limit allows it');

  // A blank line INSIDE the region is not a boundary — the failure that killed
  // audit #422's forward-walking rule.
  const withGap = 'function f(){\n\n  return 1;\n}\n\n// next\n';
  eq(snapBodyEnd(withGap, 0, withGap.length), 29, 'an internal blank line does not end the region');
  eq(withGap.slice(0, 29), 'function f(){\n\n  return 1;\n}\n', '…the whole function is taken');

  throwsWith(() => snapBodyEnd(null, 0, 1), 'EXTRACTION_SEAM_BAD_SOURCE', 'a non-string is refused');
  throwsWith(() => snapBodyEnd('abc', 2, 2), 'EXTRACTION_SEAM_BAD_RANGE', 'an empty range is refused');
  throwsWith(() => snapBodyEnd('abc', 0, 99), 'EXTRACTION_SEAM_BAD_RANGE', 'a limit past the end is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The four invariants, at six REAL historical boundaries');
// ─────────────────────────────────────────────────────────────────────────────
// Peel the onion newest-first. Each helper reconstructs byte-exactly or throws,
// so reaching a layer's base at all is already a proof of identity.
const HISTORY = [];
{
  let doc = APP_LOADER.loadIndexHtml();
  doc = BACKEND_PORTFOLIOS.undoBackendPortfolios(doc, read('js/portfolio/backend-portfolios.js'));
  HISTORY.push({ name: 'backend-portfolios', H: BACKEND_PORTFOLIOS, doc });
  doc = PORTFOLIO.undoPortfolioDataFetch(doc, read('js/portfolio/portfolio-data-fetch.js'));
  HISTORY.push({ name: 'portfolio-data-fetch', H: PORTFOLIO, doc });
  doc = TRADE_DETAIL.undoJournalTradeDetail(doc, read('js/ui/journal-trade-detail.js'));
  HISTORY.push({ name: 'journal-trade-detail', H: TRADE_DETAIL, doc });
  doc = TRADE_FORMS.undoJournalTradeForms(doc, read('js/ui/journal-trade-forms.js'));
  doc = CLOSE_LEGS.undoJournalCloseLegs(doc, read('js/ui/journal-close-legs.js'));
  HISTORY.push({ name: 'journal-close-legs', H: CLOSE_LEGS, doc });
  doc = TT_RECONNECT.undoTtReconnect(doc, read('js/ui/tt-reconnect.js'));
  HISTORY.push({ name: 'tt-reconnect', H: TT_RECONNECT, doc });
  doc = APEX_POST_AUTH.undoApexPostAuthInit(doc, read('js/services/apex-post-auth-init.js'));
  HISTORY.push({ name: 'apex-post-auth-init', H: APEX_POST_AUTH, doc });
}
eq(HISTORY.length, 6, 'six layers still record their own raw offsets');

for (const { name, H, doc } of HISTORY) {
  const at = H.RAW_AT;
  const rawEnd = H.RAW_END;
  const bodyEnd = rawEnd - 1;
  eq(assertSeam(doc, at, bodyEnd), rawEnd,
    name + ': the seam validator accepts the recorded boundary and returns its raw end');
  eq(doc.slice(at, rawEnd), doc.slice(at, bodyEnd) + '\n',
    name + ': raw === body + exactly one LF');
  ok(at === 0 || doc[at - 1] === '\n', name + ': the region opens on a line start');
  eq(doc[bodyEnd - 1], '\n', name + ': the body is line-terminated');
  const lineStart = doc.lastIndexOf('\n', bodyEnd - 2) + 1;
  eq(isBlankOrComment(doc.slice(lineStart, bodyEnd)), false, name + ': the body’s last line is code');
}

// The validator must REJECT, or accepting five real boundaries proves nothing.
{
  const { doc, H } = HISTORY[0];
  const at = H.RAW_AT;
  const bodyEnd = H.RAW_END - 1;
  throwsWith(() => assertSeam(doc, at, bodyEnd - 1),
    'EXTRACTION_SEAM_BODY_NOT_LINE_TERMINATED', 'a body one unit short is rejected');
  throwsWith(() => assertSeam(doc, at, bodyEnd + 1),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'a body one unit long — absorbing the separator — is rejected');
  throwsWith(() => assertSeam(doc, at + 1, bodyEnd),
    'EXTRACTION_SEAM_NOT_LINE_START', 'a start mid-line is rejected');
  throwsWith(() => assertSeam('function f(){}\nx;\n', 0, 15),
    'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR', 'a boundary with no blank line after it is rejected');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The seventeen shipped modules');
// ─────────────────────────────────────────────────────────────────────────────
eq(CHAIN.length, CHAIN_LENGTH, 'the chain is the seventeen shipped layers');
for (const rel of CHAIN) {
  const src = read(rel);
  ok(src.length > 0, rel + ': exists and is non-empty');
  eq(src.slice(-1), '\n', rel + ': ends line-terminated');
  ok(!src.endsWith('\n\n'), rel + ': does not end on a blank line');
  const lineStart = src.lastIndexOf('\n', src.length - 2) + 1;
  eq(isBlankOrComment(src.slice(lineStart)), false, rel + ': its last line is code');
  eq(snapBodyEnd(src, 0, src.length), src.length,
    rel + ': the snap returns the whole module — each shipped module IS a complete region');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. WHERE a region ends is a judgement, not a rule');
// ─────────────────────────────────────────────────────────────────────────────
{
  // Two recorded boundaries are followed immediately by another feature's code,
  // with no `// ══` header and no `// ── ` banner between. Any rule that snaps
  // to the next header would have swallowed that code.
  const followedByCode = [];
  for (const { name, H, doc } of HISTORY) {
    const after = doc.slice(H.RAW_END, H.RAW_END + 200);
    const firstLine = after.slice(0, after.indexOf('\n'));
    if (!isBlankOrComment(firstLine)) followedByCode.push(name);
  }
  eq(followedByCode, ['tt-reconnect', 'apex-post-auth-init'],
    'two of the six are followed directly by unrelated code, with no header between');
  ok(followedByCode.length > 0,
    '…so "extend to the next feature header" is not the rule, and never was');

  // And one region SPANS a section banner, so the screening banner cannot be the
  // boundary either. That is the inverse mistake, and it is measured here.
  const spanning = [];
  for (const { name, H, doc } of HISTORY) {
    const body = doc.slice(H.RAW_AT + 1, H.RAW_END - 1);
    if (/\n\s*\/\/ ── /.test(body)) spanning.push(name);
  }
  ok(spanning.includes('journal-trade-detail'),
    'at least one shipped region contains a `// ── ` section banner inside it');

  // The two mistakes are therefore in opposite directions, which is why neither
  // a banner rule nor a header rule can be right.
  ok(followedByCode.length > 0 && spanning.length > 0,
    'the two failure directions both occur in the shipped history');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The two dead rules, pinned against the case that killed them');
// ─────────────────────────────────────────────────────────────────────────────
{
  const src = read(TRAILING_CODE_LAYER);

  // DEAD RULE 1: "the region ends after its last top-level DECLARATION".
  const declEnd = (function () {
    const d = scanTopLevelDeclarations(src);
    const last = d[d.length - 1];
    return last.start + last.chars + 1;
  })();
  eq(src.length - declEnd, TRAILING_CODE_UNITS,
    'the declaration rule stops 4,878 units short of this module’s real end');
  ok(declEnd < src.length, '…so it was already false before it was written down');

  // DEAD RULE 2: audit #422's forward walk, which stops at the first blank line.
  const forwardWalkEnd = (function () {
    let e = declEnd;
    for (;;) {
      const nl = src.indexOf('\n', e);
      if (nl < 0) break;
      if (isBlankOrComment(src.slice(e, nl))) break;
      e = nl + 1;
    }
    return e;
  })();
  eq(src.length - forwardWalkEnd, TRAILING_CODE_UNITS,
    'the forward walk stops exactly as short — the trailing IIFE contains blank lines');
  eq(forwardWalkEnd, declEnd, '…it does not advance at all here');

  // The surviving snap gets it right, which is the whole point of this file.
  eq(snapBodyEnd(src, 0, src.length), src.length,
    'the snap takes the whole module, IIFE and internal blank lines included');

  // And the counterexample is unique in the chain, measured over all sixteen
  // rather than asserted from the ones at hand.
  const withTrailingCode = [];
  for (const rel of CHAIN) {
    const s = read(rel);
    const d = scanTopLevelDeclarations(s);
    ok(d.length > 0, rel + ': has top-level declarations');
    const after = d[d.length - 1].start + d[d.length - 1].chars + 1;
    const tail = s.slice(Math.min(after, s.length));
    if (tail.split('\n').some((l) => !isBlankOrComment(l))) withTrailingCode.push(rel);
  }
  eq(withTrailingCode, [TRAILING_CODE_LAYER, 'js/portfolio/backend-portfolios.js'],
    'TWO of the seventeen end on trailing top-level code');
  eq(CHAIN.length - withTrailingCode.length, 15,
    '…and fifteen end at their last declaration');
  // The distinction that matters: of the SIXTEEN layers that predate the cycle
  // which uncovered this, exactly one did — which is why fifteen-of-sixteen felt
  // like a law. The newest layer is the second case, and it is a statement
  // rather than an IIFE, so the two are not even the same shape.
  eq(withTrailingCode.filter((f) => f !== 'js/portfolio/backend-portfolios.js'),
    [TRAILING_CODE_LAYER], 'exactly one of the sixteen EARLIER layers did');
  eq(read(TRAILING_CODE_LAYER).trimEnd().slice(-5), '})();',
    'the earlier one ends on an IIFE');
  eq(read('js/portfolio/backend-portfolios.js').trimEnd().slice(-1), ';',
    'and the newest on a bare statement');
}

console.log('\n' + pass + ' assertions passed.');
