// ── Scanner IVR throttle/dedup/cache (mirrors fetchScannerCandles) ──
// Reduces /options/ivr/:ticker fanout during scanner refresh. Does NOT change
// IVR source, normalization, or fallback behavior — caller still consumes the
// raw Tastytrade response and writes _ivrCache exactly as before.
var _SCANNER_IVR_CONCURRENCY = 5;
var _SCANNER_IVR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
var _SCANNER_IVR_SOURCE = 'TASTYTRADE';
var _SCANNER_IVR_DEBUG_PARITY = false; // flip true locally to emit per-ticker parity logs
var _scannerIvrCache = Object.create(null);     // key -> { resp, ts }
var _scannerIvrInFlight = Object.create(null);  // key -> Promise
var _scannerIvrQueue = [];
var _scannerIvrActive = 0;
var _scannerIvrDiag = {
  scannerIvrRequestsStarted: 0,
  scannerIvrRequestsDeduped: 0,
  scannerIvrRequestsCached: 0,
  scannerIvrRequestsInFlight: 0,
  scannerIvrQueueLength: 0,
  scannerIvrConcurrencyLimit: _SCANNER_IVR_CONCURRENCY,
  scannerIvrLastError: null,
};
function _scannerIvrCacheKey(ticker){
  var t = String(ticker || '').trim().toUpperCase();
  return t + '|source=' + _SCANNER_IVR_SOURCE + '|field=IVR';
}
function _scannerIvrPumpQueue(){
  while(_scannerIvrActive < _SCANNER_IVR_CONCURRENCY && _scannerIvrQueue.length){
    var job = _scannerIvrQueue.shift();
    _scannerIvrDiag.scannerIvrQueueLength = _scannerIvrQueue.length;
    _scannerIvrActive++;
    _scannerIvrDiag.scannerIvrRequestsInFlight = _scannerIvrActive;
    var t0 = (typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
    console.log('[ScannerIVR] fetch start', { ticker: job.ticker, key: job.key });
    (function(j, start){
      ttCall('/options/ivr/' + j.ticker).then(function(resp){
        _scannerIvrCache[j.key] = { resp: resp, ts: Date.now() };
        var t1 = (typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
        var ivrVal = (resp && resp.ivRank != null) ? resp.ivRank : null;
        console.log('[ScannerIVR] fetch end', { ticker: j.ticker, key: j.key, ivr: ivrVal, source: _SCANNER_IVR_SOURCE, elapsedMs: Math.round(t1 - start) });
        if(_SCANNER_IVR_DEBUG_PARITY){
          console.log('[ScannerIVR] parity', { ticker: j.ticker, wrapperValue: ivrVal, source: _SCANNER_IVR_SOURCE });
        }
        j.resolve(resp);
      }).catch(function(err){
        _scannerIvrDiag.scannerIvrLastError = (err && err.message) ? err.message : String(err);
        j.reject(err);
      }).then(function(){
        _scannerIvrActive--;
        _scannerIvrDiag.scannerIvrRequestsInFlight = _scannerIvrActive;
        delete _scannerIvrInFlight[j.key];
        if(_scannerIvrActive === 0 && _scannerIvrQueue.length === 0){
          console.log('[ScannerIVR] queue drained');
        }
        _scannerIvrPumpQueue();
      });
    })(job, t0);
  }
}
function fetchScannerIvr(ticker, opts){
  opts = opts || {};
  var force = !!opts.force;
  var key = _scannerIvrCacheKey(ticker);
  var T = String(ticker || '').trim().toUpperCase();
  _scannerIvrDiag.scannerIvrRequestsStarted++;
  // 1) Cache hit
  if(!force){
    var hit = _scannerIvrCache[key];
    if(hit && (Date.now() - hit.ts) < _SCANNER_IVR_CACHE_TTL_MS){
      _scannerIvrDiag.scannerIvrRequestsCached++;
      var hitIvr = (hit.resp && hit.resp.ivRank != null) ? hit.resp.ivRank : null;
      console.log('[ScannerIVR] cache hit', { ticker: T, key: key, ivr: hitIvr });
      return Promise.resolve(hit.resp);
    }
  }
  // 2) Dedup in-flight
  if(_scannerIvrInFlight[key]){
    _scannerIvrDiag.scannerIvrRequestsDeduped++;
    console.log('[ScannerIVR] deduped', { ticker: T, key: key });
    return _scannerIvrInFlight[key];
  }
  // 3) Enqueue
  var p = new Promise(function(resolve, reject){
    _scannerIvrQueue.push({ ticker: T, key: key, resolve: resolve, reject: reject, force: force });
    _scannerIvrDiag.scannerIvrQueueLength = _scannerIvrQueue.length;
    console.log('[ScannerIVR] queued', { ticker: T, key: key });
  });
  _scannerIvrInFlight[key] = p;
  _scannerIvrPumpQueue();
  return p;
}
