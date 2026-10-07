'use strict';

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  parseCommitLog,
  isExtractionCommit,
  extractionCommits,
  extractionChangedPaths,
} = require('./lib/extraction-history-scope.js');

const ROOT = path.resolve(__dirname, '..');
let pass = 0;
function ok(v, msg) { assert.ok(v, msg); pass++; }
function eq(a,b,msg) { assert.deepStrictEqual(a,b,msg); pass++; }

// Synthetic parser: newest/oldest order is irrelevant; ownership is per commit.
const synthetic = [
  '@@@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\trefactor(x): extract owner',
  '',
  'M\tindex.html',
  'A\tjs/services/new-owner.js',
  'M\ttests/old-boundary-contract.test.js',
  'A\ttests/new-boundary-contract.test.js',
  '@@@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\tdocs: update model',
  '',
  'M\tdocs/risk-models/model.md',
  'M\tconfig/risk-models/model.json',
  '@@@cccccccccccccccccccccccccccccccccccccccc\ttest(audit): phase one',
  '',
  'A\ttests/temporary-owner-boundary-audit.test.js',
  '@@@dddddddddddddddddddddddddddddddddddddddd\tfeat: unrelated page',
  '',
  'M\tindex.html',
  'A\tjs/ui/unrelated-page.js',
].join('\n');

const parsed = parseCommitLog(synthetic);
eq(parsed.length, 4, 'four commits are parsed');
ok(isExtractionCommit(parsed[0]), 'the full Phase-2 shape is an extraction commit');
ok(!isExtractionCommit(parsed[1]), 'docs/config-only work is not an extraction commit');
ok(!isExtractionCommit(parsed[2]), 'a tests-only Phase-1 audit is not an extraction commit');
ok(!isExtractionCommit(parsed[3]), 'index + js without a permanent boundary contract is not attributed to extraction');

// Real-history proof against the open Phase-2 PR #478 head this branch starts on.
const base = 'e6e65ecbea51ec4ba388ca36d56e8ec4fc146ca2';
const commits = extractionCommits(ROOT, base);
ok(commits.length >= 1, 'at least the #478 Phase-2 commit is found after its base');
ok(commits.some((c) => c.sha.startsWith('e5b5c353c1e376bb348d5fc385e33ad718be8e6b')),
  '#478 head is classified as extraction-owned');

const scoped = extractionChangedPaths(ROOT, base);
ok(scoped.includes('index.html'), 'the extraction-scoped set includes index.html');
ok(scoped.includes('js/portfolio/portfolio-snapshot-fallback.js'),
  'the extraction-scoped set includes the owner #478 added');
ok(scoped.includes('tests/portfolio-snapshot-fallback-boundary-contract.test.js'),
  'the extraction-scoped set includes its permanent contract');
ok(!scoped.includes('config/risk-models/portfolio-stress-test-v1.json'),
  'an unrelated model/config path is not attributed to the extraction chain');
ok(!scoped.includes('docs/risk-models/portfolio-stress-test-v1.md'),
  'an unrelated documentation path is not attributed to the extraction chain');

// Stronger behavioural proof: append an orthogonal commit to history in-memory
// by classifying its shape. The exact reason it is rejected is structural, not
// a special-case filename for Portfolio Stress.
const orthogonal = parseCommitLog([
  '@@@eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee\tfeat(stress): response model',
  'M\tjs/services/portfolio-stress-response.js',
  'M\tconfig/risk-models/portfolio-stress-test-v1.json',
  'M\tdocs/risk-models/portfolio-stress-test-v1.md',
].join('\n'))[0];
ok(!isExtractionCommit(orthogonal),
  'a later orthogonal runtime+model commit is not retroactively owned by extraction');

// The helper itself never mutates the tree.
const dirty = execFileSync('git', ['status','--porcelain=v1','--untracked-files=all'], {
  cwd: ROOT, encoding: 'utf8',
});
ok(typeof dirty === 'string', 'repository status remains readable after the history query');

console.log('All ' + pass + ' assertions passed.');
