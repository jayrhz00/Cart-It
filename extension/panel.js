const DEFAULT_API =
  typeof CART_IT_CONFIG !== "undefined" && CART_IT_CONFIG.defaultApiBase
    ? CART_IT_CONFIG.defaultApiBase
    : "https://cart-it.onrender.com";
const FALLBACK_LOCAL_API =
  typeof CART_IT_CONFIG !== "undefined" && CART_IT_CONFIG.fallbackLocalApi
    ? CART_IT_CONFIG.fallbackLocalApi
    : "http://127.0.0.1:5001";

/** Runs in the product tab — name, price, image, store from the page. */
function getPageData() {
  const textFromScript = (selector) => {
    const el = document.querySelector(selector);
    return el?.textContent || "";
  };
  const ogImage =
    document.querySelector('meta[property="og:image"]')?.content ||
    document.querySelector('meta[name="twitter:image"]')?.content ||
    "";
  const parsePriceText = (raw) => {
    if (!raw) return null;
    const compact = String(raw).replace(/\s+/g, "");
    const match = compact.match(/([0-9][0-9.,]*)/);
    if (!match?.[1]) return null;
    let token = match[1];
    const hasComma = token.includes(",");
    const hasDot = token.includes(".");
    if (hasComma && hasDot) {
      const lastComma = token.lastIndexOf(",");
      const lastDot = token.lastIndexOf(".");
      if (lastComma > lastDot) {
        // 1.799,99 -> 1799.99
        token = token.replace(/\./g, "").replace(",", ".");
      } else {
        // 1,799.99 -> 1799.99
        token = token.replace(/,/g, "");
      }
    } else if (hasComma) {
      // 17,99 -> 17.99 ; 1,799 -> 1799
      token = /,\d{1,2}$/.test(token) ? token.replace(",", ".") : token.replace(/,/g, "");
    }
    const parsed = Number(token);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const isAmazon = /\.amazon\./i.test(location.hostname);
  const getAmazonPrice = () => {
    // Prefer explicit price blocks / a-offscreen values used for the primary PDP price.
    const selectors = [
      "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
      "#corePriceDisplay_mobile_feature_div .a-price .a-offscreen",
      "#corePrice_feature_div .a-price .a-offscreen",
      "#price_inside_buybox",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      "#priceblock_saleprice",
      "#reinvent_price_desktop_buybox .a-price .a-offscreen",
      "#apex_desktop .a-price .a-offscreen",
      'span[data-a-color="price"] .a-offscreen',
      ".a-price.aok-align-center .a-offscreen",
      ".a-price .a-offscreen",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const txt = el?.textContent || el?.getAttribute?.("content") || "";
      const parsed = parsePriceText(txt);
      // Avoid common Amazon non-price numbers (e.g. $35 shipping threshold) by requiring cents.
      if (parsed != null && /\.\d{2}\b/.test(String(txt))) return parsed;
    }
    // Fallback: scan the core price block text only (not the whole page).
    const core =
      document.querySelector("#corePriceDisplay_desktop_feature_div") ||
      document.querySelector("#corePriceDisplay_mobile_feature_div") ||
      document.querySelector("#corePrice_feature_div");
    if (core) {
      const m = (core.innerText || "").match(/\$\s*([0-9][0-9,]*\.[0-9]{2})/);
      const parsed = parsePriceText(m?.[1]);
      if (parsed != null) return parsed;
    }
    return null;
  };

  /** When primary selectors miss (A/B layouts), collect .a-offscreen money in buybox-ish roots — min tends to be the deal price, not "List". */
  const getAmazonPriceFromBuybox = () => {
    const roots = [
      document.querySelector("#buybox"),
      document.querySelector("#desktop_buybox"),
      document.querySelector("#unifiedPrice_feature_div"),
      document.querySelector("#corePriceDisplay_desktop_feature_div"),
      document.querySelector("#corePrice_feature_div"),
      document.querySelector("#apex_desktop"),
      document.querySelector("#rightCol"),
    ].filter(Boolean);
    const amounts = [];
    for (const root of roots) {
      root.querySelectorAll(".a-offscreen").forEach((el) => {
        const t = el.textContent || "";
        if (!/\d+\.\d{2}/.test(t)) return;
        const p = parsePriceText(t);
        if (p != null && p >= 0.01 && p < 1_000_000) amounts.push(p);
      });
    }
    if (!amounts.length) return null;
    return Math.min(...amounts);
  };

  /**
   * Variant PDPs often put a stale or "from" price in meta / JSON-LD while the real
   * price for the selected size sits next to Add to cart (including fixed bottom bars).
   */
  const pricesFromDollarMatches = (text) => {
    if (!text) return [];
    const matches = [...String(text).matchAll(/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g)];
    const out = [];
    for (const m of matches) {
      const p = parsePriceText(m[1]);
      if (p != null && p >= 1 && p < 1_000_000) out.push(p);
    }
    return out;
  };

  /** Only $12.34 style amounts — avoids "$35" shipping blurbs when min is used. */
  const pricesFromDollarCentsMatches = (text) => {
    if (!text) return [];
    const matches = [...String(text).matchAll(/\$\s*([0-9][0-9,]*\.\d{2})\b/g)];
    const out = [];
    for (const m of matches) {
      const p = parsePriceText(m[1]);
      if (p != null && p >= 0.01 && p < 1_000_000) out.push(p);
    }
    return out;
  };

  const pickNearCartPriceFromText = (text) => {
    const cents = pricesFromDollarCentsMatches(text);
    if (cents.length) return Math.min(...cents);
    const loose = pricesFromDollarMatches(text);
    if (!loose.length) return null;
    return Math.min(...loose);
  };

  const priceNearPrimaryAddToCart = () => {
    const candidates = Array.from(
      document.querySelectorAll(
        [
          'button[name="add"]',
          'button[id*="AddToCart"]',
          'button[id*="addtocart"]',
          'button[class*="add-to-cart"]',
          'button[class*="AddToCart"]',
          "[data-add-to-cart]",
          'button[aria-label*="add to cart"]',
          'button[aria-label*="Add to cart"]',
          'button[aria-label*="add to bag"]',
        ].join(",")
      )
    );
    const btn =
      candidates.find((b) => /cart|bag|checkout|buy now/i.test(b.textContent || "")) ||
      Array.from(document.querySelectorAll("button, a")).find((b) =>
        /^\s*add\s+to\s+cart\s*$/i.test((b.textContent || "").trim())
      );
    if (!btn) return null;
    let node = btn;
    for (let depth = 0; depth < 14 && node; depth++, node = node.parentElement) {
      const text = (node.innerText || "").slice(0, 2500);
      const picked = pickNearCartPriceFromText(text);
      if (picked == null) continue;
      const st = window.getComputedStyle(node);
      const fixedish = st.position === "fixed" || st.position === "sticky";
      const cls = `${node.className || ""} ${node.id || ""}`;
      if (fixedish || /sticky|bottom|bar|drawer|atc/i.test(cls)) {
        return picked;
      }
    }
    node = btn;
    for (let depth = 0; depth < 10 && node; depth++, node = node.parentElement) {
      const picked = pickNearCartPriceFromText((node.innerText || "").slice(0, 2500));
      if (picked != null) return picked;
    }
    return null;
  };

  let price = null;
  if (isAmazon) {
    price = getAmazonPrice() ?? getAmazonPriceFromBuybox();
  }
  const parseJsonPrice = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    const candidates = [
      obj.price,
      obj.lowPrice,
      obj.highPrice,
      obj.minPrice,
      obj.maxPrice,
      obj?.offers?.price,
      obj?.offers?.lowPrice,
      obj?.offers?.highPrice,
    ];
    for (const c of candidates) {
      const parsed = parsePriceText(c);
      if (parsed != null) return parsed;
    }
    if (Array.isArray(obj)) {
      for (const v of obj) {
        const nested = parseJsonPrice(v);
        if (nested != null) return nested;
      }
      return null;
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        const nested = parseJsonPrice(value);
        if (nested != null) return nested;
      }
    }
    return null;
  };

  /** Prefer explicit US-style retail prices ($12.34) so we skip bare "1500" rewards/points text. */
  const parseFirstDollarCents = (raw) => {
    if (!raw) return null;
    const s = String(raw);
    const m = s.match(/\$\s*([0-9][0-9,]*\.\d{2})\b/);
    if (!m?.[1]) return null;
    return parsePriceText(m[1]);
  };

  const typesIncludeProduct = (t) =>
    t === "Product" || (Array.isArray(t) && t.includes("Product"));

  const priceFromOffers = (offers) => {
    if (!offers) return null;
    const list = Array.isArray(offers) ? offers : [offers];
    for (const o of list) {
      if (!o || typeof o !== "object") continue;
      const p = parsePriceText(o.price ?? o.lowPrice ?? o.highPrice);
      if (p != null && p > 0 && p < 500000) return p;
    }
    return null;
  };

  /** JSON-LD Product/offers — run before broad DOM so Target PDP does not grab Circle "1500" first. */
  const extractJsonLdProductPrice = () => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const node of scripts) {
      try {
        const data = JSON.parse(node.textContent);
        const roots = Array.isArray(data) ? data : [data];
        for (const root of roots) {
          if (!root || typeof root !== "object") continue;
          if (typesIncludeProduct(root["@type"])) {
            const p = priceFromOffers(root.offers) ?? parsePriceText(root.price);
            if (p != null && p > 0 && p < 500000) return p;
          }
          if (Array.isArray(root["@graph"])) {
            for (const g of root["@graph"]) {
              if (g && typesIncludeProduct(g["@type"])) {
                const p = priceFromOffers(g.offers) ?? parsePriceText(g.price);
                if (p != null && p > 0 && p < 500000) return p;
              }
            }
          }
        }
        const loose = parseJsonPrice(data);
        if (loose != null && loose > 0 && loose < 500000) return loose;
      } catch (_) {
        /* ignore */
      }
    }
    return null;
  };

  const isTarget = /(^|\.)target\.com$/i.test(location.hostname);

  if (!isAmazon) {
    const metaPriceSelectors = [
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[name="twitter:data1"]',
      'meta[itemprop="price"]',
      'meta[name="price"]',
    ];
    for (const selector of metaPriceSelectors) {
      const parsed = parsePriceText(document.querySelector(selector)?.getAttribute("content"));
      if (parsed != null) {
        price = parsed;
        break;
      }
    }

    if (price == null) {
      price = extractJsonLdProductPrice();
    }

    if (price == null) {
      const nextDataRaw = textFromScript("#__NEXT_DATA__");
      if (nextDataRaw) {
        try {
          const parsed = parseJsonPrice(JSON.parse(nextDataRaw));
          if (parsed != null) price = parsed;
        } catch (_) {
          /* ignore */
        }
      }
    }

    if (price == null && isTarget) {
      const targetSels = [
        '[data-test="product-price"]',
        '[data-test="@web/ProductDetailPrice"]',
        '[data-test="product-price"] *',
        "h1 + div [class*='price']",
      ];
      for (const sel of targetSels) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const t = el.textContent || el.getAttribute?.("content") || "";
        const strict = parseFirstDollarCents(t);
        const loose = parsePriceText(t);
        const p = strict ?? loose;
        if (p != null && p > 0 && p < 500000) {
          price = p;
          break;
        }
      }
    }

    if (price == null) {
      const tight = Array.from(
        document.querySelectorAll(
          ['[itemprop="price"]', '[data-testid*="price"]', '[id*="product-price"]', '[id*="ProductPrice"]'].join(",")
        )
      );
      const tightAmounts = [];
      for (const el of tight) {
        const content = el.getAttribute?.("content");
        const text = content || el.textContent || "";
        const strict = parseFirstDollarCents(text);
        const loose = parsePriceText(text);
        const p = strict ?? loose;
        if (p != null && p > 0 && p < 500000) tightAmounts.push(p);
      }
      if (tightAmounts.length) {
        tightAmounts.sort((a, b) => a - b);
        price = tightAmounts[0];
      }
    }

    if (price == null) {
      const looseEls = Array.from(
        document.querySelectorAll(['[class*="price"]', '[id*="price"]'].join(","))
      );
      const amounts = [];
      for (const el of looseEls) {
        const text = el.getAttribute?.("content") || el.textContent || "";
        const strict = parseFirstDollarCents(text);
        if (strict != null) {
          amounts.push(strict);
          continue;
        }
        const loose = parsePriceText(text);
        if (loose != null && loose > 0 && loose < 500000) amounts.push(loose);
      }
      if (amounts.length) {
        amounts.sort((a, b) => a - b);
        const lo = amounts[0];
        const hi = amounts[amounts.length - 1];
        if (amounts.length > 1 && hi > lo * 25 && lo < 5000 && hi >= 200) price = lo;
        else price = amounts[Math.floor(amounts.length / 2)];
      }
    }
  }
  // IMPORTANT: Avoid scanning Amazon body text for "$..." because it contains shipping thresholds
  // like "FREE shipping over $35" which are not product prices.
  if (price == null && !isAmazon) {
    const bodyText = (document.body?.innerText || "").slice(0, 12000);
    const fallbackRegexes = [
      /(?:\$|USD\s?)([0-9]+(?:\.[0-9]{1,2})?)/i,
      /([0-9]+(?:\.[0-9]{1,2})?)\s?(?:USD|dollars?)/i,
    ];
    for (const re of fallbackRegexes) {
      const m = bodyText.match(re);
      if (m?.[1]) {
        const parsed = parsePriceText(m[1]);
        if (parsed != null) {
          price = parsed;
          break;
        }
      }
    }
  }

  const nearCartPrice = isAmazon ? null : priceNearPrimaryAddToCart();
  if (nearCartPrice != null) {
    if (price == null) price = nearCartPrice;
    else if (Math.abs(nearCartPrice - price) >= 0.5) {
      const hi = Math.max(price, nearCartPrice);
      const lo = Math.min(price, nearCartPrice);
      // Do not replace canonical / JSON-LD price with a huge ATC-adjacent outlier (e.g. Circle "1500").
      if (hi >= lo * 15 && lo > 0 && lo < 5000) price = lo;
      else price = nearCartPrice;
    }
  }

  const detectInStock = () => {
    const bodyText = (document.body?.innerText || "").toLowerCase();
    const outPatterns = [
      "out of stock",
      "sold out",
      "currently unavailable",
      "temporarily unavailable",
      "notify me when available",
    ];
    for (const token of outPatterns) {
      if (bodyText.includes(token)) return false;
    }
    const inPatterns = ["in stock", "add to cart", "buy now", "available now"];
    for (const token of inPatterns) {
      if (bodyText.includes(token)) return true;
    }
    return true;
  };
  const host = location.hostname.replace(/^www\./, "");
  let imageUrl = ogImage || "";
  if (!imageUrl.trim() && /\.amazon\./i.test(location.hostname)) {
    const landing = document.querySelector("#landingImage");
    const fromLanding =
      landing?.getAttribute("src") ||
      landing?.getAttribute("data-old-hires") ||
      landing?.currentSrc ||
      "";
    if (fromLanding) imageUrl = fromLanding;
    if (!imageUrl) {
      const wrapImg = document.querySelector(
        "#imgTagWrapperId img[data-a-dynamic-image], #main-image-container img[data-a-dynamic-image]"
      );
      const dyn = wrapImg?.getAttribute("data-a-dynamic-image");
      if (dyn) {
        try {
          const map = JSON.parse(dyn.replace(/&quot;/g, '"'));
          const first = Object.keys(map)[0];
          if (first && /^https?:\/\//i.test(first)) imageUrl = first;
        } catch (_) {
          /* ignore */
        }
      }
    }
  }
  return {
    item_name: document.title || "Untitled page",
    product_url: location.href,
    image_url: imageUrl,
    store: host,
    current_price: price != null && !Number.isNaN(price) ? price : 0,
    is_in_stock: detectInStock(),
  };
}

