// Volatility Coverage & Spread Monitor: DEV frontend only, READ-ONLY.
// A manual click reads /debug/volatility-carry/coverage page by page (25 symbols, the universe pinned by the digest of
// page 1), and one GET per symbol opened. No polling, storage, write, subscription or trading decision.
// Every number is the backend's: the panel rounds only what it DISPLAYS (the CSV keeps full precision) and never fills
// a missing value; null is shown as "—" next to the reason the backend gave. Colours give the SIGN of IV − RV only.
(function () {
  'use strict';
  const PATH = '/debug/volatility-carry/coverage';
  const PAGE_SIZE = 25;
  const MAX_PAGES = 100;
  const VERSION = 'VOLATILITY_COVERAGE_V1';
  const DIGEST = /^[a-f0-9]{64}$/;
  const SYMBOL = /^[A-Z0-9][A-Z0-9.\-]{0,15}$/;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const STATUSES = ['COMPLETE', 'PARTIAL', 'UNAVAILABLE', 'STALE', 'ERROR'];
  const AUDIT_STATES = ['COMPLETE', 'IN_PROGRESS', 'NOT_RECORDED', 'DISABLED', 'ERROR'];
  const AUDIT_REVIEW = ['INVALID_DATA', 'UNRESOLVED', 'IN_RANGE_UNDETERMINED', 'NO_EVENT'];
  const AUDIT_STATE_TEXT = {
    COMPLETE: 'storico completato',
    IN_PROGRESS: 'scansione in corso',
    NOT_RECORDED: 'evidenze non registrate',
    DISABLED: 'audit disabilitato',
    ERROR: 'evidenze non leggibili',
  };
  // Audit compatibility is NEVER an ex-dividend-date verification, price correction or RV certification.
  function dividendAuditOf(row) {
    const raw = row && row.dividendAudit;
    if (!raw || !AUDIT_STATES.includes(raw.state)) return { state: 'NOT_REPORTED', counts: null, total: null };
    const reported = raw.state === 'COMPLETE' || raw.state === 'IN_PROGRESS';
    const counts = raw.counts;
    const valid = reported && Number.isSafeInteger(raw.total) && raw.total >= 0 && counts &&
      ['DIVIDEND_COMPATIBLE', ...AUDIT_REVIEW].every(k => Number.isSafeInteger(counts[k]) && counts[k] >= 0) &&
      Object.values(counts).every(v => Number.isSafeInteger(v) && v >= 0) &&
      Object.values(counts).reduce((a, b) => a + b, 0) === raw.total;
    return {state: reported && !valid ? 'ERROR' : raw.state,
      counts: valid ? counts : null, total: valid ? raw.total : null,
      evidenceDate: raw.evidenceDate ?? null, completedDay: raw.completedDay ?? null};
  }
  const dividendReviewCount = a => a.counts ? AUDIT_REVIEW.reduce((sum, key) => sum + a.counts[key], 0) : null;
  const dividendAuditLabel = state => AUDIT_STATE_TEXT[state] || 'non riportato';
  const SCRIPT_BACKEND = 'https://apex-tastytrade-backend-dev-production.up.railway.app';
  const TIMEOUT_MS = 20000;
  const RECOVERY_PATH = '/dev/market/candles/store/recovery-always-on';
  const RECOVERY_VERSION = 'APEX_1D_ALWAYS_ON_RECOVERY_STATE_V1';

  function devContext(hostname, backend) {
    const host = String(hostname || '');
    const allowedHost = host === 'localhost' || host === '127.0.0.1' ||
      host === 'dev-clean--spontaneous-queijadas-118823.netlify.app' ||
      /^deploy-preview-[0-9]+--spontaneous-queijadas-118823\.netlify\.app$/.test(host);
    return allowedHost && backend === SCRIPT_BACKEND;
  }
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  // ── reason codes: the technical code always stays visible, with a readable explanation ──────────────────────────
  const REASON_TEXT = {
    NOT_FINAL: 'sedute presenti e valide, ma la finalità non è osservata (servono ≥ 2 acquisizioni distinte, stabili)',
    GAP_IN_WINDOW: 'una seduta di borsa della finestra non è nello store',
    INSUFFICIENT_CLOSES: 'chiusure insufficienti per la finestra',
    SPLIT_UNVERIFIED: 'salto di prezzo compatibile con uno split non verificato: finestra bloccata',
    STORE_EMPTY: 'nessuna candela 1D nello store per il simbolo',
    NO_STORED_CANDLE: 'seduta assente dallo store',
    NOT_REGULAR_SESSION: 'seduta non riconosciuta come REGULAR dalla policy',
    NOT_POSITIVE_PRICE: 'candela presente ma con prezzo non positivo (strutturalmente non valida)',
    OHLC_INCONSISTENT: 'candela presente ma OHLC incoerente (strutturalmente non valida)',
    DUPLICATE_SESSION: 'più candele per la stessa seduta',
    UNVERIFIED: 'finalità non verificata',
    OBSERVED_ONCE: 'osservata una sola volta: finalità insufficiente',
    NO_VALIDATED_RV: 'nessuna RV validata',
    SESSION_POLICY_NOT_VERIFIED: 'policy delle sedute non verificata per il simbolo (RV solo esplorativa)',
    RV_SESSION_POLICY_NOT_COVERED: 'simbolo fuori dalla policy RV preliminare: la RV non è confrontata con la IV',
    RV_PRELIMINARY_UNAVAILABLE: 'RV preliminare non disponibile',
    NOT_COMPARABLE: 'confronto preliminare senza spread né motivo',
    NOT_IN_IV_PILOT: 'non è tra i membri del pilot IV (al massimo 20): nessuna IV Ref',
    NOT_IN_VOLATILITY_UNIVERSE: 'non è un titolo dell’universo S&P 500 / Nasdaq-100 persistito (es. ETF)',
    NOT_A_VOLATILITY_CANDIDATE: 'nell’universo ma non presente / attivo / candidato',
    CHAIN_NO_REGULAR: 'catena opzioni senza scadenza Regular utilizzabile',
    CHAIN_NO_CHAIN: 'nessuna catena opzioni',
    CHAIN_REGULAR_AMBIGUOUS: 'scadenza Regular ambigua',
    IV_NOT_CHECKED_TODAY: 'membro del pilot senza snapshot IV per la data di oggi (NY)',
    MARKET_METRIC_MISSING: 'metrica IV assente nella risposta del provider',
    MEMBERSHIP_OR_CENSUS_CHANGED: 'IV salvata per un’appartenenza o un census non più attuali',
    IV_NOT_MATCHED: 'IV della scadenza selezionata non trovata',
    IV_PILOT_DISABLED: 'pilot IV non abilitato su questo servizio',
    IV_STORE_MISSING: 'store IV pilot assente',
    IV_PILOT_TABLES_MISSING: 'tabelle del pilot IV assenti',
    IV_STORE_READ_FAILED: 'lettura dello store IV fallita',
    IV_OBSERVATION_STALE: 'IV osservata troppo tempo fa rispetto alla RV',
    IV_OBSERVATION_DATE_MISMATCH: 'IV osservata in una data diversa da quella del suo snapshot',
    IV_OBSERVED_BEFORE_RV_CLOSED: 'IV osservata prima della chiusura della seduta della RV',
    IV_BEFORE_RV_AS_OF_DATE: 'IV anteriore alla data della RV',
    IV_OBSERVATION_TIME_INVALID: 'orario di osservazione IV non valido',
    CANDLE_READ_FAILED: 'lettura delle candele fallita',
    OBSERVATIONS_NOT_RELIABLE: 'evidenze di acquisizione troncate o illeggibili: nessuna seduta validata',
    NO_OBSERVATIONS_FILE: 'file delle evidenze di acquisizione assente: nessuna seduta può essere validata',
    CENSUS_READ_FAILED: 'lettura del census fallita: non si può dire perché il simbolo non ha IV Ref',
    RV_DAILY_READ_FAILED: 'lettura delle RV storiche fallita: lo storico certificato non è noto',
    RV_DIAGNOSTICS_FAILED: 'diagnostica RV fallita',
    STORED_RV_FAILED: 'calcolo RV dallo store fallito',
    PRELIMINARY_COMPARISON_FAILED: 'confronto preliminare IV − RV fallito',
    MISSING_OR_INVALID_STORED_1D: 'almeno una seduta della finestra senza candela 1D utilizzabile nello store',
    NO_COMPLETED_SESSION_WINDOW: 'nessuna finestra di sedute completate',
    POLICY_SYMBOL_NOT_COVERED: 'simbolo non coperto dalla policy delle sedute',
    NO_SPLIT_VERIFIED: 'finestra coperta da una fonte che elenca ogni split: nessuno all’interno',
    NORMALIZED_VERIFIED_ACTIONS: 'prezzi normalizzati con le azioni elencate da una fonte esaustiva',
    ADJUSTED_VERIFIED_ACTIONS: 'prezzi già aggiustati per le azioni elencate da una fonte esaustiva',
    NORMALIZED_COMPLETENESS_UNVERIFIED: 'azioni elencate verificate e normalizzate, ma esaustività non garantita',
    ADJUSTED_COMPLETENESS_UNVERIFIED: 'prezzi aggiustati per le azioni elencate, ma esaustività non garantita',
    UNVERIFIED_NO_JUMP_DETECTED: 'nessuna azione elencata, esaustività non garantita, nessun salto sospetto: NON è una verifica',
    SUSPECT_JUMP: 'salto di prezzo sospetto senza fonte: bloccato',
    BLOCKED_UNVERIFIED_ACTION: 'azione societaria non verificata: bloccato',
    BLOCKED_COVERAGE_UNVERIFIED: 'fonte delle azioni societarie che non copre la finestra: bloccato',
  };
  function reasonText(code) {
    if (typeof code !== 'string' || !code) return '';
    if (Object.prototype.hasOwnProperty.call(REASON_TEXT, code)) return REASON_TEXT[code];
    const windowed = /^RV(20|60)_(.+)$/.exec(code);
    if (windowed && Object.prototype.hasOwnProperty.call(REASON_TEXT, windowed[2]))
      return 'RV' + windowed[1] + ': ' + REASON_TEXT[windowed[2]];
    return 'codice del motore, senza descrizione in questo pannello';
  }
  const reasonHtml = code => code ? '<code>' + esc(code) + '</code> <span class="sub">' + esc(reasonText(code)) + '</span>' : '—';

  // ── pages ───────────────────────────────────────────────────────────────────────────────────────────────────────
  function checkPage(page, offset, digest) {
    const u = page && page.universe;
    if (!page || page.ok !== true || page.version !== VERSION || page.readOnly !== true ||
        page.notForTrading !== true || page.executionAuthorized !== false || !u ||
        typeof u.digest !== 'string' || !DIGEST.test(u.digest) || (digest && u.digest !== digest) ||
        !Number.isSafeInteger(u.count) || u.count < 1 || page.offset !== offset || page.limit !== PAGE_SIZE ||
        !Array.isArray(page.rows) || page.returned !== page.rows.length ||
        page.rows.length !== Math.min(PAGE_SIZE, u.count - offset) ||
        page.nextOffset !== (offset + page.rows.length < u.count ? offset + page.rows.length : null) ||
        !DAY.test(String(page.asOfSessionDate)) || !DAY.test(String(page.ivAsOfDate)))
      throw Error('COVERAGE_PAGE_INCONSISTENT_AT_' + offset);
    page.rows.forEach((row, i) => {
      if (!row || typeof row.symbol !== 'string' || !SYMBOL.test(row.symbol) ||
          row.universePosition !== offset + i || !STATUSES.includes(row.status) || !row.ivRef ||
          !row.rv20 || !row.rv60 || !row.spreads || !row.spreads.ivMinusRv20Pp ||
          !row.spreads.ivMinusRv60Pp || !Array.isArray(row.reasons) || !row.asOf)
        throw Error('COVERAGE_ROW_INCONSISTENT_AT_' + (offset + i));
    });
    return page;
  }

  // The pages of ONE read: one universe (same digest), one RV session date and one IV date, every symbol once.
  function combinePages(pages) {
    if (!Array.isArray(pages) || !pages.length || pages.length > MAX_PAGES) throw Error('COVERAGE_PAGES_INVALID');
    const first = pages[0];
    const digest = first && first.universe && first.universe.digest;
    const rows = [], seen = new Set(), warnings = [], pageGeneratedAt = {};
    const warn = w => { if (!warnings.includes(w)) warnings.push(w); };
    // Pages are computed one after the other, not as one atomic snapshot. Every page reads the whole IV pilot, so its
    // digest says whether all IV Refs come from one pilot state; any other change of the sources' state is stated too.
    const pilotDigest = p => (p.sources && p.sources.ivPilot ? p.sources.ivPilot.digest : undefined);
    const withoutDigest = p => JSON.stringify(Object.assign({}, p.sources, p.sources && p.sources.ivPilot
      ? { ivPilot: Object.assign({}, p.sources.ivPilot, { digest: null }) } : {}));
    let offset = 0;
    for (const page of pages) {
      checkPage(page, offset, digest);
      if (page.asOfSessionDate !== first.asOfSessionDate || page.ivAsOfDate !== first.ivAsOfDate)
        throw Error('COVERAGE_DATES_CHANGED_DURING_READ');
      if (pilotDigest(page) !== pilotDigest(first)) warn('IV_PILOT_CHANGED_DURING_READ');
      if (withoutDigest(page) !== withoutDigest(first)) warn('SOURCES_CHANGED_DURING_READ');
      for (const row of page.rows) {
        if (seen.has(row.symbol)) throw Error('COVERAGE_DUPLICATE_SYMBOL');
        seen.add(row.symbol);
        rows.push(row);
        pageGeneratedAt[row.symbol] = page.generatedAt;   // the page's reference instant, not the symbol's own read
      }
      offset += page.rows.length;
    }
    const last = pages[pages.length - 1];
    if (last.nextOffset !== null || rows.length !== first.universe.count) throw Error('COVERAGE_UNIVERSE_INCOMPLETE');
    return {
      universe: first.universe, asOfSessionDate: first.asOfSessionDate, ivAsOfDate: first.ivAsOfDate,
      generatedFrom: first.generatedAt, generatedTo: last.generatedAt, sources: first.sources, warnings, rows, pageGeneratedAt,
      atomic: pages.every(p => p.snapshot && p.snapshot.atomic === true),
    };
  }

  // ── derived counts: every one is a count of rows the backend returned, nothing estimated ──────────────────────
  const spreadOf = (row, n) => num(row.spreads['ivMinusRv' + n + 'Pp'].valuePp);
  // Every metric available = both spreads computed. A read error on another source (status ERROR) does not undo that.
  const complete = row => spreadOf(row, 20) !== null && spreadOf(row, 60) !== null;
  // One complete stored 1D window can produce a spread without repeated provider acquisitions.
  // Certification is different: it includes additional finality and adjustment safeguards.
  const certifiedPair = row => complete(row) && [20, 60].every(n =>
    row.spreads['ivMinusRv' + n + 'Pp'].basis === 'RV_CERTIFIED');
  const dxlinkPair = row => complete(row) && !certifiedPair(row) && [20, 60].every(n =>
    ['RV_CERTIFIED', 'RV_PRELIMINARY'].includes(row.spreads['ivMinusRv' + n + 'Pp'].basis)) &&
    [20, 60].some(n => row.spreads['ivMinusRv' + n + 'Pp'].basis === 'RV_PRELIMINARY');
  const hasProblem = row => row.status === 'ERROR' || row.status === 'STALE' || !row.candleQuality ||
    row.candleQuality.issues === true || Object.keys(row.errors || {}).length > 0;
  function summarize(rows) {
    const basis = () => ({ any: 0, CERTIFIED: 0, PRELIMINARY: 0, EXPLORATORY: 0 });
    const s = { total: rows.length, ivRef: 0, rv20: basis(), rv60: basis(), complete: 0,
      certifiedPairs: 0, dxlinkPairs: 0,
      ivAboveRv20: 0, ivBelowRv20: 0, ivEqualRv20: 0, ivAboveRv60: 0, ivBelowRv60: 0, ivEqualRv60: 0,
      insufficientData: 0, candleIssues: 0, stale: 0, errors: 0 };
    for (const row of rows) {
      if (num(row.ivRef.value) !== null) s.ivRef++;
      for (const key of ['rv20', 'rv60']) {
        if (num(row[key].value) === null) continue;
        s[key].any++;
        if (Object.prototype.hasOwnProperty.call(s[key], row[key].basis)) s[key][row[key].basis]++;
      }
      if (complete(row)) s.complete++;
      if (certifiedPair(row)) s.certifiedPairs++;
      if (dxlinkPair(row)) s.dxlinkPairs++;
      for (const n of [20, 60]) {
        const v = spreadOf(row, n);
        if (v === null) continue;
        if (v > 0) s['ivAboveRv' + n]++; else if (v < 0) s['ivBelowRv' + n]++; else s['ivEqualRv' + n]++;
      }
      if (num(row.rv20.value) === null || num(row.rv60.value) === null) s.insufficientData++;
      if (row.candleQuality && row.candleQuality.issues === true) s.candleIssues++;
      if (row.status === 'STALE') s.stale++;
      if (row.status === 'ERROR') s.errors++;
    }
    return s;
  }

  // ── filters and sort ───────────────────────────────────────────────────────────────────────────────────────────
  const AVAILABILITY = {
    IVREF_YES: r => num(r.ivRef.value) !== null, IVREF_NO: r => num(r.ivRef.value) === null,
    RV20_YES: r => num(r.rv20.value) !== null, RV20_NO: r => num(r.rv20.value) === null,
    RV60_YES: r => num(r.rv60.value) !== null, RV60_NO: r => num(r.rv60.value) === null,
    COMPLETE: complete, INCOMPLETE: r => !complete(r),
    CERTIFIED_PAIR: certifiedPair, DXLINK_PAIR: dxlinkPair, PROBLEMS: hasProblem,
  };
  const DIVIDEND_FILTER = {
    FINDINGS: r => dividendAuditOf(r).total > 0,
    COMPATIBLE: r => (dividendAuditOf(r).counts?.DIVIDEND_COMPATIBLE ?? 0) > 0,
    REVIEW: r => (dividendReviewCount(dividendAuditOf(r)) ?? 0) > 0,
    NO_FINDINGS: r => { const a = dividendAuditOf(r); return a.state === 'COMPLETE' && a.total === 0; },
    UNAVAILABLE: r => { const a = dividendAuditOf(r); return a.state !== 'COMPLETE'; },
  };
  const SPREAD = {
    IV_GT_RV20: r => spreadOf(r, 20) !== null && spreadOf(r, 20) > 0,
    IV_LT_RV20: r => spreadOf(r, 20) !== null && spreadOf(r, 20) < 0,
    IV_GT_RV60: r => spreadOf(r, 60) !== null && spreadOf(r, 60) > 0,
    IV_LT_RV60: r => spreadOf(r, 60) !== null && spreadOf(r, 60) < 0,
    ANY_POSITIVE: r => [20, 60].some(n => spreadOf(r, n) !== null && spreadOf(r, n) > 0),
    ANY_NEGATIVE: r => [20, 60].some(n => spreadOf(r, n) !== null && spreadOf(r, n) < 0),
  };
  function filterRows(rows, f) {
    const opt = f || {};
    const search = String(opt.search || '').trim().toUpperCase();
    return rows.filter(r => (!search || r.symbol.includes(search)) &&
      (!opt.availability || (AVAILABILITY[opt.availability] && AVAILABILITY[opt.availability](r))) &&
      (!opt.spread || (SPREAD[opt.spread] && SPREAD[opt.spread](r))) &&
      (!opt.status || r.status === opt.status) &&
      (!opt.reason || r.reasons.includes(opt.reason)) &&
      (!opt.dividend || (DIVIDEND_FILTER[opt.dividend] && DIVIDEND_FILTER[opt.dividend](r))));
  }
  const SORT_KEYS = {
    position: r => r.universePosition, symbol: r => r.symbol, status: r => STATUSES.indexOf(r.status),
    ivRef: r => num(r.ivRef.value), rv20: r => num(r.rv20.value), rv60: r => num(r.rv60.value),
    spread20: r => spreadOf(r, 20), spread60: r => spreadOf(r, 60),
  };
  // Missing values sort last in BOTH directions; ties keep the universe order, so the sort is deterministic.
  function sortRows(rows, key, dir) {
    const get = SORT_KEYS[key] || SORT_KEYS.position;
    const sign = dir === 'desc' ? -1 : 1;
    return rows.slice().sort((a, b) => {
      const x = get(a), y = get(b);
      if (x === null || y === null) {
        if (x !== y) return x === null ? 1 : -1;
      } else if (x !== y) return (x < y ? -1 : 1) * sign;
      return a.universePosition - b.universePosition;
    });
  }
  const reasonCodes = rows => [...new Set(rows.flatMap(r => r.reasons))].filter(c => typeof c === 'string').sort();

  // ── formatting: rounding happens here and only here ─────────────────────────────────────────────────────────────
  function formatPp(v) {
    const x = num(v);
    if (x === null) return '—';
    if (x === 0) return '0.00 pp';
    return (x > 0 ? '+' : '−') + Math.abs(x).toFixed(2) + ' pp';    // the sign is the unrounded value's
  }
  const formatPct = v => (num(v) === null ? '—' : (100 * v).toFixed(2) + '%');
  const spreadClass = v => { const x = num(v); return x === null ? 'na' : x > 0 ? 'pos' : x < 0 ? 'neg' : 'zero'; };
  const BASIS_LABEL = { CERTIFIED: 'CERTIFICATA APEX', PRELIMINARY: 'DA STORE 1D · non certificata',
    EXPLORATORY: 'ESPLORATIVA · non confrontabile',
    RV_CERTIFIED: 'su RV certificata APEX', RV_PRELIMINARY: 'su RV da store 1D non certificata' };

  // IV Market: the scanner's Tastytrade IV index, when the page already holds it. Informational ONLY: it is never an
  // operand of a spread and never stands in for a missing IV Ref.
  function ivMarketOf(symbol, cache) {
    const e = cache && typeof cache === 'object' ? cache[symbol] : null;
    const v = e ? num(e.iv) : null;
    return v !== null && v > 0 ? { value: v, source: String(e.source || ''), updatedAt: num(e.updatedAt) } : null;
  }

  // ── CSV: full precision, one row per symbol, never a formula ────────────────────────────────────────────────────
  function csvCell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",;\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const missingList = sp => (Array.isArray(sp.missing) ? sp.missing : [])
    .map(m => String(m.operand) + ':' + String(m.reason) + (m.preliminaryReason ? '/' + String(m.preliminaryReason) : '')).join(' | ');
  const CSV_COLUMNS = [
    ['symbol', r => r.symbol], ['universe_position', r => r.universePosition], ['status', r => r.status],
    ['primary_reason', r => r.primaryReason], ['reasons', r => r.reasons.join(' | ')],
    ['iv_ref', r => num(r.ivRef.value)], ['iv_ref_status', r => r.ivRef.status], ['iv_ref_reason', r => r.ivRef.reason],
    ['iv_ref_source', r => r.ivRef.source], ['iv_ref_expiration', r => r.ivRef.selectedExpiration],
    ['iv_ref_dte', r => r.ivRef.selectedDte], ['iv_observed_at', r => r.asOf.ivObservedAt],
    ['iv_as_of_date', r => r.asOf.ivAsOfDate],
    ['rv20', r => num(r.rv20.value)], ['rv20_basis', r => r.rv20.basis],
    ['rv20_validated', r => r.rv20.coverage ? r.rv20.coverage.validated : null], ['rv20_required', r => r.rv20.closesRequired],
    ['rv20_missing', r => r.rv20.coverage ? r.rv20.coverage.missing : null],
    ['rv20_certified_reasons', r => (r.rv20.certified && r.rv20.certified.reasons || []).join(' | ')],
    ['rv60', r => num(r.rv60.value)], ['rv60_basis', r => r.rv60.basis],
    ['rv60_validated', r => r.rv60.coverage ? r.rv60.coverage.validated : null], ['rv60_required', r => r.rv60.closesRequired],
    ['rv60_missing', r => r.rv60.coverage ? r.rv60.coverage.missing : null],
    ['rv60_certified_reasons', r => (r.rv60.certified && r.rv60.certified.reasons || []).join(' | ')],
    ['iv_minus_rv20_pp', r => spreadOf(r, 20)], ['iv_minus_rv20_basis', r => r.spreads.ivMinusRv20Pp.basis],
    ['iv_minus_rv20_missing', r => missingList(r.spreads.ivMinusRv20Pp)],
    ['iv_minus_rv60_pp', r => spreadOf(r, 60)], ['iv_minus_rv60_basis', r => r.spreads.ivMinusRv60Pp.basis],
    ['iv_minus_rv60_missing', r => missingList(r.spreads.ivMinusRv60Pp)],
    ['rv_session_date', r => r.asOf.rvSessionDate], ['iv_rv_dates_differ', r => r.asOf.datesDiffer],
    ['rv20_last_certified', r => r.rv20.lastCertified ? num(r.rv20.lastCertified.value) : null],
    ['rv20_last_certified_session', r => r.rv20.lastCertified ? r.rv20.lastCertified.sessionDate : null],
    ['rv60_last_certified', r => r.rv60.lastCertified ? num(r.rv60.lastCertified.value) : null],
    ['rv60_last_certified_session', r => r.rv60.lastCertified ? r.rv60.lastCertified.sessionDate : null],
    ['candle_issues', r => r.candleQuality ? r.candleQuality.issues : null],
    ['census_state', r => r.ivRef.censusState], ['historical_state', r => (r.historicalCertified || {}).state],
    ['evidence_available', r => (r.evidence || {}).available], ['evidence_error', r => (r.evidence || {}).error],
    ['dividend_audit_state', r => dividendAuditOf(r).state],
    ['dividend_audit_date', r => dividendAuditOf(r).evidenceDate],
    ['dividend_audit_completed_day', r => dividendAuditOf(r).completedDay],
    ['dividend_audit_total', r => dividendAuditOf(r).total],
    ['dividend_compatible', r => dividendAuditOf(r).counts?.DIVIDEND_COMPATIBLE],
    ['dividend_invalid_data', r => dividendAuditOf(r).counts?.INVALID_DATA],
    ['dividend_unresolved', r => dividendAuditOf(r).counts?.UNRESOLVED],
    ['dividend_in_range_undetermined', r => dividendAuditOf(r).counts?.IN_RANGE_UNDETERMINED],
    ['dividend_no_event', r => dividendAuditOf(r).counts?.NO_EVENT],
    ['errors', r => Object.entries(r.errors || {}).map(([k, v]) => k + ': ' + v).join(' | ')],
  ];
  function toCsv(data, ivCache) {
    const header = CSV_COLUMNS.map(c => c[0]).concat(['iv_market_informational', 'iv_market_source',
      'iv_market_updated_at', 'page_generated_at', 'generated_from', 'generated_to', 'universe_source', 'universe_digest']);
    const lines = [header.join(',')];
    for (const row of data.rows) {
      const m = ivMarketOf(row.symbol, ivCache);
      lines.push(CSV_COLUMNS.map(c => csvCell(c[1](row))).concat([
        csvCell(m ? m.value : null), csvCell(m ? m.source : null),
        csvCell(m && m.updatedAt !== null ? new Date(m.updatedAt).toISOString() : null),
        csvCell(data.pageGeneratedAt ? data.pageGeneratedAt[row.symbol] : null),
        csvCell(data.generatedFrom), csvCell(data.generatedTo), csvCell(data.universe.source), csvCell(data.universe.digest),
      ]).join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }

  // ── rendering ──────────────────────────────────────────────────────────────────────────────────────────────────
  function dividendAuditSummary(data) {
    const src = data.sources?.dividendAudit;
    const state = src && AUDIT_STATES.includes(src.state) ? src.state : 'NOT_REPORTED';
    const sourceTotal = Number.isSafeInteger(src?.evidenceCount) && src.evidenceCount >= 0 ? src.evidenceCount : null;
    const known = data.rows.map(dividendAuditOf).filter(a => a.total !== null);
    const total = known.reduce((v,a) => v + a.total, 0);
    const compatible = known.reduce((v,a) => v + a.counts.DIVIDEND_COMPATIBLE, 0);
    const review = known.reduce((v,a) => v + dividendReviewCount(a), 0);
    const allComplete = state === 'COMPLETE' && known.length === data.rows.length &&
      known.every(a => a.state === 'COMPLETE') &&
      !(data.warnings || []).includes('SOURCES_CHANGED_DURING_READ');
    const period = src?.evidenceDate ? ' · riferimento ' + esc(src.evidenceDate) : '';
    const completed = src?.completedDay ? ' · completata ' + esc(src.completedDay) : '';
    const values = known.length ?
      '<p>Rilievi dei titoli nel monitor' + (allComplete ? '' : ' (parziali)') + ': <strong>' + esc(total) +
      '</strong> · compatibili <strong>' + esc(compatible) + '</strong> · da approfondire <strong>' +
      esc(review) + '</strong> · copertura ' + esc(known.length) + '/' + esc(data.rows.length) + ' titoli.</p>' :
      '<p>Evidenze per simbolo non disponibili: nessun conteggio dedotto.</p>';
    return '<section class="audit-summary" aria-label="Audit dividendi informativo">' +
      '<h3>Audit dividendi · diagnostica separata</h3><p>Stato: <strong>' +
      esc(dividendAuditLabel(state)) + '</strong>' + period + completed +
      (sourceTotal !== null ? ' · ' + esc(sourceTotal) + ' rilievi nello storico audit complessivo' : '') +
      '</p>' + values +
      (!allComplete ? '<p class="warn">Audit incompleto o non uniforme: questi conteggi non provano la copertura definitiva dell’universo.</p>' : '') +
      '<p class="note">Compatibilità numerica NON significa data ex-dividendo verificata, prezzo corretto o RV20/RV60 certificata.</p>' +
      '</section>';
  }
  function renderSummary(data) {
    const s = summarize(data.rows);
    const split = w => w.any + ' <span class="sub">(C ' + w.CERTIFIED + ' · P ' + w.PRELIMINARY + ' · E ' + w.EXPLORATORY + ')</span>';
    const cards = [
      ['Titoli', s.total], ['IV Ref disponibile', s.ivRef], ['RV20 disponibile', split(s.rv20)],
      ['RV60 disponibile', split(s.rv60)], ['Entrambi gli spread disponibili', s.complete],
      ['Entrambi certificati APEX', s.certifiedPairs], ['Con RV da store 1D', s.dxlinkPairs],
      ['IV > RV20', s.ivAboveRv20], ['IV < RV20', s.ivBelowRv20], ['IV > RV60', s.ivAboveRv60], ['IV < RV60', s.ivBelowRv60],
      ['Dati insufficienti', s.insufficientData], ['Problemi candele', s.candleIssues], ['Stale', s.stale], ['Errori', s.errors],
    ];
    const equal = s.ivEqualRv20 + s.ivEqualRv60 ? '<p class="note">IV = RV esattamente: RV20 ' + s.ivEqualRv20 +
      ' · RV60 ' + s.ivEqualRv60 + '.</p>' : '';
    const src = data.sources || {};
    const state = x => !x ? 'non riportato' : x.error ? 'ERRORE: ' + x.error : x.available ? 'disponibile'
      : (x.enabled === false ? 'disabilitato' : 'non disponibile') + (x.reason ? ' (' + x.reason + ')' : '');
    const evidenceState = x => !x ? 'non riportato' : x.error ? 'ERRORE: ' + x.error : x.available === true ? 'disponibili'
      : x.available === false ? 'non disponibili' + (x.reason ? ' (' + x.reason + ')' : '') : 'stato non dichiarato';
    return '<div class="stats">' + cards.map(([name, value]) => '<div class="metric"><span>' + esc(name) +
      '</span><strong>' + (typeof value === 'number' ? esc(value) : value) + '</strong></div>').join('') + '</div>' + equal + dividendAuditSummary(data) +
      '<p class="note">C/P/E = certificata APEX / da store 1D senza certificazione / esplorativa non confrontabile.' +
      ' Spread disponibili = entrambi i confronti IV−RV calcolati, anche se la certificazione APEX non è completata.' +
      ' Con RV da store 1D = almeno uno spread non certificato, ricavato da chiusure presenti e strutturalmente utilizzabili:' +
      ' non occorrono due acquisizioni per mostrare il valore. La certificazione APEX è un controllo distinto' +
      ' su finalità e azioni societarie; i valori da store non autorizzano trading automatico.' +
      ' Dati insufficienti = almeno una finestra senza RV numerica. Problemi candele = righe escluse dallo store' +
      ' (flag <code>issues</code>). Conteggi delle sole righe lette.</p>' +
      '<p class="note">Universo <code>' + esc(data.universe.source) + '</code> · ' + esc(data.universe.count) +
      ' titoli · digest <code>' + esc(String(data.universe.digest).slice(0, 12)) + '…</code> · RV al ' +
      esc(data.asOfSessionDate) + ' · IV del ' + esc(data.ivAsOfDate) + ' (NY) · letto ' + esc(data.generatedFrom) +
      ' → ' + esc(data.generatedTo) + '</p>' +
      '<p class="note">Fonti: pilot IV ' + esc(state(src.ivPilot)) + ' · census ' + esc(state(src.census)) +
      ' · RV storiche ' + esc(state(src.rvDaily)) + ' · evidenze ' + esc(evidenceState(src.observations)) +
      (src.ivPilot && src.ivPilot.digest ? ' · stato pilot IV <code>' + esc(String(src.ivPilot.digest).slice(0, 12)) + '…</code>' : '') +
      '</p>' + (data.atomic ? '' : '<p class="note">Lettura NON atomica: ogni pagina è calcolata a un proprio istante di' +
      ' riferimento (<code>generatedAt</code> della pagina, colonna <code>page_generated_at</code> nel CSV: lo stesso per' +
      ' tutte le righe della pagina, non l’istante di lettura del singolo simbolo); stessa data RV e IV su tutte le pagine' +
      ' verificata.</p>') +
      (data.warnings.length ? '<p class="error">Attenzione: ' + esc(data.warnings.join(', ')) + '</p>' : '');
  }

  // The 1D controller checkpoint is a separate, persisted source: it does not
  // certify RV20/60 or measure the full-scanner OHLC coverage.
  function renderRecoveryStatus(v) {
    if (!v || v.ok !== true || v.readOnly !== true || v.version !== RECOVERY_VERSION ||
        !v.killSwitch || typeof v.killSwitch.enabled !== 'boolean' ||
        typeof v.enabled !== 'boolean')
      return '<p class="error">Checkpoint recupero 1D non verificabile.</p>';
    const safeCount = n => Number.isSafeInteger(n) && n >= 0 ? String(n) : '—';
    const file = v.stateFile || {};
    const persisted = file.source === 'FILE_READ_ONLY' || file.source === 'LOADED';
    const source = persisted ? 'checkpoint su volume DEV' :
      file.source === 'MEMORY_SHADOW' ? 'solo memoria (shadow)' : 'nessun checkpoint verificabile';
    const totals = persisted ? (v.totals || {}) : {};
    const counts = persisted ? (v.counts || {}) : {};
    const stamps = persisted ? (v.timestamps || {}) : {};
    const mode = ['canary', 'live', 'shadow'].includes(v.mode) ? v.mode : 'sconosciuta';
    const on = v.enabled === true && v.killSwitch.enabled === true;
    const target = typeof v.lastCompletedNyseSession === 'string' &&
      DAY.test(v.lastCompletedNyseSession) ? v.lastCompletedNyseSession : '—';
    const lastSuccess = typeof stamps.lastSuccessfulRecoveryAt === 'string' &&
      !Number.isNaN(Date.parse(stamps.lastSuccessfulRecoveryAt))
      ? stamps.lastSuccessfulRecoveryAt : '—';
    const cards = [
      ['Candele inserite (checkpoint)', safeCount(totals.insertedTotal)],
      ['Tentativi provider registrati', safeCount(totals.providerAttemptsTotal)],
      ['Sedute recuperabili (checkpoint)', safeCount(counts.recoverableSessions)],
      ['Simboli DUE', safeCount(counts.due)],
      ['Simboli PARKED', safeCount(counts.parked)]
    ];
    return '<section aria-label="Stato recupero candele 1D"><h3>Acquisizione e salvataggio 1D · DEV</h3>' +
      '<p>Controller <strong>' + (on ? 'ATTIVO' : 'SPENTO') + '</strong> · modalità ' + esc(mode) +
      ' · fonte ' + esc(source) + ' · seduta inventariata ' + esc(target) + '</p>' +
      '<div class="stats">' + cards.map(([key, value]) =>
        '<div class="metric"><span>' + esc(key) + '</span><strong>' + esc(value) + '</strong></div>').join('') +
      '</div><p class="note">Ultimo inserimento: ' + esc(lastSuccess) +
      ' · lettura: ' + esc(v.generatedAt || '—') +
      '. I conteggi appartengono al checkpoint del controller, NON all’audit OHLC globale e NON certificano RV.' +
      ' Questa lettura non acquisisce dati, non verifica backup e non dimostra capacità DXLink dell’account.</p>' +
      (v.blockedReason ? '<p class="note">Ultimo blocco: <code>' + esc(v.blockedReason) + '</code></p>' : '') +
      '</section>';
  }

  function rvCell(w) {
    const cov = w.coverage;
    return '<div><strong>' + esc(formatPct(w.value)) + '</strong>' + (w.basis ? ' <span class="badge b-' +
      esc(String(w.basis).toLowerCase()) + '">' + esc(BASIS_LABEL[w.basis] || w.basis) + '</span>' : '') + '</div>' +
      (w.basis === 'EXPLORATORY' ? '<div class="sub">mai confrontata con la IV</div>' : '') +
      (num(w.value) === null && w.lastCertified ? '<div class="sub">storica certificata ' +
        esc(formatPct(w.lastCertified.value)) + ' al ' + esc(w.lastCertified.sessionDate) + '</div>' : '') +
      (cov ? '' : '<div class="sub">copertura non verificabile</div>');
  }
  function spreadCell(sp) {
    const v = num(sp.valuePp);
    if (v !== null) return '<span class="sp ' + spreadClass(v) + '">' + esc(formatPp(v)) + '</span>' +
      '<div class="sub">' + esc(BASIS_LABEL[sp.basis] || sp.basis || '') + '</div>';
    const miss = Array.isArray(sp.missing) ? sp.missing : [];
    return '<span class="sp na">—</span>' + miss.map(m => '<div class="sub">manca ' + esc(m.operand) + ': <code>' +
      esc(m.reason) + '</code></div>').join('');
  }
  // APEX-validated sessions and physically present sessions are different facts.
  const coverageCell = w => w.coverage
    ? '<div>presenti ' + esc(w.coverage.present) + '/' + esc(w.coverage.required) + '</div>' +
      '<div class="sub">validate APEX ' + esc(w.coverage.validated) + '/' + esc(w.coverage.required) + '</div>'
    : '<div>presenti —/' + esc(w.closesRequired) + '</div><div class="sub">validazione non verificabile</div>';
  const missingCell = w => w.coverage ? esc(w.coverage.missing) : '—';
  const statusLabel = r => r.status === 'COMPLETE'
    ? certifiedPair(r) ? 'SPREAD CERTIFICATI' : 'SPREAD DISPONIBILI' : r.status;
  function ivRefCell(iv, market) {
    const head = num(iv.value) !== null ? '<strong>' + esc(formatPct(iv.value)) + '</strong><div class="sub">scad. ' +
      esc(iv.selectedExpiration || '—') + ' · ' + esc(iv.selectedDte == null ? '—' : iv.selectedDte) + ' DTE</div>'
      : '<strong>—</strong><div class="sub">' + esc(iv.status) + '</div>';
    return head + (market ? '<div class="sub mkt">IV Market ' + esc(formatPct(market.value)) + ' (informativa)</div>' : '');
  }
  function asOfCell(a) {
    return '<span class="nw">RV ' + esc(a.rvSessionDate || '—') + '</span>' + (a.ivAsOfDate ? '<div class="sub nw">IV ' + esc(a.ivAsOfDate) +
      (a.datesDiffer ? ' <span class="warn">≠ data RV</span>' : '') + '</div>' : '');
  }
  function dividendAuditCell(row) {
    const a = dividendAuditOf(row);
    if (a.total === null) return '<span class="na">—</span><div class="sub">' +
      esc(dividendAuditLabel(a.state)) + '</div>';
    const compatible = a.counts.DIVIDEND_COMPATIBLE, review = dividendReviewCount(a);
    return '<strong>' + esc(a.total) + '</strong> <span class="sub">rilievi' +
      (a.state === 'IN_PROGRESS' ? ' finora' : '') + '</span>' +
      (compatible ? '<div class="sub">compatibili ' + esc(compatible) + '</div>' : '') +
      (review ? '<div class="warn">da verificare ' + esc(review) + '</div>' : '') +
      (a.state === 'IN_PROGRESS' ? '<div class="warn">scansione non completata</div>' : '');
  }
  const SORTABLE = [['spread20', 'IV − RV20'], ['spread60', 'IV − RV60']];
  function renderTable(rows, sort, ivCache) {
    const head = ['Titolo', 'IV Ref', 'RV20', 'RV60'].map(h => '<th scope="col">' + esc(h) + '</th>').join('') +
      SORTABLE.map(([key, label]) => {
        const active = sort && sort.key === key;
        const aria = active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none';
        return '<th scope="col" aria-sort="' + aria + '"><button type="button" class="sort" data-sort="' + key + '">' +
          esc(label) + (active ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ' ↕') + '</button></th>';
      }).join('') +
      ['Sedute RV20', 'Sedute RV60', 'Non validate 20', 'Non validate 60', 'Motivo', 'Audit dividendi', 'Riferimento', 'Stato']
        .map(h => '<th scope="col">' + esc(h) + '</th>').join('');
    const body = rows.map(r => '<tr><th scope="row"><button type="button" class="sym" data-symbol="' + esc(r.symbol) + '">' +
      esc(r.symbol) + '</button></th><td>' + ivRefCell(r.ivRef, ivMarketOf(r.symbol, ivCache)) + '</td><td>' + rvCell(r.rv20) +
      '</td><td>' + rvCell(r.rv60) + '</td><td>' + spreadCell(r.spreads.ivMinusRv20Pp) + '</td><td>' +
      spreadCell(r.spreads.ivMinusRv60Pp) + '</td><td>' + coverageCell(r.rv20) + '</td><td>' + coverageCell(r.rv60) +
      '</td><td>' + missingCell(r.rv20) + '</td><td>' + missingCell(r.rv60) + '</td><td>' + reasonHtml(r.primaryReason) +
      (r.reasons.length > 1 ? '<div class="sub">+' + (r.reasons.length - 1) + ' altri motivi</div>' : '') + '</td><td>' +
      dividendAuditCell(r) + '</td><td>' + asOfCell(r.asOf) + '</td><td><span class="st st-' + esc(r.status.toLowerCase()) + '">' + esc(statusLabel(r)) +
      '</span>' + (r.status === 'COMPLETE' && !certifiedPair(r) ?
        '<div class="sub">non certificati APEX</div>' : '') + '</td></tr>').join('');
    return '<div class="scroll"><table><thead><tr>' + head + '</tr></thead><tbody>' +
      (body || '<tr><td colspan="14">Nessun titolo con questi filtri.</td></tr>') + '</tbody></table></div>';
  }

  // How the census and the RV daily store were read for a row: a fact found, a fact of absence, not read, or an error.
  function censusText(iv, errors) {
    switch (iv.censusState) {
      case 'FOUND': return iv.census ? esc(iv.census.status) + ' · ' + (iv.census.fresh ? 'fresco' : 'NON fresco') + ' · ' +
        esc(iv.census.checkedAt || '—') : 'trovato';
      case 'NOT_IN_UNIVERSE': return 'simbolo assente dall’universo persistito';
      case 'NOT_READ': return 'non letto' + (iv.censusReason ? ' (' + esc(iv.censusReason) + ')' : '');
      case 'ERROR': return '<span class="error">ERRORE di lettura</span>' + (errors && errors.census ? ' · ' + esc(errors.census) : '');
      default: return 'stato non riportato';
    }
  }
  const stateText = x => !x ? 'non riportato' : x.state === 'READ' ? 'lette' : x.state === 'ERROR' ? 'ERRORE di lettura'
    : x.state === 'NOT_READ' ? 'non lette' + (x.reason ? ' (' + x.reason + ')' : '') : 'stato non riportato';

  // One session of a window, in the backend's own terms. The four facts are kept apart and can co-occur.
  function sessionFacts(s) {
    if (!s || typeof s.sessionDate !== 'string' || !DAY.test(s.sessionDate)) return null;
    if (s.available !== true) return { date: s.sessionDate, validated: false, facts: ['ASSENTE'], reason: s.reason || null };
    if (s.valid !== true) return { date: s.sessionDate, validated: false, facts: ['PRESENTE, STRUTTURALMENTE NON VALIDA'], reason: s.reason || null };
    if (s.validated === true) return { date: s.sessionDate, validated: true, facts: [], reason: null };
    const facts = [];
    if (s.reason && s.reason !== 'NOT_REGULAR_SESSION') facts.push('VALIDA, FINALITÀ INSUFFICIENTE');
    if (s.sessionKind !== 'REGULAR') facts.push('NON REGULAR');
    if (!facts.length) facts.push('VALIDA, NON VALIDATA');
    return { date: s.sessionDate, validated: false, facts, reason: s.reason || null };
  }
  function renderWindowDetail(key, n, w, sessions, corporate) {
    const cov = w.coverage, cert = w.certified || {}, stored = w.stored;
    const windowSessions = Array.isArray(sessions) ? sessions.slice(-(n + 1)) : [];
    const facts = windowSessions.length === n + 1 ? windowSessions.map(s => [s, sessionFacts(s)]) : null;
    const problems = facts ? facts.filter(([, f]) => !f || !f.validated) : [];
    const adj = String(cert.priceAdjustment || (stored && stored.priceAdjustment) || '');
    const blocked = /^(SUSPECT_JUMP|BLOCKED_)/.test(adj) || (cert.reasons || []).some(r => /SPLIT_UNVERIFIED$/.test(r));
    return '<h4>' + esc(key.toUpperCase()) + ' · ' + esc(n + 1) + ' chiusure richieste</h4>' +
      '<p>Valore: <strong>' + esc(formatPct(w.value)) + '</strong> ' + esc(w.basis ? BASIS_LABEL[w.basis] || w.basis : 'non disponibile') +
      (w.basis === 'EXPLORATORY' ? ' · <span class="warn">diagnostica numerica, mai confrontata con la IV</span>' : '') + '</p>' +
      '<p>Certificata: ' + esc(cert.status || '—') + ' · validate ' + esc(cert.validatedSessions == null ? '—' : cert.validatedSessions) +
      '/' + esc(n + 1) + ' · finalità ' + esc(cert.finalityBasis || '—') + ' · finestra ' + esc(cert.windowFrom || '—') +
      ' → ' + esc(cert.windowThrough || '—') + '</p>' +
      '<ul class="reasons">' + ((cert.reasons || []).map(r => '<li>' + reasonHtml(r) + '</li>').join('') || '<li>nessun blocco</li>') + '</ul>' +
      (stored ? '<p>Store: ' + esc(stored.status) + ' · ' + esc(formatPct(stored.value)) + (stored.reason ? ' · ' : '') +
        (stored.reason ? reasonHtml(stored.reason) : '') + '</p>' : '<p>Store: non letto</p>') +
      (cov ? '<p>Sedute: presenti ' + esc(cov.present) + ' · strutturalmente valide ' + esc(cov.structurallyValid) +
        ' · validate ' + esc(cov.validated) + ' · assenti ' + esc(cov.absent) + ' · presenti non valide ' +
        esc(cov.presentNotValid) + ' · valide con finalità insufficiente ' + esc(cov.validNotFinal) +
        ' · valide non REGULAR ' + esc(cov.validNotRegular) + ' · mancanti alla validazione ' + esc(cov.missing) + '</p>'
        : '<p class="warn">Copertura non verificabile (lettura candele fallita o diagnostica assente).</p>') +
      '<p>Azioni societarie: ' + esc(corporate && corporate.status || 'NON NOTO') + ' · aggiustamento prezzi ' +
        (adj ? reasonHtml(adj) : '—') + (blocked ? ' · <span class="warn">BLOCCO AZIONI SOCIETARIE</span>' : '') + '</p>' +
      (w.lastCertified ? '<p>RV certificata storica: ' + esc(formatPct(w.lastCertified.value)) + ' al ' +
        esc(w.lastCertified.sessionDate) + ' (rev. ' + esc(w.lastCertified.revision) + ')' +
        (num(w.value) === null || w.basis !== 'CERTIFIED' ? ' · <span class="warn">la RV certificata corrente NON è disponibile</span>' : '') +
        ' · mai usata per lo spread corrente</p>' : '') +
      (facts === null ? '<p class="warn">Elenco sedute non verificabile.</p>' : problems.length ?
        '<details open><summary>Sedute non validate (' + problems.length + ' di ' + (n + 1) + ')</summary><ul>' +
        problems.map(([s, f]) => !f ? '<li>Elemento non verificabile</li>' : '<li>' + esc(f.date) + ' · ' +
          esc(f.facts.join(' + ')) + (f.reason ? ' · ' + reasonHtml(f.reason) : '') +
          (s.finalityLevel ? ' · finalità ' + esc(s.finalityLevel) : '') +
          (Number.isSafeInteger(s.distinctAcquisitions) ? ' · acquisizioni distinte ' + esc(s.distinctAcquisitions) : '') +
          (Number.isSafeInteger(s.spanMs) ? ' · intervallo ' + esc(s.spanMs) + ' ms' : '') +
          (s.sessionKind ? ' · tipo ' + esc(s.sessionKind) + (s.sessionKindBasis ? ' (' + esc(s.sessionKindBasis) + ')' : '') : '') +
          (s.regularForm && s.regularForm.state ? ' · forma Regular ' + esc(s.regularForm.state) : '') + '</li>').join('') +
        '</ul></details>' : '<p>Tutte le ' + esc(n + 1) + ' sedute della finestra sono validate.</p>');
  }
  function renderDividendDetail(detail) {
    const a=dividendAuditOf({dividendAudit:detail?.dividendAudit});
    const raw=detail?.dividendAudit;
    const source=detail?.sources?.dividendAudit;
    const date=a.evidenceDate ? ' · riferimento ' + esc(a.evidenceDate) : '';
    const total=a.total === null ? 'Conteggi non disponibili' : esc(a.total) + ' rilievi' +
      (a.state === 'IN_PROGRESS' ? ' rilevati finora' : '');
    const findings=Array.isArray(raw?.findings) ? raw.findings.slice(0,50) : [];
    const list=a.total === null ? '' : findings.length ? '<ul class="reasons">' + findings.map(f =>
      '<li><code>' + esc(f.timestamp ?? '—') + '</code> · <strong>' + esc(f.status ?? '—') +
      '</strong>' + (f.reason ? ' · ' + esc(f.reason) : '') +
      (num(f.amount) !== null ? ' · importo ' + esc(f.amount) : '') +
      (f.eventDate ? ' · evento provider ' + esc(f.eventDate) : '') +
      (f.dateSemantics ? ' · <code>' + esc(f.dateSemantics) + '</code>' : '') + '</li>').join('') + '</ul>' :
      '<p>Nessun rilievo elencato per il simbolo' +
      (a.state === 'COMPLETE' ? ' nel ciclo completato.' : ' finora.') + '</p>';
    return '<section class="audit-detail"><h4>Audit dividendi · solo diagnostica</h4>' +
      '<p>Stato: <strong>' + esc(dividendAuditLabel(a.state)) + '</strong>' + date + ' · ' + total + '</p>' +
      (!raw && source?.state ? '<p class="sub">Fonte: ' + esc(dividendAuditLabel(source.state)) + '</p>' : '') +
      (a.state !== 'COMPLETE' ? '<p class="warn">Storico non attestato come completo: dati mancanti non equivalgono a zero eventi.</p>' : '') +
      list + (raw?.findingsTruncated === true ? '<p class="warn">Elenco limitato ai primi 50 rilievi per simbolo.</p>' : '') +
      '<p class="note">DIVIDEND_COMPATIBLE significa soltanto compatibilità numerica: la data ex-dividendo NON è verificata.' +
      ' L’audit NON modifica OHLC, finalità RV o spread.</p></section>';
  }
  function renderDetail(detail, ivCache) {
    if (!detail || detail.ok !== true || detail.version !== VERSION || detail.readOnly !== true ||
        detail.executionAuthorized !== false || !detail.row || detail.row.symbol !== detail.symbol ||
        !STATUSES.includes(detail.row.status) || !detail.row.ivRef || !detail.row.rv20 || !detail.row.rv60 ||
        !detail.row.spreads || !Array.isArray(detail.row.reasons) || !detail.row.asOf)
      throw Error('COVERAGE_DETAIL_INVALID_RESPONSE');
    const r = detail.row, iv = r.ivRef, diag = detail.rvDiagnostics, market = ivMarketOf(r.symbol, ivCache);
    const hist = detail.historicalCertified || {};
    const timing = ['ivMinusRv20Pp', 'ivMinusRv60Pp'].flatMap(k => (r.spreads[k].missing || []).filter(m => m.operand === 'TIMING'));
    const spreadLine = (label, sp) => '<li>' + esc(label) + ': ' + (num(sp.valuePp) !== null ? '<span class="sp ' +
      spreadClass(sp.valuePp) + '">' + esc(formatPp(sp.valuePp)) + '</span> ' + esc(BASIS_LABEL[sp.basis] || sp.basis || '') +
      ' · valore esatto <code>' + esc(sp.valuePp) + '</code>' : '— ' + (sp.missing || []).map(m => 'manca ' + esc(m.operand) + ': ' +
      reasonHtml(m.reason) + (m.preliminaryReason ? ' · preliminare: ' + reasonHtml(m.preliminaryReason) : '')).join(' · ')) + '</li>';
    const cq = r.candleQuality;
    return '<h3>' + esc(r.symbol) + ' · <span class="st st-' + esc(r.status.toLowerCase()) + '">' + esc(statusLabel(r)) + '</span></h3>' +
      (r.status === 'COMPLETE' && !certifiedPair(r) ? '<p class="warn">Entrambi gli spread sono calcolabili' +
        ' dallo store 1D, ma non certificati APEX. La doppia acquisizione non è necessaria per visualizzarli.</p>' : '') +
      '<ul class="reasons">' + (r.reasons.map(c => '<li>' + reasonHtml(c) + '</li>').join('') || '<li>nessun motivo</li>') + '</ul>' +
      '<h4>IV Ref (scadenza Regular selezionata ~40 DTE)</h4>' +
      '<p>Valore: <strong>' + esc(formatPct(iv.value)) + '</strong> · stato ' + esc(iv.status) + (iv.reason ? ' · ' + reasonHtml(iv.reason) : '') +
      (iv.status === 'UNSUPPORTED' ? ' · <span class="warn">metrica non supportata per questo simbolo</span>' : '') + '</p><p>Fonte ' + esc(iv.source) + ' · ' + esc(iv.version) + ' · membro pilot ' + (iv.pilotMember ? 'SÌ' : 'NO') +
      ' · scadenza ' + esc(iv.selectedExpiration || '—') + ' · ' + esc(iv.selectedDte == null ? '—' : iv.selectedDte) + ' DTE · settlement ' +
      esc(iv.settlementType || '—') + '</p><p>Snapshot del ' + esc(iv.asOfDate || '—') + ' · osservata ' + esc(iv.observedAt || '—') +
      ' · freschezza: ' + (timing.length ? timing.map(m => reasonHtml(m.reason)).join(' · ') : num(iv.value) !== null ? 'compatibile con la RV' : '—') +
      (r.asOf.datesDiffer ? ' · <span class="warn">data IV ≠ data RV (' + esc(r.asOf.ivAsOfDate) + ' / ' + esc(r.asOf.rvSessionDate) + ')</span>' : '') + '</p>' +
      '<p>Census: ' + censusText(iv, r.errors) + '</p>' +
      (market ? '<p class="mkt">IV Market (IV index Tastytrade dello scanner, solo informativa, mai usata negli spread): ' +
        esc(formatPct(market.value)) + (market.updatedAt !== null ? ' · ' + esc(new Date(market.updatedAt).toISOString()) : '') + '</p>' : '') +
      '<h4>Spread IV − RV (punti percentuali)</h4><ul class="reasons">' + spreadLine('IV − RV20', r.spreads.ivMinusRv20Pp) +
      spreadLine('IV − RV60', r.spreads.ivMinusRv60Pp) + '</ul>' +
      renderWindowDetail('rv20', 20, r.rv20, diag && diag.sessions, diag && diag.corporateActions) +
      renderWindowDetail('rv60', 60, r.rv60, diag && diag.sessions, diag && diag.corporateActions) +
      renderDividendDetail(detail) + '<h4>Qualità candele</h4>' + (cq ? '<p>Candele salvate ' + esc(cq.storedCandles) + ' · strutturalmente valide ' +
        esc(cq.structurallyValidCandles) + ' · escluse ' + esc(cq.excludedRows) + ' (' +
        esc(Object.entries(cq.excludedByReason || {}).map(([k, v]) => k + ' ' + v).join(', ') || 'nessuna') +
        ') · sedute duplicate ' + esc(cq.duplicateSessions) + '</p>' : '<p class="warn">Non verificabile.</p>') +
      (diag && Array.isArray(diag.missingSessions) && diag.missingSessions.length ? '<p>Sedute assenti dallo store: ' +
        esc(diag.missingSessions.join(', ')) + '</p>' : '') +
      (hist.available === false ? '<p>RV storiche: non disponibili · ' + reasonHtml(hist.reason) + '</p>' : '') +
      '<p>Stato delle letture: RV storiche ' + esc(stateText(r.historicalCertified)) + ' · evidenze ' +
      (r.evidence ? (r.evidence.available ? 'disponibili' : 'non disponibili' + (r.evidence.error ? ' · ' + reasonHtml(r.evidence.error) : '')) +
        (r.evidence.truncated ? ' · <span class="warn">troncate</span>' : '') : 'non riportate') + '</p>' +
      (Object.keys(r.errors || {}).length ? '<p class="error">Errori: ' + esc(Object.entries(r.errors).map(([k, v]) => k + ': ' + v).join(' · ')) + '</p>' : '') +
      '<p class="note">Nessuna stima di quanti giorni servano: una seduta si valida con evidenze di finalità, policy REGULAR e ' +
      'controlli sulle azioni societarie, non con il solo passare del tempo.</p>';
  }

  // ── network: GET only, the session's key only as a header, one bounded page at a time ───────────────────────────
  async function fetchJson(url, apiKey, signal) {
    const resp = await fetch(url, { method: 'GET', cache: 'no-store',
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }, signal });
    let json = null;
    try { json = await resp.json(); } catch (_) { json = null; }
    if (resp.ok && json) return json;
    const reason = json && typeof json.error === 'string' ? json.error : 'HTTP_' + resp.status;
    if (resp.status === 401) throw Error('Accesso negato: effettua di nuovo il login APEX.');
    if (resp.status === 403) throw Error('Diagnostica disabilitata sul backend DEV: ' + reason);
    if (resp.status === 404 && !json) throw Error('Endpoint non ancora disponibile sul backend DEV (backend non aggiornato).');
    if (resp.status === 409) throw Error('L’universo è cambiato durante la lettura: ripeti l’analisi.');
    if (!json) throw Error('COVERAGE_NON_JSON_RESPONSE_' + resp.status);
    throw Error('COVERAGE_HTTP_' + resp.status + ': ' + reason);
  }

  function setupUi() {
    if (document.getElementById('apex-vol-coverage-launcher')) return;
    const trigger = document.createElement('button');
    trigger.id = 'apex-vol-coverage-launcher';
    trigger.type = 'button';
    trigger.textContent = 'IV − RV · DEV';
    trigger.setAttribute('aria-label', 'Apri Volatility Coverage & Spread Monitor DEV');
    trigger.style.cssText = 'position:fixed;bottom:17px;right:150px;z-index:2147482990;' +
      'background:#5b3fa3;color:#fff;border:1px solid #7d63c4;border-radius:9px;' +
      'padding:10px 13px;font:600 12px system-ui;cursor:pointer;box-shadow:0 8px 24px #0004;';
    let host = null, current = null, detailCurrent = null, recoveryCurrent = null, busy = false, data = null;
    const view = { search: '', availability: '', spread: '', dividend: '', status: '', reason: '', sort: { key: 'position', dir: 'asc' } };
    const ivCache = () => (typeof _ivrCache !== 'undefined' ? _ivrCache : null);
    function close() {
      if (current) current.abort();
      if (detailCurrent) detailCurrent.abort();
      if (recoveryCurrent) recoveryCurrent.abort();
      current = null; detailCurrent = null; recoveryCurrent = null; busy = false; data = null;
      if (host) { host.remove(); host = null; }
      trigger.focus();
    }
    function open() {
      if (host) return;
      host = document.createElement('div');
      host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;';
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = '<style>' +
        ':host{font-family:system-ui;color:#d9e6eb}*{box-sizing:border-box}' +
        '.shade{position:absolute;inset:0;background:rgba(1,10,19,.83)}' +
        '.panel{position:absolute;inset:3vh 2vw;background:#12222d;border:1px solid #365361;' +
        'border-radius:12px;padding:18px;overflow:auto;box-shadow:0 15px 60px #0008}' +
        'header{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
        'h2{margin:0;font-size:18px}h3{margin:16px 0 6px}h4{margin:14px 0 4px;color:#fff}p{line-height:1.5;margin:6px 0}' +
        'button{background:#0b8174;color:#fff;border:0;border-radius:7px;padding:9px 12px;cursor:pointer;font-size:13px}' +
        'button:disabled{opacity:.55;cursor:wait}.close{background:#314958}' +
        '.note,.sub{color:#a6bdc9;font-size:11px;line-height:1.45}.stats{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}' +
        '.metric{background:#1b3442;padding:8px 9px;border-radius:7px;min-width:118px}' +
        '.metric span,.metric strong{display:block}.metric span{font-size:11px;color:#b6cbd3}' +
        '.metric strong{font-size:19px;margin-top:2px}.scroll{overflow:auto;max-height:62vh}' +
        'table{width:100%;border-collapse:collapse;font-size:12px;text-align:left;min-width:1550px}' +
        'th,td{padding:8px;border-bottom:1px solid #36505e;vertical-align:top}' +
        'th{color:#fff}thead th{background:#213744;position:sticky;top:0;z-index:1}' +
        '.sort,.sym{background:none;padding:0;color:#9fe3d8;font-weight:600;font-size:12px}' +
        '.sp{font-weight:700;font-variant-numeric:tabular-nums}.pos{color:#46d39a}.neg{color:#ff7d7d}' +
        '.zero{color:#e4edf1}.na{color:#7d8f99}.warn{color:#f6c66d}.error{color:#ffb4aa}.info{color:#b6d9d3}' +
        '.mkt{color:#c7b6f0}.badge{font-size:10px;padding:1px 5px;border-radius:4px;background:#314958}' +
        '.b-certified{background:#0d5c4f}.b-preliminary{background:#6a531a}.b-exploratory{background:#5a2f3a}' +
        '.st{font-size:11px;font-weight:700}.st-complete{color:#46d39a}.st-partial{color:#9fd36b}' +
        '.st-unavailable{color:#a6bdc9}.st-stale{color:#f6c66d}.st-error{color:#ff7d7d}' +
        '.filters{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.filters input,.filters select{background:#0d1a22;' +
        'color:#d9e6eb;border:1px solid #36505e;border-radius:6px;padding:7px;font-size:12px}' +
        '.reasons{margin:4px 0 4px 18px;padding:0}code{overflow-wrap:anywhere;color:#e4edf1}' +
        '#detail{border-top:1px solid #36505e;margin-top:14px}.nw{white-space:nowrap}' +
        '.audit-summary,.audit-detail{border:1px solid #395462;border-radius:8px;padding:9px 12px;margin:10px 0}' +
        '</style><div class="shade"></div><section class="panel" role="dialog" aria-modal="true"' +
        ' aria-label="Volatility Coverage and Spread Monitor"><header><h2>Volatility Coverage &amp; Spread Monitor · DEV</h2>' +
        '<button class="close" type="button" id="close">Chiudi</button></header>' +
        '<p class="note">Sola lettura, nessun polling. IV Ref = IV della scadenza Regular selezionata (~40 DTE) del pilot IV;' +
        ' IV Market, IV30, IVR non la sostituiscono mai. Spread = 100 × (IV Ref − RV) in punti percentuali, arrotondati solo' +
        ' a video (il CSV ha la precisione piena). Verde IV &gt; RV, rosso IV &lt; RV, neutro uguali, grigio non disponibile:' +
        ' i colori indicano solo il segno, non sono segnali di trading.</p>' +
        '<button type="button" id="run">Analizza universo</button> ' +
        '<button type="button" id="recovery-run">Stato recupero candele 1D</button> ' +
        '<button type="button" id="csv" disabled>Esporta CSV</button>' +
        '<p id="state" class="info" role="status" aria-live="polite">Nessuna richiesta ancora effettuata.</p>' +
        '<div id="summary"></div><div id="recovery"></div><div class="filters" id="filters" hidden>' +
        '<input id="search" type="search" placeholder="Cerca simbolo" aria-label="Cerca simbolo">' +
        '<select id="availability" aria-label="Disponibilità"><option value="">Disponibilità: tutte</option>' +
        '<option value="IVREF_YES">IV Ref disponibile</option><option value="IVREF_NO">IV Ref mancante</option>' +
        '<option value="RV20_YES">RV20 disponibile</option><option value="RV20_NO">RV20 mancante</option>' +
        '<option value="RV60_YES">RV60 disponibile</option><option value="RV60_NO">RV60 mancante</option>' +
        '<option value="COMPLETE">Entrambi gli spread disponibili</option>' +
        '<option value="CERTIFIED_PAIR">Entrambi certificati APEX</option>' +
        '<option value="DXLINK_PAIR">Con RV da store 1D (non certificata)</option>' +
        '<option value="INCOMPLETE">Spread non entrambi disponibili</option>' +
        '<option value="PROBLEMS">Solo problematici (errore, stale, candele)</option></select>' +
        '<select id="spread" aria-label="Spread"><option value="">Spread: tutti</option>' +
        '<option value="IV_GT_RV20">IV &gt; RV20</option><option value="IV_LT_RV20">IV &lt; RV20</option>' +
        '<option value="IV_GT_RV60">IV &gt; RV60</option><option value="IV_LT_RV60">IV &lt; RV60</option>' +
        '<option value="ANY_POSITIVE">Almeno uno spread positivo</option><option value="ANY_NEGATIVE">Almeno uno spread negativo</option></select>' +
        '<select id="dividend" aria-label="Audit dividendi"><option value="">Audit dividendi: tutti</option>' +
        '<option value="FINDINGS">Con rilievi</option><option value="COMPATIBLE">Compatibili</option>' +
        '<option value="REVIEW">Da approfondire</option><option value="NO_FINDINGS">Nessun rilievo (audit completo)</option>' +
        '<option value="UNAVAILABLE">Audit parziale o non disponibile</option></select>' +
        '<select id="status" aria-label="Stato"><option value="">Stato: tutti</option>' +
        STATUSES.map(s => '<option value="' + s + '">' + s + '</option>').join('') + '</select>' +
        '<select id="reason" aria-label="Codice motivo"><option value="">Motivo: tutti</option></select></div>' +
        '<p id="count" class="note"></p><div id="table"></div><div id="detail"></div></section>';
      const $ = id => root.getElementById(id);
      const run = $('run'), csv = $('csv'), state = $('state'), detail = $('detail');
      const recovery = $('recovery'), recoveryRun = $('recovery-run');
      $('close').addEventListener('click', close);
      root.querySelector('.shade').addEventListener('click', close);
      function draw() {
        if (!data) return;
        const rows = sortRows(filterRows(data.rows, view), view.sort.key, view.sort.dir);
        $('count').textContent = rows.length + ' di ' + data.rows.length + ' titoli mostrati.';
        $('table').innerHTML = renderTable(rows, view.sort, ivCache());
      }
      for (const id of ['search', 'availability', 'spread', 'dividend', 'status', 'reason']) {
        $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { view[id] = $(id).value; draw(); });
      }
      $('table').addEventListener('click', event => {
        const target = event.target && event.target.closest ? event.target.closest('button') : null;
        if (!target) return;
        const key = target.getAttribute('data-sort');
        if (key) {
          view.sort = view.sort.key === key && view.sort.dir === 'asc' ? { key, dir: 'desc' } : { key, dir: 'asc' };
          draw();
          return;
        }
        const symbol = target.getAttribute('data-symbol');
        if (symbol && SYMBOL.test(symbol)) loadDetail(symbol);
      });
      async function loadDetail(symbol) {
        if (typeof S === 'undefined' || !S.backendKey) return;
        if (detailCurrent) detailCurrent.abort();
        const controller = new AbortController();
        detailCurrent = controller;
        const runHost = host;
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        detail.innerHTML = '<p class="info">Lettura dettaglio ' + esc(symbol) + '…</p>';
        try {
          const json = await fetchJson(BACKEND + PATH + '/' + encodeURIComponent(symbol), S.backendKey, controller.signal);
          if (detailCurrent !== controller || host !== runHost) return;
          detail.innerHTML = renderDetail(json, ivCache());
        } catch (error) {
          if (detailCurrent !== controller || host !== runHost) return;
          detail.innerHTML = '<p class="error">' + esc(controller.signal.aborted ? 'Richiesta annullata o scaduta.'
            : (error && error.message) || 'Errore di lettura del dettaglio.') + '</p>';
        } finally {
          clearTimeout(timeout);
          if (detailCurrent === controller) detailCurrent = null;
        }
      }
      // A second explicit click performs ONE authenticated GET; never run
      // this read automatically on open or during the coverage analysis.
      recoveryRun.addEventListener('click', async () => {
        if (recoveryCurrent) return;
        if (typeof S === 'undefined' || !S.backendKey) {
          recovery.textContent = 'Effettua il login APEX per leggere il checkpoint DEV.';
          return;
        }
        const controller = new AbortController();
        recoveryCurrent = controller;
        const runHost = host;
        recoveryRun.disabled = true;
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        recovery.innerHTML = '<p class="info">Lettura checkpoint 1D dal backend DEV…</p>';
        try {
          const result = await fetchJson(BACKEND + RECOVERY_PATH + '?offset=0&limit=1',
            S.backendKey, controller.signal);
          if (recoveryCurrent !== controller || host !== runHost) return;
          recovery.innerHTML = renderRecoveryStatus(result);
        } catch (error) {
          if (recoveryCurrent !== controller || host !== runHost) return;
          recovery.innerHTML = '<p class="error">' + esc(controller.signal.aborted
            ? 'Lettura checkpoint annullata o scaduta.'
            : (error && error.message) || 'Checkpoint 1D non disponibile.') + '</p>';
        } finally {
          clearTimeout(timeout);
          if (recoveryCurrent === controller && host === runHost) {
            recoveryCurrent = null;
            recoveryRun.disabled = false;
          }
        }
      });
      csv.addEventListener('click', () => {
        if (!data) return;
        const blob = new Blob([toCsv(data, ivCache())], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'volatility-coverage-' + data.asOfSessionDate + '-' + data.universe.digest.slice(0, 8) + '.csv';
        root.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      });
      run.addEventListener('click', async () => {
        if (busy) return;
        if (typeof S === 'undefined' || !S.backendKey) {
          state.textContent = 'Effettua il login APEX per usare la chiave API della sessione.';
          return;
        }
        busy = true; run.disabled = true; csv.disabled = true; data = null;
        $('summary').innerHTML = ''; $('table').innerHTML = ''; detail.innerHTML = ''; $('count').textContent = '';
        $('filters').hidden = true; state.className = 'info';
        const controller = new AbortController();
        current = controller;
        const runHost = host;
        const signal = controller.signal;
        let timeout = null;
        try {
          const pages = [];
          for (let offset = 0, digest = null; ;) {
            // A response may resolve after close(): never schedule another page for a stale or cancelled run.
            if (signal.aborted || current !== controller || host !== runHost) return;
            if (pages.length >= MAX_PAGES) throw Error('COVERAGE_TOO_MANY_PAGES');
            state.textContent = 'Lettura pagina ' + (pages.length + 1) + (digest ? '/' + Math.ceil(pages[0].universe.count / PAGE_SIZE) : '') + '…';
            timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
            const page = await fetchJson(BACKEND + PATH + '?offset=' + offset + '&limit=' + PAGE_SIZE +
              (digest ? '&universeDigest=' + encodeURIComponent(digest) : ''), S.backendKey, signal);
            clearTimeout(timeout); timeout = null;
            checkPage(page, offset, digest);
            pages.push(page);
            digest = page.universe.digest;
            if (page.nextOffset === null) break;
            offset = page.nextOffset;
          }
          const combined = combinePages(pages);
          if (current !== controller || host !== runHost) return;
          data = combined;
          $('summary').innerHTML = renderSummary(data);
          $('reason').innerHTML = '<option value="">Motivo: tutti</option>' + reasonCodes(data.rows)
            .map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
          view.reason = '';
          $('filters').hidden = false;
          draw();
          csv.disabled = false;
          state.textContent = 'Completato: ' + data.rows.length + ' titoli in ' + pages.length +
            ' pagine. Nessun valore stimato o sostituito.';
        } catch (error) {
          if (current !== controller || host !== runHost) return;
          state.textContent = signal.aborted ? 'Richiesta annullata o scaduta (' + TIMEOUT_MS / 1000 + ' s per pagina).'
            : (error && error.message) || 'Errore di lettura.';
          state.className = 'error';
        } finally {
          if (timeout) clearTimeout(timeout);
          if (current === controller && host === runHost) {
            run.disabled = false; busy = false; current = null;
          }
        }
      });
      document.body.appendChild(host);
      run.focus();
    }
    trigger.addEventListener('click', open);
    document.body.appendChild(trigger);
  }
  if (typeof module !== 'undefined' && module.exports)
    module.exports = { devContext, checkPage, combinePages, summarize, filterRows, sortRows, reasonCodes, reasonText,
      formatPp, formatPct, spreadClass, ivMarketOf, csvCell, toCsv, renderSummary, dividendAuditSummary,
      dividendAuditOf, dividendAuditCell, renderDividendDetail, renderTable, sessionFacts, renderDetail,
      fetchJson, renderRecoveryStatus, PAGE_SIZE, TIMEOUT_MS };
  if (typeof document !== 'undefined' && typeof window !== 'undefined' &&
      devContext(window.location && window.location.hostname, typeof BACKEND === 'string' ? BACKEND : '')) {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', setupUi, { once: true });
    else setupUi();
  }
})();
