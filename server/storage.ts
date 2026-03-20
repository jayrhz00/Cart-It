// Jessie Hernandez 700775688
// Cart-It Storage 
// This file manages storing and retrieving all data
// *REMINDER* schema.ts is the blueprint of what the data will look like 
// *REMINDER* storage.ts is the warehouse. This is where the data lives and how it gets in and out

import 
{
    User, InsertUser,
    Group, InsertGroup,
    GroupMember, InsertGroupMember,
    CartItem, InsertCartItem,
    PriceHistory, InsertPriceHistory,
    Notification, InsertNotification
} from "../shared/schema";

// ---- STORAGE INTERFACE ----
// Defines all operations our storage must support 
// "Contract" of what the site will do 

export interface IStorage 
{
    // ---- USER OPERATIONS ----
    getUser(id:number): User | undefined;                                   // Get a user by their ID number. Returns a user or undefined if not found
    getUserByEmail(email: string): User | undefined;                        // Get a user by email for login, if not found returns undefined 
    createUser(user: InsertUser): User;                                     // Create new account 

    // ---- GROUP OPERATIONS ----
    getGroups(userId: number): Group[];                                     // Returns a list of all groups for a user 
    getGroup(id: number): Group | undefined;                                // Returns a SINGLE group by ID NUMBER or undefined if not found 
    createGroup(group: InsertGroup): Group;                                 // Create new wishlist group
    updateGroup(id: number, group: Partial<Group>): Group | undefined;      // Updates group name or color 
    deleteGroup(id: number): boolean;                                       // True --> Group exists and can be deleted. False --> Group not found 

    // ---- GROUP MEMBER OPERATIONS ----
    getGroupMembers(groupId: number): GroupMember[];                        // Returns a list of all members in a shared group
    addGroupMember(member: InsertGroupMember): GroupMember;                 // Add collaborator
    removeGroupMember(id: number): boolean;                                 // Removes collaborator 

    // ---- CART ITEM OPERATION ----
    getItems(userId: number): CartItem[];                                   // Returns a list of all items for a user 
    getItemsByGroup(groupId: number): CartItem[];                           // Returns a list of all items in a group
    getItem(id: number): CartItem | undefined;                              // Get a single item by id or returns undefined if not found 
    createItem(item: InsertCartItem): CartItem;                             // Save new item to cart
    updateItem(id: number, item: Partial<CartItem>): CartItem | undefined;  // Update item (internal notes or purchased)  
    deleteItem(id: number): boolean;                                        // Delete an item

    // ---- PRICE HISTORY OPERATIONS ----
    getPriceHistory(itemId: number): PriceHistory[];                        // Returns a list of all price records for item
    addPriceRecord(record: InsertPriceHistory): PriceHistory;               // Save new price check

    // ---- NOTIFICATION OPERATIONS ----
    getNotifications(userId: number): Notification[];                       // Returns list of notifications for user 
    createNotification(notification: InsertNotification): Notification;     // Create notification (price drop)
}



