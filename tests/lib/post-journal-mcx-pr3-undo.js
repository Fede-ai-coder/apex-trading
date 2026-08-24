'use strict';
// Current-app reconstruction bridge after Regime Policy + Journal Core.
// Historical contracts that need to reach the pre-MCX3 tree must undo the
// newest Regime Policy relocation first, then Journal Core, then delegate to
// the original MCX3 identity guard. All layers remain independently fail-closed.
const fs = require('fs');
const path = require('path');
const REGIME = require('./mcx-regime-policy-undo.js');
const JOURNAL = require('./journal-core-undo.js');
const MCX3 = require('./mcx-pr3-undo.js');

const REGIME_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'mcx-regime-policy.js'),
  'utf8'
);
const JOURNAL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-core.js'),
  'utf8'
);

function undoMcxPr3AfterJournal(html, mcx3Source) {
  const preRegime = REGIME.isApplied(html)
    ? REGIME.undoMcxRegimePolicy(html, REGIME_SOURCE)
    : html;
  const preJournal = JOURNAL.isApplied(preRegime)
    ? JOURNAL.undoJournalCore(preRegime, JOURNAL_SOURCE)
    : preRegime;
  return MCX3.undoMcxPr3(preJournal, mcx3Source);
}

module.exports = {
  undoMcxPr3AfterJournal,
};
