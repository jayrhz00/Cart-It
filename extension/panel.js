const DEFAULT_API = "https://cart-it.onrender.com";
const FALLBACK_LOCAL_API = "http://127.0.0.1:5001";

/** Runs in the product tab — name, price, image, store from the page. */
function getPageData() {
  const ogImage =
    document.querySelector('meta[property="og:image"]')?.content ||
    document.querySelector('meta[name="twitter:image"]')?.content ||
    "";
  let price = null;
  const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
  for (const node of jsonLd) {
    try {
      const data = JSON.parse(node.textContent);
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        const offers = item.offers || item.aggregateOffer;
        if (offers && typeof offers.price === "number") {
          price = offers.price;
          break;
        }
        if (offers && offers.lowPrice) {
          price = parseFloat(offers.lowPrice, 10);
          break;
        }
      }
    } catch (_) {
      /* ignore */
    }
  }
  const host = location.hostname.replace(/^www\./, "");
  return {
    item_name: document.title || "Untitled page",
    product_url: location.href,
    image_url: ogImage || "",
    store: host,
    current_price: price != null && !Number.isNaN(price) ? price : 0,
  };
}

let lastCapture = null;
let authRejected = false;
let cachedGroups = [];

function truncate(s, max) {
  const t = String(s || "");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function setStatus(text, ok) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.className = ok ? "ok" : "err";
}

function setWishlistLink(href) {
  const el = document.getElementById("viewWishlistLink");
  if (!el) return;
  if (!href) {
    el.hidden = true;
    el.removeAttribute("href");
    return;
  }
  el.href = href;
  el.hidden = false;
}

function setTabHint(text) {
  const el = document.getElementById("tabHint");
  if (el) el.textContent = text || "";
}

async function resolveJwt() {
  if (authRejected) return "";
  let { jwt } = await chrome.storage.local.get(["jwt"]);
  if (isLikelyJwt(jwt)) return jwt;
  await syncTokenFromOpenTabs();
  ({ jwt } = await chrome.storage.local.get(["jwt"]));
  return isLikelyJwt(jwt) ? jwt : "";
}

async function setAuthLine() {
  const el = document.getElementById("authStatus");
  if (!el) return;
  const jwt = await resolveJwt();
  const ok = !!jwt;
  el.textContent = ok
    ? "Signed in — token synced from your cart-It tab."
    : "Open cart-It (cart-it.pages.dev or localhost), log in, then reopen this panel.";
  el.style.color = ok ? "#166534" : "#92400e";
}

function isLikelyJwt(token) {
  return typeof token === "string" && token.split(".").length === 3 && token.length > 20;
}

function isCartItHost(hostname) {
  return hostname === "cart-it.pages.dev" || hostname === "localhost" || hostname === "127.0.0.1";
}

/** Ask the service worker to copy JWT from any open cart-It tab into extension storage. */
async function syncTokenFromOpenTabs() {
  const tabs = await chrome.tabs.query({});
  const localTabs = tabs.filter((tab) => {
    if (!tab?.id || !tab.url) return false;
    try {
      const u = new URL(tab.url);
      return isCartItHost(u.hostname);
    } catch {
      return false;
    }
  });

  // Prefer most recently used local tabs and likely app routes.
  localTabs.sort((a, b) => {
    const recentA = Number(a.lastAccessed || 0);
    const recentB = Number(b.lastAccessed || 0);
    if (recentA !== recentB) return recentB - recentA;
    const score = (tab) => {
      try {
        const u = new URL(tab.url);
        const p = u.pathname || "/";
        if (p.startsWith("/dashboard")) return 3;
        if (p.startsWith("/login") || p.startsWith("/signup")) return 2;
        return 1;
      } catch {
        return 0;
      }
    };
    return score(b) - score(a);
  });

  for (const tab of localTabs) {
    try {
      const injected = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          token: localStorage.getItem("token"),
        }),
      });
      const data = injected?.[0]?.result || {};
      const token = typeof data.token === "string" ? data.token.trim() : "";
      const clean = token.startsWith("Bearer ") ? token.slice(7).trim() : token;
      if (isLikelyJwt(clean)) {
        const origin = new URL(tab.url).origin;
        await chrome.storage.local.set({ jwt: clean, jwt_origin: origin });
        return true;
      }
    } catch {
      /* ignore and continue */
    }
  }
  return false;
}

