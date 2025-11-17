import React from 'react';
import type { Outfit } from '../types';
import ItemCard from './ItemCard';
import { SparklesIcon, MagicWandIcon, BookmarkIcon } from './icons';

interface OutfitCardProps {
    outfit: Outfit;
    onTryOn?: (outfit: Outfit) => void;
    onSave: (outfit: Outfit) => void;
    isSaved: boolean;
}

const OutfitCard: React.FC<OutfitCardProps> = ({ outfit, onTryOn, onSave, isSaved }) => (
    <div className="bg-background/50 border border-border p-4 rounded-lg">
        <div className="flex justify-between items-start mb-3">
            <div>
                <h3 className="font-serif font-bold text-lg text-card-foreground">{outfit.name}</h3>
                <p className="font-normal text-sm text-foreground/80 capitalize">{outfit.occasion}</p>
            </div>
            <div className="flex items-center gap-2">
                {onTryOn && (
                    <button 
                        onClick={() => onTryOn(outfit)}
                        className="flex items-center px-3 py-1.5 bg-secondary/10 text-secondary text-sm font-semibold rounded-full hover:bg-secondary/20 transition-colors"
                    >
                        <SparklesIcon className="w-4 h-4 mr-2" />
                        Try On
                    </button>
                )}
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


export default OutfitCard;