// Jessie Hernandez 700775688
// Cart-It Storage 
// This file manages storing and retrieving all data
// *REMINDER* schema.ts is the blueprint of what the data will look like 
// *REMINDER* storage.ts is the warehouse. This is where the data lives and how it gets in and out



// Import all data models and insert types from schema.ts file
// Helps storage know the correct structure
import 
{
    User, InsertUser,                    // User = full stored user, InsertUser = data used to create a user
    Group, InsertGroup,                  // Group = full group object, InsertGroup = data used to create group
    GroupMember, InsertGroupMember,      // GroupMember = full membership record, InserGroupMmember = data used to add a member 
    Cart, InsertCart,
    Item, InsertItem,
    PriceHistory, InsertPriceHistory,    // PriceHistory = full price record, InsertPriceHistory = data used to save a price check
    Notification, InsertNotification
} from "../shared/schema";

import { pool } from "./db";


// ---- STORAGE INTERFACE ----
// Defines all operations our storage must support 
// "Contract" of what the site will do 
// IStorage says what the storage layer must be able to do


export interface IStorage 
{
    // ---- USER OPERATIONS ----
    getUser(userId:number): Promise<User | undefined>;                      // Gets a user by their unique ID from the database, returns promise due to db queries
    getUserByEmail(email: string): Promise<User | undefined>;               // Gets user by email (used for login)
    createUser(user: InsertUser): Promise<User>;                            // Creates new user in db, takes in data from signup form, returns full user object

    // ---- GROUP OPERATIONS ----
    getGroup(groupId: number): Group | undefined;                            // Find one group by ID  
    getGroupsByOwner(ownerId: number): Group[];                              // Get all groups owned by one user 
    createGroup(group: InsertGroup): Group;                                  // Create new group
    updateGroup(groupId: number, group: Partial<Group>): Group | undefined;  // Updates group name or color 
    deleteGroup(groupId: number): boolean;                                   // True --> Group exists and can be deleted. False --> Group not found 

    // ---- GROUP MEMBER OPERATIONS ----
    getGroupMembers(groupId: number): GroupMember[];                        // Returns a list of all members in a shared group
    addGroupMember(member: InsertGroupMember): GroupMember;                 // Add collaborator
    removeGroupMember(groupId: number, userId: number): boolean;            // Removes a user from a group

    // ---- CART OPERATIONS ----
    getCartByUser(userId: number): Cart | undefined;                         // Finds the cart that belongs to a user
    getCart(cartId: number): Cart | undefined;                               // Find cart by cart ID
    createCart(cart: InsertCart): Cart;                                      // Create a new cart for user

    // ---- ITEM OPERATIONS ----
    getItem(itemId: number): Item | undefined;                               // Get a single item by id or returns undefined if not found 
    getItemsByCart(cartId: number): Item[];                                  // Get all items in a cart 
    getItemsByGroup(groupId: number): Item[];                                // Get all items in a group
    getItemsByUser(userId: number): Item[];                                  // Get all items added by a user
    createItem(item: InsertItem): Item;                                      // Create new saved item
    updateItem(itemId: number, item: Partial<Item>): Item | undefined;       // Update item (internal notes or purchased)  
    deleteItem(itemId: number): boolean;                                     // Delete an item by ID 

    // ---- PRICE HISTORY OPERATIONS ----
    getPriceHistory(itemId: number): PriceHistory[];                        // Returns a list of all price records for item
    addPriceRecord(record: InsertPriceHistory): PriceHistory;               // Save new price history record

    // ---- NOTIFICATION OPERATIONS ----
    getNotificationsByUser(userId: number): Notification[];                   // Returns list of notifications for user 
    createNotification(notification: InsertNotification): Notification;       // Create notification (price drop)
    markNotificationAsRead(notificationId: number): Notification | undefined; // Mark notification as read
}

//---- MEMORY STORAGE ----
// Implementation of IStorage 
// Stores everything in memory using Maps
// Maps is a modern way for storing data. It looks up an item by ID instantly, Easy to add, update, and delete by ID, built into JavaScript 
// WILL BE SWAPPED WITH POSTGRESQL- DatabaseStorage class will be created to implement same interface 


