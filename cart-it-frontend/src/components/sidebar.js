import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuLayoutDashboard, LuShoppingCart, LuChartArea, LuLogOut, LuDownload } from "react-icons/lu";
import '../styles/sidebar.css';

const Sidebar = ({ wishlists, showExtension = false }) => {
  const navigate = useNavigate();

  return (
    <aside className="dash-sidebar">
      {/* Top section: Logo, Nav, Wishlists */}
      <div className="sidebar-top">
        <img src="/logo.png" alt="Cart-It Logo" className="sidebar-logo" onClick={() => navigate('/dashboard')} />
        
        <div className="space-y-4 mb-6">
          <div className="sidebar-nav-item" onClick={() => navigate('/dashboard')}><LuLayoutDashboard /> Dashboard</div>
          <div className="sidebar-nav-item" onClick={() => navigate('/cart')}><LuShoppingCart /> Cart</div>
          <div className="sidebar-nav-item" onClick={() => navigate('/analytics')}><LuChartArea /> Spending Analytics</div>
        </div>

        <div className="sidebar-wishlists">
          <p className="font-bold text-xs uppercase text-gray-400 mb-2">My Wishlists</p>
          <div className="wishlists-scroll-area">
            {wishlists.map(list => (
              <div key={list.id} className="sidebar-wishlist-item">{list.name}</div>
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
        <button className="logout-btn" onClick={() => { localStorage.clear(); navigate('/'); }}>
          <LuLogOut /> Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;