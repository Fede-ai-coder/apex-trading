// Pure parity comparison over two raw candle arrays. Compares the last `tail`
// candles by normalized timestamp + OHLC within tolerance.
function _apexCompareCandleArrays(frontCandles, backCandles, opts) {
  opts = opts || {};
  var tail = opts.tail != null ? opts.tail : 20;
  var tol = opts.tol != null ? opts.tol : APEX_PARITY_TOL;
  var front = _apexParityNormCandleArray(frontCandles);
  var back = _apexParityNormCandleArray(backCandles);

  var frontByTime = {}, backByTime = {};
  front.forEach(function (c) { frontByTime[c.t] = c; });
  back.forEach(function (c) { backByTime[c.t] = c; });

  var times = {};
  front.slice(-tail).forEach(function (c) { times[c.t] = true; });
  back.slice(-tail).forEach(function (c) { times[c.t] = true; });
  var sortedTimes = Object.keys(times).map(Number).sort(function (a, b) { return a - b; });

  var compared = 0, matched = 0, mismatched = 0, missingFrontend = 0, missingBackend = 0;
  var maxO = 0, maxH = 0, maxL = 0, maxC = 0;
  var mismatches = [];

  sortedTimes.forEach(function (t) {
    var f = frontByTime[t], b = backByTime[t];
    if (f && b) {
      compared++;
      var dO = Math.abs(f.o - b.o), dH = Math.abs(f.h - b.h),
          dL = Math.abs(f.l - b.l), dC = Math.abs(f.c - b.c);
      maxO = Math.max(maxO, dO); maxH = Math.max(maxH, dH);
      maxL = Math.max(maxL, dL); maxC = Math.max(maxC, dC);
      if (dO <= tol && dH <= tol && dL <= tol && dC <= tol) {
        matched++;
      } else {
        mismatched++;
        mismatches.push({
          time: new Date(t).toISOString(),
          frontend: { open: f.o, high: f.h, low: f.l, close: f.c },
          backend: { open: b.o, high: b.h, low: b.l, close: b.c },
          diffs: { open: dO, high: dH, low: dL, close: dC },
        });
      }
    } else if (f && !b) {
      missingBackend++;
    } else if (!f && b) {
      missingFrontend++;
    }
  });

  var timeAlignment = (missingFrontend === 0 && missingBackend === 0)
    ? 'ok'
    : (compared > 0 ? 'partial' : 'misaligned');

  return {
    parity: {
      compared: compared,
      matched: matched,
      mismatched: mismatched,
      missingFrontend: missingFrontend,
      missingBackend: missingBackend,
      maxAbsCloseDiff: maxC,
      maxAbsOpenDiff: maxO,
      maxAbsHighDiff: maxH,
      maxAbsLowDiff: maxL,
      timeAlignment: timeAlignment,
    },
    mismatches: mismatches,
  };
}
