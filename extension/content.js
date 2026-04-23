/**
 * Runs on cart-It web pages (same origin as localStorage).
 * Mirrors the login JWT into extension storage so the side panel can call the API without
 * asking the user to paste a token.
 */
(function cartItTokenBridge() {
  const STORAGE_KEY = "token";

  function pushToken() {
    let token = null;
    try {
      token = localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      token = null;
    }
    chrome.runtime.sendMessage({ type: "CARTIT_TOKEN", token });
  }

  pushToken();
  setInterval(pushToken, 2500);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pushToken();
  });
})();
