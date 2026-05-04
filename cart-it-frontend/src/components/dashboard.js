import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './sidebar';
<<<<<<< HEAD
import { LuPlus, LuUsers, LuTrendingUp, LuShoppingCart } from "react-icons/lu";
import { getWishlists, getCartItems, createWishlist } from '../services/api';
=======
import { LuCirclePlus, LuTrash2 } from "react-icons/lu";
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
import '../styles/dashboard.css';
import { apiRequest } from './api';

<<<<<<< HEAD
/**
 * Dashboard Component
 * The primary landing page for authenticated users.
 * Features a quad-image wishlist preview and a branded "New List" trigger.
 * Also features at-a-glance look at recent cart items and sparkline graph for spending analytics.
 */

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // Current authenticated user
  const [wishlists, setWishlists] = useState([]); // List of owned and shared collections
  const [isModalOpen, setIsModalOpen] = useState(false); // Toggle for creation modal
  const [newWishlistName, setNewWishlistName] = useState(""); // Input for new list naming
  const [items, setItems] = useState([]); // Recent items for activity feed

  // Effect hook to verify authentication and fetch aggregate dashboard data. Redirects to login if session data is missing.
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      const userData = JSON.parse(savedUser);
      setUser(userData);

      const loadDashboardData = async () => {
        try {
          const [wishlistData, cartData] = await Promise.all([
            getWishlists(userData.user_id),
            getCartItems(userData.user_id)
          ]);
          setWishlists(wishlistData);
          setItems(cartData);
        } catch (err) {
          console.error("Dashboard load error:", err);
        }
      };
      loadDashboardData();
=======
const formatMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "$0.00";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [wishlists, setWishlists] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState("");
  const [newWishlistVisibility, setNewWishlistVisibility] = useState("Private");
  const [moveTargets, setMoveTargets] = useState({});
  const [togglingPurchasedId, setTogglingPurchasedId] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);

  const reload = useCallback(async () => {
    const [groups, items] = await Promise.all([
      apiRequest("/api/groups"),
      apiRequest("/api/cart-items"),
    ]);
    setWishlists(Array.isArray(groups) ? groups : []);
    setCartItems(Array.isArray(items) ? items : []);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      navigate("/login");
      return;
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
    }
    setUser(JSON.parse(savedUser));
    reload().catch((err) => console.error("Dashboard load failed:", err));
  }, [navigate, reload]);

  const groupItemCount = useCallback(
    (groupId) =>
      cartItems.filter((i) => Number(i.group_id) === Number(groupId)).length,
    [cartItems]
  );

  const recentItems = useMemo(
    () =>
      [...cartItems].sort(
        (a, b) => Number(b.item_id || 0) - Number(a.item_id || 0)
      ),
    [cartItems]
  );

  const analyticsSnapshot = useMemo(() => {
    const open = cartItems.filter((i) => !i.is_purchased);
    const purchased = cartItems.filter((i) => i.is_purchased);
    const openValue = open.reduce(
      (s, i) => s + Number(i.current_price || 0),
      0
    );
    const spent = purchased.reduce(
      (s, i) =>
        s + Number(i.purchase_price ?? i.current_price ?? 0),
      0
    );
    return {
      totalItems: cartItems.length,
      openCount: open.length,
      purchasedCount: purchased.length,
      openValue,
      spent,
    };
  }, [cartItems]);

