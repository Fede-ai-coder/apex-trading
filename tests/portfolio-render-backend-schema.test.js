'use strict';
// Backend-only portfolio schema render regression guard.
// Run: node tests/portfolio-render-backend-schema.test.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine) { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === inS) inS = null;
        continue;
      }
      if (c === '/' && n === '/') { inLine = true; j++; continue; }
      if (c === '/' && n === '*') { inBlock = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
  }
  throw new Error('function not found: ' + name);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const els = {
  portfolioListContent: { innerHTML: '' },
  positionsPanel: { style: { display: '' } },
};
const portfolios = [{
  id: 4242,
  name: 'Beta & Gamma',
  description: 'type=options',
  createdAt: '2026-06-16T00:00:00Z',
  updatedAt: '2026-06-16T00:00:00Z',
}];
const trades = [{ id: 'linked-1', portfolioId: 4242, status: 'OPEN', ticker: 'SPY' }];

const ctx = {
  console: { log() {}, warn() {}, error() {} },
  Date,
  String,
  Object,
  document: { getElementById: (id) => els[id] || null },
  portfolioManager: {
    getLoadError: () => null,
    getAll: () => portfolios.slice(),
    getSource: () => 'backend',
  },
  journalManager: {
    getAll: () => trades.slice(),
    getOpenTrades: (pid) => trades.filter(t => String(t.portfolioId) === String(pid) && t.status === 'OPEN'),
    getStats: () => ({ totalPnL: 0, closed: 0, winRate: 0 }),
  },
  escHtml: (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  jStatBox: (label, value) => '<span>' + label + ':' + value + '</span>',
  portStat: (label, value) => '<span>' + label + ':' + value + '</span>',
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(extractFn(HTML, '_portfolioRiskDebugEnabled') + '\n' + extractFn(HTML, 'getPortfolioJournalReconciliation') + '\n' + extractFn(HTML, 'renderPortfolioView'), ctx);

ctx.renderPortfolioView();

const html = els.portfolioListContent.innerHTML;
assert(html.includes('Beta &amp; Gamma'), 'portfolio name renders safely');
assert(html.includes('OPTIONS'), 'description fallback renders type label');
assert(html.includes('LINKED JOURNAL:1'), 'linked trade count renders');
assert(html.includes('OPEN LINKED:1'), 'open linked trade count renders');
assert(html.includes('VIEW LINKED TRADES IN JOURNAL (1)'), 'linked trade action count renders');
assert(!html.includes('undefined'), 'rendered card does not leak undefined type');

console.log('portfolio-render-backend-schema: all passed');
