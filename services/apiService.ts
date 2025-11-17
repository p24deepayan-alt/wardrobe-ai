import type { User, ClothingItem, Outfit, Comment } from '../types';
import { ClothingCategory } from '../types';
import { auth, db, storage } from './firebase';
// FIX: Use Firebase v8 'compat' imports for namespaced API to resolve module export errors.
import firebase from 'firebase/compat/app';

const USERS_COLLECTION = 'users';
const ITEMS_COLLECTION = 'clothingItems';
const OUTFITS_COLLECTION = 'savedOutfits';
const COMMENTS_COLLECTION = 'comments';

// Helper to convert Firestore Timestamps to Dates in nested objects
const convertTimestamps = (data: any) => {
    if (!data) return data;
    const newData = { ...data };
    for (const key in newData) {
        // FIX: Use namespaced Timestamp for Firebase v8.
        if (newData[key] instanceof firebase.firestore.Timestamp) {
            newData[key] = newData[key].toDate();
        }
    }
    return newData;
};

// --- AUTH ---
export const login = async (email: string, password?: string): Promise<User> => {
    if (!password) throw new Error("Password is required.");
    // FIX: Use namespaced auth method for Firebase v8.
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = await getProfile(userCredential.user!.uid);
    
    // Update login stats
    const today = new Date();
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const isYesterday = (d1: Date, d2: Date) => {
        const yesterday = new Date(d2);
        yesterday.setDate(yesterday.getDate() - 1);
        return isSameDay(d1, yesterday);
    };
    let currentStreak = user.loginStreak || 0;
    if (user.lastLogin && isYesterday(new Date(user.lastLogin), today)) {
        currentStreak += 1;
    } else if (!user.lastLogin || !isSameDay(new Date(user.lastLogin), today)) {
        currentStreak = 1;
    }
    
    const updatedUserData = {
        // FIX: Use namespaced Timestamp and FieldValue for Firebase v8.
        lastLogin: firebase.firestore.Timestamp.fromDate(today),
        loginHistory: firebase.firestore.FieldValue.arrayUnion(firebase.firestore.Timestamp.fromDate(today)),
        loginStreak: currentStreak,
    };
    
    // FIX: Use namespaced firestore methods for Firebase v8.
    await db.collection(USERS_COLLECTION).doc(user.id).update(updatedUserData);

    return { ...user, ...convertTimestamps(updatedUserData) };
};

