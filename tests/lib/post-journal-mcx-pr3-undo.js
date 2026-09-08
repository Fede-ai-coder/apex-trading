'use strict';
// Current-app reconstruction bridge after Strategy templates + Portfolio DXLink
// greeks + Journal
// snapshot prefetch + Portfolio backend candles + Rich async snapshot +
// Candle-store
// chart + Traffic light + Manual expiry + Backend portfolios + Portfolio data
// fetch + Journal trade detail + Journal trade forms + Journal Close Legs + TT
// reconnect UI + Apex post-auth init + MCX charts + MCX macro check +
// Backup/Restore + Manual Import + Journal Migration + Write-through + Journal
// Remote + Journal UI + Regime Policy + Journal Core.
// Historical contracts that need to reach the pre-MCX3 tree must undo the
// newest Strategy-templates relocation first, then Portfolio DXLink greeks,
// then Journal snapshot
// prefetch, then Portfolio backend candles, then Rich async snapshot, then
// Candle-store chart, then
// Traffic light, then Manual expiry, then Backend portfolios, then Portfolio
// data fetch, then Journal trade detail, Journal trade forms, Journal Close
// Legs, TT reconnect, Apex post-auth, MCX charts, MCX macro check,
// Backup/Restore, Manual Import, Migration, Write-through, Journal Remote,
// Journal UI, Regime Policy, Journal Core, and finally delegate to the original
// MCX3 identity guard. All layers remain independently fail-closed.
//
// Journal trade forms is the first TWO-FRAGMENT layer here: its undo puts back
// two blocks, at their own offsets, ascending.
//
// Journal trade detail was the first layer whose module is DEFINED AFTER
// modules that already call it, which is safe only because nothing reads its
// owners at evaluation time; that is proved in its own contract, not here.
//
// Portfolio data fetch has three async owners of four, which is unremarkable
// here — SIXTEEN of these twenty-five layers ship async owners,
// journal-remote-persistence six of eight — and in every case it is not a
// load-time property: each contract proves its block has no top-level call, no
// top-level await, and no evaluation-time dependency read.
//
// Backend portfolios has a seam that is not a closing brace: the region ends on
// a top-level statement, `window.viewLinkedTradesInJournal = …;`, so its body
// ends `;\n` and its raw fragment `;\n\n`. Measured over all twenty-five layers,
// TWENTY-TWO end `}\n` and THREE do not — backend portfolios,
// journal-backend-write-through, which ends `})();`, and the strategy
// templates, whose object literal closes `};`. Backend portfolios also
// carries twelve top-level statements, all `window.X = X` re-exports and their
// `try` wrappers, which its contract proves read nothing the region does not
// own.
//
// Rich async snapshot is the second single-owner layer in this chain, after
// apex-post-auth-init. Its own contract measures the two sets that claim
// quantifies over, because they disagree.
//
// Portfolio backend candles is the third single-owner layer here, with
// apex-post-auth-init and the rich async snapshot — a set the strategy
// templates now make FOUR, and the only one of the four whose single owner is
// not a function. It is also the layer where
// the SCREEN and the BOUNDARY disagreed: the banner-to-banner region it was cut
// from scored the best crossings of all 41 regions audit #433 screened and is
// UNEXTRACTABLE, because its last 1,060 units are a dev-only block whose
// top-level `if` CALLS two monolith functions at load. The cut stops before
// that block, which is why its seam is not a banner — one of THREE such seams
// among the FOURTEEN layers that record a single raw range, with tt-reconnect
// and apex-post-auth-init; the other ELEVEN end on a banner. Its own contract
// measures all of that.
//
// Journal snapshot prefetch performs THREE property writes on `S`, two keyed
// and one a GUARDED lazy init, where the rich async snapshot below it writes
// two keys and nothing else — so "all by key" was true there and false here.
// Its contract pins the guard by its whole line, because a substring match on
// the guarded string also passes the unguarded form: the mutation survivor
// audit #435 found and closed.
//
// Portfolio DXLink greeks is the only layer in this chain whose region scored
// ZERO on both coupling axes at its base — nothing in the monolith named either
// owner, and nothing it writes lands on a binding the monolith owns. Its
// contract keeps the two zeroes apart: the inbound one is VACUOUS (the region
// owns no binding), the outbound one is a MEASUREMENT over fifteen property
// writes whose every base the body introduces itself. It also SPANS a `// ── `
// section banner, joining two banner-to-banner regions that the split rule
// could not separate — both cost zero alone and zero joined — so the boundary
// is a judgement its contract publishes the numbers for rather than a rule's
// output.
//
// STRATEGY TEMPLATES is the newest layer and sits on top of all of them. It is
// the only one of the twenty-five whose module declares NO function: one `var`
// bound to an object literal, and nothing else. Two consequences for anyone
// reading this chain for a convention:
//
//   - Its `evaluationTimeReads` zero is VACUOUS, in the direction opposite to
//     the greeks layer's inbound zero. That scan walks top-level STATEMENTS and
//     this region has none, so it cannot report anything — a `var` initialiser
//     reading a foreign name runs at load and the scan stays empty. The bare VM
//     load is what proves the claim, and its contract rests it there.
//   - Its INBOUND zero is a measurement: it owns a mutable `var`, so a write
//     was possible, and all twelve external references are reads.
//
// Its boundary also corrects the one audit #440 published. `topLevelBanners`
// marks every `// ═══` rule, so a four-line header yields TWO marks; the audit
// took the second, which is the header's CLOSING rule, and would have stranded
// the title in the monolith. THIRTY-THREE of the screen's ninety-nine
// owner-carrying regions start on a closing rule, so this is a property of the
// screen and not a slip — the contract measures it.
//
// Order is newest-first and load-bearing: each layer's pinned offsets and
// hashes describe the document as it was when THAT layer shipped, so undoing
// out of order fails closed rather than producing an approximate tree.
//
// THE SEPARATOR CONVENTION IS NOT UNIFORM ACROSS THIS CHAIN, and this is the
// only file that spans all of it, so it is recorded here. Read one recent
// layer's helper and it is easy to assume `module = block − one LF` everywhere.
// It is not:
//
//     THE EIGHT OLDEST — journal core, regime policy, journal UI, journal
//     remote, write-through, #402 migration, #404 manual import, #405
//     backup/restore — have no separator concept at all. The module IS the
//     whole removed block, and each undo re-inserts `moduleSource` alone.
//
//     THE SEVENTEEN FROM #406 ONWARD — macro check, #408 charts, #410
//     post-auth, #411 TT reconnect, #413 close legs, #415 trade forms, #417
//     trade detail, #421 portfolio data fetch, #423 backend portfolios, #425
//     manual expiry, #428 traffic light, #430 candle-store chart, the rich
//     async snapshot, the portfolio backend-candle fetch, the journal snapshot
//     prefetch, the DXLink greeks pair and the strategy templates — treat the
//     block as `body + one structural LF`. BOTH
//     leave index.html, only the body is written to the module file, and the
//     undo re-inserts the body followed by SEPARATOR.
//
// Both shapes are byte-exact; neither is a defect. The reliable tell is the
// `const SEPARATOR = '\n'` declaration: the seventeen newest have it, the eight
// oldest do not.
//
// What is NOT a reliable tell is the RAW_*/MODULE_* pair. Only FOURTEEN of the
// seventeen pin a single RAW_CHARS one unit longer than MODULE_CHARS —
// post-auth, TT reconnect, close legs, trade detail, portfolio data fetch,
// backend portfolios, manual expiry, traffic light, candle-store chart, rich
// async snapshot, portfolio backend candles, journal snapshot prefetch, the
// portfolio DXLink greeks pair and the strategy templates. The
// multi-fragment layers pin
// their fragments individually instead (charts weaves three, trade forms joins
// two), and macro check pins neither constant. A future layer that reasons
// about "the" convention must ask which era it means, and must not infer the
// era from those constants.
//
// Layer shapes, measured against the shipped modules rather than assumed, and
// scoped to what was actually measured: of the TWENTY-FIVE layers this bridge
// peels, every one is a single contiguous fragment except #408 (three) and
// #415 (two). That is not a statement about the repository at large — the MCX3
// delegate below this chain is itself two fragments, and the older EIC, PESS
// and SFS families were not measured here.
const fs = require('fs');
const path = require('path');
const STRATEGY_TEMPLATES = require('./strategy-templates-undo.js');
const PORTFOLIO_DXLINK_GREEKS = require('./portfolio-dxlink-greeks-undo.js');
const JOURNAL_SNAPSHOT_PREFETCH = require('./journal-snapshot-prefetch-undo.js');
const PORTFOLIO_BACKEND_CANDLES = require('./portfolio-backend-candles-undo.js');
const JOURNAL_RICH_SNAPSHOT = require('./journal-rich-snapshot-undo.js');
const BACKEND_CANDLE_STORE_CHART = require('./backend-candle-store-chart-undo.js');
const PORTFOLIO_TRAFFIC_LIGHT = require('./portfolio-traffic-light-undo.js');
const PORTFOLIO_EXPIRY_MANUAL = require('./portfolio-expiry-manual-undo.js');
const BACKEND_PORTFOLIOS = require('./backend-portfolios-undo.js');
const PORTFOLIO_DATA_FETCH = require('./portfolio-data-fetch-undo.js');
const JOURNAL_TRADE_DETAIL = require('./journal-trade-detail-undo.js');
const JOURNAL_TRADE_FORMS = require('./journal-trade-forms-undo.js');
const JOURNAL_CLOSE_LEGS = require('./journal-close-legs-undo.js');
const TT_RECONNECT = require('./tt-reconnect-undo.js');
const APEX_POST_AUTH = require('./apex-post-auth-init-undo.js');
const MCX_CHARTS = require('./mcx-charts-undo.js');
const MCX_MACRO_CHECK = require('./mcx-macro-check-undo.js');
const JOURNAL_BACKUP_RESTORE = require('./journal-backup-restore-undo.js');
const JOURNAL_MANUAL_IMPORT = require('./journal-manual-import-undo.js');
const JOURNAL_MIGRATION = require('./journal-migration-undo.js');
const JOURNAL_WRITE_THROUGH = require('./journal-backend-write-through-undo.js');
const JOURNAL_REMOTE = require('./journal-remote-persistence-undo.js');
const JOURNAL_UI = require('./journal-ui-undo.js');
const REGIME = require('./mcx-regime-policy-undo.js');
const JOURNAL = require('./journal-core-undo.js');
const MCX3 = require('./mcx-pr3-undo.js');

