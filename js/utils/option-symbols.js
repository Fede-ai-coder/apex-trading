// ─────────────────────────────────────────────────────────────────────────────
// Pure option-symbol builders/parsers extracted verbatim from index.html.
//   • buildStreamerSymbol
//   • buildOptionDxlinkSymbolCandidate
//   • buildCompactOptionDxlinkSymbol
//   • isOptionStreamerSymbolConsistent
//   • parseCompactOptionDxlinkSymbol
// DXLink/OCC formats, fallback order, alias handling and null/undefined/empty-string
// behaviour are unchanged; only physical location moved. Loaded as a CLASSIC
// (non-module) script before the inline application script, so these stay global
// functions exactly as before. No top-level side effects.
//
// NOTE (audit): getPreferredOptionDxlinkSymbol, normalizeOptionLegSymbolAliases,
// normalizeTradeOptionLegAliases and optionLegScalarDiagnostics are intentionally NOT
// extracted — getPreferredOptionDxlinkSymbol reads global S (S.debugPortfolioRefresh)
// and emits console.warn, and the others depend on it transitively. They remain in
// index.html and continue to call these builders as globals.
// ─────────────────────────────────────────────────────────────────────────────
// Derive a Tastytrade/dxFeed option streamer symbol from structured position inputs.
// Format: .{TICKER}{YYMMDD}{C|P}{STRIKE_INTEGER}  e.g. .SPY260420C500
// Returns null if any required input is missing or invalid.
function buildStreamerSymbol(ticker, expiryDate, strike, side) {
  if (!ticker || !expiryDate || !strike || !side) return null;
  var d = new Date(expiryDate + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  var yy = String(d.getFullYear()).slice(2);
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  var strikeNum = parseFloat(strike);
  if (isNaN(strikeNum) || strikeNum <= 0) return null;
  var strikeStr = (strikeNum % 1 === 0) ? String(Math.floor(strikeNum)) : String(strikeNum);
  return '.' + ticker + yy + mm + dd + side + strikeStr;
}

function buildOptionDxlinkSymbolCandidate(underlying, leg) {
  if (!underlying || !leg) return null;
  var root = String(underlying).trim().toUpperCase();
  if (!root) return null;
  var expiry = leg.expiration || leg.expiry || null;
  if (!expiry) return null;
  var d = new Date(expiry + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  var yy = String(d.getFullYear()).slice(2);
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  var rawType = String(leg.type || leg.optionType || leg.right || '').toUpperCase();
  var cp = rawType === 'PUT' || rawType === 'P' ? 'P' : (rawType === 'CALL' || rawType === 'C' ? 'C' : null);
  if (!cp) return null;
  var strikeNum = parseFloat(leg.strike);
  if (isNaN(strikeNum) || strikeNum <= 0) return null;
  var strike1000 = String(Math.round(strikeNum * 1000)).padStart(8, '0');
  return '.' + root.padEnd(6, ' ') + yy + mm + dd + cp + strike1000;
}

function buildCompactOptionDxlinkSymbol(underlying, leg) {
  if (!underlying || !leg) return null;
  var root = String(underlying).trim().toUpperCase();
  if (!root) return null;
  var expiry = leg.expiration || leg.expiry || null;
  if (!expiry) return null;
  var d = new Date(expiry + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  var yy = String(d.getFullYear()).slice(2);
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  var rawType = String(leg.type || leg.optionType || leg.right || '').toUpperCase();
  var cp = rawType === 'PUT' || rawType === 'P' ? 'P' : (rawType === 'CALL' || rawType === 'C' ? 'C' : null);
  if (!cp) return null;
  var strikeNum = parseFloat(leg.strike);
  if (!isFinite(strikeNum) || strikeNum <= 0) return null;
  var strikeRaw = leg.strike != null ? String(leg.strike).trim() : '';
  var strikeStr = '';
  if (strikeRaw) {
    strikeStr = strikeRaw
      .replace(/,/g, '')
      .replace(/^(\d+)\.(\d*?[1-9])0+$/, '$1.$2')
      .replace(/^(\d+)\.0+$/, '$1');
  }
  if (!strikeStr || !/^\d+(\.\d+)?$/.test(strikeStr)) {
    strikeStr = (Math.abs(strikeNum - Math.round(strikeNum)) < 0.0000001)
      ? String(Math.round(strikeNum))
      : String(strikeNum).replace(/\.0+$/, '');
  }
  return '.' + root + yy + mm + dd + cp + strikeStr;
}

function isOptionStreamerSymbolConsistent(underlying, leg, symbol) {
  if (!underlying || !leg || !symbol) return false;
  var sym = String(symbol).trim().toUpperCase();
  if (!sym || sym.charAt(0) !== '.') return false;
  var root = String(underlying).trim().toUpperCase();
  if (!root) return false;
  if (sym.indexOf('.' + root) !== 0) return false;
  var expiry = leg.expiration || leg.expiry || null;
  if (!expiry) return false;
  var d = new Date(expiry + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  var yymmdd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  var rawType = String(leg.type || leg.optionType || leg.right || '').toUpperCase();
  var cp = rawType === 'PUT' || rawType === 'P' ? 'P' : (rawType === 'CALL' || rawType === 'C' ? 'C' : null);
  if (!cp) return false;
  var strikeNum = parseFloat(leg.strike);
  if (!isFinite(strikeNum)) return false;
  var m = sym.match(/^\.([A-Z]+)(\d{6})([CP])(.+)$/);
  if (!m) return false;
  if (m[2] !== yymmdd || m[3] !== cp) return false;
  var symbolStrikeRaw = String(m[4] || '').replace(/\s+/g, '');
  var symbolStrike = parseFloat(symbolStrikeRaw);
  if (!isFinite(symbolStrike)) return false;
  return Math.abs(symbolStrike - strikeNum) < 0.0000001;
}

function parseCompactOptionDxlinkSymbol(symbol) {
  var sym = String(symbol || '').trim().toUpperCase();
  if (!sym || sym.charAt(0) !== '.') return null;
  var m = sym.match(/^\.([A-Z.]+)(\d{2})(\d{2})(\d{2})([CP])(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  var yy = parseInt(m[2], 10);
  var yyyy = (yy >= 70 ? 1900 : 2000) + yy;
  var expiry = String(yyyy) + '-' + m[3] + '-' + m[4];
  var strike = parseFloat(m[6]);
  if (!isFinite(strike)) return null;
  return {
    underlying: m[1],
    expiry: expiry,
    expiration: expiry,
    type: m[5] === 'P' ? 'PUT' : 'CALL',
    right: m[5],
    strike: strike
  };
}
