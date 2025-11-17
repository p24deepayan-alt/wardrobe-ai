import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import type { Outfit, User } from '../types';
import { getSavedOutfitsByUserId, deleteSavedOutfit, updateSavedOutfit, publishOutfit, getItemsByUserId, getHydratedCollectedOutfits } from '../services/storageService';
import ItemCard from './ItemCard';
import { SpinnerIcon, TrashIcon, PencilIcon, MagicWandIcon, ShareIcon } from './icons';
import RenameOutfitModal from './RenameOutfitModal';
import { checkAndAwardAchievements } from '../services/achievementService';

const SavedOutfitCard: React.FC<{
    outfit: Outfit;
    onDelete: (outfitId: string) => void;
    onRename: (outfit: Outfit) => void;
    onShare: (outfitId: string) => void;
}> = ({ outfit, onDelete, onRename, onShare }) => {
    return (
        <div className="bg-background/50 border border-border p-4 rounded-lg flex flex-col">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-serif font-bold text-lg text-card-foreground">{outfit.name}</h3>
                    <p className="font-normal text-sm text-foreground/80 capitalize">{outfit.occasion}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onShare(outfit.id)} 
                        disabled={!!outfit.isPublic}
                        className="p-2 text-foreground/70 hover:text-secondary disabled:text-secondary/50 disabled:cursor-not-allowed transition-colors" 
                        aria-label={!!outfit.isPublic ? "Shared to community" : "Share to community"}
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

const CollectedOutfitCard: React.FC<{ outfit: Outfit & { creator: User } }> = ({ outfit }) => (
    <div className="bg-background/50 border border-border p-4 rounded-lg flex flex-col">
        <div className="flex items-center mb-3">
            <img src={outfit.creator.avatarUrl} alt={outfit.creator.name} className="w-8 h-8 rounded-full mr-3" />
            <div>
                <h3 className="font-serif font-bold text-lg text-card-foreground">{outfit.name}</h3>
                <p className="text-sm text-foreground/70">by {outfit.creator.name}</p>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {outfit.items.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
    </div>
);


const SavedOutfits: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [view, setView] = useState<'creations' | 'collection'>('creations');
    const [createdOutfits, setCreatedOutfits] = useState<Outfit[]>([]);
    const [collectedOutfits, setCollectedOutfits] = useState<(Outfit & { creator: User })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [outfitToRename, setOutfitToRename] = useState<Outfit | null>(null);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            Promise.all([
                getSavedOutfitsByUserId(user.id),
                getItemsByUserId(user.id),
                getHydratedCollectedOutfits(user.id)
            ])
            .then(([saved, wardrobe, collected]) => {
                const wardrobeMap = new Map(wardrobe.map(item => [item.id, item]));
                const hydratedSaved = saved.map(outfit => ({
                    ...outfit,
                    items: outfit.items.map(itemStub => wardrobeMap.get(itemStub.id) || itemStub)
                }));
                setCreatedOutfits(hydratedSaved.sort((a, b) => b.id.localeCompare(a.id)));
                setCollectedOutfits(collected);
            })
            .catch(err => console.error("Failed to load saved outfits", err))
            .finally(() => setIsLoading(false));
        }
    }, [user]);
    
    useEffect(() => {
        if (user && createdOutfits.length > 0) {
             checkAndAwardAchievements(user, { savedOutfitsCount: createdOutfits.length }, updateUser);
        }
    }, [user, createdOutfits, updateUser]);

    const handleDelete = async (outfitId: string) => {
        if (window.confirm("Are you sure you want to delete this saved outfit?")) {
            await deleteSavedOutfit(outfitId);
            setCreatedOutfits(prev => prev.filter(o => o.id !== outfitId));
        }
    };

    const handleRenameSave = async (newName: string) => {
        if (!outfitToRename) return;
        const updatedOutfit = { ...outfitToRename, name: newName };
        await updateSavedOutfit(updatedOutfit);
        setCreatedOutfits(prev => prev.map(o => o.id === updatedOutfit.id ? updatedOutfit : o));
        setOutfitToRename(null);
    };

    const handleShare = async (outfitId: string) => {
        if (!user) return;
        try {
            const updatedOutfit = await publishOutfit(outfitId);
            setCreatedOutfits(prev => prev.map(o => o.id === outfitId ? updatedOutfit : o));
            checkAndAwardAchievements(user, { hasShared: true }, updateUser);
        } catch (error) {
            console.error("Failed to share outfit", error);
        }
    };

    const renderContent = () => {
        if (isLoading) {
             return (
                <div className="text-center flex items-center justify-center min-h-[200px]">
                    <SpinnerIcon className="w-8 h-8 text-primary mx-auto" />
                </div>
            );
        }
        if (view === 'creations') {
            return createdOutfits.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {createdOutfits.map(outfit => (
                        <SavedOutfitCard key={outfit.id} outfit={outfit} onDelete={handleDelete} onRename={setOutfitToRename} onShare={handleShare} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
                    <p className="text-foreground/70">You haven't saved any outfits yet.</p>
                    <p className="text-foreground/50 text-sm mt-1">Go to "Daily Style" to generate and save new looks!</p>
                </div>
            );
        }
        if (view === 'collection') {
            return collectedOutfits.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {collectedOutfits.map(outfit => (
                        <CollectedOutfitCard key={outfit.id} outfit={outfit} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
                    <p className="text-foreground/70">Your collection is empty.</p>
                    <p className="text-foreground/50 text-sm mt-1">Explore the Community feed to discover and save outfits!</p>
                </div>
            );
        }
    };

    return (
        <>
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-serif font-bold text-card-foreground">Saved Outfits</h1>
                    <div className="flex items-center text-sm bg-input p-1 rounded-full">
                        <button onClick={() => setView('creations')} className={`px-4 py-1.5 rounded-full transition-all ${view === 'creations' ? 'bg-card shadow font-semibold' : 'text-foreground/70'}`}>My Creations</button>
                        <button onClick={() => setView('collection')} className={`px-4 py-1.5 rounded-full transition-all ${view === 'collection' ? 'bg-card shadow font-semibold' : 'text-foreground/70'}`}>My Collection</button>
                    </div>
                </div>
                {renderContent()}
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