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

interface CreateCartItemBody {
  group_id?: number | null;
  item_name: string;
  product_url: string;
  image_url?: string | null;
  store?: string | null;
  current_price: number;
  notes?: string | null;
}

interface UpdateCartItemBody {
  group_id?: number | null;
  item_name?: string;
  product_url?: string;
  image_url?: string | null;
  store?: string | null;
  current_price?: number;
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
        { expiresIn: "1h" }
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

// GET all groups that belong to a user that is logged in
app.get("/api/groups", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const owner_id = req.user!.userId;

    const groups = await storage.getGroupsByOwner(owner_id);

    return res.status(200).json(groups);
  } catch (error) {
    console.error("Get groups failed:", error);

    return res.status(500).json({
      message: "Failed to fetch groups",
    });
  }
});

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
      const deleted = await storage.deleteGroup(group_id);

      if (!deleted) {
        return res.status(404).json({
          message: "Group not found",
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

app.get("/api/users", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT user_id, username, email, created_at FROM users ORDER BY user_id ASC");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch users failed:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/api/cart-items", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const owner_id = req.user!.userId;
    const result = await pool.query(
      `
      SELECT *
      FROM cart_items
      WHERE user_id = $1
      ORDER BY item_id ASC
      `,
      [owner_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch cart items failed:", error);
    res.status(500).json({ message: "Failed to fetch cart items" });
  }
});

// Dashboard route (JOINS multiple tables together)
app.get("/api/dashboard", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        ci.item_id,
        ci.item_name,
        ci.image_url,
        ci.store,
        ci.current_price,
        ci.is_purchased,
        ci.notes,
        u.username,
        COALESCE(g.group_name, 'No Group') AS group_name,
        g.color AS group_color
      FROM cart_items ci
      JOIN users u ON ci.user_id = u.user_id
      LEFT JOIN groups g ON ci.group_id = g.group_id
      ORDER BY ci.item_id ASC;
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Dashboard fetch failed:", error);
    res.status(500).json({
      message: "Failed to fetch dashboard data"
    });
  }
});

app.get("/api/notifications", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications ORDER BY notification_id ASC"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch notifications failed:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

app.get("/api/price-history", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM price_history ORDER BY history_id ASC"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch price history failed:", error);
    res.status(500).json({ message: "Failed to fetch price history" });
  }
});

app.get("/api/group-members", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM group_members ORDER BY group_id ASC, user_id ASC"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch group members failed:", error);
    res.status(500).json({ message: "Failed to fetch group members" });
  }
});

// Create a wishlist row. User comes from JWT (req.user), NOT from the request body — safer.
app.post(
  "/api/cart-items",
  authenticateToken,
  async (req: AuthRequest<CreateCartItemBody>, res: Response) => {
  try 
  {
    const user_id = req.user!.userId;
    const 
    {
      group_id,
      item_name,
      product_url,
      image_url,
      store,
      current_price,
      notes
    } = req.body;

    if (!item_name || !product_url || current_price === undefined) {
      return res.status(400).json({
        message: "Missing required fields (item_name, product_url, current_price)"
      });
    }
    if (Number(current_price) < 0) {
      return res.status(400).json({
        message: "current_price must be a non-negative number"
      });
    }

    const itemResult = await pool.query(
      `
      INSERT INTO cart_items 
      (user_id, group_id, item_name, product_url, image_url, store, current_price, notes, is_purchased)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
      RETURNING item_id
      `,
      [
        user_id,
        group_id || null,
        item_name,
        product_url,
        image_url ?? null,
        store ?? null,
        current_price,
        notes || null
      ]
    );

    // STEP 4: Get the new item's ID
    // PostgreSQL returns the new item_id so we can use it next
    const newItemId = itemResult.rows[0].item_id;

    // STEP 5: Insert into price_history
    // This starts tracking the item's price over time
    await pool.query(
      `
      INSERT INTO price_history (item_id, price)
      VALUES ($1, $2)
      `,
      [newItemId, current_price]
    );

    // STEP 6: Send success response back to frontend
    // This tells React/extension that everything worked
    res.status(201).json({
      message: "Item saved successfully",
      item_id: newItemId
    });

  } catch (error) {
    // ERROR HANDLING
    console.error("Error saving item:", error);

    res.status(500).json({
      message: "Failed to save item"
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
      if (notes !== undefined) {
        fieldsToUpdate.push(`notes = $${valueIndex++}`);
        values.push(notes);
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

      if (fieldsToUpdate.length === 0) {
        return res.status(400).json({
          message: "No valid fields were provided for update",
        });
      }

      const ownerCheck = await pool.query(
        `
        SELECT user_id
        FROM cart_items
        WHERE item_id = $1
        `,
        [item_id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (ownerCheck.rows[0].user_id !== owner_id) {
        return res.status(403).json({ message: "You cannot update this item" });
      }

      values.push(item_id);
      const result = await pool.query(
        `
        UPDATE cart_items
        SET ${fieldsToUpdate.join(", ")}
        WHERE item_id = $${valueIndex}
        RETURNING *
        `
      , values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      return res.status(200).json({
        message: "Item updated successfully",
        item: result.rows[0],
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
      SELECT user_id
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

    if (ownerCheck.rows[0].user_id !== owner_id) {
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

app.get("/api/cart-items/:id/notes", authenticateToken, async (req: AuthRequest<any, { id: string }>, res: Response) => {
  try {
    const item_id = Number(req.params.id);
    const owner_id = req.user!.userId;
    if (isNaN(item_id)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    const result = await pool.query(
      `
      SELECT item_id, user_id, notes
      FROM cart_items
      WHERE item_id = $1
      `,
      [item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (result.rows[0].user_id !== owner_id) {
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
        SELECT user_id
        FROM cart_items
        WHERE item_id = $1
        `,
        [item_id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (ownerCheck.rows[0].user_id !== owner_id) {
        return res.status(403).json({ message: "You cannot update notes for this item" });
      }

      const result = await pool.query(
        `
        UPDATE cart_items
        SET notes = $1
        WHERE item_id = $2
        RETURNING item_id, notes
        `,
        [notes, item_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Item not found" });
      }

      return res.status(200).json({
        message: "Item notes updated successfully",
        item: result.rows[0],
      });
    } catch (error) {
      console.error("Update item notes failed:", error);
      return res.status(500).json({ message: "Failed to update item notes" });
    }
  }
);

// START SERVER
async function startServer(): Promise<void> {
  await initializeDatabase();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});