const STRATEGY_TEMPLATES_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'config', 'strategy-templates.js'),
  'utf8'
);
const PORTFOLIO_DXLINK_GREEKS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'portfolio', 'portfolio-dxlink-greeks.js'),
  'utf8'
);
const JOURNAL_SNAPSHOT_PREFETCH_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-snapshot-prefetch.js'),
  'utf8'
);
const PORTFOLIO_BACKEND_CANDLES_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'portfolio', 'portfolio-backend-candles.js'),
  'utf8'
);
const JOURNAL_RICH_SNAPSHOT_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-rich-snapshot.js'),
  'utf8'
);
const BACKEND_CANDLE_STORE_CHART_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'backend-candle-store-chart.js'),
  'utf8'
);
const PORTFOLIO_TRAFFIC_LIGHT_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'portfolio', 'portfolio-traffic-light.js'),
  'utf8'
);
const PORTFOLIO_EXPIRY_MANUAL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'portfolio', 'portfolio-expiry-manual.js'),
  'utf8'
);
const BACKEND_PORTFOLIOS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'portfolio', 'backend-portfolios.js'),
  'utf8'
);
const PORTFOLIO_DATA_FETCH_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'portfolio', 'portfolio-data-fetch.js'),
  'utf8'
);
const JOURNAL_TRADE_DETAIL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'journal-trade-detail.js'),
  'utf8'
);
const JOURNAL_TRADE_FORMS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'journal-trade-forms.js'),
  'utf8'
);
const JOURNAL_CLOSE_LEGS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'journal-close-legs.js'),
  'utf8'
);
const TT_RECONNECT_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'tt-reconnect.js'),
  'utf8'
);
const APEX_POST_AUTH_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'apex-post-auth-init.js'),
  'utf8'
);
const MCX_CHARTS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'mcx-charts.js'),
  'utf8'
);
const MCX_MACRO_CHECK_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'mcx-macro-check.js'),
  'utf8'
);
const JOURNAL_BACKUP_RESTORE_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'journal-backup-restore.js'),
  'utf8'
);
const JOURNAL_MANUAL_IMPORT_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-manual-import.js'),
  'utf8'
);
const JOURNAL_MIGRATION_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-migration.js'),
  'utf8'
);
const JOURNAL_WRITE_THROUGH_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-backend-write-through.js'),
  'utf8'
);
const JOURNAL_REMOTE_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-remote-persistence.js'),
  'utf8'
);
const JOURNAL_UI_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'ui', 'journal-ui.js'),
  'utf8'
);
const REGIME_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'mcx-regime-policy.js'),
  'utf8'
);
const JOURNAL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-core.js'),
  'utf8'
);

