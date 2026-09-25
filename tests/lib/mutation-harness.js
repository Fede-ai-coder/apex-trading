'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MUTATION HARNESS — the third standing check, as a versioned tool.
//
// WHY THIS FILE EXISTS. CLAUDE.md's third check is "new assertions — by
// mutation, not by rereading". For six cycles that check was a script rewritten
// into the scratchpad each time, which made it exactly the thing the repository
// warns about everywhere else: a procedure that lives outside the tree, is not
// executed by anything, and whose absence nothing detects. A cycle that skipped
// it would look identical to a cycle that ran it.
//
// WHAT THIS TOOL GUARANTEES, AND WHAT IT DOES NOT. It runs a committed spec of
// mutants and reports which ones the suite failed to catch. It does NOT prove
// the spec was run — nothing in a repository can prove that. What closes the
// gap is the OTHER half, in tests/lib/mutation-spec.js: the spec's COMPLETENESS
// against the target's pins is cheap to check, runs in the ordinary suite, and
// fails when a new constant is pinned without a mutant. Skipping the expensive
// half now leaves a visible hole rather than silence.
//
// WHY MUTANTS ARE APPLIED IN PLACE, which looks reckless and is not. The
// artifacts under test assert against the REAL working tree — untracked files,
// `git diff` against a base, directory censuses. Running them in a detached
// worktree makes those assertions fail for reasons unrelated to the mutant, so
// every mutant would report "caught" and the pass would be worthless. In-place
// is the only place the signal survives. The cost is paid in guards:
//
//   • a target with uncommitted changes is REFUSED before anything is written,
//     so a mutation can never be layered onto work in progress;
//   • the original bytes are held in memory and restored in `finally`;
//   • the restore is verified by SHA-256, and a mismatch THROWS rather than
//     returning, because a silently corrupted tree poisons every later file;
//   • the pristine bytes are also written to a JOURNAL on disk before the
//     mutant is, and the next run heals from it — so a pass that is KILLED
//     mid-mutant does not leave one behind silently.
//
// WHY A JOURNAL AND NOT A SIGNAL HANDLER. This file used to say "`exit`, SIGINT
// and SIGTERM all restore, so an interrupted run does not leave a mutant on
// disk". That sentence was wrong in all three of its parts, and it is the
// reason the journal exists:
//
//   • there was no `exit` listener at all — only the `finally`;
//   • the SIGINT and SIGTERM listeners could never run. `runSpec` is
//     synchronous from end to end: every mutant's runs go through
//     `spawnSync`, so the event loop does not turn between the `process.on`
//     that registers a listener and the `finally` that removes it. A signal
//     delivered during a pass is queued behind a blocked main thread and
//     dispatched only after the last listener is gone;
//   • registering them made an interrupt WORSE. A listener suppresses Node's
//     default "terminate on SIGTERM", so a polite stop was swallowed and the
//     pass ran on to completion — which is what escalates a stop to SIGKILL,
//     the one signal no handler can catch. That is how a mutant was left on
//     disk in a real cycle, under a guard whose comment promised it could not
//     happen.
//
// So the handlers are gone. SIGTERM again means "stop now", and the durable
// half of the guard is the journal, which survives SIGKILL because it is
// already on disk before the target is touched. `hasAbandonedMutant()` is
// asserted by tests/mutation-coverage-contract.test.js in the ORDINARY suite,
// so an abandoned mutant goes red on the next test run instead of being
// committed by a later cycle that never knew.
//
// ON "0 SURVIVORS". A harness that always answered zero would be
// indistinguishable from one that measures, which is the `return 0` failure
// CLAUDE.md names. So the harness is not trusted to report its own competence:
// tests/mutation-coverage-contract.test.js drives it over a fixture where one
// mutant MUST be caught and one MUST survive, and fails if either answer is
// wrong. Read that contract before believing any number this file prints.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// A file is safe to mutate only if the tree agrees with the index and HEAD for
// it. `git status --porcelain` answers both in one call; an untracked file is
// reported too, and untracked is FINE — a freshly written audit is untracked
// until it is committed, and that is the normal state mid-cycle.
function workingCopyState(rel) {
  const out = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', rel],
    { cwd: ROOT, encoding: 'utf8' });
  const line = out.split('\n').filter(Boolean)[0];
  if (!line) return 'clean';
  return line.slice(0, 2) === '??' ? 'untracked' : line.slice(0, 2).trim();
}