async function resolveDashboardUrl() {
  const { jwt_origin } = await chrome.storage.local.get(["jwt_origin"]);
  if (typeof jwt_origin === "string" && jwt_origin.trim()) {
    return `${jwt_origin.replace(/\/$/, "")}/dashboard`;
  }
  return "https://cart-it.pages.dev/dashboard";
}

async function apiBase() {
  const { apiBase: raw } = await chrome.storage.local.get(["apiBase"]);
  return (raw || DEFAULT_API).replace(/\/$/, "");
}

async function refreshFromTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      lastCapture = null;
      setTabHint("");
      setStatus("No active tab.", false);
      return false;
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getPageData,
    });
    lastCapture = result;
    const title = (result.item_name || "").trim();
    setTabHint(title ? `Saving from this tab: ${truncate(title, 72)}` : "Saving from this tab.");
    setStatus("", true);
    return true;
  } catch (e) {
    lastCapture = null;
    setTabHint("");
    setStatus(
      e.message || "Could not read this page (use a normal product page, not chrome://).",
      false
    );
    return false;
  }
}

async function loadCategories() {
  const jwt = await resolveJwt();
  const base = await apiBase();
  const sel = document.getElementById("category");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">No category</option>';
  if (!jwt) {
    // Clear stale auth error text from previous attempts.
    setStatus("", true);
    setAuthLine();
    return;
  }
  try {
    const res = await fetch(`${base}/api/groups`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        (data && data.message) ||
        (typeof data === "string" ? data : null) ||
        `Could not load categories (HTTP ${res.status}).`;
      setStatus(msg, false);
      if (res.status === 403 || res.status === 401) {
        authRejected = true;
        await chrome.storage.local.remove(["jwt"]);
        setStatus("Token mismatch with this API. Log out and back in on cart-It, then reopen this panel.", false);
      }
      setAuthLine();
      return;
    }
    cachedGroups = Array.isArray(data) ? data : [];
    renderCategoryOptions();
    if (prev && [...sel.options].some((o) => o.value === prev)) {
      sel.value = prev;
    }
    setStatus("", true);
  } catch (e) {
    setStatus(e.message || "Network error loading categories.", false);
  }
  setAuthLine();
}

function renderCategoryOptions() {
  const sel = document.getElementById("category");
  const scopeEl = document.getElementById("listScope");
  if (!sel) return;
  const prev = sel.value;
  const scope = scopeEl?.value || "All";
  sel.innerHTML = '<option value="">No category</option>';
  const filtered = cachedGroups.filter((g) => {
    const visibility = String(g.visibility || "Private");
    if (scope === "All") return true;
    return visibility === scope;
  });
  for (const g of filtered) {
    const id = g.group_id;
    const name = g.group_name || `Category ${id}`;
    const opt = document.createElement("option");
    opt.value = String(id);
    opt.textContent = name;
    sel.appendChild(opt);
  }
  if (prev && [...sel.options].some((o) => o.value === prev)) {
    sel.value = prev;
  }
}

document.getElementById("toggleNewCat").addEventListener("click", () => {
  const wrap = document.getElementById("newCatWrap");
  if (!wrap) return;
  wrap.hidden = !wrap.hidden;
});

