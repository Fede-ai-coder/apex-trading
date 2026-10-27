// ─────────────────────────────────────────────────────────────────────────────
// BACKEND CONFIG — extracted verbatim from index.html (no behaviour change).
//
// Loaded as a CLASSIC script BEFORE the inline monolith and AFTER
// js/api/backend-client.js, preserving the original execution order: the
// backend client declarations load first, then this block resolves and freezes
// the global BACKEND URL, then the remaining inline monolith runs.
//
// This block runs at load time exactly as it did inline: it reads location /
// window.__APEX_BACKEND_URL__, computes the global BACKEND (top-level const, NOT
// window.BACKEND — resolved lexically by later classic scripts including
// backend-client.js at call time), and emits the [BACKEND CONFIG] log. No new
// side effects are introduced and none are removed.
// ─────────────────────────────────────────────────────────────────────────────
const PROD_BACKEND = 'https://apex-tastytrade-backend-production.up.railway.app';
const DEV_BACKEND = 'https://apex-tastytrade-backend-dev-production.up.railway.app';

function resolveBackendUrl(){
  var override=window.__APEX_BACKEND_URL__;
  if(override&&String(override).trim())return String(override).trim().replace(/\/$/,'');

  var host=location.hostname||'';
  var isLocal=host==='localhost'||host==='127.0.0.1';
  var isDeployPreview=host.indexOf('deploy-preview')!==-1;
  var isNetlifyBranchDeploy=host.indexOf('--spontaneous-queijadas-118823.netlify.app')!==-1;

  if(isLocal||isDeployPreview||isNetlifyBranchDeploy)return DEV_BACKEND;
  return PROD_BACKEND;
}

const BACKEND = resolveBackendUrl();
console.log('[BACKEND CONFIG] host='+(location.hostname||'')+' backend='+BACKEND);
