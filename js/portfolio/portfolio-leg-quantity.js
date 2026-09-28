// ── CANONICAL LEG QUANTITY — reconciled with the backend owner (semantics 2.1.0)
//
// The two tiers used to carry DIFFERENT residual vocabularies with DIFFERENT
// precedence: nine fields each, six shared, three only here and three only
// there. Either tier could read a residual the other ignored, so the same leg
// could have two sizes. The producer audit behind the reconciliation is recorded
// in the backend owner (lib/portfolio-leg-quantity.js) and in the parity
// manifest; the short version is that NOT ONE alias has a producer — the Journal
// closes a leg with status/exitPrice/closePrice/closeDate and never writes a
// residual — so the vocabulary is the UNION of what both tiers claimed and the
// precedence is a declaration pinned by fixtures, not a discovery.
//
// Declared as FUNCTIONS rather than top-level vars so every consumer — including
// the thirteen suites that build sandboxes out of individually extracted
// functions — gets the vocabulary along with the code that reads it. A bare
// `var` would be silently absent in those sandboxes and the owners would resolve
// nothing.
//
// Read in the SAME order as apex-backend RESIDUAL_QUANTITY_FIELDS.
function _portfolioResidualQuantityFields() {
  return [
    'effectiveQty',
    'openQty', 'openQuantity', 'qtyOpen', 'quantityOpen',
    'remainingQty', 'remainingQuantity', 'qtyRemaining',
    'residualQty', 'residualQuantity',
    'currentQty', 'currentQuantity'
  ];
}
function _portfolioGrossQuantityFields() {
  return ['qty', 'quantity', 'contracts'];
}

// PRESENT means an OWN property whose value is neither null nor undefined. An
// empty string IS present, and therefore invalid rather than absent: the
// residual was recorded and lost. Own-property only, so a name inherited from
// Object.prototype can never be mistaken for recorded data.
function _portfolioQuantityFieldPresent(obj, field) {
  if (!obj || typeof obj !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(obj, field)) return false;
  return obj[field] !== null && obj[field] !== undefined;
}

// STRICT, and deliberately not parseFloat: parseFloat('3abc') is 3, which turns
// a corrupted field into a plausible 3-lot position. Accepts a finite number or
// a well-formed non-empty numeric string; everything else — '', booleans,
// objects, '3abc', NaN, Infinity — is null.
function _portfolioStrictQuantity(value) {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    var n = Number(value);
    return isFinite(n) ? n : null;
  }
  return null;
}

// The FIRST field present in `fields` wins outright — even when its value is
// unreadable. Falling through to the next alias, or to the gross qty, would
// answer a different question from the one the data asked. Returns the field it
// read so a caller can say WHERE a quantity came from, and can tell "nothing was
// recorded" (present false) from "something was recorded and is unusable".
function _portfolioReadQuantityField(leg, fields) {
  for (var i = 0; i < fields.length; i++) {
    var k = fields[i];
    if (!_portfolioQuantityFieldPresent(leg, k)) continue;
    return { present: true, source: k, value: _portfolioStrictQuantity(leg[k]) };
  }
  return { present: false, source: null, value: null };
}
