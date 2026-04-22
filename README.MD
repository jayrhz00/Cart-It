Wishlist Tracker — Full-Stack Project Plan (README)
Overview
Wishlist Tracker is a full-stack web app that helps users save, organize, and share products they want to buy.
Users can capture product details from any website using a browser extension, organize items into custom color-coded categories, add private notes (size/quality/history), and collaborate with others.

Core Features
1) Public Landing Page
Product overview and value proposition
Screenshots/demo
Pricing/plan section (optional)
CTA buttons: Sign Up, Log In, Install Extension
2) Authentication & Accounts
User registration/login/logout
Password hashing and secure sessions/JWT
Email verification + password reset (optional but recommended)
3) User Profiles
Profile details: name, avatar, bio, preferences
Privacy controls (public/private wishlist settings)
4) Wishlist Management
Create/edit/delete wishlist items
Fields: title, URL, price, currency, image, store name, notes, size/quality notes
Mark status: wanted / purchased / archived
Filters and sorting
5) Categories & Color Coding
User-defined categories (e.g., Shoes, Tech, Home)
Custom color for each category
Multi-category assignment per item (optional, choose now or later)
6) Internal Notes
Private note area per item
Notes history/timestamps (optional)
Helpful for size fit, quality issues, return policies, etc.
7) Collaboration
Invite collaborators to wishlist(s)
Role-based access:
Owner
Editor
Viewer
Comments on items (optional phase 2)
8) Browser Extension
“Save to Wishlist” button on product pages
Capture metadata:
product title
page URL
image
price (best effort)
Send captured data to web app API
User assigns category after capture
Tech Stack
Frontend
React (Vite recommended)
React Router
State management: Context API or Zustand
UI: Tailwind CSS or plain CSS modules
Backend
Node.js + Express (or NestJS if preferred)
REST API (GraphQL optional)
Auth: JWT + refresh tokens (or secure session cookies)
Database
PostgreSQL
ORM: Prisma (recommended) or Sequelize
Browser Extension
Manifest V3
JavaScript/TypeScript
chrome.scripting / content scripts + popup UI
API integration with backend
DevOps / Hosting
Frontend: InfinityFree (static hosting only)
Backend/API: Render, Railway, Fly.io, or similar
PostgreSQL: Supabase, Neon, Render Postgres, Railway Postgres
Important Hosting Note (InfinityFree)
InfinityFree is great for static React frontend hosting, but it does not natively host a Node.js API + PostgreSQL stack in one place.
Recommended production setup:

Frontend (React build) → InfinityFree
Backend API (Node/Express) → Render/Railway/Fly
PostgreSQL → Neon/Supabase/Render DB
High-Level Architecture
User opens React app (InfinityFree).
React app calls backend API over HTTPS.
API handles auth/business logic and reads/writes PostgreSQL.
Browser extension captures item data from external sites.
Extension sends captured data to backend API (authenticated user).
App displays categorized, color-coded wishlist items and collaboration data.
Suggested Project Structure
wishlist-tracker/
  client/                  # React app
  server/                  # Node/Express API
  extension/               # Browser extension (MV3)
  docs/                    # Architecture, API docs, ERD
  README.md
