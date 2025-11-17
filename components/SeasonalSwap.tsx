import React, { useState, useEffect, useMemo } from 'react';
import useAuth from '../hooks/useAuth';
import { getItemsByUserId } from '../services/apiService';
import { getSeasonalAnalysis } from '../services/geminiService';
import type { ClothingItem, SeasonalAnalysis } from '../types';
import { SpinnerIcon, LeafIcon, MagicWandIcon } from './icons';
import ItemCard from './ItemCard';

const getSeason = (date: Date): string => {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 7) return "Summer";
    if (month >= 8 && month <= 10) return "Autumn";
    return "Winter";
};

type ItemCategory = 'keepOut' | 'storeAway' | 'transitional';

const SeasonalSwap: React.FC = () => {
    const { user } = useAuth();
    const [step, setStep] = useState<'intro' | 'loading' | 'results'>('intro');
    const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
    const [analysis, setAnalysis] = useState<SeasonalAnalysis | null>(null);
    const [error, setError] = useState('');
    
    const [itemLists, setItemLists] = useState<{ [key in ItemCategory]: ClothingItem[] }>({
        keepOut: [],
        storeAway: [],
        transitional: [],
    });

    const currentSeason = useMemo(() => getSeason(new Date()), []);

    useEffect(() => {
        if (user) {
            getItemsByUserId(user.id).then(setWardrobe);
        }
    }, [user]);

    const handleStartAnalysis = async () => {
        if (wardrobe.length < 5) {
            setError("You need at least 5 items in your wardrobe to perform a seasonal analysis.");
            return;
        }
        setStep('loading');
        setError('');
        try {
            const result = await getSeasonalAnalysis(wardrobe, currentSeason);
            setAnalysis(result);
            const keepOut = wardrobe.filter(item => result.keepOutIds.includes(item.id));
            const storeAway = wardrobe.filter(item => result.storeAwayIds.includes(item.id));
            const transitional = wardrobe.filter(item => result.transitionalIds.includes(item.id));
            setItemLists({ keepOut, storeAway, transitional });
            setStep('results');
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to analyze wardrobe.");
            setStep('intro');
        }
    };
    
    const renderIntro = () => (
        <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <LeafIcon className="w-8 h-8"/>
            </div>
            <h1 className="text-3xl font-serif font-bold text-card-foreground mb-2">Welcome to your {currentSeason} Swap</h1>
            <p className="text-foreground/70 max-w-xl mx-auto mb-6">Let's get your wardrobe ready for the new season. Our AI will analyze your items and suggest what to keep out, what to store away, and what you might be missing.</p>
            {error && <p className="text-accent mb-4">{error}</p>}
            <button
                onClick={handleStartAnalysis}
                className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg shadow-md hover:bg-primary/90 transition-all transform active:scale-95 flex items-center justify-center mx-auto"
            >
                Start My {currentSeason} Analysis
            </button>
        </div>
    );

    const renderLoading = () => (
        <div className="text-center">
            <SpinnerIcon className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground/80">Analyzing your wardrobe...</h2>
            <p className="text-foreground/60">This might take a moment as our AI stylist reviews your collection.</p>
        </div>
    );

    const ItemColumn: React.FC<{ title: string; items: ClothingItem[] }> = ({ title, items }) => (
        <div className="bg-background/50 p-4 rounded-lg flex-1 min-w-[280px]">
            <h3 className="font-bold text-lg text-card-foreground mb-4">{title} ({items.length})</h3>
            {items.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {items.map(item => <ItemCard key={item.id} item={item} />)}
                </div>
            ) : (
                <p className="text-sm text-foreground/60 text-center py-4">No items here.</p>
            )}
        </div>
    );

    const renderResults = () => {
        if (!analysis) return null;
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-card-foreground mb-4">Your {currentSeason} Wardrobe Plan</h1>
                    <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary/50">
                       <div className="flex items-start">
                           <MagicWandIcon className="w-5 h-5 mr-3 text-primary flex-shrink-0 mt-0.5" />
                           <div>
                               <h3 className="font-semibold text-primary mb-1">{currentSeason} Trend Report</h3>
                               <p className="text-sm text-foreground/90">{analysis.trendsSummary}</p>
                           </div>
                       </div>
                   </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-4">
                    <ItemColumn title="Keep Out" items={itemLists.keepOut} />
                    <ItemColumn title="Transitional" items={itemLists.transitional} />
                    <ItemColumn title="Store Away" items={itemLists.storeAway} />
                </div>

                <div>
                    <h2 className="text-xl font-bold text-card-foreground mb-4">Complete Your Look</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analysis.missingPieces.map((piece, index) => (
                            <div key={index} className="bg-background/50 p-4 rounded-lg border border-border">
                                <h4 className="font-semibold text-card-foreground">{piece.name}</h4>
                                <p className="text-sm text-foreground/80">{piece.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-card border border-border p-6 rounded-xl shadow-lg min-h-[400px] flex items-center justify-center">
            {step === 'intro' && renderIntro()}
            {step === 'loading' && renderLoading()}
            {step === 'results' && renderResults()}
        </div>
    );
};

export default SeasonalSwap;