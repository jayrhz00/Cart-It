import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuFilter, LuShare2, LuPen, LuArrowLeft } from "react-icons/lu";
import Sidebar from './sidebar';
<<<<<<< HEAD
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
=======
import '../styles/wishlist.css';
import { apiRequest } from './api';

const formatMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "$0.00";
};

const purchasedPriceLabel = (item) => {
  const n = Number(item.purchase_price ?? item.current_price);
  if (Number.isFinite(n) && n > 0) return `Purchased ${formatMoney(n)}`;
  return "Purchased (no price on file)";
};

const formatRelativeTime = (iso) => {
  if (!iso) return "recently";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "recently";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const Cart = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [filter, setFilter] = useState("all");
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState({});
  const [moveGroupId, setMoveGroupId] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNoteId, setSavingNoteId] = useState(null);

  const load = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    const [groups, cart] = await Promise.all([
      apiRequest("/api/groups"),
      apiRequest("/api/cart-items"),
    ]);
    setWishlists(Array.isArray(groups) ? groups : []);
    const safeItems = Array.isArray(cart) ? cart : [];
    setItems(safeItems);
    setNoteDrafts((prev) => {
      const next = { ...prev };
      safeItems.forEach((item) => {
        if (next[item.item_id] === undefined) {
          next[item.item_id] = item.notes || "";
        }
      });
      return next;
    });
  }, [navigate]);

  useEffect(() => {
    load().catch((e) => console.error(e));
  }, [load]);

  useEffect(() => {
    if (filter === "inStock" || filter === "outOfStock") setFilter("all");
  }, [filter]);

  const sidebarLists = useMemo(
    () =>
      wishlists.map((w) => ({
        id: w.group_id ?? w.id,
        name: w.group_name ?? w.name ?? "Untitled",
        visibility: w.visibility || "Private",
      })),
    [wishlists]
  );

  const filteredItems = useMemo(() => {
    let list = [...items];
    if (filter === "open") list = list.filter((i) => !i.is_purchased);
    if (filter === "purchased") list = list.filter((i) => i.is_purchased);
    return list;
  }, [items, filter]);

  const cartTotal = useMemo(
    () =>
      filteredItems.reduce((s, i) => {
        const price = i.is_purchased
          ? Number(i.purchase_price ?? i.current_price ?? 0)
          : Number(i.current_price || 0);
        return s + price;
      }, 0),
    [filteredItems]
  );

  const lastUpdated = useMemo(() => {
    const times = items
      .map((i) => i.created_at || i.purchase_date)
      .filter(Boolean)
      .map((d) => new Date(d).getTime())
      .filter((n) => !Number.isNaN(n));
    if (times.length === 0) return "—";
    const latest = new Date(Math.max(...times)).toISOString();
    return formatRelativeTime(latest);
  }, [items]);

  const toggleSelect = (id) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard.");
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) {
      alert("Select items to remove (turn on Edit, then use checkboxes).");
      return;
    }
    if (!window.confirm(`Remove ${ids.length} item(s) from your cart?`)) return;
    for (const id of ids) {
      await apiRequest(`/api/cart-items/${id}`, { method: "DELETE" });
    }
    setSelected({});
    setEditMode(false);
    await load();
  };

  const handleMoveSelected = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) {
      alert("Select items first, then choose a wishlist.");
      return;
    }
    const parsed = Number(moveGroupId);
    if (!Number.isFinite(parsed)) {
      alert("Choose a destination wishlist first.");
      return;
    }
    const targetGroup = parsed === 0 ? null : parsed;
    try {
      for (const id of ids) {
        await apiRequest(`/api/cart-items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ group_id: targetGroup }),
        });
      }
      setSelected({});
      setMoveGroupId("");
      setEditMode(false);
      await load();
    } catch (error) {
      alert(error.message || "Could not move selected items.");
    }
  };

  const handleSaveNotes = async (item) => {
    const itemId = item?.item_id;
    if (!itemId) return;
    setSavingNoteId(itemId);
    try {
      await apiRequest(`/api/cart-items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          notes: String(noteDrafts[itemId] ?? "").trim() || null,
        }),
      });
      await load();
    } catch (error) {
      alert(error.message || "Could not save notes.");
    } finally {
      setSavingNoteId(null);
    }
  };
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012

  return (
    <div className="page-wrapper">
      <div className="sidebar-container-wrapper">
<<<<<<< HEAD
        <Sidebar wishlists={sidebarWishlists} showExtension={false} />
=======
        <Sidebar wishlists={sidebarLists} showExtension={false} />
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
      </div>

      <main className="detail-main">
        <header className="detail-header">
<<<<<<< HEAD
          <button onClick={() => navigate('/dashboard')} className="back-link">
=======
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="back-link"
          >
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
            <LuArrowLeft /> Back to Dashboard
          </button>

          {/* Header section displaying the title "Cart", total price of items, and last updated time */}
          <div className="header-content">
            <h1 className="wishlist-title">Cart</h1>
<<<<<<< HEAD
            <div className="stats">
              <span>Total Price: <strong>${cartTotal.toFixed(2)}</strong></span>
              <span className="text-gray-300">•</span>
              <span>Updated {getTimeAgo(lastUpdated)}</span>
=======

            <div className="stats">
              <span>
                Total (visible items): <strong>{formatMoney(cartTotal)}</strong>
              </span>
              <span className="text-gray-300">•</span>
              <span>Updated {lastUpdated}</span>
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
            </div>
          </div>

          {/* Toolbar with sorting, filtering, sharing, and editing options for the cart items */}
          <div className="toolbar">
<<<<<<< HEAD
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
=======
            <div className="toolbar-filter-wrap">
              <LuFilter size={16} className="shrink-0 text-gray-500" aria-hidden />
              <select
                className="toolbar-filter-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter cart items"
              >
                <option value="all">All items</option>
                <option value="open">Not purchased</option>
                <option value="purchased">Purchased</option>
              </select>
            </div>
            <button type="button" className="tool-btn" onClick={handleShare}>
              <LuShare2 size={16} /> Share
            </button>
            <button
              type="button"
              className={`tool-btn edit ${editMode ? "ring-2 ring-offset-2 ring-[#DB8046]" : ""}`}
              onClick={() => {
                setEditMode((e) => !e);
                if (editMode) setSelected({});
              }}
            >
              <LuPen size={16} /> {editMode ? "Done" : "Edit"}
            </button>
            {editMode ? (
              <>
                <select
                  className="tool-btn"
                  value={moveGroupId}
                  onChange={(e) => setMoveGroupId(e.target.value)}
                >
                  <option value="">Move selected to...</option>
                  <option value="0">No wishlist (cart only)</option>
                  {wishlists.map((w) => {
                    const id = w.group_id ?? w.id;
                    const name = w.group_name ?? w.name ?? "Untitled";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                <button type="button" className="tool-btn" onClick={handleMoveSelected}>
                  Move selected
                </button>
                <button type="button" className="tool-btn" onClick={handleDeleteSelected}>
                  Remove selected
                </button>
              </>
            ) : null}
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Tip: Click Edit to select items, then move them to a wishlist or remove them.
          </p>
        </header>

        {/* Section to display the cart items in a grid layout, with loading and empty states */}
        <section className="item-grid">
<<<<<<< HEAD
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
=======
          {filteredItems.length === 0 ? (
            <p className="col-span-full text-gray-500">
              No cart items match this filter.
            </p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.item_id}
                className="item-card"
                role={!editMode && item.product_url ? "button" : undefined}
                tabIndex={!editMode && item.product_url ? 0 : undefined}
                onClick={() => {
                  if (editMode || !item.product_url) return;
                  window.open(item.product_url, "_blank", "noopener,noreferrer");
                }}
                onKeyDown={(e) => {
                  if (editMode || !item.product_url) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    window.open(item.product_url, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <div className="img-wrapper">
                  <img
                    src={item.image_url || "/logo.png"}
                    alt={item.item_name || "Product"}
                    onError={(e) => {
                      e.currentTarget.src = "/logo.png";
                    }}
                  />
                  {editMode ? (
                    <input
                      type="checkbox"
                      className="select-check"
                      checked={!!selected[item.item_id]}
                      onChange={() => toggleSelect(String(item.item_id))}
                    />
                  ) : null}
                </div>
                <div className="item-details">
                  <p className="store">{item.store || "—"}</p>
                  <h3 className="name">{item.item_name}</h3>
                  <p className="price">
                    {item.is_purchased
                      ? purchasedPriceLabel(item)
                      : formatMoney(item.current_price)}
                  </p>
                  <textarea
                    rows={2}
                    className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                    value={noteDrafts[item.item_id] ?? item.notes ?? ""}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({
                        ...prev,
                        [item.item_id]: e.target.value,
                      }))
                    }
                    placeholder="Add notes (size, quality, reminders)"
                  />
                  <button
                    type="button"
                    className="mt-2 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    disabled={savingNoteId === item.item_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveNotes(item);
                    }}
                  >
                    {savingNoteId === item.item_id ? "Saving..." : "Save notes"}
                  </button>
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
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