Database Planning (Initial Entities)
users
profiles
wishlists
wishlist_members
items
categories
item_categories (if many-to-many)
notes
collaboration_invites
activity_logs (optional)
Example relationships
User has one profile
User owns many wishlists
Wishlist has many items
Item belongs to one wishlist
Wishlist has many collaborators
Item has many notes
API Planning (REST Example)
Auth
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
Users/Profile
GET /users/me
PATCH /users/me
PATCH /users/me/password
Categories
GET /categories
POST /categories
PATCH /categories/:id
DELETE /categories/:id
Items
GET /wishlists/:wishlistId/items
POST /wishlists/:wishlistId/items
PATCH /items/:id
DELETE /items/:id
Notes
GET /items/:itemId/notes
POST /items/:itemId/notes
PATCH /notes/:id
DELETE /notes/:id
Collaboration
POST /wishlists/:id/invite
POST /invites/:id/accept
PATCH /wishlists/:id/members/:userId
DELETE /wishlists/:id/members/:userId
Extension
POST /extension/capture-item
Development Roadmap
Phase 1 — Foundation
Initialize monorepo/folders
Setup React + API server + PostgreSQL
Setup Prisma migrations
Setup env files and secrets handling
Phase 2 — Authentication & Profiles
Register/login/logout
Protected routes
User profile CRUD
Basic account settings UI
Phase 3 — Wishlist & Categories
CRUD for wishlists/items/categories
Color-coded category chips
Search/filter/sort
Phase 4 — Internal Notes
Note editor per item
History/timestamps
Optional pin/favorite note
Phase 5 — Collaboration
Invite users by email
Permissions (owner/editor/viewer)
Shared wishlist views
Phase 6 — Browser Extension
Build popup + content script
Extract product data from pages
Submit to backend API
Link captured item to user account
Phase 7 — QA, Security, and Performance
Validation + sanitization
Rate limiting
Error logging
Responsive UI polish
Basic analytics
Phase 8 — Deployment
Deploy backend and DB
Build React app and upload to InfinityFree
Configure frontend API URL
End-to-end production test
Local Setup (Recommended)
Prerequisites
Node.js (LTS)
PostgreSQL
npm or pnpm
Git
1. Clone project
git clone <your-repo-url>
cd wishlist-tracker
2. Setup backend
cd server
npm install
cp .env.example .env
# set DATABASE_URL and JWT secrets
npx prisma migrate dev
npm run dev
3. Setup frontend
cd ../client
npm install
cp .env.example .env
# set VITE_API_URL=http://localhost:5000
npm run dev
4. Setup extension
cd ../extension
npm install
npm run build
# Load unpacked extension in browser (Developer Mode)
Environment Variables (Example)
server/.env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/wishlist_db
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
CORS_ORIGIN=http://localhost:5173
client/.env
VITE_API_URL=http://localhost:5000
Security Checklist
Password hashing with bcrypt/argon2
JWT expiry + refresh token rotation
Input validation (Zod/Joi)
SQL injection protection via ORM
CORS and secure headers (helmet)
Rate limiting on auth endpoints
Role checks for collaborative actions
Private notes visible only to authorized users
Testing Strategy
Unit tests: utility functions and services
Integration tests: auth + item/category flows
E2E tests: user signup → capture item → categorize → collaborate
Extension tests: metadata extraction from multiple site layouts
Deployment Plan
Frontend (InfinityFree)
Run frontend build (npm run build in client)
Upload static files to InfinityFree htdocs
Configure routing fallback for React (.htaccess rewrite to index.html)
Set production API URL in build env
Backend + DB (External)
Deploy API to Render/Railway/Fly
Provision managed PostgreSQL (Neon/Supabase/etc.)
Run migrations in production
Add frontend URL to backend CORS allowlist
Use HTTPS and production secrets
MVP Definition (First Launch)
Ship when users can:

Register/login
Add/edit/delete items
Create color-coded categories
Add private item notes
Capture at least title + URL + image via extension
Share one wishlist with another user (viewer role minimum)
Future Enhancements
Price drop tracking
Duplicate item detection
AI-powered category suggestions
Mobile app
Gift registry mode
Export/import (CSV/JSON)
License
Choose one:

MIT (simple and common)
Proprietary (if private/commercial)
If you want, I can generate a repo-ready version of this README tailored to your exact folder structure next, plus:

docs/architecture.md
docs/database-schema.md
docs/api-spec.md
docs/deployment-infinityfree.md

Local Setup (Recommended)
Prerequisites
Node.js (LTS)
PostgreSQL
npm or pnpm
Git
1. Clone project
git clone <your-repo-url>
cd wishlist-tracker
2. Setup backend
cd server
npm install
cp .env.example .env
# set DATABASE_URL and JWT secrets
npx prisma migrate dev
npm run dev
3. Setup frontend
cd ../client
npm install
cp .env.example .env
# set VITE_API_URL=http://localhost:5000
npm run dev
4. Setup extension
cd ../extension
npm install
npm run build
# Load unpacked extension in browser (Developer Mode)
Environment Variables (Example)
server/.env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/wishlist_db
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
CORS_ORIGIN=http://localhost:5173
client/.env
VITE_API_URL=http://localhost:5000
Security Checklist
Password hashing with bcrypt/argon2
JWT expiry + refresh token rotation
Input validation (Zod/Joi)
SQL injection protection via ORM
CORS and secure headers (helmet)
Rate limiting on auth endpoints
Role checks for collaborative actions
Private notes visible only to authorized users
Testing Strategy
Unit tests: utility functions and services
Integration tests: auth + item/category flows
E2E tests: user signup → capture item → categorize → collaborate
Extension tests: metadata extraction from multiple site layouts
Deployment Plan
Frontend (InfinityFree)
Run frontend build (npm run build in client)
Upload static files to InfinityFree htdocs
Configure routing fallback for React (.htaccess rewrite to index.html)
Set production API URL in build env
Backend + DB (External)
Deploy API to Render/Railway/Fly
Provision managed PostgreSQL (Neon/Supabase/etc.)
Run migrations in production
Add frontend URL to backend CORS allowlist
Use HTTPS and production secrets
MVP Definition (First Launch)
Ship when users can:

Register/login
Add/edit/delete items
Create color-coded categories
Add private item notes
Capture at least title + URL + image via extension
Share one wishlist with another user (viewer role minimum)
Future Enhancements
Price drop tracking
Duplicate item detection
AI-powered category suggestions
Mobile app
Gift registry mode
Export/import (CSV/JSON)
License
Choose one:

MIT (simple and common)
Proprietary (if private/commercial)
If you want, I can generate a repo-ready version of this README tailored to your exact folder structure next, plus:

docs/architecture.md
docs/database-schema.md
docs/api-spec.md
docs/deployment-infinityfree.md
