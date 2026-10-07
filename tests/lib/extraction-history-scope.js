'use strict';

// Commit-scoped change-set helper for the permanent extraction contracts.
//
// Historical extraction contracts describe what THE EXTRACTION CHAIN changed.
// They must not reinterpret every later commit on the branch as belonging to an
// old extraction merely because it is reachable from HEAD. The old
//   git diff <old-base>...HEAD
// form did exactly that: an unrelated docs/model/runtime PR years of commits
// later became "a change made by this extraction".
//
// This helper identifies Phase-2 extraction commits by their observable shape,
// then returns the UNION of paths touched by those commits only.
//
// A qualifying extraction commit:
//   * touches index.html (the monolith shrinks / gets a script tag),
//   * ADDS at least one js/**/*.js owner,
//   * touches a permanent *-boundary-contract.test.js.
//
// Tests-only Phase-1 audits, docs/config changes, and ordinary feature commits
// that do not have the full extraction shape are out of scope by construction.

const { execFileSync } = require('child_process');

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function parseCommitLog(text) {
  const commits = [];
  let current = null;

  function flush() {
    if (current) commits.push(current);
    current = null;
  }

  String(text || '').split(/\r?\n/).forEach((line) => {
    if (line.startsWith('@@@')) {
      flush();
      const tab = line.indexOf('\t', 3);
      current = {
        sha: (tab >= 0 ? line.slice(3, tab) : line.slice(3)).trim(),
        subject: tab >= 0 ? line.slice(tab + 1) : '',
        entries: [],
      };
      return;
    }
    if (!current || !line) return;
    const m = /^([AMD])\t(.+)$/.exec(line);
    if (m) current.entries.push({ status: m[1], path: m[2] });
  });
  flush();
  return commits;
}

function isExtractionCommit(commit) {
  const entries = (commit && commit.entries) || [];
  const paths = entries.map((e) => e.path);
  const touchesMonolith = paths.includes('index.html');
  const addsOwner = entries.some((e) => e.status === 'A' && /^js\/.+\.js$/.test(e.path));
  const touchesPermanentBoundary = paths.some((p) =>
    /^tests\/.+-boundary-contract\.test\.js$/.test(p));
  return touchesMonolith && addsOwner && touchesPermanentBoundary;
}

function extractionCommits(root, baseSha, head) {
  const end = head || 'HEAD';
  const log = git(root, [
    'log',
    '--format=@@@%H%x09%s',
    '--name-status',
    '--no-renames',
    String(baseSha) + '..' + String(end),
  ]);
  return parseCommitLog(log).filter(isExtractionCommit);
}

function extractionChangedPaths(root, baseSha, head) {
  const paths = new Set();
  for (const commit of extractionCommits(root, baseSha, head)) {
    for (const entry of commit.entries) paths.add(entry.path);
  }
  return Array.from(paths).sort();
}

module.exports = {
  parseCommitLog,
  isExtractionCommit,
  extractionCommits,
  extractionChangedPaths,
};
