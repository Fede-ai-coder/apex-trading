var _REGIME_ADJ_RULES = [
  { text: 'Short call / call spread adjustment prerequisites (applies in ALL regimes):', sub: [
    'SMA20 must be below SMA30 on the underlying — bearish MA structure required before adding short-call exposure',
    'Price must not be extended below SMA8 or SMA20 — do not adjust into existing technical weakness',
    'If conditions are not met: "Adjustment skipped — delta alone is not enough; technical context is not aligned"',
  ]},
  { text: 'TA-aware adjustment evaluation:', sub: [
    'Combine position delta + current VIX regime + symbol MA structure + distance from SMA8/SMA20',
    'Extended moves below SMA8 or SMA20 invalidate delta-only logic — wait for TA confirmation',
    'Check for active squeeze on the underlying: a firing squeeze can accelerate moves beyond delta estimates',
  ]},
];
var _REGIME_CONTENT = {
  LOW: {
    cls:'regime-low', title:'LOW VOLATILITY REGIME', range:'VIX &lt; 18.5 &middot; REGIME ACTIVE',
    forbidden:[
      'Short strangles even with high IVR',
      'Short strangles on squeeze setups',
      'Short strangles on trend continuation',
      'Aggressive front-month theta selling',
      'Short vega on breakout structures',
      { text: 'Put ratio spreads', sub: [
        'Put-side IV too low in this regime; selling extra put premium is inefficient',
        'Exposes portfolio to volatility expansion with poor reward-to-risk',
        'Use put debit spreads or long strangles instead',
      ]},
    ],
    favored:[
      'Poor Man Covered Calls (PMCC) — aligns with bullish drift &amp; trend persistence',
      'Long strangles with active adjustments',
      'Selective credit spreads',
      'Long gamma structures',
      'Long vega structures',
    ],
    caution:[
      'Avoid PMCP structures fighting bullish market drift',
      'Macro/rates/commodity instruments (TLT, GDX, SLV, oil-related products, etc.) may behave differently &mdash; evaluate separately',
      { text:'Short strangles are allowed ONLY as an exceptional, defensive structure:', sub:[
        '120-150 DTE only',
        'Extremely small sizing',
        'Maximum one or two positions, and possibly zero',
        'Only on truly lateral high-IVR stocks',
        'NOT classic theta trades',
        'Treat them as VEGA MEAN-REVERTING trades',
        'They may still fail badly in regime shifts',
      ]},
    ],
    tech:[
      'Squeeze detection',
      'SMA8 trend continuation',
      'Relative strength vs SPY',
      'Breakout quality',
      'Avoid short convexity during squeeze/trend conditions',
    ],
    adj: _REGIME_ADJ_RULES,
  },
  MID: {
    cls:'regime-mid', title:'MID VOLATILITY REGIME', range:'18.5 &le; VIX &le; 30 &middot; REGIME ACTIVE',
    forbidden:[
      'Short strangles on strong trends',
      'Oversized positions',
      'Ignoring technical context',
      'Ignoring squeeze conditions',
    ],
    caution:[
      'Constantly monitor if the underlying enters squeeze conditions',
      'Reduce aggressiveness during compression/trend acceleration',
    ],
    favored:[
      'Low delta short strangles',
      'Iron condors',
      'Credit spreads',
      'Dynamic delta management',
      'PMCP structures become more viable in bearish or weak relative-strength environments',
    ],
    tech:[
      'Technicals + IVR together',
      'Mean reversion context',
      'Volatility compression analysis',
      'Monitor squeeze transitions continuously',
    ],
    adj: _REGIME_ADJ_RULES,
  },
  HIGH: {
    cls:'regime-high', title:'HIGH VOLATILITY REGIME', range:'VIX &gt; 30 &middot; REGIME ACTIVE',
    forbidden:[
      'Chasing panic moves',
      'Late long strangles',
      'Selling puts without overextension',
      'Short strangles on trend continuation',
      'Short strangles on overextended directional structures',
      'Short strangles during active squeeze expansion',
    ],
    caution:[],
    favored:[
      'Short puts on overextended strong stocks',
      'Careful premium selling',
      'Mean reversion structures',
      'Selective short premium trades',
      'PMCP structures become more viable in bearish or weak relative-strength environments',
    ],
    tech:[
      'Relative strength &gt; SPY',
      'Overextension detection',
      'Distance from SMA8/SMA20',
      'Exhaustion moves',
      'Trend maturity analysis',
    ],
    adj: _REGIME_ADJ_RULES,
  },
};
function _mcxRegimeOf(vix){
  if(vix==null||isNaN(vix))return null;
  if(vix<18.5)return 'LOW';
  if(vix<=30)return 'MID';
  return 'HIGH';
}
var _REGIME_LABEL={LOW:'LOW VOL',MID:'MID VOL',HIGH:'HIGH VOL'};

