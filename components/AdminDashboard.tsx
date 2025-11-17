import React, { useState, useEffect } from 'react';
import * as apiService from '../services/apiService';
import type { User, ClothingItem, Outfit } from '../types';
import { SpinnerIcon, UserIcon, WardrobeIcon, TrendingUpIcon } from './icons';
import LoginFrequencyChart from './LoginFrequencyChart';
import TopUsers from './TopUsers';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-background/50 p-6 rounded-lg border border-border flex items-center space-x-4">
        <div className="p-3 bg-primary/10 text-primary rounded-lg">{icon}</div>
        <div>
            <p className="text-sm font-medium text-foreground/70">{title}</p>
            <p className="text-2xl font-bold text-card-foreground">{value}</p>
        </div>
    </div>
);

const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [savedOutfits, setSavedOutfits] = useState<(Outfit & { userId: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userList, itemList, savedOutfitList] = await Promise.all([
                    apiService.getUsers(), 
                    apiService.getItems(),
                    apiService.getAllSavedOutfits()
                ]);
                setUsers(userList);
                setItems(itemList);
                setSavedOutfits(savedOutfitList);
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = React.useMemo(() => {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const activeUsers = users.filter(u => u.lastLogin && new Date(u.lastLogin).getTime() > twentyFourHoursAgo).length;
        
        return {
            totalUsers: users.length,
            activeUsers24h: activeUsers,
            totalItems: items.length,
        }
    }, [users, items]);

    const loginChartData = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            return date;
        }).reverse();

        const dailyLogins = new Map<string, number>(last7Days.map(d => [d.toISOString().split('T')[0], 0]));

        users.forEach(user => {
            (user.loginHistory || []).forEach(loginDate => {
                const d = new Date(loginDate).toISOString().split('T')[0];
                if (dailyLogins.has(d)) {
                    dailyLogins.set(d, dailyLogins.get(d)! + 1);
                }
            });
        });

        return Array.from(dailyLogins.entries()).map(([date, count]) => ({ date, count }));
    }, [users]);
    
    const userMetrics = React.useMemo(() => {
        const savedOutfitsByUser = new Map<string, number>();
        savedOutfits.forEach(outfit => {
            savedOutfitsByUser.set(outfit.userId, (savedOutfitsByUser.get(outfit.userId) || 0) + 1);
        });

        const itemsByUser = new Map<string, number>();
        items.forEach(item => {
            itemsByUser.set(item.userId, (itemsByUser.get(item.userId) || 0) + 1);
        });
        
        return users.map(user => ({
            userId: user.id,
            wardrobeSize: itemsByUser.get(user.id) || 0,
            savedOutfits: savedOutfitsByUser.get(user.id) || 0,
        }));

    }, [users, items, savedOutfits]);

    const getUserWardrobeSize = (userId: string) => {
        return items.filter(item => item.userId === userId).length;
    };

    if (isLoading) {
        return (
             <div className="flex items-center justify-center min-h-[300px]">
                <SpinnerIcon className="w-8 h-8 text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-serif font-bold text-foreground">Admin Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={stats.totalUsers} icon={<UserIcon className="w-6 h-6"/>} />
                <StatCard title="Active Users (24h)" value={stats.activeUsers24h} icon={<TrendingUpIcon className="w-6 h-6"/>} />
                <StatCard title="Items Cataloged" value={stats.totalItems} icon={<WardrobeIcon className="w-6 h-6"/>} />
            </div>

            {/* Charts and Top Users */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <LoginFrequencyChart loginData={loginChartData} />
                </div>
                <div>
                    <TopUsers users={users} userMetrics={userMetrics} />
                </div>
            </div>
            
            {/* User Table */}
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-serif font-bold text-card-foreground mb-6">All Users</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Wardrobe Size</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Last Login</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Roles</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt={user.name} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-card-foreground">{user.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-foreground/80">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
                                        {getUserWardrobeSize(user.id)} items
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.roles.map(role => (
                                            <span key={role} className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                role === 'admin' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                                            }`}>
                                                {role}
                                            </span>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
