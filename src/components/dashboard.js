/**
 * Dashboard — main screen after login.
 * Flow to explain: (1) useEffect checks token → loads /api/me, /api/groups, /api/cart-items.
 * (2) User creates categories (groups) and items; data is stored in PostgreSQL via the API.
 * (3) Logout clears token so protected routes reject the next visit.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCirclePlus, LuDownload, LuLogOut } from "react-icons/lu";
import "../styles/dashboard.css";
import { apiRequest } from "./api";

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const reloadItems = async () => {
    const items = await apiRequest("/api/cart-items");
    setCartItems(items);
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
    <div className="dashboard-container">
      <aside className="dash-sidebar">
        <img src="/logo.png" alt="Cart-It Logo" className="sidebar-logo" />
        <div className="extension-card">
          <p className="extension-title">Get the Extension</p>
          <button className="extension-btn">
            <LuDownload size={14} /> Download
          </button>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LuLogOut /> Log Out
        </button>
      </aside>

      <main className="dash-main">
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
              groups.map((group) => (
                <div key={group.group_id} className="wishlist-card">
                  <div
                    className="wishlist-card-swatch"
                    style={{ backgroundColor: group.color || "#94a3b8" }}
                  >
                    <span className="wishlist-card-name">{group.group_name}</span>
                  </div>
                  <div className="wishlist-card-footer">
                    <span className="wishlist-item-count">
                      {cartItems.filter((item) => item.group_id === group.group_id).length} items
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No categories yet.</div>
            )}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="card-header-row">
            <h2 className="card-header">Recent Cart Items</h2>
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
          <div className="cart-grid">
            {cartItems.length > 0 ? (
              cartItems.slice(0, 8).map((item) => (
                <div key={item.item_id} className="cart-placeholder">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.item_name} className="item-image" />
                  ) : (
                    item.item_name
                  )}
                </div>
              ))
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
              <input type="color" value={newGroupColor} onChange={(e) => setNewGroupColor(e.target.value)} />
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
      </main>
    </div>
  );
};

export default Dashboard;
