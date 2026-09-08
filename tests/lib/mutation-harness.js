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
//   • `exit`, SIGINT and SIGTERM all restore, so an interrupted run does not
//     leave a mutant on disk.
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
  };
  const onSignal = () => { try { restore(); } catch (e) { /* already throwing */ } process.exit(130); };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

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
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
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

  const state = workingCopyState(target);
  if (state !== 'clean' && state !== 'untracked' && !options.allowDirty) {
    throw new Error('MUTATION_TARGET_DIRTY: ' + target + ' has uncommitted changes (' + state +
      '); commit or stash before mutating, or the restore would silently discard them');
  }

  // A spec may need the target invoked with flags — the coverage contract has to
  // run its own mutants with --fast, or mutating it would recurse into a full
  // pass inside a full pass.
  if (spec.runArgs && !options.runArgs) options = Object.assign({}, options, { runArgs: spec.runArgs });

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

module.exports = { ROOT, sha256, workingCopyState, runMutant, runSpec, MutationRestoreError };
