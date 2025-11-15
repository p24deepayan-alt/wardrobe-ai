import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import type { Outfit } from '../types';
import { getSavedOutfitsByUserId, deleteSavedOutfit, updateSavedOutfit, publishOutfit, getItemsByUserId } from '../services/storageService';
import ItemCard from './ItemCard';
import { SpinnerIcon, TrashIcon, PencilIcon, MagicWandIcon, ShareIcon } from './icons';
import RenameOutfitModal from './RenameOutfitModal';
import { checkAndAwardAchievements } from '../services/achievementService';

interface SavedOutfitCardProps {
    outfit: Outfit;
    onDelete: (outfitId: string) => void;
    onRename: (outfit: Outfit) => void;
    onShare: (outfitId: string) => void;
}

const SavedOutfitCard: React.FC<SavedOutfitCardProps> = ({ outfit, onDelete, onRename, onShare }) => {
    return (
        <div className="bg-background/50 border border-border p-4 rounded-lg flex flex-col">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-lg text-card-foreground">{outfit.name}</h3>
                    <p className="font-normal text-sm text-foreground/80 capitalize">{outfit.occasion}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onShare(outfit.id)} 
                        disabled={outfit.isPublic}
                        className="p-2 text-foreground/70 hover:text-secondary disabled:text-secondary/50 disabled:cursor-not-allowed transition-colors" 
                        aria-label={outfit.isPublic ? "Shared to community" : "Share to community"}
                    >
                        <ShareIcon className="w-4 h-4"/>
                    </button>
                    <button onClick={() => onRename(outfit)} className="p-2 text-foreground/70 hover:text-primary transition-colors" aria-label="Rename outfit"><PencilIcon className="w-4 h-4"/></button>
                    <button onClick={() => onDelete(outfit.id)} className="p-2 text-foreground/70 hover:text-accent transition-colors" aria-label="Delete outfit"><TrashIcon className="w-4 h-4"/></button>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {outfit.items.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
            {outfit.explanation && (
                <div className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary/50 mt-auto">
                    <div className="flex items-start">
                        <MagicWandIcon className="w-5 h-5 mr-3 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground/90">{outfit.explanation}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const SavedOutfits: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [outfitToRename, setOutfitToRename] = useState<Outfit | null>(null);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            Promise.all([
                getSavedOutfitsByUserId(user.id),
                getItemsByUserId(user.id)
            ])
            .then(([outfits, wardrobe]) => {
                const wardrobeMap = new Map(wardrobe.map(item => [item.id, item]));
                const hydratedOutfits = outfits.map(outfit => ({
                    ...outfit,
                    items: outfit.items.map(itemStub => wardrobeMap.get(itemStub.id) || itemStub)
                }));
                setSavedOutfits(hydratedOutfits.sort((a, b) => b.id.localeCompare(a.id)));
            })
            .catch(err => console.error("Failed to load saved outfits", err))
            .finally(() => setIsLoading(false));
        }
    }, [user]);
    
    useEffect(() => {
        if (user && savedOutfits.length > 0) {
             checkAndAwardAchievements(user, { savedOutfitsCount: savedOutfits.length }, updateUser);
        }
    }, [user, savedOutfits, updateUser]);

    const handleDelete = async (outfitId: string) => {
        if (window.confirm("Are you sure you want to delete this saved outfit?")) {
            await deleteSavedOutfit(outfitId);
            setSavedOutfits(prev => prev.filter(o => o.id !== outfitId));
        }
    };

    const handleRenameSave = async (newName: string) => {
        if (!outfitToRename) return;
        const updatedOutfit = { ...outfitToRename, name: newName };
        await updateSavedOutfit(updatedOutfit);
        setSavedOutfits(prev => prev.map(o => o.id === updatedOutfit.id ? updatedOutfit : o));
        setOutfitToRename(null);
    };

    const handleShare = async (outfitId: string) => {
        if (!user) return;
        try {
            const updatedOutfit = await publishOutfit(outfitId);
            setSavedOutfits(prev => prev.map(o => o.id === outfitId ? updatedOutfit : o));
            // Check for social achievement
            checkAndAwardAchievements(user, { hasShared: true }, updateUser);
        } catch (error) {
            console.error("Failed to share outfit", error);
        }
    };


    if (isLoading) {
        return (
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center flex items-center justify-center min-h-[200px]">
                <SpinnerIcon className="w-8 h-8 text-primary mx-auto" />
            </div>
        );
    }

    return (
        <>
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <h1 className="text-2xl font-bold text-card-foreground mb-6">Saved Outfits</h1>
                {savedOutfits.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {savedOutfits.map(outfit => (
                            <SavedOutfitCard 
                                key={outfit.id} 
                                outfit={outfit} 
                                onDelete={handleDelete}
                                onRename={setOutfitToRename}
                                onShare={handleShare}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
                        <p className="text-foreground/70">You haven't saved any outfits yet.</p>
                        <p className="text-foreground/50 text-sm mt-1">Go to "Daily Style" to generate and save new looks!</p>
                    </div>
                )}
            </div>
            {outfitToRename && (
                <RenameOutfitModal
                    currentName={outfitToRename.name}
                    onClose={() => setOutfitToRename(null)}
                    onSave={handleRenameSave}
                />
            )}
        </>
    );
};

export default SavedOutfits;
