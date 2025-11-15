import React, { useState, useEffect, useMemo } from 'react';
import type { Outfit, ClothingItem, Weather } from '../types';
import { generateOutfits } from '../services/geminiService';
import { getItemsByUserId, addSavedOutfit, getSavedOutfitsByUserId } from '../services/storageService';
import { getWeather } from '../services/weatherService';
import useAuth from '../hooks/useAuth';
import ItemCard from './ItemCard';
import { SpinnerIcon, SunIcon, CloudIcon, RainIcon, SparklesIcon, MagicWandIcon, BookmarkIcon } from './icons';
import VirtualTryOnModal from './VirtualTryOnModal';

const OutfitCard: React.FC<{ outfit: Outfit, onTryOn: (outfit: Outfit) => void, onSave: (outfit: Outfit) => void, isSaved: boolean }> = ({ outfit, onTryOn, onSave, isSaved }) => (
    <div className="bg-background/50 border border-border p-4 rounded-lg">
        <div className="flex justify-between items-start mb-3">
            <div>
                <h3 className="font-bold text-lg text-card-foreground">{outfit.name}</h3>
                <p className="font-normal text-sm text-foreground/80 capitalize">{outfit.occasion}</p>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => onTryOn(outfit)}
                    className="flex items-center px-3 py-1.5 bg-secondary/10 text-secondary text-sm font-semibold rounded-full hover:bg-secondary/20 transition-colors"
                >
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Try On
                </button>
                <button
                    onClick={() => onSave(outfit)}
                    disabled={isSaved}
                    className="flex items-center px-3 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full hover:bg-primary/20 transition-colors disabled:bg-primary/20 disabled:text-primary/70 disabled:cursor-not-allowed"
                    aria-label={isSaved ? "Outfit Saved" : "Save Outfit"}
                >
                    <BookmarkIcon className="w-4 h-4 mr-2" isFilled={isSaved} />
                    {isSaved ? 'Saved' : 'Save'}
                </button>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {outfit.items.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
        {outfit.explanation && (
             <div className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary/50">
                <div className="flex items-start">
                    <MagicWandIcon className="w-5 h-5 mr-3 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/90">
                        {outfit.explanation}
                    </p>
                </div>
            </div>
        )}
    </div>
);

