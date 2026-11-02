'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// THE NODE-20 KNOWN-FAILURE RULE — one owner, used by CI and by the contract.
//
// WHY THIS EXISTS
//   Four suites fail on node 20 for a vm-sandbox proxy-trap difference that
//   predates this PR. The workflow used to accept them BY FILENAME: if the file
//   was on the list and exited non-zero, the step moved on. That turns the list
//   into a blanket amnesty — the day one of those files develops a real bug, a
//   syntax error or a broken assertion, CI reports it as the known condition and
//   nobody looks. A known filename is not a licence to fail for any reason.
//
//   So a listed file is accepted ONLY when it fails for the EXACT cause measured
//   for it. Everything else — a different cause, a forbidden cause, a pass, an
//   unlisted file failing — fails the step and says which.
//
// WHY IT IS A MODULE AND NOT SHELL IN THE YAML
//   A rule written as shell inside a workflow is a rule nobody can test: you
//   find out whether it rejects a SyntaxError by pushing a SyntaxError. Here the
//   decision is a pure function of (file, exitCode, output), so
//   tests/portfolio-stress-architecture-contract.test.js feeds it synthetic
//   outputs and proves it rejects what it must — offline, on any node version.
//
// The fingerprints live in the model JSON, not here, so the declaration a
// reviewer reads and the rule CI enforces cannot drift apart.
//
// CLI:  node tests/lib/node20-known-failures.js --run
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MODEL_PATH = path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json');

/** The declared block, read from the model — the single source of truth. */
function knownFailureDeclaration() {
  const model = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
  const ci = (model.frontendCompanionIdentity || {}).continuousIntegration || {};
  const block = ci.preExistingNode20Failures;
  if (!block || !Array.isArray(block.files)) {
    throw new Error('the model declares no preExistingNode20Failures.files block');
  }
  return block;
}

/**
 * Decide whether one suite result is acceptable.
 *
 * Pure: no filesystem, no process, no clock. `output` is stdout and stderr
 * COMBINED, because the fingerprint can land on either — a rule that read only
 * stdout would accept a file whose real cause was printed to stderr.
 *
 * Returns { accepted, reason, kind }.
 */
function classifyResult(result, declaration) {
  const decl = declaration || knownFailureDeclaration();
  const entry = decl.files.find((f) => f.file === result.file) || null;
  const forbidden = decl.forbiddenCauses || [];
  const output = String(result.output == null ? '' : result.output);
  const failed = result.exitCode !== 0;

  if (!entry) {
    if (!failed) return { accepted: true, kind: 'unlisted-pass', reason: 'passed' };
    return {
      accepted: false, kind: 'unlisted-failure',
      reason: 'failed on node 20 and is NOT a listed pre-existing failure',
    };
  }

  // Listed, but green: the exception outlived the condition it documented.
  if (!failed) {
    return {
      accepted: false, kind: 'listed-but-passing',
      reason: 'is listed as a known node-20 failure but PASSED — remove it from the list',
    };
  }

  // Listed and failing — but for WHAT? A forbidden cause is checked first,
  // because these are the shapes a real regression takes and the known-failure
  // allowance must never absorb one.
  const hit = forbidden.find((marker) => output.indexOf(marker) !== -1);
  if (hit) {
    return {
      accepted: false, kind: 'forbidden-cause',
      reason: 'is a listed pre-existing failure, but it failed with ' + hit +
        ' — that is a real defect, not the recorded node-20 incompatibility',
    };
  }

  if (!entry.fingerprint || output.indexOf(entry.fingerprint) === -1) {
    return {
      accepted: false, kind: 'wrong-cause',
      reason: 'is a listed pre-existing failure, but its recorded cause was not found. Expected: ' +
        JSON.stringify(entry.fingerprint),
    };
  }

  return { accepted: true, kind: 'known-failure', reason: 'failed with its recorded cause' };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function runAll() {
  const { execFileSync } = require('child_process');
  const decl = knownFailureDeclaration();
  const testsDir = path.join(ROOT, 'tests');
  const files = fs.readdirSync(testsDir)
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => 'tests/' + f)
    .sort();

  // A listed file that no longer exists would otherwise be silently skipped,
  // leaving a stale exception on the books forever.
  let bad = 0;
  for (const entry of decl.files) {
    if (!files.includes(entry.file)) {
      console.log('::error::' + entry.file + ' is listed as a known node-20 failure but does not exist');
      bad = 1;
    }
    if (!entry.fingerprint) {
      console.log('::error::' + entry.file + ' is listed without a measured fingerprint');
      bad = 1;
    }
  }

  for (const file of files) {
    let exitCode = 0;
    let output = '';
    try {
      output = execFileSync(process.execPath, [file], {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (e) {
      exitCode = typeof e.status === 'number' ? e.status : 1;
      output = String(e.stdout || '') + String(e.stderr || '');
    }
    const verdict = classifyResult({ file, exitCode, output }, decl);
    if (verdict.accepted) {
      if (verdict.kind === 'known-failure') {
        console.log('::notice file=' + file + '::known pre-existing node-20 failure, recorded cause confirmed');
      }
      continue;
    }
    bad = 1;
    console.log('::error file=' + file + '::' + verdict.reason);
    console.log(output.split('\n').slice(-40).join('\n'));
  }
  return bad;
}

if (require.main === module) {
  if (process.argv.indexOf('--run') !== -1) process.exit(runAll());
  console.log('usage: node tests/lib/node20-known-failures.js --run');
  process.exit(2);
}

module.exports = { knownFailureDeclaration, classifyResult, runAll };
