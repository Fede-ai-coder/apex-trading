'use strict';

// Permanent boundary contract for the Journal Migration classic service.
// It proves byte identity against the merged #401 audit, classic load order,
// runtime migration policy, zero inline residue, cumulative undo, and strict
// separation from the adjacent console-only import and Backup/Restore UI.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const { maskLiterals, scanTopLevelDeclarations } = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '450f792be44caa6a537e68f3d16b211f9fc2cacc';
const BASE_TREE = '55dd52392c00956e4893d195e6edd7f6636c6e14';
const MODULE_REL = 'js/services/journal-migration.js';
const MODULE_TAG = '<script src="./js/services/journal-migration.js"></script>';
const MANUAL_TAG = '<script src="./js/services/journal-manual-import.js"></script>';
const BACKUP_RESTORE_TAG = '<script src="./js/ui/journal-backup-restore.js"></script>';
const CONTRACT_REL = 'tests/journal-migration-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/journal-migration-undo.js';

const CORE_TAG = '<script src="./js/services/journal-core.js"></script>';
const UI_TAG = '<script src="./js/ui/journal-ui.js"></script>';
const REMOTE_TAG = '<script src="./js/services/journal-remote-persistence.js"></script>';
const WRITE_TAG = '<script src="./js/services/journal-backend-write-through.js"></script>';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

const MIGRATION_MARKER =
  '// ── One-time migration: apex_trades → backend ─────────────────────\n';
const MANUAL_IMPORT_MARKER =
  '// ── Manual, console-only cross-host Journal trade import ──────────────────────\n';
const BACKUP_MARKER =
  '// ══════════════════════════════════════════════════════════════\n' +
  '// BACKUP / RESTORE PANEL\n';

const EXPECTED_SHAPE = [
  { name: '_jMigrationDone', form: 'var', isAsync: false },
  { name: 'jMigrateApexTradesToBackend', form: 'function', isAsync: true },
];
const EXPECTED_DEPENDENCIES = [
  'Array',
  'JSON',
  'Object',
  'S',
  'Set',
  'String',
  '_jRecordBackendSnapshot',
  '_normalizeBackendTradePortfolioId',
  '_tradeForBackend',
  '_ttCallWithRetry',
  'console',
  'isApexPreviewOrLocalEnv',
  'jSaveRemote',
  'journalManager',
  'ttCall',
];

const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const U = require('./lib/journal-migration-undo.js');
const CANDLE_CHART_U = require('./lib/backend-candle-store-chart-undo.js');
const TRAFFIC_LIGHT_U = require('./lib/portfolio-traffic-light-undo.js');
const EXPIRY_MANUAL_U = require('./lib/portfolio-expiry-manual-undo.js');
const BACKEND_PORTFOLIOS_U = require('./lib/backend-portfolios-undo.js');
const CANDLE_CHART_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/backend-candle-store-chart.js'), 'utf8');
const TRAFFIC_LIGHT_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-traffic-light.js'), 'utf8');
const EXPIRY_MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-expiry-manual.js'), 'utf8');
const BACKEND_PORTFOLIOS_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/backend-portfolios.js'), 'utf8');
const PORTFOLIO_U = require('./lib/portfolio-data-fetch-undo.js');
const TRADE_DETAIL_U = require('./lib/journal-trade-detail-undo.js');
const TRADE_FORMS_U = require('./lib/journal-trade-forms-undo.js');
const CLOSE_LEGS_U = require('./lib/journal-close-legs-undo.js');
const TT_RECONNECT_U = require('./lib/tt-reconnect-undo.js');
const APEX_POST_AUTH_U = require('./lib/apex-post-auth-init-undo.js');
const MCX_CHARTS_U = require('./lib/mcx-charts-undo.js');
const MCX_MACRO_CHECK_U = require('./lib/mcx-macro-check-undo.js');
const BACKUP_RESTORE_U = require('./lib/journal-backup-restore-undo.js');
const MANUAL_U = require('./lib/journal-manual-import-undo.js');
const PORTFOLIO_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-data-fetch.js'), 'utf8');
const TRADE_DETAIL_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-detail.js'), 'utf8');
const TRADE_FORMS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-forms.js'), 'utf8');
const CLOSE_LEGS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-close-legs.js'), 'utf8');
const TT_RECONNECT_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/tt-reconnect.js'), 'utf8');
const APEX_POST_AUTH_MODULE = fs.readFileSync(path.join(ROOT, 'js/services/apex-post-auth-init.js'), 'utf8');
const MCX_CHARTS_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-charts.js'), 'utf8');
const MCX_MACRO_CHECK_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/mcx-macro-check.js'), 'utf8');
const BACKUP_RESTORE_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-backup-restore.js'), 'utf8');
// The seventh Journal owner is the newest layer: peel Backup/Restore before Manual Import.
// The MCX charts/lifecycle owner is the newest layer of all, sitting on top of
// the MCX macro-check owner, which sits on top of Backup/Restore: peel them
// NEWEST-FIRST, so each undo below still sees the exact document it was cut
// against. Every helper re-verifies what it hands back by length and SHA-256,
// so each hop is proved, not assumed.
// The Apex shared post-auth lifecycle owner is now the NEWEST layer of all,
// sitting on top of MCX charts: peel it first so the MCX charts undo below
// still sees the exact document it was cut against.
// The TT reconnect UI owner is now the NEWEST layer of all, sitting on top of
// Apex post-auth: peel it first so the Apex undo below still sees the exact
// document it was cut against.
// The Journal Close Legs owner is now the NEWEST layer of all, sitting on top of
// TT reconnect: peel it first so the TT reconnect undo below still sees the
// exact document it was cut against.
// The Journal trade-forms owner is now the NEWEST layer of all, sitting on
// top of Close Legs: peel it first so every undo below still sees the exact
// document it was cut against.
// The Journal trade-detail owner is now the NEWEST layer of all, sitting on
// top of trade forms: peel it first so every undo below still sees the exact
// document it was cut against.
// The Portfolio data-fetch owner is now the NEWEST layer: peel it first so
// every undo below still sees the document it was cut against.
// Manual expiry is now the NEWEST layer of all: peel it first, then backend
// portfolios, so every undo below still sees the exact document it was cut
// against.
// The portfolio alignment + row traffic light pair is now the NEWEST layer of
// all, sitting on top of manual expiry: peel it FIRST so every undo below
// still sees the exact document it was cut against.
// The backend-candle-store chart pair is now the NEWEST layer of all, sitting
// on top of the traffic light: peel it FIRST so every undo below still sees
// the exact document it was cut against.
// The rich async snapshot was cut AFTER the candle-store chart, so it is the
// newest layer of all: peel it FIRST, before the chart.
const RICH_SNAPSHOT_U = require('./lib/journal-rich-snapshot-undo.js');
// The portfolio backend-candle fetch was cut AFTER the rich async snapshot, so
// it is the newest layer of all: peel it FIRST, before the snapshot.
const BACKEND_CANDLES_U = require('./lib/portfolio-backend-candles-undo.js');
// The journal snapshot prefetch was cut AFTER the portfolio backend-candle
// fetch, so it is the newest layer of all: peel it FIRST.
// The portfolio DXLink greeks pair was cut AFTER the journal snapshot
// prefetch, so it is the newest layer of all: peel it FIRST.
// The strategy templates were cut AFTER the portfolio DXLink greeks pair, so
// they are the newest layer of all: peel them FIRST.
// The vega monitor ratios were cut AFTER the strategy templates, so they are
// the newest layer of all: peel them FIRST.
const SWING_CHART_CACHE_EVALUATE_U = require('./lib/swing-chart-cache-evaluate-undo.js');
const APEX_PARITY_BACKEND_FETCH_U = require('./lib/apex-parity-backend-fetch-undo.js');
const SWING_TREND_CONTEXT_U = require('./lib/swing-trend-context-undo.js');
const APEX_PARITY_COMPARE_U = require('./lib/apex-parity-compare-undo.js');
const AI_SCAN_CONTEXT_U = require('./lib/ai-scan-context-undo.js');
const OPTION_CHAIN_ERROR_HELPERS_U = require('./lib/option-chain-error-helpers-undo.js');
const PORTFOLIO_BETA_MISSING_REASON_U = require('./lib/portfolio-beta-missing-reason-undo.js');
const PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U = require('./lib/portfolio-backend-squeeze-extract-undo.js');
const PORTFOLIO_REGIME_BADGE_HTML_U = require('./lib/portfolio-regime-badge-html-undo.js');
const JOURNAL_EXPIRY_AUDIT_U = require('./lib/journal-expiry-audit-undo.js');
const PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U = require('./lib/portfolio-stale-mark-squeeze-state-undo.js');
const SCANNER_DSS_1D_CHART_U = require('./lib/scanner-dss-1d-chart-undo.js');
const SCANNER_STOCK_SCORING_U = require('./lib/scanner-stock-scoring-undo.js');
const SWING_CHART_CACHE_HELPERS_U = require('./lib/swing-chart-cache-helpers-undo.js');
const SCANNER_DSS_CHART_LOAD_GUARD_U = require('./lib/scanner-dss-chart-load-guard-undo.js');
const OPTION_STREAMER_DIAGNOSTICS_U = require('./lib/option-streamer-diagnostics-undo.js');
const BACKEND_POSITIONS_ENRICHED_U = require('./lib/backend-positions-enriched-undo.js');
const RS_QUALITY_CHECK_U = require('./lib/rs-quality-check-undo.js');
const SCANNER_DXLINK_PRICES_U = require('./lib/scanner-dxlink-prices-undo.js');
const PORTFOLIO_MISSING_UNDERLYINGS_GATE_U = require('./lib/portfolio-missing-underlyings-gate-undo.js');
const PORTFOLIO_PRICE_FRESHNESS_U = require('./lib/portfolio-price-freshness-undo.js');
const PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U = require('./lib/portfolio-underlying-fallback-plan-undo.js');
const PORTFOLIO_GREEKS_FRESHNESS_U = require('./lib/portfolio-greeks-freshness-undo.js');
const RS_SKIP_BREAKDOWN_HTML_U = require('./lib/rs-skip-breakdown-html-undo.js');
const PORTFOLIO_TECHNICAL_BATCH_FETCH_U = require('./lib/portfolio-technical-batch-fetch-undo.js');
const PORTFOLIO_SNAPSHOT_FALLBACK_U = require('./lib/portfolio-snapshot-fallback-undo.js');
const BACKEND_FULL_REFRESH_VALIDATION_U = require('./lib/backend-full-refresh-validation-undo.js');
const PORTFOLIO_LEG_QUANTITY_U = require('./lib/portfolio-leg-quantity-undo.js');
const APEX_STORAGE_RECOVERY_U = require('./lib/apex-storage-recovery-undo.js');
const PORTFOLIO_SPY_PRICE_U = require('./lib/portfolio-spy-price-undo.js');
const PORTFOLIO_TECHNICAL_PARITY_U = require('./lib/portfolio-technical-parity-undo.js');
const DXLINK_GREEKS_FETCH_U = require('./lib/dxlink-greeks-fetch-undo.js');
const JOURNAL_MAP_AUDIT_U = require('./lib/journal-map-audit-undo.js');
const PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_U = require('./lib/portfolio-technical-alignment-debug-undo.js');
const PORTFOLIO_TECHNICAL_MERGE_U = require('./lib/portfolio-technical-merge-undo.js');
const BACKEND_POSITIONS_AGGREGATE_U = require('./lib/backend-positions-aggregate-undo.js');
const SWING_DIRECTION_U = require('./lib/swing-direction-undo.js');
const SWING_WEEKLY_CANDLES_U = require('./lib/swing-weekly-candles-undo.js');
const JOURNAL_SNAPSHOT_HELPERS_U = require('./lib/journal-snapshot-helpers-undo.js');
const CHART_INTERACTIONS_U = require('./lib/chart-interactions-undo.js');
const SCANNER_EARNINGS_U = require('./lib/scanner-earnings-throttle-undo.js');
const SCANNER_IVR_U = require('./lib/scanner-ivr-throttle-undo.js');
const VEGA_MONITOR_U = require('./lib/vega-monitor-undo.js');
const STRATEGY_TEMPLATES_U = require('./lib/strategy-templates-undo.js');
const DXLINK_GREEKS_U = require('./lib/portfolio-dxlink-greeks-undo.js');
// NEWEST FIRST. The chain below peels in the reverse of the cut order, so the
// newest layer comes off before any older one and peeling out of order throws
// rather than silently measuring the wrong document. WHICH layer is newest is
// not narrated here — the chain below IS that statement. The sentence this
// replaces named one, and stopped being true the next time a layer shipped.
const PRE_SWING_CHART_CACHE_EVALUATE = SWING_CHART_CACHE_EVALUATE_U.isApplied(INDEX)
  ? SWING_CHART_CACHE_EVALUATE_U.undoSwingChartCacheEvaluate(
      INDEX, fs.readFileSync(path.join(ROOT, 'js/services/swing-chart-cache-evaluate.js'), 'utf8'))
  : INDEX;
