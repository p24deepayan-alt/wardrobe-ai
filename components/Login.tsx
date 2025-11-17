import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import { MailIcon, LockIcon, UserIcon, SpinnerIcon, LogoIcon } from './icons';
import { getUsers, addUser } from '../services/storageService';
import type { User } from '../types';
import ForgotPasswordModal from './ForgotPasswordModal';
import ThemeSwitcher from './ThemeSwitcher';

const Login: React.FC = () => {
    const { login } = useAuth();
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const users = await getUsers();
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                login(user);
            } else {
                setError('Invalid email or password.');
            }
        } catch (err) {
            setError('Could not verify credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            setError('All fields are required.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const users = await getUsers();
            if (users.some(u => u.email === email)) {
                setError('An account with this email already exists.');
                setIsLoading(false);
                return;
            }
            const newUser: User = {
                id: `user-${Date.now()}`,
                name,
                email,
                password, // In a real app, this must be hashed
                avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${name}`,
                roles: ['user'],
            };
            await addUser(newUser);
            login(newUser);
        } catch (err) {
             setError('Could not create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="relative flex items-center justify-center min-h-screen bg-background p-4">
                <ThemeSwitcher className="absolute top-4 right-4" />
                <div className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-2xl shadow-lg">
                    <div className="text-center">
                        <LogoIcon className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h1 className="text-4xl font-serif font-bold text-card-foreground tracking-tight">
                            {isLoginView ? 'Welcome Back' : 'Create an Account'}
                        </h1>
                        <p className="mt-2 text-foreground/80">
                            {isLoginView ? 'Sign in to access your digital stylist.' : 'Join us and revolutionize your style.'}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={isLoginView ? handleLogin : handleSignUp}>
                        {!isLoginView && (
                            <div className="relative">
                                <UserIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                        )}
                         <div className="relative">
                            <MailIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                         <div className="relative">
                            <LockIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        
                        {isLoginView && (
                            <div className="text-right">
                                <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="text-sm font-medium text-primary hover:underline focus:outline-none">
                                    Forgot Password?
                                </button>
                            </div>
                        )}
                        
                        {error && <p className="text-sm text-accent text-center">{error}</p>}

                        <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring focus:ring-offset-background transition-all duration-300 transform active:scale-95 disabled:bg-opacity-60 disabled:scale-100">
                            {isLoading ? <SpinnerIcon className="w-6 h-6" /> : (isLoginView ? 'Sign In' : 'Sign Up')}
                        </button>
                    </form>

                    <p className="text-sm text-center text-foreground/60">
                        {isLoginView ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="font-semibold text-primary hover:underline ml-2 focus:outline-none">
                            {isLoginView ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>
            {isForgotPasswordOpen && <ForgotPasswordModal onClose={() => setIsForgotPasswordOpen(false)} />}
        </>
    );
};

export default Login;