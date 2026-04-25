import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LuChartColumn, LuDownload, LuLayoutDashboard, LuLogOut, LuShoppingCart } from "react-icons/lu";
import "../styles/dashboard.css";

const navClass = ({ isActive }) =>
  `dash-nav-link${isActive ? " dash-nav-link-active" : ""}`;

/**
 * Shared chrome for post-login pages: sidebar nav (7-page app: dashboard, wishlist drill-in, cart, analytics).
 */
export default function DashShell({ children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <aside className="dash-sidebar">
        <button type="button" className="sidebar-logo-btn" onClick={() => navigate("/dashboard")}>
          <img src="/logo.png" alt="Cart-It home" className="sidebar-logo" />
        </button>

        <nav className="dash-nav" aria-label="Main">
          <NavLink to="/dashboard" className={navClass} end>
            <LuLayoutDashboard size={18} aria-hidden />
            Dashboard
          </NavLink>
          <NavLink to="/cart" className={navClass}>
            <LuShoppingCart size={18} aria-hidden />
            Cart
          </NavLink>
          <NavLink to="/analytics" className={navClass}>
            <LuChartColumn size={18} aria-hidden />
            Spending analytics
          </NavLink>
        </nav>

        <div className="extension-card">
          <p className="extension-title">Get the Extension</p>
          <a
            href="/extension-install.html"
            target="_blank"
            rel="noopener noreferrer"
            className="extension-btn extension-btn-link"
          >
            <LuDownload size={14} aria-hidden />
            Download
          </a>
        </div>
        <button type="button" className="logout-btn" onClick={handleLogout}>
          <LuLogOut /> Log Out
        </button>
      </aside>
      <main className="dash-main">{children}</main>
    </div>
  );
}
