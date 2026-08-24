'use strict';
// Current-app reconstruction bridge after the Journal Core extraction.
// Historical contracts that need to reach the pre-MCX3 tree must undo the
// newest Journal Core relocation first, then delegate to the original MCX3
// identity guard. Both layers remain independently fail-closed.
const fs = require('fs');
const path = require('path');
const JOURNAL = require('./journal-core-undo.js');
const MCX3 = require('./mcx-pr3-undo.js');

const JOURNAL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'js', 'services', 'journal-core.js'),
  'utf8'
);

function undoMcxPr3AfterJournal(html, mcx3Source) {
  const preJournal = JOURNAL.isApplied(html)
    ? JOURNAL.undoJournalCore(html, JOURNAL_SOURCE)
    : html;
  return MCX3.undoMcxPr3(preJournal, mcx3Source);
}

module.exports = {
  undoMcxPr3AfterJournal,
};
