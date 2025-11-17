import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import type { Outfit } from '../types';
import { generateVirtualTryOnImage } from '../services/geminiService';
import { SpinnerIcon, UserIcon, SparklesIcon } from './icons';

interface VirtualTryOnModalProps {
    outfit: Outfit;
    onClose: () => void;
}

const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({ outfit, onClose }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    useEffect(() => {
        const generateImage = async () => {
            if (!user?.tryOnImageUrl) {
                setError("Please upload a photo in your Style Profile to use this feature.");
                setIsLoading(false);
                return;
            }
            if(outfit.items.length === 0){
                 setError("This outfit has no items to try on.");
                 setIsLoading(false);
                 return;
            }
            
            setIsLoading(true);
            setError('');
            try {
                const result = await generateVirtualTryOnImage(user.tryOnImageUrl, outfit.items);
                setGeneratedImage(result);
            } catch (err) {
                console.error("Virtual Try-On failed:", err);
                setError(err instanceof Error ? err.message : "An unknown error occurred during image generation.");
            } finally {
                setIsLoading(false);
            }
        };

        generateImage();
    }, [user, outfit]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-md animate-slideInUp">
                <h2 className="text-2xl font-serif font-bold mb-4 text-card-foreground flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-2 text-secondary" />
                    Virtual Try-On
                </h2>
                
                <div className="aspect-square w-full bg-background/50 rounded-lg border border-border flex items-center justify-center relative overflow-hidden">
                    {isLoading && (
                        <div className="text-center p-4">
                            <SpinnerIcon className="w-10 h-10 text-primary mx-auto mb-3" />
                            <p className="text-foreground/80">Generating your look...</p>
                             <p className="text-xs text-foreground/60 mt-1">This may take a moment.</p>
                        </div>
                    )}
                    {error && (
                        <div className="text-center p-4">
                            <p className="text-accent">{error}</p>
                            {/* In a real app, you might link to the profile page:
                            <button onClick={onClose} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">Go to Profile</button> 
                            */}
                        </div>
                    )}
                    {generatedImage && (
                        <img src={generatedImage} alt="Virtual try-on result" className="h-full w-full object-contain" />
                    )}
                     {!isLoading && !error && !generatedImage && !user?.tryOnImageUrl && (
                        <div className="text-center text-foreground/50 p-4">
                            <UserIcon className="w-12 h-12 mx-auto mb-2" />
                            <p>No Profile Photo Found</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};

export default VirtualTryOnModal;