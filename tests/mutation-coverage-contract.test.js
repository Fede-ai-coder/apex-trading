'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// MUTATION COVERAGE — PERMANENT CONTRACT.
//
// CLAUDE.md names three standing checks. Two of them left a trace in the tree:
// a bulk edit shows up as a diff, and prose shows up as prose. The third —
// "new assertions, by mutation, not by rereading" — left none. It was a script
// retyped into a scratch directory each cycle, run, and thrown away. A cycle
// that skipped it and a cycle that ran it produced identical repositories.
//
// THIS FILE RUNS THE PASS, and the decision to do so came from measuring
// rather than estimating. The first draft made the full pass opt-in behind
// `--run`, on the reasoning that it "takes about four minutes, longer than the
// whole suite". Timed, it takes 1m07s against a 3m36s suite — so the premise
// was wrong by a factor of four and pointed the wrong way. It runs by default.
//
//     node tests/mutation-coverage-contract.test.js            # everything
//     node tests/mutation-coverage-contract.test.js --fast     # skip the mutants
//
// `--fast` exists for local iteration only. CI passes no flags, so a mutant
// that stops being caught fails the build — which is the difference between a
// check that is enforced and a check that is remembered.
//
// THE COST GROWS, AND IS PINNED SO IT CANNOT GROW QUIETLY. Each mutant costs
// roughly a second, and each cycle adds a spec. §1 asserts the exact total
// against DECLARED_MUTANTS — the same ratchet idiom the suite already uses for
// its file count — and asserts that total stays under MUTANT_BUDGET. When a
// cycle pushes past the budget the build fails and someone decides, in a diff,
// whether to raise it or to retire an older spec. It cannot drift.
//
// What runs on every push, beyond the pass itself:
//
//   §2  every mutant's `find` text still appears EXACTLY ONCE in its target.
//       This is the check that keeps a spec from rotting: rename a pin, or
//       reword the line around it, and the mutant silently stops applying —
//       a mutation pass that reports "0 survivors" because it perturbed
//       nothing. Cheap to verify, and it fails loudly.
//   §3  every pin in the target is covered by some mutant, or exempted with a
//       written reason. This is the lapse that actually happens: six constants
//       added, four mutated, nobody counts.
//   §4  the harness itself discriminates. A tool that answered "caught" for
//       everything would make §5 vacuous, so it is driven over a fixture where
//       one mutant MUST be caught and one MUST survive, and this contract fails
//       if either answer is wrong. That is the `return 0` control CLAUDE.md
//       demands of any metric whose healthy value is zero.
//   §5  the guards that make in-place mutation safe are exercised, not trusted:
//       a dirty target is refused, a `find` with two matches is refused, and a
//       restore leaves the file byte-identical.
//
// WHAT §2 AND §3 STILL BUY, now that the pass itself runs. They fail in
// milliseconds instead of a minute, and they fail with a better message: §2
// says "this mutant no longer matches its target", which is the actionable
// form of "a mutant survived because it perturbed nothing". They are the fast
// diagnosis in front of the slow proof, not a substitute for it.
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HARNESS = require('./lib/mutation-harness.js');
const SPECS = require('./lib/mutation-spec.js');