function undoMcxPr3AfterJournal(html, mcx3Source) {
  const preStrategyTemplates = STRATEGY_TEMPLATES.isApplied(html)
    ? STRATEGY_TEMPLATES.undoStrategyTemplates(html, STRATEGY_TEMPLATES_SOURCE)
    : html;
  const preDxlinkGreeks = PORTFOLIO_DXLINK_GREEKS.isApplied(preStrategyTemplates)
    ? PORTFOLIO_DXLINK_GREEKS.undoPortfolioDxlinkGreeks(preStrategyTemplates, PORTFOLIO_DXLINK_GREEKS_SOURCE)
    : preStrategyTemplates;
  const preSnapshotPrefetch = JOURNAL_SNAPSHOT_PREFETCH.isApplied(preDxlinkGreeks)
    ? JOURNAL_SNAPSHOT_PREFETCH.undoJournalSnapshotPrefetch(preDxlinkGreeks, JOURNAL_SNAPSHOT_PREFETCH_SOURCE)
    : preDxlinkGreeks;
  const preBackendCandles = PORTFOLIO_BACKEND_CANDLES.isApplied(preSnapshotPrefetch)
    ? PORTFOLIO_BACKEND_CANDLES.undoPortfolioBackendCandles(preSnapshotPrefetch, PORTFOLIO_BACKEND_CANDLES_SOURCE)
    : preSnapshotPrefetch;
  const preRichSnapshot = JOURNAL_RICH_SNAPSHOT.isApplied(preBackendCandles)
    ? JOURNAL_RICH_SNAPSHOT.undoJournalRichSnapshot(preBackendCandles, JOURNAL_RICH_SNAPSHOT_SOURCE)
    : preBackendCandles;
  const preChart = BACKEND_CANDLE_STORE_CHART.isApplied(preRichSnapshot)
    ? BACKEND_CANDLE_STORE_CHART.undoBackendCandleStoreChart(preRichSnapshot, BACKEND_CANDLE_STORE_CHART_SOURCE)
    : preRichSnapshot;
  const preTrafficLight = PORTFOLIO_TRAFFIC_LIGHT.isApplied(preChart)
    ? PORTFOLIO_TRAFFIC_LIGHT.undoPortfolioTrafficLight(preChart, PORTFOLIO_TRAFFIC_LIGHT_SOURCE)
    : preChart;
  const preExpiryManual = PORTFOLIO_EXPIRY_MANUAL.isApplied(preTrafficLight)
    ? PORTFOLIO_EXPIRY_MANUAL.undoPortfolioExpiryManual(preTrafficLight, PORTFOLIO_EXPIRY_MANUAL_SOURCE)
    : preTrafficLight;
  const preBackendPortfolios = BACKEND_PORTFOLIOS.isApplied(preExpiryManual)
    ? BACKEND_PORTFOLIOS.undoBackendPortfolios(preExpiryManual, BACKEND_PORTFOLIOS_SOURCE)
    : preExpiryManual;
  const prePortfolio = PORTFOLIO_DATA_FETCH.isApplied(preBackendPortfolios)
    ? PORTFOLIO_DATA_FETCH.undoPortfolioDataFetch(preBackendPortfolios, PORTFOLIO_DATA_FETCH_SOURCE)
    : preBackendPortfolios;
  const preTradeDetail = JOURNAL_TRADE_DETAIL.isApplied(prePortfolio)
    ? JOURNAL_TRADE_DETAIL.undoJournalTradeDetail(prePortfolio, JOURNAL_TRADE_DETAIL_SOURCE)
    : prePortfolio;
  const preTradeForms = JOURNAL_TRADE_FORMS.isApplied(preTradeDetail)
    ? JOURNAL_TRADE_FORMS.undoJournalTradeForms(preTradeDetail, JOURNAL_TRADE_FORMS_SOURCE)
    : preTradeDetail;
  const preCloseLegs = JOURNAL_CLOSE_LEGS.isApplied(preTradeForms)
    ? JOURNAL_CLOSE_LEGS.undoJournalCloseLegs(preTradeForms, JOURNAL_CLOSE_LEGS_SOURCE)
    : preTradeForms;
  const preTtReconnect = TT_RECONNECT.isApplied(preCloseLegs)
    ? TT_RECONNECT.undoTtReconnect(preCloseLegs, TT_RECONNECT_SOURCE)
    : preCloseLegs;
  const preApexPostAuth = APEX_POST_AUTH.isApplied(preTtReconnect)
    ? APEX_POST_AUTH.undoApexPostAuthInit(preTtReconnect, APEX_POST_AUTH_SOURCE)
    : preTtReconnect;
  const preMcxCharts = MCX_CHARTS.isApplied(preApexPostAuth)
    ? MCX_CHARTS.undoMcxCharts(preApexPostAuth, MCX_CHARTS_SOURCE)
    : preApexPostAuth;
  const preMcxMacroCheck = MCX_MACRO_CHECK.isApplied(preMcxCharts)
    ? MCX_MACRO_CHECK.undoMcxMacroCheck(preMcxCharts, MCX_MACRO_CHECK_SOURCE)
    : preMcxCharts;
  const preBackupRestore = JOURNAL_BACKUP_RESTORE.isApplied(preMcxMacroCheck)
    ? JOURNAL_BACKUP_RESTORE.undoJournalBackupRestore(preMcxMacroCheck, JOURNAL_BACKUP_RESTORE_SOURCE)
    : preMcxMacroCheck;
  const preManualImport = JOURNAL_MANUAL_IMPORT.isApplied(preBackupRestore)
    ? JOURNAL_MANUAL_IMPORT.undoJournalManualImport(preBackupRestore, JOURNAL_MANUAL_IMPORT_SOURCE)
    : preBackupRestore;
  const preMigration = JOURNAL_MIGRATION.isApplied(preManualImport)
    ? JOURNAL_MIGRATION.undoJournalMigration(preManualImport, JOURNAL_MIGRATION_SOURCE)
    : preManualImport;
  const preWriteThrough = JOURNAL_WRITE_THROUGH.isApplied(preMigration)
    ? JOURNAL_WRITE_THROUGH.undoJournalBackendWriteThrough(preMigration, JOURNAL_WRITE_THROUGH_SOURCE)
    : preMigration;
  const preJournalRemote = JOURNAL_REMOTE.isApplied(preWriteThrough)
    ? JOURNAL_REMOTE.undoJournalRemotePersistence(preWriteThrough, JOURNAL_REMOTE_SOURCE)
    : preWriteThrough;
  const preJournalUi = JOURNAL_UI.isApplied(preJournalRemote)
    ? JOURNAL_UI.undoJournalUi(preJournalRemote, JOURNAL_UI_SOURCE)
    : preJournalRemote;
  const preRegime = REGIME.isApplied(preJournalUi)
    ? REGIME.undoMcxRegimePolicy(preJournalUi, REGIME_SOURCE)
    : preJournalUi;
  const preJournal = JOURNAL.isApplied(preRegime)
    ? JOURNAL.undoJournalCore(preRegime, JOURNAL_SOURCE)
    : preRegime;
  return MCX3.undoMcxPr3(preJournal, mcx3Source);
}

module.exports = {
  undoMcxPr3AfterJournal,
};
