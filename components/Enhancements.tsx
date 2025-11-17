import React, { useState, useEffect, useMemo } from 'react';
import { getDiscardSuggestions, getShoppingSuggestions, generateOutfitsForSingleItem } from '../services/geminiService';
import type { ClothingItem, ShoppingSuggestion, Outfit } from '../types';
import * as apiService from '../services/apiService';
import useAuth from '../hooks/useAuth';
import { SpinnerIcon, TrashIcon, TargetIcon, MagicWandIcon } from './icons';
import SelectItemModal from './SelectItemModal';
import OutfitCard from './OutfitCard';

const Enhancements: React.FC = () => {
    const { user } = useAuth();
    const [discardSuggestions, setDiscardSuggestions] = useState<{ item: ClothingItem, reason: string }[]>([]);
    const [shoppingSuggestions, setShoppingSuggestions] = useState<ShoppingSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedForDiscard, setSelectedForDiscard] = useState<string[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userWardrobe, setUserWardrobe] = useState<ClothingItem[]>([]);
    
    // State for Shop Your Wardrobe
    const [isSelectItemOpen, setSelectItemOpen] = useState(false);
    const [challengeItem, setChallengeItem] = useState<ClothingItem | null>(null);
    const [challengeOutfits, setChallengeOutfits] = useState<Outfit[]>([]);
    const [isChallengeLoading, setChallengeLoading] = useState(false);
    const [challengeError, setChallengeError] = useState('');
    const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);

    const savedOutfitSignatures = useMemo(() => {
        const getOutfitSignature = (outfit: Outfit) => outfit.items.map(i => i.id).sort().join(',');
        return new Set(savedOutfits.map(getOutfitSignature));
    }, [savedOutfits]);


    useEffect(() => {
        if (!user) return;
        
        const fetchAllData = async () => {
             try {
                const [wardrobe, saved] = await Promise.all([
                    apiService.getItemsByUserId(user.id),
                    apiService.getSavedOutfitsByUserId(user.id)
                ]);
                setUserWardrobe(wardrobe);
                setSavedOutfits(saved);

                if (wardrobe.length > 0) {
                    fetchSuggestions(wardrobe);
                } else {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Failed to load initial data", err);
                setError("Could not load your data.");
                setIsLoading(false);
            }
        };

        const fetchSuggestions = (wardrobe: ClothingItem[]) => {
            setError('');
            const fetchWithLocation = (location?: {latitude: number, longitude: number}) => {
                Promise.all([
                    getDiscardSuggestions(wardrobe),
                    getShoppingSuggestions(wardrobe, location)
                ]).then(([discardRes, shoppingRes]) => {
                    const hydratedDiscard = discardRes.map(({ itemId, reason }) => ({ item: wardrobe.find(i => i.id === itemId)!, reason })).filter(s => s.item);
                    const hydratedShopping: ShoppingSuggestion[] = shoppingRes.map((s, i) => ({ ...s, id: `shop-${Date.now()}-${i}` }));
                    setDiscardSuggestions(hydratedDiscard);
                    setShoppingSuggestions(hydratedShopping);
                }).catch(err => {
                    console.error("Failed to fetch suggestions:", err);
                    setError(err instanceof Error ? err.message : 'Failed to load enhancement suggestions.');
                }).finally(() => setIsLoading(false));
            };
            
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWithLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => fetchWithLocation()
            );
        };
        
        fetchAllData();

    }, [user]);

    const handleToggleDiscardSelection = (itemId: string) => {
        setSelectedForDiscard(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
    };

    const confirmBulkDelete = async () => {
        await apiService.deleteItems(selectedForDiscard);
        setDiscardSuggestions(prev => prev.filter(s => !selectedForDiscard.includes(s.item.id)));
        setUserWardrobe(prev => prev.filter(item => !selectedForDiscard.includes(item.id)));
        setSelectedForDiscard([]);
        setIsConfirmModalOpen(false);
    };

    const handleSelectChallengeItem = async (item: ClothingItem) => {
        setChallengeItem(item);
        setSelectItemOpen(false);
        setChallengeLoading(true);
        setChallengeError('');
        setChallengeOutfits([]);
        try {
            const generated = await generateOutfitsForSingleItem(item, userWardrobe);
            if (!user) return;
            const hydratedOutfits = generated.map((outfit, index) => ({
                id: `challenge-${Date.now()}-${index}`,
                name: outfit.name,
                occasion: outfit.occasion,
                explanation: outfit.explanation,
                userId: user.id,
                items: outfit.itemIds.map(id => userWardrobe.find(i => i.id === id)).filter(Boolean) as ClothingItem[],
            }));
            setChallengeOutfits(hydratedOutfits);
        } catch (err) {
            setChallengeError(err instanceof Error ? err.message : 'Failed to generate outfits.');
        } finally {
            setChallengeLoading(false);
        }
    };

    const handleSaveChallengeOutfit = async (outfitToSave: Outfit) => {
        if (!user) return;
        const signature = outfitToSave.items.map(i => i.id).sort().join(',');
        if (savedOutfitSignatures.has(signature)) return;

        try {
            const { id, ...outfitData } = outfitToSave;
            const newSavedOutfit = await apiService.addSavedOutfit(outfitData, user.id);
            setSavedOutfits(prev => [...prev, newSavedOutfit]);
        } catch (error) {
            console.error("Failed to save outfit:", error);
            setChallengeError("Could not save outfit. Please try again.");
        }
    };
    
    const getOutfitSignatureFromOutfit = (outfit: Outfit) => outfit.items.map(i => i.id).sort().join(',');

    return (
        <>
            <div className="space-y-8">
                {/* Shop Your Wardrobe */}
                <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                    <div className="flex items-center mb-2">
                        <TargetIcon className="w-6 h-6 mr-3 text-secondary"/>
                        <h2 className="text-2xl font-serif font-bold text-card-foreground">Shop Your Wardrobe</h2>
                    </div>
                    <p className="text-foreground/70 mb-4">Breathe new life into your closet. Select an item you rarely wear and let our AI create new looks for you.</p>
                    <button onClick={() => setSelectItemOpen(true)} className="px-5 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-lg shadow-md hover:bg-secondary/90 transition-all transform active:scale-95">
                        Select an Item to Style
                    </button>

                    <div className="mt-6">
                        {isChallengeLoading && (
                             <div className="text-center p-6 flex flex-col items-center justify-center animate-fadeIn">
                                <SpinnerIcon className="w-8 h-8 text-secondary mb-3"/>
                                <p className="text-foreground/80">Styling outfits for your {challengeItem?.name}...</p>
                            </div>
                        )}
                        {challengeError && <p className="text-center p-6 text-accent">{challengeError}</p>}
                        {challengeOutfits.length > 0 && (
                            <div className="space-y-6 animate-fadeIn">
                                <h3 className="text-lg font-bold text-card-foreground">New Looks for your {challengeItem?.name}</h3>
                                {challengeOutfits.map(outfit => (
                                    <OutfitCard 
                                        key={outfit.id} 
                                        outfit={outfit}
                                        onSave={handleSaveChallengeOutfit}
                                        isSaved={savedOutfitSignatures.has(getOutfitSignatureFromOutfit(outfit))}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center flex flex-col items-center justify-center min-h-[200px]">
                        <SpinnerIcon className="w-8 h-8 text-primary mb-3" />
                        <p className="text-card-foreground">Analyzing your wardrobe...</p>
                    </div>
                ) : error ? (
                    <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center text-accent">{error}</div>
                ) : userWardrobe.length === 0 ? (
                     <div className="bg-card border border-border p-6 rounded-xl shadow-lg text-center">
                        <p className="text-foreground/70">Add items to your wardrobe to get personalized suggestions.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-serif font-bold text-card-foreground">Time to Refresh</h2>
                                {selectedForDiscard.length > 0 && (
                                    <button onClick={() => setIsConfirmModalOpen(true)} className="flex items-center px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-semibold">
                                        <TrashIcon className="h-4 w-4 mr-2" />
                                        Delete ({selectedForDiscard.length})
                                    </button>
                                )}
                            </div>
                            {discardSuggestions.length > 0 ? (
                                <div className="space-y-4">
                                    {discardSuggestions.map(({ item, reason }) => (
                                        <div key={item.id} className="flex items-start bg-background/50 p-4 rounded-lg border border-border">
                                            <input type="checkbox" className="h-5 w-5 rounded border-border bg-input text-primary focus:ring-ring mt-1" checked={selectedForDiscard.includes(item.id)} onChange={() => handleToggleDiscardSelection(item.id)} aria-label={`Select ${item.name} for deletion`} />
                                            <img src={item.imageUrl} alt={item.name} className="h-20 w-20 object-cover rounded-md mx-4 flex-shrink-0"/>
                                            <div className="flex-grow"><h4 className="font-semibold text-card-foreground">{item.name}</h4><p className="text-sm text-foreground/80">{reason}</p></div>
                                        </div>
                                    ))}
                                </div>
                            ) : ( <p className="text-foreground/70">Your wardrobe looks fresh! Nothing to discard for now.</p> )}
                        </div>

                        <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                            <h2 className="text-2xl font-serif font-bold text-card-foreground mb-4">Complete Your Look</h2>
                            {shoppingSuggestions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {shoppingSuggestions.map(s => (
                                        <div key={s.id} className="bg-background/50 rounded-lg shadow-sm overflow-hidden flex flex-col border border-border">
                                            <img src={s.imageUrl} alt={s.name} className="h-48 w-full object-cover" />
                                            <div className="p-4 flex-grow flex flex-col">
                                                <h3 className="font-bold text-md text-card-foreground">{s.name}</h3>
                                                <p className="text-sm text-foreground/80 mt-1 flex-grow">{s.description}</p>
                                                <div className="mt-4 flex justify-between items-center">
                                                    <span className="font-semibold text-secondary">{s.priceRange}</span>
                                                    <a href={s.purchaseUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 bg-secondary text-secondary-foreground text-sm font-semibold rounded-md hover:bg-secondary/90 transition-colors">Shop Now</a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : ( <p className="text-foreground/70">We're finding the perfect items to complement your style. Check back soon!</p> )}
                        </div>
                    </>
                )}
                
                {isConfirmModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-md animate-slideInUp">
                            <h2 className="text-xl font-bold mb-4 text-card-foreground">Confirm Deletion</h2>
                            <p className="text-foreground/80 mb-6">Are you sure you want to permanently delete {selectedForDiscard.length} item(s)? This action cannot be undone.</p>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => setIsConfirmModalOpen(false)} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                                <button onClick={confirmBulkDelete} className="px-5 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-all active:scale-95">Confirm Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {isSelectItemOpen && (
                <SelectItemModal
                    items={userWardrobe}
                    onClose={() => setSelectItemOpen(false)}
                    onSelect={handleSelectChallengeItem}
                />
            )}
        </>
    );
};

export default Enhancements;
