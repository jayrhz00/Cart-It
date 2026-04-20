// This file loads Neon PostgreSQL connection string from .env
// Creates pool so backend can run SQL queries, enables ssl for secure connections
// Logs once at startup depending if db connection worked

import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();                              // Load values from .env into process.env

if (!process.env.DATABASE_URL)
{
  throw new Error("DATABASE_URL is not defined in .env");
}

export const pool = new Pool(                 // Create reusable connection pool to PostgreSQL database (NEON)
{
  connectionString: process.env.DATABASE_URL, // Full database URL (user, password, host, db name) comes from .env
  ssl:                                        // Tell pg to use SSL when talking to NEON
  {
    rejectUnauthorized: false,                // Accepts Neon's SSL certificate 
  },
});

pool.connect()                               // Test database connection when server starts 
  .then((client) => 
  {
    console.log("Connected to Neon PostgreSQL successfully");
    client.release();                       // Give client back to pool after test query
  })
  .catch((error) => 
  {
    console.error("Database connection failed:", error);
  });