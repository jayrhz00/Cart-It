import React, { useEffect, useState } from "react";
import { LuTrash2 } from "react-icons/lu";
import { apiRequest } from "./api";
import "../styles/full-item-editor.css";

function money(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return x.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function toEditableMoneyString(value, fallback) {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct >= 0) return String(direct);
  const fb = Number(fallback);
  if (Number.isFinite(fb) && fb >= 0) return String(fb);
  return "";
}

/**
 * One saved product: open link, purchased toggle + paid amount, notes, delete.
 */
export default function FullItemEditor({ item, onChanged }) {
  const [notes, setNotes] = useState(item.notes || "");
  const [paidStr, setPaidStr] = useState(
    toEditableMoneyString(item.purchase_price, item.current_price)
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setNotes(item.notes || "");
    setPaidStr(toEditableMoneyString(item.purchase_price, item.current_price));
  }, [item.item_id, item.notes, item.purchase_price, item.current_price]);

  const patch = async (body) => {
    setBusy(true);
    setMsg("");
    try {
      await apiRequest(`/api/cart-items/${item.item_id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await onChanged();
    } catch (e) {
      setMsg(e.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const handlePurchasedToggle = async (e) => {
    const checked = e.target.checked;
    if (!checked) {
      await patch({ is_purchased: false, purchase_price: null });
      return;
    }
    const paid = parseFloat(String(paidStr).replace(/,/g, ""), 10);
    const safe = Number.isNaN(paid) || paid < 0 ? Number(item.current_price) || 0 : paid;
    await patch({ is_purchased: true, purchase_price: safe });
  };

  const saveNotes = async () => {
    await patch({ notes: notes.trim() || null });
    setMsg("Notes saved.");
  };

  const savePaidOnly = async () => {
    const paid = parseFloat(String(paidStr).replace(/,/g, ""), 10);
    if (Number.isNaN(paid) || paid < 0) {
      setMsg("Enter a valid amount.");
      return;
    }
    await patch({ purchase_price: paid });
    setMsg("Purchase amount updated.");
  };

  const handleDelete = async () => {
    const label = (item.item_name || "this item").slice(0, 80);
    if (!window.confirm(`Remove "${label}"?`)) return;
    setBusy(true);
    setMsg("");
    try {
      await apiRequest(`/api/cart-items/${item.item_id}`, { method: "DELETE" });
      await onChanged();
    } catch (e) {
      setMsg(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="full-item-card">
      <div className="full-item-top">
        <a
          href={item.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="full-item-thumb"
        >
          {item.image_url ? (
            <img src={item.image_url} alt="" />
          ) : (
            <span className="full-item-thumb-fallback">{item.item_name?.slice(0, 3)}</span>
          )}
        </a>
        <div className="full-item-head">
          <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="full-item-title">
            {item.item_name}
          </a>
          {item.store ? <span className="full-item-store">{item.store}</span> : null}
          <div className="full-item-prices">
            <span>List: {money(item.current_price)}</span>
            {item.is_in_stock === false ? (
              <span className="full-item-stock-tag">Out of stock</span>
            ) : null}
            {item.is_purchased ? (
              <span className="full-item-purchased-tag">Purchased</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="full-item-delete"
          disabled={busy}
          aria-label={`Delete ${item.item_name}`}
          onClick={handleDelete}
        >
          <LuTrash2 size={18} />
        </button>
      </div>

      <div className="full-item-row">
        <label className="full-item-check">
          <input
            type="checkbox"
            checked={!!item.is_purchased}
            disabled={busy}
            onChange={handlePurchasedToggle}
          />
          <span>Mark as purchased</span>
        </label>
      </div>

      {item.is_purchased ? (
        <div className="full-item-row full-item-paid-row">
          <label className="full-item-paid-label" htmlFor={`paid-${item.item_id}`}>
            Amount paid
          </label>
          <input
            id={`paid-${item.item_id}`}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            value={paidStr ?? ""}
            onChange={(e) => setPaidStr(e.target.value)}
          />
          <button type="button" className="full-item-secondary-btn" disabled={busy} onClick={savePaidOnly}>
            Update amount
          </button>
        </div>
      ) : null}

      <div className="full-item-row full-item-notes">
        <label className="full-item-notes-label" htmlFor={`notes-${item.item_id}`}>
          Notes
        </label>
        <textarea
          id={`notes-${item.item_id}`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Sizing, coupons, reminders..."
        />
        <button type="button" className="full-item-primary-btn" disabled={busy} onClick={saveNotes}>
          Save notes
        </button>
      </div>

      {msg ? <p className="full-item-msg">{msg}</p> : null}
    </article>
  );
}
