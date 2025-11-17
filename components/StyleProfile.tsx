import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { CameraIcon, TrashIcon, SpinnerIcon, DnaIcon } from './icons';
import { achievementsList } from '../services/achievementService';
import AchievementBadge from './AchievementBadge';
import { getStyleDnaAnalysis } from '../services/geminiService';
import * as apiService from '../services/apiService';
import type { ClothingItem } from '../types';
import StyleDnaReport from './StyleDnaReport';


const StyleProfile: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // State for Style DNA
    const [isDnaLoading, setIsDnaLoading] = useState(false);
    const [dnaError, setDnaError] = useState('');
    const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);

    useEffect(() => {
        if (user) {
            apiService.getItemsByUserId(user.id).then(setWardrobe);
        }
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setError('');
            if(file.size > 4 * 1024 * 1024) {
                setError("Image is too large. Please select a file under 4MB.");
                return;
            }
            setNewImageFile(file);
            setNewImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (user && newImageFile) {
            setIsLoading(true);
            try {
                const imageUrl = await apiService.updateUserProfileImage(newImageFile, user.id);
                await updateUser({ ...user, tryOnImageUrl: imageUrl });
                setNewImageFile(null);
                setNewImagePreview(null);
            } catch (err) {
                setError("Failed to upload image.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRemove = async () => {
        if (user) {
            setIsLoading(true);
            try {
                // In a real app, you might want to delete the image from storage as well
                const { tryOnImageUrl, ...userWithoutImage } = user;
                await updateUser(userWithoutImage);
            } catch (err) {
                setError("Failed to remove image.");
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleAnalyzeDna = async () => {
        if (!user) return;
        setIsDnaLoading(true);
        setDnaError('');
        try {
            const analysis = await getStyleDnaAnalysis(wardrobe);
            await updateUser({ ...user, styleDna: analysis });
        } catch (err) {
            setDnaError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsDnaLoading(false);
        }
    };
    
    // Clean up object URL
    useEffect(() => {
        return () => {
            if (newImagePreview) {
                URL.revokeObjectURL(newImagePreview);
            }
        };
    }, [newImagePreview]);

    const currentImage = newImagePreview || user?.tryOnImageUrl;

    const userAchievements = achievementsList.filter(ach => user?.achievements?.includes(ach.id));

    return (
        <div className="space-y-8">
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <h1 className="text-3xl font-serif font-bold text-card-foreground mb-4">Style DNA</h1>
                {user?.styleDna ? (
                    <StyleDnaReport dna={user.styleDna} wardrobe={wardrobe} onReanalyze={handleAnalyzeDna} isReanalyzing={isDnaLoading} />
                ) : (
                    <div className="text-center">
                        <p className="text-foreground/70 max-w-xl mx-auto mb-6">Discover your unique style identity. Our AI will analyze your entire wardrobe to reveal your core aesthetic, color palette, key pieces, and potential style gaps.</p>
                        {dnaError && <p className="text-accent mb-4">{dnaError}</p>}
                        <button
                            onClick={handleAnalyzeDna}
                            disabled={isDnaLoading || wardrobe.length < 10}
                            className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg shadow-md hover:bg-primary/90 transition-all transform active:scale-95 flex items-center justify-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDnaLoading ? (
                                <SpinnerIcon className="w-6 h-6" />
                            ) : (
                                <>
                                    <DnaIcon className="w-5 h-5 mr-2" />
                                    Analyze My Style DNA
                                </>
                            )}
                        </button>
                        {wardrobe.length < 10 && <p className="text-xs text-foreground/60 mt-2">You need at least 10 items in your wardrobe to run an analysis.</p>}
                    </div>
                )}
            </div>

            <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-serif font-bold text-card-foreground mb-2">Virtual Try-On Profile</h2>
                <p className="text-foreground/70 mb-6">Upload a photo of yourself for the Virtual Try-On feature. A clear, front-facing photo works best.</p>

                <div className="w-full max-w-sm mx-auto space-y-4">
                    <div className="aspect-square w-full bg-background/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden">
                        {currentImage ? (
                            <img src={currentImage} alt="Your profile" className="h-full w-full object-cover" />
                        ) : (
                            <div className="text-center text-foreground/50 p-4">
                                <CameraIcon className="w-12 h-12 mx-auto mb-2" />
                                <p>No Photo Uploaded</p>
                            </div>
                        )}
                        {isLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><SpinnerIcon className="w-8 h-8"/></div>}
                    </div>
                    
                    {error && <p className="text-sm text-accent text-center">{error}</p>}
                    
                    <div className="flex gap-3">
                        <label className="flex-1 cursor-pointer px-4 py-2.5 bg-input text-foreground font-semibold rounded-lg hover:bg-border transition-colors text-center">
                            {user?.tryOnImageUrl ? 'Change Photo' : 'Upload Photo'}
                            <input type="file" accept="image/jpeg, image/png" onChange={handleFileChange} className="hidden"/>
                        </label>
                        {user?.tryOnImageUrl && !newImagePreview && (
                            <button onClick={handleRemove} className="p-2.5 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        )}
                    </div>

                    {newImagePreview && (
                        <div className="flex gap-3">
                            <button onClick={() => { setNewImageFile(null); setNewImagePreview(null); }} className="flex-1 px-4 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={isLoading} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                                {isLoading ? <SpinnerIcon className="w-5 h-5 mx-auto" /> : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

             <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-serif font-bold text-card-foreground mb-4">Achievements</h2>
                {userAchievements.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userAchievements.map(achievement => (
                            <AchievementBadge key={achievement.id} achievement={achievement} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-lg">
                        <p className="text-foreground/70">Your achievements will appear here.</p>
                        <p className="text-foreground/50 text-sm mt-1">Start by adding items to your wardrobe!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StyleProfile;