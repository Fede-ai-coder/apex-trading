// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STRESS CLIENT — the frontend adapter for POST /portfolio/stress-test/run.
//
// SCOPE
//   Request construction, dispatch through the EXISTING transport owner, and
//   parity verification of the response. That is all. There is no renderer here,
//   no tab, no matrix painter, no scenario builder, no overlay editor, no
//   persistence and no order path. The response is handed back as NORMALIZED
//   data for a later PR to render — never the backend payload itself.
//
// WHAT IT REUSES RATHER THAN REBUILDS
//   `ttCall` (js/api/backend-client.js) is the canonical HTTP transport owner and
//   already owns every concern this client would otherwise duplicate:
//
//       backend URL          BACKEND + path
//       authentication       x-api-key / x-session-id, via the shared auth state
//       request JSON         body serialization and Content-Type
//       timeout / abort      AbortSignal (a caller signal, else the shared timeout)
//       error classification non-2xx -> Error, fed into _recordBackendApiAuthResult
//
//   So this module builds no URL, reads no key, sets no header and calls no
//   fetch. A second HTTP system beside the one that already exists is exactly
//   what the reuse contract forbids.
//
// WHAT IT MUST NOT SEND
//   `positions`, `marketSnapshot` and `spySnapshotPrice` are refused by the
//   backend request validator, and are refused here too rather than sent and
//   rejected. The run hydrates the portfolio server-side from `portfolioId`:
//   a client-supplied positions array would make the run's scope — and therefore
//   its identity — depend on unverified input. The backend is the authority for
//   the market a run is priced against.
//
// PARITY IS CHECKED BEFORE ANYTHING IS EXPOSED
//   Every request carries the complete scope-parity claim, and every response is
//   verified against it BEFORE the result is handed to a caller. A response
//   whose vocabulary does not match is not a degraded result to be shown with a
//   warning — its numbers describe a different portfolio, so it is an error.
//
// NO RESULT CACHE
//   The backend's single-flight coalescer has a TTL of zero and never replays an
//   earlier moment. A frontend result cache would reintroduce exactly that: a
//   matrix computed against a market snapshot that no longer exists, presented
//   as current. There is none here, and there must not be one.
//
// LOAD-TIME BEHAVIOUR
//   Classic script, inert at load: constants and function declarations only. No
//   request, no timer, no listener, no DOM access, no storage, no state write.
//   Depends on js/services/portfolio-stress-parity.js and
//   js/services/portfolio-stress-response.js, both loaded before it; their
//   symbols are resolved lexically at CALL time, never while this file loads.
// ─────────────────────────────────────────────────────────────────────────────

// The ONE endpoint this client speaks to. A second endpoint would mean a second
// run identity and a second contract to keep in step.
var PORTFOLIO_STRESS_RUN_PATH = '/portfolio/stress-test/run';
var PORTFOLIO_STRESS_RUN_METHOD = 'POST';

// Fields the request must never carry. `positions` is scope; the rest are the
// market a run is priced against. Both belong to the backend.
var PORTFOLIO_STRESS_FORBIDDEN_REQUEST_FIELDS = Object.freeze([
  'positions', 'marketSnapshot', 'spySnapshotPrice', 'spyPrice', 'snapshot',
]);

// The exact top-level keys of a run request. Declared so a test can assert the
// payload is this and nothing else, rather than merely "does not contain
// positions" — a list of what IS sent is harder to erode than a list of what is not.
var PORTFOLIO_STRESS_REQUEST_FIELDS = Object.freeze([
  'portfolioId', 'portfolioRevision', 'scenarios', 'overlay',
  'pricingConfiguration', 'portfolioScopeParity',
]);

var PORTFOLIO_STRESS_REQUEST_INVALID = 'PORTFOLIO_STRESS_REQUEST_INVALID';
var PORTFOLIO_STRESS_TRANSPORT_UNAVAILABLE = 'PORTFOLIO_STRESS_TRANSPORT_UNAVAILABLE';
var PORTFOLIO_STRESS_ABORTED = 'PORTFOLIO_STRESS_ABORTED';

// ── request construction ─────────────────────────────────────────────────────

/**
 * Build the body of a stress run.
 *
 * PURE: it reads its argument, builds an object and returns it. It performs no
 * I/O, touches no state and has no default portfolio — `portfolioId` and
 * `portfolioRevision` are both required, because a run that is not pinned to a
 * verifiable revision cannot be checked against the portfolio the backend
 * actually loads, and an unpinned run is a run whose inputs may have moved.
 *
 * The scope-parity claim is always complete: it comes from
 * buildPortfolioScopeParityClaim(), which cannot produce a partial one.
 */
