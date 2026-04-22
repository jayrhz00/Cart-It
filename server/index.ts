import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { pool } from "./db";
import { storage } from "./storage";

// Load environment variables from .env
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

app.get("/api/cart-items", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM cart_items ORDER BY item_id ASC"
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
        COALESCE(g.name, 'No Group') AS group_name,
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
      "SELECT * FROM group_members ORDER BY membership_id ASC"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch group members failed:", error);
    res.status(500).json({ message: "Failed to fetch group members" });
  }
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});