'use strict';
// Current-app reconstruction bridge after Journal UI + Regime Policy + Journal Core.
// Historical contracts that need to reach the pre-MCX3 tree must undo the
// newest Journal UI relocation first, then Regime Policy, Journal Core, and
// finally delegate to the original MCX3 identity guard. All layers remain
// independently fail-closed.
const fs = require('fs');
const path = require('path');
const JOURNAL_UI = require('./journal-ui-undo.js');
const REGIME = require('./mcx-regime-policy-undo.js');
const JOURNAL = require('./journal-core-undo.js');
const MCX3 = require('./mcx-pr3-undo.js');

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
  const preJournalUi = JOURNAL_UI.isApplied(html)
    ? JOURNAL_UI.undoJournalUi(html, JOURNAL_UI_SOURCE)
    : html;
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
