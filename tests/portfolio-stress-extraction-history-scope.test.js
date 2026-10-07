'use strict';

// Integration guard for the bug that exposed the historical-scope defect:
// Portfolio Stress may evolve its own docs/config/runtime without becoming part
// of every older monolith extraction's change-set.

const assert = require('assert');
const { parseCommitLog, isExtractionCommit } = require('./lib/extraction-history-scope.js');

const stress = parseCommitLog([
  '@@@1111111111111111111111111111111111111111\tfeat(stress): state-dependent BWDelta',
  'M\tdocs/risk-models/portfolio-stress-test-v1.md',
  'M\tconfig/risk-models/portfolio-stress-test-v1.json',
  'M\tjs/services/portfolio-stress-response.js',
  'M\ttests/portfolio-stress-null-safety.test.js',
].join('\n'))[0];

assert.equal(isExtractionCommit(stress), false,
  'orthogonal Portfolio Stress work must not be owned by historical extraction contracts');

const extraction = parseCommitLog([
  '@@@2222222222222222222222222222222222222222\trefactor(portfolio): extract owner',
  'M\tindex.html',
  'A\tjs/portfolio/new-owner.js',
  'M\ttests/older-boundary-contract.test.js',
  'A\ttests/new-owner-boundary-contract.test.js',
].join('\n'))[0];

assert.equal(isExtractionCommit(extraction), true,
  'a Phase-2 extraction retains the historical footprint contract');

console.log('Portfolio Stress / extraction-history integration: 2 assertions passed.');