const DailyStyle: React.FC = () => {
    const { user } = useAuth();
    const [outfits, setOutfits] = useState<Outfit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [userWardrobe, setUserWardrobe] = useState<ClothingItem[]>([]);
    const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
    const [weather, setWeather] = useState<Weather>({ temperature: 20, unit: 'C', condition: 'Sunny' });
    const [occasion, setOccasion] = useState('Casual');
    const [selectedOutfitForTryOn, setSelectedOutfitForTryOn] = useState<Outfit | null>(null);
    const [useAutoWeather, setUseAutoWeather] = useState(true);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [autoWeatherError, setAutoWeatherError] = useState('');

    const occasions = ['Casual', 'Work', 'Evening', 'Sporty', 'Formal'];
    const conditions = ['Sunny', 'Cloudy', 'Rainy'];

    const getOutfitSignature = (itemIds: string[]) => itemIds.sort().join(',');
    const getOutfitSignatureFromOutfit = (outfit: Outfit) => getOutfitSignature(outfit.items.map(i => i.id));
    
    const savedOutfitSignatures = useMemo(() => {
        return new Set(savedOutfits.map(getOutfitSignatureFromOutfit));
    }, [savedOutfits]);


    useEffect(() => {
        if (user) {
            getItemsByUserId(user.id)
                .then(setUserWardrobe)
                .catch(err => console.error("Failed to load wardrobe", err));
            getSavedOutfitsByUserId(user.id)
                .then(setSavedOutfits)
                .catch(err => console.error("Failed to load saved outfits", err));
        }
    }, [user]);

    useEffect(() => {
        if (useAutoWeather) {
            setIsFetchingWeather(true);
            setAutoWeatherError('');
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const weatherData = await getWeather(latitude, longitude);
                        setWeather(weatherData);
                    } catch (err) {
                        setAutoWeatherError(err instanceof Error ? err.message : 'Failed to fetch weather.');
                        setUseAutoWeather(false); // Fallback to manual
                    } finally {
                        setIsFetchingWeather(false);
                    }
                },
                (error) => {
                    console.warn("Geolocation error:", error.message);
                    setAutoWeatherError("Geolocation denied. Please enable location services or enter weather manually.");
                    setUseAutoWeather(false); // Fallback to manual
                    setIsFetchingWeather(false);
                }
            );
        }
    }, [useAutoWeather]);

    const handleGenerate = async (isSurprise: boolean = false) => {
        if (userWardrobe.length < 3) {
            setError("Please add at least 3 items to your wardrobe to generate outfits.");
            return;
        }
        setIsLoading(true);
        setError('');
        setOutfits([]);
        try {
            const outfitHistory: string[][] = JSON.parse(sessionStorage.getItem('outfitHistory') || '[]');

            const options = isSurprise 
                ? { isSurprise: true } 
                : { occasion, weather };
            const generated = await generateOutfits(userWardrobe, options, outfitHistory);
            
            const hydratedOutfits = generated.map((outfit, index) => ({
                id: `outfit-${Date.now()}-${index}`,
                name: outfit.name,
                occasion: outfit.occasion,
                explanation: outfit.explanation,
                items: outfit.itemIds.map(id => userWardrobe.find(item => item.id === id)).filter(Boolean) as ClothingItem[],
            }));

            const newHistoryItems = generated.map(o => o.itemIds.sort());
            const updatedHistory = [...outfitHistory, ...newHistoryItems].slice(-15); // Keep last 5 tries (5 * 3 outfits = 15)
            sessionStorage.setItem('outfitHistory', JSON.stringify(updatedHistory));

            setOutfits(hydratedOutfits);
        } catch (err) {
            console.error("Failed to generate outfits:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred while generating outfits.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveOutfit = async (outfitToSave: Outfit) => {
        if (!user) return;
        
        const signature = getOutfitSignatureFromOutfit(outfitToSave);
        if (savedOutfitSignatures.has(signature)) return;

        try {
            const newSavedOutfit = await addSavedOutfit(outfitToSave, user.id);
            setSavedOutfits(prev => [...prev, newSavedOutfit]);
        } catch (error) {
            console.error("Failed to save outfit:", error);
            setError("Could not save outfit. Please try again.");
        }
    };

    const WeatherIcon: React.FC<{condition: string}> = ({condition}) => {
        switch(condition) {
            case 'Sunny': return <SunIcon className="w-5 h-5" />;
            case 'Cloudy': return <CloudIcon className="w-5 h-5" />;
            case 'Rainy': return <RainIcon className="w-5 h-5" />;
            default: return <SunIcon className="w-5 h-5" />;
        }
    }

    return (
        <>
            <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
                <h1 className="text-2xl font-bold text-card-foreground mb-6">Daily Style Suggestions</h1>
                
                <div className="space-y-4 mb-6 p-4 bg-background/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                        <label htmlFor="auto-weather-checkbox" className="flex items-center text-sm font-medium text-foreground/80 cursor-pointer">
                            <input
                                id="auto-weather-checkbox"
                                type="checkbox"
                                className="h-4 w-4 rounded border-border bg-input text-primary focus:ring-ring"
                                checked={useAutoWeather}
                                onChange={(e) => setUseAutoWeather(e.target.checked)}
                            />
                            <span className="ml-2">Use my current location for weather</span>
                        </label>
                        {isFetchingWeather && <SpinnerIcon className="w-4 h-4 text-primary"/>}
                    </div>
                    {autoWeatherError && <p className="text-xs text-accent text-center">{autoWeatherError}</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label htmlFor="occasion-select" className="block text-sm font-medium text-foreground/80 mb-1">Occasion</label>
                          <select id="occasion-select" value={occasion} onChange={e => setOccasion(e.target.value)}
                              className="w-full bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring px-3 py-2 disabled:opacity-50"
                              disabled={isLoading}
                          >
                              {occasions.map(o => <option key={o} value={o} className="bg-popover text-popover-foreground">{o}</option>)}
                          </select>
                      </div>
                      <div>
                          <label htmlFor="temperature-input" className="block text-sm font-medium text-foreground/80 mb-1">Temperature (°C)</label>
                          <input type="number" id="temperature-input" value={weather.temperature} onChange={e => setWeather(w => ({...w, temperature: parseInt(e.target.value, 10) || 0}))}
                              className="w-full bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring px-3 py-2 disabled:opacity-50"
                              disabled={useAutoWeather || isLoading}
                          />
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-2">Condition</label>
                        <div className="flex gap-2">
                            {conditions.map(c => (
                                <button key={c} onClick={() => setWeather(w => ({...w, condition: c}))} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-full transition-colors disabled:opacity-50 ${weather.condition === c ? 'bg-primary text-primary-foreground font-semibold' : 'bg-input text-foreground/80 hover:bg-border'}`}
                                disabled={useAutoWeather || isLoading}>
                                    <WeatherIcon condition={c} />
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => handleGenerate(false)} disabled={isLoading} className="w-full flex-grow px-6 py-3 bg-secondary text-secondary-foreground font-bold rounded-lg shadow-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex justify-center items-center">
                        {isLoading ? <SpinnerIcon className="h-6 w-6" /> : 'Get My Look'}
                    </button>
                    <button onClick={() => handleGenerate(true)} disabled={isLoading} className="w-full sm:w-auto flex-shrink-0 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg shadow-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex justify-center items-center">
                        <MagicWandIcon className="h-5 w-5 mr-2"/>
                        Surprise Me
                    </button>
                </div>
                
                <div className="mt-8 min-h-[200px]">
                    {isLoading && (
                        <div className="text-center p-10 flex flex-col items-center justify-center animate-fadeIn">
                            <SpinnerIcon className="w-8 h-8 text-secondary mb-3"/>
                            <p className="text-foreground/80">Crafting perfect outfits for you...</p>
                            <p className="text-foreground/60 text-sm mt-1">Our AI is analyzing your wardrobe.</p>
                        </div>
                    )}
                    
                    {error && <p className="text-center p-10 text-accent">{error}</p>}

                    {!isLoading && !error && outfits.length === 0 && (
                        <div className="text-center p-10 text-foreground/70">
                            <p>Select your occasion, set the weather, and let our AI be your personal stylist.</p>
                        </div>
                    )}

                    {outfits.length > 0 && (
                        <div className="space-y-6 animate-fadeIn">
                            {outfits.map(outfit => (
                                <OutfitCard 
                                    key={outfit.id} 
                                    outfit={outfit} 
                                    onTryOn={setSelectedOutfitForTryOn} 
                                    onSave={handleSaveOutfit}
                                    isSaved={savedOutfitSignatures.has(getOutfitSignatureFromOutfit(outfit))}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {selectedOutfitForTryOn && (
                <VirtualTryOnModal
                    outfit={selectedOutfitForTryOn}
                    onClose={() => setSelectedOutfitForTryOn(null)}
                />
            )}
        </>
    );
};

export default DailyStyle;