const PRE_APEX_PARITY_BACKEND_FETCH = APEX_PARITY_BACKEND_FETCH_U.isApplied(PRE_SWING_CHART_CACHE_EVALUATE)
  ? APEX_PARITY_BACKEND_FETCH_U.undoApexParityBackendFetch(
      PRE_SWING_CHART_CACHE_EVALUATE, fs.readFileSync(path.join(ROOT, 'js/services/apex-parity-backend-fetch.js'), 'utf8'))
  : PRE_SWING_CHART_CACHE_EVALUATE;
const PRE_SWING_TREND_CONTEXT = SWING_TREND_CONTEXT_U.isApplied(PRE_APEX_PARITY_BACKEND_FETCH)
  ? SWING_TREND_CONTEXT_U.undoSwingTrendContext(
      PRE_APEX_PARITY_BACKEND_FETCH, fs.readFileSync(path.join(ROOT, 'js/services/swing-trend-context.js'), 'utf8'))
  : PRE_APEX_PARITY_BACKEND_FETCH;
const PRE_APEX_PARITY_COMPARE = APEX_PARITY_COMPARE_U.isApplied(PRE_SWING_TREND_CONTEXT)
  ? APEX_PARITY_COMPARE_U.undoApexParityCompare(
      PRE_SWING_TREND_CONTEXT, fs.readFileSync(path.join(ROOT, 'js/services/apex-parity-compare.js'), 'utf8'))
  : PRE_SWING_TREND_CONTEXT;
const PRE_AI_SCAN_CONTEXT = AI_SCAN_CONTEXT_U.isApplied(PRE_APEX_PARITY_COMPARE)
  ? AI_SCAN_CONTEXT_U.undoAiScanContext(
      PRE_APEX_PARITY_COMPARE, fs.readFileSync(path.join(ROOT, 'js/services/ai-scan-context.js'), 'utf8'))
  : PRE_APEX_PARITY_COMPARE;
const PRE_OPTION_CHAIN_ERROR_HELPERS = OPTION_CHAIN_ERROR_HELPERS_U.isApplied(PRE_AI_SCAN_CONTEXT)
  ? OPTION_CHAIN_ERROR_HELPERS_U.undoOptionChainErrorHelpers(
      PRE_AI_SCAN_CONTEXT, fs.readFileSync(path.join(ROOT, 'js/services/option-chain-error-helpers.js'), 'utf8'))
  : PRE_AI_SCAN_CONTEXT;
