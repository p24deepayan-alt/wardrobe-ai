import React, { useState, useEffect } from 'react';
import { getUsers, getItems } from '../services/storageService';
import type { User, ClothingItem } from '../types';
import { SpinnerIcon } from './icons';

const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userList, itemList] = await Promise.all([getUsers(), getItems()]);
                setUsers(userList);
                setItems(itemList);
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

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
        <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold text-card-foreground mb-6">Admin Dashboard</h1>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">User</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Wardrobe Size</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Roles</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
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
    );
};

export default AdminDashboard;
