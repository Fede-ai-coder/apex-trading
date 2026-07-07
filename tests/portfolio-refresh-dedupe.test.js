const fs = require('fs');
const assert = require('assert');

const HTML = fs.readFileSync('index.html', 'utf8');

assert(HTML.includes('lastPortfolioRefreshDedupe:null'), 'state tracks last successful refresh dedupe key');
assert(HTML.includes('function _portfolioRefreshDedupeKey(portfolioId, positions)'), 'dedupe key helper exists');
assert(HTML.includes('positions=' + "' + (positions || []).length"), 'dedupe key includes positions count');
assert(HTML.includes("console.log('[PortfolioRefresh] requested refresh'"), 'refresh request diagnostics include trigger/source');
assert(HTML.includes("console.log('[PortfolioRefresh] skipped duplicate refresh'"), 'duplicate skip diagnostic exists');
assert(HTML.includes('!opts.userInitiated'), 'user initiated refreshes bypass duplicate suppression');
assert(HTML.includes('S.portfolioRefreshInFlight'), 'existing in-flight guard is preserved');
assert(HTML.includes("trigger:'portfolio_auto_refresh_start'"), 'auto-refresh startup caller has a trigger name');
assert(HTML.includes("trigger:'portfolio_auto_refresh_interval'"), 'auto-refresh interval caller has a trigger name');
assert(/trigger:\\'positions_panel_button\\'/.test(HTML), 'manual refresh caller has a trigger name');
assert(HTML.includes("trigger: 'option_chain_priority_trailing'"), 'option-chain trailing caller has a trigger name');

console.log('PASS: portfolio refresh dedupe diagnostics wired');