class MutationRestoreError extends Error {}

// THE JOURNAL. Written before the target is touched, deleted only after a
// verified restore. Its presence means exactly one thing: a mutant was applied
// and the process that applied it did not live to put the bytes back.
//
// SCOPE: one pass at a time. Two concurrent passes would share this path and
// the second would overwrite the first's record. That is not guarded because
// in-place mutation is already single-tenant — two passes would be fighting
// over the same working tree with or without a journal.
const JOURNAL_REL = 'tests/.mutation-in-flight.json';
const JOURNAL_ABS = path.join(ROOT, JOURNAL_REL);

// Write the journal and FLUSH it, so that a process killed between this write
// and the mutant's leaves a journal whose target is still pristine — which
// heals to a no-op — rather than a mutant with no record of what it replaced.
function writeJournal(target, mutantId, before, after) {
  const fd = fs.openSync(JOURNAL_ABS, 'w');
  try {
    fs.writeSync(fd, JSON.stringify({
      target, mutantId, digest: sha256(before), mutatedDigest: sha256(after), before,
    }));
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
}

function readJournal() {
  if (!fs.existsSync(JOURNAL_ABS)) return null;
  const raw = fs.readFileSync(JOURNAL_ABS, 'utf8');
  let j;
  try { j = JSON.parse(raw); } catch (e) {
    throw new MutationRestoreError(
      'MUTATION_JOURNAL_CORRUPT: ' + JOURNAL_REL + ' is not JSON; restore ' +
      'its target by hand from git before running anything else');
  }
  return j;
}

// Heal a mutant left by a killed pass. Returns null when there is nothing to
// heal, or a description of what was put back. Throws when the bytes on disk
// are neither the pristine nor the mutated text — that is a tree someone else
// has edited since, and guessing would discard their work.
function healAbandonedMutant() {
  const j = readJournal();
  if (!j) return null;
  const abs = path.join(ROOT, j.target);
  const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  const currentDigest = current === null ? null : sha256(current);

  if (currentDigest === j.digest) { fs.unlinkSync(JOURNAL_ABS); return { target: j.target, healed: false }; }
  if (currentDigest !== null && currentDigest !== j.mutatedDigest) {
    throw new MutationRestoreError(
      'MUTATION_JOURNAL_STALE: ' + j.target + ' matches neither the pristine bytes ' +
      'nor the mutant recorded in ' + JOURNAL_REL + '; it has been edited since. ' +
      'Resolve by hand, then delete the journal');
  }
  fs.writeFileSync(abs, j.before);
  const back = sha256(fs.readFileSync(abs, 'utf8'));
  if (back !== j.digest) {
    throw new MutationRestoreError(
      'MUTATION_RESTORE_FAILED: ' + j.target + ' does not match its pre-mutation bytes');
  }
  fs.unlinkSync(JOURNAL_ABS);
  return { target: j.target, healed: true, mutantId: j.mutantId };
}

// What the ordinary suite asks. Cheap, and true only in the bad state.
function hasAbandonedMutant() {
  const j = readJournal();
  if (!j) return null;
  const abs = path.join(ROOT, j.target);
  const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (current !== null && sha256(current) === j.digest) return null;
  return { target: j.target, mutantId: j.mutantId };
}

// Run one mutant: apply `replace` for `find` in `target`, run every file in
// `runs`, restore, and report whether ANY of them failed.
//
// "caught" means at least one run failed. A mutant that every run still passes
// is a SURVIVOR: the pin it moved is checked by nothing.
function runMutant(mutant, target, runs, opts) {
  const abs = path.join(ROOT, target);
  const before = fs.readFileSync(abs, 'utf8');
  const digest = sha256(before);

  const occurrences = before.split(mutant.find).length - 1;
  if (occurrences !== 1) {
    return { id: mutant.id, status: 'unapplied', occurrences,
      detail: 'the find text appears ' + occurrences + ' times, not once' };
  }
  const after = before.replace(mutant.find, mutant.replace);
  if (after === before) {
    return { id: mutant.id, status: 'unapplied', occurrences,
      detail: 'the replacement is identical to the original' };
  }

  let restored = false;
  const restore = () => {
    if (restored) return;
    fs.writeFileSync(abs, before);
    restored = true;
    const back = fs.readFileSync(abs, 'utf8');
    if (sha256(back) !== digest) {
      throw new MutationRestoreError(
        'MUTATION_RESTORE_FAILED: ' + target + ' does not match its pre-mutation bytes');
    }
    if (fs.existsSync(JOURNAL_ABS)) fs.unlinkSync(JOURNAL_ABS);
  };

  writeJournal(target, mutant.id, before, after);

  let failures = [];
  try {
    fs.writeFileSync(abs, after);
    for (const rel of runs) {
      const r = spawnSync(process.execPath, [rel].concat(opts && opts.runArgs ? opts.runArgs : []), {
        cwd: ROOT, encoding: 'utf8', timeout: (opts && opts.timeoutMs) || 120000,
      });
      if (r.status !== 0) failures.push(rel);
    }
  } finally {
    restore();
  }

  return {
    id: mutant.id,
    status: failures.length ? 'caught' : 'survived',
    caughtBy: failures,
  };
}

// Run a whole spec. Returns a report; throws only for a failed RESTORE, which
// is the one condition where continuing would corrupt later work.
function runSpec(spec, opts) {
  let options = opts || {};
  const target = spec.target;
  const runs = spec.runs && spec.runs.length ? spec.runs : [spec.target];

  // Heal before the dirty check, not after: a mutant left by a killed pass
  // reads as a modified working copy, and refusing it would send the reader
  // looking for work in progress that does not exist.
  const healed = healAbandonedMutant();
  if (healed && healed.healed) {
    process.stderr.write('MUTATION_JOURNAL_HEALED: put back ' + healed.target +
      ' after mutant ' + healed.mutantId + ' was abandoned by a killed pass\n');
  }

  const state = workingCopyState(target);
  if (state !== 'clean' && state !== 'untracked' && !options.allowDirty) {
    throw new Error('MUTATION_TARGET_DIRTY: ' + target + ' has uncommitted changes (' + state +
      '); commit or stash before mutating, or the restore would silently discard them');
  }

  // A spec may need the target invoked with flags — the coverage contract has to
  // run its own mutants with --fast, or mutating it would recurse into a full
  // pass inside a full pass.
  if (spec.runArgs && !options.runArgs) options = Object.assign({}, options, { runArgs: spec.runArgs });

  // THE BASELINE. A mutant is "caught" when the run FAILS — so if the target is
  // already failing, every mutant is caught and the pass reports a clean sweep
  // while proving nothing. Audit #442 hit exactly that: it ran a 72-mutant pass
  // against a target that was red for an unrelated reason, read "0 survivors",
  // and only found the dead pin hiding in it when the prose check noticed the
  // constant was never used. The pass now refuses to start unless the target
  // passes clean.
  if (!options.skipBaseline) {
    const baseline = spawnSync(process.execPath,
      [path.join(ROOT, target)].concat(options.runArgs || []),
      { cwd: ROOT, encoding: 'utf8', timeout: options.timeout || 600000, maxBuffer: 64 * 1024 * 1024 });
    if (baseline.status !== 0) {
      throw new Error('MUTATION_BASELINE_RED: ' + target + ' fails before any mutant is applied' +
        ' (exit ' + baseline.status + '); every mutant would report as caught');
    }
  }

  const wanted = options.only
    ? spec.mutants.filter((m) => options.only.indexOf(m.id) >= 0)
    : spec.mutants;

  const results = [];
  for (const m of wanted) {
    const r = runMutant(m, target, runs, options);
    results.push(r);
    if (options.onResult) options.onResult(r, m);
  }
  const expected = (m) => (m.expect || 'caught');
  const byId = new Map(spec.mutants.map((m) => [m.id, m]));
  const wrong = results.filter((r) => r.status !== expected(byId.get(r.id)));
  return {
    target,
    runs,
    total: results.length,
    results,
    unexpected: wrong,
    survivors: results.filter((r) => r.status === 'survived'),
    unapplied: results.filter((r) => r.status === 'unapplied'),
  };
}

module.exports = { ROOT, sha256, workingCopyState, runMutant, runSpec, MutationRestoreError,
  JOURNAL_REL, JOURNAL_ABS, writeJournal, healAbandonedMutant, hasAbandonedMutant };
