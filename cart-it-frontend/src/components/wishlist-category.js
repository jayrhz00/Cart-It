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
