import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './sidebar';
import { LuCirclePlus } from "react-icons/lu";
import '../styles/dashboard.css';
import { apiRequest } from './api';

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

  return (
    <div className="dashboard-container">
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
                return (
                  <button
                    type="button"
                    key={id}
                    className="wishlist-card"
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
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-white/20 py-2 text-sm font-semibold text-white hover:bg-white/30"
              onClick={() => navigate("/analytics")}
            >
              Open full analytics
            </button>
          </div>

          <div className="dashboard-card">
            <h2 className="card-header">Recent Cart Items</h2>
            <div className="cart-grid">
              {recentItems.length > 0 ? (
                recentItems.slice(0, 8).map((item) => (
                  <div key={item.item_id} className="cart-item-card text-left text-black">
                    <img
                      src={item.image_url || "/logo.png"}
                      alt={item.item_name || "Item"}
                      className="h-20 w-full rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/logo.png";
                      }}
                    />
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
            </div>
          </div>
        </section>

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Create New Wishlist</h3>
              <input
                type="text"
                placeholder="Enter wishlist name..."
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
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
