const API_BASE = 'http://localhost:3000/api';

/**
 * API Service
 * Centralized module for all asynchronous communication with the backend
 * Handles authentication, item management, wishlist operations, and web scraping
 */

// Helper to get the current token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// --- AUTH FUNCTIONS ---

// Authenticates a user and returns their session token and profile data
export const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error('Login failed');
  return response.json();
};

// Registers a new user account with the platform
export const signup = async (username, email, password) => {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(errorMsg); 
  }
  return true; 
};

// Triggers a password reset email for the provided account
export const requestPasswordReset = async (email) => {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.text();
};

// Submits a new password using a secure token validated by the backend
export const resetPassword = async (token, newPassword) => {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(errorMsg);
  }
  return true;
};

// --- ITEM & CART FUNCTIONS ---

// Fetches all unorganized and wishlist items associated with a specific user
export const getCartItems = async (userId) => {
  const response = await fetch(`${API_BASE}/items?user_id=${userId}`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) throw new Error('Failed to fetch cart items');
  return response.json();
};

// Retrieves items filtered by a specific wishlist ID
export const getWishlistItems = async (wishlistId, userId) => {
  const response = await fetch(`${API_BASE}/items/wishlist/${wishlistId}?user_id=${userId}`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) throw new Error('Failed to fetch wishlist items');
  return response.json();
};

// Fetches price history for graphs in item modals 
export const getPriceHistory = async (itemId) => {
  const response = await fetch(`${API_BASE}/items/${itemId}/history`, {
    headers: { ...getAuthHeader() }
  });
  return response.json();
};

// Adds new note from user to selected item in item modal 
export const updateItemNotes = async (itemId, notes) => {
  const response = await fetch(`${API_BASE}/items/${itemId}/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ notes }),
  });
  return response.json();
};

// Fetches data for a shared cart view using a public access token
export const getPublicCart = async (shareToken) => {
  const response = await fetch(`${API_BASE}/items/public/${shareToken}`);
  if (!response.ok) throw new Error('Could not load shared cart');
  return response.json();
};

// Marks item as purchased, deletes it from the cart (and wishlist if applicable) 
export const markItemAsPurchased = async (itemId, price) => {
  const response = await fetch(`${API_BASE}/items/${itemId}/purchase`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ price }),
  });
  return response.json();
};

// Deletes item from cart 
export const deleteItem = async (itemId) => {
  const response = await fetch(`${API_BASE}/items/${itemId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  return response.ok;
};

// Deletes multiple or all items from the cart
export const bulkDeleteItems = async (ids) => {
  const response = await fetch(`${API_BASE}/items/bulk`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ ids }),
  });
  return response.ok;
};

// Moves multiple items to wishlist from the cart
export const bulkMoveItems = async (ids, wishlistId) => {
  const response = await fetch(`${API_BASE}/items/bulk-move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ ids, wishlist_id: wishlistId }),
  });
  return response.ok;
};

// --- WISHLIST FUNCTIONS ---

// Fetches all wishlists where the user is an owner or a collaborator
export const getWishlists = async (userId) => {
  const response = await fetch(`${API_BASE}/wishlists?owner_id=${userId}`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) return []; 
  return response.json();
};

// Retrieves metadata (name, role, shared status) for a specific wishlist
export const getWishlistDetails = async (wishlistId, userId) => {
  const response = await fetch(`${API_BASE}/wishlists/details/${wishlistId}?user_id=${userId}`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) throw new Error("Failed to fetch wishlist info");
  return response.json();
};

// Creates a new empty wishlist for the user
export const createWishlist = async (userId, name) => {
  const response = await fetch(`${API_BASE}/wishlists`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader() 
    },
    body: JSON.stringify({ owner_id: userId, name }),
  });
  if (!response.ok) throw new Error('Failed to create wishlist');
  return response.json();
};

// Invites another user to collaborate on a specific wishlist via email
export const addCollaborator = async (wishlistId, email) => {
  const response = await fetch(`${API_BASE}/wishlists/collab`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader() 
    },
    body: JSON.stringify({ wishlist_id: wishlistId, email })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  return true;
};

// Moves items out of a wishlist and back into the unorganized cart
export const removeItemsFromWishlist = async (ids) => {
  const response = await fetch(`${API_BASE}/items/remove-from-wishlist`, {
    method: 'PUT',
    headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader() 
    },
    body: JSON.stringify({ ids })
  });
  if (!response.ok) throw new Error("Failed to remove items");
  return response.ok;
};

// Fetches a curated wishlist for external viewers using the share token and list ID
export const getPublicWishlist = async (shareToken, wishlistId) => {
  const response = await fetch(`${API_BASE}/wishlists/public/${shareToken}/${wishlistId}`);
  if (!response.ok) throw new Error('Could not load shared wishlist');
  return response.json();
};

// --- ANALYTICS FUNCTIONS --- 

// Get analytics information 
export const getAnalytics = async (userId, timeframe) => {
  const response = await fetch(`${API_BASE}/analytics?userId=${userId}&timeframe=${timeframe}`, {
    headers: { ...getAuthHeader() }
  });
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
};

// --- SCRAPING FUNCTIONS --- 

// Sends a URL to the backend to extract product metadata (price, title, image) for a preview
export const previewScrape = async (url) => {
  const response = await fetch(`${API_BASE}/scrape/preview-scrape`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader() 
    },
    body: JSON.stringify({ url }),
  });
  return response.json();
};

// Finalizes and saves a scraped product to the user's database
export const scrapeAndSave = async (data) => {
  const response = await fetch(`${API_BASE}/scrape/scrape-and-save`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader() 
    },
    body: JSON.stringify(data),
  });
  return response.json();
};