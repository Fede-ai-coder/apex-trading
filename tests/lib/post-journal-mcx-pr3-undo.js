'use strict';
// Current-app reconstruction bridge after MCX macro check + Backup/Restore +
// Manual Import + Journal Migration + Write-through + Journal Remote + Journal
// UI + Regime Policy + Journal Core. Historical contracts that need to reach
// the pre-MCX3 tree must undo the newest MCX macro-check relocation first, then
// Backup/Restore, Manual Import, Migration, Write-through, Journal Remote,
// Journal UI, Regime Policy, Journal Core, and finally delegate to the original
// MCX3 identity guard. All layers remain independently fail-closed.
const fs = require('fs');
const path = require('path');
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
  const preMcxMacroCheck = MCX_MACRO_CHECK.isApplied(html)
    ? MCX_MACRO_CHECK.undoMcxMacroCheck(html, MCX_MACRO_CHECK_SOURCE)
    : html;
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