function buildPortfolioStressRunRequest(input) {
  var src = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
  var errors = [];

  var portfolioId = typeof src.portfolioId === 'string' ? src.portfolioId.trim() : '';
  if (!portfolioId) {
    errors.push({ field: 'portfolioId', message: 'is required and must be a non-empty string' });
  }

  var portfolioRevision = typeof src.portfolioRevision === 'string' ? src.portfolioRevision.trim() : '';
  if (!portfolioRevision) {
    errors.push({
      field: 'portfolioRevision',
      message: 'is required: a stress run must be pinned to a verifiable portfolio revision',
    });
  }

  // Refused here rather than sent and rejected: a caller that passes positions
  // has misunderstood where scope comes from, and a 400 three network hops later
  // is a worse place to learn that than the call site.
  for (var i = 0; i < PORTFOLIO_STRESS_FORBIDDEN_REQUEST_FIELDS.length; i++) {
    var forbidden = PORTFOLIO_STRESS_FORBIDDEN_REQUEST_FIELDS[i];
    if (src[forbidden] !== undefined) {
      errors.push({
        field: forbidden,
        message: 'must not be sent: the backend hydrates the portfolio and freezes the market for a run',
      });
    }
  }

  if (src.scenarios !== undefined && !Array.isArray(src.scenarios)) {
    errors.push({ field: 'scenarios', message: 'must be an array when supplied' });
  }
  if (src.overlay !== undefined && src.overlay !== null
      && (typeof src.overlay !== 'object' || Array.isArray(src.overlay))) {
    errors.push({ field: 'overlay', message: 'must be an object { legs: [] } when supplied' });
  }
  var overlayLegs = (src.overlay && Array.isArray(src.overlay.legs)) ? src.overlay.legs : null;
  if (src.overlay && src.overlay.legs !== undefined && overlayLegs === null) {
    errors.push({ field: 'overlay.legs', message: 'must be an array when supplied' });
  }
  if (src.pricingConfiguration !== undefined && src.pricingConfiguration !== null
      && (typeof src.pricingConfiguration !== 'object' || Array.isArray(src.pricingConfiguration))) {
    errors.push({ field: 'pricingConfiguration', message: 'must be an object when supplied' });
  }

  if (errors.length) throw _portfolioStressRequestError(errors);

  return {
    portfolioId: portfolioId,
    portfolioRevision: portfolioRevision,
    scenarios: Array.isArray(src.scenarios) ? src.scenarios.slice() : [],
    overlay: { legs: overlayLegs ? overlayLegs.slice() : [] },
    pricingConfiguration: (src.pricingConfiguration && typeof src.pricingConfiguration === 'object')
      ? Object.assign({}, src.pricingConfiguration)
      : {},
    portfolioScopeParity: buildPortfolioScopeParityClaim(),
  };
}

// ── dispatch ─────────────────────────────────────────────────────────────────

/**
 * Run a stress test and return the verified, null-safe result.
 *
 * @param {object} input    see buildPortfolioStressRunRequest
 * @param {object} [options]
 *        signal     an AbortSignal, forwarded to the transport owner and honoured
 *                   here before dispatch. It is the ONLY supported option.
 *
 * There is deliberately no `transport` option, and no `fetch`, `url`, `headers`,
 * `apiKey` or `sessionId` either. An earlier revision accepted an injectable
 * transport "so the contract suite can observe what is sent" — but a published
 * seam is a published bypass: any caller could route a stress run around the
 * canonical owner, and with it around the auth, timeout and error handling that
 * owner exists to provide. The suite substitutes the global `ttCall` inside its
 * own sandbox instead, which exercises the real resolution path rather than a
 * parameter only tests use.
 *
 * Order of operations, and it matters:
 *   1. build the request (throws on an invalid or forbidden input)
 *   2. dispatch through the transport owner
 *   3. VERIFY the complete scope-parity triple on the response
 *   4. only then normalize and expose it
 *
 * A response that fails step 3 never reaches step 4.
 *
 * ALWAYS returns a promise. An invalid request is a REJECTION, never a
 * synchronous throw: a function that sometimes throws and sometimes rejects
 * forces every call site to carry both a try/catch and a .catch, and the one
 * that gets forgotten is where an error is swallowed.
 */
