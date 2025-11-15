import React, { useState } from 'react';
import { requestPasswordReset, resetPassword } from '../services/storageService';
import { SpinnerIcon, MailIcon, LockIcon, KeyIcon } from './icons';

interface ForgotPasswordModalProps {
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
    const [step, setStep] = useState(1); // 1: Request, 2: Reset
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleRequestReset = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        
        setTimeout(() => { // Simulate network delay
            const result = requestPasswordReset(email);
            if (result.success && result.token) {
                setSuccessMessage(`A reset token has been generated. In a real app, this would be emailed to you. For this demo, please copy the token below and proceed.`);
                setToken(result.token);
                setStep(2);
            } else {
                setError(result.error || 'An unknown error occurred.');
            }
            setIsLoading(false);
        }, 500);
    };

    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
             setError('Password must be at least 6 characters long.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        setTimeout(() => { // Simulate network delay
            const result = resetPassword(token, newPassword);
            if (result.success) {
                setSuccessMessage('Your password has been successfully reset! You can now log in.');
                setTimeout(onClose, 3000);
            } else {
                setError(result.error || 'Failed to reset password.');
            }
            setIsLoading(false);
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-md animate-slideInUp">
                <h2 className="text-xl font-bold mb-4 text-card-foreground">
                    {step === 1 ? 'Reset Your Password' : 'Enter New Password'}
                </h2>
                
                {error && <p className="text-sm text-accent text-center mb-4">{error}</p>}
                {successMessage && <p className="text-sm text-green-400 text-center mb-4">{successMessage}</p>}
                
                {step === 1 && (
                    <form onSubmit={handleRequestReset}>
                        <p className="text-sm text-foreground/80 mb-4">Enter your email and we'll generate a token to reset your password.</p>
                        <div className="relative mb-4">
                            <MailIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input type="email" placeholder="Your Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"/>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                             <button type="button" onClick={onClose} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                            <button type="submit" disabled={isLoading} className="px-5 py-2.5 min-w-[150px] bg-primary text-primary-foreground font-semibold rounded-lg disabled:opacity-50 hover:bg-primary/90 flex items-center justify-center transition-all active:scale-95">
                                {isLoading ? <SpinnerIcon className="h-5 w-5" /> : 'Get Token'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="space-y-4">
                             <div className="relative">
                                <KeyIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input type="text" placeholder="Paste Reset Token" value={token} onChange={e => setToken(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                            <div className="relative">
                                <LockIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                            <div className="relative">
                                <LockIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                            <button type="submit" disabled={isLoading || !!successMessage} className="px-5 py-2.5 min-w-[150px] bg-primary text-primary-foreground font-semibold rounded-lg disabled:opacity-50 hover:bg-primary/90 flex items-center justify-center transition-all active:scale-95">
                                {isLoading ? <SpinnerIcon className="h-5 w-5" /> : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordModal;