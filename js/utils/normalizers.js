// ─────────────────────────────────────────────────────────────────────────────
// Pure numeric normalizers extracted verbatim from index.html.
//   • normalizeGreekPoints — per-share Greek decimals → operational Greek points.
//   • normalizeIvrPercent  — IV-rank ratio/percent → 0–100(+) percent (PR #315 contract).
// Same behaviour, signatures and outputs as the monolith; only physical location moved.
// Loaded as a CLASSIC (non-module) script before the inline application script, so these
// stay global functions exactly as before. No top-level side effects.
// ─────────────────────────────────────────────────────────────────────────────
// Tastytrade / DXLink may return option Greeks as per-share decimals (e.g. delta=0.20, theta=0.08).
// Portfolio risk rules and display use operational Greek points (delta=20, theta=8).
// Values already in points (|v| > 1) pass through unchanged — safe to call on any raw Greek.
function normalizeGreekPoints(value) {
  var n = Number(value);
  if (!isFinite(n)) return 0;
  if (Math.abs(n) > 0 && Math.abs(n) <= 1) return n * 100;
  return n;
}

// Normalizes an IV rank value to a percent (0–100+).
//
// Tastytrade's `implied-volatility-index-rank` is a RATIO where 1.0 = 100%. It is
// normally < 1 (e.g. 0.65 → 65%) but legitimately exceeds 1.0 when current IV sits
// above its trailing 52-week high (e.g. AMD 1.023 → 102.3%). The previous cutoff of
// `<= 1` treated any ratio above 1.0 as an already-formatted percent, so 1.023 was
// rounded to 1 — the "IVR: 1" bug. We now treat any value below 2 as a ratio and
// scale it by 100; values ≥ 2 are already a 0–100(+) percent and are left as-is.
// IVR below 2% is not meaningful (and is discarded upstream), so the 2.0 cutoff
// never mis-scales a real percent from a source that already returns 0–100.
// Idempotent for already-normalized percents (102.3 → 102.3). Returns null for
// non-finite input. Result carries one decimal to preserve values like 102.3.
function normalizeIvrPercent(value) {
  var n = Number(value);
  if (!isFinite(n)) return null;
  var pct = (Math.abs(n) > 0 && Math.abs(n) < 2) ? n * 100 : n;
  return Math.round(pct * 10) / 10;
}
