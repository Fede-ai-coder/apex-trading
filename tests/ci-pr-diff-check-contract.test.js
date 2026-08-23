'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = fs.readFileSync(path.join(ROOT, '.github/workflows/portfolio-stress-companion.yml'), 'utf8');
let pass = 0, fail = 0;
function ok(v, msg) { if (v) pass++; else { fail++; console.log('  FAIL  ' + msg); } }

console.log('CI committed-diff whitespace contract');

const prLine = 'git diff --check "${{ github.event.pull_request.base.sha }}...${{ github.event.pull_request.head.sha }}"';
const pushLine = 'git diff --check "${{ github.event.before }}" "${{ github.sha }}"';
const manualLine = 'git diff --check HEAD^1 HEAD';
const pushBranches = 'branches: [dev-clean, claude/portfolio-stress-backend-parity-v1]';

ok(WORKFLOW.includes(prLine), 'pull_request checks merge-base-to-head committed diff');
ok(WORKFLOW.includes(pushLine), 'push checks the complete pushed range');
ok(WORKFLOW.includes(manualLine), 'workflow_dispatch has a deterministic commit fallback');
ok(!/^\s*run:\s*git diff --check HEAD\s*$/m.test(WORKFLOW), 'the ineffective clean-tree check is absent');
ok(WORKFLOW.includes('if [ "${{ github.event_name }}" = "pull_request" ]; then'), 'event routing is explicit');
ok(WORKFLOW.includes('elif [ "${{ github.event_name }}" = "push" ]; then'), 'push routing is explicit');
ok(WORKFLOW.includes(pushBranches), 'direct pushes to dev-clean trigger the contract workflow');

const mutant = WORKFLOW.replace(prLine, 'git diff --check HEAD');
ok(!mutant.includes(prLine), 'negative control removes the PR committed-diff command');
ok(/^\s*run:\s*git diff --check HEAD\s*$/m.test('        run: git diff --check HEAD\n'), 'negative control recognises the old ineffective form');
const pushTriggerMutant = WORKFLOW.replace(pushBranches, 'branches: [claude/portfolio-stress-backend-parity-v1]');
ok(!pushTriggerMutant.includes(pushBranches), 'negative control removes dev-clean from the push trigger');

console.log('\nCI diff-check contract: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('ALL TESTS PASSED');