// ── VIX / overextension conditional Market-Context rules ─────────
// Centralised so the Dashboard banner and the MCX forbidden list stay in sync.
// These rules are layered on top of the static per-regime
// _REGIME_CONTENT.forbidden lists AT RENDER TIME — they are intentionally not
// baked into _REGIME_CONTENT so the regime data stays a pure description of each
// volatility bucket. The VIX<20 threshold is independent of the LOW/MID/HIGH
// regime buckets (LOW ends at 18.5), so it cannot live in a single regime entry.
var _VIX_NAKED_CALL_MAX = 20;   // below this VIX level, selling naked calls is not allowed
// Standing overextension risk warning. There is no reliable automatic
// "overextended" flag on the regime banner, so this is surfaced as an operative
// warning the trader applies whenever the underlying / setup is overextended.
var _REGIME_OVEREXT_FORBIDDEN = { text:'Do not sell naked calls or short call ratios if overextended', sub:[
  'Applies whenever the underlying or setup is overextended (e.g. stretched far from SMA8/SMA20 or MA200)',
  'Overextended short-call / call-ratio exposure carries unbounded risk into a continuation squeeze',
]};
// Forbidden items to prepend to the current regime's forbidden list, derived
// from the live VIX value. Keeps the Dashboard banner and MCX in lock-step.
function _regimeDynForbidden(vix){
  var extra=[];
  if(vix!=null && !isNaN(vix) && vix<_VIX_NAKED_CALL_MAX){
    extra.push('No naked calls');   // VIX < 20 — naked call selling not allowed
  }
  extra.push(_REGIME_OVEREXT_FORBIDDEN);
  return extra;
}

// ── Dashboard banner — VIX-conditional operative notes ───────────
// Dashboard-only. Returns an ordered list of low-VIX operative notes for the
// compact regime banner. Thresholds are strictly-less-than, mirroring the
// regime bucket edges in _mcxRegimeOf. Centralised here so the notes are not
// hardcoded inside _regimeRenderCompact and stay easy to extend.
var _VIX_AVOID_NAKED_PUT_MAX = 19;     // VIX < 19 — avoid naked puts
var _VIX_LOW_IV_STRATEGY_MAX = 18.5;   // VIX < 18.50 — low-IV strategy constraints
function _regimeCompactVixNotes(vix){
  var notes=[];
  if(vix==null || isNaN(vix)) return notes;
  if(vix<_VIX_NAKED_CALL_MAX)      notes.push('VIX &lt; 20 — avoid naked calls');
  if(vix<_VIX_AVOID_NAKED_PUT_MAX) notes.push('VIX &lt; 19 — avoid naked puts');
  if(vix<_VIX_LOW_IV_STRATEGY_MAX){
    notes.push('VIX &lt; 18.50 — avoid bear call spreads');
    notes.push('Only bull put spreads');
    notes.push("Poor man's covered call only if the market is in a possible technical breakout");
    notes.push('Light 1-1-2s only to defend market shocks');
  }
  return notes;
}
