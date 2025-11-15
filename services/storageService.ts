import type { User, ClothingItem } from '../types';

// Initialize with a default admin user if no users exist
const initializeUsers = () => {
    const users: User[] = [
        { 
            id: 'admin-001', 
            name: 'Admin', 
            email: 'admin@chroma.ai', 
            // In a real app, passwords must be hashed. This is for demonstration only.
            password: 'password123', 
            avatarUrl: 'https://api.dicebear.com/8.x/initials/svg?seed=Admin', 
            roles: ['user', 'admin'] 
        }
    ];
    localStorage.setItem('chroma_users', JSON.stringify(users));
    return users;
};

// USER FUNCTIONS
export const getUsers = (): User[] => {
    const users = localStorage.getItem('chroma_users');
    if (!users) {
        return initializeUsers();
    }
    return JSON.parse(users);
};

export const saveUsers = (users: User[]) => {
    localStorage.setItem('chroma_users', JSON.stringify(users));
};

export const updateUser = (updatedUser: User) => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        saveUsers(users);
    }
};

// PASSWORD RESET FUNCTIONS
const TOKEN_EXPIRY_MINUTES = 15;

export const requestPasswordReset = (email: string): { success: boolean, token?: string, error?: string } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
        return { success: false, error: "No account found with this email address." };
    }
    
    // Generate a simple token for simulation
    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const expiry = Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000;
    
    users[userIndex].resetToken = token;
    users[userIndex].resetTokenExpiry = expiry;
    
    saveUsers(users);
    
    return { success: true, token };
};

export const resetPassword = (token: string, newPassword: string): { success: boolean, error?: string } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.resetToken === token);
    
    if (userIndex === -1) {
        return { success: false, error: "Invalid reset token." };
    }
    
    const user = users[userIndex];
    if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
        // Clear expired token
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        saveUsers(users);
        return { success: false, error: "Reset token has expired. Please request a new one." };
    }
    
    // Success: Update password and clear token
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    
    saveUsers(users);
    
    return { success: true };
};

// CLOTHING ITEM FUNCTIONS
export const getItems = (): ClothingItem[] => {
    const items = localStorage.getItem('chroma_items');
    return items ? JSON.parse(items) : [];
};

export const saveItems = (items: ClothingItem[]) => {
    localStorage.setItem('chroma_items', JSON.stringify(items));
};

export const getItemsByUserId = (userId: string): ClothingItem[] => {
    return getItems().filter(item => item.userId === userId);
};

export const addItems = (newItems: ClothingItem[]) => {
    const items = getItems();
    saveItems([...newItems, ...items]);
};

export const addItem = (item: ClothingItem) => {
    addItems([item]);
};

export const updateItem = (updatedItem: ClothingItem) => {
    const items = getItems();
    const newItems = items.map(item => item.id === updatedItem.id ? updatedItem : item);
    saveItems(newItems);
};

export const deleteItem = (itemId: string) => {
    const items = getItems();
    const newItems = items.filter(item => item.id !== itemId);
    saveItems(newItems);
};

export const deleteItems = (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    const items = getItems();
    const newItems = items.filter(item => !itemIds.includes(item.id));
    saveItems(newItems);
};


// SESSION FUNCTIONS
export const getSessionUser = (): User | null => {
    const userId = localStorage.getItem('chroma_session');
    if (!userId) return null;
    return getUsers().find(u => u.id === userId) || null;
};

export const setSessionUser = (user: User) => {
    localStorage.setItem('chroma_session', user.id);
};

export const clearSession = () => {
    localStorage.removeItem('chroma_session');
};