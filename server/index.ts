import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";

import { pool } from "./db";
import { storage } from "./storage";

/**
 * Cart-It — Express API + PostgreSQL
 * ---------------------------------------------------------------------------
 * STUDENT CHEAT SHEET (how to explain this file in class):
 * - Express: a web server that listens for HTTP requests (GET, POST, etc.).
 * - Each `app.get` / `app.post` is an "endpoint" or "route" your React app calls.
 * - `authenticateToken`: middleware — runs BEFORE the route handler; checks JWT.
 * - JWT: JSON Web Token — proves "this request is from user X" without sending password again.
 * - `pool` (from db.ts): connection pool to PostgreSQL — runs SQL queries.
 * - `storage`: helper class for user/group rows (some routes use pool directly).
 * - On startup we run `schema.sql` once so all 6 tables exist (see initializeDatabase).
 */
dotenv.config();

// Make sure JWT secret exists before server starts
if (!process.env.JWT_SECRET) 
{
  throw new Error("JWT_SECRET is missing from .env");
}

// TYPE DEFINITIONS
// These help TypeScript understand what data
// is inside req.body and req.user

// Body for register route
interface RegisterBody 
{
  username: string;
  email: string;
  password: string;
}

// Body for login route
interface LoginBody 
{
  email: string;
  password: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  new_password: string;
}

// Body for create group route
interface CreateGroupBody 
{
  group_name: string;
  color?: string;
  visibility?: string;
}

interface UpdateGroupBody {
  group_name?: string;
  color?: string | null;
  visibility?: "Private" | "Shared";
}

interface InviteGroupMemberBody {
  email: string;
  role?: "Editor" | "Owner";
}

interface GroupCommentBody {
  body?: string;
}

interface CreateCartItemBody {
  group_id?: number | null;
  item_name: string;
  product_url: string;
  image_url?: string | null;
  store?: string | null;
  current_price: number;
  is_in_stock?: boolean;
  notes?: string | null;
}

interface UpdateCartItemBody {
  group_id?: number | null;
  item_name?: string;
  product_url?: string;
  image_url?: string | null;
  store?: string | null;
  current_price?: number;
  /** Saved only for the authenticated user (item_private_notes). */
  notes?: string | null;
  is_purchased?: boolean;
  purchase_price?: number | null;
}

// Custom request type for routes that use JWT
type AuthRequest<
  Body = any,
  Params = any
> = Request<Params, any, Body> & {
  user?: {
    userId: number;
    email: string;
  };
};

// EXPRESS APP SETUP
const app = express();
const PORT = Number(process.env.PORT) || 5000;
const PRICE_CHECK_INTERVAL_MINUTES = Number(process.env.PRICE_CHECK_INTERVAL_MINUTES || 180);
const RESET_PASSWORD_EXP_MINUTES = Math.max(
  5,
  Number(process.env.RESET_PASSWORD_EXP_MINUTES || 30)
);

// Allows frontend to talk to backend
app.use(cors());

// Allow backend to read JSON from req.body
app.use(express.json());

console.log("index.ts loaded");
console.log("login route loaded");

// JWT AUTH MIDDLEWARE
// Checks if user sent a valid token
// If valid, attaches decoded user info to req.user

