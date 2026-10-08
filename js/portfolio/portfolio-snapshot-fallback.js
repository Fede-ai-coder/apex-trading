// Boolean squeeze from an entry snapshot (1D preferred, then 4H) → the
// 'ACTIVE'/'OFF' string the positions row renders. `false` is a REAL state
// ('OFF'), NOT missing — only a truly absent flag returns null (→ "--").
function _snapshotSqueezeState(es) {
  if (!es) return null;
  // Prefer the nested per-TF tech objects; fall back to the flat squeeze1d/squeeze4h
  // fields (persisted by _buildRichSnapshot, resilient to a backend round-trip that
  // keeps the scalars but drops the nested objects). 1D preferred, then 4H.
  var t1 = (es.tech1d && typeof es.tech1d.squeeze === 'boolean') ? es.tech1d.squeeze
    : (typeof es.squeeze1d === 'boolean' ? es.squeeze1d : null);
  var t4 = (es.tech4h && typeof es.tech4h.squeeze === 'boolean') ? es.tech4h.squeeze
    : (typeof es.squeeze4h === 'boolean' ? es.squeeze4h : null);
  var b = (t1 != null) ? t1 : t4;
  if (b == null) return null;
  return b ? 'ACTIVE' : 'OFF';
}

// Fallback position fields derived from the trade's entry snapshot. Used ONLY
// when live streaming data is absent (right after save, or when the underlying
// enrichment — beta / IVR / earnings / squeeze — failed, e.g. an un-warmed
// symbol). Live values ALWAYS win in _tradeAsPosition; this never overrides them.
//
// Scale/format reuse the SAME helpers as the live path (no new formulas):
//   • delta/theta → normalizeGreekPoints (per-share aggregate → net; ×100 for ≤1,
//     matching aggregateGreeks, so the row's toFixed(2) shows the same net value
//     the live path produces — e.g. 0.1094 → 10.94).
//   • gamma/vega  → raw per-share aggregate (aggregateGreeks adds these WITHOUT
//     normalizeGreekPoints, so the fallback must stay raw for parity).
//   • ivRank      → normalizeIvrPercent (same percent normalizer as the rest of
//     the app; ratios below 2 scale ×100, e.g. 1.04 → 104 — see normalizeIvrPercent).
//   • squeeze     → boolean tech1d/tech4h → 'ACTIVE'/'OFF' string.
//   • beta / earnings → passed through as-is; NEVER invented (absent stays absent
//     so the row shows "—"/"--", not 0 and not a made-up value).
function _positionFieldsFromSnapshot(trade) {
  var es = (trade && (trade.entrySnapshot || trade.entry_snapshot)) || null;
  if (!es) return {};
  var out = {};
  if (es.delta != null && isFinite(es.delta)) out.delta = normalizeGreekPoints(es.delta);
  if (es.theta != null && isFinite(es.theta)) out.theta = normalizeGreekPoints(es.theta);
  if (es.gamma != null && isFinite(es.gamma)) out.gamma = Number(es.gamma);
  if (es.vega  != null && isFinite(es.vega))  out.vega  = Number(es.vega);
  if (es.beta  != null && isFinite(es.beta))  out.beta  = Number(es.beta);
  var ivrRaw = (es.ivr != null) ? es.ivr : (es.ivRank != null ? es.ivRank : null);
  if (ivrRaw != null) { var n = normalizeIvrPercent(ivrRaw); if (n != null) out.ivRank = n; }
  var earn = es.nextEarnings || es.earningsDate || null;
  if (earn) out.nextEarnings = earn;
  var sq = _snapshotSqueezeState(es);
  if (sq != null) out.squeeze = sq;
  if (es.squeezeFired === true) out.squeezeFired = true;
  return out;
}
