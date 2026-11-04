// Volatility Coverage & Spread Monitor: DEV frontend only.
// Opening the panel (and «Analizza universo») reads /debug/volatility-carry/coverage page by page (25 symbols, the
// universe pinned by the digest of page 1), and one GET per symbol opened. While the panel is open and visible it
// re-reads persisted Coverage via GET at most once per five-minute interval (or on resume after that interval).
// A refresh job is started ONLY by the explicit «Nuova acquisizione IV» button. That manually started job is then
// monitored via GET and triggers a single read-only Coverage update when it ends. No background provider acquisition
// on opening, no persistence, subscription or trading decision.
// Every number is the backend's: the panel rounds only what it DISPLAYS (the CSV keeps full precision) and never fills
// a missing value; null is shown as "—" next to the reason the backend gave. Colours give the SIGN of IV − RV only.
(function () {
  'use strict';
  const PATH = '/debug/volatility-carry/coverage';
  const YZ_PATH = '/debug/volatility-carry/rv-yang-zhang';
  const PRICE_BASIS_PATH = '/debug/volatility-carry/price-basis';
  const PRICE_BASIS_VERSION = 'RV_PRICE_BASIS_DAILY_ONLY_DIAGNOSTIC_V1';
  const YZ_AUDIT_VERSION = 'RV_YANG_ZHANG_UNIVERSE_AUDIT_READ_ONLY_V1';
  const RV40_DIAGNOSTIC_VERSION = 'RV40_CC_AND_YANG_ZHANG_STORED_1D_PRELIMINARY_V1';
  const YZ_STATES = ['PRELIMINARY', 'BLOCKED_SESSION_POLICY', 'UNAVAILABLE'];
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
  const REFRESH_PATH = '/debug/volatility-carry/iv-refresh';
  const REFRESH_POLL_MS = 5000;                 // status only: a poll never starts an acquisition
  const REFRESH_PROGRESS_READ_MIN_MS = 60_000; // bounded GET re-read when a running job advances
  const COVERAGE_AUTO_READ_MS = 5 * 60_000;    // GET-only while the panel is open and visible
  const REFRESH_MAX_POLLS = 720;                // one hour of polling at most per panel opening
  const JOB_STATES = ['RUNNING', 'COMPLETE', 'PARTIAL', 'FAILED', 'SUPERSEDED', 'INTERRUPTED'];
  const JOB_STATE_TEXT = { RUNNING: 'acquisizione in corso', COMPLETE: 'acquisizione completata',
    PARTIAL: 'acquisizione parziale (alcuni titoli in errore)', FAILED: 'acquisizione fallita',
    SUPERSEDED: 'sostituita (universo cambiato)', INTERRUPTED: 'interrotta (durata massima superata)' };
  const FRESHNESS_TEXT = { CURRENT_JOB: 'acquisita nel job corrente', CURRENT_JOB_NO_IV: 'job corrente: nessuna IV',
    PREVIOUS_ONLY: 'non ancora aggiornata nel job corrente', NONE: 'mai acquisita' };
  // A job object as the backend returns it, or null when it is not one: every field the panel shows is checked.
  function checkRefreshJob(job) {
    const p = job && job.progress;
    const n = v => Number.isSafeInteger(v) && v >= 0;
    return job && typeof job.jobId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(job.jobId) && JOB_STATES.includes(job.state) &&
      job.universe && DIGEST.test(String(job.universe.digest)) && p && ['total', 'processed', 'pending', 'retrying', 'done',
      'failed', 'ivAvailable', 'ivUnavailable', 'errors'].every(k => n(p[k])) && p.processed <= p.total ? job : null;
  }
  // A panel opening may start/join an IV job, but never automatically run another
  // acquisition once a completed current job already has a temporally comparable
  // IV observation. Legacy/pilot-only backend responses do not trigger POSTs.
  // This is a DEV-only opt-in action from the panel opening; periodic GETs are read-only.
  function shouldAutoAcquireIv(data) {
    const refresh = data?.ivRefresh;
    if (!refresh || refresh.enabled !== true || refresh.available !== true ||
        !DIGEST.test(String(data?.universe?.digest))) return false;
    if (refresh.jobState === 'RUNNING') return true; // join, never create another parallel job
    return !((data.rows || []).some(r => r.ivRef?.status === 'AVAILABLE' &&
      r.ivRef?.acquisition?.freshness === 'CURRENT_JOB' &&
      r.ivRef?.timing?.policyVersion === 'IV_RV_TIMING_V1' &&
      r.ivRef?.timing?.comparable === true));
  }

  // What the refresh did for THIS opening, in words: a reused job is never presented as a new acquisition.
  function renderRefreshStatus(job, meta) {
    meta = meta || {};
    if (!job) return '<p class="error">' + esc(meta.error || 'Stato del refresh IV non verificabile.') + '</p>';
    const p = job.progress;
    const origin = meta.created ? 'Nuova acquisizione IV avviata.'
      : meta.reused === 'ACTIVE' ? 'Acquisizione IV già in corso: pannello ricollegato allo stesso job.'
      // After «Nuova acquisizione IV» (force) the backend reuses a job finished less than 60 s ago: say so, without
      // inviting the click that was just made. The panel's own opening keeps the ordinary reuse wording.
      : meta.reused === 'RECENT' && meta.force ? 'Nessuna nuova acquisizione: l’ultima acquisizione IV è terminata da meno' +
        ' di 60 secondi (job concluso il ' + esc(job.finishedAt || '—') + '). Per evitare richieste duplicate vengono' +
        ' mostrati i risultati già disponibili; una nuova acquisizione potrà essere richiesta al termine di questo intervallo.'
      : meta.reused === 'RECENT' ? 'Nessuna nuova acquisizione: riuso del job concluso il ' + esc(job.finishedAt || '—') +
        ' (concluso da meno dell’intervallo minimo del backend). Usa «Nuova acquisizione IV» per richiederne una.' : '';
    return '<section class="refresh" aria-label="Refresh IV Ref intero universo"><p><strong>IV Ref intero universo · ' +
      esc(JOB_STATE_TEXT[job.state] || job.state) + '</strong> · job <code>' + esc(job.jobId.slice(0, 8)) + '…</code> · richiesto ' +
      esc(job.requestedAt || '—') + (job.finishedAt ? ' · concluso ' + esc(job.finishedAt) : '') + '</p>' +
      (origin ? '<p class="info">' + origin + '</p>' : '') +
      '<p>Elaborati <strong>' + esc(p.processed) + '/' + esc(p.total) + '</strong> · con IV valida <strong>' + esc(p.ivAvailable) +
      '</strong> · senza IV ' + esc(p.ivUnavailable) + ' · errori ' + esc(p.errors) +
      (p.retrying ? ' · in nuovo tentativo ' + esc(p.retrying) : '') + (p.pending ? ' · in attesa ' + esc(p.pending) : '') + '</p>' +
      (job.state === 'RUNNING' && job.backoffUntil ? '<p class="warn">Limite del provider: pausa fino a ' + esc(job.backoffUntil) + '</p>' : '') +
      '<p class="note">Processati = titoli con un esito (IV, nessuna IV o errore), non titoli con IV verificata. L’orario di acquisizione' +
      ' è quello di APEX: Tastytrade non attesta quando ha aggiornato la singola IV.</p></section>';
  }

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
  // The backend's multi-tenor values are independent of legacy IV Ref. The nominal target is NOT the actual DTE.
  const TENOR_TARGETS = Object.freeze([20, 40, 60]);
  const TENOR_STATES = ['AVAILABLE', 'UNAVAILABLE', 'NOT_OBSERVED', 'NOT_YET_OBSERVED', 'NOT_CURRENT', 'ERROR'];
  const TENOR_EXPIRATION_TYPES = ['Regular', 'Weekly', 'Quarterly', 'End-Of-Month'];
  const tenorOf = (row, target) => row?.ivTenors?.['iv' + target] ?? null;
  function validTenors(row) {
    if (row.ivTenors === undefined) return true; // older backend / pilot / legacy job: no fabricated data
    const t = row.ivTenors;
    if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).sort().join(',') !== 'iv20,iv40,iv60')
      return false;
    return TENOR_TARGETS.every(n => {
      const v = t['iv' + n];
      if (!v || v.targetDte !== n || !TENOR_STATES.includes(v.status) ||
          !Array.isArray(v.sharedWithTargets) || v.sharedWithTargets.some(x => !TENOR_TARGETS.includes(x) || x === n) ||
          (v.jobId != null && typeof v.jobId !== 'string')) return false;
      if (v.status === 'AVAILABLE')
        return num(v.value) !== null && v.value > 0 && Number.isSafeInteger(v.selectedDte) && v.selectedDte > 0 &&
          DAY.test(String(v.selectedExpiration)) && TENOR_EXPIRATION_TYPES.includes(v.expirationType) &&
          v.optionChainType === 'Standard' && v.reason == null;
      return v.value === null && (v.reason === null || typeof v.reason === 'string');
    });
  }

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
    TENOR_NOT_OBSERVED_IN_JOB: 'nessuna osservazione di questa scadenza nel job corrente',
    IV_REFRESH_IN_PROGRESS: 'acquisizione del simbolo non ancora conclusa',
    IV_REFRESH_JOB_NOT_CURRENT: 'acquisizione interrotta o sostituita: non è un valore corrente',
    IV_REFRESH_TENOR_TABLE_MISSING: 'tabella delle IV per scadenza assente nello store',
    IV_REFRESH_TENOR_READ_FAILED: 'errore di lettura delle IV per scadenza; IV Ref legacy separata',
    IV_REFRESH_TENOR_IDENTITY_INVALID: 'identità o digest della riga tenor non coerente con il job',
    IV_REFRESH_TENOR_OBSERVATION_INVALID: 'osservazione tenor persistita non valida',
    CHAIN_INVALID_PROVIDER_DATA: 'struttura catena Standard non valida',
    NO_STANDARD_EXPIRY: 'nessuna scadenza Standard utilizzabile',
    NO_IV_FOR_SELECTED_EXPIRY: 'IV assente per la scadenza esatta selezionata',
    AMBIGUOUS_IV_MATCH: 'più IV indistinguibili per la scadenza selezionata',
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
          !row.spreads.ivMinusRv60Pp || !Array.isArray(row.reasons) || !row.asOf || !validTenors(row))
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
    // A running refresh job progresses while the pages are read: stated by its own warnings, not as a source change.
    const withoutDigest = p => JSON.stringify(Object.assign({}, p.sources, p.sources && p.sources.ivPilot
      ? { ivPilot: Object.assign({}, p.sources.ivPilot, { digest: null }) } : {}, { ivRefresh: null }));
    const refreshOf = p => (p.sources && p.sources.ivRefresh) || null;
    let offset = 0;
    for (const page of pages) {
      checkPage(page, offset, digest);
      if (page.asOfSessionDate !== first.asOfSessionDate || page.ivAsOfDate !== first.ivAsOfDate)
        throw Error('COVERAGE_DATES_CHANGED_DURING_READ');
      if (pilotDigest(page) !== pilotDigest(first)) warn('IV_PILOT_CHANGED_DURING_READ');
      if (withoutDigest(page) !== withoutDigest(first)) warn('SOURCES_CHANGED_DURING_READ');
      const r0 = refreshOf(first), r1 = refreshOf(page);
      if ((r0 && r0.jobId) !== (r1 && r1.jobId)) warn('IV_REFRESH_JOB_CHANGED_DURING_READ');
      else if (r0 && r1 && JSON.stringify(r0.progress) !== JSON.stringify(r1.progress)) warn('IV_REFRESH_PROGRESSED_DURING_READ');
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
      ivRefresh: refreshOf(last),
      atomic: pages.every(p => p.snapshot && p.snapshot.atomic === true),
    };
  }


  // The Yang-Zhang endpoint is read-only and calculated on the backend. Its page
  // must match EACH Coverage symbol and date, not just the universe digest:
  // neither page family is an atomic snapshot, so fail closed on drift.
  function checkYangZhangPage(page, offset, coverage) {
    const u = page?.universe;
    if (!page || page.ok !== true || page.auditVersion !== YZ_AUDIT_VERSION ||
        page.readOnly !== true || page.certified !== false || page.notForTrading !== true ||
        page.executionAuthorized !== false || typeof page.formulaVersion !== 'string' ||
        page.rv40DiagnosticVersion !== RV40_DIAGNOSTIC_VERSION ||
        !u || u.digest !== coverage.universe.digest || u.count !== coverage.rows.length ||
        page.asOfSessionDate !== coverage.asOfSessionDate ||
        page.offset !== offset || page.limit !== PAGE_SIZE ||
        !Array.isArray(page.rows) || page.returned !== page.rows.length ||
        page.rows.length !== Math.min(PAGE_SIZE, coverage.rows.length - offset) ||
        page.nextOffset !== (offset + page.rows.length < coverage.rows.length ? offset + page.rows.length : null))
      throw Error('YANG_ZHANG_PAGE_INCONSISTENT_AT_' + offset);
    page.rows.forEach((r, i) => {
      const expected = coverage.rows[offset + i];
      if (!r || r.symbol !== expected.symbol || r.universePosition !== offset + i ||
          ![null, 'CANDLE_READ_FAILED'].includes(r.readError) ||
          (r.readError === null && r.asOfSessionDate !== coverage.asOfSessionDate))
        throw Error('YANG_ZHANG_ROW_MISMATCH_AT_' + (offset + i));
      if (r.readError !== null && (r.rv20YZ !== null || r.rv60YZ !== null || r.rv40YZ !== null || r.cc !== null))
        throw Error('YANG_ZHANG_FAILED_ROW_WITH_VALUE');
      if (r.readError === null) for (const n of [20, 40, 60]) {
        const w = r['rv' + n + 'YZ'];
        if (!w || !YZ_STATES.includes(w.status) ||
            (w.status === 'PRELIMINARY' && (num(w.value) === null || w.value <= 0)) ||
            (w.status !== 'PRELIMINARY' && w.value !== null) ||
            (w.status === 'BLOCKED_SESSION_POLICY' && num(w.mathematicalValue) === null))
          throw Error('YANG_ZHANG_WINDOW_INVALID_' + r.symbol + '_' + n);
      }
      if (r.readError === null) {
        const cc = r.cc;
        if (!cc || typeof cc !== 'object' ||
            !(cc.error === 'CC_REPORT_FAILED' && cc.rv40 === undefined) &&
            (!cc.rv40 || !['PRELIMINARY','EXPLORATORY_UNVERIFIED_SESSION_POLICY','UNAVAILABLE'].includes(cc.rv40.status) ||
              (cc.rv40.status !== 'UNAVAILABLE' && (num(cc.rv40.value) === null || cc.rv40.value < 0)) ||
              (cc.rv40.status === 'UNAVAILABLE' && cc.rv40.value !== null)))
          throw Error('YANG_ZHANG_RV40_CC_WINDOW_INVALID_' + r.symbol);
      }
    });
    return page;
  }

  // Atomic frontend join: validate ALL Yang-Zhang pages before modifying any
  // Coverage row. Never fill missing YZ from Close-to-Close, nor recompute IV−YZ.
  function attachYangZhangPages(coverage, pages) {
    if (!Array.isArray(pages) || pages.length !== Math.ceil(coverage.rows.length / PAGE_SIZE))
      throw Error('YANG_ZHANG_PAGES_INCOMPLETE');
    let offset = 0, formulaVersion = null;
    const rows = [];
    for (const page of pages) {
      checkYangZhangPage(page, offset, coverage);
      if (formulaVersion !== null && page.formulaVersion !== formulaVersion)
        throw Error('YANG_ZHANG_FORMULA_CHANGED_DURING_READ');
      formulaVersion = page.formulaVersion;
      rows.push(...page.rows);
      offset += page.rows.length;
    }
    if (offset !== coverage.rows.length || pages.at(-1).nextOffset !== null)
      throw Error('YANG_ZHANG_UNIVERSE_INCOMPLETE');
    for (let i = 0; i < rows.length; i++) coverage.rows[i].yangZhang = rows[i];
    coverage.yangZhang = { status: 'READY', formulaVersion, auditVersion: YZ_AUDIT_VERSION,
      asOfSessionDate: coverage.asOfSessionDate, generatedFrom: pages[0].generatedAt,
      generatedTo: pages.at(-1).generatedAt, readError: null };
    return coverage;
  }
  const yzWindow = (row, n) => row?.yangZhang?.['rv' + n + 'YZ'] ?? null;
  const cc40Window = row => row?.yangZhang?.cc?.rv40 ?? null;
  function cc40Cell(row, status='NOT_READ') {
    if (status !== 'READY') return '<span class="na">—</span><div class="sub">Close-to-Close RV40: ' +
      esc(status === 'LOADING' ? 'lettura in corso' : status === 'ERROR' ? 'errore lettura' : 'non letta') + '</div>';
    if (row?.yangZhang?.readError) return '<span class="na">—</span><div class="sub">candele non leggibili</div>';
    const w=cc40Window(row);
    if (!w) return '<span class="na">—</span><div class="sub">non disponibile</div>';
    if (w.status === 'PRELIMINARY' || w.status === 'EXPLORATORY_UNVERIFIED_SESSION_POLICY')
      return '<strong>' + esc(formatPct(w.value)) + '</strong><div class="sub">' +
        (w.status === 'PRELIMINARY' ? 'Close-to-Close · preliminare, non certificata'
          : 'Close-to-Close · esplorativa, non confrontabile') + '</div>';
    return '<span class="na">—</span><div class="sub">dati insufficienti o anomali</div>' +
      (w.reason ? '<div class="sub"><code>' + esc(w.reason) + '</code></div>' : '');
  }
  function yangZhangCell(row, n, status = 'NOT_READ') {
    if (status !== 'READY') return '<span class="na">—</span><div class="sub">Yang–Zhang: ' +
      esc(status === 'LOADING' ? 'lettura in corso' : status === 'ERROR' ? 'errore lettura' : 'non letta') + '</div>';
    if (row?.yangZhang?.readError) return '<span class="na">—</span><div class="sub">candele non leggibili</div>';
    const w = yzWindow(row, n);
    if (!w) return '<span class="na">—</span><div class="sub">non disponibile</div>';
    if (w.status === 'PRELIMINARY')
      return '<strong>' + esc(formatPct(w.value)) + '</strong><div class="sub">Yang–Zhang · preliminare, non certificata</div>';
    return '<span class="na">—</span><div class="sub">' +
      esc(w.status === 'BLOCKED_SESSION_POLICY' ? 'solo valore matematico · policy esclusa'
        : 'dati insufficienti o anomali') + '</div>' +
      (w.reason ? '<div class="sub"><code>' + esc(w.reason) + '</code></div>' : '');
  }
  // Indicative comparison only. IV40 has CALENDAR DTE; RV40 uses TRADING sessions.
  // Never feed this into the original Coverage classification, spreads or execution.
  const SPREAD40_HORIZON = 'CALENDAR_DTE_NOMINAL_PAIRING_WITH_TRADING_SESSION_RV';
  function spread40Diagnostic(row, estimator, readStatus='NOT_READ') {
    const no=reason=>({status:'UNAVAILABLE',reason,valuePp:null});
    if(readStatus!=='READY')return no('RV40_READ_'+readStatus);
    const iv=tenorOf(row,40);
    if(!iv||iv.status!=='AVAILABLE'||num(iv.value)===null||iv.value<=0)
      return no(iv?'IV40_'+iv.status:'IV40_NOT_EXPOSED');
    if(iv.targetDte!==40||iv.optionChainType!=='Standard'||iv.horizonBasis!==SPREAD40_HORIZON||
       !Number.isSafeInteger(iv.selectedDte)||iv.selectedDte<=0||
       typeof iv.selectedExpiration!=='string'||!DAY.test(iv.selectedExpiration)||
       typeof iv.asOfDate!=='string'||!DAY.test(iv.asOfDate))
      return no('IV40_PROVENANCE_UNVERIFIED');
    const ref=row?.ivRef, timing=ref?.timing;
    // Backend temporal comparability belongs to IV Ref. Reuse it only for an
    // IV40 fetched at precisely the SAME instant; never infer it from metrics.
    if(!timing||timing.policyVersion!=='IV_RV_TIMING_V1'||timing.comparable!==true||
       ref?.observedAt!==iv.observedAt||!iv.observedAt||Number.isNaN(Date.parse(iv.observedAt))||
       iv.asOfDate!==row?.asOf?.ivAsOfDate)
      return no('IV40_RV_TIMING_NOT_VERIFIED');
    if(row?.yangZhang?.asOfSessionDate!==row?.asOf?.rvSessionDate)
      return no('RV40_SESSION_MISMATCH');
    const w=estimator==='CC'?cc40Window(row):estimator==='YZ'?yzWindow(row,40):null;
    if(!w||w.status!=='PRELIMINARY'||num(w.value)===null||w.value<0)
      return no('RV40_'+(w?.status||'UNAVAILABLE'));
    return {status:'INDICATIVE',reason:null,valuePp:100*(iv.value-w.value),
      actualDte:iv.selectedDte,rvReturns:40,comparisonBasis:SPREAD40_HORIZON};
  }
  function spread40Cell(row,estimator,readStatus) {
    const x=spread40Diagnostic(row,estimator,readStatus);
    if(x.valuePp===null)
      return '<span class="na">—</span><div class="sub"><code>'+esc(x.reason)+'</code></div>';
    return '<strong class="sp '+spreadClass(x.valuePp)+'">'+esc(formatPp(x.valuePp))+
      '</strong><div class="sub">indicativo · '+esc(x.actualDte)+' DTE calendario / 40 sedute</div>';
  }

  // Nominal DTE IV20/60 paired with 20/60 exchange-session RV: an indicative
  // annualized-volatility comparison, NOT the legacy IV Ref spread or a
  // horizon-matched variance risk premium. No backend changes or acquisition.
  // The same conservative timing and provenance gate used by IV40 applies.
  function tenorSpreadDiagnostic(row, n, estimator, readStatus='NOT_READ') {
    const no=reason=>({status:'UNAVAILABLE',reason,valuePp:null});
    if(![20,60].includes(n)||!['CC','YZ'].includes(estimator))return no('TENOR_SPREAD_PAIR_INVALID');
    if(estimator==='YZ'&&readStatus!=='READY')return no('RV'+n+'_READ_'+readStatus);
    const iv=tenorOf(row,n);
    if(!iv||iv.status!=='AVAILABLE'||num(iv.value)===null||iv.value<=0)
      return no(iv?'IV'+n+'_'+iv.status:'IV'+n+'_NOT_EXPOSED');
    if(iv.targetDte!==n||iv.optionChainType!=='Standard'||iv.horizonBasis!==SPREAD40_HORIZON||
       !Number.isSafeInteger(iv.selectedDte)||iv.selectedDte<=0||
       typeof iv.selectedExpiration!=='string'||!DAY.test(iv.selectedExpiration)||
       typeof iv.asOfDate!=='string'||!DAY.test(iv.asOfDate))
      return no('IV'+n+'_PROVENANCE_UNVERIFIED');
    const ref=row?.ivRef,timing=ref?.timing;
    if(!timing||timing.policyVersion!=='IV_RV_TIMING_V1'||timing.comparable!==true||
       ref?.observedAt!==iv.observedAt||!iv.observedAt||Number.isNaN(Date.parse(iv.observedAt))||
       iv.asOfDate!==row?.asOf?.ivAsOfDate)
      return no('IV'+n+'_RV_TIMING_NOT_VERIFIED');
    if(estimator==='YZ'&&row?.yangZhang?.asOfSessionDate!==row?.asOf?.rvSessionDate)
      return no('RV'+n+'_SESSION_MISMATCH');
    const rv=estimator==='CC'?row?.['rv'+n]:yzWindow(row,n);
    if(estimator==='CC') {
      if(!rv||!['CERTIFIED','PRELIMINARY'].includes(rv.basis)||num(rv.value)===null||rv.value<0)
        return no('RV'+n+'_'+(rv?.basis||'UNAVAILABLE'));
    } else if(!rv||rv.status!=='PRELIMINARY'||num(rv.value)===null||rv.value<0) {
      return no('RV'+n+'_'+(rv?.status||'UNAVAILABLE'));
    }
    return {status:'INDICATIVE',reason:null,valuePp:100*(iv.value-rv.value),
      actualDte:iv.selectedDte,rvReturns:n,comparisonBasis:SPREAD40_HORIZON,
      rvBasis:estimator==='CC'?rv.basis:rv.status};
  }
  function tenorSpreadCell(row,n,estimator,readStatus) {
    const x=tenorSpreadDiagnostic(row,n,estimator,readStatus);
    if(x.valuePp===null)
      return '<span class="na">—</span><div class="sub"><code>'+esc(x.reason)+'</code></div>';
    return '<strong class="sp '+spreadClass(x.valuePp)+'">'+esc(formatPp(x.valuePp))+
      '</strong><div class="sub">indicativo · '+esc(x.actualDte)+' DTE / '+n+' sedute</div>';
  }
  function renderTenorSpreadsDetail(row, joinedYangZhangRow, readStatus) {
    const paired={...row,yangZhang:joinedYangZhangRow?.yangZhang??null};
    const list=[20,60].flatMap(n=>['CC','YZ'].map(est=>{
      const x=tenorSpreadDiagnostic(paired,n,est,readStatus);
      return '<li>IV'+n+' − RV'+n+' '+est+': '+(x.valuePp===null
        ?'<span class="na">—</span> <code>'+esc(x.reason)+'</code>'
        :'<strong class="sp '+spreadClass(x.valuePp)+'">'+esc(formatPp(x.valuePp))+
          '</strong> · IV '+esc(x.actualDte)+' DTE calendario / RV '+n+' sedute · '+
          esc(x.rvBasis))+'</li>';
    })).join('');
    return '<h4>Spread IV20/IV60 per tenor · sola diagnostica</h4>'+
      '<p class="note">IV20/60 usano scadenze con DTE effettivi (giorni di calendario); '+
      'RV20/60 usano rendimenti su sedute di borsa. Orizzonti diversi, confronto solo indicativo, '+
      'non VRP certificato né segnale di trading. Richiesti provenance e timing verificabili, '+
      'RV CC disponibile o Yang–Zhang PRELIMINARY. Nessun fallback alla IV Ref.</p>'+
      '<ul class="reasons">'+list+'</ul>';
  }

  function renderSpread40Detail(row, joinedYangZhangRow, readStatus) {
    // Coverage :symbol detail omits the independent Yang-Zhang result. Reuse
    // only the digest/session/position-verified joined row, NEVER a raw reply.
    const paired={...row,yangZhang:joinedYangZhangRow?.yangZhang??null};
    const items=['CC','YZ'].map(est=>{
      const x=spread40Diagnostic(paired,est,readStatus);
      return '<li>IV40 − RV40 '+est+': '+(x.valuePp===null
        ?'<span class="na">—</span> <code>'+esc(x.reason)+'</code>'
        :'<strong class="sp '+spreadClass(x.valuePp)+'">'+esc(formatPp(x.valuePp))+
          '</strong> · IV '+esc(x.actualDte)+' DTE effettivi / RV 40 sedute')+'</li>';
    }).join('');
    return '<h4>Spread a 40 · sola diagnostica</h4><p class="note">'+
      'IV40: volatilità implicita forward della scadenza selezionata (giorni di calendario); '+
      'RV40: volatilità storica su 40 rendimenti di sedute. Benché entrambe annualizzate, '+
      'gli orizzonti NON coincidono. Confronto indicativo, non premio di rischio realizzato '+
      'né segnale operativo. Serve IV40 del job corrente con controllo temporale verificabile '+
      'e RV40 preliminare non certificata.</p><ul class="reasons">'+items+'</ul>';
  }
  function renderYangZhangGaps(data) {
    if (data?.yangZhang?.status !== 'READY') return '';
    const blocks=[40,60].map(n=>{
      const reasons=new Map();
      let available=0,oneSession=0,unreadable=0;
      for(const row of data.rows){
        const yz=row?.yangZhang;
        if(yz?.readError){unreadable++;continue;}
        const v=yz?.['rv'+n+'YZ'];
        if(v?.status==='PRELIMINARY'){available++;continue;}
        const reason=v?.reason||'RV'+n+'_NOT_READABLE';
        reasons.set(reason,(reasons.get(reason)||0)+1);
        if(reason==='MISSING_COMPLETED_SESSIONS'&&v?.missingSessions===1)oneSession++;
      }
      const items=[...reasons].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
        .map(([reason,count])=>'<li><code>'+esc(reason)+'</code>: <strong>'+esc(count)+'</strong></li>').join('');
      return '<div class="yz-issue"><strong>RV'+n+' Yang–Zhang</strong> · disponibile '+available+'/'+
        data.rows.length+' · assente '+(data.rows.length-available)+
        '<ul class="reasons">'+items+
        (unreadable?'<li>Lettura OHLC non riuscita: '+esc(unreadable)+'</li>':'')+'</ul>'+
        (oneSession?'<p class="note">'+esc(oneSession)+' titoli hanno esattamente una seduta mancante.</p>':'')+'</div>';
    });
    return '<section class="audit-summary" aria-label="Cause valori RV Yang–Zhang mancanti"><h4>Perché mancano RV40/RV60 Yang–Zhang</h4>'+
      '<p class="note">Cause primarie su tutto l’universo, non sui soli titoli filtrati. Nessun valore mancante stimato. '+ 
      'Le date delle sedute assenti richiedono una lettura per simbolo.</p>'+
      '<div class="yz-issue-grid">'+blocks.join('')+'</div></section>';
  }
  function renderYangZhangStatus(data) {
    const yz = data?.yangZhang;
    if (!yz || yz.status === 'LOADING') return 'RV40 CC e RV20/40/60 Yang–Zhang: lettura separata in corso (solo GET).';
    if (yz.status !== 'READY') return 'RV40 CC e Yang–Zhang RV20/40/60: non disponibili · ' + String(yz.readError || 'lettura fallita');
    const counts = [20, 40, 60].map(n => data.rows.filter(r => yzWindow(r, n)?.status === 'PRELIMINARY').length);
    const cc40 = data.rows.filter(r => cc40Window(r)?.status === 'PRELIMINARY').length;
    return 'Close-to-Close RV40 ' + cc40 + '/' + data.rows.length + ' · Yang–Zhang: RV20 ' + counts[0] + '/' + data.rows.length +
      ', RV40 ' + counts[1] + '/' + data.rows.length + ' e RV60 ' + counts[2] + '/' + data.rows.length +
      ' preliminari; lettura sequenziale non atomica, non certificate e non usate negli spread IV−RV Close-to-Close.';
  }
  // Coverage detail API has NO top-level asOfSessionDate. Its session is
  // detail.row.asOf.rvSessionDate. Pin against the actual backend contract,
  // including universe digest, position, identity and matching row session.
  function matchingYangZhangRowForDetail(detail, coverage) {
    if (!detail || !coverage || detail.universe?.digest !== coverage.universe?.digest ||
        detail.universe?.count !== coverage.rows.length ||
        detail.row?.symbol !== detail.symbol ||
        detail.row?.universePosition !== detail.universePosition ||
        detail.row?.asOf?.rvSessionDate !== coverage.asOfSessionDate) return null;
    return coverage.rows.find(r => r.symbol === detail.symbol &&
      r.universePosition === detail.universePosition &&
      r.asOf?.rvSessionDate === coverage.asOfSessionDate) ?? null;
  }
  function renderYangZhangDetail(row, state) {
    return '<h4>RV40 Close-to-Close (41 chiusure 1D)</h4>' + '<div>RV40 CC: ' + cc40Cell(row, state) + '</div>' +
      '<h4>RV Yang–Zhang (OHLC giornalieri)</h4>' +
      '<p class="note">Stimatore alternativo alla RV Close-to-Close. Risultati diagnostici, non certificati. ' +
      'Gli spread IV−RV visualizzati sopra restano quelli calcolati dal backend sulla RV Close-to-Close.</p>' +
      '<div>RV20 YZ: ' + yangZhangCell(row, 20, state) + '</div>' +
      '<div>RV40 YZ: ' + yangZhangCell(row, 40, state) + '</div>' +
      '<div>RV60 YZ: ' + yangZhangCell(row, 60, state) + '</div>' +
      ohlcDiagnosticButton(row,state);
  }


  // Full OHLC incompatibility dates are already exposed by the existing
  // backend DEV Yang-Zhang :symbol GET; no provider fetch, store write, repair,
  // fallback or price adjustment. This optional detail read is user-initiated.
  const YZ_OHLC_REASON='OHLC_INCOMPATIBLE_WITH_YANG_ZHANG';
  const YZ_OHLC_SHAPES=new Set(['CLOSE_BELOW_LOW','CLOSE_ABOVE_HIGH','OPEN_OUTSIDE_RANGE','LOW_ABOVE_HIGH']);
  const PRICE_BASIS_STRUCTURAL_ISSUES=new Set(['NOT_POSITIVE_OR_NON_FINITE_PRICE','LOW_ABOVE_HIGH','OPEN_OUTSIDE_RANGE']);
  function ohlcDiagnosticButton(row,state) {
    if(state!=='READY'||!row?.yangZhang||!SYMBOL.test(row.symbol)||
       ![20,40,60].some(n=>row.yangZhang['rv'+n+'YZ']?.reason===YZ_OHLC_REASON))return '';
    return '<p><button type="button" data-yz-ohlc-symbol="'+esc(row.symbol)+'">'+
      'Analizza sedute OHLC e dividendi (sola lettura)</button></p>'+
      '<div data-yz-ohlc-results></div>';
  }
  // The backend price-basis report is richer than the bare YZ blocked sessions:
  // exact session, deviation, materiality, the dividend checkpoint state and
  // evidence. It remains purely diagnostic; classification tolerance NEVER
  // changes the strict Yang–Zhang eligibility or stored OHLC values.
  function renderPriceBasisOhlcAudit(reply,coverage,joined) {
    const invalid=()=>{throw Error('PRICE_BASIS_DETAIL_INCONSISTENT');};
    const audit=reply?.report, prior=joined?.yangZhang;
    if(!coverage||coverage.yangZhang?.status!=='READY'||!joined||!prior||!reply||
       reply.ok!==true||reply.readOnly!==true||reply.certified!==false||
       reply.changesPrices!==false||reply.notForTrading!==true||
       reply.version!==PRICE_BASIS_VERSION||reply.universe?.digest!==coverage.universe?.digest||
       reply.universe?.count!==coverage.rows.length||reply.asOfSessionDate!==coverage.asOfSessionDate||
       !audit||audit.version!==PRICE_BASIS_VERSION||audit.readOnly!==true||
       audit.certified!==false||audit.changesPrices!==false||audit.symbol!==joined.symbol||
       audit.asOfSessionDate!==coverage.asOfSessionDate||audit.readError!==null)
      invalid();
    if(!coverage.rows.some(r=>r===joined&&r.symbol===audit.symbol&&
       r.universePosition===joined.universePosition&&r.asOf?.rvSessionDate===coverage.asOfSessionDate))
      invalid();
    for(const n of [20,60]){
      const win=audit['rv'+n],snap=prior['rv'+n+'YZ'];
      if(!win||!snap||!win.yz||
         win.windowFrom!==snap.windowFrom||win.windowThrough!==snap.windowThrough||
         win.yz.status!==snap.status||win.yz.reason!==snap.reason||
         win.yz.inputDigest!==snap.inputDigest||
         !Array.isArray(win.sessions)||win.sessions.length>n+1)
        invalid();
    }
    const win40=prior.rv40YZ;
    if(!win40||!DAY.test(String(win40.windowFrom))||!DAY.test(String(win40.windowThrough))||
       win40.windowFrom<audit.rv60.windowFrom||win40.windowThrough!==audit.rv60.windowThrough)
      invalid();
    const arr=audit.rv60.sessions,seen=new Set(),buckets={20:0,40:0,60:0};
    const observed=[];
    for(const item of arr){
      if(!item||typeof item.sessionDate!=='string'||!DAY.test(item.sessionDate)||
         item.sessionDate<audit.rv60.windowFrom||item.sessionDate>audit.rv60.windowThrough||
         seen.has(item.sessionDate)||!['MINOR','MATERIAL','STRUCTURAL'].includes(item.kind)||
         item.yzStrictOhlcValid!==false||
         (item.kind==='STRUCTURAL' && !PRICE_BASIS_STRUCTURAL_ISSUES.has(item.structuralIssue))||
         (item.kind!=='STRUCTURAL' && (!YZ_OHLC_SHAPES.has(item.side)||
           num(item.deviation)===null||item.deviation<0||
           num(item.reference)===null||item.reference<=0||
           num(item.relativeDeviation)===null||item.relativeDeviation<0)))
        invalid();
      seen.add(item.sessionDate);
      const in20=item.sessionDate>=audit.rv20.windowFrom && item.sessionDate<=audit.rv20.windowThrough;
      const in40=item.sessionDate>=win40.windowFrom && item.sessionDate<=win40.windowThrough;
      buckets[60]++;if(in40)buckets[40]++;if(in20)buckets[20]++;
      observed.push({item,in20,in40});
    }
    // The existing report independently evaluates RV20, using the identical
    // stored 1D sessions. An inconsistent cross-window read must fail closed.
    const in20From60=new Map(observed.filter(x=>x.in20).map(x=>[x.item.sessionDate,x.item]));
    if(audit.rv20.sessions.length!==in20From60.size||
       audit.rv20.sessions.some(x=>!in20From60.has(x.sessionDate)||
         x.kind!==in20From60.get(x.sessionDate).kind||
         x.yzStrictOhlcValid!==false))
      invalid();
    for(const n of [20,40,60]){
      if(prior['rv'+n+'YZ']?.reason===YZ_OHLC_REASON && buckets[n]===0)
        invalid();
    }
    if(!observed.length)invalid();
    const dateRows=observed.sort((a,b)=>a.item.sessionDate.localeCompare(b.item.sessionDate))
      .map(({item,in20,in40})=>{
        const shape=item.kind==='STRUCTURAL'?item.structuralIssue:item.side;
        const deviation=item.kind==='STRUCTURAL'?'—':String(item.deviation)+' USD';
        const bp=item.kind==='STRUCTURAL'?'—':String(item.relativeDeviation*10000)+' bp';
        const finding=item.finding;
        const divEvidence=item.dividendEvidence??'NON_VALUTATA';
        const dividendNote=finding
          ?divEvidence+' · importo '+String(finding.amount??'—')+
            ' · data evento '+String(finding.eventDate??'—')
          :divEvidence;
        return '<tr><td><code>'+esc(item.sessionDate)+'</code></td><td>'+
          esc(shape)+'</td><td>'+esc(item.kind)+'</td><td>'+
          esc(deviation)+'</td><td>'+esc(bp)+'</td><td>'+
          esc([...(in20?['20']:[]),...(in40?['40']:[]),'60'].join('/'))+'</td><td>'+
          esc(dividendNote)+'</td></tr>';
      }).join('');
    return '<section class="audit-detail" data-yz-ohlc-diagnostic>'+
      '<h4>'+esc(joined.symbol)+' · qualità OHLC e base prezzi 1D</h4>'+
      '<p class="warn">'+observed.length+' sedute anomale distinte. Nelle finestre: RV20 '+buckets[20]+
      ', RV40 '+buckets[40]+', RV60 '+buckets[60]+
      '. Le finestre si sovrappongono: non sommare i conteggi.</p>'+
      '<p class="note">Checkpoint dividendi: '+esc(audit.evidence?.dividendCheckpoint?.state??'NON_DISPONIBILE')+
      '. MINOR: deviazione fino a 0,05 USD E 5 bp; MATERIAL oltre almeno una soglia. '+
      'Anche MINOR resta incompatibile con lo Yang–Zhang rigoroso.</p>'+
      '<div class="scroll"><table><thead><tr><th>Sessione NY</th><th>Forma OHLC</th>'+
      '<th>Entità</th><th>Scostamento</th><th>Scostamento bp</th>'+
      '<th>RV YZ</th><th>Evidenza dividendo</th></tr></thead><tbody>'+
      dateRows+'</tbody></table></div>'+
      '<p class="note">Il report è read-only e non restituisce tutti i prezzi OHLC originali. '+
      'La compatibilità numerica con un dividendo NON attesta la data ex-dividendo o la base prezzi. '+
      'Nessuna correzione, acquisizione o nuova politica di recupero è stata eseguita.</p></section>';
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
    rv20YZ: r => yzWindow(r, 20)?.status === 'PRELIMINARY' ? num(yzWindow(r, 20).value) : null,
    rv40CC: r => cc40Window(r)?.status === 'PRELIMINARY' ? num(cc40Window(r).value) : null,
    rv40YZ: r => yzWindow(r, 40)?.status === 'PRELIMINARY' ? num(yzWindow(r, 40).value) : null,
    spread40CC: r => spread40Diagnostic(r,'CC','READY').valuePp,
    spread40YZ: r => spread40Diagnostic(r,'YZ','READY').valuePp,
    spread20TenorCC: r => tenorSpreadDiagnostic(r,20,'CC','READY').valuePp,
    spread20TenorYZ: r => tenorSpreadDiagnostic(r,20,'YZ','READY').valuePp,
    spread60TenorCC: r => tenorSpreadDiagnostic(r,60,'CC','READY').valuePp,
    spread60TenorYZ: r => tenorSpreadDiagnostic(r,60,'YZ','READY').valuePp,
    rv60YZ: r => yzWindow(r, 60)?.status === 'PRELIMINARY' ? num(yzWindow(r, 60).value) : null,
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
  // Acquisition provenance of refresh rows, appended after every pre-existing column. `iv_ref_from_current_job` says
  // whether iv_ref is this job's own observation; the last earlier IV is exported separately, as history.
  const acq = r => (r.ivRef && r.ivRef.acquisition) || {};
  const ACQUISITION_COLUMNS = [
    ['iv_mode', (r, d) => ((d.sources || {}).ivMode) || 'IV_PILOT'],
    ['iv_refresh_job_id', (r, d) => acq(r).jobId ?? ((d.ivRefresh || {}).jobId ?? null)],
    ['iv_refresh_job_state', (r, d) => acq(r).jobState ?? ((d.ivRefresh || {}).jobState ?? null)],
    ['iv_refresh_snapshot_complete', (r, d) => (d.ivRefresh ? !['RUNNING'].includes(d.ivRefresh.jobState) &&
      !(d.warnings || []).some(w => /^IV_REFRESH_/.test(w)) : null)],
    ['iv_ref_from_current_job', r => (r.ivRef && r.ivRef.acquisition ? acq(r).freshness === 'CURRENT_JOB' : null)],
    ['iv_freshness', r => acq(r).freshness ?? null],
    ['iv_requested_at', r => acq(r).requestedAt ?? null], ['iv_fetched_at', r => acq(r).fetchedAt ?? null],
    ['iv_provider_as_of', r => acq(r).providerAsOf ?? null], ['iv_provider_as_of_field', r => acq(r).providerAsOfField ?? null],
    ['iv_chain_fetched_at', r => acq(r).chainFetchedAt ?? null], ['iv_error_class', r => acq(r).errorClass ?? null],
    ['iv_selection_version', r => acq(r).selectionVersion ?? null], ['iv_policy_version', r => acq(r).policyVersion ?? null],
    ['iv_timing_policy_version', r => acq(r).timingPolicyVersion ?? null],
    ['iv_timing_comparable', r => (r.ivRef && r.ivRef.timing ? r.ivRef.timing.comparable : null)],
    ['iv_timing_basis', r => (r.ivRef && r.ivRef.timing ? r.ivRef.timing.basis : null)],
    ['iv_timing_reason', r => (r.ivRef && r.ivRef.timing ? r.ivRef.timing.reason : null)],
    ['iv_provider_update_attested', r => (r.ivRef && r.ivRef.timing ? r.ivRef.timing.providerUpdateAttested : null)],
    ['iv_last_successful', r => (acq(r).lastSuccessful ? num(acq(r).lastSuccessful.iv) : null)],
    ['iv_last_successful_fetched_at', r => (acq(r).lastSuccessful ? acq(r).lastSuccessful.fetchedAt : null)],
    ['iv_last_successful_job_id', r => (acq(r).lastSuccessful ? acq(r).lastSuccessful.jobId : null)],
  ];
  // Append after all existing columns so established CSV positions remain stable.
  // Keep the backend decimals, dates and exact expiry metadata; never infer a tenor from IV Ref.
  const TENOR_CSV_FIELDS = [
    ['value', t => num(t.value)], ['status', t => t.status], ['reason', t => t.reason],
    ['target_dte', t => t.targetDte], ['actual_dte', t => t.selectedDte],
    ['expiration', t => t.selectedExpiration], ['expiration_type', t => t.expirationType],
    ['option_chain_type', t => t.optionChainType], ['settlement_type', t => t.settlementType],
    ['source', t => t.source], ['selection_version', t => t.selectionVersion],
    ['policy_version', t => t.policyVersion], ['horizon_basis', t => t.horizonBasis],
    ['job_id', t => t.jobId], ['as_of_date', t => t.asOfDate], ['observed_at', t => t.observedAt],
    ['requested_at', t => t.requestedAt], ['provider_as_of', t => t.providerAsOf],
    ['shared_with_targets', t => Array.isArray(t.sharedWithTargets) ? t.sharedWithTargets.join('|') : null],
    ['chain_fetched_at', t => t.chainFetchedAt],
  ];
  const TENOR_CSV_COLUMNS = TENOR_TARGETS.flatMap(n => TENOR_CSV_FIELDS.map(([name, read]) => [
    'iv' + n + '_' + name, row => { const t = tenorOf(row, n); return t ? read(t) : null; },
  ]));

  // Append-only Yang-Zhang CSV block: no substitution for the established CC columns.
  const YZ_CSV_COLUMNS = [
    ['yz_read_status', (r, d) => d.yangZhang?.status ?? 'NOT_READ'],
    ['yz_read_error', (r, d) => d.yangZhang?.readError ?? null],
    ['yz_formula_version', (r, d) => d.yangZhang?.formulaVersion ?? null],
    ['yz_generated_from', (r, d) => d.yangZhang?.generatedFrom ?? null],
    ['yz_generated_to', (r, d) => d.yangZhang?.generatedTo ?? null],
    ['yz_session_date', (r, d) => r.yangZhang?.asOfSessionDate ?? null],
    ...[20, 60].flatMap(n => [
      ['rv' + n + '_yz', r => yzWindow(r, n)?.status === 'PRELIMINARY' ? num(yzWindow(r, n)?.value) : null],
      ['rv' + n + '_yz_status', r => yzWindow(r, n)?.status ?? null],
      ['rv' + n + '_yz_reason', r => yzWindow(r, n)?.reason ?? null],
      ['rv' + n + '_yz_mathematical_diagnostic', r => yzWindow(r, n)?.status === 'BLOCKED_SESSION_POLICY'
        ? num(yzWindow(r, n)?.mathematicalValue) : null],
      ['rv' + n + '_yz_window_from', r => yzWindow(r, n)?.windowFrom ?? null],
      ['rv' + n + '_yz_window_through', r => yzWindow(r, n)?.windowThrough ?? null],
      ['rv' + n + '_yz_returns_used', r => yzWindow(r, n)?.returnsUsed ?? null],
      ['rv' + n + '_yz_missing_sessions', r => yzWindow(r, n)?.missingSessions ?? null],
      ['rv' + n + '_yz_invalid_sessions', r => yzWindow(r, n)?.invalidSessions ?? null],
      ['rv' + n + '_yz_category', r => yzWindow(r, n)?.category ?? null],
    ]),
  ];
  // Exact append-only extension: every previously shipped CSV field retains its
  // position. Neither value is an IV40−RV40 spread or a certified measure.
  const RV40_CSV_COLUMNS = [
    ['rv40_cc', r => ['PRELIMINARY','EXPLORATORY_UNVERIFIED_SESSION_POLICY'].includes(cc40Window(r)?.status)
      ? num(cc40Window(r).value) : null],
    ['rv40_cc_status', r => cc40Window(r)?.status ?? null],
    ['rv40_cc_reason', r => cc40Window(r)?.reason ?? null],
    ['rv40_cc_price_adjustment', r => cc40Window(r)?.priceAdjustment ?? null],
    ...[
      ['rv40_yz', r => yzWindow(r, 40)?.status === 'PRELIMINARY' ? num(yzWindow(r, 40).value) : null],
      ['rv40_yz_status', r => yzWindow(r, 40)?.status ?? null],
      ['rv40_yz_reason', r => yzWindow(r, 40)?.reason ?? null],
      ['rv40_yz_mathematical_diagnostic', r => yzWindow(r, 40)?.status === 'BLOCKED_SESSION_POLICY'
        ? num(yzWindow(r, 40).mathematicalValue) : null],
      ['rv40_yz_window_from', r => yzWindow(r, 40)?.windowFrom ?? null],
      ['rv40_yz_window_through', r => yzWindow(r, 40)?.windowThrough ?? null],
      ['rv40_yz_returns_used', r => yzWindow(r, 40)?.returnsUsed ?? null],
      ['rv40_yz_missing_sessions', r => yzWindow(r, 40)?.missingSessions ?? null],
      ['rv40_yz_invalid_sessions', r => yzWindow(r, 40)?.invalidSessions ?? null],
      ['rv40_yz_category', r => yzWindow(r, 40)?.category ?? null],
    ],
  ];
  // Append only: all existing IV20/40/60, RV20/40/60 and YZ CSV offsets stay fixed.
  const SPREAD40_CSV_COLUMNS = [
    ['iv40_minus_rv40_cc_pp',(r,d)=>spread40Diagnostic(r,'CC',d.yangZhang?.status).valuePp],
    ['iv40_minus_rv40_cc_status',(r,d)=>spread40Diagnostic(r,'CC',d.yangZhang?.status).status],
    ['iv40_minus_rv40_cc_reason',(r,d)=>spread40Diagnostic(r,'CC',d.yangZhang?.status).reason],
    ['iv40_minus_rv40_yz_pp',(r,d)=>spread40Diagnostic(r,'YZ',d.yangZhang?.status).valuePp],
    ['iv40_minus_rv40_yz_status',(r,d)=>spread40Diagnostic(r,'YZ',d.yangZhang?.status).status],
    ['iv40_minus_rv40_yz_reason',(r,d)=>spread40Diagnostic(r,'YZ',d.yangZhang?.status).reason],
  ];
  // Append-only: preserve every previously shipped CSV column index.
  const TENOR_SPREAD_CSV_COLUMNS = [20,60].flatMap(n=>['CC','YZ'].flatMap(est=>{
    const name='iv'+n+'_minus_rv'+n+'_'+est.toLowerCase();
    return [
      [name+'_pp',(r,d)=>tenorSpreadDiagnostic(r,n,est,d.yangZhang?.status).valuePp],
      [name+'_status',(r,d)=>tenorSpreadDiagnostic(r,n,est,d.yangZhang?.status).status],
      [name+'_reason',(r,d)=>tenorSpreadDiagnostic(r,n,est,d.yangZhang?.status).reason],
    ];
  }));
  function toCsv(data, ivCache) {
    const header = CSV_COLUMNS.map(c => c[0]).concat(['iv_market_informational', 'iv_market_source',
      'iv_market_updated_at', 'page_generated_at', 'generated_from', 'generated_to', 'universe_source', 'universe_digest'])
      .concat(ACQUISITION_COLUMNS.map(c => c[0])).concat(TENOR_CSV_COLUMNS.map(c => c[0]))
      .concat(YZ_CSV_COLUMNS.map(c => c[0])).concat(RV40_CSV_COLUMNS.map(c => c[0]))
      .concat(SPREAD40_CSV_COLUMNS.map(c => c[0])).concat(TENOR_SPREAD_CSV_COLUMNS.map(c => c[0]));
    const lines = [header.join(',')];
    for (const row of data.rows) {
      const m = ivMarketOf(row.symbol, ivCache);
      lines.push(CSV_COLUMNS.map(c => csvCell(c[1](row))).concat([
        csvCell(m ? m.value : null), csvCell(m ? m.source : null),
        csvCell(m && m.updatedAt !== null ? new Date(m.updatedAt).toISOString() : null),
        csvCell(data.pageGeneratedAt ? data.pageGeneratedAt[row.symbol] : null),
        csvCell(data.generatedFrom), csvCell(data.generatedTo), csvCell(data.universe.source), csvCell(data.universe.digest),
      ]).concat(ACQUISITION_COLUMNS.map(c => csvCell(c[1](row, data))))
        .concat(TENOR_CSV_COLUMNS.map(c => csvCell(c[1](row))))
        .concat(YZ_CSV_COLUMNS.map(c => csvCell(c[1](row, data))))
        .concat(RV40_CSV_COLUMNS.map(c => csvCell(c[1](row, data))))
        .concat(SPREAD40_CSV_COLUMNS.map(c => csvCell(c[1](row, data))))
        .concat(TENOR_SPREAD_CSV_COLUMNS.map(c => csvCell(c[1](row, data)))).join(','));
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
      '<p class="note">IV Ref: ' + (src.ivMode === 'FULL_UNIVERSE_REFRESH' ? 'refresh intero universo · job <code>' +
        esc(String((data.ivRefresh || {}).jobId || '—').slice(0, 8)) + '…</code> · ' + esc((data.ivRefresh || {}).jobState || '—') +
        ' · policy temporale ' + esc((data.ivRefresh || {}).timingPolicyVersion || '—')
        : 'pilot IV (al massimo 20 titoli)') + '</p>' +
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
    return head + acquisitionCell(iv) +
      (market ? '<div class="sub mkt">IV Market ' + esc(formatPct(market.value)) + ' (informativa)</div>' : '');
  }
  // Display-only tenor cells. No relationship to IV−RV operands or trading signals.
  function tenorCell(row, n) {
    const t = tenorOf(row, n);
    if (!t) return '<strong>—</strong><div class="sub">tenor non esposto</div>';
    if (t.status !== 'AVAILABLE') return '<strong>—</strong><div class="sub">' + esc(t.status) + '</div>' +
      (t.reason ? '<div class="sub">' + reasonHtml(t.reason) + '</div>' : '');
    return '<strong>' + esc(formatPct(t.value)) + '</strong>' +
      '<div class="sub">scad. ' + esc(t.selectedExpiration || '—') + ' · ' +
      esc(t.selectedDte == null ? '—' : t.selectedDte) + ' DTE effettivi</div>' +
      '<div class="sub">' + esc(t.expirationType || '—') + '</div>';
  }
  function renderTenorDetail(row) {
    if (!row.ivTenors) return '';
    const sections = TENOR_TARGETS.map(n => {
      const t = tenorOf(row, n);
      if (!t) return '';
      const state = t.status === 'AVAILABLE' ? ' · ' + esc(formatPct(t.value)) : ' · —' +
        (t.reason ? ' · ' + reasonHtml(t.reason) : '');
      return '<li><strong>IV' + n + ' (target nominale ' + n + ' DTE)</strong>' + state +
        ' · ' + esc(t.status) + ' · scadenza ' + esc(t.selectedExpiration || '—') +
        ' · DTE effettivi ' + esc(t.selectedDte ?? '—') + ' · tipo ' + esc(t.expirationType || '—') +
        ' · settlement ' + esc(t.settlementType || '—') +
        ' · osservata ' + esc(t.observedAt || '—') +
        ' · job <code>' + esc(t.jobId || '—') + '</code>' +
        ' · source ' + esc(t.source || '—') + ' · selector ' + esc(t.selectionVersion || '—') +
        ' · orizzonte ' + esc(t.horizonBasis || '—') +
        (t.sharedWithTargets?.length ? ' · scadenza condivisa con IV' +
          t.sharedWithTargets.map(x => esc(x)).join(', IV') : '') + '</li>';
    }).join('');
    return '<h4>IV20 / IV40 / IV60 · scadenze Standard (solo informative)</h4>' +
      '<p class="note">Target nominali; verificare sempre i DTE effettivi. IV20/60 sono usate solo per gli spread indicativi omonimi quando verificabili, mai al posto della IV Ref.</p>' +
      '<ul class="reasons">' + sections + '</ul>';
  }
  function acquisitionDetail(iv) {
    const a = iv && iv.acquisition;
    if (!a) return '';
    const t = iv.timing, last = a.lastSuccessful;
    return '<p>Acquisizione: job <code>' + esc(String(a.jobId || '—')) + '</code> (' + esc(a.jobState || '—') + ') · ' +
      esc(FRESHNESS_TEXT[a.freshness] || a.freshness || '—') + ' · richiesta ' + esc(a.requestedAt || '—') + ' · acquisita da APEX ' +
      esc(a.fetchedAt || '—') + ' · dato del provider ' + (a.providerAsOf ? esc(a.providerAsOf) + ' (' + esc(a.providerAsOfField) + ')'
        : 'non attestato da Tastytrade') + ' · struttura catena del ' + esc(a.chainFetchedAt || '—') +
      (a.errorClass ? ' · errore ' + esc(a.errorClass) : '') + '</p>' +
      (t ? '<p>Confronto IV−RV (' + esc(t.policyVersion) + '): ' + (t.comparable ? 'ammesso, ' + esc(t.basis)
        : 'escluso, ' + reasonHtml(t.reason)) + ' · aggiornamento del provider non attestato</p>' : '') +
      (last && a.freshness !== 'CURRENT_JOB' ? '<p class="warn">Ultima IV di un’acquisizione precedente: ' + esc(formatPct(last.iv)) +
        ' del ' + esc(last.fetchedAt || '—') + ' (scad. ' + esc(last.selectedExpiration || '—') + ') · solo storica, esclusa dagli spread</p>' : '');
  }
  // Refresh rows only: whether the value is this job's, and the last earlier IV shown as HISTORY (never a value).
  function acquisitionCell(iv) {
    const a = iv && iv.acquisition;
    if (!a) return '';
    const last = a.lastSuccessful;
    const history = a.freshness !== 'CURRENT_JOB' && last && num(last.iv) !== null
      ? '<div class="sub warn">storica ' + esc(formatPct(last.iv)) + ' del ' + esc(last.fetchedAt || '—') +
        ' · esclusa dagli spread</div>' : '';
    const timing = iv.timing ? '<div class="sub">' + (iv.timing.comparable ? 'confrontabile con la RV (' +
      esc(iv.timing.basis) + ')' : 'non confrontabile: ' + esc(iv.timing.reason)) + '</div>' : '';
    return '<div class="sub">' + esc(FRESHNESS_TEXT[a.freshness] || a.freshness) +
      (a.fetchedAt ? ' · acquisita ' + esc(a.fetchedAt) : '') + '</div>' + timing + history;
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
  const SORTABLE_YZ = [['rv20YZ','RV20 YZ'], ['rv40YZ','RV40 YZ'], ['rv60YZ','RV60 YZ']];
  const SORTABLE_CC40 = [['rv40CC','RV40 CC']];
  // Read the indicative tenor spreads as two curves: CC 20→40→60, then YZ 20→40→60.
  // Keep keys and calculation paths unchanged; this list owns both header and cell order.
  const SORTABLE_CURVE_SPREADS = [
    ['spread20TenorCC','IV20 − RV20 CC*',20,'CC'],
    ['spread40CC','IV40 − RV40 CC*',40,'CC'],
    ['spread60TenorCC','IV60 − RV60 CC*',60,'CC'],
    ['spread20TenorYZ','IV20 − RV20 YZ*',20,'YZ'],
    ['spread40YZ','IV40 − RV40 YZ*',40,'YZ'],
    ['spread60TenorYZ','IV60 − RV60 YZ*',60,'YZ'],
  ];
  function renderTable(rows, sort, ivCache, yzStatus = 'NOT_READ') {
    const yzHead = SORTABLE_YZ.map(([key, label]) => {
      const active = sort && sort.key === key;
      const aria = active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none';
      return '<th scope="col" aria-sort="' + aria + '"><button type="button" class="sort" data-sort="' + key + '">' +
        esc(label) + (active ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ' ↕') + '</button></th>';
    }).join('');
    const cc40Head = SORTABLE_CC40.map(([key,label])=>{
      const active=sort && sort.key===key;
      const aria=active?(sort.dir==='desc'?'descending':'ascending'):'none';
      return '<th scope="col" aria-sort="' + aria + '"><button type="button" class="sort" data-sort="' + key + '">' +
        esc(label) + (active?(sort.dir==='desc'?' ▼':' ▲'):' ↕') + '</button></th>';
    }).join('');
    const curveSpreadHead=SORTABLE_CURVE_SPREADS.map(([key,label])=>{
      const active=sort&&sort.key===key;
      const aria=active?(sort.dir==='desc'?'descending':'ascending'):'none';
      return '<th scope="col" aria-sort="'+aria+'"><button type="button" class="sort" data-sort="'+key+'">'+
        esc(label)+(active?(sort.dir==='desc'?' ▼':' ▲'):' ↕')+'</button></th>';
    }).join('');
    const head = ['Titolo', 'IV Ref', 'IV20', 'IV40', 'IV60', 'RV20 CC']
      .map(h => '<th scope="col">' + esc(h) + '</th>').join('') + cc40Head +
      '<th scope="col">RV60 CC</th>' + yzHead +
      SORTABLE.map(([key, label]) => {
        const active = sort && sort.key === key;
        const aria = active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none';
        return '<th scope="col" aria-sort="' + aria + '"><button type="button" class="sort" data-sort="' + key + '">' +
          esc(label) + (active ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ' ↕') + '</button></th>';
      }).join('') + curveSpreadHead +
      ['Sedute RV20', 'Sedute RV60', 'Non validate 20', 'Non validate 60', 'Motivo', 'Audit dividendi', 'Riferimento', 'Stato']
        .map(h => '<th scope="col">' + esc(h) + '</th>').join('');
    const body = rows.map(r => '<tr><th scope="row"><button type="button" class="sym" data-symbol="' + esc(r.symbol) + '">' +
      esc(r.symbol) + '</button></th><td>' + ivRefCell(r.ivRef, ivMarketOf(r.symbol, ivCache)) + '</td>' +
      TENOR_TARGETS.map(n => '<td>' + tenorCell(r, n) + '</td>').join('') + '<td>' + rvCell(r.rv20) +
      '</td><td>' + cc40Cell(r, yzStatus) + '</td><td>' + rvCell(r.rv60) + '</td><td>' + yangZhangCell(r, 20, yzStatus) +
      '</td><td>' + yangZhangCell(r, 40, yzStatus) + '</td><td>' + yangZhangCell(r, 60, yzStatus) +
      '</td><td>' + spreadCell(r.spreads.ivMinusRv20Pp) + '</td><td>' +
      spreadCell(r.spreads.ivMinusRv60Pp) + '</td>' +
      SORTABLE_CURVE_SPREADS.map(([, ,n,est])=>'<td>'+
        (n===40?spread40Cell(r,est,yzStatus):tenorSpreadCell(r,n,est,yzStatus))+'</td>').join('') +
      '<td>' + coverageCell(r.rv20) + '</td><td>' + coverageCell(r.rv60) +
      '</td><td>' + missingCell(r.rv20) + '</td><td>' + missingCell(r.rv60) + '</td><td>' + reasonHtml(r.primaryReason) +
      (r.reasons.length > 1 ? '<div class="sub">+' + (r.reasons.length - 1) + ' altri motivi</div>' : '') + '</td><td>' +
      dividendAuditCell(r) + '</td><td>' + asOfCell(r.asOf) + '</td><td><span class="st st-' + esc(r.status.toLowerCase()) + '">' + esc(statusLabel(r)) +
      '</span>' + (r.status === 'COMPLETE' && !certifiedPair(r) ?
        '<div class="sub">non certificati APEX</div>' : '') + '</td></tr>').join('');
    return '<div class="scroll"><table><thead><tr>' + head + '</tr></thead><tbody>' +
      (body || '<tr><td colspan="27">Nessun titolo con questi filtri.</td></tr>') + '</tbody></table></div>';
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
  function renderDetail(detail, ivCache, yzInfo = null) {
    if (!detail || detail.ok !== true || detail.version !== VERSION || detail.readOnly !== true ||
        detail.executionAuthorized !== false || !detail.row || detail.row.symbol !== detail.symbol ||
        !STATUSES.includes(detail.row.status) || !detail.row.ivRef || !detail.row.rv20 || !detail.row.rv60 ||
        !detail.row.spreads || !Array.isArray(detail.row.reasons) || !detail.row.asOf || !validTenors(detail.row))
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
      '<p>Census: ' + censusText(iv, r.errors) + '</p>' + renderSymbolFreshness(r) + acquisitionDetail(iv) + renderTenorDetail(r) +
      (market ? '<p class="mkt">IV Market (IV index Tastytrade dello scanner, solo informativa, mai usata negli spread): ' +
        esc(formatPct(market.value)) + (market.updatedAt !== null ? ' · ' + esc(new Date(market.updatedAt).toISOString()) : '') + '</p>' : '') +
      '<h4>Spread IV − RV (punti percentuali)</h4><ul class="reasons">' + spreadLine('IV − RV20', r.spreads.ivMinusRv20Pp) +
      spreadLine('IV − RV60', r.spreads.ivMinusRv60Pp) + '</ul>' +
      renderWindowDetail('rv20', 20, r.rv20, diag && diag.sessions, diag && diag.corporateActions) +
      renderWindowDetail('rv60', 60, r.rv60, diag && diag.sessions, diag && diag.corporateActions) +
      renderYangZhangDetail(yzInfo?.row ?? null, yzInfo?.status ?? 'NOT_READ') +
      renderSpread40Detail(r, yzInfo?.row ?? null, yzInfo?.status ?? 'NOT_READ') +
      renderTenorSpreadsDetail(r, yzInfo?.row ?? null, yzInfo?.status ?? 'NOT_READ') +
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

  // ── network: the session's key only as a header, one bounded request at a time ─────────────────────────────────
  // GET everywhere. The ONE write is the POST that starts or reuses the backend's IV refresh job: refused for any
  // other URL, before any request is made.
  async function fetchJson(url, apiKey, signal, postBody) {
    if (postBody !== undefined && String(url).slice(-(REFRESH_PATH.length + 5)) !== REFRESH_PATH + '/jobs')
      throw Error('COVERAGE_POST_NOT_ALLOWED');
    const resp = await fetch(url, postBody === undefined ? { method: 'GET', cache: 'no-store',
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }, signal }
      : { method: 'POST', cache: 'no-store', body: JSON.stringify(postBody),
        headers: { 'x-api-key': apiKey, 'Accept': 'application/json', 'Content-Type': 'application/json' }, signal });
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

  function formattedStamp(value) {
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return '—';
    return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',
      year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})
      .format(new Date(value))+' (Roma)';
  }
  function newestObserved(values) {
    const stamps=values.filter(x=>typeof x==='string' && Number.isFinite(Date.parse(x)));
    return stamps.length?stamps.reduce((a,b)=>Date.parse(b)>Date.parse(a)?b:a):null;
  }
  function renderSourceFreshness(data) {
    const rows=data?.rows||[];
    const ivAt=newestObserved(rows.map(r=>r?.ivRef?.acquisition?.fetchedAt??r?.asOf?.ivObservedAt));
    const chainAt=newestObserved(rows.flatMap(r=>[r?.ivRef?.acquisition?.chainFetchedAt,
      ...TENOR_TARGETS.map(n=>r?.ivTenors?.['iv'+n]?.chainFetchedAt)]));
    const rvAt=newestObserved(rows.map(r=>r?.rvStore?.lastChangedAt));
    const lastRvSession=rows.map(r=>r?.rvStore?.lastSessionDate).filter(d=>typeof d==='string'&&DAY.test(d))
      .sort().at(-1)||'—';
    const cards=[
      ['Ultima IV acquisita da APEX',ivAt,'Ricezione IV, non aggiornamento attestato da Tastytrade'],
      ['Ultima option chain acquisita',chainAt,'Ricezione struttura scadenze, distinta dalle IV'],
      ['Ultima modifica candele 1D RV',rvAt,'Scrittura SQLite APEX, non attestazione provider o certificazione RV']
    ];
    return '<section class="source-freshness" aria-label="Orari aggiornamento dati IV, catena opzioni e RV">'+
      cards.map(([name,value,note])=>'<div class="source-freshness-item"><span>'+esc(name)+'</span>'+
        '<strong>'+esc(formattedStamp(value))+'</strong><small>'+esc(note)+'</small></div>').join('')+
      '</section><p class="note">RV: seduta di riferimento '+esc(data?.asOfSessionDate||'—')+
      ' · ultima seduta 1D presente tra i simboli '+esc(lastRvSession)+
      ' · calcolo Coverage letto '+esc(formattedStamp(data?.generatedTo))+
      (data?.yangZhang?.status==='READY'?' · calcolo Yang–Zhang letto '+esc(formattedStamp(data.yangZhang.generatedTo)):'')+
      '. Gli orari sopra sono i più recenti dell’universo, non garantiscono che ogni simbolo sia aggiornato.</p>';
  }
  function renderSymbolFreshness(row) {
    const iv=row?.ivRef?.acquisition;
    const chainAt=newestObserved([iv?.chainFetchedAt,...TENOR_TARGETS.map(n=>row?.ivTenors?.['iv'+n]?.chainFetchedAt)]);
    return '<section class="audit-detail" aria-label="Aggiornamento delle fonti per simbolo"><h4>Ultimi aggiornamenti APEX del simbolo</h4>'+
      '<p>IV acquisita: <strong>'+esc(formattedStamp(iv?.fetchedAt??row?.ivRef?.observedAt))+
      '</strong> · option chain acquisita: <strong>'+esc(formattedStamp(chainAt))+
      '</strong> · ultima modifica candele RV 1D: <strong>'+esc(formattedStamp(row?.rvStore?.lastChangedAt))+'</strong></p>'+
      '<p class="note">RV al '+esc(row?.asOf?.rvSessionDate||'—')+
      ' · ultima seduta 1D nel database '+esc(row?.rvStore?.lastSessionDate||'—')+
      ' · data/ora della modifica SQLite, non timestamp dell’ultimo aggiornamento del provider o prova di finalità.</p></section>';
  }
  // Metadata from the persisted Coverage read, not a Tastytrade quote/update timestamp.
  function renderCoverageFreshness(data, readAt) {
    const observed = (data.rows || []).map(r => r?.ivRef?.acquisition?.fetchedAt ?? r?.asOf?.ivObservedAt)
      .filter(t => typeof t === 'string' && Number.isFinite(Date.parse(t)));
    const newest = observed.length ? observed.reduce((a, b) => Date.parse(b) > Date.parse(a) ? b : a) : null;
    return '<strong>Ultima lettura Coverage (APEX):</strong> ' + esc(readAt || '—') +
      ' · <strong>Sessione RV di riferimento:</strong> ' + esc(data.asOfSessionDate || '—') +
      ' · <strong>Data IV (NY):</strong> ' + esc(data.ivAsOfDate || '—') +
      ' · <strong>Ultima osservazione IV registrata da APEX:</strong> ' + esc(newest || 'non disponibile') +
      '<span class="sub"> · Le date non attestano l’aggiornamento dei prezzi presso Tastytrade.</span>'+renderSourceFreshness(data);
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
    let host = null, current = null, detailCurrent = null, recoveryCurrent = null, yzCurrent = null, ohlcCurrent = null,
      detailSnapshot = null, busy = false, data = null;
    let refreshCurrent = null, refreshTimer = null, coverageTimer = null;
    let lastReadAt = 0, lastReadAttemptAt = 0, pendingJobRead = false, activeAnalyze = null;
    let autoOpenPending = false, progressJobId = null, progressProcessed = 0, progressReadAt = 0;
    function scheduleCoverageRead() {
      if (coverageTimer !== null) clearTimeout(coverageTimer);
      coverageTimer = null;
      if (!host) return;
      const runHost = host;
      coverageTimer = setTimeout(() => {
        coverageTimer = null;
        if (host !== runHost) return;
        if (document.visibilityState === 'hidden' || busy) { scheduleCoverageRead(); return; }
        if (activeAnalyze) void activeAnalyze();
      }, COVERAGE_AUTO_READ_MS);
    }
    function onResume() {
      if (host && document.visibilityState !== 'hidden' && !busy &&
          Date.now() - Math.max(lastReadAt, lastReadAttemptAt) >= COVERAGE_AUTO_READ_MS && activeAnalyze)
        void activeAnalyze();
    }
    const view = { search: '', availability: '', spread: '', dividend: '', status: '', reason: '', sort: { key: 'position', dir: 'asc' } };
    const ivCache = () => (typeof _ivrCache !== 'undefined' ? _ivrCache : null);
    function close() {
      if (current) current.abort();
      if (detailCurrent) detailCurrent.abort();
      if (recoveryCurrent) recoveryCurrent.abort();
      if (yzCurrent) yzCurrent.abort();
      if (ohlcCurrent) ohlcCurrent.abort();
      if (refreshCurrent) refreshCurrent.abort();
      if (refreshTimer) clearTimeout(refreshTimer);
      if (coverageTimer !== null) clearTimeout(coverageTimer);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      current = null; detailCurrent = null; recoveryCurrent = null; yzCurrent = null; ohlcCurrent = null;
      detailSnapshot = null; busy = false; data = null;
      refreshCurrent = null; refreshTimer = null; coverageTimer = null;
      lastReadAt = 0; lastReadAttemptAt = 0; pendingJobRead = false; activeAnalyze = null;
      autoOpenPending = false; progressJobId = null; progressProcessed = 0; progressReadAt = 0;
      if (host) { host.remove(); host = null; }
      trigger.focus();
    }
    function open() {
      if (host) return;
      autoOpenPending = true; // exactly one automatic start-or-join attempt per opening
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
        'table{width:100%;border-collapse:collapse;font-size:12px;text-align:left;min-width:2800px}' +
        'th,td{padding:8px;border-bottom:1px solid #36505e;vertical-align:top}' +
        'th{color:#fff}thead th{background:#213744;position:sticky;top:0;z-index:1}' +
        '.sort,.sym{background:none;padding:0;color:#9fe3d8;font-weight:600;font-size:12px}' +
        '.sp{font-weight:700;font-variant-numeric:tabular-nums}.pos{color:#46d39a}.neg{color:#ff7d7d}' +
        '.zero{color:#e4edf1}.na{color:#7d8f99}.warn{color:#f6c66d}.error{color:#ffb4aa}.info{color:#b6d9d3}' +
        '.mkt{color:#c7b6f0}.badge{font-size:10px;padding:1px 5px;border-radius:4px;background:#314958}' +
        '.b-certified{background:#0d5c4f}.b-preliminary{background:#6a531a}.b-exploratory{background:#5a2f3a}' +
        '.st{font-size:11px;font-weight:700}.st-complete{color:#46d39a}.st-partial{color:#9fd36b}' +
        '.st-unavailable{color:#a6bdc9}.st-stale{color:#f6c66d}.st-error{color:#ff7d7d}' +
        '.source-freshness{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:7px;margin:10px 0}' +
        '.source-freshness-item{border:1px solid #36505e;border-radius:7px;padding:9px;background:#1b3442}' +
        '.source-freshness-item span,.source-freshness-item strong,.source-freshness-item small{display:block}' +
        '.source-freshness-item strong{color:#e4edf1;font-size:13px;margin:3px 0}' +
        '.source-freshness-item small{font-size:10px;color:#a6bdc9}' +
        '.yz-issue-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:9px}' +
        '.filters{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.filters input,.filters select{background:#0d1a22;' +
        'color:#d9e6eb;border:1px solid #36505e;border-radius:6px;padding:7px;font-size:12px}' +
        '.reasons{margin:4px 0 4px 18px;padding:0}code{overflow-wrap:anywhere;color:#e4edf1}' +
        '#detail{border-top:1px solid #36505e;margin-top:14px}.nw{white-space:nowrap}' +
        '.audit-summary,.audit-detail{border:1px solid #395462;border-radius:8px;padding:9px 12px;margin:10px 0}' +
        '</style><div class="shade"></div><section class="panel" role="dialog" aria-modal="true"' +
        ' aria-label="Volatility Coverage and Spread Monitor"><header><h2>Volatility Coverage &amp; Spread Monitor · DEV</h2>' +
        '<button class="close" type="button" id="close">Chiudi</button></header>' +
        '<p class="note">IV Ref = IV della scadenza Standard/Regular più vicina a 40 DTE, acquisita dal job DEV dell’intero' +
        ' universo (o dal pilot IV se il job non è disponibile); IV20/40/60 sono target nominali separati, con DTE' +
        ' effettivi e scadenza esposti, mai sostituti della IV Ref;' +
        ' IV Market, IV30, IVR non la sostituiscono mai. Le RV20/40/60 CC sono Close-to-Close; le RV20/40/60 YZ sono' +
        ' Yang–Zhang da OHLC giornalieri e restano diagnostiche. RV40 richiede 41 chiusure consecutive di borsa,' +
        ' IV40 usa una scadenza opzioni con DTE effettivi indicati: gli orizzonti non sono identici.' +
        ' Spread a 40 aggiunti come confronti indicativi IV40−RV40 CC e IV40−RV40 YZ, soltanto con dati verificabili.' +
        ' Non equivalgono a orizzonti futuri/passati identici o segnali di trading.' +
        ' Nuovi spread IV20−RV20 CC/YZ e IV60−RV60 CC/YZ indicativi: IV in DTE di calendario e RV in sedute,' +
        ' solo se provenance, timing e disponibilità della RV sono verificabili. Mai sostituzioni da IV Ref.' +
        ' Spread esistenti = 100 × (IV Ref − RV20/60 CC) in punti percentuali, arrotondati solo' +
        ' a video (il CSV ha la precisione piena). Verde IV &gt; RV, rosso IV &lt; RV, neutro uguali, grigio non disponibile:' +
        ' i colori indicano solo il segno, non sono segnali di trading.</p>' +
        '<button type="button" id="run">Analizza universo</button> ' +
        '<button type="button" id="refresh-run" disabled>Nuova acquisizione IV</button> ' +
        '<button type="button" id="recovery-run">Stato recupero candele 1D</button> ' +
        '<button type="button" id="csv" disabled>Esporta CSV</button>' +
        '<p id="state" class="info" role="status" aria-live="polite">Nessuna richiesta ancora effettuata.</p>' +
        '<div id="freshness" class="note">Ultimi dati IV/RV: in lettura…</div>' +
        '<p id="yz-status" class="note">RV Yang–Zhang: lettura separata, solo GET.</p>' +
        '<div id="yz-issues"></div>' +
        '<div id="refresh"></div><div id="summary"></div><div id="recovery"></div><div class="filters" id="filters" hidden>' +
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
      const refresh = $('refresh'), refreshRun = $('refresh-run');
      const refreshIdle = () => !refreshCurrent && !refreshTimer;
      // Start — or reuse — the backend refresh job of the universe just read. `force` asks for a NEW acquisition after a
      // concluded one; the backend refuses duplicates (one running job per universe, and a minimum interval).
      async function startRefresh(force) {
        if (busy || !refreshIdle() || !data || typeof S === 'undefined' || !S.backendKey) return;
        const controller = new AbortController();
        refreshCurrent = controller;
        const runHost = host;
        refreshRun.disabled = true;
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let job = null;
        try {
          const body = { universeDigest: data.universe.digest };
          if (force) body.force = true;
          const result = await fetchJson(BACKEND + REFRESH_PATH + '/jobs', S.backendKey, controller.signal, body);
          if (refreshCurrent !== controller || host !== runHost) return;
          job = checkRefreshJob(result.job);
          refresh.innerHTML = renderRefreshStatus(job, { created: result.created === true, reused: result.reused, force: force === true });
        } catch (error) {
          if (refreshCurrent !== controller || host !== runHost) return;
          refresh.innerHTML = '<p class="error">' + esc(controller.signal.aborted ? 'Richiesta di refresh IV annullata o scaduta.'
            : 'Refresh IV non avviato: ' + ((error && error.message) || 'errore')) + ' I valori mostrati restano quelli già letti.</p>';
        } finally {
          clearTimeout(timeout);
          if (refreshCurrent === controller && host === runHost) {
            refreshCurrent = null;
            if (job && job.state === 'RUNNING') {
              progressJobId = job.jobId;
              progressProcessed = job.progress.processed;
              progressReadAt = Date.now();
              schedulePoll(job.jobId, 0);
            } else {
              refreshRun.disabled = !data || busy;
              // A concluded/reused job also warrants a fresh read: the initial
              // Coverage snapshot could have been taken before the POST.
              if (job && job.state !== 'RUNNING') {
                if (busy) pendingJobRead = true;
                else void analyze();
              }
            }
          }
        }
      }
      // Status polling of one job: GET only, never an acquisition; stops on close, on error, at the end or after an hour.
      function schedulePoll(jobId, count) {
        const runHost = host;
        if (count >= REFRESH_MAX_POLLS) {
          refresh.innerHTML += '<p class="warn">Aggiornamento dello stato sospeso dopo un’ora: riapri il pannello per ricollegarti.</p>';
          refreshRun.disabled = !data || busy;
          return;
        }
        refreshTimer = setTimeout(() => { refreshTimer = null; if (host === runHost) void pollRefresh(jobId, count + 1); }, REFRESH_POLL_MS);
      }
      async function pollRefresh(jobId, count) {
        const controller = new AbortController();
        refreshCurrent = controller;
        const runHost = host;
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let job = null;
        try {
          const result = await fetchJson(BACKEND + REFRESH_PATH + '/jobs/' + encodeURIComponent(jobId), S.backendKey, controller.signal);
          if (refreshCurrent !== controller || host !== runHost) return;
          job = checkRefreshJob(result.job);
          refresh.innerHTML = renderRefreshStatus(job, {});
        } catch (error) {
          if (refreshCurrent !== controller || host !== runHost) return;
          refresh.innerHTML = '<p class="error">' + esc('Stato del refresh IV non leggibile: ' + ((error && error.message) || 'errore') +
            '. Nessun nuovo tentativo automatico.') + '</p>';
        } finally {
          clearTimeout(timeout);
          if (refreshCurrent === controller && host === runHost) {
            refreshCurrent = null;
            if (job && job.state === 'RUNNING') {
              // New batches are persisted before the job finishes. Update the
              // table on meaningful progress, at most once per minute, GET only.
              if (progressJobId !== job.jobId) {
                progressJobId = job.jobId;
                progressProcessed = 0;
                progressReadAt = Date.now();
              }
              if (job.progress.processed > progressProcessed &&
                  Date.now() - progressReadAt >= REFRESH_PROGRESS_READ_MIN_MS) {
                progressProcessed = job.progress.processed;
                progressReadAt = Date.now();
                if (busy) pendingJobRead = true;
                else void analyze();
              }
              schedulePoll(jobId, count);
            } else {
              refreshRun.disabled = !data || busy;
              if (job) {
                if (busy) pendingJobRead = true; // do not lose the completed-job re-read to another GET
                else void analyze();            // GET only, with the concluded job's results
              }
            }
          }
        }
      }
      refreshRun.addEventListener('click', () => startRefresh(true));
      $('close').addEventListener('click', close);
      root.querySelector('.shade').addEventListener('click', close);
      function draw() {
        if (!data) return;
        const rows = sortRows(filterRows(data.rows, view), view.sort.key, view.sort.dir);
        $('count').textContent = rows.length + ' di ' + data.rows.length + ' titoli mostrati.';
        $('table').innerHTML = renderTable(rows, view.sort, ivCache(), data.yangZhang?.status ?? 'NOT_READ');
      }

      // Separate GET-only Yang-Zhang read, never allowed to affect the original
      // Coverage values, status, timers or IV acquisition. One page at a time.
      async function loadYangZhang(coverage) {
        if (!coverage || typeof S === 'undefined' || !S.backendKey || !host) return;
        const controller = new AbortController();
        yzCurrent = controller;
        const readHost = host, signal = controller.signal, pages = [];
        let timeout = null;
        try {
          for (let offset = 0; ;) {
            if (signal.aborted || host !== readHost || yzCurrent !== controller || data !== coverage) return;
            if (pages.length >= MAX_PAGES) throw Error('YANG_ZHANG_TOO_MANY_PAGES');
            $('yz-status').textContent = 'Yang–Zhang: lettura pagina ' + (pages.length + 1) + '/' +
              Math.ceil(coverage.rows.length / PAGE_SIZE) + ' (GET, nessuna acquisizione)…';
            timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
            const page = await fetchJson(BACKEND + YZ_PATH + '?offset=' + offset + '&limit=' + PAGE_SIZE +
              '&universeDigest=' + encodeURIComponent(coverage.universe.digest), S.backendKey, signal);
            clearTimeout(timeout); timeout = null;
            checkYangZhangPage(page, offset, coverage);
            pages.push(page);
            if (page.nextOffset === null) break;
            offset = page.nextOffset;
          }
          if (signal.aborted || host !== readHost || yzCurrent !== controller || data !== coverage) return;
          attachYangZhangPages(coverage, pages);
          $('yz-status').textContent = renderYangZhangStatus(coverage);
          $('yz-issues').innerHTML = renderYangZhangGaps(coverage);
          $('freshness').innerHTML = renderCoverageFreshness(coverage,new Date(lastReadAt).toISOString());
          draw();
          // Re-render only an already-open detail of the same session and digest.
          if (detailSnapshot) {
            const matching = matchingYangZhangRowForDetail(detailSnapshot, coverage);
            if (matching) detail.innerHTML = renderDetail(detailSnapshot, ivCache(),
              { row: matching, status: coverage.yangZhang.status });
          }
        } catch (error) {
          if (host !== readHost || yzCurrent !== controller || data !== coverage) return;
          coverage.yangZhang = { status: 'ERROR', readError: signal.aborted
            ? 'TIMEOUT_YANG_ZHANG_PAGE' : String(error?.message || 'YANG_ZHANG_READ_FAILED').slice(0, 160) };
          $('yz-status').textContent = renderYangZhangStatus(coverage);
          $('yz-issues').innerHTML = '';
          draw();
          // Coverage remains intact; never replace missing YZ with Close-to-Close.
          if (detailSnapshot && matchingYangZhangRowForDetail(detailSnapshot, coverage))
            detail.innerHTML = renderDetail(detailSnapshot, ivCache(), { row: null, status: 'ERROR' });
        } finally {
          if (timeout) clearTimeout(timeout);
          if (yzCurrent === controller) yzCurrent = null;
        }
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
        if (ohlcCurrent) { ohlcCurrent.abort(); ohlcCurrent = null; }
        if (detailCurrent) detailCurrent.abort();
        // The currently requested symbol owns the detail slot from this point
        // onward. A failed/aborted read must not let a prior symbol reappear
        // when the independently pending Yang-Zhang pages complete.
        detailSnapshot = null;
        const controller = new AbortController();
        detailCurrent = controller;
        const runHost = host;
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        detail.innerHTML = '<p class="info">Lettura dettaglio ' + esc(symbol) + '…</p>';
        try {
          const json = await fetchJson(BACKEND + PATH + '/' + encodeURIComponent(symbol), S.backendKey, controller.signal);
          if (detailCurrent !== controller || host !== runHost) return;
          const matching = matchingYangZhangRowForDetail(json, data);
          const html = renderDetail(json, ivCache(), { row: matching,
            status: matching ? (data.yangZhang?.status ?? 'NOT_READ') : 'NOT_READ' });
          // Commit only a fully validated/rendered detail. Re-render callbacks
          // must never revive a superseded or invalid response.
          detailSnapshot = json;
          detail.innerHTML = html;
        } catch (error) {
          if (detailCurrent !== controller || host !== runHost) return;
          detailSnapshot = null;
          detail.innerHTML = '<p class="error">' + esc(controller.signal.aborted ? 'Richiesta annullata o scaduta.'
            : (error && error.message) || 'Errore di lettura del dettaglio.') + '</p>';
        } finally {
          clearTimeout(timeout);
          if (detailCurrent === controller) detailCurrent = null;
        }
      }

      // Explicit per-symbol GET of full Yang-Zhang diagnostics. Never invoked
      // from opening, paginating, auto-refresh or IV acquisition.
      detail.addEventListener('click', async event => {
        const button=event.target?.closest?.('button[data-yz-ohlc-symbol]');
        if(!button||!host||!data||data.yangZhang?.status!=='READY')return;
        const symbol=button.getAttribute('data-yz-ohlc-symbol');
        if(!symbol||!SYMBOL.test(symbol)||detailSnapshot?.symbol!==symbol||
           typeof S==='undefined'||!S.backendKey)return;
        const joined=matchingYangZhangRowForDetail(detailSnapshot,data);
        if(!joined||joined.symbol!==symbol||
           ![20,40,60].some(n=>joined.yangZhang?.['rv'+n+'YZ']?.reason===YZ_OHLC_REASON))return;
        const slot=detail.querySelector('[data-yz-ohlc-results]');
        if(!slot)return;
        if(ohlcCurrent)ohlcCurrent.abort();
        const controller=new AbortController();
        ohlcCurrent=controller;
        const runHost=host, readData=data, readDetail=detailSnapshot;
        const timeout=setTimeout(()=>controller.abort(),TIMEOUT_MS);
        slot.textContent='Lettura sedute incompatibili di '+symbol+' (GET, nessuna acquisizione)…';
        try{
          const json=await fetchJson(BACKEND+PRICE_BASIS_PATH+'/'+encodeURIComponent(symbol),
            S.backendKey,controller.signal);
          if(controller!==ohlcCurrent||host!==runHost||data!==readData||
             detailSnapshot!==readDetail||detail.querySelector('[data-yz-ohlc-results]')!==slot)return;
          slot.innerHTML=renderPriceBasisOhlcAudit(json,readData,joined);
        }catch(error){
          if(controller!==ohlcCurrent||host!==runHost||data!==readData||
             detailSnapshot!==readDetail||detail.querySelector('[data-yz-ohlc-results]')!==slot)return;
          slot.innerHTML='<p class="error">'+esc(controller.signal.aborted?'Lettura OHLC scaduta o annullata.':
            (error?.message||'YZ_OHLC_DETAIL_READ_FAILED'))+
            '. Nessun dato modificato.</p>';
        }finally{
          clearTimeout(timeout);
          if(ohlcCurrent===controller)ohlcCurrent=null;
        }
      });

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
      run.addEventListener('click', () => analyze());
      async function analyze() {
        if (busy) return;
        if (ohlcCurrent) { ohlcCurrent.abort(); ohlcCurrent = null; }
        if (yzCurrent) {
          yzCurrent.abort();
          yzCurrent = null;
          if (data?.yangZhang?.status === 'LOADING') {
            data.yangZhang = { status: 'ERROR', readError: 'INTERRUPTED_BY_NEW_COVERAGE_READ' };
            $('yz-status').textContent = renderYangZhangStatus(data);
            draw();            // a failed new Coverage read must not leave stale YZ as "loading"
          }
        }
        if (typeof S === 'undefined' || !S.backendKey) {
          state.textContent = 'Effettua il login APEX per usare la chiave API della sessione.';
          lastReadAttemptAt = Date.now();
          scheduleCoverageRead();
          return;
        }
        lastReadAttemptAt = Date.now();
        if (coverageTimer !== null) { clearTimeout(coverageTimer); coverageTimer = null; }
        busy = true; run.disabled = true; csv.disabled = true; refreshRun.disabled = true;
        if (!data) {
          $('summary').innerHTML = ''; $('table').innerHTML = ''; detail.innerHTML = ''; $('count').textContent = '';
          $('filters').hidden = true;
        }
        state.className = 'info';
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
          data.yangZhang = { status: 'LOADING', readError: null };
          lastReadAt = Date.now();
          $('yz-status').textContent = renderYangZhangStatus(data);
          $('yz-issues').innerHTML = '';
          $('freshness').innerHTML = renderCoverageFreshness(data, new Date(lastReadAt).toISOString());
          $('summary').innerHTML = renderSummary(data);
          // A detail requested for the prior snapshot cannot overwrite refreshed Coverage.
          if (detailCurrent) { detailCurrent.abort(); detailCurrent = null; }
          detailSnapshot = null;
          detail.innerHTML = '';
          $('reason').innerHTML = '<option value="">Motivo: tutti</option>' + reasonCodes(data.rows)
            .map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
          if (view.reason && !reasonCodes(data.rows).includes(view.reason)) view.reason = '';
          $('reason').value = view.reason;
          $('filters').hidden = false;
          draw();
          void loadYangZhang(data);    // separate bounded GET; failure never invalidates Coverage
          csv.disabled = false;
          const withIv = data.rows.filter(r => num(r.ivRef.value) !== null).length;
          state.textContent = 'Completato: ' + data.rows.length + ' titoli in ' + pages.length +
            ' pagine · IV Ref presente per ' + withIv + '. Nessun valore stimato o sostituito.';
          if (refreshIdle()) refreshRun.disabled = false;
          // An authorized DEV opening triggers one server-deduped acquisition
          // only when no comparable current-job IV exists. Periodic reads never
          // call startRefresh; one explicit click still uses force=true.
        } catch (error) {
          if (current !== controller || host !== runHost) return;
          state.textContent = signal.aborted ? 'Richiesta annullata o scaduta (' + TIMEOUT_MS / 1000 + ' s per pagina).'
            : (error && error.message) || 'Errore di lettura.';
          state.className = 'error';
        } finally {
          if (timeout) clearTimeout(timeout);
          if (current === controller && host === runHost) {
            run.disabled = false; busy = false; current = null;
            csv.disabled = !data;
            refreshRun.disabled = !data || !refreshIdle();
            if (pendingJobRead) { pendingJobRead = false; void analyze(); }
            else {
              scheduleCoverageRead();
              if (autoOpenPending && data) {
                autoOpenPending = false;
                if (shouldAutoAcquireIv(data)) void startRefresh(false);
              }
            }
          }
        }
      }
      activeAnalyze = analyze;
      document.body.appendChild(host);
      document.addEventListener('visibilitychange', onResume);
      window.addEventListener('focus', onResume);
      run.focus();
      // First GET verifies the universe and existing provenance; then an
      // eligible DEV opening may start/join ONE deduplicated IV job.
      void analyze();
    }
    trigger.addEventListener('click', open);
    document.body.appendChild(trigger);
  }
  if (typeof module !== 'undefined' && module.exports)
    module.exports = { devContext, checkPage, combinePages, checkYangZhangPage, attachYangZhangPages,
      matchingYangZhangRowForDetail, yangZhangCell, cc40Cell, spread40Diagnostic,
      tenorSpreadDiagnostic, tenorSpreadCell, renderTenorSpreadsDetail,
      ohlcDiagnosticButton, renderPriceBasisOhlcAudit,
      spread40Cell, renderSpread40Detail, renderYangZhangStatus, renderYangZhangDetail,
      summarize, filterRows, sortRows, reasonCodes, reasonText,
      formatPp, formatPct, spreadClass, ivMarketOf, csvCell, toCsv, renderSummary, dividendAuditSummary,
      dividendAuditOf, dividendAuditCell, renderDividendDetail, renderTable, sessionFacts, renderDetail,
      fetchJson, renderRecoveryStatus, PAGE_SIZE, TIMEOUT_MS, checkRefreshJob, renderRefreshStatus, acquisitionCell,
      REFRESH_PATH, REFRESH_POLL_MS, REFRESH_PROGRESS_READ_MIN_MS, REFRESH_MAX_POLLS,
      shouldAutoAcquireIv, COVERAGE_AUTO_READ_MS, renderCoverageFreshness,
      formattedStamp, renderSourceFreshness, renderSymbolFreshness, renderYangZhangGaps };
  if (typeof document !== 'undefined' && typeof window !== 'undefined' &&
      devContext(window.location && window.location.hostname, typeof BACKEND === 'string' ? BACKEND : '')) {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', setupUi, { once: true });
    else setupUi();
  }
})();
