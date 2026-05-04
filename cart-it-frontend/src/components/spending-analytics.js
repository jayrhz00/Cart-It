import React, { useEffect, useMemo, useState } from "react";
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
  const [items, setItems] = useState([]);
  const [activeRange, setActiveRange] = useState("week");
  const [error, setError] = useState("");

  const loadItems = async () => {
    try {
      const list = await apiRequest("/api/cart-items");
      setItems(Array.isArray(list) ? list : []);
      setError("");
    } catch (e) {
      setError(e.message || "Could not load analytics.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    loadItems();
    const pollId = window.setInterval(loadItems, 30000);
    const onFocus = () => loadItems();
    const onItemsUpdated = () => loadItems();
    window.addEventListener("focus", onFocus);
    window.addEventListener("cartit:items-updated", onItemsUpdated);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cartit:items-updated", onItemsUpdated);
    };
  }, [navigate]);

  const filteredPurchasedItems = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (activeRange === "week") start.setDate(now.getDate() - 7);
    else if (activeRange === "month") start.setMonth(now.getMonth() - 1);
    else start.setFullYear(now.getFullYear() - 1);
    return items.filter((item) => {
      if (!item?.is_purchased) return false;
      const raw = item.purchase_date || item.updated_at || item.created_at;
      if (!raw) return false;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return false;
      return d >= start && d <= now;
    });
  }, [items, activeRange]);

  const totalSpent = useMemo(
    () => filteredPurchasedItems.reduce((sum, item) => sum + Number(item.purchase_price ?? item.current_price ?? 0), 0),
    [filteredPurchasedItems]
  );

  const topProductSpend = useMemo(() => {
    const totals = new Map();
    filteredPurchasedItems.forEach((item) => {
      const key = String(item.item_name || "Unknown item");
      const amount = Number(item.purchase_price ?? item.current_price ?? 0);
      totals.set(key, (totals.get(key) || 0) + amount);
    });
    return [...totals.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount).slice(0, 3);
  }, [filteredPurchasedItems]);

  const topRetailerSpend = useMemo(() => {
    const totals = new Map();
    filteredPurchasedItems.forEach((item) => {
      const key = String(item.store || "Unknown retailer").trim() || "Unknown retailer";
      const amount = Number(item.purchase_price ?? item.current_price ?? 0);
      totals.set(key, (totals.get(key) || 0) + amount);
    });
    return [...totals.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount).slice(0, 3);
  }, [filteredPurchasedItems]);

  const donutStops = useMemo(() => {
    if (!topRetailerSpend.length || totalSpent <= 0) return "conic-gradient(#e5e7eb 0deg 360deg)";
    const colors = ["#4b164c", "#d77d41", "#d1d5db"];
    let current = 0;
    const segments = topRetailerSpend.map((entry, idx) => {
      const sweep = (entry.amount / totalSpent) * 360;
      const start = current;
      const end = current + sweep;
      current = end;
      return `${colors[idx % colors.length]} ${start}deg ${end}deg`;
    });
    if (current < 360) segments.push(`#e5e7eb ${current}deg 360deg`);
    return `conic-gradient(${segments.join(", ")})`;
  }, [topRetailerSpend, totalSpent]);

  const maxProduct = Math.max(...topProductSpend.map((x) => x.amount), 0);
  const maxRetailer = Math.max(...topRetailerSpend.map((x) => x.amount), 0);
  const prettyRange = activeRange === "week" ? "This week" : activeRange === "month" ? "This month" : "This year";
  const barWidth = (amount, max) => (max > 0 ? `${Math.max(8, (amount / max) * 100)}%` : "8%");

  return (
    <DashShell>
      <section className="analytics-shell-card">
        <div className="analytics-header-row">
          <div>
            <h1 className="analytics-title">Your Spending Analytics</h1>
            <p className="analytics-subtitle">Track your long-term shopping trends.</p>
          </div>
          <div className="analytics-range-tabs" role="tablist" aria-label="Analytics range">
            <button type="button" className={`analytics-range-btn ${activeRange === "week" ? "active" : ""}`} onClick={() => setActiveRange("week")}>
              This week
            </button>
            <button type="button" className={`analytics-range-btn ${activeRange === "year" ? "active" : ""}`} onClick={() => setActiveRange("year")}>
              This year
            </button>
            <button type="button" className={`analytics-range-btn ${activeRange === "month" ? "active" : ""}`} onClick={() => setActiveRange("month")}>
              This month
            </button>
          </div>
        </div>

        {error ? <p className="status-message">{error}</p> : null}
        <p className="analytics-total-label">Total amount spent ({prettyRange})</p>
        <p className="analytics-total-value">{money(totalSpent)}</p>

        <div className="analytics-panels-grid">
          <section className="analytics-panel">
            <h2>Spend by product</h2>
            {topProductSpend.length ? (
              topProductSpend.map((entry) => (
                <div key={entry.label} className="analytics-progress-row">
                  <div className="analytics-progress-meta">
                    <span>{entry.label}</span>
                    <span>{money(entry.amount)}</span>
                  </div>
                  <div className="analytics-progress-track">
                    <div className="analytics-progress-fill" style={{ width: barWidth(entry.amount, maxProduct) }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="analytics-empty">No purchased items in this range yet.</p>
            )}

            <h2 className="analytics-section-gap">Spend by retailer</h2>
            {topRetailerSpend.length ? (
              topRetailerSpend.map((entry) => (
                <div key={entry.label} className="analytics-progress-row">
                  <div className="analytics-progress-meta">
                    <span>{entry.label}</span>
                    <span>{money(entry.amount)}</span>
                  </div>
                  <div className="analytics-progress-track">
                    <div className="analytics-progress-fill" style={{ width: barWidth(entry.amount, maxRetailer) }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="analytics-empty">Retail totals appear once items are purchased.</p>
            )}
          </section>
          <section className="analytics-panel analytics-breakdown-panel">
            <h2>Breakdown</h2>
            <div className="analytics-donut" style={{ background: donutStops }} aria-hidden="true">
              <div className="analytics-donut-hole" />
            </div>
            <div className="analytics-legend">
              {topRetailerSpend.map((entry, idx) => (
                <div key={entry.label} className="analytics-legend-row">
                  <span className={`analytics-legend-dot dot-${idx}`} />
                  <span>{entry.label}</span>
                  <span>{money(entry.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </DashShell>
  );
}
