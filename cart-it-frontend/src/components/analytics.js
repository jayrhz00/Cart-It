import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './sidebar';
import '../styles/analytics.css';
import { apiRequest } from './api';

const formatMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "$0.00";
};

const MS_DAY = 24 * 60 * 60 * 1000;

function inRollingWindow(iso, view) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  const age = now - t;
  if (view === "week") return age <= 7 * MS_DAY;
  if (view === "month") return age <= 30 * MS_DAY;
  if (view === "year") return age <= 365 * MS_DAY;
  return true;
}

const SpendingAnalytics = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("week");
  const [items, setItems] = useState([]);
  const [sidebarLists, setSidebarLists] = useState([]);

  const load = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    const [groups, cart] = await Promise.all([
      apiRequest("/api/groups"),
      apiRequest("/api/cart-items"),
    ]);
    setSidebarLists(
      (Array.isArray(groups) ? groups : []).map((w) => ({
        id: w.group_id ?? w.id,
        name: w.group_name ?? w.name ?? "Untitled",
      }))
    );
    setItems(Array.isArray(cart) ? cart : []);
  }, [navigate]);

  useEffect(() => {
    load().catch((e) => console.error(e));
  }, [load]);

  useEffect(() => {
    const onUpdated = () => load().catch((e) => console.error(e));
    window.addEventListener("cartit:items-updated", onUpdated);
    window.addEventListener("focus", onUpdated);
    return () => {
      window.removeEventListener("cartit:items-updated", onUpdated);
      window.removeEventListener("focus", onUpdated);
    };
  }, [load]);

  const purchaseDate = (item) => item.purchase_date || item.created_at;

  const purchasedInView = useMemo(() => {
    return items.filter(
      (i) =>
        i.is_purchased &&
        inRollingWindow(purchaseDate(i), activeView)
    );
  }, [items, activeView]);

  const totalSpent = useMemo(() => {
    return purchasedInView.reduce(
      (s, i) => s + Number(i.purchase_price ?? i.current_price ?? 0),
      0
    );
  }, [purchasedInView]);

  const byProduct = useMemo(() => {
    const map = new Map();
    for (const i of purchasedInView) {
      const name = i.item_name || "Unknown";
      const amt = Number(i.purchase_price ?? i.current_price ?? 0);
      map.set(name, (map.get(name) || 0) + amt);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [purchasedInView]);

  const byStore = useMemo(() => {
    const map = new Map();
    for (const i of purchasedInView) {
      const store = i.store?.trim() || "Unknown";
      const amt = Number(i.purchase_price ?? i.current_price ?? 0);
      map.set(store, (map.get(store) || 0) + amt);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [purchasedInView]);

  const maxBar = useMemo(() => {
    const vals = [
      ...byProduct.map(([, v]) => v),
      ...byStore.map(([, v]) => v),
    ];
    return Math.max(1, ...vals);
  }, [byProduct, byStore]);

  return (
    <div className="page-wrapper">
      <div className="sidebar-container-wrapper">
        <Sidebar wishlists={sidebarLists} showExtension={false} />
      </div>

      <main className="detail-main">
        <header className="analytics-header">
          <div>
            <h1 className="wishlist-title">Your Spending Analytics</h1>
            <p className="subtitle">Track your long-term shopping trends.</p>
          </div>

          <div className="toggle-group">
            <button
              type="button"
              className={activeView === "week" ? "active" : ""}
              onClick={() => setActiveView("week")}
            >
              This week
            </button>
            <button
              type="button"
              className={activeView === "month" ? "active" : ""}
              onClick={() => setActiveView("month")}
            >
              This month
            </button>
            <button
              type="button"
              className={activeView === "year" ? "active" : ""}
              onClick={() => setActiveView("year")}
            >
              This year
            </button>
          </div>
        </header>

        <section className="stats-summary">
          <p className="total-label">Total amount spent (purchased in range)</p>
          <h2 className="total-amount">{formatMoney(totalSpent)}</h2>
          <p className="text-sm text-gray-500">
            Based on items marked purchased in the last{" "}
            {activeView === "week" ? "7" : activeView === "month" ? "30" : "365"}{" "}
            days.
          </p>
        </section>

        <section className="charts-grid">
          <div className="chart-card">
            <h3 className="card-header">Spend by product</h3>
            {byProduct.length === 0 ? (
              <p className="text-sm text-gray-500">No purchases in this range yet.</p>
            ) : (
              <div className="bar-chart-placeholder">
                {byProduct.map(([label, amount]) => (
                  <div key={label} className="mb-3">
                    <div className="mb-1 flex justify-between text-xs text-gray-600">
                      <span className="max-w-[60%] truncate">{label}</span>
                      <span>{formatMoney(amount)}</span>
                    </div>
                    <div className="bar">
                      <div
                        className="fill"
                        style={{ width: `${(amount / maxBar) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="card-header mt-8">Spend by retailer</h3>
            {byStore.length === 0 ? (
              <p className="text-sm text-gray-500">No purchases in this range yet.</p>
            ) : (
              <div className="bar-chart-placeholder">
                {byStore.map(([label, amount]) => (
                  <div key={label} className="mb-3">
                    <div className="mb-1 flex justify-between text-xs text-gray-600">
                      <span className="max-w-[60%] truncate">{label}</span>
                      <span>{formatMoney(amount)}</span>
                    </div>
                    <div className="bar">
                      <div
                        className="fill"
                        style={{ width: `${(amount / maxBar) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="chart-card pie-container">
            <h3 className="card-header">Breakdown</h3>
            <p className="text-sm text-gray-600">
              {purchasedInView.length} purchase
              {purchasedInView.length === 1 ? "" : "s"} recorded in this period.
            </p>
            <div className="pie-chart-placeholder mt-6">
              <div className="pie-circle" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SpendingAnalytics;
