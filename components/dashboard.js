import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  
  // State for groups/categories and cart items
  const [groups, setGroups] = useState([]); 
  const [cartItems, setCartItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  // State for modals (creating new wishlist)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#f59e0b");

  // On component mount, check for user authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const loadDashboardData = async () => {
      try {
        const [meData, groupData, itemData] = await Promise.all([
          apiRequest('/api/me'),
          apiRequest('/api/groups'),
          apiRequest('/api/cart-items'),
        ]);

        setUser(meData.user);
        setGroups(groupData);
        setCartItems(itemData);
        localStorage.setItem('user', JSON.stringify(meData.user));

        try {
          const analyticsData = await apiRequest('/api/analytics/spending');
          setAnalytics(analyticsData);
        } catch (_analyticsError) {
          // Keep dashboard usable even if analytics endpoint is temporarily unavailable.
          setAnalytics(null);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setStatusMessage(error.message || "Failed to load dashboard data");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    };

    loadDashboardData();
  }, [navigate]);

  // Clears storage and sends user back to landing page
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Creates a new category/group
  const handleSaveGroup = async () => {
    if (newGroupName.trim()) {
      try {
        const payload = {
          group_name: newGroupName,
          color: newGroupColor,
          visibility: "Private",
        };
        const responseData = await apiRequest('/api/groups', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setGroups([...groups, responseData.group]);
        setNewGroupName("");
        setNewGroupColor("#f59e0b");
        setIsModalOpen(false);
        setStatusMessage("Category created successfully.");
      } catch (error) {
        console.error("Error creating group:", error);
        setStatusMessage(error.message || "Failed to create category.");
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
            <Link to="/dashboard" className="sidebar-nav-item">
              <LuLayoutDashboard /> Dashboard
            </Link>
            <Link to="/cart" className="sidebar-nav-item">
              <LuShoppingCart /> Cart
            </Link>
            <Link to="/analytics" className="sidebar-nav-item">
              <LuChartArea /> Spending Analytics
            </Link>
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
        {statusMessage && <p className="auth-subtitle">{statusMessage}</p>}

        {/* Wishlists Section */}
        <section className="wishlist-section">
          <h2 className="wishlist-title">My Categories</h2>
          <div className="wishlist-grid">
            
            {/* Trigger Modal */}
            <button onClick={() => setIsModalOpen(true)} className="create-wishlist-btn">
              <LuCirclePlus className="text-5xl" />
              <span className="create-wishlist-label">Create New Category</span>
            </button>

            {/* Display groups or a placeholder if none exist */}
            {groups.length > 0 ? (
              groups.map((group) => (
                <div key={group.group_id} className="wishlist-card">
                  <div className="wishlist-img-placeholder" style={{ backgroundColor: group.color || "#f3f4f6" }}></div>
                  <div className="wishlist-card-footer">
                    <span className="wishlist-card-name">{group.group_name}</span>
                    <span className="wishlist-item-count">
                      {cartItems.filter((item) => item.group_id === group.group_id).length} items
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                No categories yet ... create one to organize items.
              </div>
            )}
            </div>
        </section>

        {/* Analytics and Recent Items Section */}
        <section className="info-grid">
          <div className="dashboard-card">
            <h2 className="card-header">Spending Analytics</h2>
            {analytics?.summary ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="box-placeholder">
                  <p className="analytics-label">Total saved</p>
                  <p className="analytics-value">{analytics.summary.total_items}</p>
                </div>
                <div className="box-placeholder">
                  <p className="analytics-label">Wishlist items</p>
                  <p className="analytics-value">{analytics.summary.open_count}</p>
                </div>
                <div className="box-placeholder">
                  <p className="analytics-label">Purchased</p>
                  <p className="analytics-value">{analytics.summary.purchased_count}</p>
                </div>
                <div className="box-placeholder">
                  <p className="analytics-label">Spent</p>
                  <p className="analytics-value">
                    {Number(analytics.summary.total_spent || 0).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="empty-state">Analytics not available yet.</p>
            )}
          </div>

          <div className="dashboard-card">
            <h2 className="card-header">Recent Cart Items</h2>
            <div className="cart-grid">
              {cartItems.length > 0 ? cartItems.slice(0, 8).map((item) => (
                <div key={item.item_id} className="cart-placeholder">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    <div style={{ padding: '8px', fontSize: '12px' }}>{item.item_name}</div>
                  )}
                </div>
              )) : (
                <div className="empty-state">No items yet. Add one through your API flow.</div>
              )}
            </div>
          </div>
        </section>

        {/* Custom Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Create New Category</h3>
              <input 
                type="text" 
                placeholder="Enter category name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
              <input
                type="color"
                value={newGroupColor}
                onChange={(e) => setNewGroupColor(e.target.value)}
                style={{ marginTop: '10px', width: '100%', height: '40px', border: 'none', background: 'transparent' }}
              />
              <div className="modal-actions">
                <button onClick={() => setIsModalOpen(false)} className="cancel-btn">Cancel</button>
                <button onClick={handleSaveGroup} className="save-btn">Create</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;