'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Mutation spec — portfolio technical alignment debug PERMANENT boundary
// contract.
//
// One mutant per pinned constant. The coverage contract proves on every push
// that each `find` still appears exactly once in the target and that no pin is
// left uncovered, then applies all of them against a baseline it verifies green
// first.
//
// THE COHESION COUNTS ARE THIS LAYER'S FINDING and carry its heaviest mutants.
// MULTI_OWNER_LAYERS, CONNECTED_LAYERS and DISCONNECTED_LAYERS are what retired
// a criterion that was about to be invented on instinct, so each is moved in the
// direction that would have SAVED the criterion: CONNECTED_LAYERS up and
// DISCONNECTED_LAYERS down, the shape in which "bundling strangers would be a
// first" starts to look true again. OWNERS_REFERENCE_EACH_OTHER is flipped to
// `true`, which is the claim the whole section exists to deny.
//
// SAME_SHAPE_LAYERS is the list of precedents, and #460's pass found that
// naming ONE of them was not enough: a mutant that swapped it for another
// disconnected layer of a different shape survived. So the mutant here replaces
// a member with `swing-direction`, which IS in the disconnected set but has
// three owners rather than two — a contract that checked only "some disconnected
// layer" would let it live.
//
// BY_CONSUMER is mutated UP to 5, exactly the raw score. A contract that read
// the nine-direction score and called it the consumer count would let that
// mutant live, and the distinction between the two is what this layer rests on.
//
// ZERO-VALUED PINS get the mutation that matters for them. TOP_LEVEL_STATEMENT_-
// LINES, OPENING_COMMENT_LINES, MONOLITH_DEPENDENCIES, EVALUATION_TIME_READS and
// the eight fields of ZERO_DIRECTIONS are all zero or empty, and that is also
// what a metric measuring nothing returns — so each is mutated UP, to prove the
// contract reads a measurement rather than a constant. The controls that prove
// those metrics discriminate live in §3, §4 and §6, on inputs where the answer
// differs.
//
// MONOLITH_DEPENDENCIES is mutated to `['S']` specifically. `S` is the name that
// disqualified audit #424 and the one #455 narrowed the rule around, so it is
// the dependency whose presence would matter most — and this region has none.
//
// PURE_ASCII_LAYERS and UNDOCUMENTED_LAYERS are the two counts that keep this
// contract from writing "the first pure-ASCII layer" or "the first undocumented
// one". Both are mutated DOWN to 1, which is exactly the drift that would let
// the superlative back in.
//
// CHAIN IS AN ORDER, NOT A SET. Its mutant SWAPS TWO MIDDLE ENTRIES, which
// leaves membership, length and the tail all correct — the shape that survived
// the whole pass in #459 until the cut-order links were made load-bearing. The
// swap is in the middle deliberately: swapping the last two would also trip the
// tail assertion, and would prove nothing about the links between.
//
// EDGE_SITES carries its five sites in one literal; the mutant MOVES the first
// rather than appending, because an appended element perturbs nothing a length
// check would not already catch. RUNNER_UP_OWNERS DROPS an element, because
// that pin exists to reject a membership test that either name would satisfy.
//
// NAMES ARE MUTATED TO OTHER REAL DECLARATIONS, not to misspellings: a name that
// exists is what tests the claim about which name is there, where a misspelling
// fails for the boring reason instead.
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  target: 'tests/portfolio-technical-alignment-debug-boundary-contract.test.js',
  runs: ['tests/portfolio-technical-alignment-debug-boundary-contract.test.js'],
  exempt: {},
  mutants: [
  // ── Identity of the layer and the files of this change ────────────────────
  { id: "MODULE_REL",
    find: "const MODULE_REL = 'js/portfolio/portfolio-technical-alignment-debug.js';",
    replace: "const MODULE_REL = 'js/portfolio/portfolio-technical-merge.js';", },
  { id: "TAG",
    find: "const TAG = '<script src=\"./js/portfolio/portfolio-technical-alignment-debug.js\"></script>\\n';",
    replace: "const TAG = '<script src=\"./js/portfolio/portfolio-technical-merge.js\"></script>\\n';", },
  { id: "ANCHOR_TAG",
    find: "const ANCHOR_TAG = '<script src=\"./js/portfolio/portfolio-technical-merge.js\"></script>\\n';",
    replace: "const ANCHOR_TAG = '<script src=\"./js/portfolio/backend-positions-aggregate.js\"></script>\\n';", },
  { id: "INLINE_OPEN",
    find: "const INLINE_OPEN = '<script>';",
    replace: "const INLINE_OPEN = '<script >';", },
  { id: "BASE_SHA",
    find: "const BASE_SHA = '5210693';",
    replace: "const BASE_SHA = 'cc42f30';", },
  { id: "CONTRACT_REL",
    find: "const CONTRACT_REL = 'tests/portfolio-technical-alignment-debug-boundary-contract.test.js';",
    replace: "const CONTRACT_REL = 'tests/portfolio-technical-merge-boundary-contract.test.js';", },
  { id: "UNDO_REL",
    find: "const UNDO_REL = 'tests/lib/portfolio-technical-alignment-debug-undo.js';",
    replace: "const UNDO_REL = 'tests/lib/portfolio-technical-merge-undo.js';", },
  { id: "AUDIT_REL",
    find: "const AUDIT_REL = 'tests/temporary-portfolio-technical-alignment-debug-boundary-audit.test.js';",
    replace: "const AUDIT_REL = 'tests/temporary-portfolio-technical-merge-boundary-audit.test.js';", },
  { id: "AUDIT_SPEC_REL",
    find: "const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-alignment-debug-audit.spec.js';",
    replace: "const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-merge-audit.spec.js';", },
  { id: "CONTRACT_SPEC_REL",
    find: "const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-alignment-debug-contract.spec.js';",
    replace: "const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-merge-contract.spec.js';", },

  // ── The ratchet and the tag's slot ────────────────────────────────────────
  { id: "TEST_FILE_COUNT",
    find: "const TEST_FILE_COUNT = 163;",
    replace: "const TEST_FILE_COUNT = 162;", },
  { id: "LOCAL_SCRIPT_COUNT",
    find: "const LOCAL_SCRIPT_COUNT = 79;",
    replace: "const LOCAL_SCRIPT_COUNT = 78;", },
  { id: "MODULE_POSITION",
    find: "const MODULE_POSITION = 78;",
    replace: "const MODULE_POSITION = 77;", },

  // ── The boundary, in monolith coordinates ─────────────────────────────────
  { id: "CODE_AT",
    find: "const CODE_AT = 114535;",
    replace: "const CODE_AT = 114534;", },
  { id: "CODE_CHARS",
    find: "const CODE_CHARS = 1389956;",
    replace: "const CODE_CHARS = 1389957;", },
  { id: "RAW_AT_IN_CODE",
    find: "const RAW_AT_IN_CODE = 990716;",
    replace: "const RAW_AT_IN_CODE = 990717;", },
  { id: "RAW_END_IN_CODE",
    find: "const RAW_END_IN_CODE = 994856;",
    replace: "const RAW_END_IN_CODE = 994857;", },
  { id: "BODY_END_IN_CODE",
    find: "const BODY_END_IN_CODE = 994855;",
    replace: "const BODY_END_IN_CODE = 994854;", },
  { id: "TOP_LEVEL_BANNERS",
    find: "const TOP_LEVEL_BANNERS = 223;",
    replace: "const TOP_LEVEL_BANNERS = 222;", },
  { id: "RESIDUAL_MONOLITH",
    find: "const RESIDUAL_MONOLITH = 1385816;",
    replace: "const RESIDUAL_MONOLITH = 1385817;", },
  { id: "TAG_GAP",
    find: "const TAG_GAP = 990724;",
    replace: "const TAG_GAP = 990716;", },
  { id: "NET_REDUCTION",
    find: "const NET_REDUCTION = 4062;",
    replace: "const NET_REDUCTION = 4140;", },

  // ── The two owners ────────────────────────────────────────────────────────
  // Mutated to the ORDER the file does not have: both names are real and both
  // are present, so only the sequence is under test.
  { id: "OWNERS_EXPECTED",
    find: "const OWNERS_EXPECTED = ['buildPortfolioTechnicalAlignmentDebug', 'mapLimit'];",
    replace: "const OWNERS_EXPECTED = ['mapLimit', 'buildPortfolioTechnicalAlignmentDebug'];", },
  { id: "OWNER_COUNT",
    find: "const OWNER_COUNT = 2;",
    replace: "const OWNER_COUNT = 1;", },
  { id: "FUNCTION_OWNERS",
    find: "const FUNCTION_OWNERS = 2;",
    replace: "const FUNCTION_OWNERS = 1;", },
  // Swapped, so the two sizes are both real and only their attribution moves.
  { id: "OWNER_SIZES",
    find: "const OWNER_SIZES = [3405, 731];",
    replace: "const OWNER_SIZES = [731, 3405];", },
  { id: "BODY_ENDING",
    find: "const BODY_ENDING = '}\\n';",
    replace: "const BODY_ENDING = ';\\n';", },
  { id: "OPENING_LINE",
    find: "const OPENING_LINE = 'function buildPortfolioTechnicalAlignmentDebug(ticker, pos, technical) {';",
    replace: "const OPENING_LINE = 'function mapLimit(items, limit, worker) {';", },
  { id: "PARAMETERS",
    find: "const PARAMETERS = ['ticker', 'pos', 'technical'];",
    replace: "const PARAMETERS = ['ticker', 'pos'];", },
  { id: "HELPER_PARAMETERS",
    find: "const HELPER_PARAMETERS = ['items', 'limit', 'worker'];",
    replace: "const HELPER_PARAMETERS = ['items', 'worker', 'limit'];", },
  { id: "CODE_LINES",
    find: "const CODE_LINES = 64;",
    replace: "const CODE_LINES = 65;", },
  { id: "TOTAL_LINES",
    find: "const TOTAL_LINES = 69;",
    replace: "const TOTAL_LINES = 68;", },
  { id: "COMMENT_LINES",
    find: "const COMMENT_LINES = 5;",
    replace: "const COMMENT_LINES = 4;", },
  // ZERO, mutated UP: a module that carried one comment line would satisfy a
  // pin that merely returned its own constant.
  { id: "OPENING_COMMENT_LINES",
    find: "const OPENING_COMMENT_LINES = 0;",
    replace: "const OPENING_COMMENT_LINES = 1;", },

  // ── Coupling, in all nine directions ──────────────────────────────────────
  { id: "EXTERNAL_EDGES",
    find: "const EXTERNAL_EDGES = 5;",
    replace: "const EXTERNAL_EDGES = 4;", },
  // MOVED, not appended: the first site slides by one unit, which no length
  // check would notice.
  { id: "EDGE_SITES",
    find: "const EDGE_SITES = [1136310, 1162463, 1162564, 1167182, 1167277];",
    replace: "const EDGE_SITES = [1136311, 1162463, 1162564, 1167182, 1167277];", },
  { id: "EDGE_HOSTS",
    find: "const EDGE_HOSTS = ['refreshPositionsLive'];",
    replace: "const EDGE_HOSTS = ['fetchPortfolioTechnicalRefresh'];", },
  { id: "DISTINCT_CONSUMERS",
    find: "const DISTINCT_CONSUMERS = 1;",
    replace: "const DISTINCT_CONSUMERS = 5;", },
  // EMPTY, mutated to the one dependency that would have disqualified the cut.
  { id: "MONOLITH_DEPENDENCIES",
    find: "const MONOLITH_DEPENDENCIES = [];",
    replace: "const MONOLITH_DEPENDENCIES = ['S'];", },
  // One of the eight zero fields lifted off zero.
  { id: "ZERO_DIRECTIONS", covers: ["ZERO_DIRECTIONS"],
    find: "  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,",
    replace: "  siblingModules: 1, staticMarkup: 0, generatedMarkup: 0,", },
  { id: "FULL_NINE",
    find: "const FULL_NINE = 5;",
    replace: "const FULL_NINE = 1;", },
  // UP to exactly the raw score: a contract that read the nine-direction score
  // and called it the consumer count would let this one live.
  { id: "BY_CONSUMER",
    find: "const BY_CONSUMER = 1;",
    replace: "const BY_CONSUMER = 5;", },
  { id: "EVALUATION_TIME_READS",
    find: "const EVALUATION_TIME_READS = [];",
    replace: "const EVALUATION_TIME_READS = ['S'];", },
  { id: "TOP_LEVEL_STATEMENT_LINES",
    find: "const TOP_LEVEL_STATEMENT_LINES = 0;",
    replace: "const TOP_LEVEL_STATEMENT_LINES = 1;", },
  { id: "VM_GLOBALS",
    find: "const VM_GLOBALS = 2;",
    replace: "const VM_GLOBALS = 1;", },
  { id: "LAYERS_WITH_A_DEPENDENCY",
    find: "const LAYERS_WITH_A_DEPENDENCY = 10;",
    replace: "const LAYERS_WITH_A_DEPENDENCY = 9;", },
  { id: "HELPER_CALL_SITES",
    find: "const HELPER_CALL_SITES = 1;",
    replace: "const HELPER_CALL_SITES = 2;", },
  // DOWN to the helper's own call count, which is the shape in which "general
  // in shape and single-use in fact" stops being a contrast at all.
  { id: "PROMISE_ALL_SITES",
    find: "const PROMISE_ALL_SITES = 22;",
    replace: "const PROMISE_ALL_SITES = 1;", },

  // ── The screen, both readings ─────────────────────────────────────────────
  { id: "RUN_FLOOR",
    find: "const RUN_FLOOR = 1500;",
    replace: "const RUN_FLOOR = 1501;", },
  { id: "RAW_RUNS",
    find: "const RAW_RUNS = 7690;",
    replace: "const RAW_RUNS = 7689;", },
  { id: "SEAM_REJECTED",
    find: "const SEAM_REJECTED = 2048;",
    replace: "const SEAM_REJECTED = 2047;", },
  { id: "CANDIDATES",
    find: "const CANDIDATES = 3322;",
    replace: "const CANDIDATES = 3323;", },
  { id: "CLEAN_CANDIDATES",
    find: "const CLEAN_CANDIDATES = 2059;",
    replace: "const CLEAN_CANDIDATES = 2058;", },
  { id: "ONE_CONSUMER_CANDIDATES",
    find: "const ONE_CONSUMER_CANDIDATES = 5;",
    replace: "const ONE_CONSUMER_CANDIDATES = 4;", },
  { id: "ONE_CONSUMER_MULTI_SITE",
    find: "const ONE_CONSUMER_MULTI_SITE = 163;",
    replace: "const ONE_CONSUMER_MULTI_SITE = 162;", },
  { id: "BEST_BY_CONSUMER_UNITS",
    find: "const BEST_BY_CONSUMER_UNITS = 4139;",
    replace: "const BEST_BY_CONSUMER_UNITS = 4140;", },
  { id: "RUNNER_UP_UNITS",
    find: "const RUNNER_UP_UNITS = 3690;",
    replace: "const RUNNER_UP_UNITS = 3691;", },
  // DROPPED, not renamed: this pin exists to reject a membership test that
  // either of the two names would satisfy on its own.
  { id: "RUNNER_UP_OWNERS",
    find: "const RUNNER_UP_OWNERS = ['_journalMapAuditEnabled', '_journalMapAuditSummarize'];",
    replace: "const RUNNER_UP_OWNERS = ['_journalMapAuditEnabled'];", },

  // ── The finding: the cohesion criterion ───────────────────────────────────
  { id: "OWNERS_REFERENCE_EACH_OTHER",
    find: "const OWNERS_REFERENCE_EACH_OTHER = false;",
    replace: "const OWNERS_REFERENCE_EACH_OTHER = true;", },
  { id: "OWNER_GAP",
    find: "const OWNER_GAP = '\\n\\n';",
    replace: "const OWNER_GAP = '\\n';", },
  { id: "PRIOR_LAYERS",
    find: "const PRIOR_LAYERS = 34;",
    replace: "const PRIOR_LAYERS = 35;", },
  { id: "MULTI_OWNER_LAYERS",
    find: "const MULTI_OWNER_LAYERS = 27;",
    replace: "const MULTI_OWNER_LAYERS = 26;", },
  // UP, and DOWN: together these are the shape in which the retired criterion
  // starts to look true again.
  { id: "CONNECTED_LAYERS",
    find: "const CONNECTED_LAYERS = 10;",
    replace: "const CONNECTED_LAYERS = 18;", },
  { id: "DISCONNECTED_LAYERS",
    find: "const DISCONNECTED_LAYERS = 17;",
    replace: "const DISCONNECTED_LAYERS = 9;", },
  { id: "SAME_SHAPE_OWNERS",
    find: "const SAME_SHAPE_OWNERS = 2;",
    replace: "const SAME_SHAPE_OWNERS = 3;", },
  { id: "SAME_SHAPE_CONNECTED",
    find: "const SAME_SHAPE_CONNECTED = 1;",
    replace: "const SAME_SHAPE_CONNECTED = 2;", },
  // Swapped for a layer that IS in the disconnected set but has three owners,
  // not two: a contract checking only "some disconnected layer" would pass.
  { id: "SAME_SHAPE_LAYERS", covers: ["SAME_SHAPE_LAYERS"],
    find: "  'js/ui/tt-reconnect.js',\n  'js/services/journal-snapshot-prefetch.js',",
    replace: "  'js/services/swing-direction.js',\n  'js/services/journal-snapshot-prefetch.js',", },
  { id: "SOLO_CUT_FORGONE",
    find: "const SOLO_CUT_FORGONE = 733;",
    replace: "const SOLO_CUT_FORGONE = 731;", },

  // ── Reachability and the chain ────────────────────────────────────────────
  { id: "DEAD_DECLS",
    find: "const DEAD_DECLS = 18;",
    replace: "const DEAD_DECLS = 17;", },
  { id: "DEAD_UNITS",
    find: "const DEAD_UNITS = 5318;",
    replace: "const DEAD_UNITS = 5317;", },
  // TWO MIDDLE ENTRIES SWAPPED: membership, length and the tail all stay
  // correct, so only the cut-order links can catch it.
  { id: "CHAIN", covers: ["CHAIN"],
    find: "  'js/ui/journal-close-legs.js',\n  'js/ui/journal-trade-forms.js',",
    replace: "  'js/ui/journal-trade-forms.js',\n  'js/ui/journal-close-legs.js',", },
  { id: "CHAIN_LENGTH",
    find: "const CHAIN_LENGTH = 35;",
    replace: "const CHAIN_LENGTH = 34;", },
  { id: "SMALLEST_MODULE",
    find: "const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';",
    replace: "const SMALLEST_MODULE = 'js/portfolio/portfolio-technical-alignment-debug.js';", },
  { id: "SMALLEST_CHARS",
    find: "const SMALLEST_CHARS = 1761;",
    replace: "const SMALLEST_CHARS = 1762;", },
  { id: "LARGEST_CHARS",
    find: "const LARGEST_CHARS = 71811;",
    replace: "const LARGEST_CHARS = 71812;", },
  // DOWN to 1: the rank at which "the smallest layer in the chain" would be
  // written, which is the superlative this pin exists to prevent.
  { id: "MODULE_SIZE_RANK",
    find: "const MODULE_SIZE_RANK = 4;",
    replace: "const MODULE_SIZE_RANK = 1;", },
  { id: "LAYERS_ENDING_BRACE",
    find: "const LAYERS_ENDING_BRACE = 32;",
    replace: "const LAYERS_ENDING_BRACE = 31;", },
  { id: "LAYERS_WITH_SEPARATOR",
    find: "const LAYERS_WITH_SEPARATOR = 27;",
    replace: "const LAYERS_WITH_SEPARATOR = 26;", },
  { id: "LAYERS_WITH_RAW_PAIR",
    find: "const LAYERS_WITH_RAW_PAIR = 24;",
    replace: "const LAYERS_WITH_RAW_PAIR = 27;", },
  { id: "LAYERS_WITHOUT_SEPARATOR",
    find: "const LAYERS_WITHOUT_SEPARATOR = 8;",
    replace: "const LAYERS_WITHOUT_SEPARATOR = 9;", },
  // DOWN to 1 each: exactly the drift that would let "the first pure-ASCII
  // layer" and "the first undocumented layer" back into the prose.
  { id: "PURE_ASCII_LAYERS",
    find: "const PURE_ASCII_LAYERS = 2;",
    replace: "const PURE_ASCII_LAYERS = 1;", },
  { id: "UNDOCUMENTED_LAYERS",
    find: "const UNDOCUMENTED_LAYERS = 2;",
    replace: "const UNDOCUMENTED_LAYERS = 1;", },
  ],
};
