import React, { useState, useMemo, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import type { User, UserRole } from './types';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/Header';
import { getSessionUser, setSessionUser, clearSession, updateUser as storageUpdateUser, getUsers } from './services/storageService';
import { SpinnerIcon } from './components/icons';
import LandingPage from './components/LandingPage';
import { ThemeProvider } from './context/ThemeContext';

const AppContent: React.FC = () => {
    const { user, role, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <SpinnerIcon className="w-12 h-12 text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                {role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
            </main>
        </div>
    );
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>('user');
    const [isLoading, setIsLoading] = useState(true);
    const [isFirstVisit, setFirstVisit] = useState(!sessionStorage.getItem('hasVisited'));

    useEffect(() => {
        // Prime the DB connection on startup
        getUsers();
        
        try {
            const sessionUser = getSessionUser();
            if (sessionUser) {
                setUser(sessionUser);
                setRole(sessionUser.roles.includes('admin') ? 'admin' : sessionUser.roles.includes('user') ? 'user' : 'user');
            }
        } catch (error) {
            console.error("Failed to load session:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleGetStarted = () => {
        sessionStorage.setItem('hasVisited', 'true');
        setFirstVisit(false);
    };

    const login = (loggedInUser: User) => {
        const userWithLoginData = {
            ...loggedInUser,
            lastLogin: new Date(),
            loginHistory: [...(loggedInUser.loginHistory || []), new Date()].slice(-100) // Keep last 100 logins
        };
        setUser(userWithLoginData);
        setRole('user');
        setSessionUser(userWithLoginData);
        storageUpdateUser(userWithLoginData); // Persist changes
    };

    const logout = () => {
        setUser(null);
        clearSession();
    };

    const switchRole = (newRole: UserRole) => {
        if (user && user.roles.includes(newRole)) {
            setRole(newRole);
        }
    };
    
    const updateUser = async (updatedUser: User) => {
        setUser(updatedUser);
        setSessionUser(updatedUser); // Keep session in sync
        await storageUpdateUser(updatedUser);
    }

    const authContextValue = useMemo(() => ({
        user,
        role,
        login,
        logout,
        switchRole,
        isLoading,
        updateUser,
    }), [user, role, isLoading]);

    return (
        <ThemeProvider>
            {isFirstVisit ? (
                <LandingPage onGetStarted={handleGetStarted} />
            ) : (
                <AuthContext.Provider value={authContextValue}>
                    <AppContent />
                </AuthContext.Provider>
            )}
        </ThemeProvider>
    );
};

export default App;