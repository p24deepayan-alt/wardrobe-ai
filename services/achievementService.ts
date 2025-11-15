import type { User, Achievement, AchievementID } from '../types';

export const achievementsList: Achievement[] = [
    {
        id: 'novice_collector',
        title: 'Novice Collector',
        description: 'You\'ve started your collection by adding 10 items to your wardrobe.'
    },
    {
        id: 'fashionista',
        title: 'Fashionista',
        description: 'Your wardrobe has grown to an impressive 50 items.'
    },
    {
        id: 'style_savant',
        title: 'Style Savant',
        description: 'A true connoisseur! You have cataloged over 100 items.'
    },
    {
        id: 'outfit_architect',
        title: 'Outfit Architect',
        description: 'You\'ve saved your first 10 custom outfits.'
    },
    {
        id: 'social_butterfly',
        title: 'Social Butterfly',
        description: 'You\'ve shared your first outfit with the Chroma community.'
    }
];

const achievementsMap = new Map(achievementsList.map(ach => [ach.id, ach]));

const awardAchievement = (user: User, achievementId: AchievementID, updateUser: (user: User) => void) => {
    if (!user.achievements?.includes(achievementId)) {
        const updatedUser = {
            ...user,
            achievements: [...(user.achievements || []), achievementId]
        };
        updateUser(updatedUser);
        // Here you could trigger a notification in the UI
        console.log(`Achievement unlocked: ${achievementsMap.get(achievementId)?.title}`);
    }
};

interface AchievementCheckPayload {
    wardrobeSize?: number;
    savedOutfitsCount?: number;
    hasShared?: boolean;
}

export const checkAndAwardAchievements = (
    user: User,
    payload: AchievementCheckPayload,
    updateUser: (user: User) => void
) => {
    // Wardrobe size achievements
    if (payload.wardrobeSize !== undefined) {
        if (payload.wardrobeSize >= 100) awardAchievement(user, 'style_savant', updateUser);
        if (payload.wardrobeSize >= 50) awardAchievement(user, 'fashionista', updateUser);
        if (payload.wardrobeSize >= 10) awardAchievement(user, 'novice_collector', updateUser);
    }
    
    // Saved outfits achievements
    if (payload.savedOutfitsCount !== undefined) {
        if (payload.savedOutfitsCount >= 10) awardAchievement(user, 'outfit_architect', updateUser);
    }

    // Social achievements
    if (payload.hasShared === true) {
        awardAchievement(user, 'social_butterfly', updateUser);
    }
};
