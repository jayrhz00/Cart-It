import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './sidebar';
import { LuCirclePlus, LuTrash2 } from "react-icons/lu";
import '../styles/dashboard.css';
import { apiRequest } from './api';

const formatMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "$0.00";
};

/** Wishlist grid thumbnail: newest item image in that list, or orange placeholder. */
function WishlistCardCover({ imageUrl }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);
  const src = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (!src || failed) {
    return <div className="wishlist-img-placeholder" aria-hidden />;
  }
  return (
    <img
      src={src}
      alt=""
      className="wishlist-card-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

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
  const [movingItemId, setMovingItemId] = useState(null);

  const reload = useCallback(async () => {
    const [groups, items] = await Promise.all([
      apiRequest("/api/groups"),
      apiRequest("/api/cart-items"),
    ]);
    setWishlists(Array.isArray(groups) ? groups : []);
    setCartItems(Array.isArray(items) ? items : []);
  }, []);

  const broadcastItemsChanged = useCallback(() => {
    try {
      window.dispatchEvent(new Event("cartit:items-updated"));
    } catch {
      /* ignore */
    }
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

  /** Newest cart row per wishlist that has an image_url (for dashboard card preview). */
  const coverImageByGroupId = useMemo(() => {
    const best = {};
    for (const i of cartItems) {
      if (i.group_id == null || i.group_id === "") continue;
      const url = String(i.image_url || "").trim();
      if (!url) continue;
      const gid = Number(i.group_id);
      const itemId = Number(i.item_id || 0);
      if (!best[gid] || itemId > best[gid].itemId) {
        best[gid] = { itemId, url };
      }
    }
    const out = {};
    for (const [gid, row] of Object.entries(best)) {
      out[Number(gid)] = row.url;
    }
    return out;
  }, [cartItems]);

  const recentItems = useMemo(
    () =>
      [...cartItems].sort(
        (a, b) => Number(b.item_id || 0) - Number(a.item_id || 0)
      ),
    [cartItems]
  );

  const privateWishlists = useMemo(
    () =>
      wishlists.filter(
        (w) => String(w.visibility || "Private").toLowerCase() !== "shared"
      ),
    [wishlists]
  );

  const sharedWishlists = useMemo(
    () =>
      wishlists.filter(
        (w) => String(w.visibility || "").toLowerCase() === "shared"
      ),
    [wishlists]
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
      broadcastItemsChanged();
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
    const currentGid =
      item.group_id != null && item.group_id !== ""
        ? Number(item.group_id)
        : null;
    if (targetGroup === currentGid || (targetGroup == null && currentGid == null)) {
      return;
    }
    setMovingItemId(item.item_id);
    try {
      await apiRequest(`/api/cart-items/${item.item_id}`, {
        method: "PATCH",
        body: JSON.stringify({ group_id: targetGroup }),
      });
      await reload();
      broadcastItemsChanged();
    } catch (error) {
      alert(error.message || "Could not move this item.");
    } finally {
      setMovingItemId(null);
    }
  };

  const handleTogglePurchased = async (item, checked) => {
    if (!item?.item_id) return;
    setTogglingPurchasedId(item.item_id);
    try {
      const purchasePrice = checked ? Number(item.current_price || 0) : null;
      await apiRequest(`/api/cart-items/${item.item_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          purchased: !!checked,
          purchase_price:
            checked && Number.isFinite(purchasePrice) && purchasePrice >= 0
              ? purchasePrice
              : null,
        }),
      });
      await reload();
      broadcastItemsChanged();
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
      broadcastItemsChanged();
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
      broadcastItemsChanged();
    } catch (error) {
      alert(error.message || "Could not delete this wishlist.");
    } finally {
      setDeletingGroupId(null);
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
          <p className="dash-wishlist-sub mb-4 text-sm italic text-white/80">
            Private lists only you manage from here.
          </p>
          <div className="wishlist-grid">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="create-wishlist-btn"
            >
              <LuCirclePlus className="text-5xl" />
              <span className="create-wishlist-label">Create New Wishlist</span>
            </button>

            {privateWishlists.length > 0 ? (
              privateWishlists.map((list) => {
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
                      <WishlistCardCover imageUrl={coverImageByGroupId[id] ?? null} />
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
            ) : wishlists.length === 0 ? (
              <div className="empty-state">
                No wishlists yet — start by creating one.
              </div>
            ) : (
              <div className="empty-state">
                No private lists yet — shared lists appear under Group Wishlists.
              </div>
            )}
          </div>
        </section>

        <section className="wishlist-section mt-10">
          <h2 className="dash-wishlist-title">Group Wishlists</h2>
          <p className="dash-wishlist-sub mb-4 text-sm italic text-white/80">
            Shared lists you own or were invited to — collaborate and chat with your group.
          </p>
          <div className="wishlist-grid">
            {sharedWishlists.length > 0 ? (
              sharedWishlists.map((list) => {
                const id = list.group_id ?? list.id;
                const label = list.group_name ?? list.name ?? "Untitled";
                const n = groupItemCount(id);
                const visibility = String(list.visibility || "Shared");
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
                      <WishlistCardCover imageUrl={coverImageByGroupId[id] ?? null} />
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
                No shared lists yet — mark a list as Shared or accept an invite.
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
                <div className="opacity-80">Open items</div>
                <div className="text-[11px] leading-snug opacity-70 normal-case not-italic font-normal">
                  Saved in your cart or wishlists, not marked purchased yet.
                </div>
                <div className="text-lg font-bold mt-1">
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
                recentItems.slice(0, 8).map((item) => {
                  const currentGroupVal =
                    item.group_id != null && item.group_id !== ""
                      ? String(item.group_id)
                      : "0";
                  const selectVal =
                    moveTargets[item.item_id] !== undefined
                      ? moveTargets[item.item_id]
                      : currentGroupVal;
                  return (
                  <div key={item.item_id} className="cart-item-card text-left text-black">
                    <div className="recent-cart-item-image-wrap">
                      <button
                        type="button"
                        className="dashboard-recent-item-delete"
                        disabled={deletingItemId === item.item_id}
                        title="Remove from Cart-It"
                        aria-label={`Remove ${item.item_name || "item"}`}
                        onClick={() => handleDeleteCartItem(item)}
                      >
                        <LuTrash2 size={14} aria-hidden />
                      </button>
                      <img
                        src={item.image_url || "/logo.png"}
                        alt={item.item_name || "Item"}
                        className="h-20 w-full rounded object-cover"
                        referrerPolicy="no-referrer"
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
                    <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Move to wishlist
                      </span>
                      <select
                        className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800"
                        disabled={movingItemId === item.item_id}
                        aria-label={`Move ${item.item_name || "item"} to another list`}
                        value={selectVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMoveTargets((prev) => ({
                            ...prev,
                            [item.item_id]: val,
                          }));
                          if (val !== "") {
                            handleMoveItemToWishlist(item, val);
                          }
                        }}
                      >
                        <option value="0">Cart only (no wishlist)</option>
                        {wishlists.map((w) => {
                          const id = w.group_id ?? w.id;
                          const name = w.group_name ?? w.name ?? "Untitled";
                          return (
                            <option key={id} value={String(id)}>
                              {name}
                            </option>
                          );
                        })}
                      </select>
                      {movingItemId === item.item_id ? (
                        <span className="text-[10px] text-slate-500">Moving…</span>
                      ) : null}
                    </div>
                  </div>
                  );
                })
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
