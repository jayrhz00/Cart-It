import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './sidebar';
import { LuPlus, LuUsers, LuTrendingUp, LuShoppingCart } from "react-icons/lu";
import { getWishlists, getCartItems, createWishlist } from '../services/api';
import '../styles/dashboard.css';

/**
 * Dashboard Component
 * The primary landing page for authenticated users.
 * Features a quad-image wishlist preview and a branded "New List" trigger.
 * Also features at-a-glance look at recent cart items and sparkline graph for spending analytics.
 */

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // Current authenticated user
  const [wishlists, setWishlists] = useState([]); // List of owned and shared collections
  const [isModalOpen, setIsModalOpen] = useState(false); // Toggle for creation modal
  const [newWishlistName, setNewWishlistName] = useState(""); // Input for new list naming
  const [items, setItems] = useState([]); // Recent items for activity feed

  // Effect hook to verify authentication and fetch aggregate dashboard data. Redirects to login if session data is missing.
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
    } else {
      const userData = JSON.parse(savedUser);
      setUser(userData);

      const loadDashboardData = async () => {
        try {
          const [wishlistData, cartData] = await Promise.all([
            getWishlists(userData.user_id),
            getCartItems(userData.user_id)
          ]);
          setWishlists(wishlistData);
          setItems(cartData);
        } catch (err) {
          console.error("Dashboard load error:", err);
        }
      };
      loadDashboardData();
    }
  }, [navigate]);

  // Submits a new wishlist request to the API and updates local state.
  const handleSaveWishlist = async () => {
    if (newWishlistName.trim()) {
      try {
        const newWishlist = await createWishlist(user.user_id, newWishlistName);
        setWishlists([...wishlists, newWishlist]);
        setNewWishlistName("");
        setIsModalOpen(false);
      } catch (error) {
        console.error("Error creating wishlist:", error);
      }
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Container */}
      <div className="sidebar-container">
        <Sidebar wishlists={wishlists} showExtension={true} />
      </div>

      <main className="dash-main">
        {/* Welcome Header */}
        <header className="dash-header">
          <div className="dash-greeting">
            <h1 className="dash-title">Welcome back, {user ? user.username : 'User'}</h1>
            <p className="dash-subtitle">Your personal shopping lab is ready.</p>
          </div>
        </header>

        {/* Collection Grid: Contains the creation trigger and wishlist quads */}
        <section className="dash-section">
          <h2 className="section-heading">My Collections</h2>

          <div className="wishlist-grid">
            {/* Branded "Create New" Card Trigger */}
            <button onClick={() => setIsModalOpen(true)} className="create-list-card">
              <div className="plus-icon-circle">
                <LuPlus size={32} />
              </div>
              <span className="create-label">New List</span>
            </button>

            {wishlists.map((list) => (
              <div
                key={list.wishlist_id}
                className="dash-wishlist-card"
                onClick={() => navigate(`/wishlist/${list.wishlist_id}`)}
              >
                {/* Quad-Image Preview: Displays first 4 items or placeholders */}
                <div className="wishlist-quad">
                  {list.preview_images && list.preview_images.length > 0 ? (
                    <div className="quad-grid">
                      {list.preview_images.map((img, i) => (
                        <img key={i} src={img} alt="" className="quad-img" />
                      ))}
                      {/* Generates empty blocks if list contains fewer than 4 items */}
                      {[...Array(Math.max(0, 4 - list.preview_images.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="quad-empty"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="quad-placeholder">
                      <LuShoppingCart size={24} className="text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Wishlist Metadata Section */}
                <div className="wishlist-info">
                  <div className="flex justify-between items-start">
                    <span className="list-name">{list.name}</span>
                    {/* Collaborative status icon (LuUsers) shown for shared lists */}
                    {list.is_shared && (
                      <LuUsers size={16} className="text-[#4B0082] mt-1" title="Shared Wishlist" />
                    )}
                  </div>
                  <span className="list-count">{list.items} items</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Insight Section: Summarized Analytics and Recent Activity */}
        <section className="insights-grid">
          {/* Sparkline visualization linked to full Analytics suite */}
          <div className="insight-card" onClick={() => navigate('/analytics')}>
            <div className="card-top">
              <div className="flex items-center gap-2">
                <LuTrendingUp className="text-[#DB8046]" />
                <h3 className="insight-label">Expense Trends</h3>
              </div>
            </div>
            <div className="mini-graph">
              <div className="spark-bar h-8"></div>
              <div className="spark-bar h-16"></div>
              <div className="spark-bar h-12"></div>
              <div className="spark-bar h-20 active"></div>
            </div>
          </div>

          {/* Horizontal strip of latest items found in the main cart */}
          <div className="insight-card" onClick={() => navigate('/cart')}>
            <div className="card-top">
              <div className="flex items-center gap-2">
                <LuShoppingCart className="text-purple-600" />
                <h3 className="insight-label">Latest Finds</h3>
              </div>
            </div>
            <div className="recent-strip">
              {items.slice(0, 5).map(item => (
                <img key={item.item_id} src={item.image_url} alt="" className="strip-img" />
              ))}
            </div>
          </div>
        </section>

        {/* Wishlist Creation Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Create New Wishlist</h3>
              <input
                type="text"
                placeholder="List Name"
                value={newWishlistName}
                onChange={(e) => setNewWishlistName(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button onClick={() => setIsModalOpen(false)} className="btn-cancel">Cancel</button>
                <button onClick={handleSaveWishlist} className="btn-save">Create</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;