/**
 * Single place to update production URLs when you go live.
 * Loaded before background.js (Firefox) or via importScripts in the service worker (Chrome).
 */
(function cartItExtensionConfig() {
  const root = typeof self !== "undefined" ? self : globalThis;
  const defaultWebAppOrigin = "https://cart-it.pages.dev";
  const defaultApiBase = "https://cart-it.onrender.com";

  function isWebAppHost(hostname) {
    if (!hostname) return false;
    const h = String(hostname).toLowerCase();
    if (h === "localhost" || h === "127.0.0.1") return true;
    if (h === "cart-it.pages.dev" || h.endsWith(".cart-it.pages.dev")) return true;
    return false;
  }

  /** Match patterns for the token bridge content script (add your real domain when you launch). */
  function contentScriptMatches() {
    return [
      "https://cart-it.pages.dev/*",
      "https://*.cart-it.pages.dev/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
      "https://localhost/*",
      "https://127.0.0.1/*",
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
