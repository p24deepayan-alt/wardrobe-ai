export enum ClothingCategory {
  TOP = 'Top',
  BOTTOM = 'Bottom',
  OUTERWEAR = 'Outerwear',
  FOOTWEAR = 'Footwear',
  ACCESSORY = 'Accessory',
  DRESS = 'Dress',
}

export interface ClothingItem {
  id: string;
  userId: string;
  name: string;
  category: ClothingCategory;
  color: string;
  style: string;
  imageUrl: string;
  lastWorn?: Date;
  purchaseDate: Date;
}

export interface Outfit {
  id: string;
  name: string;
  items: ClothingItem[];
  occasion: string;
  explanation: string;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Should be hashed in a real backend
  avatarUrl: string;
  roles: UserRole[];
  resetToken?: string;
  resetTokenExpiry?: number; // Store as timestamp
  tryOnImageUrl?: string; // For Virtual Try-On feature
}

export interface ShoppingSuggestion {
    id: string;
    name: string;
    description: string;
    category: string;
    priceRange: string;
    imageUrl: string;
    purchaseUrl: string;
}

export interface Weather {
  temperature: number;
  condition: string; // e.g., 'Sunny', 'Cloudy', 'Rainy'
  unit: 'C' | 'F';
}