<<<<<<< HEAD
  // Submits a new wishlist request to the API and updates local state.
  const handleSaveWishlist = async () => {
    if (newWishlistName.trim()) {
      try {
        const newWishlist = await createWishlist(user.user_id, newWishlistName);
        setWishlists([...wishlists, newWishlist]);
        setNewWishlistName("");
        setIsModalOpen(false);
      } catch (error) {
        console.error("Error creating wishlist:", error);
      }
=======
  const handleSaveWishlist = async () => {
    const name = newWishlistName.trim();
    if (!name) return;
    try {
      const data = await apiRequest("/api/groups", {
        method: "POST",
        body: JSON.stringify({
          group_name: name,
          visibility: newWishlistVisibility,
        }),
      });
      const g = data.group || data;
      setWishlists((prev) => [...prev, g]);
      setNewWishlistName("");
      setNewWishlistVisibility("Private");
      setIsModalOpen(false);
      await reload();
    } catch (error) {
      console.error("Create wishlist failed:", error);
      alert(error.message || "Could not create wishlist.");
    }
  };

  const normalizeSidebarLists = useMemo(
    () =>
      wishlists.map((w) => ({
        id: w.group_id ?? w.id,
        name: w.group_name ?? w.name ?? "Untitled",
        visibility: w.visibility || "Private",
      })),
    [wishlists]
  );

  const handleMoveItemToWishlist = async (item, targetGroupId) => {
    if (!item) return;
    const parsed = Number(targetGroupId);
    if (!Number.isFinite(parsed)) {
      alert("Choose a wishlist first.");
      return;
    }
    const targetGroup = parsed === 0 ? null : parsed;
    try {
      await apiRequest(`/api/cart-items/${item.item_id}`, {
        method: "PATCH",
        body: JSON.stringify({ group_id: targetGroup }),
      });
      setMoveTargets((prev) => ({ ...prev, [item.item_id]: "" }));
      await reload();
    } catch (error) {
      alert(error.message || "Could not move this item.");
    }
  };

  const handleTogglePurchased = async (item, checked) => {
    if (!item?.item_id) return;
    setTogglingPurchasedId(item.item_id);
    try {
      await apiRequest(`/api/cart-items/${item.item_id}`, {
        method: "PATCH",
        body: JSON.stringify({ purchased: !!checked }),
      });
      await reload();
    } catch (error) {
      alert(error.message || "Could not update purchase status.");
    } finally {
      setTogglingPurchasedId(null);
    }
  };

  const handleDeleteCartItem = async (item) => {
    const itemId = item?.item_id;
    if (!itemId) return;
    const label = (item.item_name || "this item").slice(0, 80);
    if (!window.confirm(`Remove “${label}” from your items? This cannot be undone.`)) return;
    setDeletingItemId(itemId);
    try {
      await apiRequest(`/api/cart-items/${itemId}`, { method: "DELETE" });
      setMoveTargets((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      await reload();
    } catch (error) {
      alert(error.message || "Could not remove this item.");
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleDeleteWishlist = async (list) => {
    const id = list.group_id ?? list.id;
    if (!id) return;
    const label = (list.group_name ?? list.name ?? "this wishlist").slice(0, 80);
    if (
      !window.confirm(
        `Delete wishlist “${label}”? Saved items stay in your account but leave this list (they become uncategorized). This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingGroupId(id);
    try {
      await apiRequest(`/api/groups/${id}`, { method: "DELETE" });
      await reload();
    } catch (error) {
      alert(error.message || "Could not delete this wishlist.");
    } finally {
      setDeletingGroupId(null);
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
    }
  };

  return (
    <div className="dashboard-container">
<<<<<<< HEAD
      {/* Sidebar Container */}
      <div className="sidebar-container">
        <Sidebar wishlists={wishlists} showExtension={true} />
      </div>

      <main className="dash-main">
        {/* Welcome Header */}
        <header className="dash-header">
          <div className="dash-greeting">
            <h1 className="dash-title">Welcome back, {user ? user.username : 'User'}</h1>
            <p className="dash-subtitle">Your personal shopping lab is ready.</p>
          </div>
        </header>

        {/* Collection Grid: Contains the creation trigger and wishlist quads */}
        <section className="dash-section">
          <h2 className="section-heading">My Collections</h2>

          <div className="wishlist-grid">
            {/* Branded "Create New" Card Trigger */}
            <button onClick={() => setIsModalOpen(true)} className="create-list-card">
              <div className="plus-icon-circle">
                <LuPlus size={32} />
              </div>
              <span className="create-label">New List</span>
            </button>

            {wishlists.map((list) => (
              <div
                key={list.wishlist_id}
                className="dash-wishlist-card"
                onClick={() => navigate(`/wishlist/${list.wishlist_id}`)}
              >
                {/* Quad-Image Preview: Displays first 4 items or placeholders */}
                <div className="wishlist-quad">
                  {list.preview_images && list.preview_images.length > 0 ? (
                    <div className="quad-grid">
                      {list.preview_images.map((img, i) => (
                        <img key={i} src={img} alt="" className="quad-img" />
                      ))}
                      {/* Generates empty blocks if list contains fewer than 4 items */}
                      {[...Array(Math.max(0, 4 - list.preview_images.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="quad-empty"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="quad-placeholder">
                      <LuShoppingCart size={24} className="text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Wishlist Metadata Section */}
                <div className="wishlist-info">
                  <div className="flex justify-between items-start">
                    <span className="list-name">{list.name}</span>
                    {/* Collaborative status icon (LuUsers) shown for shared lists */}
                    {list.is_shared && (
                      <LuUsers size={16} className="text-[#4B0082] mt-1" title="Shared Wishlist" />
                    )}
                  </div>
                  <span className="list-count">{list.items} items</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Insight Section: Summarized Analytics and Recent Activity */}
        <section className="insights-grid">
          {/* Sparkline visualization linked to full Analytics suite */}
          <div className="insight-card" onClick={() => navigate('/analytics')}>
            <div className="card-top">
              <div className="flex items-center gap-2">
                <LuTrendingUp className="text-[#DB8046]" />
                <h3 className="insight-label">Expense Trends</h3>
              </div>
            </div>
            <div className="mini-graph">
              <div className="spark-bar h-8"></div>
              <div className="spark-bar h-16"></div>
              <div className="spark-bar h-12"></div>
              <div className="spark-bar h-20 active"></div>
=======
      <Sidebar wishlists={normalizeSidebarLists} showExtension={true} />

      <main className="dash-main">
        <h1 className="dash-title">
          Hello, {user ? user.username : "User"}
        </h1>

        <section className="wishlist-section">
          <h2 className="dash-wishlist-title">My Wishlists</h2>
          <div className="wishlist-grid">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="create-wishlist-btn"
            >
              <LuCirclePlus className="text-5xl" />
              <span className="create-wishlist-label">Create New Wishlist</span>
            </button>

            {wishlists.length > 0 ? (
              wishlists.map((list) => {
                const id = list.group_id ?? list.id;
                const label = list.group_name ?? list.name ?? "Untitled";
                const n = groupItemCount(id);
                const visibility = String(list.visibility || "Private");
                const canDelete =
                  String(list.access_role || "").toLowerCase() === "owner";
                return (
                  <div key={id} className="wishlist-card">
                    {canDelete ? (
                      <button
                        type="button"
                        className="wishlist-card-delete"
                        disabled={deletingGroupId === id}
                        title="Delete wishlist"
                        aria-label={`Delete wishlist ${label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWishlist(list);
                        }}
                      >
                        <LuTrash2 size={16} aria-hidden />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="wishlist-card-main"
                      onClick={() => navigate(`/wishlist/${id}`)}
                    >
                      <div className="wishlist-img-placeholder" />
                      <div className="wishlist-card-footer">
                        <span className="wishlist-card-name">{label}</span>
                        <span className="text-[11px] font-semibold text-orange-700">
                          {visibility}
                        </span>
                        <span className="wishlist-item-count">
                          {n} {n === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                No wishlists yet — start by creating one.
              </div>
            )}
          </div>
        </section>

        <section className="info-grid">
          <div className="dashboard-card">
            <h2 className="card-header">Spending Analytics</h2>
            <div className="grid grid-cols-2 gap-4 text-left text-sm text-white">
              <div>
                <div className="opacity-80">Total items</div>
                <div className="text-lg font-bold">
                  {analyticsSnapshot.totalItems}
                </div>
              </div>
              <div>
                <div className="opacity-80">Open items (not purchased)</div>
                <div className="text-lg font-bold">
                  {analyticsSnapshot.openCount}
                </div>
              </div>
              <div>
                <div className="opacity-80">Purchased</div>
                <div className="text-lg font-bold">
                  {analyticsSnapshot.purchasedCount}
                </div>
              </div>
              <div>
                <div className="opacity-80">Current cart value</div>
                <div className="text-lg font-bold">
                  {formatMoney(analyticsSnapshot.openValue)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="opacity-80">Total spent (purchased)</div>
                <div className="text-lg font-bold">
                  {formatMoney(analyticsSnapshot.spent)}
                </div>
              </div>
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-white/20 py-2 text-sm font-semibold text-white hover:bg-white/30"
              onClick={() => navigate("/analytics")}
            >
              Open full analytics
            </button>
          </div>

<<<<<<< HEAD
          {/* Horizontal strip of latest items found in the main cart */}
          <div className="insight-card" onClick={() => navigate('/cart')}>
            <div className="card-top">
              <div className="flex items-center gap-2">
                <LuShoppingCart className="text-purple-600" />
                <h3 className="insight-label">Latest Finds</h3>
              </div>
            </div>
            <div className="recent-strip">
              {items.slice(0, 5).map(item => (
                <img key={item.item_id} src={item.image_url} alt="" className="strip-img" />
              ))}
=======
          <div className="dashboard-card">
            <h2 className="card-header">Recent Cart Items</h2>
            <div className="cart-grid">
              {recentItems.length > 0 ? (
                recentItems.slice(0, 8).map((item) => (
                  <div key={item.item_id} className="cart-item-card text-left text-black">
                    <div className="recent-cart-item-image-wrap">
                      <button
                        type="button"
                        className="dashboard-recent-item-delete"
                        disabled={deletingItemId === item.item_id}
                        title="Remove item"
                        aria-label={`Remove ${item.item_name || "item"}`}
                        onClick={() => handleDeleteCartItem(item)}
                      >
                        <LuTrash2 size={14} aria-hidden />
                      </button>
                      <img
                        src={item.image_url || "/logo.png"}
                        alt={item.item_name || "Item"}
                        className="h-20 w-full rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/logo.png";
                        }}
                      />
                    </div>
                    <p className="truncate text-sm font-bold">
                      {item.item_name}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatMoney(item.current_price)}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      {item.is_purchased ? "Purchased" : "In cart"}
                    </p>
                    <label className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!item.is_purchased}
                        disabled={togglingPurchasedId === item.item_id}
                        onChange={(e) => handleTogglePurchased(item, e.target.checked)}
                      />
                      Mark purchased
                    </label>
                    <div className="mt-2 flex flex-col gap-1">
                      <select
                        className="w-full min-w-0 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        value={moveTargets[item.item_id] ?? ""}
                        onChange={(e) =>
                          setMoveTargets((prev) => ({
                            ...prev,
                            [item.item_id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select wishlist</option>
                        <option value="0">No wishlist (cart only)</option>
                        {wishlists.map((w) => {
                          const id = w.group_id ?? w.id;
                          const name = w.group_name ?? w.name ?? "Untitled";
                          return (
                            <option key={id} value={id}>
                              {name}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={() =>
                          handleMoveItemToWishlist(item, moveTargets[item.item_id])
                        }
                      >
                        Move
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-sm text-white/80">
                  No items yet. Save something with the extension to see it
                  here.
                </div>
              )}
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
            </div>
          </div>
        </section>

<<<<<<< HEAD
        {/* Wishlist Creation Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Create New Wishlist</h3>
              <input
                type="text"
                placeholder="List Name"
=======
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Create New Wishlist</h3>
              <input
                type="text"
                placeholder="Enter wishlist name..."
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
                value={newWishlistName}
                onChange={(e) => setNewWishlistName(e.target.value)}
                autoFocus
              />
              <label className="block text-left text-sm font-medium text-gray-700">
                Visibility
              </label>
              <select
                className="mt-1 rounded-md border border-gray-300 p-2 text-black"
                value={newWishlistVisibility}
                onChange={(e) => setNewWishlistVisibility(e.target.value)}
              >
                <option value="Private">Private</option>
                <option value="Shared">Shared</option>
              </select>
              <div className="modal-actions">
<<<<<<< HEAD
                <button onClick={() => setIsModalOpen(false)} className="btn-cancel">Cancel</button>
                <button onClick={handleSaveWishlist} className="btn-save">Create</button>
=======
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveWishlist}
                  className="save-btn"
                >
                  Create
                </button>
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
