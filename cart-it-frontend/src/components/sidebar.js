import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuLayoutDashboard, LuShoppingCart, LuChartArea, LuLogOut, LuDownload } from "react-icons/lu";
import '../styles/sidebar.css';

/**
 * Sidebar Component
 * The primary navigation controller for the application across pages.
 * Contains links to user lists, log out, and navigation to Dashboard, Cart, Spending Analytics.
 * Contains conditional extension download button only on Dashboard page.
 */

const Sidebar = ({ wishlists, showExtension = false }) => {
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
        {/* Logo and Navigation */}
        <img src="/logo.png" alt="Cart-It Logo" className="sidebar-logo" onClick={() => navigate('/dashboard')} />
        
        <div className="space-y-4 mb-6">
          <div className="sidebar-nav-item" onClick={() => navigate('/dashboard')}><LuLayoutDashboard /> Dashboard</div>
          <div className="sidebar-nav-item" onClick={() => navigate('/cart')}><LuShoppingCart /> Cart</div>
          <div className="sidebar-nav-item" onClick={() => navigate('/analytics')}><LuChartArea /> Spending Analytics</div>
        </div>

        {/* Wishlists Section */}
        <div className="sidebar-wishlists">
          <p className="font-bold text-xs uppercase text-gray-400 mb-2">My Wishlists</p>
          <div className="wishlists-scroll-area">
            {wishlists.map((list) => (
              <div key={list.wishlist_id} 
                className="sidebar-wishlist-item" 
                onClick={() => navigate(`/wishlist/${list.wishlist_id}`)}
                style={{ cursor: 'pointer' }}>
              {list.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section: Extension (Conditional) and Logout */}
      <div className="sidebar-bottom">
        {showExtension && (
          <div className="extension-card">
            <p className="extension-title">Get the Extension</p>
            <button className="extension-btn"><LuDownload size={14} /> Download</button>
          </div>
        )}
        <button className="logout-btn" onClick={handleLogOut}>
          <LuLogOut /> Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;