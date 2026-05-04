import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuFilter, LuShare2, LuPen, LuArrowLeft } from "react-icons/lu";
import Sidebar from './sidebar';
import ItemDetailModal from './item-modal';
import { LoadingState, EmptyState } from './feedback';
import { 
  getCartItems, 
  getWishlists, 
  updateItemNotes, 
  markItemAsPurchased, 
  deleteItem, 
  bulkDeleteItems, 
  bulkMoveItems 
} from '../services/api';
import '../styles/detail-view.css';

/**
 * Cart Component
 * Displays the aggregated list of tracked items from various  stores.
 * Allows for sorting, editing, and sharing
 */

const Cart = () => {
  const navigate = useNavigate(); // For navigation and auth checks
  const [items, setItems] = useState([]); // State to hold cart items
  const [isLoading, setIsLoading] = useState(true); // State to indicate loading status
  const [selectedItem, setSelectedItem] = useState(null); // State for currently selected item in the modal
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode for bulk actions
  const [selectedIds, setSelectedIds] = useState([]); // State to track selected item IDs for bulk actions
  const [sortBy, setSortBy] = useState('newest'); // State to track current sorting option
  const [showFilterMenu, setShowFilterMenu] = useState(false); // State to toggle filter menu visibility
  const [showShareModal, setShowShareModal] = useState(false); // State to toggle share modal visibility
  const [sidebarWishlists, setSidebarWishlists] = useState([]); // State to hold wishlists for the sidebar and move actions
  const [isCopied, setIsCopied] = useState(false); // State to indicate if share link has been copied to clipboard
  const [isConfirming, setIsConfirming] = useState(false); // State to handle confirmation step for bulk delete action
  const [lastUpdated, setLastUpdated] = useState(null); // State to track the last updated timestamp for the cart
  const [showMoveMenu, setShowMoveMenu] = useState(false); // State to toggle move to wishlist menu visibility
  const [showUnorganizedOnly, setShowUnorganizedOnly] = useState(false); // State to toggle filter for showing only unorganized items (items not in any wishlist)

  // Helper function to format the "time ago" display for the last updated timestamp
  const getTimeAgo = (date) => {
    if (!date) return "...";
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handler function to add or update notes for a specific item
  const handleAddNote = async (itemId, newNote) => {
    try {
      const data = await updateItemNotes(itemId, newNote);
    
      setItems(prevItems =>
      prevItems.map(item =>
        item.item_id === itemId ? { ...item, notes: data.notes } : item
      )
    );
    setSelectedItem(prev => ({ ...prev, notes: data.notes }));
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  // Handler function to mark an item as purchased, which removes it from the cart
  const handleMarkPurchased = async (item) => {
    try {
      await markItemAsPurchased(item.item_id, item.price);
      setItems(prev => prev.filter(i => i.item_id !== item.item_id));
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Handler function to delete an item from the cart
  const handleDelete = async (itemId) => {
    try {
      await deleteItem(itemId);
      setItems(prev => prev.filter(i => i.item_id !== itemId));
      setSelectedItem(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    }
  };

  // Helper function to toggle selection of items for bulk actions in edit mode
  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Handler function to perform bulk deletion of selected items, with a confirmation step
  const handleBulkDelete = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 3000);
      return;
    }
    try {
      const success = await bulkDeleteItems(selectedIds);
      if (success) {
        setItems(prev => prev.filter(item => !selectedIds.includes(item.item_id)));
        setSelectedIds([]);
        setIsEditing(false);
        setIsConfirming(false);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(err);
      setIsConfirming(false);
    }
  };

  // Handler function to perform bulk move of selected items to a specified wishlist
  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.item_id));
    }
  };

  // Handler function to move selected items to a specified wishlist
  const handleBulkMove = async (wishlistId) => {
    try {
      const success = await bulkMoveItems(selectedIds, wishlistId);
      if (success) {
        setItems(prev => prev.map(item =>
          selectedIds.includes(item.item_id) ? { ...item, wishlist_id: wishlistId } : item
        ));
        setSelectedIds([]);
        setIsEditing(false);
        setShowMoveMenu(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // useEffect hook to perform authentication check and fetch cart items and wishlists on component mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return navigate('/login');

    getCartItems(user.user_id)
      .then(data => {
        setItems(data);
        if (data?.length > 0) {
          // Calculate the most recent updated_at timestamp from the fetched items to set the lastUpdated state
          const latestTimestamp = Math.max(...data.map(item => new Date(item.updated_at).getTime()));
          setLastUpdated(new Date(latestTimestamp));
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });

    getWishlists(user.user_id)
      .then(data => setSidebarWishlists(data))
      .catch(err => console.error(err));
  }, [navigate]);

  // useEffect hook to set up an interval that updates the lastUpdated state every minute to trigger a re-render and update the "time ago" display
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(prev => (prev ? new Date(prev) : null));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Sort items based on the selected sorting option and filter for unorganized items if the toggle is active
  const sortedItems = [...items].sort((a, b) => {
    const priceA = parseFloat(a.price) || 0;
    const priceB = parseFloat(b.price) || 0;
    if (sortBy === 'price-low-to-high') return priceA - priceB;
    if (sortBy === 'price-high-to-low') return priceB - priceA;
    if (sortBy === 'oldest') return new Date(a.saved_at) - new Date(b.saved_at);
    return new Date(b.saved_at) - new Date(a.saved_at);
  });

  // Filter the sorted items to show only unorganized items if the toggle is active, otherwise show all items
  const displayItems = sortedItems.filter(item =>
    showUnorganizedOnly ? !item.wishlist_id : true
  );

  // Calculate the total price of all items in the cart to display in the header
  const cartTotal = items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

  return (
    <div className="page-wrapper">
      <div className="sidebar-container-wrapper">
        <Sidebar wishlists={sidebarWishlists} showExtension={false} />
      </div>

      <main className="detail-main">
        <header className="detail-header">
          <button onClick={() => navigate('/dashboard')} className="back-link">
            <LuArrowLeft /> Back to Dashboard
          </button>

          {/* Header section displaying the title "Cart", total price of items, and last updated time */}
          <div className="header-content">
            <h1 className="wishlist-title">Cart</h1>
            <div className="stats">
              <span>Total Price: <strong>${cartTotal.toFixed(2)}</strong></span>
              <span className="text-gray-300">•</span>
              <span>Updated {getTimeAgo(lastUpdated)}</span>
            </div>
          </div>

          {/* Toolbar with sorting, filtering, sharing, and editing options for the cart items */}
          <div className="toolbar">
            {/* Sorting and filtering options */}
            <div className="filter-wrapper">
              {sortBy === 'newest' ? (
                <button className="tool-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                  <LuFilter size={16} /> Filter
                </button>
              ) : (
                <div className="filter-pill-active">
                  <span className="filter-pill-text">{sortBy.replace(/-/g, ' ')}</span>
                  <button className="filter-reset-btn" onClick={() => setSortBy('newest')} title="Clear filter">
                    <span className="filter-reset-icon">✕</span>
                  </button>
                </div>
              )}

              {showFilterMenu && (
                <div className="filter-menu">
                  {['Oldest', 'Price Low to High', 'Price High to Low'].map(opt => (
                    <button
                      key={opt}
                      className="filter-option"
                      onClick={() => {
                        setSortBy(opt.toLowerCase().replace(/ /g, '-'));
                        setShowFilterMenu(false);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle button to filter and show only unorganized items (items not in any wishlist)*/}
            {!isEditing && (
              <button
                className={`btn-unorganized-toggle ${showUnorganizedOnly ? 'btn-unorganized-active' : ''}`}
                onClick={() => setShowUnorganizedOnly(!showUnorganizedOnly)}
              >
                {showUnorganizedOnly ? "Showing Unorganized" : "Show Unorganized"}
              </button>
            )}

            {/* Button to open the share modal for sharing the cart with others via a link */}
            <button className="tool-btn" onClick={() => setShowShareModal(true)}>
              <LuShare2 size={16} /> Share
            </button>

            {/* Edit mode toggle and bulk action buttons */}
            <button
              className={`btn-edit-mode ${isEditing ? 'btn-edit-active' : ''}`}
              onClick={() => {
                setIsEditing(!isEditing);
                setSelectedIds([]);
              }}
            >
              <LuPen size={16} /> {isEditing ? 'Cancel' : 'Edit'}
            </button>

            {isEditing && items.length > 0 && (
              <button className="tool-btn" onClick={handleSelectAll}>
                {selectedIds.length === items.length ? "Deselect All" : "Select All"}
              </button>
            )}

            {isEditing && selectedIds.length > 0 && (
              <button
                className={`btn-bulk-delete ${isConfirming ? 'bg-black hover:bg-gray-800' : ''}`}
                onClick={handleBulkDelete}
              >
                {isConfirming ? "Confirm Delete?" : `Delete (${selectedIds.length})`}
              </button>
            )}

            {/* Bulk move to wishlist action */ }
            {isEditing && selectedIds.length > 0 && (
              <div className="relative">
                <button className="tool-btn" onClick={() => setShowMoveMenu(!showMoveMenu)}>
                  Add to List
                </button>
                {showMoveMenu && (
                  <div className="absolute top-12 left-0 bg-white border rounded-lg shadow-xl z-50 w-48">
                    {sidebarWishlists.map(list => (
                      <button
                        key={list.wishlist_id}
                        className="filter-option"
                        onClick={() => handleBulkMove(list.wishlist_id)}
                      >
                        {list.wishlist_name || list.name || "Unnamed List"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Section to display the cart items in a grid layout, with loading and empty states */}
        <section className="item-grid">
          {isLoading ? (
            <LoadingState message="Loading your cart..." />
          ) : items.length === 0 ? (
            <EmptyState message="Your cart is currently empty." />
          ) : (
            displayItems.map(item => (
              <div
                key={item.item_id}
                className={`item-card relative ${isEditing && selectedIds.includes(item.item_id) ? 'ring-2 ring-[#4B0082]' : ''}`}
                onClick={() => !isEditing && setSelectedItem(item)}
              >
                {isEditing && (
                  <input
                    type="checkbox"
                    className="absolute top-4 left-4 z-30 w-6 h-6 accent-[#DB8046] cursor-pointer"
                    checked={selectedIds.includes(item.item_id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelection(item.item_id);
                    }}
                  />
                )}

                <div className="img-wrapper relative">
                  <img src={item.image_url} alt={item.product_name} />
                  {item.wishlist_id && (
                    <div className="wishlist-badge">
                      {sidebarWishlists.find(l => l.wishlist_id === item.wishlist_id)?.wishlist_name ||
                        sidebarWishlists.find(l => l.wishlist_id === item.wishlist_id)?.name ||
                        "Organized"}
                    </div>
                  )}
                </div>

                <div className="item-details">
                  <p className="store">{item.store_name}</p>
                  <h3 className="name">{item.product_name}</h3>
                  <p className="price">${item.price}</p>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Modal for sharing the cart via a link */ }
      {showShareModal && (
        <div className="modal-overlay" onClick={() => { setShowShareModal(false); setIsCopied(false); }}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => { setShowShareModal(false); setIsCopied(false); }}>✕</button>
            <h2 className="text-xl font-bold mb-4">Share "Cart"</h2>
            <p className="text-gray-500 mb-6">Anyone with access to this link can see your cart.</p>
            <button
              className={`btn-share-copy ${isCopied ? 'btn-share-copied' : ''}`}
              onClick={() => {
                const user = JSON.parse(localStorage.getItem('user'));
                const shareUrl = `${window.location.origin}/share/${user.share_token}`;
                navigator.clipboard.writeText(shareUrl);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
            >
              {isCopied ? "Link Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {/* Modal for displaying item details and allowing actions like adding notes, marking as purchased, or deleting the item */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddNote={handleAddNote}
          onMarkPurchased={handleMarkPurchased}
          onDelete={handleDelete}
          isCartPage={true}
        />
      )}
    </div>
  );
};

export default Cart;