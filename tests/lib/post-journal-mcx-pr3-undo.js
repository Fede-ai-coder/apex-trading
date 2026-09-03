'use strict';
// Current-app reconstruction bridge after Backend portfolios + Portfolio data
// fetch + Journal trade
// detail + Journal trade forms + Journal Close Legs + TT reconnect UI + Apex
// post-auth init + MCX charts + MCX macro check + Backup/Restore + Manual
// Import + Journal Migration + Write-through + Journal Remote + Journal UI +
// Regime Policy + Journal Core.
// Historical contracts that need to reach the pre-MCX3 tree must undo the
// newest Backend-portfolios relocation first, then Portfolio data fetch,
// then Journal trade detail,
// Journal trade forms, Journal Close Legs, TT reconnect, Apex post-auth, MCX
// charts, MCX macro check, Backup/Restore, Manual Import, Migration,
// Write-through, Journal Remote, Journal UI, Regime Policy, Journal Core, and
// finally delegate to the original MCX3 identity guard. All layers remain
// independently fail-closed.
//
// Journal trade forms is the first TWO-FRAGMENT layer here: its undo puts back
// two blocks, at their own offsets, ascending.
//
// Journal trade detail was the first layer whose module is DEFINED AFTER
// modules that already call it, which is safe only because nothing reads its
// owners at evaluation time; that is proved in its own contract, not here.
//
// Portfolio data fetch sits below the newest layer. Three of its four owners
// are async, which is unremarkable here — eleven of these seventeen layers
// ship async owners, journal-remote-persistence six of eight — and in every case it
// is not a load-time property: its contract proves the block has no top-level
// call, no top-level await, and no evaluation-time dependency read.
//
// Backend portfolios is the newest layer and sits on top of all of them. Its
// seam is not a closing brace: the region ends on a top-level statement,
// `window.viewLinkedTradesInJournal = …;`, so its body ends `;\n` and its raw
// fragment `;\n\n`. FIFTEEN of the sixteen earlier layers end `}\n`; the
// exception is journal-backend-write-through, which ends `})();`. It is
// also the first to carry top-level statements at all — twelve of them, all
// `window.X = X` re-exports and their `try` wrappers, which its contract proves
// read nothing the region does not own.
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
//     THE NINE FROM #406 ONWARD — macro check, #408 charts, #410 post-auth,
//     #411 TT reconnect, #413 close legs, #415 trade forms, #417 trade detail,
//     #421 portfolio data fetch, #423 backend portfolios —
//     treat the block as `body + one structural LF`. BOTH leave index.html,
//     only the body is written to the module file, and the undo re-inserts the
//     body followed by SEPARATOR.
//
// Both shapes are byte-exact; neither is a defect. The reliable tell is the
// `const SEPARATOR = '\n'` declaration: the nine newest have it, the eight
// oldest do not.
//
// What is NOT a reliable tell is the RAW_*/MODULE_* pair. Only SIX of the
// nine pin a single RAW_CHARS one unit longer than MODULE_CHARS — post-auth,
// TT reconnect, close legs, trade detail, portfolio data fetch and backend
// portfolios. The
// multi-fragment layers pin their fragments individually instead (charts weaves
// three, trade forms joins two), and macro check pins neither constant. A future layer that reasons about
// "the" convention must ask which era it means, and must not infer the era
// from those constants.
//
// Layer shapes, measured against the shipped modules rather than assumed, and
// scoped to what was actually measured: of the SEVENTEEN layers this bridge
// peels, every one is a single contiguous fragment except #408 (three) and
// #415 (two). That is not a statement about the repository at large — the MCX3
// delegate below this chain is itself two fragments, and the older EIC, PESS
// and SFS families were not measured here.
const fs = require('fs');
const path = require('path');
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
  const preBackendPortfolios = BACKEND_PORTFOLIOS.isApplied(html)
    ? BACKEND_PORTFOLIOS.undoBackendPortfolios(html, BACKEND_PORTFOLIOS_SOURCE)
    : html;
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
