// Read-only RV20/RV60 pilot diagnostic: DEV frontend only.
// A manual click performs four bounded, authenticated GETs via the existing
// APEX API key in memory. Nothing is scheduled, acquired, persisted or traded.
(function () {
  'use strict';
  const PATH = '/debug/volatility-carry/rv-pilot-readiness';
  const PAGE_SIZE = 5;
  const TOTAL = 20;
  const HASH = /^[a-f0-9]{64}$/;
  const SYMBOL = /^[A-Z0-9][A-Z0-9.\-]{0,9}$/;
  const SCRIPT_BACKEND = 'https://apex-tastytrade-backend-dev-production.up.railway.app';

  function devContext(hostname, backend) {
    const host = String(hostname || '');
    const allowedHost = host === 'localhost' || host === '127.0.0.1' ||
      /^deploy-preview-[0-9]+--spontaneous-queijadas-118823\.netlify\.app$/.test(host);
    return allowedHost && backend === SCRIPT_BACKEND;
  }
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
  const available = w => w && w.status === 'AVAILABLE' &&
    typeof w.value === 'number' && Number.isFinite(w.value) && w.value >= 0 &&
    (w.closesRequired === 21 || w.closesRequired === 61) &&
    w.validatedSessions === w.closesRequired &&
    w.returnsUsed === w.closesRequired - 1 &&
    typeof w.inputsDigest === 'string' && HASH.test(w.inputsDigest);

  function combinePages(pages) {
    if (!Array.isArray(pages) || pages.length !== TOTAL / PAGE_SIZE)
      throw Error('RV_AUDIT_EXPECTED_FOUR_PAGES');
    const hash = pages[0]?.membershipHash;
    if (typeof hash !== 'string' || !HASH.test(hash))
      throw Error('RV_AUDIT_MEMBERSHIP_HASH_INVALID');
    const result = [], seen = new Set();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (!p || p.ok !== true || p.readOnly !== true ||
        p.memberSource !== 'iv_pilot_members' || p.memberCount !== TOTAL ||
        p.membershipHash !== hash || p.offset !== i * PAGE_SIZE ||
        p.limit !== PAGE_SIZE || p.returned !== PAGE_SIZE ||
        !Array.isArray(p.rows) || p.rows.length !== PAGE_SIZE)
        throw Error('RV_AUDIT_INCONSISTENT_PAGE_' + (i + 1));
      for (const row of p.rows) {
        if (!row || typeof row.symbol !== 'string' || !SYMBOL.test(row.symbol) ||
          seen.has(row.symbol) || !row.rv20 || !row.rv60 ||
          typeof row.sessionKindPolicy?.covered !== 'boolean')
          throw Error('RV_AUDIT_INCONSISTENT_ROW');
        seen.add(row.symbol);
        result.push(row);
      }
    }
    if (result.length !== TOTAL || seen.size !== TOTAL ||
        result.some((row, i) => i > 0 && result[i - 1].symbol >= row.symbol))
      throw Error('RV_AUDIT_MEMBERSHIP_ORDER_INVALID');
    return { membershipHash: hash, rows: result };
  }

  function classifyRow(row) {
    const windows = [row.rv20, row.rv60];
    const reasons = [];
    if (row.sessionKindPolicy.covered === false) reasons.push('POLICY_SYMBOL_NOT_COVERED');
    for (const w of windows) {
      for (const reason of Array.isArray(w.reasons) ? w.reasons : []) {
        if (typeof reason === 'string' && !reasons.includes(reason)) reasons.push(reason);
      }
      for (const [reason, count] of Object.entries(w.blockers || {})) {
        if (Number(count) > 0 && !reasons.includes(reason)) reasons.push(reason);
      }
    }
    const noCandle = reasons.includes('NO_STORED_CANDLE') ||
      reasons.some(x => /GAP_IN_WINDOW|INSUFFICIENT_CLOSES/.test(x));
    const adjustmentBlocked = reasons.some(x => /SPLIT_UNVERIFIED/.test(x)) ||
      windows.some(w => /^(SUSPECT_JUMP|BLOCKED_)/.test(String(w.priceAdjustment || '')));
    return {
      symbol: row.symbol,
      policyEligible: row.sessionKindPolicy.covered === true,
      rv20Available: !!available(row.rv20),
      rv60Available: !!available(row.rv60),
      noCandle, adjustmentBlocked, reasons,
    };
  }

  function summarizeRows(rows) {
    const classifications = rows.map(classifyRow);
    return {
      total: classifications.length,
      policyEligible: classifications.filter(r => r.policyEligible).length,
      policyBlocked: classifications.filter(r => !r.policyEligible).length,
      rv20Available: classifications.filter(r => r.rv20Available).length,
      rv60Available: classifications.filter(r => r.rv60Available).length,
      missingCandle: classifications.filter(r => r.noCandle).length,
      adjustmentBlocked: classifications.filter(r => r.adjustmentBlocked).length,
    };
  }

  function windowCell(w) {
    const value = available(w) ? (100 * w.value).toFixed(2) + '%' : 'NON DISP.';
    const why = Array.isArray(w.reasons) && w.reasons.length ? w.reasons.join(', ') : '';
    return '<div><strong>' + esc(value) + '</strong></div>' +
      '<div class="sub">' + esc(why) + '</div>' +
      '<div class="sub">Sedute validate: ' + esc(w.validatedSessions ?? '—') +
      '/' + esc(w.closesRequired ?? '—') + '</div>' +
      '<div class="sub">Finalità: ' + esc(w.finalityBasis ?? '—') + '</div>' +
      '<div class="sub">Prezzi: ' + esc(w.priceAdjustment ?? '—') + '</div>' +
      '<div class="sub">Finestra: ' + esc(w.windowFrom ?? '—') +
      ' → ' + esc(w.windowThrough ?? '—') + '</div>';
  }
  function renderTable(data) {
    const summary = summarizeRows(data.rows);
    const stats = [
      ['Titoli', summary.total], ['Policy valida', summary.policyEligible],
      ['Policy bloccata', summary.policyBlocked],
      ['RV20 disponibile', summary.rv20Available],
      ['RV60 disponibile', summary.rv60Available],
      ['Gap/candele', summary.missingCandle],
      ['Split sospetti', summary.adjustmentBlocked],
    ];
    const cards = stats.map(([name, value]) =>
      '<div class="metric"><span>' + esc(name) + '</span><strong>' + esc(value) + '</strong></div>'
    ).join('');
    const rows = data.rows.map(row => {
      const result = classifyRow(row);
      const policy = row.sessionKindPolicy;
      const ev = row.evidence || {};
      const why = result.reasons.length ? result.reasons.join(', ') : '—';
      return '<tr><th scope="row">' + esc(row.symbol) + '</th>' +
        '<td>' + (policy.covered ? 'REGULAR · OK' : 'POLICY BLOCK') +
        '<div class="sub">' + esc(policy.basis) + '</div></td>' +
        '<td>' + windowCell(row.rv20) + '</td><td>' + windowCell(row.rv60) + '</td>' +
        '<td><div>' + esc(why) + '</div>' +
        '<div class="sub">Azioni societarie: ' + esc(row.corporateActions?.status ?? '—') + '</div>' +
        '<div class="sub">Acquisizioni STANDARD complete (storico): ' +
        esc(ev.independentStandardAcquisitions ?? '—') + '</div>' +
        '<div class="sub">Il conteggio storico NON prova la finalità delle finestre.</div>' +
        '</td></tr>';
    }).join('');
    return '<div class="stats">' + cards + '</div>' +
      '<p class="note">Sola lettura · Hash membri: <code>' + esc(data.membershipHash.slice(0, 12)) +
      '…</code> · Le RV mancanti non sono stimate.</p>' +
      '<div class="scroll"><table><thead><tr><th>Titolo</th><th>Policy</th>' +
      '<th>RV20</th><th>RV60</th><th>Blocchi e fonti</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  async function fetchPage(offset, hash, apiKey, signal) {
    const params = '?offset=' + offset + '&limit=' + PAGE_SIZE +
      (hash ? '&membershipHash=' + encodeURIComponent(hash) : '');
    const resp = await fetch(BACKEND + PATH + params, {
      method: 'GET', cache: 'no-store',
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }, signal,
    });
    let json;
    try { json = await resp.json(); }
    catch (_) { throw Error('RV_AUDIT_NON_JSON_RESPONSE_' + resp.status); }
    if (!resp.ok) {
      const reason = typeof json?.error === 'string' ? json.error : 'HTTP_' + resp.status;
      if (resp.status === 401) throw Error('Accesso negato: effettua di nuovo il login APEX.');
      if (resp.status === 403) throw Error('Diagnostica disabilitata sul backend DEV: ' + reason);
      throw Error('RV_AUDIT_HTTP_' + resp.status + ': ' + reason);
    }
    return json;
  }

  // These are existing backend diagnostics, not an instruction or permission
  // to acquire. Null fields mean UNKNOWN; never infer finality from a count
  // or from the passing of time alone.
  function renderD4SessionEvidence(pending) {
    if (!Array.isArray(pending))
      return '<div class="sub">Dettagli sedute: non verificabili</div>';
    if (!pending.length) return '';
    const yes = v => v === true ? 'SÌ' : v === false ? 'NO' : 'NON NOTO';
    const number = n => Number.isSafeInteger(n) && n >= 0 ? n : 'NON NOTO';
    return '<details class="sub"><summary>Verifica delle singole sedute (' +
      pending.length + ')</summary><ul>' + pending.map(s => {
        if (!s || typeof s.sessionDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(s.sessionDate))
          return '<li>Elemento non verificabile</li>';
        return '<li>' + esc(s.sessionDate) + ' · causa ' +
          esc(s.reason || 'NOT_VALIDATED') + ' · candela salvata ' +
          yes(s.stored) + ' · struttura valida ' + yes(s.structurallyValid) +
          ' · acquisizioni distinte ' + esc(number(s.distinctAcquisitions)) +
          ' · intervallo osservazioni ' + esc(number(s.observationSpanMs)) +
          ' ms</li>';
      }).join('') + '</ul>' +
      '<div>Due acquisizioni distinte con almeno 900000 ms di intervallo ' +
      'sono necessarie per OBSERVED_STABLE, ma NON bastano da sole a validare ' +
      'la seduta: valgono anche impronta OHLC, orario, policy e revisioni.</div>' +
      '</details>';
  }

  // D4 preflight is a separate read-only audit; it NEVER authorizes execution.
  function renderD4Preflight(data) {
    if (!data || data.ok !== true || data.readOnly !== true ||
        data.executionAuthorized !== false || data.liveAcquisitionsStarted !== false ||
        data.version !== 'RV_D4_PROVIDER_PREFLIGHT_V1' ||
        data.decision !== 'NO_GO_UNTIL_PROVIDER_AND_EVIDENCE_GATES_VERIFIED' ||
        !Array.isArray(data.symbols) || data.symbols.length !== 2 ||
        data.symbols[0]?.symbol !== 'AAPL' || data.symbols[1]?.symbol !== 'SPY' ||
        !Array.isArray(data.blockers) || !data.providerBudget ||
        data.providerBudget.sessionsLimitVerified !== false ||
        data.providerBudget.entitlementVerified !== false ||
        data.providerBudget.quoteTokenRequestBudgetVerified !== false)
      throw Error('D4_PREFLIGHT_INVALID_OR_UNSAFE_RESPONSE');
    const yes = v => v === true ? 'SÌ' : v === false ? 'NO' : 'NON NOTO';
    const rows = data.symbols.map(s => {
      const window = (w, pending) => esc(w?.status || 'UNAVAILABLE') +
        ' · sedute ' + esc(w?.validatedSessions ?? '—') + '/' +
        esc(w?.closesRequired ?? '—') +
        '<div class="sub">Mancanti: ' + esc(Array.isArray(pending) ?
          pending.map(item => typeof item?.sessionDate === 'string' ?
          item.sessionDate + ' (' + String(item.reason || 'NOT_VALIDATED') + ')' :
          'voce non valida').join(', ') || 'nessuna' : 'non verificabili') + '</div>' +
        '<div class="sub">' + esc((w?.reasons || []).join(', ') || '—') + '</div>' +
        renderD4SessionEvidence(pending);
      return '<tr><th scope="row">' + esc(s.symbol) + '</th><td>' +
        window(s.rv20, s.pendingSessionEvidence?.rv20) + '</td><td>' +
        window(s.rv60, s.pendingSessionEvidence?.rv60) + '</td><td>' +
        'Evidenza: ' + yes(s.observationAvailable) +
        ' · troncata: ' + yes(s.evidenceTruncated) +
        '<div class="sub">Errore: ' + esc(s.sourceError || '—') + '</div></td></tr>';
    }).join('');
    const feed = data.feed || {}, gate = data.admission || {}, timing = data.timing || {};
    const close = timing.closeEpochMs;
    const afterCloseAt = Number.isSafeInteger(close) && close >= 0 &&
      close < 8_640_000_000_000_000 - 45 * 60_000 ?
      new Date(close + 45 * 60_000).toISOString() : 'non verificabile';
    return '<h3>NO-GO · Preflight D4 AAPL/SPY (sola lettura)</h3>' +
      '<p class="note">Nessuna acquisizione autorizzata. Il feed locale NON dimostra il budget DXLink dell’account.</p>' +
      '<p>Blocchi: ' + esc(data.blockers.join(', ') || '—') + '</p>' +
      '<p>Sessione: ' + esc(data.asOfSessionDate ?? '—') +
      ' · Verifica: ' + esc(data.generatedAt ?? '—') + '</p>' +
      '<p>Feed: connesso ' + yes(feed.connected) + ', pronto ' + yes(feed.ready) +
      ', utilizzabile ' + yes(feed.usable) + ', token disponibile ' +
      yes(feed.quoteTokenAvailable) + ', token scaduto ' + yes(feed.quoteTokenStale) +
      ', pressione ' + yes(feed.candleGlobalCapActive || feed.candleSubscriptionBackoffActive ||
      feed.candleSubscriptionLimitHit) + '</p>' +
      '<p>Gate SQLite: disponibile ' + yes(gate.available) + ', lease attivo ' +
      yes(gate.activeLease) + ', avvii ultima ora ' + esc(gate.startsPastHour ?? '—') +
      ', ultimo avvio ' + esc(gate.lastStartAt ?? '—') +
      ', motivo ' + esc(gate.available === false ? (gate.reason ?? 'NON_RIPORTATO') : '—') + '</p>' +
      '<p>Finestra NYSE: giorno di borsa ' + yes(timing.todayIsSession) +
      ', dopo close+45m ' + yes(timing.afterCloseGrace) +
      ', soglia temporale ' + esc(afterCloseAt) +
      ' (non autorizza acquisizioni)</p>' +
      '<p>DXLink tastytrade: limite documentato 5 sessioni simultanee per ' +
      'credenziali; sessioni effettivamente attive, disponibilità residua, ' +
      'entitlement e budget quote-token: NON VERIFICATI.</p>' +
      '<p class="note">Verifica indipendente richiesta prima del pilot: ' +
      'inventario di TUTTI i client/servizi che usano le credenziali, ' +
      'conferma esterna del budget e autorizzazione esplicita. ' +
      'Il feed locale e il gate SQLite NON sono attestazioni del provider. ' +
      'Nessuna acquisizione, flag o ordine viene modificato dal pannello.</p>' +
      '<div class="scroll"><table><thead><tr><th>Simbolo</th><th>RV20</th><th>RV60</th>' +
      '<th>Fonte</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  async function fetchD4Preflight(apiKey, signal) {
    const resp = await fetch(BACKEND + '/debug/volatility-carry/daily-evidence/pilot-preflight', {
      method: 'GET', cache: 'no-store',
      headers: { 'x-api-key': apiKey, 'Accept': 'application/json' }, signal,
    });
    let json;
    try { json = await resp.json(); }
    catch (_) { throw Error('D4_PREFLIGHT_NON_JSON_' + resp.status); }
    if (!resp.ok) {
      if (resp.status === 401) throw Error('Accesso negato: effettua nuovamente il login APEX.');
      if (resp.status === 403) throw Error('Diagnostica D4 non abilitata su DEV.');
      throw Error('D4_PREFLIGHT_HTTP_' + resp.status);
    }
    return json;
  }

  function setupUi() {
    if (document.getElementById('apex-rv-pilot-launcher')) return;
    const trigger = document.createElement('button');
    trigger.id = 'apex-rv-pilot-launcher';
    trigger.type = 'button';
    trigger.textContent = 'RV20 / RV60 · DEV';
    trigger.setAttribute('aria-label', 'Apri diagnostica RV pilot DEV');
    trigger.style.cssText = 'position:fixed;bottom:17px;right:17px;z-index:2147482990;' +
      'background:#0d766e;color:#fff;border:1px solid #16a699;border-radius:9px;' +
      'padding:10px 13px;font:600 12px system-ui;cursor:pointer;box-shadow:0 8px 24px #0004;';
    let host = null, current = null, busy = false;
    function close() {
      if (current) current.abort();
      current = null;
      busy = false;
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
        '.panel{position:absolute;inset:4vh 3vw;background:#12222d;border:1px solid #365361;' +
        'border-radius:12px;padding:18px;overflow:auto;box-shadow:0 15px 60px #0008}' +
        'header{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
        'h2{margin:0;font-size:18px}p{line-height:1.5}button{background:#0b8174;color:#fff;' +
        'border:0;border-radius:7px;padding:10px 12px;cursor:pointer;font-size:13px}' +
        'button:disabled{opacity:.55;cursor:wait}.close{background:#314958}' +
        '.note,.sub{color:#a6bdc9;font-size:11px;line-height:1.45}.stats{display:flex;flex-wrap:wrap;' +
        'gap:8px;margin:14px 0}.metric{background:#1b3442;padding:9px;border-radius:7px;min-width:130px}' +
        '.metric span,.metric strong{display:block}.metric span{font-size:11px;color:#b6cbd3}' +
        '.metric strong{font-size:21px;margin-top:2px}.scroll{overflow-x:auto}' +
        'table{width:100%;border-collapse:collapse;font-size:12px;text-align:left;min-width:900px}' +
        'th,td{padding:10px;border-bottom:1px solid #36505e;vertical-align:top;min-width:130px}' +
        'th{color:#fff}thead th{background:#213744;position:sticky;top:0}' +
        '.error{color:#ffb4aa}.info{color:#b6d9d3}code{overflow-wrap:anywhere}' +
        '</style><div class="shade"></div><section class="panel" role="dialog" aria-modal="true"' +
        ' aria-label="Diagnostica RV pilot"><header><h2>Diagnostica RV20 / RV60 · DEV</h2>' +
        '<button class="close" type="button" id="close">Chiudi</button></header>' +
        '<p class="note">20 membri IV, 4 pagine × 5. Legge i dati esistenti, senza avviare acquisti,' +
        ' acquisizioni, ordini o nuovi feed.</p>' +
        '<button type="button" id="run">Analizza i 20 titoli</button>' +
        '<button type="button" id="runD4">Preflight D4 · AAPL/SPY</button>' +
        '<p id="state" class="info" role="status" aria-live="polite">Nessuna richiesta ancora effettuata.</p>' +
        '<div id="results"></div></section>';
      const run = root.getElementById('run');
      const state = root.getElementById('state');
      const results = root.getElementById('results');
      root.getElementById('close').addEventListener('click', close);
      root.querySelector('.shade').addEventListener('click', close);
      const runD4 = root.getElementById('runD4');
      runD4.addEventListener('click', async () => {
        if (busy) return;
        if (typeof S === 'undefined' || !S.backendKey) {
          state.textContent = 'Effettua il login APEX per usare la chiave API della sessione.';
          return;
        }
        busy = true; run.disabled = true; runD4.disabled = true;
        results.textContent = ''; state.className = 'info';
        const controller = new AbortController();
        current = controller;
        const runHost = host;
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          state.textContent = 'Lettura preflight D4…';
          const data = await fetchD4Preflight(S.backendKey, controller.signal);
          if (controller.signal.aborted || current !== controller || host !== runHost) return;
          results.innerHTML = renderD4Preflight(data);
          state.textContent = 'Preflight D4 letto. NO-GO: budget account non attestato.';
        } catch (error) {
          if (current !== controller || host !== runHost) return;
          state.textContent = controller.signal.aborted ?
            'Richiesta annullata o scaduta.' : error?.message || 'Errore di lettura D4.';
          state.className = 'error';
        } finally {
          clearTimeout(timeout);
          if (current === controller && host === runHost) {
            run.disabled = false; runD4.disabled = false;
            busy = false; current = null;
          }
        }
      });
      run.addEventListener('click', async () => {
        if (busy) return;
        if (typeof S === 'undefined' || !S.backendKey) {
          state.textContent = 'Effettua il login APEX per usare la chiave API della sessione.';
          return;
        }
        busy = true;
        run.disabled = true;
        runD4.disabled = true;
        results.textContent = '';
        state.className = 'info';
        const controller = new AbortController();
        current = controller;
        const runHost = host;
        const timeout = setTimeout(() => controller.abort(), 20000);
        const signal = controller.signal;
        try {
          const pages = [];
          for (let offset = 0; offset < TOTAL; offset += PAGE_SIZE) {
            // A resolved fetch/JSON parse may race with close(), even after abort.
            // Never schedule the next page for a stale or cancelled panel run.
            if (signal.aborted || current !== controller || host !== runHost) return;
            state.textContent = 'Lettura ' + (offset / PAGE_SIZE + 1) + '/4…';
            const page = await fetchPage(offset, pages[0]?.membershipHash, S.backendKey, signal);
            if (signal.aborted || current !== controller || host !== runHost) return;
            pages.push(page);
          }
          const data = combinePages(pages);
          if (current !== controller || host !== runHost) return;
          results.innerHTML = renderTable(data);
          state.textContent = 'Completato: 20 membri verificati, nessun valore inventato.';
        } catch (error) {
          if (current !== controller || host !== runHost) return;
          if (!signal.aborted) {
            state.textContent = error?.message || 'Errore di lettura.';
          } else {
            state.textContent = 'Richiesta annullata o scaduta.';
          }
          state.className = 'error';
        } finally {
          clearTimeout(timeout);
          if (current === controller && host === runHost) {
            run.disabled = false;
            runD4.disabled = false;
            busy = false;
            current = null;
          }
        }
      });
      document.body.appendChild(host);
      root.getElementById('run').focus();
    }
    trigger.addEventListener('click', open);
    document.body.appendChild(trigger);
  }
  if (typeof module !== 'undefined' && module.exports)
    module.exports = { devContext, combinePages, classifyRow, summarizeRows, renderTable, available, renderD4SessionEvidence, renderD4Preflight, fetchD4Preflight };
  if (typeof document !== 'undefined' && typeof window !== 'undefined' &&
      devContext(window.location?.hostname, typeof BACKEND === 'string' ? BACKEND : '')) {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', setupUi, { once: true });
    else setupUi();
  }
})();
