import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuLayoutDashboard, LuShoppingCart, LuChartArea, LuLogOut, LuDownload } from "react-icons/lu";
import '../styles/sidebar.css';

<<<<<<< HEAD
/**
 * Sidebar Component
 * The primary navigation controller for the application across pages.
 * Contains links to user lists, log out, and navigation to Dashboard, Cart, Spending Analytics.
 * Contains conditional extension download button only on Dashboard page.
 */

const Sidebar = ({ wishlists, showExtension = false }) => {
=======
const Sidebar = ({ wishlists = [], showExtension = false }) => {
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
  const navigate = useNavigate();
  const handleLogOut = () => {
    const api = window.browser || window.chrome; // Determine which browser API to use
    localStorage.clear(); // Clear web dashboard data

  // Clear extension data (only if running in a browser that supports chrome.storage)
  if (api && api.storage && api.storage.local) {
    api.storage.local.remove(['authToken', 'userData'], () => {
      console.log("Extension session cleared.");
    });
  }
    navigate('/');
  };

  return (
    <aside className="dash-sidebar">
      <div className="sidebar-top">
<<<<<<< HEAD
        {/* Logo and Navigation */}
        <img src="/logo.png" alt="Cart-It Logo" className="sidebar-logo" onClick={() => navigate('/dashboard')} />
        
=======
        <img
          src="/logo.png"
          alt="Cart-It Logo"
          className="sidebar-logo"
          onClick={() => navigate('/dashboard')}
          role="presentation"
        />

>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
        <div className="space-y-4 mb-6">
          <div className="sidebar-nav-item" onClick={() => navigate('/dashboard')}><LuLayoutDashboard /> Dashboard</div>
          <div className="sidebar-nav-item" onClick={() => navigate('/cart')}><LuShoppingCart /> Cart</div>
          <div className="sidebar-nav-item" onClick={() => navigate('/analytics')}><LuChartArea /> Spending Analytics</div>
        </div>

        {/* Wishlists Section */}
        <div className="sidebar-wishlists">
          <p className="font-bold text-xs uppercase text-gray-400 mb-2">My Wishlists</p>
          <div className="wishlists-scroll-area">
<<<<<<< HEAD
            {wishlists.map((list) => (
              <div key={list.wishlist_id} 
                className="sidebar-wishlist-item" 
                onClick={() => navigate(`/wishlist/${list.wishlist_id}`)}
                style={{ cursor: 'pointer' }}>
              {list.name}
              </div>
            ))}
=======
            {wishlists.map((list) => {
              const id = list.id ?? list.group_id;
              const name = list.name ?? list.group_name ?? 'Untitled';
              const visibility = String(list.visibility || "Private");
              return (
                <div
                  key={id}
                  className="sidebar-wishlist-item"
                  onClick={() => navigate(`/wishlist/${id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/wishlist/${id}`)}
                >
                  <span className="sidebar-wishlist-name">{name}</span>
                  <span
                    className={`sidebar-wishlist-badge ${
                      visibility.toLowerCase() === "shared"
                        ? "sidebar-wishlist-badge-shared"
                        : "sidebar-wishlist-badge-private"
                    }`}
                  >
                    {visibility}
                  </span>
                </div>
              );
            })}
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
          </div>
        </div>
      </div>

      <div className="sidebar-bottom">
        {showExtension && (
          <div className="extension-card">
            <p className="extension-title">Get the Extension</p>
            <button
              className="extension-btn"
              type="button"
              onClick={() => window.open("/extension-install.html", "_blank", "noopener,noreferrer")}
            >
              <LuDownload size={14} /> Download
            </button>
          </div>
        )}
<<<<<<< HEAD
        <button className="logout-btn" onClick={handleLogOut}>
=======
        <button
          className="logout-btn"
          type="button"
          onClick={() => {
            localStorage.clear();
            navigate('/');
          }}
        >
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
          <LuLogOut /> Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
