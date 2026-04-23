const DEFAULT_API = "http://127.0.0.1:5001";

/** Runs in the product tab — same logic as before for name, price, image, store. */
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

function setStatus(text, ok) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.className = ok ? "ok" : "err";
}

function setAuthLine() {
  const el = document.getElementById("authStatus");
  if (!el) return;
  chrome.storage.local.get(["jwt"], (data) => {
    const ok = !!(data.jwt && String(data.jwt).length > 10);
    el.textContent = ok
      ? "Signed in — session synced from your cart-It tab."
      : "Open cart-It in a browser tab and log in once. This page must stay on the same origin as in the extension manifest (e.g. http://localhost:3000).";
    el.style.color = ok ? "#166534" : "#92400e";
  });
}

async function apiBase() {
  const { apiBase: raw } = await chrome.storage.local.get(["apiBase"]);
  return (raw || DEFAULT_API).replace(/\/$/, "");
}

async function refreshFromTab() {
  setStatus("Reading this tab…", true);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("No active tab.", false);
      return;
    }
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getPageData,
    });
    lastCapture = result;
    const urlEl = document.getElementById("productUrl");
    if (urlEl) urlEl.value = result.product_url || "";
    setStatus("Ready — adjust URL or notes, pick a category, then save.", true);
  } catch (e) {
    lastCapture = null;
    setStatus(
      e.message || "Could not read this page (try a normal product tab, not chrome://).",
      false
    );
  }
}

async function loadCategories() {
  const jwt = (await chrome.storage.local.get(["jwt"])).jwt;
  const base = await apiBase();
  const sel = document.getElementById("category");
  if (!sel) return;
  sel.innerHTML = '<option value="">No category</option>';
  if (!jwt) {
    setAuthLine();
    return;
  }
  try {
    const res = await fetch(`${base}/api/groups`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setAuthLine();
      return;
    }
    const groups = Array.isArray(data) ? data : [];
    for (const g of groups) {
      const id = g.group_id;
      const name = g.group_name || `Category ${id}`;
      const opt = document.createElement("option");
      opt.value = String(id);
      opt.textContent = name;
      sel.appendChild(opt);
    }
  } catch (_) {
    /* ignore */
  }
  setAuthLine();
}

document.getElementById("refreshBtn").addEventListener("click", async () => {
  await refreshFromTab();
  await loadCategories();
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  setStatus("Saving…", true);
  try {
    const { jwt } = await chrome.storage.local.get(["jwt"]);
    if (!jwt) {
      setStatus("Not signed in — open cart-It and log in on a matching tab.", false);
      return;
    }
    const base = await apiBase();
    const productUrl = document.getElementById("productUrl").value.trim();
    if (!productUrl) {
      setStatus("Product URL is required. Click “Use current tab”.", false);
      return;
    }
    const notes = document.getElementById("notes").value.trim();
    const gidRaw = document.getElementById("category").value;
    const group_id = gidRaw === "" ? null : parseInt(gidRaw, 10);
    if (gidRaw !== "" && Number.isNaN(group_id)) {
      setStatus("Pick a valid category.", false);
      return;
    }

    // If panel was opened before navigating to the product page, refresh now.
    if (!lastCapture) {
      await refreshFromTab();
    }
    const cap = lastCapture || {};
    const item_name = (cap.item_name || "Saved item").trim();
    const rawPrice = parseFloat(String(cap.current_price != null ? cap.current_price : "0"), 10);
    const safePrice = Number.isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;

    const body = {
      item_name,
      product_url: productUrl,
      current_price: safePrice,
      image_url: (cap.image_url || "").trim() || null,
      store: (cap.store || "").trim() || null,
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
      setStatus(detail || `Save failed (${res.status})`, false);
      return;
    }
    setStatus(`Saved — item #${data.item_id}`, true);
  } catch (e) {
    setStatus(e.message || "Network error — is the API running?", false);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("apiBase").addEventListener("change", async () => {
  const v = document.getElementById("apiBase").value.trim().replace(/\/$/, "") || DEFAULT_API;
  await chrome.storage.local.set({ apiBase: v });
  await loadCategories();
});

async function init() {
  const { apiBase: stored } = await chrome.storage.local.get(["apiBase"]);
  document.getElementById("apiBase").value = stored || DEFAULT_API;
  setAuthLine();
  await refreshFromTab();
  await loadCategories();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.jwt) {
    setAuthLine();
    loadCategories();
  }
});

init();
