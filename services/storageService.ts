import type { User, ClothingItem, Outfit, Comment } from '../types';

const DB_NAME = 'ChromaDB';
const DB_VERSION = 4; // Incremented version for schema change
const USERS_STORE = 'users';
const ITEMS_STORE = 'items';
const SAVED_OUTFITS_STORE = 'saved_outfits';
const COMMENTS_STORE = 'comments';

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
            if (!db.objectStoreNames.contains(SAVED_OUTFITS_STORE)) {
                const savedOutfitsStore = db.createObjectStore(SAVED_OUTFITS_STORE, { keyPath: 'id' });
                savedOutfitsStore.createIndex('userId', 'userId', { unique: false });
                savedOutfitsStore.createIndex('isPublic', 'isPublic', { unique: false });
            } else {
                const savedOutfitsStore = (event.target as IDBOpenDBRequest).transaction?.objectStore(SAVED_OUTFITS_STORE);
                if (savedOutfitsStore && !savedOutfitsStore.indexNames.contains('isPublic')) {
                     savedOutfitsStore.createIndex('isPublic', 'isPublic', { unique: false });
                }
            }
            if (!db.objectStoreNames.contains(COMMENTS_STORE)) {
                const commentsStore = db.createObjectStore(COMMENTS_STORE, { keyPath: 'id' });
                commentsStore.createIndex('outfitId', 'outfitId', { unique: false });
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

// SAVED OUTFIT FUNCTIONS
export const getSavedOutfitsByUserId = async (userId: string): Promise<Outfit[]> => {
    const db = await initDB();
    const transaction = db.transaction(SAVED_OUTFITS_STORE, 'readonly');
    const store = transaction.objectStore(SAVED_OUTFITS_STORE);
    const index = store.index('userId');
    return promisifyRequest(index.getAll(userId));
};

export const getAllSavedOutfits = async (): Promise<(Outfit & { userId: string })[]> => {
    const db = await initDB();
    const transaction = db.transaction(SAVED_OUTFITS_STORE, 'readonly');
    const store = transaction.objectStore(SAVED_OUTFITS_STORE);
    return promisifyRequest(store.getAll());
}

export const getPublicOutfits = async (page = 1, limit = 9): Promise<{ outfits: (Outfit & { creator: User })[], hasMore: boolean }> => {
    const db = await initDB();
    const transaction = db.transaction([SAVED_OUTFITS_STORE, USERS_STORE, ITEMS_STORE], 'readonly');
    const outfitsStore = transaction.objectStore(SAVED_OUTFITS_STORE);
    const usersStore = transaction.objectStore(USERS_STORE);
    
    const publicOutfitsIndex = outfitsStore.index('isPublic');

    const [publicOutfits, users] = await Promise.all([
        promisifyRequest(publicOutfitsIndex.getAll(IDBKeyRange.only(1))),
        promisifyRequest(usersStore.getAll())
    ]);
    
    const userMap = new Map(users.map(u => [u.id, u]));

    const hydrated = publicOutfits
        .map(outfit => ({
            ...outfit,
            creator: userMap.get(outfit.userId),
        }))
        .filter(o => !!o.creator);

    const sorted = hydrated.sort((a, b) => {
        const scoreA = (a.likes?.length || 0) * 2 - (Date.now() - new Date(parseInt(a.id.split('-')[1])).getTime()) / (1000 * 3600 * 24);
        const scoreB = (b.likes?.length || 0) * 2 - (Date.now() - new Date(parseInt(b.id.split('-')[1])).getTime()) / (1000 * 3600 * 24);
        return scoreB - scoreA;
    });

    const paginatedOutfits = sorted.slice((page - 1) * limit, page * limit);
    const hasMore = sorted.length > page * limit;

    return { outfits: paginatedOutfits, hasMore };
};


export const addSavedOutfit = async (outfit: Omit<Outfit, 'id' | 'userId'>, userId: string): Promise<Outfit> => {
    const db = await initDB();
    const transaction = db.transaction(SAVED_OUTFITS_STORE, 'readwrite');
    const store = transaction.objectStore(SAVED_OUTFITS_STORE);

    const savedOutfit: Outfit = {
        ...outfit,
        id: `saved-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        isPublic: 0,
        likes: [],
    };
    await promisifyRequest(store.add(savedOutfit));
    return savedOutfit;
};

export const publishOutfit = async (outfitId: string): Promise<Outfit> => {
    const db = await initDB();
    const transaction = db.transaction(SAVED_OUTFITS_STORE, 'readwrite');
    const store = transaction.objectStore(SAVED_OUTFITS_STORE);
    const outfit = await promisifyRequest(store.get(outfitId));
    if (outfit) {
        outfit.isPublic = 1;
        await promisifyRequest(store.put(outfit));
        return outfit;
    }
    throw new Error("Outfit not found");
};

export const toggleLikeOutfit = async (outfitId: string, userId: string): Promise<Outfit> => {
    const db = await initDB();
    const transaction = db.transaction(SAVED_OUTFITS_STORE, 'readwrite');
    const store = transaction.objectStore(SAVED_OUTFITS_STORE);
    const outfit = await promisifyRequest(store.get(outfitId));

    if (outfit) {
        if (!Array.isArray(outfit.likes)) outfit.likes = [];
        
        const userLikeIndex = outfit.likes.indexOf(userId);
        if (userLikeIndex > -1) {
            outfit.likes.splice(userLikeIndex, 1); // Unlike
        } else {
            outfit.likes.push(userId); // Like
        }
        await promisifyRequest(store.put(outfit));
        return outfit;
    }
    throw new Error("Outfit not found");
};

export const deleteSavedOutfit = async (outfitId: string): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(SAVED_OUTFITS_STORE, 'readwrite');
    const store = transaction.objectStore(SAVED_OUTFITS_STORE);
    await promisifyRequest(store.delete(outfitId));
};

export const updateSavedOutfit = async (outfit: Outfit): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(SAVED_OUTFITS_STORE, 'readwrite');
    const store = transaction.objectStore(SAVED_OUTFITS_STORE);
    await promisifyRequest(store.put(outfit));
};

// COMMENT FUNCTIONS
export const getCommentsByOutfitId = async (outfitId: string): Promise<Comment[]> => {
    const db = await initDB();
    const transaction = db.transaction(COMMENTS_STORE, 'readonly');
    const store = transaction.objectStore(COMMENTS_STORE);
    const index = store.index('outfitId');
    return promisifyRequest(index.getAll(outfitId));
};

export const addComment = async (commentData: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> => {
    const db = await initDB();
    const transaction = db.transaction(COMMENTS_STORE, 'readwrite');
    const store = transaction.objectStore(COMMENTS_STORE);
    const newComment: Comment = {
        ...commentData,
        id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date(),
    };
    await promisifyRequest(store.add(newComment));
    return newComment;
};

// COLLECTION FUNCTIONS
export const toggleCollectOutfit = async (outfitId: string, userId: string): Promise<User> => {
    const db = await initDB();
    const transaction = db.transaction(USERS_STORE, 'readwrite');
    const store = transaction.objectStore(USERS_STORE);
    const user = await promisifyRequest(store.get(userId));

    if(user) {
        if (!Array.isArray(user.collectedOutfitIds)) user.collectedOutfitIds = [];
        
        const collectedIndex = user.collectedOutfitIds.indexOf(outfitId);
        if (collectedIndex > -1) {
            user.collectedOutfitIds.splice(collectedIndex, 1); // Un-collect
        } else {
            user.collectedOutfitIds.push(outfitId); // Collect
        }
        await promisifyRequest(store.put(user));
        return user;
    }
    throw new Error("User not found");
};

export const getHydratedCollectedOutfits = async (userId: string): Promise<(Outfit & { creator: User })[]> => {
    const db = await initDB();
    const transaction = db.transaction([USERS_STORE, SAVED_OUTFITS_STORE], 'readonly');
    const usersStore = transaction.objectStore(USERS_STORE);
    const outfitsStore = transaction.objectStore(SAVED_OUTFITS_STORE);
    
    const user = await promisifyRequest(usersStore.get(userId));
    if (!user || !user.collectedOutfitIds || user.collectedOutfitIds.length === 0) {
        return [];
    }

    const collectedOutfits = await Promise.all(
        user.collectedOutfitIds.map(id => promisifyRequest(outfitsStore.get(id)))
    );

    const creatorIds = [...new Set(collectedOutfits.filter(Boolean).map(o => o.userId))];
    const creators = await Promise.all(
        creatorIds.map(id => promisifyRequest(usersStore.get(id)))
    );
    const creatorMap = new Map(creators.filter(Boolean).map(c => [c.id, c]));

    return collectedOutfits
        .filter((outfit): outfit is Outfit => !!outfit)
        .map(outfit => ({
            ...outfit,
            creator: creatorMap.get(outfit.userId)!,
        }))
        .filter(o => !!o.creator)
        .sort((a, b) => b.id.localeCompare(a.id));
};


// SESSION FUNCTIONS (using localStorage for synchronous access on startup)
export const getSessionUser = (): User | null => {
    const userJson = localStorage.getItem('chroma_session_user');
    if (!userJson) return null;
    try {
        const user = JSON.parse(userJson);
        // Ensure date objects are properly hydrated
        if (user.lastLogin) user.lastLogin = new Date(user.lastLogin);
        if (user.loginHistory) user.loginHistory = user.loginHistory.map((d: string) => new Date(d));
        return user;
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