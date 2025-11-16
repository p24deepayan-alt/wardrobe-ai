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

export interface Comment {
  id: string;
  outfitId: string;
  userId: string;
  text: string;
  createdAt: Date;
}

export interface Outfit {
  id: string;
  name: string;
  items: ClothingItem[];
  occasion: string;
  explanation: string;
  userId: string; // The ID of the user who created/saved it
  isPublic?: boolean;
  likes?: string[]; // Array of user IDs who liked it
}

export type UserRole = 'user' | 'admin';

export interface StyleDNA {
  coreAesthetic: {
    title: string;
    description: string;
  };
  colorPalette: {
    name: string;
    colors: string[];
    description: string;
  };
  styleGaps: {
    name: string;
    reason: string;
  }[];
  keyPieces: {
    itemId: string;
    reason: string;
  }[];
}


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
  lastLogin?: Date;
  loginHistory?: Date[];
  loginStreak?: number;
  achievements?: string[];
  styleDna?: StyleDNA;
  collectedOutfitIds?: string[];
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

export interface SeasonalAnalysis {
  keepOutIds: string[];
  storeAwayIds: string[];
  transitionalIds: string[];
  trendsSummary: string;
  missingPieces: {
    name: string;
    description: string;
  }[];
}

export type AchievementID = 'novice_collector' | 'fashionista' | 'style_savant' | 'outfit_architect' | 'social_butterfly';

export interface Achievement {
    id: AchievementID;
    title: string;
    description: string;
}