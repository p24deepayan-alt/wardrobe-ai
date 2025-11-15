import React, { useState, useEffect } from 'react';
import { getDiscardSuggestions, getShoppingSuggestions } from '../services/geminiService';
import type { ClothingItem, ShoppingSuggestion } from '../types';
import { getItemsByUserId, deleteItems } from '../services/storageService';
import useAuth from '../hooks/useAuth';
import { SpinnerIcon, TrashIcon } from './icons';

const Enhancements: React.FC = () => {
    const { user } = useAuth();
    const [discardSuggestions, setDiscardSuggestions] = useState<{ item: ClothingItem, reason: string }[]>([]);
    const [shoppingSuggestions, setShoppingSuggestions] = useState<ShoppingSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedForDiscard, setSelectedForDiscard] = useState<string[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userWardrobe, setUserWardrobe] = useState<ClothingItem[]>([]);

    useEffect(() => {
        if (!user) return;
        
        const fetchWardrobeAndSuggestions = async () => {
            const wardrobe = await getItemsByUserId(user.id);
            setUserWardrobe(wardrobe);
            
            if (wardrobe.length === 0) {
                 setIsLoading(false);
                 return;
            }

            // Nested function to get location and then fetch AI suggestions
            const fetchSuggestionsWithLocation = (location?: {latitude: number, longitude: number}) => {
                setIsLoading(true);
                setError('');
                Promise.all([
                    getDiscardSuggestions(wardrobe),
                    getShoppingSuggestions(wardrobe, location)
                ]).then(([discardRes, shoppingRes]) => {
                    const hydratedDiscard = discardRes
                        .map(({ itemId, reason }) => ({
                            item: wardrobe.find(i => i.id === itemId)!,
                            reason,
                        }))
                        .filter(suggestion => suggestion.item);

                    const hydratedShopping: ShoppingSuggestion[] = shoppingRes.map((suggestion, index) => {
                        const query = encodeURIComponent(`${suggestion.name} ${suggestion.category}`);
                        return {
                            ...suggestion,
                            id: `shop-${Date.now()}-${index}`,
                            imageUrl: `https://source.unsplash.com/400x400/?${query},fashion,style`,
                            purchaseUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(suggestion.name)}`,
                        };
                    });


                    setDiscardSuggestions(hydratedDiscard);
                    setShoppingSuggestions(hydratedShopping);
                }).catch(err => {
                    console.error("Failed to fetch suggestions:", err);
                    setError(err instanceof Error ? err.message : 'Failed to load enhancement suggestions.');
                }).finally(() => {
                    setIsLoading(false);
                });
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchSuggestionsWithLocation({ latitude, longitude });
                },
                (error) => {
                    console.warn("Could not get location, fetching suggestions without it.", error.message);
                    fetchSuggestionsWithLocation();
                }
            );
        };
        
        fetchWardrobeAndSuggestions();

    }, [user]);

    const handleToggleDiscardSelection = (itemId: string) => {
        setSelectedForDiscard(prev => 
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const handleBulkDelete = () => {
        if (selectedForDiscard.length === 0) return;
        setIsConfirmModalOpen(true);
    };

    const confirmBulkDelete = async () => {
        await deleteItems(selectedForDiscard);
        setDiscardSuggestions(prev => 
            prev.filter(suggestion => !selectedForDiscard.includes(suggestion.item.id))
        );
        setUserWardrobe(prev => prev.filter(item => !selectedForDiscard.includes(item.id)));
        setSelectedForDiscard([]);
        setIsConfirmModalOpen(false);
    };

    if (isLoading) {
        return (
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center flex flex-col items-center justify-center min-h-[400px]">
                <SpinnerIcon className="w-8 h-8 text-primary mb-3" />
                <p className="text-card-foreground">Analyzing your wardrobe for enhancement opportunities...</p>
            </div>
        );
    }
    
    if (error) {
        return <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center text-accent">{error}</div>
    }

    if (userWardrobe.length === 0) {
        return (
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center">
                <h2 className="text-xl font-bold text-card-foreground mb-4">Enhancements</h2>
                <p className="text-foreground/70">Add items to your wardrobe to get personalized suggestions.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-card-foreground">Time to Refresh</h2>
                    {selectedForDiscard.length > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            className="flex items-center px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-semibold"
                        >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete ({selectedForDiscard.length})
                        </button>
                    )}
                </div>
                {discardSuggestions.length > 0 ? (
                    <div className="space-y-4">
                        {discardSuggestions.map(({ item, reason }) => (
                            <div key={item.id} className="flex items-start bg-background/50 p-4 rounded-lg border border-border">
                                <input 
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-border bg-input text-primary focus:ring-ring mt-1"
                                    checked={selectedForDiscard.includes(item.id)}
                                    onChange={() => handleToggleDiscardSelection(item.id)}
                                    aria-label={`Select ${item.name} for deletion`}
                                />
                                <img src={item.imageUrl} alt={item.name} className="h-20 w-20 object-cover rounded-md mx-4 flex-shrink-0"/>
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-card-foreground">{item.name}</h4>
                                    <p className="text-sm text-foreground/80">{reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-foreground/70">Your wardrobe looks fresh! Nothing to discard for now.</p>
                )}
            </div>

            <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-card-foreground mb-4">Complete Your Look</h2>
                 {shoppingSuggestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shoppingSuggestions.map(suggestion => (
                             <div key={suggestion.id} className="bg-background/50 rounded-lg shadow-sm overflow-hidden flex flex-col border border-border">
                                <img src={suggestion.imageUrl} alt={suggestion.name} className="h-48 w-full object-cover" />
                                <div className="p-4 flex-grow flex flex-col">
                                    <h3 className="font-bold text-md text-card-foreground">{suggestion.name}</h3>
                                    <p className="text-sm text-foreground/80 mt-1 flex-grow">{suggestion.description}</p>
                                    <div className="mt-4 flex justify-between items-center">
                                        <span className="font-semibold text-secondary">{suggestion.priceRange}</span>
                                        <a href={suggestion.purchaseUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 bg-secondary text-secondary-foreground text-sm font-semibold rounded-md hover:bg-secondary/90 transition-colors">
                                            Shop Now
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-foreground/70">We're finding the perfect items to complement your style. Check back soon!</p>
                 )}
            </div>
            
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-md animate-slideInUp">
                        <h2 className="text-xl font-bold mb-4 text-card-foreground">Confirm Deletion</h2>
                        <p className="text-foreground/80 mb-6">
                            Are you sure you want to permanently delete {selectedForDiscard.length} item(s) from your wardrobe? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setIsConfirmModalOpen(false)} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                            <button onClick={confirmBulkDelete} className="px-5 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-all active:scale-95">Confirm Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Enhancements;
