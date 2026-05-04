import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
<<<<<<< HEAD
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
=======
import {
  LuArrowLeft,
  LuFilter,
  LuShare2,
  LuPen,
  LuUsers,
  LuTrash2,
} from "react-icons/lu";
import Sidebar from './sidebar';
import '../styles/wishlist.css';
import { apiRequest } from './api';

const formatMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "$0.00";
};

/** Checkbox "Purchased" copies list price into purchase_price; if list price was missing/$0, both stay zero. */
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

const Wishlist = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [group, setGroup] = useState(null);
  const [filter, setFilter] = useState("all");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [members, setMembers] = useState([]);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const groupId = Number(id);

  const loadAll = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    if (Number.isNaN(groupId)) {
      navigate("/dashboard");
      return;
    }
    const [groups, g, listItems, memberRows] = await Promise.all([
      apiRequest("/api/groups"),
      apiRequest(`/api/groups/${groupId}`),
      apiRequest(`/api/cart-items?group_id=${groupId}`),
      apiRequest("/api/group-members").catch(() => []),
    ]);
    setWishlists(Array.isArray(groups) ? groups : []);
    setGroup(g);
    const safeItems = Array.isArray(listItems) ? listItems : [];
    setItems(safeItems);
    setMembers(
      Array.isArray(memberRows)
        ? memberRows.filter((m) => Number(m.group_id) === Number(groupId))
        : []
    );
    setNoteDrafts((prev) => {
      const next = { ...prev };
      safeItems.forEach((item) => {
        if (next[item.item_id] === undefined) {
          next[item.item_id] = item.notes || "";
        }
      });
      return next;
    });
  }, [navigate, groupId]);
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012

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
<<<<<<< HEAD
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
=======
    loadAll().catch((e) => console.error(e));
  }, [loadAll]);

  useEffect(() => {
    if (filter === "inStock") setFilter("all");
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

  const listName = group?.group_name ?? group?.name ?? "Wishlist";

  const filteredItems = useMemo(() => {
    let list = [...items];
    if (filter === "open") list = list.filter((i) => !i.is_purchased);
    if (filter === "purchased") list = list.filter((i) => i.is_purchased);
    return list;
  }, [items, filter]);

  const totalOpen = useMemo(
    () =>
      items
        .filter((i) => !i.is_purchased)
        .reduce((s, i) => s + Number(i.current_price || 0), 0),
    [items]
  );

  const lastUpdated = useMemo(() => {
    const times = items
      .map((i) => i.created_at)
      .filter(Boolean)
      .map((d) => new Date(d).getTime());
    if (times.length === 0) return "—";
    return formatRelativeTime(
      new Date(Math.max(...times)).toISOString()
    );
  }, [items]);

  const isOwner =
    String(group?.access_role || "").toLowerCase() === "owner";

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
      await loadAll();
    } catch (e) {
      alert(e.message || "Could not save notes.");
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleTogglePurchased = async (item, checked) => {
    try {
      await apiRequest(`/api/cart-items/${item.item_id}`, {
        method: "PATCH",
        body: JSON.stringify({ purchased: !!checked }),
      });
      await loadAll();
    } catch (e) {
      alert(e.message || "Could not update this item.");
    }
  };

  const handleRemoveItem = async (item) => {
    const itemId = item?.item_id;
    if (!itemId) return;
    const label = (item.item_name || "this item").slice(0, 80);
    if (!window.confirm(`Remove “${label}” from this wishlist?`)) return;
    setDeletingId(itemId);
    try {
      await apiRequest(`/api/cart-items/${itemId}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      alert(e.message || "Could not remove this item.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRename = async () => {
    const next = window.prompt("New wishlist name:", listName);
    if (next == null) return;
    const t = next.trim();
    if (!t) return;
    try {
      await apiRequest(`/api/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ group_name: t }),
      });
      await loadAll();
    } catch (e) {
      alert(e.message || "Could not rename.");
    }
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

  const handleInvite = async () => {
    if (!isOwner) {
      alert("Only the owner can invite collaborators.");
      return;
    }
    const email = inviteEmail.trim();
    if (!email) {
      setInviteMsg("Enter an email first.");
      return;
    }
    try {
      const res = await apiRequest(`/api/groups/${groupId}/invite`, {
        method: "POST",
        body: JSON.stringify({ email, role: "Editor" }),
      });
      setInviteMsg(res?.message || "Invite sent.");
      setInviteEmail("");
    } catch (e) {
      setInviteMsg(e.message || "Invite failed.");
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
=======
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="back-link"
          >
            <LuArrowLeft /> Back to Wishlists
          </button>

          <div className="header-content">
            <h1 className="wishlist-title">{listName}</h1>

            <div className="stats">
              <span>
                Open items value: <strong>{formatMoney(totalOpen)}</strong>
              </span>
              <span className="text-gray-300">•</span>
              <span>Updated {lastUpdated}</span>
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
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
<<<<<<< HEAD
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
=======
            <div className="toolbar-filter-wrap">
              <LuFilter size={16} className="shrink-0 text-gray-500" aria-hidden />
              <select
                className="toolbar-filter-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter wishlist items"
              >
                <option value="all">All items</option>
                <option value="open">Not purchased</option>
                <option value="purchased">Purchased</option>
              </select>
            </div>
            <button type="button" className="tool-btn" onClick={handleShare}>
              <LuShare2 size={16} /> Share
            </button>
            {isOwner ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="tool-btn text-xs"
                  onClick={async () => {
                    try {
                      const next =
                        String(group?.visibility || "").toLowerCase() === "shared"
                          ? "Private"
                          : "Shared";
                      await apiRequest(`/api/groups/${groupId}`, {
                        method: "PATCH",
                        body: JSON.stringify({ visibility: next }),
                      });
                      setInviteMsg(
                        next === "Shared"
                          ? "List is now shared. Add a collaborator email below."
                          : "List is now private."
                      );
                      await loadAll();
                    } catch (e) {
                      setInviteMsg(e.message || "Could not update.");
                    }
                  }}
                >
                  {String(group?.visibility || "").toLowerCase() === "shared"
                    ? "Make private"
                    : "Make shared"}
                </button>
                {String(group?.visibility || "").toLowerCase() === "shared" ? (
                  <>
                    <input
                      type="email"
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Email to invite"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <button type="button" className="tool-btn" onClick={handleInvite}>
                      <LuUsers size={16} /> Invite
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
            <button type="button" className="tool-btn edit" onClick={handleRename}>
              <LuPen size={16} /> Rename list
            </button>
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
          </div>
          {String(group?.visibility || "").toLowerCase() === "shared" ? (
            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
              <p className="font-semibold">Members</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {group?.owner_id === undefined ? "Owner" : "Owner listed below"}
                </span>
                {members.length > 0 ? (
                  members.map((m) => (
                    <span
                      key={`${m.group_id}-${m.user_id}`}
                      className="rounded-full bg-slate-100 px-2 py-1 text-xs"
                    >
                      {(m.username || m.email || `User #${m.user_id}`)} - {m.role || "Editor"}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No collaborators yet.</span>
                )}
              </div>
            </div>
          ) : null}
          {inviteMsg ? <p className="text-sm text-gray-600">{inviteMsg}</p> : null}
        </header>

        {/* Section to display the items in the wishlist, with loading and empty states */ }
        <section className="item-grid">
<<<<<<< HEAD
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
=======
          {filteredItems.length === 0 ? (
            <p className="col-span-full text-gray-500">
              No items in this view. Add items with the browser extension.
            </p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.item_id}
                className="item-card"
                role={item.product_url ? "button" : undefined}
                tabIndex={item.product_url ? 0 : undefined}
                onClick={() => {
                  if (!item.product_url) return;
                  window.open(item.product_url, "_blank", "noopener,noreferrer");
                }}
                onKeyDown={(e) => {
                  if (!item.product_url) return;
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
                  <button
                    type="button"
                    className="wishlist-item-remove"
                    disabled={deletingId === item.item_id}
                    title="Remove from wishlist"
                    aria-label={`Remove ${item.item_name || "item"} from wishlist`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveItem(item);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <LuTrash2 size={18} aria-hidden />
                  </button>
                </div>
                <div className="item-details">
                  <p className="store">{item.store || "—"}</p>
                  <h3 className="name">{item.item_name}</h3>
                  <p className="price">
                    {item.is_purchased
                      ? purchasedPriceLabel(item)
                      : formatMoney(item.current_price)}
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={!!item.is_purchased}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleTogglePurchased(item, e.target.checked)}
                    />
                    Purchased
                  </label>
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