function runPortfolioStressTestRequest(input, options) {
  var opts = (options && typeof options === 'object') ? options : {};
  var signal = opts.signal || null;

  // Built BEFORE the abort check so an invalid request is reported as invalid
  // rather than as an abort — the caller's mistake should not be masked by a
  // signal that happens to already be aborted.
  var request;
  try {
    request = buildPortfolioStressRunRequest(input);
  } catch (e) {
    return Promise.reject(e);
  }

  if (signal && signal.aborted) {
    return Promise.reject(_portfolioStressAbortError(signal));
  }

  // Options are an allowlist. A caller that passes `transport`, `fetch`, `url`,
  // `headers`, `apiKey` or `sessionId` is trying to route around the canonical
  // owner, and is told so rather than silently ignored.
  var forbiddenOption = _portfolioStressForbiddenOption(opts);
  if (forbiddenOption) {
    return Promise.reject(_portfolioStressRequestError([{
      field: forbiddenOption,
      message: 'is not a supported option: the stress client always dispatches through the canonical backend transport owner',
    }]));
  }

  var transport = _portfolioStressTransport();
  if (typeof transport !== 'function') {
    var err = new Error(PORTFOLIO_STRESS_TRANSPORT_UNAVAILABLE +
      ': the canonical backend transport (ttCall) is not available');
    err.name = 'PortfolioStressTransportError';
    err.code = PORTFOLIO_STRESS_TRANSPORT_UNAVAILABLE;
    return Promise.reject(err);
  }

  // No memoization, no keyed store, no reuse of an earlier answer: every call is
  // a fresh run against a fresh backend snapshot.
  return Promise.resolve(transport(PORTFOLIO_STRESS_RUN_PATH, {
    method: PORTFOLIO_STRESS_RUN_METHOD,
    body: request,
    signal: signal,
  })).then(null, function (err) {
    // A caller abort surfaces from fetch as a rejection the transport owner
    // re-throws, and it must not be reported as a backend timeout: the two mean
    // opposite things to whoever reads them. Only the CALLER's signal normalizes
    // to PORTFOLIO_STRESS_ABORTED; a transport timeout keeps its own error.
    if (signal && signal.aborted) throw _portfolioStressAbortError(signal);
    throw err;
  }).then(function (response) {
    if (signal && signal.aborted) throw _portfolioStressAbortError(signal);
    // Step 3. Throws PORTFOLIO_SCOPE_PARITY_DIVERGENCE on a missing, empty, null
    // or divergent identifier — before any number is read out of the response.
    var identity = assertPortfolioScopeParityResponse(response);
    var normalized = normalizePortfolioStressResponse(response);
    normalized.portfolioScopeParity = identity;
    return normalized;
  });
}

// ── internals ────────────────────────────────────────────────────────────────

// Resolve the canonical transport owner at CALL time. Never at load time: this
// module is loaded before the monolith, and reading the global here would both
// break the load order and give the module a load-time side effect.
function _portfolioStressTransport() {
  return (typeof ttCall === 'function') ? ttCall : null;
}

// Options a caller may not pass. Each one would mean bypassing the canonical
// transport owner for URL, authentication, timeout or error classification.
var PORTFOLIO_STRESS_FORBIDDEN_OPTIONS = Object.freeze([
  'transport', 'fetch', 'url', 'headers', 'apiKey', 'sessionId', 'backend', 'baseUrl',
]);

function _portfolioStressForbiddenOption(opts) {
  for (var i = 0; i < PORTFOLIO_STRESS_FORBIDDEN_OPTIONS.length; i++) {
    var k = PORTFOLIO_STRESS_FORBIDDEN_OPTIONS[i];
    if (opts[k] !== undefined) return k;
  }
  return null;
}

function _portfolioStressRequestError(errors) {
  var err = new Error(PORTFOLIO_STRESS_REQUEST_INVALID + ': ' + errors.map(function (e) {
    return e.field + ' ' + e.message;
  }).join('; '));
  err.name = 'PortfolioStressRequestError';
  err.code = PORTFOLIO_STRESS_REQUEST_INVALID;
  err.errors = errors;
  return err;
}

function _portfolioStressAbortError(signal) {
  var err = new Error(PORTFOLIO_STRESS_ABORTED + ': the stress run was aborted by the caller');
  err.name = 'AbortError';
  err.code = PORTFOLIO_STRESS_ABORTED;
  if (signal && signal.reason !== undefined) err.reason = signal.reason;
  return err;
}
