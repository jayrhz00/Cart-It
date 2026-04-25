import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LuLayoutDashboard, 
  LuShoppingCart, 
  LuChartArea, 
  LuCirclePlus, 
  LuLogOut,
  LuDownload 
} from "react-icons/lu";
import '../styles/dashboard.css';
import { apiRequest } from './api';

/* Serves as the main landing screen for authenticated users.
 * Features navigation, wishlists, analytics, and cart management.
 */

const Dashboard = () => {
  const navigate = useNavigate();  // Navigation hook for redirecting
  const [user, setUser] = useState(null);
  
  // State for wishlists - initialized as empty array 
  const [wishlists, setWishlists] = useState([]); 

  // State for modals (creating new wishlist)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState("");

  // On component mount, check for user authentication
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    
    // Redirect to login if no user is found in local storage
    if (!savedUser) {
      navigate('/login');
    } else {
      const user = JSON.parse(savedUser);
      setUser(user);
        
        // Fetch wishlists from database
      apiRequest('/api/groups')
        .then(data => setWishlists(data))
        .catch(err => console.error("Error fetching wishlists:", err));
    }
  }, [navigate]);

  // Clears storage and sends user back to landing page
  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // Opens the create wishlist modal
  const handleSaveWishlist = async () => {
    if (newWishlistName.trim()) {
      // Send new wishlist data to backend API
      try {
        const response = await apiRequest('/api/groups', {
          method: 'POST',
          body: JSON.stringify({ 
          group_name: newWishlistName
        }),
        });
        const newWishlist = response.group || response;
        setWishlists([...wishlists, newWishlist]);
        setNewWishlistName("");
        setIsModalOpen(false);
      } catch (error) {
        console.error("Error creating wishlist:", error);
        alert(error.message || "Server error. Please try again later.");
      }
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div>
          <img src="/logo.png" alt="Cart-It Logo" className="sidebar-logo" />
          
          <div className="space-y-4">
            <div className="sidebar-nav-item"><LuLayoutDashboard /> Dashboard</div>
            <div className="sidebar-nav-item"><LuShoppingCart /> Cart</div>
            <div className="sidebar-nav-item"><LuChartArea /> Spending Analytics</div>
          </div>

          <div className="extension-card">
            <p className="extension-title">Get the Extension</p>
            <button className="extension-btn">
              <LuDownload size={14} /> Download
            </button>
          </div>
        </div>
        
        {/* Logout action */}
        <button className="logout-btn" onClick={handleLogout}>
          <LuLogOut /> Log Out
        </button>
      </aside>
      
      {/* Main Content Area */}
      <main className="dash-main">
        {/* Dynamic greeting: prevents crash if user is still loading */}
        <h1 className="dash-title">Hello, {user ? user.username : 'User'}</h1>

        {/* Wishlists Section */}
        <section className="wishlist-section">
          <h2 className="wishlist-title">My Wishlists</h2>
          <div className="wishlist-grid">
            
            {/* Trigger Modal */}
            <button onClick={() => setIsModalOpen(true)} className="create-wishlist-btn">
              <LuCirclePlus className="text-5xl" />
              <span className="create-wishlist-label">Create New Wishlist</span>
            </button>

            {/* Display wishlists or a placeholder if none exist */}
            {wishlists.length > 0 ? (
              wishlists.map((list) => (
                <div key={list.id} className="wishlist-card">
                  <div className="wishlist-img-placeholder"></div>
                  <div className="wishlist-card-footer">
                    <span className="wishlist-card-name">{list.name}</span>
                    <span className="wishlist-item-count">{list.items} items</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                No wishlists yet ... start shopping!
              </div>
            )}
            </div>
        </section>

        {/* Analytics and Recent Items Section */}
        <section className="info-grid">
          <div className="dashboard-card">
            <h2 className="card-header">Spending Analytics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="box-placeholder"></div>
              <div className="box-placeholder"></div>
              <div className="box-placeholder"></div>
              <div className="box-placeholder"></div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2 className="card-header">Recent Cart Items</h2>
            <div className="cart-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="cart-placeholder"></div>
              ))}
            </div>
          </div>
        </section>

        {/* Custom Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Create New Wishlist</h3>
              <input 
                type="text" 
                placeholder="Enter wishlist name..."
                value={newWishlistName}
                onChange={(e) => setNewWishlistName(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button onClick={() => setIsModalOpen(false)} className="cancel-btn">Cancel</button>
                <button onClick={handleSaveWishlist} className="save-btn">Create</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;