// ---- PRIVATE STORAGE LABELS ----
// Map stores key value pairs
// Everything is stored in memory

export class MemStorage implements IStorage 
{
    private users: Map<number, User>; // Key= userId number, Value = full user object
    private groups: Map<number, Group>;
    private carts: Map<number, Cart>;
    private items: Map<number, Item>;
    private priceHistoryRecords: Map<number, PriceHistory>;
    private notifications: Map<number, Notification>;
    private groupMembers: Map<string, GroupMember>;         // COMPOSITE KEY
 

    private currentUserId: number;
    private currentGroupId: number;
    private currentCartId: number;
    private currentItemId: number;
    private currentHistoryId: number;
    private currentNotificationId: number;

    // Prepares storage system before application starts using it 
    // Will help create empty Maps to act like temp mmory tables
    // Sets starting values 

    constructor()
    {
        this.users = new Map();     // Empty map to store users
        this.groups = new Map();    // Empty map to store groups; Holds all group records while app runs
        this.carts = new Map();     // Empty map to store carts; Each cart is saved here using cartId
        this.items = new Map();     // Empty map to store items; Where each item added to cart or group will be stored
        this.priceHistoryRecords = new Map();       // Stores and tracks price hisory records
        this.notifications = new Map();             // Stores notifications 
        this.groupMembers = new Map();              // Used for relationships between users and groups

        this.currentUserId = 1;     // Start user IDs at 1; Each new user gets next available ID #
        this.currentGroupId = 1;
        this.currentCartId = 1;
        this.currentItemId = 1;
        this.currentHistoryId = 1;
        this.currentNotificationId = 1; 
    }
    
    // Method helps create one string key from groupId and userId
    // Example: groupId 2 + userId 5 becomes "2-5"

    private makeGroupMemberKey(groupId: number, userId: number): string 
    {
        return `${groupId}-${userId}`;      // Combines groupId and userId into one string 
    }

    // ---- USER METHODS ----
    // Responsible for finding and creating users

    async getUser(userId: number): Promise<User | undefined>  // If the user does not exist, return undefined
    {
        return this.users.get(userId);        // Look in the users Map using the userId as the key
    }

    // Checks to see if email is registered 
    async getUserByEmail(email: string): Promise<User | undefined>
    {
        for (const user of this.users.values())     // Loop through every user object stored in users map
        {
            if (user.email === email)              // Checks email to match them
            {
                return user;                      // Returns user object if match is found
            }
        }

        return undefined;                       // If no matching email was found, return undefined
    }

    // Create new user and save in memory 
    async createUser(insertUser: InsertUser): Promise<User>
    {
        const user: User =      // Adds values ex. userId & createdAt
        {
            userId: this.currentUserId++,   // Use current user ID and increment by 1 for next user 
            ...insertUser,                  // Copy all user input fields from insertUser into new object
            createdAt: new Date()           // Adds current date and time for when user is created 
        };

        this.users.set(user.userId, user);  // Saves new user in user maps, Key = userId, Value = full user object
        return user;
    }

    // ---- GROUP METHODS ----

    getGroup(groupId: number): Group | undefined
    {
        return this.groups.get(groupId);
    }

    getGroupsByOwner(ownerId: number): Group[]
    {
        return Array.from(this.groups.values()).filter(
            (group) => group.ownerId === ownerId
        );
    }

    createGroup(insertGroup: InsertGroup): Group
    {
        const group: Group =
        {
            groupId: this.currentGroupId++,
            ...insertGroup,
            createdAt: new Date()
        };

        this.groups.set(group.groupId, group);
        return group;
    }

    updateGroup(groupId: number, updatedFields: Partial<Group>): Group | undefined
    {
        const existingGroup = this.groups.get(groupId);

        if (!existingGroup)
        {
            return undefined;
        }

        const updatedGroup: Group =
        {
            ...existingGroup,
            ...updatedFields,
            groupId: existingGroup.groupId
        };

        this.groups.set(groupId, updatedGroup);
        return updatedGroup;
    }

