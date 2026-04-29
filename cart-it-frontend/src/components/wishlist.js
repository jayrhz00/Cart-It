import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LuArrowLeft,
  LuFilter,
  LuShare2,
  LuPen,
  LuUsers,
} from "react-icons/lu";
import Sidebar from './sidebar';
import '../styles/wishlist.css';
import { apiRequest } from './api';

const formatMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "$0.00";
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

  useEffect(() => {
    loadAll().catch((e) => console.error(e));
  }, [loadAll]);

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
    if (filter === "inStock") list = list.filter((i) => i.is_in_stock !== false);
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

  return (
    <div className="page-wrapper">
      <div className="sidebar-container-wrapper">
        <Sidebar wishlists={sidebarLists} showExtension={false} />
      </div>

      <main className="detail-main">
        <header className="detail-header">
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
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className="tool-btn"
              onClick={() => {
                const next =
                  filter === "all"
                    ? "open"
                    : filter === "open"
                      ? "purchased"
                      : filter === "purchased"
                        ? "inStock"
                        : "all";
                setFilter(next);
              }}
            >
              <LuFilter size={16} />{" "}
              {filter === "all" && "All items"}
              {filter === "open" && "Not purchased"}
              {filter === "purchased" && "Purchased"}
              {filter === "inStock" && "In stock only"}
            </button>
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

        <section className="item-grid">
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
                </div>
                <div className="item-details">
                  <p className="store">{item.store || "—"}</p>
                  <h3 className="name">{item.item_name}</h3>
                  <p className="price">
                    {item.is_purchased
                      ? `Purchased ${formatMoney(item.purchase_price ?? item.current_price)}`
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
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};

export default Wishlist;