const PRE_PORTFOLIO_BETA_MISSING_REASON = PORTFOLIO_BETA_MISSING_REASON_U.isApplied(PRE_OPTION_CHAIN_ERROR_HELPERS)
  ? PORTFOLIO_BETA_MISSING_REASON_U.undoPortfolioBetaMissingReason(
      PRE_OPTION_CHAIN_ERROR_HELPERS, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-beta-missing-reason.js'), 'utf8'))
  : PRE_OPTION_CHAIN_ERROR_HELPERS;
const PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT = PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U.isApplied(PRE_PORTFOLIO_BETA_MISSING_REASON)
  ? PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U.undoPortfolioBackendSqueezeExtract(
      PRE_PORTFOLIO_BETA_MISSING_REASON, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-backend-squeeze-extract.js'), 'utf8'))
  : PRE_PORTFOLIO_BETA_MISSING_REASON;
const PRE_PORTFOLIO_REGIME_BADGE_HTML = PORTFOLIO_REGIME_BADGE_HTML_U.isApplied(PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT)
  ? PORTFOLIO_REGIME_BADGE_HTML_U.undoPortfolioRegimeBadgeHtml(
      PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-regime-badge-html.js'), 'utf8'))
  : PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT;
const PRE_JOURNAL_EXPIRY_AUDIT = JOURNAL_EXPIRY_AUDIT_U.isApplied(PRE_PORTFOLIO_REGIME_BADGE_HTML)
  ? JOURNAL_EXPIRY_AUDIT_U.undoJournalExpiryAudit(
      PRE_PORTFOLIO_REGIME_BADGE_HTML, fs.readFileSync(path.join(ROOT, 'js/services/journal-expiry-audit.js'), 'utf8'))
  : PRE_PORTFOLIO_REGIME_BADGE_HTML;
const PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE = PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U.isApplied(PRE_JOURNAL_EXPIRY_AUDIT)
  ? PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U.undoPortfolioStaleMarkSqueezeState(
      PRE_JOURNAL_EXPIRY_AUDIT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-stale-mark-squeeze-state.js'), 'utf8'))
  : PRE_JOURNAL_EXPIRY_AUDIT;
const PRE_SCANNER_DSS_1D_CHART = SCANNER_DSS_1D_CHART_U.isApplied(PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE)
  ? SCANNER_DSS_1D_CHART_U.undoScannerDss1dChart(
      PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE, fs.readFileSync(path.join(ROOT, 'js/ui/scanner-dss-1d-chart.js'), 'utf8'))
  : PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE;
const PRE_SCANNER_STOCK_SCORING = SCANNER_STOCK_SCORING_U.isApplied(PRE_SCANNER_DSS_1D_CHART)
  ? SCANNER_STOCK_SCORING_U.undoScannerStockScoring(
      PRE_SCANNER_DSS_1D_CHART, fs.readFileSync(path.join(ROOT, 'js/services/scanner-stock-scoring.js'), 'utf8'))
  : PRE_SCANNER_DSS_1D_CHART;
const PRE_SWING_CHART_CACHE_HELPERS = SWING_CHART_CACHE_HELPERS_U.isApplied(PRE_SCANNER_STOCK_SCORING)
  ? SWING_CHART_CACHE_HELPERS_U.undoSwingChartCacheHelpers(
      PRE_SCANNER_STOCK_SCORING, fs.readFileSync(path.join(ROOT, 'js/services/swing-chart-cache-helpers.js'), 'utf8'))
  : PRE_SCANNER_STOCK_SCORING;
const PRE_SCANNER_DSS_CHART_LOAD_GUARD = SCANNER_DSS_CHART_LOAD_GUARD_U.isApplied(PRE_SWING_CHART_CACHE_HELPERS)
  ? SCANNER_DSS_CHART_LOAD_GUARD_U.undoScannerDssChartLoadGuard(
      PRE_SWING_CHART_CACHE_HELPERS, fs.readFileSync(path.join(ROOT, 'js/services/scanner-dss-chart-load-guard.js'), 'utf8'))
  : PRE_SWING_CHART_CACHE_HELPERS;
const PRE_OPTION_STREAMER_DIAGNOSTICS = OPTION_STREAMER_DIAGNOSTICS_U.isApplied(PRE_SCANNER_DSS_CHART_LOAD_GUARD)
  ? OPTION_STREAMER_DIAGNOSTICS_U.undoOptionStreamerDiagnostics(
      PRE_SCANNER_DSS_CHART_LOAD_GUARD, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-option-streamer-diagnostics.js'), 'utf8'))
  : PRE_SCANNER_DSS_CHART_LOAD_GUARD;
const PRE_BACKEND_POSITIONS_ENRICHED = BACKEND_POSITIONS_ENRICHED_U.isApplied(PRE_OPTION_STREAMER_DIAGNOSTICS)
  ? BACKEND_POSITIONS_ENRICHED_U.undoBackendPositionsEnriched(
      PRE_OPTION_STREAMER_DIAGNOSTICS, fs.readFileSync(path.join(ROOT, 'js/portfolio/backend-positions-enriched.js'), 'utf8'))
  : PRE_OPTION_STREAMER_DIAGNOSTICS;
const PRE_RS_QUALITY_CHECK = RS_QUALITY_CHECK_U.isApplied(PRE_BACKEND_POSITIONS_ENRICHED)
  ? RS_QUALITY_CHECK_U.undoRsQualityCheck(
      PRE_BACKEND_POSITIONS_ENRICHED, fs.readFileSync(path.join(ROOT, 'js/services/rs-quality-check.js'), 'utf8'))
  : PRE_BACKEND_POSITIONS_ENRICHED;
const PRE_SCANNER_DXLINK_PRICES = SCANNER_DXLINK_PRICES_U.isApplied(PRE_RS_QUALITY_CHECK)
  ? SCANNER_DXLINK_PRICES_U.undoScannerDxlinkPrices(
      PRE_RS_QUALITY_CHECK, fs.readFileSync(path.join(ROOT, 'js/services/scanner-dxlink-prices.js'), 'utf8'))
  : PRE_RS_QUALITY_CHECK;
const PRE_PORTFOLIO_MISSING_UNDERLYINGS_GATE = PORTFOLIO_MISSING_UNDERLYINGS_GATE_U.isApplied(PRE_SCANNER_DXLINK_PRICES)
  ? PORTFOLIO_MISSING_UNDERLYINGS_GATE_U.undoPortfolioMissingUnderlyingsGate(
      PRE_SCANNER_DXLINK_PRICES, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-missing-underlyings-gate.js'), 'utf8'))
  : PRE_SCANNER_DXLINK_PRICES;
const PRE_PORTFOLIO_PRICE_FRESHNESS = PORTFOLIO_PRICE_FRESHNESS_U.isApplied(PRE_PORTFOLIO_MISSING_UNDERLYINGS_GATE)
  ? PORTFOLIO_PRICE_FRESHNESS_U.undoPortfolioPriceFreshness(
      PRE_PORTFOLIO_MISSING_UNDERLYINGS_GATE, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-price-freshness.js'), 'utf8'))
  : PRE_PORTFOLIO_MISSING_UNDERLYINGS_GATE;
const PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN = PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U.isApplied(PRE_PORTFOLIO_PRICE_FRESHNESS)
  ? PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U.undoPortfolioUnderlyingFallbackPlan(
      PRE_PORTFOLIO_PRICE_FRESHNESS, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-underlying-fallback-plan.js'), 'utf8'))
  : PRE_PORTFOLIO_PRICE_FRESHNESS;
const PRE_PORTFOLIO_GREEKS_FRESHNESS = PORTFOLIO_GREEKS_FRESHNESS_U.isApplied(PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN)
  ? PORTFOLIO_GREEKS_FRESHNESS_U.undoPortfolioGreeksFreshness(
      PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-greeks-freshness.js'), 'utf8'))
  : PRE_PORTFOLIO_UNDERLYING_FALLBACK_PLAN;
const PRE_RS_SKIP_BREAKDOWN_HTML = RS_SKIP_BREAKDOWN_HTML_U.isApplied(PRE_PORTFOLIO_GREEKS_FRESHNESS)
  ? RS_SKIP_BREAKDOWN_HTML_U.undoRsSkipBreakdownHtml(
      PRE_PORTFOLIO_GREEKS_FRESHNESS, fs.readFileSync(path.join(ROOT, 'js/ui/rs-skip-breakdown-html.js'), 'utf8'))
  : PRE_PORTFOLIO_GREEKS_FRESHNESS;
const PRE_PORTFOLIO_TECHNICAL_BATCH_FETCH = PORTFOLIO_TECHNICAL_BATCH_FETCH_U.isApplied(PRE_RS_SKIP_BREAKDOWN_HTML)
  ? PORTFOLIO_TECHNICAL_BATCH_FETCH_U.undoPortfolioTechnicalBatchFetch(
      PRE_RS_SKIP_BREAKDOWN_HTML, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-batch-fetch.js'), 'utf8'))
  : PRE_RS_SKIP_BREAKDOWN_HTML;
const PRE_PORTFOLIO_SNAPSHOT_FALLBACK = PORTFOLIO_SNAPSHOT_FALLBACK_U.isApplied(PRE_PORTFOLIO_TECHNICAL_BATCH_FETCH)
  ? PORTFOLIO_SNAPSHOT_FALLBACK_U.undoPortfolioSnapshotFallback(
      PRE_PORTFOLIO_TECHNICAL_BATCH_FETCH, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-snapshot-fallback.js'), 'utf8'))
  : PRE_PORTFOLIO_TECHNICAL_BATCH_FETCH;
const PRE_BACKEND_FULL_REFRESH_VALIDATION = BACKEND_FULL_REFRESH_VALIDATION_U.isApplied(PRE_PORTFOLIO_SNAPSHOT_FALLBACK)
  ? BACKEND_FULL_REFRESH_VALIDATION_U.undoBackendFullRefreshValidation(
      PRE_PORTFOLIO_SNAPSHOT_FALLBACK, fs.readFileSync(path.join(ROOT, 'js/portfolio/backend-full-refresh-validation.js'), 'utf8'))
  : PRE_PORTFOLIO_SNAPSHOT_FALLBACK;
const PRE_PORTFOLIO_LEG_QUANTITY = PORTFOLIO_LEG_QUANTITY_U.isApplied(PRE_BACKEND_FULL_REFRESH_VALIDATION)
  ? PORTFOLIO_LEG_QUANTITY_U.undoPortfolioLegQuantity(
      PRE_BACKEND_FULL_REFRESH_VALIDATION, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-leg-quantity.js'), 'utf8'))
  : PRE_BACKEND_FULL_REFRESH_VALIDATION;
const PRE_APEX_STORAGE_RECOVERY = APEX_STORAGE_RECOVERY_U.isApplied(PRE_PORTFOLIO_LEG_QUANTITY)
  ? APEX_STORAGE_RECOVERY_U.undoApexStorageRecovery(
      PRE_PORTFOLIO_LEG_QUANTITY, fs.readFileSync(path.join(ROOT, 'js/services/apex-storage-recovery.js'), 'utf8'))
  : PRE_PORTFOLIO_LEG_QUANTITY;
const PRE_PORTFOLIO_SPY_PRICE = PORTFOLIO_SPY_PRICE_U.isApplied(PRE_APEX_STORAGE_RECOVERY)
  ? PORTFOLIO_SPY_PRICE_U.undoPortfolioSpyPrice(
      PRE_APEX_STORAGE_RECOVERY, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-spy-price.js'), 'utf8'))
  : PRE_APEX_STORAGE_RECOVERY;
const PRE_PORTFOLIO_TECHNICAL_PARITY = PORTFOLIO_TECHNICAL_PARITY_U.isApplied(PRE_PORTFOLIO_SPY_PRICE)
  ? PORTFOLIO_TECHNICAL_PARITY_U.undoPortfolioTechnicalParity(
      PRE_PORTFOLIO_SPY_PRICE, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-parity.js'), 'utf8'))
  : PRE_PORTFOLIO_SPY_PRICE;
const PRE_DXLINK_GREEKS_FETCH = DXLINK_GREEKS_FETCH_U.isApplied(PRE_PORTFOLIO_TECHNICAL_PARITY)
  ? DXLINK_GREEKS_FETCH_U.undoDxlinkGreeksFetch(
      PRE_PORTFOLIO_TECHNICAL_PARITY, fs.readFileSync(path.join(ROOT, 'js/services/dxlink-greeks-fetch.js'), 'utf8'))
  : PRE_PORTFOLIO_TECHNICAL_PARITY;
const PRE_JOURNAL_MAP_AUDIT = JOURNAL_MAP_AUDIT_U.isApplied(PRE_DXLINK_GREEKS_FETCH)
  ? JOURNAL_MAP_AUDIT_U.undoJournalMapAudit(
      PRE_DXLINK_GREEKS_FETCH, fs.readFileSync(path.join(ROOT, 'js/services/journal-map-audit.js'), 'utf8'))
  : PRE_DXLINK_GREEKS_FETCH;
const PRE_PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG = PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_U.isApplied(PRE_JOURNAL_MAP_AUDIT)
  ? PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_U.undoPortfolioTechnicalAlignmentDebug(
      PRE_JOURNAL_MAP_AUDIT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-alignment-debug.js'), 'utf8'))
  : PRE_JOURNAL_MAP_AUDIT;
const PRE_PORTFOLIO_TECHNICAL_MERGE = PORTFOLIO_TECHNICAL_MERGE_U.isApplied(PRE_PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG)
  ? PORTFOLIO_TECHNICAL_MERGE_U.undoPortfolioTechnicalMerge(
      PRE_PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG,
      fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-merge.js'), 'utf8'))
  : PRE_PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG;
const PRE_BACKEND_POSITIONS_AGGREGATE = BACKEND_POSITIONS_AGGREGATE_U.isApplied(PRE_PORTFOLIO_TECHNICAL_MERGE)
  ? BACKEND_POSITIONS_AGGREGATE_U.undoBackendPositionsAggregate(
      PRE_PORTFOLIO_TECHNICAL_MERGE,
      fs.readFileSync(path.join(ROOT, 'js/portfolio/backend-positions-aggregate.js'), 'utf8'))
  : PRE_PORTFOLIO_TECHNICAL_MERGE;
const PRE_SWING_DIRECTION = SWING_DIRECTION_U.isApplied(PRE_BACKEND_POSITIONS_AGGREGATE)
  ? SWING_DIRECTION_U.undoSwingDirection(
      PRE_BACKEND_POSITIONS_AGGREGATE,
      fs.readFileSync(path.join(ROOT, 'js/services/swing-direction.js'), 'utf8'))
  : PRE_BACKEND_POSITIONS_AGGREGATE;
const PRE_SWING_WEEKLY_CANDLES = SWING_WEEKLY_CANDLES_U.isApplied(PRE_SWING_DIRECTION)
  ? SWING_WEEKLY_CANDLES_U.undoSwingWeeklyCandles(
      PRE_SWING_DIRECTION, fs.readFileSync(path.join(ROOT, 'js/services/swing-weekly-candles.js'), 'utf8'))
  : PRE_SWING_DIRECTION;
const PRE_JOURNAL_SNAPSHOT_HELPERS = JOURNAL_SNAPSHOT_HELPERS_U.isApplied(PRE_SWING_WEEKLY_CANDLES)
  ? JOURNAL_SNAPSHOT_HELPERS_U.undoJournalSnapshotHelpers(
      PRE_SWING_WEEKLY_CANDLES, fs.readFileSync(path.join(ROOT, 'js/services/journal-snapshot-helpers.js'), 'utf8'))
  : PRE_SWING_WEEKLY_CANDLES;
const PRE_CHART_INTERACTIONS = CHART_INTERACTIONS_U.isApplied(PRE_JOURNAL_SNAPSHOT_HELPERS)
  ? CHART_INTERACTIONS_U.undoChartInteractions(
      PRE_JOURNAL_SNAPSHOT_HELPERS, fs.readFileSync(path.join(ROOT, 'js/ui/chart-interactions.js'), 'utf8'))
  : PRE_JOURNAL_SNAPSHOT_HELPERS;
const PRE_SCANNER_EARNINGS = SCANNER_EARNINGS_U.isApplied(PRE_CHART_INTERACTIONS)
  ? SCANNER_EARNINGS_U.undoScannerEarningsThrottle(
      PRE_CHART_INTERACTIONS, fs.readFileSync(path.join(ROOT, 'js/services/scanner-earnings-throttle.js'), 'utf8'))
  : PRE_CHART_INTERACTIONS;
const PRE_SCANNER_IVR = SCANNER_IVR_U.isApplied(PRE_SCANNER_EARNINGS)
  ? SCANNER_IVR_U.undoScannerIvrThrottle(
      PRE_SCANNER_EARNINGS, fs.readFileSync(path.join(ROOT, 'js/services/scanner-ivr-throttle.js'), 'utf8'))
  : PRE_SCANNER_EARNINGS;
const PRE_VEGA_MONITOR = VEGA_MONITOR_U.isApplied(PRE_SCANNER_IVR)
  ? VEGA_MONITOR_U.undoVegaMonitor(
      PRE_SCANNER_IVR, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-vega-monitor.js'), 'utf8'))
  : PRE_SCANNER_IVR;
const PRE_STRATEGY_TEMPLATES = STRATEGY_TEMPLATES_U.isApplied(PRE_VEGA_MONITOR)
  ? STRATEGY_TEMPLATES_U.undoStrategyTemplates(
      PRE_VEGA_MONITOR, fs.readFileSync(path.join(ROOT, 'js/config/strategy-templates.js'), 'utf8'))
  : PRE_VEGA_MONITOR;
const PRE_DXLINK_GREEKS = DXLINK_GREEKS_U.isApplied(PRE_STRATEGY_TEMPLATES)
  ? DXLINK_GREEKS_U.undoPortfolioDxlinkGreeks(
      PRE_STRATEGY_TEMPLATES, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-dxlink-greeks.js'), 'utf8'))
  : PRE_STRATEGY_TEMPLATES;
const SNAPSHOT_PREFETCH_U = require('./lib/journal-snapshot-prefetch-undo.js');
const PRE_SNAPSHOT_PREFETCH = SNAPSHOT_PREFETCH_U.isApplied(PRE_DXLINK_GREEKS)
  ? SNAPSHOT_PREFETCH_U.undoJournalSnapshotPrefetch(
      PRE_DXLINK_GREEKS, fs.readFileSync(path.join(ROOT, 'js/services/journal-snapshot-prefetch.js'), 'utf8'))
  : PRE_DXLINK_GREEKS;
const PRE_BACKEND_CANDLES = BACKEND_CANDLES_U.isApplied(PRE_SNAPSHOT_PREFETCH)
  ? BACKEND_CANDLES_U.undoPortfolioBackendCandles(
      PRE_SNAPSHOT_PREFETCH, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-backend-candles.js'), 'utf8'))
  : PRE_SNAPSHOT_PREFETCH;
const PRE_RICH_SNAPSHOT = RICH_SNAPSHOT_U.isApplied(PRE_BACKEND_CANDLES)
  ? RICH_SNAPSHOT_U.undoJournalRichSnapshot(
      PRE_BACKEND_CANDLES, fs.readFileSync(path.join(ROOT, 'js/services/journal-rich-snapshot.js'), 'utf8'))
  : PRE_BACKEND_CANDLES;
const preCandleChart = CANDLE_CHART_U.undoBackendCandleStoreChart(PRE_RICH_SNAPSHOT, CANDLE_CHART_MODULE);
const preTrafficLight = TRAFFIC_LIGHT_U.undoPortfolioTrafficLight(preCandleChart, TRAFFIC_LIGHT_MODULE);
const preExpiryManual = EXPIRY_MANUAL_U.undoPortfolioExpiryManual(preTrafficLight, EXPIRY_MANUAL_MODULE);
const preBackendPortfolios = BACKEND_PORTFOLIOS_U.undoBackendPortfolios(preExpiryManual, BACKEND_PORTFOLIOS_MODULE);
const prePortfolio = PORTFOLIO_U.undoPortfolioDataFetch(preBackendPortfolios, PORTFOLIO_MODULE);
const preTradeDetail = TRADE_DETAIL_U.undoJournalTradeDetail(prePortfolio, TRADE_DETAIL_MODULE);
const preTradeForms = TRADE_FORMS_U.undoJournalTradeForms(preTradeDetail, TRADE_FORMS_MODULE);
const preCloseLegs = CLOSE_LEGS_U.undoJournalCloseLegs(preTradeForms, CLOSE_LEGS_MODULE);
const preTtReconnect = TT_RECONNECT_U.undoTtReconnect(preCloseLegs, TT_RECONNECT_MODULE);
// No assertions here: this peel runs before the harness is initialised. The
// undo helper verifies the reconstruction's length and SHA-256 itself and
// throws on any mismatch, so the hop is proved rather than assumed.
const preApexPostAuth = APEX_POST_AUTH_U.undoApexPostAuthInit(preTtReconnect, APEX_POST_AUTH_MODULE);
const preMcxCharts = MCX_CHARTS_U.undoMcxCharts(preApexPostAuth, MCX_CHARTS_MODULE);
const preMcxMacroCheck = MCX_MACRO_CHECK_U.undoMcxMacroCheck(preMcxCharts, MCX_MACRO_CHECK_MODULE);
const preBackupRestore = BACKUP_RESTORE_U.undoJournalBackupRestore(preMcxMacroCheck, BACKUP_RESTORE_MODULE);

const MANUAL_MODULE = fs.readFileSync(
  path.join(ROOT, 'js/services/journal-manual-import.js'), 'utf8'
);
const WRITE_U = require('./lib/journal-backend-write-through-undo.js');
const WRITE_MODULE = fs.readFileSync(
  path.join(ROOT, 'js/services/journal-backend-write-through.js'), 'utf8'
);
const BASE = execFileSync('git', ['show', BASE_SHA + ':index.html'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

const migrationAt = BASE.indexOf(MIGRATION_MARKER);
const manualImportAt = BASE.indexOf(MANUAL_IMPORT_MARKER);
const backupAt = BASE.indexOf(BACKUP_MARKER);
const inlineCloseAt = BASE.indexOf('</script>', backupAt);
const candidateEnd = manualImportAt - 1; // Keep one separator LF with manual import.
const manualEnd = backupAt - 1;
const CANDIDATE = BASE.slice(migrationAt, candidateEnd);
const MANUAL_ONLY = BASE.slice(manualImportAt, manualEnd);
const BACKUP_ONLY = BASE.slice(backupAt, inlineCloseAt);

const APP_PARTS = APP_LOADER.loadOrderedScriptSources()
  .filter((part) => part.isAppJs && part.code != null)
  .map((part) => ({
    name: part.kind === 'inline' ? 'index.html:inline' : part.src,
    code: part.src === './js/services/journal-migration.js' ? '\n' : part.code,
  }));
const OUTSIDE_APP = APP_PARTS.map((part) => part.code).join('\n');

let pass = 0;
function ok(value, message) {
  assert.ok(value, message);
  pass++;
}
function eq(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
  pass++;
}
function jsonEq(actual, expected, message) {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected), message);
  pass++;
}
function section(title) {
  console.log('\n' + title);
}
function sha256(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}

eq(preTtReconnect.length, TT_RECONNECT_U.BASE_CHARS,
  'peeling the TT reconnect layer reaches the pinned post-#410 index length');
eq(sha256(preTtReconnect), TT_RECONNECT_U.BASE_SHA256,
  'peeling the TT reconnect layer reaches the pinned post-#410 index hash');
ok(TT_RECONNECT_U.isApplied(preCloseLegs),
  'the post-#412 document really does carry the TT reconnect layer being peeled');
ok(!TT_RECONNECT_U.isApplied(preTtReconnect),
  'the peeled document no longer carries the TT reconnect tag');
eq(preApexPostAuth.length, APEX_POST_AUTH_U.BASE_CHARS,
  'peeling the Apex post-auth layer reaches the pinned post-#409 index length');
eq(sha256(preApexPostAuth), APEX_POST_AUTH_U.BASE_SHA256,
  'peeling the Apex post-auth layer reaches the pinned post-#409 index hash');
ok(APEX_POST_AUTH_U.isApplied(preTtReconnect),
  'the post-#410 document really does carry the Apex post-auth layer being peeled');
ok(!APEX_POST_AUTH_U.isApplied(preApexPostAuth),
  'the peeled document no longer carries the Apex post-auth tag');
eq(preMcxCharts.length, MCX_CHARTS_U.BASE_CHARS,
  'peeling the MCX charts layer reaches the pinned post-#406 index length');
eq(sha256(preMcxCharts), MCX_CHARTS_U.BASE_SHA256,
  'peeling the MCX charts layer reaches the pinned post-#406 index hash');
ok(MCX_CHARTS_U.isApplied(preApexPostAuth),
  'the post-#409 document really does carry the MCX charts layer being peeled');
ok(!MCX_CHARTS_U.isApplied(preMcxCharts),
  'the peeled document no longer carries the MCX charts tag');
eq(preMcxMacroCheck.length, MCX_MACRO_CHECK_U.BASE_CHARS,
  'peeling the MCX macro-check layer reaches the pinned post-#405 index length');
eq(sha256(preMcxMacroCheck), MCX_MACRO_CHECK_U.BASE_SHA256,
  'peeling the MCX macro-check layer reaches the pinned post-#405 index hash');
ok(MCX_MACRO_CHECK_U.isApplied(preMcxCharts),
  'the charts-peeled index really does carry the MCX macro-check layer being peeled');
ok(!MCX_MACRO_CHECK_U.isApplied(preMcxMacroCheck),
  'the peeled document no longer carries the MCX macro-check tag');
function countLiteral(source, needle) {
  let count = 0;
  let at = 0;
  while ((at = source.indexOf(needle, at)) >= 0) {
    count++;
    at += needle.length;
  }
  return count;
}
function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function identifierCountMasked(masked, name) {
  const re = new RegExp(
    '(?:^|[^A-Za-z0-9_$])' + escapeRegExp(name) + '(?![A-Za-z0-9_$])',
    'gm'
  );
  return (masked.match(re) || []).length;
}
function externalUsage(name) {
  return APP_PARTS.map((part) => ({
    where: part.name,
    refs: identifierCountMasked(maskLiterals(part.code), name),
  })).filter((entry) => entry.refs > 0);
}
function changedPaths() {
  const committed = execFileSync('git', ['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim().split(/\r?\n/).filter(Boolean);
  const statusOutput = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const status = statusOutput.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
  return Array.from(new Set(committed.concat(status))).sort();
}
function topLevelShape(source) {
  return scanTopLevelDeclarations(source).map((entry) => ({
    name: entry.name,
    form: entry.form,
    isAsync: entry.isAsync,
  }));
}

const JS_KEYWORDS = new Set([
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'new', 'typeof', 'instanceof',
  'in', 'of', 'this', 'null', 'true', 'false', 'void', 'delete', 'throw',
  'try', 'catch', 'finally', 'default', 'yield', 'await', 'async', 'class',
  'extends', 'super', 'undefined',
]);

function freeIdentifiers(source) {
  const masked = maskLiterals(source);
  const declared = new Set();
  let match;

  const functionRe = /\bfunction\s*([A-Za-z0-9_$]*)\s*\(([^)]*)\)/g;
  while ((match = functionRe.exec(masked))) {
    if (match[1]) declared.add(match[1]);
    match[2].split(',').map((part) => part.trim()).filter(Boolean).forEach((param) => {
      declared.add(param.replace(/[^A-Za-z0-9_$].*$/, ''));
    });
  }
  const declarationRe = /\b(?:var|let|const)\s+([A-Za-z0-9_$]+)/g;
  while ((match = declarationRe.exec(masked))) declared.add(match[1]);
  const commaDeclarationRe = /,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  while ((match = commaDeclarationRe.exec(masked))) declared.add(match[1]);
  const catchRe = /\bcatch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((match = catchRe.exec(masked))) declared.add(match[1]);

  const free = new Set();
  const identifierRe = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b\s*(:?)/g;
  while ((match = identifierRe.exec(masked))) {
    if (match[1] === '.') continue;
    const name = match[2];
    if (JS_KEYWORDS.has(name) || declared.has(name)) continue;
    if (match[3] === ':' && /[{,]\s*$/.test(masked.slice(Math.max(0, match.index - 40), match.index))) continue;
    free.add(name);
  }
  return Array.from(free).sort();
}

function directEffects(source) {
  const masked = maskLiterals(source);
  const patterns = {
    document: /\bdocument\s*\./g,
    fetch: /\bfetch\s*\(/g,
    ttCall: /\bttCall\s*\(/g,
    retryTransport: /\b_ttCallWithRetry\s*\(/g,
    jSaveRemote: /\bjSaveRemote\s*\(/g,
    setTimeout: /\bsetTimeout\s*\(/g,
    setInterval: /\bsetInterval\s*\(/g,
    WebSocket: /\b(?:new\s+)?WebSocket\b/g,
    addEventListener: /\baddEventListener\s*\(/g,
    localStorage: /\blocalStorage\s*\./g,
    window: /\bwindow\s*\./g,
    confirm: /\b(?:window\.)?confirm\s*\(/g,
  };
  return Object.fromEntries(Object.entries(patterns).map(([name, re]) => [
    name,
    (masked.match(re) || []).length,
  ]));
}

function ownerDeclarationCounts(source) {
  const masked = maskLiterals(source);
  return {
    state: (masked.match(/^\s*var\s+_jMigrationDone\b/gm) || []).length,
    migrate: (masked.match(/^\s*async\s+function\s+jMigrateApexTradesToBackend\s*\(/gm) || []).length,
  };
}

function loadCandidate(source) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: MODULE_REL });
    return { ok: true, error: null, sandbox };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error), sandbox };
  }
}

function boundaryViolations(source, outsideSource) {
  const violations = [];
  if (JSON.stringify(topLevelShape(source)) !== JSON.stringify(EXPECTED_SHAPE)) violations.push('manifest');
  if (JSON.stringify(freeIdentifiers(source)) !== JSON.stringify(EXPECTED_DEPENDENCIES)) violations.push('dependencies');
  const effects = directEffects(source);
  const forbidden = [
    'document', 'fetch', 'setTimeout', 'setInterval', 'WebSocket',
    'addEventListener', 'localStorage', 'window', 'confirm',
  ];
  if (forbidden.some((name) => effects[name] !== 0)) violations.push('foreign-direct-effect');
  if (effects.ttCall !== 1 || effects.retryTransport !== 1 || effects.jSaveRemote !== 1) {
    violations.push('delegation-shape');
  }
  if (countLiteral(maskLiterals(source), 'isApexPreviewOrLocalEnv()') !== 1) violations.push('preview-gate');
  if (!loadCandidate(source).ok) violations.push('load-contract');
  if (source.includes(MANUAL_IMPORT_MARKER) || source.includes(BACKUP_MARKER)) violations.push('owner-overreach');
  const later = ownerDeclarationCounts(outsideSource);
  if (later.state !== 0 || later.migrate !== 0) violations.push('competing-owner');
  return violations;
}

function moduleOrderViolations(html) {
  const violations = [];
  if (countLiteral(html, MODULE_TAG) !== 1) violations.push('tag-count');
  const coreAt = html.indexOf(CORE_TAG);
  const uiAt = html.indexOf(UI_TAG);
  const remoteAt = html.indexOf(REMOTE_TAG);
  const writeAt = html.indexOf(WRITE_TAG);
  const moduleAt = html.indexOf(MODULE_TAG);
  const manualAt = html.indexOf(MANUAL_TAG);
  const inlineAt = html.indexOf(INLINE_OPEN);
  if (!(coreAt >= 0 && coreAt < uiAt && uiAt < remoteAt && remoteAt < writeAt &&
        writeAt < moduleAt && moduleAt < manualAt && manualAt < inlineAt)) {
    violations.push('load-order');
  }
  const tags = APP_LOADER.parseScriptTags(html)
    .filter((entry) => entry.src === './js/services/journal-migration.js');
  if (tags.length !== 1 || tags[0].attrs.trim() !== 'src="./js/services/journal-migration.js"') {
    violations.push('classic-tag');
  }
  return violations;
}

function makeMigrationContext(options) {
  const opts = options || {};
  let trades = (opts.localTrades || []).map((trade) => Object.assign({}, trade));
  const stats = {
    gateCalls: 0,
    fallbackCalls: 0,
    retryCalls: 0,
    getAllCalls: 0,
    merged: [],
    snapshots: [],
    saves: [],
    logs: [],
  };
  const outcomes = (opts.saveOutcomes || []).slice();
  const transport = async function(pathname) {
    if (opts.useRetry) stats.retryCalls++; else stats.fallbackCalls++;
    if (opts.backendError) throw opts.backendError;
    ok(pathname === '/journal/trades', 'runtime transport requests only /journal/trades');
    return opts.backendResponse !== undefined
      ? opts.backendResponse
      : { trades: (opts.backendTrades || []).map((trade) => Object.assign({}, trade)) };
  };
  const sandbox = {
    console: {
      log(...args) { stats.logs.push(args.map(String).join(' ')); },
      warn(...args) { stats.logs.push(args.map(String).join(' ')); },
      error(...args) { stats.logs.push(args.map(String).join(' ')); },
    },
    JSON,
    Array,
    Object,
    String,
    Set,
    Promise,
    S: { backendKey: opts.backendKey === undefined ? 'key-1' : opts.backendKey },
    isApexPreviewOrLocalEnv() {
      stats.gateCalls++;
      return !!opts.preview;
    },
    ttCall: transport,
    _normalizeBackendTradePortfolioId(trade) {
      const normalized = Object.assign({}, trade);
      if (normalized.portfolioId == null && normalized.portfolio_id != null) {
        normalized.portfolioId = normalized.portfolio_id;
      }
      return normalized;
    },
    _jRecordBackendSnapshot(normalized) {
      stats.snapshots.push(JSON.parse(JSON.stringify(normalized)));
    },
    _tradeForBackend(trade) {
      const payload = Object.assign({}, trade, { id: String(trade.id) });
      delete payload.live;
      return payload;
    },
    async jSaveRemote(trade) {
      stats.saves.push(JSON.parse(JSON.stringify(trade)));
      return outcomes.length ? outcomes.shift() : true;
    },
    journalManager: {
      getAll() {
        stats.getAllCalls++;
        return trades.slice();
      },
      loadFromBackend(normalized) {
        const incoming = JSON.parse(JSON.stringify(normalized));
        stats.merged.push(incoming);
        let changed = 0;
        incoming.forEach((trade) => {
          const index = trades.findIndex((local) => String(local.id) === String(trade.id));
          if (index >= 0) trades[index] = trade;
          else { trades.push(trade); changed++; }
        });
        return changed;
      },
    },
  };
  if (opts.useRetry) sandbox._ttCallWithRetry = transport;
  vm.createContext(sandbox);
  vm.runInContext(MODULE, sandbox, { filename: MODULE_REL });
  sandbox.__stats = stats;
  sandbox.__trades = () => trades.slice();
  return sandbox;
}

console.log('JOURNAL MIGRATION BOUNDARY CONTRACT');
console.log('base=' + BASE_SHA);

section('1. Pinned #401 audit base and exact extracted artifacts');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_SHA, 'merged #401 audit base resolves exactly');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{tree}'], {
  cwd: ROOT, encoding: 'utf8',
}).trim(), BASE_TREE, 'merged #401 audit tree resolves exactly');
eq(BASE.length, U.BASE_CHARS, 'audit-base UTF-16 length matches the undo pin');
eq(sha256(BASE), U.BASE_SHA256, 'audit-base SHA-256 matches the undo pin');
eq(MODULE.length, U.MODULE_CHARS, 'module UTF-16 length matches the undo pin');
eq(sha256(MODULE), U.MODULE_SHA256, 'module SHA-256 matches the undo pin');
eq(INDEX.length, SWING_CHART_CACHE_EVALUATE_U.EXTRACTED_CHARS, 'the live shipped index UTF-16 length is the newest layer’s extracted value');
eq(sha256(INDEX), SWING_CHART_CACHE_EVALUATE_U.EXTRACTED_SHA256,
  'the live shipped index SHA-256 is the newest layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_SWING_CHART_CACHE_EVALUATE.length, APEX_PARITY_BACKEND_FETCH_U.EXTRACTED_CHARS,
  'peeling the newest layer reaches the apex parity backend fetch layer’s extracted length');
eq(sha256(PRE_SWING_CHART_CACHE_EVALUATE), APEX_PARITY_BACKEND_FETCH_U.EXTRACTED_SHA256,
  'peeling the newest layer reaches the apex parity backend fetch layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_APEX_PARITY_BACKEND_FETCH.length, SWING_TREND_CONTEXT_U.EXTRACTED_CHARS,
  'peeling the apex parity backend fetch layer reaches the swing trend context layer’s extracted length');
eq(sha256(PRE_APEX_PARITY_BACKEND_FETCH), SWING_TREND_CONTEXT_U.EXTRACTED_SHA256,
  'peeling the apex parity backend fetch layer reaches the swing trend context layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_SWING_TREND_CONTEXT.length, APEX_PARITY_COMPARE_U.EXTRACTED_CHARS,
  'peeling the swing trend context layer reaches the apex parity compare layer’s extracted length');
eq(sha256(PRE_SWING_TREND_CONTEXT), APEX_PARITY_COMPARE_U.EXTRACTED_SHA256,
  'peeling the swing trend context layer reaches the apex parity compare layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_APEX_PARITY_COMPARE.length, AI_SCAN_CONTEXT_U.EXTRACTED_CHARS,
  'peeling the apex parity compare layer reaches the AI scan context layer’s extracted length');
eq(sha256(PRE_APEX_PARITY_COMPARE), AI_SCAN_CONTEXT_U.EXTRACTED_SHA256,
  'peeling the apex parity compare layer reaches the AI scan context layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_AI_SCAN_CONTEXT.length, OPTION_CHAIN_ERROR_HELPERS_U.EXTRACTED_CHARS,
  'peeling the AI scan context layer reaches the option-chain error helpers layer’s extracted length');
eq(sha256(PRE_AI_SCAN_CONTEXT), OPTION_CHAIN_ERROR_HELPERS_U.EXTRACTED_SHA256,
  'peeling the AI scan context layer reaches the option-chain error helpers layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_OPTION_CHAIN_ERROR_HELPERS.length, PORTFOLIO_BETA_MISSING_REASON_U.EXTRACTED_CHARS,
  'peeling the option-chain error helpers layer reaches the beta missing-reason layer’s extracted length');
eq(sha256(PRE_OPTION_CHAIN_ERROR_HELPERS), PORTFOLIO_BETA_MISSING_REASON_U.EXTRACTED_SHA256,
  'peeling the option-chain error helpers layer reaches the beta missing-reason layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_PORTFOLIO_BETA_MISSING_REASON.length, PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U.EXTRACTED_CHARS,
  'peeling the beta missing-reason layer reaches the backend squeeze extract layer’s extracted length');
eq(sha256(PRE_PORTFOLIO_BETA_MISSING_REASON), PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U.EXTRACTED_SHA256,
  'peeling the beta missing-reason layer reaches the backend squeeze extract layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT.length, PORTFOLIO_REGIME_BADGE_HTML_U.EXTRACTED_CHARS,
  'peeling the backend squeeze extract layer reaches the portfolio regime badge HTML layer’s extracted length');
eq(sha256(PRE_PORTFOLIO_BACKEND_SQUEEZE_EXTRACT), PORTFOLIO_REGIME_BADGE_HTML_U.EXTRACTED_SHA256,
  'peeling the backend squeeze extract layer reaches the portfolio regime badge HTML layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_PORTFOLIO_REGIME_BADGE_HTML.length, JOURNAL_EXPIRY_AUDIT_U.EXTRACTED_CHARS,
  'peeling the portfolio regime badge HTML layer reaches the journal expiry audit layer’s extracted length');
eq(sha256(PRE_PORTFOLIO_REGIME_BADGE_HTML), JOURNAL_EXPIRY_AUDIT_U.EXTRACTED_SHA256,
  'peeling the portfolio regime badge HTML layer reaches the journal expiry audit layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_JOURNAL_EXPIRY_AUDIT.length, PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U.EXTRACTED_CHARS,
  'peeling the journal expiry audit layer reaches the portfolio stale mark and squeeze state layer’s extracted length');
eq(sha256(PRE_JOURNAL_EXPIRY_AUDIT), PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U.EXTRACTED_SHA256,
  'peeling the journal expiry audit layer reaches the portfolio stale mark and squeeze state layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE.length, SCANNER_DSS_1D_CHART_U.EXTRACTED_CHARS,
  'peeling the portfolio stale mark and squeeze state layer reaches the scanner DSS 1D chart layer’s extracted length');
eq(sha256(PRE_PORTFOLIO_STALE_MARK_SQUEEZE_STATE), SCANNER_DSS_1D_CHART_U.EXTRACTED_SHA256,
  'peeling the portfolio stale mark and squeeze state layer reaches the scanner DSS 1D chart layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_SCANNER_DSS_1D_CHART.length, SCANNER_STOCK_SCORING_U.EXTRACTED_CHARS,
  'peeling the scanner DSS 1D chart layer reaches the scanner stock scoring layer’s extracted length');
eq(sha256(PRE_SCANNER_DSS_1D_CHART), SCANNER_STOCK_SCORING_U.EXTRACTED_SHA256,
  'peeling the scanner DSS 1D chart layer reaches the scanner stock scoring layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_SCANNER_STOCK_SCORING.length, SWING_CHART_CACHE_HELPERS_U.EXTRACTED_CHARS,
  'peeling the scanner stock scoring layer reaches the swing chart cache helpers layer’s extracted length');
eq(sha256(PRE_SCANNER_STOCK_SCORING), SWING_CHART_CACHE_HELPERS_U.EXTRACTED_SHA256,
  'peeling the scanner stock scoring layer reaches the swing chart cache helpers layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_SWING_CHART_CACHE_HELPERS.length, SCANNER_DSS_CHART_LOAD_GUARD_U.EXTRACTED_CHARS,
  'peeling the swing chart cache helpers layer reaches the DSS chart load guard layer’s extracted length');
eq(sha256(PRE_SWING_CHART_CACHE_HELPERS), SCANNER_DSS_CHART_LOAD_GUARD_U.EXTRACTED_SHA256,
  'peeling the swing chart cache helpers layer reaches the DSS chart load guard layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_SCANNER_DSS_CHART_LOAD_GUARD.length, OPTION_STREAMER_DIAGNOSTICS_U.EXTRACTED_CHARS,
  'peeling the DSS chart load guard layer reaches the option streamer diagnostics layer’s extracted length');
eq(sha256(PRE_SCANNER_DSS_CHART_LOAD_GUARD), OPTION_STREAMER_DIAGNOSTICS_U.EXTRACTED_SHA256,
  'peeling the DSS chart load guard layer reaches the option streamer diagnostics layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_OPTION_STREAMER_DIAGNOSTICS.length, BACKEND_POSITIONS_ENRICHED_U.EXTRACTED_CHARS,
  'peeling the option streamer diagnostics layer reaches the backend positions enriched layer’s extracted length');
eq(sha256(PRE_OPTION_STREAMER_DIAGNOSTICS), BACKEND_POSITIONS_ENRICHED_U.EXTRACTED_SHA256,
  'peeling the option streamer diagnostics layer reaches the backend positions enriched layer’s extracted digest');
// Re-terminated with the chain: the pins above moved up to the newest layer, so the
// layer they used to name is asserted here on the peeled state rather than dropped.
eq(PRE_BACKEND_POSITIONS_ENRICHED.length, RS_QUALITY_CHECK_U.EXTRACTED_CHARS,
  'peeling the newest layer reaches the RS quality check’s extracted length');
eq(sha256(PRE_BACKEND_POSITIONS_ENRICHED), RS_QUALITY_CHECK_U.EXTRACTED_SHA256,
  'peeling the newest layer reaches the RS quality check’s extracted digest');
// Re-terminated with the chain, again: the live pin moves up to the strategy
// templates, and the post-DXLink-greeks document it used to name is asserted
// here on the peeled state, so shifting the chain never leaves a slot pinned by
// nothing.
eq(PRE_STRATEGY_TEMPLATES.length, 1577450,
  'peeling the strategy templates reaches the post-DXLink-greeks length');
eq(sha256(PRE_STRATEGY_TEMPLATES), '572a03e9f80c0f93c0dafb626b45cc1c3388703d531d14a72e5956853de34928',
  '…and the post-DXLink-greeks hash');
// The same re-termination one cycle earlier, for the snapshot-prefetch document.
eq(PRE_DXLINK_GREEKS.length, 1583906, 'peeling the DXLink greeks layer reaches the post-snapshot-prefetch length');
eq(sha256(PRE_DXLINK_GREEKS), '77e3e862c6f4d496b9d90f0256ccf22ad9ed510868d704f2bfae5041d29158e6',
  '…and the post-snapshot-prefetch hash');
// Re-terminate the chain: the post-backend-candles document those two lines
// used to pin is now one layer down, so it is pinned explicitly here.
eq(PRE_SNAPSHOT_PREFETCH.length, 1594508,
  'peeling the snapshot prefetch reaches the post-backend-candles length');
eq(sha256(PRE_SNAPSHOT_PREFETCH), '37703d19026490a5d830caa20f6afa9e08f859b5db749acc378c51bfa4865d00',
  '…and the post-backend-candles hash');
// Re-terminate the chain: the post-rich-snapshot document those two lines used
// to pin is now one layer down, so it is pinned explicitly here.
eq(PRE_BACKEND_CANDLES.length, 1602259,
  'peeling the backend-candle fetch reaches the post-rich-snapshot length');
eq(sha256(PRE_BACKEND_CANDLES), '6db6f8fd99da797003ca89e022ead159524bfbd4febbe0b54b0523f4fd001fa1',
  '…and the post-rich-snapshot hash');
// Re-terminate the chain: the post-candle-chart document those two lines
// used to pin is now one layer down, so it is pinned explicitly here rather
// than only by the rich-snapshot helper's internal guard.
eq(PRE_RICH_SNAPSHOT.length, 1618149,
  'peeling the rich snapshot reaches the post-candle-chart length');
eq(sha256(PRE_RICH_SNAPSHOT), '67a94fd413e30fd970a6aee717d5a563a3fc662668ea4fb01efce21b9f05bb9e',
  '…and the post-candle-chart hash');
// The post-Apex-post-auth document those two lines used to pin is still
// pinned, one layer down, by the TT reconnect peel assertions above.
// The post-MCX-charts document those two lines used to pin is still pinned,
// one layer down, by the Apex post-auth peel assertions above.
// The post-MCX-macro-check document those two lines used to pin is still
// pinned, one layer down, on the peeled preMcxCharts reconstruction.
eq(preMcxCharts.length, 1928890, 'post-MCX-macro-check index UTF-16 length is still pinned');
eq(sha256(preMcxCharts), '00ffa331d568b3b81b1f5993a3a347adc4e6c8088de8be113048f85f9ba64d96',
  'post-MCX-macro-check index SHA-256 is still pinned');
// The post-Backup/Restore document is still pinned, one layer further down,
// on the peeled preMcxMacroCheck reconstruction.
eq(preMcxMacroCheck.length, 1933458, 'post-Backup/Restore index UTF-16 length is still pinned');
eq(sha256(preMcxMacroCheck), '71064f2cb772a0555d5abcf14496e9c87830e1974be1544dcc08ec841047e529',
  'post-Backup/Restore index SHA-256 is still pinned');
eq(preBackupRestore.length, 1944246, 'post-Manual-Import index UTF-16 length is pinned');
eq(sha256(preBackupRestore), '0bc8f2904a47b84a345ca9c35a18c17208082c7f447fe358d3dd19cd2dba4790',
  'post-Manual-Import index SHA-256 is pinned');
eq(countLiteral(INDEX, MODULE_TAG), 1, 'index loads the migration module exactly once');

section('2. Exact selected migration boundary');
for (const marker of [MIGRATION_MARKER, MANUAL_IMPORT_MARKER, BACKUP_MARKER]) {
  eq(countLiteral(BASE, marker), 1, 'audit-base marker is unique: ' + marker.split('\n')[0]);
}
ok(migrationAt < manualImportAt && manualImportAt < backupAt && backupAt < inlineCloseAt,
  'physical order is migration -> manual import -> Backup/Restore UI');
eq(migrationAt, U.SLICE_AT, 'candidate starts at the exact audited offset');
eq(candidateEnd, 1937086, 'candidate ends at the exact audited offset');
eq(lineAt(BASE, migrationAt), 34028, 'candidate starts on audit-base line 34028');
eq(lineAt(BASE, candidateEnd), 34110, 'candidate ends on audit-base line 34110');
eq(CANDIDATE.length, 4461, 'candidate has exact UTF-16 length');
eq(sha256(CANDIDATE), '65f3b31825f3cf8aa9e68755d4d517f8ccd4b58cc3e9d90d838a5b6b33b95ecb',
  'candidate byte identity is pinned');
ok(CANDIDATE.endsWith('}\n'), 'candidate ends with the complete async migration and one LF');
eq(BASE.slice(candidateEnd, manualImportAt + MANUAL_IMPORT_MARKER.length), '\n' + MANUAL_IMPORT_MARKER,
  'one separator LF and the manual-import marker are outside the extracted slice');
eq(MODULE, CANDIDATE, 'module is byte-for-byte the audited candidate');
eq(topLevelShape(MODULE), EXPECTED_SHAPE,
  'module owns exactly one session latch and one async migration function');
eq(freeIdentifiers(MODULE), EXPECTED_DEPENDENCIES,
  'module call-time dependency inventory is exact');
eq(directEffects(MODULE), {
  document: 0,
  fetch: 0,
  ttCall: 1,
  retryTransport: 1,
  jSaveRemote: 1,
  setTimeout: 0,
  setInterval: 0,
  WebSocket: 0,
  addEventListener: 0,
  localStorage: 0,
  window: 0,
  confirm: 0,
}, 'migration delegates transport/save and owns no DOM, timer, storage, listener, or raw-fetch primitive');
eq(countLiteral(maskLiterals(MODULE), 'isApexPreviewOrLocalEnv()'), 1,
  'auto-upload owns exactly one broad preview/local safety gate');
eq(ownerDeclarationCounts(OUTSIDE_APP), { state: 0, migrate: 0 },
  'no competing migration owner remains elsewhere in application source');
eq(countLiteral(INDEX, MIGRATION_MARKER), 0, 'migration marker has zero inline residue');
eq(countLiteral(INDEX, MANUAL_IMPORT_MARKER), 0, 'manual-import marker has zero inline residue');
eq(countLiteral(MANUAL_MODULE, MANUAL_IMPORT_MARKER), 1, 'manual-import marker lives in its module exactly once');
eq(countLiteral(INDEX, BACKUP_MARKER), 0,
  'Backup/Restore marker has zero inline residue now that it is the seventh Journal owner');
eq(countLiteral(preBackupRestore, BACKUP_MARKER), 1,
  'Backup/Restore marker was inline exactly once before its extraction');
eq(countLiteral(BACKUP_RESTORE_MODULE, BACKUP_MARKER), 1,
  'Backup/Restore marker lives in its module exactly once');

section('3. Inert classic evaluation, exact load order, and reconstruction');
const load = loadCandidate(MODULE);
ok(load.ok, 'module evaluates with zero call-time dependencies present: ' + load.error);
eq(load.sandbox._jMigrationDone, false, 'classic evaluation initializes only the false session latch');
eq(typeof load.sandbox.jMigrateApexTradesToBackend, 'function', 'classic evaluation exposes the async owner');

const MCX_MACRO_CHECK_TAG = '<script src="./js/ui/mcx-macro-check.js"></script>';
const MCX_CHARTS_TAG = '<script src="./js/ui/mcx-charts.js"></script>';
const APEX_POST_AUTH_TAG2 = '<script src="./js/services/apex-post-auth-init.js"></script>';
const TT_RECONNECT_TAG2 = '<script src="./js/ui/tt-reconnect.js"></script>';
const CLOSE_LEGS_TAG2 = '<script src="./js/ui/journal-close-legs.js"></script>';
const TRADE_FORMS_TAG2 = '<script src="./js/ui/journal-trade-forms.js"></script>';
const TRADE_DETAIL_TAG2 = '<script src=\"./js/ui/journal-trade-detail.js\"></script>';
const PORTFOLIO_TAG2 = '<script src="./js/portfolio/portfolio-data-fetch.js"></script>';
const BACKEND_PORTFOLIOS_TAG2 = '<script src="./js/portfolio/backend-portfolios.js"></script>';
const EXPIRY_MANUAL_TAG2 = '<script src="./js/portfolio/portfolio-expiry-manual.js"></script>';
const TRAFFIC_LIGHT_TAG2 = '<script src="./js/portfolio/portfolio-traffic-light.js"></script>';
const CANDLE_CHART_TAG2 = '<script src="./js/ui/backend-candle-store-chart.js"></script>';
const RICH_SNAPSHOT_TAG2 = '<script src="./js/services/journal-rich-snapshot.js"></script>';
const BACKEND_CANDLES_TAG2 = '<script src="./js/portfolio/portfolio-backend-candles.js"></script>';
const SNAPSHOT_PREFETCH_TAG2 = '<script src="./js/services/journal-snapshot-prefetch.js"></script>';
const DXLINK_GREEKS_TAG2 = '<script src="./js/portfolio/portfolio-dxlink-greeks.js"></script>';
const STRATEGY_TEMPLATES_TAG2 = '<script src="./js/config/strategy-templates.js"></script>';
const VEGA_MONITOR_TAG2 = '<script src="./js/portfolio/portfolio-vega-monitor.js"></script>';
const SCANNER_IVR_TAG2 = '<script src="./js/services/scanner-ivr-throttle.js"></script>';
const SCANNER_EARNINGS_TAG2 = '<script src="./js/services/scanner-earnings-throttle.js"></script>';
const CHART_INTERACTIONS_TAG2 = '<script src="./js/ui/chart-interactions.js"></script>';
const SNAPSHOT_HELPERS_TAG2 = '<script src="./js/services/journal-snapshot-helpers.js"></script>';
const SWING_WEEKLY_CANDLES_TAG2 = '<script src="./js/services/swing-weekly-candles.js"></script>';
const SWING_DIRECTION_TAG2 = '<script src="./js/services/swing-direction.js"></script>';
const BACKEND_POSITIONS_AGGREGATE_TAG2 = '<script src="./js/portfolio/backend-positions-aggregate.js"></script>';
const PORTFOLIO_TECHNICAL_MERGE_TAG2 = '<script src="./js/portfolio/portfolio-technical-merge.js"></script>';
const PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_TAG2 = '<script src="./js/portfolio/portfolio-technical-alignment-debug.js"></script>';
const JOURNAL_MAP_AUDIT_TAG2 = '<script src="./js/services/journal-map-audit.js"></script>';
const DXLINK_GREEKS_FETCH_TAG2 = '<script src="./js/services/dxlink-greeks-fetch.js"></script>';
const PORTFOLIO_TECHNICAL_PARITY_TAG2 = '<script src="./js/portfolio/portfolio-technical-parity.js"></script>';
const PORTFOLIO_SPY_PRICE_TAG2 = '<script src="./js/portfolio/portfolio-spy-price.js"></script>';
const APEX_STORAGE_RECOVERY_TAG2 = '<script src="./js/services/apex-storage-recovery.js"></script>';
const PORTFOLIO_LEG_QUANTITY_TAG2 = '<script src="./js/portfolio/portfolio-leg-quantity.js"></script>';
const BACKEND_FULL_REFRESH_VALIDATION_TAG2 = '<script src="./js/portfolio/backend-full-refresh-validation.js"></script>';
const PORTFOLIO_SNAPSHOT_FALLBACK_TAG2 = '<script src="./js/portfolio/portfolio-snapshot-fallback.js"></script>';
const PORTFOLIO_TECHNICAL_BATCH_FETCH_TAG2 = '<script src="./js/portfolio/portfolio-technical-batch-fetch.js"></script>';
const RS_SKIP_BREAKDOWN_HTML_TAG2 = '<script src="./js/ui/rs-skip-breakdown-html.js"></script>';
const PORTFOLIO_GREEKS_FRESHNESS_TAG2 = '<script src="./js/portfolio/portfolio-greeks-freshness.js"></script>';
const PORTFOLIO_UNDERLYING_FALLBACK_PLAN_TAG2 = '<script src="./js/portfolio/portfolio-underlying-fallback-plan.js"></script>';
const PORTFOLIO_PRICE_FRESHNESS_TAG2 = '<script src="./js/portfolio/portfolio-price-freshness.js"></script>';
const PORTFOLIO_MISSING_UNDERLYINGS_GATE_TAG2 = '<script src="./js/portfolio/portfolio-missing-underlyings-gate.js"></script>';
const SCANNER_DXLINK_PRICES_TAG2 = '<script src="./js/services/scanner-dxlink-prices.js"></script>';
const RS_QUALITY_CHECK_TAG2 = '<script src="./js/services/rs-quality-check.js"></script>';
const BACKEND_POSITIONS_ENRICHED_TAG2 = '<script src="./js/portfolio/backend-positions-enriched.js"></script>';
const OPTION_STREAMER_DIAGNOSTICS_TAG2 = '<script src="./js/portfolio/portfolio-option-streamer-diagnostics.js"></script>';
const SCANNER_DSS_CHART_LOAD_GUARD_TAG2 = '<script src="./js/services/scanner-dss-chart-load-guard.js"></script>';
const SWING_CHART_CACHE_HELPERS_TAG2 = '<script src="./js/services/swing-chart-cache-helpers.js"></script>';
const SCANNER_STOCK_SCORING_TAG2 = '<script src="./js/services/scanner-stock-scoring.js"></script>';
const SCANNER_DSS_1D_CHART_TAG2 = '<script src="./js/ui/scanner-dss-1d-chart.js"></script>';
const PORTFOLIO_STALE_MARK_SQUEEZE_STATE_TAG2 = '<script src="./js/portfolio/portfolio-stale-mark-squeeze-state.js"></script>';
const JOURNAL_EXPIRY_AUDIT_TAG2 = '<script src="./js/services/journal-expiry-audit.js"></script>';
const PORTFOLIO_REGIME_BADGE_HTML_TAG2 = '<script src="./js/portfolio/portfolio-regime-badge-html.js"></script>';
const PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_TAG2 = '<script src="./js/portfolio/portfolio-backend-squeeze-extract.js"></script>';
const PORTFOLIO_BETA_MISSING_REASON_TAG2 = '<script src="./js/portfolio/portfolio-beta-missing-reason.js"></script>';
const OPTION_CHAIN_ERROR_HELPERS_TAG2 = '<script src="./js/services/option-chain-error-helpers.js"></script>';
const AI_SCAN_CONTEXT_TAG2 = '<script src="./js/services/ai-scan-context.js"></script>';
const APEX_PARITY_COMPARE_TAG2 = '<script src="./js/services/apex-parity-compare.js"></script>';
const SWING_TREND_CONTEXT_TAG2 = '<script src="./js/services/swing-trend-context.js"></script>';
const APEX_PARITY_BACKEND_FETCH_TAG2 = '<script src="./js/services/apex-parity-backend-fetch.js"></script>';
const SWING_CHART_CACHE_EVALUATE_TAG2 = '<script src="./js/services/swing-chart-cache-evaluate.js"></script>';
eq(countLiteral(INDEX, WRITE_TAG + '\n' + MODULE_TAG + '\n' + MANUAL_TAG + '\n' + BACKUP_RESTORE_TAG + '\n' + MCX_MACRO_CHECK_TAG + '\n' + MCX_CHARTS_TAG + '\n' + APEX_POST_AUTH_TAG2 + '\n' + TT_RECONNECT_TAG2 + '\n' + CLOSE_LEGS_TAG2 + '\n' + TRADE_FORMS_TAG2 + '\n' + TRADE_DETAIL_TAG2 + '\n' + PORTFOLIO_TAG2 + '\n' + BACKEND_PORTFOLIOS_TAG2 + '\n' + EXPIRY_MANUAL_TAG2 + '\n' + TRAFFIC_LIGHT_TAG2 + '\n' + CANDLE_CHART_TAG2 + '\n' + RICH_SNAPSHOT_TAG2 + '\n' + BACKEND_CANDLES_TAG2 + '\n' + SNAPSHOT_PREFETCH_TAG2 + '\n' + DXLINK_GREEKS_TAG2 + '\n' + STRATEGY_TEMPLATES_TAG2 + '\n' + VEGA_MONITOR_TAG2 + '\n' + SCANNER_IVR_TAG2 + '\n' + SCANNER_EARNINGS_TAG2 + '\n' + CHART_INTERACTIONS_TAG2 + '\n' + SNAPSHOT_HELPERS_TAG2 + '\n' + SWING_WEEKLY_CANDLES_TAG2 + '\n' + SWING_DIRECTION_TAG2 + '\n' + BACKEND_POSITIONS_AGGREGATE_TAG2 + '\n' + PORTFOLIO_TECHNICAL_MERGE_TAG2 + '\n' + PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_TAG2 + '\n' + JOURNAL_MAP_AUDIT_TAG2 + '\n' + DXLINK_GREEKS_FETCH_TAG2 + '\n' + PORTFOLIO_TECHNICAL_PARITY_TAG2 + '\n' + PORTFOLIO_SPY_PRICE_TAG2 + '\n' + APEX_STORAGE_RECOVERY_TAG2 + '\n' + PORTFOLIO_LEG_QUANTITY_TAG2 + '\n' + BACKEND_FULL_REFRESH_VALIDATION_TAG2 + '\n' + PORTFOLIO_SNAPSHOT_FALLBACK_TAG2 + '\n' + PORTFOLIO_TECHNICAL_BATCH_FETCH_TAG2 + '\n' + RS_SKIP_BREAKDOWN_HTML_TAG2 + '\n' + PORTFOLIO_GREEKS_FRESHNESS_TAG2 + '\n' + PORTFOLIO_UNDERLYING_FALLBACK_PLAN_TAG2 + '\n' + PORTFOLIO_PRICE_FRESHNESS_TAG2 + '\n' + PORTFOLIO_MISSING_UNDERLYINGS_GATE_TAG2 + '\n' + SCANNER_DXLINK_PRICES_TAG2 + '\n' + RS_QUALITY_CHECK_TAG2 + '\n' + BACKEND_POSITIONS_ENRICHED_TAG2 + '\n' + OPTION_STREAMER_DIAGNOSTICS_TAG2 + '\n' + SCANNER_DSS_CHART_LOAD_GUARD_TAG2 + '\n' + SWING_CHART_CACHE_HELPERS_TAG2 + '\n' + SCANNER_STOCK_SCORING_TAG2 + '\n' + SCANNER_DSS_1D_CHART_TAG2 + '\n' + PORTFOLIO_STALE_MARK_SQUEEZE_STATE_TAG2 + '\n' + JOURNAL_EXPIRY_AUDIT_TAG2 + '\n' + PORTFOLIO_REGIME_BADGE_HTML_TAG2 + '\n' + PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_TAG2 + '\n' + PORTFOLIO_BETA_MISSING_REASON_TAG2 + '\n' + OPTION_CHAIN_ERROR_HELPERS_TAG2 + '\n' + AI_SCAN_CONTEXT_TAG2 + '\n' + APEX_PARITY_COMPARE_TAG2 + '\n' + SWING_TREND_CONTEXT_TAG2 + '\n' + APEX_PARITY_BACKEND_FETCH_TAG2 + '\n' + SWING_CHART_CACHE_EVALUATE_TAG2 + '\n<script>'), 1,
  'Migration loads after Write-through, before Manual Import, then Backup/Restore, then MCX macro check, then MCX charts, then Apex post-auth, then TT reconnect, then the portfolio owners, then the traffic light, then the candle-store chart, then the rich async snapshot, then the portfolio backend candles, then the journal snapshot prefetch, then the portfolio DXLink greeks, then the strategy templates, then the vega monitor, then the inline monolith');
eq(countLiteral(preMcxCharts, WRITE_TAG + '\n' + MODULE_TAG + '\n' + MANUAL_TAG + '\n' + BACKUP_RESTORE_TAG + '\n' + MCX_MACRO_CHECK_TAG + '\n<script>'), 1,
  'peeling MCX charts restores the exact tail the MCX macro-check layer was written against');
eq(countLiteral(preMcxMacroCheck, WRITE_TAG + '\n' + MODULE_TAG + '\n' + MANUAL_TAG + '\n' + BACKUP_RESTORE_TAG + '\n<script>'), 1,
  'peeling MCX macro check restores the exact tail this contract was written against');
eq(moduleOrderViolations(INDEX), [],
  'order is Core -> UI -> Remote -> Write-through -> Migration -> Manual Import -> inline');
const preManualIndex = MANUAL_U.undoJournalManualImport(preBackupRestore, MANUAL_MODULE);
const indexWithoutTag = preManualIndex.replace(
  WRITE_TAG + '\n' + MODULE_TAG + '\n<script>',
  WRITE_TAG + '\n<script>'
);
eq(indexWithoutTag.slice(0, migrationAt) + MODULE + indexWithoutTag.slice(migrationAt), BASE,
  'tag removal plus byte-exact module insertion reconstructs #401');

section('4. External ownership and consumers');
eq(externalUsage('_jMigrationDone'), [], 'session latch has no outside consumer');
// The one outside consumer is _apexPostAuthInit, which the Apex post-auth
// extraction moved out of the inline monolith into its own service module. The
// edge is unchanged — one typeof guard plus one invocation, resolved at call
// time through the classic global — only its owning file is new.
eq(externalUsage('jMigrateApexTradesToBackend'),
  [{ where: './js/services/apex-post-auth-init.js', refs: 2 }],
  'migration function has one guarded outside call (typeof guard plus invocation) in post-auth initialization');
const postAuthSource = APP_LOADER.extractFunctionSource('_apexPostAuthInit');
eq(identifierCountMasked(maskLiterals(postAuthSource), 'jMigrateApexTradesToBackend'), 2,
  'post-auth initialization owns exactly one typeof-guarded migration invocation');

section('5. Real migration behavior through mocks');
async function verifyBehavior() {
  const inert = makeMigrationContext({ localTrades: [{ id: 'L0' }] });
  eq(inert.__stats.gateCalls, 0, 'module evaluation does not evaluate the environment gate');
  eq(inert.__stats.fallbackCalls + inert.__stats.retryCalls, 0, 'module evaluation performs no backend read');
  eq(inert.__stats.saves.length, 0, 'module evaluation performs no backend write');

  const preview = makeMigrationContext({ preview: true, localTrades: [{ id: 'P1' }] });
  await preview.jMigrateApexTradesToBackend();
  eq(preview.__stats.gateCalls, 1, 'preview path evaluates the broad safety gate once');
  eq(preview.__stats.fallbackCalls + preview.__stats.retryCalls, 0, 'preview path performs no backend read');
  eq(preview.__stats.saves.length, 0, 'preview path never auto-uploads local trades');
  eq(preview._jMigrationDone, false, 'preview skip leaves the session latch retryable');

  const noKey = makeMigrationContext({ backendKey: '', localTrades: [{ id: 'K1' }] });
  await noKey.jMigrateApexTradesToBackend();
  eq(noKey.__stats.fallbackCalls + noKey.__stats.retryCalls, 0, 'missing-key path performs no backend read');
  eq(noKey.__stats.saves.length, 0, 'missing-key path performs no backend write');
  eq(noKey._jMigrationDone, false, 'missing-key skip leaves the session latch retryable');

  const merge = makeMigrationContext({
    useRetry: true,
    backendTrades: [{ id: 'B1', portfolio_id: 7, ticker: 'SPY' }],
    localTrades: [],
  });
  await merge.jMigrateApexTradesToBackend();
  eq(merge.__stats.retryCalls, 1, 'migration prefers the retrying backend transport when available');
  eq(merge.__stats.fallbackCalls, 0, 'retry transport suppresses the fallback call');
  jsonEq(merge.__stats.merged, [[{ id: 'B1', portfolio_id: 7, ticker: 'SPY', portfolioId: 7 }]],
    'backend trades observed during migration are normalized and merged locally');
  jsonEq(merge.__stats.snapshots, [[{ id: 'B1', portfolio_id: 7, ticker: 'SPY', portfolioId: 7 }]],
    'backend trades observed during migration become the last-known-good snapshot');
  eq(merge.__stats.saves.length, 0, 'an observed backend id is never POSTed again');
  eq(merge._jMigrationDone, true, 'successful merge latches migration complete');

  const writes = makeMigrationContext({
    backendTrades: [{ id: 'B1', ticker: 'SPY' }],
    localTrades: [
      { id: 'B1', ticker: 'SPY' },
      { id: 22, ticker: 'QQQ', live: { delta: 0.2 } },
      { id: 'L3', ticker: 'IWM' },
    ],
    saveOutcomes: [true, { ok: false, source: 'local' }],
  });
  await writes.jMigrateApexTradesToBackend();
  eq(writes.__stats.fallbackCalls, 1, 'migration falls back to ttCall when retry transport is absent');
  eq(writes.__stats.saves.map((trade) => trade.id), ['22', 'L3'],
    'migration POSTs only ids missing from the backend, in local order');
  ok(!Object.prototype.hasOwnProperty.call(writes.__stats.saves[0], 'live'),
    'each POST passes through the write-through payload normalizer');
  ok(writes.__stats.logs.some((line) => line.includes('migrated: 1, failed: 1')),
    'bare-boolean success and structured failure share one exact outcome counter');
  eq(writes._jMigrationDone, true, 'completed writes latch the session even when an individual save fails');
  const callsBeforeRepeat = writes.__stats.fallbackCalls + writes.__stats.saves.length;
  await writes.jMigrateApexTradesToBackend();
  eq(writes.__stats.fallbackCalls + writes.__stats.saves.length, callsBeforeRepeat,
    'session latch makes a second migration call fully idempotent');

  const structured = makeMigrationContext({
    localTrades: [{ id: 'S1' }, { id: 'S2' }],
    backendTrades: [],
    saveOutcomes: [true, { ok: true, source: 'backend' }],
  });
  await structured.jMigrateApexTradesToBackend();
  ok(structured.__stats.logs.some((line) => line.includes('migrated: 2, failed: 0')),
    'bare-boolean and structured success outcomes are both accepted');

  const unauthorized = makeMigrationContext({
    useRetry: true,
    backendError: new Error('Unauthorized (HTTP 401): api-key invalid'),
    localTrades: [{ id: 'R1' }],
  });
  await unauthorized.jMigrateApexTradesToBackend();
  eq(unauthorized.__stats.retryCalls, 1, 'auth-not-ready path attempts exactly one delegated read');
  eq(unauthorized.__stats.getAllCalls, 0, '401 returns before reading local trades');
  eq(unauthorized.__stats.saves.length, 0, '401 never uploads local trades');
  eq(unauthorized._jMigrationDone, false, '401 leaves the latch false for the next login');

  const transient = makeMigrationContext({
    backendError: new Error('Failed to fetch'),
    localTrades: [{ id: 'T1' }],
  });
  await transient.jMigrateApexTradesToBackend();
  eq(transient.__stats.saves.map((trade) => trade.id), ['T1'],
    'non-auth read failure preserves the legacy best-effort local upload policy');
  eq(transient._jMigrationDone, true, 'best-effort completion latches after a non-auth read failure');
}

section('6. Rejected adjacent owners and extraction fallout');
eq(MANUAL_ONLY.length, 8403, 'manual-import adjacent slice length is pinned');
eq(sha256(MANUAL_ONLY), 'a8eef486e6ac6e3bf2b6ff5e97ccff2a6ef9a0d83e19aee9b8eeff3074f7943b',
  'manual-import adjacent byte identity is pinned');
eq(topLevelShape(MANUAL_ONLY), [
  { name: '_journalImportPayload', form: 'function', isAsync: false },
  { name: '_journalRepairPortfolioIdRemote', form: 'function', isAsync: true },
  { name: 'apexImportJournalTradesJson', form: 'function', isAsync: true },
], 'manual import owns three separate repair/console functions');
eq(directEffects(MANUAL_ONLY).window, 1, 'manual import owns the explicit window console exposure');
eq(directEffects(MANUAL_ONLY).ttCall, 3, 'manual import owns its own GET/PUT verification transport');

eq(BACKUP_ONLY.length, 10846, 'Backup/Restore adjacent slice length is pinned');
eq(sha256(BACKUP_ONLY), '62f04ee1e720eb098b9d17e4a1fdeff90d1b5ccbbbc12d564ce558ce175fc1c2',
  'Backup/Restore adjacent byte identity is pinned');
eq(topLevelShape(BACKUP_ONLY).map((entry) => entry.name), [
  'showBackupPanel', 'closeBackupPanel', 'loadBackupList', '_bkFmtBytes', '_bkFmtDate',
  'renderBackupList', 'createBackup', 'restoreBackup', 'deleteBackup',
], 'Backup/Restore owns nine UI/transport functions');
eq(directEffects(BACKUP_ONLY).document, 9, 'Backup/Restore owns its DOM mutations');
eq(directEffects(BACKUP_ONLY).setTimeout, 4, 'Backup/Restore owns its delayed status/recheck timers');
eq(directEffects(BACKUP_ONLY).confirm, 3, 'Backup/Restore owns its destructive-action confirmations');
eq(boundaryViolations(MODULE, OUTSIDE_APP), [],
  'selected migration passes every semantic ownership gate');

const loaderAwareConsumers = [
  'tests/journal-backend-save-confirm.test.js',
  'tests/journal-transient-sync-resilience.test.js',
  'tests/journal-backend-sync-preview.test.js',
  'tests/post-auth-reconnect-init.test.js',
];
for (const rel of loaderAwareConsumers) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('load-app-source'), rel + ' already follows external modules through the app loader');
  ok(source.includes('jMigrateApexTradesToBackend'), rel + ' explicitly exercises the migration contract');
}
const contractsToAdvance = [
  'tests/backend-directional-adapter-boundary-contract.test.js',
  'tests/backend-directional-preview-boundary-contract.test.js',
  'tests/backend-directional-snapshot-boundary-contract.test.js',
  'tests/backend-scanner-snapshot-ui-boundary-contract.test.js',
  'tests/journal-backend-write-through-boundary-contract.test.js',
  'tests/journal-core-boundary-contract.test.js',
  'tests/journal-remote-persistence-boundary-contract.test.js',
  'tests/journal-ui-boundary-contract.test.js',
  'tests/mcx-backend-candles-boundary-contract.test.js',
  'tests/mcx-market-context-boundary-contract.test.js',
  'tests/mcx-regime-policy-boundary-contract.test.js',
  'tests/mcx-vix-market-context-boundary-contract.test.js',
  'tests/pess-extraction-boundary-contract.test.js',
  'tests/pretrade-risk-modal-boundary-contract.test.js',
  'tests/pretrade-risk-rules-boundary-contract.test.js',
  'tests/pretrade-technicals-boundary-contract.test.js',
  'tests/sfs-extraction-boundary-contract.test.js',
];
for (const rel of contractsToAdvance) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(source.includes('journal-manual-import.js') ||
     source.includes('journal-manual-import\\.js') ||
     source.includes('six Journal owners') ||
     source.includes('journal-backup-restore.js') ||
     source.includes('journal-backup-restore\\.js') ||
     source.includes('seven Journal owners'),
     rel + ' recognizes the sixth or seventh Journal owner, or the current classic-script tail');
}

section('7. Byte-exact undo and mutation-sensitive negative controls');
const rebuilt = U.undoJournalMigration(preManualIndex, MODULE);
eq(rebuilt, BASE, 'migration undo reconstructs merged #401 byte-for-byte');
eq(sha256(rebuilt), U.BASE_SHA256, 'round-trip SHA-256 is the audited base hash');
const preWrite = WRITE_U.undoJournalBackendWriteThrough(rebuilt, WRITE_MODULE);
eq(preWrite.length, WRITE_U.BASE_CHARS, 'cumulative undo reaches the pre-Write-through base');
eq(sha256(preWrite), WRITE_U.BASE_SHA256, 'cumulative undo hash matches the pre-Write-through base');
assert.throws(() => U.undoJournalMigration(preManualIndex, MODULE + ' '), /MODULE_IDENTITY/);
pass++;
assert.throws(() => U.undoJournalMigration(preManualIndex.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /TAG_IDENTITY/);
pass++;
assert.throws(() => U.undoJournalMigration(preManualIndex.replace(MODULE_TAG, ''), MODULE), /TAG_IDENTITY/);
pass++;

ok(boundaryViolations(MODULE.replace('var _jMigrationDone = false;\n', ''), OUTSIDE_APP).includes('manifest'),
  'missing session-latch mutant is rejected');
ok(boundaryViolations(
  MODULE.replace('jMigrateApexTradesToBackend', 'jMigrateApexTradesToBackendV2'), OUTSIDE_APP
).includes('manifest'), 'renamed migration owner mutant is rejected');
ok(boundaryViolations(MODULE + '\nfunction foreignMigrationOwner() {}\n', OUTSIDE_APP).includes('manifest'),
  'foreign top-level owner mutant is rejected');
ok(boundaryViolations(MODULE + '\ndocument.body;\n', OUTSIDE_APP).includes('foreign-direct-effect'),
  'foreign DOM effect mutant is rejected');
ok(boundaryViolations(MODULE + '\nttCall("/load-time");\n', OUTSIDE_APP).includes('load-contract'),
  'top-level backend invocation mutant is rejected by inert classic evaluation');
ok(boundaryViolations(MODULE + '\n' + MANUAL_ONLY, OUTSIDE_APP).includes('owner-overreach'),
  'manual-import overreach mutant is rejected');
ok(boundaryViolations(
  MODULE,
  OUTSIDE_APP + '\nasync function jMigrateApexTradesToBackend() {}\n'
).includes('competing-owner'), 'competing later migration owner mutant is rejected');
ok(sha256(MODULE.replace('_jMigrationDone = true;', '_jMigrationDone = null;')) !== sha256(MODULE),
  'same-length latch mutation is rejected by the identity pin');

ok(moduleOrderViolations(INDEX.replace(MODULE_TAG + '\n', '')).includes('tag-count'),
  'missing module tag mutant is rejected');
ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG)).includes('tag-count'),
  'duplicate module tag mutant is rejected');
ok(moduleOrderViolations(INDEX.replace(
  WRITE_TAG + '\n' + MODULE_TAG,
  MODULE_TAG + '\n' + WRITE_TAG
)).includes('load-order'), 'Migration-before-Write-through mutant is rejected');
ok(moduleOrderViolations(INDEX.replace(MODULE_TAG, MODULE_TAG.replace('>', ' defer>')))
  .includes('classic-tag'), 'deferred module tag mutant is rejected');
eq(identifierCountMasked(maskLiterals(
  '// jMigrateApexTradesToBackend\n"jMigrateApexTradesToBackend"; jMigrateApexTradesToBackendCopy;'
), 'jMigrateApexTradesToBackend'), 0,
  'consumer inventory ignores comments, strings, and suffix collisions');

section('8. Exact production scope');
const changed = changedPaths();
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
// One module per layer, so this list is index.html + Migration + one entry per
// layer cut afterwards. The count is asserted rather than narrated: the prose
// that used to name the later owners stopped at seven of them and stayed there
// for nine more cycles, because a sentence cannot fail.
const LATER_LAYERS = [SWING_CHART_CACHE_EVALUATE_U, APEX_PARITY_BACKEND_FETCH_U, SWING_TREND_CONTEXT_U, APEX_PARITY_COMPARE_U, AI_SCAN_CONTEXT_U, OPTION_CHAIN_ERROR_HELPERS_U, PORTFOLIO_BETA_MISSING_REASON_U, PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_U, PORTFOLIO_REGIME_BADGE_HTML_U, JOURNAL_EXPIRY_AUDIT_U, PORTFOLIO_STALE_MARK_SQUEEZE_STATE_U, SCANNER_DSS_1D_CHART_U, SCANNER_STOCK_SCORING_U, SWING_CHART_CACHE_HELPERS_U, SCANNER_DSS_CHART_LOAD_GUARD_U, OPTION_STREAMER_DIAGNOSTICS_U, BACKEND_POSITIONS_ENRICHED_U, RS_QUALITY_CHECK_U, SCANNER_DXLINK_PRICES_U, PORTFOLIO_MISSING_UNDERLYINGS_GATE_U, PORTFOLIO_PRICE_FRESHNESS_U, PORTFOLIO_UNDERLYING_FALLBACK_PLAN_U, PORTFOLIO_GREEKS_FRESHNESS_U, RS_SKIP_BREAKDOWN_HTML_U, PORTFOLIO_TECHNICAL_BATCH_FETCH_U, PORTFOLIO_SNAPSHOT_FALLBACK_U, BACKEND_FULL_REFRESH_VALIDATION_U, PORTFOLIO_LEG_QUANTITY_U, APEX_STORAGE_RECOVERY_U, PORTFOLIO_SPY_PRICE_U, PORTFOLIO_TECHNICAL_PARITY_U, DXLINK_GREEKS_FETCH_U, JOURNAL_MAP_AUDIT_U, PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_U, PORTFOLIO_TECHNICAL_MERGE_U, BACKEND_POSITIONS_AGGREGATE_U, SWING_DIRECTION_U, SWING_WEEKLY_CANDLES_U, JOURNAL_SNAPSHOT_HELPERS_U, CHART_INTERACTIONS_U, SCANNER_EARNINGS_U, SCANNER_IVR_U, VEGA_MONITOR_U, STRATEGY_TEMPLATES_U, DXLINK_GREEKS_U, SNAPSHOT_PREFETCH_U, BACKEND_CANDLES_U, RICH_SNAPSHOT_U, CANDLE_CHART_U,
  TRAFFIC_LIGHT_U, EXPIRY_MANUAL_U, BACKEND_PORTFOLIOS_U, PORTFOLIO_U, TRADE_DETAIL_U,
  TRADE_FORMS_U, CLOSE_LEGS_U, TT_RECONNECT_U, APEX_POST_AUTH_U, MCX_CHARTS_U,
  MCX_MACRO_CHECK_U, BACKUP_RESTORE_U, MANUAL_U];
eq(changedProduction, ['index.html', 'js/config/strategy-templates.js', 'js/portfolio/backend-full-refresh-validation.js', 'js/portfolio/portfolio-snapshot-fallback.js', 'js/portfolio/portfolio-technical-batch-fetch.js', 'js/ui/rs-skip-breakdown-html.js', 'js/portfolio/portfolio-greeks-freshness.js', 'js/portfolio/portfolio-underlying-fallback-plan.js', 'js/portfolio/portfolio-price-freshness.js', 'js/portfolio/portfolio-missing-underlyings-gate.js', 'js/services/scanner-dxlink-prices.js', 'js/services/rs-quality-check.js', 'js/portfolio/backend-positions-enriched.js', 'js/portfolio/portfolio-option-streamer-diagnostics.js', 'js/services/scanner-dss-chart-load-guard.js', 'js/services/swing-chart-cache-helpers.js', 'js/services/scanner-stock-scoring.js', 'js/ui/scanner-dss-1d-chart.js', 'js/portfolio/portfolio-stale-mark-squeeze-state.js', 'js/services/journal-expiry-audit.js', 'js/portfolio/portfolio-regime-badge-html.js', 'js/portfolio/portfolio-backend-squeeze-extract.js', 'js/portfolio/portfolio-beta-missing-reason.js', 'js/services/option-chain-error-helpers.js', 'js/services/ai-scan-context.js', 'js/services/apex-parity-compare.js', 'js/services/swing-trend-context.js', 'js/services/apex-parity-backend-fetch.js', 'js/services/swing-chart-cache-evaluate.js', 'js/portfolio/backend-portfolios.js', 'js/portfolio/portfolio-backend-candles.js', 'js/portfolio/portfolio-data-fetch.js', 'js/portfolio/portfolio-dxlink-greeks.js', 'js/portfolio/portfolio-expiry-manual.js', 'js/portfolio/portfolio-traffic-light.js', 'js/portfolio/portfolio-vega-monitor.js', 'js/services/apex-post-auth-init.js',
  'js/services/dxlink-greeks-fetch.js', 'js/portfolio/portfolio-technical-parity.js', 'js/portfolio/portfolio-spy-price.js', 'js/services/apex-storage-recovery.js',
'js/services/journal-manual-import.js', MODULE_REL, 'js/services/journal-rich-snapshot.js',
  'js/services/journal-snapshot-helpers.js',
  'js/services/journal-snapshot-prefetch.js',
  'js/services/scanner-earnings-throttle.js', 'js/services/scanner-ivr-throttle.js', 'js/portfolio/backend-positions-aggregate.js', 'js/portfolio/portfolio-technical-merge.js', 'js/portfolio/portfolio-technical-alignment-debug.js', 'js/services/swing-direction.js', 'js/services/swing-weekly-candles.js', 'js/ui/backend-candle-store-chart.js', 'js/ui/chart-interactions.js', 'js/ui/journal-backup-restore.js', 'js/ui/journal-close-legs.js', 'js/ui/journal-trade-detail.js', 'js/ui/journal-trade-forms.js', 'js/ui/mcx-charts.js',
  'js/ui/mcx-macro-check.js', 'js/ui/tt-reconnect.js', 'js/services/journal-map-audit.js',
  'js/portfolio/portfolio-leg-quantity.js'].sort(),
  'production footprint is index.html, Migration, and the modules of the layers cut after it');
eq(changedProduction.length, 2 + LATER_LAYERS.length,
  'that list is exactly index.html + this module + one module per later layer');
eq(new Set(LATER_LAYERS.map((m) => m.TAG)).size, LATER_LAYERS.length,
  '…and those layers are distinct, so the count cannot be padded by a repeat');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'permanent Journal Migration contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'byte-exact Journal Migration undo helper is part of the change');
ok(changed.indexOf('tests/temporary-journal-migration-audit.test.js') >= 0,
  'temporary audit removal is visible in the change set');
ok(!changed.some((rel) => rel.startsWith('.github/')),
  'no workflow or bootstrap script changed');

const report = {
  base: {
    commit: BASE_SHA,
    tree: BASE_TREE,
    indexChars: BASE.length,
    indexSha256: sha256(BASE),
  },
  selected: {
    module: MODULE_REL,
    start: migrationAt,
    end: candidateEnd,
    startLine: lineAt(BASE, migrationAt),
    endLine: lineAt(BASE, candidateEnd),
    chars: MODULE.length,
    sha256: sha256(MODULE),
    topLevelOwners: EXPECTED_SHAPE.map((entry) => entry.name),
    externalConsumers: externalUsage('jMigrateApexTradesToBackend'),
  },
  rejected: {
    manualImport: 'explicit console/window cross-host repair policy',
    backupPanel: 'DOM UI, destructive confirmation, timers, and backup transport owner',
  },
  extractionContract: {
    productionFiles: ['index.html', MODULE_REL],
    permanentTest: CONTRACT_REL,
    undoHelper: UNDO_REL,
    indexChars: INDEX.length,
    indexSha256: sha256(INDEX),
    contractsToAdvance,
    loaderAwareConsumers,
  },
};

verifyBehavior().then(() => {
  console.log('\nJOURNAL_MIGRATION_BOUNDARY_BEGIN');
  console.log(JSON.stringify(report, null, 2));
  console.log('JOURNAL_MIGRATION_BOUNDARY_END');
  console.log('\n' + pass + ' assertions passed');
  console.log('JOURNAL_MIGRATION_BOUNDARY_OK');
}).catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
