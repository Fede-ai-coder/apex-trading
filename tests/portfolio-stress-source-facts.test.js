'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS TEST — FACTUAL SOURCE ASSERTIONS (specification only).
//
// WHY THIS FILE EXISTS — AND WHY IT IS A SEPARATE FILE
//   Revision 1.0.0 of this specification passed 194 self-consistency assertions
//   while confidently asserting things the audited backend source contradicts:
//   that fetchOptionChainNested depends on the global ttFetch (it deliberately
//   does not), that OptionChainCache uses createRequestCoalescer (it owns its own
//   pending Map), that its revalidation is driven by a timer (it is a promise),
//   and that every exact contract must hydrate through the option chain (the
//   production path never touches the chain).
//
//   A contract test that only compares a document against itself will certify a
//   confident falsehood forever. This file closes that hole: it checks the
//   specification's LOAD-BEARING CLAIMS against the AUDITED SOURCE.
//
//   It is a separate file because its dependency shape is genuinely different
//   from the other three: it is the only one that reaches OUTSIDE this repository
//   (to an apex-backend checkout, when one is reachable) and the only one that
//   degrades to a printed SKIP rather than a pass when its subject is absent.
//   Folding that conditional-subject behaviour into the model/architecture/reuse
//   tests would blur what each of those files guarantees unconditionally.
//
// WHAT IT CHECKS
//   1. UNCONDITIONAL — the fact table itself is well-formed, every fact carries
//      evidence, and the specification's own prose agrees with every fact,
//      including the phrases and dependencies each fact FORBIDS the document
//      from asserting.
//   2. CONDITIONAL — when an apex-backend checkout is reachable (APEX_BACKEND_PATH,
//      /workspace/apex-backend or ../apex-backend), each audited file's sha256 must
//      match the recorded hash, and every evidence snippet must be present
//      VERBATIM in the file it is attributed to. Counts recorded as zero
//      (ttFetch call sites, createRequestCoalescer references, timers, chain
//      references in the portfolio routes, approxDelta call sites, downside beta)
//      are re-derived from the real source, with comments stripped where the
//      distinction between code and prose matters.
//
//   No runtime implementation is copied here — only claims and short quotations.
//
// MUTATION PROOF
//   Every checker is re-run against deliberately broken in-memory copies. All
//   mutations are in memory; no file is written and no network is touched.
//
// Run: node tests/portfolio-stress-source-facts.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'risk-models', 'portfolio-stress-test-v1.md');

