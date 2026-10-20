// Detects a structured backend option-chain timeout (backend #204) so the UI can show
// the explicit reason instead of collapsing it to an opaque "timeout". Returns the
// canonical code string, or null for a normal chain response.
function _optionChainStructuredTimeout(resp) {
  if (!resp || typeof resp !== 'object') return null;
  if (resp.option_chain_timeout === true || resp.optionChainTimeout === true) return 'option_chain_timeout';
  var codes = [resp.reason, resp.error, resp.code, resp.rejectCode, resp.status, resp.message];
  for (var i = 0; i < codes.length; i++) {
    if (codes[i] != null && String(codes[i]).toLowerCase().indexOf('option_chain_timeout') !== -1) {
      return 'option_chain_timeout';
    }
  }
  return null;
}

// Human-readable banner text for a failed option-chain load. Distinguishes
// timeout / auth / empty(not-found) / generic so the operator sees WHY the chain
// is missing instead of a mute empty dropdown or a generic "unavailable".
function _optionChainErrorText(ticker, code) {
  var tk = escHtml(String(ticker || ''));
  switch (String(code || '')) {
    case 'option_chain_timeout':
    case 'timeout':
      return 'Option chain for ' + tk + ' timed out (provider slow).';
    case 'option_chain_auth_unavailable':
      return 'Tastytrade session unavailable for ' + tk + ' — reconnect and retry.';
    case 'option_chain_not_found':
      return 'No option chain found for ' + tk + '.';
    case 'option_chain_malformed_response':
    case 'option_chain_upstream_error':
      return 'Option chain provider error for ' + tk + '.';
    default:
      return 'Option chain unavailable for ' + tk + ' — ' + escHtml(String(code || 'unknown')) + '.';
  }
}
