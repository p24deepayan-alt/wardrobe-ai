import React, { useState, useMemo, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import type { User, UserRole } from './types';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/Header';
import * as apiService from './services/apiService';
import { SpinnerIcon } from './components/icons';
import LandingPage from './components/LandingPage';
import { ThemeProvider } from './context/ThemeContext';
// FIX: The `onAuthStateChanged` is a method on the auth object in Firebase v8, not a separate import.
import { auth } from './services/firebase';

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
    const [isFirstVisit, setFirstVisit] = useState(!localStorage.getItem('chroma_has_visited') && !sessionStorage.getItem('hasVisited'));

    useEffect(() => {
        // FIX: Use the namespaced `auth.onAuthStateChanged` method for Firebase v8 syntax.
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    // User is signed in, get their profile from Firestore
                    const userProfile = await apiService.getProfile(firebaseUser.uid);
                    setUser(userProfile);
                    setRole(userProfile.roles.includes('admin') ? 'admin' : 'user');
                } else {
                    // User is signed out
                    setUser(null);
                }
            } catch (error) {
                console.error("Auth state change error:", error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        });
        
        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);
    
    const handleGetStarted = () => {
        sessionStorage.setItem('hasVisited', 'true');
        setFirstVisit(false);
    };
    
    const login = (loggedInUser: User) => {
        setUser(loggedInUser);
        setRole(loggedInUser.roles.includes('admin') ? 'admin' : 'user');
        sessionStorage.setItem('hasVisited', 'true');
        localStorage.setItem('chroma_has_visited', 'true');
        setFirstVisit(false);
    };

    const logout = async () => {
        await apiService.logout();
        setUser(null);
        setFirstVisit(true); // Or based on whether they want a landing page after logout
    };

    const switchRole = (newRole: UserRole) => {
        if (user && user.roles.includes(newRole)) {
            setRole(newRole);
        }
    };
    
    const updateUser = async (updatedUser: User) => {
        const userInState = await apiService.updateUser(updatedUser);
        setUser(userInState);
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
            {isFirstVisit && !user ? (
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
