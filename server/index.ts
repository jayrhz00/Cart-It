import express, { Request, Response } from "express";
import { storage } from "./storage";
import { InsertUser } from "../shared/schema";

const app = express();
const PORT = 5000;

app.use(express.json());

// ---- TEST ROUTE ----
app.get("/", (req: Request, res: Response) =>
{
    res.send("Cart-It server is running");
});

// ---- REGISTER ROUTE ----
app.post("/api/register", (req: Request, res: Response) =>
{
    try
    {
        const userData: InsertUser = req.body;

        const existingUser = storage.getUserByEmail(userData.email);

        if (existingUser)
        {
            return res.status(400).json({ message: "User already exists" });
        }

        const newUser = storage.createUser(userData);
        return res.status(201).json(newUser);
    }
    catch (error)
    {
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// ---- LOGIN ROUTE ----
app.post("/api/login", (req: Request, res: Response) =>
{
    try
    {
        const { email, passwordHash } = req.body;

        const user = storage.getUserByEmail(email);

        if (!user || user.passwordHash !== passwordHash)
        {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        return res.json({
            message: "Login successful",
            user
        });
    }
    catch (error)
    {
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// ---- START SERVER ----
app.listen(PORT, () =>
{
    console.log(`Server running on http://localhost:${PORT}`);
});