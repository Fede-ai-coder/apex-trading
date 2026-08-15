// ─────────────────────────────────────────────────────────────────────────────
// PESS (Pre-Earnings Strangle Swap agent) — CONFIG + PURE RULES
//
// PR 1 of the approved 4-PR PESS extraction (option E of the post-SFS monolith
// audit: config/rules · live transport · analysis service · UI panel). The four
// declarations below were relocated BYTE-FOR-BYTE out of the inline monolith in
// index.html. Names, signatures, bodies, binding forms (`function` / `var`),
// sync form and relative physical order are unchanged; only their location
// changed. No behaviour changed.
//
// WHAT THIS FILE OWNS
//   The PESS scoring rules and the one configuration constant, all of them
//   inert at load time:
//     • pessIVRRegime  — maps an IV-rank percentile to its regime label, score
//                        adjustment, hard-reject reason and colour token.
//     • pessIVEdge     — maps a front/back IV pair to the term-structure edge
//                        label, score adjustment and edge in percentage points.
//     • pessRejectCard — builds the rejection card MARKUP as a string. It writes
//                        nothing to the DOM: the caller decides what to do with
//                        the returned HTML. A markup-producing function is not a
//                        UI owner.
//     • PESS_LIVE_MIN  — the minimum DXLink quote fields a live PESS leg needs.
//
// WHAT THIS FILE DELIBERATELY DOES NOT OWN
//   Everything with an effect. The five remaining PESS declarations stay inline
//   until their own PRs: runPESSPanel (panel), pessGetStreamerSymbols and
//   pessRunDXLink (live transport), pessAnalyzeTicker and pessAnalyzeAll
//   (analysis). Nothing here reads or writes S.*, touches the DOM, opens a
//   socket, issues a request, sets a timer, registers a listener, reads storage
//   or assigns to window.
//
// LOAD ORDER
//   A classic, synchronous, src-only script. It has NO evaluation-time
//   dependency on anything, and nothing in the application references these
//   bindings at load time — every consumer is a PESS function that runs on user
//   action. The single requirement is therefore that this tag precede the inline
//   monolith, so the four global bindings exist by the time any consumer can be
//   CALLED.
//
//   It is loaded in the early family/module region, after the shared
//   utils / api / config scripts and ahead of the other family modules — well
//   before any user-callable consumer can execute. It is NOT the last local
//   script: js/ui/backend-directional-snapshot-panel.js remains the final local
//   module immediately before the inline monolith.
//
// CONSUMERS (all still inline, all call-time)
//   pessIVRRegime  ← runPESSPanel, pessAnalyzeTicker, pessAnalyzeAll
//   pessIVEdge     ← pessAnalyzeTicker, pessAnalyzeAll
//   pessRejectCard ← pessAnalyzeTicker
//   PESS_LIVE_MIN  ← pessRunDXLink
// ─────────────────────────────────────────────────────────────────────────────

function pessIVRRegime(ivr){
  if(ivr==null) return {label:'N/A',adj:0,hardReject:null,color:'var(--tx3)'};
  if(ivr>70)   return {label:'HIGH — HARD REJECT',adj:-99,
    hardReject:'IVR '+ivr.toFixed(0)+'% > 70 — earnings likely fully priced in, IV expansion upside minimal',
    color:'var(--rd)'};
  if(ivr>50)   return {label:'elevated — penalty',adj:-10,hardReject:null,color:'#f97316'};
  if(ivr>=30)  return {label:'neutral / selective',adj:0,  hardReject:null,color:'var(--am)'};
  return               {label:'favorable',          adj:+10,hardReject:null,color:'var(--gr)'};
}

function pessIVEdge(ivFront,ivBack){
  if(ivFront==null||ivBack==null) return {label:'N/A',adj:0,edgePct:null};
  var edgePct=(ivBack-ivFront)*100; // percentage points
  if(edgePct<0)     return {label:'negative edge (front IV > back IV)',adj:-15,edgePct:edgePct};
  if(edgePct<3)     return {label:'small positive — boost',            adj:+8, edgePct:edgePct};
  if(edgePct<8)     return {label:'moderate — neutral',                adj:0,  edgePct:edgePct};
  return                   {label:'very large — earnings priced in',   adj:-10,edgePct:edgePct};
}

function pessRejectCard(ticker,title,body){
  return '<div class="stbox" style="border-color:var(--rd);margin-top:8px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
      '<div class="stitle" style="color:#f97316">PESS — '+ticker+'</div>'+
      '<div style="font-size:11px;font-weight:700;color:var(--rd)">SCARTATO</div>'+
    '</div>'+
    '<div style="font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7">'+
      '<strong>['+ticker+'] '+title+'</strong><br>'+body.replace(/\n/g,'<br>')+
    '</div>'+
  '</div>';
}

var PESS_LIVE_MIN=['bidPrice','askPrice','delta'];
