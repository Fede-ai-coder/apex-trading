// ── Scanner Earnings throttle/dedup/cache (mirrors fetchScannerIvr) ──
// Reduces /market/earnings/:ticker fanout during scanner refresh. Does NOT
// change earnings endpoint, source priority, date interpretation, dteEarnings
// calculation, fallback (Yahoo) behavior, or null handling — caller still
// consumes the resolved date (or null) exactly as before.
var _SCANNER_EARNINGS_CONCURRENCY = 5;
var _SCANNER_EARNINGS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
var _SCANNER_EARNINGS_SOURCE = 'MARKET_EARNINGS';
var _scannerEarningsCache = Object.create(null);     // key -> { date, ts }
var _scannerEarningsInFlight = Object.create(null);  // key -> Promise
var _scannerEarningsQueue = [];
var _scannerEarningsActive = 0;
var _scannerEarningsDiag = {
  scannerEarningsRequestsStarted: 0,
  scannerEarningsRequestsDeduped: 0,
  scannerEarningsRequestsCached: 0,
  scannerEarningsRequestsInFlight: 0,
  scannerEarningsQueueLength: 0,
  scannerEarningsConcurrencyLimit: _SCANNER_EARNINGS_CONCURRENCY,
  scannerEarningsLastError: null,
};
function _scannerEarningsCacheKey(ticker){
  var t = String(ticker || '').trim().toUpperCase();
  return t + '|source=' + _SCANNER_EARNINGS_SOURCE + '|field=EARNINGS';
}
function _scannerEarningsPumpQueue(){
  while(_scannerEarningsActive < _SCANNER_EARNINGS_CONCURRENCY && _scannerEarningsQueue.length){
    var job = _scannerEarningsQueue.shift();
    _scannerEarningsDiag.scannerEarningsQueueLength = _scannerEarningsQueue.length;
    _scannerEarningsActive++;
    _scannerEarningsDiag.scannerEarningsRequestsInFlight = _scannerEarningsActive;
    var t0 = (typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
    console.log('[ScannerEarnings] fetch start', { ticker: job.ticker, key: job.key });
    (function(j, start){
      // Delegate to existing fetchEarningsForTicker — preserves source priority,
      // fallback, and null-on-failure semantics. The wrapper does not interpret
      // the response; it only schedules and caches it.
      fetchEarningsForTicker(j.ticker).then(function(date){
        // A null return is a *successful* response from the existing fetcher
        // (both strategies tried, neither yielded a date). Caching null is
        // explicitly allowed and preserves current behavior while preventing
        // repeated lookups inside TTL.
        _scannerEarningsCache[j.key] = { date: date, ts: Date.now() };
        var t1 = (typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
        console.log('[ScannerEarnings] fetch end', { ticker: j.ticker, key: j.key, earningsDate: date, source: _SCANNER_EARNINGS_SOURCE, elapsedMs: Math.round(t1 - start) });
        j.resolve(date);
      }).catch(function(err){
        // Network/exception path — do NOT cache. Surface to caller so it can
        // decide (existing callers tolerate null/throw equivalently here).
        _scannerEarningsDiag.scannerEarningsLastError = (err && err.message) ? err.message : String(err);
        j.reject(err);
      }).then(function(){
        _scannerEarningsActive--;
        _scannerEarningsDiag.scannerEarningsRequestsInFlight = _scannerEarningsActive;
        delete _scannerEarningsInFlight[j.key];
        if(_scannerEarningsActive === 0 && _scannerEarningsQueue.length === 0){
          console.log('[ScannerEarnings] queue drained');
        }
        _scannerEarningsPumpQueue();
      });
    })(job, t0);
  }
}
function fetchScannerEarnings(ticker, opts){
  opts = opts || {};
  var force = !!opts.force;
  var key = _scannerEarningsCacheKey(ticker);
  var T = String(ticker || '').trim().toUpperCase();
  _scannerEarningsDiag.scannerEarningsRequestsStarted++;
  // 1) Cache hit (skip when force)
  if(!force){
    var hit = _scannerEarningsCache[key];
    if(hit && (Date.now() - hit.ts) < _SCANNER_EARNINGS_CACHE_TTL_MS){
      _scannerEarningsDiag.scannerEarningsRequestsCached++;
      console.log('[ScannerEarnings] cache hit', { ticker: T, key: key, earningsDate: hit.date, source: _SCANNER_EARNINGS_SOURCE });
      return Promise.resolve(hit.date);
    }
  }
  // 2) Dedup in-flight (applies even when force=true, to coalesce concurrent
  //    forced refreshes for the same ticker into a single network call).
  if(_scannerEarningsInFlight[key]){
    _scannerEarningsDiag.scannerEarningsRequestsDeduped++;
    console.log('[ScannerEarnings] deduped', { ticker: T, key: key });
    return _scannerEarningsInFlight[key];
  }
  // 3) Enqueue
  var p = new Promise(function(resolve, reject){
    _scannerEarningsQueue.push({ ticker: T, key: key, resolve: resolve, reject: reject, force: force });
    _scannerEarningsDiag.scannerEarningsQueueLength = _scannerEarningsQueue.length;
    console.log('[ScannerEarnings] queued', { ticker: T, key: key });
  });
  _scannerEarningsInFlight[key] = p;
  _scannerEarningsPumpQueue();
  return p;
}