const SPEC_DIR = 'tests/mutation-specs';
const FIXTURE = 'tests/lib/fixtures/mutation-fixture-target.js';
// The pins the fixture carries, and what each must do under mutation. These are
// the harness's own controls; if they ever agree with each other, the harness
// has stopped measuring.
const FIXTURE_PINS = ['CHECKED_PIN', 'UNCHECKED_PIN'];
const FIXTURE_DERIVED = 'DERIVED_VALUE';
// The exact number of mutants across every committed spec, and the ceiling that
// number may not cross. Each costs about a second of CI. The exact count makes
// every addition a deliberate line in a diff; the budget makes the aggregate a
// deliberate decision rather than a slow slide.
const DECLARED_MUTANTS = 55;
const MUTANT_BUDGET = 120;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, re, m) {
  assert.throws(fn, (e) => e instanceof Error && re.test(e.message), m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
// Default is the FULL pass. `--fast` is for local iteration and is never what
// CI runs, so the enforced behaviour is the thorough one.
const RUN_FOR_REAL = process.argv.indexOf('--fast') < 0;

console.log('MUTATION COVERAGE — PERMANENT CONTRACT');
console.log(RUN_FOR_REAL ? 'mode: FULL — every mutant is applied and run' : 'mode: --fast, mutants skipped');

const loaded = SPECS.loadSpecs(SPEC_DIR);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The specs are present and well formed');
// ─────────────────────────────────────────────────────────────────────────────
ok(loaded.length > 0, 'at least one mutation spec is committed');
{
  const total = loaded.reduce((n, { spec }) => n + spec.mutants.length, 0);
  eq(total, DECLARED_MUTANTS, 'the committed specs carry exactly the declared number of mutants');
  ok(total <= MUTANT_BUDGET,
    'and stay within the CI budget of ' + MUTANT_BUDGET + ' — raise it deliberately or retire a spec');
  ok(MUTANT_BUDGET > DECLARED_MUTANTS,
    'control — the budget has headroom, so the assertion above is a ceiling and not a restatement');
}
for (const { file, spec } of loaded) {
  ok(typeof spec.target === 'string' && spec.target.length > 0, file + ': names a target');
  ok(fs.existsSync(path.join(ROOT, spec.target)), file + ': its target exists — ' + spec.target);
  ok(Array.isArray(spec.mutants) && spec.mutants.length > 0, file + ': carries mutants');
  const runs = spec.runs && spec.runs.length ? spec.runs : [spec.target];
  for (const r of runs) ok(fs.existsSync(path.join(ROOT, r)), file + ': the run target exists — ' + r);
  // THE MUTATED FILE MUST BE ONE THE RUNS ACTUALLY EXERCISE. A spec that
  // mutates file A while running file B reports "survived" for every mutant
  // and means nothing by it. That is not hypothetical: it happened in #432 and
  // again in #439, both times mutating the reconstruction bridge while running
  // a contract that builds its own peel chain — a false survivor that cost an
  // investigation each time. A spec whose target is not among its runs must say
  // which run reaches it, in writing.
  if (runs.indexOf(spec.target) < 0) {
    ok(typeof spec.indirect === 'string' && spec.indirect.trim().length >= 12,
      file + ': its target is not among its runs, so it must argue which run reaches it');
  } else {
    ok(true, file + ': its target is among the files it runs');
  }
  const ids = spec.mutants.map((m) => m.id);
  eq(ids.length, new Set(ids).size, file + ': mutant ids are unique');
  for (const m of spec.mutants) {
    ok(typeof m.id === 'string' && m.id.length > 0, file + ': every mutant is named');
    ok(typeof m.find === 'string' && m.find.length > 0, file + ': ' + m.id + ' has find text');
    ok(typeof m.replace === 'string', file + ': ' + m.id + ' has replacement text');
    ok(m.find !== m.replace, file + ': ' + m.id + ' actually changes something');
    ok(!m.expect || m.expect === 'caught' || m.expect === 'survived',
      file + ': ' + m.id + ' expects a known outcome');
    ok(m.covers === undefined || Array.isArray(m.covers),
      file + ': ' + m.id + ' declares covers as a list, if at all');
    ok(spec.runArgs === undefined || Array.isArray(spec.runArgs),
      file + ': runArgs, if present, is a list');
    // A mutant expected to SURVIVE is a documented gap, not a pass — so it has
    // to say why, in the spec, where the next reader will find it.
    if (m.expect === 'survived') {
      ok(typeof m.why === 'string' && m.why.trim().length >= 12,
        file + ': ' + m.id + ' expects to survive and argues why');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. Every mutant still matches its target EXACTLY ONCE');
// ─────────────────────────────────────────────────────────────────────────────
// The check that keeps a committed spec from rotting into decoration. A mutant
// whose find text no longer appears perturbs nothing and is reported "caught"
// by no run at all — it would show up as a survivor, but only if someone ran
// the expensive pass. Here it fails in a second.
for (const { file, spec } of loaded) {
  const src = fs.readFileSync(path.join(ROOT, spec.target), 'utf8');
  for (const m of spec.mutants) {
    eq(src.split(m.find).length - 1, 1,
      file + ': ' + m.id + ' — its find text appears exactly once in ' + spec.target);
    // The point is that APPLYING it changes the file, not that the replacement
    // text is unique — a deletion-style mutant replaces a block with `];`,
    // which of course appears elsewhere. A first draft asserted the latter and
    // rejected three legitimate mutants.
    ok(src.replace(m.find, m.replace) !== src,
      file + ': ' + m.id + ' — applying it really does change the target');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Every pin is covered by a mutant, or exempted with a reason');
// ─────────────────────────────────────────────────────────────────────────────
for (const { file, spec } of loaded) {
  const cov = SPECS.coverage(spec);
  ok(cov.pins.length > 0, file + ': its target declares pinned constants at all');
  eq(cov.uncovered, [], file + ': every pin is mutated — uncovered pins would be listed here');
  eq(cov.unargued, [], file + ': every exemption carries a written reason');
  eq(cov.stale, [], file + ': no exemption names a pin that no longer exists');
  eq(cov.phantom, [], file + ': no mutant claims to cover a name that is not a pin');
}
{
  // Controls for the pin scanner itself, on inputs whose answers are known by
  // inspection. Without these, a scanner that found NO pins would make §3 pass
  // for every spec ever written.
  const src = fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8');
  const pins = SPECS.pinNames(src);
  eq(pins.sort(), FIXTURE_PINS.slice().sort(), 'the fixture reports exactly its two pins');
  eq(pins.indexOf(FIXTURE_DERIVED), -1,
    '…and NOT the derived value, whose right-hand side is a call');
  eq(SPECS.pinNames("const A = require('x');\n"), [],
    'control — a require is not a pin');
  eq(SPECS.pinNames('const B = (x) => x;\n'), [], 'control — an arrow helper is not a pin');
  eq(SPECS.pinNames('const C = 5;\n'), ['C'], 'control — a bare number is');
  eq(SPECS.pinNames("const D = [\n  'a',\n  'b',\n];\n"), ['D'],
    'control — a multi-line array literal is one pin, not none');
  eq(SPECS.pinNames('  const E = 5;\n'), [],
    'control — an indented const is not top level, so it is not a pin');
  // And the coverage arithmetic itself, driven on a synthetic spec.
  const synthetic = { target: FIXTURE, mutants: [{ id: 'x', find: 'CHECKED_PIN = 7', replace: 'CHECKED_PIN = 8' }] };
  eq(SPECS.coverage(synthetic, src).uncovered, ['UNCHECKED_PIN'],
    'control — a spec that mutates one of two pins reports the other as uncovered');
  eq(SPECS.coverage({ ...synthetic, exempt: { UNCHECKED_PIN: 'short' } }, src).unargued,
    ['UNCHECKED_PIN'], 'control — a one-word excuse is not a reason');
  eq(SPECS.coverage({ ...synthetic, exempt: { GONE_AWAY: 'a perfectly long sentence here' } }, src).stale,
    ['GONE_AWAY'], 'control — an exemption for a vanished pin is reported stale');
  eq(SPECS.coverage({ target: FIXTURE, mutants: [
    { id: 'y', covers: ['CHECKED_PIN', 'UNCHECKED_PIN'], find: 'assert', replace: 'assert ' }] }, src).uncovered,
    [], 'control — a `covers` declaration does cover pins the find text never names');
  eq(SPECS.coverage({ target: FIXTURE, mutants: [
    { id: 'z', covers: ['NO_SUCH_PIN'], find: 'assert', replace: 'assert ' }] }, src).phantom,
    ['z:NO_SUCH_PIN'], 'control — …but a `covers` entry naming a non-pin is reported, not believed');
  // The target-in-runs rule, driven on the shape that actually went wrong: a
  // mutant applied to one file and verified by running a different one.
  {
    const stray = HARNESS.runMutant(
      { id: 'stray', find: 'const CHECKED_PIN = 7;', replace: 'const CHECKED_PIN = 8;' },
      FIXTURE, ['tests/lib/fixtures/mutation-fixture-target.js'], {});
    eq(stray.status, 'caught', 'control — mutating the fixture and running the fixture catches it');
    const decoy = path.join(ROOT, 'tests/lib/fixtures/mutation-decoy-target.js');
    fs.writeFileSync(decoy, "'use strict';\nconsole.log('decoy');\n");
    try {
      const missed = HARNESS.runMutant(
        { id: 'stray2', find: 'const CHECKED_PIN = 7;', replace: 'const CHECKED_PIN = 8;' },
        FIXTURE, ['tests/lib/fixtures/mutation-decoy-target.js'], {});
      eq(missed.status, 'survived',
        '…and running an UNRELATED file reports a false survivor — which is why §1 requires the target to be among the runs');
    } finally {
      fs.unlinkSync(decoy);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The harness discriminates — one mutant must die, one must survive');
// ─────────────────────────────────────────────────────────────────────────────
{
  const before = fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8');
  const digest = sha256(before);

  const caught = HARNESS.runMutant(
    { id: 'fixture-checked', find: 'const CHECKED_PIN = 7;', replace: 'const CHECKED_PIN = 8;' },
    FIXTURE, [FIXTURE], {});
  eq(caught.status, 'caught', 'moving the CHECKED pin fails the fixture');
  eq(caught.caughtBy, [FIXTURE], '…and names the run that caught it');

  const survived = HARNESS.runMutant(
    { id: 'fixture-unchecked', find: 'const UNCHECKED_PIN = 11;', replace: 'const UNCHECKED_PIN = 12;' },
    FIXTURE, [FIXTURE], {});
  eq(survived.status, 'survived', 'moving the UNCHECKED pin does NOT — the harness can say so');
  eq(survived.caughtBy, [], '…with nothing to name');

  ok(caught.status !== survived.status,
    'the two answers DIFFER, which is the whole control: a harness that always ' +
    'said "caught" would make the expensive pass a formality');
  eq(sha256(fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8')), digest,
    'and the fixture is byte-identical afterwards');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The guards that make in-place mutation safe');
// ─────────────────────────────────────────────────────────────────────────────
{
  const abs = path.join(ROOT, FIXTURE);
  const before = fs.readFileSync(abs, 'utf8');
  const digest = sha256(before);

  // A find text with two matches must be REFUSED, not applied to the first.
  const ambiguous = HARNESS.runMutant(
    { id: 'ambiguous', find: 'const ', replace: 'const  ' }, FIXTURE, [FIXTURE], {});
  eq(ambiguous.status, 'unapplied', 'a find text matching more than once is refused');
  ok(ambiguous.occurrences > 1, '…and reports how many times it matched');
  eq(sha256(fs.readFileSync(abs, 'utf8')), digest, '…leaving the file untouched');

  // A find text that matches nothing is refused the same way.
  const missing = HARNESS.runMutant(
    { id: 'missing', find: 'const NOT_PRESENT = 1;', replace: 'const NOT_PRESENT = 2;' },
    FIXTURE, [FIXTURE], {});
  eq(missing.status, 'unapplied', 'a find text matching nothing is refused');
  eq(missing.occurrences, 0, '…with a count of zero');

  // The dirty-target guard. Exercised for real: dirty the fixture, confirm the
  // spec runner refuses it, then restore.
  const state = HARNESS.workingCopyState(FIXTURE);
  ok(state === 'clean' || state === 'untracked',
    'the fixture starts clean or untracked, which is what the guard permits');
  if (state === 'clean') {
    try {
      fs.writeFileSync(abs, before + '// dirtied by the guard control\n');
      throwsWith(() => HARNESS.runSpec({ target: FIXTURE, mutants: [] }),
        /MUTATION_TARGET_DIRTY/,
        'a target with uncommitted changes is refused before anything is written');
      eq(HARNESS.workingCopyState(FIXTURE), 'M', '…and the guard saw the modification');
    } finally {
      fs.writeFileSync(abs, before);
    }
    eq(sha256(fs.readFileSync(abs, 'utf8')), digest, '…and the control restored the fixture');
  } else {
    // Before the fixture is committed there is nothing for the guard to compare
    // against, so the control is skipped rather than faked.
    console.log('  (dirty-target control skipped: the fixture is not committed yet)');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The full pass — every mutant applied and run');
// ─────────────────────────────────────────────────────────────────────────────
if (!RUN_FOR_REAL) {
  console.log('  SKIPPED by --fast. CI never passes that flag.');
} else {
  // A DIRTY TARGET IS SKIPPED LOCALLY AND FATAL IN CI, which is the only way
  // this contract can both run in the ordinary suite and be safe. Mutating a
  // file with uncommitted changes risks losing them outright if the process is
  // killed between write and restore — there is no committed copy to recover
  // from — so the harness refuses. But a dirty tree is the NORMAL state while a
  // cycle is being written, and a suite that goes red the moment you edit a
  // pinned file is a suite people stop running.
  //
  // CI never has a dirty tree. So the skip is a local convenience that cannot
  // weaken enforcement: if it ever happens under CI, that is a broken
  // assumption and the build fails on it rather than quietly passing.
  const skipped = [];
  for (const { file, spec } of loaded) {
    console.log('\n  ── ' + file + ' → ' + spec.target);
    let report;
    try {
      report = HARNESS.runSpec(spec, {
        onResult: (r) => console.log('     ' + r.status.padEnd(10) + r.id),
      });
    } catch (e) {
      if (!/MUTATION_TARGET_DIRTY/.test(e.message)) throw e;
      skipped.push(spec.target);
      console.log('     SKIPPED — ' + spec.target + ' has uncommitted changes.');
      console.log('     Commit it and re-run; CI runs against a clean tree and will not skip.');
      continue;
    }
    eq(report.unapplied, [], file + ': every mutant applied');
    eq(report.unexpected.map((r) => r.id), [],
      file + ': every mutant produced the outcome its spec declares');
    console.log('     ' + report.total + ' mutants, ' + report.survivors.length + ' survivors');
  }
  if (process.env.CI) {
    eq(skipped, [], 'under CI nothing may be skipped — the tree there is always clean');
  } else if (skipped.length) {
    console.log('\n  ' + skipped.length + ' spec(s) skipped on a dirty tree. CI would run them.');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('MUTATION_COVERAGE_OK');
