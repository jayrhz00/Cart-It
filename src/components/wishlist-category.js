import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashShell from "./dash-shell";
import FullItemEditor from "./full-item-editor";
import { apiRequest } from "./api";
import "../styles/wishlist-page.css";

function formatCommentTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function groupCommentAuthorParts(c) {
  const username = (c.username && String(c.username).trim()) || "";
  const email = (c.email && String(c.email).trim()) || "";
  return {
    primary: username || email || `User #${c.user_id}`,
    secondary: username && email ? email : null,
  };
}

/**
 * Individual wishlist (one category): items, purchased, notes, delete.
 * Route: /wishlist/:groupId
 */
export default function WishlistCategoryPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [groupThread, setGroupThread] = useState([]);
  const [newGroupComment, setNewGroupComment] = useState("");
  const [groupThreadBusy, setGroupThreadBusy] = useState(false);

  const handleVisibilityChange = async (nextVisibility) => {
    if (!group) return;
    try {
      await apiRequest(`/api/groups/${group.group_id}`, {
        method: "PATCH",
        body: JSON.stringify({ visibility: nextVisibility }),
      });
      await load();
      setInviteStatus("");
    } catch (e) {
      setError(e.message || "Could not update wishlist visibility.");
    }
  };

  const handleInviteMember = async () => {
    if (!group) return;
    const email = inviteEmail.trim();
    if (!email) {
      setInviteStatus("Enter an email address first.");
      return;
    }
    try {
      const result = await apiRequest(`/api/groups/${group.group_id}/invite`, {
        method: "POST",
        body: JSON.stringify({ email, role: "Editor" }),
      });
      setInviteStatus(result?.message || "Invite sent.");
      setInviteEmail("");
    } catch (e) {
      setInviteStatus(e.message || "Could not send invite.");
    }
  };

  const load = useCallback(async () => {
    const gid = Number(groupId);
    if (!groupId || Number.isNaN(gid)) {
      setError("Invalid category.");
      return;
    }
    const [g, list, comments] = await Promise.all([
      apiRequest(`/api/groups/${gid}`),
      apiRequest(`/api/cart-items?group_id=${encodeURIComponent(String(gid))}`),
      apiRequest(`/api/groups/${gid}/comments`).catch(() => []),
    ]);
    setGroup(g);
    setItems(Array.isArray(list) ? list : []);
    setGroupThread(Array.isArray(comments) ? comments : []);
    setError("");
  }, [groupId]);

  const postGroupComment = async () => {
    const gid = Number(groupId);
    const text = newGroupComment.trim();
    if (!gid || Number.isNaN(gid) || !text) return;
    setGroupThreadBusy(true);
    try {
      await apiRequest(`/api/groups/${gid}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      const fresh = await apiRequest(`/api/groups/${gid}/comments`);
      setGroupThread(Array.isArray(fresh) ? fresh : []);
      setNewGroupComment("");
      setInviteStatus("Comment posted.");
    } catch (e) {
      setInviteStatus(e.message || "Could not post group comment.");
    } finally {
      setGroupThreadBusy(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    (async () => {
      try {
        await load();
      } catch (e) {
        setError(e.message || "Could not load this wishlist.");
      }
    })();
  }, [navigate, load]);

  return (
    <DashShell>
      <button type="button" className="page-back-link" onClick={() => navigate("/dashboard")}>
        Back to dashboard
      </button>
      {error ? <p className="status-message">{error}</p> : null}
      {!error && group ? (
        <>
          <header className="wishlist-page-header">
            <div>
              <h1 className="dash-title wishlist-page-title">{group.group_name}</h1>
              <p className="wishlist-page-sub">
                {items.length} {items.length === 1 ? "item" : "items"} in this wishlist
              </p>
            </div>
          </header>
          <div className="wishlist-page-controls">
            <label htmlFor="wishlistVisibility">Visibility</label>
            <select
              id="wishlistVisibility"
              value={group.visibility || "Private"}
              onChange={(e) => handleVisibilityChange(e.target.value)}
            >
              <option value="Private">Private</option>
              <option value="Shared">Shared</option>
            </select>
            {String(group.visibility || "").toLowerCase() === "shared" ? (
              <>
                <div className="invite-row">
                  <input
                    type="email"
                    className="invite-input"
                    placeholder="Invite collaborator by email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <button type="button" className="invite-btn" onClick={handleInviteMember}>
                    Invite
                  </button>
                </div>
                <p className="wishlist-page-sub">Shared wishlist: invite collaborators by email.</p>
              </>
            ) : (
              <p className="wishlist-page-sub">Private wishlist: only you can see items.</p>
            )}
            {inviteStatus ? <p className="wishlist-page-sub">{inviteStatus}</p> : null}
          </div>
          {String(group?.visibility || "").toLowerCase() === "shared" ? (
            <section className="wishlist-group-comments">
              <h2 className="wishlist-group-comments-title">Group Chat</h2>
              <p className="wishlist-page-sub">
                One comment box for this whole wishlist (all items).
              </p>
              <div className="wishlist-group-thread" aria-live="polite">
                {groupThread.length === 0 ? (
                  <p className="wishlist-group-thread-empty">No comments yet — start the discussion below.</p>
                ) : (
                  groupThread.map((c) => {
                    const { primary, secondary } = groupCommentAuthorParts(c);
                    return (
                      <div key={c.comment_id} className="wishlist-group-thread-row">
                        <div className="wishlist-group-thread-meta">
                          <div className="wishlist-group-thread-author">
                            <span className="wishlist-group-thread-by">Posted by </span>
                            <strong>{primary}</strong>
                            {secondary ? <span className="wishlist-group-thread-sub">{secondary}</span> : null}
                          </div>
                          <span className="wishlist-group-thread-time">{formatCommentTime(c.created_at)}</span>
                        </div>
                        <div className="wishlist-group-thread-body">{c.body}</div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="wishlist-group-comment-compose">
                <textarea
                  rows={2}
                  value={newGroupComment}
                  onChange={(e) => setNewGroupComment(e.target.value)}
                  placeholder="Talk about the whole wishlist..."
                />
                <button type="button" className="invite-btn" disabled={groupThreadBusy} onClick={postGroupComment}>
                  {groupThreadBusy ? "Posting…" : "Post to wishlist"}
                </button>
              </div>
            </section>
          ) : null}
          <section className="wishlist-page-list">
            {items.length === 0 ? (
              <div className="empty-inline">No items in this category yet. Save from the extension or add one on the dashboard.</div>
            ) : (
              items.map((item) => (
                <FullItemEditor
                  key={item.item_id}
                  item={item}
                  onChanged={load}
                  showGroupComments={false}
                />
              ))
            )}
          </section>
        </>
      ) : null}
    </DashShell>
  );
}
