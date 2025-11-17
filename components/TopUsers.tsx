import React, { useState, useMemo } from 'react';
import type { User } from '../types';

type SortCriteria = 'wardrobeSize' | 'savedOutfits';

interface TopUsersProps {
  users: User[];
  userMetrics: {
    userId: string;
    wardrobeSize: number;
    savedOutfits: number;
  }[];
}

const TopUsers: React.FC<TopUsersProps> = ({ users, userMetrics }) => {
    const [sortBy, setSortBy] = useState<SortCriteria>('wardrobeSize');

    const sortedUsers = useMemo(() => {
        const userMap = new Map(users.map(u => [u.id, u]));
        return userMetrics
            .sort((a, b) => b[sortBy] - a[sortBy])
            .slice(0, 5)
            .map(metric => ({
                user: userMap.get(metric.userId),
                metric,
            }))
            .filter(item => item.user);
    }, [users, userMetrics, sortBy]);

    const getMetricLabel = (metricValue: number) => {
        if (sortBy === 'wardrobeSize') return `${metricValue} items`;
        if (sortBy === 'savedOutfits') return `${metricValue} outfits`;
        return metricValue;
    };
    
    return (
        <div className="bg-background/50 p-6 rounded-lg border border-border h-full">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-serif font-bold text-card-foreground">Top Users</h3>
                 <div className="flex items-center text-sm bg-input p-1 rounded-full">
                    <button onClick={() => setSortBy('wardrobeSize')} className={`px-3 py-1 rounded-full ${sortBy === 'wardrobeSize' ? 'bg-card shadow font-semibold' : ''}`}>Wardrobe</button>
                    <button onClick={() => setSortBy('savedOutfits')} className={`px-3 py-1 rounded-full ${sortBy === 'savedOutfits' ? 'bg-card shadow font-semibold' : ''}`}>Outfits</button>
                 </div>
            </div>
            <ul className="space-y-3">
                {sortedUsers.map(({ user, metric }, index) => user && (
                     <li key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-card/50">
                        <div className="flex items-center">
                            <span className="text-lg font-bold text-foreground/50 w-6">{index + 1}</span>
                            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full ml-2" />
                            <div className="ml-3">
                                <p className="font-semibold text-card-foreground">{user.name}</p>
                                <p className="text-xs text-foreground/70">{user.email}</p>
                            </div>
                        </div>
                        <div className="font-bold text-primary text-sm bg-primary/10 px-3 py-1 rounded-full">
                            {getMetricLabel(metric[sortBy])}
                        </div>
                    </li>
                ))}
                 {sortedUsers.length === 0 && (
                    <p className="text-center text-sm text-foreground/60 pt-8">No user data to display.</p>
                 )}
            </ul>
        </div>
    );
};

export default TopUsers;