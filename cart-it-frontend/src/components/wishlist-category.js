import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashShell from "./dash-shell";
import FullItemEditor from "./full-item-editor";
import { apiRequest } from "./api";
import "../styles/wishlist-page.css";

/**
 * Individual wishlist (one category): items, purchased, notes, delete.
 * Route: /wishlist/:groupId
 */
export default function WishlistCategoryPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const handleRenameWishlist = async () => {
    if (!group) return;
    const currentName = String(group.group_name || "").trim();
    const nextName = window.prompt("Rename wishlist:", currentName);
    if (nextName == null) return;
    const trimmed = nextName.trim();
    if (!trimmed) {
      setError("Wishlist name cannot be empty.");
      return;
    }
    if (trimmed === currentName) return;
    try {
      await apiRequest(`/api/groups/${group.group_id}`, {
        method: "PATCH",
        body: JSON.stringify({ group_name: trimmed }),
      });
      await load();
    } catch (e) {
      setError(e.message || "Could not rename wishlist.");
    }
  };

  const handleDeleteWishlist = async () => {
    if (!group) return;
    const name = String(group.group_name || "this wishlist");
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiRequest(`/api/groups/${group.group_id}`, { method: "DELETE" });
      navigate("/dashboard");
    } catch (e) {
      setError(e.message || "Could not delete wishlist.");
    }
  };

  const load = useCallback(async () => {
    const gid = Number(groupId);
    if (!groupId || Number.isNaN(gid)) {
      setError("Invalid category.");
      return;
    }
    const [g, list] = await Promise.all([
      apiRequest(`/api/groups/${gid}`),
      apiRequest(`/api/cart-items?group_id=${encodeURIComponent(String(gid))}`),
    ]);
    setGroup(g);
    setItems(Array.isArray(list) ? list : []);
    setError("");
  }, [groupId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    (async () => {
      try {
        await load();
      } catch (e) {
        setError(e.message || "Could not load this wishlist.");
      }
    })();
  }, [navigate, load]);

  return (
    <DashShell>
      <button type="button" className="page-back-link" onClick={() => navigate("/dashboard")}>
        Back to dashboard
      </button>
      {error ? <p className="status-message">{error}</p> : null}
      {!error && group ? (
        <>
          <header className="wishlist-page-header">
            <div>
              <h1 className="dash-title wishlist-page-title">{group.group_name}</h1>
              <p className="wishlist-page-sub">
                {items.length} {items.length === 1 ? "item" : "items"} in this wishlist
              </p>
            </div>
          </header>
          <div className="selected-item-actions" style={{ maxWidth: "360px", marginBottom: "16px" }}>
            <button type="button" className="item-action-btn" onClick={handleRenameWishlist}>
              Rename wishlist
            </button>
            <button type="button" className="item-action-btn item-action-danger" onClick={handleDeleteWishlist}>
              Delete wishlist
            </button>
          </div>
          <section className="wishlist-page-list">
            {items.length === 0 ? (
              <div className="empty-inline">No items in this category yet. Save from the extension or add one on the dashboard.</div>
            ) : (
              items.map((item) => (
                <FullItemEditor key={item.item_id} item={item} onChanged={load} />
              ))
            )}
          </section>
        </>
      ) : null}
    </DashShell>
  );
}
