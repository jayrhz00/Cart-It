import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashShell from "./dash-shell";
import FullItemEditor from "./full-item-editor";
import { apiRequest } from "./api";
import "../styles/wishlist-page.css";

/**
 * All saved items (full cart). Route: /cart
 */
export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const list = await apiRequest("/api/cart-items");
    setItems(Array.isArray(list) ? list : []);
    setError("");
  }, []);

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
        setError(e.message || "Could not load your cart.");
      }
    })();
  }, [navigate, load]);

  return (
    <DashShell>
      <h1 className="dash-title">Your cart</h1>
      <p className="wishlist-page-sub page-lead">
        Everything you have saved, in one place. Open a category from the dashboard to focus one list at a time.
      </p>
      {error ? <p className="status-message">{error}</p> : null}
      {!error && (
        <section className="wishlist-page-list">
          {items.length === 0 ? (
            <div className="empty-inline">No saved items yet.</div>
          ) : (
            items.map((item) => <FullItemEditor key={item.item_id} item={item} onChanged={load} />)
          )}
        </section>
      )}
    </DashShell>
  );
}