    deleteGroup(groupId: number): boolean
    {
        return this.groups.delete(groupId);
    }

    // ---- GROUP MEMBER METHODS ----

    getGroupMembers(groupId: number): GroupMember[]
    {
        return Array.from(this.groupMembers.values()).filter(
            (member) => member.groupId === groupId
        );
    }

    addGroupMember(insertMember: InsertGroupMember): GroupMember
    {
        const member: GroupMember =
        {
            ...insertMember,
            joinedAt: new Date()
        };

        const key = this.makeGroupMemberKey(member.groupId, member.userId);
        this.groupMembers.set(key, member);

        return member;
    }

    removeGroupMember(groupId: number, userId: number): boolean
    {
        const key = this.makeGroupMemberKey(groupId, userId);
        return this.groupMembers.delete(key);
    }

    // ---- CART METHODS ----

    getCartByUser(userId: number): Cart | undefined
    {
        for (const cart of this.carts.values())
        {
            if (cart.userId === userId)
            {
                return cart;
            }
        }

        return undefined;
    }

    getCart(cartId: number): Cart | undefined
    {
        return this.carts.get(cartId);
    }

    createCart(insertCart: InsertCart): Cart
    {
        const cart: Cart =
        {
            cartId: this.currentCartId++,
            ...insertCart,
            createdAt: new Date()
        };

        this.carts.set(cart.cartId, cart);
        return cart;
    }

    // ---- ITEM METHODS ----

    getItem(itemId: number): Item | undefined
    {
        return this.items.get(itemId);
    }

    getItemsByCart(cartId: number): Item[]
    {
        return Array.from(this.items.values()).filter(
            (item) => item.cartId === cartId
        );
    }

    getItemsByGroup(groupId: number): Item[]
    {
        return Array.from(this.items.values()).filter(
            (item) => item.groupId === groupId
        );
    }

    getItemsByUser(userId: number): Item[]
    {
        return Array.from(this.items.values()).filter(
            (item) => item.addedByUserId === userId
        );
    }

    createItem(insertItem: InsertItem): Item
    {
        // Validation rule:
        // Exactly one location must be set.
        const hasCart = insertItem.cartId !== null;
        const hasGroup = insertItem.groupId !== null;

        if ((hasCart && hasGroup) || (!hasCart && !hasGroup))
        {
            throw new Error("Item must belong to either a cart or a group, but not both.");
        }

        const item: Item =
        {
            itemId: this.currentItemId++,
            ...insertItem
        };

        this.items.set(item.itemId, item);
        return item;
    }

    updateItem(itemId: number, updatedFields: Partial<Item>): Item | undefined
    {
        const existingItem = this.items.get(itemId);

        if (!existingItem)
        {
            return undefined;
        }

        const updatedItem: Item =
        {
            ...existingItem,
            ...updatedFields,
            itemId: existingItem.itemId
        };

        const hasCart = updatedItem.cartId !== null;
        const hasGroup = updatedItem.groupId !== null;

        if ((hasCart && hasGroup) || (!hasCart && !hasGroup))
        {
            throw new Error("Updated item must belong to either a cart or a group, but not both.");
        }

        this.items.set(itemId, updatedItem);
        return updatedItem;
    }

    deleteItem(itemId: number): boolean
    {
        return this.items.delete(itemId);
    }

    // ---- PRICE HISTORY METHODS ----

    getPriceHistory(itemId: number): PriceHistory[]
    {
        return Array.from(this.priceHistoryRecords.values()).filter(
            (record) => record.itemId === itemId
        );
    }

    addPriceRecord(insertRecord: InsertPriceHistory): PriceHistory
    {
        const record: PriceHistory =
        {
            historyId: this.currentHistoryId++,
            ...insertRecord
        };

        this.priceHistoryRecords.set(record.historyId, record);
        return record;
    }

    // ---- NOTIFICATION METHODS ----

