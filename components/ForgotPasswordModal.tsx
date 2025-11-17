import React, { useState } from 'react';
import { SpinnerIcon, MailIcon } from './icons';

interface ForgotPasswordModalProps {
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        // NOTE: In a real Firebase app, you would call `sendPasswordResetEmail(auth, email)` here.
        // This is a client-side only simulation, so we cannot securely implement password resets.
        setTimeout(() => {
            setSuccessMessage(`Password reset functionality is handled by the backend. In a real app, an email would be sent to ${email}.`);
            setIsLoading(false);
        }, 1000);
    };


    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-md animate-slideInUp">
                <h2 className="text-2xl font-serif font-bold mb-4 text-card-foreground">
                    Reset Your Password
                </h2>
                
                {error && <p className="text-sm text-accent text-center mb-4">{error}</p>}
                {successMessage && <p className="text-sm text-green-400 text-center mb-4">{successMessage}</p>}
                
                <form onSubmit={handleRequestReset}>
                    <p className="text-sm text-foreground/80 mb-4">Enter your email address and we will send you a link to reset your password.</p>
                    <div className="relative mb-4">
                        <MailIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input type="email" placeholder="Your Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"/>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                         <button type="button" onClick={onClose} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                        <button type="submit" disabled={isLoading || !!successMessage} className="px-5 py-2.5 min-w-[150px] bg-primary text-primary-foreground font-semibold rounded-lg disabled:opacity-50 hover:bg-primary/90 flex items-center justify-center transition-all active:scale-95">
                            {isLoading ? <SpinnerIcon className="h-5 w-5" /> : 'Send Reset Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;