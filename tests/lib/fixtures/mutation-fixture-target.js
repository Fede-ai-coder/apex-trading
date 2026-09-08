'use strict';
// A deliberately tiny target for the mutation harness's OWN controls. It is not
// a `*.test.js` file, so the suite runner never picks it up; the coverage
// contract drives it directly.
//
// It carries one pin that an assertion checks, one that nothing checks, and one
// derived value. A harness that measures reports "caught", "survived" and
// "not a pin" for the three; a harness that always answers the same way cannot.
const assert = require('assert');

const CHECKED_PIN = 7;
const UNCHECKED_PIN = 11;
const DERIVED_VALUE = Math.max(1, 2);

assert.strictEqual(CHECKED_PIN, 7, 'the checked pin is asserted, so moving it must fail');
assert.ok(DERIVED_VALUE >= 1, 'the derived value is used, so it is not dead code');
console.log('MUTATION_FIXTURE_OK unchecked=' + UNCHECKED_PIN);
