import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";


dotenv.config();                                // Load environment variables from .env into process.env
console.log("index.ts loaded");
console.log("login route loaded"); 

const app = express();                          // Create new Express application instance 
const PORT = Number(process.env.PORT) || 5001;  // Read PORT from .env, backend wil listen on this number 

// Middleware
app.use(cors());                               // Enables CORS so React is allowed to make HTTP requests to this backend 
app.use(express.json());                       // Used for routes like POST /login or POST /register

// Test to confirm that PostgreSQL is connected
pool.query("SELECT NOW()")
  .then((result) => console.log("Database TIME:", result.rows))
  .catch((err) => console.error("Database ERROR:", err));

// Test route to confirm server is running 
app.get("/", (req: Request, res: Response) => 
{
  console.log("GET / hit");
  res.status(200).send("Cart-It server is running");
});

// API test route for DB 
app.get("/test-db", async (req: Request, res: Response) => 
{
  try 
  {
    const result = await pool.query("SELECT NOW()");
    res.status(200).json(result.rows);
  } 
  catch (error) 
  {
    console.error("Database test route failed:", error);
    res.status(500).json({ message: "Database test failed" });
  }
});

// Register route (creates new user in db w/ hashed pw)
app.post("/api/register", async (req: Request, res: Response) =>
{
  try
  {
    const { username, email, password } = req.body;

    // Verifies that all required fields were sent
    if (!username || !email || !password)
    {
      return res.status(400).json({
        message: "Username, email, and password are required"
      });
    }

    // Verifies that email already exists in the db
    const existingUser = await storage.getUserByEmail(email);

    if (existingUser)
    {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }

    // Hash pw before saving it
    const passwordHash = await bcrypt.hash(password, 10);

    // Saves the new user in PostgreSQL
    const newUser = await storage.createUser({
      username,
      email,
      passwordHash
    });

    // Returns safe user information
    return res.status(201).json({
      message: "User registered successfully",
        user: 
        {
          userId: newUser.userId,
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.createdAt
        }
    });
  }
  catch (error)
  {
    console.error("Register route failed:", error);
    return res.status(500).json({
      message: "Registration failed"
    });
  }
});

// Login route (checks email & pw)
app.post("/api/login", async (req: Request, res: Response) =>
{
  try
  {
    const { email, password } = req.body;

    // Makes sure that both fields were sent
    if (!email || !password)
    {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // Looks for user in db by email
    const existingUser = await storage.getUserByEmail(email);

    // If no user is found = login fails
    if (!existingUser)
    {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Compare plain password from request with hashed password in database
    const isPasswordCorrect = await bcrypt.compare(password, existingUser.passwordHash);

    // If passwords do not match, login fails
    if (!isPasswordCorrect)
    {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Create JWT token after successful login
    const token = jwt.sign
    (
      {
        userId: existingUser.userId,
        email: existingUser.email
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // Send token & safe user info back to frontend
    return res.status(200).json({
      message: "Login successful",
      token,
      user: 
      {
        userId: existingUser.userId,
        username: existingUser.username,
        email: existingUser.email,
        createdAt: existingUser.createdAt
      }
    });
  }
  catch (error)
  {
    console.error("Login route failed:", error);
    return res.status(500).json({
      message: "Login failed"
    });
  }
});

// Starts backend server 
// Listens to incoming HTTP requests
app.listen(PORT, () => 
{
  console.log(`Server running on http://localhost:${PORT}`);
});