    getNotificationsByUser(userId: number): Notification[]
    {
        return Array.from(this.notifications.values()).filter(
            (notification) => notification.userId === userId
        );
    }

    createNotification(insertNotification: InsertNotification): Notification
    {
        const notification: Notification =
        {
            notificationId: this.currentNotificationId++,
            ...insertNotification,
            createdAt: new Date()
        };

        this.notifications.set(notification.notificationId, notification);
        return notification;
    }

    markNotificationAsRead(notificationId: number): Notification | undefined
    {
        const existingNotification = this.notifications.get(notificationId);

        if (!existingNotification)
        {
            return undefined;
        }

        const updatedNotification: Notification =
        {
            ...existingNotification,
            isRead: true
        };

        this.notifications.set(notificationId, updatedNotification);
        return updatedNotification;
    }
}
    export class DatabaseStorage implements IStorage
    {
        // Creates new user in PostgreSQL
        async createUser(user: InsertUser): Promise<User>       
        {
            const result = await pool.query
            (
                `INSERT INTO users (username, email, password_hash)
                 VALUES ($1, $2, $3)
                 RETURNING user_id, username, email, password_hash, created_at`,
                 [user.username, user.email, user.passwordHash]
            );
            const row = result.rows[0];
            return{
                userId: row.user_id,
                username: row.username,
                email: row.email,
                passwordHash: row.password_hash,
                createdAt: row.created_at
            };
        }

        // Gets user by email
        async getUserByEmail(email: string): Promise<User | undefined>
        {
            const result = await pool.query
            (
            "SELECT * FROM users WHERE email = $1",
            [email]
            );

        if (result.rows.length === 0) 
        {
            return undefined;
        } 

        const row = result.rows[0];

        return {
            userId: row.user_id,
            username: row.username,
            email: row.email,
            passwordHash: row.password_hash,
            createdAt: row.created_at
        };
    }

        // Gets user by ID
        async getUser(userId: number): Promise<User | undefined>
        {
            const result = await pool.query
            (
            "SELECT * FROM users WHERE user_id = $1",
            [userId]
            );

        if (result.rows.length === 0) 
        {
            return undefined;
        } 

        const row = result.rows[0];

        return {
            userId: row.user_id,
            username: row.username,
            email: row.email,
            passwordHash: row.password_hash,
            createdAt: row.created_at
        };
    }

    // Everything else (for now)
    getGroup(): any { throw new Error("Not implemented"); }
    getGroupsByOwner(): any { throw new Error("Not implemented"); }
    createGroup(): any { throw new Error("Not implemented"); }
    updateGroup(): any { throw new Error("Not implemented"); }
    deleteGroup(): any { throw new Error("Not implemented"); }

    getGroupMembers(): any { throw new Error("Not implemented"); }
    addGroupMember(): any { throw new Error("Not implemented"); }
    removeGroupMember(): any { throw new Error("Not implemented"); }

    getCartByUser(): any { throw new Error("Not implemented"); }
    getCart(): any { throw new Error("Not implemented"); }
    createCart(): any { throw new Error("Not implemented"); }

    getItem(): any { throw new Error("Not implemented"); }
    getItemsByCart(): any { throw new Error("Not implemented"); }
    getItemsByGroup(): any { throw new Error("Not implemented"); }
    getItemsByUser(): any { throw new Error("Not implemented"); }
    createItem(): any { throw new Error("Not implemented"); }
    updateItem(): any { throw new Error("Not implemented"); }
    deleteItem(): any { throw new Error("Not implemented"); }

    getPriceHistory(): any { throw new Error("Not implemented"); }
    addPriceRecord(): any { throw new Error("Not implemented"); }

    getNotificationsByUser(): any { throw new Error("Not implemented"); }
    createNotification(): any { throw new Error("Not implemented"); }
    markNotificationAsRead(): any { throw new Error("Not implemented"); }
}

    // ---- EXPORTED STORAGE ----
    // Shared storage instance used by server 
    export const storage = new DatabaseStorage();