// ── tiny harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0, skipped = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg); console.error('  ✗ ' + msg); return false;
}
function skip(msg) { skipped++; console.log('  ~ SKIPPED: ' + msg); }
function section(t) { console.log('\n' + t); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function mustHold(fn, a, b, msg) {
  const v = fn(a, b);
  return ok(v.length === 0, msg + (v.length ? ' — violations: ' + v.join(' | ') : ''));
}
function mustCatch(fn, a, b, msg) {
  const v = fn(a, b);
  return ok(v.length > 0, 'MUTATION NOT CAUGHT: ' + msg);
}

const MODEL = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const MD = fs.readFileSync(MD_PATH, 'utf8');

// ── STRICT MODE ──────────────────────────────────────────────────────────────
// PST_REQUIRE_BACKEND_SOURCE=1 turns every "cannot verify" condition into a
// FAIL instead of a SKIP:
//     PST_REQUIRE_BACKEND_SOURCE=1 APEX_BACKEND_PATH=/path/to/apex-backend \
//       node tests/portfolio-stress-source-facts.test.js
// In the ordinary frontend suite the source-backed part still SKIPs, and a
// skipped run must never be reported as a completed source-backed verification.
const STRICT = /^(1|true|yes)$/i.test(String(process.env.PST_REQUIRE_BACKEND_SOURCE || ''));

// Record why the source-backed part could not run, so the summary can say it
// plainly instead of implying the evidence was checked.
let sourceBackedRan = false;
let sourceBackedSkipReason = null;
function unavailable(reason) {
  sourceBackedSkipReason = reason;
  if (STRICT) { ok(false, 'STRICT MODE: ' + reason); return true; }
  skip(reason + ' — the unconditional checks above still ran');
  return false;
}

// ── locate an apex-backend GIT REPOSITORY, if one is reachable ───────────────
// A repository, not a working tree: the evidence is verified against the audited
// COMMIT via `git show <commit>:<path>`, so the checkout may sit on any branch.
function resolveBackendRoot() {
  const candidates = [];
  const envVar = (MODEL.sourceFacts || {}).backendCheckoutEnvVar || 'APEX_BACKEND_PATH';
  if (process.env[envVar]) candidates.push(process.env[envVar]);
  for (const p of (MODEL.sourceFacts || {}).backendCheckoutDefaultPaths || []) {
    candidates.push(path.isAbsolute(p) ? p : path.resolve(ROOT, p));
  }
  for (const c of candidates) {
    try {
      execFileSync('git', ['-C', c, 'rev-parse', '--git-dir'], { stdio: ['ignore', 'pipe', 'pipe'] });
      return c;
    } catch (_) { /* keep looking */ }
  }
  return null;
}
const BACKEND_ROOT = resolveBackendRoot();

// Is the audited commit present in that repository?
function auditedCommitPresent(root, commit) {
  try {
    execFileSync('git', ['-C', root, 'cat-file', '-e', commit + '^{commit}'], { stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch (_) { return false; }
}

// Read a path AT THE AUDITED COMMIT. Never the working tree: a checkout on a
// later branch, or an unrelated later edit to the same file, must not be able to
// masquerade as a semantic contradiction in what was actually audited.
function makeCommitReader(root, commit) {
  return (rel) => execFileSync('git', ['-C', root, 'show', commit + ':' + rel],
    { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// Strip line and block comments so "the header says it does NOT call ttFetch" is
// never mistaken for a ttFetch call site. Deliberately simple: these files are
// plain ES modules with no regex literals containing comment markers.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}
function countMatches(src, re) {
  const m = src.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
  return m ? m.length : 0;
}

// ── checkers ─────────────────────────────────────────────────────────────────

// A. The fact table is well-formed and every fact is usable as evidence.
function vFactTableShape(m) {
  const out = [];
  const sf = m.sourceFacts;
  if (!sf) return ['sourceFacts is missing'];
  if (!sf.purpose || String(sf.purpose).length < 40) out.push('sourceFacts has no stated purpose');
  if (!sf.backendCheckoutEnvVar) out.push('no backend checkout env var is declared');
  if (!(sf.backendCheckoutDefaultPaths || []).length) out.push('no backend checkout default paths are declared');
  const seen = new Set();
  for (const f of sf.facts || []) {
    if (!/^FACT-[A-Z0-9-]+$/.test(String(f.id || ''))) out.push('malformed fact id: ' + f.id);
    if (seen.has(f.id)) out.push('duplicate fact id: ' + f.id);
    seen.add(f.id);
    if (!f.claim || String(f.claim).length < 15) out.push(f.id + ' has no substantive claim');
    if (!f.detail || String(f.detail).length < 40) out.push(f.id + ' has no detail');
    // Every fact must be checkable: either a verbatim snippet or a recorded count.
    const hasEvidence = !!f.evidence;
    const hasCount = Object.keys(f).some((k) => /^(occurrencesOf|codeOccurrencesOf|callSitesOf|optionChainReferencesIn)/.test(k));
    if (!hasEvidence && !hasCount) out.push(f.id + ' carries neither evidence nor a recorded count');
    if (f.file && !/^(server\.js|lib\/[a-z-]+\.js)$/.test(f.file)) out.push(f.id + ' names an unexpected file: ' + f.file);
  }
  if ((sf.facts || []).length < 20) out.push('the fact table is too small: ' + (sf.facts || []).length);
  return out;
}

// B. Every fact a file is attributed to must have a recorded hash, so the
//    conditional check below can prove it was audited at that exact content.
function vFactsHaveAuditedHashes(m) {
  const out = [];
  const hashes = ((m.audit || {}).backend || {}).auditedFileHashes || {};
  for (const f of (m.sourceFacts || {}).facts || []) {
    if (!f.file) continue;
    if (!hashes[f.file]) out.push(f.id + ' names ' + f.file + ' which has no audited hash');
  }
  for (const [file, h] of Object.entries(hashes)) {
    if (!/^[0-9a-f]{64}$/.test(String(h))) out.push('malformed audited hash for ' + file);
  }
  if (Object.keys(hashes).length < 5) out.push('too few audited file hashes recorded');
  return out;
}

// C. The specification's own prose must agree with every fact — including the
//    things each fact forbids the document from saying.
function vSpecificationAgreesWithFacts(m, md) {
  const out = [];
  const facts = (m.sourceFacts || {}).facts || [];
  const byId = new Map(facts.map((f) => [f.id, f]));

  // C1. Per-fact forbidden dependencies must not appear in the row they belong to.
  const chain = (m.reuseManifest || []).find((r) => r.responsibility === 'option-chain retrieval');
  const cache = (m.reuseManifest || []).find((r) => r.responsibility === 'option-chain cache');
  const ttFact = byId.get('FACT-CHAIN-NO-TTFETCH');
  if (ttFact) {
    for (const dep of ttFact.forbiddenInSpecificationDependencies || []) {
      if (chain && (chain.dependencies || []).includes(dep)) {
        out.push('option-chain retrieval lists the disproven dependency ' + dep);
      }
    }
    if (ttFact.codeOccurrencesOfTtFetch !== 0) out.push('FACT-CHAIN-NO-TTFETCH does not record zero ttFetch call sites');
  }
  const coalFact = byId.get('FACT-CACHE-NOT-COALESCER');
  if (coalFact) {
    for (const dep of coalFact.forbiddenInSpecificationDependencies || []) {
      if (cache && (cache.dependencies || []).includes(dep)) {
        out.push('option-chain cache lists the disproven dependency ' + dep);
      }
    }
    if (coalFact.occurrencesOfCreateRequestCoalescer !== 0) {
      out.push('FACT-CACHE-NOT-COALESCER does not record zero references');
    }
  }

  // C2. Forbidden PHRASES must not appear in the Markdown as an assertion. The
  //     document may quote them where it records the correction, so only the
  //     assertive forms are banned.
  const timerFact = byId.get('FACT-CACHE-NO-TIMER');
  if (timerFact) {
    for (const phrase of timerFact.forbiddenPhrasesInSpecification || []) {
      const assertive = new RegExp('(?:uses|starts|schedules|via|with)\\s+(?:a\\s+)?' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (assertive.test(md)) out.push('the Markdown asserts "' + phrase + '"');
    }
    if (timerFact.occurrencesOfSetIntervalOrSetTimeout !== 0) {
      out.push('FACT-CACHE-NO-TIMER does not record zero timers');
    }
  }

  // C3. The market-context owner must not be allowed to carry run identity.
  const mcFact = byId.get('FACT-MARKET-CONTEXT-PORTFOLIO-AGNOSTIC');
  const ms = (m.reuseManifest || []).find((r) => r.responsibility === 'market snapshot');
  if (mcFact && ms) {
    for (const f of mcFact.forbiddenInSpecificationForThisOwner || []) {
      if (!(ms.mustNotReceive || []).includes(f)) {
        out.push('market snapshot does not forbid ' + f + ' despite ' + mcFact.id);
      }
      if ((ms.extendedCapabilities || []).includes(f)) {
        out.push('market snapshot is extended with ' + f + ', contradicting ' + mcFact.id);
      }
    }
    if (ms.decision !== 'REUSE') out.push('market snapshot is ' + ms.decision + ' despite being portfolio-agnostic');
    if (mcFact.occurrencesOfPortfolioOverlayScenario !== 0) {
      out.push(mcFact.id + ' does not record zero portfolio/overlay/scenario references');
    }
  }

  // C4. The exact-symbol hydration facts must be reflected in the contract.
  const hydFact = byId.get('FACT-ENRICHED-EXACT-SYMBOL-DXLINK-READ');
  if (hydFact) {
    if (hydFact.optionChainReferencesInEnrichedRoute !== 0 || hydFact.optionChainReferencesInLiveRefreshRoute !== 0) {
      out.push(hydFact.id + ' does not record zero chain references on the portfolio routes');
    }
    const c = new Map((m.contracts || []).map((x) => [x.id, x]));
    const h1 = c.get('PST-HYDRATION-001');
    if (!h1 || !/MUST NOT be on this path/i.test(h1.text)) {
      out.push('PST-HYDRATION-001 contradicts ' + hydFact.id + ' by keeping the chain on the primary path');
    }
  }

  // C5. The Greeks-units fact must be reflected in the units block.
  const gFact = byId.get('FACT-GREEKS-RAW-UNITS');
  if (gFact) {
    const g = ((m.units || {}).measuredCurrentUnits || {}).legLiveGreeks || {};
    if (!/RAW DXLINK EVENT UNITS/.test(String(g.scale || ''))) {
      out.push('the units block contradicts ' + gFact.id);
    }
  }

  // C6. The pricing and downside-beta absence facts must be reflected.
  const pFact = byId.get('FACT-NO-PRICING-ENGINE');
  if (pFact && pFact.callSitesOfApproxDelta !== 0) out.push(pFact.id + ' does not record zero approxDelta call sites');
  const bFact = byId.get('FACT-NO-DOWNSIDE-BETA');
  if (bFact) {
    if (bFact.occurrencesOfDownsideBeta !== 0) out.push(bFact.id + ' does not record zero downside-beta matches');
    const beta = (m.reuseManifest || []).find((r) => r.responsibility === 'beta retrieval');
    if (beta && beta.downsideBetaAvailable !== false) out.push('beta retrieval claims a downside beta is available');
    if ((m.underlyingShockModel || {}).downsideBetaAvailableAtAuditedCommit !== false) {
      out.push('the shock model claims a downside beta exists at the audited commit');
    }
  }

  // C7. Every fact id must be discoverable from the human document.
  for (const f of facts) {
    if (md.indexOf(f.id) === -1) out.push('fact ' + f.id + ' is not listed in the Markdown');
  }
  return out;
}

// D. CONDITIONAL — verify the recorded evidence against the real audited source.
//    `readBackendFile` is injected so the mutation proof can serve altered
//    content from memory without ever writing to disk.
function vEvidenceAgainstSource(m, readBackendFile) {
  const out = [];
  if (!readBackendFile) return out;
  const hashes = ((m.audit || {}).backend || {}).auditedFileHashes || {};
  const cache = new Map();
  const read = (rel) => {
    if (!cache.has(rel)) cache.set(rel, readBackendFile(rel));
    return cache.get(rel);
  };

  // D1. Every audited file matches its recorded hash.
  for (const [rel, expected] of Object.entries(hashes)) {
    let buf;
    try { buf = read(rel); } catch (e) { out.push('audited file unreadable: ' + rel); continue; }
    const actual = sha256(buf);
    if (actual !== expected) {
      out.push('audited file drifted: ' + rel + ' (recorded ' + expected.slice(0, 12) + ', actual ' + actual.slice(0, 12) + ')');
    }
  }

  // D2. Every evidence snippet is present VERBATIM in the file it is attributed to.
  for (const f of (m.sourceFacts || {}).facts || []) {
    if (!f.file) continue;
    let text;
    try { text = read(f.file).toString('utf8'); } catch (_) { continue; }
    for (const key of ['evidence', 'evidenceSecondary']) {
      const snippet = f[key];
      if (!snippet) continue;
      if (text.indexOf(snippet) === -1) {
        out.push(f.id + ': ' + key + ' not found verbatim in ' + f.file + ' — ' + JSON.stringify(String(snippet).slice(0, 60)));
      }
    }
  }

  // D3. Recorded ZERO counts are re-derived from the real source.
  const chainSrc = (() => { try { return read('lib/option-chain-nested.js').toString('utf8'); } catch (_) { return null; } })();
  if (chainSrc != null) {
    const code = stripComments(chainSrc);
    const ttCalls = countMatches(code, /(^|[^a-zA-Z_.$])ttFetch\s*\(/g);
    if (ttCalls !== 0) out.push('lib/option-chain-nested.js has ' + ttCalls + ' ttFetch call sites — the specification records 0');
    if (!/getAccessToken/.test(code)) out.push('lib/option-chain-nested.js does not reference the injected getAccessToken');
    if (!/fetchImpl/.test(code)) out.push('lib/option-chain-nested.js does not use an injectable fetchImpl');
  }

  const cacheSrc = (() => { try { return read('lib/option-chain-cache.js').toString('utf8'); } catch (_) { return null; } })();
  if (cacheSrc != null) {
    const code = stripComments(cacheSrc);
    const coal = countMatches(code, /createRequestCoalescer/g);
    if (coal !== 0) out.push('lib/option-chain-cache.js references createRequestCoalescer ' + coal + ' times — the specification records 0');
    const timers = countMatches(code, /\b(setInterval|setTimeout)\s*\(/g);
    if (timers !== 0) out.push('lib/option-chain-cache.js has ' + timers + ' timers — the specification records 0');
    if (!/this\.pending\s*=\s*new Map\(\)/.test(code)) out.push('lib/option-chain-cache.js does not own a pending Map');
    if (!/\bcoalesce\s*\(/.test(code)) out.push('lib/option-chain-cache.js does not define coalesce()');
  }

  const mcSrc = (() => { try { return read('lib/market-context.js').toString('utf8'); } catch (_) { return null; } })();
  if (mcSrc != null) {
    const hits = countMatches(mcSrc, /portfolio|overlay|scenario/gi);
    if (hits !== 0) out.push('lib/market-context.js has ' + hits + ' portfolio/overlay/scenario references — the specification records 0');
  }

  const serverSrc = (() => { try { return read('server.js').toString('utf8'); } catch (_) { return null; } })();
  if (serverSrc != null) {
    // approxDelta is DECLARED once and never called.
    const approx = countMatches(serverSrc, /approxDelta/g);
    if (approx !== 1) out.push('approxDelta appears ' + approx + ' times — the specification records exactly 1 (the declaration, zero call sites)');
    // The real consumers of createRequestCoalescer.
    if (!/const marketMetricsCache = createRequestCoalescer\(/.test(serverSrc)) {
      out.push('server.js no longer creates marketMetricsCache via createRequestCoalescer');
    }
    if (!/const candlesResponseCache = createRequestCoalescer\(/.test(serverSrc)) {
      out.push('server.js no longer creates candlesResponseCache via createRequestCoalescer');
    }
    // No downside beta anywhere.
    const down = countMatches(serverSrc, /downside\s*-?\s*beta|downsideBeta|semi-?beta/gi);
    if (down !== 0) out.push('server.js mentions a downside beta ' + down + ' times — the specification records 0');
    // The backend scope owners still exist under the names the manifest claims.
    for (const fn of ['isJournalTradeOpenForCurrentRisk', 'isJournalLegOpenForCurrentRisk',
      'buildPortfolioPositionsFromJournal', 'buildPortfolioPositionsFromPayload',
      'readOptionLivePayloadForPortfolio', 'buildDxlinkOptionStreamerSymbol']) {
      if (!new RegExp('function\\s+' + fn + '\\s*\\(').test(serverSrc)) {
        out.push('backend owner named in the manifest no longer exists: ' + fn);
      }
    }

    // ── the evolved live-refresh path (target backend) ───────────────────────
    // The bounded batched fallback must still be bounded, and bounded by the
    // recorded parameters — an unbounded provider fallback inside a stress run
    // is the failure mode the whole reactivity argument rests on avoiding.
    if (!/const runUnderlyingLastCloseFallbacks = async/.test(serverSrc)) {
      out.push('the bounded batched underlying fallback (runUnderlyingLastCloseFallbacks) no longer exists');
    }
    const boundedFact = (m.sourceFacts.facts || []).find((f) => f.id === 'FACT-LIVE-REFRESH-BOUNDED-FALLBACK');
    if (boundedFact) {
      for (const [name, want] of [
        ['UNDERLYING_LAST_CLOSE_FALLBACK_CONCURRENCY', 2],
        ['UNDERLYING_LAST_CLOSE_FALLBACK_PER_SYMBOL_TIMEOUT_MS', 450],
        ['UNDERLYING_LAST_CLOSE_FALLBACK_TOTAL_BUDGET_MS', 1200],
      ]) {
        const re = new RegExp('const\\s+' + name + '\\s*=\\s*(\\d+)');
        const found = serverSrc.match(re);
        if (!found) out.push('bound constant missing at the audited commit: ' + name);
        else if (Number(found[1]) !== want) {
          out.push('bound changed at the audited commit: ' + name + ' = ' + found[1] + ', recorded ' + want);
        }
      }
    }
    if (!/response\.underlyingLastCloseFallbackDiagnostics/.test(serverSrc)) {
      out.push('underlyingLastCloseFallbackDiagnostics is no longer published');
    }
    if (!/getMarketMetricsItemCached/.test(serverSrc)) {
      out.push('getMarketMetricsItemCached no longer exists');
    }

    // ── the Portfolio routes must stay free of ANY option-chain access ───────
    // Bounded by the real route boundaries (scan to the next top-level route
    // declaration) rather than a guessed line range, and covering the raw
    // ttFetch provider path as well as the module + cache owner.
    const lines = serverSrc.split('\n');
    const starts = [];
    lines.forEach((l, i) => { if (/^app\.(get|post|put|delete|patch)\(/.test(l)) starts.push(i + 1); });
    const routeBody = (declRe) => {
      const idx = lines.findIndex((l) => declRe.test(l));
      if (idx < 0) return null;
      const start = idx + 1;
      const next = starts.find((s) => s > start);
      return lines.slice(start - 1, next ? next - 1 : lines.length).join('\n');
    };
    const portfolioRoutes = [
      ['POST /portfolio/live-refresh', /^app\.post\('\/portfolio\/live-refresh'/],
      ['POST /portfolio/:portfolioId/positions/enriched', /^app\.post\('\/portfolio\/:portfolioId\/positions\/enriched'/],
    ];
    for (const [name, re] of portfolioRoutes) {
      const body = routeBody(re);
      if (body == null) { out.push('Portfolio route not found at the audited commit: ' + name); continue; }
      const owner = countMatches(body, /optionChainCache|fetchOptionChainNested/g);
      const raw = countMatches(body, /ttFetch\(`\/option-chains\//g);
      if (owner !== 0) out.push(name + ' has ' + owner + ' option-chain owner references — the specification records 0');
      if (raw !== 0) out.push(name + ' has ' + raw + ' raw option-chain calls — the specification records 0 chain access');
    }

    // The raw provider-chain bypass is recorded as a HAZARD with a known count.
    const bypassFact = (m.sourceFacts.facts || []).find((f) => f.id === 'FACT-RAW-CHAIN-BYPASS-EXISTS');
    if (bypassFact && Array.isArray(bypassFact.rawChainCallSites)) {
      const actual = countMatches(serverSrc, /ttFetch\(`\/option-chains\//g);
      if (actual !== bypassFact.rawChainCallSites.length) {
        out.push('raw option-chain bypass count changed: ' + actual +
          ' at the audited commit, recorded ' + bypassFact.rawChainCallSites.length);
      }
    }
  }
  return out;
}

// ── run ──────────────────────────────────────────────────────────────────────
section('1. The fact table is well-formed');
mustHold(vFactTableShape, MODEL, null, '1.1: every fact carries an id, a claim, a detail and something checkable');
mustHold(vFactsHaveAuditedHashes, MODEL, null, '1.2: every attributed file has a recorded audited hash');
ok((MODEL.sourceFacts.facts || []).length >= 20,
  '1.3: the audit records at least 20 facts, got ' + (MODEL.sourceFacts.facts || []).length);

section('2. The specification agrees with its own facts');
mustHold(vSpecificationAgreesWithFacts, MODEL, MD, '2.1: no claim in the specification contradicts a recorded fact');
{
  // The four corrections that motivated this file, asserted individually.
  const chain = MODEL.reuseManifest.find((r) => r.responsibility === 'option-chain retrieval');
  ok(!(chain.dependencies || []).includes('ttFetch'),
    '2.2: option-chain retrieval does NOT depend on ttFetch');
  ok((chain.explicitlyNotADependency || []).includes('ttFetch'),
    '2.3: the ttFetch exclusion is recorded explicitly, not merely omitted');
  const cache = MODEL.reuseManifest.find((r) => r.responsibility === 'option-chain cache');
  ok(!(cache.dependencies || []).includes('createRequestCoalescer'),
    '2.4: option-chain cache does NOT depend on createRequestCoalescer');
  ok(/pending/i.test(String(cache.singleFlightOwner || '')),
    '2.5: the cache names its own pending-Map coalescer');
  ok(/promise/i.test(String(cache.revalidationMechanism || '')) && !/revalidation timer/i.test(String(cache.revalidationMechanism || '')),
    '2.6: revalidation is described as a promise, not a timer');
  const sup = MODEL.supplementaryManifest.find((r) => r.responsibility === 'exact-contract hydration');
  ok(sup && sup.decision === 'REUSE' && /PRIMARY/i.test(sup.role),
    '2.7: exact-symbol hydration is the REUSED primary path');
  const ms = MODEL.reuseManifest.find((r) => r.responsibility === 'market snapshot');
  ok(ms && ms.decision === 'REUSE' && ms.portfolioAgnostic === true,
    '2.8: the market snapshot is REUSE and portfolio-agnostic');
}

section('3. Evidence verified against the audited backend COMMIT');
const AUDITED_COMMIT = ((MODEL.audit || {}).backend || {}).commit;
const AUDITED_BRANCH = ((MODEL.audit || {}).backend || {}).branch;
let COMMIT_READER = null;
{
  // The manifest must agree with the declared implementation target before the
  // evidence is worth checking at all.
  const target = (MODEL.backendReferences || {}).backendStressImplementationTarget || {};
  ok(AUDITED_COMMIT === target.commit,
    '3.0a: audit.backend.commit matches backendStressImplementationTarget.commit');
  ok(AUDITED_BRANCH === target.branch,
    '3.0b: audit.backend.branch matches backendStressImplementationTarget.branch');
  ok((MODEL.sourceFacts || {}).auditedCommit === AUDITED_COMMIT,
    '3.0c: sourceFacts.auditedCommit matches audit.backend.commit');
  ok(/^git show/.test(String((MODEL.sourceFacts || {}).readMethod || '')),
    '3.0d: the declared read method is `git show <commit>:<path>`, not the working tree');

  if (!BACKEND_ROOT) {
    unavailable('no apex-backend git repository is reachable (set ' +
      ((MODEL.sourceFacts || {}).backendCheckoutEnvVar || 'APEX_BACKEND_PATH') + ', or place one at ' +
      ((MODEL.sourceFacts || {}).backendCheckoutDefaultPaths || []).join(' / ') + ')');
  } else if (!auditedCommitPresent(BACKEND_ROOT, AUDITED_COMMIT)) {
    unavailable('the audited commit ' + String(AUDITED_COMMIT).slice(0, 12) +
      ' is not present in ' + BACKEND_ROOT + ' (fetch it: git -C ' + BACKEND_ROOT + ' fetch origin ' + AUDITED_BRANCH + ')');
  } else {
    console.log('  repository:     ' + BACKEND_ROOT);
    console.log('  audited commit: ' + AUDITED_COMMIT + ' (' + AUDITED_BRANCH + ')');
    console.log('  read via:       git show <commit>:<path>  — NOT the working tree');
    COMMIT_READER = makeCommitReader(BACKEND_ROOT, AUDITED_COMMIT);
    sourceBackedRan = true;
    mustHold(vEvidenceAgainstSource, MODEL, COMMIT_READER,
      '3.1: every recorded hash, snippet and zero-count matches the audited commit');
    // The working tree may legitimately differ; that must NOT be a failure.
    let head = null;
    try { head = execFileSync('git', ['-C', BACKEND_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (_) {}
    if (head && head !== AUDITED_COMMIT) {
      console.log('  note: checkout HEAD is ' + head.slice(0, 12) +
        ', not the audited commit — verified against the commit anyway, which is the point of reading via git show.');
    }
  }
}

// ── MUTATION PROOF ──────────────────────────────────────────────────────────
section('4. MUTATION PROOF — specification mutations (in memory only)');
{
  // 4.1 ttFetch reintroduced as a dependency of the chain fetcher
  const m1 = clone(MODEL);
  m1.reuseManifest.find((r) => r.responsibility === 'option-chain retrieval').dependencies.push('ttFetch');
  mustCatch(vSpecificationAgreesWithFacts, m1, MD, 'describing fetchOptionChainNested as depending on global ttFetch must be rejected');

  // 4.2 createRequestCoalescer attributed to the option-chain cache
  const m2 = clone(MODEL);
  m2.reuseManifest.find((r) => r.responsibility === 'option-chain cache').dependencies.push('createRequestCoalescer');
  mustCatch(vSpecificationAgreesWithFacts, m2, MD, 'describing OptionChainCache as a createRequestCoalescer consumer must be rejected');

  // 4.3 the timer phrasing asserted in the Markdown
  mustCatch(vSpecificationAgreesWithFacts, MODEL,
    MD + '\nThe cache uses a background revalidation timer for soft-expired entries.\n',
    'asserting a background revalidation timer must be rejected');

  // 4.4 the nested chain made mandatory for every exact contract
  const m4 = clone(MODEL);
  m4.contracts.find((c) => c.id === 'PST-HYDRATION-001').text =
    'Every exact contract MUST be hydrated through the nested chain and the chain cache.';
  mustCatch(vSpecificationAgreesWithFacts, m4, MD, 'making the nested chain mandatory must be rejected');

  // 4.5 market context extended with overlayHash despite being portfolio-agnostic
  const m5 = clone(MODEL);
  const ms5 = m5.reuseManifest.find((r) => r.responsibility === 'market snapshot');
  ms5.decision = 'EXTEND';
  ms5.extendedCapabilities = ['overlayHash', 'positionsHash'];
  mustCatch(vSpecificationAgreesWithFacts, m5, MD, 'extending a portfolio-agnostic owner with run identity must be rejected');

  // 4.6 the raw-units finding reverted to the unproven "per share" claim
  const m6 = clone(MODEL);
  m6.units.measuredCurrentUnits.legLiveGreeks.scale = 'per share, unscaled by quantity or multiplier';
  mustCatch(vSpecificationAgreesWithFacts, m6, MD, 'reverting to the unproven per-share unit must be rejected');

  // 4.7 a downside beta claimed to exist
  const m7 = clone(MODEL);
  m7.underlyingShockModel.downsideBetaAvailableAtAuditedCommit = true;
  mustCatch(vSpecificationAgreesWithFacts, m7, MD, 'claiming a downside beta exists must be rejected');
  const m7b = clone(MODEL);
  m7b.reuseManifest.find((r) => r.responsibility === 'beta retrieval').downsideBetaAvailable = true;
  mustCatch(vSpecificationAgreesWithFacts, m7b, MD, 'claiming the beta owner supplies a downside beta must be rejected');

  // 4.8 a zero count quietly changed to a non-zero one
  const m8 = clone(MODEL);
  m8.sourceFacts.facts.find((f) => f.id === 'FACT-CHAIN-NO-TTFETCH').codeOccurrencesOfTtFetch = 3;
  mustCatch(vSpecificationAgreesWithFacts, m8, MD, 'a non-zero ttFetch count must be rejected');
  const m8b = clone(MODEL);
  m8b.sourceFacts.facts.find((f) => f.id === 'FACT-NO-PRICING-ENGINE').callSitesOfApproxDelta = 1;
  mustCatch(vSpecificationAgreesWithFacts, m8b, MD, 'claiming approxDelta has a call site must be rejected');

  // 4.9 a fact with no evidence and no count — unverifiable
  const m9 = clone(MODEL);
  m9.sourceFacts.facts.push({ id: 'FACT-UNVERIFIABLE', claim: 'the backend is fine', detail: 'x'.repeat(50), file: 'server.js' });
  mustCatch(vFactTableShape, m9, null, 'an unverifiable fact must be rejected');

  // 4.10 a fact attributed to a file with no audited hash
  const m10 = clone(MODEL);
  m10.sourceFacts.facts.push({ id: 'FACT-UNAUDITED', claim: 'something about a file', detail: 'x'.repeat(50), file: 'lib/beta-store.js', evidence: 'export function' });
  mustCatch(vFactsHaveAuditedHashes, m10, null, 'a fact attributed to an unaudited file must be rejected');

  // 4.11 a duplicate fact id
  const m11 = clone(MODEL);
  m11.sourceFacts.facts.push(clone(m11.sourceFacts.facts[0]));
  mustCatch(vFactTableShape, m11, null, 'a duplicate fact id must be rejected');

  // 4.12 a fact removed from the Markdown
  const strippedMd = MD.split('\n').filter((l) => l.indexOf('FACT-CACHE-NO-TIMER') === -1).join('\n');
  mustCatch(vSpecificationAgreesWithFacts, MODEL, strippedMd, 'a fact missing from the Markdown must be rejected');
}

section('5. MUTATION PROOF — source mutations (in memory only)');
if (!COMMIT_READER) {
  if (STRICT) ok(false, 'STRICT MODE: source mutations could not run — ' + (sourceBackedSkipReason || 'no audited commit'));
  else skip('the audited commit is not readable — source mutations skipped');
} else {
  const patched = (rel, transform) => (r) =>
    (r === rel ? Buffer.from(transform(COMMIT_READER(r).toString('utf8'))) : COMMIT_READER(r));

  // 5.1 the audited file drifts from its recorded hash
  const drifted = patched('lib/option-chain-cache.js', (s2) => s2 + '\n// drift\n');
  ok(vEvidenceAgainstSource(MODEL, drifted).some((v) => /drifted/.test(v)),
    '5.1: a drifted audited file must be caught');

  // 5.2 the module actually starts calling ttFetch
  const nowUsesTtFetch = patched('lib/option-chain-nested.js', (s2) => s2 + '\nconst x = await ttFetch("/x");\n');
  ok(vEvidenceAgainstSource(MODEL, nowUsesTtFetch).some((v) => /ttFetch call sites/.test(v)),
    '5.2: a real ttFetch call site appearing in the module must be caught');

  // 5.3 the cache actually starts using createRequestCoalescer
  const nowUsesCoalescer = patched('lib/option-chain-cache.js', (s2) => s2 + '\nconst c = createRequestCoalescer({});\n');
  ok(vEvidenceAgainstSource(MODEL, nowUsesCoalescer).some((v) => /createRequestCoalescer/.test(v)),
    '5.3: the cache adopting createRequestCoalescer must be caught');

  // 5.4 a real timer appearing in the cache
  const nowHasTimer = patched('lib/option-chain-cache.js', (s2) => s2 + '\nsetInterval(() => {}, 1000);\n');
  ok(vEvidenceAgainstSource(MODEL, nowHasTimer).some((v) => /timers/.test(v)),
    '5.4: a real revalidation timer must be caught');

  // 5.5 market-context gaining portfolio semantics
  const mcPolluted = patched('lib/market-context.js', (s2) => s2 + '\nexport const portfolioId = null;\n');
  ok(vEvidenceAgainstSource(MODEL, mcPolluted).some((v) => /market-context\.js has/.test(v)),
    '5.5: market-context gaining portfolio semantics must be caught');

  // 5.6 approxDelta gaining a call site
  const approxCalled = patched('server.js', (s2) => s2 + '\nconst d = approxDelta("call", 1, 1, 0.2, 30);\n');
  ok(vEvidenceAgainstSource(MODEL, approxCalled).some((v) => /approxDelta appears/.test(v)),
    '5.6: approxDelta gaining a call site must be caught');

  // 5.7 a backend owner named in the manifest disappearing
  const ownerGone = patched('server.js', (s2) => s2.replace('function isJournalLegOpenForCurrentRisk(', 'function legOpenRenamed('));
  ok(vEvidenceAgainstSource(MODEL, ownerGone).some((v) => /no longer exists: isJournalLegOpenForCurrentRisk/.test(v)),
    '5.7: a renamed backend owner must be caught');

  // 5.8 an evidence snippet that no longer exists verbatim
  const evidenceGone = patched('lib/option-chain-cache.js', (s2) => s2.replace('this.pending = new Map();', 'this.inflight = new Map();'));
  ok(vEvidenceAgainstSource(MODEL, evidenceGone).some((v) => /not found verbatim/.test(v)),
    '5.8: vanished evidence must be caught');

  // 5.9 the bounded fallback reverted to the serial unbounded shape
  const unbounded = patched('server.js', (s2) =>
    s2.replace('const runUnderlyingLastCloseFallbacks = async (symbolsWithReasons) => {',
               'const runUnderlyingLastCloseFallbacksRenamed = async (symbolsWithReasons) => {'));
  ok(vEvidenceAgainstSource(MODEL, unbounded).some((v) => /not found verbatim/.test(v)),
    '5.9: losing the bounded batched fallback must be caught');

  // 5.10 a raw chain bypass appearing on a Portfolio route
  const chainOnPortfolioRoute = patched('server.js', (s2) => {
    const marker = 'app.post(\'/portfolio/live-refresh\'';
    const i = s2.indexOf(marker);
    return i < 0 ? s2 : s2.slice(0, i + marker.length) + '\n  await ttFetch(`/option-chains/${sym}/nested`);\n' + s2.slice(i + marker.length);
  });
  ok(vEvidenceAgainstSource(MODEL, chainOnPortfolioRoute).some((v) => /chain access/.test(v)),
    '5.10: an option-chain call appearing on a Portfolio route must be caught');
}

// ── summary ─────────────────────────────────────────────────────────────────
const mode = STRICT ? 'STRICT' : 'structural';
console.log('\nmode: ' + mode +
  '  |  source-backed verification: ' + (sourceBackedRan
    ? 'RAN against ' + String(AUDITED_COMMIT).slice(0, 12)
    : 'NOT RUN (' + (sourceBackedSkipReason || 'unavailable') + ')'));
if (!sourceBackedRan && !STRICT) {
  console.log('  NOTE: a run without the source-backed part MUST NOT be reported as a completed');
  console.log('        source-backed verification. Re-run with PST_REQUIRE_BACKEND_SOURCE=1 to require it.');
}
console.log(fail === 0
  ? 'All ' + pass + ' assertions passed' + (skipped ? ' (' + skipped + ' skipped).' : '.')
  : pass + '/' + (pass + fail) + ' passed, ' + fail + ' FAILED.');
if (fail) console.log('\nFAILURES:\n  - ' + failures.join('\n  - '));
process.exit(fail ? 1 : 0);
