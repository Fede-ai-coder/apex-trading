const fs = require('fs');
const assert = require('assert');

const html = require('./lib/load-app-source').loadAppJavaScriptSource();

assert(
  html.includes("_trades.filter(function(t) { return String(t.id || t.tradeId) !== sid; });"),
  'journalManager.remove compares stringified id/tradeId so backend string ids are removed locally'
);

assert(
  html.includes("onclick=\"deleteTrade(this.dataset.tid)\""),
  'journal delete button passes the raw data-tid instead of coercing backend string ids to NaN'
);

assert(
  html.includes("r.status === 404") && html.includes("already deleted remotely"),
  'remote journal delete treats HTTP 404 as already deleted remotely'
);

assert(
  html.includes("if (r.ok) return true;"),
  'remote journal delete treats successful DELETE responses, including 204, as success without requiring JSON'
);

const deleteStart = html.indexOf('function deleteTrade(id)');
const deleteEnd = html.indexOf('function renderPortfolioJournalView', deleteStart);
const deleteBlock = html.slice(deleteStart, deleteEnd);
assert(
  deleteBlock.includes('journalManager.remove(id)') &&
    !deleteBlock.includes('journalManager.close') &&
    !deleteBlock.includes("status: 'CLOSED'") &&
    !deleteBlock.includes("status:'CLOSED'"),
  'journal delete path removes trades rather than closing them'
);

console.log('✓ journal delete removes local state for 404/already-deleted backend trades');
