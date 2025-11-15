import React from 'react';
import type { Achievement } from '../types';
import { AwardIcon, MedalIcon, StarIcon, GlobeIcon } from './icons';

interface AchievementBadgeProps {
    achievement: Achievement;
}

const getIconForAchievement = (id: string) => {
    switch (id) {
        case 'novice_collector':
            return <StarIcon className="w-6 h-6" />;
        case 'fashionista':
            return <AwardIcon className="w-6 h-6" />;
        case 'style_savant':
            return <MedalIcon className="w-6 h-6" />;
        case 'outfit_architect':
            return <StarIcon className="w-6 h-6" />;
        case 'social_butterfly':
            return <GlobeIcon className="w-6 h-6" />;
        default:
            return <AwardIcon className="w-6 h-6" />;
    }
};

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ achievement }) => {
    return (
        <div className="bg-background/50 p-4 rounded-lg flex items-center gap-4 border border-border">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                {getIconForAchievement(achievement.id)}
            </div>
            <div>
                <h4 className="font-bold text-card-foreground">{achievement.title}</h4>
                <p className="text-sm text-foreground/80">{achievement.description}</p>
            </div>
        </div>
    );
};

export default AchievementBadge;
