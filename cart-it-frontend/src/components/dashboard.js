import React, { useMemo, useState, useEffect } from 'react';
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
  const [cartItems, setCartItems] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

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
      Promise.all([apiRequest('/api/groups'), apiRequest('/api/cart-items')])
        .then(([groupData, itemData]) => {
          setWishlists(groupData);
          setCartItems(itemData);
        })
        .catch(err => console.error("Error fetching dashboard data:", err));
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

  const selectedItems =
    selectedGroupId == null
      ? []
      : cartItems.filter((item) => item.group_id === selectedGroupId);
  const selectedGroup = wishlists.find((list) => (list.group_id ?? list.id) === selectedGroupId);
  const uncategorizedItems = cartItems.filter((item) => item.group_id == null);
  const purchasedItems = cartItems.filter((item) => Boolean(item.is_purchased));
  const openItems = cartItems.filter((item) => !item.is_purchased);
  const openValue = openItems.reduce((sum, item) => sum + Number(item.current_price || 0), 0);
  const spentValue = purchasedItems.reduce(
    (sum, item) => sum + Number(item.purchase_price ?? item.current_price ?? 0),
    0
  );
  const recentItems = useMemo(() => [...cartItems].sort((a, b) => (b.item_id || 0) - (a.item_id || 0)), [cartItems]);

  const jumpTo = (targetId) => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div>
          <img src="/logo.png" alt="Cart-It Logo" className="sidebar-logo" />
          
          <div className="space-y-4">
            <button className="sidebar-nav-item" type="button" onClick={() => jumpTo("topSection")}>
              <LuLayoutDashboard /> Dashboard
            </button>
            <button className="sidebar-nav-item" type="button" onClick={() => jumpTo("cartSection")}>
              <LuShoppingCart /> Cart
            </button>
            <button className="sidebar-nav-item" type="button" onClick={() => jumpTo("analyticsSection")}>
              <LuChartArea /> Spending Analytics
            </button>
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
        <section className="wishlist-section" id="topSection">
          <h2 className="wishlist-title">My Wishlists</h2>
          <div className="wishlist-grid">
            
            {/* Trigger Modal */}
            <button onClick={() => setIsModalOpen(true)} className="create-wishlist-btn">
              <LuCirclePlus className="text-5xl" />
              <span className="create-wishlist-label">Create New Wishlist</span>
            </button>

            {/* Display wishlists or a placeholder if none exist */}
            {wishlists.length > 0 ? (
              wishlists.map((list) => {
                const listId = list.group_id ?? list.id;
                const listName = list.group_name ?? list.name ?? "Untitled";
                const listItems = cartItems.filter((item) => item.group_id === listId);
                const itemCount = listItems.length;
                const previewImages = listItems
                  .map((item) => item.image_url)
                  .filter(Boolean)
                  .slice(0, 4);
                const isSelected = selectedGroupId === listId;
                return (
                <button
                  key={listId}
                  className={`wishlist-card ${isSelected ? "wishlist-card-active" : ""}`}
                  onClick={() => setSelectedGroupId(listId)}
                  type="button"
                >
                  <div className="wishlist-mosaic" aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const src = previewImages[idx];
                      return src ? (
                        <img key={idx} src={src} alt="" className="wishlist-mosaic-cell wishlist-mosaic-img" />
                      ) : (
                        <div key={idx} className="wishlist-mosaic-cell wishlist-mosaic-placeholder" />
                      );
                    })}
                  </div>
                  <div className="wishlist-card-footer">
                    <span className="wishlist-card-name">{listName}</span>
                    <span className="wishlist-item-count">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                  </div>
                </button>
              );
              })
            ) : (
              <div className="empty-state">
                No wishlists yet ... start shopping!
              </div>
            )}
            </div>
        </section>

        {selectedGroupId != null && (
          <section className="dashboard-card selected-items-card">
            <h2 className="card-header">
              Items in {selectedGroup?.group_name || selectedGroup?.name || "selected wishlist"}
            </h2>
            {selectedItems.length > 0 ? (
              <div className="selected-items-grid">
                {selectedItems.map((item) => (
                  <a
                    key={item.item_id}
                    href={item.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="selected-item"
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.item_name} className="selected-item-image" />
                    ) : (
                      <div className="selected-item-image selected-item-image-fallback">No image</div>
                    )}
                    <div className="selected-item-name">{item.item_name}</div>
                    {item.notes ? <div className="selected-item-notes">Note: {item.notes}</div> : null}
                  </a>
                ))}
              </div>
            ) : (
              <div className="empty-state selected-empty-state">No items in this wishlist yet.</div>
            )}
          </section>
        )}

        {/* Analytics and Recent Items Section */}
        <section className="info-grid">
          <div className="dashboard-card" id="analyticsSection">
            <h2 className="card-header">Spending Analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-stat">
                <span className="analytics-label">Total items</span>
                <span className="analytics-value">{cartItems.length}</span>
              </div>
              <div className="analytics-stat">
                <span className="analytics-label">Open wishlist items</span>
                <span className="analytics-value">{openItems.length}</span>
              </div>
              <div className="analytics-stat">
                <span className="analytics-label">Purchased items</span>
                <span className="analytics-value">{purchasedItems.length}</span>
              </div>
              <div className="analytics-stat">
                <span className="analytics-label">Current wishlist value</span>
                <span className="analytics-value">${openValue.toFixed(2)}</span>
              </div>
              <div className="analytics-stat analytics-stat-wide">
                <span className="analytics-label">Estimated spent total</span>
                <span className="analytics-value">${spentValue.toFixed(2)}</span>
              </div>
              <div className="analytics-stat analytics-stat-wide">
                <span className="analytics-label">Uncategorized items</span>
                <span className="analytics-value">{uncategorizedItems.length}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card" id="cartSection">
            <h2 className="card-header">Recent Cart Items</h2>
            {recentItems.length > 0 ? (
              <div className="recent-items-grid">
                {recentItems.slice(0, 8).map((item) => (
                  <a
                    key={item.item_id}
                    href={item.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="recent-item"
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.item_name} className="recent-item-image" />
                    ) : (
                      <div className="recent-item-image recent-item-image-fallback">No image</div>
                    )}
                    <div className="recent-item-name">{item.item_name}</div>
                    {item.notes ? <div className="recent-item-notes">Note: {item.notes}</div> : null}
                  </a>
                ))}
              </div>
            ) : (
              <div className="empty-state selected-empty-state">No cart items saved yet.</div>
            )}
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