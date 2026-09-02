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
- **The extractable boundary** of a chosen region: it ends after its LAST
  top-level declaration, at the `}\n\n` seam. That can stop well before the
  next `// ── ` banner, because an `// ══` block header for the *next* feature
  may sit in between. Taking the screening rule as the boundary swallowed 551
  units of the following feature on the first attempt at the trade-detail cut.

Measure **both directions of state coupling**. Inbound (writes from outside
into state the region owns) is not enough: a region that declares no `var`
scores a perfect zero inbound while writing globals it does not own. That
outbound direction disqualified a candidate that looked cleanest on every
other axis.