export const signUp = async (newUser: { name: string, email: string, password?: string }): Promise<User> => {
    if (!newUser.password) throw new Error("Password is required for sign up.");
    // FIX: Use namespaced auth method for Firebase v8.
    const userCredential = await auth.createUserWithEmailAndPassword(newUser.email, newUser.password);
    const { uid, email } = userCredential.user!;

    const userToSave: User = {
        id: uid,
        name: newUser.name,
        email: email!,
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${newUser.name}`,
        roles: ['user'],
    };

    // FIX: Use namespaced firestore methods for Firebase v8.
    await db.collection(USERS_COLLECTION).doc(uid).set(userToSave);
    return userToSave;
};

export const logout = async (): Promise<void> => {
    // FIX: Use namespaced auth method for Firebase v8.
    await auth.signOut();
};

export const getProfile = async (uid: string): Promise<User> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const userDocRef = db.collection(USERS_COLLECTION).doc(uid);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        throw new Error("User profile not found in database.");
    }
    return convertTimestamps(userDoc.data()) as User;
};

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const usersCollection = db.collection(USERS_COLLECTION);
    const userSnapshot = await usersCollection.get();
    return userSnapshot.docs.map(doc => convertTimestamps(doc.data()) as User);
};

export const updateUser = async (user: User): Promise<User> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const userDocRef = db.collection(USERS_COLLECTION).doc(user.id);
    // Convert Dates back to Timestamps for Firestore
    const dataToSave: any = { ...user };
    // FIX: Use namespaced Timestamp for Firebase v8.
    if (dataToSave.lastLogin) dataToSave.lastLogin = firebase.firestore.Timestamp.fromDate(new Date(dataToSave.lastLogin));
    if (dataToSave.loginHistory) dataToSave.loginHistory = dataToSave.loginHistory.map(d => firebase.firestore.Timestamp.fromDate(new Date(d)));
    if (dataToSave.styleDna) { // ensure nested dates are converted if any
        // currently no dates in StyleDNA, but good practice
    }
    await userDocRef.set(dataToSave, { merge: true });
    return user;
};

// --- CLOTHING ---
export const addItems = async (itemsToAdd: { analysis: Partial<ClothingItem>, file: File }[], userId: string): Promise<ClothingItem[]> => {
    const addedItems: ClothingItem[] = [];
    for (const { analysis, file } of itemsToAdd) {
        // 1. Upload image to Firebase Storage
        // FIX: Use namespaced storage methods for Firebase v8.
        const storageRef = storage.ref(`clothing/${userId}/${Date.now()}-${file.name}`);
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        const uploadResult = await storageRef.putString(base64, 'data_url');
        const imageUrl = await uploadResult.ref.getDownloadURL();

        // 2. Create clothing item doc in Firestore
        // FIX: Use namespaced firestore methods for Firebase v8.
        const newItemRef = db.collection(ITEMS_COLLECTION).doc();
        const newItem: ClothingItem = {
            id: newItemRef.id,
            userId: userId,
            imageUrl: imageUrl,
            // FIX: Use namespaced Timestamp for Firebase v8.
            purchaseDate: firebase.firestore.Timestamp.now().toDate(),
            name: analysis.name || 'New Item',
            // FIX: Use enum member `ClothingCategory.TOP` to satisfy TypeScript type checking.
            category: (analysis.category as ClothingCategory) || ClothingCategory.TOP,
            color: analysis.color || 'Unknown',
            style: analysis.style || 'Unknown',
        };
        // FIX: Use namespaced Timestamp for Firebase v8.
        await newItemRef.set({ ...newItem, purchaseDate: firebase.firestore.Timestamp.fromDate(newItem.purchaseDate) });
        addedItems.push(newItem);
    }
    return addedItems;
};

export const getItemsByUserId = async (userId: string): Promise<ClothingItem[]> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const q = db.collection(ITEMS_COLLECTION).where("userId", "==", userId);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => convertTimestamps(doc.data()) as ClothingItem);
};

export const updateItem = async (item: ClothingItem): Promise<ClothingItem> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const itemRef = db.collection(ITEMS_COLLECTION).doc(item.id);
    // FIX: Use namespaced Timestamp for Firebase v8.
    await itemRef.update({ ...item, purchaseDate: firebase.firestore.Timestamp.fromDate(new Date(item.purchaseDate)) });
    return item;
};

export const deleteItem = async (itemId: string): Promise<void> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const itemRef = db.collection(ITEMS_COLLECTION).doc(itemId);
    const itemDoc = await itemRef.get();
    if (!itemDoc.exists) return;
    const item = itemDoc.data() as ClothingItem;
    // Delete image from storage
    if (item.imageUrl) {
        try {
            // FIX: Use namespaced storage methods for Firebase v8.
            const imageRef = storage.refFromURL(item.imageUrl);
            await imageRef.delete();
        } catch(error: any) {
             if (error.code !== 'storage/object-not-found') {
                 console.error("Error deleting image from storage:", error);
                 // Decide if you want to throw or just log
             }
        }
    }
    // Delete doc from firestore
    await itemRef.delete();
};

export const deleteItems = async (itemIds: string[]): Promise<void> => {
    for (const itemId of itemIds) {
        await deleteItem(itemId); // Re-use single delete logic to handle storage deletion
    }
};

export const getItems = async (): Promise<ClothingItem[]> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const itemsCollection = db.collection(ITEMS_COLLECTION);
    const itemSnapshot = await itemsCollection.get();
    return itemSnapshot.docs.map(doc => convertTimestamps(doc.data()) as ClothingItem);
};

// --- SAVED OUTFITS ---
const hydrateOutfits = async (outfits: Outfit[]): Promise<Outfit[]> => {
    if (outfits.length === 0) return [];
    const allItemIds = [...new Set(outfits.flatMap(o => o.items.map((i: any) => i.id || i)))]; // Handle both full objects and just IDs
    if (allItemIds.length === 0) return outfits.map(o => ({...o, items: []}));

    // FIX: Use namespaced firestore methods for Firebase v8.
    const itemDocs = await Promise.all(allItemIds.map(id => db.collection(ITEMS_COLLECTION).doc(id).get()));
    const itemsMap = new Map(itemDocs.filter(d => d.exists).map(d => [d.id, convertTimestamps(d.data()) as ClothingItem]));

    return outfits.map(outfit => ({
        ...outfit,
        items: outfit.items.map((i: any) => itemsMap.get(i.id || i)).filter((i): i is ClothingItem => !!i)
    }));
};

export const getSavedOutfitsByUserId = async (userId: string): Promise<Outfit[]> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const q = db.collection(OUTFITS_COLLECTION).where("userId", "==", userId);
    const querySnapshot = await q.get();
    const outfits = querySnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as Outfit);
    // In Firestore, we store item IDs, not full objects. We don't need to hydrate here because the SavedOutfits component does it.
    // Let's re-evaluate: it's better to hydrate here to keep component logic clean.
    const hydratedOutfits = await hydrateOutfits(outfits);
    return hydratedOutfits;
};

export const addSavedOutfit = async (outfit: Omit<Outfit, 'id'>, userId: string): Promise<Outfit> => {
    const outfitData = {
        ...outfit,
        userId,
        isPublic: 0,
        likes: [],
        // FIX: Use namespaced firestore methods for Firebase v8 to create document references.
        items: outfit.items.map(item => db.collection(ITEMS_COLLECTION).doc(item.id)), // Store as references
    };
    // FIX: Use namespaced firestore methods for Firebase v8.
    const newDocRef = await db.collection(OUTFITS_COLLECTION).add(outfitData);
    return { ...outfit, id: newDocRef.id };
};

export const updateSavedOutfit = async (outfit: Outfit): Promise<Outfit> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const outfitRef = db.collection(OUTFITS_COLLECTION).doc(outfit.id);
    await outfitRef.update({ name: outfit.name });
    return outfit;
};

export const deleteSavedOutfit = async (outfitId: string): Promise<void> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    await db.collection(OUTFITS_COLLECTION).doc(outfitId).delete();
};

// --- COMMUNITY ---
export const publishOutfit = async (outfitId: string): Promise<Outfit> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const outfitRef = db.collection(OUTFITS_COLLECTION).doc(outfitId);
    await outfitRef.update({ isPublic: 1 });
    const updatedDoc = await outfitRef.get();
    const outfitData = convertTimestamps({ ...updatedDoc.data(), id: updatedDoc.id }) as Outfit;
    const [hydratedOutfit] = await hydrateOutfits([outfitData]);
    return hydratedOutfit;
};

export const toggleLikeOutfit = async (outfitId: string, userId: string): Promise<void> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const outfitRef = db.collection(OUTFITS_COLLECTION).doc(outfitId);
    const outfitDoc = await outfitRef.get();
    if (!outfitDoc.exists) throw new Error("Outfit not found");
    const likes = outfitDoc.data()!.likes || [];
    const isLiked = likes.includes(userId);
    // FIX: Use namespaced FieldValue for Firebase v8.
    await outfitRef.update({
        likes: isLiked ? firebase.firestore.FieldValue.arrayRemove(userId) : firebase.firestore.FieldValue.arrayUnion(userId)
    });
};

export const toggleCollectOutfit = async (outfitId: string, userId: string): Promise<User> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const userRef = db.collection(USERS_COLLECTION).doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error("User not found");
    const collectedIds = userDoc.data()!.collectedOutfitIds || [];
    const isCollected = collectedIds.includes(outfitId);
    // FIX: Use namespaced FieldValue for Firebase v8.
    await userRef.update({
        collectedOutfitIds: isCollected ? firebase.firestore.FieldValue.arrayRemove(outfitId) : firebase.firestore.FieldValue.arrayUnion(outfitId)
    });
    return getProfile(userId);
};

export const getAllSavedOutfits = async (): Promise<Outfit[]> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const outfitSnapshot = await db.collection(OUTFITS_COLLECTION).get();
    return outfitSnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as Outfit);
};

let lastVisibleOutfit: firebase.firestore.QueryDocumentSnapshot | null = null;
export const getPublicOutfits = async (page: number): Promise<{ outfits: (Outfit & { creator: User })[], hasMore: boolean }> => {
    if (page === 1) lastVisibleOutfit = null;

    // FIX: Use namespaced firestore query methods for Firebase v8.
    const outfitsRef = db.collection(OUTFITS_COLLECTION);
    let q: firebase.firestore.Query = outfitsRef.where("isPublic", "==", 1).orderBy("id", "desc");

    if (lastVisibleOutfit) {
        q = q.startAfter(lastVisibleOutfit);
    }
    q = q.limit(9);
    
    const outfitSnapshot = await q.get();
    lastVisibleOutfit = outfitSnapshot.docs[outfitSnapshot.docs.length - 1];

    const outfits = outfitSnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as Outfit);
    const hydratedOutfits = await hydrateOutfits(outfits);

    const userIds = [...new Set(hydratedOutfits.map(o => o.userId))];
    if (userIds.length === 0) return { outfits: [], hasMore: false };

    const users = await Promise.all(userIds.map(id => getProfile(id)));
    const userMap = new Map(users.map(u => [u.id, u]));

    const result = hydratedOutfits.map(outfit => ({
        ...outfit,
        creator: userMap.get(outfit.userId)!
    })).filter(o => o.creator);

    return { outfits: result, hasMore: !outfitSnapshot.empty && outfitSnapshot.docs.length === 9 };
};

export const getHydratedCollectedOutfits = async (userId: string): Promise<(Outfit & { creator: User })[]> => {
    const user = await getProfile(userId);
    if (!user.collectedOutfitIds || user.collectedOutfitIds.length === 0) return [];

    // FIX: Use namespaced firestore methods for Firebase v8.
    const outfitDocs = await Promise.all(user.collectedOutfitIds.map(id => db.collection(OUTFITS_COLLECTION).doc(id).get()));
    // FIX: In Firebase v8, `exists` is a boolean property, not a method. Changed d.exists() to d.exists.
    const outfits = outfitDocs.filter(d => d.exists).map(d => convertTimestamps({ ...d.data(), id: d.id }) as Outfit);
    
    const hydratedOutfits = await hydrateOutfits(outfits);
    
    const creatorIds = [...new Set(hydratedOutfits.map(o => o.userId))];
    if (creatorIds.length === 0) return [];

    const creators = await Promise.all(creatorIds.map(id => getProfile(id)));
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    return hydratedOutfits.map(outfit => ({
        ...outfit,
        creator: creatorMap.get(outfit.userId)!
    })).filter(o => o.creator);
};

// --- COMMENTS ---
export const getCommentsByOutfitId = async (outfitId: string): Promise<Comment[]> => {
    // FIX: Use namespaced firestore methods for Firebase v8.
    const q = db.collection(COMMENTS_COLLECTION).where("outfitId", "==", outfitId).orderBy("createdAt", "asc");
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(d => convertTimestamps({ ...d.data(), id: d.id }) as Comment);
};

export const addComment = async (commentData: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> => {
    const newComment = {
        ...commentData,
        // FIX: Use namespaced Timestamp for Firebase v8.
        createdAt: firebase.firestore.Timestamp.now(),
    };
    // FIX: Use namespaced firestore methods for Firebase v8.
    const docRef = await db.collection(COMMENTS_COLLECTION).add(newComment);
    return { ...commentData, id: docRef.id, createdAt: newComment.createdAt.toDate() };
};

// --- STORAGE ---
export const updateUserProfileImage = async (file: File, userId: string): Promise<string> => {
    // FIX: Use namespaced storage methods for Firebase v8.
    const storageRef = storage.ref(`avatars/${userId}/profile.jpg`);
    const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });
    const uploadResult = await storageRef.putString(base64, 'data_url');
    return uploadResult.ref.getDownloadURL();
};