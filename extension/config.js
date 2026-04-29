/**
 * Single place to update production URLs when you go live.
 * Loaded before background.js (Firefox) or via importScripts in the service worker (Chrome).
 */
(function cartItExtensionConfig() {
  const root = typeof self !== "undefined" ? self : globalThis;
  const defaultWebAppOrigin = "https://cart-it.pages.dev";
  const defaultApiBase = "https://cart-it.onrender.com";
  /**
   * If you put the React app on a custom Cloudflare hostname, add it here and mirror the same
   * strings in manifest.json → content_scripts[0].matches so the token bridge content script runs.
   */
  const extraWebAppHosts = [];

  function isWebAppHost(hostname) {
    if (!hostname) return false;
    const h = String(hostname).toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") return true;
    if (h === "cart-it.pages.dev" || h.endsWith(".cart-it.pages.dev")) return true;
    if (extraWebAppHosts.some((x) => h === String(x).toLowerCase())) return true;
    return false;
  }

  /** Match patterns for the token bridge content script (add your real domain when you launch). */
  function contentScriptMatches() {
    const extra =
      extraWebAppHosts.length > 0
        ? extraWebAppHosts.flatMap((host) => [`https://${host}/*`, `https://*.${host}/*`])
        : [];
    return [
      "https://cart-it.pages.dev/*",
      "https://*.cart-it.pages.dev/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
      "https://localhost/*",
      "https://127.0.0.1/*",
      ...extra,
    ];
  }

  root.CART_IT_CONFIG = {
    defaultWebAppOrigin,
    defaultApiBase,
    fallbackLocalApi: "http://127.0.0.1:5001",
    isWebAppHost,
    contentScriptMatches,
  };
})();
