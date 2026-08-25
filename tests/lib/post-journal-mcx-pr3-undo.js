'use strict';
// Current-app reconstruction bridge after Journal Migration + Write-through +
// Journal Remote + Journal UI + Regime Policy + Journal Core.
// Historical contracts that need to reach the pre-MCX3 tree must undo the
// newest Migration relocation first, then Write-through, Journal Remote,
// Journal UI, Regime Policy, Journal Core, and finally delegate to the original
// MCX3 identity guard. All layers remain independently fail-closed.
const fs = require('fs');
const path = require('path');
const JOURNAL_MIGRATION = require('./journal-migration-undo.js');
const JOURNAL_WRITE_THROUGH = require('./journal-backend-write-through-undo.js');
const JOURNAL_REMOTE = require('./journal-remote-persistence-undo.js');
const JOURNAL_UI = require('./journal-ui-undo.js');
const REGIME = require('./mcx-regime-policy-undo.js');
const JOURNAL = require('./journal-core-undo.js');
const MCX3 = require('./mcx-pr3-undo.js');

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
  const preMigration = JOURNAL_MIGRATION.isApplied(html)
    ? JOURNAL_MIGRATION.undoJournalMigration(html, JOURNAL_MIGRATION_SOURCE)
    : html;
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