function authenticateToken
(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];

  // Token normally comes in as: Bearer TOKEN_HERE
  const token = authHeader?.split(" ")[1];

  // If no token was sent, block access
  if (!token) 
  {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  try 
  {
    // Verify token using secret from .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as 
    {
      userId: number;
      email: string;
    };

    // Save decoded user info on request
    req.user = decoded;

    // Move to actual route
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
}

function parsePositivePrice(raw: unknown): number | null {
  const normalized =
    typeof raw === "string"
      ? (() => {
          let token = raw.replace(/\s+/g, "").replace(/[^0-9.,]/g, "");
          const hasComma = token.includes(",");
          const hasDot = token.includes(".");
          if (hasComma && hasDot) {
            const lastComma = token.lastIndexOf(",");
            const lastDot = token.lastIndexOf(".");
            if (lastComma > lastDot) {
              // 1.799,99 -> 1799.99
              token = token.replace(/\./g, "").replace(",", ".");
            } else {
              // 1,799.99 -> 1799.99
              token = token.replace(/,/g, "");
            }
          } else if (hasComma) {
            // 17,99 -> 17.99 ; 1,799 -> 1799
            token = /,\d{1,2}$/.test(token) ? token.replace(",", ".") : token.replace(/,/g, "");
          }
          return token;
        })()
      : raw;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Number(num.toFixed(2));
}

function getFrontendBaseUrl(): string {
  const raw = String(process.env.FRONTEND_URL || "https://cart-it.pages.dev").trim();
  return raw.replace(/\/+$/, "");
}

async function userCanAccessGroup(userId: number, groupId: number): Promise<boolean> {
  const r = await pool.query(
    `
    SELECT 1
    FROM groups g
    WHERE g.group_id = $1
      AND (
        g.owner_id = $2
        OR EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = g.group_id AND gm.user_id = $2
        )
      )
    LIMIT 1
    `,
    [groupId, userId]
  );
  return r.rows.length > 0;
}

async function userCanEditCartItemRow(
  editorUserId: number,
  row: { user_id: number; group_id: number | null }
): Promise<boolean> {
  if (row.user_id === editorUserId) return true;
  if (row.group_id == null) return false;
  return userCanAccessGroup(editorUserId, Number(row.group_id));
}

async function upsertPrivateNoteForItem(
  itemId: number,
  userId: number,
  notes: string | null
): Promise<void> {
  const trimmed = notes == null ? "" : String(notes).trim();
  if (!trimmed) {
    await pool.query(
      `DELETE FROM item_private_notes WHERE item_id = $1 AND user_id = $2`,
      [itemId, userId]
    );
    return;
  }
  await pool.query(
    `
    INSERT INTO item_private_notes (item_id, user_id, body, updated_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (item_id, user_id) DO UPDATE
    SET body = EXCLUDED.body, updated_at = CURRENT_TIMESTAMP
    `,
    [itemId, userId, trimmed]
  );
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendGroupInviteEmail({
  toEmail,
  toName,
  ownerName,
  groupName,
  inviteUrl,
}: {
  toEmail: string;
  toName?: string;
  ownerName: string;
  groupName: string;
  inviteUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || "").trim();

  if (!apiKey || !fromEmail) {
    return {
      sent: false,
      reason: "Invite email provider is not configured (RESEND_API_KEY/RESEND_FROM_EMAIL).",
    };
  }

  const safeToName = toName || toEmail;
  const safeOwner = ownerName || "A Cart-It user";
  const safeGroup = groupName || "your wishlist";
  const subject = `${safeOwner} invited you to collaborate on "${safeGroup}"`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin-bottom:8px">You were invited to a Cart-It wishlist</h2>
      <p style="margin-top:0">Hi ${safeToName},</p>
      <p><strong>${safeOwner}</strong> invited you to collaborate on <strong>${safeGroup}</strong>.</p>
      <p>
        Open Cart-It to view and manage the shared wishlist:
        <br />
        <a href="${inviteUrl}" target="_blank" rel="noreferrer">${inviteUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:13px">If this was not expected, you can ignore this email.</p>
    </div>
  `;

  return sendResendEmail({
    apiKey,
    fromEmail,
    toEmail,
    subject,
    html,
    genericErrorMessage: "Failed to contact invite email provider.",
  });
}

async function sendResendEmail({
  apiKey,
  fromEmail,
  toEmail,
  subject,
  html,
  text,
  genericErrorMessage,
}: {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  html: string;
  text?: string;
  genericErrorMessage: string;
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    const payload: Record<string, unknown> = {
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
    };
    if (text && text.trim()) {
      payload.text = text;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return {
        sent: false,
        reason: `Email API failed (${response.status})${details ? `: ${details}` : ""}`,
      };
    }

    return { sent: true };
  } catch (error: any) {
    return {
      sent: false,
      reason: error?.message || genericErrorMessage,
    };
  }
}

async function sendPriceDropEmail({
  toEmail,
  toName,
  itemName,
  previousPrice,
  latestPrice,
  dashboardUrl,
}: {
  toEmail: string;
  toName?: string;
  itemName: string;
  previousPrice: number;
  latestPrice: number;
  dashboardUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || "").trim();
  if (!apiKey || !fromEmail) {
    return {
      sent: false,
      reason: "Price-drop email provider is not configured (RESEND_API_KEY/RESEND_FROM_EMAIL).",
    };
  }

  const safeName = toName || toEmail;
  const safeItem = itemName || "an item";
  const subject = `Price dropped: ${safeItem}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin-bottom:8px">Price drop alert</h2>
      <p style="margin-top:0">Hi ${safeName},</p>
      <p>
        Good news — <strong>${safeItem}</strong> dropped in price:
        <br />
        <strong>$${previousPrice.toFixed(2)}</strong> → <strong>$${latestPrice.toFixed(2)}</strong>
      </p>
      <p>
        Open your dashboard to review the item:
        <br />
        <a href="${dashboardUrl}" target="_blank" rel="noreferrer">${dashboardUrl}</a>
      </p>
    </div>
  `;

  return sendResendEmail({
    apiKey,
    fromEmail,
    toEmail,
    subject,
    html,
    genericErrorMessage: "Failed to contact price-drop email provider.",
  });
}

async function sendOutOfStockEmail({
  toEmail,
  toName,
  itemName,
  dashboardUrl,
}: {
  toEmail: string;
  toName?: string;
  itemName: string;
  dashboardUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || "").trim();
  if (!apiKey || !fromEmail) {
    return {
      sent: false,
      reason: "Out-of-stock email provider is not configured (RESEND_API_KEY/RESEND_FROM_EMAIL).",
    };
  }

  const safeName = toName || toEmail;
  const safeItem = itemName || "an item";
  const subject = `Out of stock: ${safeItem}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin-bottom:8px">Stock alert</h2>
      <p style="margin-top:0">Hi ${safeName},</p>
      <p><strong>${safeItem}</strong> is currently marked out of stock.</p>
      <p>
        Open your dashboard to review alternatives or keep tracking:
        <br />
        <a href="${dashboardUrl}" target="_blank" rel="noreferrer">${dashboardUrl}</a>
      </p>
    </div>
  `;

  return sendResendEmail({
    apiKey,
    fromEmail,
    toEmail,
    subject,
    html,
    genericErrorMessage: "Failed to contact out-of-stock email provider.",
  });
}

async function sendPasswordResetEmail({
  toEmail,
  toName,
  resetUrl,
}: {
  toEmail: string;
  toName?: string;
  resetUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || "").trim();
  if (!apiKey || !fromEmail) {
    return {
      sent: false,
      reason: "Password reset email provider is not configured (RESEND_API_KEY/RESEND_FROM_EMAIL).",
    };
  }
  const safeNameHtml = escapeHtml(toName || toEmail);
  const safeNameText = toName || toEmail;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:#111827;max-width:520px">
      <h2 style="margin:0 0 8px;font-size:20px">Reset your Cart-It password</h2>
      <p style="margin:0 0 12px">Hi ${safeNameHtml},</p>
      <p style="margin:0 0 16px">Tap the button below to choose a new password. It expires in <strong>${RESET_PASSWORD_EXP_MINUTES} minutes</strong>.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px">
        <tr>
          <td style="border-radius:10px;background:#ea580c">
            <a href="${resetUrl}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;padding:14px 22px;font-weight:700;font-size:15px;color:#ffffff;text-decoration:none">
              Reset my password
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280">If the button does not open, use this link (tap or copy the whole line):</p>
      <p style="margin:0 0 20px;font-size:13px;word-break:break-all;line-height:1.4">
        <a href="${resetUrl}" style="color:#c2410c;font-weight:600" target="_blank" rel="noopener noreferrer">${resetUrl}</a>
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280">If you did not ask to reset your password, you can ignore this email.</p>
    </div>
  `;
  const text = [
    `Hi ${safeNameText},`,
    ``,
    `Reset your Cart-It password by opening this link in your browser. Copy the entire URL on the next line if it is not clickable:`,
    ``,
    resetUrl,
    ``,
    `This link expires in ${RESET_PASSWORD_EXP_MINUTES} minutes.`,
    ``,
    `If you did not request this, ignore this email.`,
  ].join("\n");
  return sendResendEmail({
    apiKey,
    fromEmail,
    toEmail,
    subject: "Reset your Cart-It password",
    html,
    text,
    genericErrorMessage: "Failed to contact password-reset email provider.",
  });
}

function extractPriceFromJsonLdObject(node: any): number | null {
  if (!node || typeof node !== "object") return null;
  const offers = node.offers || node.aggregateOffer || null;
  if (offers) {
    const direct = parsePositivePrice((offers as any).price);
    if (direct != null) return direct;
    const low = parsePositivePrice((offers as any).lowPrice);
    if (low != null) return low;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const nested = extractPriceFromJsonLdObject(child);
      if (nested != null) return nested;
    }
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") {
      const nested = extractPriceFromJsonLdObject(value);
      if (nested != null) return nested;
    }
  }
  return null;
}

function extractPriceFromHtml(html: string): number | null {
  const metaPatterns = [
    /property=["']product:price:amount["'][^>]*content=["']([0-9]+(?:\.[0-9]+)?)["']/i,
    /name=["']price["'][^>]*content=["']([0-9]+(?:\.[0-9]+)?)["']/i,
    /itemprop=["']price["'][^>]*content=["']([0-9]+(?:\.[0-9]+)?)["']/i,
  ];
  for (const re of metaPatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const metaPrice = parsePositivePrice(m[1]);
      if (metaPrice != null) return metaPrice;
    }
  }

  const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of jsonLdBlocks) {
    const content = block
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    if (!content) continue;
    try {
      const parsed = JSON.parse(content);
      const fromLd = extractPriceFromJsonLdObject(parsed);
      if (fromLd != null) return fromLd;
    } catch {
      // Ignore malformed JSON-LD block
    }
  }

  // Keep this fallback strict: require decimal format to avoid cents-like integers
  // from script blobs such as "price":1799 (which often means $17.99).
  const genericPriceMatch = html.match(/"price"\s*:\s*"?([0-9][0-9,]*\.[0-9]{1,2})"?/i);
  if (genericPriceMatch?.[1]) {
    const fallbackPrice = parsePositivePrice(genericPriceMatch[1]);
    if (fallbackPrice != null) return fallbackPrice;
  }
  return null;
}

function extractStockFromHtml(html: string): boolean | null {
  const availabilityUrlMatch = html.match(
    /"availability"\s*:\s*"(?:https?:\/\/schema\.org\/)?(InStock|OutOfStock|PreOrder|BackOrder|LimitedAvailability)"/i
  );
  if (availabilityUrlMatch?.[1]) {
    const token = availabilityUrlMatch[1].toLowerCase();
    if (token === "outofstock") return false;
    return true;
  }

  const outOfStockPatterns = [
    /\bout of stock\b/i,
    /\bsold out\b/i,
    /\bunavailable\b/i,
    /\bcurrently unavailable\b/i,
    /\btemporarily unavailable\b/i,
    /\bnotify me when available\b/i,
  ];
  for (const re of outOfStockPatterns) {
    if (re.test(html)) return false;
  }

  const inStockPatterns = [
    /\bin stock\b/i,
    /\bavailable now\b/i,
    /\badd to cart\b/i,
    /\bbuy now\b/i,
  ];
  for (const re of inStockPatterns) {
    if (re.test(html)) return true;
  }

  return null;
}

async function fetchProductSnapshotFromUrl(
  url: string
): Promise<{ price: number | null; inStock: boolean | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
    if (!res.ok) return { price: null, inStock: null };
    const html = await res.text();
    return {
      price: extractPriceFromHtml(html),
      inStock: extractStockFromHtml(html),
    };
  } catch {
    return { price: null, inStock: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function runPriceCheckCycle(): Promise<void> {
  try {
    const items = await pool.query(
      `
      SELECT ci.item_id, ci.user_id, ci.item_name, ci.product_url, ci.current_price, ci.is_in_stock, u.email, u.username
      FROM cart_items ci
      JOIN users u ON u.user_id = ci.user_id
      WHERE ci.is_purchased = false AND ci.product_url IS NOT NULL
      ORDER BY ci.item_id ASC
      `
    );

    for (const row of items.rows) {
      const itemId = Number(row.item_id);
      const userId = Number(row.user_id);
      const itemName = String(row.item_name || "Item");
      const productUrl = String(row.product_url || "").trim();
      const previousPrice = Number(row.current_price || 0);
      const previousInStock =
        typeof row.is_in_stock === "boolean" ? row.is_in_stock : true;
      const userEmail = String(row.email || "").trim();
      const username = String(row.username || "").trim();

      if (!productUrl) continue;
      const snapshot = await fetchProductSnapshotFromUrl(productUrl);
      const latestPrice = snapshot.price;
      const latestInStock = snapshot.inStock;

      if (latestInStock !== null && latestInStock !== previousInStock) {
        await pool.query(
          `UPDATE cart_items SET is_in_stock = $1 WHERE item_id = $2`,
          [latestInStock, itemId]
        );
      }

      if (latestInStock === false && previousInStock === true) {
        await pool.query(
          `
          INSERT INTO notifications (user_id, item_id, message, is_read)
          VALUES ($1, $2, $3, false)
          `,
          [userId, itemId, `${itemName} is currently out of stock.`]
        ).catch(() => {});
        if (userEmail) {
          await sendOutOfStockEmail({
            toEmail: userEmail,
            toName: username || userEmail,
            itemName,
            dashboardUrl: `${getFrontendBaseUrl()}/dashboard`,
          }).catch(() => {});
        }
      }

      if (latestPrice == null) continue;

      const changed = Math.abs(latestPrice - previousPrice) >= 0.01;
      if (!changed) continue;

      await pool.query(
        `UPDATE cart_items SET current_price = $1 WHERE item_id = $2`,
        [latestPrice, itemId]
      );
      await pool.query(
        `INSERT INTO price_history (item_id, price) VALUES ($1, $2)`,
        [itemId, latestPrice]
      );

      if (latestPrice < previousPrice) {
        await pool.query(
          `
          INSERT INTO notifications (user_id, item_id, message, is_read)
          VALUES ($1, $2, $3, false)
          `,
          [
            userId,
            itemId,
            `Price dropped for ${itemName}: $${previousPrice.toFixed(2)} -> $${latestPrice.toFixed(2)}`,
          ]
        );
        if (userEmail) {
          await sendPriceDropEmail({
            toEmail: userEmail,
            toName: username || userEmail,
            itemName,
            previousPrice,
            latestPrice,
            dashboardUrl: `${getFrontendBaseUrl()}/dashboard`,
          }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error("Price check cycle failed:", error);
  }
}

// DATABASE TEST
// Confirms backend can talk to PostgreSQL
pool
  .query("SELECT NOW()")
  .then((result) => console.log("Database TIME:", result.rows))
  .catch((err) => console.error("Database ERROR:", err));

// Runs once when the server starts: creates tables if missing (CREATE TABLE IF NOT EXISTS).
// Your professor can see the same definitions in server/schema.sql.
async function initializeDatabase(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf-8");
    await pool.query(schemaSql);
    await pool.query(
      `ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS is_in_stock BOOLEAN DEFAULT true NOT NULL`
    );
    await pool.query(
      `ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS group_comments TEXT`
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_private_notes (
        item_id INTEGER NOT NULL REFERENCES cart_items(item_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        body TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY (item_id, user_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_group_comments (
        comment_id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES cart_items(item_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_item_group_comments_item ON item_group_comments(item_id)`
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_comments (
        comment_id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_group_comments_group ON group_comments(group_id)`
    );
    await pool.query(`
      INSERT INTO item_private_notes (item_id, user_id, body, updated_at)
      SELECT ci.item_id, ci.user_id, ci.notes, ci.created_at
      FROM cart_items ci
      WHERE ci.notes IS NOT NULL AND LENGTH(TRIM(ci.notes)) > 0
      ON CONFLICT (item_id, user_id) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO item_group_comments (item_id, user_id, body)
      SELECT ci.item_id, ci.user_id, TRIM(ci.group_comments)
      FROM cart_items ci
      WHERE ci.group_comments IS NOT NULL AND LENGTH(TRIM(ci.group_comments)) > 0
        AND NOT EXISTS (SELECT 1 FROM item_group_comments c WHERE c.item_id = ci.item_id)
    `);
    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Database schema initialization failed:", error);
    throw error;
  }
}

// BASIC TEST ROUTES

// Root route to prove server exists
app.get("/", (_req: Request, res: Response) => {
  console.log("GET / hit");
  res.status(200).send("Cart-It server is running");
});

// Test route to prove PostgreSQL works
app.get("/test-db", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Database test route failed:", error);
    res.status(500).json({ message: "Database test failed" });
  }
});

// Preview available database tables + columns
app.get("/api/db/preview", async (_req: Request, res: Response) => {
  try {
    const tableResult = await pool.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name ASC
      `
    );

    const columnResult = await pool.query(
      `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name ASC, ordinal_position ASC
      `
    );

    res.status(200).json({
      tables: tableResult.rows.map((row) => row.table_name),
      columns: columnResult.rows,
    });
  } catch (error) {
    console.error("Database preview route failed:", error);
    res.status(500).json({ message: "Failed to preview database schema" });
  }
});


// REGISTER ROUTE
// Creates a new user with hashed password
app.post(
  "/api/register",
  async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    try {
      const { username, email, password } = req.body;

      // Make sure required fields were sent
      if (!username || !email || !password) 
      {
        return res.status(400).json({
          message: "Username, email, and password are required",
        });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);

      if (existingUser) 
      {
        return res.status(409).json({
          message: "Email is already registered",
        });
      }

      // Hash password before saving
      const password_hash = await bcrypt.hash(password, 10);

      // Save new user in database
      const newUser = await storage.createUser({
        username,
        email,
        password_hash,
      });

      // Send safe user info back to frontend
      return res.status(201).json({
        message: "User registered successfully",
        user: {
          userId: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.created_at,
        },
      });
    } catch (error) {
      console.error("Register route failed:", error);
      return res.status(500).json({
        message: "Registration failed",
      });
    }
  }
);

// LOGIN ROUTE
// Checks email & pw / returns JWT token
app.post(
  "/api/login",
  async (req: Request<{}, {}, LoginBody>, res: Response) => {
    try {
      const { email, password } = req.body;

      // Make sure both fields are present
      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
        });
      }

      // Find user by email
      const existingUser = await storage.getUserByEmail(email);

      // If no user found, login fails
      if (!existingUser) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      // Compare plain password to hashed password
      const isPasswordCorrect = await bcrypt.compare(
        password,
        existingUser.password_hash
      );

      if (!isPasswordCorrect) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      // Create JWT token
      const token = jwt.sign(
        {
          userId: existingUser.user_id,
          email: existingUser.email,
        },
        process.env.JWT_SECRET as string,
        // Longer expiry for class demos (change to "1h" in production if you prefer).
        { expiresIn: "7d" }
      );

      // Send token & safe user info to frontend
      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          userId: existingUser.user_id,
          username: existingUser.username,
          email: existingUser.email,
          createdAt: existingUser.created_at,
        },
      });
    } catch (error) {
      console.error("Login route failed:", error);
      return res.status(500).json({
        message: "Login failed",
      });
    }
  }
);

// Public route: always returns generic success message (prevents account enumeration).
app.post(
  "/api/auth/forgot-password",
  async (req: Request<{}, {}, ForgotPasswordBody>, res: Response) => {
    const genericMessage =
      "If an account with that email exists, a password reset link has been sent.";
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      if (!email) {
        return res.status(200).json({ message: genericMessage });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (!existingUser) {
        return res.status(200).json({ message: genericMessage });
      }
      const token = jwt.sign(
        {
          purpose: "password_reset",
          userId: existingUser.user_id,
          email: existingUser.email,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: `${RESET_PASSWORD_EXP_MINUTES}m` }
      );
      const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      const emailResult = await sendPasswordResetEmail({
        toEmail: existingUser.email,
        toName: existingUser.username || existingUser.email,
        resetUrl,
      });
      if (!emailResult.sent) {
        console.warn("Password reset email not sent:", emailResult.reason);
      }
      return res.status(200).json({ message: genericMessage });
    } catch (error) {
      console.error("Forgot password route failed:", error);
      return res.status(200).json({ message: genericMessage });
    }
  }
);

app.post(
  "/api/auth/reset-password",
  async (req: Request<{}, {}, ResetPasswordBody>, res: Response) => {
    try {
      const token = String(req.body?.token || "").trim();
      const newPassword = String(req.body?.new_password || "");
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required." });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        purpose?: string;
        userId?: number;
        email?: string;
      };
      if (
        decoded?.purpose !== "password_reset" ||
        !decoded?.userId ||
        !decoded?.email
      ) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }
      const existingUser = await storage.getUser(Number(decoded.userId));
      if (!existingUser || String(existingUser.email).toLowerCase() !== String(decoded.email).toLowerCase()) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }
      const password_hash = await bcrypt.hash(newPassword, 10);
      await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [
        password_hash,
        existingUser.user_id,
      ]);
      return res.status(200).json({ message: "Password reset successful. You can now log in." });
    } catch (error) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }
  }
);

// Returns currently authenticated user profile details
app.get("/api/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = await storage.getUser(req.user!.userId);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        userId: currentUser.user_id,
        username: currentUser.username,
        email: currentUser.email,
        createdAt: currentUser.created_at,
      },
    });
  } catch (error) {
    console.error("Fetch current user failed:", error);
    return res.status(500).json({ message: "Failed to fetch current user" });
  }
});

// GROUP ROUTES
// FRONTEND LINK:
// - Dashboard page calls /api/groups to render wishlist cards.
// - Wishlist page calls /api/groups/:id for one list and /api/groups/:id/invite for collaboration.
// - Create modal on dashboard calls POST /api/groups.

// GET groups you own plus shared lists where you are a collaborator
app.get("/api/groups", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await pool.query(
      `
      SELECT * FROM (
        SELECT g.*, 'Owner'::text AS access_role
        FROM groups g
        WHERE g.owner_id = $1
        UNION ALL
        SELECT g.*, gm.role::text AS access_role
        FROM groups g
        INNER JOIN group_members gm ON gm.group_id = g.group_id AND gm.user_id = $1
        WHERE g.owner_id <> $1
      ) AS combined
      ORDER BY combined.created_at DESC
      `,
      [userId]
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get groups failed:", error);

    return res.status(500).json({
      message: "Failed to fetch groups",
    });
  }
});

// GET one group if you own it or are a collaborator
app.get("/api/groups/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const group_id = Number(req.params.id);
    const userId = req.user!.userId;
    if (isNaN(group_id)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }
    const result = await pool.query(
      `
      SELECT
        g.*,
        CASE
          WHEN g.owner_id = $2 THEN 'Owner'
          ELSE COALESCE(
            (
              SELECT gm.role::text
              FROM group_members gm
              WHERE gm.group_id = g.group_id AND gm.user_id = $2
              LIMIT 1
            ),
            'Editor'
          )
        END AS access_role
      FROM groups g
      WHERE g.group_id = $1
        AND (
          g.owner_id = $2
          OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = g.group_id AND gm.user_id = $2
          )
        )
      `,
      [group_id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get group failed:", error);
    return res.status(500).json({ message: "Failed to fetch category" });
  }
});

app.get(
  "/api/groups/:id/comments",
  authenticateToken,
  async (req: AuthRequest<any, { id: string }>, res: Response) => {
    try {
      const group_id = Number(req.params.id);
      const userId = req.user!.userId;
      if (isNaN(group_id)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      const allowed = await userCanAccessGroup(userId, group_id);
      if (!allowed) {
        return res.status(404).json({ message: "Group not found" });
      }

      const rows = await pool.query(
        `
        SELECT
          gc.comment_id,
          gc.group_id,
          gc.user_id,
          gc.body,
          gc.created_at,
          u.username,
          u.email
        FROM group_comments gc
        JOIN users u ON u.user_id = gc.user_id
        WHERE gc.group_id = $1
        ORDER BY gc.created_at ASC, gc.comment_id ASC
        `,
        [group_id]
      );
      return res.status(200).json(rows.rows);
    } catch (error) {
      console.error("Fetch group-level comments failed:", error);
      return res.status(500).json({ message: "Failed to fetch group comments" });
    }
  }
);

app.post(
  "/api/groups/:id/comments",
  authenticateToken,
  async (req: AuthRequest<GroupCommentBody, { id: string }>, res: Response) => {
    try {
      const group_id = Number(req.params.id);
      const userId = req.user!.userId;
      const text = String(req.body?.body ?? "").trim();
      if (isNaN(group_id)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      if (!text) {
        return res.status(400).json({ message: "Comment text is required" });
      }
      const allowed = await userCanAccessGroup(userId, group_id);
      if (!allowed) {
        return res.status(404).json({ message: "Group not found" });
      }

      const ins = await pool.query(
        `
        INSERT INTO group_comments (group_id, user_id, body)
        VALUES ($1, $2, $3)
        RETURNING comment_id, group_id, user_id, body, created_at
        `,
        [group_id, userId, text]
      );
      const who = await storage.getUser(userId);
      return res.status(201).json({
        ...ins.rows[0],
        username: who?.username ?? null,
        email: who?.email ?? null,
      });
    } catch (error) {
      console.error("Post group-level comment failed:", error);
      return res.status(500).json({ message: "Failed to post group comment" });
    }
  }
);

// CREATE a new group for a user thats logged in 
app.post(
  "/api/groups",
  authenticateToken,
  async (req: AuthRequest<CreateGroupBody>, res: Response) => {
    try {
      const { group_name, color, visibility } = req.body;

      const owner_id = req.user!.userId;

      // Group name is required
      if (!group_name) {
        return res.status(400).json({
          message: "Group name is required",
        });
      }

      // Save group in database
      const newGroup = await storage.createGroup({
        owner_id,
        group_name,
        color,
        visibility,
      });

      return res.status(201).json({
        message: "Group created successfully",
        group: newGroup,
      });
    } catch (error) {
      console.error("Create group failed:", error);

      return res.status(500).json({
        message: "Failed to create group",
      });
    }
  }
);

// UPDATE group/category by id (name, color, visibility)
app.patch(
  "/api/groups/:id",
  authenticateToken,
  async (req: AuthRequest<UpdateGroupBody>, res: Response) => {
    try {
      const group_id = Number(req.params.id);
      const owner_id = req.user!.userId;
      const { group_name, color, visibility } = req.body;

      if (isNaN(group_id)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }

      const fieldsToUpdate: string[] = [];
      const values: Array<string | number | null> = [];
      let valueIndex = 1;

      if (group_name !== undefined) {
        fieldsToUpdate.push(`group_name = $${valueIndex++}`);
        values.push(group_name);
      }

      if (color !== undefined) {
        fieldsToUpdate.push(`color = $${valueIndex++}`);
        values.push(color);
      }

      if (visibility !== undefined) {
        fieldsToUpdate.push(`visibility = $${valueIndex++}`);
        values.push(visibility);
      }

      if (fieldsToUpdate.length === 0) {
        return res.status(400).json({
          message: "No valid fields were provided for update",
        });
      }

      values.push(group_id);
      values.push(owner_id);

      const result = await pool.query(
        `
        UPDATE groups
        SET ${fieldsToUpdate.join(", ")}
        WHERE group_id = $${valueIndex++} AND owner_id = $${valueIndex}
        RETURNING *
        `,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Group not found for this user",
        });
      }

      return res.status(200).json({
        message: "Group updated successfully",
        group: result.rows[0],
      });
    } catch (error) {
      console.error("Update group failed:", error);
      return res.status(500).json({
        message: "Failed to update group",
      });
    }
  }
);

// DELETE a group by id
app.delete(
  "/api/groups/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const group_id = Number(req.params.id);

      // Check if id is a valid number
      if (isNaN(group_id)) {
        return res.status(400).json({
          message: "Invalid group ID",
        });
      }

      // Delete from database
      const owner_id = req.user!.userId;
      const deleted = await storage.deleteGroup(group_id, owner_id);

      if (!deleted) {
        return res.status(404).json({
          message: "Group not found or you do not own it",
        });
      }

      return res.status(200).json({
        message: "Group deleted successfully",
      });
    } catch (error) {
      console.error("Delete group failed:", error);

      return res.status(500).json({
        message: "Failed to delete group",
      });
    }
  }
);

// SIMPLE DATA ROUTES FOR TESTING / FRONTEND
// These help prove DB is connected and let
// frontend pull real data
// FRONTEND LINK:
// - Extension and pages call /api/cart-items for item lists.
// - Notifications panel calls /api/notifications.
// - Analytics page calls /api/analytics/spending.

app.get("/api/users", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const owner_id = req.user!.userId;
    const result = await pool.query(
      "SELECT user_id, username, email, created_at FROM users WHERE user_id = $1",
      [owner_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch users failed:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/api/cart-items", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const rawQ = req.query.group_id;
    const groupIdStr =
      typeof rawQ === "string" ? rawQ : Array.isArray(rawQ) ? rawQ[0] : undefined;

    if (groupIdStr !== undefined && groupIdStr !== "") {
      const gid = Number(groupIdStr);
      if (isNaN(gid)) {
        return res.status(400).json({ message: "Invalid group_id query" });
      }
      const ok = await userCanAccessGroup(userId, gid);
      if (!ok) {
        return res.status(404).json({ message: "Category not found" });
      }
      const result = await pool.query(
        `
        SELECT
          ci.item_id,
          ci.user_id,
          ci.group_id,
          ci.item_name,
          ci.product_url,
          ci.image_url,
          ci.store,
          ci.current_price,
          ci.is_in_stock,
          ci.is_purchased,
          ci.purchase_price,
          ci.purchase_date,
          ci.created_at,
          COALESCE(ipn.body, ci.notes) AS notes
        FROM cart_items ci
        LEFT JOIN item_private_notes ipn ON ipn.item_id = ci.item_id AND ipn.user_id = $1
        WHERE ci.group_id = $2
        ORDER BY ci.item_id DESC
        `,
        [userId, gid]
      );
      return res.status(200).json(result.rows);
    }

    const result = await pool.query(
      `
      WITH visible AS (
        SELECT ci.*
        FROM cart_items ci
        WHERE ci.user_id = $1
           OR (
             ci.group_id IS NOT NULL
             AND (
               EXISTS (
                 SELECT 1 FROM groups g
                 WHERE g.group_id = ci.group_id AND g.owner_id = $1
               )
               OR EXISTS (
                 SELECT 1 FROM group_members gm
                 WHERE gm.group_id = ci.group_id AND gm.user_id = $1
               )
             )
           )
      )
      SELECT
        v.item_id,
        v.user_id,
        v.group_id,
        v.item_name,
        v.product_url,
        v.image_url,
        v.store,
        v.current_price,
        v.is_in_stock,
        v.is_purchased,
        v.purchase_price,
        v.purchase_date,
        v.created_at,
        COALESCE(ipn.body, v.notes) AS notes
      FROM visible v
      LEFT JOIN item_private_notes ipn ON ipn.item_id = v.item_id AND ipn.user_id = $1
      ORDER BY v.item_id DESC
      `,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch cart items failed:", error);
    res.status(500).json({ message: "Failed to fetch cart items" });
  }
});

// Dashboard route (JOINS multiple tables together)
app.get("/api/dashboard", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const owner_id = req.user!.userId;
    const result = await pool.query(`
      SELECT 
        ci.item_id,
        ci.item_name,
        ci.image_url,
        ci.store,
        ci.current_price,
        ci.is_purchased,
        COALESCE(ipn.body, ci.notes) AS notes,
        u.username,
        COALESCE(g.group_name, 'No Group') AS group_name,
        g.color AS group_color
      FROM cart_items ci
      JOIN users u ON ci.user_id = u.user_id
      LEFT JOIN groups g ON ci.group_id = g.group_id
      LEFT JOIN item_private_notes ipn ON ipn.item_id = ci.item_id AND ipn.user_id = $1
      WHERE ci.user_id = $1
      ORDER BY ci.item_id ASC;
    `, [owner_id]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Dashboard fetch failed:", error);
    res.status(500).json({
      message: "Failed to fetch dashboard data"
    });
  }
});

app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const owner_id = req.user!.userId;
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY notification_id ASC",
      [owner_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch notifications failed:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

app.get("/api/price-history", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const owner_id = req.user!.userId;
    const result = await pool.query(
      `
      SELECT ph.*
      FROM price_history ph
      JOIN cart_items ci ON ci.item_id = ph.item_id
      WHERE ci.user_id = $1
      ORDER BY ph.history_id ASC
      `,
      [owner_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch price history failed:", error);
    res.status(500).json({ message: "Failed to fetch price history" });
  }
});

// Spending / wishlist totals for analytics page
app.get("/api/analytics/spending", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const owner_id = req.user!.userId;
    const summary = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_items,
        COUNT(*) FILTER (WHERE is_purchased = true)::int AS purchased_count,
        COUNT(*) FILTER (WHERE is_purchased = false)::int AS open_count,
        COALESCE(SUM(purchase_price) FILTER (WHERE is_purchased = true), 0)::numeric AS total_spent,
        COALESCE(SUM(current_price) FILTER (WHERE is_purchased = false), 0)::numeric AS wishlist_value
      FROM cart_items
      WHERE user_id = $1
      `,
      [owner_id]
    );

    const byStore = await pool.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(store), ''), 'Unknown') AS store,
        COUNT(*)::int AS item_count,
        COALESCE(
          SUM(
            CASE
              WHEN is_purchased = true THEN COALESCE(purchase_price, current_price, 0)
              ELSE COALESCE(current_price, 0)
            END
          ),
          0
        )::numeric AS amount
      FROM cart_items
      WHERE user_id = $1
      GROUP BY 1
      ORDER BY amount DESC NULLS LAST
      LIMIT 15
      `,
      [owner_id]
    );

    return res.status(200).json({
      summary: summary.rows[0],
      by_store: byStore.rows,
    });
  } catch (error) {
    console.error("Analytics spending failed:", error);
    return res.status(500).json({ message: "Failed to load spending analytics" });
  }
});

app.get("/api/group-members", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const owner_id = req.user!.userId;
    const result = await pool.query(
      `
      SELECT
        gm.*,
        u.username,
        u.email
      FROM group_members gm
      JOIN groups g ON g.group_id = gm.group_id
      JOIN users u ON u.user_id = gm.user_id
      WHERE g.owner_id = $1 OR gm.user_id = $1
      ORDER BY gm.group_id ASC, gm.user_id ASC
      `,
      [owner_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch group members failed:", error);
    res.status(500).json({ message: "Failed to fetch group members" });
  }
});

app.post(
  "/api/groups/:id/invite",
  authenticateToken,
  async (req: AuthRequest<InviteGroupMemberBody, { id: string }>, res: Response) => {
    try {
      const group_id = Number(req.params.id);
      const owner_id = req.user!.userId;
      const email = String(req.body?.email || "").trim().toLowerCase();
      const role = req.body?.role === "Owner" ? "Owner" : "Editor";

      if (isNaN(group_id)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      if (!email) {
        return res.status(400).json({ message: "Invite email is required" });
      }

      const ownedGroup = await pool.query(
        `
        SELECT g.group_id, g.group_name, g.visibility, u.username AS owner_username, u.email AS owner_email
        FROM groups g
        JOIN users u ON u.user_id = g.owner_id
        WHERE g.group_id = $1 AND g.owner_id = $2
        `,
        [group_id, owner_id]
      );
      if (ownedGroup.rows.length === 0) {
        return res.status(404).json({ message: "Group not found or you do not own it" });
      }

      const invitedUser = await storage.getUserByEmail(email);
      if (!invitedUser) {
        return res.status(404).json({ message: "No Cart-It user found for that email yet." });
      }
      if (invitedUser.user_id === owner_id) {
        return res.status(400).json({ message: "You already own this wishlist." });
      }

      // Add or update collaborator role for this shared list.
      await pool.query(
        `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role
        `,
        [group_id, invitedUser.user_id, role]
      );

      // Safety: if owner invites someone to a private list, automatically make it shared.
      if (ownedGroup.rows[0].visibility !== "Shared") {
        await pool.query(`UPDATE groups SET visibility = 'Shared' WHERE group_id = $1`, [group_id]);
      }

      const inviteUrl = `${getFrontendBaseUrl()}/dashboard`;
      const emailResult = await sendGroupInviteEmail({
        toEmail: invitedUser.email,
        toName: invitedUser.username || invitedUser.email,
        ownerName: ownedGroup.rows[0].owner_username || ownedGroup.rows[0].owner_email || "A Cart-It user",
        groupName: ownedGroup.rows[0].group_name || "Shared wishlist",
        inviteUrl,
      });

      // Try to surface a join event in in-app notifications using any item in the shared list.
      // notifications.item_id is NOT NULL, so we can only create one if this list already has at least one item.
      const firstGroupItem = await pool.query(
        `SELECT item_id FROM cart_items WHERE group_id = $1 ORDER BY item_id ASC LIMIT 1`,
        [group_id]
      );
      if (firstGroupItem.rows.length > 0) {
        const itemId = firstGroupItem.rows[0].item_id;
        const invitedLabel = invitedUser.username || invitedUser.email || "A user";
        const groupLabel = ownedGroup.rows[0].group_name || "Shared wishlist";
        await pool.query(
          `
          INSERT INTO notifications (user_id, item_id, message, is_read)
          VALUES ($1, $2, $3, false)
          `,
          [owner_id, itemId, `${invitedLabel} joined "${groupLabel}" as Editor.`]
        );
      }

      return res.status(200).json({
        message: emailResult.sent
          ? "Invite sent successfully"
          : `Member added, but email was not sent: ${emailResult.reason}`,
        email_sent: emailResult.sent,
        email_error: emailResult.sent ? null : emailResult.reason,
        invited: {
          user_id: invitedUser.user_id,
          email: invitedUser.email,
          username: invitedUser.username,
        },
      });
    } catch (error) {
      console.error("Invite group member failed:", error);
      return res.status(500).json({ message: "Failed to invite member" });
    }
  }
);

// Create a wishlist row. User comes from JWT (req.user), NOT from the request body — safer.
app.post(
  "/api/cart-items",
  authenticateToken,
  async (req: AuthRequest<CreateCartItemBody>, res: Response) => {
  try 
  {
    const user_id = req.user!.userId;
    const {
      group_id,
      item_name,
      product_url,
      image_url,
      store,
      current_price,
      is_in_stock,
      notes,
    } = req.body;

    const itemName = typeof item_name === "string" ? item_name.trim() : "";
    const productUrl = typeof product_url === "string" && product_url.trim() !== ""
    ? product_url.trim()
    : (req.headers.referer || "");

    console.log("BODY FROM EXTENSION:", req.body);
    console.log("PRODUCT URL:", productUrl);

    const priceRaw =
      current_price === undefined || current_price === null
        ? 0
        : Number(current_price);
    const priceNum = Number.isFinite(priceRaw) ? priceRaw : NaN;

    if (!itemName) {
  return res.status(400).json({
    message: "Missing required field: item_name",
  });
}
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        message: "current_price must be a non-negative number",
      });
    }
    if (is_in_stock !== undefined && typeof is_in_stock !== "boolean") {
      return res.status(400).json({
        message: "is_in_stock must be a boolean when provided",
      });
    }

    let resolvedGroupId: number | null = null;
    if (group_id != null) {
      const gid = Number(group_id);
      if (Number.isNaN(gid)) {
        return res.status(400).json({ message: "Invalid category id" });
      }
      const access = await pool.query(
        `
        SELECT 1 FROM groups g
        WHERE g.group_id = $1
          AND (
            g.owner_id = $2
            OR EXISTS (
              SELECT 1 FROM group_members gm
              WHERE gm.group_id = g.group_id AND gm.user_id = $2
            )
          )
        `,
        [gid, user_id]
      );
      if (access.rows.length === 0) {
        return res.status(400).json({
          message: "That category does not exist or you cannot save to it.",
        });
      }
      resolvedGroupId = gid;
    }

    // Persist item row first (cart_items is the source of truth shown in UI cards).
    const itemResult = await pool.query(
      `
      INSERT INTO cart_items 
      (user_id, group_id, item_name, product_url, image_url, store, current_price, is_in_stock, notes, is_purchased)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, false)
      RETURNING item_id
      `,
      [
        user_id,
        resolvedGroupId,
        itemName,
        productUrl,
        image_url ?? null,
        store ?? null,
        priceNum,
        is_in_stock === false ? false : true,
      ]
    );

    // STEP 4: Get the new item's ID
    // PostgreSQL returns the new item_id so we can use it next
    const newItemId = itemResult.rows[0].item_id;

    if (notes !== undefined && notes !== null && String(notes).trim() !== "") {
      await upsertPrivateNoteForItem(newItemId, user_id, String(notes));
    }

    // STEP 5: Insert into price_history
    // This starts tracking the item's price over time
    await pool.query(
      `
      INSERT INTO price_history (item_id, price)
      VALUES ($1, $2)
      `,
      [newItemId, priceNum]
    );

    // STEP 6: Send success response back to frontend
    // This tells React/extension that everything worked
    res.status(201).json({
      message: "Item saved successfully",
      item_id: newItemId
    });

  } catch (error: unknown) {
    console.error("Error saving item:", error);
    const err = error as { code?: string };
    if (err.code === "23503") {
      return res.status(400).json({
        message:
          "Database rejected the save (bad category link). Pick a category you created, or leave category empty.",
      });
    }
    res.status(500).json({
      message: "Failed to save item",
    });
  }
  }
);

app.patch(
  "/api/cart-items/:id",
  authenticateToken,
  async (req: AuthRequest<UpdateCartItemBody, { id: string }>, res: Response) => {
    try {
      const item_id = Number(req.params.id);
      const owner_id = req.user!.userId;
      if (isNaN(item_id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      const fieldsToUpdate: string[] = [];
      const values: Array<string | number | boolean | null> = [];
      let valueIndex = 1;

      const {
        group_id,
        item_name,
        product_url,
        image_url,
        store,
        current_price,
        notes,
        is_purchased,
        purchase_price,
      } = req.body;

      if (group_id !== undefined) {
        fieldsToUpdate.push(`group_id = $${valueIndex++}`);
        values.push(group_id);
      }
      if (item_name !== undefined) {
        fieldsToUpdate.push(`item_name = $${valueIndex++}`);
        values.push(item_name);
      }
      if (product_url !== undefined) {
        fieldsToUpdate.push(`product_url = $${valueIndex++}`);
        values.push(product_url);
      }
      if (image_url !== undefined) {
        fieldsToUpdate.push(`image_url = $${valueIndex++}`);
        values.push(image_url);
      }
      if (store !== undefined) {
        fieldsToUpdate.push(`store = $${valueIndex++}`);
        values.push(store);
      }
      if (current_price !== undefined) {
        if (Number(current_price) < 0) {
          return res.status(400).json({
            message: "current_price must be a non-negative number",
          });
        }
        fieldsToUpdate.push(`current_price = $${valueIndex++}`);
        values.push(current_price);
      }
      if (is_purchased !== undefined) {
        fieldsToUpdate.push(`is_purchased = $${valueIndex++}`);
        values.push(is_purchased);
      }
      if (purchase_price !== undefined) {
        if (purchase_price !== null && Number(purchase_price) < 0) {
          return res.status(400).json({
            message: "purchase_price must be null or a non-negative number",
          });
        }
        fieldsToUpdate.push(`purchase_price = $${valueIndex++}`);
        values.push(purchase_price);
      }

      const ownerCheck = await pool.query(
        `
        SELECT user_id, group_id, current_price, item_name
        FROM cart_items
        WHERE item_id = $1
        `,
        [item_id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      const canEdit = await userCanEditCartItemRow(owner_id, {
        user_id: ownerCheck.rows[0].user_id,
        group_id: ownerCheck.rows[0].group_id,
      });
      if (!canEdit) {
        return res.status(403).json({ message: "You cannot update this item" });
      }

      let savedPrivateNotes = false;
      if (notes !== undefined) {
        await upsertPrivateNoteForItem(item_id, owner_id, notes);
        savedPrivateNotes = true;
      }

      if (fieldsToUpdate.length === 0 && !savedPrivateNotes) {
        return res.status(400).json({
          message: "No valid fields were provided for update",
        });
      }

      const previousPrice = Number(ownerCheck.rows[0].current_price ?? 0);
      const previousItemName = String(ownerCheck.rows[0].item_name || "Item");

      let updatedRow: Record<string, unknown>;
      if (fieldsToUpdate.length > 0) {
        values.push(item_id);
        const result = await pool.query(
          `
          UPDATE cart_items
          SET ${fieldsToUpdate.join(", ")}
          WHERE item_id = $${valueIndex}
          RETURNING *
          `,
          values
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Item not found" });
        }
        updatedRow = result.rows[0];

        const nextPrice =
          current_price !== undefined && Number.isFinite(Number(current_price))
            ? Number(current_price)
            : previousPrice;
        if (current_price !== undefined && nextPrice < previousPrice) {
          const itemOwnerId = ownerCheck.rows[0].user_id;
          await pool.query(
            `
            INSERT INTO notifications (user_id, item_id, message, is_read)
            VALUES ($1, $2, $3, false)
            `,
            [
              itemOwnerId,
              item_id,
              `Price dropped for ${previousItemName}: $${previousPrice.toFixed(2)} -> $${nextPrice.toFixed(2)}`,
            ]
          ).catch(() => {});
          const notifyUser = await storage.getUser(itemOwnerId);
          const ownerEmail = String(notifyUser?.email || "").trim();
          if (ownerEmail) {
            await sendPriceDropEmail({
              toEmail: ownerEmail,
              toName: notifyUser?.username || ownerEmail,
              itemName: previousItemName,
              previousPrice,
              latestPrice: nextPrice,
              dashboardUrl: `${getFrontendBaseUrl()}/dashboard`,
            }).catch(() => {});
          }
        }
      } else {
        const full = await pool.query(`SELECT * FROM cart_items WHERE item_id = $1`, [item_id]);
        updatedRow = full.rows[0];
      }

      const noteRow = await pool.query(
        `SELECT body AS notes FROM item_private_notes WHERE item_id = $1 AND user_id = $2`,
        [item_id, owner_id]
      );
      const mergedItem = {
        ...updatedRow,
        notes: noteRow.rows[0]?.notes ?? null,
      };

      return res.status(200).json({
        message: "Item updated successfully",
        item: mergedItem,
      });
    } catch (error) {
      console.error("Update item failed:", error);
      return res.status(500).json({ message: "Failed to update item" });
    }
  }
);

app.delete("/api/cart-items/:id", authenticateToken, async (req: AuthRequest<any, { id: string }>, res: Response) => {
  try {
    const item_id = Number(req.params.id);
    const owner_id = req.user!.userId;

    if (isNaN(item_id)) {
      return res.status(400).json({
        message: "Invalid item ID",
      });
    }

    const ownerCheck = await pool.query(
      `
      SELECT user_id, group_id
      FROM cart_items
      WHERE item_id = $1
      `,
      [item_id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    const canDelete = await userCanEditCartItemRow(owner_id, {
      user_id: ownerCheck.rows[0].user_id,
      group_id: ownerCheck.rows[0].group_id,
    });
    if (!canDelete) {
      return res.status(403).json({
        message: "You cannot delete this item",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM cart_items
      WHERE item_id = $1
      RETURNING item_id
      `,
      [item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    return res.status(200).json({
      message: "Item deleted successfully",
      item_id: result.rows[0].item_id,
    });
  } catch (error) {
    console.error("Delete item failed:", error);
    return res.status(500).json({
      message: "Failed to delete item",
    });
  }
});

app.get(
  "/api/cart-items/:id/group-comments",
  authenticateToken,
  async (req: AuthRequest<any, { id: string }>, res: Response) => {
    try {
      const item_id = Number(req.params.id);
      const userId = req.user!.userId;
      if (isNaN(item_id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      const row = await pool.query(
        `SELECT user_id, group_id FROM cart_items WHERE item_id = $1`,
        [item_id]
      );
      if (row.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }
      const canView = await userCanEditCartItemRow(userId, {
        user_id: row.rows[0].user_id,
        group_id: row.rows[0].group_id,
      });
      if (!canView) {
        return res.status(403).json({ message: "You cannot view comments for this item" });
      }

      const thread = await pool.query(
        `
        SELECT
          c.comment_id,
          c.item_id,
          c.user_id,
          c.body,
          c.created_at,
          u.username,
          u.email
        FROM item_group_comments c
        JOIN users u ON u.user_id = c.user_id
        WHERE c.item_id = $1
        ORDER BY c.created_at ASC, c.comment_id ASC
        `,
        [item_id]
      );
      return res.status(200).json(thread.rows);
    } catch (error) {
      console.error("Fetch group comments failed:", error);
      return res.status(500).json({ message: "Failed to fetch group comments" });
    }
  }
);

app.post(
  "/api/cart-items/:id/group-comments",
  authenticateToken,
  async (req: AuthRequest<{ body?: string }, { id: string }>, res: Response) => {
    try {
      const item_id = Number(req.params.id);
      const userId = req.user!.userId;
      const text = String(req.body?.body ?? "").trim();
      if (isNaN(item_id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      if (!text) {
        return res.status(400).json({ message: "Comment text is required" });
      }

      const row = await pool.query(
        `SELECT user_id, group_id FROM cart_items WHERE item_id = $1`,
        [item_id]
      );
      if (row.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }
      const canPost = await userCanEditCartItemRow(userId, {
        user_id: row.rows[0].user_id,
        group_id: row.rows[0].group_id,
      });
      if (!canPost) {
        return res.status(403).json({ message: "You cannot comment on this item" });
      }

      const ins = await pool.query(
        `
        INSERT INTO item_group_comments (item_id, user_id, body)
        VALUES ($1, $2, $3)
        RETURNING comment_id, item_id, user_id, body, created_at
        `,
        [item_id, userId, text]
      );
      const who = await storage.getUser(userId);
      return res.status(201).json({
        ...ins.rows[0],
        username: who?.username ?? null,
        email: who?.email ?? null,
      });
    } catch (error) {
      console.error("Post group comment failed:", error);
      return res.status(500).json({ message: "Failed to post comment" });
    }
  }
);

app.get("/api/cart-items/:id/notes", authenticateToken, async (req: AuthRequest<any, { id: string }>, res: Response) => {
  try {
    const item_id = Number(req.params.id);
    const owner_id = req.user!.userId;
    if (isNaN(item_id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const result = await pool.query(
      `
      SELECT ci.item_id, ci.user_id, ci.group_id, COALESCE(ipn.body, ci.notes) AS notes
      FROM cart_items ci
      LEFT JOIN item_private_notes ipn ON ipn.item_id = ci.item_id AND ipn.user_id = $2
      WHERE ci.item_id = $1
      `,
      [item_id, owner_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    const canView = await userCanEditCartItemRow(owner_id, {
      user_id: result.rows[0].user_id,
      group_id: result.rows[0].group_id,
    });
    if (!canView) {
      return res.status(403).json({ message: "You cannot view notes for this item" });
    }

    return res.status(200).json({
      item_id: result.rows[0].item_id,
      notes: result.rows[0].notes,
    });
  } catch (error) {
    console.error("Fetch item notes failed:", error);
    return res.status(500).json({ message: "Failed to fetch item notes" });
  }
});

app.patch(
  "/api/cart-items/:id/notes",
  authenticateToken,
  async (req: AuthRequest<{ notes: string | null }, { id: string }>, res: Response) => {
    try {
      const item_id = Number(req.params.id);
      const owner_id = req.user!.userId;
      const { notes } = req.body;

      if (isNaN(item_id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      if (notes !== null && typeof notes !== "string") {
        return res.status(400).json({ message: "notes must be a string or null" });
      }

      const ownerCheck = await pool.query(
        `
        SELECT user_id, group_id
        FROM cart_items
        WHERE item_id = $1
        `,
        [item_id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      const canEditNotes = await userCanEditCartItemRow(owner_id, {
        user_id: ownerCheck.rows[0].user_id,
        group_id: ownerCheck.rows[0].group_id,
      });
      if (!canEditNotes) {
        return res.status(403).json({ message: "You cannot update notes for this item" });
      }

      await upsertPrivateNoteForItem(item_id, owner_id, notes);

      const readBack = await pool.query(
        `SELECT body AS notes FROM item_private_notes WHERE item_id = $1 AND user_id = $2`,
        [item_id, owner_id]
      );

      return res.status(200).json({
        message: "Item notes updated successfully",
        item: {
          item_id,
          notes: readBack.rows[0]?.notes ?? null,
        },
      });
    } catch (error) {
      console.error("Update item notes failed:", error);
      return res.status(500).json({ message: "Failed to update item notes" });
    }
  }
);

// START SERVER
// FINAL RUNTIME FLOW:
// 1) Load schema/tables.
// 2) Start HTTP server.
// 3) Start background price/stock worker loop.
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });

    const intervalMs = Math.max(5, PRICE_CHECK_INTERVAL_MINUTES) * 60 * 1000;
    console.log(`Price checker enabled: every ${Math.max(5, PRICE_CHECK_INTERVAL_MINUTES)} minute(s)`);
    setTimeout(() => {
      runPriceCheckCycle().catch(() => {});
    }, 15000);
    setInterval(() => {
      runPriceCheckCycle().catch(() => {});
    }, intervalMs);

  } catch (error) {
    console.error("Server startup failed:", error);
  }
}

startServer();

