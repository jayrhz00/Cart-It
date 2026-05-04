import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuFilter, LuShare2, LuPen, LuUsers, LuTrash2 } from "react-icons/lu";
import Sidebar from './sidebar';
import ItemDetailModal from './item-modal';
import { LoadingState, EmptyState } from './feedback';
import {
  getWishlistDetails,
  getWishlistItems,
  getWishlists,
  removeItemsFromWishlist,
  addCollaborator
} from '../services/api';
import '../styles/detail-view.css';

/**
 * Wishlist Component
 * Manages individual user collections.
 * Users are able to sort, edit, share wishlist, and invite other users to collab.
 * Delete List functionailty for owners of the wishlist only. 
 */

const Wishlist = () => {
  const { id } = useParams(); // Get the wishlist ID from the URL parameters
  const navigate = useNavigate(); // Hook for navigation
  const [items, setItems] = useState([]); // State to hold the items in the wishlist
  const [wishlistInfo, setWishlistInfo] = useState({ name: 'Loading...', total: '$0.00' }); // State to hold the wishlist details like name and total price
  const [lastUpdated, setLastUpdated] = useState(null); // State to track the last updated time of the wishlist for display purposes
  const [isLoading, setIsLoading] = useState(true); // State to indicate loading status while fetching wishlist data
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode for bulk actions on items
  const [selectedIds, setSelectedIds] = useState([]); // State to track which item IDs are currently selected for bulk actions
  const [showShareModal, setShowShareModal] = useState(false); // State to control the visibility of the share modal for sharing the wishlist
  const [showCollabModal, setShowCollabModal] = useState(false); // State to control the visibility of the collaboration modal for adding collaborators to the wishlist
  const [collabEmail, setCollabEmail] = useState(""); // State to hold the email input for adding a collaborator
  const [collabStatus, setCollabStatus] = useState('idle'); // State to track the status of the collaboration invite process (idle, sending, success, error)
  const [showFilterMenu, setShowFilterMenu] = useState(false); // State to control the visibility of the filter menu for sorting items
  const [sortBy, setSortBy] = useState('newest'); // State to track the current sorting option selected for the items in the wishlist
  const [selectedItem, setSelectedItem] = useState(null); // State to hold the currently selected item for displaying in the item detail modal
  const [sidebarWishlists, setSidebarWishlists] = useState([]); // State to hold the list of wishlists for display in the sidebar
  const [isConfirming, setIsConfirming] = useState(null); // State to track if the user is in the process of confirming a destructive action 
  const [isCopied, setIsCopied] = useState(false); // State to indicate whether the share link has been copied to the clipboard 
  const [errorMessage, setErrorMessage] = useState(""); // State to hold any error messages that occur during collaboration invite process 

  // Helper function to calculate and format the "time ago" string based on the last updated date of the wishlist
  const getTimeAgo = (date) => {
    if (!date) return "...";
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Effect hook to fetch the wishlist details, items, and sidebar wishlists when the component mounts or when the wishlist ID changes
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return navigate('/login');

    const loadPageData = async () => {
      setIsLoading(true);
      try {
        const [details, itemsList, sidebarData] = await Promise.all([
          getWishlistDetails(id, user.user_id), // Fetch the details of the current wishlist including name, total price, and user role (owner/editor)
          getWishlistItems(id, user.user_id), // Fetch the list of items in the current wishlist for the user
          getWishlists(user.user_id) // Fetch the list of all wishlists for the user to display in the sidebar for easy navigation between wishlists
        ]);

        setWishlistInfo(details);
        setItems(itemsList);
        setSidebarWishlists(sidebarData);

        if (itemsList.length > 0) {
          const latest = Math.max(...itemsList.map(i => new Date(i.updated_at || i.saved_at).getTime()));
          setLastUpdated(new Date(latest));
        }
      } catch (err) {
        console.error("Error loading wishlist page:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [id, navigate]);

  // Effect hook to update the "last updated" time every minute to keep the display of how recently the wishlist was updated accurate without needing a full page refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(prev => (prev ? new Date(prev) : null));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Function to handle selecting or deselecting all items in the wishlist for bulk actions when in edit mode
  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.item_id));
    }
  };

  // Function to handle bulk actions (moving items to cart or deleting items) on the selected items in the wishlist
  const handleBulkAction = async (actionType) => {
    if (isConfirming !== actionType) {
      setIsConfirming(actionType);
      setTimeout(() => setIsConfirming(null), 3000);
      return;
    }

    try {
      if (actionType === 'remove') {
        await removeItemsFromWishlist(selectedIds);
      } else if (actionType === 'purge') {
        await fetch('http://localhost:3000/api/items/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds })
        });
      }

      setItems(items.filter(item => !selectedIds.includes(item.item_id)));
      setSelectedIds([]);
      setIsEditing(false);
      setIsConfirming(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Action failed:", err);
      setIsConfirming(null);
    }
  };

  // Function to handle deleting the entire wishlist, with a confirmation step to prevent accidental deletion
  const handleDeleteWishlist = async () => {
    if (isConfirming !== 'delete-list') {
      setIsConfirming('delete-list');
      setTimeout(() => setIsConfirming(null), 4000);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/wishlists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Failed to delete wishlist:", err);
    }
  };

  // Function to handle adding a collaborator to the wishlist by email
  const handleCollab = async () => {
    if (!collabEmail) return;
    setCollabStatus('sending');
    setErrorMessage("");
    try {
      await addCollaborator(id, collabEmail);
      setCollabStatus('success');
      setCollabEmail("");
      setTimeout(() => {
        setCollabStatus('idle');
        setShowCollabModal(false);
      }, 2500);
    } catch (err) {
      setCollabStatus('error');
      setErrorMessage(err.message || "User does not have a Cart-It account.");
      setTimeout(() => {
        setCollabStatus('idle');
        setErrorMessage("");
      }, 4000);
    }
  };

  // Function to toggle the selection of an individual item when in edit mode for bulk actions
  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Sort the items based on the selected sorting option 
  const sortedItems = [...items].sort((a, b) => {
    const priceA = parseFloat(a.price) || 0;
    const priceB = parseFloat(b.price) || 0;
    if (sortBy === 'price-low-to-high') return priceA - priceB;
    if (sortBy === 'price-high-to-low') return priceB - priceA;
    if (sortBy === 'oldest') return new Date(a.saved_at) - new Date(b.saved_at);
    return new Date(b.saved_at) - new Date(a.saved_at);
  });

  const wishlistTotal = items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

  return (
    <div className="page-wrapper">
      <div className="sidebar-container-wrapper">
        <Sidebar wishlists={sidebarWishlists} showExtension={false} />
      </div>

      <main className="detail-main">
        <header className="detail-header">
          <div className="flex justify-between items-start w-full">
            <div className="header-left">
              <button onClick={() => navigate('/dashboard')} className="back-link">
                <LuArrowLeft /> Back to Dashboard
              </button>

              <div className="header-content">
                <h1 className="wishlist-title">{wishlistInfo.name}</h1>
                <div className="stats">
                  <span>Total Price: <strong>${wishlistTotal.toFixed(2)}</strong></span>
                  <span className="text-gray-300">•</span>
                  <span>Updated {getTimeAgo(lastUpdated)}</span>
                  {/* If the user's role for this wishlist is "editor", display a badge indicating that this is a shared wishlist that they do not own */ }
                  {wishlistInfo.role === 'editor' && (
                    <span className="text-purple-700 font-medium">Shared with you</span>
                  )}
                </div>
              </div>
            </div>

            {/* If the user is the owner of the wishlist, display a delete button with a confirmation step to allow them to delete the entire wishlist */ }
            {wishlistInfo.role === 'owner' && (
              <button
                className={`btn-delete-list ${isConfirming === 'delete-list' ? 'btn-delete-confirm' : ''}`}
                onClick={handleDeleteWishlist}
              >
                <LuTrash2 size={16} />
                {isConfirming === 'delete-list' ? "Confirm Delete?" : "Delete List"}
              </button>
            )}
          </div>

            {/* Toolbar with options to filter/sort items, share the wishlist, manage collaborators, and toggle edit mode for bulk actions */ }
          <div className="toolbar">
            <div className="filter-wrapper">
              {sortBy === 'newest' ? (
                <button className="tool-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
                  <LuFilter size={16} /> Filter
                </button>
              ) : (
                <div className="filter-pill-active">
                  <span className="filter-pill-text">{sortBy.replace(/-/g, ' ')}</span>
                  <button className="filter-reset-btn" onClick={() => setSortBy('newest')}>
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

            <button className="tool-btn" onClick={() => setShowShareModal(true)}>
              <LuShare2 size={16} /> Share
            </button>
            <button className="tool-btn" onClick={() => setShowCollabModal(true)}>
              <LuUsers size={16} /> Collab
            </button>

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
              <>
                <button
                  className="tool-btn border-gray-300 text-gray-700"
                  onClick={() => handleBulkAction('remove')}
                >
                  {isConfirming === 'remove' ? "Confirm Move?" : "Move to Cart Only"}
                </button>
                <button
                  className="btn-bulk-delete"
                  onClick={() => handleBulkAction('purge')}
                >
                  {isConfirming === 'purge' ? "Confirm Delete?" : "Delete from List & Cart"}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Section to display the items in the wishlist, with loading and empty states */ }
        <section className="item-grid">
          {isLoading ? (
            <LoadingState message="Loading your wishlist..." />
          ) : items.length === 0 ? (
            <EmptyState message="No items in this wishlist yet." />
          ) : (
            sortedItems.map(item => (
              <div
                key={item.item_id}
                className={`item-card ${isEditing && selectedIds.includes(item.item_id) ? 'selected-ring' : ''}`}
                onClick={() => !isEditing && setSelectedItem(item)}
              >
                {isEditing && (
                  <input
                    type="checkbox"
                    className="item-checkbox"
                    checked={selectedIds.includes(item.item_id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelection(item.item_id);
                    }}
                  />
                )}
                <div className="img-wrapper">
                  <img src={item.image_url} alt={item.product_name} />
                </div>
                <div className="item-details">
                  <p className="store">{item.store_name}</p>
                  <h3 className="name">{item.product_name}</h3>
                  <p className="price">${parseFloat(item.price).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Modal for sharing the wishlist, which generates a shareable link */ }
        {showShareModal && (
          <div className="modal-overlay" onClick={() => { setShowShareModal(false); setIsCopied(false); }}>
            <div className="share-modal" onClick={e => e.stopPropagation()}>
              <button className="close-modal" onClick={() => setShowShareModal(false)}>✕</button>
              <h2 className="text-xl font-bold mb-4">Share List</h2>
              <p className="text-gray-500 mb-6">Anyone with this link can view this wishlist.</p>
              <button
                className={`btn-share-copy ${isCopied ? 'btn-share-copied' : ''}`}
                onClick={() => {
                  const user = JSON.parse(localStorage.getItem('user'));
                  const shareUrl = `${window.location.origin}/share-wishlist/${user.share_token}/${id}`;
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

        {/* Modal for managing collaborators, allowing the user to add a collaborator by email to edit the wishlist together */ }
        {showCollabModal && (
          <div className="modal-overlay" onClick={() => { setShowCollabModal(false); setCollabStatus('idle'); }}>
            <div className="share-modal" onClick={e => e.stopPropagation()}>
              <button className="close-modal" onClick={() => setShowCollabModal(false)}>✕</button>
              <h2 className="text-xl font-bold mb-4">Collaborate</h2>
              <p className="text-gray-500 mb-4 text-sm">Add a friend via email to edit this list together.</p>

              <input
                className={`collab-input ${collabStatus === 'error' ? 'input-error' : ''}`}
                placeholder="friend@email.com"
                value={collabEmail}
                onChange={e => setCollabEmail(e.target.value)}
                disabled={collabStatus === 'sending'}
              />

              <div className="error-container">
                {collabStatus === 'error' && (
                  <p className="error-text">{errorMessage}</p>
                )}
              </div>

              <button
                className={`btn-collab-submit 
                  ${collabStatus === 'success' ? 'bg-green-600' : ''}
                  ${collabStatus === 'error' ? 'bg-red-600' : 'bg-[#DB8046] hover:bg-[#b86835]'}
                  ${collabStatus === 'sending' ? 'opacity-70 cursor-not-allowed' : ''}`}
                onClick={handleCollab}
                disabled={collabStatus === 'sending' || collabStatus === 'success'}
              >
                {collabStatus === 'idle' && "Send Invite"}
                {collabStatus === 'sending' && "Sending..."}
                {collabStatus === 'success' && "Invite Sent!"}
                {collabStatus === 'error' && "Try Again"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal to display the details of a selected item when the user clicks on an item card */ }
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          isCartPage={false}
        />
      )}
    </div>
  );
};

export default Wishlist;