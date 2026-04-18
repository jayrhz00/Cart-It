import express, { Request, Response } from "express";
import { pool } from "./db";

const app = express();
const PORT = 3000;

// Tests Database

pool.query("SELECT NOW()")
  .then(res => console.log("DataBase TIME:", res.rows))
  .catch(err => console.error("DataBase ERROR:", err));

app.get("/", (req: Request, res: Response) => {
  console.log("GET / hit");
  res.status(200).send("Cart-It server is running");
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});