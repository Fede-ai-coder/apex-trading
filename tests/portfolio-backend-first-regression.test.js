#!/usr/bin/env node
// Backend-first portfolio regression guards.
// Run: node tests/portfolio-backend-first-regression.test.js
const fs = require('fs');
const assert = require('assert');
const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();
function includes(s, msg){ assert(HTML.includes(s), msg); }
function matches(re, msg){ assert(re.test(HTML), msg); }

// Portfolio CRUD must use backend endpoints and compact backend logs.
includes("ttCall('/portfolios')", 'GET /portfolios is used for load');
includes("ttCall('/portfolios', { method:'POST'", 'POST /portfolios is used for create');
includes("method:'PUT'", 'PUT /portfolios/:id is used for update');
includes("method:'DELETE'", 'DELETE /portfolios/:id is used for delete');
includes('[PORTFOLIOS][BACKEND] load count=', 'load count log present');
includes('[PORTFOLIOS][BACKEND] created id=', 'created id log present');
includes('[PORTFOLIOS][BACKEND] updated id=', 'updated id log present');
includes('[PORTFOLIOS][BACKEND] deleted id=', 'deleted id log present');
includes('delete_blocked id=', 'portfolio_has_trades delete-block log present');
includes('Non puoi eliminare questo portafoglio perché contiene trade collegate.', 'delete-block user message present');

// New portfolio creation must not generate ids in the createPortfolio path.
const createStart = HTML.indexOf('async function createPortfolio()');
const createEnd = HTML.indexOf('async function deletePortfolio', createStart);
const createBody = HTML.slice(createStart, createEnd);
assert(!/Date\.now\s*\(/.test(createBody), 'createPortfolio does not generate ids with Date.now');
assert(!/id\s*:/.test(createBody), 'createPortfolio POST body does not include frontend id');
matches(/backendCreatePortfolio\(\{ name: name, description:/, 'createPortfolio sends backend-supported name/description body');

// Journal backend payload must carry snake_case portfolio_id and tolerate both aliases for filters/read.
const tfbStart = HTML.indexOf('function _tradeForBackend(trade)');
const tfbEnd = HTML.indexOf('(function() {', tfbStart);
const tfb = HTML.slice(tfbStart, tfbEnd);
includes('function _resolveTradePortfolioId(t)', 'portfolio id resolver exists');
assert(tfb.includes('t.portfolio_id = pid;'), '_tradeForBackend writes portfolio_id');
assert(tfb.includes('t.portfolioId = pid;'), '_tradeForBackend preserves portfolioId alias');
includes('if (t.portfolio_id != null', 'read path supports portfolio_id');
includes('return _trades.filter(function(t) { return _pfIdEq(t.portfolioId, portfolioId); });', 'portfolio filter uses tolerant id comparison');
includes('filterPortfolioId = prevVal || null;', 'journal filter keeps string ids instead of numeric coercion');

console.log('portfolio-backend-first-regression: all assertions passed');
