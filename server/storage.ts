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
    Cart, InsertCart,
    Item, InsertItem,
    PriceHistory, InsertPriceHistory,
    Notification, InsertNotification
} from "../shared/schema";

// ---- STORAGE INTERFACE ----
// Defines all operations our storage must support 
// "Contract" of what the site will do 

export interface IStorage 
{
    // ---- USER OPERATIONS ----
    getUser(userId:number): User | undefined;                               // Get a user by their ID number. Returns a user or undefined if not found
    getUserByEmail(email: string): User | undefined;                        // Get a user by email for login, if not found returns undefined 
    createUser(user: InsertUser): User;                                     // Create new account 

    // ---- GROUP OPERATIONS ----
    getGroup(groupId: number): Group | undefined;                            // Find one group by ID  
    getGroupsByOwner(ownerId: number): Group[];                              // Get all groups owned by one user 
    createGroup(group: InsertGroup): Group;                                  // Create new wishlist group
    updateGroup(groupId: number, group: Partial<Group>): Group | undefined;  // Updates group name or color 
    deleteGroup(groupId: number): boolean;                                   // True --> Group exists and can be deleted. False --> Group not found 

    // ---- GROUP MEMBER OPERATIONS ----
    getGroupMembers(groupId: number): GroupMember[];                        // Returns a list of all members in a shared group
    addGroupMember(member: InsertGroupMember): GroupMember;                 // Add collaborator
    removeGroupMember(groupId: number, userId: number): boolean;            // Removes a user from a group

    // ---- CART OPERATIONS ----
    getCartByUser(userId: number): Cart | undefined;                         // Each user has one cart
    getCart(cartId: number): Cart | undefined;                               // Find cart by cart ID
    createCart(cart: InsertCart): Cart;                             // Create a cart for user

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
    addPriceRecord(record: InsertPriceHistory): PriceHistory;               // Save new price check

    // ---- NOTIFICATION OPERATIONS ----
    getNotificationsByUser(userId: number): Notification[];                  // Returns list of notifications for user 
    createNotification(notification: InsertNotification): Notification;      // Create notification (price drop)
    markNotificationAsRead(notificationId: number): Notification | undefined; // Mark notification as read
}

//---- MEMORY STORAGE ----
// Implementation of IStorage 
// Stores everything in memory using Maps
// Maps is a modern way for storing data. It looks up an item by ID instantly, Easy to add, update, and delete by ID, built into JavaScript 
// WILL BE SWAPPED WITH POSTGRESQL- DatabaseStorage class will be created to implement same interface 

export class MemStorage implements IStorage 
{
    private users: Map<number, User>;
    private groups: Map<number, Group>;
    private carts: Map<number, Cart>;
    private items: Map<number, Item>;
    private priceHistoryRecords: Map<number, PriceHistory>;
    private notifications: Map<number, Notification>;
    private groupMembers: Map<string, GroupMember>;         // COMPOSITE KEY


    // AUTO INCREMENTS

    private currentUserId: number;
    private currentGroupId: number;
    private currentCartId: number;
    private currentItemId: number;
    private currentHistoryId: number;
    private currentNotificationId: number;

    constructor()
    {
        this.users = new Map();
        this.groups = new Map();
        this.carts = new Map();
        this.items = new Map();
        this.priceHistoryRecords = new Map();
        this.notifications = new Map();
        this.groupMembers = new Map();

        this.currentUserId = 1;
        this.currentGroupId = 1;
        this.currentCartId = 1;
        this.currentItemId = 1;
        this.currentHistoryId = 1;
        this.currentNotificationId = 1; 
    }
    
    // groupId 2 + userId 5 becomes "2-5"

    private makeGroupMemberKey(groupId: number, userId: number): string
    {
        return `${groupId}-${userId}`;
    }

    // ---- USER METHODS ----

    getUser(userId: number): User | undefined
    {
        return this.users.get(userId);
    }

    getUserByEmail(email: string): User | undefined
    {
        for (const user of this.users.values())
        {
            if (user.email === email)
            {
                return user;
            }
        }

        return undefined;
    }

    createUser(insertUser: InsertUser): User
    {
        const user: User =
        {
            userId: this.currentUserId++,
            ...insertUser,
            createdAt: new Date()
        };

        this.users.set(user.userId, user);
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
    
    // ---- EXPORTED STORAGE ----
    // Shared storage instance used by server 
    export const storage = new MemStorage();



