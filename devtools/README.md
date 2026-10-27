# Apex Trading — DEV RV20/RV60 pilot audit

This is an **on-demand panel in the existing APEX DEV session**; it uses the already-loaded `S.backendKey` in memory. It never requests, prints, stores or exports the key. No backend flags are modified and no market data acquisitions are started.

The frontend's historical extraction contracts pin every byte of `index.html`. Because a new dashboard button would invalidate those signed reconstruction points, this diagnostic currently uses an **explicit, on-demand launcher** until a separately reviewed change introduces a legitimate extensibility point.

## Open in APEX DEV

1. Open the **PR #545 deploy preview** at `https://deploy-preview-545--spontaneous-queijadas-118823.netlify.app`, log in to APEX there, and confirm that the active `BACKEND` is `https://apex-tastytrade-backend-dev-production.up.railway.app`. The ordinary production Netlify hostname is deliberately rejected; other DEV hosts are not automatically authorized.
2. In the browser DevTools **Console**, paste the following *once*:

```js
(()=>{if(document.getElementById('apex-rv-pilot-launcher'))return;const s=document.createElement('script');s.src='/devtools/rv-pilot-audit.js';document.head.appendChild(s);})();
```

3. Click the **RV20 / RV60 · DEV** button, then **Analizza i 20 titoli**. Four pages of five are read in sequence, pinned to the initial membership hash. Your existing APEX API key is sent only as an authenticated request header to the pinned Railway DEV backend.

### Bookmarklet alternative

Create a browser bookmark, paste this code into its **URL** field, then click the bookmark while logged into APEX DEV:

```text
javascript:(()=>{if(document.getElementById('apex-rv-pilot-launcher'))return;const s=document.createElement('script');s.src='/devtools/rv-pilot-audit.js';document.head.appendChild(s);})();
```

The panel has a secondary *exact preview hostname + DEV backend URL* check and will not initialize on the production Netlify host. If the button does not appear after loading, verify that the preview actually serves `/devtools/rv-pilot-audit.js`, that the page's content-security policy permits that same-origin script, and that `BACKEND` matches the exact DEV URL; do not work around the guard with an external script URL. The button is session-local and not permanently installed; the bookmarklet is repeatable. If the server returns 403 because diagnostic flags are disabled, it reports the error rather than changing settings.

### Non-goals / follow-up

This is not yet a native permanent dashboard button. Such an integration requires its own refactoring contract update to preserve the intentionally strict byte-exact extraction invariants. This PR deliberately makes **no modification to `index.html` or `js/**`**. No new `*.test.js` file is added (the suite cardinality remains pinned).

Do not run the bookmarklet on other sites. The loader is relative to the current origin; the module itself checks the exact DEV backend URL.
