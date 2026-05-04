document.addEventListener('DOMContentLoaded', async () => {
  const listSelect = document.getElementById('listSelect');
  const saveBtn = document.getElementById('saveBtn');
  const loader = document.getElementById('loader');
  const mainUI = document.getElementById('main-ui');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // --- 1. GET AUTH FROM STORAGE ---
let session = {};
try {
  // Use the universal namespace if possible, or fallback to chrome
  const api = typeof browser !== 'undefined' ? browser : chrome;
  session = await api.storage.local.get(['authToken', 'userData']);
} catch (e) {
  console.error("Storage access failed:", e);
}  
  if (!session.authToken || !session.userData) {
    loader.innerHTML = `Please <a href="http://localhost:3000/login" target="_blank" style="color: #DB8046;">log in</a> to Cart-It first.`;
    loader.style.display = 'block';
    saveBtn.disabled = true;
    return;
  }

  const userId = session.userData.user_id;
  const token = session.authToken;

  // --- 2. FETCH WISHLISTS (Authenticated) ---
  try {
    const resp = await fetch(`http://localhost:3000/api/wishlists?owner_id=${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const lists = await resp.json();
    lists.forEach(list => {
      const opt = document.createElement('option');
      opt.value = list.wishlist_id;
      opt.textContent = list.name;
      listSelect.appendChild(opt);
    });
  } catch (e) { console.error("Wishlist fetch failed"); }

  // --- 3. FETCH PREVIEW ---
  loader.style.display = 'block';
  try {
    const response = await fetch('http://localhost:3000/api/preview-scrape', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url: tab.url })
    });
    const data = await response.json();
    loader.style.display = 'none';

    if (data.img) document.getElementById('product-img').src = data.img;
    document.getElementById('product-name').textContent = data.name || "Product Detected";
    document.getElementById('product-price').textContent = (data.price && data.price !== "0.00") ? `$${data.price}` : "Price: See site";

  } catch (e) { 
    loader.style.display = 'none';
  }

  // --- 4. SAVE LOGIC (Authenticated) ---
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const response = await fetch('http://localhost:3000/api/scrape-and-save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          url: tab.url, 
          user_id: userId, 
          wishlist_id: listSelect.value || null, 
          notes: document.getElementById('notes').value 
        })
      });

      if (response.ok) {
        showSuccessUI(listSelect.options[listSelect.selectedIndex].text, listSelect.value);
      }
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Cart It!";
    }
  });

  function showSuccessUI(listName, listId) {
    mainUI.style.display = 'none';
    const successUI = document.getElementById('success-ui');
    const msg = document.getElementById('success-msg');
    const link = document.getElementById('redirect-link');
    successUI.style.display = 'block';
    
    if (listId) {
      msg.textContent = `Saved to "${listName}"!`;
      link.dataset.url = `http://localhost:3001/wishlists/${listId}`;
    } else {
      msg.textContent = "Saved to your cart!";
      link.dataset.url = "http://localhost:3001/cart";
    }
    link.textContent = "See your items.";
  }

  document.getElementById('redirect-link').addEventListener('click', (e) => {
    chrome.tabs.create({ url: e.target.dataset.url });
    window.close();
  });
});