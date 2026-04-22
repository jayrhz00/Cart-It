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
    image_url: ogImage || null,
    store: host,
    current_price: price != null && !Number.isNaN(price) ? price : 0,
  };
}

function setStatus(text, ok) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.className = ok ? "ok" : "err";
}

async function loadSettings() {
  const { apiBase, jwt, groupId } = await chrome.storage.local.get([
    "apiBase",
    "jwt",
    "groupId",
  ]);
  document.getElementById("apiBase").value = apiBase || "http://127.0.0.1:5001";
  document.getElementById("jwt").value = jwt || "";
  document.getElementById("groupId").value = groupId ?? "";
}

async function saveSettings() {
  const apiBase = document.getElementById("apiBase").value.trim().replace(/\/$/, "");
  const jwt = document.getElementById("jwt").value.trim();
  const groupRaw = document.getElementById("groupId").value.trim();
  const groupId = groupRaw === "" ? null : parseInt(groupRaw, 10);
  await chrome.storage.local.set({ apiBase, jwt, groupId });
  return { apiBase, jwt, groupId };
}

document.getElementById("saveBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  setStatus("Reading tab…", true);

  try {
    const { apiBase, jwt, groupId } = await saveSettings();
    if (!apiBase) {
      setStatus("Set API base URL.", false);
      return;
    }
    if (!jwt) {
      setStatus("Paste your JWT from the Cart-It site (localStorage token).", false);
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("No active tab.", false);
      return;
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getPageData,
    });

    const body = {
      group_id: groupId,
      item_name: result.item_name,
      product_url: result.product_url,
      image_url: result.image_url,
      store: result.store,
      current_price: result.current_price,
      notes: null,
    };

    const res = await fetch(`${apiBase}/api/cart-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.message || `Save failed (${res.status})`, false);
      return;
    }
    setStatus(`Saved! Item #${data.item_id}`, true);
  } catch (e) {
    setStatus(e.message || "Error — is the API server running?", false);
  } finally {
    btn.disabled = false;
  }
});

loadSettings();
