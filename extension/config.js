/**
 * Single place to update production URLs when you go live.
 * Loaded before background.js (Firefox) or via importScripts in the service worker (Chrome).
 */
(function cartItExtensionConfig() {
  const root = typeof self !== "undefined" ? self : globalThis;
  /** Primary app URL (custom domain). Staging: https://cart-it.pages.dev */
  const defaultWebAppOrigin = "https://cart-it.com";
  const defaultApiBase = "https://cart-it.onrender.com";
  /**
   * Optional extra hostnames (no port) that should run the token bridge — e.g. another apex.
   * Main app + pages.dev + cart-it.com family are already covered in isWebAppHost / contentScriptMatches.
   */
  const extraWebAppHosts = [];

  function isWebAppHost(hostname) {
    if (!hostname) return false;
    const h = String(hostname).toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") return true;
    if (h === "cart-it.pages.dev" || h.endsWith(".cart-it.pages.dev")) return true;
    if (h === "cart-it.com" || h === "www.cart-it.com" || h.endsWith(".cart-it.com")) return true;
    if (extraWebAppHosts.some((x) => h === String(x).toLowerCase())) return true;
    return false;
  }

  /** Match patterns for the token bridge content script — must mirror manifest.json content_scripts. */
  function contentScriptMatches() {
    const extra =
      extraWebAppHosts.length > 0
        ? extraWebAppHosts.flatMap((host) => [`https://${host}/*`, `https://*.${host}/*`])
        : [];
    return [
      "https://cart-it.com/*",
      "https://www.cart-it.com/*",
      "https://*.cart-it.com/*",
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
