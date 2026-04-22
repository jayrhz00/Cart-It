/**
 * PostgreSQL connection for the API.
 * DATABASE_URL in server/.env points at your database (local or Neon).
 * A "pool" reuses connections so we do not open a new TCP connection on every query.
 */
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

if (!process.env.DATABASE_URL)
{
  throw new Error("DATABASE_URL is not defined in .env");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then((client) => {
    console.log("Connected to LOCAL PostgreSQL successfully");
    client.release();
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
  });