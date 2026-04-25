import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashShell from "./dash-shell";
import { apiRequest } from "./api";
import "../styles/wishlist-page.css";
import "../styles/analytics.css";

function money(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return x.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * Spending analytics. Route: /analytics
 */
export default function SpendingAnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    (async () => {
      try {
        const res = await apiRequest("/api/analytics/spending");
        setData(res);
      } catch (e) {
        setError(e.message || "Could not load analytics.");
      }
    })();
  }, [navigate]);

  const s = data?.summary;

  return (
    <DashShell>
      <h1 className="dash-title">Spending analytics</h1>
      <p className="analytics-email-note">
        Price-drop and account notifications are sent to the email on your Cart-It profile.
      </p>
      {error ? <p className="status-message">{error}</p> : null}
      {s ? (
        <>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Total saved items</h3>
              <p className="analytics-stat">{s.total_items}</p>
            </div>
            <div className="analytics-card">
              <h3>Still on wishlist</h3>
              <p className="analytics-stat">{s.open_count}</p>
              <p className="analytics-muted">Combined list prices: {money(s.wishlist_value)}</p>
            </div>
            <div className="analytics-card">
              <h3>Marked purchased</h3>
              <p className="analytics-stat">{s.purchased_count}</p>
              <p className="analytics-muted">Recorded spend: {money(s.total_spent)}</p>
            </div>
          </div>

          <section className="analytics-by-store">
            <h2 className="analytics-section-title">By store</h2>
            {data.by_store?.length ? (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Items</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_store.map((row) => (
                    <tr key={row.store}>
                      <td>{row.store}</td>
                      <td>{row.item_count}</td>
                      <td>{money(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-inline">No store data yet — items will show here once they have a store name.</p>
            )}
          </section>
        </>
      ) : null}
    </DashShell>
  );
}
