import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Outfit, User, Comment as CommentType, ClothingItem } from '../types';
import { getPublicOutfits, toggleLikeOutfit, getCommentsByOutfitId, addComment, toggleCollectOutfit, getUsers } from '../services/storageService';
import useAuth from '../hooks/useAuth';
import { SpinnerIcon, HeartIcon, CommentIcon, SendIcon, BookmarkIcon } from './icons';
import ItemCard from './ItemCard';

// --- HELPER TYPES ---
type HydratedComment = CommentType & { user: User };
type PublicOutfit = Outfit & { creator: User };

// --- TIME FORMATTER ---
const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min";
    return Math.floor(seconds) + "s";
};

// --- COMMENT SECTION COMPONENT ---
const CommentSection: React.FC<{ outfitId: string }> = ({ outfitId }) => {
    const { user: currentUser } = useAuth();
    const [comments, setComments] = useState<HydratedComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchComments = async () => {
            setIsLoading(true);
            const fetchedComments = await getCommentsByOutfitId(outfitId);
            const users = await getUsers();
            const userMap = new Map(users.map(u => [u.id, u]));
            const hydrated = fetchedComments
                .map(c => ({...c, user: userMap.get(c.userId)}))
                .filter(c => c.user)
                .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            setComments(hydrated as HydratedComment[]);
            setIsLoading(false);
        };
        fetchComments();
    }, [outfitId]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUser) return;
        const optimisticComment: HydratedComment = {
            id: `temp-${Date.now()}`,
            outfitId,
            userId: currentUser.id,
            text: newComment.trim(),
            createdAt: new Date(),
            user: currentUser,
        };
        setComments(prev => [...prev, optimisticComment]);
        setNewComment('');

        try {
            const savedComment = await addComment({ outfitId, userId: currentUser.id, text: optimisticComment.text });
            setComments(prev => prev.map(c => c.id === optimisticComment.id ? { ...optimisticComment, ...savedComment } : c));
        } catch (error) {
            console.error("Failed to post comment:", error);
            setComments(prev => prev.filter(c => c.id !== optimisticComment.id)); // Rollback on error
        }
    };

    return (
        <div className="pt-2">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {isLoading ? <SpinnerIcon className="w-5 h-5 mx-auto text-primary" /> : comments.map(comment => (
                    <div key={comment.id} className="flex items-start gap-2 text-sm">
                        <img src={comment.user.avatarUrl} alt={comment.user.name} className="w-6 h-6 rounded-full mt-0.5" />
                        <div>
                            <span className="font-semibold text-card-foreground mr-1.5">{comment.user.name}</span>
                            <span className="text-foreground/90">{comment.text}</span>
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-3 mt-2 border-t border-border">
                <img src={currentUser?.avatarUrl} alt="Your avatar" className="w-7 h-7 rounded-full"/>
                <input 
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-grow bg-transparent text-sm focus:outline-none"
                />
                <button type="submit" disabled={!newComment.trim()} className="disabled:opacity-40 text-secondary">
                    <SendIcon className="w-5 h-5"/>
                </button>
            </form>
        </div>
    );
};


// --- OUTFIT CARD COMPONENT ---
const PublicOutfitCard: React.FC<{
    outfit: PublicOutfit;
    currentUser: User | null;
    onUpdateOutfit: (updatedOutfit: PublicOutfit) => void;
    onUserUpdate: (updatedUser: User) => void;
}> = ({ outfit, currentUser, onUpdateOutfit, onUserUpdate }) => {
    const [showComments, setShowComments] = useState(false);

    const handleLike = async () => {
        if (!currentUser) return;
        const isLiked = outfit.likes?.includes(currentUser.id);
        const optimisticLikes = isLiked
            ? outfit.likes?.filter(id => id !== currentUser.id)
            : [...(outfit.likes || []), currentUser.id];
        
        onUpdateOutfit({ ...outfit, likes: optimisticLikes });
        try {
            await toggleLikeOutfit(outfit.id, currentUser.id);
        } catch (error) {
            console.error("Failed to toggle like:", error);
            onUpdateOutfit(outfit); // Revert on error
        }
    };
    
    const handleCollect = async () => {
        if (!currentUser) return;
        // This action updates the user object, not the outfit object.
        // We'll optimistically update the UI by calling updateUser from the parent.
        const updatedUser = await toggleCollectOutfit(outfit.id, currentUser.id);
        onUserUpdate(updatedUser);
    };

    const isLiked = currentUser ? outfit.likes?.includes(currentUser.id) : false;
    const isCollected = currentUser ? currentUser.collectedOutfitIds?.includes(outfit.id) : false;
    
    return (
        <div className="bg-card/80 border border-border rounded-xl flex flex-col animate-fadeIn">
            <div className="p-3 flex items-center">
                <img src={outfit.creator.avatarUrl} alt={outfit.creator.name} className="w-9 h-9 rounded-full mr-3"/>
                <div>
                    <p className="font-bold text-sm text-card-foreground">{outfit.creator.name}</p>
                    <p className="text-xs text-foreground/70 capitalize">{outfit.occasion}</p>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-1 px-1">
                {outfit.items.slice(0, 6).map(item => <ItemCard key={item.id} item={item} />)}
            </div>
            <div className="p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={handleLike} className={`transition-colors ${isLiked ? 'text-accent' : 'text-foreground/70 hover:text-foreground'}`} aria-label="Like">
                            <HeartIcon className="w-6 h-6" isFilled={isLiked} />
                        </button>
                        <button onClick={() => setShowComments(!showComments)} className="text-foreground/70 hover:text-foreground transition-colors" aria-label="Comment">
                            <CommentIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <button onClick={handleCollect} className={`transition-colors ${isCollected ? 'text-primary' : 'text-foreground/70 hover:text-foreground'}`} aria-label="Collect outfit">
                        <BookmarkIcon className="w-6 h-6" isFilled={isCollected}/>
                    </button>
                </div>
                <p className="text-sm font-semibold mt-2 text-card-foreground">{(outfit.likes?.length || 0).toLocaleString()} likes</p>
                <p className="text-sm text-foreground/90 mt-1">
                    <span className="font-semibold text-card-foreground mr-1.5">{outfit.name}</span>
                    {outfit.explanation}
                </p>
                {showComments && <CommentSection outfitId={outfit.id} />}
            </div>
        </div>
    );
};

// --- MAIN FEED COMPONENT ---
const CommunityFeed: React.FC = () => {
    const { user: currentUser, updateUser } = useAuth();
    const [outfits, setOutfits] = useState<PublicOutfit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);

    const lastOutfitElementRef = useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore]);
    
    useEffect(() => {
        const fetchOutfits = async () => {
            setIsLoading(true);
            setError('');
            try {
                const { outfits: publicOutfits, hasMore: newHasMore } = await getPublicOutfits(page);
                setOutfits(prev => page === 1 ? publicOutfits : [...prev, ...publicOutfits]);
                setHasMore(newHasMore);
            } catch (err) {
                console.error("Failed to fetch community outfits:", err);
                setError("Could not load the community feed. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchOutfits();
    }, [page]);
    
    const handleUpdateOutfit = (updatedOutfit: PublicOutfit) => {
        setOutfits(prevOutfits => prevOutfits.map(o => o.id === updatedOutfit.id ? updatedOutfit : o));
    };

    if (page === 1 && isLoading) {
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
            <h1 className="text-3xl font-serif font-bold text-card-foreground mb-2">Style Feed</h1>
            <p className="text-foreground/70 mb-6">Discover and get inspired by outfits from the Chroma community.</p>

            {outfits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {outfits.map((outfit, index) => (
                        <div key={outfit.id} ref={outfits.length === index + 1 ? lastOutfitElementRef : null}>
                            <PublicOutfitCard outfit={outfit} currentUser={currentUser} onUpdateOutfit={handleUpdateOutfit} onUserUpdate={updateUser} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
                    <p className="text-foreground/70">The community feed is quiet right now.</p>
                    <p className="text-foreground/50 text-sm mt-1">Be the first to share an outfit from your "Saved Outfits"!</p>
                </div>
            )}
            {isLoading && page > 1 && (
                <div className="flex justify-center pt-8">
                    <SpinnerIcon className="w-8 h-8 text-primary"/>
                </div>
            )}
        </div>
    );
};

export default CommunityFeed;