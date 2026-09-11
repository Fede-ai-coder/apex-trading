'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Mutation spec — the mutation coverage contract itself.
//
// The tool is held to the rule it enforces. Its own pins are mutated like any
// other target's, and every one of them is caught by the CHEAP sections, which
// is why this spec runs the target with `--fast`: without that flag a mutant of
// this file would start a full pass inside a full pass.
//
// That recursion is not hypothetical — it is the first thing that happens if
// the flag is dropped, so `runArgs` is part of the spec rather than a habit of
// whoever runs it.
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  target: 'tests/mutation-coverage-contract.test.js',
  runs: ['tests/mutation-coverage-contract.test.js'],
  runArgs: ['--fast'],
  exempt: {},
  mutants: [
    { id: 'SPEC_DIR',
      find: "const SPEC_DIR = 'tests/mutation-specs';",
      replace: "const SPEC_DIR = 'tests/mutation-specs-gone';" },
    { id: 'FIXTURE',
      find: "const FIXTURE = 'tests/lib/fixtures/mutation-fixture-target.js';",
      replace: "const FIXTURE = 'tests/lib/fixtures/mutation-fixture-absent.js';" },
    { id: 'FIXTURE_PINS',
      find: "const FIXTURE_PINS = ['CHECKED_PIN', 'UNCHECKED_PIN'];",
      replace: "const FIXTURE_PINS = ['CHECKED_PIN'];" },
    { id: 'FIXTURE_DERIVED',
      find: "const FIXTURE_DERIVED = 'DERIVED_VALUE';",
      replace: "const FIXTURE_DERIVED = 'CHECKED_PIN';" },
    { id: 'DECLARED_MUTANTS',
      find: 'const DECLARED_MUTANTS = 239;',
      replace: 'const DECLARED_MUTANTS = 238;' },
    { id: 'MUTANT_BUDGET',
      find: 'const MUTANT_BUDGET = 250;',
      replace: 'const MUTANT_BUDGET = 50;' },
  ],
};
