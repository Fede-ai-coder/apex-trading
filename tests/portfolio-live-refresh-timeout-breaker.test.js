// Portfolio live-refresh TimeoutError storm-control regression (PR #299 frontend only).
// Proves an aggregated /portfolio/live-refresh TimeoutError opens the backend-unavailable
// breaker and suppresses backend-dependent per-symbol fallback fan-out.
const fs = require('fs');
const assert = require('assert');

const HTML = fs.readFileSync('index.html', 'utf8');

function ok(cond, msg) { assert.ok(cond, msg); console.log('✓ ' + msg); }
function bodyOf(name) {
  const idx = HTML.indexOf('function ' + name + '(');
  assert.ok(idx >= 0, 'missing function ' + name);
  let depth = 0, start = HTML.indexOf('{', idx), end = start;
  for (; end < HTML.length; end++) {
    const ch = HTML[end];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return HTML.slice(start, end + 1);
    }
  }
  throw new Error('unclosed function ' + name);
}

console.log('\n[portfolio-live-refresh-timeout-breaker]');
const classify = bodyOf('_isPortfolioLiveRefreshBackendUnreachableFailure');
ok(/payload\.errorName\s*===\s*'TimeoutError'/.test(classify), 'classifies TimeoutError by name');
ok(/payload\.status\s*===\s*null/.test(classify), 'requires null HTTP status');
ok(/payload\.reason\s*===\s*'request_error'/.test(classify), 'requires request_error reason');
ok(/duration\)\s*&&\s*duration\s*>=\s*threshold/.test(classify), 'requires duration at/near live-refresh timeout threshold');

const live = bodyOf('fetchPortfolioLiveRefresh');
ok(/_isPortfolioLiveRefreshBackendUnreachableFailure\(payload,\s*liveRefreshTimeoutMs\)/.test(live), 'live-refresh failure path detects backend-unreachable timeout');
ok(/_openPortfolioBackendUnavailableBreaker\('live_refresh_timeout',\s*payload\)/.test(live), 'live-refresh TimeoutError opens storm-control breaker immediately');

const refreshStart = HTML.indexOf('async function refreshPositionsLive');
assert.ok(refreshStart >= 0, 'missing refreshPositionsLive');
const refresh = HTML.slice(refreshStart, HTML.indexOf('// scanData enrichment', refreshStart));
ok(/skipped unresolved \/market\/live fallback; backend unavailable breaker open/.test(refresh), 'breaker skips per-symbol /market/live fallback fan-out');
ok(/dxMissing\s*=\s*\[\]/.test(refresh), 'breaker empties live quote fallback worklist');
ok(/skipped \/market\/candles valuation fallback; backend unavailable breaker open/.test(refresh), 'breaker skips per-symbol /market/candles fallback fan-out');
ok(/missing\s*=\s*\[\]/.test(refresh), 'breaker empties candle fallback worklist');
ok(HTML.includes('Backend temporarily unavailable — showing cached / last-known data.'), 'existing controlled cached/last-known banner text is shown');
