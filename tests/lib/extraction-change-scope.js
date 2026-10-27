'use strict';

// A historical extraction is audited against its certified shipped corpus,
// not against every unrelated PR that happens to be merged years later.
// This pin is the dev-clean tree BEFORE RV pilot diagnostics PR #545.
// Never move the pin simply to turn a red suite green: changes to the
// certified corpus require their own review and explicit audit.
const fs = require('fs');
const path = require('path');

const CERTIFIED_SHA = 'c903a0d82eaa0e2da29718f372330cd5d51b4c66';
const REPO_ROOT = path.resolve(__dirname, '../..');

function lines(text) {
  return String(text).split(/\r?\n/).filter(Boolean);
}

function ownsCommit(touched, owners) {
  return touched.some((file) => owners.includes(file));
}

// Public, pure predicate: make both sides of the ownership boundary testable.
function includeOwnedCommits(historicalFiles, commits, owners) {
  const changed = new Set(historicalFiles);
  for (const commit of commits) {
    if (!ownsCommit(commit.touched, owners)) continue;
    for (const rel of commit.touched) changed.add(rel);
  }
  return Array.from(changed).sort();
}

function contractOwners(callerFile) {
  const rel = path.relative(REPO_ROOT, callerFile).split(path.sep).join('/');
  if (!rel.startsWith('tests/') || !rel.endsWith('.test.js')) {
    throw new Error('Extraction scope requires an existing tests/*.test.js caller: ' + rel);
  }
  const source = fs.readFileSync(callerFile, 'utf8');
  const owners = new Set([rel]);
  // Ownership is specific to this extraction, not any generic shared
  // index.html, tests/**, or backend-client.js edit.
  for (const name of ['MODULE_REL', 'UNDO_REL', 'AUDIT_REL']) {
    const match = source.match(new RegExp('(?:^|\\n)\\s*const\\s+' + name + '\\s*=\\s*[\\\'"]([^\\\'"]+)[\\\'"]\\s*;', 'm'));
    if (match && /^(js|tests)\//.test(match[1])) owners.add(match[1]);
  }
  return Array.from(owners);
}

function historicalChangedFiles(git, baseSha, callerFile) {
  // A missing/truncated history is an ERROR, not an empty footprint.
  git(['merge-base', '--is-ancestor', baseSha, CERTIFIED_SHA]);
  git(['merge-base', '--is-ancestor', CERTIFIED_SHA, 'HEAD']);

  const original = lines(git(['diff', '--name-only', '--no-renames', baseSha, CERTIFIED_SHA]));
  const owners = contractOwners(callerFile);
  // GitHub Actions checks out a SYNTHETIC PR merge commit. A first-parent
  // diff of that merge contains *every* PR file, including unrelated DEV
  // additions. Never treat that aggregated diff as one owner commit.
  // Walk individual changes on BOTH sides of every merge instead; capture
  // genuine merge-only conflict resolutions through a combined (-c) diff.
  // Each Git log is one subprocess, not one subprocess per commit.
  const logs = [
    git(['log', '--full-history', '--no-merges', '--name-only', '--no-renames',
      '--format=@@EXTRACTION_COMMIT:%H', CERTIFIED_SHA + '..HEAD']),
    git(['log', '--full-history', '--merges', '-c', '--name-only', '--no-renames',
      '--format=@@EXTRACTION_COMMIT:%H', CERTIFIED_SHA + '..HEAD'])
  ];
  const commits = [];
  for (const log of logs) {
    let current = null;
    for (const line of lines(log)) {
      if (line.startsWith('@@EXTRACTION_COMMIT:')) {
        current = { sha: line.slice('@@EXTRACTION_COMMIT:'.length), touched: [] };
        commits.push(current);
      } else {
        if (!current) throw new Error('Unattributed path in extraction commit walk: ' + line);
        current.touched.push(line);
      }
    }
  }
  return includeOwnedCommits(original, commits, owners).join('\n') + '\n';
}

module.exports = { CERTIFIED_SHA, contractOwners, historicalChangedFiles, includeOwnedCommits, ownsCommit };
