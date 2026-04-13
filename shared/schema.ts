//Jessie Hernandez 700775688
// CART-IT DATA MODELS
// This file will be our "blueprint".
// Tells our site what each table/ entity should look like 
// Includes: Collaboration, price history, notes and notifications

// ---- USER ----
// Registered user of Cart-It
// Each user can have multiple groups & items 

export interface User            // Defines the object as "User" that other files will be able to use 
{
    userId: number;             // Every user gets a unique # as their ID (auto-generated)
    username: string;          // Displays user's username 
    email: string;            // Email address for login 
    passwordHash: string;    // Security technique to create hashed password
    createdAt: Date;        // Timestamp of when the account was created  
}

// ---- GROUP ----
// Folder to organize cart items. 
// Think different categories like "Clothing", "Technology",etc..
// Each group belongs to one user but can be shared with collaborators

export interface Group
{
    groupId: number;             // Unique ID
    ownerId: number;            // Which user owns this group (links to User.userId) 
    groupName: string;         // Category name 
    color: string;            // Color of sidebar label
    visibility: string;      // "Private" or "Shared"
    createdAt: Date;        // Timestamp when group was created  
}

// ---- GROUP MEMBER ----
// Connects users to shared groups (many-to-many)
// Owner of group invites others by email

export interface GroupMember
{
    groupId: number;       // PK/FK Group.groupId     
    userId: number;       // PK/FK User.userId  
    role: string;        // "Owner" or "Editor" 
    joinedAt: Date;     // Timestamp of when member was added

}

// ---- CART ----
// Stores a user's private uncategorized items 
// One cart belongs to one user 

export interface Cart
{
    cartId: number;                 // Primary key: unique ID for each cart
    userId: number;                 // Which user owns this cart 
    createdAt: Date;                // Timestamp of when the cart was created 
}

// ---- ITEM ----
// A saved product 
// Item belongs to either a CART or a GROUP, but not both 

export interface Item
{
    itemId: number;                   // Unique ID for each saved item
    cartId: number | null;           // Null if item is stored in group 
    groupId: number | null;         // Null if item is stored in cart
    addedByUserId: number;         // FK -> User.userId records who saved the item

    productName: string;            // Product's name 
    productUrl: string;             // Link to product page
    imageUrl: string;               // Link to product image url
    storeName: string;              // Which store/site product is in
    currentPrice: number;           // Current known price of item
    notes: string;                  // Private internal notes user can make about the item 
    isPurchased: boolean;           // Has the user bought this item before? T/F 
}


// ---- PRICE HISTORY ----
// Records price changes over time for tracked items 
// Use case 5 (Milestone 1 Documents) System runs scheduled price check 
// If the price has changed a new record will be saved 

export interface PriceHistory 
{
    historyId: number;              // Unique ID for each price record
    itemId: number;                 // Which cart item this price is for 
    price: number;                  // Current price at the time of check
    checkedAt: Date;                // When the price was checked 
}

// ---- NOTIFICATION ----
// Records when the system alerts the user 
// Use Case 6: System detects price drop and notifies user via email (Milestone 1)

export interface Notification 
{
    notificationId: number;         // Unique ID for each notification
    userId: number;                 // Who gets notified
    itemId: number;                 // Which item dropped in price
    message: string;                // Notification message 
    isRead: boolean;                // Has the notification been read?
    createdAt: Date;                // Timestamp of when notification was created 
}

// ---- INSERT TYPES ----
// When creating new records, id and timestamps are auto generated
// These types represent what the user fills in

export type InsertUser = Omit<User, "userId" | "createdAt">;
export type InsertGroup = Omit<Group, "groupId" | "createdAt">;
export type InsertGroupMember = Omit<GroupMember, "joinedAt">;
export type InsertCart = Omit<Cart, "cartId" | "createdAt">;
export type InsertItem= Omit<Item, "itemId">;
export type InsertPriceHistory = Omit<PriceHistory, "historyId">;
export type InsertNotification = Omit<Notification, "notificationId" | "createdAt">;