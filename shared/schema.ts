//Jessie Hernandez 700775688
// CART-IT DATA MODELS
// This file will be our "blueprint".
// Tells our site what a User, Group, and CartItem look like. 
// Includes: Collaboration, price history, notes and notifications

// ---- USER ----
// Registered user of Cart-It
// Each user can have multiple groups & items 

export interface User       // Defines the object as "User" that other files will be able to use 
{
    id: number;             // Every user gets a unique # as their ID (auto-generated)
    username: string;       // Displays user's username 
    email: string;          // Email address for login 
    password: string;       // Security technique to create hashed password
    createdAt: Date;        // Timestamp of when the account was created  
}

// ---- GROUP ----
// Folder to organize cart items. 
// Think different categories like "Clothing", "Technology",etc..
// Each group belongs to one user but can be shared with collaborators

export interface Group
{
    id: number;            // Unique ID
    userId: number;        // Which user owns this group (links to User.id) 
    name: string;          // Category name 
    color: string;         // Color of sidebar label
    createdAt: Date;       // Timestamp when group was created  
}

// ---- GROUP MEMBER ----
// Connects users to shared groups (many-to-many)
// Owner of group invites others by email

export interface GroupMember
{
    id: number;          
    groupId: number;            // Which group is being shared 
    userId: number;             // Which user has access to group
    role: string;               // "Owner" or "Editor" 
    joinedAt: Date;             // Timestamp of when member was added

}

// ---- CART ITEM ----
// A product the user saved from a site 
// Belongs to one group and one user 
// Includes notes, purchase tracking, and price monitoring 

export interface CartItem
{
    id: number;
    userId: number;                 // Who saved this item 
    groupId: number;                // Which WishList it's in
    name: string;                   // Product's name 
    price: number;                  // Current price in dollars
    url: string;                    // Link to product page
    imageUrl: string;               // Link to product image
    store: string;                  // Which store/site product is in
    notes: string;                  // Private internal notes user can make about the item 
    purchased: boolean;             // Has the user bought this item before? T/F
    purchasedAt: Date | null;       // When item was purchased (null if it hasn't been purchased yet)
    purchasedPrice: number | null;  // Price at time of purchase (null if it hasn't been purchased yet)
    trackPrice: boolean;            // Does the user want to monitor this item for price changes? 
    createdAt: Date;                // Timestamp of when item was saved 
}

// ---- PRICE HISTORY ----
// Records price changes over time for tracked items 
// Use case 5 (Milestone 1 Documents) System runs scheduled price check 
// If the price has changed a new record will be saved 

export interface PriceHistory 
{
    id: number;
    itemId: number;                 // Which cart item this price is for 
    price: number;                  // Current price 
    checkedAt: Date;                // When the price was checked 
}

// ---- NOTIFICATION ----
// Records when the system alerts the user 
// Use Case 6: System detects price drop and notifies user via email (Milestone 1)

export interface Notification 
{
    id: number;
    userId: number;                 // Who gets notified
    itemId: number;                 // Which item dropped in price
    type: string;                   // Type of notification the user will receive ("price drop")
    message: string;                // Notification message 
    emailSent: boolean;             // Was the email successfully sent?
    createdAt: Date;                // Timestamp of when notification was created 
}

// ---- INSERT TYPES ----
// When creating new records, id and timestamps are auto generated
// These types represent what the user fills in

export type InsertUser = Omit<User, "id" | "createdAt">;
export type InsertGroup = Omit<Group, "id" | "createdAt">;
export type InsertGroupMember = Omit<GroupMember, "id" | "joinedAt">;
export type InsertCartItem = Omit<CartItem, "id" | "createdAt">;
export type InsertPriceHistory = Omit<PriceHistory, "id">;
export type InsertNotification = Omit<Notification, "id" | "createdAt">;