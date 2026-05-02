/**
 * Dashboard — main screen after login.
 * Flow to explain: (1) useEffect checks token → loads /api/me, /api/groups, /api/cart-items.
 * (2) User creates categories (groups) and items; data is stored in PostgreSQL via the API.
 * (3) Logout clears token so protected routes reject the next visit.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuCirclePlus, LuTrash2 } from "react-icons/lu";
import "../styles/dashboard.css";
import { apiRequest } from "./api";
import DashShell from "./dash-shell";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#f59e0b");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [categorySelectKey, setCategorySelectKey] = useState(0);
  const [itemFormError, setItemFormError] = useState("");
  const [itemSaving, setItemSaving] = useState(false);
  const [newItem, setNewItem] = useState({
    item_name: "",
    product_url: "",
    image_url: "",
    store: "",
    current_price: "0",
    notes: "",
    group_id: "",
  });
  /** Per-item category choice for “move to category” on uncategorized cards */
  const [moveSelections, setMoveSelections] = useState({});
  const [moveSavingId, setMoveSavingId] = useState(null);
  const [itemDeletingId, setItemDeletingId] = useState(null);
  const [groupDeletingId, setGroupDeletingId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        const [me, groupData, items] = await Promise.all([
          apiRequest("/api/me"),
          apiRequest("/api/groups"),
          apiRequest("/api/cart-items"),
        ]);
        setUser(me.user);
        setGroups(groupData);
        setCartItems(items);
      } catch (error) {
        setStatusMessage(error.message || "Failed to load dashboard");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    };

    load();
  }, [navigate]);

  const reloadItems = async () => {
    const items = await apiRequest("/api/cart-items");
    setCartItems(items);
  };

  const reloadGroups = async () => {
    const groupData = await apiRequest("/api/groups");
    setGroups(groupData);
  };

  const handleDeleteItem = async (itemId, itemName) => {
    const label = (itemName || "this item").slice(0, 80);
    if (!window.confirm(`Remove “${label}” from your cart?`)) return;
    setItemDeletingId(itemId);
    try {
      await apiRequest(`/api/cart-items/${itemId}`, { method: "DELETE" });
      setStatusMessage("Item removed.");
      await reloadItems();
    } catch (error) {
      setStatusMessage(error.message || "Could not delete item.");
    } finally {
      setItemDeletingId(null);
    }
  };

  const handleDeleteGroup = async (group) => {
    const n = cartItems.filter((i) => i.group_id == group.group_id).length;
    const msg =
      n > 0
        ? `Delete category “${group.group_name}”? ${n} item(s) will become uncategorized (not deleted).`
        : `Delete category “${group.group_name}”?`;
    if (!window.confirm(msg)) return;
    setGroupDeletingId(group.group_id);
    try {
      await apiRequest(`/api/groups/${group.group_id}`, { method: "DELETE" });
      setStatusMessage("Category deleted.");
      await Promise.all([reloadGroups(), reloadItems()]);
    } catch (error) {
      setStatusMessage(error.message || "Could not delete category.");
    } finally {
      setGroupDeletingId(null);
    }
  };

  const handleAddItem = async () => {
    setItemFormError("");
    const price = parseFloat(String(newItem.current_price), 10);
    if (!newItem.item_name.trim() || !newItem.product_url.trim()) {
      setItemFormError("Item name and product URL are required.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setItemFormError("Enter a valid price (0 or more).");
      return;
    }
    const gidRaw = newItem.group_id;
    const parsedGid = gidRaw === "" ? null : parseInt(String(gidRaw), 10);
    if (gidRaw !== "" && Number.isNaN(parsedGid)) {
      setItemFormError("Pick a valid category or choose “No category”.");
      return;
    }
    setItemSaving(true);
    try {
      const payload = {
        item_name: newItem.item_name.trim(),
        product_url: newItem.product_url.trim(),
        current_price: price,
        image_url: newItem.image_url.trim() || null,
        store: newItem.store.trim() || null,
        notes: newItem.notes.trim() || null,
        group_id: parsedGid,
      };
      await apiRequest("/api/cart-items", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setItemModalOpen(false);
      setNewItem({
        item_name: "",
        product_url: "",
        image_url: "",
        store: "",
        current_price: "0",
        notes: "",
        group_id: "",
      });
      setStatusMessage("Item added.");
      await reloadItems();
    } catch (error) {
      const msg =
        error?.message ||
        "Could not save. Try logging out and back in if your session expired.";
      setItemFormError(msg);
      setStatusMessage(msg);
    } finally {
      setItemSaving(false);
    }
  };

  const sortedCartItems = useMemo(() => {
    return [...cartItems].sort((a, b) => {
      const aUncat = a.group_id == null ? 0 : 1;
      const bUncat = b.group_id == null ? 0 : 1;
      if (aUncat !== bUncat) return aUncat - bUncat;
      return (b.item_id || 0) - (a.item_id || 0);
    });
  }, [cartItems]);

  const groupNameForItem = (item) => {
    if (item.group_id == null) return null;
    const g = groups.find((x) => x.group_id == item.group_id);
    return g?.group_name || "Category";
  };

  const handleAssignCategory = async (itemId) => {
    const gidRaw = moveSelections[itemId];
    if (gidRaw == null || gidRaw === "") {
      setStatusMessage("Pick a category for this item first.");
      return;
    }
    const parsed = parseInt(String(gidRaw), 10);
    if (Number.isNaN(parsed)) {
      setStatusMessage("Invalid category.");
      return;
    }
    setMoveSavingId(itemId);
    try {
      await apiRequest(`/api/cart-items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ group_id: parsed }),
      });
      setStatusMessage("Item moved to category.");
      setMoveSelections((s) => {
        const next = { ...s };
        delete next[itemId];
        return next;
      });
      await reloadItems();
    } catch (error) {
      setStatusMessage(error.message || "Could not update category.");
    } finally {
      setMoveSavingId(null);
    }
  };

  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const result = await apiRequest("/api/groups", {
        method: "POST",
        body: JSON.stringify({
          group_name: newGroupName,
          color: newGroupColor,
          visibility: "Private",
        }),
      });
      setGroups((prev) => [...prev, result.group]);
      setNewItem((s) => ({
        ...s,
        group_id: String(result.group.group_id),
      }));
      setNewGroupName("");
      setNewGroupColor("#f59e0b");
      setIsModalOpen(false);
      setStatusMessage("Category created.");
    } catch (error) {
      setStatusMessage(error.message || "Failed to create category");
    }
  };

  return (
    <DashShell>
        <h1 className="dash-title">Hello, {user?.username || "User"}</h1>
        {statusMessage && <p className="status-message">{statusMessage}</p>}

        <section className="wishlist-section">
          <h2 className="wishlist-title">My Categories</h2>
          <div className="wishlist-grid">
            <button onClick={() => setIsModalOpen(true)} className="create-wishlist-btn">
              <LuCirclePlus />
              <span className="create-wishlist-label">Create New Category</span>
            </button>

            {groups.length > 0 ? (
              groups.map((group) => {
                const inGroup = cartItems.filter((item) => item.group_id == group.group_id);
                const withImg = inGroup.filter((i) => i.image_url);
                const noImg = inGroup.filter((i) => !i.image_url);
                const preview = [...withImg, ...noImg].slice(0, 4);
                const tint = group.color || "#fdba74";
                const isEmpty = inGroup.length === 0;
                return (
                  <div
                    key={group.group_id}
                    className="wishlist-card wishlist-card-tile"
                    style={{ "--cat-accent": tint }}
                  >
                    <Link to={`/wishlist/${group.group_id}`} className="wishlist-card-tile-link">
                      {isEmpty ? (
                        <div className="wishlist-card-empty-hero">
                          <span className="wishlist-empty-icon" aria-hidden="true">
                            ✦
                          </span>
                          <span className="wishlist-empty-hint">Drop saves here from the extension</span>
                        </div>
                      ) : (
                        <div className="wishlist-card-mosaic">
                          {Array.from({ length: 4 }).map((_, slot) => {
                            const item = preview[slot];
                            return (
                              <div key={slot} className="wishlist-mosaic-cell">
                                {item?.image_url ? (
                                  <img src={item.image_url} alt="" className="wishlist-mosaic-img" />
                                ) : (
                                  <div className="wishlist-mosaic-placeholder" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="wishlist-card-info">
                        <span className="wishlist-card-title">{group.group_name}</span>
                        <span className="wishlist-card-meta">
                          {inGroup.length} {inGroup.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="wishlist-delete-fab"
                      disabled={groupDeletingId == group.group_id}
                      aria-label={`Delete category ${group.group_name}`}
                      title="Delete category"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteGroup(group);
                      }}
                    >
                      <LuTrash2 size={15} aria-hidden />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No categories yet.</div>
            )}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="card-header-row">
            <h2 className="card-header">Recent cart items</h2>
            <button
              type="button"
              className="add-item-btn"
              onClick={() => {
                setItemFormError("");
                setNewItem({
                  item_name: "",
                  product_url: "",
                  image_url: "",
                  store: "",
                  current_price: "0",
                  notes: "",
                  group_id: "",
                });
                setItemModalOpen(true);
              }}
            >
              + Add item
            </button>
          </div>
          <p className="cart-section-hint">
            Items saved from the extension without a category appear here first — use{" "}
            <strong>Move to category</strong> when you are ready to organize them.
          </p>
          <div className="cart-grid">
            {sortedCartItems.length > 0 ? (
              sortedCartItems.slice(0, 12).map((item) => {
                const uncategorized = item.group_id == null;
                return (
                  <div key={item.item_id} className="cart-item-card">
                    <button
                      type="button"
                      className="cart-delete-btn"
                      disabled={itemDeletingId == item.item_id}
                      aria-label={`Delete ${item.item_name}`}
                      title="Remove from cart"
                      onClick={() => handleDeleteItem(item.item_id, item.item_name)}
                    >
                      <LuTrash2 size={15} aria-hidden />
                    </button>
                    <a
                      href={item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cart-item-media"
                      title={item.item_name}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="item-image" />
                      ) : (
                        <span className="cart-item-title-fallback">{item.item_name}</span>
                      )}
                    </a>
                    <div className="cart-item-meta">
                      <span className="cart-item-name" title={item.item_name}>
                        {item.item_name}
                      </span>
                      {uncategorized ? (
                        <span className="cart-item-badge">No category</span>
                      ) : (
                        <span className="cart-item-category">{groupNameForItem(item)}</span>
                      )}
                    </div>
                    {uncategorized && groups.length > 0 && (
                      <div className="cart-item-move">
                        <select
                          className="cart-move-select"
                          value={moveSelections[item.item_id] ?? ""}
                          onChange={(e) =>
                            setMoveSelections((s) => ({
                              ...s,
                              [item.item_id]: e.target.value,
                            }))
                          }
                          aria-label={`Category for ${item.item_name}`}
                        >
                          <option value="">Move to…</option>
                          {groups.map((g) => (
                            <option key={g.group_id} value={String(g.group_id)}>
                              {g.group_name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="cart-move-btn"
                          disabled={moveSavingId === item.item_id}
                          onClick={() => handleAssignCategory(item.item_id)}
                        >
                          {moveSavingId === item.item_id ? "…" : "Apply"}
                        </button>
                      </div>
                    )}
                    {uncategorized && groups.length === 0 && (
                      <p className="cart-item-move-hint">Create a category above, then assign this item.</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No items yet.</div>
            )}
          </div>
        </section>

        {itemModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content modal-wide">
              <h3>Add wishlist item</h3>
              {itemFormError && (
                <p className="modal-error" role="alert">
                  {itemFormError}
                </p>
              )}
              <label className="modal-label">Name</label>
              <input
                type="text"
                value={newItem.item_name}
                onChange={(e) => setNewItem((s) => ({ ...s, item_name: e.target.value }))}
                placeholder="Product name"
              />
              <label className="modal-label">Product URL</label>
              <input
                type="text"
                value={newItem.product_url}
                onChange={(e) => setNewItem((s) => ({ ...s, product_url: e.target.value }))}
                placeholder="https://..."
              />
              <label className="modal-label">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.current_price}
                onChange={(e) => setNewItem((s) => ({ ...s, current_price: e.target.value }))}
              />
              <label className="modal-label">Image URL (optional)</label>
              <input
                type="text"
                value={newItem.image_url}
                onChange={(e) => setNewItem((s) => ({ ...s, image_url: e.target.value }))}
                placeholder="https://...jpg"
              />
              <label className="modal-label">Store (optional)</label>
              <input
                type="text"
                value={newItem.store}
                onChange={(e) => setNewItem((s) => ({ ...s, store: e.target.value }))}
                placeholder="Amazon, Nike..."
              />
              <label className="modal-label">Category (optional)</label>
              <select
                key={categorySelectKey}
                value={newItem.group_id}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__new__") {
                    setCategorySelectKey((k) => k + 1);
                    setIsModalOpen(true);
                    return;
                  }
                  setNewItem((s) => ({ ...s, group_id: v }));
                }}
              >
                <option value="">No category</option>
                {groups.map((g) => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.group_name}
                  </option>
                ))}
                <option value="__new__">+ Add new category…</option>
              </select>
              <label className="modal-label">Notes (optional)</label>
              <textarea
                rows={2}
                value={newItem.notes}
                onChange={(e) => setNewItem((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Sizing, quality, etc."
              />
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setItemModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="save-btn" onClick={handleAddItem} disabled={itemSaving}>
                  {itemSaving ? "Saving…" : "Save item"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Create New Category</h3>
              <input
                type="text"
                placeholder="Enter category name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <label className="modal-label" htmlFor="newGroupColorInput">
                Category color
              </label>
              <p className="modal-hint">Tap the swatch — pick a warm color that matches your list.</p>
              <div className="modal-color-wrap">
                <div className="modal-color-inner">
                  <input
                    id="newGroupColorInput"
                    type="color"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    title="Choose category color"
                    aria-label="Choose category color"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button onClick={() => setIsModalOpen(false)} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={handleSaveGroup} className="save-btn">
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
    </DashShell>
  );
};

export default Dashboard;