let lastCapture = null;
let authRejected = false;
let cachedGroups = [];
let currentUserLabel = "";

function truncate(s, max) {
  const t = String(s || "");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

async function getWebAppOrigin() {
  const fallback =
    typeof CART_IT_CONFIG !== "undefined" && CART_IT_CONFIG.defaultWebAppOrigin
      ? CART_IT_CONFIG.defaultWebAppOrigin
      : "https://cart-it.com";
  const { webAppOrigin: stored } = await chrome.storage.local.get(["webAppOrigin"]);
  const raw = String(stored || fallback).trim().replace(/\/$/, "");
  return raw || fallback.replace(/\/$/, "");
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

function setPriceHint(text, ok = true) {
  const el = document.getElementById("priceHint");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#166534" : "#991b1b";
}

async function resolveJwt() {
  if (authRejected) return "";
  await syncTokenFromOpenTabs();
  const { jwt } = await chrome.storage.local.get(["jwt"]);
  return isLikelyJwt(jwt) ? jwt : "";
}

async function setAuthLine() {
  const el = document.getElementById("authStatus");
  if (!el) return;
  const jwt = await resolveJwt();
  const ok = !!jwt;
  const who = currentUserLabel ? ` as ${currentUserLabel}` : "";
  el.textContent = ok
    ? `Signed in${who}. Save from any normal product page in the active tab.`
    : "Sign in below, or open Cart-It in a browser tab and log in — we’ll sync your session automatically.";
  el.style.color = ok ? "#166534" : "#92400e";

  const signInWrap = document.getElementById("signInWrap");
  if (signInWrap) signInWrap.hidden = ok;
}

function isLikelyJwt(token) {
  return typeof token === "string" && token.split(".").length === 3 && token.length > 20;
}

function isCartItHost(hostname) {
  const fn = globalThis.CART_IT_CONFIG?.isWebAppHost;
  if (typeof fn === "function") return fn(hostname);
  return (
    hostname === "cart-it.com" ||
    hostname === "www.cart-it.com" ||
    hostname.endsWith(".cart-it.com") ||
    hostname === "cart-it.pages.dev" ||
    hostname.endsWith(".cart-it.pages.dev") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
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
  const origin = await getWebAppOrigin();
  return `${origin}/dashboard`;
}

async function resolveWebAppBaseUrl() {
  const { jwt_origin } = await chrome.storage.local.get(["jwt_origin"]);
  if (typeof jwt_origin === "string" && jwt_origin.trim()) {
    return jwt_origin.replace(/\/$/, "");
  }
  return (await getWebAppOrigin()).replace(/\/$/, "");
}

/** Deep link to the saved item in the web app (`/item/:id`). */
async function resolveItemPageUrl(itemId) {
  const base = await resolveWebAppBaseUrl();
  return `${base}/item/${encodeURIComponent(String(itemId))}`;
}

/** Close the Chrome side panel after save / “See item” (Chrome 141+); Firefox popup uses window.close. */
async function closeSidePanel() {
  try {
    if (typeof chrome !== "undefined" && chrome.sidePanel?.close) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const wid = tab?.windowId;
      if (wid != null) {
        await chrome.sidePanel.close({ windowId: wid });
        return;
      }
    }
  } catch {
    /* Chrome < 141 or panel context without a closable global panel */
  }
  try {
    window.close();
  } catch {
    /* ignore */
  }
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
    const manualPriceEl = document.getElementById("manualPrice");
    if (manualPriceEl) {
      manualPriceEl.value =
        result.current_price != null && Number(result.current_price) > 0
          ? String(result.current_price)
          : "";
    }
    if (Number(result?.current_price || 0) > 0) {
      setPriceHint(`Auto price found: $${Number(result.current_price).toFixed(2)}`, true);
    } else {
      setPriceHint("Auto price not found on this page. Enter price manually before saving.", false);
    }
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
    try {
      const meRes = await fetch(`${base}/api/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const meData = await meRes.json().catch(() => null);
      currentUserLabel = meRes.ok
        ? String(meData?.user?.username || meData?.user?.email || "")
        : "";
    } catch {
      currentUserLabel = "";
    }
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
  const scope = scopeEl?.value === "Shared" ? "Shared" : "Private";
  sel.innerHTML = '<option value="">No category</option>';
  const filtered = cachedGroups.filter((g) => {
    const visibility = String(g.visibility || "Private");
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
    const manualPriceRaw = document.getElementById("manualPrice")?.value?.trim() || "";
    const sourcePrice = manualPriceRaw !== ""
      ? manualPriceRaw
      : String(cap && cap.current_price != null ? cap.current_price : "0");
    const rawPrice = parseFloat(sourcePrice, 10);
    const safePrice = Number.isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
    if (!(safePrice > 0)) {
      setStatus("Price is required. Enter a valid price before saving this item.", false);
      setPriceHint("Please enter a price greater than 0.", false);
      return;
    }

    // Server merges Amazon saves with ScrapingBee-backed HTML when SCRAPINGBEE_API_KEY is set (price + image).
    const body = {
      item_name,
      product_url: productUrl,
      current_price: safePrice,
      price: safePrice,
      image_url: (cap && cap.image_url ? String(cap.image_url) : "").trim() || null,
      store: (cap && cap.store ? String(cap.store) : "").trim() || null,
      is_in_stock: Boolean(cap?.is_in_stock !== false),
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
    const itemUrl = await resolveItemPageUrl(data.item_id);
    setWishlistLink(itemUrl);
    await closeSidePanel();
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

const webAppOriginEl = document.getElementById("webAppOrigin");
if (webAppOriginEl) {
  webAppOriginEl.addEventListener("change", async () => {
    const v =
      webAppOriginEl.value.trim().replace(/\/$/, "") || (await getWebAppOrigin());
    await chrome.storage.local.set({ webAppOrigin: v });
  });
}

document.getElementById("signInBtn").addEventListener("click", async () => {
  const btn = document.getElementById("signInBtn");
  const email = document.getElementById("signInEmail").value.trim();
  const password = document.getElementById("signInPassword").value;
  if (!email || !password) {
    setStatus("Enter email and password.", false);
    return;
  }
  btn.disabled = true;
  setStatus("Signing in…", true);
  try {
    const base = await apiBase();
    const res = await fetch(`${base}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.message || data.error || `Sign-in failed (${res.status})`, false);
      return;
    }
    const token = typeof data.token === "string" ? data.token.trim() : "";
    if (!isLikelyJwt(token)) {
      setStatus("Unexpected response from server.", false);
      return;
    }
    authRejected = false;
    const origin = await getWebAppOrigin();
    await chrome.storage.local.set({ jwt: token, jwt_origin: origin });
    document.getElementById("signInPassword").value = "";
    currentUserLabel = String(data.user?.username || data.user?.email || "");
    setStatus("Signed in.", true);
    await setAuthLine();
    await loadCategories();
  } catch (e) {
    setStatus(e.message || "Network error during sign-in.", false);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("createAccountBtn").addEventListener("click", async () => {
  const origin = await getWebAppOrigin();
  chrome.tabs.create({ url: `${origin}/signup`, active: true });
});

document.getElementById("listScope").addEventListener("change", () => {
  renderCategoryOptions();
});

document.getElementById("viewWishlistLink")?.addEventListener("click", async (e) => {
  const el = e.currentTarget;
  if (el.hidden) return;
  const href = el.getAttribute("href");
  if (!href || href === "#") return;
  e.preventDefault();
  try {
    await chrome.tabs.create({ url: href, active: true });
  } catch {
    window.open(href, "_blank", "noopener,noreferrer");
  }
  await closeSidePanel();
});

async function init() {
  const { apiBase: stored, webAppOrigin: storedWeb } = await chrome.storage.local.get([
    "apiBase",
    "webAppOrigin",
  ]);
  const apiEl = document.getElementById("apiBase");
  const normalizedStored = (stored || "").trim().replace(/\/$/, "");
  // Only default when nothing is saved — never overwrite explicit local URLs on each open.
  const resolvedBase = normalizedStored || DEFAULT_API;
  if (!normalizedStored) {
    await chrome.storage.local.set({ apiBase: resolvedBase });
  }
  if (apiEl) apiEl.value = resolvedBase;

  const defaultWeb =
    typeof CART_IT_CONFIG !== "undefined" && CART_IT_CONFIG.defaultWebAppOrigin
      ? CART_IT_CONFIG.defaultWebAppOrigin
      : "https://cart-it.com";
  const webAppEl = document.getElementById("webAppOrigin");
  const resolvedWeb = (storedWeb || defaultWeb).trim().replace(/\/$/, "");
  await chrome.storage.local.set({ webAppOrigin: resolvedWeb });
  if (webAppEl) webAppEl.value = resolvedWeb;

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
