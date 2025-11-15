import React, { useState, useEffect } from 'react';
import type { Outfit, User } from '../types';
import { getPublicOutfits, likeOutfit } from '../services/storageService';
import { SpinnerIcon, HeartIcon } from './icons';
import ItemCard from './ItemCard';

interface PublicOutfitCardProps {
    outfit: Outfit & { creator: User };
    onLike: (outfitId: string) => void;
}

const PublicOutfitCard: React.FC<PublicOutfitCardProps> = ({ outfit, onLike }) => {
    const [localLikes, setLocalLikes] = useState(outfit.likes || 0);

    const handleLike = () => {
        onLike(outfit.id);
        setLocalLikes(prev => prev + 1);
    };

    return (
         <div className="bg-card/80 border border-border p-4 rounded-xl flex flex-col animate-fadeIn">
            <div className="flex items-center mb-3">
                <img src={outfit.creator.avatarUrl} alt={outfit.creator.name} className="w-10 h-10 rounded-full mr-3"/>
                <div>
                    <p className="font-bold text-card-foreground">{outfit.name}</p>
                    <p className="text-sm text-foreground/70">by {outfit.creator.name}</p>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {outfit.items.slice(0, 6).map(item => <ItemCard key={item.id} item={item} />)}
            </div>
            <div className="mt-auto flex justify-between items-center pt-2 border-t border-border">
                <p className="text-sm text-foreground/70 capitalize">{outfit.occasion}</p>
                <div className="flex items-center gap-2">
                    <button onClick={handleLike} className="flex items-center text-foreground/70 hover:text-accent transition-colors">
                        <HeartIcon className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-foreground/80">{localLikes}</span>
                </div>
            </div>
        </div>
    );
};


const CommunityFeed: React.FC = () => {
    const [outfits, setOutfits] = useState<(Outfit & { creator: User })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchOutfits();
    }, []);

    const fetchOutfits = async () => {
        setIsLoading(true);
        setError('');
        try {
            const publicOutfits = await getPublicOutfits();
            setOutfits(publicOutfits);
        } catch (err) {
            console.error("Failed to fetch community outfits:", err);
            setError("Could not load the community feed. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLike = async (outfitId: string) => {
        try {
            await likeOutfit(outfitId);
            // The local state update is optimistic, so we don't need to re-fetch here.
        } catch (error) {
            console.error("Failed to like outfit:", error);
            // Optionally, revert the optimistic update on error
        }
    };


    if (isLoading) {
        return (
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center flex items-center justify-center min-h-[400px]">
                <SpinnerIcon className="w-8 h-8 text-primary mx-auto" />
            </div>
        );
    }
    
    if (error) {
        return <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center text-accent">{error}</div>
    }

    return (
        <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold text-card-foreground mb-2">Style Feed</h1>
            <p className="text-foreground/70 mb-6">Discover and get inspired by outfits from the Chroma community.</p>

            {outfits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {outfits.map(outfit => (
                        <PublicOutfitCard key={outfit.id} outfit={outfit} onLike={handleLike} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
                    <p className="text-foreground/70">The community feed is quiet right now.</p>
                    <p className="text-foreground/50 text-sm mt-1">Be the first to share an outfit from your "Saved Outfits"!</p>
                </div>
            )}
        </div>
    );
};

export default CommunityFeed;
