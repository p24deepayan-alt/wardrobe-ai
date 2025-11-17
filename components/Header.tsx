import React, { useState, useRef, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { LogoutIcon, ChevronDownIcon, LogoIcon, FireIcon } from './icons';
import ThemeSwitcher from './ThemeSwitcher';

const Header: React.FC = () => {
    const { user, role, logout, switchRole } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    if (!user) return null;

    return (
        <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-lg border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-2">
                        <LogoIcon className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-serif font-bold text-foreground">Chroma</span>
                    </div>
                    <div className="flex items-center">
                        <ThemeSwitcher className="mr-4" />
                        {user.loginStreak && user.loginStreak > 1 && (
                            <div className="flex items-center mr-4" title={`You're on a ${user.loginStreak}-day streak!`}>
                                <FireIcon className="h-5 w-5 text-orange-500"/>
                                <span className="text-sm font-bold text-orange-500 ml-1">{user.loginStreak}</span>
                            </div>
                        )}
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors">
                                <img className="h-8 w-8 rounded-full" src={user.avatarUrl} alt={user.name} />
                                <div className="text-left hidden md:block">
                                    <span className="block text-sm font-medium text-foreground">{user.name}</span>
                                    <span className="block text-xs text-foreground/70 capitalize">{role} View</span>
                                </div>
                                <ChevronDownIcon className={`h-5 w-5 text-foreground/70 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}/>
                            </button>
                            {dropdownOpen && (
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover border border-border z-10 animate-fadeIn">
                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                        {user.roles.includes('admin') && role !== 'admin' && (
                                            <a href="#" onClick={(e) => { e.preventDefault(); switchRole('admin'); setDropdownOpen(false); }} className="block px-4 py-2 text-sm text-popover-foreground hover:bg-background" role="menuitem">Switch to Admin</a>
                                        )}
                                        {user.roles.includes('user') && role !== 'user' && (
                                            <a href="#" onClick={(e) => { e.preventDefault(); switchRole('user'); setDropdownOpen(false); }} className="block px-4 py-2 text-sm text-popover-foreground hover:bg-background" role="menuitem">Switch to User</a>
                                        )}
                                        <div className="border-t border-border my-1"></div>
                                        <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="flex items-center px-4 py-2 text-sm text-accent hover:bg-background" role="menuitem">
                                            <LogoutIcon className="h-5 w-5 mr-2" />
                                            Logout
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;