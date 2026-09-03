# Working notes for this repository

## The extraction programme

`index.html` carries an inline `<script>` monolith that is being reduced, one
audited region at a time, into classic `js/**` modules. Each cycle is two PRs:

1. **Audit (Phase 1).** Measure candidate regions and publish the numbers.
   Production stays byte-identical; the audit ships as a single temporary test
   file that the next PR deletes.
2. **Extraction (Phase 2).** Move the audited bytes. A relocation is
   byte-exact or it is not done: the module is the block's bytes verbatim, and
   a `tests/lib/*-undo.js` helper reconstructs the pre-extraction document
   exactly.

Fail-closed style differs by lineage, so check before assuming: the fifteen
layers the reconstruction bridge peels **throw** on any mismatch, while the
five `eic-pr*-undo.js` helpers return and let their contracts assert instead.
The bridge itself delegates and throws nothing of its own.

Targets are chosen on **coupling, not size**. The reconstruction bridge
`tests/lib/post-journal-mcx-pr3-undo.js` peels every layer newest-first and is
the one file that spans the whole chain.

## Three verification checks — always run these

Established from a full session of verification passes, by tallying which ones
actually found defects. They are not a ritual per PR: they are the three places
where things went wrong repeatedly.

### 1. Bulk edits to existing files

Whenever a change touches many existing files mechanically — updating pinned
offsets, list entries, tail indices, script counts across a family of contracts
— audit the edit itself, not just the green suite. **A weakened or dropped
assertion still passes CI, because a missing assertion cannot fail.**

Compare against the base commit:

- assertions reported per file (a drop is a red flag),
- assertion *calls* per file (`eq(`, `ok(`, `throws(`, …),
- then read every removed line and classify it.

This is what caught a chain in `sfs-extraction-boundary-contract` that had
asserted the identity of the LAST local script: shifting it by one moved that
assertion to the second-to-last position and left the endpoint pinned by
nothing at all.

### 2. Everything written as prose

Comments, headers, PR bodies, tables. Prose is not executed, so nothing
contradicts it when it drifts or was never true.

**Check every factual claim against the whole set it quantifies over, not the
sample it was inferred from.** The recurring failure is a universal asserted
from a partial look — "the earlier three", "every layer", "and no other". If a
claim cannot be checked exhaustively, scope it explicitly to what was measured.

**A claim worth stating twice is worth executing.** Prose that keeps being
restated is prose that keeps drifting: the boundary rule was rewritten wrong
twice in two cycles, and the second version was wrong about the counterexample
the first had just uncovered — both passed review, because review reads and
does not run. When a rule matters enough to repeat, move it into a helper with
a contract, and leave the comment pointing at the file that runs.

Prefer stating facts from artifacts that are already proven (the undo helpers
reconstruct byte-exactly and run in the suite) over a freshly written
measurement script.

### 3. New assertions — by mutation, not by rereading

Rereading an assertion tells you what it says. Mutating its subject tells you
whether it checks anything.

- Mutate each pinned constant one at a time and confirm the suite fails.
  Survivors are pins that check nothing.
- Plant the violation each control claims to catch, and confirm the exact
  error message.
- A metric whose true value is `0` needs a control on an input where the
  answer differs — otherwise `return 0` is indistinguishable from measuring.

Mutation coverage found a completeness gap that three careful readings missed:
a set assumed closed and never verified.

## When a scratch tool disagrees with the artifact under test

Assume the tool is wrong until proved otherwise. Over one session the ad-hoc
checkers were wrong five times and the artifacts zero. Known ways they failed:

- `split('\n')` on text ending in `\n` leaves a phantom empty final element;
- `indexOf` on a short probe matches a recurring banner rule elsewhere;
- greedy longest-match slides a block boundary when neighbours share a prefix;
- a `var` branch that jumps to the next `;` walks into an IIFE body;
- scanning for `function`/`var` while forgetting `const`/`let`.

## Screening regions for extraction

Two different rules, for two different questions — do not conflate them:

- **Screening** a section: one column-0 `// ── ` banner line running to the
  next `// ── ` banner. That is the rule the shipped screen in
  `tests/journal-trade-detail-boundary-contract.test.js` states and uses.
- **The extractable boundary** of a chosen region is *not* a rule of the same
  kind, and two attempts to write one as a rule were both wrong. See below.

### The boundary is a judgement; only the seam is mechanical

Do not look for a rule that computes where a region ends. There isn't one, and
`tests/extraction-boundary-rule-contract.test.js` measures why against the five
boundaries the undo helpers still record:

- `tt-reconnect` and `apex-post-auth-init` are each followed **immediately** by
  another feature's code, with no `// ══` header and no `// ── ` banner
  between — so "extend to the next header" would swallow it;
- `journal-trade-detail` **spans** a `// ── ` section banner — so "stop at the
  next banner" would cut it in half.

The mistakes point in opposite directions, which is the tell that no banner or
header rule can be right. Deciding which code belongs to the feature is the
judgement an audit publishes and defends.

Two rules were written down anyway, and both are now pinned as dead in §6 of
that contract:

1. *"ends after its LAST top-level declaration."* False for
   `js/services/journal-backend-write-through.js`, which ends on 4,878 units of
   trailing top-level code — an IIFE, which is not a declaration. Fifteen of
   sixteen layers matched, which is exactly how a wrong rule survives.
2. *"walk forward from the last declaration, absorbing statement lines."*
   Written in audit #422 to fix (1), and wrong on the same module: it stops at
   the first blank line, and that IIFE contains blank lines. Same 4,878 short.

What **is** mechanical, and lives in `tests/lib/extraction-boundary.js`:

- `snapBodyEnd(src, at, limit)` — once you have chosen the last construct, the
  body ends just past the newline of the last line **containing code**;
  declarations, bare statements and IIFEs need no separate case.
- `assertSeam(src, at, bodyEnd)` — fail-closed on the four invariants every
  recorded boundary satisfies: the region opens on a line start, the body is
  line-terminated, the body's last line is code, and exactly one newline
  separates body from what follows. Call it in Phase 2 before writing anything.

Taking the screening rule as the boundary swallowed 551 units of the following
feature on the first attempt at the trade-detail cut, and would have swallowed
17,734 units at the backend-portfolios cut.

Measure **both directions of state coupling**. Inbound (writes from outside
into state the region owns) is not enough: a region that declares no `var`
scores a perfect zero inbound while writing globals it does not own. That
outbound direction disqualified a candidate that looked cleanest on every
other axis.
