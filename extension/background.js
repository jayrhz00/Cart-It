/** Toolbar icon opens the side panel (Chrome 114+). */
function registerPanelClickOpensSide() {
  return chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(registerPanelClickOpensSide);
chrome.runtime.onStartup.addListener(registerPanelClickOpensSide);
registerPanelClickOpensSide();

function normalizeToken(raw) {
  let t = typeof raw === "string" ? raw.trim() : "";
  if (t.startsWith("Bearer ")) t = t.slice(7).trim();
  return t;
}

function isLikelyJwt(token) {
  return typeof token === "string" && token.split(".").length === 3 && token.length > 20;
}

function isCartItHost(hostname) {
  return (
    hostname === "cart-it.pages.dev" ||
    hostname.endsWith(".cart-it.pages.dev") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

/**
 * Pull JWT from any open cart-It tab (pages.dev / localhost / 127.0.0.1).
 * The side panel often runs on a shop tab, so the content script there never runs —
 * this keeps chrome.storage.local.jwt in sync with the site you logged into.
 */
async function syncTokenFromCartItTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    let u;
    try {
      u = new URL(tab.url);
    } catch {
      continue;
    }
    if (!isCartItHost(u.hostname)) continue;
    try {
      const injected = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const token = localStorage.getItem("token");
          const user = localStorage.getItem("user");
          return { token, user };
        },
      });
      const result = injected[0]?.result || {};
      const tok = normalizeToken(result.token);
      const hasCartItUser = typeof result.user === "string" && result.user.trim().length > 0;
      if (isLikelyJwt(tok) && hasCartItUser) {
        await chrome.storage.local.set({ jwt: tok, jwt_origin: u.origin });
        return true;
      }
    } catch {
      /* restricted page or no access */
    }
  }
  return false;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CARTIT_TOKEN") {
    const token = normalizeToken(message.token);
    const payload = { jwt: token };
    if (_sender?.url) {
      try {
        const u = new URL(_sender.url);
        if (isCartItHost(u.hostname)) {
          payload.jwt_origin = u.origin;
        }
      } catch {
        /* ignore */
      }
    }
    chrome.storage.local.set(payload);
    return false;
  }
  if (message?.type === "REQUEST_TOKEN_SYNC") {
    syncTokenFromCartItTabs()
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  return false;
});
