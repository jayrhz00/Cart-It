import React, { useCallback, useEffect, useRef, useState } from "react";
import { LuBell } from "react-icons/lu";
import { apiRequest } from "./api";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

/**
 * In-app notification inbox (GET/PATCH /api/notifications). Bell lives in the sidebar chrome.
 */
export default function NotificationBell({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(null);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    try {
      const [rows, feat] = await Promise.all([
        apiRequest("/api/notifications"),
        apiRequest("/api/me/features").catch(() => null),
      ]);
      setItems(Array.isArray(rows) ? rows : []);
      if (feat && typeof feat.resend_email_configured === "boolean") {
        setEmailConfigured(feat.resend_email_configured);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(load, 60000);
    const onFocus = () => load();
    const onItems = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("cartit:items-updated", onItems);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cartit:items-updated", onItems);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    try {
      await apiRequest(`/api/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_read: true }),
      });
      await load();
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/api/notifications/mark-all-read", { method: "POST" });
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`notification-bell-wrap ${className}`.trim()} ref={wrapRef}>
      <button
        type="button"
        className="notification-bell-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
      >
        <LuBell size={22} aria-hidden />
        {unreadCount > 0 ? (
          <span className="notification-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notifications</span>
            {items.some((n) => !n.is_read) ? (
              <button type="button" className="notification-mark-all" onClick={() => markAllRead()}>
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="notification-dropdown-body">
            {loading && items.length === 0 ? (
              <p className="notification-empty">Loading…</p>
            ) : items.length === 0 ? (
              <p className="notification-empty">No notifications yet.</p>
            ) : (
              items.map((n) => {
                const read = Boolean(n.is_read);
                return (
                  <button
                    key={n.notification_id}
                    type="button"
                    className={`notification-row${read ? "" : " notification-row--unread"}`}
                    onClick={() => {
                      if (!read) markRead(n.notification_id);
                    }}
                  >
                    <span className="notification-msg">{n.message || ""}</span>
                    <span className="notification-time">{formatWhen(n.created_at)}</span>
                  </button>
                );
              })
            )}
          </div>
          {emailConfigured === false ? (
            <p className="notification-footer-hint">
              Email alerts (price drops, etc.) need{" "}
              <code className="notification-code">RESEND_*</code> on the server.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