document.getElementById("createCatBtn").addEventListener("click", async () => {
  const btn = document.getElementById("createCatBtn");
  const name = document.getElementById("newCatName").value.trim();
  if (!name) {
    setStatus("Enter a category name.", false);
    return;
  }
  const jwt = await resolveJwt();
  if (!jwt) {
    setStatus("Sign in on cart-It first.", false);
    return;
  }
  btn.disabled = true;
  setStatus("Creating category…", true);
  try {
    const base = await apiBase();
    const color = document.getElementById("newCatColor").value || "#f59e0b";
    const scopeEl = document.getElementById("listScope");
    const visibility = scopeEl?.value === "Shared" ? "Shared" : "Private";
    const res = await fetch(`${base}/api/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        group_name: name,
        color,
        visibility,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        authRejected = true;
        await chrome.storage.local.remove(["jwt"]);
      }
      setStatus(data.message || data.error || "Could not create category.", false);
      return;
    }
    const gid = data.group?.group_id;
    document.getElementById("newCatName").value = "";
    document.getElementById("newCatWrap").hidden = true;
    await loadCategories();
    if (gid != null) {
      document.getElementById("category").value = String(gid);
    }
    setStatus("Category created.", true);
  } catch (e) {
    setStatus(e.message || "Network error.", false);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  setStatus("Saving…", true);
  setWishlistLink("");
  try {
    const jwt = await resolveJwt();
    if (!jwt) {
      await chrome.storage.local.remove(["jwt"]);
      setStatus("Not signed in — open cart-It, log in, leave that tab open, then try again.", false);
      await setAuthLine();
      return;
    }
    await refreshFromTab();
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const cap = lastCapture;
    const fallbackUrl = activeTab?.url ? String(activeTab.url).trim() : "";
    const fallbackTitle = activeTab?.title ? String(activeTab.title).trim() : "";
    const productUrl = (cap && cap.product_url ? String(cap.product_url) : fallbackUrl).trim();
    if (!productUrl) {
      setStatus("Could not read this tab. Open a product page and try again.", false);
      return;
    }
    const base = await apiBase();
    const notes = document.getElementById("notes").value.trim();
    const gidRaw = document.getElementById("category").value;
    const group_id = gidRaw === "" ? null : parseInt(gidRaw, 10);
    if (gidRaw !== "" && Number.isNaN(group_id)) {
      setStatus("Pick a valid category.", false);
      return;
    }

    const item_name = ((cap && cap.item_name) || fallbackTitle || "Saved item").trim();
    if (!item_name) {
      setStatus("Could not read a product title from this page. Try refreshing the product tab.", false);
      return;
    }
    const rawPrice = parseFloat(String(cap && cap.current_price != null ? cap.current_price : "0"), 10);
    const safePrice = Number.isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;

    const body = {
      item_name,
      product_url: productUrl,
      current_price: safePrice,
      image_url: (cap && cap.image_url ? String(cap.image_url) : "").trim() || null,
      store: (cap && cap.store ? String(cap.store) : "").trim() || null,
      notes: notes || null,
      group_id,
    };

    const res = await fetch(`${base}/api/cart-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.message || data.error || JSON.stringify(data);
      if (res.status === 401 || res.status === 403) {
        authRejected = true;
        await chrome.storage.local.remove(["jwt"]);
        setAuthLine();
      }
      setStatus(detail || `Save failed (${res.status})`, false);
      setWishlistLink("");
      return;
    }
    setStatus(`Saved — item #${data.item_id}`, true);
    const dashboardUrl = await resolveDashboardUrl();
    setWishlistLink(dashboardUrl);
  } catch (e) {
    setStatus(e.message || "Network error — is the API running?", false);
    setWishlistLink("");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("apiBase").addEventListener("change", async () => {
  const v = document.getElementById("apiBase").value.trim().replace(/\/$/, "") || DEFAULT_API;
  await chrome.storage.local.set({ apiBase: v });
  await loadCategories();
});

document.getElementById("listScope").addEventListener("change", () => {
  renderCategoryOptions();
});

async function init() {
  const { apiBase: stored } = await chrome.storage.local.get(["apiBase"]);
  const apiEl = document.getElementById("apiBase");
  const normalizedStored = (stored || "").trim().replace(/\/$/, "");
  const shouldMigrate =
    !normalizedStored ||
    normalizedStored === FALLBACK_LOCAL_API ||
    normalizedStored === "http://localhost:5001";
  const resolvedBase = shouldMigrate ? DEFAULT_API : normalizedStored;
  await chrome.storage.local.set({ apiBase: resolvedBase });
  if (apiEl) apiEl.value = resolvedBase;
  authRejected = false;
  await setAuthLine();
  await refreshFromTab();
  await loadCategories();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.jwt) {
    setAuthLine();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    setAuthLine().then(loadCategories);
  }
});

init();
