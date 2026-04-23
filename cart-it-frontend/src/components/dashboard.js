import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './sidebar';
import { LuCirclePlus } from "react-icons/lu";
import '../styles/dashboard.css';

/* Serves as the main landing screen for authenticated users.
 * Features navigation, wishlists, analytics, and cart management.
 */

const Dashboard = () => {
  const navigate = useNavigate();  // Navigation hook for redirecting
  const [user, setUser] = useState(null);  // State for user information
  const [wishlists, setWishlists] = useState([]);  // State for wishlists - initialized as empty array 
  const [isModalOpen, setIsModalOpen] = useState(false);   // State for modals (creating new wishlist)
  const [newWishlistName, setNewWishlistName] = useState("");  // State for new wishlist name input
  const [items, setItems] = useState([]);  // State for recent cart items - initialized as empty array

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
        fetch(`http://localhost:3000/api/wishlists?owner_id=${user.user_id}`)
            .then(res => res.json())
            .then(data => setWishlists(data))
            .catch(err => console.error("Error fetching wishlists:", err));

        // Fetch recent cart items 
        fetch(`http://localhost:3000/api/items?user_id=${user.user_id}`)
            .then(res => res.json())
            .then(data => setItems(data))
            .catch(err => console.error("Error fetching items:", err));
    }
  }, [navigate]);

  // Opens the create wishlist modal
  const handleSaveWishlist = async () => {
    if (newWishlistName.trim()) {
      // Get current user info from local storage to associate wishlist with user ID
      const user = JSON.parse(localStorage.getItem('user'));

      // Send new wishlist data to backend API
      try {
        const response = await fetch('http://localhost:3000/api/wishlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
          owner_id: user.user_id, 
          name: newWishlistName 
        }),
      });
        if (response.ok) {
          const newWishlist = await response.json();
          setWishlists([...wishlists, newWishlist]);
          setNewWishlistName("");
          setIsModalOpen(false);
        }
      } catch (error) {
        console.error("Error creating wishlist:", error);
        alert("Server error. Please try again later.");
      }
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <Sidebar wishlists={wishlists} showExtension={true} />        
      
      {/* Main Content Area */}
      <main className="dash-main">
        {/* Dynamic greeting: prevents crash if user is still loading */}
        <h1 className="dash-title">Hello, {user ? user.username : 'User'}</h1>

        {/* Wishlists Section */}
        <section className="wishlist-section">
          <h2 className="dash-wishlist-title">My Wishlists</h2>
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
              {items.map(item => (
                <div key={item.item_id} className="cart-item-card">
                  <img src={item.image_url} alt={item.product_name} className="h-20 w-full object-cover rounded" />
                  <p className="font-bold text-sm truncate">{item.product_name}</p>
                  <p className="text-sm font-semibold">${item.price}</p>
                </div>
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