import type { User, ClothingItem } from '../types';

const DB_NAME = 'ChromaDB';
const DB_VERSION = 1;
const USERS_STORE = 'users';
const ITEMS_STORE = 'items';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("IndexedDB error:", request.error);
            reject("Error opening DB");
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(USERS_STORE)) {
                const usersStore = db.createObjectStore(USERS_STORE, { keyPath: 'id' });
                usersStore.createIndex('email', 'email', { unique: true });
                
                usersStore.transaction.oncomplete = () => {
                    const adminUser: User = { 
                        id: 'admin-001', 
                        name: 'Admin', 
                        email: 'admin@chroma.ai', 
                        password: 'password123', 
                        avatarUrl: 'https://api.dicebear.com/8.x/initials/svg?seed=Admin', 
                        roles: ['user', 'admin'] 
                    };
                    const transaction = db.transaction(USERS_STORE, 'readwrite');
                    transaction.objectStore(USERS_STORE).add(adminUser);
                };
            }
            if (!db.objectStoreNames.contains(ITEMS_STORE)) {
                const itemsStore = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
                itemsStore.createIndex('userId', 'userId', { unique: false });
            }
        };
    });
    return dbPromise;
};

const promisifyRequest = <T>(request: IDBRequest<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// USER FUNCTIONS
export const getUsers = async (): Promise<User[]> => {
    const db = await initDB();
    const transaction = db.transaction(USERS_STORE, 'readonly');
    const store = transaction.objectStore(USERS_STORE);
    return promisifyRequest(store.getAll());
};

export const addUser = async (user: User): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(USERS_STORE, 'readwrite');
    const store = transaction.objectStore(USERS_STORE);
    await promisifyRequest(store.add(user));
};

export const updateUser = async (updatedUser: User): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(USERS_STORE, 'readwrite');
    const store = transaction.objectStore(USERS_STORE);
    await promisifyRequest(store.put(updatedUser));
};

// PASSWORD RESET FUNCTIONS
const TOKEN_EXPIRY_MINUTES = 15;

export const requestPasswordReset = async (email: string): Promise<{ success: boolean, token?: string, error?: string }> => {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
        return { success: false, error: "No account found with this email address." };
    }
    
    const user = users[userIndex];
    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const expiry = Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000;
    
    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    
    await updateUser(user);
    
    return { success: true, token };
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean, error?: string }> => {
    const users = await getUsers();
    const user = users.find(u => u.resetToken === token);
    
    if (!user) {
        return { success: false, error: "Invalid reset token." };
    }
    
    if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await updateUser(user);
        return { success: false, error: "Reset token has expired. Please request a new one." };
    }
    
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    
    await updateUser(user);
    
    return { success: true };
};

// CLOTHING ITEM FUNCTIONS
export const getItems = async (): Promise<ClothingItem[]> => {
    const db = await initDB();
    const transaction = db.transaction(ITEMS_STORE, 'readonly');
    const store = transaction.objectStore(ITEMS_STORE);
    return promisifyRequest(store.getAll());
};

export const getItemsByUserId = async (userId: string): Promise<ClothingItem[]> => {
    const db = await initDB();
    const transaction = db.transaction(ITEMS_STORE, 'readonly');
    const store = transaction.objectStore(ITEMS_STORE);
    const index = store.index('userId');
    return promisifyRequest(index.getAll(userId));
};

export const addItems = async (newItems: ClothingItem[]): Promise<void> => {
    if (newItems.length === 0) return;
    const db = await initDB();
    const transaction = db.transaction(ITEMS_STORE, 'readwrite');
    const store = transaction.objectStore(ITEMS_STORE);
    for (const item of newItems) {
        store.add(item);
    }
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const updateItem = async (updatedItem: ClothingItem): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(ITEMS_STORE, 'readwrite');
    const store = transaction.objectStore(ITEMS_STORE);
    await promisifyRequest(store.put(updatedItem));
};

export const deleteItem = async (itemId: string): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(ITEMS_STORE, 'readwrite');
    const store = transaction.objectStore(ITEMS_STORE);
    await promisifyRequest(store.delete(itemId));
};

export const deleteItems = async (itemIds: string[]): Promise<void> => {
    if (itemIds.length === 0) return;
    const db = await initDB();
    const transaction = db.transaction(ITEMS_STORE, 'readwrite');
    const store = transaction.objectStore(ITEMS_STORE);
    for (const id of itemIds) {
        store.delete(id);
    }
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// SESSION FUNCTIONS (using localStorage for synchronous access on startup)
export const getSessionUser = (): User | null => {
    const userJson = localStorage.getItem('chroma_session_user');
    if (!userJson) return null;
    try {
        return JSON.parse(userJson);
    } catch {
        return null;
    }
};

export const setSessionUser = (user: User) => {
    localStorage.setItem('chroma_session_user', JSON.stringify(user));
};

export const clearSession = () => {
    localStorage.removeItem('chroma_session_user');
};
