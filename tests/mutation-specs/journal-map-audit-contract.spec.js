'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Mutation spec — journal map audit PERMANENT boundary contract.
//
// One mutant per pinned constant. The coverage contract proves on every push
// that each `find` still appears exactly once in the target and that no pin is
// left uncovered, then applies all of them against a baseline it verifies green
// first. As the newest layer's spec, this one stays until a later cycle demotes
// this contract; the programme's rule is that the newest contract always keeps
// one, which is where the chain-wide counts below get checked rather than
// repeated.
//
// THE FOUR WIDTHS ARE THIS LAYER'S FINDING and carry its heaviest mutants. The
// claim is that the consumer reading MOVES WITH THE WIDTH on one unchanged
// feature, so WIDTH_SCREEN_PICK and WIDTH_RECOMMENDED are each mutated to make
// the two readings AGREE — the shape in which the finding disappears and the
// screen's pick looks simply better. WIDTH_OWN_BANNER_2 and WIDTH_SECTION_PLUS_3
// are the two controls that isolate width from banner choice, so each is moved
// in the direction that would collapse that isolation.
//
// INTERNAL_SITES is the mechanism. Those two offsets are the edges that vanish
// when the cut is made whole; the mutant MOVES one outside the region this layer
// took, which is exactly the world in which the narrow cut's score would be
// honest. It is moved rather than dropped, because a dropped element is caught
// by a length check that proves nothing about the claim.
//
// THE DEAD RULE gets the mutant that would revive it. DEAD_RULE_SHARED_BANNER is
// flipped to `false`, which is the reading under which "never cut inside a
// banner region" survives — and §5(c) reconstructs the pre-#459 document through
// two shipped undo helpers to refute it, so this mutant proves that
// reconstruction is load-bearing rather than decorative.
//
// THE TWO READINGS AGREEING is this contract's other load-bearing equality.
// FULL_NINE and BY_CONSUMER are both 2 and §3 pins them EQUAL, so each is
// mutated separately: a single shared mutant would move both sides at once and
// the equality would survive.
//
// ZERO-VALUED AND EMPTY PINS get the mutation that matters for them.
// TOP_LEVEL_STATEMENT_LINES and EVALUATION_TIME_READS are zero and empty, and
// that is also what a metric measuring nothing returns, so each is mutated UP.
// The controls that prove those metrics discriminate live in §6, on inputs where
// the answer differs.
//
// MONOLITH_DEPENDENCIES is mutated to `['S']`. `S` is the name that disqualified
// audit #424 and the one #455 narrowed the rule around — and this module's real
// dependency is a different, distant name, so the mutant tests WHICH name is
// there rather than whether the list is non-empty.
//
// THE CHAIN-WIDE COUNTS are mutated one at a time because each is a superlative
// that CLAUDE.md records being written wrong from a partial look. LAYERS_OPENING
// _ON_BANNER is the newest of them and the one this module's first line makes
// relevant, so it is mutated to CHAIN_LENGTH — the reading under which "every
// layer opens on a banner" would hold.
//
// CONTRACT_REL is mutated to the NEIGHBOURING contract, which is the mutant that
// survived #461's pass: every use of it there was satisfied by that file too.
// §8 now compares the file byte for byte against __filename, so it dies.
//
// NAMES ARE MUTATED TO OTHER REAL DECLARATIONS, not to misspellings: a name that
// exists is what tests the claim about which name is there.
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  target: 'tests/journal-map-audit-boundary-contract.test.js',
  runs: ['tests/journal-map-audit-boundary-contract.test.js'],
  exempt: {},
  mutants: [
  { id: "MODULE_REL",
    find: "const MODULE_REL = 'js/services/journal-map-audit.js';",
    replace: "const MODULE_REL = 'js/services/journal-map-auditor.js';", },
  { id: "TAG",
    find: "const TAG = '<script src=\"./js/services/journal-map-audit.js\"></script>\\n';",
    replace: "const TAG = '<script src=\"./js/services/journal-map-audit.js\"></script>';", },
  { id: "ANCHOR_TAG",
    find: "const ANCHOR_TAG = '<script src=\"./js/portfolio/portfolio-technical-alignment-debug.js\"></script>\\n';",
    replace: "const ANCHOR_TAG = '<script src=\"./js/portfolio/portfolio-technical-merge.js\"></script>\\n';", },
  { id: "INLINE_OPEN",
    find: "const INLINE_OPEN = '<script>';",
    replace: "const INLINE_OPEN = '<script >';", },
  { id: "BASE_SHA",
    find: "const BASE_SHA = '6c2f01f';",
    replace: "const BASE_SHA = '0beea2b';", },
  { id: "CONTRACT_REL",
    find: "const CONTRACT_REL = 'tests/journal-map-audit-boundary-contract.test.js';",
    replace: "const CONTRACT_REL = 'tests/portfolio-technical-alignment-debug-boundary-contract.test.js';", },
  { id: "UNDO_REL",
    find: "const UNDO_REL = 'tests/lib/journal-map-audit-undo.js';",
    replace: "const UNDO_REL = 'tests/lib/portfolio-technical-alignment-debug-undo.js';", },
  { id: "AUDIT_REL",
    find: "const AUDIT_REL = 'tests/temporary-journal-map-audit-boundary-audit.test.js';",
    replace: "const AUDIT_REL = 'tests/temporary-journal-map-audit-boundary-audit-v2.test.js';", },
  { id: "AUDIT_SPEC_REL",
    find: "const AUDIT_SPEC_REL = 'tests/mutation-specs/journal-map-audit-audit.spec.js';",
    replace: "const AUDIT_SPEC_REL = 'tests/mutation-specs/journal-map-audit-audit-v2.spec.js';", },
  { id: "CONTRACT_SPEC_REL",
    find: "const CONTRACT_SPEC_REL = 'tests/mutation-specs/journal-map-audit-contract.spec.js';",
    replace: "const CONTRACT_SPEC_REL = 'tests/mutation-specs/mutation-coverage-contract.spec.js';", },
  { id: "RETIRED_SPEC_REL",
    find: "const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-technical-alignment-debug-contract.spec.js';",
    replace: "const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-technical-merge-contract.spec.js';", },
  { id: "TEST_FILE_COUNT",
    find: "const TEST_FILE_COUNT = 165;",
    replace: "const TEST_FILE_COUNT = 164;", },
  { id: "LOCAL_SCRIPT_COUNT",
    find: "const LOCAL_SCRIPT_COUNT = 80;",
    replace: "const LOCAL_SCRIPT_COUNT = 79;", },
  { id: "MODULE_POSITION",
    find: "const MODULE_POSITION = 79;",
    replace: "const MODULE_POSITION = 78;", },

  { id: "CODE_AT",
    find: "const CODE_AT = 114613;",
    replace: "const CODE_AT = 114612;", },
  { id: "CODE_CHARS",
    find: "const CODE_CHARS = 1385816;",
    replace: "const CODE_CHARS = 1385815;", },
  { id: "RAW_AT_IN_CODE",
    find: "const RAW_AT_IN_CODE = 719625;",
    replace: "const RAW_AT_IN_CODE = 719173;", },
  { id: "RAW_END_IN_CODE",
    find: "const RAW_END_IN_CODE = 723944;",
    replace: "const RAW_END_IN_CODE = 722863;", },
  { id: "BODY_END_IN_CODE",
    find: "const BODY_END_IN_CODE = 723943;",
    replace: "const BODY_END_IN_CODE = 723944;", },
  { id: "TOP_LEVEL_DECLS",
    find: "const TOP_LEVEL_DECLS = 943;",
    replace: "const TOP_LEVEL_DECLS = 940;", },
  { id: "TOP_LEVEL_BANNERS",
    find: "const TOP_LEVEL_BANNERS = 223;",
    replace: "const TOP_LEVEL_BANNERS = 222;", },
  { id: "OWNER_REGIONS",
    find: "const OWNER_REGIONS = 121;",
    replace: "const OWNER_REGIONS = 120;", },
  { id: "RESIDUAL_MONOLITH",
    find: "const RESIDUAL_MONOLITH = 1381497;",
    replace: "const RESIDUAL_MONOLITH = 1381496;", },
  { id: "TAG_GAP",
    find: "const TAG_GAP = 719633;",
    replace: "const TAG_GAP = 719625;", },
  { id: "NET_REDUCTION",
    find: "const NET_REDUCTION = 4260;",
    replace: "const NET_REDUCTION = 4319;", },

  { id: "OWNERS_EXPECTED",
    find: "const OWNERS_EXPECTED = ['_journalMapAuditEnabled', '_journalMapAuditSummarize', '_journalMapAudit'];",
    replace: "const OWNERS_EXPECTED = ['_journalMapAuditEnabled', '_journalMapAuditSummarize', 'positionManager'];", },
  { id: "OWNER_COUNT",
    find: "const OWNER_COUNT = 3;",
    replace: "const OWNER_COUNT = 2;", },
  { id: "FUNCTION_OWNERS",
    find: "const FUNCTION_OWNERS = 3;",
    replace: "const FUNCTION_OWNERS = 2;", },
  { id: "OWNER_SIZES",
    find: "const OWNER_SIZES = [306, 2024, 924];",
    replace: "const OWNER_SIZES = [306, 2024, 925];", },
  { id: "BODY_ENDING",
    find: "const BODY_ENDING = '}\\n';",
    replace: "const BODY_ENDING = ';\\n';", },
  { id: "FEATURE_BANNER",
    find: "const FEATURE_BANNER = '// ── [JOURNAL-PORTFOLIO-MAP-AUDIT] — gated mapping diagnostics ─────────────────';",
    replace: "const FEATURE_BANNER = '// ── [JOURNAL-PORTFOLIO-MAP-AUDIT] — gated mapping diagnostics ────────────────';", },
  { id: "WRAPPER_NAME",
    find: "const WRAPPER_NAME = '_journalMapAudit';",
    replace: "const WRAPPER_NAME = '_journalMapAuditSummarize';", },
  { id: "CODE_LINES",
    find: "const CODE_LINES = 67;",
    replace: "const CODE_LINES = 66;", },
  { id: "TOTAL_LINES",
    find: "const TOTAL_LINES = 92;",
    replace: "const TOTAL_LINES = 91;", },
  { id: "COMMENT_LINES",
    find: "const COMMENT_LINES = 25;",
    replace: "const COMMENT_LINES = 26;", },
  { id: "OPENING_COMMENT_LINES",
    find: "const OPENING_COMMENT_LINES = 22;",
    replace: "const OPENING_COMMENT_LINES = 25;", },

  { id: "EXTERNAL_EDGES",
    find: "const EXTERNAL_EDGES = 1;",
    replace: "const EXTERNAL_EDGES = 2;", },
  { id: "EDGE_SITES",
    find: "const EDGE_SITES = [727567];",
    replace: "const EDGE_SITES = [727566];", },
  { id: "EDGE_HOSTS",
    find: "const EDGE_HOSTS = ['positionManager'];",
    replace: "const EDGE_HOSTS = ['refreshPositionsLive'];", },
  { id: "DISTINCT_CONSUMERS",
    find: "const DISTINCT_CONSUMERS = 1;",
    replace: "const DISTINCT_CONSUMERS = 2;", },
  { id: "MONOLITH_DEPENDENCIES",
    find: "const MONOLITH_DEPENDENCIES = ['optionLegScalarDiagnostics'];",
    replace: "const MONOLITH_DEPENDENCIES = ['S'];", },
  { id: "DEPENDENCY_AT",
    find: "const DEPENDENCY_AT = 915360;",
    replace: "const DEPENDENCY_AT = 915361;", },
  { id: "DEPENDENCY_DISTANCE",
    find: "const DEPENDENCY_DISTANCE = 195735;",
    replace: "const DEPENDENCY_DISTANCE = 195734;", },
  { id: "ZERO_DIRECTIONS", covers: ["ZERO_DIRECTIONS"],
    find: "  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,",
    replace: "  siblingModules: 1, staticMarkup: 0, generatedMarkup: 0,", },
  { id: "FULL_NINE",
    find: "const FULL_NINE = 2;",
    replace: "const FULL_NINE = 1;", },
  { id: "BY_CONSUMER",
    find: "const BY_CONSUMER = 2;",
    replace: "const BY_CONSUMER = 1;", },
  { id: "EVALUATION_TIME_READS",
    find: "const EVALUATION_TIME_READS = [];",
    replace: "const EVALUATION_TIME_READS = ['localStorage'];", },
  { id: "TOP_LEVEL_STATEMENT_LINES",
    find: "const TOP_LEVEL_STATEMENT_LINES = 0;",
    replace: "const TOP_LEVEL_STATEMENT_LINES = 1;", },
  { id: "VM_GLOBALS",
    find: "const VM_GLOBALS = 3;",
    replace: "const VM_GLOBALS = 2;", },
  { id: "LAYERS_WITH_A_DEPENDENCY",
    find: "const LAYERS_WITH_A_DEPENDENCY = 11;",
    replace: "const LAYERS_WITH_A_DEPENDENCY = 10;", },

  { id: "RUN_FLOOR",
    find: "const RUN_FLOOR = 1500;",
    replace: "const RUN_FLOOR = 1400;", },
  { id: "RAW_RUNS",
    find: "const RAW_RUNS = 7625;",
    replace: "const RAW_RUNS = 7624;", },
  { id: "SEAM_REJECTED",
    find: "const SEAM_REJECTED = 2048;",
    replace: "const SEAM_REJECTED = 2047;", },
  { id: "CANDIDATES",
    find: "const CANDIDATES = 3258;",
    replace: "const CANDIDATES = 3257;", },
  { id: "CLEAN_CANDIDATES",
    find: "const CLEAN_CANDIDATES = 2007;",
    replace: "const CLEAN_CANDIDATES = 2006;", },
  { id: "ONE_CONSUMER_CANDIDATES",
    find: "const ONE_CONSUMER_CANDIDATES = 3;",
    replace: "const ONE_CONSUMER_CANDIDATES = 5;", },
  { id: "ONE_CONSUMER_MULTI_SITE",
    find: "const ONE_CONSUMER_MULTI_SITE = 135;",
    replace: "const ONE_CONSUMER_MULTI_SITE = 134;", },

  { id: "SECTION_HEADER_AT",
    find: "const SECTION_HEADER_AT = 719173;",
    replace: "const SECTION_HEADER_AT = 719625;", },
  { id: "BANNER_OFFSET",
    find: "const BANNER_OFFSET = 452;",
    replace: "const BANNER_OFFSET = 0;", },
  { id: "SECTION_HEADER_TEXT",
    find: "const SECTION_HEADER_TEXT = '// ═══════════════════════════════════════════════════════════════';",
    replace: "const SECTION_HEADER_TEXT = '// ── ';", },
  { id: "FOREIGN_PROSE_NAMES",
    find: "const FOREIGN_PROSE_NAMES = ['aggregateGreeks', 'journalManager', 'positionManager',\n  'refreshPositionsLive', 'renderPositionsPanel'];",
    replace: "const FOREIGN_PROSE_NAMES = ['aggregateGreeks', 'journalManager', 'positionManager',\n  'refreshPositionsLive'];", },
  { id: "WIDTH_SCREEN_PICK",
    find: "const WIDTH_SCREEN_PICK = { at: 719173, end: 722863, units: 3690, owners: 2, consumers: 1, deps: 0, byConsumer: 1 };",
    replace: "const WIDTH_SCREEN_PICK = { at: 719173, end: 722863, units: 3690, owners: 2, consumers: 1, deps: 0, byConsumer: 2 };", },
  { id: "WIDTH_OWN_BANNER_2",
    find: "const WIDTH_OWN_BANNER_2 = { at: 719625, end: 722863, units: 3238, owners: 2, consumers: 1, deps: 0, byConsumer: 1 };",
    replace: "const WIDTH_OWN_BANNER_2 = { at: 719625, end: 722863, units: 3238, owners: 2, consumers: 1, deps: 1, byConsumer: 2 };", },
  { id: "WIDTH_RECOMMENDED",
    find: "const WIDTH_RECOMMENDED = { at: 719625, end: 723943, units: 4318, owners: 3, consumers: 1, deps: 1, byConsumer: 2 };",
    replace: "const WIDTH_RECOMMENDED = { at: 719625, end: 723943, units: 4318, owners: 3, consumers: 1, deps: 1, byConsumer: 1 };", },
  { id: "WIDTH_SECTION_PLUS_3",
    find: "const WIDTH_SECTION_PLUS_3 = { at: 719173, end: 723943, units: 4770, owners: 3, consumers: 1, deps: 1, byConsumer: 2 };",
    replace: "const WIDTH_SECTION_PLUS_3 = { at: 719173, end: 723943, units: 4770, owners: 3, consumers: 1, deps: 1, byConsumer: 1 };", },
  { id: "INTERNAL_SITES",
    find: "const INTERNAL_SITES = [723081, 723252];",
    replace: "const INTERNAL_SITES = [723081, 727567];", },
  { id: "DEAD_RULE_LAYER",
    find: "const DEAD_RULE_LAYER = 'js/portfolio/portfolio-technical-merge.js';",
    replace: "const DEAD_RULE_LAYER = 'js/portfolio/backend-positions-aggregate.js';", },
  { id: "DEAD_RULE_REGION_OWNER",
    find: "const DEAD_RULE_REGION_OWNER = '_mergeBatchInto';",
    replace: "const DEAD_RULE_REGION_OWNER = '_mergeBatchIntoPayload';", },
  { id: "DEAD_RULE_CONSUMER",
    find: "const DEAD_RULE_CONSUMER = 'fetchPortfolioTechnicalRefresh';",
    replace: "const DEAD_RULE_CONSUMER = 'refreshPositionsLive';", },
  { id: "DEAD_RULE_SHARED_BANNER",
    find: "const DEAD_RULE_SHARED_BANNER = true;",
    replace: "const DEAD_RULE_SHARED_BANNER = false;", },

  { id: "DEAD_RULES_ELSEWHERE",
    find: "const DEAD_RULES_ELSEWHERE = 2;",
    replace: "const DEAD_RULES_ELSEWHERE = 3;", },
  { id: "DEAD_RULE_ORDINAL",
    find: "const DEAD_RULE_ORDINAL = 3;",
    replace: "const DEAD_RULE_ORDINAL = 4;", },

  { id: "DEAD_DECLS",
    find: "const DEAD_DECLS = 18;",
    replace: "const DEAD_DECLS = 17;", },
  { id: "DEAD_UNITS",
    find: "const DEAD_UNITS = 5318;",
    replace: "const DEAD_UNITS = 5317;", },
  { id: "CHAIN", covers: ["CHAIN"],
    find: "  'js/ui/journal-close-legs.js',\n  'js/ui/journal-trade-forms.js',",
    replace: "  'js/ui/journal-trade-forms.js',\n  'js/ui/journal-close-legs.js',", },
  { id: "CHAIN_LENGTH",
    find: "const CHAIN_LENGTH = 36;",
    replace: "const CHAIN_LENGTH = 35;", },
  { id: "SMALLEST_MODULE",
    find: "const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';",
    replace: "const SMALLEST_MODULE = 'js/services/journal-map-audit.js';", },
  { id: "SMALLEST_CHARS",
    find: "const SMALLEST_CHARS = 1761;",
    replace: "const SMALLEST_CHARS = 1762;", },
  { id: "LARGEST_CHARS",
    find: "const LARGEST_CHARS = 71811;",
    replace: "const LARGEST_CHARS = 71812;", },
  { id: "MODULE_SIZE_RANK",
    find: "const MODULE_SIZE_RANK = 5;",
    replace: "const MODULE_SIZE_RANK = 4;", },
  { id: "LAYERS_ENDING_BRACE",
    find: "const LAYERS_ENDING_BRACE = 33;",
    replace: "const LAYERS_ENDING_BRACE = 32;", },
  { id: "LAYERS_WITH_SEPARATOR",
    find: "const LAYERS_WITH_SEPARATOR = 28;",
    replace: "const LAYERS_WITH_SEPARATOR = 27;", },
  { id: "LAYERS_WITH_RAW_PAIR",
    find: "const LAYERS_WITH_RAW_PAIR = 25;",
    replace: "const LAYERS_WITH_RAW_PAIR = 24;", },
  { id: "LAYERS_WITHOUT_SEPARATOR",
    find: "const LAYERS_WITHOUT_SEPARATOR = 8;",
    replace: "const LAYERS_WITHOUT_SEPARATOR = 9;", },
  { id: "PURE_ASCII_LAYERS",
    find: "const PURE_ASCII_LAYERS = 2;",
    replace: "const PURE_ASCII_LAYERS = 1;", },
  { id: "UNDOCUMENTED_LAYERS",
    find: "const UNDOCUMENTED_LAYERS = 2;",
    replace: "const UNDOCUMENTED_LAYERS = 3;", },
  { id: "LAYERS_OPENING_ON_BANNER",
    find: "const LAYERS_OPENING_ON_BANNER = 20;",
    replace: "const LAYERS_OPENING_ON_BANNER = 36;", },

  { id: "COVERAGE_CONTRACT",
    find: "const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';",
    replace: "const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract-v2.test.js';", },
  { id: "BASE_DECLARED_MUTANTS",
    find: "const BASE_DECLARED_MUTANTS = 177;",
    replace: "const BASE_DECLARED_MUTANTS = 176;", },
  { id: "RETIRED_MUTANTS",
    find: "const RETIRED_MUTANTS = 89 + 82;",
    replace: "const RETIRED_MUTANTS = 89;", },
  { id: "CONTRACT_SPEC_MUTANTS",
    find: "const CONTRACT_SPEC_MUTANTS = 93;",
    replace: "const CONTRACT_SPEC_MUTANTS = 92;", },
  { id: "MUTANT_BUDGET",
    find: "const MUTANT_BUDGET = 250;",
    replace: "const MUTANT_BUDGET = 251;", },
  { id: "LAYER_CONTRACT_SPECS",
    find: "const LAYER_CONTRACT_SPECS = 1;",
    replace: "const LAYER_CONTRACT_SPECS = 2;", },
  ],
};
